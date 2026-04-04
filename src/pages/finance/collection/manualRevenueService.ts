import { supabase } from '../../../lib/supabase';

export type RevenueCategory = 'operational_revenue' | 'bank_transfer' | 'wholesale';

export const REVENUE_CATEGORY_LABELS: Record<RevenueCategory, string> = {
  operational_revenue: 'Operational Revenue',
  bank_transfer: 'Bank Transfer',
  wholesale: 'Wholesale',
};

export interface ManualRevenueEntry {
  id: string;
  revenue_date: string;
  category: RevenueCategory;
  amount: number;
  description: string | null;
  reference_number: string | null;
  order_id: string | null;
  bank_deposit_date: string | null;
  bank_deposit_reference: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  order?: {
    order_number: string;
    order_date: string;
    cs_status: string;
    payment_status: string;
  } | null;
  creator?: {
    full_name: string;
    username: string;
  } | null;
}

export interface CreateManualRevenueInput {
  revenue_date: string;
  category: RevenueCategory;
  amount: number;
  description?: string | null;
  reference_number?: string | null;
  order_id?: string | null;
  bank_deposit_date?: string | null;
  bank_deposit_reference?: string | null;
}

export async function fetchManualRevenueEntries(
  from?: string,
  to?: string,
  category?: RevenueCategory | ''
): Promise<ManualRevenueEntry[]> {
  let query = supabase
    .from('manual_revenue_entries')
    .select(`
      *,
      orders(order_number, order_date, cs_status, payment_status),
      users!created_by(full_name, username)
    `)
    .order('revenue_date', { ascending: false });

  if (from) query = query.gte('revenue_date', from);
  if (to) query = query.lte('revenue_date', to);
  if (category) query = query.eq('category', category);

  const { data } = await query;

  return ((data ?? []) as any[]).map(row => ({
    ...row,
    order: row.orders ?? null,
    creator: row.users ?? null,
  }));
}

export async function fetchManualRevenueTotalForMonth(year: number, month: number): Promise<number> {
  const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0);
  const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  const { data } = await supabase
    .from('manual_revenue_entries')
    .select('amount')
    .gte('revenue_date', startOfMonth)
    .lte('revenue_date', endOfMonth);

  return ((data ?? []) as any[]).reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0);
}

export async function fetchManualRevenueTotalForRange(from: string, to: string): Promise<{
  total: number;
  byCategory: Record<string, number>;
}> {
  const { data } = await supabase
    .from('manual_revenue_entries')
    .select('amount, category')
    .gte('revenue_date', from)
    .lte('revenue_date', to);

  const rows = (data ?? []) as any[];
  const total = rows.reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0);
  const byCategory: Record<string, number> = {};
  for (const r of rows) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + (r.amount ?? 0);
  }
  return { total, byCategory };
}

export async function createManualRevenueEntry(
  input: CreateManualRevenueInput,
  userId: string | null
): Promise<ManualRevenueEntry> {
  const { data, error } = await supabase
    .from('manual_revenue_entries')
    .insert({
      revenue_date: input.revenue_date,
      category: input.category,
      amount: input.amount,
      description: input.description ?? null,
      reference_number: input.reference_number ?? null,
      order_id: input.order_id ?? null,
      bank_deposit_date: input.bank_deposit_date ?? null,
      bank_deposit_reference: input.bank_deposit_reference ?? null,
      created_by: userId,
    })
    .select(`*, orders(order_number, order_date, cs_status, payment_status), users!created_by(full_name, username)`)
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create revenue entry');

  if (input.order_id) {
    await markOrderPaidByManualRevenue(input.order_id, (data as any).id, userId, input);
  }

  return {
    ...(data as any),
    order: (data as any).orders ?? null,
    creator: (data as any).users ?? null,
  };
}

async function markOrderPaidByManualRevenue(
  orderId: string,
  entryId: string,
  userId: string | null,
  input: CreateManualRevenueInput
): Promise<void> {
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, payment_status, cs_status')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return;
  if ((order as any).payment_status === 'paid') return;

  await supabase.from('orders').update({
    payment_status: 'paid',
    updated_at: new Date().toISOString(),
  }).eq('id', orderId);

  const categoryLabel = REVENUE_CATEGORY_LABELS[input.category] ?? input.category;
  const refPart = input.reference_number ? `, Ref: ${input.reference_number}` : '';
  const depositPart = input.bank_deposit_date ? `, Bank deposit: ${input.bank_deposit_date}` : '';

  await supabase.from('order_activity_log').insert({
    order_id: orderId,
    action: `Marked as paid via manual revenue entry (${categoryLabel}${refPart}${depositPart}). Amount: ৳${input.amount.toFixed(2)}.`,
    performed_by: userId,
  });
}

export async function updateManualRevenueEntry(
  id: string,
  input: Partial<CreateManualRevenueInput>,
  userId: string | null,
  previousOrderId: string | null
): Promise<void> {
  await supabase.from('manual_revenue_entries').update({
    ...input,
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  const newOrderId = input.order_id ?? null;

  if (newOrderId && newOrderId !== previousOrderId) {
    const fullInput: CreateManualRevenueInput = {
      revenue_date: input.revenue_date ?? '',
      category: input.category ?? 'operational_revenue',
      amount: input.amount ?? 0,
      description: input.description,
      reference_number: input.reference_number,
      order_id: newOrderId,
      bank_deposit_date: input.bank_deposit_date,
      bank_deposit_reference: input.bank_deposit_reference,
    };
    await markOrderPaidByManualRevenue(newOrderId, id, userId, fullInput);
  }
}

export async function deleteManualRevenueEntry(id: string): Promise<void> {
  await supabase.from('manual_revenue_entries').delete().eq('id', id);
}

export async function searchOrdersForRevenue(
  query: string
): Promise<Array<{ id: string; order_number: string; order_date: string; total_amount: number; customer_name: string; payment_status: string; cs_status: string }>> {
  if (!query.trim()) return [];

  const { data } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      order_date,
      total_amount,
      payment_status,
      cs_status,
      customers(full_name)
    `)
    .ilike('order_number', `%${query}%`)
    .limit(10);

  return ((data ?? []) as any[]).map(o => ({
    id: o.id,
    order_number: o.order_number,
    order_date: o.order_date,
    total_amount: o.total_amount,
    customer_name: o.customers?.full_name ?? 'Unknown',
    payment_status: o.payment_status,
    cs_status: o.cs_status,
  }));
}
