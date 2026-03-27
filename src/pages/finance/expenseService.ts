import { supabase } from '../../lib/supabase';

export interface ExpenseCategory {
  id: string;
  name: string;
  parent_id: string | null;
  affects_profit_default: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CategoryNode extends ExpenseCategory {
  children: CategoryNode[];
}

export interface Expense {
  id: string;
  expense_date: string;
  category_id: string;
  description: string;
  amount: number;
  affects_profit: boolean;
  receipt_url: string | null;
  reference_number: string | null;
  created_by: string | null;
  created_at: string;
  category?: ExpenseCategory;
}

export interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  parentCategoryId?: string;
  categoryId?: string;
  amountMin?: number;
  amountMax?: number;
  affectsProfit?: boolean;
}

export interface MonthlySummary {
  currentMonth: number;
  lastMonth: number;
  currentMonthCount: number;
  affectsProfitTotal: number;
}

export async function fetchCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export function buildCategoryTree(categories: ExpenseCategory[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  categories.forEach(cat => map.set(cat.id, { ...cat, children: [] }));

  const roots: CategoryNode[] = [];
  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else if (!node.parent_id) {
      roots.push(node);
    }
  });

  return roots;
}

export function flattenLeafCategories(tree: CategoryNode[]): ExpenseCategory[] {
  const leaves: ExpenseCategory[] = [];
  const visit = (nodes: CategoryNode[]) => {
    nodes.forEach(node => {
      if (node.children.length === 0) {
        leaves.push(node);
      } else {
        visit(node.children);
      }
    });
  };
  visit(tree);
  return leaves;
}

export async function fetchExpenses(filters: ExpenseFilters = {}): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(*)
    `)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.dateFrom) query = query.gte('expense_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('expense_date', filters.dateTo);
  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  } else if (filters.parentCategoryId) {
    const { data: cats } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('parent_id', filters.parentCategoryId);
    if (cats && cats.length > 0) {
      const ids = cats.map(c => c.id);
      query = query.in('category_id', ids);
    }
  }
  if (filters.amountMin !== undefined) query = query.gte('amount', filters.amountMin);
  if (filters.amountMax !== undefined) query = query.lte('amount', filters.amountMax);
  if (filters.affectsProfit !== undefined) query = query.eq('affects_profit', filters.affectsProfit);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchMonthlySummary(): Promise<MonthlySummary> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .split('T')[0];
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    .toISOString()
    .split('T')[0];

  const [current, last] = await Promise.all([
    supabase
      .from('expenses')
      .select('amount, affects_profit')
      .gte('expense_date', currentMonthStart),
    supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', lastMonthStart)
      .lte('expense_date', lastMonthEnd),
  ]);

  if (current.error) throw current.error;
  if (last.error) throw last.error;

  const currentData = current.data ?? [];
  const lastData = last.data ?? [];

  return {
    currentMonth: currentData.reduce((s, e) => s + Number(e.amount), 0),
    lastMonth: lastData.reduce((s, e) => s + Number(e.amount), 0),
    currentMonthCount: currentData.length,
    affectsProfitTotal: currentData
      .filter(e => e.affects_profit)
      .reduce((s, e) => s + Number(e.amount), 0),
  };
}

export async function uploadReceipt(file: File, expenseId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `expenses/${expenseId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('expense-receipts')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data: signedData, error: signedError } = await supabase.storage
    .from('expense-receipts')
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signedError) throw signedError;
  return signedData.signedUrl;
}

export async function deleteReceipt(receiptUrl: string): Promise<void> {
  const match = receiptUrl.match(/expense-receipts\/(.+?)\?/);
  if (!match) return;
  const path = decodeURIComponent(match[1]);
  await supabase.storage.from('expense-receipts').remove([path]);
}

export interface CreateExpensePayload {
  expense_date: string;
  category_id: string;
  description: string;
  amount: number;
  affects_profit: boolean;
  reference_number?: string;
  receipt_file?: File;
  created_by: string;
}

export async function createExpense(payload: CreateExpensePayload): Promise<Expense> {
  const insertData: Record<string, unknown> = {
    expense_date: payload.expense_date,
    category_id: payload.category_id,
    description: payload.description,
    amount: payload.amount,
    affects_profit: payload.affects_profit,
    reference_number: payload.reference_number || null,
    created_by: payload.created_by,
  };

  const { data, error } = await supabase
    .from('expenses')
    .insert(insertData)
    .select(`*, category:expense_categories(*)`)
    .single();

  if (error) throw error;

  if (payload.receipt_file) {
    const url = await uploadReceipt(payload.receipt_file, data.id);
    const { error: updateError } = await supabase
      .from('expenses')
      .update({ receipt_url: url })
      .eq('id', data.id);
    if (updateError) throw updateError;
    data.receipt_url = url;
  }

  return data;
}

export interface UpdateExpensePayload {
  expense_date?: string;
  category_id?: string;
  description?: string;
  amount?: number;
  affects_profit?: boolean;
  reference_number?: string;
  receipt_file?: File;
  clear_receipt?: boolean;
}

export async function updateExpense(id: string, payload: UpdateExpensePayload): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (payload.expense_date !== undefined) updateData.expense_date = payload.expense_date;
  if (payload.category_id !== undefined) updateData.category_id = payload.category_id;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.amount !== undefined) updateData.amount = payload.amount;
  if (payload.affects_profit !== undefined) updateData.affects_profit = payload.affects_profit;
  if (payload.reference_number !== undefined) updateData.reference_number = payload.reference_number || null;

  if (payload.clear_receipt) {
    updateData.receipt_url = null;
  }

  if (payload.receipt_file) {
    const url = await uploadReceipt(payload.receipt_file, id);
    updateData.receipt_url = url;
  }

  const { error } = await supabase.from('expenses').update(updateData).eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(expense: Expense): Promise<void> {
  if (expense.receipt_url) {
    await deleteReceipt(expense.receipt_url).catch(() => {});
  }
  const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
  if (error) throw error;
}

export async function addCategory(
  name: string,
  parentId: string | null,
  affectsProfitDefault: boolean
): Promise<ExpenseCategory> {
  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ name, parent_id: parentId, affects_profit_default: affectsProfitDefault })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<ExpenseCategory, 'name' | 'is_active' | 'affects_profit_default'>>
): Promise<void> {
  const { error } = await supabase
    .from('expense_categories')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export function exportExpensesToCsv(expenses: Expense[], categories: ExpenseCategory[]): void {
  const catMap = new Map(categories.map(c => [c.id, c]));

  const getCategoryPath = (catId: string): string => {
    const cat = catMap.get(catId);
    if (!cat) return '';
    if (cat.parent_id) {
      const parent = catMap.get(cat.parent_id);
      if (parent?.parent_id) {
        const grandparent = catMap.get(parent.parent_id);
        return grandparent ? `${grandparent.name} > ${parent.name} > ${cat.name}` : `${parent.name} > ${cat.name}`;
      }
      return parent ? `${parent.name} > ${cat.name}` : cat.name;
    }
    return cat.name;
  };

  const headers = ['Date', 'Category', 'Description', 'Reference', 'Amount (BDT)', 'Affects P&L'];
  const rows = expenses.map(e => [
    e.expense_date,
    getCategoryPath(e.category_id),
    `"${e.description.replace(/"/g, '""')}"`,
    e.reference_number ?? '',
    e.amount.toFixed(2),
    e.affects_profit ? 'Yes' : 'No',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
