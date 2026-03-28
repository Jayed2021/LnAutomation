import { supabase } from '../../../../lib/supabase';
import {
  OrderDetail, OrderItem, OrderCourierInfo, OrderPrescription,
  OrderNote, CallLog, ActivityLog, PackagingItem,
} from './types';

export async function fetchOrderDetail(id: string): Promise<OrderDetail | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, woo_order_id, woo_order_number,
      order_date, created_at, cs_status, fulfillment_status,
      payment_method, payment_status, payment_reference,
      subtotal, discount_amount, shipping_fee, total_amount,
      order_source, conversation_url, meta_screenshot_url,
      confirmation_type, courier_entry_method,
      late_delivery_reason, expected_delivery_date,
      exchange_return_id, cancellation_reason, partial_delivery_notes, notes,
      stock_shortage, coupon_lines, fee_lines, customer_note,
      customer:customers(id, full_name, phone_primary, phone_secondary, email, address_line1, city, district),
      assigned_user:users!orders_assigned_to_fkey(id, full_name),
      confirmed_user:users!orders_confirmed_by_fkey(id, full_name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as OrderDetail | null;
}

export async function fetchOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('id, product_id, sku, product_name, quantity, unit_price, line_total, discount_amount, pick_location, meta_data, woo_item_id')
    .eq('order_id', orderId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as OrderItem[];
}

export async function fetchOrderCourierInfo(orderId: string): Promise<OrderCourierInfo | null> {
  const { data, error } = await supabase
    .from('order_courier_info')
    .select('id, courier_company, tracking_number, courier_area, total_receivable, collected_amount, delivery_charge, cod_charge, settlement_source, consignment_id, courier_status, courier_status_updated_at, courier_api_response, courier_api_error')
    .eq('order_id', orderId)
    .maybeSingle();
  if (error) throw error;
  return data as OrderCourierInfo | null;
}

export async function fetchOrderPrescriptions(orderId: string): Promise<OrderPrescription[]> {
  const { data, error } = await supabase
    .from('order_prescriptions')
    .select('id, order_item_id, prescription_type, lens_type, custom_lens_type, customer_price, lens_price, fitting_charge, od_sph, od_cyl, od_axis, od_pd, os_sph, os_cyl, os_axis, os_pd, rx_file_url, lab_status, lab_sent_date, lab_return_date')
    .eq('order_id', orderId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as OrderPrescription[];
}

export async function fetchOrderNotes(orderId: string): Promise<OrderNote[]> {
  const { data, error } = await supabase
    .from('order_notes')
    .select('id, note_text, created_at, created_by_user:users!order_notes_created_by_fkey(full_name)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as OrderNote[];
}

export async function fetchCallLog(orderId: string): Promise<CallLog[]> {
  const { data, error } = await supabase
    .from('order_call_log')
    .select('id, notes, created_at, called_by_user:users!order_call_log_called_by_fkey(full_name)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CallLog[];
}

export async function fetchActivityLog(orderId: string): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('order_activity_log')
    .select('id, action, created_at, performed_by_user:users!order_activity_log_performed_by_fkey(full_name)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ActivityLog[];
}

export async function fetchPackagingItems(orderId: string): Promise<PackagingItem[]> {
  const { data, error } = await supabase
    .from('order_packaging_items')
    .select('id, product_id, sku, product_name, quantity, unit_cost, line_total, source_order_item_id, source_item:order_items!order_packaging_items_source_order_item_id_fkey(product_name)')
    .eq('order_id', orderId)
    .order('created_at');
  if (error) throw error;
  return ((data ?? []) as any[]).map(row => ({
    id: row.id,
    product_id: row.product_id,
    sku: row.sku,
    product_name: row.product_name,
    quantity: row.quantity,
    unit_cost: row.unit_cost,
    line_total: row.line_total,
    source_order_item_id: row.source_order_item_id ?? null,
    source_item_name: row.source_item?.product_name ?? null,
  }));
}

export async function logActivity(orderId: string, action: string, userId: string | null) {
  await supabase.from('order_activity_log').insert({
    order_id: orderId,
    action,
    performed_by: userId,
  });
}

export interface StoreProfile {
  store_name: string | null;
  logo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone_primary: string | null;
  email: string | null;
  website: string | null;
  invoice_footer: string | null;
}

export async function fetchStoreProfile(): Promise<StoreProfile | null> {
  const { data } = await supabase
    .from('store_profile')
    .select('store_name, logo_url, address_line1, address_line2, city, postal_code, country, phone_primary, email, website, invoice_footer')
    .limit(1)
    .maybeSingle();
  return data as StoreProfile | null;
}

export interface FifoLotInfo {
  barcode: string;
  location_code: string;
}

export async function fetchFifoLotsForItems(
  items: { id: string; product_id: string | null; sku?: string }[]
): Promise<Map<string, FifoLotInfo>> {
  const result = new Map<string, FifoLotInfo>();

  const skusWithoutProduct = items.filter(i => !i.product_id && i.sku).map(i => i.sku!);
  let skuToProductId = new Map<string, string>();
  if (skusWithoutProduct.length > 0) {
    const { data: prods } = await supabase
      .from('products')
      .select('id, sku')
      .in('sku', skusWithoutProduct);
    if (prods) {
      for (const p of prods) skuToProductId.set(p.sku, p.id);
    }
  }

  const resolved = items.map(i => ({
    id: i.id,
    product_id: i.product_id ?? (i.sku ? skuToProductId.get(i.sku) ?? null : null),
  })).filter(i => i.product_id);

  if (resolved.length === 0) return result;

  await Promise.all(
    resolved.map(async item => {
      const { data: lots } = await supabase
        .from('inventory_lots')
        .select('lot_number, barcode, remaining_quantity, reserved_quantity, location:warehouse_locations(code)')
        .eq('product_id', item.product_id!)
        .order('received_date', { ascending: true });
      const available = (lots ?? []).filter((l: any) => (l.remaining_quantity - (l.reserved_quantity ?? 0)) > 0);
      if (available.length > 0) {
        const lot = available[0] as any;
        result.set(item.id, {
          barcode: lot.barcode || lot.lot_number,
          location_code: lot.location?.code || 'N/A',
        });
      }
    })
  );

  return result;
}
