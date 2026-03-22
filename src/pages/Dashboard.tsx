import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRefresh } from '../contexts/RefreshContext';
import {
  Package, ShoppingCart, TrendingUp, AlertTriangle, Clock, CheckCircle,
  RotateCcw, Truck, ArrowRight, PackageCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatBDT, CS_STATUS_COLORS, CS_STATUS_LABELS } from '../lib/utils';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  pendingPOs: number;
  recentOrdersCount: number;
  totalInventoryValue: number;
}

interface LowStockItem {
  id: string;
  sku: string;
  name: string;
  remaining_quantity: number;
  location_name: string;
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

interface PendingPO {
  id: string;
  po_number: string;
  supplier_name: string;
  expected_delivery_date: string;
  total_items: number;
}

export const Dashboard: React.FC = () => {
  const { user, canSeeCosts } = useAuth();
  const { lastRefreshed, setRefreshing } = useRefresh();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockCount: 0,
    pendingPOs: 0,
    recentOrdersCount: 0,
    totalInventoryValue: 0
  });
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [pendingPOs, setPendingPOs] = useState<PendingPO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
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

  const loadDashboardData = async () => {
    try {
      const [products, lots, ordersData, posData] = await Promise.all([
        fetchAllRows(supabase.from('products').select('id, sku, name, low_stock_threshold').eq('is_active', true)),
        fetchAllRows(supabase.from('inventory_lots').select('id, product_id, remaining_quantity, landed_cost_per_unit, location:warehouse_locations(name), product:products(sku, name)')),
        supabase.from('orders').select('id, order_number, total_amount, payment_method, cs_status, order_date, customer:customers(full_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('purchase_orders').select('id, po_number, expected_delivery_date, supplier:suppliers(name), items:purchase_order_items(id)').in('status', ['ordered', 'partially_received']).limit(5)
      ]);

      const stockByProduct = lots.reduce((acc: Record<string, number>, lot: any) => {
        const productId = lot.product_id;
        acc[productId] = (acc[productId] || 0) + lot.remaining_quantity;
        return acc;
      }, {});

      const lowStock = products
        .filter(p => (stockByProduct[p.id] || 0) < p.low_stock_threshold)
        .slice(0, 10);

      const lowStockWithDetails = lowStock.map(product => {
        const productLots = lots.filter((lot: any) => lot.product_id === product.id && lot.remaining_quantity > 0);
        const firstLot = productLots[0];
        return {
          id: product.id,
          sku: product.sku,
          name: product.name,
          remaining_quantity: stockByProduct[product.id] || 0,
          location_name: firstLot?.location?.name || 'N/A'
        };
      });

      const totalValue = canSeeCosts
        ? lots.reduce((sum: number, lot: any) => sum + (lot.remaining_quantity * lot.landed_cost_per_unit), 0)
        : 0;

      setStats({
        totalProducts: products.length,
        lowStockCount: lowStock.length,
        pendingPOs: posData.data?.length || 0,
        recentOrdersCount: ordersData.data?.length || 0,
        totalInventoryValue: totalValue
      });

      setLowStockItems(lowStockWithDetails);

      setRecentOrders(
        (ordersData.data || []).map((order: any) => ({
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer?.full_name || 'Unknown',
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          cs_status: order.cs_status,
          order_date: order.order_date
        }))
      );

      setPendingPOs(
        (posData.data || []).map((po: any) => ({
          id: po.id,
          po_number: po.po_number,
          supplier_name: po.supplier?.name || 'Unknown',
          expected_delivery_date: po.expected_delivery_date,
          total_items: po.items?.length || 0
        }))
      );
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
      <span
        className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
    );
  };

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stock Units</p>
                <p className="text-3xl font-bold mt-2">{stats.totalProducts.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">across all lots</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {canSeeCosts && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inventory Value</p>
                  <p className="text-3xl font-bold mt-2">
                    {formatBDT(stats.totalInventoryValue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">at landed cost</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-3xl font-bold mt-2">{stats.pendingPOs}</p>
                <p className="text-xs text-muted-foreground mt-1">awaiting fulfillment</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <PackageCheck className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Returns</p>
                <p className="text-3xl font-bold mt-2">{stats.lowStockCount}</p>
                <p className="text-xs text-muted-foreground mt-1">in-transit or QC</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <RotateCcw className="w-8 h-8 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-emerald-600" />
                <p>All products are well stocked</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <Link
                    key={item.id}
                    to={`/inventory/products/${item.id}`}
                    className="block p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.location_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-600">{item.remaining_quantity}</p>
                        <p className="text-xs text-muted-foreground">units</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{order.order_number}</p>
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

      {pendingPOs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-teal-600" />
              Pending Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingPOs.map((po) => (
                <Link
                  key={po.id}
                  to={`/purchase/orders/${po.id}`}
                  className="block p-3 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{po.po_number}</p>
                      <p className="text-sm text-muted-foreground">{po.supplier_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Expected: {new Date(po.expected_delivery_date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-teal-600">{po.total_items}</p>
                      <p className="text-xs text-muted-foreground">items</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
