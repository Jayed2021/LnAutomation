import { supabase } from '../../../lib/supabase';
import { MatchedRow, CollectionRecord, CollectionLineItem, ApplyResult, OverdueOrder, ProviderType, ParseResult } from './types';
import { resolvePaymentStatus } from './collectionResolver';

const PROVIDER_LABEL: Record<ProviderType, string> = {
  pathao: 'Pathao',
  bkash: 'Bkash',
  ssl_commerz: 'SSL Commerz',
};

export async function saveCollectionRecord(
  provider: ProviderType,
  invoiceDate: string,
  invoiceNumber: string | null,
  parseResult: ParseResult,
  matchedRows: MatchedRow[],
  unmatchedRows: MatchedRow[],
  createdBy: string | null
): Promise<string> {
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
      match_status: 'matched' as const,
      match_confidence: r.match_confidence,
      applied: false,
      raw_data: r.raw_data,
    })),
    ...unmatchedRows.map(r => ({
      collection_record_id: recordId,
      order_id: null,
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
      match_status: 'not_found' as const,
      match_confidence: null,
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
    .eq('match_status', 'matched')
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
        delivery_charge,
        delivery_discount
      )
    `)
    .in('id', orderIds);

  const orderMap = new Map<string, any>();
  for (const o of (ordersData ?? []) as any[]) {
    orderMap.set(o.id, o);
  }

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
    const existingDelivery = courierInfo?.delivery_charge ?? 0;
    const deliveryDiscount = courierInfo?.delivery_discount ?? 0;
    const totalReceivable = courierInfo?.total_receivable ?? order.total_amount;

    const newCollected = existingCollected + (li.collected_amount ?? 0);
    const newDelivery = existingDelivery + (li.delivery_charge ?? 0);

    try {
      if (courierInfo?.id) {
        await supabase.from('order_courier_info').update({
          collected_amount: newCollected,
          delivery_charge: newDelivery,
          settlement_source: 'invoice_upload',
          updated_at: new Date().toISOString(),
        }).eq('id', courierInfo.id);
      } else {
        await supabase.from('order_courier_info').insert({
          order_id: li.order_id,
          collected_amount: newCollected,
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
        delivery_discount: deliveryDiscount,
      });

      if (resolverResult.shouldMarkPaid) {
        await supabase.from('orders').update({
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        }).eq('id', li.order_id);
        paidStatusSet++;
      }

      const { data: record } = await supabase
        .from('collection_records')
        .select('provider_type, invoice_date')
        .eq('id', recordId)
        .maybeSingle();

      const providerLabel = record?.provider_type ? PROVIDER_LABEL[record.provider_type as ProviderType] ?? record.provider_type : 'Invoice';
      const dateStr = record?.invoice_date ?? new Date().toISOString().split('T')[0];

      await supabase.from('order_activity_log').insert({
        order_id: li.order_id,
        action: `Settlement applied via ${providerLabel} invoice (${dateStr}). Collected: ৳${newCollected.toFixed(2)}, Delivery Charge: ৳${newDelivery.toFixed(2)}. ${resolverResult.reason}`,
        performed_by: userId,
      });

      await supabase.from('collection_line_items').update({ applied: true })
        .eq('id', li.id);

      ordersUpdated++;
    } catch (err: any) {
      errors.push(`Order ${order.order_number}: ${err.message}`);
    }
  }

  const { data: allItems } = await supabase
    .from('collection_line_items')
    .select('match_status, applied')
    .eq('collection_record_id', recordId);

  const matched = (allItems ?? []).filter((i: any) => i.match_status === 'matched').length;
  const unmatched = (allItems ?? []).filter((i: any) => i.match_status === 'not_found').length;
  const allApplied = (allItems ?? []).filter((i: any) => i.match_status === 'matched').every((i: any) => i.applied);

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

  const { data } = await supabase
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
