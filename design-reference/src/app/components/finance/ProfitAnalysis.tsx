import { useState } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, 
  ShoppingCart, Calendar, Download, RefreshCw 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { orders } from '../../data/mockData';

interface ProfitMetrics {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  netProfit: number;
  netMargin: number;
  orderCount: number;
  avgOrderValue: number;
  avgProfit: number;
}

interface OrderProfitability {
  order_id: string;
  woo_order_id: string;
  date: string;
  customer: string;
  revenue: number;
  cogs: number;
  shippingCost: number;
  deliveryCharge: number;
  operatingExpense: number;
  grossProfit: number;
  netProfit: number;
  margin: number;
}

export function ProfitAnalysis() {
  const [dateRange, setDateRange] = useState('current_month');
  const [sortBy, setSortBy] = useState('date_desc');

  // Mock expenses data (would come from Expenses module)
  const mockExpenses = [
    { category: 'rent', amount: 50000, date: '2026-02-01', affects_profit: true },
    { category: 'salaries', amount: 120000, date: '2026-02-01', affects_profit: true },
    { category: 'utilities', amount: 8000, date: '2026-02-05', affects_profit: true },
    { category: 'marketing', amount: 15000, date: '2026-02-15', affects_profit: true },
    { category: 'software', amount: 5000, date: '2026-02-01', affects_profit: true },
  ];

  // Filter orders based on date range
  const getDateRangeOrders = () => {
    const today = new Date();
    let startDate = new Date();
    
    switch(dateRange) {
      case 'current_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        return orders.filter(o => {
          const orderDate = new Date(o.created_date);
          return orderDate >= startDate && orderDate <= endDate && o.cs_status === 'delivered';
        });
      case 'last_3_months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        break;
      case 'current_year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        return orders.filter(o => o.cs_status === 'delivered');
    }
    
    return orders.filter(o => {
      const orderDate = new Date(o.created_date);
      return orderDate >= startDate && o.cs_status === 'delivered';
    });
  };

  const deliveredOrders = getDateRangeOrders();

  // Calculate order-level profitability
  const orderProfitability: OrderProfitability[] = deliveredOrders.map(order => {
    // Revenue = Total collected from customer
    const revenue = order.collected_amount || order.total;
    
    // COGS = Sum of cost prices of all items
    const cogs = order.items.reduce((sum, item) => {
      const costPrice = item.cost_price || 0;
      return sum + (costPrice * item.quantity);
    }, 0);
    
    // Shipping cost (what we pay to courier)
    const shippingCost = order.delivery_charge || 60;
    
    // Delivery charge collected from customer (already included in total)
    const deliveryCharge = order.delivery_charge || 60;
    
    // Operating expense allocation (distribute total expenses across orders)
    const totalExpenses = mockExpenses
      .filter(e => e.affects_profit)
      .reduce((sum, e) => sum + e.amount, 0);
    const operatingExpense = deliveredOrders.length > 0 ? totalExpenses / deliveredOrders.length : 0;
    
    // Gross Profit = Revenue - COGS
    const grossProfit = revenue - cogs;
    
    // Net Profit = Revenue - COGS - Shipping Cost - Operating Expenses
    const netProfit = revenue - cogs - shippingCost - operatingExpense;
    
    // Margin percentage
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    
    return {
      order_id: order.order_id,
      woo_order_id: order.woo_order_id,
      date: order.created_date,
      customer: order.customer_name,
      revenue,
      cogs,
      shippingCost,
      deliveryCharge,
      operatingExpense,
      grossProfit,
      netProfit,
      margin
    };
  });

  // Sort orders
  const sortedOrders = [...orderProfitability].sort((a, b) => {
    switch(sortBy) {
      case 'profit_desc':
        return b.netProfit - a.netProfit;
      case 'profit_asc':
        return a.netProfit - b.netProfit;
      case 'margin_desc':
        return b.margin - a.margin;
      case 'margin_asc':
        return a.margin - b.margin;
      case 'revenue_desc':
        return b.revenue - a.revenue;
      case 'date_desc':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      default:
        return 0;
    }
  });

  // Calculate overall metrics
  const metrics: ProfitMetrics = {
    revenue: orderProfitability.reduce((sum, o) => sum + o.revenue, 0),
    cogs: orderProfitability.reduce((sum, o) => sum + o.cogs, 0),
    grossProfit: orderProfitability.reduce((sum, o) => sum + o.grossProfit, 0),
    grossMargin: 0,
    operatingExpenses: mockExpenses.filter(e => e.affects_profit).reduce((sum, e) => sum + e.amount, 0),
    netProfit: orderProfitability.reduce((sum, o) => sum + o.netProfit, 0),
    netMargin: 0,
    orderCount: deliveredOrders.length,
    avgOrderValue: 0,
    avgProfit: 0
  };

  metrics.grossMargin = metrics.revenue > 0 ? (metrics.grossProfit / metrics.revenue) * 100 : 0;
  metrics.netMargin = metrics.revenue > 0 ? (metrics.netProfit / metrics.revenue) * 100 : 0;
  metrics.avgOrderValue = metrics.orderCount > 0 ? metrics.revenue / metrics.orderCount : 0;
  metrics.avgProfit = metrics.orderCount > 0 ? metrics.netProfit / metrics.orderCount : 0;

  // Breakdown by category
  const categoryBreakdown = deliveredOrders.reduce((acc, order) => {
    order.items.forEach(item => {
      const category = item.sku.split('_')[0]; // e.g., LN from LN_1001
      if (!acc[category]) {
        acc[category] = { revenue: 0, cogs: 0, quantity: 0 };
      }
      acc[category].revenue += item.price * item.quantity;
      acc[category].cogs += (item.cost_price || 0) * item.quantity;
      acc[category].quantity += item.quantity;
    });
    return acc;
  }, {} as Record<string, { revenue: number; cogs: number; quantity: number }>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold">Profit Analysis</h1>
          <p className="text-gray-600 mt-1">Detailed profitability insights with exact COGS tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Date Range:</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Current Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                <SelectItem value="current_year">Current Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">৳{metrics.revenue.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-1">{metrics.orderCount} delivered orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total COGS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">৳{metrics.cogs.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-1">Cost of goods sold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Gross Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">৳{metrics.grossProfit.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-1">Margin: {metrics.grossMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ৳{metrics.netProfit.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-1">Margin: {metrics.netMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Profitability Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profit Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Revenue</span>
                <span className="font-bold text-green-600">৳{metrics.revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Less: Cost of Goods Sold (COGS)</span>
                <span className="font-bold text-red-600">-৳{metrics.cogs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b bg-green-50 px-2">
                <span className="font-medium">= Gross Profit</span>
                <span className="font-bold text-green-700">৳{metrics.grossProfit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Less: Operating Expenses</span>
                <span className="font-bold text-red-600">-৳{metrics.operatingExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-blue-50 px-2 rounded">
                <span className="font-bold text-lg">= Net Profit</span>
                <span className={`font-bold text-xl ${metrics.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ৳{metrics.netProfit.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Average Order Value</span>
                <span className="font-bold">৳{metrics.avgOrderValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Average Profit per Order</span>
                <span className={`font-bold ${metrics.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ৳{metrics.avgProfit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Gross Margin</span>
                <span className="font-bold text-green-600">{metrics.grossMargin.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Net Margin</span>
                <span className={`font-bold ${metrics.netMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.netMargin.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Total Orders Delivered</span>
                <span className="font-bold">{metrics.orderCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Profit by Product Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Units Sold</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>COGS</TableHead>
                <TableHead>Gross Profit</TableHead>
                <TableHead>Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(categoryBreakdown).map(([category, data]) => {
                const profit = data.revenue - data.cogs;
                const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
                return (
                  <TableRow key={category}>
                    <TableCell className="font-medium">{category}</TableCell>
                    <TableCell>{data.quantity}</TableCell>
                    <TableCell>৳{data.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-orange-600">৳{data.cogs.toLocaleString()}</TableCell>
                    <TableCell className="font-bold text-green-600">৳{profit.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={margin > 50 ? 'default' : margin > 30 ? 'secondary' : 'outline'}>
                        {margin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order-Level Profitability */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Order-Level Profitability</CardTitle>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Date (Newest)</SelectItem>
                <SelectItem value="profit_desc">Profit (Highest)</SelectItem>
                <SelectItem value="profit_asc">Profit (Lowest)</SelectItem>
                <SelectItem value="margin_desc">Margin (Highest)</SelectItem>
                <SelectItem value="margin_asc">Margin (Lowest)</SelectItem>
                <SelectItem value="revenue_desc">Revenue (Highest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>COGS</TableHead>
                  <TableHead>Shipping</TableHead>
                  <TableHead>Op. Exp.</TableHead>
                  <TableHead>Net Profit</TableHead>
                  <TableHead>Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No delivered orders in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedOrders.map(order => (
                    <TableRow key={order.order_id}>
                      <TableCell className="font-medium">{order.woo_order_id}</TableCell>
                      <TableCell className="text-sm">{new Date(order.date).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell className="text-sm">{order.customer}</TableCell>
                      <TableCell className="font-medium">৳{order.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-orange-600">৳{order.cogs.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">৳{order.shippingCost.toFixed(0)}</TableCell>
                      <TableCell className="text-sm">৳{order.operatingExpense.toFixed(0)}</TableCell>
                      <TableCell className={`font-bold ${order.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ৳{order.netProfit.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={order.margin > 30 ? 'default' : order.margin > 10 ? 'secondary' : 'outline'}
                          className={order.margin < 0 ? 'bg-red-100 text-red-700 border-red-300' : ''}
                        >
                          {order.margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
