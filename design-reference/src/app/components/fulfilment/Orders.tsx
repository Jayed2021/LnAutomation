import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Search, Eye, ShoppingBag, DollarSign, Package, TrendingUp, Truck, Calendar, UserCheck } from "lucide-react";
import { orders, currentUser } from "../../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";

export function Orders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [dateRange, setDateRange] = useState<string>("today");
  const [assignedToMe, setAssignedToMe] = useState(false);

  const isCSUser = currentUser.role === 'customer_service';

  // Get today's date for filtering
  const today = new Date().toISOString().split('T')[0]; // "2026-02-24"

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "yesterday":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case "this_week":
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as first day
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
        break;
      case "this_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "this_quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.woo_order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || order.cs_status === statusFilter;
    const matchesAssignment = !assignedToMe || order.assigned_to === currentUser.id;
    
    // Tab-based filtering
    let matchesTab = true;
    if (activeTab === "needs_action") {
      matchesTab = ['new_not_called', 'new_called', 'awaiting_payment'].includes(order.cs_status);
    } else if (activeTab === "scheduled") {
      matchesTab = order.cs_status === 'late_delivery';
    } else if (activeTab === "processing") {
      matchesTab = ['send_to_lab', 'in_lab', 'exchange', 'not_printed', 'printed', 'packed'].includes(order.cs_status);
    } else if (activeTab === "completed") {
      matchesTab = order.cs_status === 'shipped';
    }
    
    return matchesSearch && matchesStatus && matchesTab && matchesAssignment;
  });

  // Statistics based on selected date range
  const filteredByDateOrders = orders.filter(o => {
    const orderDate = o.created_date;
    return orderDate >= startDate && orderDate <= endDate;
  });
  
  const periodCount = filteredByDateOrders.length;
  const periodTotal = filteredByDateOrders.reduce((sum, o) => sum + o.total, 0);
  const periodAvgOrderValue = periodCount > 0 ? periodTotal / periodCount : 0;
  
  // Shipped orders in the date range
  const shippedOrders = filteredByDateOrders.filter(o => o.cs_status === 'shipped');
  const shippedCount = shippedOrders.length;
  const shippedTotal = shippedOrders.reduce((sum, o) => sum + o.total, 0);

  // Order counts by workflow stage
  const needsActionCount = orders.filter(o => 
    ['new_not_called', 'new_called', 'awaiting_payment'].includes(o.cs_status)
  ).length;
  const scheduledCount = orders.filter(o => o.cs_status === 'late_delivery').length;
  const processingCount = orders.filter(o => 
    ['send_to_lab', 'in_lab', 'exchange', 'not_printed', 'printed', 'packed'].includes(o.cs_status)
  ).length;
  const completedCount = orders.filter(o => o.cs_status === 'shipped').length;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new_not_called: 'bg-red-100 text-red-700 border-red-200',
      new_called: 'bg-orange-100 text-orange-700 border-orange-200',
      awaiting_payment: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      late_delivery: 'bg-purple-100 text-purple-700 border-purple-200',
      exchange: 'bg-blue-100 text-blue-700 border-blue-200',
      send_to_lab: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      in_lab: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      not_printed: 'bg-gray-100 text-gray-700 border-gray-200',
      printed: 'bg-blue-100 text-blue-700 border-blue-200',
      packed: 'bg-green-100 text-green-700 border-green-200',
      shipped: 'bg-green-500 text-white border-green-600',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const formatStatus = (status: string) => {
    const labels: Record<string, string> = {
      new_not_called: 'New & Not Called',
      new_called: 'New & Called',
      awaiting_payment: 'Awaiting Payment',
      late_delivery: 'Late Delivery',
      exchange: 'Exchange',
      send_to_lab: 'Send to Lab',
      in_lab: 'In Lab',
      not_printed: 'Not Printed',
      printed: 'Printed',
      packed: 'Packed',
      shipped: 'Shipped',
    };
    return labels[status] || status;
  };

  const navigate = useNavigate();

  const getDateRangeLabel = () => {
    const labels: Record<string, string> = {
      today: "Today",
      yesterday: "Yesterday",
      this_week: "This Week",
      this_month: "This Month",
      last_month: "Last Month",
      this_quarter: "This Quarter",
    };
    return labels[dateRange] || "Today";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Orders</h1>
        <p className="text-gray-600 mt-1">Manage customer orders from confirmation to shipment</p>
      </div>

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
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="this_quarter">This Quarter</SelectItem>
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

      {/* Statistics based on selected date range */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              {getDateRangeLabel()}'s Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{periodCount}</div>
            <p className="text-xs text-gray-600 mt-1">New orders in period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">৳{periodTotal.toFixed(2)}</div>
            <p className="text-xs text-gray-600 mt-1">{getDateRangeLabel()}'s revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">৳{periodAvgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-gray-600 mt-1">Per order in period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Shipped Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{shippedCount}</div>
            <p className="text-xs text-gray-600 mt-1">৳{shippedTotal.toFixed(2)} total value</p>
          </CardContent>
        </Card>
      </div>

      {/* Workflow-based Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            All Orders
            <Badge variant="outline" className="ml-2">{orders.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="needs_action">
            Needs Action
            <Badge variant="destructive" className="ml-2">{needsActionCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled
            <Badge variant="outline" className="ml-2">{scheduledCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processing
            <Badge variant="outline" className="ml-2">{processingCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Shipped
            <Badge variant="outline" className="ml-2">{completedCount}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 relative min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by Order ID, customer name, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new_not_called">New & Not Called</SelectItem>
                    <SelectItem value="new_called">New & Called</SelectItem>
                    <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                    <SelectItem value="late_delivery">Late Delivery</SelectItem>
                    <SelectItem value="exchange">Exchange</SelectItem>
                    <SelectItem value="send_to_lab">Send to Lab</SelectItem>
                    <SelectItem value="in_lab">In Lab</SelectItem>
                    <SelectItem value="not_printed">Not Printed</SelectItem>
                    <SelectItem value="printed">Printed</SelectItem>
                    <SelectItem value="packed">Packed</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={assignedToMe ? "default" : "outline"}
                  size="sm"
                  className="gap-2 whitespace-nowrap"
                  onClick={() => setAssignedToMe(!assignedToMe)}
                >
                  <UserCheck className="w-4 h-4" />
                  {assignedToMe ? "Assigned to Me ✓" : "Assigned to Me"}
                </Button>
              </div>
              {assignedToMe && (
                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  Showing orders assigned to <strong>{currentUser.name}</strong> only
                </p>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Person</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow 
                        key={order.order_id}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => navigate(`/fulfilment/orders/${order.order_id}`)}
                      >
                        <TableCell className="text-sm">
                          {new Date(order.created_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{order.woo_order_id}</p>
                            <p className="text-xs text-gray-600">{order.order_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{order.customer_name}</p>
                            <p className="text-xs text-gray-600">{order.customer_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">৳{order.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.cs_status)}>
                            {formatStatus(order.cs_status)}
                          </Badge>
                          {order.late_delivery_date && (
                            <p className="text-xs text-gray-600 mt-1">
                              Due: {new Date(order.late_delivery_date).toLocaleDateString()}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.assigned_to_name ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                                  {order.assigned_to_name.split(' ').map((n: string) => n[0]).join('')}
                                </div>
                                <span className="text-sm font-medium">{order.assigned_to_name}</span>
                              </div>
                              {order.confirmed_by && order.confirmed_by !== order.assigned_to_name && (
                                <p className="text-xs text-amber-600 mt-0.5 ml-6.5">
                                  Confirmed by: {order.confirmed_by}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" className="gap-2" asChild>
                            <Link to={`/fulfilment/orders/${order.order_id}`}>
                              <Eye className="w-4 h-4" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workflow Guidance */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-blue-900">Workflow Guidance</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p><strong>Needs Action:</strong> New orders requiring customer confirmation calls and payment verification</p>
          <p><strong>Scheduled:</strong> Orders with future delivery dates set by customers</p>
          <p><strong>Processing:</strong> Orders in lab, being printed, packed, or ready for shipment</p>
          <p><strong>Completed:</strong> Orders that have been shipped to customers</p>
        </CardContent>
      </Card>
    </div>
  );
}