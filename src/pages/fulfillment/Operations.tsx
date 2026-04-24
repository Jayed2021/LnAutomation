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
import { getAppSetting } from '../../lib/appSettings';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PickModal } from '../../components/fulfillment/PickModal';
import { BarcodeScannerModal } from '../../components/fulfillment/BarcodeScannerModal';
import { LabInvoiceModal } from '../../components/fulfillment/LabInvoiceModal';
import { PackedExportModal } from '../../components/fulfillment/PackedExportModal';
import { DispatchPackagingModal } from '../../components/fulfillment/DispatchPackagingModal';
import { STATUS_CONFIG } from './orders/types';
import { buildInvoiceHtml, buildPackingSlipHtml } from './orders/orderDetail/InvoiceTemplate';
import {
  fetchStoreProfile, fetchFifoLotsForItems,
  fetchOrderPrescriptions, fetchPackagingItems, fetchDefaultPackagingWithPrice,
} from './orders/orderDetail/service';
import type { OrderDetail, OrderItem, OrderPrescription, PackagingItem } from './orders/orderDetail/types';
import { NotPrintedTable } from './operations/NotPrintedTable';
import { PrintedTable } from './operations/PrintedTable';
import { PackedTable } from './operations/PackedTable';
import { SendToLabTable } from './operations/SendToLabTable';
import { ShippedTable } from './operations/ShippedTable';
import type { OperationsOrder, TabKey } from './operations/types';

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
  const { canDoWarehouseActions } = useAuth();
  const isWarehouseRole = canDoWarehouseActions;
  const [activeTab, setActiveTab] = useState<TabKey>('not_printed');
  const [orders, setOrders] = useState<OperationsOrder[]>([]);
  const [shippedOrders, setShippedOrders] = useState<OperationsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OperationsOrder | null>(null);
  const [showPickModal, setShowPickModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showLabInvoice, setShowLabInvoice] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [labPickOrder, setLabPickOrder] = useState<OperationsOrder | null>(null);
  const [shippedRange, setShippedRange] = useState('today');
  const [processingConfirmId, setProcessingConfirmId] = useState<string | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [packagingDispatchedToday, setPackagingDispatchedToday] = useState(false);
  const [dispatchGateEnabled, setDispatchGateEnabled] = useState(true);
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);

  const statusCounts = {
    not_printed: orders.filter(o => o.fulfillment_status === 'not_printed').length,
    printed: orders.filter(o => o.fulfillment_status === 'printed').length,
    packed: orders.filter(o => o.fulfillment_status === 'packed').length,
    send_to_lab: orders.filter(o => o.fulfillment_status === 'send_to_lab').length,
    shipped: shippedOrders.length,
  };

  const checkDispatchStatus = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from('packaging_dispatch_logs')
      .select('id', { count: 'exact', head: true })
      .eq('dispatch_date', today);
    setPackagingDispatchedToday((count ?? 0) > 0);
  }, []);

  const loadDispatchGateSetting = useCallback(async () => {
    const val = await getAppSetting<boolean>('require_packaging_dispatch_gate');
    setDispatchGateEnabled(val !== false);
  }, []);

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

      setOrders(formatted as OperationsOrder[]);
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
        })) as OperationsOrder[]
      );
    } catch (err) {
      console.error('Error fetching shipped orders:', err);
    }
  }, []);

  useEffect(() => {
    checkDispatchStatus();
    loadDispatchGateSetting();
  }, [checkDispatchStatus, loadDispatchGateSetting]);

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'packaging_dispatch_logs' }, () => {
        checkDispatchStatus();
      })
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, [fetchOrders, fetchShippedOrders, shippedRange, checkDispatchStatus]);

  const handleCameraScan = (barcode: string) => {
    setShowScanner(false);

    const allOrders = [...orders, ...shippedOrders];
    const matched = allOrders.find(o =>
      o.order_number === barcode ||
      o.woo_order_number === barcode ||
      String(o.woo_order_id) === barcode
    );

    if (matched) {
      const status = matched.fulfillment_status as TabKey;
      const tabKey: TabKey = (status === 'in_lab' ? 'send_to_lab' : status) as TabKey;
      setSearchQuery(matched.woo_order_number ?? matched.order_number);
      setActiveTab(tabKey);

      if (matched.fulfillment_status === 'printed') {
        setSelectedOrder(matched);
        setShowPickModal(true);
      }
    } else {
      setSearchQuery(barcode);
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

  const buildOrderDetailForPrint = (order: OperationsOrder): OrderDetail => ({
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

  const handlePrintInvoice = async (order: OperationsOrder) => {
    const [storeProfile, prescriptions, fullOrder, packagingItems, defaultPkg] = await Promise.all([
      fetchStoreProfile(),
      fetchOrderPrescriptions(order.id),
      fetchFullOrderForPrint(order.id),
      fetchPackagingItems(order.id),
      fetchDefaultPackagingWithPrice(),
    ]);
    const { data: rawItems } = await supabase
      .from('order_items')
      .select('id, product_id, sku, product_name, quantity, picked_quantity, unit_price, line_total, discount_amount, pick_location, meta_data, woo_item_id, product:products(selling_price)')
      .eq('order_id', order.id)
      .order('created_at');
    const fullItems = ((rawItems ?? []) as any[]).map(row => ({
      ...row,
      regular_price: row.product?.selling_price ?? null,
      product: undefined,
    })) as import('./orders/orderDetail/types').OrderItem[];
    const fifoLots = await fetchFifoLotsForItems(fullItems);
    const orderDetail = fullOrder ?? buildOrderDetailForPrint(order);
    openPrintTab(buildInvoiceHtml(orderDetail, fullItems, prescriptions as OrderPrescription[], storeProfile, fifoLots, packagingItems as PackagingItem[], defaultPkg));
  };

  const handlePrintPackingSlip = async (order: OperationsOrder) => {
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
    await supabase.from('order_activity_log').insert({
      order_id: orderId,
      action: `Returned to CS queue as ${newStatus === 'new_called' ? 'New & Called' : 'New Not Called'} (Mark as Processing) — pick data reset`,
    });
    fetchOrders();
  };

  const handleMarkAsShipped = async (orderId: string) => {
    setShippingOrderId(orderId);
    try {
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
    } finally {
      setShippingOrderId(null);
    }
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

  const isPartiallyPicked = (order: OperationsOrder) => {
    if (!order.items || order.items.length === 0) return false;
    const totalPicked = order.items.reduce((s, i) => s + i.picked_quantity, 0);
    const total = order.items.reduce((s, i) => s + i.quantity, 0);
    return totalPicked > 0 && totalPicked < total;
  };

  const isFullyPicked = (order: OperationsOrder) => {
    if (!order.items || order.items.length === 0) return false;
    return order.items.every(i => i.picked_quantity >= i.quantity);
  };

  const displayId = (order: OperationsOrder) =>
    order.woo_order_number ? `#${order.woo_order_number}` : order.order_number;

  const getAddress = (order: OperationsOrder) => {
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
              <>
                <Button
                  size="sm"
                  onClick={() => setShowDispatchModal(true)}
                  className={`sm:hidden shrink-0 relative border ${packagingDispatchedToday || !dispatchGateEnabled ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'}`}
                >
                  <Package className="h-4 w-4" />
                  {!packagingDispatchedToday && dispatchGateEnabled && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowExportModal(true)}
                  className="sm:hidden shrink-0 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
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
            <div className="hidden sm:flex items-center gap-2">
              <div className="relative">
                <Button
                  size="sm"
                  onClick={() => setShowDispatchModal(true)}
                  className={`border ${packagingDispatchedToday || !dispatchGateEnabled ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900' : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'}`}
                >
                  <Package className="h-4 w-4 mr-1.5" />
                  Dispatch Packaging
                </Button>
                {!packagingDispatchedToday && dispatchGateEnabled && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />
                )}
              </div>
              <Button
                size="sm"
                onClick={() => setShowExportModal(true)}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Export Packed
              </Button>
            </div>
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
            {activeTab === 'not_printed' && (
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
                packagingDispatchedToday={packagingDispatchedToday}
                gateEnabled={dispatchGateEnabled}
                shippingOrderId={shippingOrderId}
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

      {showDispatchModal && (
        <DispatchPackagingModal
          onClose={() => setShowDispatchModal(false)}
          onDispatched={() => {
            setShowDispatchModal(false);
            checkDispatchStatus();
          }}
          currentUser={undefined}
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
