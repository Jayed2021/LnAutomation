import { useState, useEffect, useCallback } from 'react';
import {
  PackageX, Search, Package, PackageCheck, PackageOpen,
  ClipboardList, RotateCcw, Wrench, ScanLine, AlertTriangle, MapPin
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ReceiveReturnModal } from '../../components/fulfillment/ReceiveReturnModal';
import { RestockModal } from '../../components/fulfillment/RestockModal';
import { QCReviewModal } from '../../components/fulfillment/QCReviewModal';
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
  order_id: string;
  order: { order_number: string; woo_order_id: number | null; cs_status: string } | null;
  customer: { full_name: string; phone_primary: string | null } | null;
  items: ReturnItem[];
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

export default function Returns() {
  const { lastRefreshed } = useRefresh();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('expected');
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [receivingReturn, setReceivingReturn] = useState<Return | null>(null);
  const [restockingReturn, setRestockingReturn] = useState<Return | null>(null);
  const [qcReturn, setQcReturn] = useState<Return | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
          order_id,
          order:orders!order_id(order_number, woo_order_id, cs_status),
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
      r.customer?.full_name?.toLowerCase().includes(q) ||
      r.return_reason?.toLowerCase().includes(q)
    );
  });

  const getItemDisplay = (r: Return) => {
    if (!r.items?.length) return '—';
    const names = r.items.map(i => i.order_item?.product_name || i.product?.name || i.sku);
    if (names.length === 1) return names[0];
    return `${names[0]} +${names.length - 1} more`;
  };

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

  return (
    <div className="p-6 max-w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Returns Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage product returns, quality control, and restocking</p>
      </div>

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
              placeholder="Search by return ID, order ID, customer, or reason..."
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Return ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
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

                  return (
                    <>
                      <tr
                        key={r.id}
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
                            {r.status === 'received' && (
                              <Button
                                size="sm"
                                onClick={() => setQcReturn(r)}
                                className="gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs px-2.5 py-1.5"
                              >
                                <ClipboardList className="w-3.5 h-3.5" />
                                QC Review
                              </Button>
                            )}
                            {r.status === 'qc_passed' && (
                              <Button
                                size="sm"
                                onClick={() => setRestockingReturn(r)}
                                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Restock
                              </Button>
                            )}
                            {r.status === 'qc_failed' && (
                              <Button
                                size="sm"
                                onClick={() => handleWriteOff(r.id)}
                                className="gap-1 bg-gray-700 hover:bg-gray-800 text-white text-xs px-3 py-1.5"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                                Write Off
                              </Button>
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
    </div>
  );
}
