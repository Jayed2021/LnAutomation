import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, User, Calendar, Check, X, Camera, DollarSign, RotateCcw, MapPin, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { ReturnReceiveModal } from '../../components/fulfillment/ReturnReceiveModal';
import { RestockModal } from '../../components/fulfillment/RestockModal';

interface ReturnDetail {
  id: string;
  return_number: string;
  order_id: string;
  customer_id: string;
  return_reason: string;
  status: string;
  refund_amount: number | null;
  refund_method: string | null;
  refund_reference: string | null;
  refund_date: string | null;
  refund_status: string;
  created_at: string;
  order: {
    order_number: string;
    woo_order_id: number | null;
    total_amount: number;
  };
  customer: {
    full_name: string;
    phone_primary: string;
    email: string;
  };
  items: ReturnItemDetail[];
  photos: ReturnPhoto[];
}

interface ReturnItemDetail {
  id: string;
  sku: string;
  product_name: string;
  quantity: number;
  qc_status: string;
  qc_notes: string | null;
  expected_barcode: string | null;
  product_id: string;
  hold_location_id: string | null;
  receive_status: string;
  product: { name: string; sku: string } | null;
  order_item: { product_name: string } | null;
}

interface ReturnPhoto {
  id: string;
  photo_url: string;
  notes: string;
  created_at: string;
}

interface RestockMovement {
  id: string;
  quantity: number;
  previous_quantity: number | null;
  to_location: string | null;
  product_sku: string;
  product_name: string;
}

export default function ReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [returnData, setReturnData] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [restockMovements, setRestockMovements] = useState<RestockMovement[]>([]);

  const [refundForm, setRefundForm] = useState({
    amount: '',
    method: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (id) {
      fetchReturnDetail();
    }
  }, [id]);

  const fetchReturnDetail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          order:orders(order_number, woo_order_id, total_amount),
          customer:customers(full_name, phone_primary, email),
          items:return_items(
            id,
            sku,
            quantity,
            qc_status,
            qc_notes,
            expected_barcode,
            product_id,
            hold_location_id,
            receive_status,
            product:products(name, sku),
            order_item:order_items(product_name)
          ),
          photos:return_photos(id, photo_url, notes, created_at)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const formattedData = {
        ...data,
        items: data.items.map((item: any) => ({
          ...item,
          product_name: item.product?.name || item.order_item?.product_name || 'Unknown Product',
        })),
      };

      setReturnData(formattedData);
      setRefundForm(prev => ({
        ...prev,
        amount: data.refund_amount?.toString() || data.order?.total_amount?.toString() || '',
      }));

      if (data.status === 'restocked') {
        await fetchRestockMovements(data.id);
      }
    } catch (error) {
      console.error('Error fetching return detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestockMovements = async (returnId: string) => {
    const { data } = await supabase
      .from('stock_movements')
      .select(`
        id, quantity, previous_quantity,
        products(sku, name),
        to_loc:warehouse_locations!to_location_id(code)
      `)
      .eq('reference_type', 'return')
      .eq('reference_id', returnId)
      .eq('movement_type', 'return_restock');

    const mapped: RestockMovement[] = (data || []).map((m: any) => ({
      id: m.id,
      quantity: m.quantity,
      previous_quantity: m.previous_quantity,
      to_location: m.to_loc?.code || null,
      product_sku: m.products?.sku || '?',
      product_name: m.products?.name || 'Unknown',
    }));

    setRestockMovements(mapped);
  };

  const handleQCDecision = async (itemId: string, decision: 'passed' | 'failed', notes: string) => {
    try {
      setProcessing(true);

      await supabase
        .from('return_items')
        .update({
          qc_status: decision,
          qc_notes: notes,
        })
        .eq('id', itemId);

      const allItems = returnData?.items || [];
      const updatedItems = allItems.map(item =>
        item.id === itemId ? { ...item, qc_status: decision, qc_notes: notes } : item
      );

      const allQCComplete = updatedItems.every(item => item.qc_status !== 'pending');
      const allPassed = updatedItems.every(item => item.qc_status === 'passed');
      const anyFailed = updatedItems.some(item => item.qc_status === 'failed');

      if (allQCComplete) {
        const newStatus = allPassed ? 'qc_passed' : anyFailed ? 'qc_failed' : 'received';
        await supabase
          .from('returns')
          .update({ status: newStatus })
          .eq('id', id);
      }

      fetchReturnDetail();
    } catch (error) {
      console.error('Error updating QC status:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsDamaged = async () => {
    try {
      setProcessing(true);

      await supabase
        .from('returns')
        .update({ status: 'damaged' })
        .eq('id', id);

      fetchReturnDetail();
    } catch (error) {
      console.error('Error marking as damaged:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessRefund = async () => {
    try {
      setProcessing(true);

      await supabase
        .from('returns')
        .update({
          refund_amount: parseFloat(refundForm.amount),
          refund_method: refundForm.method,
          refund_reference: refundForm.reference,
          refund_date: refundForm.date,
          refund_status: 'completed',
        })
        .eq('id', id);

      fetchReturnDetail();
    } catch (error) {
      console.error('Error processing refund:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Loading return details...</div>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Return not found</div>
      </div>
    );
  }

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

  const canReceive = returnData.status === 'expected';
  const canQC = returnData.status === 'received';
  const canRestock = returnData.status === 'qc_passed' && returnData.items.every(i => i.qc_status === 'passed');
  const canMarkDamaged = returnData.status === 'qc_failed';

  const restockModalData = {
    id: returnData.id,
    return_number: returnData.return_number,
    order_id: returnData.order_id,
    order: returnData.order
      ? { order_number: returnData.order.order_number, woo_order_id: returnData.order.woo_order_id ?? null }
      : null,
    items: returnData.items.map(item => ({
      id: item.id,
      sku: item.sku,
      quantity: item.quantity,
      qc_status: item.qc_status,
      receive_status: item.receive_status,
      hold_location_id: item.hold_location_id,
      product_id: item.product_id,
      order_item_id: null,
      order_item: item.order_item,
      product: item.product,
    })),
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/fulfillment/returns')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{returnData.return_number}</h1>
          <p className="text-sm text-gray-500">Return Details</p>
        </div>
        <Badge variant={getStatusBadgeVariant(returnData.status) as any} className="text-sm px-3 py-1">
          {returnData.status.toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <Package className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Order Information</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Number:</span>
              <span className="font-medium">{returnData.order?.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order Total:</span>
              <span className="font-medium">৳{returnData.order?.total_amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Return Reason:</span>
              <span className="font-medium">{returnData.return_reason || 'N/A'}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <User className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Customer Information</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <div className="text-gray-600">Name:</div>
              <div className="font-medium">{returnData.customer?.full_name}</div>
            </div>
            <div>
              <div className="text-gray-600">Phone:</div>
              <div className="font-medium">{returnData.customer?.phone_primary}</div>
            </div>
            {returnData.customer?.email && (
              <div>
                <div className="text-gray-600">Email:</div>
                <div className="font-medium">{returnData.customer?.email}</div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Return Timeline</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span className="font-medium">
                {new Date(returnData.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium capitalize">{returnData.status.replace('_', ' ')}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Return Items</h3>
              {canReceive && (
                <Button size="sm" variant="primary" onClick={() => setShowReceiveModal(true)}>
                  Receive Return
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {returnData.items.map(item => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-gray-900">{item.product_name}</div>
                      <div className="text-sm text-gray-600">SKU: {item.product?.sku || item.sku}</div>
                      <div className="text-sm text-gray-600">Quantity: {item.quantity}</div>
                    </div>
                    <Badge
                      variant={
                        item.qc_status === 'passed'
                          ? 'green'
                          : item.qc_status === 'failed'
                          ? 'red'
                          : 'gray'
                      }
                    >
                      QC: {item.qc_status}
                    </Badge>
                  </div>

                  {canQC && item.qc_status === 'pending' && (
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      <Textarea
                        placeholder="QC Notes..."
                        className="text-sm"
                        id={`qc-notes-${item.id}`}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            const notes = (document.getElementById(`qc-notes-${item.id}`) as HTMLTextAreaElement)?.value || '';
                            handleQCDecision(item.id, 'passed', notes);
                          }}
                          disabled={processing}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Pass
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const notes = (document.getElementById(`qc-notes-${item.id}`) as HTMLTextAreaElement)?.value || '';
                            handleQCDecision(item.id, 'failed', notes);
                          }}
                          disabled={processing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Fail
                        </Button>
                      </div>
                    </div>
                  )}

                  {item.qc_notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">QC Notes:</div>
                      <div className="text-sm text-gray-900">{item.qc_notes}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {canRestock && (
              <Button
                className="w-full mt-4"
                variant="primary"
                onClick={() => setShowRestockModal(true)}
                disabled={processing}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restock Items
              </Button>
            )}

            {canMarkDamaged && (
              <Button className="w-full mt-4" variant="destructive" onClick={handleMarkAsDamaged} disabled={processing}>
                Mark as Damaged
              </Button>
            )}
          </Card>

          {returnData.status === 'restocked' && restockMovements.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <h3 className="font-semibold text-gray-900">Restock Summary</h3>
              </div>
              <div className="space-y-3">
                {restockMovements.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.product_name}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{m.product_sku}</p>
                      {m.to_location && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {m.to_location}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {m.previous_quantity !== null ? (
                        <>
                          <div className="text-xs text-gray-400">
                            {m.previous_quantity} &rarr; <span className="font-semibold text-emerald-700">{m.previous_quantity + m.quantity}</span>
                          </div>
                          <div className="text-xs text-emerald-600 font-medium mt-0.5">+{m.quantity} added</div>
                        </>
                      ) : (
                        <div className="text-sm font-semibold text-emerald-700">+{m.quantity} units</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Refund Processing</h3>
            </div>

            {returnData.refund_status === 'completed' ? (
              <div className="space-y-3 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <Check className="h-5 w-5" />
                  Refund Completed
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">৳{returnData.refund_amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium">{returnData.refund_method}</span>
                  </div>
                  {returnData.refund_reference && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reference:</span>
                      <span className="font-medium">{returnData.refund_reference}</span>
                    </div>
                  )}
                  {returnData.refund_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">
                        {new Date(returnData.refund_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="refund-amount">Refund Amount</Label>
                  <Input
                    id="refund-amount"
                    type="number"
                    value={refundForm.amount}
                    onChange={(e) => setRefundForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="refund-method">Refund Method</Label>
                  <Select
                    id="refund-method"
                    value={refundForm.method}
                    onChange={(e) => setRefundForm(prev => ({ ...prev, method: e.target.value }))}
                  >
                    <option value="">Select method...</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="refund-reference">Reference Number</Label>
                  <Input
                    id="refund-reference"
                    value={refundForm.reference}
                    onChange={(e) => setRefundForm(prev => ({ ...prev, reference: e.target.value }))}
                    placeholder="Transaction ID or reference"
                  />
                </div>
                <div>
                  <Label htmlFor="refund-date">Refund Date</Label>
                  <Input
                    id="refund-date"
                    type="date"
                    value={refundForm.date}
                    onChange={(e) => setRefundForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <Button
                  className="w-full"
                  variant="primary"
                  onClick={handleProcessRefund}
                  disabled={processing || !refundForm.amount || !refundForm.method}
                >
                  Process Refund
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Photos</h3>
              </div>
            </div>

            {returnData.photos && returnData.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {returnData.photos.map(photo => (
                  <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img src={photo.photo_url} alt="Return item" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                No photos uploaded yet
              </div>
            )}
          </Card>
        </div>
      </div>

      {showReceiveModal && (
        <ReturnReceiveModal
          returnData={returnData}
          onClose={() => {
            setShowReceiveModal(false);
            fetchReturnDetail();
          }}
        />
      )}

      {showRestockModal && (
        <RestockModal
          returnData={restockModalData}
          onClose={() => setShowRestockModal(false)}
          onRestocked={() => {
            setShowRestockModal(false);
            fetchReturnDetail();
          }}
        />
      )}
    </div>
  );
}
