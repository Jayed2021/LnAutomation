import { useState, useEffect, useCallback } from 'react';
import {
  PackageX, Search, Package, PackageCheck, PackageOpen,
  ClipboardList, RotateCcw, Wrench, ScanLine
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { STATUS_CONFIG } from './orders/types';
import { ReceiveReturnModal } from '../../components/fulfillment/ReceiveReturnModal';

interface ReturnItem {
  id: string;
  sku: string;
  quantity: number;
  qc_status: string | null;
  expected_barcode: string | null;
  product_id: string;
  order_item_id: string | null;
  order_item: { product_name: string } | null;
  product: { name: string; sku: string } | null;
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
  customer: { full_name: string } | null;
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

const REASON_COLORS: Record<string, string> = {
  'Exchange':         'text-blue-700 bg-blue-50 border-blue-200',
  'Partial Delivery': 'text-orange-700 bg-orange-50 border-orange-200',
  'Reverse Pick':     'text-rose-700 bg-rose-50 border-rose-200',
  'Refund':           'text-red-700 bg-red-50 border-red-200',
  'CAD':              'text-red-900 bg-red-100 border-red-300',
};

function getReasonColor(reason: string) {
  return REASON_COLORS[reason] ?? 'text-gray-700 bg-gray-50 border-gray-200';
}

export default function Returns() {
  const { lastRefreshed } = useRefresh();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('expected');
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [receivingReturn, setReceivingReturn] = useState<Return | null>(null);

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
          customer:customers!customer_id(full_name),
          items:return_items(
            id,
            sku,
            quantity,
            qc_status,
            expected_barcode,
            product_id,
            order_item_id,
            order_item:order_items!order_item_id(product_name),
            product:products!product_id(name, sku)
          )
        `)
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

  const getItemCount = (r: Return) => r.items?.length ?? 0;

  const getItemDisplay = (r: Return) => {
    if (!r.items?.length) return '—';
    const names = r.items.map(i => i.order_item?.product_name || i.product?.name || i.sku);
    if (names.length === 1) return names[0];
    return `${names[0]} +${names.length - 1} more`;
  };

  const handleQcAction = async (returnId: string, action: 'qc_passed' | 'qc_failed') => {
    await supabase.from('returns').update({ status: action }).eq('id', returnId);
    fetchReturns();
  };

  const handleRestock = async (returnId: string) => {
    await supabase.from('returns').update({ status: 'restocked' }).eq('id', returnId);
    fetchReturns();
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Original Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredReturns.map(r => {
                  const orderStatusCfg = r.order?.cs_status ? STATUS_CONFIG[r.order.cs_status] : null;
                  const itemCount = getItemCount(r);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-gray-800">{r.return_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {r.order?.order_number ?? '—'}
                        </div>
                        {r.order?.woo_order_id && (
                          <div className="text-xs text-gray-400">#{r.order.woo_order_id}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.customer?.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {r.return_reason && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getReasonColor(r.return_reason)}`}>
                              {r.return_reason}
                            </span>
                          )}
                          {orderStatusCfg && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${orderStatusCfg.color} ${orderStatusCfg.bg} ${orderStatusCfg.border}`}>
                              {orderStatusCfg.label}
                            </span>
                          )}
                        </div>
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
                      <td className="px-4 py-3">
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
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleQcAction(r.id, 'qc_passed')}
                                className="gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-2.5 py-1.5"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                QC Pass
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleQcAction(r.id, 'qc_failed')}
                                className="gap-1 bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 py-1.5"
                              >
                                <PackageX className="w-3.5 h-3.5" />
                                QC Fail
                              </Button>
                            </>
                          )}
                          {r.status === 'qc_passed' && (
                            <Button
                              size="sm"
                              onClick={() => handleRestock(r.id)}
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
    </div>
  );
}
