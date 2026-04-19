import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Package, DollarSign, TrendingUp,
  ArrowRight, ChevronUp, ChevronDown,
  AlertCircle, Search, CheckCircle, XCircle, Archive,
} from 'lucide-react';
import { fetchShipmentPerformanceList } from './service';
import type { ShipmentPerformanceRow } from './types';

function fmt(n: number) {
  return '৳' + n.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtUnits(n: number) {
  return n.toLocaleString('en-BD');
}

type SortKey = 'received_date' | 'age_days' | 'units_in' | 'units_sold' | 'units_remaining' | 'sell_through_pct' | 'remaining_inventory_value';

function SellThroughBar({ pct }: { pct: number }) {
  const color =
    pct >= 70 ? 'bg-emerald-500' :
    pct >= 40 ? 'bg-amber-500' :
    'bg-red-400';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums w-10 text-right ${
        pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'
      }`}>{pct.toFixed(1)}%</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-500' },
    ordered: { label: 'Ordered', cls: 'bg-blue-100 text-blue-600' },
    confirmed: { label: 'Confirmed', cls: 'bg-sky-100 text-sky-600' },
    partially_received: { label: 'Partial', cls: 'bg-amber-100 text-amber-600' },
    received_complete: { label: 'Complete', cls: 'bg-emerald-100 text-emerald-700' },
    closed: { label: 'Closed', cls: 'bg-gray-100 text-gray-500' },
    initial: { label: 'Pre-existing', cls: 'bg-slate-100 text-slate-600' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function ShipmentPerformance() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ShipmentPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('received_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchShipmentPerformanceList()
      .then(setRows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const suppliers = useMemo(
    () => [...new Set(rows.map(r => r.supplier_name).filter(Boolean))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    let data = [...rows];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        r.shipment_label?.toLowerCase().includes(q) ||
        r.supplier_name?.toLowerCase().includes(q) ||
        r.po_number?.toLowerCase().includes(q)
      );
    }
    if (supplierFilter) {
      data = data.filter(r => r.supplier_name === supplierFilter);
    }
    data.sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [rows, search, supplierFilter, sortKey, sortDir]);

  const kpis = useMemo(() => {
    const totalCapital = rows.reduce((s, r) => s + Number(r.total_landed_cost) + Number(r.shipping_cost_bdt), 0);
    const totalRemaining = rows.reduce((s, r) => s + Number(r.remaining_inventory_value), 0);
    const totalIn = rows.reduce((s, r) => s + Number(r.units_in), 0);
    const totalSold = rows.reduce((s, r) => s + Number(r.units_sold), 0);
    const blendedST = totalIn > 0 ? (totalSold / totalIn) * 100 : 0;
    return { totalCapital, totalRemaining, blendedST, totalShipments: rows.length };
  }, [rows]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-gray-600" />
      : <ChevronDown className="w-3 h-3 text-gray-600" />;
  }

  function Th({ label, k, right }: { label: string; k?: SortKey; right?: boolean }) {
    return (
      <th
        onClick={() => k && toggleSort(k)}
        className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap
          ${right ? 'text-right' : 'text-left'}
          ${k ? 'cursor-pointer hover:text-gray-800 select-none' : ''}`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {k && <SortIcon k={k} />}
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/reports')}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Reports
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">Shipment Performance</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipment Performance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sell-through rate, inventory age, and financial performance by shipment</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Live data
        </div>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Shipments"
          value={loading ? null : kpis.totalShipments.toString()}
          sub="All time"
          icon={Truck}
          accent="blue"
        />
        <KpiCard
          label="Capital Deployed"
          value={loading ? null : fmt(kpis.totalCapital)}
          sub="Landed cost + shipping"
          icon={DollarSign}
          accent="gray"
        />
        <KpiCard
          label="Remaining Inventory"
          value={loading ? null : fmt(kpis.totalRemaining)}
          sub="At landed cost"
          icon={Package}
          accent="amber"
        />
        <KpiCard
          label="Blended Sell-through"
          value={loading ? null : `${kpis.blendedST.toFixed(1)}%`}
          sub="Across all shipments"
          icon={TrendingUp}
          accent={kpis.blendedST >= 70 ? 'emerald' : kpis.blendedST >= 40 ? 'amber' : 'red'}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shipment ID, supplier, PO..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={supplierFilter}
          onChange={e => setSupplierFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || supplierFilter) && (
          <button
            onClick={() => { setSearch(''); setSupplierFilter(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} shipment{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th label="Shipment" />
                <Th label="Supplier" />
                <Th label="Date Received" k="received_date" />
                <Th label="Age" k="age_days" right />
                <Th label="Units In" k="units_in" right />
                <Th label="Sold" k="units_sold" right />
                <Th label="Remaining" k="units_remaining" right />
                <Th label="Sell-through" k="sell_through_pct" />
                <Th label="Inv. Value" k="remaining_inventory_value" right />
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 12 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-gray-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-16 text-center text-gray-400 text-sm">
                        No shipments found.
                      </td>
                    </tr>
                  )
                  : filtered.map(row => (
                    <ShipmentRow
                      key={row.shipment_db_id}
                      row={row}
                      onClick={() => navigate(`/reports/shipment-performance/${row.shipment_db_id}`)}
                    />
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ShipmentRow({ row, onClick }: { row: ShipmentPerformanceRow; onClick: () => void }) {
  const receivedDate = new Date(row.received_date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer hover:bg-gray-50 transition-colors group"
    >
      <td className="px-4 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
              {row.shipment_label}
            </p>
            {row.is_initial_inventory && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full shrink-0">
                <Archive className="w-3 h-3" />
                Initial
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{row.po_number}</p>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div>
          <p className="text-gray-700">{row.supplier_name ?? '—'}</p>
          {row.supplier_type && (
            <span className="text-xs text-gray-400 capitalize">{row.supplier_type}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{receivedDate}</td>
      <td className="px-4 py-3.5 text-right">
        <span className={`text-sm font-medium ${row.age_days > 60 ? 'text-amber-600' : 'text-gray-600'}`}>
          {row.age_days}d
        </span>
      </td>
      <td className="px-4 py-3.5 text-right text-gray-700 font-medium tabular-nums">
        {fmtUnits(row.units_in)}
      </td>
      <td className="px-4 py-3.5 text-right text-gray-700 tabular-nums">
        {fmtUnits(row.units_sold)}
      </td>
      <td className="px-4 py-3.5 text-right tabular-nums">
        <span className={row.units_remaining > 0 ? 'text-gray-700' : 'text-gray-400'}>
          {fmtUnits(row.units_remaining)}
        </span>
      </td>
      <td className="px-4 py-3.5 min-w-[140px]">
        <SellThroughBar pct={Number(row.sell_through_pct)} />
      </td>
      <td className="px-4 py-3.5 text-right text-gray-700 tabular-nums whitespace-nowrap">
        {fmt(Number(row.remaining_inventory_value))}
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={row.po_status} />
      </td>
      <td className="px-4 py-3.5">
        {row.is_initial_inventory
          ? <span className="text-gray-300 text-sm">—</span>
          : row.is_payment_complete
            ? <CheckCircle className="w-4 h-4 text-emerald-500" />
            : <XCircle className="w-4 h-4 text-red-400" />
        }
      </td>
      <td className="px-4 py-3.5">
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
      </td>
    </tr>
  );
}

/* ─── KPI Card ──────────────────────────────────────────────────── */
const accentMap = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-100',    icon: 'bg-blue-100 text-blue-600',       text: 'text-blue-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-100',   icon: 'bg-amber-100 text-amber-600',     text: 'text-amber-700' },
  red:     { bg: 'bg-red-50',     border: 'border-red-100',     icon: 'bg-red-100 text-red-600',         text: 'text-red-700' },
  gray:    { bg: 'bg-gray-50',    border: 'border-gray-200',    icon: 'bg-gray-100 text-gray-600',       text: 'text-gray-700' },
};

function KpiCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | null; sub: string;
  icon: React.ElementType; accent: keyof typeof accentMap;
}) {
  const a = accentMap[accent];
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-5 flex items-start gap-4`}>
      <div className={`p-2.5 rounded-lg ${a.icon} shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
        {value === null
          ? <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mt-1" />
          : <p className={`text-xl font-bold mt-0.5 ${a.text}`}>{value}</p>
        }
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
