import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Download,
  Search,
  TrendingDown,
  TrendingUp,
  BarChart2,
  List,
  LayoutList,
  ChevronDown,
  ChevronRight,
  Paperclip,
  Pencil,
  Trash2,
  Loader2,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../../components/ui/Dialog';
import ExpenseModal from '../../components/finance/ExpenseModal';
import CategoryManager from '../../components/finance/CategoryManager';
import { useAuth } from '../../contexts/AuthContext';
import { formatBDT } from '../../lib/utils';
import {
  type Expense,
  type ExpenseCategory,
  type ExpenseFilters,
  fetchCategories,
  fetchExpenses,
  fetchMonthlySummary,
  deleteExpense,
  exportExpensesToCsv,
} from './expenseService';

type ViewMode = 'flat' | 'grouped';

export default function Expenses() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState({ currentMonth: 0, lastMonth: 0, currentMonthCount: 0, affectsProfitTotal: 0 });
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>('flat');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterParentId, setFilterParentId] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [filterAffectsProfit, setFilterAffectsProfit] = useState('');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [catManagerOpen, setCatManagerOpen] = useState(false);

  const loadAll = useCallback(async (activeFilters: ExpenseFilters = {}) => {
    setLoading(true);
    try {
      const [cats, exps, sum] = await Promise.all([
        fetchCategories(),
        fetchExpenses(activeFilters),
        fetchMonthlySummary(),
      ]);
      setCategories(cats);
      setExpenses(exps);
      setSummary(sum);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const applyFilters = () => {
    const f: ExpenseFilters = {};
    if (filterDateFrom) f.dateFrom = filterDateFrom;
    if (filterDateTo) f.dateTo = filterDateTo;
    if (filterCategoryId) f.categoryId = filterCategoryId;
    else if (filterParentId) f.parentCategoryId = filterParentId;
    if (filterAmountMin) f.amountMin = Number(filterAmountMin);
    if (filterAmountMax) f.amountMax = Number(filterAmountMax);
    if (filterAffectsProfit === 'true') f.affectsProfit = true;
    if (filterAffectsProfit === 'false') f.affectsProfit = false;
    setFilters(f);
    loadAll(f);
  };

  const clearFilters = () => {
    setFilterParentId('');
    setFilterCategoryId('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterAmountMin('');
    setFilterAmountMax('');
    setFilterAffectsProfit('');
    setSearchTerm('');
    setFilters({});
    loadAll({});
  };

  const hasActiveFilters = !!(
    filterParentId || filterCategoryId || filterDateFrom || filterDateTo ||
    filterAmountMin || filterAmountMax || filterAffectsProfit || searchTerm
  );

  const catMap = new Map(categories.map(c => [c.id, c]));

  const getCategoryPath = (catId: string): string => {
    const cat = catMap.get(catId);
    if (!cat) return '';
    if (cat.parent_id) {
      const parent = catMap.get(cat.parent_id);
      if (parent?.parent_id) {
        const gp = catMap.get(parent.parent_id);
        return gp ? `${gp.name} › ${parent.name} › ${cat.name}` : `${parent.name} › ${cat.name}`;
      }
      return parent ? `${parent.name} › ${cat.name}` : cat.name;
    }
    return cat.name;
  };

  const getRootParentId = (catId: string): string => {
    const cat = catMap.get(catId);
    if (!cat) return catId;
    if (!cat.parent_id) return catId;
    const parent = catMap.get(cat.parent_id);
    if (!parent) return cat.parent_id;
    if (!parent.parent_id) return parent.id;
    return parent.parent_id;
  };

  const filteredExpenses = expenses.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.description.toLowerCase().includes(term) ||
      (e.reference_number ?? '').toLowerCase().includes(term) ||
      getCategoryPath(e.category_id).toLowerCase().includes(term)
    );
  });

  const parentCategories = categories.filter(c => !c.parent_id);
  const subcategoriesForParent = categories.filter(c => c.parent_id === filterParentId && c.parent_id !== null);

  const monthDelta = summary.lastMonth > 0
    ? ((summary.currentMonth - summary.lastMonth) / summary.lastMonth) * 100
    : null;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExpense(deleteTarget);
      setDeleteTarget(null);
      loadAll(filters);
    } catch (err) {
      console.error('Failed to delete expense:', err);
      alert('Failed to delete expense.');
    } finally {
      setDeleting(false);
    }
  };

  const groupedExpenses = (): Map<string, { label: string; subtotal: number; items: Expense[] }> => {
    const map = new Map<string, { label: string; subtotal: number; items: Expense[] }>();
    filteredExpenses.forEach(e => {
      const rootId = getRootParentId(e.category_id);
      const root = catMap.get(rootId);
      const label = root?.name ?? 'Uncategorized';
      const existing = map.get(rootId);
      if (existing) {
        existing.items.push(e);
        existing.subtotal += Number(e.amount);
      } else {
        map.set(rootId, { label, subtotal: Number(e.amount), items: [e] });
      }
    });
    return map;
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const ids = new Set(groupedExpenses().keys());
    setExpandedGroups(ids);
  };

  const collapseAll = () => setExpandedGroups(new Set());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage business operating expenses</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5"
              onClick={() => setCatManagerOpen(true)}
            >
              <Tag className="w-4 h-4" />
              Manage Categories
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
            onClick={() => exportExpensesToCsv(filteredExpenses, categories)}
            disabled={filteredExpenses.length === 0}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex items-center gap-1.5"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">This Month</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">{formatBDT(summary.currentMonth)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{summary.currentMonthCount} transactions</p>
            </div>
            <div className="p-2.5 bg-red-50 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Month</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">{formatBDT(summary.lastMonth)}</p>
              {monthDelta !== null && (
                <p className={`text-xs mt-0.5 flex items-center gap-1 ${monthDelta > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {monthDelta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(monthDelta).toFixed(1)}% vs last month
                </p>
              )}
            </div>
            <div className="p-2.5 bg-gray-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-gray-500" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Affects P&amp;L</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">{formatBDT(summary.affectsProfitTotal)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Used in profit calculation</p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <BarChart2 className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search description, reference..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filterParentId}
              onChange={e => {
                setFilterParentId(e.target.value);
                setFilterCategoryId('');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All categories</option>
              {parentCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {filterParentId && subcategoriesForParent.length > 0 && (
              <select
                value={filterCategoryId}
                onChange={e => setFilterCategoryId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All subcategories</option>
                {subcategoriesForParent.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="From date"
            />
            <input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="To date"
            />

            <select
              value={filterAffectsProfit}
              onChange={e => setFilterAffectsProfit(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All expenses</option>
              <option value="true">Affects P&L only</option>
              <option value="false">Excluded from P&L</option>
            </select>

            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={applyFilters}>
                Apply
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {loading ? 'Loading...' : `${filteredExpenses.length} expense${filteredExpenses.length !== 1 ? 's' : ''}`}
            </p>
            <div className="flex items-center gap-1">
              {viewMode === 'grouped' && (
                <div className="flex gap-1 mr-2">
                  <button onClick={expandAll} className="text-xs text-blue-600 hover:underline">Expand all</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={collapseAll} className="text-xs text-blue-600 hover:underline">Collapse all</button>
                </div>
              )}
              <button
                onClick={() => setViewMode('flat')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'flat' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                title="Flat list"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'grouped' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                title="Grouped view"
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="p-4 bg-gray-100 rounded-full mb-3">
              <TrendingDown className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No expenses found</p>
            <p className="text-gray-400 text-sm mt-1">
              {hasActiveFilters ? 'Try clearing filters or adjusting your search.' : 'Add your first expense to get started.'}
            </p>
          </div>
        ) : viewMode === 'flat' ? (
          <FlatList
            expenses={filteredExpenses}
            getCategoryPath={getCategoryPath}
            onEdit={setEditExpense}
            onDelete={setDeleteTarget}
          />
        ) : (
          <GroupedView
            grouped={groupedExpenses()}
            expandedGroups={expandedGroups}
            onToggle={toggleGroup}
            getCategoryPath={getCategoryPath}
            onEdit={setEditExpense}
            onDelete={setDeleteTarget}
          />
        )}
      </Card>

      <ExpenseModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        categories={categories}
        userId={user?.id ?? ''}
        onSaved={() => loadAll(filters)}
      />

      <ExpenseModal
        open={!!editExpense}
        onOpenChange={open => { if (!open) setEditExpense(null); }}
        expense={editExpense}
        categories={categories}
        userId={user?.id ?? ''}
        onSaved={() => { setEditExpense(null); loadAll(filters); }}
      />

      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogClose onClose={() => setDeleteTarget(null)} />
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
          </DialogHeader>
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg mt-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700">
                Are you sure you want to delete this expense?
              </p>
              {deleteTarget && (
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {deleteTarget.description} — {formatBDT(deleteTarget.amount)}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">This action cannot be undone.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CategoryManager
        open={catManagerOpen}
        onOpenChange={setCatManagerOpen}
        onCategoriesChanged={() => loadAll(filters)}
      />
    </div>
  );
}

interface FlatListProps {
  expenses: Expense[];
  getCategoryPath: (id: string) => string;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}

function FlatList({ expenses, getCategoryPath, onEdit, onDelete }: FlatListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Description</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Reference</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">P&L</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Receipt</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {expenses.map(e => (
            <ExpenseRow
              key={e.id}
              expense={e}
              getCategoryPath={getCategoryPath}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface GroupedViewProps {
  grouped: Map<string, { label: string; subtotal: number; items: Expense[] }>;
  expandedGroups: Set<string>;
  onToggle: (id: string) => void;
  getCategoryPath: (id: string) => string;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}

function GroupedView({ grouped, expandedGroups, onToggle, getCategoryPath, onEdit, onDelete }: GroupedViewProps) {
  const entries = Array.from(grouped.entries());

  return (
    <div className="divide-y divide-gray-100">
      {entries.map(([id, group]) => {
        const isOpen = expandedGroups.has(id);
        return (
          <div key={id}>
            <button
              type="button"
              onClick={() => onToggle(id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <span className="font-medium text-gray-900 text-sm">{group.label}</span>
                <Badge variant="gray">{group.items.length}</Badge>
              </div>
              <span className="text-sm font-semibold text-gray-900">{formatBDT(group.subtotal)}</span>
            </button>

            {isOpen && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Subcategory</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Reference</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Amount</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">P&L</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">Receipt</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {group.items.map(e => (
                      <ExpenseRow
                        key={e.id}
                        expense={e}
                        getCategoryPath={getCategoryPath}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        compact
                      />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan={4} className="px-4 py-2 text-xs font-medium text-gray-500 text-right">
                        Subtotal
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                        {formatBDT(group.subtotal)}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ExpenseRowProps {
  expense: Expense;
  getCategoryPath: (id: string) => string;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
  compact?: boolean;
}

function ExpenseRow({ expense, getCategoryPath, onEdit, onDelete, compact }: ExpenseRowProps) {
  const py = compact ? 'py-2.5' : 'py-3';
  const dateStr = new Date(expense.expense_date + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className={`px-4 ${py} whitespace-nowrap text-sm text-gray-500`}>{dateStr}</td>
      <td className={`px-4 ${py} max-w-[180px]`}>
        <span className="text-sm text-gray-700 block truncate" title={getCategoryPath(expense.category_id)}>
          {getCategoryPath(expense.category_id)}
        </span>
      </td>
      <td className={`px-4 ${py} max-w-[200px]`}>
        <span className="text-sm text-gray-600 block truncate" title={expense.description}>
          {expense.description}
        </span>
      </td>
      <td className={`px-4 ${py} whitespace-nowrap`}>
        <span className="text-sm text-gray-400">{expense.reference_number ?? '—'}</span>
      </td>
      <td className={`px-4 ${py} whitespace-nowrap text-right`}>
        <span className="text-sm font-medium text-gray-900">{formatBDT(expense.amount)}</span>
      </td>
      <td className={`px-4 ${py} text-center`}>
        {expense.affects_profit ? (
          <Badge variant="emerald">Yes</Badge>
        ) : (
          <Badge variant="gray">No</Badge>
        )}
      </td>
      <td className={`px-4 ${py} text-center`}>
        {expense.receipt_url ? (
          <a
            href={expense.receipt_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
            title="View receipt"
          >
            <Paperclip className="w-4 h-4" />
          </a>
        ) : (
          <span className="text-gray-200">—</span>
        )}
      </td>
      <td className={`px-4 ${py} text-right whitespace-nowrap`}>
        <button
          type="button"
          onClick={() => onEdit(expense)}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors mr-1"
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(expense)}
          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}
