import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Calendar, Users, TrendingUp, Package, Truck, Download,
  ChevronDown, Trash2, AlertTriangle, FlaskConical, CheckSquare, X,
  ChevronLeft, ChevronRight, ChevronUp, Clock, CheckCircle2, AlertCircle, Lock
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { OrderListItem, STATUS_CONFIG, CsStatus } from './types';
import { StatusBadge } from './StatusBadge';
import { PullOrderModal } from './PullOrderModal';

type DateRange = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'all_time' | 'custom';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_quarter: 'This Quarter',
  all_time: 'All Time',
  custom: 'Custom Range',
};

const PAGE_SIZE = 50;

function getDateRange(range: DateRange): { start: Date | null; end: Date | null } {
  if (range === 'all_time' || range === 'custom') return { start: null, end: null };

  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_week': {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'this_month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_month':
      start.setMonth(start.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      start.setMonth(quarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
  }
  return { start, end };
}

function getStableDateStrings(range: DateRange): { startIso: string | null; endIso: string | null } {
  const { start, end } = getDateRange(range);
  return {
    startIso: start ? start.toISOString() : null,
    endIso: end ? end.toISOString() : null,
  };
}

function toLocalDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(start: Date | null, end: Date | null): string {
  if (!start || !end) return 'All Time';
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

type Tab = 'all' | 'needs_action' | 'scheduled' | 'in_progress' | 'lab_orders' | 'shipped' | 'cancelled';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All Orders' },
  { key: 'needs_action', label: 'Needs Action' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'lab_orders', label: 'Lab Orders' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'cancelled', label: 'Cancelled' },
];

const TAB_STATUSES: Record<Tab, string[]> = {
  all: [],
  needs_action: ['new_not_called', 'new_called'],
  scheduled: ['late_delivery', 'awaiting_payment'],
  in_progress: ['exchange', 'not_printed', 'printed', 'packed'],
  lab_orders: ['send_to_lab', 'in_lab'],
  shipped: [],
  cancelled: ['cancelled_cbd', 'cancelled_cad', 'refund', 'exchange_returnable'],
};

const BULK_STATUSES: CsStatus[] = [
  'new_not_called', 'new_called', 'awaiting_payment',
  'late_delivery', 'send_to_lab', 'in_lab', 'not_printed', 'printed',
  'packed', 'shipped', 'delivered', 'cancelled',
];

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500',
  'bg-teal-500', 'bg-orange-500', 'bg-cyan-500',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const DELIVERY_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  'Pending':                   { label: 'Pending',              color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  icon: <Clock className="w-3 h-3" /> },
  'Order Created':             { label: 'Created',              color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  icon: <Clock className="w-3 h-3" /> },
  'Order Updated':             { label: 'Updated',              color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: <Clock className="w-3 h-3" /> },
  'Pickup Requested':          { label: 'Pickup Req.',          color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: <Truck className="w-3 h-3" /> },
  'Assigned For Pickup':       { label: 'Pickup Assigned',      color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: <Truck className="w-3 h-3" /> },
  'Pickup':                    { label: 'Picked Up',            color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300',   icon: <Truck className="w-3 h-3" /> },
  'Pickup Failed':             { label: 'Pickup Failed',        color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: <AlertCircle className="w-3 h-3" /> },
  'Pickup Cancelled':          { label: 'Pickup Cancelled',     color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: <AlertCircle className="w-3 h-3" /> },
  'At the Sorting Hub':        { label: 'At Hub',               color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300',   icon: <Truck className="w-3 h-3" /> },
  'In Transit':                { label: 'In Transit',           color: 'text-blue-700',   bg: 'bg-blue-100',  border: 'border-blue-300',   icon: <Truck className="w-3 h-3" /> },
  'Received at Last Mile Hub': { label: 'Last Mile Hub',        color: 'text-blue-800',   bg: 'bg-blue-100',  border: 'border-blue-400',   icon: <Truck className="w-3 h-3" /> },
  'Assigned for Delivery':     { label: 'Out for Delivery',     color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200',   icon: <Truck className="w-3 h-3" /> },
  'Delivered':                 { label: 'Delivered',            color: 'text-green-700',  bg: 'bg-green-100', border: 'border-green-300',  icon: <CheckCircle2 className="w-3 h-3" /> },
  'Partial Delivery':          { label: 'Partial Delivery',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  'Return':                    { label: 'Returned',             color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: <Package className="w-3 h-3" /> },
  'Delivery Failed':           { label: 'Delivery Failed',      color: 'text-red-700',    bg: 'bg-red-100',   border: 'border-red-300',    icon: <AlertCircle className="w-3 h-3" /> },
  'On Hold':                   { label: 'On Hold',              color: 'text-amber-800',  bg: 'bg-amber-100', border: 'border-amber-300',  icon: <AlertCircle className="w-3 h-3" /> },
  'Payment Invoice':           { label: 'Paid',                 color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  icon: <CheckCircle2 className="w-3 h-3" /> },
  'Paid Return':               { label: 'Paid Return',          color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: <Package className="w-3 h-3" /> },
  'Exchange':                  { label: 'Exchange',             color: 'text-blue-800',   bg: 'bg-blue-100',  border: 'border-blue-300',   icon: <Package className="w-3 h-3" /> },
};

function DeliveryStatusBadge({ order }: { order: OrderListItem }) {
  const rawStatus = order.courier_info?.courier_status ?? null;
  const isShipped = !!order.shipped_at;

  if (!isShipped) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border text-gray-500 bg-gray-50 border-gray-200">
        Not Shipped
      </span>
    );
  }

  const cfg = rawStatus
    ? (DELIVERY_STATUS_CONFIG[rawStatus] ?? { label: rawStatus, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', icon: null })
    : { label: 'Shipped', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: <Truck className="w-3 h-3" /> };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

async function deleteOrder(id: string) {
  await supabase.from('order_activity_log').delete().eq('order_id', id);
  await supabase.from('order_call_log').delete().eq('order_id', id);
  await supabase.from('order_notes').delete().eq('order_id', id);
  await supabase.from('order_prescriptions').delete().eq('order_id', id);
  await supabase.from('order_packaging_items').delete().eq('order_id', id);
  await supabase.from('order_courier_info').delete().eq('order_id', id);
  await supabase.from('order_items').delete().eq('order_id', id);
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw error;
}

interface DeleteConfirmModalProps {
  count: number;
  orderNumbers: string[];
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function DeleteConfirmModal({ count, orderNumbers, onConfirm, onCancel, loading }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Delete {count === 1 ? 'Order' : `${count} Orders`}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              This action cannot be undone. All associated data (items, notes, activity logs) will be permanently removed.
            </p>
          </div>
        </div>
        {count <= 5 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-5">
            {orderNumbers.map(n => (
              <div key={n} className="text-sm text-gray-700 font-medium">{n}</div>
            ))}
          </div>
        )}
        {count > 5 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-5 text-sm text-red-700 font-medium">
            {count} orders selected for deletion
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {loading ? 'Deleting...' : `Delete ${count === 1 ? 'Order' : `${count} Orders`}`}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CustomerGroup {
  phone: string;
  customerName: string;
  orders: OrderListItem[];
}

function groupOrdersByPhone(orders: OrderListItem[]): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>();
  for (const order of orders) {
    const phone = order.customer?.phone_primary ?? '';
    if (!map.has(phone)) {
      map.set(phone, {
        phone,
        customerName: order.customer?.full_name ?? '—',
        orders: [],
      });
    }
    map.get(phone)!.orders.push(order);
  }
  return Array.from(map.values());
}

const VALID_TABS: Tab[] = ['all', 'needs_action', 'scheduled', 'in_progress', 'lab_orders', 'shipped', 'cancelled'];
const VALID_DATE_RANGES: DateRange[] = ['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'this_quarter', 'all_time', 'custom'];

export default function Orders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, canDeleteOrders } = useAuth();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const paramTab = searchParams.get('tab') as Tab | null;
  const paramDateRange = searchParams.get('dateRange') as DateRange | null;
  const paramSearch = searchParams.get('search') ?? '';
  const paramStatus = searchParams.get('status') ?? '';
  const paramAssigned = searchParams.get('assignedToMe') === '1';
  const paramPage = parseInt(searchParams.get('page') ?? '1', 10);
  const paramCustomStart = searchParams.get('customStart') ?? toLocalDateInput(new Date());
  const paramCustomEnd = searchParams.get('customEnd') ?? toLocalDateInput(new Date());

  const activeTab: Tab = paramTab && VALID_TABS.includes(paramTab) ? paramTab : 'all';
  const dateRange: DateRange = paramDateRange && VALID_DATE_RANGES.includes(paramDateRange) ? paramDateRange : 'all_time';
  const searchQuery = paramSearch;
  const statusFilter = paramStatus;
  const assignedToMe = paramAssigned;
  const currentPage = isNaN(paramPage) || paramPage < 1 ? 1 : paramPage;
  const customStart = paramCustomStart;
  const customEnd = paramCustomEnd;

  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPullModal, setShowPullModal] = useState(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setActiveTab = useCallback((tab: Tab) => {
    updateParams({ tab: tab === 'all' ? null : tab, page: null });
  }, [updateParams]);

  const setDateRange = useCallback((range: DateRange) => {
    updateParams({ dateRange: range === 'all_time' ? null : range });
  }, [updateParams]);

  const setSearchQuery = useCallback((q: string) => {
    updateParams({ search: q || null, page: null });
  }, [updateParams]);

  const setStatusFilter = useCallback((s: string) => {
    updateParams({ status: s || null, page: null });
  }, [updateParams]);

  const setAssignedToMe = useCallback((v: boolean) => {
    updateParams({ assignedToMe: v ? '1' : null, page: null });
  }, [updateParams]);

  const setCurrentPage = useCallback((pageOrFn: number | ((p: number) => number)) => {
    const nextPage = typeof pageOrFn === 'function' ? pageOrFn(currentPage) : pageOrFn;
    updateParams({ page: nextPage === 1 ? null : String(nextPage) });
  }, [updateParams, currentPage]);

  const setCustomStart = useCallback((v: string) => {
    updateParams({ customStart: v });
  }, [updateParams]);

  const setCustomEnd = useCallback((v: string) => {
    updateParams({ customEnd: v });
  }, [updateParams]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; numbers: string[] } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showBulkStatusDropdown, setShowBulkStatusDropdown] = useState(false);
  const [bulkStatusChanging, setBulkStatusChanging] = useState(false);
  const [lockedOrderIds, setLockedOrderIds] = useState<Set<string>>(new Set());

  const { startIso, endIso } = useMemo(() => {
    if (dateRange === 'custom') {
      const start = customStart ? new Date(customStart + 'T00:00:00') : null;
      const end = customEnd ? new Date(customEnd + 'T23:59:59') : null;
      return {
        startIso: start ? start.toISOString() : null,
        endIso: end ? end.toISOString() : null,
      };
    }
    return getStableDateStrings(dateRange);
  }, [dateRange, customStart, customEnd]);

  const { start, end } = useMemo(() => {
    if (dateRange === 'custom') {
      return {
        start: customStart ? new Date(customStart + 'T00:00:00') : null,
        end: customEnd ? new Date(customEnd + 'T23:59:59') : null,
      };
    }
    return getDateRange(dateRange);
  }, [dateRange, customStart, customEnd]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          id, order_number, woo_order_id, woo_order_number,
          order_date, cs_status, total_amount, expected_delivery_date,
          has_prescription, shipped_at,
          customer:customers(full_name, phone_primary),
          assigned_user:users!orders_assigned_to_fkey(id, full_name),
          confirmed_user:users!orders_confirmed_by_fkey(id, full_name),
          courier_info:order_courier_info(courier_status, courier_company, tracking_number)
        `)
        .order('order_date', { ascending: false });

      if (startIso) query = query.gte('order_date', startIso);
      if (endIso) query = query.lte('order_date', endIso);

      if (assignedToMe && user) {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      const normalized = ((data as any[]) || []).map((o: any) => ({
        ...o,
        courier_info: Array.isArray(o.courier_info) ? (o.courier_info[0] ?? null) : o.courier_info,
      }));
      setOrders(normalized);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [startIso, endIso, assignedToMe, user?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, dateRange, searchQuery, statusFilter, assignedToMe, customStart, customEnd]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setShowDateDropdown(false);
      }
    }
    if (showDateDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDateDropdown]);

  useEffect(() => {
    const STALE_MS = 30000;
    const isActive = (heartbeat: string) => Date.now() - new Date(heartbeat).getTime() < STALE_MS;

    supabase
      .from('order_locks')
      .select('order_id, heartbeat_at')
      .then(({ data }) => {
        const active = new Set((data ?? []).filter(r => isActive(r.heartbeat_at)).map(r => r.order_id as string));
        setLockedOrderIds(active);
      });

    const channel = supabase
      .channel('order_locks_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_locks' }, (payload) => {
        setLockedOrderIds(prev => {
          const next = new Set(prev);
          if (payload.eventType === 'DELETE') {
            const old = payload.old as { order_id?: string };
            if (old.order_id) next.delete(old.order_id);
          } else {
            const row = payload.new as { order_id: string; heartbeat_at: string };
            if (isActive(row.heartbeat_at)) {
              next.add(row.order_id);
            } else {
              next.delete(row.order_id);
            }
          }
          return next;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleOrderImported = useCallback((orderId?: string) => {
    setDateRange('all_time');
    if (orderId) setHighlightedOrderId(orderId);
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter(order => {
    if (activeTab === 'shipped') {
      if (!order.shipped_at) return false;
    } else if (activeTab !== 'all' && TAB_STATUSES[activeTab].length > 0) {
      if (!TAB_STATUSES[activeTab].includes(order.cs_status)) return false;
    }
    if (statusFilter && order.cs_status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = order.customer?.full_name?.toLowerCase() ?? '';
      const phone = order.customer?.phone_primary?.toLowerCase() ?? '';
      const num = order.order_number?.toLowerCase() ?? '';
      const wooNum = String(order.woo_order_id ?? '').toLowerCase();
      const wooOrderNum = (order.woo_order_number ?? '').toLowerCase();
      if (!name.includes(q) && !phone.includes(q) && !num.includes(q) && !wooNum.includes(q) && !wooOrderNum.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const tabCounts = Object.fromEntries(
    TABS.map(tab => {
      if (tab.key === 'all') return [tab.key, orders.length];
      if (tab.key === 'shipped') return [tab.key, orders.filter(o => !!o.shipped_at).length];
      const statuses = TAB_STATUSES[tab.key];
      return [tab.key, orders.filter(o => statuses.includes(o.cs_status)).length];
    })
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedOrders = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const groups = useMemo(() => groupOrdersByPhone(paginatedOrders), [paginatedOrders]);

  const totalValue = filtered.reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const avgValue = filtered.length > 0 ? totalValue / filtered.length : 0;
  const shippedCount = orders.filter(o => !!o.shipped_at).length;

  const formatAmount = (v: number) => `৳${v.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const allFilteredSelected = paginatedOrders.length > 0 && paginatedOrders.every(o => selectedIds.has(o.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedOrders.map(o => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (phone: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(phone) ? next.delete(phone) : next.add(phone);
      return next;
    });
  };

  const openDeleteBulk = () => {
    const targets = filtered.filter(o => selectedIds.has(o.id));
    setDeleteTarget({
      ids: targets.map(o => o.id),
      numbers: targets.map(o => `#${o.woo_order_id ?? o.order_number}`),
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      for (const id of deleteTarget.ids) {
        await deleteOrder(id);
      }
      setSelectedIds(new Set());
      setDeleteTarget(null);
      fetchOrders();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkStatusChange = async (newStatus: CsStatus) => {
    if (selectedIds.size === 0) return;
    setBulkStatusChanging(true);
    setShowBulkStatusDropdown(false);
    try {
      const ids = Array.from(selectedIds);
      await supabase
        .from('orders')
        .update({ cs_status: newStatus, updated_at: new Date().toISOString() })
        .in('id', ids);
      setSelectedIds(new Set());
      fetchOrders();
    } catch (err) {
      console.error('Bulk status change failed:', err);
    } finally {
      setBulkStatusChanging(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const COLS = isAdmin ? 8 : 7;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage customer orders from confirmation to shipment</p>
      </div>

      {/* Date Range Bar */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-3.5 flex items-center gap-4">
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="relative" ref={dateDropdownRef}>
          <button
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className="flex items-center gap-2 text-sm font-medium text-gray-800 hover:text-gray-900"
          >
            <span className="text-gray-500">Date Range:</span>
            <span>{DATE_RANGE_LABELS[dateRange]}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {showDateDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1" style={{ minWidth: '180px' }}>
              {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).filter(k => k !== 'custom').map(key => (
                <button
                  key={key}
                  onClick={() => { setDateRange(key); if (key !== 'custom') setShowDateDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${dateRange === key ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                >
                  {DATE_RANGE_LABELS[key]}
                </button>
              ))}
              <button
                onClick={() => setDateRange('custom')}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${dateRange === 'custom' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
              >
                Custom Range
              </button>
              {dateRange === 'custom' && (
                <div className="px-4 pt-1 pb-3 border-t border-gray-100 mt-1 space-y-2" style={{ minWidth: '220px' }}>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">From</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={e => setCustomStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">To</label>
                    <input
                      type="date"
                      value={customEnd}
                      min={customStart}
                      onChange={e => setCustomEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => setShowDateDropdown(false)}
                    className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {dateRange === 'custom'
            ? (customStart && customEnd
                ? formatDateLabel(new Date(customStart + 'T00:00:00'), new Date(customEnd + 'T23:59:59'))
                : 'Select date range')
            : (start && end ? formatDateLabel(start, end) : 'Showing all orders')}
        </span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Orders", sublabel: `${activeTab === 'all' ? 'All' : DATE_RANGE_LABELS[dateRange]} orders`, value: filtered.length, icon: <Package className="w-5 h-5 text-blue-500" />, format: (v: number) => v.toString() },
          { label: 'Total Value', sublabel: `${DATE_RANGE_LABELS[dateRange]}'s revenue`, value: totalValue, icon: <TrendingUp className="w-5 h-5 text-green-500" />, format: formatAmount },
          { label: 'Avg Order Value', sublabel: 'Per order in period', value: avgValue, icon: <TrendingUp className="w-5 h-5 text-amber-500" />, format: formatAmount },
          { label: 'Shipped Orders', sublabel: `৳${(shippedCount * avgValue).toLocaleString('en-BD', { maximumFractionDigits: 0 })} total value`, value: shippedCount, icon: <Truck className="w-5 h-5 text-teal-500" />, format: (v: number) => v.toString() },
        ].map(card => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              {card.icon}
              <span className="text-sm font-medium text-gray-600">{card.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.format(card.value)}</div>
            <div className="text-xs text-gray-500 mt-1">{card.sublabel}</div>
          </div>
        ))}
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                    activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search + Filters */}
        <div className="px-5 py-4 flex flex-wrap items-center gap-3 border-b border-gray-100">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, customer name, or phone..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => setAssignedToMe(!assignedToMe)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
              assignedToMe
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Assigned to Me
          </button>

          <button
            onClick={() => setShowPullModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Pull by WC ID
          </button>
        </div>

        {/* Bulk Action Bar */}
        {isAdmin && someSelected && (
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
              <CheckSquare className="w-4 h-4" />
              {selectedIds.size} order{selectedIds.size > 1 ? 's' : ''} selected
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <button
                  onClick={() => setShowBulkStatusDropdown(!showBulkStatusDropdown)}
                  disabled={bulkStatusChanging}
                  className="flex items-center gap-2 px-3 py-2 border border-blue-200 rounded-lg text-sm text-blue-700 bg-white hover:bg-blue-50 transition-colors"
                >
                  Change Status
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showBulkStatusDropdown && (
                  <div className="absolute top-full right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 max-h-64 overflow-y-auto">
                    {BULK_STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => handleBulkStatusChange(s)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                      >
                        {STATUS_CONFIG[s]?.label ?? s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {canDeleteOrders && (
                <button
                  onClick={openDeleteBulk}
                  className="flex items-center gap-2 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-700 bg-white hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected
                </button>
              )}

              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {isAdmin && (
                  <th className="px-3 py-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                  </th>
                )}
                <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5">Order Date</th>
                <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5">Order ID</th>
                <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5">Customer Info</th>
                <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5">Total</th>
                <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5">Status</th>
                <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5">Delivery</th>
                <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: COLS }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-3.5 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLS} className="px-5 py-16 text-center text-gray-500">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium text-gray-400">No orders found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or date range</p>
                  </td>
                </tr>
              ) : (
                groups.map(group => {
                  const isGrouped = group.orders.length > 1;
                  const isCollapsed = collapsedGroups.has(group.phone);
                  const groupTotal = group.orders.reduce((s, o) => s + (o.total_amount ?? 0), 0);

                  return (
                    <React.Fragment key={group.phone}>
                      {isGrouped && (
                        <tr
                          className="bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => toggleGroup(group.phone)}
                        >
                          {isAdmin && (
                            <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={group.orders.every(o => selectedIds.has(o.id))}
                                onChange={() => {
                                  const allSelected = group.orders.every(o => selectedIds.has(o.id));
                                  setSelectedIds(prev => {
                                    const next = new Set(prev);
                                    group.orders.forEach(o => allSelected ? next.delete(o.id) : next.add(o.id));
                                    return next;
                                  });
                                }}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 cursor-pointer"
                              />
                            </td>
                          )}
                          <td colSpan={COLS - (isAdmin ? 1 : 0)} className="px-3 py-2">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 text-gray-500">
                                {isCollapsed
                                  ? <ChevronDown className="w-3.5 h-3.5" />
                                  : <ChevronUp className="w-3.5 h-3.5" />
                                }
                              </div>
                              <span className="text-xs font-semibold text-gray-800">{group.customerName}</span>
                              <span className="text-xs text-gray-500">{group.phone}</span>
                              <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full font-medium">
                                {group.orders.length} orders
                              </span>
                              <span className="text-xs font-semibold text-gray-700 ml-auto">
                                ৳{groupTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {!isCollapsed && group.orders.map(order => (
                        <tr
                          key={order.id}
                          onClick={() => { setHighlightedOrderId(null); navigate(`/fulfillment/orders/${order.id}`); }}
                          className={`border-b border-gray-100 cursor-pointer transition-colors ${
                            isGrouped ? 'bg-white' : ''
                          } ${
                            selectedIds.has(order.id)
                              ? 'bg-blue-50/60'
                              : highlightedOrderId === order.id
                              ? 'bg-green-50 hover:bg-green-50/80'
                              : 'hover:bg-blue-50/30'
                          }`}
                        >
                          {isAdmin && (
                            <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(order.id)}
                                onChange={() => toggleSelect(order.id)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className={`px-3 py-2.5 text-xs text-gray-500 ${isGrouped ? 'pl-8' : ''}`}>
                            {formatDate(order.order_date)}
                          </td>
                          <td className={`px-3 py-2.5 ${isGrouped ? '' : ''}`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-gray-900">
                                #{order.woo_order_id ?? order.order_number}
                              </span>
                              {lockedOrderIds.has(order.id) && (
                                <div title="Someone is currently viewing this order" className="shrink-0 text-amber-500">
                                  <Lock className="w-3 h-3" />
                                </div>
                              )}
                              {order.has_prescription && (
                                <div
                                  title="This order has prescription / lens options attached"
                                  className="flex items-center gap-0.5 px-1 py-0.5 bg-amber-100 border border-amber-300 rounded-full text-amber-700 shrink-0"
                                >
                                  <FlaskConical className="w-2.5 h-2.5" />
                                  <span className="text-[10px] font-semibold">Rx</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-xs font-medium text-gray-900">{order.customer?.full_name ?? '—'}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5">{order.customer?.phone_primary ?? '—'}</div>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium text-gray-900">
                            ৳{(order.total_amount ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusBadge status={order.cs_status} className="text-[11px] px-1.5 py-0.5" />
                            {order.cs_status === 'late_delivery' && order.expected_delivery_date && (
                              <div className="text-[10px] text-amber-600 mt-0.5">
                                Due: {formatDate(order.expected_delivery_date)}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <DeliveryStatusBadge order={order} />
                          </td>
                          <td className="px-3 py-2.5">
                            {order.assigned_user ? (
                              <div className="flex items-center gap-1.5">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${avatarColor(order.assigned_user.full_name)}`}>
                                  {getInitials(order.assigned_user.full_name)}
                                </div>
                                <span className="text-xs text-gray-800">{order.assigned_user.full_name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} orders
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-700 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showPullModal && (
        <PullOrderModal
          onClose={() => setShowPullModal(false)}
          onImported={handleOrderImported}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          count={deleteTarget.ids.length}
          orderNumbers={deleteTarget.numbers}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
