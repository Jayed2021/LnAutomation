import { useState, useEffect, useCallback } from 'react';
import { Printer, Package, Send, Truck, Search, Camera, ScanLine } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { PickModal } from '../../components/fulfillment/PickModal';
import { BarcodeScannerModal } from '../../components/fulfillment/BarcodeScannerModal';

interface Order {
  id: string;
  order_number: string;
  order_date: string;
  fulfillment_status: string;
  customer: {
    full_name: string;
    phone_primary: string;
  };
  total_amount: number;
  items: OrderItem[];
  has_prescription: boolean;
}

interface OrderItem {
  id: string;
  sku: string;
  product_name: string;
  quantity: number;
  picked_quantity: number;
}

export default function Operations() {
  const { lastRefreshed } = useRefresh();
  const [activeTab, setActiveTab] = useState('not_printed');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPickModal, setShowPickModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedInput, setScannedInput] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);

  const statusCounts = {
    not_printed: orders.filter(o => o.fulfillment_status === 'not_printed').length,
    printed: orders.filter(o => o.fulfillment_status === 'printed').length,
    packed: orders.filter(o => o.fulfillment_status === 'packed').length,
    send_to_lab: orders.filter(o => o.fulfillment_status === 'send_to_lab').length,
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_date,
          fulfillment_status,
          total_amount,
          customer:customers(full_name, phone_primary),
          items:order_items(id, sku, product_name, quantity, picked_quantity),
          prescriptions:order_prescriptions(id)
        `)
        .in('fulfillment_status', ['not_printed', 'printed', 'packed', 'send_to_lab', 'in_lab'])
        .order('order_date', { ascending: false });

      if (error) throw error;

      const formattedOrders = (data || []).map(order => ({
        ...order,
        has_prescription: order.prescriptions && order.prescriptions.length > 0,
      }));

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [lastRefreshed]);

  useEffect(() => {
    const subscription = supabase
      .channel('orders_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchOrders]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;

      if (timeDiff < 100) {
        setScannedInput(prev => prev + e.key);
      } else {
        setScannedInput(e.key);
      }

      setLastKeyTime(currentTime);

      if (e.key === 'Enter' && scannedInput) {
        handleBarcodeScanned(scannedInput);
        setScannedInput('');
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [lastKeyTime, scannedInput]);

  const handleBarcodeScanned = async (barcode: string) => {
    const order = orders.find(o =>
      o.order_number === barcode ||
      o.id === barcode
    );

    if (order && order.fulfillment_status === 'printed') {
      setSelectedOrder(order);
      setShowPickModal(true);
    }
  };

  const handlePrintInvoice = async (order: Order) => {
    console.log('Printing invoice for order:', order.order_number);
  };

  const handlePrintPackingSlip = async (order: Order) => {
    console.log('Printing packing slip for order:', order.order_number);
  };

  const handleMarkAsPrinted = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ fulfillment_status: 'printed' })
        .eq('id', orderId);

      if (error) throw error;

      await supabase
        .from('order_activity_log')
        .insert({
          order_id: orderId,
          action: 'Marked as printed',
        });

      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleMarkAsShipped = async (orderId: string) => {
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          fulfillment_status: 'shipped',
          cs_status: 'shipped'
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      const { data: picks } = await supabase
        .from('order_picks')
        .select('lot_id, quantity')
        .eq('order_id', orderId);

      if (picks) {
        for (const pick of picks) {
          const { data: lot } = await supabase
            .from('inventory_lots')
            .select('remaining_quantity, product_id')
            .eq('id', pick.lot_id)
            .single();

          if (lot) {
            await supabase
              .from('inventory_lots')
              .update({
                remaining_quantity: lot.remaining_quantity - pick.quantity
              })
              .eq('id', pick.lot_id);

            await supabase
              .from('stock_movements')
              .insert({
                movement_type: 'sale',
                product_id: lot.product_id,
                lot_id: pick.lot_id,
                quantity: -pick.quantity,
                reference_type: 'order',
                reference_id: orderId
              });
          }
        }
      }

      await supabase
        .from('order_activity_log')
        .insert({
          order_id: orderId,
          action: 'Marked as shipped - inventory deducted',
        });

      fetchOrders();
    } catch (error) {
      console.error('Error marking as shipped:', error);
    }
  };

  const handleSetToInLab = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ fulfillment_status: 'in_lab' })
        .eq('id', orderId);

      if (error) throw error;

      await supabase
        .from('order_prescriptions')
        .update({
          lab_status: 'in_lab',
          lab_sent_date: new Date().toISOString()
        })
        .eq('order_id', orderId);

      await supabase
        .from('order_activity_log')
        .insert({
          order_id: orderId,
          action: 'Sent to lab',
        });

      fetchOrders();
    } catch (error) {
      console.error('Error updating lab status:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesTab = order.fulfillment_status === activeTab;
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const renderOrderActions = (order: Order) => {
    switch (order.fulfillment_status) {
      case 'not_printed':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePrintInvoice(order)}
            >
              <Printer className="h-4 w-4 mr-1" />
              Invoice
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePrintPackingSlip(order)}
            >
              <Printer className="h-4 w-4 mr-1" />
              Packing Slip
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleMarkAsPrinted(order.id)}
            >
              Mark as Printed
            </Button>
          </div>
        );
      case 'printed':
        return (
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setSelectedOrder(order);
              setShowPickModal(true);
            }}
          >
            <Package className="h-4 w-4 mr-1" />
            Pick Order
          </Button>
        );
      case 'packed':
        return (
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleMarkAsShipped(order.id)}
          >
            <Truck className="h-4 w-4 mr-1" />
            Mark as Shipped
          </Button>
        );
      case 'send_to_lab':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePrintInvoice(order)}
            >
              <Printer className="h-4 w-4 mr-1" />
              Lab Invoice
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleSetToInLab(order.id)}
            >
              <Send className="h-4 w-4 mr-1" />
              Set to In Lab
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fulfillment Operations</h1>
        <Button
          variant="outline"
          onClick={() => setShowScanner(true)}
        >
          <Camera className="h-4 w-4 mr-2" />
          Camera Scanner
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Not Printed</div>
          <div className="text-2xl font-bold text-orange-600">{statusCounts.not_printed}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Printed</div>
          <div className="text-2xl font-bold text-blue-600">{statusCounts.printed}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Packed</div>
          <div className="text-2xl font-bold text-green-600">{statusCounts.packed}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Send to Lab</div>
          <div className="text-2xl font-bold text-purple-600">{statusCounts.send_to_lab}</div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by order number or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ScanLine className="h-4 w-4" />
            Scanner Ready
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="not_printed">
              Not Printed ({statusCounts.not_printed})
            </TabsTrigger>
            <TabsTrigger value="printed">
              Printed ({statusCounts.printed})
            </TabsTrigger>
            <TabsTrigger value="packed">
              Packed ({statusCounts.packed})
            </TabsTrigger>
            <TabsTrigger value="send_to_lab">
              Send to Lab ({statusCounts.send_to_lab})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No orders in this status</div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">{order.order_number}</span>
                          {order.has_prescription && (
                            <Badge variant="secondary">Prescription</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          <div>{order.customer?.full_name}</div>
                          <div>{order.customer?.phone_primary}</div>
                          <div className="mt-1">
                            {order.items?.length || 0} items • ৳{order.total_amount}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {renderOrderActions(order)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {showPickModal && selectedOrder && (
        <PickModal
          order={selectedOrder}
          onClose={() => {
            setShowPickModal(false);
            setSelectedOrder(null);
            fetchOrders();
          }}
        />
      )}

      {showScanner && (
        <BarcodeScannerModal
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
