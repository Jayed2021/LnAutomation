import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Plus, Search, FileText, Check, X, Clock, Package } from 'lucide-react';
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
  items_count: number;
  total_value: number;
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

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { lastRefreshed, setRefreshing } = useRefresh();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [lastRefreshed]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        po_number,
        shipment_name,
        currency,
        created_at,
        status,
        suppliers!inner(name, code),
        purchase_order_items(ordered_quantity, unit_price)
      `)
      .order('created_at', { ascending: false });

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
        items_count: items.length,
        total_value,
      };
    });

    setOrders(mapped);
    setLoading(false);
    setRefreshing(false);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage supplier purchase orders</p>
        </div>
        <Button onClick={() => navigate('/purchase/create')} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Purchase Order
        </Button>
      </div>

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
              <p className="text-sm font-medium text-gray-500">No purchase orders found</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Create your first purchase order'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
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
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() =>
                      order.status === 'draft'
                        ? navigate(`/purchase/orders/${order.id}/edit`)
                        : navigate(`/purchase/orders/${order.id}`)
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
                      <Badge variant={STATUS_COLORS[order.status] as any}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
