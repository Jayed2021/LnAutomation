import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRefresh } from '../contexts/RefreshContext';
import {
  TrendingUp, Clock, Truck, Package, ShoppingCart,
  BarChart2, CheckCircle, XCircle, AlertCircle, Info, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { formatBDT, CS_STATUS_COLORS, CS_STATUS_LABELS } from '../lib/utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface TopSellingProduct {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  sold_qty: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  cs_status: string;
  order_date: string;
}

interface IncomingShipment {
  id: string;
  po_number: string;
  shipment_name: string | null;
  supplier_name: string;
  expected_delivery_date: string | null;
  status: string;
}

interface OverallStats {
  totalOrders: number;
  totalDelivered: number;
  cancelledBeforeDispatch: number;
  cancelledAfterDispatch: number;
  totalSalesRevenue: number;
}

interface InventoryStats {
  landedCostValue: number;
  retailValue: number;
  totalUnits: number;
}

const DATE_RANGE_DAYS = 30;

export const Dashboard: React.FC = () => {
  const { user, canSeeCosts } = useAuth();
  const { lastRefreshed, setRefreshing } = useRefresh();

  const [salesRevenue, setSalesRevenue] = useState(0);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats>({ landedCostValue: 0, retailValue: 0, totalUnits: 0 });
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [incomingShipments, setIncomingShipments] = useState<IncomingShipment[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<TopSellingProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalOrders: 0, totalDelivered: 0, cancelledBeforeDispatch: 0, cancelledAfterDispatch: 0, totalSalesRevenue: 0
  });
  const [statsDateFrom, setStatsDateFrom] = useState('');
  const [statsDateTo, setStatsDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - DATE_RANGE_DAYS);
    setStatsDateFrom(from.toLocaleDateString('en-GB'));
    setStatsDateTo(to.toLocaleDateString('en-GB'));
    loadDashboardData(from, to);
  }, [lastRefreshed]);

  const fetchAllRows = async <T,>(query: any, batchSize = 1000): Promise<T[]> => {
    const results: T[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await query.range(from, from + batchSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      results.push(...data);
      if (data.length < batchSize) break;
      from += batchSize;
    }
    return results;
  };

  const loadDashboardData = async (from: Date, to: Date) => {
    try {
      const fromISO = from.toISOString();
      const toISO = to.toISOString();

      const [
        revenueRes,
        lotsData,
        pendingRes,
        shipmentsRes,
        topProductsRes,
        recentOrdersRes,
        overallRes
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('total_amount')
          .not('cs_status', 'in', '("cancelled_cad","cancelled_cbd")'),

        fetchAllRows(supabase.from('inventory_lots').select(
          'remaining_quantity, landed_cost_per_unit, product:products(selling_price)'
        )),

        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('cs_status', 'new_not_called'),

        supabase
          .from('purchase_orders')
          .select('id, po_number, shipment_name, expected_delivery_date, status, supplier:suppliers(name)')
          .in('status', ['ordered', 'partially_received'])
          .order('expected_delivery_date', { ascending: true })
          .limit(5),

        supabase.rpc
          ? supabase
              .from('order_items')
              .select('product_id, quantity, product:products(id, name, sku, category), order:orders!inner(cs_status)')
              .not('order.cs_status', 'in', '("cancelled_cad","cancelled_cbd")')
          : null,

        supabase
          .from('orders')
          .select('id, order_number, total_amount, payment_method, cs_status, order_date, customer:customers(full_name)')
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('orders')
          .select('id, total_amount, cs_status, cancellation_type')
          .gte('created_at', fromISO)
          .lte('created_at', toISO)
      ]);

      const revenue = (revenueRes.data || []).reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
      setSalesRevenue(revenue);

      const landedCostValue = (lotsData as any[]).reduce((sum, lot) => sum + (lot.remaining_quantity * (lot.landed_cost_per_unit || 0)), 0);
      const retailValue = (lotsData as any[]).reduce((sum, lot) => sum + (lot.remaining_quantity * (lot.product?.selling_price || 0)), 0);
      const totalUnits = (lotsData as any[]).reduce((sum, lot) => sum + (lot.remaining_quantity || 0), 0);
      setInventoryStats({ landedCostValue, retailValue, totalUnits });

      setPendingOrdersCount(pendingRes.count || 0);

      setIncomingShipments(
        (shipmentsRes.data || []).map((po: any) => ({
          id: po.id,
          po_number: po.po_number,
          shipment_name: po.shipment_name,
          supplier_name: po.supplier?.name || 'Unknown',
          expected_delivery_date: po.expected_delivery_date,
          status: po.status
        }))
      );

      if (topProductsRes) {
        const itemsRaw: any[] = topProductsRes.data || [];
        const productMap: Record<string, { id: string; name: string; sku: string; category: string | null; sold_qty: number }> = {};
        for (const item of itemsRaw) {
          if (!item.product) continue;
          const pid = item.product.id;
          if (!productMap[pid]) {
            productMap[pid] = { id: pid, name: item.product.name, sku: item.product.sku, category: item.product.category, sold_qty: 0 };
          }
          productMap[pid].sold_qty += item.quantity || 0;
        }
        const sorted = Object.values(productMap).sort((a, b) => b.sold_qty - a.sold_qty).slice(0, 8);
        setTopSellingProducts(sorted);
      }

      setRecentOrders(
        (recentOrdersRes.data || []).map((order: any) => ({
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer?.full_name || 'Unknown',
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          cs_status: order.cs_status,
          order_date: order.order_date
        }))
      );

      const allOrders: any[] = overallRes.data || [];
      const totalOrders = allOrders.length;
      const totalDelivered = allOrders.filter(o => o.cs_status === 'delivered').length;
      const cancelledBeforeDispatch = allOrders.filter(o => o.cancellation_type === 'cbd').length;
      const cancelledAfterDispatch = allOrders.filter(o => o.cancellation_type === 'cad').length;
      const totalSalesRevenue = allOrders
        .filter(o => !['cancelled_cad', 'cancelled_cbd'].includes(o.cs_status))
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);

      setOverallStats({ totalOrders, totalDelivered, cancelledBeforeDispatch, cancelledAfterDispatch, totalSalesRevenue });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const label = CS_STATUS_LABELS[status] || status;
    const color = CS_STATUS_COLORS[status];
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: color }}>
        {label}
      </span>
    );
  };

  const deliveredPct = overallStats.totalOrders > 0 ? (overallStats.totalDelivered / overallStats.totalOrders) * 100 : 0;
  const cbdPct = overallStats.totalOrders > 0 ? (overallStats.cancelledBeforeDispatch / overallStats.totalOrders) * 100 : 0;
  const cadPct = overallStats.totalOrders > 0 ? (overallStats.cancelledAfterDispatch / overallStats.totalOrders) * 100 : 0;
  const otherPct = Math.max(0, 100 - deliveredPct - cbdPct - cadPct);

  const pieData = [
    { name: 'Delivered', value: overallStats.totalDelivered, color: '#22c55e' },
    { name: 'CBD', value: overallStats.cancelledBeforeDispatch, color: '#3b82f6' },
    { name: 'CAD', value: overallStats.cancelledAfterDispatch, color: '#ef4444' },
    { name: 'Other', value: Math.max(0, overallStats.totalOrders - overallStats.totalDelivered - overallStats.cancelledBeforeDispatch - overallStats.cancelledAfterDispatch), color: '#f59e0b' },
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user?.full_name}</p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Sales Revenue */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide leading-tight">Total Sales Revenue</p>
                <p className="text-xs text-muted-foreground mt-0.5">Excl. CAD & CBD orders</p>
                <p className="text-2xl font-bold mt-2 text-gray-900 truncate">{formatBDT(salesRevenue)}</p>
              </div>
              <div className="p-2.5 bg-emerald-100 rounded-lg ml-3 flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Inventory Value */}
        {canSeeCosts ? (
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide leading-tight">Inventory Value</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{inventoryStats.totalUnits.toLocaleString()} total units</p>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xl font-bold text-gray-900 truncate">{formatBDT(inventoryStats.landedCostValue)}</p>
                    <p className="text-xs text-muted-foreground">at landed cost</p>
                    <p className="text-base font-semibold text-blue-600 truncate">{formatBDT(inventoryStats.retailValue)}</p>
                    <p className="text-xs text-muted-foreground">at retail price</p>
                  </div>
                </div>
                <div className="p-2.5 bg-blue-100 rounded-lg ml-3 flex-shrink-0">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Inventory</p>
                  <p className="text-2xl font-bold mt-2 text-gray-900">{inventoryStats.totalUnits.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">total units in stock</p>
                </div>
                <div className="p-2.5 bg-blue-100 rounded-lg ml-3 flex-shrink-0">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card 3: Pending Orders */}
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide leading-tight">Pending Orders</p>
                <p className="text-xs text-muted-foreground mt-0.5">Status: New</p>
                <p className="text-3xl font-bold mt-2 text-gray-900">{pendingOrdersCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">awaiting fulfillment</p>
              </div>
              <div className="p-2.5 bg-amber-100 rounded-lg ml-3 flex-shrink-0">
                <ShoppingCart className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Incoming Shipments */}
        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide leading-tight">Incoming Shipments</p>
                <p className="text-3xl font-bold mt-1 text-gray-900">{incomingShipments.length}</p>
              </div>
              <div className="p-2.5 bg-teal-100 rounded-lg flex-shrink-0">
                <Truck className="w-6 h-6 text-teal-600" />
              </div>
            </div>
            {incomingShipments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active shipments</p>
            ) : (
              <div className="space-y-1.5 mt-1">
                {incomingShipments.slice(0, 3).map(s => (
                  <Link key={s.id} to={`/purchase/orders/${s.id}`} className="block">
                    <div className="text-xs bg-teal-50 rounded px-2 py-1.5 hover:bg-teal-100 transition-colors">
                      <p className="font-semibold text-teal-800 truncate">{s.shipment_name || s.po_number}</p>
                      {s.expected_delivery_date && (
                        <p className="text-teal-600 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(s.expected_delivery_date).toLocaleDateString('en-GB')}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
                {incomingShipments.length > 3 && (
                  <p className="text-xs text-muted-foreground pl-1">+{incomingShipments.length - 3} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overall Statistics */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">Overall Statistics</h2>
              <Info className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 bg-gray-100 rounded text-xs text-gray-600 border border-gray-200">
                <Calendar className="w-3.5 h-3.5" />
                <span>{statsDateFrom} – {statsDateTo}</span>
              </div>
            </div>
            <Link to="/fulfillment/orders" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              See all →
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Donut Chart */}
            <div className="relative flex-shrink-0">
              <div style={{ width: 180, height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData.length > 0 ? pieData : [{ name: 'No data', value: 1, color: '#e5e7eb' }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {(pieData.length > 0 ? pieData : [{ name: 'No data', value: 1, color: '#e5e7eb' }]).map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [value + ' orders', name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-xs text-muted-foreground font-medium">TOTAL</p>
                <p className="text-xl font-bold text-gray-900">{overallStats.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Orders</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-5 flex-1">
              {/* Total Orders */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-10 rounded-full bg-gray-400"></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{overallStats.totalOrders}</p>
                    <p className="text-xs text-muted-foreground">{formatBDT(overallStats.totalSalesRevenue)}</p>
                  </div>
                </div>
              </div>

              {/* Total Delivered */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-10 rounded-full bg-emerald-500"></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Delivered</p>
                    <p className="text-2xl font-bold text-emerald-600">{deliveredPct.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">{overallStats.totalDelivered} orders</p>
                  </div>
                </div>
              </div>

              {/* Cancelled Before Dispatch */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-10 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cancelled Before Dispatch</p>
                    <p className="text-2xl font-bold text-blue-600">{cbdPct.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">{overallStats.cancelledBeforeDispatch} orders</p>
                  </div>
                </div>
              </div>

              {/* Cancelled After Dispatch */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-10 rounded-full bg-red-500"></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cancelled After Dispatch</p>
                    <p className="text-2xl font-bold text-red-600">{cadPct.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">{overallStats.cancelledAfterDispatch} orders</p>
                  </div>
                </div>
              </div>

              {/* Actual Sold % */}
              <div className="col-span-2 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(deliveredPct, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700 whitespace-nowrap">
                    {deliveredPct.toFixed(1)}% actually sold
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top-Selling Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-600" />
              Top-Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSellingProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No sales data available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topSellingProducts.map((product, index) => (
                  <Link
                    key={product.id}
                    to={`/inventory/products/${product.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors border border-transparent hover:border-border"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-700">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                        {product.category && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{product.category}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-blue-600">{product.sold_qty}</p>
                      <p className="text-xs text-muted-foreground">sold</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No recent orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/fulfillment/orders/${order.id}`}
                    className="block p-3 bg-accent/50 border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-medium text-sm">{order.order_number}</p>
                      {getStatusBadge(order.cs_status)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-muted-foreground">{order.customer_name}</p>
                      <p className="font-semibold">{formatBDT(order.total_amount)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{order.payment_method}</p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
