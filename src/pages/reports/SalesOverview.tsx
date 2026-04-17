import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, Truck, TrendingUp, TrendingDown,
  Clock, AlertCircle, CheckCircle, XCircle, BarChart3,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

/* ─── Types ─────────────────────────────────────────────────────── */
type Preset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'custom';

interface OrderRow {
  id: string;
  order_date: string;
  shipped_at: string | null;
  cs_status: string | null;
  total_amount: number;
}

interface DailyBreakdown {
  date: string;
  created: number;
  dispatched: number;
  revCreated: number;
  revDispatched: number;
  cbd: number;
  cad: number;
}

/* ─── Date helpers ──────────────────────────────────────────────── */
function getPresetDates(preset: Preset, custom: { from: string; to: string }): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const pad = (d: Date) => d.toISOString().split('T')[0];

  switch (preset) {
    case 'today':
      return { from: pad(now), to: pad(now) };
    case 'yesterday': {
      const y2 = new Date(now); y2.setDate(now.getDate() - 1);
      return { from: pad(y2), to: pad(y2) };
    }
    case 'this_week': {
      const day = now.getDay();
      const mon = new Date(now); mon.setDate(now.getDate() - ((day + 6) % 7));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { from: pad(mon), to: pad(sun) };
    }
    case 'last_week': {
      const day = now.getDay();
      const thisMon = new Date(now); thisMon.setDate(now.getDate() - ((day + 6) % 7));
      const lastMon = new Date(thisMon); lastMon.setDate(thisMon.getDate() - 7);
      const lastSun = new Date(lastMon); lastSun.setDate(lastMon.getDate() + 6);
      return { from: pad(lastMon), to: pad(lastSun) };
    }
    case 'this_month':
      return {
        from: new Date(y, m, 1).toISOString().split('T')[0],
        to: new Date(y, m + 1, 0).toISOString().split('T')[0],
      };
    case 'last_month':
      return {
        from: new Date(y, m - 1, 1).toISOString().split('T')[0],
        to: new Date(y, m, 0).toISOString().split('T')[0],
      };
    case 'this_quarter': {
      const qStart = Math.floor(m / 3) * 3;
      return {
        from: new Date(y, qStart, 1).toISOString().split('T')[0],
        to: new Date(y, qStart + 3, 0).toISOString().split('T')[0],
      };
    }
    case 'custom':
      return custom;
  }
}

function fmt(n: number) {
  return '৳' + Math.round(n).toLocaleString('en-BD');
}

function fmtPct(n: number | null) {
  if (n === null || isNaN(n)) return '—';
  return n.toFixed(1) + '%';
}

function fmtDays(n: number | null) {
  if (n === null || isNaN(n)) return '—';
  return n.toFixed(1) + 'd';
}

function daysBetween(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
}

function formatDateLabel(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDaysInRange(from: string, to: string): string[] {
  const days: string[] = [];
  const cur = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (cur <= end) {
    days.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/* ─── Main Component ─────────────────────────────────────────────── */
function SalesOverviewContent() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<Preset>('this_month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const dateRange = getPresetDates(preset, custom);

  const load = useCallback(async () => {
    if (preset === 'custom' && (!custom.from || !custom.to)) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select('id, order_date, shipped_at, cs_status, total_amount')
        .gte('order_date', dateRange.from)
        .lte('order_date', dateRange.to);
      setOrders((data ?? []) as OrderRow[]);
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to, preset, custom.from, custom.to]);

  useEffect(() => { load(); }, [load]);

  /* ─── Derived metrics ──────────────────────────────────────────── */
  const metrics = useMemo(() => {
    const created = orders.length;
    const revCreated = orders.reduce((s, o) => s + Number(o.total_amount), 0);
    const dispatched = orders.filter(o => !!o.shipped_at).length;
    const revDispatched = orders.filter(o => !!o.shipped_at).reduce((s, o) => s + Number(o.total_amount), 0);
    const avgOrderValue = created > 0 ? revCreated / created : 0;

    const isCbd = (o: OrderRow) =>
      o.cs_status === 'cancelled_cbd' ||
      o.cs_status === 'cancel_requested_cbd' ||
      o.cs_status === 'cancelled';
    const cbd = orders.filter(isCbd).length;

    const isCAD = (o: OrderRow) =>
      o.cs_status === 'cancelled_after_dispatch' ||
      o.cs_status === 'return_requested' ||
      o.cs_status === 'returned';
    const cad = orders.filter(o => isCAD(o) && !!o.shipped_at).length;

    const confirmationPool = dispatched + cbd;
    const confirmationRate = confirmationPool > 0 ? (dispatched / confirmationPool) * 100 : null;

    const cadPool = dispatched + cad;
    const cadRate = cadPool > 0 ? (cad / cadPool) * 100 : null;

    const dispatchRate = created > 0 ? (dispatched / created) * 100 : null;
    const pending = orders.filter(o => !o.shipped_at && !isCbd(o)).length;

    const dispatchedWithDates = orders.filter(o => !!o.shipped_at);
    const avgDispatchDelay = dispatchedWithDates.length > 0
      ? dispatchedWithDates.reduce((s, o) => s + daysBetween(o.order_date, o.shipped_at!), 0) / dispatchedWithDates.length
      : null;

    return {
      created, revCreated, dispatched, revDispatched, avgOrderValue,
      cbd, cad, confirmationRate, confirmationPool, cadRate, cadPool,
      dispatchRate, pending, avgDispatchDelay,
    };
  }, [orders]);

  /* ─── Daily breakdown ──────────────────────────────────────────── */
  const daily = useMemo<DailyBreakdown[]>(() => {
    const days = getDaysInRange(dateRange.from, dateRange.to);
    if (days.length <= 1) return [];

    const isCbd = (o: OrderRow) =>
      o.cs_status === 'cancelled_cbd' ||
      o.cs_status === 'cancel_requested_cbd' ||
      o.cs_status === 'cancelled';
    const isCAD = (o: OrderRow) =>
      (o.cs_status === 'cancelled_after_dispatch' ||
        o.cs_status === 'return_requested' ||
        o.cs_status === 'returned') && !!o.shipped_at;

    return days.map(date => {
      const dayOrders = orders.filter(o => o.order_date === date);
      const dayDispatched = dayOrders.filter(o => !!o.shipped_at);
      return {
        date,
        created: dayOrders.length,
        dispatched: dayDispatched.length,
        revCreated: dayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
        revDispatched: dayDispatched.reduce((s, o) => s + Number(o.total_amount), 0),
        cbd: dayOrders.filter(isCbd).length,
        cad: dayOrders.filter(isCAD).length,
      };
    }).reverse();
  }, [orders, dateRange.from, dateRange.to]);

  const presets: { value: Preset; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/reports')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Order volume, dispatch performance, and confirmation rates</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {presets.map(p => (
          <button
            key={p.value}
            onClick={() => setPreset(p.value)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              preset === p.value
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 ml-1">
            <input
              type="date"
              value={custom.from}
              onChange={e => setCustom(c => ({ ...c, from: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={custom.to}
              onChange={e => setCustom(c => ({ ...c, to: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        {!loading && (
          <span className="text-xs text-gray-400 ml-2">
            {dateRange.from === dateRange.to
              ? formatDateLabel(dateRange.from)
              : `${dateRange.from} → ${dateRange.to}`}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Primary KPI Cards — 2 rows of 3 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard
              label="Orders Created"
              value={metrics.created.toLocaleString()}
              sub="by order date in range"
              accent="blue"
              icon={ShoppingCart}
            />
            <KpiCard
              label="Revenue Created"
              value={fmt(metrics.revCreated)}
              sub="total order value created"
              accent="blue"
              icon={TrendingUp}
            />
            <KpiCard
              label="Avg Order Value"
              value={metrics.created > 0 ? fmt(metrics.avgOrderValue) : '—'}
              sub="revenue / orders created"
              accent="slate"
              icon={BarChart3}
            />
            <KpiCard
              label="Orders Dispatched"
              value={metrics.dispatched.toLocaleString()}
              sub="shipped in date range"
              accent="emerald"
              icon={Truck}
            />
            <KpiCard
              label="Revenue Dispatched"
              value={fmt(metrics.revDispatched)}
              sub="value of shipped orders"
              accent="emerald"
              icon={TrendingUp}
            />
            <KpiCard
              label="CBD Cancelled"
              value={metrics.cbd.toLocaleString()}
              sub="cancelled before dispatch"
              accent="red"
              icon={XCircle}
            />
          </div>

          {/* Operational Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricStrip
              label="Created → Dispatched Rate"
              value={fmtPct(metrics.dispatchRate)}
              sub={`${metrics.dispatched} dispatched of ${metrics.created} created`}
              positive={metrics.dispatchRate !== null && metrics.dispatchRate >= 60}
              neutral={metrics.dispatchRate === null || metrics.dispatchRate >= 40}
            />
            <MetricStrip
              label="Pending Orders"
              value={metrics.pending.toLocaleString()}
              sub="created in range, not yet dispatched"
              positive={metrics.pending === 0}
              neutral={metrics.pending < 20}
            />
            <MetricStrip
              label="Avg Dispatch Delay"
              value={fmtDays(metrics.avgDispatchDelay)}
              sub="days from order to shipment"
              positive={metrics.avgDispatchDelay !== null && metrics.avgDispatchDelay <= 1.5}
              neutral={metrics.avgDispatchDelay === null || metrics.avgDispatchDelay <= 3}
            />
          </div>

          {/* Rate Performance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RateCard
              title="Confirmation Rate"
              subtitle="Phone confirmed vs. CBD cancelled"
              rate={metrics.confirmationRate}
              positiveThreshold={80}
              warningThreshold={60}
              breakdown={[
                { label: 'Dispatched', value: metrics.dispatched, icon: CheckCircle, color: 'text-emerald-600' },
                { label: 'CBD Cancelled', value: metrics.cbd, icon: XCircle, color: 'text-red-500' },
                { label: 'Pool total', value: metrics.confirmationPool, icon: ShoppingCart, color: 'text-gray-500' },
              ]}
            />
            <RateCard
              title="Post-Dispatch Cancel Rate"
              subtitle="Cancelled after confirmed and shipped"
              rate={metrics.cadRate}
              positiveThreshold={5}
              warningThreshold={10}
              invertColors
              breakdown={[
                { label: 'CAD / Return', value: metrics.cad, icon: AlertCircle, color: 'text-red-500' },
                { label: 'Dispatched', value: metrics.dispatched, icon: Truck, color: 'text-emerald-600' },
                { label: 'Pool total', value: metrics.cadPool, icon: ShoppingCart, color: 'text-gray-500' },
              ]}
            />
          </div>

          {/* Daily Breakdown Table */}
          {daily.length > 0 && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Daily Breakdown</h3>
                <p className="text-xs text-gray-500 mt-0.5">Per-day summary for the selected range</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dispatched</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Rev Created</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Rev Dispatched</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">CBD</th>
                      <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">CAD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {daily.map(row => (
                      <tr key={row.date} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">
                          {formatDateLabel(row.date)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{row.created}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-700 font-medium">{row.dispatched}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">{fmt(row.revCreated)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-700 font-medium whitespace-nowrap">{fmt(row.revDispatched)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-500">{row.cbd > 0 ? row.cbd : <span className="text-gray-300">—</span>}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-red-500">{row.cad > 0 ? row.cad : <span className="text-gray-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td className="px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">
                        {daily.reduce((s, r) => s + r.created, 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">
                        {daily.reduce((s, r) => s + r.dispatched, 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                        {fmt(daily.reduce((s, r) => s + r.revCreated, 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                        {fmt(daily.reduce((s, r) => s + r.revDispatched, 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-500 tabular-nums">
                        {daily.reduce((s, r) => s + r.cbd, 0)}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-red-500 tabular-nums">
                        {daily.reduce((s, r) => s + r.cad, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── KPI Card ──────────────────────────────────────────────────── */
type Accent = 'blue' | 'emerald' | 'red' | 'amber' | 'slate';

const accentStyles: Record<Accent, { bg: string; border: string; icon: string; text: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'bg-blue-100 text-blue-600', text: 'text-blue-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700' },
  red: { bg: 'bg-red-50', border: 'border-red-100', icon: 'bg-red-100 text-red-600', text: 'text-red-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-700' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-100', icon: 'bg-slate-100 text-slate-600', text: 'text-slate-700' },
};

function KpiCard({ label, value, sub, accent, icon: Icon }: {
  label: string; value: string; sub: string; accent: Accent; icon: React.ElementType;
}) {
  const a = accentStyles[accent];
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-5 flex items-start gap-4`}>
      <div className={`p-2.5 rounded-lg shrink-0 ${a.icon}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${a.text}`}>{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

/* ─── Metric Strip ──────────────────────────────────────────────── */
function MetricStrip({ label, value, sub, positive, neutral }: {
  label: string; value: string; sub: string; positive: boolean; neutral: boolean;
}) {
  const color = positive ? 'text-emerald-700' : neutral ? 'text-amber-600' : 'text-red-600';
  const bg = positive ? 'bg-emerald-50 border-emerald-100' : neutral ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';
  return (
    <div className={`rounded-xl border ${bg} px-5 py-4`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

/* ─── Rate Card ─────────────────────────────────────────────────── */
interface BreakdownItem {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

function RateCard({ title, subtitle, rate, positiveThreshold, warningThreshold, invertColors, breakdown }: {
  title: string;
  subtitle: string;
  rate: number | null;
  positiveThreshold: number;
  warningThreshold: number;
  invertColors?: boolean;
  breakdown: BreakdownItem[];
}) {
  const isGood = rate !== null && (invertColors ? rate <= positiveThreshold : rate >= positiveThreshold);
  const isWarn = rate !== null && !isGood && (invertColors ? rate <= warningThreshold : rate >= warningThreshold);
  const rateColor = rate === null ? 'text-gray-400' : isGood ? 'text-emerald-700' : isWarn ? 'text-amber-600' : 'text-red-600';
  const cardBorder = rate === null ? 'border-gray-200' : isGood ? 'border-emerald-200' : isWarn ? 'border-amber-200' : 'border-red-200';
  const headerBg = rate === null ? 'bg-gray-50' : isGood ? 'bg-emerald-50' : isWarn ? 'bg-amber-50' : 'bg-red-50';

  return (
    <div className={`rounded-xl border ${cardBorder} overflow-hidden`}>
      <div className={`${headerBg} px-6 py-4 border-b ${cardBorder}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          <span className={`text-3xl font-bold tabular-nums ${rateColor}`}>
            {rate !== null ? rate.toFixed(1) + '%' : '—'}
          </span>
        </div>
      </div>
      <div className="bg-white px-6 py-4">
        <div className="grid grid-cols-3 gap-3">
          {breakdown.map(item => {
            const ItemIcon = item.icon;
            return (
              <div key={item.label} className="text-center">
                <ItemIcon className={`w-4 h-4 mx-auto mb-1 ${item.color}`} />
                <p className="text-lg font-bold text-gray-800 tabular-nums">{item.value}</p>
                <p className="text-xs text-gray-400">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Auth wrapper ──────────────────────────────────────────────── */
export default function SalesOverview() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <SalesOverviewContent />;
}
