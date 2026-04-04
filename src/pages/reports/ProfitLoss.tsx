import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { fetchManualRevenueTotalForRange, REVENUE_CATEGORY_LABELS, RevenueCategory } from '../finance/collection/manualRevenueService';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingBag,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface OrderProfit {
  order_id: string;
  order_number: string;
  order_date: string;
  customer_name: string | null;
  cs_status: string;
  fulfillment_status: string;
  revenue: number;
  delivery_charge: number;
  product_cogs: number;
  packaging_cost: number;
  total_cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
}

type SortField = 'order_date' | 'revenue' | 'product_cogs' | 'packaging_cost' | 'gross_profit' | 'gross_margin_pct';
type SortDir = 'asc' | 'desc';

type Preset = 'this_month' | 'last_month' | 'last_3_months' | 'custom';

function getPresetDates(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: fmt(from), to: fmt(to) };
  }
  if (preset === 'last_month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(from), to: fmt(to) };
  }
  if (preset === 'last_3_months') {
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: fmt(from), to: fmt(to) };
  }
  return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
}

function fmt(n: number) {
  return n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'custom', label: 'Custom' },
];

function buildChartData(rows: OrderProfit[]) {
  const byMonth: Record<string, { revenue: number; cogs: number; profit: number }> = {};
  for (const r of rows) {
    const key = r.order_date?.slice(0, 7) ?? 'unknown';
    if (!byMonth[key]) byMonth[key] = { revenue: 0, cogs: 0, profit: 0 };
    byMonth[key].revenue += r.revenue;
    byMonth[key].cogs += r.total_cogs;
    byMonth[key].profit += r.gross_profit;
  }
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({
      month,
      Revenue: Math.round(vals.revenue),
      COGS: Math.round(vals.cogs),
      'Gross Profit': Math.round(vals.profit),
    }));
}

function ProfitLossContent() {
  const [preset, setPreset] = useState<Preset>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [rows, setRows] = useState<OrderProfit[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('order_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [otherRevenue, setOtherRevenue] = useState<{ total: number; byCategory: Record<string, number> }>({ total: 0, byCategory: {} });

  const dateRange = preset === 'custom'
    ? { from: customFrom, to: customTo }
    : getPresetDates(preset);

  const fetchData = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    const [orderResult, manualResult] = await Promise.all([
      supabase
        .from('order_profit_summary')
        .select('*')
        .gte('order_date', dateRange.from)
        .lte('order_date', dateRange.to)
        .order('order_date', { ascending: false }),
      fetchManualRevenueTotalForRange(dateRange.from, dateRange.to),
    ]);

    if (!orderResult.error && orderResult.data) {
      setRows(orderResult.data as OrderProfit[]);
    }
    setOtherRevenue(manualResult);
    setLoading(false);
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const av = a[sortField] as number | string;
    const bv = b[sortField] as number | string;
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
    return ((av as number) - (bv as number)) * dir;
  });

  const orderTotals = rows.reduce(
    (acc, r) => {
      acc.revenue += r.revenue;
      acc.delivery_charge += r.delivery_charge;
      acc.product_cogs += r.product_cogs;
      acc.packaging_cost += r.packaging_cost;
      acc.total_cogs += r.total_cogs;
      acc.gross_profit += r.gross_profit;
      return acc;
    },
    { revenue: 0, delivery_charge: 0, product_cogs: 0, packaging_cost: 0, total_cogs: 0, gross_profit: 0 }
  );

  const totals = {
    ...orderTotals,
    revenue: orderTotals.revenue + otherRevenue.total,
    gross_profit: orderTotals.gross_profit + otherRevenue.total,
  };

  const avgMargin = totals.revenue > 0
    ? (totals.gross_profit / totals.revenue) * 100
    : 0;

  const chartData = buildChartData(rows);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />;
  };

  const ThBtn = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors ${className}`}
    >
      {label}
      <SortIcon field={field} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss</h1>
          <p className="text-sm text-gray-500 mt-0.5">Final-status orders only — revenue from collected amounts, costs include COGS, packaging, and delivery</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Date filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-600 shrink-0">Period:</span>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                preset === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        {preset !== 'custom' && (
          <span className="ml-auto text-xs text-gray-400">
            {dateRange.from} — {dateRange.to}
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Revenue</span>
          </div>
          <p className="text-xl font-bold text-gray-900">৳{fmt(totals.revenue)}</p>
          <p className="text-xs text-gray-400 mt-1">{rows.length} orders + other</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <PlusCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Other Revenue</span>
          </div>
          <p className="text-xl font-bold text-emerald-700">৳{fmt(otherRevenue.total)}</p>
          <div className="mt-1 space-y-0.5">
            {(Object.keys(REVENUE_CATEGORY_LABELS) as RevenueCategory[]).filter(k => otherRevenue.byCategory[k]).map(k => (
              <p key={k} className="text-xs text-gray-400">{REVENUE_CATEGORY_LABELS[k]}: ৳{fmt(otherRevenue.byCategory[k])}</p>
            ))}
            {otherRevenue.total === 0 && <p className="text-xs text-gray-400">No manual entries</p>}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <ShoppingBag className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Product COGS</span>
          </div>
          <p className="text-xl font-bold text-gray-900">৳{fmt(totals.product_cogs)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {totals.revenue > 0 ? fmtPct(totals.product_cogs / totals.revenue * 100) : '—'} of revenue
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <Package className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Packaging</span>
          </div>
          <p className="text-xl font-bold text-gray-900">৳{fmt(totals.packaging_cost)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {totals.revenue > 0 ? fmtPct(totals.packaging_cost / totals.revenue * 100) : '—'} of revenue
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${totals.gross_profit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {totals.gross_profit >= 0
                ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                : <TrendingDown className="w-4 h-4 text-red-600" />
              }
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gross Profit</span>
          </div>
          <p className={`text-xl font-bold ${totals.gross_profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            ৳{fmt(totals.gross_profit)}
          </p>
          <p className="text-xs text-gray-400 mt-1">after COGS + packaging</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${avgMargin >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {avgMargin >= 0
                ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                : <TrendingDown className="w-4 h-4 text-red-600" />
              }
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Margin</span>
          </div>
          <p className={`text-xl font-bold ${avgMargin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {fmtPct(avgMargin)}
          </p>
          <p className="text-xs text-gray-400 mt-1">gross margin</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Breakdown</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => [`৳${fmt(value)}`, undefined]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="COGS" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Gross Profit" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Order Detail
            {rows.length > 0 && <span className="ml-2 text-gray-400 font-normal">({rows.length} orders)</span>}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-gray-400 animate-spin mr-2" />
            <span className="text-sm text-gray-500">Loading...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No orders found for the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left">
                    <ThBtn field="order_date" label="Date" />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <ThBtn field="revenue" label="Revenue" className="ml-auto" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery</span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <ThBtn field="product_cogs" label="Product COGS" className="ml-auto" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <ThBtn field="packaging_cost" label="Packaging" className="ml-auto" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <ThBtn field="gross_profit" label="Gross Profit" className="ml-auto" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <ThBtn field="gross_margin_pct" label="Margin" className="ml-auto" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(row => (
                  <tr key={row.order_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {row.order_date?.slice(0, 10) ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">
                      {row.order_number}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">
                      {row.customer_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                      ৳{fmt(row.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                      ৳{fmt(row.delivery_charge)}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700 whitespace-nowrap">
                      ৳{fmt(row.product_cogs)}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-600 whitespace-nowrap">
                      ৳{fmt(row.packaging_cost)}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      row.gross_profit >= 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}>
                      ৳{fmt(row.gross_profit)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
                      row.gross_margin_pct >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {fmtPct(row.gross_margin_pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Total ({rows.length} orders)
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                    ৳{fmt(totals.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-600 whitespace-nowrap">
                    ৳{fmt(totals.delivery_charge)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700 whitespace-nowrap">
                    ৳{fmt(totals.product_cogs)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-orange-600 whitespace-nowrap">
                    ৳{fmt(totals.packaging_cost)}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                    totals.gross_profit >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    ৳{fmt(totals.gross_profit)}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                    avgMargin >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    {fmtPct(avgMargin)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfitLoss() {
  const { user } = useAuth();

  if (user && user.role !== 'admin') {
    return <Navigate to="/reports" replace />;
  }

  return <ProfitLossContent />;
}
