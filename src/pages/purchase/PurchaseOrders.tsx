import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRefresh } from '../../contexts/RefreshContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Plus, Search, FileText, Check, Clock, Package, Archive, ArchiveRestore, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PurchaseOrder {
  id: string;
  po_number: string;
  shipment_name: string | null;
  supplier_name: string;
  supplier_code: string;
  currency: string;
  created_at: string;
  status: string;
  closed_as_partial: boolean;
  items_count: number;
  total_value: number;
  is_archived: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  ordered: 'Ordered',
  confirmed: 'Confirmed',
  partially_received: 'Partial',
  received_complete: 'Fully Received',
  closed: 'Closed',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  ordered: 'blue',
  confirmed: 'blue',
  partially_received: 'amber',
  received_complete: 'green',
  closed: 'emerald',
};

interface ArchiveConfirmState {
  orderId: string;
  poNumber: string;
  archiving: boolean;
}

function ArchiveConfirmPopover({
  state,
  anchorRef,
  onConfirm,
  onCancel,
}: {
  state: ArchiveConfirmState;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const rect = anchorRef.current?.getBoundingClientRect();
  const top = rect ? rect.bottom + window.scrollY + 8 : 0;
  const left = rect ? rect.left + window.scrollX : 0;

  return (
    <div
      className="fixed z-50"
      style={{ top, left }}
    >
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-72">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-50 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">
              {state.archiving ? 'Archive Purchase Order?' : 'Unarchive Purchase Order?'}
            </p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              <span className="font-medium text-gray-700">{state.poNumber}</span>
              {state.archiving
                ? ' will be hidden from the orders list and shipment performance report.'
                : ' will be restored and visible again in all views.'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors ${
              state.archiving
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {state.archiving ? 'Archive' : 'Unarchive'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { lastRefreshed, setRefreshing } = useRefresh();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveConfirm, setArchiveConfirm] = useState<ArchiveConfirmState | null>(null);
  const [archiveWorking, setArchiveWorking] = useState(false);
  const archiveBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [lastRefreshed, showArchived]);

  useEffect(() => {
    if (!archiveConfirm) return;
    function handleClickOutside(e: MouseEvent) {
      if (archiveBtnRef.current && !archiveBtnRef.current.contains(e.target as Node)) {
        setArchiveConfirm(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [archiveConfirm]);

  const fetchOrders = async () => {
    setLoading(true);
    const query = supabase
      .from('purchase_orders')
      .select(`
        id,
        po_number,
        shipment_name,
        currency,
        created_at,
        status,
        closed_as_partial,
        is_archived,
        suppliers!inner(name, code),
        purchase_order_items(ordered_quantity, unit_price)
      `)
      .eq('is_archived', showArchived)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching purchase orders:', error);
      setLoading(false);
      return;
    }

    const mapped: PurchaseOrder[] = (data || []).map((row: any) => {
      const items = row.purchase_order_items || [];
      const total_value = items.reduce(
        (sum: number, item: any) => sum + item.ordered_quantity * item.unit_price,
        0
      );
      return {
        id: row.id,
        po_number: row.po_number,
        shipment_name: row.shipment_name,
        supplier_name: row.suppliers?.name || '',
        supplier_code: row.suppliers?.code || '',
        currency: row.currency,
        created_at: row.created_at,
        status: row.status,
        closed_as_partial: row.closed_as_partial || false,
        items_count: items.length,
        total_value,
        is_archived: row.is_archived || false,
      };
    });

    setOrders(mapped);
    setLoading(false);
    setRefreshing(false);
  };

  const handleArchiveToggle = async (order: PurchaseOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    const btn = (e.currentTarget as HTMLElement).closest('[data-archive-btn]') as HTMLDivElement | null;
    archiveBtnRef.current = btn;
    setArchiveConfirm({ orderId: order.id, poNumber: order.po_number, archiving: !order.is_archived });
  };

  const confirmArchive = async () => {
    if (!archiveConfirm || archiveWorking) return;
    setArchiveWorking(true);
    const { error } = await supabase
      .from('purchase_orders')
      .update({ is_archived: archiveConfirm.archiving })
      .eq('id', archiveConfirm.orderId);
    setArchiveWorking(false);
    setArchiveConfirm(null);
    if (!error) fetchOrders();
  };

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.shipment_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { USD: '$', CNY: '¥', BDT: '৳' };
    return `${symbols[currency] || ''}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'closed') return <Check className="w-3 h-3" />;
    if (status === 'draft') return <FileText className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'ordered', label: 'Ordered' },
    { key: 'partially_received', label: 'Partially Received' },
    { key: 'received_complete', label: 'Fully Received' },
    { key: 'closed', label: 'Closed' },
  ];

  return (
    <div className="space-y-6">
      {archiveConfirm && (
        <ArchiveConfirmPopover
          state={archiveConfirm}
          anchorRef={archiveBtnRef}
          onConfirm={confirmArchive}
          onCancel={() => setArchiveConfirm(null)}
        />
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage supplier purchase orders</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => { setShowArchived(v => !v); setStatusFilter('all'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                showArchived
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Archive className="w-4 h-4" />
              {showArchived ? 'Viewing Archived' : 'Archived'}
            </button>
          )}
          {!showArchived && (
            <Button onClick={() => navigate('/purchase/create')} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Purchase Order
            </Button>
          )}
        </div>
      </div>

      {showArchived && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <Archive className="w-4 h-4 shrink-0" />
          <span>
            Showing archived purchase orders. These are hidden from all standard views and reports.
          </span>
        </div>
      )}

      <Card>
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by PO number, supplier, shipment name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          {!showArchived && (
            <div className="flex gap-2 flex-wrap">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    statusFilter === tab.key
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                  {tab.key !== 'all' && (
                    <span className="ml-1.5 text-xs opacity-70">
                      {orders.filter((o) => o.status === tab.key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Loading purchase orders...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Package className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">
                {showArchived ? 'No archived purchase orders' : 'No purchase orders found'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : showArchived
                    ? 'Archived POs will appear here'
                    : 'Create your first purchase order'}
              </p>
              {!searchTerm && statusFilter === 'all' && !showArchived && (
                <Button
                  onClick={() => navigate('/purchase/create')}
                  className="mt-4 flex items-center gap-2"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  Create Purchase Order
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                      order.is_archived ? 'opacity-70' : ''
                    }`}
                    onClick={() =>
                      !order.is_archived && (
                        order.status === 'draft'
                          ? navigate(`/purchase/orders/${order.id}/edit`)
                          : navigate(`/purchase/orders/${order.id}`)
                      )
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">{order.po_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {order.supplier_code && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                            {order.supplier_code}
                          </span>
                        )}
                        <span className="text-sm text-gray-900">{order.supplier_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{order.shipment_name || '—'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{order.items_count} items</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.total_value, order.currency)} {order.currency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={STATUS_COLORS[order.status] as any}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(order.status)}
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </Badge>
                        {order.status === 'closed' && order.closed_as_partial && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Partial
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {!order.is_archived && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              order.status === 'draft'
                                ? navigate(`/purchase/orders/${order.id}/edit`)
                                : navigate(`/purchase/orders/${order.id}`)
                            }
                          >
                            {order.status === 'draft' ? 'Continue Editing' : 'View Details'}
                          </Button>
                        )}
                        {isAdmin && (
                          <div data-archive-btn>
                            <button
                              onClick={(e) => handleArchiveToggle(order, e)}
                              title={order.is_archived ? 'Unarchive' : 'Archive'}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                order.is_archived
                                  ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600'
                              }`}
                            >
                              {order.is_archived
                                ? <><ArchiveRestore className="w-3.5 h-3.5" /> Unarchive</>
                                : <><Archive className="w-3.5 h-3.5" /> Archive</>
                              }
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
