import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, FunnelChart, Funnel, LabelList, Cell, PieChart, Pie
} from 'recharts';
import {
  TrendingUp, TrendingDown, ShoppingCart, Package, Truck, RotateCcw,
  CheckCircle2, XCircle, AlertCircle, Download, Eye, Microscope,
  FlaskConical, FileText, DollarSign, Filter, Search, ChevronDown,
  ArrowUpRight, ArrowDownRight, Minus, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../ui/table';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const monthlySales = [
  { month: 'Oct 25', orders: 145, revenue: 178400, cogs: 98200, gross_profit: 80200, aov: 1230 },
  { month: 'Nov 25', orders: 178, revenue: 219600, cogs: 120800, gross_profit: 98800, aov: 1234 },
  { month: 'Dec 25', orders: 213, revenue: 265800, cogs: 146200, gross_profit: 119600, aov: 1248 },
  { month: 'Jan 26', orders: 156, revenue: 192300, cogs: 105800, gross_profit: 86500, aov: 1233 },
  { month: 'Feb 26', orders: 189, revenue: 234700, cogs: 129100, gross_profit: 105600, aov: 1242 },
  { month: 'Mar 26', orders: 61,  revenue: 76400,  cogs: 42000,  gross_profit: 34400,  aov: 1253 },
];

const productPerformance = [
  { sku: 'BLG-BLK-M',   name: 'Blue Light Glasses - Black M',     category: 'Blue Light', units_sold: 218, revenue: 261600, cogs: 119900, gp: 141700, gp_pct: 54.2, return_rate: 1.8, trend: 'up' },
  { sku: 'BLG-BLK-L',   name: 'Blue Light Glasses - Black L',     category: 'Blue Light', units_sold: 194, revenue: 232800, cogs: 106700, gp: 126100, gp_pct: 54.2, return_rate: 2.6, trend: 'up' },
  { sku: 'BLG-TOR-M',   name: 'Blue Light Glasses - Tortoise M',  category: 'Blue Light', units_sold: 112, revenue: 134400, cogs: 62800,  gp: 71600,  gp_pct: 53.3, return_rate: 0.9, trend: 'stable' },
  { sku: 'RDG-GLD-1.5', name: 'Reading Glasses - Gold +1.5',      category: 'Reading',    units_sold: 155, revenue: 139500, cogs: 85200,  gp: 54300,  gp_pct: 38.9, return_rate: 1.9, trend: 'stable' },
  { sku: 'RDG-GLD-2.0', name: 'Reading Glasses - Gold +2.0',      category: 'Reading',    units_sold: 98,  revenue: 88200,  cogs: 53900,  gp: 34300,  gp_pct: 38.9, return_rate: 3.1, trend: 'down' },
  { sku: 'SUN-AVT-M',   name: 'Sunglasses - Aviator M',           category: 'Sunglasses', units_sold: 63,  revenue: 113400, cogs: 88200,  gp: 25200,  gp_pct: 22.2, return_rate: 1.6, trend: 'up' },
  { sku: 'CLC-BLU',     name: 'Contact Lens Case - Blue',         category: 'Accessories',units_sold: 102, revenue: 38760,  cogs: 21420,  gp: 17340,  gp_pct: 44.7, return_rate: 0.0, trend: 'stable' },
];

const funnelData = [
  { stage: 'Orders Placed',             value: 942, fill: '#3B82F6' },
  { stage: 'Confirmed (CS verified)',   value: 817, fill: '#6366F1' },
  { stage: 'Dispatched to Courier',     value: 789, fill: '#8B5CF6' },
  { stage: 'Delivered',                 value: 698, fill: '#10B981' },
  { stage: 'Net Delivered (no return)', value: 635, fill: '#059669' },
];

const cancellationData = {
  before_dispatch: { count: 125, reasons: [
    { reason: 'Customer changed mind',    count: 58 },
    { reason: 'Duplicate order',          count: 22 },
    { reason: 'Out of stock',             count: 18 },
    { reason: 'Payment not confirmed',    count: 15 },
    { reason: 'Customer unreachable',     count: 12 },
  ]},
  after_dispatch: { count: 28, reasons: [
    { reason: 'Customer refused delivery', count: 16 },
    { reason: 'Wrong address',             count: 7 },
    { reason: 'Courier unable to deliver', count: 5 },
  ]},
};

const courierPerformance = [
  {
    courier: 'Pathao',
    color: '#E11D48',
    total_orders: 510,
    delivered: 452,
    returned: 38,
    pending: 20,
    delivery_rate: 88.6,
    return_rate: 7.5,
    avg_delivery_days: 1.8,
    cod_expected: 542400,
    cod_collected: 535800,
    collection_rate: 98.8,
    total_delivery_charges: 35700,
    total_cod_charges: 16260,
    net_disbursed: 483840,
    monthly: [
      { month: 'Oct', delivered: 68, returned: 5 },
      { month: 'Nov', delivered: 84, returned: 6 },
      { month: 'Dec', delivered: 101, returned: 9 },
      { month: 'Jan', delivered: 72, returned: 7 },
      { month: 'Feb', delivered: 89, returned: 8 },
      { month: 'Mar', delivered: 38, returned: 3 },
    ]
  },
  {
    courier: 'Steadfast',
    color: '#2563EB',
    total_orders: 279,
    delivered: 246,
    returned: 25,
    pending: 8,
    delivery_rate: 88.2,
    return_rate: 9.0,
    avg_delivery_days: 2.1,
    cod_expected: 296400,
    cod_collected: 291800,
    collection_rate: 98.4,
    total_delivery_charges: 18060,
    total_cod_charges: 8754,
    net_disbursed: 265000,
    monthly: [
      { month: 'Oct', delivered: 37, returned: 3 },
      { month: 'Nov', delivered: 46, returned: 5 },
      { month: 'Dec', delivered: 56, returned: 6 },
      { month: 'Jan', delivered: 42, returned: 4 },
      { month: 'Feb', delivered: 48, returned: 5 },
      { month: 'Mar', delivered: 17, returned: 2 },
    ]
  },
];

const reconciliationData = [
  { month: 'Oct 25', courier: 'Pathao',    invoice: 'PTH-OCT-001', expected: 81200, received: 81200, status: 'balanced', orders: 68 },
  { month: 'Oct 25', courier: 'Steadfast', invoice: 'STD-OCT-001', expected: 44100, received: 44100, status: 'balanced', orders: 37 },
  { month: 'Nov 25', courier: 'Pathao',    invoice: 'PTH-NOV-001', expected: 99800, received: 99800, status: 'balanced', orders: 84 },
  { month: 'Nov 25', courier: 'Steadfast', invoice: 'STD-NOV-001', expected: 54600, received: 54600, status: 'balanced', orders: 46 },
  { month: 'Dec 25', courier: 'Pathao',    invoice: 'PTH-DEC-001', expected: 120400, received: 120400, status: 'balanced', orders: 101 },
  { month: 'Dec 25', courier: 'Steadfast', invoice: 'STD-DEC-001', expected: 66800, received: 66800, status: 'balanced', orders: 56 },
  { month: 'Jan 26', courier: 'Pathao',    invoice: 'PTH-JAN-001', expected: 86400, received: 86400, status: 'balanced', orders: 72 },
  { month: 'Jan 26', courier: 'Steadfast', invoice: 'STD-JAN-001', expected: 50100, received: 50100, status: 'balanced', orders: 42 },
  { month: 'Feb 26', courier: 'Pathao',    invoice: 'PTH-FEB-001', expected: 125000, received: 125000, status: 'balanced', orders: 89 },
  { month: 'Feb 26', courier: 'Steadfast', invoice: 'STD-FEB-001', expected: 57200, received: 56800, status: 'discrepancy', orders: 48 },
];

const lensOrders = [
  {
    order_id: 'ORD-2026-160',
    woo_id: '#10160',
    customer: 'Layla Mohammed',
    phone: '+880 1714 456789',
    date: '2026-02-23',
    frame_sku: 'BLG-TOR-M',
    frame_name: 'Blue Light Glasses - Tortoise M',
    od_sphere: '-1.50', od_cylinder: '-0.50', od_axis: '180',
    os_sphere: '-1.75', os_cylinder: '-0.25', os_axis: '175',
    pd: '62',
    lens_type: 'Blue Light Block 1.56 AR',
    lens_price: 1800,
    fitting_charge: 300,
    total_lab_bill: 2100,
    lab_status: 'paid',
    notes: 'Customer wants extra anti-glare',
  },
  {
    order_id: 'ORD-2026-163',
    woo_id: '#10163',
    customer: 'Tariq Ahmed',
    phone: '+880 1717 789012',
    date: '2026-02-23',
    frame_sku: 'RDG-GLD-1.5',
    frame_name: 'Reading Glasses - Gold +1.5',
    od_sphere: '+1.50', od_cylinder: '0.00', od_axis: '-',
    os_sphere: '+1.75', os_cylinder: '0.00', os_axis: '-',
    pd: '64',
    lens_type: 'CR-39 Anti-Reflective 1.56',
    lens_price: 1200,
    fitting_charge: 250,
    total_lab_bill: 1450,
    lab_status: 'paid',
    notes: '',
  },
  {
    order_id: 'ORD-2026-171',
    woo_id: '#10171',
    customer: 'Shamima Begum',
    phone: '+880 1821 334455',
    date: '2026-02-25',
    frame_sku: 'BLG-BLK-M',
    frame_name: 'Blue Light Glasses - Black M',
    od_sphere: '-2.00', od_cylinder: '-0.75', od_axis: '90',
    os_sphere: '-2.25', os_cylinder: '-0.50', os_axis: '85',
    pd: '60',
    lens_type: 'Blue Light Block 1.61 AR',
    lens_price: 2200,
    fitting_charge: 300,
    total_lab_bill: 2500,
    lab_status: 'unpaid',
    notes: 'Thin lens requested (1.61)',
  },
  {
    order_id: 'ORD-2026-172',
    woo_id: '#10172',
    customer: 'Rafiqul Islam',
    phone: '+880 1911 556677',
    date: '2026-02-26',
    frame_sku: 'RDG-GLD-2.0',
    frame_name: 'Reading Glasses - Gold +2.0',
    od_sphere: '+2.00', od_cylinder: '-0.25', od_axis: '15',
    os_sphere: '+2.25', os_cylinder: '0.00', os_axis: '-',
    pd: '65',
    lens_type: 'Photochromic 1.56 (Transition)',
    lens_price: 2800,
    fitting_charge: 350,
    total_lab_bill: 3150,
    lab_status: 'unpaid',
    notes: 'Photochromic - transitions in sunlight',
  },
  {
    order_id: 'ORD-2026-175',
    woo_id: '#10175',
    customer: 'Nasrin Akter',
    phone: '+880 1613 778899',
    date: '2026-02-27',
    frame_sku: 'BLG-BLK-L',
    frame_name: 'Blue Light Glasses - Black L',
    od_sphere: '-0.75', od_cylinder: '0.00', od_axis: '-',
    os_sphere: '-1.00', os_cylinder: '-0.25', os_axis: '170',
    pd: '63',
    lens_type: 'CR-39 Anti-Reflective 1.56',
    lens_price: 1200,
    fitting_charge: 250,
    total_lab_bill: 1450,
    lab_status: 'paid',
    notes: '',
  },
  {
    order_id: 'ORD-2026-178',
    woo_id: '#10178',
    customer: 'Abdullah Al Mamun',
    phone: '+880 1744 990011',
    date: '2026-02-28',
    frame_sku: 'BLG-TOR-M',
    frame_name: 'Blue Light Glasses - Tortoise M',
    od_sphere: '-3.00', od_cylinder: '-1.00', od_axis: '180',
    os_sphere: '-3.25', os_cylinder: '-0.75', os_axis: '175',
    pd: '66',
    lens_type: 'Blue Light Block 1.67 AR (High Index)',
    lens_price: 3500,
    fitting_charge: 400,
    total_lab_bill: 3900,
    lab_status: 'unpaid',
    notes: 'High power - use 1.67 index for thinner lens',
  },
  {
    order_id: 'ORD-2026-181',
    woo_id: '#10181',
    customer: 'Morium Sultana',
    phone: '+880 1511 223344',
    date: '2026-03-01',
    frame_sku: 'BLG-BLK-M',
    frame_name: 'Blue Light Glasses - Black M',
    od_sphere: '+0.75', od_cylinder: '0.00', od_axis: '-',
    os_sphere: '+1.00', os_cylinder: '-0.25', os_axis: '10',
    pd: '61',
    lens_type: 'Blue Light Block 1.56 AR',
    lens_price: 1800,
    fitting_charge: 300,
    total_lab_bill: 2100,
    lab_status: 'unpaid',
    notes: '',
  },
  {
    order_id: 'ORD-2026-184',
    woo_id: '#10184',
    customer: 'Jibon Miah',
    phone: '+880 1677 445566',
    date: '2026-03-02',
    frame_sku: 'RDG-GLD-1.5',
    frame_name: 'Reading Glasses - Gold +1.5',
    od_sphere: '+1.25', od_cylinder: '0.00', od_axis: '-',
    os_sphere: '+1.50', os_cylinder: '0.00', os_axis: '-',
    pd: '62',
    lens_type: 'CR-39 Anti-Reflective 1.56',
    lens_price: 1200,
    fitting_charge: 250,
    total_lab_bill: 1450,
    lab_status: 'paid',
    notes: '',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => '৳' + n.toLocaleString();
const pct = (n: number) => n.toFixed(1) + '%';

function KPICard({ title, value, sub, icon: Icon, color, trend, trendValue }: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; color: string;
  trend?: 'up' | 'down' | 'neutral'; trendValue?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> :
             trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> :
             <Minus className="w-3 h-3" />}
            {trendValue} vs last month
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tab: Sales Overview ──────────────────────────────────────────────────────

function SalesOverview() {
  const totalRevenue = monthlySales.reduce((s, m) => s + m.revenue, 0);
  const totalOrders  = monthlySales.reduce((s, m) => s + m.orders, 0);
  const totalGP      = monthlySales.reduce((s, m) => s + m.gross_profit, 0);
  const avgAOV       = Math.round(totalRevenue / totalOrders);
  const gpMargin     = ((totalGP / totalRevenue) * 100).toFixed(1);

  const cur  = monthlySales[monthlySales.length - 2]; // Feb
  const prev = monthlySales[monthlySales.length - 3]; // Jan
  const revGrowth = (((cur.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1);
  const ordGrowth = (((cur.orders  - prev.orders)  / prev.orders)  * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Revenue (6mo)" value={fmt(totalRevenue)} sub="Oct 2025 – Mar 2026"
          icon={TrendingUp} color="text-green-600" trend="up" trendValue={`+${revGrowth}%`} />
        <KPICard title="Total Orders" value={totalOrders.toLocaleString()} sub={`Avg ${avgAOV.toLocaleString()} AOV`}
          icon={ShoppingCart} color="text-blue-600" trend="up" trendValue={`+${ordGrowth}%`} />
        <KPICard title="Gross Profit" value={fmt(totalGP)} sub={`${gpMargin}% margin`}
          icon={DollarSign} color="text-purple-600" trend="up" trendValue="+2.1%" />
        <KPICard title="Avg Order Value" value={fmt(avgAOV)} sub="Per delivered order"
          icon={Package} color="text-orange-600" trend="stable" trendValue="Stable" />
      </div>

      {/* Revenue & Orders chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Revenue vs Gross Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlySales} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[4,4,0,0]} />
                <Bar dataKey="gross_profit" name="Gross Profit" fill="#10B981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#6366F1" strokeWidth={2}
                  dot={{ fill: '#6366F1', r: 4 }} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly breakdown table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="pl-4">Month</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">COGS</TableHead>
                <TableHead className="text-right">Gross Profit</TableHead>
                <TableHead className="text-right">GP Margin</TableHead>
                <TableHead className="text-right">AOV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlySales.map((m, i) => {
                const margin = ((m.gross_profit / m.revenue) * 100).toFixed(1);
                return (
                  <TableRow key={m.month} className={i === monthlySales.length - 1 ? 'bg-blue-50/40' : ''}>
                    <TableCell className="pl-4 font-medium">{m.month}
                      {i === monthlySales.length - 1 && <span className="ml-2 text-xs text-blue-500">(partial)</span>}
                    </TableCell>
                    <TableCell className="text-right">{m.orders}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(m.revenue)}</TableCell>
                    <TableCell className="text-right text-orange-600">{fmt(m.cogs)}</TableCell>
                    <TableCell className="text-right text-green-700 font-medium">{fmt(m.gross_profit)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-medium ${parseFloat(margin) >= 45 ? 'text-green-600' : 'text-orange-600'}`}>
                        {margin}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{fmt(m.aov)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Order Funnel ────────────────────────────────────────────────────────

function OrderFunnel() {
  const placed     = funnelData[0].value;
  const confirmed  = funnelData[1].value;
  const dispatched = funnelData[2].value;
  const delivered  = funnelData[3].value;
  const net        = funnelData[4].value;

  const cancelBefore  = placed - confirmed;
  const cancelAfter   = dispatched - delivered - 0; // some pending
  const returned      = delivered - net;
  const deliveryRate  = ((delivered / placed) * 100).toFixed(1);
  const returnRate    = ((returned / delivered) * 100).toFixed(1);
  const cancelRate    = (((cancelBefore + cancelAfter) / placed) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Orders Placed" value={placed.toLocaleString()} sub="Total incoming" icon={ShoppingCart} color="text-blue-600" />
        <KPICard title="Delivery Rate" value={deliveryRate + '%'} sub={`${delivered} delivered`} icon={CheckCircle2} color="text-green-600" />
        <KPICard title="Cancellation Rate" value={cancelRate + '%'} sub={`${cancelBefore + cancelAfter} total cancelled`} icon={XCircle} color="text-red-600" />
        <KPICard title="Return Rate" value={returnRate + '%'} sub={`${returned} returned`} icon={RotateCcw} color="text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel Visual */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Order Journey Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 py-2">
              {[
                { label: 'Orders Placed',            value: placed,     color: 'bg-blue-500',   pct: 100 },
                { label: 'Confirmed by CS',          value: confirmed,  color: 'bg-indigo-500', pct: (confirmed/placed*100) },
                { label: 'Dispatched to Courier',    value: dispatched, color: 'bg-purple-500', pct: (dispatched/placed*100) },
                { label: 'Delivered',                value: delivered,  color: 'bg-emerald-500',pct: (delivered/placed*100) },
                { label: 'Net Delivered (no return)',value: net,        color: 'bg-green-600',  pct: (net/placed*100) },
              ].map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{s.label}</span>
                    <span className="font-bold">{s.value.toLocaleString()} <span className="text-gray-400 font-normal">({s.pct.toFixed(1)}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-7 relative overflow-hidden">
                    <div
                      className={`${s.color} h-7 rounded-full transition-all flex items-center justify-end pr-3`}
                      style={{ width: `${s.pct}%` }}
                    >
                      <span className="text-white text-xs font-medium">{s.pct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Drop-off analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Drop-off Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Cancelled before dispatch */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="text-sm font-medium">Cancelled Before Dispatch</span>
                </div>
                <Badge variant="destructive">{cancelBefore} orders</Badge>
              </div>
              <div className="space-y-1.5 pl-5">
                {cancellationData.before_dispatch.reasons.map((r, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-600">{r.reason}</span>
                    <span className="font-medium">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t" />

            {/* Cancelled after dispatch */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-400" />
                  <span className="text-sm font-medium">Cancelled After Dispatch</span>
                </div>
                <Badge className="bg-orange-100 text-orange-700">{cancelAfter} orders</Badge>
              </div>
              <div className="space-y-1.5 pl-5">
                {cancellationData.after_dispatch.reasons.map((r, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-600">{r.reason}</span>
                    <span className="font-medium">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t" />

            {/* Returns */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="text-sm font-medium">Returned After Delivery</span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-700">{returned} orders</Badge>
              </div>
              <div className="space-y-1.5 pl-5">
                <div className="flex justify-between text-xs"><span className="text-gray-600">Wrong item / size issue</span><span className="font-medium">28</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-600">Product defective</span><span className="font-medium">19</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-600">Customer dissatisfied</span><span className="font-medium">16</span></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: Product Performance ─────────────────────────────────────────────────

function ProductPerformance() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'revenue' | 'units' | 'gp_pct'>('revenue');

  const categories = [...new Set(productPerformance.map(p => p.category))];
  const [cat, setCat] = useState('all');

  const filtered = productPerformance
    .filter(p => (cat === 'all' || p.category === cat) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => b[sort] - a[sort]);

  const totalRev   = productPerformance.reduce((s, p) => s + p.revenue, 0);
  const totalUnits = productPerformance.reduce((s, p) => s + p.units_sold, 0);
  const totalGP    = productPerformance.reduce((s, p) => s + p.gp, 0);

  // Category pie data
  const catData = categories.map(c => ({
    name: c,
    value: productPerformance.filter(p => p.category === c).reduce((s, p) => s + p.revenue, 0),
  }));
  const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <KPICard title="Total Revenue" value={fmt(totalRev)} sub="All products" icon={TrendingUp} color="text-green-600" />
        <KPICard title="Units Sold" value={totalUnits.toLocaleString()} sub="All SKUs" icon={Package} color="text-blue-600" />
        <KPICard title="Total Gross Profit" value={fmt(totalGP)} sub={`${((totalGP/totalRev)*100).toFixed(1)}% blended margin`} icon={DollarSign} color="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue by category pie */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                  labelLine={false} fontSize={10}>
                  {catData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Product bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Product Name</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={productPerformance.sort((a,b) => b.revenue - a.revenue)} layout="vertical" margin={{ left: 180 }}>
                <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={175} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[0,4,4,0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search SKU..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-48 h-8 text-sm" />
        </div>
        <div className="flex gap-1">
          {['all', ...categories].map(c => (
            <Button key={c} variant={cat === c ? 'default' : 'outline'} size="sm" className="h-8 text-xs"
              onClick={() => setCat(c)}>{c === 'all' ? 'All' : c}</Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs text-gray-500">
          Sort:
          {([['revenue','Revenue'],['units','Units'],['gp_pct','GP%']] as [typeof sort, string][]).map(([k,l]) => (
            <Button key={k} variant={sort === k ? 'default' : 'ghost'} size="sm" className="h-7 text-xs px-2"
              onClick={() => setSort(k)}>{l}</Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="pl-4">SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">COGS</TableHead>
                <TableHead className="text-right">Gross Profit</TableHead>
                <TableHead className="text-right">GP %</TableHead>
                <TableHead className="text-right">Return Rate</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.sku}>
                  <TableCell className="pl-4">
                    <div>
                      <p className="font-medium text-sm">{p.sku}</p>
                      <p className="text-xs text-gray-500">{p.name}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{p.units_sold}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(p.revenue)}</TableCell>
                  <TableCell className="text-right text-orange-600">{fmt(p.cogs)}</TableCell>
                  <TableCell className="text-right text-green-700 font-medium">{fmt(p.gp)}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-medium ${p.gp_pct >= 45 ? 'text-green-600' : p.gp_pct >= 35 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {p.gp_pct}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`text-sm ${p.return_rate === 0 ? 'text-green-600' : p.return_rate < 3 ? 'text-gray-700' : 'text-red-600'}`}>
                      {p.return_rate}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {p.trend === 'up' && <Badge className="bg-green-100 text-green-700 text-xs"><ArrowUpRight className="w-3 h-3 mr-0.5" />Up</Badge>}
                    {p.trend === 'down' && <Badge className="bg-red-100 text-red-700 text-xs"><ArrowDownRight className="w-3 h-3 mr-0.5" />Down</Badge>}
                    {p.trend === 'stable' && <Badge variant="secondary" className="text-xs"><Minus className="w-3 h-3 mr-0.5" />Stable</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Courier Performance ─────────────────────────────────────────────────

function CourierPerformance() {
  const combined = courierPerformance.map(c => ({
    ...c,
    pending_pct: ((c.pending / c.total_orders) * 100).toFixed(1),
  }));

  const monthlyCombo = courierPerformance[0].monthly.map((m, i) => ({
    month: m.month,
    pathao_delivered: courierPerformance[0].monthly[i].delivered,
    pathao_returned: courierPerformance[0].monthly[i].returned,
    steadfast_delivered: courierPerformance[1].monthly[i].delivered,
    steadfast_returned: courierPerformance[1].monthly[i].returned,
  }));

  return (
    <div className="space-y-6">
      {/* Courier comparison cards */}
      {combined.map(c => (
        <Card key={c.courier} className="border-l-4" style={{ borderLeftColor: c.color }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" style={{ color: c.color }} />
                {c.courier}
              </CardTitle>
              <Badge variant="outline" style={{ color: c.color, borderColor: c.color }}>
                {c.total_orders} total orders
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-500">Delivered</p>
                <p className="text-2xl font-bold text-green-700">{c.delivered}</p>
                <p className="text-xs text-green-600">{c.delivery_rate}% rate</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-gray-500">Returned</p>
                <p className="text-2xl font-bold text-red-600">{c.returned}</p>
                <p className="text-xs text-red-600">{c.return_rate}% rate</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{c.pending}</p>
                <p className="text-xs text-gray-500">In transit</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-500">Avg Delivery</p>
                <p className="text-2xl font-bold text-blue-700">{c.avg_delivery_days}</p>
                <p className="text-xs text-gray-500">days</p>
              </div>
            </div>

            {/* COD financials */}
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">COD Expected</p>
                <p className="font-bold">{fmt(c.cod_expected)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">COD Collected</p>
                <p className="font-bold text-green-700">{fmt(c.cod_collected)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Collection Rate</p>
                <p className="font-bold text-blue-600">{c.collection_rate}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Net Disbursed</p>
                <p className="font-bold text-purple-700">{fmt(c.net_disbursed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Monthly delivery comparison chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly Deliveries — Pathao vs Steadfast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyCombo} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="pathao_delivered"  name="Pathao Delivered"  fill="#E11D48" radius={[4,4,0,0]} />
              <Bar dataKey="steadfast_delivered" name="Steadfast Delivered" fill="#2563EB" radius={[4,4,0,0]} />
              <Bar dataKey="pathao_returned"   name="Pathao Returned"   fill="#FB7185" radius={[4,4,0,0]} />
              <Bar dataKey="steadfast_returned"  name="Steadfast Returned"  fill="#93C5FD" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Revenue Reconciliation ─────────────────────────────────────────────

function RevenueReconciliation() {
  const totalExpected = reconciliationData.reduce((s, r) => s + r.expected, 0);
  const totalReceived = reconciliationData.reduce((s, r) => s + r.received, 0);
  const discrepancies = reconciliationData.filter(r => r.status === 'discrepancy');
  const totalDiff     = reconciliationData.reduce((s, r) => s + Math.abs(r.received - r.expected), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Expected" value={fmt(totalExpected)} sub="From courier invoices" icon={FileText} color="text-blue-600" />
        <KPICard title="Total Received" value={fmt(totalReceived)} sub="Bank deposits confirmed" icon={CheckCircle2} color="text-green-600" />
        <KPICard title="Discrepancies" value={discrepancies.length.toString()} sub={`${fmt(totalDiff)} total gap`} icon={AlertCircle} color="text-red-600" />
        <KPICard title="Reconciled Invoices" value={`${reconciliationData.length - discrepancies.length}/${reconciliationData.length}`} sub="Fully matched" icon={TrendingUp} color="text-purple-600" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Invoice Reconciliation Log</CardTitle>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="pl-4">Month</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Expected (Invoice)</TableHead>
                <TableHead className="text-right">Received (Bank)</TableHead>
                <TableHead className="text-right">Difference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reconciliationData.map((r, i) => {
                const diff = r.received - r.expected;
                return (
                  <TableRow key={i} className={r.status === 'discrepancy' ? 'bg-red-50' : ''}>
                    <TableCell className="pl-4 font-medium">{r.month}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${r.courier === 'Pathao' ? 'text-rose-600' : 'text-blue-600'}`}>
                        {r.courier}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{r.invoice}</TableCell>
                    <TableCell className="text-right">{r.orders}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(r.expected)}</TableCell>
                    <TableCell className="text-right font-medium text-green-700">{fmt(r.received)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${diff === 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {diff === 0 ? '৳0' : `${diff > 0 ? '+' : ''}${fmt(Math.abs(diff))}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.status === 'balanced' ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />Balanced
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="w-3 h-3 mr-1" />Discrepancy
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Summary footer */}
          <div className="border-t bg-gray-50 px-4 py-3 grid grid-cols-4 gap-4 text-sm">
            <div />
            <div />
            <div className="text-right col-span-1">
              <p className="text-xs text-gray-500">Total Expected</p>
              <p className="font-bold">{fmt(totalExpected)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Received</p>
              <p className={`font-bold ${totalReceived === totalExpected ? 'text-green-700' : 'text-red-600'}`}>{fmt(totalReceived)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {discrepancies.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Discrepancy Investigation Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {discrepancies.map((r, i) => (
              <div key={i} className="flex justify-between items-center text-sm bg-white rounded p-3 border border-red-100">
                <div>
                  <span className="font-medium">{r.invoice}</span>
                  <span className="text-gray-500 ml-2">({r.courier}, {r.month})</span>
                </div>
                <div className="text-right">
                  <span className="text-red-600 font-bold">-{fmt(r.expected - r.received)}</span>
                  <p className="text-xs text-gray-500">Short payment</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Additional Lenses ───────────────────────────────────────────────────

function AdditionalLenses() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [selectedOrder, setSelectedOrder] = useState<typeof lensOrders[0] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [orders, setOrders] = useState(lensOrders);

  const filtered = orders.filter(o => {
    const s = search.toLowerCase();
    return (statusFilter === 'all' || o.lab_status === statusFilter) &&
      (o.customer.toLowerCase().includes(s) || o.woo_id.includes(s) || o.order_id.toLowerCase().includes(s));
  });

  const totalBill    = orders.reduce((s, o) => s + o.total_lab_bill, 0);
  const paidBill     = orders.filter(o => o.lab_status === 'paid').reduce((s, o) => s + o.total_lab_bill, 0);
  const unpaidBill   = orders.filter(o => o.lab_status === 'unpaid').reduce((s, o) => s + o.total_lab_bill, 0);
  const unpaidCount  = orders.filter(o => o.lab_status === 'unpaid').length;

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.filter(o => o.lab_status === 'unpaid').length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.filter(o => o.lab_status === 'unpaid').map(o => o.order_id));
    }
  };

  const toggleSelect = (orderId: string) => {
    setSelectedIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const markAsPaid = () => {
    setOrders(prev => prev.map(o =>
      selectedIds.includes(o.order_id) ? { ...o, lab_status: 'paid' as const } : o
    ));
    setSelectedIds([]);
  };

  const selectedTotal = orders.filter(o => selectedIds.includes(o.order_id)).reduce((s, o) => s + o.total_lab_bill, 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Lab Orders" value={orders.length.toString()} sub="With prescription lenses" icon={FlaskConical} color="text-indigo-600" />
        <KPICard title="Total Lab Bill" value={fmt(totalBill)} sub="All orders" icon={DollarSign} color="text-blue-600" />
        <KPICard title="Paid to Lab" value={fmt(paidBill)} sub={`${orders.filter(o=>o.lab_status==='paid').length} orders settled`} icon={CheckCircle2} color="text-green-600" />
        <KPICard title="Outstanding" value={fmt(unpaidBill)} sub={`${unpaidCount} orders pending payment`} icon={AlertCircle} color="text-red-600" />
      </div>

      {/* Outstanding bill callout */}
      {unpaidBill > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-800">Lab Payment Due: {fmt(unpaidBill)}</p>
            <p className="text-sm text-amber-700 mt-0.5">
              {unpaidCount} orders have unpaid lab bills. Use the table below to verify each prescription and settle the outstanding amount with the lab.
            </p>
          </div>
          <Button size="sm" className="ml-auto shrink-0 bg-amber-600 hover:bg-amber-700">
            <Download className="w-4 h-4 mr-2" />Export Lab Bill
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search customer / order..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-56 h-8 text-sm" />
        </div>
        <div className="flex gap-1">
          {(['all', 'unpaid', 'paid'] as const).map(s => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" className="h-8 text-xs capitalize"
              onClick={() => setStatusFilter(s)}>{s}</Button>
          ))}
        </div>
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} orders shown</span>
        
        {/* Mark as Paid button */}
        {selectedIds.length > 0 && (
          <Button 
            onClick={markAsPaid}
            className="bg-green-600 hover:bg-green-700 h-8 text-xs gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark {selectedIds.length} as Paid ({fmt(selectedTotal)})
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-12 pl-4">
                    <Checkbox
                      checked={selectedIds.length > 0 && selectedIds.length === filtered.filter(o => o.lab_status === 'unpaid').length}
                      onCheckedChange={toggleSelectAll}
                      disabled={filtered.filter(o => o.lab_status === 'unpaid').length === 0}
                    />
                  </TableHead>
                  <TableHead className="pl-2">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Frame</TableHead>
                  <TableHead>OD (Right Eye)</TableHead>
                  <TableHead>OS (Left Eye)</TableHead>
                  <TableHead>PD</TableHead>
                  <TableHead>Lens Type</TableHead>
                  <TableHead className="text-right">Lens Price</TableHead>
                  <TableHead className="text-right">Fitting</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(o => (
                  <TableRow key={o.order_id} className={o.lab_status === 'unpaid' ? 'bg-amber-50/40' : ''}>
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selectedIds.includes(o.order_id)}
                        onCheckedChange={() => toggleSelect(o.order_id)}
                        disabled={o.lab_status === 'paid'}
                      />
                    </TableCell>
                    <TableCell className="pl-2">
                      <p className="font-medium text-blue-600 text-sm">{o.woo_id}</p>
                      <p className="text-xs text-gray-400">{o.order_id}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{o.customer}</p>
                      <p className="text-xs text-gray-500">{o.phone}</p>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(o.date).toLocaleDateString('en-GB')}</TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{o.frame_sku}</p>
                      <p className="text-xs text-gray-500 max-w-[120px] truncate">{o.frame_name}</p>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs space-y-0.5">
                        <p>Sph: <span className="font-medium">{o.od_sphere}</span></p>
                        <p>Cyl: <span className="font-medium">{o.od_cylinder}</span></p>
                        <p>Ax: <span className="font-medium">{o.od_axis}</span></p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs space-y-0.5">
                        <p>Sph: <span className="font-medium">{o.os_sphere}</span></p>
                        <p>Cyl: <span className="font-medium">{o.os_cylinder}</span></p>
                        <p>Ax: <span className="font-medium">{o.os_axis}</span></p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">{o.pd}</TableCell>
                    <TableCell>
                      <p className="text-xs font-medium max-w-[140px]">{o.lens_type}</p>
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmt(o.lens_price)}</TableCell>
                    <TableCell className="text-right text-gray-600">{fmt(o.fitting_charge)}</TableCell>
                    <TableCell className="text-right font-bold">{fmt(o.total_lab_bill)}</TableCell>
                    <TableCell>
                      {o.lab_status === 'paid' ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />Paid
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />Unpaid
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(o)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8 text-gray-500">No lens orders found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer totals */}
          {filtered.length > 0 && (
            <div className="border-t bg-gray-50 px-4 py-3 flex justify-end gap-8 text-sm">
              <div className="text-right">
                <p className="text-xs text-gray-500">Lens Prices</p>
                <p className="font-bold">{fmt(filtered.reduce((s,o) => s+o.lens_price, 0))}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Fitting Charges</p>
                <p className="font-bold">{fmt(filtered.reduce((s,o) => s+o.fitting_charge, 0))}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Total Lab Bill</p>
                <p className="font-bold text-blue-700">{fmt(filtered.reduce((s,o) => s+o.total_lab_bill, 0))}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail modal/panel */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedOrder.woo_id} — Lens Prescription</h2>
                <p className="text-sm text-gray-500">{selectedOrder.customer} · {new Date(selectedOrder.date).toLocaleDateString('en-GB')}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>✕</Button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Prescription</p>
              <div className="grid grid-cols-4 gap-2 text-sm text-center">
                <div className="text-gray-400 text-xs" />
                <div className="font-medium text-xs text-gray-600">Sphere</div>
                <div className="font-medium text-xs text-gray-600">Cylinder</div>
                <div className="font-medium text-xs text-gray-600">Axis</div>
                <div className="text-xs font-medium text-gray-700 text-left">OD (R)</div>
                <div className="font-mono font-medium">{selectedOrder.od_sphere}</div>
                <div className="font-mono font-medium">{selectedOrder.od_cylinder}</div>
                <div className="font-mono font-medium">{selectedOrder.od_axis}</div>
                <div className="text-xs font-medium text-gray-700 text-left">OS (L)</div>
                <div className="font-mono font-medium">{selectedOrder.os_sphere}</div>
                <div className="font-mono font-medium">{selectedOrder.os_cylinder}</div>
                <div className="font-mono font-medium">{selectedOrder.os_axis}</div>
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                <span className="text-gray-600">PD (Pupillary Distance)</span>
                <span className="font-mono font-bold">{selectedOrder.pd} mm</span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Frame</span><span className="font-medium">{selectedOrder.frame_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Lens Type</span><span className="font-medium">{selectedOrder.lens_type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Lens Price</span><span className="font-medium">{fmt(selectedOrder.lens_price)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Lab Fitting</span><span className="font-medium">{fmt(selectedOrder.fitting_charge)}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="font-semibold">Total Lab Bill</span><span className="font-bold text-blue-700">{fmt(selectedOrder.total_lab_bill)}</span></div>
            </div>

            {selectedOrder.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                <span className="font-medium">Note: </span>{selectedOrder.notes}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {selectedOrder.lab_status === 'paid' ? (
                <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Paid to Lab</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700"><AlertCircle className="w-3 h-3 mr-1" />Payment Pending</Badge>
              )}
              <Button size="sm" variant="outline" className="gap-2">
                <Download className="w-4 h-4" />Print Prescription
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SalesReports() {
  const [dateRange, setDateRange] = useState<string>("this_month");

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "this_week":
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
        break;
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "this_quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case "last_quarter":
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        if (lastQuarter < 0) {
          startDate = new Date(now.getFullYear() - 1, 9, 1);
          endDate = new Date(now.getFullYear() - 1, 11, 31);
        } else {
          startDate = new Date(now.getFullYear(), lastQuarter * 3, 1);
          endDate = new Date(now.getFullYear(), lastQuarter * 3 + 3, 0);
        }
        break;
      case "this_month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  const { start: startDate, end: endDate } = getDateRange();

  return (
    <div className="space-y-4">
      {/* Date Range Selector */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-56 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="this_quarter">This Quarter</SelectItem>
                <SelectItem value="last_quarter">Last Quarter</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">
              {startDate === endDate 
                ? new Date(startDate).toLocaleDateString('en-GB')
                : `${new Date(startDate).toLocaleDateString('en-GB')} - ${new Date(endDate).toLocaleDateString('en-GB')}`
              }
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview"   className="text-xs sm:text-sm">Sales Overview</TabsTrigger>
            <TabsTrigger value="funnel"     className="text-xs sm:text-sm">Order Funnel</TabsTrigger>
            <TabsTrigger value="products"   className="text-xs sm:text-sm">Product Performance</TabsTrigger>
            <TabsTrigger value="couriers"   className="text-xs sm:text-sm">Courier Performance</TabsTrigger>
            <TabsTrigger value="reconcile"  className="text-xs sm:text-sm">Revenue Reconciliation</TabsTrigger>
            <TabsTrigger value="lenses"     className="text-xs sm:text-sm flex items-center gap-1">
              <FlaskConical className="w-3 h-3" />Additional Lenses
            </TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <Download className="w-4 h-4" />Export
          </Button>
        </div>

        <TabsContent value="overview">  <SalesOverview />          </TabsContent>
        <TabsContent value="funnel">    <OrderFunnel />            </TabsContent>
        <TabsContent value="products">  <ProductPerformance />     </TabsContent>
        <TabsContent value="couriers">  <CourierPerformance />     </TabsContent>
        <TabsContent value="reconcile"> <RevenueReconciliation />  </TabsContent>
        <TabsContent value="lenses">    <AdditionalLenses />       </TabsContent>
      </Tabs>
    </div>
  );
}
