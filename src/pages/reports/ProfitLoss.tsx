import { useState, useEffect, useCallback, Fragment } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { fetchManualRevenueTotalForRange, REVENUE_CATEGORY_LABELS, RevenueCategory } from '../finance/collection/manualRevenueService';
import { fetchExpenses, type Expense } from '../finance/expenseService';
import { exportProfitLossExcel } from './plExportExcel';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingBag,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronRight,
  RefreshCw,
  PlusCircle,
  Receipt,
  FileDown,
  Layers,
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

export interface OrderProfit {
  order_id: string;
  order_number: string;
  woo_order_id: number | null;
  order_type: string | null;
  order_date: string;
  customer_name: string | null;
  customer_phone: string | null;
  cs_status: string;
  payment_status: string;
  fulfillment_status: string;
  revenue: number;
  delivery_charge: number;
  product_cogs: number;
  packaging_cost: number;
  total_cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
}

export interface OrderItemCogs {
  order_id: string;
  order_item_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  item_revenue: number;
  adjusted_item_cogs: number;
}

export interface OrderItemLotCogs {
  order_id: string;
  order_item_id: string;
  sku: string;
  product_name: string;
  lot_number: string | null;
  lot_quantity: number;
  landed_cost_per_unit: number;
  line_cost: number;
  is_fallback: boolean;
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

function fmtCur(n: number) {
  return n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  processing:          { label: 'Processing',     color: 'bg-blue-100 text-blue-700' },
  on_hold:             { label: 'On Hold',         color: 'bg-yellow-100 text-yellow-700' },
  completed:           { label: 'Completed',       color: 'bg-emerald-100 text-emerald-700' },
  cancelled_cad:       { label: 'CAD',             color: 'bg-orange-100 text-orange-700' },
  partial_delivery:    { label: 'Partial',         color: 'bg-amber-100 text-amber-700' },
  exchange_returnable: { label: 'Exchange',        color: 'bg-sky-100 text-sky-700' },
  reverse_pick:        { label: 'Reverse Pick',    color: 'bg-rose-100 text-rose-700' },
  delivered:           { label: 'Delivered',       color: 'bg-teal-100 text-teal-700' },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none ${s.color}`}>
      {s.label}
    </span>
  );
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'custom', label: 'Custom' },
];

function buildChartData(rows: OrderProfit[], expensesByMonth: Record<string, number>) {
  const byMonth: Record<string, { revenue: number; cogs: number; profit: number }> = {};
  for (const r of rows) {
    const key = r.order_date?.slice(0, 7) ?? 'unknown';
    if (!byMonth[key]) byMonth[key] = { revenue: 0, cogs: 0, profit: 0 };
    byMonth[key].revenue += r.revenue;
    byMonth[key].cogs += r.total_cogs;
    byMonth[key].profit += r.gross_profit;
  }
  const allMonths = new Set([...Object.keys(byMonth), ...Object.keys(expensesByMonth)]);
  return Array.from(allMonths)
    .sort()
    .map(month => {
      const vals = byMonth[month] ?? { revenue: 0, cogs: 0, profit: 0 };
      const exp = expensesByMonth[month] ?? 0;
      return {
        month,
        Revenue: Math.round(vals.revenue),
        COGS: Math.round(vals.cogs),
        'Gross Profit': Math.round(vals.profit),
        'Net Profit': Math.round(vals.profit - exp),
      };
    });
}

function LotBreakdown({
  lots,
  itemId,
  expanded,
  onToggle,
}: {
  lots: OrderItemLotCogs[];
  itemId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const lotCount = lots.length;
  const totalCost = lots.reduce((s, l) => s + Number(l.line_cost), 0);
  const isFallback = lots.length === 1 && lots[0].is_fallback;

  return (
    <>
      <tr
        className="border-t border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={onToggle}
      >
        <td colSpan={6} className="px-3 py-1.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              {expanded ? (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-400" />
              )}
              <Layers className="w-3 h-3" />
              <span>
                {isFallback
                  ? 'Avg cost estimate'
                  : `${lotCount} lot${lotCount !== 1 ? 's' : ''}`}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">·</span>
            <span className="text-[10px] font-semibold text-amber-700">৳{fmtCur(totalCost)}</span>
            {isFallback && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-slate-200 text-slate-500 font-medium">est.</span>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr key={`lot-rows-${itemId}`}>
          <td colSpan={6} className="px-0 py-0">
            <div className="ml-8 mr-3 mb-1.5">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-slate-200/60">
                    <th className="px-2.5 py-1 text-left font-semibold text-slate-500 uppercase tracking-wider">Lot</th>
                    <th className="px-2.5 py-1 text-right font-semibold text-slate-500 uppercase tracking-wider w-12">Qty</th>
                    <th className="px-2.5 py-1 text-right font-semibold text-slate-500 uppercase tracking-wider w-24">Cost/Unit</th>
                    <th className="px-2.5 py-1 text-right font-semibold text-slate-500 uppercase tracking-wider w-24">Line Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot, idx) => (
                    <tr
                      key={`${lot.order_item_id}-${lot.lot_number ?? 'fallback'}-${idx}`}
                      className="border-t border-slate-200/70 hover:bg-slate-50"
                    >
                      <td className="px-2.5 py-1 font-mono text-slate-600">
                        {lot.lot_number ?? (
                          <span className="text-slate-400 italic">avg cost</span>
                        )}
                        {lot.is_fallback && (
                          <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-slate-200 text-slate-500 font-medium">est.</span>
                        )}
                      </td>
                      <td className="px-2.5 py-1 text-right text-slate-600">{lot.lot_quantity}</td>
                      <td className="px-2.5 py-1 text-right text-slate-600">৳{fmtCur(Number(lot.landed_cost_per_unit))}</td>
                      <td className="px-2.5 py-1 text-right font-semibold text-amber-700">৳{fmtCur(Number(lot.line_cost))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ItemCogsList({
  items,
  lotCogs,
}: {
  items: OrderItemCogs[];
  lotCogs: Record<string, OrderItemLotCogs[]>;
}) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  return (
    <tr>
      <td colSpan={9} className="px-0 py-0">
        <div className="border-l-2 border-blue-300 ml-8 mr-4 my-1 bg-slate-50 rounded-r-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-24">SKU</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-12">Qty</th>
                <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-24">Item Revenue</th>
                <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-24">Item COGS</th>
                <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-20">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => {
                const margin = item.item_revenue > 0
                  ? ((item.item_revenue - item.adjusted_item_cogs) / item.item_revenue) * 100
                  : 0;
                const profit = item.item_revenue - item.adjusted_item_cogs;
                const lots = lotCogs[item.order_item_id] ?? [];
                const isLotExpanded = expandedItems.has(item.order_item_id);

                return (
                  <Fragment key={item.order_item_id}>
                    <tr className="hover:bg-slate-100 transition-colors">
                      <td className="px-3 py-1.5 font-mono text-slate-600 text-[11px]">{item.sku}</td>
                      <td className="px-3 py-1.5 text-slate-700">{item.product_name}</td>
                      <td className="px-3 py-1.5 text-right text-slate-600">{item.quantity}</td>
                      <td className="px-3 py-1.5 text-right text-slate-700">৳{fmtCur(item.item_revenue)}</td>
                      <td className="px-3 py-1.5 text-right text-amber-700 font-medium">৳{fmtCur(item.adjusted_item_cogs)}</td>
                      <td className={`px-3 py-1.5 text-right font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmtPct(margin)}
                      </td>
                    </tr>
                    {lots.length > 0 && (
                      <LotBreakdown
                        lots={lots}
                        itemId={item.order_item_id}
                        expanded={isLotExpanded}
                        onToggle={() => toggleItem(item.order_item_id)}
                      />
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
}

function ProfitLossContent() {
  const [preset, setPreset] = useState<Preset>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [rows, setRows] = useState<OrderProfit[]>([]);
  const [itemCogs, setItemCogs] = useState<Record<string, OrderItemCogs[]>>({});
  const [lotCogs, setLotCogs] = useState<Record<string, OrderItemLotCogs[]>>({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('order_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [otherRevenue, setOtherRevenue] = useState<{ total: number; byCategory: Record<string, number> }>({ total: 0, byCategory: {} });
  const [plExpenses, setPlExpenses] = useState<Expense[]>([]);

  const dateRange = preset === 'custom'
    ? { from: customFrom, to: customTo }
    : getPresetDates(preset);

  const fetchData = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    setExpandedOrders(new Set());

    const [orderResult, manualResult, expenseResult] = await Promise.all([
      supabase
        .from('order_profit_summary')
        .select('*')
        .gte('order_date', dateRange.from)
        .lte('order_date', dateRange.to)
        .order('order_date', { ascending: false }),
      fetchManualRevenueTotalForRange(dateRange.from, dateRange.to),
      fetchExpenses({ dateFrom: dateRange.from, dateTo: dateRange.to, affectsProfit: true }),
    ]);

    if (!orderResult.error && orderResult.data) {
      setRows(orderResult.data as OrderProfit[]);

      const ids = orderResult.data.map(r => r.order_id);
      if (ids.length > 0) {
        const [itemResult, lotResult] = await Promise.all([
          supabase.from('order_item_cogs_detail').select('*').in('order_id', ids),
          supabase.from('order_item_lot_cogs_detail').select('*').in('order_id', ids),
        ]);

        if (!itemResult.error && itemResult.data) {
          const byOrder: Record<string, OrderItemCogs[]> = {};
          for (const item of itemResult.data as OrderItemCogs[]) {
            if (!byOrder[item.order_id]) byOrder[item.order_id] = [];
            byOrder[item.order_id].push(item);
          }
          setItemCogs(byOrder);
        }

        if (!lotResult.error && lotResult.data) {
          const byItem: Record<string, OrderItemLotCogs[]> = {};
          for (const lot of lotResult.data as OrderItemLotCogs[]) {
            if (!byItem[lot.order_item_id]) byItem[lot.order_item_id] = [];
            byItem[lot.order_item_id].push(lot);
          }
          setLotCogs(byItem);
        }
      } else {
        setItemCogs({});
        setLotCogs({});
      }
    }

    setOtherRevenue(manualResult);
    setPlExpenses(expenseResult);
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

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
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

  const totalRevenue = orderTotals.revenue + otherRevenue.total;
  const grossProfit = orderTotals.gross_profit + otherRevenue.total;
  const totalExpenses = plExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  const avgMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const expensesByMonth = plExpenses.reduce<Record<string, number>>((acc, e) => {
    const key = e.expense_date?.slice(0, 7) ?? 'unknown';
    acc[key] = (acc[key] ?? 0) + e.amount;
    return acc;
  }, {});

  const chartData = buildChartData(rows, expensesByMonth);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportProfitLossExcel({
        from: dateRange.from,
        to: dateRange.to,
        rows,
        otherRevenue,
        plExpenses,
        orderTotals,
      });
    } finally {
      setExporting(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-gray-400" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-600" />
      : <ChevronDown className="w-3 h-3 text-blue-600" />;
  };

  const ThBtn = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors ${className}`}
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
          <p className="text-sm text-gray-500 mt-0.5">Paid orders only — CBD orders excluded — packaging fallback BDT 65 when not recorded</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting || loading || rows.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 rounded-lg transition-colors"
          >
            <FileDown className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
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

      {/* Summary cards — Row 1: Revenue + COGS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Revenue</span>
          </div>
          <p className="text-xl font-bold text-gray-900">৳{fmtCur(totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">{rows.length} orders + other</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <PlusCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Other Revenue</span>
          </div>
          <p className="text-xl font-bold text-emerald-700">৳{fmtCur(otherRevenue.total)}</p>
          <div className="mt-1 space-y-0.5">
            {(Object.keys(REVENUE_CATEGORY_LABELS) as RevenueCategory[]).filter(k => otherRevenue.byCategory[k]).map(k => (
              <p key={k} className="text-xs text-gray-400">{REVENUE_CATEGORY_LABELS[k]}: ৳{fmtCur(otherRevenue.byCategory[k])}</p>
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
          <p className="text-xl font-bold text-gray-900">৳{fmtCur(orderTotals.product_cogs)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {totalRevenue > 0 ? fmtPct(orderTotals.product_cogs / totalRevenue * 100) : '—'} of revenue
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <Package className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Packaging</span>
          </div>
          <p className="text-xl font-bold text-gray-900">৳{fmtCur(orderTotals.packaging_cost)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {totalRevenue > 0 ? fmtPct(orderTotals.packaging_cost / totalRevenue * 100) : '—'} of revenue
          </p>
        </div>
      </div>

      {/* Summary cards — Row 2: Gross Profit → Expenses → Net Profit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${grossProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {grossProfit >= 0
                ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                : <TrendingDown className="w-4 h-4 text-red-600" />
              }
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gross Profit</span>
          </div>
          <p className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            ৳{fmtCur(grossProfit)}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-400">after COGS + packaging</p>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${avgMargin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {fmtPct(avgMargin)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-rose-100 rounded-lg">
              <Receipt className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Operating Expenses</span>
          </div>
          <p className="text-2xl font-bold text-rose-700">৳{fmtCur(totalExpenses)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {plExpenses.length} expense{plExpenses.length !== 1 ? 's' : ''} affecting P&L
            {totalRevenue > 0 && ` · ${fmtPct(totalExpenses / totalRevenue * 100)} of revenue`}
          </p>
        </div>

        <div className={`rounded-xl p-4 border-2 ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${netProfit >= 0 ? 'bg-emerald-200' : 'bg-red-200'}`}>
              {netProfit >= 0
                ? <TrendingUp className="w-4 h-4 text-emerald-700" />
                : <TrendingDown className="w-4 h-4 text-red-700" />
              }
            </div>
            <span className={`text-xs font-bold uppercase tracking-wide ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Net Profit</span>
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
            ৳{fmtCur(netProfit)}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className={`text-xs ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              Gross Profit minus Expenses
            </p>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
              {fmtPct(netMargin)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Breakdown</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => [`৳${fmtCur(value)}`, undefined]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="COGS" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Gross Profit" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Net Profit" fill="#0f766e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Order Detail Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Order Detail
            {rows.length > 0 && <span className="ml-2 text-gray-400 font-normal">({rows.length} orders)</span>}
          </h2>
          {Object.keys(itemCogs).length > 0 && (
            <span className="text-xs text-gray-400">Click the arrow to expand COGS breakdown with lot-level detail</span>
          )}
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
                  <th className="w-8 px-2 py-2.5"></th>
                  <th className="px-3 py-2.5 text-left">
                    <ThBtn field="order_date" label="Order" />
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Customer</span>
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <ThBtn field="revenue" label="Revenue" className="ml-auto" />
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Delivery</span>
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <ThBtn field="product_cogs" label="Prod. COGS" className="ml-auto" />
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <ThBtn field="packaging_cost" label="Packaging" className="ml-auto" />
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <ThBtn field="gross_profit" label="Gross Profit" className="ml-auto" />
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <ThBtn field="gross_margin_pct" label="Margin" className="ml-auto" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(row => {
                  const items = itemCogs[row.order_id] ?? [];
                  const hasItems = items.length > 0;
                  const isExpanded = expandedOrders.has(row.order_id);

                  return (
                    <Fragment key={row.order_id}>
                      <tr
                        className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50/40' : ''}`}
                      >
                        <td className="px-2 py-2.5 text-center">
                          {hasItems ? (
                            <button
                              onClick={() => toggleExpand(row.order_id)}
                              className="p-0.5 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Show COGS breakdown"
                            >
                              {isExpanded
                                ? <ChevronDown className="w-3.5 h-3.5" />
                                : <ChevronRight className="w-3.5 h-3.5" />
                              }
                            </button>
                          ) : null}
                        </td>

                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-gray-400 leading-none">
                              {row.order_date?.slice(0, 10) ?? '—'}
                            </span>
                            <span className="text-xs font-semibold text-blue-700 leading-none">
                              {row.woo_order_id ? `#${row.woo_order_id}` : row.order_number}
                            </span>
                            <StatusPill status={row.cs_status} />
                          </div>
                        </td>

                        <td className="px-3 py-2.5 max-w-[160px]">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-800 truncate leading-none">
                              {row.customer_name ?? '—'}
                            </span>
                            {row.customer_phone && (
                              <span className="text-[10px] text-gray-400 leading-none font-mono">
                                {row.customer_phone}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2.5 text-right font-medium text-gray-900 whitespace-nowrap text-xs">
                          ৳{fmtCur(row.revenue)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-600 whitespace-nowrap text-xs">
                          ৳{fmtCur(row.delivery_charge)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-amber-700 whitespace-nowrap text-xs">
                          ৳{fmtCur(row.product_cogs)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-orange-600 whitespace-nowrap text-xs">
                          ৳{fmtCur(row.packaging_cost)}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap text-xs ${
                          row.gross_profit >= 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}>
                          ৳{fmtCur(row.gross_profit)}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-medium whitespace-nowrap text-xs ${
                          row.gross_margin_pct >= 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          {fmtPct(row.gross_margin_pct)}
                        </td>
                      </tr>

                      {isExpanded && items.length > 0 && (
                        <ItemCogsList items={items} lotCogs={lotCogs} />
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={3} className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Orders Subtotal ({rows.length})
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-gray-900 whitespace-nowrap text-xs">
                    ৳{fmtCur(orderTotals.revenue)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-slate-600 whitespace-nowrap text-xs">
                    ৳{fmtCur(orderTotals.delivery_charge)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-amber-700 whitespace-nowrap text-xs">
                    ৳{fmtCur(orderTotals.product_cogs)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-orange-600 whitespace-nowrap text-xs">
                    ৳{fmtCur(orderTotals.packaging_cost)}
                  </td>
                  <td className={`px-3 py-3 text-right font-bold whitespace-nowrap text-xs ${
                    grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    ৳{fmtCur(grossProfit)}
                  </td>
                  <td className={`px-3 py-3 text-right font-bold whitespace-nowrap text-xs ${
                    avgMargin >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    {fmtPct(avgMargin)}
                  </td>
                </tr>
                <tr className="bg-rose-50 border-t border-rose-100">
                  <td colSpan={7} className="px-3 py-3 text-xs font-semibold text-rose-700 uppercase tracking-wide">
                    Operating Expenses (Affects P&L)
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-rose-700 whitespace-nowrap text-xs">
                    −৳{fmtCur(totalExpenses)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-rose-600 whitespace-nowrap text-xs">
                    {totalRevenue > 0 ? fmtPct(totalExpenses / totalRevenue * 100) : '—'}
                  </td>
                </tr>
                <tr className={`border-t-2 ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
                  <td colSpan={7} className={`px-3 py-3 text-sm font-bold uppercase tracking-wide ${netProfit >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                    Net Profit
                  </td>
                  <td className={`px-3 py-3 text-right text-base font-bold whitespace-nowrap ${netProfit >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                    ৳{fmtCur(netProfit)}
                  </td>
                  <td className={`px-3 py-3 text-right font-bold whitespace-nowrap text-xs ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {fmtPct(netMargin)}
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

  if (!user) return <Navigate to="/login" replace />;

  return <ProfitLossContent />;
}
