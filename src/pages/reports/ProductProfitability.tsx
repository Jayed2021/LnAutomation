import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Search, TrendingUp, TrendingDown,
  DollarSign, Package, ChevronUp, ChevronDown, ChevronsUpDown,
  AlertTriangle, Info, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

/* ─── Types ─────────────────────────────────────────────────────── */
type Preset = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'custom';
type SortKey = 'product_name' | 'units_sold' | 'revenue' | 'cogs' | 'profit' | 'margin' | 'contribution';
type SortDir = 'asc' | 'desc';

interface RawItem {
  order_date: string;
  sku: string;
  product_name: string;
  quantity: number;
  item_revenue: number;
  adjusted_item_cogs: number;
}

interface ProductRow {
  sku: string;
  product_name: string;
  units_sold: number;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
  contribution: number;
}

interface CacheEntry {
  from: string;
  to: string;
  fetchedAt: number;
  rows: RawItem[];
}

/* ─── Cache helpers ─────────────────────────────────────────────── */
function cacheKey(from: string, to: string) {
  return `product_profitability_${from}_${to}`;
}

function readCache(from: string, to: string): { rows: RawItem[]; fetchedAt: number } | null {
  try {
    const raw = localStorage.getItem(cacheKey(from, to));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    return { rows: entry.rows, fetchedAt: entry.fetchedAt };
  } catch {
    return null;
  }
}

function writeCache(from: string, to: string, rows: RawItem[]) {
  try {
    const entry: CacheEntry = { from, to, fetchedAt: Date.now(), rows };
    localStorage.setItem(cacheKey(from, to), JSON.stringify(entry));
  } catch {
    // storage full or unavailable
  }
}

/* ─── Date helpers ──────────────────────────────────────────────── */
function getDateRange(preset: Preset, custom: { from: string; to: string }): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (preset === 'this_month') {
    return {
      from: new Date(y, m, 1).toISOString().split('T')[0],
      to: new Date(y, m + 1, 0).toISOString().split('T')[0],
    };
  }
  if (preset === 'last_month') {
    return {
      from: new Date(y, m - 1, 1).toISOString().split('T')[0],
      to: new Date(y, m, 0).toISOString().split('T')[0],
    };
  }
  if (preset === 'this_quarter') {
    const q = Math.floor(m / 3);
    return {
      from: new Date(y, q * 3, 1).toISOString().split('T')[0],
      to: new Date(y, q * 3 + 3, 0).toISOString().split('T')[0],
    };
  }
  if (preset === 'last_quarter') {
    const q = Math.floor(m / 3);
    const lq = q === 0 ? 3 : q - 1;
    const ly = q === 0 ? y - 1 : y;
    return {
      from: new Date(ly, lq * 3, 1).toISOString().split('T')[0],
      to: new Date(ly, lq * 3 + 3, 0).toISOString().split('T')[0],
    };
  }
  return custom;
}

function fmt(n: number) {
  return '৳' + Math.round(n).toLocaleString('en-BD');
}

function fmtPct(n: number) {
  return n.toFixed(1) + '%';
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

/* ─── Sort icon helper ───────────────────────────────────────────── */
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
    : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />;
}

const PAGE_SIZE = 100;

/* ─── Main Component ────────────────────────────────────────────── */
export default function ProductProfitability() {
  const navigate = useNavigate();

  const [preset, setPreset] = useState<Preset>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');
  const [lowMarginThreshold, setLowMarginThreshold] = useState(20);
  const [thresholdInput, setThresholdInput] = useState('20');

  const [rawRows, setRawRows] = useState<RawItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('profit');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const dateRange = useMemo(
    () => getDateRange(preset, { from: customFrom, to: customTo }),
    [preset, customFrom, customTo],
  );

  const fetchData = useCallback(async (force = false) => {
    const { from, to } = dateRange;
    if (!from || !to) return;

    if (!force) {
      const cached = readCache(from, to);
      if (cached) {
        setRawRows(cached.rows);
        setFetchedAt(cached.fetchedAt);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const PAGE = 1000;
      let allRows: RawItem[] = [];
      let offset = 0;
      let done = false;

      while (!done) {
        const { data, error: err } = await supabase
          .from('product_profitability_items')
          .select('order_date, sku, product_name, quantity, item_revenue, adjusted_item_cogs')
          .gte('order_date', from)
          .lte('order_date', to)
          .range(offset, offset + PAGE - 1);

        if (err) throw err;
        if (!data || data.length === 0) { done = true; break; }
        allRows = allRows.concat(data as RawItem[]);
        if (data.length < PAGE) done = true;
        else offset += PAGE;
      }

      writeCache(from, to, allRows);
      setRawRows(allRows);
      setFetchedAt(Date.now());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    setPage(1);
    fetchData(false);
  }, [fetchData]);

  /* ─── Aggregate by product ──────────────────────────────────── */
  const aggregated = useMemo<ProductRow[]>(() => {
    const map = new Map<string, ProductRow>();

    for (const r of rawRows) {
      const key = r.sku || r.product_name;
      const existing = map.get(key);
      const rev = Number(r.item_revenue) || 0;
      const cogs = Number(r.adjusted_item_cogs) || 0;

      if (existing) {
        existing.units_sold += Number(r.quantity) || 0;
        existing.revenue += rev;
        existing.cogs += cogs;
      } else {
        map.set(key, {
          sku: r.sku,
          product_name: r.product_name,
          units_sold: Number(r.quantity) || 0,
          revenue: rev,
          cogs: cogs,
          profit: 0,
          margin: 0,
          contribution: 0,
        });
      }
    }

    const rows = Array.from(map.values());
    const totalProfit = rows.reduce((s, r) => s + (r.revenue - r.cogs), 0);

    return rows.map(r => {
      const profit = r.revenue - r.cogs;
      const margin = r.revenue > 0 ? (profit / r.revenue) * 100 : 0;
      const contribution = totalProfit > 0 ? (profit / totalProfit) * 100 : 0;
      return { ...r, profit, margin, contribution };
    });
  }, [rawRows]);

  /* ─── Summary stats ─────────────────────────────────────────── */
  const summary = useMemo(() => {
    const revenue = aggregated.reduce((s, r) => s + r.revenue, 0);
    const cogs = aggregated.reduce((s, r) => s + r.cogs, 0);
    const profit = aggregated.reduce((s, r) => s + r.profit, 0);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, cogs, profit, margin };
  }, [aggregated]);

  /* ─── Top 10 by profit ──────────────────────────────────────── */
  const top10 = useMemo(
    () => [...aggregated].sort((a, b) => b.profit - a.profit).slice(0, 10),
    [aggregated],
  );

  /* ─── Filter + sort ─────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return aggregated.filter(r =>
      !q || r.product_name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q),
    );
  }, [aggregated, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === 'product_name') {
        av = (a.product_name ?? '').toLowerCase() as unknown as number;
        bv = (b.product_name ?? '').toLowerCase() as unknown as number;
        return sortDir === 'asc'
          ? (av as unknown as string).localeCompare(bv as unknown as string)
          : (bv as unknown as string).localeCompare(av as unknown as string);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  }

  function handleThresholdBlur() {
    const v = parseFloat(thresholdInput);
    if (!isNaN(v) && v >= 0 && v <= 100) setLowMarginThreshold(v);
    else setThresholdInput(String(lowMarginThreshold));
  }

  const lowMarginCount = aggregated.filter(r => r.margin < lowMarginThreshold && r.revenue > 0).length;

  const presets: { key: Preset; label: string }[] = [
    { key: 'this_month', label: 'This Month' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'this_quarter', label: 'This Quarter' },
    { key: 'last_quarter', label: 'Last Quarter' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/reports')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Product Profitability</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Revenue, COGS, and margin by product — delivered orders only
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fetchedAt && (
            <span className="text-xs text-gray-400">Updated {timeAgo(fetchedAt)}</span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Update Data
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date presets */}
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
            {presets.map(p => (
              <button
                key={p.key}
                onClick={() => { setPreset(p.key); setPage(1); }}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  preset === p.key
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={e => { setCustomFrom(e.target.value); setPage(1); }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={customTo}
                onChange={e => { setCustomTo(e.target.value); setPage(1); }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search product or SKU…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-400"
            />
          </div>

          {/* Low margin threshold */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-sm text-gray-600 whitespace-nowrap">Low margin flag &lt;</span>
            <input
              type="number"
              min="0"
              max="100"
              value={thresholdInput}
              onChange={e => setThresholdInput(e.target.value)}
              onBlur={handleThresholdBlur}
              className="w-14 text-sm border border-gray-200 rounded px-2 py-0.5 text-center bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>
        </div>

        {/* Date range label */}
        {(dateRange.from && dateRange.to) && (
          <p className="text-xs text-gray-400 mt-2">
            {dateRange.from} — {dateRange.to}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && rawRows.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard
              label="Total Revenue"
              value={fmt(summary.revenue)}
              icon={DollarSign}
              accent="blue"
            />
            <SummaryCard
              label="Total COGS"
              value={fmt(summary.cogs)}
              icon={Package}
              accent="gray"
            />
            <SummaryCard
              label="Gross Profit"
              value={fmt(summary.profit)}
              icon={TrendingUp}
              accent={summary.profit >= 0 ? 'emerald' : 'red'}
            />
            <SummaryCard
              label="Blended Margin"
              value={fmtPct(summary.margin)}
              icon={summary.margin >= lowMarginThreshold ? TrendingUp : TrendingDown}
              accent={summary.margin >= lowMarginThreshold ? 'emerald' : 'amber'}
              sub={lowMarginCount > 0 ? `${lowMarginCount} low-margin product${lowMarginCount > 1 ? 's' : ''}` : undefined}
            />
          </div>

          {/* Top 10 */}
          {top10.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-800">Top 10 Products by Profitability</h2>
                <p className="text-xs text-gray-500 mt-0.5">Ranked by gross profit for the selected period</p>
              </div>
              <div className="p-4">
                {top10.map((r, i) => {
                  const maxProfit = top10[0].profit;
                  const barWidth = maxProfit > 0 ? Math.max(4, (r.profit / maxProfit) * 100) : 4;
                  const isLow = r.margin < lowMarginThreshold && r.revenue > 0;
                  return (
                    <div key={r.sku} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <span className="w-6 text-right text-sm font-semibold text-gray-400 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-800 truncate">{r.product_name}</span>
                          {isLow && (
                            <span className="shrink-0 inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                              <AlertTriangle className="w-3 h-3" />
                              Low
                            </span>
                          )}
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${r.profit < 0 ? 'bg-red-400' : 'bg-emerald-400'}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${r.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {fmt(r.profit)}
                        </p>
                        <p className="text-xs text-gray-400">{fmtPct(r.margin)} margin</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">All Products</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {filtered.length} product{filtered.length !== 1 ? 's' : ''}
                  {search ? ` matching "${search}"` : ''}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <Th col="product_name" label="Product" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                    <Th col="units_sold" label="Units Sold" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <Th col="revenue" label="Revenue" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <Th col="cogs" label="COGS" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <Th col="profit" label="Profit" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <Th col="margin" label="Margin %" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <Th col="contribution" label="Contribution %" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-gray-400 text-sm">
                        No products found for this period
                      </td>
                    </tr>
                  ) : (
                    paginated.map(r => {
                      const isLow = r.margin < lowMarginThreshold && r.revenue > 0;
                      return (
                        <tr
                          key={r.sku}
                          className={`transition-colors ${isLow ? 'bg-amber-50 hover:bg-amber-100/60' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-start gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-800 leading-snug">{r.product_name}</span>
                                  {isLow && (
                                    <span className="shrink-0 inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                                      <AlertTriangle className="w-3 h-3" />
                                      Low margin
                                    </span>
                                  )}
                                </div>
                                {r.sku && (
                                  <span className="text-xs text-gray-400 font-mono">{r.sku}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                            {r.units_sold.toLocaleString('en-BD')}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                            {fmt(r.revenue)}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-gray-500">
                            {fmt(r.cogs)}
                          </td>
                          <td className={`px-6 py-3 text-right tabular-nums font-semibold ${r.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                            {fmt(r.profit)}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <MarginBadge margin={r.margin} threshold={lowMarginThreshold} />
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-blue-400 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, r.contribution))}%` }}
                                />
                              </div>
                              <span className="text-gray-600 tabular-nums w-12 text-right text-xs">
                                {fmtPct(r.contribution)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {paginated.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-6 py-3 font-semibold text-gray-700 text-sm">
                        {search ? `Filtered Total (${filtered.length})` : `Total (${filtered.length} products)`}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-700 tabular-nums">
                        {filtered.reduce((s, r) => s + r.units_sold, 0).toLocaleString('en-BD')}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-700 tabular-nums">
                        {fmt(filtered.reduce((s, r) => s + r.revenue, 0))}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-500 tabular-nums">
                        {fmt(filtered.reduce((s, r) => s + r.cogs, 0))}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold tabular-nums text-emerald-700">
                        {fmt(filtered.reduce((s, r) => s + r.profit, 0))}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-400 text-xs">
                        {(() => {
                          const rev = filtered.reduce((s, r) => s + r.revenue, 0);
                          const profit = filtered.reduce((s, r) => s + r.profit, 0);
                          return rev > 0 ? fmtPct((profit / rev) * 100) : '—';
                        })()}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-400 text-xs">100%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-white">
                <span className="text-xs text-gray-400">
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pg: number;
                    if (totalPages <= 7) {
                      pg = i + 1;
                    } else if (page <= 4) {
                      pg = i + 1;
                    } else if (page >= totalPages - 3) {
                      pg = totalPages - 6 + i;
                    } else {
                      pg = page - 3 + i;
                    }
                    return (
                      <button
                        key={pg}
                        onClick={() => setPage(pg)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          pg === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pg}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* COGS disclaimer */}
          <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
            <span>
              COGS is calculated using the <strong className="text-gray-500">average landed cost per SKU</strong> across
              all received purchase orders. For orders that were picked via the warehouse pick system, the actual
              FIFO lot cost is used instead. Actual per-lot COGS may vary from the averages shown.
              Only orders with status Delivered, Partial Delivery, Exchange, and Exchange Returnable are included.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────────── */

type AccentKey = 'blue' | 'emerald' | 'red' | 'amber' | 'gray';

const accentMap: Record<AccentKey, { bg: string; border: string; icon: string; text: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'bg-blue-100 text-blue-600', text: 'text-blue-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700' },
  red: { bg: 'bg-red-50', border: 'border-red-100', icon: 'bg-red-100 text-red-600', text: 'text-red-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-700' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'bg-gray-100 text-gray-500', text: 'text-gray-700' },
};

function SummaryCard({
  label, value, icon: Icon, accent, sub,
}: {
  label: string; value: string; icon: React.ElementType; accent: AccentKey; sub?: string;
}) {
  const a = accentMap[accent];
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-4 flex items-start gap-3`}>
      <div className={`p-2 rounded-lg ${a.icon} shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <p className={`text-xl font-bold mt-0.5 ${a.text} tabular-nums`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Th({
  col, label, sortKey, sortDir, onSort, align = 'right',
}: {
  col: SortKey; label: string; sortKey: SortKey; sortDir: SortDir;
  onSort: (k: SortKey) => void; align?: 'left' | 'right';
}) {
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-6 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );
}

function MarginBadge({ margin, threshold }: { margin: number; threshold: number }) {
  const isLow = margin < threshold;
  const isNeg = margin < 0;

  if (isNeg) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full tabular-nums">
        {fmtPct(margin)}
      </span>
    );
  }
  if (isLow) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full tabular-nums">
        <AlertTriangle className="w-3 h-3" />
        {fmtPct(margin)}
      </span>
    );
  }
  return (
    <span className="text-sm font-semibold text-emerald-700 tabular-nums">
      {fmtPct(margin)}
    </span>
  );
}
