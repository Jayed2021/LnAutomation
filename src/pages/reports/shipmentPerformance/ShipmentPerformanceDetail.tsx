import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Package, DollarSign, TrendingDown,
  AlertCircle, Truck, Calendar, Clock, CheckCircle, XCircle,
  BarChart3, RefreshCw, Archive,
} from 'lucide-react';
import { fetchShipmentPerformanceList, fetchShipmentPerformanceDetail } from './service';
import type { ShipmentPerformanceRow, ShipmentPerformanceDetailRow } from './types';

function fmt(n: number) {
  return '৳' + n.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtUnits(n: number) {
  return n.toLocaleString('en-BD');
}

function SellThroughBar({ pct, size = 'sm' }: { pct: number; size?: 'sm' | 'lg' }) {
  const color =
    pct >= 70 ? 'bg-emerald-500' :
    pct >= 40 ? 'bg-amber-500' :
    'bg-red-400';
  const barH = size === 'lg' ? 'h-2.5' : 'h-1.5';
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${barH} bg-gray-100 rounded-full overflow-hidden`}>
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums w-12 text-right ${
        pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'
      }`}>{Number(pct).toFixed(1)}%</span>
    </div>
  );
}

export default function ShipmentPerformanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [shipment, setShipment] = useState<ShipmentPerformanceRow | null>(null);
  const [skus, setSkus] = useState<ShipmentPerformanceDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetchShipmentPerformanceList(),
      fetchShipmentPerformanceDetail(id),
    ])
      .then(([list, detail]) => {
        const found = list.find(r => r.shipment_db_id === id) ?? null;
        setShipment(found);
        setSkus(detail);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const financials = useMemo(() => {
    if (!shipment) return null;
    const cogsTotal = Number(shipment.total_landed_cost);
    const cogsSold = Number(shipment.cogs_sold);
    const remainingValue = Number(shipment.remaining_inventory_value);
    const capitalDeployed = cogsTotal + Number(shipment.shipping_cost_bdt);
    const capitalRecovery = capitalDeployed > 0
      ? (cogsSold / capitalDeployed) * 100 : 0;
    return { cogsTotal, cogsSold, remainingValue, capitalDeployed, capitalRecovery };
  }, [shipment]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-48 bg-gray-200 rounded" />
        <div className="h-8 w-72 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-100 rounded-xl" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
        <div className="h-96 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {error}
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="text-center py-24 text-gray-400 text-sm">
        Shipment not found.
      </div>
    );
  }

  const receivedDate = new Date(shipment.received_date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const poCreatedDate = new Date(shipment.po_created_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/reports')}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Reports
        </button>
        <span className="text-gray-300">/</span>
        <button
          onClick={() => navigate('/reports/shipment-performance')}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Shipment Performance
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">{shipment.shipment_label}</span>
      </div>

      {/* Back button + Title */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/reports/shipment-performance')}
          className="mt-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{shipment.shipment_label}</h1>
            {shipment.is_initial_inventory
              ? (
                <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  <Archive className="w-3 h-3" /> Pre-existing Stock
                </span>
              ) : (
                <>
                  <PoStatusBadge status={shipment.po_status} />
                  {shipment.is_payment_complete
                    ? <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle className="w-3 h-3" /> Paid
                      </span>
                    : <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                        <XCircle className="w-3 h-3" /> Unpaid
                      </span>
                  }
                </>
              )
            }
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-gray-400" />
              {shipment.supplier_name ?? '—'}
              {shipment.supplier_type && (
                <span className="text-xs text-gray-400 capitalize">({shipment.supplier_type})</span>
              )}
            </span>
            {!shipment.is_initial_inventory && shipment.po_number && (
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-gray-400" />
                {shipment.po_number}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {shipment.is_initial_inventory ? 'As of' : 'Received'} {receivedDate}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {shipment.age_days} days old
            </span>
            {!shipment.is_initial_inventory && shipment.lead_time_days !== null && (
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                Lead time: {shipment.lead_time_days}d
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stock + Financial cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stock Metrics */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-5 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" />
            Stock Performance
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Units In</p>
                <p className="text-xl font-bold text-gray-800">{fmtUnits(shipment.units_in)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-500 mb-1">Sold</p>
                <p className="text-xl font-bold text-blue-700">{fmtUnits(shipment.units_sold)}</p>
              </div>
              <div className={`rounded-lg p-3 ${shipment.units_remaining > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                <p className={`text-xs mb-1 ${shipment.units_remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>Remaining</p>
                <p className={`text-xl font-bold ${shipment.units_remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {fmtUnits(shipment.units_remaining)}
                </p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500 font-medium">Sell-through rate</span>
              </div>
              <SellThroughBar pct={Number(shipment.sell_through_pct)} size="lg" />
            </div>
            {(shipment.units_returned > 0 || shipment.units_damaged > 0 || shipment.units_adjusted > 0) && (
              <div className="border-t border-gray-100 pt-4 grid grid-cols-3 gap-3 text-center">
                {shipment.units_returned > 0 && (
                  <div>
                    <p className="text-xs text-gray-400">Returned</p>
                    <p className="text-sm font-semibold text-gray-600">{fmtUnits(shipment.units_returned)}</p>
                  </div>
                )}
                {shipment.units_damaged > 0 && (
                  <div>
                    <p className="text-xs text-gray-400">Damaged</p>
                    <p className="text-sm font-semibold text-red-500">{fmtUnits(shipment.units_damaged)}</p>
                  </div>
                )}
                {shipment.units_adjusted > 0 && (
                  <div>
                    <p className="text-xs text-gray-400">Adjusted</p>
                    <p className="text-sm font-semibold text-amber-600">{fmtUnits(shipment.units_adjusted)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Financial Metrics */}
        {shipment.is_initial_inventory ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Cost metrics not available</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Financial tracking is not applicable for pre-existing stock. Only unit-level performance is shown.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-5 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Financials
            </h2>
            {financials && (
              <div className="space-y-3">
                <FinRow
                  label="COGS — Sold Portion"
                  value={fmt(financials.cogsSold)}
                  sub={`${fmtUnits(shipment.units_sold)} units at landed cost`}
                  accent="gray"
                />
                <FinRow
                  label="Remaining Inventory Value"
                  value={fmt(financials.remainingValue)}
                  sub={`${fmtUnits(shipment.units_remaining)} units remaining`}
                  accent="amber"
                />
                <div className="border-t border-gray-100 pt-3">
                  <FinRow
                    label="Total Capital Deployed"
                    value={fmt(financials.capitalDeployed)}
                    sub={`Landed cost ${fmt(financials.cogsTotal)} + shipping ${fmt(Number(shipment.shipping_cost_bdt))}`}
                    accent="blue"
                    bold
                  />
                </div>
                <CapitalRecoveryBar pct={financials.capitalRecovery} />
                <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-3 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">PO Created</p>
                    <p className="text-sm font-semibold text-gray-700">{poCreatedDate}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Total Paid</p>
                    <p className="text-sm font-semibold text-gray-700">{fmt(Number(shipment.total_paid_bdt))}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SKU Breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">SKU Breakdown</h2>
          </div>
          <span className="text-xs text-gray-400">{skus.length} product{skus.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Product</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Units In</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Sold</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Remaining</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[140px]">Sell-through</th>
                {!shipment.is_initial_inventory && (
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">COGS Sold</th>
                )}
                {!shipment.is_initial_inventory && (
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Inv. Value</th>
                )}
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Unit Cost</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Losses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {skus.length === 0 ? (
                <tr>
                  <td colSpan={shipment.is_initial_inventory ? 7 : 9} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No SKU data available.
                  </td>
                </tr>
              ) : skus.map(sku => (
                <SkuRow key={sku.sku} row={sku} isInitialInventory={shipment.is_initial_inventory} />
              ))}
            </tbody>
            {skus.length > 0 && (
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <SkuTotalsRow skus={skus} isInitialInventory={shipment.is_initial_inventory} />
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function SkuRow({ row, isInitialInventory }: { row: ShipmentPerformanceDetailRow; isInitialInventory: boolean }) {
  const hasLoss = row.units_damaged > 0 || row.units_adjusted > 0;
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3.5">
        <div>
          <p className="font-medium text-gray-800">{row.product_name}</p>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{row.sku}</p>
        </div>
      </td>
      <td className="px-4 py-3.5 text-right text-gray-700 tabular-nums">{fmtUnits(row.units_in)}</td>
      <td className="px-4 py-3.5 text-right text-gray-700 tabular-nums">{fmtUnits(row.units_sold)}</td>
      <td className="px-4 py-3.5 text-right tabular-nums">
        <span className={row.units_remaining > 0 ? 'text-gray-700' : 'text-gray-400'}>
          {fmtUnits(row.units_remaining)}
        </span>
      </td>
      <td className="px-4 py-3.5 min-w-[140px]">
        <SellThroughBar pct={Number(row.sell_through_pct)} />
      </td>
      {!isInitialInventory && (
        <td className="px-4 py-3.5 text-right text-gray-700 tabular-nums whitespace-nowrap">{fmt(Number(row.cogs_sold))}</td>
      )}
      {!isInitialInventory && (
        <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">
          <span className={Number(row.remaining_inventory_value) > 0 ? 'text-amber-700 font-medium' : 'text-gray-400'}>
            {fmt(Number(row.remaining_inventory_value))}
          </span>
        </td>
      )}
      <td className="px-4 py-3.5 text-right text-gray-500 tabular-nums whitespace-nowrap">
        {fmt(Number(row.landed_cost_per_unit))}
      </td>
      <td className="px-4 py-3.5 text-center">
        {hasLoss ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
            <TrendingDown className="w-3.5 h-3.5" />
            {row.units_damaged > 0 && `${row.units_damaged}dmg`}
            {row.units_damaged > 0 && row.units_adjusted > 0 && ' '}
            {row.units_adjusted > 0 && `${row.units_adjusted}adj`}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
    </tr>
  );
}

function SkuTotalsRow({ skus, isInitialInventory }: { skus: ShipmentPerformanceDetailRow[]; isInitialInventory: boolean }) {
  const totals = skus.reduce(
    (acc, r) => ({
      units_in: acc.units_in + Number(r.units_in),
      units_sold: acc.units_sold + Number(r.units_sold),
      units_remaining: acc.units_remaining + Number(r.units_remaining),
      cogs_sold: acc.cogs_sold + Number(r.cogs_sold),
      remaining_inventory_value: acc.remaining_inventory_value + Number(r.remaining_inventory_value),
    }),
    { units_in: 0, units_sold: 0, units_remaining: 0, cogs_sold: 0, remaining_inventory_value: 0 }
  );
  const stPct = totals.units_in > 0 ? (totals.units_sold / totals.units_in) * 100 : 0;

  return (
    <tr className="font-semibold text-gray-700">
      <td className="px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Totals</td>
      <td className="px-4 py-3 text-right tabular-nums">{fmtUnits(totals.units_in)}</td>
      <td className="px-4 py-3 text-right tabular-nums">{fmtUnits(totals.units_sold)}</td>
      <td className="px-4 py-3 text-right tabular-nums">{fmtUnits(totals.units_remaining)}</td>
      <td className="px-4 py-3">
        <SellThroughBar pct={stPct} />
      </td>
      {!isInitialInventory && (
        <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{fmt(totals.cogs_sold)}</td>
      )}
      {!isInitialInventory && (
        <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{fmt(totals.remaining_inventory_value)}</td>
      )}
      <td className="px-4 py-3" />
      <td className="px-4 py-3" />
    </tr>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function PoStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-500' },
    ordered: { label: 'Ordered', cls: 'bg-blue-100 text-blue-600' },
    confirmed: { label: 'Confirmed', cls: 'bg-sky-100 text-sky-600' },
    partially_received: { label: 'Partial Receipt', cls: 'bg-amber-100 text-amber-600' },
    received_complete: { label: 'Fully Received', cls: 'bg-emerald-100 text-emerald-700' },
    closed: { label: 'Closed', cls: 'bg-gray-100 text-gray-500' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  );
}

function FinRow({ label, value, sub, accent, bold }: {
  label: string; value: string; sub: string;
  accent: 'gray' | 'amber' | 'blue' | 'emerald' | 'red';
  bold?: boolean;
}) {
  const clsMap = {
    gray:    'text-gray-800',
    amber:   'text-amber-700',
    blue:    'text-blue-700',
    emerald: 'text-emerald-700',
    red:     'text-red-600',
  };
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className={`text-sm font-medium ${bold ? 'text-gray-800' : 'text-gray-600'}`}>{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
      <p className={`text-sm whitespace-nowrap ${bold ? 'font-bold' : 'font-semibold'} ${clsMap[accent]}`}>{value}</p>
    </div>
  );
}

function CapitalRecoveryBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500';
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">Capital Recovery via COGS</span>
        <span className={`text-xs font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1.5">Sold COGS as a portion of total capital deployed</p>
    </div>
  );
}

