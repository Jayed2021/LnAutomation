import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { 
  Package, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  BarChart3,
  Calendar,
  Download,
  Scan
} from 'lucide-react';
import { orders, type Order } from '../../data/mockData';
import { ReceiveModal } from './ReceiveModal';
import { RestockModal } from './RestockModal';
import { OrderDetail } from './OrderDetail';
import { toast } from 'sonner';

type ReturnTabType = 'expected' | 'received' | 'qc_passed' | 'restocked' | 'reports';

interface ReturnOrder extends Order {
  return_status?: 'not_received' | 'received' | 'qc_passed' | 'qc_failed' | 'restocked';
  expected_return_date?: string;
  received_date?: string;
  qc_date?: string;
  restocked_date?: string;
  status_change_timestamp?: string;
}

export function Returns() {
  const [selectedTab, setSelectedTab] = useState<ReturnTabType>('expected');
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ReturnOrder | null>(null);
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<ReturnOrder | null>(null);
  
  // Mock return orders - orders with returnable statuses
  const returnOrders: ReturnOrder[] = orders
    .filter(o => ['cad', 'partial', 'exchange'].includes(o.cs_status))
    .map(o => ({
      ...o,
      return_status: 'not_received' as const,
      expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status_change_timestamp: new Date().toISOString()
    }));

  // State for received/QC/restocked orders
  const [receivedOrders, setReceivedOrders] = useState<Map<string, { order: ReturnOrder, items: any[] }>>(new Map());
  const [qcPassedOrders, setQcPassedOrders] = useState<Map<string, ReturnOrder>>(new Map());
  const [restockedOrders, setRestockedOrders] = useState<Map<string, ReturnOrder>>(new Map());

  const getTabOrders = () => {
    switch (selectedTab) {
      case 'expected':
        return returnOrders.filter(o => o.return_status === 'not_received');
      case 'received':
        return Array.from(receivedOrders.values()).map(v => v.order);
      case 'qc_passed':
        return Array.from(qcPassedOrders.values());
      case 'restocked':
        return Array.from(restockedOrders.values());
      default:
        return [];
    }
  };

  const handleReceiveClick = (order: ReturnOrder) => {
    setSelectedOrder(order);
    setReceiveModalOpen(true);
  };

  const handleReceiveComplete = (receivedItems: any[]) => {
    if (!selectedOrder) return;
    
    const receivedCount = receivedItems.filter(item => item.scanned).length;
    const totalCount = receivedItems.length;
    
    const updatedOrder = {
      ...selectedOrder,
      return_status: 'received' as const,
      received_date: new Date().toISOString().split('T')[0]
    };
    
    setReceivedOrders(prev => new Map(prev).set(selectedOrder.order_id, { order: updatedOrder, items: receivedItems }));
    
    if (receivedCount === totalCount) {
      toast.success(`All ${totalCount} items received for order ${selectedOrder.woo_order_id}`);
    } else {
      toast.warning(`Partial receive: ${receivedCount}/${totalCount} items received for order ${selectedOrder.woo_order_id}`);
    }
    
    setReceiveModalOpen(false);
    setSelectedOrder(null);
  };

  const handleQCPassed = (order: ReturnOrder) => {
    const receivedData = receivedOrders.get(order.order_id);
    if (!receivedData) return;
    
    const updatedOrder = {
      ...order,
      return_status: 'qc_passed' as const,
      qc_date: new Date().toISOString().split('T')[0]
    };
    
    setQcPassedOrders(prev => new Map(prev).set(order.order_id, updatedOrder));
    setReceivedOrders(prev => {
      const newMap = new Map(prev);
      newMap.delete(order.order_id);
      return newMap;
    });
    
    toast.success(`QC passed for order ${order.woo_order_id}. Ready for restocking.`);
  };

  const handleQCFailed = (order: ReturnOrder) => {
    setReceivedOrders(prev => {
      const newMap = new Map(prev);
      newMap.delete(order.order_id);
      return newMap;
    });
    
    toast.warning(`QC failed for order ${order.woo_order_id}. Items scrapped to Damage location.`);
  };

  const handleRestockClick = (order: ReturnOrder) => {
    setSelectedOrder(order);
    setRestockModalOpen(true);
  };

  const handleRestockComplete = (restockedItems: any[]) => {
    if (!selectedOrder) return;
    
    const updatedOrder = {
      ...selectedOrder,
      return_status: 'restocked' as const,
      restocked_date: new Date().toISOString().split('T')[0]
    };
    
    setRestockedOrders(prev => new Map(prev).set(selectedOrder.order_id, updatedOrder));
    setQcPassedOrders(prev => {
      const newMap = new Map(prev);
      newMap.delete(selectedOrder.order_id);
      return newMap;
    });
    
    toast.success(`Order ${selectedOrder.woo_order_id} items restocked successfully`);
    
    setRestockModalOpen(false);
    setSelectedOrder(null);
  };

  const handleRowClick = (order: ReturnOrder) => {
    setDetailOrder(order);
    setDetailViewOpen(true);
  };

  const tabs = [
    { id: 'expected' as const, label: 'Expected', icon: Calendar, count: returnOrders.filter(o => o.return_status === 'not_received').length },
    { id: 'received' as const, label: 'Received', icon: Package, count: receivedOrders.size },
    { id: 'qc_passed' as const, label: 'QC Passed', icon: CheckCircle2, count: qcPassedOrders.size },
    { id: 'restocked' as const, label: 'Restocked', icon: RotateCcw, count: restockedOrders.size },
    { id: 'reports' as const, label: 'Reports', icon: BarChart3, count: 0 },
  ];

  const tabOrders = getTabOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Returns Management</h1>
        <p className="text-gray-600 mt-1">Manage product returns, quality control, and restocking</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                selectedTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
              {tab.count > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {selectedTab === 'reports' ? (
        <ReportsView 
          expectedCount={returnOrders.filter(o => o.return_status === 'not_received').length}
          receivedCount={receivedOrders.size}
          qcPassedCount={qcPassedOrders.size}
          restockedCount={restockedOrders.size}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{tabs.find(t => t.id === selectedTab)?.label} Returns</span>
              <span className="text-sm text-gray-600 font-normal">{tabOrders.length} orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tabOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No {tabs.find(t => t.id === selectedTab)?.label.toLowerCase()} returns</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expected Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabOrders.map((order) => (
                    <TableRow 
                      key={order.order_id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleRowClick(order)}
                    >
                      <TableCell className="font-medium">{order.woo_order_id}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
                          {order.cs_status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.expected_return_date}</TableCell>
                      <TableCell>{order.items.length}</TableCell>
                      <TableCell>৳{order.total.toFixed(2)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {selectedTab === 'expected' && (
                          <Button
                            size="sm"
                            onClick={() => handleReceiveClick(order)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Scan className="w-4 h-4 mr-2" />
                            Receive
                          </Button>
                        )}
                        {selectedTab === 'received' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleQCPassed(order)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              QC Passed
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleQCFailed(order)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              QC Failed
                            </Button>
                          </div>
                        )}
                        {selectedTab === 'qc_passed' && (
                          <Button
                            size="sm"
                            onClick={() => handleRestockClick(order)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restock
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Receive Modal */}
      {selectedOrder && (
        <ReceiveModal
          isOpen={receiveModalOpen}
          onClose={() => {
            setReceiveModalOpen(false);
            setSelectedOrder(null);
          }}
          orderItems={selectedOrder.items}
          orderId={selectedOrder.order_id}
          wooOrderId={selectedOrder.woo_order_id}
          onReceiveComplete={handleReceiveComplete}
        />
      )}

      {/* Restock Modal */}
      {selectedOrder && (
        <RestockModal
          isOpen={restockModalOpen}
          onClose={() => {
            setRestockModalOpen(false);
            setSelectedOrder(null);
          }}
          orderItems={selectedOrder.items}
          orderId={selectedOrder.order_id}
          wooOrderId={selectedOrder.woo_order_id}
          onRestockComplete={handleRestockComplete}
        />
      )}

      {/* Order Detail Modal */}
      {detailOrder && (
        <OrderDetail
          isOpen={detailViewOpen}
          onClose={() => {
            setDetailViewOpen(false);
            setDetailOrder(null);
          }}
          order={detailOrder}
        />
      )}
    </div>
  );
}

// Reports Component
function ReportsView({ expectedCount, receivedCount, qcPassedCount, restockedCount }: {
  expectedCount: number;
  receivedCount: number;
  qcPassedCount: number;
  restockedCount: number;
}) {
  const [dateRange, setDateRange] = useState('monthly');
  
  const totalExpected = expectedCount + receivedCount + qcPassedCount + restockedCount;
  const receivedPercentage = totalExpected > 0 ? (receivedCount / totalExpected * 100) : 0;
  const qcPassedPercentage = receivedCount > 0 ? (qcPassedCount / receivedCount * 100) : 0;
  const qcFailedCount = receivedCount - qcPassedCount;
  const qcFailedPercentage = receivedCount > 0 ? (qcFailedCount / receivedCount * 100) : 0;
  const restockedPercentage = qcPassedCount > 0 ? (restockedCount / qcPassedCount * 100) : 0;

  const metrics = [
    { label: 'Total Expected Returns', value: totalExpected, color: 'bg-blue-500' },
    { label: 'Total Received', value: receivedCount, percentage: receivedPercentage, color: 'bg-green-500' },
    { label: 'Total QC Passed', value: qcPassedCount, percentage: qcPassedPercentage, color: 'bg-emerald-500' },
    { label: 'Total QC Failed', value: qcFailedCount, percentage: qcFailedPercentage, color: 'bg-red-500' },
    { label: 'Total Restocked', value: restockedCount, percentage: restockedPercentage, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Date Range:</label>
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="weekly">This Week</option>
              <option value="monthly">This Month</option>
              <option value="quarterly">This Quarter</option>
              <option value="yearly">This Year</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{metric.label}</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-bold">{metric.value}</p>
                  {metric.percentage !== undefined && (
                    <p className="text-lg text-gray-600 mb-1">({metric.percentage.toFixed(1)}%)</p>
                  )}
                </div>
                {metric.percentage !== undefined && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${metric.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${metric.percentage}%` }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Export Button */}
      <Card>
        <CardContent className="pt-6">
          <Button className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Export Returns Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
