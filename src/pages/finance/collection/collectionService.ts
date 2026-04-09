import { supabase } from '../../../lib/supabase';
import { MatchedRow, CollectionRecord, CollectionLineItem, ApplyResult, OverdueOrder, ProviderType, ParseResult, DuplicateInfo, BulkApplyResult, OrderCollectionFilters, OrderCollectionResult, OrderCollectionRow } from './types';
import { resolvePaymentStatus } from './collectionResolver';
import { classifyPaymentMethod } from './paymentMethodClassifier';
import { getEffectiveOrderDate } from '../../../lib/appSettings';

const PROVIDER_LABEL: Record<ProviderType, string> = {
  pathao: 'Pathao',
  bkash: 'Bkash',
  ssl_commerz: 'SSL Commerz',
};

export async function checkDuplicateCollectionRecord(
  matchedRows: MatchedRow[],
  provider: ProviderType
): Promise<DuplicateInfo | null> {
  const isBkashLike = provider === 'bkash' || provider === 'ssl_commerz';
  const eligibleRows = isBkashLike
    ? matchedRows.filter(r => r.order_id)
    : matchedRows.filter(r => r.invoice_type === 'delivery' && r.order_id);
  if (eligibleRows.length === 0) return null;

  const incomingOrderIds = [...new Set(eligibleRows.map(r => r.order_id).filter(Boolean))] as string[];

  let dupQuery = supabase
    .from('collection_line_items')
    .select(`
      order_id,
      collection_record_id,
      collection_records(
        id,
        invoice_date,
        invoice_number,
        provider_type
      )
    `)
    .eq('match_status', 'matched')
    .in('order_id', incomingOrderIds);

  if (!isBkashLike) {
    dupQuery = dupQuery.eq('invoice_type', 'delivery');
  }

  const { data: existingItems } = await dupQuery;

  if (!existingItems || existingItems.length === 0) return null;

  const recordOverlap = new Map<string, { count: number; record: any }>();
  for (const item of existingItems as any[]) {
    const rec = Array.isArray(item.collection_records) ? item.collection_records[0] : item.collection_records;
    if (!rec) continue;
    if (rec.provider_type !== provider) continue;
    const key = rec.id;
    const existing = recordOverlap.get(key);
    if (existing) {
      existing.count++;
    } else {
      recordOverlap.set(key, { count: 1, record: rec });
    }
  }

  if (recordOverlap.size === 0) return null;

  let bestRecordId = '';
  let bestCount = 0;
  let bestRecord: any = null;
  for (const [id, { count, record }] of recordOverlap) {
    if (count > bestCount) {
      bestCount = count;
      bestRecordId = id;
      bestRecord = record;
    }
  }

  const overlapPercent = (bestCount / incomingOrderIds.length) * 100;
  if (overlapPercent < 50) return null;

  return {
    existingRecordId: bestRecordId,
    existingInvoiceDate: bestRecord.invoice_date,
    existingInvoiceNumber: bestRecord.invoice_number,
    overlapCount: bestCount,
    incomingCount: incomingOrderIds.length,
    overlapPercent,
  };
}

async function rollbackDeliveryLineItems(recordId: string, userId: string | null): Promise<void> {
  const { data: lineItems } = await supabase
    .from('collection_line_items')
    .select('*')
    .eq('collection_record_id', recordId)
    .eq('invoice_type', 'delivery')
    .eq('match_status', 'matched')
    .eq('applied', true);

  if (!lineItems || lineItems.length === 0) return;

  const orderIds = [...new Set((lineItems as any[]).map(li => li.order_id).filter(Boolean))];

  for (const orderId of orderIds) {
    await supabase.from('order_courier_info').update({
      collected_amount: 0,
      delivery_charge: 0,
      settlement_source: null,
      updated_at: new Date().toISOString(),
    }).eq('order_id', orderId);

    await supabase.from('orders').update({
      payment_status: 'unpaid',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId).eq('payment_status', 'paid')
      .in('cs_status', ['delivered', 'cancelled_cad', 'exchange', 'exchange_returnable', 'partial_delivery']);

    await supabase.from('order_activity_log').insert({
      order_id: orderId,
      action: `Previous delivery settlement rolled back to allow re-upload with updated invoice.`,
      performed_by: userId,
    });
  }

  await supabase.from('collection_line_items')
    .delete()
    .eq('collection_record_id', recordId)
    .eq('invoice_type', 'delivery');

  const { data: remainingItems } = await supabase
    .from('collection_line_items')
    .select('id')
    .eq('collection_record_id', recordId);

  if (!remainingItems || remainingItems.length === 0) {
    await supabase.from('collection_records').delete().eq('id', recordId);
  }
}

export async function saveCollectionRecord(
  provider: ProviderType,
  invoiceDate: string,
  invoiceNumber: string | null,
  parseResult: ParseResult,
  matchedRows: MatchedRow[],
  unmatchedRows: MatchedRow[],
  createdBy: string | null,
  bankDepositAmount: number | null = null,
  bankDepositReference: string | null = null,
  replaceRecordId: string | null = null,
  userId: string | null = null
): Promise<string> {
  if (replaceRecordId) {
    await rollbackDeliveryLineItems(replaceRecordId, userId);
  }

  const totalDisbursed = parseResult.totalDisbursed;
  const totalMatched = matchedRows.length;
  const totalRows = parseResult.parsedRows;

  const { data, error } = await supabase
    .from('collection_records')
    .insert({
      provider_type: provider,
      courier_company: PROVIDER_LABEL[provider],
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      total_disbursed: totalDisbursed,
      payment_gateway_charges: parseResult.totalGatewayCharges,
      raw_row_count: totalRows,
      unmatched_row_count: unmatchedRows.length,
      orders_matched: totalMatched,
      orders_total: totalRows,
      status: 'processing',
      created_by: createdBy,
      bank_transfer_amount: bankDepositAmount,
      bank_reference: bankDepositReference,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create collection record');

  const recordId = data.id;

  const lineItems = [
    ...matchedRows.map(r => ({
      collection_record_id: recordId,
      order_id: r.order_id,
      tracking_number: r.consignment_id ?? null,
      consignment_id: r.consignment_id,
      woo_order_id: r.woo_order_id,
      invoice_type: r.invoice_type,
      collected_amount: r.collected_amount,
      delivery_charge: r.delivery_charge,
      cod_charge: 0,
      net_disbursed: r.payout,
      gateway_charge: r.gateway_charge,
      transaction_id: r.transaction_id,
      match_status: r.match_status,
      match_confidence: r.match_confidence,
      applied: false,
      raw_data: r.raw_data,
    })),
    ...unmatchedRows.map(r => ({
      collection_record_id: recordId,
      order_id: r.order_id,
      tracking_number: r.consignment_id ?? null,
      consignment_id: r.consignment_id,
      woo_order_id: r.woo_order_id,
      invoice_type: r.invoice_type,
      collected_amount: r.collected_amount,
      delivery_charge: r.delivery_charge,
      cod_charge: 0,
      net_disbursed: r.payout,
      gateway_charge: r.gateway_charge,
      transaction_id: r.transaction_id,
      match_status: r.match_status,
      match_confidence: r.match_confidence,
      applied: false,
      raw_data: r.raw_data,
    })),
  ];

  if (lineItems.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < lineItems.length; i += chunkSize) {
      const chunk = lineItems.slice(i, i + chunkSize);
      await supabase.from('collection_line_items').insert(chunk);
    }
  }

  return recordId;
}

export async function applyCollectionRecord(
  recordId: string,
  userId: string | null
): Promise<ApplyResult> {
  const { data: lineItems, error } = await supabase
    .from('collection_line_items')
    .select('*')
    .eq('collection_record_id', recordId)
    .in('match_status', ['matched', 'paid_no_collection'])
    .eq('applied', false);

  if (error) throw new Error(error.message);
  if (!lineItems || lineItems.length === 0) {
    return { ordersUpdated: 0, paidStatusSet: 0, errors: [] };
  }

  const orderIds = [...new Set(lineItems.map((li: any) => li.order_id).filter(Boolean))];

  const { data: ordersData } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      cs_status,
      payment_method,
      payment_status,
      total_amount,
      paid_amount,
      order_courier_info(
        id,
        total_receivable,
        collected_amount,
        prepaid_amount,
        delivery_charge,
        delivery_discount
      )
    `)
    .in('id', orderIds);

  const orderMap = new Map<string, any>();
  for (const o of (ordersData ?? []) as any[]) {
    orderMap.set(o.id, o);
  }

  const { data: record } = await supabase
    .from('collection_records')
    .select('provider_type, invoice_date, invoice_number')
    .eq('id', recordId)
    .maybeSingle();

  const providerLabel = record?.provider_type ? PROVIDER_LABEL[record.provider_type as ProviderType] ?? record.provider_type : 'Invoice';
  const dateStr = record?.invoice_date ?? new Date().toISOString().split('T')[0];
  const invoiceRef = record?.invoice_number ? ` #${record.invoice_number}` : '';
  const isGatewayProvider = record?.provider_type === 'bkash' || record?.provider_type === 'ssl_commerz';

  const errors: string[] = [];
  let ordersUpdated = 0;
  let paidStatusSet = 0;

  for (const li of lineItems as any[]) {
    if (!li.order_id) continue;

    const order = orderMap.get(li.order_id);
    if (!order) {
      errors.push(`Order ${li.order_id} not found`);
      continue;
    }

    const courierInfo = Array.isArray(order.order_courier_info)
      ? order.order_courier_info[0]
      : order.order_courier_info;

    const existingCollected = courierInfo?.collected_amount ?? 0;
    const existingPrepaid = courierInfo?.prepaid_amount ?? 0;
    const existingDelivery = courierInfo?.delivery_charge ?? 0;
    const deliveryDiscount = courierInfo?.delivery_discount ?? 0;
    const totalReceivable = courierInfo?.total_receivable ?? order.total_amount;

    const isDelivery = li.invoice_type === 'delivery' || li.invoice_type == null;

    const pmType = classifyPaymentMethod(order.payment_method);
    const isPrepaid = pmType === 'prepaid';
    const isPartialPaid = pmType === 'partial_paid';

    const liAmount = li.collected_amount ?? 0;

    let newCollected: number;
    let newPrepaid: number;

    if (isDelivery) {
      if (isGatewayProvider) {
        newPrepaid = existingPrepaid + liAmount;
        newCollected = existingCollected;
      } else if (isPrepaid || isPartialPaid) {
        newCollected = existingCollected + liAmount;
        newPrepaid = existingPrepaid;
      } else {
        newCollected = liAmount;
        newPrepaid = existingPrepaid;
      }
    } else {
      newCollected = existingCollected;
      newPrepaid = existingPrepaid;
    }

    const newDelivery = isDelivery
      ? (li.delivery_charge ?? 0)
      : existingDelivery + (li.delivery_charge ?? 0);

    try {
      if (li.match_status === 'paid_no_collection') {
        const incomingDeliveryCharge = li.delivery_charge ?? 0;
        if (courierInfo?.id) {
          const updatePayload: Record<string, any> = {
            settlement_source: 'invoice_upload',
            updated_at: new Date().toISOString(),
          };
          if (isGatewayProvider) {
            updatePayload.prepaid_amount = existingPrepaid + liAmount;
          } else {
            updatePayload.collected_amount = liAmount;
          }
          if (incomingDeliveryCharge > 0) {
            updatePayload.delivery_charge = incomingDeliveryCharge;
          }
          await supabase.from('order_courier_info').update(updatePayload).eq('id', courierInfo.id);
        } else {
          await supabase.from('order_courier_info').insert({
            order_id: li.order_id,
            collected_amount: isGatewayProvider ? 0 : liAmount,
            prepaid_amount: isGatewayProvider ? liAmount : 0,
            delivery_charge: incomingDeliveryCharge,
            settlement_source: 'invoice_upload',
            total_receivable: order.total_amount,
          });
        }

        const chargeNote = incomingDeliveryCharge > 0 ? ` Delivery charge updated: ৳${incomingDeliveryCharge.toFixed(2)}.` : '';
        await supabase.from('order_activity_log').insert({
          order_id: li.order_id,
          action: `${isGatewayProvider ? 'Gateway' : 'Collected'} amount backfilled from ${providerLabel} invoice (${dateStr}): ৳${liAmount.toFixed(2)}.${chargeNote} Payment status unchanged — order was already marked as paid.`,
          performed_by: userId,
        });

        await supabase.from('collection_line_items').update({ applied: true }).eq('id', li.id);
        ordersUpdated++;
        continue;
      }

      if (courierInfo?.id) {
        await supabase.from('order_courier_info').update({
          collected_amount: newCollected,
          prepaid_amount: newPrepaid,
          delivery_charge: newDelivery,
          settlement_source: 'invoice_upload',
          updated_at: new Date().toISOString(),
        }).eq('id', courierInfo.id);
      } else {
        await supabase.from('order_courier_info').insert({
          order_id: li.order_id,
          collected_amount: newCollected,
          prepaid_amount: newPrepaid,
          delivery_charge: newDelivery,
          settlement_source: 'invoice_upload',
          total_receivable: order.total_amount,
        });
      }

      const resolverResult = resolvePaymentStatus({
        cs_status: order.cs_status,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
        paid_amount: order.paid_amount,
        total_receivable: totalReceivable,
        collected_amount: newCollected,
        prepaid_amount: newPrepaid,
        delivery_discount: deliveryDiscount,
        invoice_type: li.invoice_type ?? null,
      });

      if (resolverResult.shouldMarkPaid) {
        await supabase.from('orders').update({
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        }).eq('id', li.order_id);
        paidStatusSet++;
      }

      const typeLabel = isDelivery ? 'Delivery' : 'Return';
      const paidLabel = resolverResult.shouldMarkPaid
        ? 'Payment marked as Paid.'
        : `Payment NOT updated — ${resolverResult.reason}`;
      await supabase.from('order_activity_log').insert({
        order_id: li.order_id,
        action: `${typeLabel} settlement applied via ${providerLabel} invoice${invoiceRef} (${dateStr}). Collected: ৳${newCollected.toFixed(2)}, Gateway: ৳${newPrepaid.toFixed(2)}, Delivery Charge: ৳${newDelivery.toFixed(2)}. ${paidLabel}`,
        performed_by: userId,
      });

      await supabase.from('collection_line_items').update({
        applied: true,
        not_paid_reason: resolverResult.shouldMarkPaid ? null : resolverResult.reason,
      }).eq('id', li.id);

      ordersUpdated++;
    } catch (err: any) {
      errors.push(`Order ${order.order_number}: ${err.message}`);
    }
  }

  const { data: allItems } = await supabase
    .from('collection_line_items')
    .select('match_status, applied')
    .eq('collection_record_id', recordId);

  const matched = (allItems ?? []).filter((i: any) => ['matched', 'paid_no_collection'].includes(i.match_status)).length;
  const unmatched = (allItems ?? []).filter((i: any) => ['not_found', 'paid_already_settled'].includes(i.match_status)).length;
  const allApplied = (allItems ?? []).filter((i: any) => ['matched', 'paid_no_collection'].includes(i.match_status)).every((i: any) => i.applied);

  const newStatus = errors.length > 0 ? 'discrepancy' : unmatched > 0 ? 'discrepancy' : allApplied ? 'verified' : 'processing';

  await supabase.from('collection_records').update({
    orders_matched: matched,
    orders_total: (allItems ?? []).length,
    unmatched_row_count: unmatched,
    status: newStatus,
    updated_at: new Date().toISOString(),
  }).eq('id', recordId);

  return { ordersUpdated, paidStatusSet, errors };
}

export async function reapplyCollectionRecord(
  recordId: string,
  userId: string | null
): Promise<ApplyResult> {
  await supabase
    .from('collection_line_items')
    .update({ applied: false, not_paid_reason: null })
    .eq('collection_record_id', recordId)
    .in('match_status', ['matched', 'paid_no_collection']);

  return applyCollectionRecord(recordId, userId);
}

export async function checkBulkDuplicates(
  invoiceNumbers: string[],
  provider: ProviderType
): Promise<Map<string, string>> {
  if (invoiceNumbers.length === 0) return new Map();

  const { data } = await supabase
    .from('collection_records')
    .select('id, invoice_number')
    .eq('provider_type', provider)
    .in('invoice_number', invoiceNumbers);

  const result = new Map<string, string>();
  for (const rec of (data ?? []) as any[]) {
    if (rec.invoice_number) {
      result.set(rec.invoice_number, rec.id);
    }
  }
  return result;
}

export async function saveAndApplyBulkCollectionRecords(
  groups: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    parseResult: ParseResult;
    matchResult: { matched: MatchedRow[]; unmatched: MatchedRow[] };
  }>,
  provider: ProviderType,
  userId: string | null
): Promise<BulkApplyResult> {
  let recordsCreated = 0;
  let ordersUpdated = 0;
  let paidStatusSet = 0;
  const groupErrors: Array<{ invoiceNumber: string; error: string }> = [];
  const allUnmatched: MatchedRow[] = [];

  for (const group of groups) {
    try {
      const recordId = await saveCollectionRecord(
        provider,
        group.invoiceDate,
        group.invoiceNumber,
        group.parseResult,
        group.matchResult.matched,
        group.matchResult.unmatched,
        userId,
        null,
        null,
        null,
        userId
      );
      recordsCreated++;

      const applyResult = await applyCollectionRecord(recordId, userId);
      ordersUpdated += applyResult.ordersUpdated;
      paidStatusSet += applyResult.paidStatusSet;

      if (applyResult.errors.length > 0) {
        groupErrors.push({
          invoiceNumber: group.invoiceNumber,
          error: applyResult.errors.join('; '),
        });
      }
    } catch (err: any) {
      groupErrors.push({
        invoiceNumber: group.invoiceNumber,
        error: err.message ?? 'Unknown error',
      });
    }

    allUnmatched.push(...group.matchResult.unmatched);
  }

  return { recordsCreated, ordersUpdated, paidStatusSet, groupErrors, allUnmatched };
}

export async function fetchCollectionRecords(): Promise<CollectionRecord[]> {
  const { data } = await supabase
    .from('collection_records')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []) as CollectionRecord[];
}

export async function fetchCollectionRecord(id: string): Promise<CollectionRecord | null> {
  const { data } = await supabase
    .from('collection_records')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data as CollectionRecord | null;
}

export async function fetchCollectionLineItems(recordId: string): Promise<CollectionLineItem[]> {
  const { data } = await supabase
    .from('collection_line_items')
    .select(`
      *,
      orders(
        order_number,
        woo_order_id,
        cs_status,
        payment_method,
        payment_status,
        total_amount,
        customers(full_name)
      )
    `)
    .eq('collection_record_id', recordId)
    .order('created_at', { ascending: true });

  return ((data ?? []) as any[]).map(item => ({
    ...item,
    order: item.orders ? {
      order_number: item.orders.order_number,
      woo_order_id: item.orders.woo_order_id,
      cs_status: item.orders.cs_status,
      payment_method: item.orders.payment_method,
      payment_status: item.orders.payment_status,
      total_amount: item.orders.total_amount,
    } : null,
    customer: item.orders?.customers ? {
      full_name: item.orders.customers.full_name,
    } : null,
  }));
}

export async function updateCollectionRecordBank(
  id: string,
  bankReference: string | null,
  bankTransferDate: string | null,
  bankTransferAmount: number | null
): Promise<void> {
  await supabase.from('collection_records').update({
    bank_reference: bankReference,
    bank_transfer_date: bankTransferDate,
    bank_transfer_amount: bankTransferAmount,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
}

export async function fetchOverdueOrders(thresholdDays: number): Promise<OverdueOrder[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

  const effectiveDate = await getEffectiveOrderDate();

  let query = supabase
    .from('orders')
    .select(`
      id,
      order_number,
      woo_order_id,
      cs_status,
      payment_method,
      payment_status,
      total_amount,
      shipped_at,
      order_date,
      customers(full_name, phone_primary),
      order_courier_info(
        courier_company,
        tracking_number,
        total_receivable,
        collected_amount,
        delivery_discount
      )
    `)
    .in('cs_status', ['delivered', 'cancelled_cad', 'exchange', 'exchange_returnable', 'partial_delivery'])
    .eq('payment_status', 'unpaid')
    .lt('order_date', cutoffDate.toISOString());

  if (effectiveDate) {
    query = query.gte('order_date', effectiveDate);
  }

  const { data } = await query;

  const now = new Date();
  return ((data ?? []) as any[]).map(o => {
    const courierInfo = Array.isArray(o.order_courier_info) ? o.order_courier_info[0] : o.order_courier_info;
    const refDate = o.shipped_at ? new Date(o.shipped_at) : new Date(o.order_date);
    const daysOverdue = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: o.id,
      order_number: o.order_number,
      woo_order_id: o.woo_order_id,
      cs_status: o.cs_status,
      payment_method: o.payment_method,
      total_amount: o.total_amount,
      shipped_at: o.shipped_at,
      order_date: o.order_date,
      days_overdue: daysOverdue,
      customer_name: o.customers?.full_name ?? 'Unknown',
      customer_phone: o.customers?.phone_primary ?? '',
      courier_company: courierInfo?.courier_company ?? null,
      tracking_number: courierInfo?.tracking_number ?? null,
      total_receivable: courierInfo?.total_receivable ?? null,
      collected_amount: courierInfo?.collected_amount ?? null,
      delivery_discount: courierInfo?.delivery_discount ?? null,
    };
  });
}

export interface BulkMarkPreviewResult {
  eligibleCount: number;
  byStatus: Record<string, number>;
  nonCadWithCollected: number;
  cadWithDeliveryCharge: number;
  alreadyPaidCount: number;
}

export interface BulkMarkResult {
  markedCount: number;
  skippedCount: number;
  errors: string[];
}

const HISTORICAL_FINAL_STATUSES = [
  'delivered',
  'exchange',
  'exchange_returnable',
  'partial_delivery',
  'cancelled_cad',
];

const CAD_STATUS = 'cancelled_cad';

export async function previewBulkMarkHistoricalOrdersAsPaid(
  cutoffDate: string
): Promise<BulkMarkPreviewResult> {
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      cs_status,
      payment_status,
      order_courier_info(collected_amount, delivery_charge)
    `)
    .in('cs_status', HISTORICAL_FINAL_STATUSES)
    .eq('payment_status', 'unpaid')
    .lt('order_date', cutoffDate);

  const byStatus: Record<string, number> = {};
  let nonCadWithCollected = 0;
  let cadWithDeliveryCharge = 0;
  let eligibleCount = 0;

  for (const o of (orders ?? []) as any[]) {
    const courierInfo = Array.isArray(o.order_courier_info)
      ? o.order_courier_info[0]
      : o.order_courier_info;
    const collected = courierInfo?.collected_amount ?? 0;
    const deliveryCharge = courierInfo?.delivery_charge ?? 0;
    const isCAD = o.cs_status === CAD_STATUS;

    const qualifies = isCAD ? deliveryCharge > 0 : collected > 0;
    if (!qualifies) continue;

    eligibleCount++;
    byStatus[o.cs_status] = (byStatus[o.cs_status] ?? 0) + 1;
    if (isCAD) {
      cadWithDeliveryCharge++;
    } else {
      nonCadWithCollected++;
    }
  }

  const { count: alreadyPaidCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .in('cs_status', HISTORICAL_FINAL_STATUSES)
    .eq('payment_status', 'paid')
    .lt('order_date', cutoffDate);

  return {
    eligibleCount,
    byStatus,
    nonCadWithCollected,
    cadWithDeliveryCharge,
    alreadyPaidCount: alreadyPaidCount ?? 0,
  };
}

export async function bulkMarkHistoricalOrdersAsPaid(
  cutoffDate: string,
  userId: string | null
): Promise<BulkMarkResult> {
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      cs_status,
      payment_status,
      order_courier_info(collected_amount, delivery_charge)
    `)
    .in('cs_status', HISTORICAL_FINAL_STATUSES)
    .eq('payment_status', 'unpaid')
    .lt('order_date', cutoffDate);

  let markedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  const eligible = ((orders ?? []) as any[]).filter(o => {
    const courierInfo = Array.isArray(o.order_courier_info)
      ? o.order_courier_info[0]
      : o.order_courier_info;
    const collected = courierInfo?.collected_amount ?? 0;
    const deliveryCharge = courierInfo?.delivery_charge ?? 0;
    return o.cs_status === CAD_STATUS ? deliveryCharge > 0 : collected > 0;
  });

  skippedCount = ((orders ?? []) as any[]).length - eligible.length;

  const chunkSize = 50;
  for (let i = 0; i < eligible.length; i += chunkSize) {
    const chunk = eligible.slice(i, i + chunkSize);
    const chunkIds = chunk.map((o: any) => o.id);

    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .in('id', chunkIds);

      if (updateError) {
        errors.push(`Batch ${i / chunkSize + 1}: ${updateError.message}`);
        continue;
      }

      const logEntries = chunk.map((o: any) => ({
        order_id: o.id,
        action: `Marked as paid via bulk historical settlement operation (pre-${cutoffDate}). Order was in final status "${o.cs_status}" before the collection system was in place.`,
        performed_by: userId,
      }));

      await supabase.from('order_activity_log').insert(logEntries);
      markedCount += chunk.length;
    } catch (err: any) {
      errors.push(`Batch ${i / chunkSize + 1}: ${err.message ?? 'Unknown error'}`);
    }
  }

  return { markedCount, skippedCount, errors };
}

const PAGE_SIZE = 50;

export const DEFAULT_CS_STATUSES = ['shipped', 'delivered', 'partial_delivery', 'exchange', 'exchange_returnable', 'cancelled_cad'];

export async function fetchOrderCollectionStatus(
  filters: OrderCollectionFilters
): Promise<OrderCollectionResult> {
  const offset = (filters.page - 1) * PAGE_SIZE;

  let query = supabase
    .from('orders')
    .select(`
      id,
      order_number,
      woo_order_id,
      order_date,
      cs_status,
      payment_status,
      payment_method,
      paid_amount,
      total_amount,
      customers!inner(full_name, phone_primary, district),
      order_courier_info(
        courier_company,
        tracking_number,
        courier_status,
        collected_amount,
        prepaid_amount,
        delivery_charge,
        delivery_discount,
        total_receivable,
        settlement_source,
        cod_charge
      )
    `, { count: 'exact' })
    .in('cs_status', filters.csStatuses.length > 0 ? filters.csStatuses : DEFAULT_CS_STATUSES)
    .gte('order_date', filters.dateFrom)
    .lte('order_date', filters.dateTo)
    .order('order_date', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (filters.paymentStatus !== 'all') {
    query = query.eq('payment_status', filters.paymentStatus);
  }

  if (filters.searchQuery) {
    const q = filters.searchQuery.trim();
    const asNum = parseInt(q, 10);
    if (!isNaN(asNum)) {
      query = query.or(`order_number.ilike.%${q}%,woo_order_id.eq.${asNum}`);
    } else {
      query = query.ilike('order_number', `%${q}%`);
    }
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const rows: OrderCollectionRow[] = ((data ?? []) as any[]).map(o => {
    const customer = Array.isArray(o.customers) ? o.customers[0] : o.customers;
    const ci = Array.isArray(o.order_courier_info) ? o.order_courier_info[0] : o.order_courier_info;
    return {
      id: o.id,
      order_number: o.order_number,
      woo_order_id: o.woo_order_id,
      order_date: o.order_date,
      cs_status: o.cs_status,
      payment_status: o.payment_status,
      payment_method: o.payment_method,
      paid_amount: o.paid_amount,
      total_amount: o.total_amount,
      customer_name: customer?.full_name ?? 'Unknown',
      customer_phone: customer?.phone_primary ?? '',
      customer_district: customer?.district ?? null,
      courier_company: ci?.courier_company ?? null,
      tracking_number: ci?.tracking_number ?? null,
      courier_status: ci?.courier_status ?? null,
      collected_amount: ci?.collected_amount ?? null,
      prepaid_amount: ci?.prepaid_amount ?? null,
      delivery_charge: ci?.delivery_charge ?? null,
      delivery_discount: ci?.delivery_discount ?? null,
      total_receivable: ci?.total_receivable ?? null,
      settlement_source: ci?.settlement_source ?? null,
      cod_charge: ci?.cod_charge ?? null,
    };
  });

  let filteredRows = rows;
  if (filters.paymentMethod) {
    filteredRows = rows.filter(r => {
      const pm = (r.payment_method ?? '').toLowerCase();
      const f = filters.paymentMethod.toLowerCase();
      if (f === 'cod') return pm === 'cod' || pm === '' || pm == null;
      if (f === 'prepaid') return pm.startsWith('prepaid');
      if (f === 'partial paid') return pm.startsWith('partial paid');
      return pm.includes(f);
    });
  }

  if (filters.courierCompany) {
    filteredRows = filteredRows.filter(r => r.courier_company === filters.courierCompany);
  }

  const totalCollected = filteredRows.reduce((s, r) => s + (r.collected_amount ?? 0) + (r.prepaid_amount ?? 0), 0);
  const totalOutstanding = filteredRows.reduce((s, r) => {
    const receivable = r.total_receivable ?? r.total_amount;
    const collected = r.collected_amount ?? 0;
    const discount = r.delivery_discount ?? 0;
    return s + Math.max(0, receivable - discount - collected);
  }, 0);

  return {
    rows: filteredRows,
    totalCount: count ?? 0,
    totalCollected,
    totalOutstanding,
  };
}

export interface OrderCollectionAggregates {
  totalCollected: number;
  totalOutstanding: number;
  totalCount: number;
  fetchedAt: string;
}

export async function fetchOrderCollectionAggregates(
  filters: OrderCollectionFilters
): Promise<OrderCollectionAggregates> {
  const { dateFrom, dateTo, csStatuses, paymentStatus, searchQuery } = filters;

  let query = supabase
    .from('orders')
    .select(`
      id,
      total_amount,
      payment_status,
      payment_method,
      order_courier_info(
        collected_amount,
        delivery_charge,
        delivery_discount,
        total_receivable
      )
    `, { count: 'exact' })
    .in('cs_status', csStatuses.length > 0 ? csStatuses : DEFAULT_CS_STATUSES)
    .gte('order_date', dateFrom)
    .lte('order_date', dateTo);

  if (paymentStatus !== 'all') {
    query = query.eq('payment_status', paymentStatus);
  }

  if (searchQuery) {
    const q = searchQuery.trim();
    const asNum = parseInt(q, 10);
    if (!isNaN(asNum)) {
      query = query.or(`order_number.ilike.%${q}%,woo_order_id.eq.${asNum}`);
    } else {
      query = query.ilike('order_number', `%${q}%`);
    }
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as any[];

  if (filters.paymentMethod) {
    rows = rows.filter(r => {
      const pm = (r.payment_method ?? '').toLowerCase();
      const f = filters.paymentMethod.toLowerCase();
      if (f === 'cod') return pm === 'cod' || pm === '' || pm == null;
      if (f === 'prepaid') return pm.startsWith('prepaid');
      if (f === 'partial paid') return pm.startsWith('partial paid');
      return pm.includes(f);
    });
  }

  let totalCollected = 0;
  let totalOutstanding = 0;

  for (const o of rows) {
    const ci = Array.isArray(o.order_courier_info) ? o.order_courier_info[0] : o.order_courier_info;
    const collected = ci?.collected_amount ?? 0;
    const receivable = ci?.total_receivable ?? o.total_amount;
    const discount = ci?.delivery_discount ?? 0;
    totalCollected += collected;
    totalOutstanding += Math.max(0, receivable - discount - collected);
  }

  return {
    totalCollected,
    totalOutstanding,
    totalCount: filters.paymentMethod ? rows.length : (count ?? 0),
    fetchedAt: new Date().toISOString(),
  };
}

export async function updateOrderSettlement(
  orderId: string,
  collectedAmount: number,
  deliveryCharge: number,
  paymentStatus: 'paid' | 'unpaid'
): Promise<void> {
  const { data: existing } = await supabase
    .from('order_courier_info')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existing) {
    await supabase.from('order_courier_info').update({
      collected_amount: collectedAmount,
      delivery_charge: deliveryCharge,
      settlement_source: 'manual',
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id);
  } else {
    await supabase.from('order_courier_info').insert({
      order_id: orderId,
      collected_amount: collectedAmount,
      delivery_charge: deliveryCharge,
      settlement_source: 'manual',
    });
  }

  await supabase.from('orders').update({
    payment_status: paymentStatus,
  }).eq('id', orderId);
}

export async function fetchCollectionStats(): Promise<{
  totalCollectedMonth: number;
  totalGatewayChargesMonth: number;
  unmatchedCount: number;
}> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: records } = await supabase
    .from('collection_records')
    .select('total_disbursed, payment_gateway_charges')
    .gte('created_at', startOfMonth.toISOString())
    .in('status', ['verified', 'processing', 'discrepancy']);

  const totalCollectedMonth = (records ?? []).reduce((s: number, r: any) => s + (r.total_disbursed ?? 0), 0);
  const totalGatewayChargesMonth = (records ?? []).reduce((s: number, r: any) => s + (r.payment_gateway_charges ?? 0), 0);

  const { count } = await supabase
    .from('collection_line_items')
    .select('*', { count: 'exact', head: true })
    .eq('match_status', 'not_found');

  return {
    totalCollectedMonth,
    totalGatewayChargesMonth,
    unmatchedCount: count ?? 0,
  };
}
