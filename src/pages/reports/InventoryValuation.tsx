import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, ChevronUp, ChevronDown,
  ChevronsUpDown, Search, Calendar, TrendingUp,
  TrendingDown, Boxes, Tag,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

function fmt(n: number) {
  return '৳' + n.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(n: number) {
  return n.toFixed(1) + '%';
}

function localToday() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function localMonthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

interface ValuationRow {
  product_id: string;
  sku: string;
  name: string;
  category: string | null;
  product_type: string | null;
  total_units: number;
  avg_landed_cost: number;
  total_value: number;
}

interface CategorySummary {
  category: string;
  sku_count: number;
  total_units: number;
  total_value: number;
  pct: number;
}

type SortField = 'name' | 'sku' | 'category' | 'total_units' | 'avg_landed_cost' | 'total_value';
type SortDir = 'asc' | 'desc';
type TypeFilter = 'all' | 'saleable_goods' | 'packaging_material';

export default function InventoryValuation() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<ValuationRow[]>([]);
  const [prevRows, setPrevRows] = useState<ValuationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [asOfDate, setAsOfDate] = useState(localToday());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(localToday());

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [catFilter, setCatFilter] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('total_value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchValuation = useCallback(async (date: string): Promise<ValuationRow[]> => {
    const { data, error } = await supabase.rpc('get_inventory_valuation_as_of', {
      as_of_date: date,
    });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      product_id: r.product_id,
      sku: r.sku,
      name: r.name,
      category: r.category,
      product_type: r.product_type,
      total_units: Number(r.total_units),
      avg_landed_cost: Number(r.avg_landed_cost),
      total_value: Number(r.total_value),
    }));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [current, previous] = await Promise.all([
          fetchValuation(asOfDate),
          fetchValuation(localMonthStart()),
        ]);
        setRows(current);
        setPrevRows(previous);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [asOfDate, fetchValuation]);

  /* ─── Derived KPIs ──────────────────────────────────────────────── */
  const totalValue = rows.reduce((s, r) => s + r.total_value, 0);
  const saleableValue = rows.filter(r => r.product_type === 'saleable_goods').reduce((s, r) => s + r.total_value, 0);
  const packagingValue = rows.filter(r => r.product_type === 'packaging_material').reduce((s, r) => s + r.total_value, 0);
  const totalSKUs = rows.length;
  const totalUnits = rows.reduce((s, r) => s + r.total_units, 0);

  const prevTotalValue = prevRows.reduce((s, r) => s + r.total_value, 0);
  const growthAbs = totalValue - prevTotalValue;
  const growthPct = prevTotalValue > 0 ? (growthAbs / prevTotalValue) * 100 : null;

  const isToday = asOfDate === localToday();
  const isHistorical = !isToday;

  /* ─── Category summaries ────────────────────────────────────────── */
  const categories = [...new Set(rows.map(r => r.category).filter(Boolean) as string[])].sort();

  const categoryStats: CategorySummary[] = categories.map(cat => {
    const catRows = rows.filter(r => r.category === cat);
    const val = catRows.reduce((s, r) => s + r.total_value, 0);
    return {
      category: cat,
      sku_count: catRows.length,
      total_units: catRows.reduce((s, r) => s + r.total_units, 0),
      total_value: val,
      pct: totalValue > 0 ? (val / totalValue) * 100 : 0,
    };
  }).sort((a, b) => b.total_value - a.total_value);

  /* ─── Filtering & Sorting ───────────────────────────────────────── */
  const filtered = rows.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && r.product_type !== typeFilter) return false;
    if (catFilter && r.category !== catFilter) return false;
    if (activeCategoryFilter && r.category !== activeCategoryFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortField === 'sku') cmp = a.sku.localeCompare(b.sku);
    else if (sortField === 'category') cmp = (a.category ?? '').localeCompare(b.category ?? '');
    else if (sortField === 'total_units') cmp = a.total_units - b.total_units;
    else if (sortField === 'avg_landed_cost') cmp = a.avg_landed_cost - b.avg_landed_cost;
    else if (sortField === 'total_value') cmp = a.total_value - b.total_value;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir(f === 'name' || f === 'sku' || f === 'category' ? 'asc' : 'desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />;
  };

  const handleApplyDate = () => {
    setAsOfDate(pendingDate);
    setShowDatePicker(false);
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategoryFilter(prev => prev === cat ? null : cat);
    setCatFilter('');
  };

  const displayDate = isToday
    ? 'Today'
    : new Date(asOfDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const typeBadge = (type: string | null) => {
    if (type === 'packaging_material') {
      return <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Packaging</span>;
    }
    return <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Saleable</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/reports')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Valuation</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Stock value at landed cost &mdash; as of{' '}
              <span className={`font-medium ${isHistorical ? 'text-amber-600' : 'text-gray-700'}`}>{displayDate}</span>
            </p>
          </div>
        </div>

        {/* Date selector */}
        <div className="relative">
          <button
            onClick={() => { setPendingDate(asOfDate); setShowDatePicker(v => !v); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
              isHistorical
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            {isHistorical ? `Historical: ${displayDate}` : 'Valuation Date'}
          </button>

          {showDatePicker && (
            <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Valuation Date</p>
              <input
                type="date"
                value={pendingDate}
                max={localToday()}
                onChange={e => setPendingDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { setPendingDate(localToday()); setAsOfDate(localToday()); setShowDatePicker(false); }}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={handleApplyDate}
                  disabled={!pendingDate}
                  className="flex-1 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  Apply
                </button>
              </div>
              {isHistorical && (
                <p className="text-xs text-amber-600 mt-2.5 leading-relaxed">
                  Historical view uses received quantities for lots on or before this date.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 md:col-span-1">
            <p className="text-xs text-gray-500 font-medium">Total Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalValue)}</p>
            <p className="text-xs text-gray-400 mt-0.5">All stock at cost</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <p className="text-xs text-blue-600 font-medium">Saleable Goods</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{fmt(saleableValue)}</p>
            <p className="text-xs text-blue-400 mt-0.5">
              {totalValue > 0 ? fmtPct((saleableValue / totalValue) * 100) : '0%'} of total
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
            <p className="text-xs text-amber-600 font-medium">Packaging Materials</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{fmt(packagingValue)}</p>
            <p className="text-xs text-amber-400 mt-0.5">
              {totalValue > 0 ? fmtPct((packagingValue / totalValue) * 100) : '0%'} of total
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 font-medium">Active SKUs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalSKUs.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{totalUnits.toLocaleString()} total units</p>
          </div>
          <div className={`rounded-xl p-5 border ${
            growthPct === null ? 'bg-white border-gray-200'
            : growthPct >= 0 ? 'bg-emerald-50 border-emerald-100'
            : 'bg-red-50 border-red-100'
          }`}>
            <p className={`text-xs font-medium ${
              growthPct === null ? 'text-gray-500'
              : growthPct >= 0 ? 'text-emerald-600'
              : 'text-red-600'
            }`}>
              {isHistorical ? 'vs. Month Start' : 'MoM Change'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {growthPct !== null && (
                growthPct >= 0
                  ? <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                  : <TrendingDown className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <p className={`text-2xl font-bold ${
                growthPct === null ? 'text-gray-900'
                : growthPct >= 0 ? 'text-emerald-700'
                : 'text-red-700'
              }`}>
                {growthPct === null ? '—' : `${growthPct >= 0 ? '+' : ''}${fmtPct(growthPct)}`}
              </p>
            </div>
            <p className={`text-xs mt-0.5 ${
              growthPct === null ? 'text-gray-400'
              : growthPct >= 0 ? 'text-emerald-500'
              : 'text-red-500'
            }`}>
              {growthPct !== null ? `${growthAbs >= 0 ? '+' : ''}${fmt(growthAbs)} vs start` : 'No prior data'}
            </p>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {!loading && categoryStats.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Valuation by Category</h2>
            {activeCategoryFilter && (
              <button
                onClick={() => setActiveCategoryFilter(null)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {categoryStats.slice(0, 8).map(cat => (
              <button
                key={cat.category}
                onClick={() => handleCategoryClick(cat.category)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  activeCategoryFilter === cat.category
                    ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-300'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">{cat.category}</span>
                  </div>
                  <span className="text-xs text-gray-400">{cat.sku_count} SKUs</span>
                </div>
                <p className="text-base font-bold text-gray-900">{fmt(cat.total_value)}</p>
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">{cat.total_units.toLocaleString()} units</span>
                    <span className="text-xs font-medium text-gray-500">{fmtPct(cat.pct)}</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(cat.pct, 100)}%` }}
                    />
                  </div>
                </div>
              </button>
            ))}
            {categoryStats.length > 8 && (
              <div className="p-4 rounded-xl border border-dashed border-gray-200 flex items-center justify-center">
                <span className="text-xs text-gray-400 font-medium">+{categoryStats.length - 8} more categories</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Uncategorised summary if any */}
      {!loading && (() => {
        const uncatRows = rows.filter(r => !r.category);
        if (uncatRows.length === 0) return null;
        const uncatValue = uncatRows.reduce((s, r) => s + r.total_value, 0);
        return (
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
            <Boxes className="w-4 h-4 text-gray-400 shrink-0" />
            <span>
              <span className="font-medium text-gray-700">{uncatRows.length} uncategorised SKUs</span>
              {' '}with combined value of{' '}
              <span className="font-medium text-gray-700">{fmt(uncatValue)}</span>
              {' '}({totalValue > 0 ? fmtPct((uncatValue / totalValue) * 100) : '0%'} of total)
            </span>
          </div>
        );
      })()}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 min-w-0 flex-1 md:flex-none md:w-64">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-sm outline-none bg-transparent flex-1 min-w-0"
          />
        </div>

        <select
          value={catFilter}
          onChange={e => { setCatFilter(e.target.value); setActiveCategoryFilter(null); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="flex items-center gap-1">
          {([
            { value: 'all', label: 'All Types' },
            { value: 'saleable_goods', label: 'Saleable' },
            { value: 'packaging_material', label: 'Packaging' },
          ] as { value: TypeFilter; label: string }[]).map(f => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === f.value
                  ? f.value === 'all' ? 'bg-gray-900 text-white'
                    : f.value === 'saleable_goods' ? 'bg-blue-600 text-white'
                    : 'bg-amber-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {activeCategoryFilter && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <Tag className="w-3 h-3" />
            {activeCategoryFilter}
            <button onClick={() => setActiveCategoryFilter(null)} className="hover:text-blue-900 ml-0.5">&times;</button>
          </span>
        )}

        <span className="text-xs text-gray-400 ml-auto">{sorted.length} SKUs</span>
      </div>

      {/* SKU Detail Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th
                onClick={() => handleSort('name')}
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
              >
                <div className="flex items-center gap-1">Product <SortIcon field="name" /></div>
              </th>
              <th
                onClick={() => handleSort('sku')}
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none hidden md:table-cell"
              >
                <div className="flex items-center gap-1">SKU <SortIcon field="sku" /></div>
              </th>
              <th
                onClick={() => handleSort('category')}
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none hidden lg:table-cell"
              >
                <div className="flex items-center gap-1">Category <SortIcon field="category" /></div>
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                Type
              </th>
              <th
                onClick={() => handleSort('total_units')}
                className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
              >
                <div className="flex items-center justify-end gap-1">Units <SortIcon field="total_units" /></div>
              </th>
              <th
                onClick={() => handleSort('avg_landed_cost')}
                className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none hidden md:table-cell"
              >
                <div className="flex items-center justify-end gap-1">Avg Cost <SortIcon field="avg_landed_cost" /></div>
              </th>
              <th
                onClick={() => handleSort('total_value')}
                className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
              >
                <div className="flex items-center justify-end gap-1">Value <SortIcon field="total_value" /></div>
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                % of Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(12)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  No products match your filters
                </td>
              </tr>
            ) : (
              sorted.map(r => {
                const pct = totalValue > 0 ? (r.total_value / totalValue) * 100 : 0;
                return (
                  <tr key={r.product_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-xs">{r.name}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">{r.sku}</td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{r.category ?? '—'}</td>
                    <td className="px-4 py-3 text-center hidden xl:table-cell">
                      {typeBadge(r.product_type)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {r.total_units.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">
                      {r.avg_landed_cost > 0 ? fmt(r.avg_landed_cost) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {r.total_value > 0 ? fmt(r.total_value) : '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-400 rounded-full"
                            style={{ width: `${Math.min(pct * 5, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-10 text-right">{fmtPct(pct)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {!loading && sorted.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700">
                  {sorted.length} SKUs
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  {sorted.reduce((s, r) => s + r.total_units, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 hidden md:table-cell" />
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  {fmt(sorted.reduce((s, r) => s + r.total_value, 0))}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-500 hidden lg:table-cell">
                  {totalValue > 0
                    ? fmtPct((sorted.reduce((s, r) => s + r.total_value, 0) / totalValue) * 100)
                    : '—'}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
