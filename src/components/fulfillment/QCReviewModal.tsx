import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, ClipboardList, MapPin, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ReturnItemData {
  id: string;
  sku: string;
  quantity: number;
  qc_status: string | null;
  receive_status: string;
  hold_location_id: string | null;
  product_id: string;
  order_item_id: string | null;
  order_item: { product_name: string; unit_price: number } | null;
  product: { name: string; sku: string } | null;
}

interface ReturnData {
  id: string;
  return_number: string;
  order_id: string;
  order: { order_number: string; woo_order_id: number | null } | null;
  items: ReturnItemData[];
}

interface Props {
  returnData: ReturnData;
  onClose: () => void;
  onQcComplete: () => void;
}

type QCDecision = 'passed' | 'failed' | null;

interface ItemQCState {
  decision: QCDecision;
  notes: string;
}

export function QCReviewModal({ returnData, onClose, onQcComplete }: Props) {
  const receivedItems = (returnData.items ?? []).filter(i => i.receive_status === 'received');

  const [itemStates, setItemStates] = useState<Record<string, ItemQCState>>(() => {
    const init: Record<string, ItemQCState> = {};
    for (const item of receivedItems) {
      init[item.id] = { decision: null, notes: '' };
    }
    return init;
  });

  const [damagedLocation, setDamagedLocation] = useState<{ id: string; code: string; name: string } | null>(null);
  const [returnHoldLocation, setReturnHoldLocation] = useState<{ id: string; code: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    const [dmgRes, holdRes] = await Promise.all([
      supabase.from('warehouse_locations').select('id, code, name').eq('location_type', 'damaged').eq('is_active', true).limit(1).maybeSingle(),
      supabase.from('warehouse_locations').select('id, code').eq('location_type', 'return_hold').eq('is_active', true).limit(1).maybeSingle(),
    ]);
    if (dmgRes.data) setDamagedLocation(dmgRes.data);
    if (holdRes.data) setReturnHoldLocation(holdRes.data);
  };

  const getItemName = (item: ReturnItemData) =>
    item.order_item?.product_name || item.product?.name || item.sku;

  const setDecision = (itemId: string, decision: QCDecision) => {
    setItemStates(prev => ({ ...prev, [itemId]: { ...prev[itemId], decision } }));
  };

  const setNotes = (itemId: string, notes: string) => {
    setItemStates(prev => ({ ...prev, [itemId]: { ...prev[itemId], notes } }));
  };

  const allDecided = receivedItems.length > 0 && receivedItems.every(i => itemStates[i.id]?.decision !== null);
  const passedCount = receivedItems.filter(i => itemStates[i.id]?.decision === 'passed').length;
  const failedCount = receivedItems.filter(i => itemStates[i.id]?.decision === 'failed').length;

  const handleConfirmQC = async () => {
    try {
      setProcessing(true);
      setError('');

      for (const item of receivedItems) {
        const state = itemStates[item.id];
        if (!state || !state.decision) continue;

        const isPassed = state.decision === 'passed';
        const isFailed = state.decision === 'failed';

        await supabase
          .from('return_items')
          .update({
            qc_status: isPassed ? 'passed' : 'failed',
            qc_notes: state.notes || null,
          })
          .eq('id', item.id);

        if (isFailed && damagedLocation && item.hold_location_id) {
          const barcode = item.sku;

          const { data: holdLot } = await supabase
            .from('inventory_lots')
            .select('id, remaining_quantity')
            .eq('barcode', barcode)
            .eq('location_id', item.hold_location_id)
            .maybeSingle();

          if (holdLot && holdLot.remaining_quantity > 0) {
            const deduct = Math.min(item.quantity, holdLot.remaining_quantity);
            await supabase
              .from('inventory_lots')
              .update({ remaining_quantity: holdLot.remaining_quantity - deduct })
              .eq('id', holdLot.id);
          }

          const { data: dmgLot } = await supabase
            .from('inventory_lots')
            .select('id, remaining_quantity')
            .eq('barcode', barcode)
            .eq('location_id', damagedLocation.id)
            .maybeSingle();

          if (dmgLot) {
            await supabase
              .from('inventory_lots')
              .update({ remaining_quantity: dmgLot.remaining_quantity + item.quantity })
              .eq('id', dmgLot.id);

            await supabase.from('stock_movements').insert({
              movement_type: 'qc_damaged',
              product_id: item.product_id,
              lot_id: dmgLot.id,
              from_location_id: item.hold_location_id,
              to_location_id: damagedLocation.id,
              quantity: item.quantity,
              reference_type: 'return',
              reference_id: returnData.id,
              notes: state.notes || 'QC Failed',
            });
          } else {
            const lotNumber = `DMG-${returnData.return_number}-${item.sku}`;
            const { data: newDmgLot } = await supabase
              .from('inventory_lots')
              .insert({
                lot_number: lotNumber,
                barcode,
                product_id: item.product_id,
                location_id: damagedLocation.id,
                received_date: new Date().toISOString().split('T')[0],
                received_quantity: item.quantity,
                remaining_quantity: item.quantity,
                landed_cost_per_unit: 0,
              })
              .select('id')
              .single();

            if (newDmgLot) {
              await supabase.from('stock_movements').insert({
                movement_type: 'qc_damaged',
                product_id: item.product_id,
                lot_id: newDmgLot.id,
                from_location_id: item.hold_location_id,
                to_location_id: damagedLocation.id,
                quantity: item.quantity,
                reference_type: 'return',
                reference_id: returnData.id,
                notes: state.notes || 'QC Failed',
              });
            }
          }

          await supabase
            .from('return_items')
            .update({ hold_location_id: damagedLocation.id })
            .eq('id', item.id);
        }
      }

      const newReturnStatus = failedCount === receivedItems.length
        ? 'qc_failed'
        : 'qc_passed';

      await supabase
        .from('returns')
        .update({ status: newReturnStatus, updated_at: new Date().toISOString() })
        .eq('id', returnData.id);

      onQcComplete();
    } catch (err) {
      console.error('QC error:', err);
      setError('Failed to save QC results. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const orderLabel = returnData.order?.woo_order_id
    ? `#${returnData.order.woo_order_id}`
    : returnData.order?.order_number ?? returnData.return_number;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-base">
                QC Review — Order {orderLabel}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Review each received item and mark Pass or Fail. Failed items will be transferred to the Damaged location.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors ml-2 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {(damagedLocation || returnHoldLocation) && (
          <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-4 text-xs text-gray-500">
            {returnHoldLocation && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>Currently in: <span className="font-semibold text-blue-600">{returnHoldLocation.code}</span></span>
              </div>
            )}
            {damagedLocation && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span>Failed items go to: <span className="font-semibold text-red-600">{damagedLocation.code} — {damagedLocation.name}</span></span>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {receivedItems.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              No received items to review.
            </div>
          ) : (
            <div className="space-y-3">
              {receivedItems.map(item => {
                const state = itemStates[item.id] ?? { decision: null, notes: '' };
                const isPassed = state.decision === 'passed';
                const isFailed = state.decision === 'failed';
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 transition-all ${
                      isPassed
                        ? 'bg-green-50 border-green-200'
                        : isFailed
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{getItemName(item)}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          SKU: {item.sku} &nbsp;|&nbsp; Qty: {item.quantity}
                          {item.order_item?.unit_price != null && (
                            <> &nbsp;|&nbsp; ৳{item.order_item.unit_price.toFixed(2)}</>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setDecision(item.id, 'passed')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isPassed
                              ? 'bg-green-600 text-white border-green-600 shadow-sm'
                              : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Pass
                        </button>
                        <button
                          onClick={() => setDecision(item.id, 'failed')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isFailed
                              ? 'bg-red-600 text-white border-red-600 shadow-sm'
                              : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Fail
                        </button>
                      </div>
                    </div>

                    {state.decision !== null && (
                      <div className="mt-3">
                        <input
                          type="text"
                          value={state.notes}
                          onChange={e => setNotes(item.id, e.target.value)}
                          placeholder={isFailed ? 'Describe the damage (optional)...' : 'QC notes (optional)...'}
                          className={`w-full px-3 py-2 rounded-lg text-xs border focus:outline-none focus:ring-2 ${
                            isFailed
                              ? 'border-red-200 focus:ring-red-400 bg-white'
                              : 'border-green-200 focus:ring-green-400 bg-white'
                          }`}
                        />
                        {isFailed && damagedLocation && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-600">
                            <MapPin className="w-3 h-3" />
                            Will be moved to {damagedLocation.code}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {allDecided && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-4">
              {passedCount > 0 && (
                <span className="flex items-center gap-1 text-green-700 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {passedCount} passed — will stay in Return Hold
                </span>
              )}
              {failedCount > 0 && (
                <span className="flex items-center gap-1 text-red-700 font-medium">
                  <XCircle className="w-3.5 h-3.5" />
                  {failedCount} failed — will move to Damaged
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmQC}
            disabled={processing || !allDecided || receivedItems.length === 0}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            {processing ? 'Saving QC Results...' : `Confirm QC (${receivedItems.length} item${receivedItems.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    </div>
  );
}
