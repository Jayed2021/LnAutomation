import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageX, Search, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { STATUS_CONFIG } from './orders/types';

interface ReturnItem {
  sku: string;
  quantity: number;
  qc_status: string;
  order_item: {
    product_name: string;
  } | null;
}

interface Return {
  id: string;
  return_number: string;
  order: {
    order_number: string;
    cs_status: string;
  };
  customer: {
    full_name: string;
  };
  return_reason: string;
  status: string;
  refund_amount: number | null;
  refund_status: string;
  created_at: string;
  items: ReturnItem[];
}

export default function Returns() {
  const navigate = useNavigate();
  const { lastRefreshed } = useRefresh();
  const [activeTab, setActiveTab] = useState('expected');
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const statusCounts = {
    expected: returns.filter(r => r.status === 'expected').length,
    received: returns.filter(r => r.status === 'received').length,
    qc_passed: returns.filter(r => r.status === 'qc_passed').length,
    qc_failed: returns.filter(r => r.status === 'qc_failed').length,
    restocked: returns.filter(r => r.status === 'restocked').length,
    damaged: returns.filter(r => r.status === 'damaged').length,
  };

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
          order:orders(order_number, cs_status),
          customer:customers(full_name),
          items:return_items(
            sku,
            quantity,
            qc_status,
            order_item:order_items(product_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns((data as unknown as Return[]) || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [lastRefreshed]);

  useEffect(() => {
    const subscription = supabase
      .channel('returns_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'returns'
      }, () => {
        fetchReturns();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchReturns]);

  const filteredReturns = returns.filter(returnItem => {
    const matchesTab = returnItem.status === activeTab;
    const matchesSearch =
      returnItem.return_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      returnItem.order?.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      returnItem.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const toggleItemExpand = (returnId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(returnId)) {
        next.delete(returnId);
      } else {
        next.add(returnId);
      }
      return next;
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, string> = {
      expected: 'amber',
      received: 'blue',
      qc_passed: 'green',
      qc_failed: 'red',
      restocked: 'emerald',
      damaged: 'gray',
    };
    return variants[status] || 'gray';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      expected: 'Expected',
      received: 'Received',
      qc_passed: 'QC Passed',
      qc_failed: 'QC Failed',
      restocked: 'Restocked',
      damaged: 'Damaged',
    };
    return labels[status] || status;
  };

  const getReasonBadgeColor = (reason: string) => {
    if (reason === 'Exchange') return 'text-blue-700 bg-blue-50 border-blue-200';
    if (reason === 'Partial Delivery') return 'text-orange-700 bg-orange-50 border-orange-200';
    if (reason === 'Reverse Pick') return 'text-rose-700 bg-rose-50 border-rose-200';
    if (reason === 'Refund') return 'text-red-700 bg-red-50 border-red-200';
    return 'text-gray-700 bg-gray-50 border-gray-200';
  };

  const hasItemDetails = (returnItem: Return) =>
    returnItem.items?.length > 0 &&
    returnItem.items.some(i => i.order_item?.product_name || i.sku);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Returns Management</h1>
      </div>

      <div className="grid grid-cols-6 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Expected</div>
          <div className="text-2xl font-bold text-amber-600">{statusCounts.expected}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Received</div>
          <div className="text-2xl font-bold text-blue-600">{statusCounts.received}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">QC Passed</div>
          <div className="text-2xl font-bold text-green-600">{statusCounts.qc_passed}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">QC Failed</div>
          <div className="text-2xl font-bold text-red-600">{statusCounts.qc_failed}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Restocked</div>
          <div className="text-2xl font-bold text-emerald-600">{statusCounts.restocked}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Damaged</div>
          <div className="text-2xl font-bold text-gray-600">{statusCounts.damaged}</div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by return number, order ID, or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="expected">
              Expected ({statusCounts.expected})
            </TabsTrigger>
            <TabsTrigger value="received">
              Received ({statusCounts.received})
            </TabsTrigger>
            <TabsTrigger value="qc_passed">
              QC Passed ({statusCounts.qc_passed})
            </TabsTrigger>
            <TabsTrigger value="qc_failed">
              QC Failed ({statusCounts.qc_failed})
            </TabsTrigger>
            <TabsTrigger value="restocked">
              Restocked ({statusCounts.restocked})
            </TabsTrigger>
            <TabsTrigger value="damaged">
              Damaged ({statusCounts.damaged})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading returns...</div>
            ) : filteredReturns.length === 0 ? (
              <div className="text-center py-12">
                <PackageX className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No returns in this status</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReturns.map(returnItem => {
                  const isExpanded = expandedItems.has(returnItem.id);
                  const showItems = hasItemDetails(returnItem);
                  const orderCsStatus = returnItem.order?.cs_status;
                  const orderStatusCfg = orderCsStatus ? STATUS_CONFIG[orderCsStatus] : null;

                  return (
                    <div
                      key={returnItem.id}
                      className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap mb-2">
                              <span className="font-semibold text-gray-900">
                                {returnItem.return_number}
                              </span>
                              <Badge variant={getStatusBadgeVariant(returnItem.status) as any}>
                                {getStatusLabel(returnItem.status)}
                              </Badge>
                              {returnItem.return_reason && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getReasonBadgeColor(returnItem.return_reason)}`}>
                                  {returnItem.return_reason}
                                </span>
                              )}
                              {orderStatusCfg && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${orderStatusCfg.color} ${orderStatusCfg.bg} ${orderStatusCfg.border}`}>
                                  {orderStatusCfg.label}
                                </span>
                              )}
                              {returnItem.refund_status === 'completed' && (
                                <Badge variant="green">Refunded</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-0.5">
                              <div>Order: <span className="font-medium text-gray-800">{returnItem.order?.order_number}</span></div>
                              <div>Customer: {returnItem.customer?.full_name}</div>
                              {returnItem.refund_amount && (
                                <div>Refund Amount: <span className="font-medium">৳{returnItem.refund_amount}</span></div>
                              )}
                              <div className="text-xs text-gray-400 pt-0.5">
                                Created: {new Date(returnItem.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {showItems && (
                              <button
                                onClick={() => toggleItemExpand(returnItem.id)}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                              >
                                {isExpanded ? (
                                  <>Hide Items <ChevronUp className="w-3.5 h-3.5" /></>
                                ) : (
                                  <>{returnItem.items.length} Item{returnItem.items.length !== 1 ? 's' : ''} <ChevronDown className="w-3.5 h-3.5" /></>
                                )}
                              </button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/fulfillment/returns/${returnItem.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>

                      {showItems && isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                          <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Expected Items</div>
                          <div className="space-y-1.5">
                            {returnItem.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm bg-white border border-gray-100 rounded-md px-3 py-2">
                                <div>
                                  <span className="font-medium text-gray-800">
                                    {item.order_item?.product_name || item.sku}
                                  </span>
                                  {item.order_item?.product_name && (
                                    <span className="text-gray-400 text-xs ml-2">({item.sku})</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-gray-500 text-xs">Qty: <span className="font-medium text-gray-700">{item.quantity}</span></span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    item.qc_status === 'passed' ? 'bg-green-100 text-green-700' :
                                    item.qc_status === 'failed' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-500'
                                  }`}>
                                    {item.qc_status === 'pending' ? 'Pending QC' : item.qc_status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
