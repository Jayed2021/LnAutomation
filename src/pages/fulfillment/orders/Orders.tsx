import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Calendar, Eye, Users, TrendingUp, Package, Truck, Download,
  ChevronDown, Trash2, AlertTriangle, FlaskConical, CheckSquare, X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { OrderListItem, STATUS_CONFIG, CsStatus } from './types';
import { StatusBadge } from './StatusBadge';
import { PullOrderModal } from './PullOrderModal';

type DateRange = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'all_time';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_quarter: 'This Quarter',
  all_time: 'All Time',
};

function getDateRange(range: DateRange): { start: Date | null; end: Date | null } {
  if (range === 'all_time') return { start: null, end: null };

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
  { key: 'cancelled', label: 'CBD' },
];

const TAB_STATUSES: Record<Tab, string[]> = {
  all: [],
  needs_action: ['new_not_called', 'new_called'],
  scheduled: ['late_delivery', 'awaiting_payment'],
  in_progress: ['exchange', 'not_printed', 'printed', 'packed'],
  lab_orders: ['send_to_lab', 'in_lab'],
  shipped: [],
  cancelled: ['cancelled', 'refund'],
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

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [showPullModal, setShowPullModal] = useState(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; numbers: string[] } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showBulkStatusDropdown, setShowBulkStatusDropdown] = useState(false);
  const [bulkStatusChanging, setBulkStatusChanging] = useState(false);

  const { startIso, endIso } = useMemo(() => getStableDateStrings(dateRange), [dateRange]);
  const { start, end } = useMemo(() => getDateRange(dateRange), [dateRange]);

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
          confirmed_user:users!orders_confirmed_by_fkey(id, full_name)
        `)
        .order('order_date', { ascending: false });

      if (startIso) query = query.gte('order_date', startIso);
      if (endIso) query = query.lte('order_date', endIso);

      if (assignedToMe && user) {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders((data as any[]) || []);
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
  }, [activeTab, dateRange, searchQuery, statusFilter]);

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

  const totalValue = filtered.reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const avgValue = filtered.length > 0 ? totalValue / filtered.length : 0;
  const shippedCount = orders.filter(o => !!o.shipped_at).length;

  const formatAmount = (v: number) => `৳${v.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(o => selectedIds.has(o.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(o => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openDeleteSingle = (e: React.MouseEvent, order: OrderListItem) => {
    e.stopPropagation();
    setDeleteTarget({
      ids: [order.id],
      numbers: [`#${order.woo_order_id ?? order.order_number} (${order.order_number})`],
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage customer orders from confirmation to shipment</p>
      </div>

      {/* Date Range Bar */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-3.5 flex items-center gap-4">
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="relative">
          <button
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className="flex items-center gap-2 text-sm font-medium text-gray-800 hover:text-gray-900"
          >
            <span className="text-gray-500">Date Range:</span>
            <span>{DATE_RANGE_LABELS[dateRange]}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {showDateDropdown && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
              {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(key => (
                <button
                  key={key}
                  onClick={() => { setDateRange(key); setShowDateDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${dateRange === key ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                >
                  {DATE_RANGE_LABELS[key]}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="text-sm text-gray-500">{start && end ? formatDateLabel(start, end) : 'Showing all orders'}</span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Orders", sublabel: `${activeTab === 'all' ? 'All' : DATE_RANGE_LABELS[dateRange]} orders`, value: filtered.length, icon: <Package className="w-5 h-5 text-blue-500" />, format: (v: number) => v.toString() },
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

          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors min-w-[140px] justify-between"
            >
              <span>{statusFilter ? (STATUS_CONFIG[statusFilter]?.label ?? statusFilter) : 'All Statuses'}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 max-h-64 overflow-y-auto">
                <button
                  onClick={() => { setStatusFilter(''); setShowStatusDropdown(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                >
                  All Statuses
                </button>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => { setStatusFilter(key); setShowStatusDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${statusFilter === key ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assigned to Me */}
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

          {/* Pull Order */}
          <button
            onClick={() => setShowPullModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Pull by WC ID
          </button>
        </div>

        {/* Bulk Action Bar */}
        {someSelected && (
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
              <CheckSquare className="w-4 h-4" />
              {selectedIds.size} order{selectedIds.size > 1 ? 's' : ''} selected
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {/* Bulk Status Change */}
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

              {/* Bulk Delete */}
              <button
                onClick={openDeleteBulk}
                className="flex items-center gap-2 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-700 bg-white hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>

              {/* Clear Selection */}
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
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Order Date</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Order ID</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Customer</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Total</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Assigned Person</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-gray-500">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium text-gray-400">No orders found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or date range</p>
                  </td>
                </tr>
              ) : (
                filtered.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => { setHighlightedOrderId(null); navigate(`/fulfillment/orders/${order.id}`); }}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      selectedIds.has(order.id)
                        ? 'bg-blue-50/60'
                        : highlightedOrderId === order.id
                        ? 'bg-green-50 hover:bg-green-50/80'
                        : 'hover:bg-blue-50/30'
                    }`}
                  >
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(order.order_date)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            #{order.woo_order_id ?? order.order_number}
                          </div>
                        </div>
                        {order.has_prescription && (
                          <div
                            title="This order has prescription / lens options attached"
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 border border-amber-300 rounded-full text-amber-700 shrink-0"
                          >
                            <FlaskConical className="w-3 h-3" />
                            <span className="text-xs font-semibold">Rx</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">{order.customer?.full_name ?? '—'}</div>
                      <div className="text-xs text-gray-500">{order.customer?.phone_primary ?? '—'}</div>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      ৳{(order.total_amount ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={order.cs_status} />
                      {order.cs_status === 'late_delivery' && order.expected_delivery_date && (
                        <div className="text-xs text-amber-600 mt-1">
                          Due: {formatDate(order.expected_delivery_date)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {order.assigned_user ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${avatarColor(order.assigned_user.full_name)}`}>
                            {getInitials(order.assigned_user.full_name)}
                          </div>
                          <div>
                            <div className="text-sm text-gray-800">{order.assigned_user.full_name}</div>
                            {order.confirmed_user && order.confirmed_user.id !== order.assigned_user.id && (
                              <div className="text-xs text-amber-600">Confirmed by: {order.confirmed_user.full_name}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/fulfillment/orders/${order.id}`); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        <button
                          onClick={e => openDeleteSingle(e, order)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
