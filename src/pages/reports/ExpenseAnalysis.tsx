import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  ArrowLeft, Download, Receipt, TrendingDown,
  ChevronUp, ChevronDown, ChevronsUpDown, Filter,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  fetchExpenses, fetchCategories,
  buildCategoryTree, type Expense, type ExpenseCategory, type ExpenseType,
} from '../finance/expenseService';

/* ─── Date helpers ──────────────────────────────────────────────── */
function getRange(period: string, custom: { from: string; to: string }) {
  const now = new Date();
  if (period === 'this_month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    };
  }
  if (period === 'last_month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
      to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0],
    };
  }
  if (period === 'last_3_months') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0],
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    };
  }
  return custom;
}

function fmt(n: number) {
  return '৳' + n.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const TYPE_COLORS: Record<ExpenseType, string> = {
  operating: '#3b82f6',
  investing: '#f59e0b',
  financing: '#10b981',
};

const TYPE_BG: Record<ExpenseType, string> = {
  operating: 'bg-blue-100 text-blue-700',
  investing: 'bg-amber-100 text-amber-700',
  financing: 'bg-emerald-100 text-emerald-700',
};

type SortField = 'expense_date' | 'amount' | 'category';
type SortDir = 'asc' | 'desc';

export default function ExpenseAnalysis() {
  const { canViewDetailedReports } = useAuth();
  if (!canViewDetailedReports) return <Navigate to="/reports" replace />;

  const navigate = useNavigate();
  const [period, setPeriod] = useState('this_month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<ExpenseType | ''>('');
  const [filterCat, setFilterCat] = useState('');
  const [sortField, setSortField] = useState<SortField>('expense_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const range = getRange(period, custom);

  const load = useCallback(async () => {
    if (period === 'custom' && (!custom.from || !custom.to)) return;
    setLoading(true);
    try {
      const [exp, cats] = await Promise.all([
        fetchExpenses({ dateFrom: range.from, dateTo: range.to }),
        fetchCategories(),
      ]);
      setExpenses(exp);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, period, custom.from, custom.to]);

  useEffect(() => { load(); }, [load]);

  /* ─── KPIs ─────────────────────────────────────────────────────── */
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const byType = { operating: 0, investing: 0, financing: 0 } as Record<ExpenseType, number>;
  expenses.forEach(e => { byType[e.expense_type] = (byType[e.expense_type] ?? 0) + Number(e.amount); });

  /* ─── Category chart ────────────────────────────────────────────── */
  const catMap = new Map(categories.map(c => [c.id, c]));
  const getRootName = (catId: string): string => {
    const cat = catMap.get(catId);
    if (!cat) return 'Unknown';
    if (!cat.parent_id) return cat.name;
    const parent = catMap.get(cat.parent_id);
    if (!parent || !parent.parent_id) return parent?.name ?? cat.name;
    const gp = catMap.get(parent.parent_id);
    return gp?.name ?? parent.name;
  };

  const catTotals: Record<string, number> = {};
  expenses.forEach(e => {
    const root = getRootName(e.category_id);
    catTotals[root] = (catTotals[root] ?? 0) + Number(e.amount);
  });
  const barData = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const pieData = Object.entries(byType)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({ name: type.charAt(0).toUpperCase() + type.slice(1), value, type }));

  /* ─── Filtered / sorted table ───────────────────────────────────── */
  const filtered = expenses.filter(e => {
    if (filterType && e.expense_type !== filterType) return false;
    if (filterCat && e.category_id !== filterCat) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'expense_date') cmp = a.expense_date.localeCompare(b.expense_date);
    else if (sortField === 'amount') cmp = Number(a.amount) - Number(b.amount);
    else if (sortField === 'category') cmp = (getRootName(a.category_id)).localeCompare(getRootName(b.category_id));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />;
  };

  const handleExport = () => {
    const headers = ['Date', 'Category', 'Type', 'Description', 'Reference', 'Amount'];
    const rows = sorted.map(e => [
      e.expense_date,
      getRootName(e.category_id),
      e.expense_type,
      `"${e.description.replace(/"/g, '""')}"`,
      e.reference_number ?? '',
      e.amount,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `expense-analysis-${range.from}-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const leafCategories = categories.filter(c => {
    const hasChild = categories.some(o => o.parent_id === c.id);
    return !hasChild;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/reports')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Expense Analysis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Category breakdown, trends, and detailed records</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: 'this_month', label: 'This Month' },
          { value: 'last_month', label: 'Last Month' },
          { value: 'last_3_months', label: 'Last 3 Months' },
          { value: 'custom', label: 'Custom' },
        ].map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === p.value
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={custom.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={custom.to} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
        {!loading && (
          <span className="text-xs text-gray-400 ml-2">{range.from} → {range.to}</span>
        )}
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 font-medium">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(total)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} records</p>
          </div>
          {(['operating', 'investing', 'financing'] as ExpenseType[]).map(t => (
            <div key={t} className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs text-gray-500 font-medium capitalize">{t}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(byType[t])}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {total > 0 ? ((byType[t] / total) * 100).toFixed(1) : '0'}% of total
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {!loading && expenses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar chart */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Top Categories by Spend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={v => '৳' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} width={100} />
                <Tooltip
                  formatter={(v: number) => [fmt(v), 'Amount']}
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">By Expense Type</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={TYPE_COLORS[entry.type as ExpenseType]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [fmt(v), 'Amount']}
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TYPE_COLORS[d.type as ExpenseType] }} />
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                  <span className="font-medium text-gray-800">{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter className="w-4 h-4" />
          <span>Filter:</span>
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as ExpenseType | '')}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="operating">Operating</option>
          <option value="investing">Investing</option>
          <option value="financing">Financing</option>
        </select>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {leafCategories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {(filterType || filterCat) && (
          <button
            onClick={() => { setFilterType(''); setFilterCat(''); }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear filters
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{sorted.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th
                onClick={() => handleSort('expense_date')}
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
              >
                <div className="flex items-center gap-1">Date <SortIcon field="expense_date" /></div>
              </th>
              <th
                onClick={() => handleSort('category')}
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
              >
                <div className="flex items-center gap-1">Category <SortIcon field="category" /></div>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Reference</th>
              <th
                onClick={() => handleSort('amount')}
                className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
              >
                <div className="flex items-center justify-end gap-1">Amount <SortIcon field="amount" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  No expenses found for the selected period
                </td>
              </tr>
            ) : (
              sorted.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.expense_date}</td>
                  <td className="px-4 py-3 text-gray-800">
                    <div className="font-medium">{getRootName(e.category_id)}</div>
                    {e.category && e.category.name !== getRootName(e.category_id) && (
                      <div className="text-xs text-gray-400">{e.category.name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TYPE_BG[e.expense_type]}`}>
                      {e.expense_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{e.description}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{e.reference_number ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{fmt(Number(e.amount))}</td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && sorted.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  {fmt(sorted.reduce((s, e) => s + Number(e.amount), 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
