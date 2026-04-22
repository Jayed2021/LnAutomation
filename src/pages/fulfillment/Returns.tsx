import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PackageX, Search, Package, PackageCheck, PackageOpen,
  ClipboardList, RotateCcw, Wrench, ScanLine, AlertTriangle, MapPin, Trash2, X, Camera,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRefresh } from '../../contexts/RefreshContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ReceiveReturnModal } from '../../components/fulfillment/ReceiveReturnModal';
import { RestockModal } from '../../components/fulfillment/RestockModal';
import { QCReviewModal } from '../../components/fulfillment/QCReviewModal';
import { BarcodeScannerModal } from '../../components/fulfillment/BarcodeScannerModal';
import { ReceivePackagingModal } from '../../components/fulfillment/ReceivePackagingModal';
import { STATUS_CONFIG } from './orders/types';

interface ReturnItem {
  id: string;
  sku: string;
  quantity: number;
  qc_status: string | null;
  receive_status: string;
  hold_location_id: string | null;
  expected_barcode: string | null;
  product_id: string;
  order_item_id: string | null;
  order_item: { product_name: string; unit_price: number } | null;
  product: { name: string; sku: string } | null;
  hold_location: { code: string; name: string; location_type: string } | null;
}

interface Return {
  id: string;
  return_number: string;
  return_reason: string;
  status: string;
  refund_amount: number | null;
  refund_status: string | null;
  created_at: string;
  updated_at: string;
  order_id: string;
  exchange_order_id: string | null;
  order: { order_number: string; woo_order_id: number | null; cs_status: string; order_date: string | null } | null;
  exchange_order: { order_number: string; woo_order_id: number | null } | null;
  customer: { full_name: string; phone_primary: string | null } | null;
  items: ReturnItem[];
}

interface DateGroup {
  date: string;
  label: string;
  returns: Return[];
  totalUnits: number;
}

type FilterStatus = 'expected' | 'received' | 'qc_passed' | 'qc_failed' | 'restocked' | 'damaged';

interface StatusCard {
  key: FilterStatus;
  label: string;
  icon: React.ReactNode;
  numberColor: string;
  activeRing: string;
  activeBg: string;
}

const STATUS_CARDS: StatusCard[] = [
  {
    key: 'expected',
    label: 'Expected',
    icon: <Package className="w-5 h-5" />,
    numberColor: 'text-amber-600',
    activeRing: 'ring-2 ring-amber-400',
    activeBg: 'bg-amber-50 border-amber-300',
  },
  {
    key: 'received',
    label: 'Received',
    icon: <PackageOpen className="w-5 h-5" />,
    numberColor: 'text-blue-600',
    activeRing: 'ring-2 ring-blue-400',
    activeBg: 'bg-blue-50 border-blue-300',
  },
  {
    key: 'qc_passed',
    label: 'QC Passed',
    icon: <PackageCheck className="w-5 h-5" />,
    numberColor: 'text-green-600',
    activeRing: 'ring-2 ring-green-400',
    activeBg: 'bg-green-50 border-green-300',
  },
  {
    key: 'qc_failed',
    label: 'QC Failed',
    icon: <ClipboardList className="w-5 h-5" />,
    numberColor: 'text-red-600',
    activeRing: 'ring-2 ring-red-400',
    activeBg: 'bg-red-50 border-red-300',
  },
  {
    key: 'restocked',
    label: 'Restocked',
    icon: <RotateCcw className="w-5 h-5" />,
    numberColor: 'text-emerald-600',
    activeRing: 'ring-2 ring-emerald-400',
    activeBg: 'bg-emerald-50 border-emerald-300',
  },
  {
    key: 'damaged',
    label: 'Damaged',
    icon: <Wrench className="w-5 h-5" />,
    numberColor: 'text-gray-600',
    activeRing: 'ring-2 ring-gray-400',
    activeBg: 'bg-gray-50 border-gray-300',
  },
];

const RETURN_STATUS_LABELS: Record<string, string> = {
  expected: 'Expected',
  received: 'Received',
  qc_passed: 'QC Passed',
  qc_failed: 'QC Failed',
  restocked: 'Restocked',
  damaged: 'Damaged',
};

const ITEM_QC_BADGE: Record<string, { label: string; cls: string }> = {
  passed:  { label: 'QC Pass',  cls: 'text-green-700 bg-green-50 border-green-200' },
  failed:  { label: 'QC Fail',  cls: 'text-red-700 bg-red-50 border-red-200' },
  pending: { label: 'Pending',  cls: 'text-amber-700 bg-amber-50 border-amber-200' },
};

const ITEM_RECEIVE_BADGE: Record<string, { label: string; cls: string }> = {
  received: { label: 'Received', cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  lost:     { label: 'Lost',     cls: 'text-red-700 bg-red-50 border-red-200' },
  pending:  { label: 'Expected', cls: 'text-gray-600 bg-gray-50 border-gray-200' },
};

// Statuses where we group by updated_at (the action date) rather than created_at
const GROUP_BY_UPDATED: Set<FilterStatus> = new Set(['restocked', 'damaged']);

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-BD', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' });
}

function buildDateGroups(returns: Return[], status: FilterStatus): DateGroup[] {
  const useUpdated = GROUP_BY_UPDATED.has(status);
  const map = new Map<string, Return[]>();

  for (const r of returns) {
    const ts = useUpdated ? r.updated_at : r.created_at;
    const date = ts ? ts.slice(0, 10) : '1970-01-01';
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(r);
  }

  const groups: DateGroup[] = [];
  for (const [date, rs] of map) {
    const totalUnits = rs.reduce((sum, r) => sum + (r.items?.reduce((s, i) => s + i.quantity, 0) ?? 0), 0);
    groups.push({ date, label: formatDateLabel(date), returns: rs, totalUnits });
  }

  return groups.sort((a, b) => b.date.localeCompare(a.date));
}

interface DateGroupAccordionProps {
  group: DateGroup;
  status: FilterStatus;
  defaultOpen: boolean;
  expandedRows: Set<string>;
  deleteConfirmId: string | null;
  deleting: boolean;
  isAdmin: boolean;
  rowRefs: React.MutableRefObject<Map<string, HTMLTableRowElement>>;
  onToggleExpand: (id: string) => void;
  onReceive: (r: Return) => void;
  onQc: (r: Return) => void;
  onRestock: (r: Return) => void;
  onWriteOff: (id: string) => void;
  onDeleteConfirm: (id: string | null) => void;
  onDeleteExecute: (id: string) => void;
}

function DateGroupAccordion({
  group, status, defaultOpen,
  expandedRows, deleteConfirmId, deleting, isAdmin, rowRefs,
  onToggleExpand, onReceive, onQc, onRestock, onWriteOff, onDeleteConfirm, onDeleteExecute,
}: DateGroupAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const useUpdated = GROUP_BY_UPDATED.has(status);

  const dateColLabel = useUpdated ? 'Restocked At' : 'Received At';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-gray-400">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <span className="font-semibold text-gray-900 text-sm w-28 shrink-0">{group.label}</span>
        <div className="flex items-center gap-4 text-xs text-gray-500 flex-1">
          <span>
            <span className="font-semibold text-gray-800">{group.returns.length}</span> return{group.returns.length !== 1 ? 's' : ''}
          </span>
          {group.totalUnits > 0 && (
            <span>
              <span className="font-semibold text-gray-800">{group.totalUnits}</span> unit{group.totalUnits !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400 shrink-0">{group.date}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Return ID</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{dateColLabel}</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {group.returns.map(r => {
                const itemCount = r.items?.length ?? 0;
                const isExpanded = expandedRows.has(r.id);
                const hasLostItems = r.items?.some(i => i.receive_status === 'lost');
                const isConfirmingDelete = deleteConfirmId === r.id;
                const actionTs = useUpdated ? r.updated_at : r.created_at;

                return (
                  <>
                    <tr
                      key={r.id}
                      ref={el => {
                        if (el) rowRefs.current.set(r.id, el);
                        else rowRefs.current.delete(r.id);
                      }}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`}
                      onClick={() => itemCount > 0 && onToggleExpand(r.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-gray-800">{r.return_number}</span>
                          {hasLostItems && (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" title="Has lost items" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {r.order?.woo_order_id ? `#${r.order.woo_order_id}` : (r.order?.order_number ?? '—')}
                        </div>
                        {r.exchange_order && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs text-gray-400">Exch:</span>
                            <span className="text-xs font-medium text-blue-600">
                              {r.exchange_order.woo_order_id ? `#${r.exchange_order.woo_order_id}` : r.exchange_order.order_number}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {r.order?.order_date
                          ? new Date(r.order.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.order?.cs_status ? (() => {
                          const cfg = STATUS_CONFIG[r.order.cs_status];
                          return cfg ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                              {cfg.label}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">{r.order.cs_status}</span>
                          );
                        })() : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-800 font-medium">{r.customer?.full_name ?? '—'}</div>
                        {r.customer?.phone_primary && (
                          <div className="text-xs text-gray-400 mt-0.5">{r.customer.phone_primary}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {itemCount > 0 ? (
                          <div>
                            <span className="text-gray-800 text-xs">{getItemDisplay(r)}</span>
                            {itemCount > 1 && (
                              <span className="ml-1 text-xs text-gray-400">({itemCount})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No items</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {actionTs ? formatTime(actionTs) : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === 'expected' && (
                            <Button
                              size="sm"
                              onClick={() => onReceive(r)}
                              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5"
                            >
                              <ScanLine className="w-3.5 h-3.5" />
                              Receive
                            </Button>
                          )}
                          {r.status === 'received' && (
                            <Button
                              size="sm"
                              onClick={() => onQc(r)}
                              className="gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs px-2.5 py-1.5"
                            >
                              <ClipboardList className="w-3.5 h-3.5" />
                              QC Review
                            </Button>
                          )}
                          {r.status === 'qc_passed' && (
                            <Button
                              size="sm"
                              onClick={() => onRestock(r)}
                              className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restock
                            </Button>
                          )}
                          {r.status === 'qc_failed' && (
                            <Button
                              size="sm"
                              onClick={() => onWriteOff(r.id)}
                              className="gap-1 bg-gray-700 hover:bg-gray-800 text-white text-xs px-3 py-1.5"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              Write Off
                            </Button>
                          )}

                          {isAdmin && !isConfirmingDelete && (
                            <button
                              onClick={() => onDeleteConfirm(r.id)}
                              title="Delete return record"
                              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isAdmin && isConfirmingDelete && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-red-600 font-medium">Delete?</span>
                              <button
                                onClick={() => onDeleteExecute(r.id)}
                                disabled={deleting}
                                className="px-2 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => onDeleteConfirm(null)}
                                className="px-2 py-1 text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                No
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && r.items && r.items.length > 0 && (
                      <tr key={`${r.id}-expanded`} className="bg-gray-50 border-b border-gray-100">
                        <td colSpan={8} className="px-6 py-3">
                          <div className="space-y-1.5">
                            {r.items.map(item => {
                              const receiveBadge = ITEM_RECEIVE_BADGE[item.receive_status] ?? ITEM_RECEIVE_BADGE.pending;
                              const qcBadge = item.qc_status ? (ITEM_QC_BADGE[item.qc_status] ?? null) : null;
                              return (
                                <div key={item.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="min-w-0">
                                      <div className="font-medium text-gray-900 text-xs truncate">
                                        {item.order_item?.product_name || item.product?.name || item.sku}
                                      </div>
                                      <div className="text-xs text-gray-400">SKU: {item.sku} | Qty: {item.quantity}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {item.hold_location && (
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <MapPin className="w-3 h-3" />
                                        <span className={`font-medium ${
                                          item.hold_location.location_type === 'return_hold' ? 'text-blue-600' :
                                          item.hold_location.location_type === 'damaged' ? 'text-red-600' :
                                          'text-emerald-600'
                                        }`}>{item.hold_location.code}</span>
                                      </div>
                                    )}
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${receiveBadge.cls}`}>
                                      {receiveBadge.label}
                                    </span>
                                    {qcBadge && (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${qcBadge.cls}`}>
                                        {qcBadge.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getItemDisplay(r: Return): string {
  if (!r.items?.length) return '—';
  const names = r.items.map(i => i.order_item?.product_name || i.product?.name || i.sku);
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1} more`;
}

export default function Returns() {
  const { lastRefreshed } = useRefresh();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeFilter, setActiveFilter] = useState<FilterStatus>('expected');
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [receivingReturn, setReceivingReturn] = useState<Return | null>(null);
  const [restockingReturn, setRestockingReturn] = useState<Return | null>(null);
  const [qcReturn, setQcReturn] = useState<Return | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanNotFound, setScanNotFound] = useState<string | null>(null);
  const [showReceivePackaging, setShowReceivePackaging] = useState(false);

  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('returns')
        .select(`
          id,
          return_number,
          return_reason,
          status,
          refund_amount,
          refund_status,
          created_at,
          updated_at,
          order_id,
          exchange_order_id,
          order:orders!order_id(order_number, woo_order_id, cs_status, order_date),
          exchange_order:orders!exchange_order_id(order_number, woo_order_id),
          customer:customers!customer_id(full_name, phone_primary),
          items:return_items(
            id,
            sku,
            quantity,
            qc_status,
            receive_status,
            hold_location_id,
            expected_barcode,
            product_id,
            order_item_id,
            order_item:order_items!order_item_id(product_name, unit_price),
            product:products!product_id(name, sku),
            hold_location:warehouse_locations!hold_location_id(code, name, location_type)
          )
        `)
        .neq('return_reason', 'Refund')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns((data as unknown as Return[]) || []);
    } catch (err) {
      console.error('Error fetching returns:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReturns(); }, [lastRefreshed]);

  useEffect(() => {
    const sub = supabase
      .channel('returns_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'returns' }, fetchReturns)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [fetchReturns]);

  const statusCounts = {
    expected:  returns.filter(r => r.status === 'expected').length,
    received:  returns.filter(r => r.status === 'received').length,
    qc_passed: returns.filter(r => r.status === 'qc_passed').length,
    qc_failed: returns.filter(r => r.status === 'qc_failed').length,
    restocked: returns.filter(r => r.status === 'restocked').length,
    damaged:   returns.filter(r => r.status === 'damaged').length,
  };

  const q = searchQuery.toLowerCase();
  const filteredReturns = returns.filter(r => {
    if (r.status !== activeFilter) return false;
    if (!q) return true;
    return (
      r.return_number.toLowerCase().includes(q) ||
      r.order?.order_number?.toLowerCase().includes(q) ||
      (r.order?.woo_order_id?.toString() ?? '').includes(q) ||
      r.exchange_order?.order_number?.toLowerCase().includes(q) ||
      (r.exchange_order?.woo_order_id?.toString() ?? '').includes(q) ||
      r.customer?.full_name?.toLowerCase().includes(q) ||
      r.return_reason?.toLowerCase().includes(q)
    );
  });

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleWriteOff = async (returnId: string) => {
    await supabase.from('returns').update({ status: 'damaged' }).eq('id', returnId);
    fetchReturns();
  };

  const handleDeleteReturn = async (returnId: string) => {
    try {
      setDeleting(true);
      await supabase.from('return_items').delete().eq('return_id', returnId);
      await supabase.from('returns').delete().eq('id', returnId);
      setDeleteConfirmId(null);
      fetchReturns();
    } catch (err) {
      console.error('Error deleting return:', err);
    } finally {
      setDeleting(false);
    }
  };

  const matchReturn = (value: string): Return | undefined => {
    const trimmed = value.trim();
    return returns.find(r =>
      r.order?.woo_order_id?.toString() === trimmed ||
      r.order?.order_number?.toLowerCase() === trimmed.toLowerCase() ||
      r.return_number.toLowerCase() === trimmed.toLowerCase() ||
      r.exchange_order?.woo_order_id?.toString() === trimmed ||
      r.exchange_order?.order_number?.toLowerCase() === trimmed.toLowerCase()
    );
  };

  const handleCameraScan = (barcode: string) => {
    setShowScanner(false);
    setScanNotFound(null);

    const matched = matchReturn(barcode);

    if (!matched) {
      setScanNotFound(`No return found matching "${barcode}"`);
      setTimeout(() => setScanNotFound(null), 4000);
      return;
    }

    const targetTab = matched.status as FilterStatus;
    setActiveFilter(targetTab);
    setSearchQuery('');

    if (matched.status === 'expected') {
      setReceivingReturn(matched);
    } else {
      setExpandedRows(prev => new Set(prev).add(matched.id));
      setTimeout(() => {
        const el = rowRefs.current.get(matched.id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-blue-400', 'ring-inset');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-blue-400', 'ring-inset');
          }, 2500);
        }
      }, 120);
    }
  };

  // For the 'expected' tab, no date grouping — show flat list with its own table
  const useGrouping = activeFilter !== 'expected';
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const dateGroups = useGrouping ? buildDateGroups(filteredReturns, activeFilter) : [];

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage product returns, quality control, and restocking</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => setShowReceivePackaging(true)}
            className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300"
          >
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Receive Packaging</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowScanner(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Open Barcode Scanner</span>
            <span className="sm:hidden">Scan</span>
          </Button>
        </div>
      </div>

      {scanNotFound && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {scanNotFound}
          <button onClick={() => setScanNotFound(null)} className="ml-auto p-0.5 hover:text-red-800 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-6 gap-3 mb-6">
        {STATUS_CARDS.map(card => {
          const isActive = activeFilter === card.key;
          return (
            <button
              key={card.key}
              onClick={() => setActiveFilter(card.key)}
              className={`relative p-4 rounded-xl border text-left transition-all duration-150 focus:outline-none ${
                isActive
                  ? `${card.activeBg} ${card.activeRing} shadow-sm`
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className={`mb-2 ${isActive ? card.numberColor : 'text-gray-400'}`}>
                {card.icon}
              </div>
              <div className="text-xs text-gray-500 mb-0.5 font-medium">{card.label}</div>
              <div className={`text-2xl font-bold ${card.numberColor}`}>
                {statusCounts[card.key]}
              </div>
              {isActive && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl ${card.numberColor.replace('text-', 'bg-')}`} />
              )}
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by return ID, order ID, exchange order ID, customer, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading returns...</div>
        ) : filteredReturns.length === 0 ? (
          <div className="text-center py-16">
            <PackageX className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No {RETURN_STATUS_LABELS[activeFilter]?.toLowerCase()} returns</p>
            <p className="text-gray-400 text-sm mt-1">Returns matching this status will appear here</p>
          </div>
        ) : useGrouping ? (
          /* Date-grouped accordion view for all statuses except Expected */
          <div className="p-4 space-y-2">
            <p className="text-xs text-gray-400 mb-3">
              {filteredReturns.length} return{filteredReturns.length !== 1 ? 's' : ''} across {dateGroups.length} day{dateGroups.length !== 1 ? 's' : ''}
            </p>
            {dateGroups.map(group => (
              <DateGroupAccordion
                key={group.date}
                group={group}
                status={activeFilter}
                defaultOpen={group.date === today || group.date === yesterday}
                expandedRows={expandedRows}
                deleteConfirmId={deleteConfirmId}
                deleting={deleting}
                isAdmin={isAdmin}
                rowRefs={rowRefs}
                onToggleExpand={toggleExpand}
                onReceive={setReceivingReturn}
                onQc={setQcReturn}
                onRestock={setRestockingReturn}
                onWriteOff={handleWriteOff}
                onDeleteConfirm={setDeleteConfirmId}
                onDeleteExecute={handleDeleteReturn}
              />
            ))}
          </div>
        ) : (
          /* Flat table for Expected — no meaningful date to group by */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Return ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredReturns.map(r => {
                  const itemCount = r.items?.length ?? 0;
                  const isExpanded = expandedRows.has(r.id);
                  const hasLostItems = r.items?.some(i => i.receive_status === 'lost');
                  const isConfirmingDelete = deleteConfirmId === r.id;

                  return (
                    <>
                      <tr
                        key={r.id}
                        ref={el => {
                          if (el) rowRefs.current.set(r.id, el);
                          else rowRefs.current.delete(r.id);
                        }}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`}
                        onClick={() => itemCount > 0 && toggleExpand(r.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-gray-800">{r.return_number}</span>
                            {hasLostItems && (
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400" title="Has lost items" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">
                            {r.order?.woo_order_id ? `#${r.order.woo_order_id}` : (r.order?.order_number ?? '—')}
                          </div>
                          {r.exchange_order && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs text-gray-400">Exch:</span>
                              <span className="text-xs font-medium text-blue-600">
                                {r.exchange_order.woo_order_id ? `#${r.exchange_order.woo_order_id}` : r.exchange_order.order_number}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                          {r.order?.order_date
                            ? new Date(r.order.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {r.order?.cs_status ? (() => {
                            const cfg = STATUS_CONFIG[r.order.cs_status];
                            return cfg ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                                {cfg.label}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">{r.order.cs_status}</span>
                            );
                          })() : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-800 font-medium">{r.customer?.full_name ?? '—'}</div>
                          {r.customer?.phone_primary && (
                            <div className="text-xs text-gray-400 mt-0.5">{r.customer.phone_primary}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {itemCount > 0 ? (
                            <div>
                              <span className="text-gray-800 text-xs">{getItemDisplay(r)}</span>
                              {itemCount > 1 && (
                                <span className="ml-1 text-xs text-gray-400">({itemCount})</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">No items</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            r.status === 'expected'  ? 'text-amber-700 bg-amber-50 border-amber-200' :
                            r.status === 'received'  ? 'text-blue-700 bg-blue-50 border-blue-200' :
                            r.status === 'qc_passed' ? 'text-green-700 bg-green-50 border-green-200' :
                            r.status === 'qc_failed' ? 'text-red-700 bg-red-50 border-red-200' :
                            r.status === 'restocked' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                            'text-gray-600 bg-gray-50 border-gray-200'
                          }`}>
                            {RETURN_STATUS_LABELS[r.status] ?? r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {r.status === 'expected' && (
                              <Button
                                size="sm"
                                onClick={() => setReceivingReturn(r)}
                                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5"
                              >
                                <ScanLine className="w-3.5 h-3.5" />
                                Receive
                              </Button>
                            )}
                            {isAdmin && !isConfirmingDelete && (
                              <button
                                onClick={() => setDeleteConfirmId(r.id)}
                                title="Delete return record"
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isAdmin && isConfirmingDelete && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-red-600 font-medium">Delete?</span>
                                <button
                                  onClick={() => handleDeleteReturn(r.id)}
                                  disabled={deleting}
                                  className="px-2 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && r.items && r.items.length > 0 && (
                        <tr key={`${r.id}-expanded`} className="bg-gray-50 border-b border-gray-100">
                          <td colSpan={9} className="px-6 py-3">
                            <div className="space-y-1.5">
                              {r.items.map(item => {
                                const receiveBadge = ITEM_RECEIVE_BADGE[item.receive_status] ?? ITEM_RECEIVE_BADGE.pending;
                                const qcBadge = item.qc_status ? (ITEM_QC_BADGE[item.qc_status] ?? null) : null;
                                return (
                                  <div key={item.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="min-w-0">
                                        <div className="font-medium text-gray-900 text-xs truncate">
                                          {item.order_item?.product_name || item.product?.name || item.sku}
                                        </div>
                                        <div className="text-xs text-gray-400">SKU: {item.sku} | Qty: {item.quantity}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {item.hold_location && (
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                          <MapPin className="w-3 h-3" />
                                          <span className={`font-medium ${
                                            item.hold_location.location_type === 'return_hold' ? 'text-blue-600' :
                                            item.hold_location.location_type === 'damaged' ? 'text-red-600' :
                                            'text-emerald-600'
                                          }`}>{item.hold_location.code}</span>
                                        </div>
                                      )}
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${receiveBadge.cls}`}>
                                        {receiveBadge.label}
                                      </span>
                                      {qcBadge && (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${qcBadge.cls}`}>
                                          {qcBadge.label}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {receivingReturn && (
        <ReceiveReturnModal
          returnData={receivingReturn}
          onClose={() => setReceivingReturn(null)}
          onReceived={() => {
            setReceivingReturn(null);
            fetchReturns();
          }}
        />
      )}

      {qcReturn && (
        <QCReviewModal
          returnData={qcReturn}
          onClose={() => setQcReturn(null)}
          onQcComplete={() => {
            setQcReturn(null);
            fetchReturns();
          }}
        />
      )}

      {restockingReturn && (
        <RestockModal
          returnData={restockingReturn}
          onClose={() => setRestockingReturn(null)}
          onRestocked={() => {
            setRestockingReturn(null);
            fetchReturns();
          }}
        />
      )}

      {showScanner && (
        <BarcodeScannerModal
          onScan={handleCameraScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showReceivePackaging && (
        <ReceivePackagingModal
          onClose={() => setShowReceivePackaging(false)}
          onSuccess={() => setShowReceivePackaging(false)}
        />
      )}
    </div>
  );
}
