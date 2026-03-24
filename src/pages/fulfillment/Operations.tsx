import { useState, useEffect, useCallback } from 'react';
import {
  Printer, Package, Send, Truck, Search, Camera, ScanLine,
  FileText, CheckCheck, Download, FlaskConical,
  Clock, TrendingUp, Hash,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRefresh } from '../../contexts/RefreshContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PickModal } from '../../components/fulfillment/PickModal';
import { BarcodeScannerModal } from '../../components/fulfillment/BarcodeScannerModal';
import { LabInvoiceModal } from '../../components/fulfillment/LabInvoiceModal';
import { PackedExportModal } from '../../components/fulfillment/PackedExportModal';
import { STATUS_CONFIG } from './orders/types';

interface Order {
  id: string;
  order_number: string;
  woo_order_number: string | null;
  woo_order_id: number | null;
  order_date: string;
  fulfillment_status: string;
  cs_status: string;
  total_amount: number;
  packed_at: string | null;
  shipped_at: string | null;
  has_prescription: boolean;
  customer: {
    full_name: string;
    phone_primary: string;
    address_line1?: string | null;
    city?: string | null;
    district?: string | null;
  };
  items: OrderItem[];
  courier_info: {
    courier_company: string | null;
    tracking_number: string | null;
  } | null;
}

interface OrderItem {
  id: string;
  sku: string;
  product_name: string;
  quantity: number;
  picked_quantity: number;
  unit_price: number;
}

type TabKey = 'not_printed' | 'printed' | 'packed' | 'send_to_lab' | 'shipped';

const TABS: { key: TabKey; label: string; color: string; sub: string; icon: React.ReactNode }[] = [
  {
    key: 'not_printed',
    label: 'Not Printed',
    color: 'text-orange-600',
    sub: 'Need invoice printing',
    icon: <FileText className="h-5 w-5 text-orange-400" />,
  },
  {
    key: 'printed',
    label: 'Printed',
    color: 'text-blue-600',
    sub: 'Ready to pick & pack',
    icon: <Package className="h-5 w-5 text-blue-400" />,
  },
  {
    key: 'packed',
    label: 'Packed',
    color: 'text-green-600',
    sub: 'Ready to ship',
    icon: <CheckCheck className="h-5 w-5 text-green-400" />,
  },
  {
    key: 'send_to_lab',
    label: 'Send to Lab',
    color: 'text-teal-600',
    sub: 'Custom prescriptions',
    icon: <FlaskConical className="h-5 w-5 text-teal-400" />,
  },
  {
    key: 'shipped',
    label: 'Shipped',
    color: 'text-slate-600',
    sub: 'Dispatched orders',
    icon: <Truck className="h-5 w-5 text-slate-400" />,
  },
];

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: '3days', label: 'Last 3 Days' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
];

export default function Operations() {
  const { lastRefreshed } = useRefresh();
  const [activeTab, setActiveTab] = useState<TabKey>('not_printed');
  const [orders, setOrders] = useState<Order[]>([]);
  const [shippedOrders, setShippedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPickModal, setShowPickModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showLabInvoice, setShowLabInvoice] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [scannedInput, setScannedInput] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [shippedRange, setShippedRange] = useState('today');

  const statusCounts = {
    not_printed: orders.filter(o => o.fulfillment_status === 'not_printed').length,
    printed: orders.filter(o => o.fulfillment_status === 'printed').length,
    packed: orders.filter(o => o.fulfillment_status === 'packed').length,
    send_to_lab: orders.filter(o => o.fulfillment_status === 'send_to_lab').length,
    shipped: shippedOrders.length,
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          woo_order_number,
          woo_order_id,
          order_date,
          fulfillment_status,
          cs_status,
          total_amount,
          packed_at,
          shipped_at,
          customer:customers(full_name, phone_primary, address_line1, city, district),
          items:order_items(id, sku, product_name, quantity, picked_quantity, unit_price),
          prescriptions:order_prescriptions(id),
          courier_info:order_courier_info(courier_company, tracking_number)
        `)
        .in('fulfillment_status', ['not_printed', 'printed', 'packed', 'send_to_lab', 'in_lab'])
        .order('order_date', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map(o => ({
        ...o,
        has_prescription: o.prescriptions && o.prescriptions.length > 0,
        courier_info: Array.isArray(o.courier_info) ? o.courier_info[0] || null : o.courier_info,
      }));

      setOrders(formatted);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchShippedOrders = useCallback(async (range: string) => {
    try {
      const now = new Date();
      const from = new Date();

      if (range === 'today') {
        from.setHours(0, 0, 0, 0);
      } else if (range === '3days') {
        from.setDate(now.getDate() - 3);
        from.setHours(0, 0, 0, 0);
      } else if (range === '7days') {
        from.setDate(now.getDate() - 7);
        from.setHours(0, 0, 0, 0);
      } else if (range === '30days') {
        from.setDate(now.getDate() - 30);
        from.setHours(0, 0, 0, 0);
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          woo_order_number,
          woo_order_id,
          order_date,
          fulfillment_status,
          cs_status,
          total_amount,
          packed_at,
          shipped_at,
          customer:customers(full_name, phone_primary, address_line1, city, district),
          items:order_items(id, sku, product_name, quantity, picked_quantity, unit_price),
          courier_info:order_courier_info(courier_company, tracking_number)
        `)
        .not('shipped_at', 'is', null)
        .gte('shipped_at', from.toISOString())
        .order('shipped_at', { ascending: false });

      if (error) throw error;

      setShippedOrders(
        (data || []).map(o => ({
          ...o,
          has_prescription: false,
          courier_info: Array.isArray(o.courier_info) ? o.courier_info[0] || null : o.courier_info,
        }))
      );
    } catch (err) {
      console.error('Error fetching shipped orders:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [lastRefreshed, fetchOrders]);

  useEffect(() => {
    fetchShippedOrders(shippedRange);
  }, [shippedRange, lastRefreshed, fetchShippedOrders]);

  useEffect(() => {
    const subscription = supabase
      .channel('operations_orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
        fetchShippedOrders(shippedRange);
      })
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, [fetchOrders, fetchShippedOrders, shippedRange]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const now = Date.now();
      if (now - lastKeyTime < 100) {
        setScannedInput(prev => prev + e.key);
      } else {
        setScannedInput(e.key);
      }
      setLastKeyTime(now);
      if (e.key === 'Enter' && scannedInput) {
        handleBarcodeScanned(scannedInput);
        setScannedInput('');
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [lastKeyTime, scannedInput]);

  const handleBarcodeScanned = (barcode: string) => {
    const order = orders.find(o =>
      o.order_number === barcode ||
      o.woo_order_number === barcode ||
      String(o.woo_order_id) === barcode
    );
    if (order && order.fulfillment_status === 'printed') {
      setSelectedOrder(order);
      setShowPickModal(true);
    }
  };

  const handlePrintInvoice = (order: Order) => {
    const displayId = order.woo_order_number ? `#${order.woo_order_number}` : order.order_number;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Invoice ${displayId}</title>
      <style>
        body { font-family: sans-serif; padding: 24px; font-size: 13px; color: #111; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
        th { background: #f3f4f6; }
        .total { font-weight: bold; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>Invoice ${displayId}</h1>
      <div class="row"><span>Customer: ${order.customer.full_name}</span><span>${new Date().toLocaleDateString()}</span></div>
      <div class="row"><span>Phone: ${order.customer.phone_primary}</span></div>
      <table>
        <tr><th>#</th><th>Product</th><th>SKU</th><th>Qty</th><th>Price</th><th>Total</th></tr>
        ${order.items.map((item, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${item.product_name}</td>
            <td>${item.sku}</td>
            <td>${item.quantity}</td>
            <td>৳${item.unit_price?.toFixed(2) ?? '—'}</td>
            <td>৳${((item.unit_price ?? 0) * item.quantity).toFixed(2)}</td>
          </tr>
        `).join('')}
        <tr class="total"><td colspan="5">Total</td><td>৳${order.total_amount.toFixed(2)}</td></tr>
      </table>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const handleMarkAsPrinted = async (orderId: string) => {
    await supabase.from('orders').update({ fulfillment_status: 'printed' }).eq('id', orderId);
    await supabase.from('order_activity_log').insert({ order_id: orderId, action: 'Marked as printed' });
    fetchOrders();
  };

  const handleMarkAsShipped = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({
        fulfillment_status: 'shipped',
        cs_status: 'shipped',
        shipped_at: new Date().toISOString(),
      })
      .eq('id', orderId);
    if (error) { console.error(error); return; }

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
          .maybeSingle();
        if (lot) {
          await supabase
            .from('inventory_lots')
            .update({ remaining_quantity: lot.remaining_quantity - pick.quantity })
            .eq('id', pick.lot_id);
          await supabase.from('stock_movements').insert({
            movement_type: 'sale',
            product_id: lot.product_id,
            lot_id: pick.lot_id,
            quantity: -pick.quantity,
            reference_type: 'order',
            reference_id: orderId,
          });
        }
      }
    }

    await supabase.from('order_activity_log').insert({
      order_id: orderId,
      action: 'Marked as shipped - inventory deducted',
    });
    fetchOrders();
    fetchShippedOrders(shippedRange);
  };

  const handleSetToInLab = async (orderId: string) => {
    await supabase.from('orders').update({ fulfillment_status: 'in_lab' }).eq('id', orderId);
    await supabase.from('order_prescriptions').update({
      lab_status: 'in_lab',
      lab_sent_date: new Date().toISOString(),
    }).eq('order_id', orderId);
    await supabase.from('order_activity_log').insert({ order_id: orderId, action: 'Sent to lab' });
    fetchOrders();
  };

  const isPartiallyPicked = (order: Order) => {
    if (!order.items || order.items.length === 0) return false;
    const totalPicked = order.items.reduce((s, i) => s + i.picked_quantity, 0);
    const total = order.items.reduce((s, i) => s + i.quantity, 0);
    return totalPicked > 0 && totalPicked < total;
  };

  const displayId = (order: Order) =>
    order.woo_order_number ? `#${order.woo_order_number}` : order.order_number;

  const getAddress = (order: Order) => {
    const c = order.customer;
    const parts = [c.city, c.district].filter(Boolean);
    return parts.length ? parts.join(', ') : (c.address_line1 || '—');
  };

  const tabOrders = activeTab === 'shipped'
    ? shippedOrders.filter(o => {
        const q = searchQuery.toLowerCase();
        return (
          o.order_number.toLowerCase().includes(q) ||
          (o.woo_order_number || '').toLowerCase().includes(q) ||
          o.customer?.full_name?.toLowerCase().includes(q)
        );
      })
    : orders.filter(o => {
        const matchTab = o.fulfillment_status === activeTab ||
          (activeTab === 'send_to_lab' && o.fulfillment_status === 'in_lab');
        const q = searchQuery.toLowerCase();
        const matchSearch =
          o.order_number.toLowerCase().includes(q) ||
          (o.woo_order_number || '').toLowerCase().includes(q) ||
          o.customer?.full_name?.toLowerCase().includes(q);
        return matchTab && matchSearch;
      });

  const packedOrdersForExport = orders
    .filter(o => o.fulfillment_status === 'packed')
    .map(o => ({
      id: o.id,
      order_number: o.order_number,
      woo_order_number: o.woo_order_number,
      packed_at: o.packed_at,
      total_amount: o.total_amount,
      courier_info: o.courier_info,
    }));

  const shippedTotal = shippedOrders.reduce((s, o) => s + o.total_amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Fulfillment Operations</h1>
        <Button variant="outline" onClick={() => setShowScanner(true)}>
          <Camera className="h-4 w-4 mr-2" />
          Camera Scanner
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`bg-white rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
              activeTab === tab.key
                ? 'border-blue-500 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {tab.icon}
              <span className="text-xs font-medium text-gray-500">{tab.label}</span>
            </div>
            <div className={`text-3xl font-bold ${tab.color}`}>
              {statusCounts[tab.key]}
            </div>
            <div className="text-xs text-gray-500 mt-1">{tab.sub}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by order ID or customer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <ScanLine className="h-4 w-4" />
            <span>Scanner Ready</span>
          </div>
          {activeTab === 'packed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportModal(true)}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export Packed
            </Button>
          )}
          {activeTab === 'shipped' && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <Select
                value={shippedRange}
                onChange={e => setShippedRange(e.target.value)}
                className="text-sm h-9 w-40"
              >
                {DATE_RANGES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {activeTab === 'shipped' && (
          <div className="px-5 py-3 bg-slate-50 border-b border-gray-100 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              <span className="text-gray-500">Total Value:</span>
              <span className="font-bold text-gray-900">
                ৳{shippedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-slate-500" />
              <span className="text-gray-500">Orders:</span>
              <span className="font-bold text-gray-900">{shippedOrders.length}</span>
            </div>
          </div>
        )}

        {loading && activeTab !== 'shipped' ? (
          <div className="py-12 text-center text-gray-400">Loading orders...</div>
        ) : tabOrders.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No orders in this status</div>
        ) : (
          <>
            {(activeTab === 'not_printed') && (
              <NotPrintedTable
                orders={tabOrders}
                displayId={displayId}
                getAddress={getAddress}
                onPrintInvoice={handlePrintInvoice}
                onMarkPrinted={handleMarkAsPrinted}
              />
            )}
            {activeTab === 'printed' && (
              <PrintedTable
                orders={tabOrders}
                displayId={displayId}
                isPartiallyPicked={isPartiallyPicked}
                onStartPick={(order) => { setSelectedOrder(order); setShowPickModal(true); }}
                onForcePack={async (order) => {
                  await supabase.from('orders').update({
                    fulfillment_status: 'packed',
                    packed_at: new Date().toISOString(),
                  }).eq('id', order.id);
                  await supabase.from('order_activity_log').insert({
                    order_id: order.id,
                    action: 'Packed (forced)',
                  });
                  fetchOrders();
                }}
              />
            )}
            {activeTab === 'packed' && (
              <PackedTable
                orders={tabOrders}
                displayId={displayId}
                onMarkShipped={handleMarkAsShipped}
              />
            )}
            {activeTab === 'send_to_lab' && (
              <SendToLabTable
                orders={tabOrders}
                displayId={displayId}
                onPrintLabInvoice={(order) => { setSelectedOrder(order); setShowLabInvoice(true); }}
                onPickForLab={handleSetToInLab}
              />
            )}
            {activeTab === 'shipped' && (
              <ShippedTable orders={tabOrders} displayId={displayId} />
            )}
          </>
        )}
      </div>

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

      {showLabInvoice && selectedOrder && (
        <LabInvoiceModal
          order={selectedOrder}
          onClose={() => {
            setShowLabInvoice(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {showExportModal && (
        <PackedExportModal
          orders={packedOrdersForExport}
          onClose={() => setShowExportModal(false)}
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

function NotPrintedTable({
  orders,
  displayId,
  getAddress,
  onPrintInvoice,
  onMarkPrinted,
}: {
  orders: Order[];
  displayId: (o: Order) => string;
  getAddress: (o: Order) => string;
  onPrintInvoice: (o: Order) => void;
  onMarkPrinted: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
            <th className="px-5 py-3 text-left font-semibold">Order ID</th>
            <th className="px-5 py-3 text-left font-semibold">Customer</th>
            <th className="px-5 py-3 text-left font-semibold">Items</th>
            <th className="px-5 py-3 text-left font-semibold">Total</th>
            <th className="px-5 py-3 text-left font-semibold">Address</th>
            <th className="px-5 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, idx) => (
            <tr
              key={order.id}
              className={`border-b border-gray-50 hover:bg-orange-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
            >
              <td className="px-5 py-3">
                <span className="font-semibold text-blue-600">{displayId(order)}</span>
                {order.has_prescription && (
                  <span className="ml-1.5 text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">Rx</span>
                )}
              </td>
              <td className="px-5 py-3">
                <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                <div className="text-xs text-gray-500">{order.customer?.phone_primary}</div>
              </td>
              <td className="px-5 py-3 text-gray-600">
                {(order.items?.length || 0)} items
              </td>
              <td className="px-5 py-3 font-semibold text-gray-900">৳{order.total_amount}</td>
              <td className="px-5 py-3 text-gray-500 text-xs max-w-40">{getAddress(order)}</td>
              <td className="px-5 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onPrintInvoice(order)}
                    title="Print Invoice"
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onPrintInvoice(order)}
                    title="Print Packing Slip"
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onMarkPrinted(order.id)}
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1" />
                    Mark as Printed
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PrintedTable({
  orders,
  displayId,
  isPartiallyPicked,
  onStartPick,
  onForcePack,
}: {
  orders: Order[];
  displayId: (o: Order) => string;
  isPartiallyPicked: (o: Order) => boolean;
  onStartPick: (o: Order) => void;
  onForcePack: (o: Order) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
            <th className="px-5 py-3 text-left font-semibold">Order ID</th>
            <th className="px-5 py-3 text-left font-semibold">Customer</th>
            <th className="px-5 py-3 text-left font-semibold">Items</th>
            <th className="px-5 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, idx) => {
            const partial = isPartiallyPicked(order);
            return (
              <tr
                key={order.id}
                className={`border-b border-gray-50 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-600">{displayId(order)}</span>
                    {partial && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                        Partial
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                  <div className="text-xs text-gray-500">{order.customer?.phone_primary}</div>
                </td>
                <td className="px-5 py-3">
                  <div className="space-y-0.5">
                    {order.items?.map(item => (
                      <div key={item.id} className="text-xs text-gray-600">
                        {item.quantity}x {item.product_name}
                        {item.picked_quantity > 0 && item.picked_quantity >= item.quantity && (
                          <span className="ml-1.5 bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-xs">Picked</span>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {partial ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onStartPick(order)}
                        >
                          <ScanLine className="h-3.5 w-3.5 mr-1" />
                          Continue Pick
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white border-0"
                          onClick={() => onForcePack(order)}
                        >
                          <Package className="h-3.5 w-3.5 mr-1" />
                          Pack
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onStartPick(order)}
                      >
                        <ScanLine className="h-3.5 w-3.5 mr-1" />
                        Start Pick
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PackedTable({
  orders,
  displayId,
  onMarkShipped,
}: {
  orders: Order[];
  displayId: (o: Order) => string;
  onMarkShipped: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
            <th className="px-5 py-3 text-left font-semibold">Order ID</th>
            <th className="px-5 py-3 text-left font-semibold">Customer</th>
            <th className="px-5 py-3 text-left font-semibold">Items</th>
            <th className="px-5 py-3 text-left font-semibold">Total</th>
            <th className="px-5 py-3 text-left font-semibold">Courier</th>
            <th className="px-5 py-3 text-left font-semibold">Packed At</th>
            <th className="px-5 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, idx) => (
            <tr
              key={order.id}
              className={`border-b border-gray-50 hover:bg-green-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
            >
              <td className="px-5 py-3 font-semibold text-blue-600">{displayId(order)}</td>
              <td className="px-5 py-3">
                <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                <div className="text-xs text-gray-500">{order.customer?.phone_primary}</div>
              </td>
              <td className="px-5 py-3 text-gray-600 text-xs">
                {order.items?.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
              </td>
              <td className="px-5 py-3 font-semibold text-gray-900">৳{order.total_amount}</td>
              <td className="px-5 py-3">
                {order.courier_info?.courier_company ? (
                  <span className="capitalize text-gray-700">{order.courier_info.courier_company}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
                {order.courier_info?.tracking_number && (
                  <div className="text-xs text-gray-400 font-mono">{order.courier_info.tracking_number}</div>
                )}
              </td>
              <td className="px-5 py-3 text-gray-500 text-xs">
                {order.packed_at
                  ? new Date(order.packed_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
                  : '—'}
              </td>
              <td className="px-5 py-3">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="bg-slate-700 hover:bg-slate-800 text-white border-0"
                    onClick={() => onMarkShipped(order.id)}
                  >
                    <Truck className="h-3.5 w-3.5 mr-1" />
                    Mark Shipped
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SendToLabTable({
  orders,
  displayId,
  onPrintLabInvoice,
  onPickForLab,
}: {
  orders: Order[];
  displayId: (o: Order) => string;
  onPrintLabInvoice: (o: Order) => void;
  onPickForLab: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
            <th className="px-5 py-3 text-left font-semibold">Order ID</th>
            <th className="px-5 py-3 text-left font-semibold">Customer</th>
            <th className="px-5 py-3 text-left font-semibold">Items</th>
            <th className="px-5 py-3 text-left font-semibold">Status</th>
            <th className="px-5 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, idx) => (
            <tr
              key={order.id}
              className={`border-b border-gray-50 hover:bg-teal-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
            >
              <td className="px-5 py-3 font-semibold text-blue-600">{displayId(order)}</td>
              <td className="px-5 py-3">
                <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                <div className="text-xs text-gray-500">{order.customer?.phone_primary}</div>
              </td>
              <td className="px-5 py-3 text-xs text-gray-600">
                {order.items?.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
              </td>
              <td className="px-5 py-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  order.fulfillment_status === 'in_lab'
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {order.fulfillment_status === 'in_lab' ? 'In Lab' : 'Send to Lab'}
                </span>
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPrintLabInvoice(order)}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Lab Invoice
                  </Button>
                  {order.fulfillment_status !== 'in_lab' && (
                    <Button
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700 text-white border-0"
                      onClick={() => onPickForLab(order.id)}
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Pick for Lab
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShippedTable({
  orders,
  displayId,
}: {
  orders: Order[];
  displayId: (o: Order) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
            <th className="px-5 py-3 text-left font-semibold">Order ID</th>
            <th className="px-5 py-3 text-left font-semibold">Customer</th>
            <th className="px-5 py-3 text-left font-semibold">Items</th>
            <th className="px-5 py-3 text-left font-semibold">Total</th>
            <th className="px-5 py-3 text-left font-semibold">Courier</th>
            <th className="px-5 py-3 text-left font-semibold">Shipped At</th>
            <th className="px-5 py-3 text-left font-semibold">Order Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, idx) => {
            const statusCfg = STATUS_CONFIG[order.cs_status];
            return (
              <tr
                key={order.id}
                className={`border-b border-gray-50 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
              >
                <td className="px-5 py-3 font-semibold text-blue-600">{displayId(order)}</td>
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                  <div className="text-xs text-gray-500">{order.customer?.phone_primary}</div>
                </td>
                <td className="px-5 py-3 text-xs text-gray-600">
                  {order.items?.length || 0} item(s)
                </td>
                <td className="px-5 py-3 font-semibold text-gray-900">৳{order.total_amount}</td>
                <td className="px-5 py-3">
                  {order.courier_info?.courier_company ? (
                    <div>
                      <span className="capitalize text-gray-700">{order.courier_info.courier_company}</span>
                      {order.courier_info.tracking_number && (
                        <div className="text-xs text-gray-400 font-mono">{order.courier_info.tracking_number}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {order.shipped_at
                    ? new Date(order.shipped_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
                    : '—'}
                </td>
                <td className="px-5 py-3">
                  {statusCfg ? (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}>
                      {statusCfg.label}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 capitalize">{order.cs_status}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
