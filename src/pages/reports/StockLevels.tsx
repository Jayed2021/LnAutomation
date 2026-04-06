import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, AlertTriangle, ChevronUp, ChevronDown,
  ChevronsUpDown, Search, Filter,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

function fmt(n: number) {
  return '৳' + n.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface StockRow {
  product_id: string;
  sku: string;
  name: string;
  category: string | null;
  product_type: string | null;
  total_units: number;
  avg_landed_cost: number;
  total_value: number;
  low_stock_threshold: number;
  status: 'out_of_stock' | 'low_stock' | 'in_stock';
}

type SortField = 'name' | 'sku' | 'category' | 'total_units' | 'avg_landed_cost' | 'total_value';
type SortDir = 'asc' | 'desc';
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export default function StockLevels() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [prodRes, lotsRes, avgRes] = await Promise.all([
          supabase
            .from('products')
            .select('id, sku, name, category, product_type, low_stock_threshold, is_active')
            .eq('is_active', true)
            .order('name'),
          supabase
            .from('inventory_lots')
            .select('product_id, remaining_quantity, landed_cost_per_unit')
            .gt('remaining_quantity', 0),
          supabase
            .from('product_avg_landed_cost')
            .select('sku, avg_landed_cost'),
        ]);

        const products = prodRes.data ?? [];
        const lots = lotsRes.data ?? [];
        const avgCosts = new Map((avgRes.data ?? []).map((r: any) => [r.sku, Number(r.avg_landed_cost ?? 0)]));

        const unitsByProduct: Record<string, number> = {};
        lots.forEach((l: any) => {
          unitsByProduct[l.product_id] = (unitsByProduct[l.product_id] ?? 0) + Number(l.remaining_quantity);
        });

        const stockRows: StockRow[] = products.map((p: any) => {
          const totalUnits = unitsByProduct[p.id] ?? 0;
          const avgCost = avgCosts.get(p.sku) ?? 0;
          const totalValue = totalUnits * avgCost;
          const threshold = p.low_stock_threshold ?? 20;
          const status: StockRow['status'] =
            totalUnits === 0 ? 'out_of_stock'
            : totalUnits <= threshold ? 'low_stock'
            : 'in_stock';

          return {
            product_id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category,
            product_type: p.product_type,
            total_units: totalUnits,
            avg_landed_cost: avgCost,
            total_value: totalValue,
            low_stock_threshold: threshold,
            status,
          };
        });

        setRows(stockRows);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ─── Derived ────────────────────────────────────────────────────── */
  const categories = [...new Set(rows.map(r => r.category).filter(Boolean) as string[])].sort();
  const totalSKUs = rows.length;
  const totalUnits = rows.reduce((s, r) => s + r.total_units, 0);
  const totalValue = rows.reduce((s, r) => s + r.total_value, 0);
  const lowStockCount = rows.filter(r => r.status === 'low_stock').length;
  const outOfStockCount = rows.filter(r => r.status === 'out_of_stock').length;

  const filtered = rows.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && r.category !== catFilter) return false;
    if (stockFilter !== 'all' && r.status !== stockFilter) return false;
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

  const statusBadge = (status: StockRow['status']) => {
    if (status === 'out_of_stock') return <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Out of Stock</span>;
    if (status === 'low_stock') return <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Low Stock</span>;
    return <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">In Stock</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/reports')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Levels</h1>
          <p className="text-sm text-gray-500 mt-0.5">Current inventory snapshot and valuation</p>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 font-medium">Active SKUs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalSKUs.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">Products</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 font-medium">Total Units</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalUnits.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">In stock</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 font-medium">Inventory Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalValue)}</p>
            <p className="text-xs text-gray-400 mt-0.5">At avg landed cost</p>
          </div>
          <div className={`rounded-xl p-5 border ${lowStockCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
            <p className="text-xs text-gray-500 font-medium">Low Stock</p>
            <p className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{lowStockCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">SKUs at or below threshold</p>
          </div>
          <div className={`rounded-xl p-5 border ${outOfStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <p className="text-xs text-gray-500 font-medium">Out of Stock</p>
            <p className={`text-2xl font-bold mt-1 ${outOfStockCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>{outOfStockCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Zero remaining units</p>
          </div>
        </div>
      )}

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
          onChange={e => setCatFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-1">
          {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as StockFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStockFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                stockFilter === f
                  ? f === 'all' ? 'bg-gray-900 text-white'
                    : f === 'out_of_stock' ? 'bg-red-600 text-white'
                    : f === 'low_stock' ? 'bg-amber-500 text-white'
                    : 'bg-emerald-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All' : f === 'in_stock' ? 'In Stock' : f === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{sorted.length} products</span>
      </div>

      {/* Table */}
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
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  No products match your filters
                </td>
              </tr>
            ) : (
              sorted.map(r => (
                <tr
                  key={r.product_id}
                  className={`transition-colors ${
                    r.status === 'out_of_stock'
                      ? 'bg-red-50/40 hover:bg-red-50'
                      : r.status === 'low_stock'
                      ? 'bg-amber-50/30 hover:bg-amber-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-xs">{r.name}</div>
                    {r.product_type && (
                      <div className="text-xs text-gray-400 mt-0.5 capitalize">{r.product_type.replace(/_/g, ' ')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">{r.sku}</td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{r.category ?? '—'}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${
                      r.status === 'out_of_stock' ? 'text-red-600'
                      : r.status === 'low_stock' ? 'text-amber-600'
                      : 'text-gray-900'
                    }`}>
                      {r.total_units.toLocaleString()}
                    </span>
                    {r.status !== 'out_of_stock' && (
                      <div className="text-xs text-gray-400">min {r.low_stock_threshold}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">
                    {r.avg_landed_cost > 0 ? fmt(r.avg_landed_cost) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {r.total_value > 0 ? fmt(r.total_value) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && sorted.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700">
                  {sorted.length} products
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  {sorted.reduce((s, r) => s + r.total_units, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 hidden md:table-cell" />
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  {fmt(sorted.reduce((s, r) => s + r.total_value, 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
