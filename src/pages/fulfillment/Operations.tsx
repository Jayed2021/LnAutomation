import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Printer, Package, Send, Truck, Search, Camera, ScanLine,
  FileText, CheckCheck, Download, FlaskConical,
  Clock, TrendingUp, Hash, RotateCcw, AlertTriangle, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRefresh } from '../../contexts/RefreshContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PickModal } from '../../components/fulfillment/PickModal';
import { BarcodeScannerModal } from '../../components/fulfillment/BarcodeScannerModal';
import { LabInvoiceModal } from '../../components/fulfillment/LabInvoiceModal';
import { PackedExportModal } from '../../components/fulfillment/PackedExportModal';
import { STATUS_CONFIG } from './orders/types';
import { buildInvoiceHtml, buildPackingSlipHtml } from './orders/orderDetail/InvoiceTemplate';
import {
  fetchStoreProfile, fetchFifoLotsForItems,
  fetchOrderPrescriptions, fetchPackagingItems,
} from './orders/orderDetail/service';
import type { OrderDetail, OrderItem, OrderPrescription, PackagingItem } from './orders/orderDetail/types';

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
  stock_shortage: boolean;
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
  const navigate = useNavigate();
  const { lastRefreshed } = useRefresh();
  const { user, canDoWarehouseActions } = useAuth();
  const isWarehouseRole = canDoWarehouseActions;
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
  const [labPickOrder, setLabPickOrder] = useState<Order | null>(null);
  const [shippedRange, setShippedRange] = useState('today');
  const [processingConfirmId, setProcessingConfirmId] = useState<string | null>(null);

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
          stock_shortage,
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

  const handleCameraScan = (barcode: string) => {
    setShowScanner(false);
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

  const openPrintTab = (html: string) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const tab = window.open(url, '_blank');
    if (tab) {
      tab.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    } else {
      URL.revokeObjectURL(url);
    }
  };

  const buildOrderDetailForPrint = (order: Order): OrderDetail => ({
    id: order.id,
    order_number: order.order_number,
    woo_order_id: order.woo_order_id,
    woo_order_number: order.woo_order_number,
    order_date: order.order_date,
    created_at: order.order_date,
    cs_status: order.cs_status,
    fulfillment_status: order.fulfillment_status,
    payment_method: null,
    payment_status: '',
    payment_reference: null,
    subtotal: order.total_amount,
    discount_amount: 0,
    shipping_fee: 0,
    total_amount: order.total_amount,
    order_source: null,
    conversation_url: null,
    meta_screenshot_url: null,
    confirmation_type: null,
    courier_entry_method: null,
    late_delivery_reason: null,
    expected_delivery_date: null,
    exchange_return_id: null,
    cancellation_reason: null,
    partial_delivery_notes: null,
    notes: null,
    stock_shortage: order.stock_shortage ?? false,
    coupon_lines: null,
    fee_lines: null,
    customer_note: null,
    customer: {
      id: '',
      full_name: order.customer.full_name,
      phone_primary: order.customer.phone_primary,
      email: null,
      address_line1: order.customer.address_line1 ?? null,
      city: order.customer.city ?? null,
      district: order.customer.district ?? null,
    },
    assigned_user: null,
    confirmed_user: null,
  });

  const fetchFullOrderForPrint = async (orderId: string) => {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, order_number, woo_order_id, woo_order_number,
        order_date, created_at, cs_status, fulfillment_status,
        payment_method, payment_status, payment_reference,
        subtotal, discount_amount, shipping_fee, total_amount,
        order_source, conversation_url, meta_screenshot_url,
        confirmation_type, courier_entry_method,
        late_delivery_reason, expected_delivery_date,
        exchange_return_id, cancellation_reason, partial_delivery_notes, notes,
        coupon_lines, fee_lines, customer_note,
        customer:customers(id, full_name, phone_primary, email, address_line1, city, district),
        assigned_user:users!orders_assigned_to_fkey(id, full_name),
        confirmed_user:users!orders_confirmed_by_fkey(id, full_name)
      `)
      .eq('id', orderId)
      .maybeSingle();
    return data as OrderDetail | null;
  };

  const handlePrintInvoice = async (order: Order) => {
    const [storeProfile, prescriptions, fullItems, fullOrder] = await Promise.all([
      fetchStoreProfile(),
      fetchOrderPrescriptions(order.id),
      supabase
        .from('order_items')
        .select('id, product_id, sku, product_name, quantity, unit_price, line_total, discount_amount, pick_location, meta_data, woo_item_id')
        .eq('order_id', order.id)
        .order('created_at')
        .then(r => (r.data ?? []) as OrderItem[]),
      fetchFullOrderForPrint(order.id),
    ]);
    const orderDetail = fullOrder ?? buildOrderDetailForPrint(order);
    openPrintTab(buildInvoiceHtml(orderDetail, fullItems, prescriptions as OrderPrescription[], storeProfile));
  };

  const handlePrintPackingSlip = async (order: Order) => {
    const [storeProfile, packagingItems, fullItems, fullOrder] = await Promise.all([
      fetchStoreProfile(),
      fetchPackagingItems(order.id),
      supabase
        .from('order_items')
        .select('id, product_id, sku, product_name, quantity, unit_price, line_total, discount_amount, pick_location, meta_data, woo_item_id')
        .eq('order_id', order.id)
        .order('created_at')
        .then(r => (r.data ?? []) as OrderItem[]),
      fetchFullOrderForPrint(order.id),
    ]);
    const fifoLots = await fetchFifoLotsForItems(fullItems);
    const orderDetail = fullOrder ?? buildOrderDetailForPrint(order);
    openPrintTab(buildPackingSlipHtml(orderDetail, fullItems, packagingItems as PackagingItem[], fifoLots, storeProfile));
  };

  const handleMarkAsPrinted = async (orderId: string) => {
    await supabase.from('orders').update({ fulfillment_status: 'printed' }).eq('id', orderId);
    await supabase.from('order_activity_log').insert({ order_id: orderId, action: 'Marked as printed' });
    fetchOrders();
  };

  const handleMarkProcessing = async (orderId: string) => {
    const { count } = await supabase
      .from('order_call_log')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', orderId);
    const newStatus = (count ?? 0) > 0 ? 'new_called' : 'new_not_called';
    await supabase.from('orders').update({
      cs_status: newStatus,
      fulfillment_status: null,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);
    await supabase.from('order_picks').delete().eq('order_id', orderId);
    await supabase.from('order_items').update({ picked_quantity: 0 }).eq('order_id', orderId);
    await supabase.rpc('release_stock_reservation', { p_order_id: orderId });
    await supabase.from('order_activity_log').insert({
      order_id: orderId,
      action: `Returned to CS queue as ${newStatus === 'new_called' ? 'New & Called' : 'New Not Called'} (Mark as Processing) — pick data reset`,
    });
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

    await supabase.rpc('fulfill_stock_reservation', { p_order_id: orderId });

    await supabase.from('order_activity_log').insert({
      order_id: orderId,
      action: 'Marked as shipped - inventory deducted',
    });
    fetchOrders();
    fetchShippedOrders(shippedRange);
  };

  const handleLabPickComplete = useCallback(() => {
    setLabPickOrder(null);
    fetchOrders();
  }, [fetchOrders]);

  const handleMarkAsInLab = async (orderId: string) => {
    await supabase.from('orders').update({
      fulfillment_status: 'in_lab',
      cs_status: 'in_lab',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);
    await supabase.from('order_prescriptions').update({
      lab_status: 'in_lab',
      lab_sent_date: new Date().toISOString(),
    }).eq('order_id', orderId);
    await supabase.from('order_activity_log').insert({
      order_id: orderId,
      action: 'Marked as In Lab — prescription items sent to lab',
    });
    fetchOrders();
  };

  const isPartiallyPicked = (order: Order) => {
    if (!order.items || order.items.length === 0) return false;
    const totalPicked = order.items.reduce((s, i) => s + i.picked_quantity, 0);
    const total = order.items.reduce((s, i) => s + i.quantity, 0);
    return totalPicked > 0 && totalPicked < total;
  };

  const isFullyPicked = (order: Order) => {
    if (!order.items || order.items.length === 0) return false;
    return order.items.every(i => i.picked_quantity >= i.quantity);
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
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Fulfillment Operations</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">Warehouse: Print, Pick, Pack, Ship & Receive Returns</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowScanner(true)}
          className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Camera className="h-4 w-4 mr-1.5 sm:mr-2" />
          <span className="sm:hidden">Scan</span>
          <span className="hidden sm:inline">Open Barcode Scanner</span>
        </Button>
      </div>

      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:overflow-visible sm:pb-0">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 w-[calc(50vw-20px)] sm:w-auto bg-white rounded-xl border-2 p-3 sm:p-4 text-left transition-all hover:shadow-md ${
              activeTab === tab.key
                ? 'border-blue-500 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              {tab.icon}
              <span className="text-xs font-medium text-gray-500 leading-tight">{tab.label}</span>
            </div>
            <div className={`text-2xl sm:text-3xl font-bold ${tab.color}`}>
              {statusCounts[tab.key]}
            </div>
            <div className="text-xs text-gray-500 mt-1 hidden sm:block">{tab.sub}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-100 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search order or customer..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
            {activeTab === 'packed' && (
              <Button
                size="sm"
                onClick={() => setShowExportModal(true)}
                className="sm:hidden shrink-0 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {activeTab === 'shipped' && (
              <Select
                value={shippedRange}
                onChange={e => setShippedRange(e.target.value)}
                className="sm:hidden text-sm h-9 w-28 shrink-0"
              >
                {DATE_RANGES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 flex-1">
            <ScanLine className="h-4 w-4" />
            <span>Barcode scanner ready — Scan order barcode to start picking</span>
          </div>
          {activeTab === 'packed' && (
            <Button
              size="sm"
              onClick={() => setShowExportModal(true)}
              className="hidden sm:flex bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export Packed
            </Button>
          )}
          {activeTab === 'shipped' && (
            <div className="hidden sm:flex items-center gap-2">
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
          <div className="px-3 sm:px-5 py-3 bg-slate-50 border-b border-gray-100 flex items-center gap-4 sm:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              <span className="text-gray-500">Total:</span>
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
                onPrintPackingSlip={handlePrintPackingSlip}
                onMarkPrinted={handleMarkAsPrinted}
                onMarkProcessing={setProcessingConfirmId}
                isWarehouseRole={isWarehouseRole}
                onNavigate={(id) => navigate(`/fulfillment/orders/${id}`)}
              />
            )}
            {activeTab === 'printed' && (
              <PrintedTable
                orders={tabOrders}
                displayId={displayId}
                isPartiallyPicked={isPartiallyPicked}
                isFullyPicked={isFullyPicked}
                onPrintInvoice={handlePrintInvoice}
                onPrintPackingSlip={handlePrintPackingSlip}
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
                onMarkProcessing={setProcessingConfirmId}
                isWarehouseRole={isWarehouseRole}
                onNavigate={(id) => navigate(`/fulfillment/orders/${id}`)}
              />
            )}
            {activeTab === 'packed' && (
              <PackedTable
                orders={tabOrders}
                displayId={displayId}
                onMarkShipped={handleMarkAsShipped}
                onMarkProcessing={setProcessingConfirmId}
                isWarehouseRole={isWarehouseRole}
                onNavigate={(id) => navigate(`/fulfillment/orders/${id}`)}
              />
            )}
            {activeTab === 'send_to_lab' && (
              <SendToLabTable
                orders={tabOrders}
                displayId={displayId}
                onPrintLabInvoice={(order) => { setSelectedOrder(order); setShowLabInvoice(true); }}
                onPickForLab={(order) => setLabPickOrder(order)}
                onMarkAsInLab={handleMarkAsInLab}
                onNavigate={(id) => navigate(`/fulfillment/orders/${id}`)}
              />
            )}
            {activeTab === 'shipped' && (
              <ShippedTable
                orders={tabOrders}
                displayId={displayId}
                onNavigate={(id) => navigate(`/fulfillment/orders/${id}`)}
              />
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

      {labPickOrder && (
        <PickModal
          order={labPickOrder}
          isLabPick
          onClose={handleLabPickComplete}
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
          onScan={handleCameraScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {processingConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Return to Processing?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  This will remove the order from the fulfillment queue and return it to the CS queue. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setProcessingConfirmId(null)}
                className="ml-auto flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProcessingConfirmId(null)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white border-0"
                onClick={() => {
                  handleMarkProcessing(processingConfirmId);
                  setProcessingConfirmId(null);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotPrintedTable({
  orders,
  displayId,
  getAddress,
  onPrintInvoice,
  onPrintPackingSlip,
  onMarkPrinted,
  onMarkProcessing,
  isWarehouseRole,
  onNavigate,
}: {
  orders: Order[];
  displayId: (o: Order) => string;
  getAddress: (o: Order) => string;
  onPrintInvoice: (o: Order) => void;
  onPrintPackingSlip: (o: Order) => void;
  onMarkPrinted: (id: string) => void;
  onMarkProcessing: (id: string) => void;
  isWarehouseRole: boolean;
  onNavigate: (id: string) => void;
}) {
  return (
    <>
      <div className="sm:hidden divide-y divide-gray-100">
        {orders.map(order => (
          <div
            key={order.id}
            className={`p-4 transition-colors ${order.stock_shortage ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-orange-50'}`}
          >
            {order.stock_shortage && (
              <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-100 border border-red-200 rounded-lg px-2.5 py-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-semibold">Stock Shortage</span>
                <span className="text-red-500">— insufficient available inventory to fill this order</span>
              </div>
            )}
            <button className="w-full text-left" onClick={() => onNavigate(order.id)}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-600 text-base">{displayId(order)}</span>
                  {order.has_prescription && (
                    <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">Rx</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-900">৳{order.total_amount}</span>
              </div>
              <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
              <div className="text-sm text-gray-500">{order.customer?.phone_primary}</div>
              <div className="text-xs text-gray-400 mt-0.5">{getAddress(order)} · {order.items?.length || 0} items</div>
            </button>
            <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => onPrintInvoice(order)}
                title="Print Invoice"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 text-sm transition-colors"
              >
                <FileText className="h-4 w-4" /> Invoice
              </button>
              <button
                onClick={() => onPrintPackingSlip(order)}
                title="Print Packing Slip"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 text-sm transition-colors"
              >
                <Printer className="h-4 w-4" /> Slip
              </button>
              {isWarehouseRole && (
                <button
                  onClick={() => onMarkProcessing(order.id)}
                  title="Return to CS"
                  className="py-2.5 px-3 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-600 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0 py-2.5 h-auto"
                onClick={() => onMarkPrinted(order.id)}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Printed
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="px-5 py-3 text-left font-semibold">Order ID</th>
              <th className="px-5 py-3 text-left font-semibold">Customer</th>
              <th className="px-5 py-3 text-left font-semibold">Items</th>
              <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Total</th>
              <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Address</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => (
              <tr
                key={order.id}
                onClick={() => onNavigate(order.id)}
                className={`border-b border-gray-50 transition-colors cursor-pointer ${order.stock_shortage ? 'bg-red-50 hover:bg-red-100' : `hover:bg-orange-50 ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}`}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-blue-600">{displayId(order)}</span>
                    {order.has_prescription && (
                      <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">Rx</span>
                    )}
                    {order.stock_shortage && (
                      <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full font-semibold">
                        <AlertTriangle className="h-3 w-3" /> Shortage
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                  <div className="text-xs text-gray-500">{order.customer?.phone_primary}</div>
                </td>
                <td className="px-5 py-3 text-gray-600">{(order.items?.length || 0)} items</td>
                <td className="px-5 py-3 font-semibold text-gray-900 hidden md:table-cell">৳{order.total_amount}</td>
                <td className="px-5 py-3 text-gray-500 text-xs max-w-40 hidden lg:table-cell">{getAddress(order)}</td>
                <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => onPrintInvoice(order)} title="Print Invoice" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                      <FileText className="h-4 w-4" />
                    </button>
                    <button onClick={() => onPrintPackingSlip(order)} title="Print Packing Slip" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                      <Printer className="h-4 w-4" />
                    </button>
                    {isWarehouseRole && (
                      <button onClick={() => onMarkProcessing(order.id)} title="Return to CS" className="p-2 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors">
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0 px-3" onClick={() => onMarkPrinted(order.id)}>
                      <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark as Printed
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PrintedTable({
  orders,
  displayId,
  isPartiallyPicked,
  isFullyPicked,
  onPrintInvoice,
  onPrintPackingSlip,
  onStartPick,
  onForcePack,
  onMarkProcessing,
  isWarehouseRole,
  onNavigate,
}: {
  orders: Order[];
  displayId: (o: Order) => string;
  isPartiallyPicked: (o: Order) => boolean;
  isFullyPicked: (o: Order) => boolean;
  onPrintInvoice: (o: Order) => void;
  onPrintPackingSlip: (o: Order) => void;
  onStartPick: (o: Order) => void;
  onForcePack: (o: Order) => void;
  onMarkProcessing: (id: string) => void;
  isWarehouseRole: boolean;
  onNavigate: (id: string) => void;
}) {
  return (
    <>
      <div className="sm:hidden divide-y divide-gray-100">
        {orders.map(order => {
          const partial = isPartiallyPicked(order);
          const fullyPicked = isFullyPicked(order);
          return (
            <div key={order.id} className="p-4 hover:bg-blue-50 transition-colors">
              <button className="w-full text-left" onClick={() => onNavigate(order.id)}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-blue-600 text-base">{displayId(order)}</span>
                    {fullyPicked && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-200">Picked</span>}
                    {partial && !fullyPicked && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-200">Partial</span>}
                  </div>
                </div>
                <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                <div className="text-sm text-gray-500">{order.customer?.phone_primary}</div>
                <div className="mt-1.5 space-y-0.5">
                  {order.items?.map(item => (
                    <div key={item.id} className="text-xs text-gray-600 flex items-center gap-1.5">
                      <span>{item.quantity}x {item.product_name}</span>
                      {item.picked_quantity >= item.quantity && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Picked</span>}
                    </div>
                  ))}
                </div>
              </button>
              <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                <button onClick={() => onPrintInvoice(order)} className="py-2.5 px-3 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors">
                  <FileText className="h-4 w-4" />
                </button>
                <button onClick={() => onPrintPackingSlip(order)} className="py-2.5 px-3 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors">
                  <Printer className="h-4 w-4" />
                </button>
                {isWarehouseRole && (
                  <button onClick={() => onMarkProcessing(order.id)} className="py-2.5 px-3 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-600 transition-colors">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                {fullyPicked ? (
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0 py-2.5 h-auto" onClick={() => onForcePack(order)}>
                    <Package className="h-3.5 w-3.5 mr-1" /> Pack
                  </Button>
                ) : partial ? (
                  <>
                    <Button size="sm" onClick={() => onStartPick(order)} className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 h-auto">
                      <ScanLine className="h-3.5 w-3.5 mr-1" /> Continue
                    </Button>
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0 py-2.5 h-auto" onClick={() => onForcePack(order)}>
                      <Package className="h-3.5 w-3.5 mr-1" /> Pack
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 py-2.5 h-auto" onClick={() => onStartPick(order)}>
                    <ScanLine className="h-3.5 w-3.5 mr-1" /> Start Pick
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
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
              const fullyPicked = isFullyPicked(order);
              return (
                <tr
                  key={order.id}
                  onClick={() => onNavigate(order.id)}
                  className={`border-b border-gray-50 hover:bg-blue-50 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-blue-600">{displayId(order)}</span>
                      {fullyPicked && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-200">Picked</span>}
                      {partial && !fullyPicked && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-200">Partially Picked</span>}
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
                          {item.picked_quantity >= item.quantity && <span className="ml-1.5 bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-xs">Picked</span>}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onPrintInvoice(order)} title="Print Invoice" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                        <FileText className="h-4 w-4" />
                      </button>
                      <button onClick={() => onPrintPackingSlip(order)} title="Print Packing Slip" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                        <Printer className="h-4 w-4" />
                      </button>
                      {isWarehouseRole && (
                        <button onClick={() => onMarkProcessing(order.id)} className="p-2 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                      {fullyPicked ? (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0 px-3" onClick={() => onForcePack(order)}>
                          <Package className="h-3.5 w-3.5 mr-1" /> Pack
                        </Button>
                      ) : partial ? (
                        <>
                          <Button size="sm" onClick={() => onStartPick(order)} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3">
                            <ScanLine className="h-3.5 w-3.5 mr-1" /> Continue Pick
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0 px-3" onClick={() => onForcePack(order)}>
                            <Package className="h-3.5 w-3.5 mr-1" /> Pack
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-4" onClick={() => onStartPick(order)}>
                          <ScanLine className="h-3.5 w-3.5 mr-1.5" /> Start Pick
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
    </>
  );
}

function PackedTable({
  orders,
  displayId,
  onMarkShipped,
  onMarkProcessing,
  isWarehouseRole,
  onNavigate,
}: {
  orders: Order[];
  displayId: (o: Order) => string;
  onMarkShipped: (id: string) => void;
  onMarkProcessing: (id: string) => void;
  isWarehouseRole: boolean;
  onNavigate: (id: string) => void;
}) {
  return (
    <>
      <div className="sm:hidden divide-y divide-gray-100">
        {orders.map(order => (
          <div key={order.id} className="p-4 hover:bg-green-50 transition-colors">
            <button className="w-full text-left" onClick={() => onNavigate(order.id)}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-blue-600 text-base">{displayId(order)}</span>
                <span className="text-sm font-semibold text-gray-900">৳{order.total_amount}</span>
              </div>
              <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
              <div className="text-sm text-gray-500">{order.customer?.phone_primary}</div>
              {order.courier_info?.courier_company && (
                <div className="text-xs text-gray-400 mt-0.5 capitalize">{order.courier_info.courier_company}
                  {order.courier_info.tracking_number && <span className="font-mono ml-1">· {order.courier_info.tracking_number}</span>}
                </div>
              )}
              {order.packed_at && (
                <div className="text-xs text-gray-400 mt-0.5">
                  Packed: {new Date(order.packed_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              )}
            </button>
            <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
              {isWarehouseRole && (
                <button onClick={() => onMarkProcessing(order.id)} className="py-2.5 px-3 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-600 transition-colors">
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <Button size="sm" className="flex-1 bg-slate-700 hover:bg-slate-800 text-white border-0 py-2.5 h-auto" onClick={() => onMarkShipped(order.id)}>
                <Truck className="h-3.5 w-3.5 mr-1.5" /> Mark as Shipped
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="px-5 py-3 text-left font-semibold">Order ID</th>
              <th className="px-5 py-3 text-left font-semibold">Customer</th>
              <th className="px-5 py-3 text-left font-semibold">Items</th>
              <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Total</th>
              <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Courier</th>
              <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Packed At</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => (
              <tr
                key={order.id}
                onClick={() => onNavigate(order.id)}
                className={`border-b border-gray-50 hover:bg-green-50 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
              >
                <td className="px-5 py-3 font-semibold text-blue-600">{displayId(order)}</td>
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                  <div className="text-xs text-gray-500">{order.customer?.phone_primary}</div>
                </td>
                <td className="px-5 py-3 text-gray-600 text-xs">
                  {order.items?.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
                </td>
                <td className="px-5 py-3 font-semibold text-gray-900 hidden md:table-cell">৳{order.total_amount}</td>
                <td className="px-5 py-3 hidden lg:table-cell">
                  {order.courier_info?.courier_company ? (
                    <span className="capitalize text-gray-700">{order.courier_info.courier_company}</span>
                  ) : <span className="text-gray-400">—</span>}
                  {order.courier_info?.tracking_number && (
                    <div className="text-xs text-gray-400 font-mono">{order.courier_info.tracking_number}</div>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs hidden lg:table-cell">
                  {order.packed_at ? new Date(order.packed_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </td>
                <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    {isWarehouseRole && (
                      <button onClick={() => onMarkProcessing(order.id)} className="p-2 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors">
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    <Button size="sm" className="bg-slate-700 hover:bg-slate-800 text-white border-0 px-3" onClick={() => onMarkShipped(order.id)}>
                      <Truck className="h-3.5 w-3.5 mr-1" /> Mark Shipped
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SendToLabTable({
  orders,
  displayId,
  onPrintLabInvoice,
  onPickForLab,
  onMarkAsInLab,
  onNavigate,
}: {
  orders: Order[];
  displayId: (o: Order) => string;
  onPrintLabInvoice: (o: Order) => void;
  onPickForLab: (o: Order) => void;
  onMarkAsInLab: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  return (
    <>
      <div className="sm:hidden divide-y divide-gray-100">
        {orders.map(order => (
          <div key={order.id} className="p-4 hover:bg-teal-50 transition-colors">
            <button className="w-full text-left" onClick={() => onNavigate(order.id)}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-blue-600 text-base">{displayId(order)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.fulfillment_status === 'in_lab' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                  {order.fulfillment_status === 'in_lab' ? 'In Lab' : 'Send to Lab'}
                </span>
              </div>
              <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
              <div className="text-sm text-gray-500">{order.customer?.phone_primary}</div>
              <div className="text-xs text-gray-400 mt-1">
                {order.items?.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
              </div>
            </button>
            <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
              <Button size="sm" variant="outline" onClick={() => onPrintLabInvoice(order)} className="flex-1 py-2.5 h-auto">
                <FileText className="h-3.5 w-3.5 mr-1.5" /> Lab Invoice
              </Button>
              {order.fulfillment_status !== 'in_lab' && (
                <>
                  <Button size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white border-0 py-2.5 h-auto" onClick={() => onPickForLab(order)}>
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Pick for Lab
                  </Button>
                  <Button size="sm" className="flex-1 bg-slate-600 hover:bg-slate-700 text-white border-0 py-2.5 h-auto" onClick={() => onMarkAsInLab(order.id)}>
                    <FlaskConical className="h-3.5 w-3.5 mr-1.5" /> Mark In Lab
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm min-w-[460px]">
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
                onClick={() => onNavigate(order.id)}
                className={`border-b border-gray-50 hover:bg-teal-50 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
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
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.fulfillment_status === 'in_lab' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                    {order.fulfillment_status === 'in_lab' ? 'In Lab' : 'Send to Lab'}
                  </span>
                </td>
                <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onPrintLabInvoice(order)} className="px-3">
                      <FileText className="h-3.5 w-3.5 mr-1" /> Lab Invoice
                    </Button>
                    {order.fulfillment_status !== 'in_lab' && (
                      <>
                        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white border-0 px-3" onClick={() => onPickForLab(order)}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Pick for Lab
                        </Button>
                        <Button size="sm" className="bg-slate-600 hover:bg-slate-700 text-white border-0 px-3" onClick={() => onMarkAsInLab(order.id)}>
                          <FlaskConical className="h-3.5 w-3.5 mr-1" /> Mark In Lab
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ShippedTable({
  orders,
  displayId,
  onNavigate,
}: {
  orders: Order[];
  displayId: (o: Order) => string;
  onNavigate: (id: string) => void;
}) {
  return (
    <>
      <div className="sm:hidden divide-y divide-gray-100">
        {orders.map(order => {
          const statusCfg = STATUS_CONFIG[order.cs_status];
          return (
            <button
              key={order.id}
              className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
              onClick={() => onNavigate(order.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-blue-600 text-base">{displayId(order)}</span>
                <span className="text-sm font-semibold text-gray-900">৳{order.total_amount}</span>
              </div>
              <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
              <div className="text-sm text-gray-500">{order.customer?.phone_primary}</div>
              <div className="flex items-center gap-2 mt-1.5">
                {statusCfg ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}>
                    {statusCfg.label}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 capitalize">{order.cs_status}</span>
                )}
                {order.courier_info?.courier_company && (
                  <span className="text-xs text-gray-400 capitalize">{order.courier_info.courier_company}</span>
                )}
                {order.shipped_at && (
                  <span className="text-xs text-gray-400">
                    {new Date(order.shipped_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="px-5 py-3 text-left font-semibold">Order ID</th>
              <th className="px-5 py-3 text-left font-semibold">Customer</th>
              <th className="px-5 py-3 text-left font-semibold">Items</th>
              <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Total</th>
              <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Courier</th>
              <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Shipped At</th>
              <th className="px-5 py-3 text-left font-semibold">Order Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => {
              const statusCfg = STATUS_CONFIG[order.cs_status];
              return (
                <tr
                  key={order.id}
                  onClick={() => onNavigate(order.id)}
                  className={`border-b border-gray-50 hover:bg-slate-50 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                >
                  <td className="px-5 py-3 font-semibold text-blue-600">{displayId(order)}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                    <div className="text-xs text-gray-500">{order.customer?.phone_primary}</div>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-600">{order.items?.length || 0} item(s)</td>
                  <td className="px-5 py-3 font-semibold text-gray-900 hidden md:table-cell">৳{order.total_amount}</td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    {order.courier_info?.courier_company ? (
                      <div>
                        <span className="capitalize text-gray-700">{order.courier_info.courier_company}</span>
                        {order.courier_info.tracking_number && (
                          <div className="text-xs text-gray-400 font-mono">{order.courier_info.tracking_number}</div>
                        )}
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs hidden lg:table-cell">
                    {order.shipped_at ? new Date(order.shipped_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
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
    </>
  );
}
