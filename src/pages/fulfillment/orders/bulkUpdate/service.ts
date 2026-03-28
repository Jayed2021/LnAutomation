import { supabase } from '../../../../lib/supabase';
import { PreviewRow } from './types';

export async function fetchOrdersByWooIds(wooIds: number[]) {
  if (wooIds.length === 0) return [];
  const { data, error } = await supabase
    .from('orders')
    .select('id, woo_order_id, cs_status, order_date')
    .in('woo_order_id', wooIds);
  if (error) throw error;
  return data ?? [];
}

export interface ApplyResult {
  updated: number;
  failed: number;
  errors: string[];
}

export async function applyBulkUpdate(
  rows: PreviewRow[],
  userId: string | null
): Promise<ApplyResult> {
  const validRows = rows.filter(r => r.status === 'valid');
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of validRows) {
    try {
      const now = new Date().toISOString();

      const orderUpdate: Record<string, unknown> = {
        cs_status: row.mappedCsStatus,
        updated_at: now,
      };

      if (row.mappedCsStatus === 'late_delivery') {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 3);
        orderUpdate.expected_delivery_date = futureDate.toISOString();
      }

      const { error: orderErr } = await supabase
        .from('orders')
        .update(orderUpdate)
        .eq('id', row.dbOrderId!);

      if (orderErr) throw orderErr;

      const courierUpsert: Record<string, unknown> = {
        order_id: row.dbOrderId!,
        courier_status: row.mappedCourierStatus,
        courier_status_updated_at: now,
        updated_at: now,
      };
      if (row.rawEcr) courierUpsert.tracking_number = row.rawEcr;
      if (row.mappedCourierCompany !== undefined) courierUpsert.courier_company = row.mappedCourierCompany;
      if (row.costOfDelivery !== null) courierUpsert.delivery_charge = row.costOfDelivery;
      if (row.collectedAmount !== null) courierUpsert.collected_amount = row.collectedAmount;

      const { error: courierErr } = await supabase
        .from('order_courier_info')
        .upsert(courierUpsert, { onConflict: 'order_id' });

      if (courierErr) throw courierErr;

      await supabase.from('order_activity_log').insert({
        order_id: row.dbOrderId!,
        action: `Status updated to "${row.mappedCsStatus}" via CSV Import`,
        performed_by: userId,
      });

      updated++;
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Row ${row.rowIndex} (Order ${row.rawOrderId}): ${msg}`);
    }
  }

  return { updated, failed, errors };
}
