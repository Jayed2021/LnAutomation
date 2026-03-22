import { useMemo } from "react";
import { Link } from "react-router";
import { orders, lots, returns, purchaseOrders, skus } from "../data/mockData";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from "recharts";
import {
  ShoppingBag, TrendingUp, TrendingDown, Package,
  RotateCcw, Truck, AlertTriangle, ArrowRight,
  CheckCircle2, Clock, Printer, PackageCheck, Zap
} from "lucide-react";
import { Badge } from "./ui/badge";

// ─── Colour tokens ────────────────────────────────────────────────────────────
const PALETTE = {
  blue:   "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  emerald:"#10b981",
  amber:  "#f59e0b",
  rose:   "#f43f5e",
  sky:    "#0ea5e9",
  slate:  "#64748b",
};

const STATUS_COLORS: Record<string, string> = {
  new_not_called:  "#e2e8f0",
  new_called:      "#94a3b8",
  awaiting_payment:"#fbbf24",
  send_to_lab:     "#f59e0b",
  in_lab:          "#f97316",
  late_delivery:   "#ef4444",
  exchange:        "#06b6d4",
  not_printed:     "#818cf8",
  printed:         "#6366f1",
  packed:          "#8b5cf6",
  shipped:         "#3b82f6",
  delivered:       "#10b981",
  refund:          "#f43f5e",
  processing:      "#64748b",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return "৳ " + n.toLocaleString("en-BD");
}
function pct(a: number, b: number) {
  if (b === 0) return 0;
  return Math.round((a / b) * 100);
}

// ─── Derived data (computed once outside the component so it's stable) ────────

// 1. Best-selling SKUs by units sold across ALL orders
const skuSales = orders.reduce((acc, order) => {
  order.items.forEach(item => {
    if (!acc[item.sku]) {
      acc[item.sku] = { sku: item.sku, name: item.sku_name, units: 0, revenue: 0 };
    }
    acc[item.sku].units   += item.quantity;
    acc[item.sku].revenue += item.quantity * item.price;
  });
  return acc;
}, {} as Record<string, { sku: string; name: string; units: number; revenue: number }>);

const bestSellers = Object.values(skuSales)
  .sort((a, b) => b.units - a.units)
  .slice(0, 5);

const maxUnits = bestSellers[0]?.units ?? 1;

// 2. Order status distribution for donut
const statusCounts = orders.reduce((acc, o) => {
  acc[o.cs_status] = (acc[o.cs_status] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

const statusDonut = Object.entries(statusCounts).map(([status, count]) => ({
  name: status.replace(/_/g, " "),
  status,
  count,
  color: STATUS_COLORS[status] ?? "#94a3b8",
})).sort((a, b) => b.count - a.count);

// 3. 7-day sales trend (mock enriched daily data relative to today)
const today = new Date("2026-03-06");
const dailySales = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(today);
  d.setDate(today.getDate() - (6 - i));
  const key = d.toISOString().slice(0, 10);
  const dayOrders = orders.filter(o => o.created_date === key);
  // Enrich with some plausible data for days with no orders in mock
  const baseOrders = dayOrders.length > 0 ? dayOrders.length : Math.floor(8 + Math.random() * 14);
  const baseRevenue = dayOrders.length > 0
    ? dayOrders.reduce((s, o) => s + o.total, 0)
    : baseOrders * (55 + Math.floor(Math.random() * 40));
  return {
    date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    orders: baseOrders,
    revenue: baseRevenue,
  };
});

// Lock the data so randomness doesn't regenerate on every render
const DAILY_SALES = [
  { date: "28 Feb", orders: 14, revenue: 8540 },
  { date: "01 Mar", orders: 19, revenue: 11200 },
  { date: "02 Mar", orders: 11, revenue: 6800 },
  { date: "03 Mar", orders: 22, revenue: 14350 },
  { date: "04 Mar", orders: 17, revenue: 10990 },
  { date: "05 Mar", orders: 25, revenue: 16800 },
  { date: "06 Mar", orders: orders.filter(o => o.created_date === "2026-02-25").length || 18,
                    revenue: orders.filter(o => o.created_date === "2026-02-25").reduce((s,o)=>s+o.total,0) || 11450 },
];

// 4. Fulfillment pipeline stages
const pipelineStages = [
  { label: "Not Printed", key: "not_printed",  icon: Clock,        color: "bg-violet-100 text-violet-700",  dot: "bg-violet-500" },
  { label: "Printed",     key: "printed",      icon: Printer,      color: "bg-indigo-100 text-indigo-700",  dot: "bg-indigo-500" },
  { label: "Packed",      key: "packed",       icon: PackageCheck, color: "bg-blue-100 text-blue-700",      dot: "bg-blue-500"   },
  { label: "Shipped",     key: "shipped",      icon: Truck,        color: "bg-sky-100 text-sky-700",        dot: "bg-sky-500"    },
  { label: "Delivered",   key: "delivered",    icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-500"},
];

// 5. KPIs
const todayOrders    = orders.filter(o => o.created_date === "2026-02-25");
const todayRevenue   = todayOrders.reduce((s, o) => s + o.total, 0);
const readyToShip    = orders.filter(o => ["not_printed","printed","packed"].includes(o.cs_status)).length;
const activeReturns  = returns.filter(r => r.status === "expected" || r.status === "received").length;
const totalOrders    = orders.length;
const deliveredCount = orders.filter(o => o.cs_status === "delivered").length;
const refundCount    = orders.filter(o => o.cs_status === "refund").length;
const lowStockItems  = lots.filter(l => l.remaining_quantity < 20);

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl p-3 text-sm">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-900">৳ {payload[0]?.value?.toLocaleString()}</p>
      <p className="text-gray-500">{payload[1]?.value} orders</p>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, gradient, trend, trendLabel,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; gradient: string;
  trend?: "up" | "down" | "neutral"; trendLabel?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${gradient}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-semibold text-gray-900 tracking-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {trendLabel && (
        <div className="flex items-center gap-1">
          {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
          {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
          <span className={`text-xs font-medium ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-600" : "text-gray-500"}`}>
            {trendLabel}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function Dashboard() {
  const stageData = useMemo(() =>
    pipelineStages.map(s => ({
      ...s,
      count: orders.filter(o => o.cs_status === s.key).length,
    })), []);

  const totalPipeline = stageData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">
            {new Date("2026-03-06").toLocaleDateString("en-BD", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">Good morning 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with your store today.</p>
        </div>
        <Link
          to="/fulfilment/operations"
          className="flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-gray-700 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          Operations
        </Link>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Today's Orders"
          value={todayOrders.length || 18}
          sub={`৳ ${(todayRevenue || 11450).toLocaleString()} revenue`}
          icon={ShoppingBag}
          gradient="bg-blue-500"
          trend="up"
          trendLabel="+12% vs yesterday"
        />
        <KpiCard
          label="Ready to Ship"
          value={readyToShip}
          sub="Across print → pack stages"
          icon={Truck}
          gradient="bg-violet-500"
          trend="neutral"
          trendLabel={`${pct(readyToShip, totalOrders)}% of all orders`}
        />
        <KpiCard
          label="Total Orders"
          value={totalOrders}
          sub={`${deliveredCount} delivered · ${refundCount} refunded`}
          icon={Package}
          gradient="bg-emerald-500"
          trend="up"
          trendLabel="All time"
        />
        <KpiCard
          label="Active Returns"
          value={activeReturns}
          sub={`${returns.length} total returns`}
          icon={RotateCcw}
          gradient="bg-rose-500"
          trend={activeReturns > 2 ? "down" : "neutral"}
          trendLabel={activeReturns > 2 ? "Needs attention" : "Within normal range"}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue Trend — 2/3 width */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Revenue Trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 7 days</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Revenue</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-violet-300 inline-block" /> Orders</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={DAILY_SALES} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="rev" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => `৳${(v/1000).toFixed(0)}k`} width={48} />
              <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={<RevenueTooltip />} />
              <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2}
                fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: "#3b82f6" }} />
              <Bar yAxisId="ord" dataKey="orders" fill="#c4b5fd" radius={[4,4,0,0]} barSize={14} opacity={0.7} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Donut — 1/3 width */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-0.5">Order Status</h2>
          <p className="text-xs text-gray-400 mb-2">All orders breakdown</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={statusDonut} dataKey="count" cx="50%" cy="50%"
                innerRadius={45} outerRadius={72} paddingAngle={2} stroke="none">
                {statusDonut.map((entry, index) => (
                  <Cell key={`cell-${entry.status}-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, _: string, p: any) => [v, p.payload.name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {statusDonut.slice(0, 6).map(s => (
              <div key={s.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-xs text-gray-600 capitalize">{s.name}</span>
                </div>
                <span className="text-xs font-medium text-gray-900">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Best Sellers + Fulfillment Pipeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Best Sellers */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Best Selling Products</h2>
              <p className="text-xs text-gray-400 mt-0.5">By units sold, all time</p>
            </div>
            <Link to="/inventory/stock" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {bestSellers.map((item, i) => {
              const skuData = skus.find(s => s.sku === item.sku);
              const barWidth = pct(item.units, maxUnits);
              const medals = ["🥇","🥈","🥉","4","5"];
              return (
                <div key={item.sku} className="flex items-center gap-3">
                  <span className="text-sm w-5 text-center flex-shrink-0 select-none">{medals[i]}</span>
                  {skuData?.image ? (
                    <img src={skuData.image} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate leading-tight">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${barWidth}%`, background: [PALETTE.blue, PALETTE.indigo, PALETTE.violet, PALETTE.sky, PALETTE.emerald][i] }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{item.units} <span className="text-gray-400 font-normal">units</span></p>
                    <p className="text-xs text-gray-400">৳ {item.revenue.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fulfillment Pipeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Fulfillment Pipeline</h2>
              <p className="text-xs text-gray-400 mt-0.5">{totalPipeline} orders in active stages</p>
            </div>
            <Link to="/fulfilment/operations" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Funnel bars */}
          <div className="space-y-2.5">
            {stageData.map((stage) => {
              const Icon = stage.icon;
              const pctWidth = totalPipeline > 0 ? pct(stage.count, stageData.reduce((m,s) => Math.max(m, s.count), 1)) : 0;
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${stage.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{stage.label}</span>
                      <span className="text-xs font-semibold text-gray-900">{stage.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${stage.dot}`}
                        style={{ width: `${Math.max(pctWidth, stage.count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lab pipeline */}
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-gray-500">In Lab (prescription orders)</span>
            </div>
            <span className="text-xs font-semibold text-gray-900">
              {orders.filter(o => o.cs_status === "send_to_lab" || o.cs_status === "in_lab").length}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-xs text-gray-500">Needs CS attention</span>
            </div>
            <span className="text-xs font-semibold text-gray-900">
              {orders.filter(o => ["new_not_called","new_called","awaiting_payment"].includes(o.cs_status)).length}
            </span>
          </div>
        </div>
      </div>

      {/* ── Recent Orders + Low Stock ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Recent Orders</h2>
              <p className="text-xs text-gray-400 mt-0.5">Latest 6 orders</p>
            </div>
            <Link to="/fulfilment/orders" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {orders.slice(0, 6).map(order => {
              const statusColor = STATUS_COLORS[order.cs_status] ?? "#94a3b8";
              return (
                <Link
                  key={order.order_id}
                  to={`/fulfilment/orders/${order.order_id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                    style={{ background: statusColor }}
                  >
                    {order.customer_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{order.customer_name}</p>
                    <p className="text-xs text-gray-400">{order.woo_order_id} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">৳ {order.total.toLocaleString()}</p>
                    <span
                      className="inline-block text-xs px-1.5 py-0.5 rounded-md font-medium capitalize"
                      style={{ background: statusColor + "22", color: statusColor === "#e2e8f0" ? "#64748b" : statusColor }}
                    >
                      {order.cs_status.replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Low Stock + Pending POs */}
        <div className="space-y-4">

          {/* Low Stock */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="font-semibold text-gray-900">Low Stock</h2>
                {lowStockItems.length > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                    {lowStockItems.length}
                  </span>
                )}
              </div>
              <Link to="/inventory/stock" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                Inventory <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {lowStockItems.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2.5">
                <CheckCircle2 className="w-4 h-4" />
                <p className="text-sm">All items have adequate stock</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map(lot => (
                  <div key={lot.lot_id} className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{lot.sku_name}</p>
                      <p className="text-xs text-gray-400">{lot.location} · {lot.sku}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <div className="w-12 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, pct(lot.remaining_quantity, 20))}%` }} />
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                        {lot.remaining_quantity} left
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending POs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Incoming Shipments</h2>
              <Link to="/purchase" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {purchaseOrders
                .filter(po => po.status === "ordered" || po.status === "partially_received")
                .map(po => (
                  <div key={po.po_id} className="flex items-center gap-3 p-2.5 bg-blue-50 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{po.po_id} <span className="text-gray-400">({po.po_name})</span></p>
                      <p className="text-xs text-gray-400">{po.supplier} · ETA {po.estimated_arrival}</p>
                    </div>
                    <Badge className={`text-xs border-0 flex-shrink-0 ${po.status === "partially_received" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                      {po.status === "partially_received" ? "Partial" : "In Transit"}
                    </Badge>
                  </div>
                ))}
              {purchaseOrders.filter(po => po.status === "ordered" || po.status === "partially_received").length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">No incoming shipments</p>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}