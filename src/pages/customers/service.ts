import { supabase } from '../../lib/supabase';
import type {
  Customer,
  CustomerOrder,
  CustomerPrescription,
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from './types';

const CUSTOMERS_SELECT =
  'id, woo_customer_id, full_name, email, phone_primary, phone_secondary, address_line1, city, district, notes, created_at, updated_at, total_orders, successful_deliveries, failed_deliveries, cancelled_orders, total_spent, avg_order_value, delivery_success_rate, first_order_date, last_order_date, has_delivered_order';

export const CUSTOMERS_PAGE_SIZE = 20;

export async function fetchCustomers(
  search = '',
  typeFilter: 'all' | 'new' | 'returning' = 'all',
  page = 0
): Promise<{ data: Customer[]; count: number }> {
  const from = page * CUSTOMERS_PAGE_SIZE;
  const to = from + CUSTOMERS_PAGE_SIZE - 1;

  let query = supabase
    .from('customers')
    .select(CUSTOMERS_SELECT, { count: 'exact' })
    .order('last_order_date', { ascending: false, nullsFirst: false })
    .range(from, to);

  if (search.trim()) {
    const q = search.trim();
    query = query.or(
      `full_name.ilike.%${q}%,phone_primary.ilike.%${q}%,email.ilike.%${q}%`
    );
  }

  if (typeFilter === 'returning') {
    query = query.eq('has_delivered_order', true);
  } else if (typeFilter === 'new') {
    query = query.eq('has_delivered_order', false);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data || []) as Customer[], count: count ?? 0 };
}

export async function fetchCustomerById(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Customer | null;
}

export async function fetchCustomerOrders(customerId: string): Promise<CustomerOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, cs_status, order_date, total_amount')
    .eq('customer_id', customerId)
    .order('order_date', { ascending: false });
  if (error) throw error;
  return (data || []) as CustomerOrder[];
}

export async function fetchCustomerPrescriptions(customerId: string): Promise<CustomerPrescription[]> {
  const { data, error } = await supabase
    .from('customer_prescriptions')
    .select('*')
    .eq('customer_id', customerId)
    .order('recorded_date', { ascending: false });
  if (error) throw error;
  return (data || []) as CustomerPrescription[];
}

export async function createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({
      full_name: payload.full_name,
      phone_primary: payload.phone_primary || null,
      phone_secondary: payload.phone_secondary || null,
      email: payload.email || null,
      address_line1: payload.address_line1 || null,
      city: payload.city || null,
      district: payload.district || null,
      notes: payload.notes || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(id: string, payload: UpdateCustomerPayload): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function addCustomerPrescription(
  customerId: string,
  payload: Omit<CustomerPrescription, 'id' | 'customer_id' | 'created_at' | 'source_order_id'>
): Promise<CustomerPrescription> {
  const { data, error } = await supabase
    .from('customer_prescriptions')
    .insert({ customer_id: customerId, ...payload })
    .select('*')
    .single();
  if (error) throw error;
  return data as CustomerPrescription;
}

export async function deleteCustomerPrescription(id: string): Promise<void> {
  const { error } = await supabase
    .from('customer_prescriptions')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
