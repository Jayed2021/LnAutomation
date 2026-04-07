import { supabase } from '../../../lib/supabase';
import { ParsedRow, MatchedRow, MatchResult, MatchStatus, MatchConfidence } from './types';

interface OrderLookup {
  id: string;
  order_number: string;
  woo_order_id: number | null;
  cs_status: string;
  payment_method: string | null;
  payment_status: string;
  total_amount: number;
  paid_amount: number | null;
  customer_name: string;
  tracking_number: string | null;
  consignment_id: string | null;
  total_receivable: number | null;
  collected_amount: number | null;
  delivery_charge: number | null;
  delivery_discount: number | null;
  settlement_source: string | null;
  courier_info_id: string | null;
  payment_reference: string | null;
}

async function buildLookupMaps(rows: ParsedRow[]): Promise<{
  byConsignment: Map<string, OrderLookup>;
  byWooId: Map<number, OrderLookup>;
  byPaymentReference: Map<string, OrderLookup>;
}> {
  const consignmentIds = rows.map(r => r.consignment_id).filter(Boolean) as string[];
  const wooIds = rows.map(r => r.woo_order_id).filter(Boolean) as number[];
  const transactionIds = rows.map(r => r.transaction_id).filter(Boolean) as string[];

  const byConsignment = new Map<string, OrderLookup>();
  const byWooId = new Map<number, OrderLookup>();
  const byPaymentReference = new Map<string, OrderLookup>();

  const orClauses: string[] = [];
  if (wooIds.length > 0) orClauses.push(`woo_order_id.in.(${wooIds.join(',')})`);
  if (transactionIds.length > 0) orClauses.push(`payment_reference.in.(${transactionIds.map(t => `"${t}"`).join(',')})`);

  if (orClauses.length > 0) {
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
        paid_amount,
        payment_reference,
        customers!inner(full_name),
        order_courier_info(
          id,
          tracking_number,
          consignment_id,
          total_receivable,
          collected_amount,
          delivery_charge,
          delivery_discount,
          settlement_source
        )
      `)
      .or(orClauses.join(','));

    if (data) {
      for (const o of data as any[]) {
        const courierInfo = Array.isArray(o.order_courier_info) ? o.order_courier_info[0] : o.order_courier_info;
        const lookup: OrderLookup = {
          id: o.id,
          order_number: o.order_number,
          woo_order_id: o.woo_order_id,
          cs_status: o.cs_status,
          payment_method: o.payment_method,
          payment_status: o.payment_status,
          total_amount: o.total_amount,
          paid_amount: o.paid_amount,
          payment_reference: o.payment_reference ?? null,
          customer_name: o.customers?.full_name ?? 'Unknown',
          tracking_number: courierInfo?.tracking_number ?? null,
          consignment_id: courierInfo?.consignment_id ?? null,
          total_receivable: courierInfo?.total_receivable ?? null,
          collected_amount: courierInfo?.collected_amount ?? null,
          delivery_charge: courierInfo?.delivery_charge ?? null,
          delivery_discount: courierInfo?.delivery_discount ?? null,
          settlement_source: courierInfo?.settlement_source ?? null,
          courier_info_id: courierInfo?.id ?? null,
        };

        if (o.woo_order_id) byWooId.set(o.woo_order_id, lookup);
        if (o.payment_reference) byPaymentReference.set(o.payment_reference, lookup);
        if (courierInfo?.tracking_number) byConsignment.set(courierInfo.tracking_number, lookup);
        if (courierInfo?.consignment_id) byConsignment.set(courierInfo.consignment_id, lookup);
      }
    }
  }

  if (consignmentIds.length > 0) {
    const { data: courierData } = await supabase
      .from('order_courier_info')
      .select(`
        id,
        order_id,
        tracking_number,
        consignment_id,
        total_receivable,
        collected_amount,
        delivery_charge,
        delivery_discount,
        settlement_source,
        orders!inner(
          id,
          order_number,
          woo_order_id,
          cs_status,
          payment_method,
          payment_status,
          total_amount,
          paid_amount,
          payment_reference,
          customers(full_name)
        )
      `)
      .or(
        consignmentIds.map(id => `tracking_number.eq.${id}`).join(',') +
        ',' +
        consignmentIds.map(id => `consignment_id.eq.${id}`).join(',')
      );

    if (courierData) {
      for (const ci of courierData as any[]) {
        const o = ci.orders;
        if (!o) continue;
        const lookup: OrderLookup = {
          id: o.id,
          order_number: o.order_number,
          woo_order_id: o.woo_order_id,
          cs_status: o.cs_status,
          payment_method: o.payment_method,
          payment_status: o.payment_status,
          total_amount: o.total_amount,
          paid_amount: o.paid_amount,
          payment_reference: o.payment_reference ?? null,
          customer_name: o.customers?.full_name ?? 'Unknown',
          tracking_number: ci.tracking_number,
          consignment_id: ci.consignment_id,
          total_receivable: ci.total_receivable,
          collected_amount: ci.collected_amount,
          delivery_charge: ci.delivery_charge,
          delivery_discount: ci.delivery_discount,
          settlement_source: ci.settlement_source,
          courier_info_id: ci.id,
        };

        if (ci.tracking_number) byConsignment.set(ci.tracking_number, lookup);
        if (ci.consignment_id) byConsignment.set(ci.consignment_id, lookup);
        if (o.woo_order_id && !byWooId.has(o.woo_order_id)) byWooId.set(o.woo_order_id, lookup);
        if (o.payment_reference && !byPaymentReference.has(o.payment_reference)) byPaymentReference.set(o.payment_reference, lookup);
      }
    }
  }

  return { byConsignment, byWooId, byPaymentReference };
}

function toMatchedRow(
  row: ParsedRow,
  lookup: OrderLookup | undefined,
  matchStatus: MatchStatus,
  confidence: MatchConfidence
): MatchedRow {
  return {
    ...row,
    order_id: lookup?.id ?? null,
    match_status: matchStatus,
    match_confidence: confidence,
    order_number: lookup?.order_number ?? null,
    customer_name: lookup?.customer_name ?? null,
    cs_status: lookup?.cs_status ?? null,
    payment_method: lookup?.payment_method ?? null,
    payment_status: lookup?.payment_status ?? null,
    total_amount: lookup?.total_amount ?? null,
    existing_collected: lookup?.collected_amount ?? 0,
    existing_delivery_charge: lookup?.delivery_charge ?? 0,
  };
}

export async function matchParsedRows(rows: ParsedRow[]): Promise<MatchResult> {
  const { byConsignment, byWooId, byPaymentReference } = await buildLookupMaps(rows);

  const matched: MatchedRow[] = [];
  const unmatched: MatchedRow[] = [];

  for (const row of rows) {
    let lookup: OrderLookup | undefined;
    let confidence: MatchConfidence = row.match_confidence_hint;

    if (row.consignment_id) {
      lookup = byConsignment.get(row.consignment_id);
      if (lookup) confidence = 'high';
    }

    if (!lookup && row.woo_order_id) {
      lookup = byWooId.get(row.woo_order_id);
      if (lookup) {
        confidence = row.match_confidence_hint === 'high' ? 'high' : row.match_confidence_hint;
        if (row.transaction_id && byPaymentReference.get(row.transaction_id)?.id === lookup.id) {
          confidence = 'high';
        }
      }
    }

    if (!lookup && row.transaction_id) {
      lookup = byPaymentReference.get(row.transaction_id);
      if (lookup) confidence = 'high';
    }

    if (lookup) {
      const pm = (lookup.payment_method ?? '').toLowerCase().trim();
      const isPrepaid = pm.startsWith('prepaid') || (pm !== '' && !pm.includes('cod') && !pm.includes('partial paid') && !pm.includes('+cod'));

      if (lookup.payment_status === 'paid' && isPrepaid) {
        const existingCollected = lookup.collected_amount ?? 0;
        if (existingCollected > 0) {
          unmatched.push(toMatchedRow(row, lookup, 'paid_already_settled', confidence));
        } else {
          matched.push(toMatchedRow(row, lookup, 'paid_no_collection', confidence));
        }
      } else {
        matched.push(toMatchedRow(row, lookup, 'matched', confidence));
      }
    } else {
      unmatched.push(toMatchedRow(row, undefined, 'not_found', 'low'));
    }
  }

  return {
    matched,
    unmatched,
    totalMatched: matched.length,
    totalUnmatched: unmatched.length,
  };
}
