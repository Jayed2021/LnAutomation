import { useState, useEffect, useRef } from 'react';
import { X, Package, MapPin, CheckCircle2, ScanLine, Camera, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface OrderItem {
  id: string;
  sku: string;
  product_name: string;
  quantity: number;
  picked_quantity: number;
  unit_price?: number;
}

interface PickModalProps {
  order: {
    id: string;
    order_number: string;
    woo_order_number?: string | null;
    customer: { full_name: string };
    items: OrderItem[];
  };
  onClose: () => void;
}

interface LotRecommendation {
  lot_id: string;
  lot_number: string;
  barcode: string;
  location_code: string;
  available_quantity: number;
  received_date: string;
  recommended_quantity: number;
}

interface ItemPickState {
  item_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  already_picked: number;
  lots: LotRecommendation[];
  picked_this_session: number;
  done: boolean;
}

export function PickModal({ order, onClose }: PickModalProps) {
  const [loading, setLoading] = useState(true);
  const [itemStates, setItemStates] = useState<ItemPickState[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFIFORecommendations();
  }, []);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading, currentItemIndex]);

  const fetchFIFORecommendations = async () => {
    try {
      setLoading(true);
      const states: ItemPickState[] = [];

      for (const item of order.items) {
        const remainingToPick = item.quantity - item.picked_quantity;
        if (remainingToPick <= 0) {
          states.push({
            item_id: item.id,
            product_id: '',
            sku: item.sku,
            product_name: item.product_name,
            quantity: item.quantity,
            already_picked: item.picked_quantity,
            lots: [],
            picked_this_session: 0,
            done: true,
          });
          continue;
        }

        const { data: product } = await supabase
          .from('products')
          .select('id')
          .eq('sku', item.sku)
          .maybeSingle();

        if (!product) {
          states.push({
            item_id: item.id,
            product_id: '',
            sku: item.sku,
            product_name: item.product_name,
            quantity: item.quantity,
            already_picked: item.picked_quantity,
            lots: [],
            picked_this_session: 0,
            done: false,
          });
          continue;
        }

        const { data: lots } = await supabase
          .from('inventory_lots')
          .select(`
            id,
            lot_number,
            barcode,
            remaining_quantity,
            received_date,
            location:warehouse_locations(code, name)
          `)
          .eq('product_id', product.id)
          .gt('remaining_quantity', 0)
          .order('received_date', { ascending: true });

        let remaining = remainingToPick;
        const lotRecs: LotRecommendation[] = [];

        for (const lot of lots || []) {
          if (remaining <= 0) break;
          const pickQty = Math.min(remaining, lot.remaining_quantity);
          lotRecs.push({
            lot_id: lot.id,
            lot_number: lot.lot_number,
            barcode: lot.barcode || lot.lot_number,
            location_code: lot.location?.code || 'N/A',
            available_quantity: lot.remaining_quantity,
            received_date: lot.received_date,
            recommended_quantity: pickQty,
          });
          remaining -= pickQty;
        }

        states.push({
          item_id: item.id,
          product_id: product.id,
          sku: item.sku,
          product_name: item.product_name,
          quantity: item.quantity,
          already_picked: item.picked_quantity,
          lots: lotRecs,
          picked_this_session: 0,
          done: false,
        });
      }

      setItemStates(states);
      const firstPending = states.findIndex(s => !s.done);
      setCurrentItemIndex(firstPending >= 0 ? firstPending : 0);
    } catch (err) {
      console.error('Error fetching FIFO:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalItems = itemStates.length;
  const pickedCount = itemStates.filter(s => s.done).length;
  const progressPct = totalItems > 0 ? (pickedCount / totalItems) * 100 : 0;
  const allDone = pickedCount === totalItems && totalItems > 0;

  const currentItem = itemStates[currentItemIndex];
  const currentLot = currentItem?.lots[0];

  const handleScan = (value: string) => {
    setScanError('');
    const trimmed = value.trim();
    if (!trimmed || !currentItem || currentItem.done) return;

    const expectedBarcode = currentLot?.barcode;

    if (expectedBarcode && trimmed !== expectedBarcode) {
      setScanError(`Wrong barcode. Expected: ${expectedBarcode}`);
      setBarcodeInput('');
      return;
    }

    const newStates = [...itemStates];
    newStates[currentItemIndex] = {
      ...newStates[currentItemIndex],
      picked_this_session: newStates[currentItemIndex].quantity - newStates[currentItemIndex].already_picked,
      done: true,
    };
    setItemStates(newStates);
    setBarcodeInput('');

    const nextIndex = newStates.findIndex((s, i) => i > currentItemIndex && !s.done);
    if (nextIndex >= 0) {
      setCurrentItemIndex(nextIndex);
    }
  };

  const handleManualConfirm = () => {
    if (!currentItem || currentItem.done) return;
    setScanError('');

    const newStates = [...itemStates];
    newStates[currentItemIndex] = {
      ...newStates[currentItemIndex],
      picked_this_session: newStates[currentItemIndex].quantity - newStates[currentItemIndex].already_picked,
      done: true,
    };
    setItemStates(newStates);
    setBarcodeInput('');

    const nextIndex = newStates.findIndex((s, i) => i > currentItemIndex && !s.done);
    if (nextIndex >= 0) {
      setCurrentItemIndex(nextIndex);
    }
  };

  const submitPicks = async (isPartial: boolean) => {
    try {
      setProcessing(true);

      for (const state of itemStates) {
        if (state.picked_this_session <= 0) continue;

        let remaining = state.picked_this_session;
        for (const lot of state.lots) {
          if (remaining <= 0) break;
          const qty = Math.min(remaining, lot.recommended_quantity);

          await supabase.from('order_picks').insert({
            order_id: order.id,
            order_item_id: state.item_id,
            lot_id: lot.lot_id,
            quantity: qty,
          });

          if (qty >= lot.available_quantity) {
            const { data: lotData } = await supabase
              .from('inventory_lots')
              .select('id, product_id, location_id')
              .eq('id', lot.lot_id)
              .maybeSingle();

            if (lotData) {
              const { data: existing } = await supabase
                .from('audit_flags')
                .select('id')
                .eq('lot_id', lot.lot_id)
                .eq('status', 'open')
                .eq('trigger_type', 'fulfillment_overcount')
                .maybeSingle();

              if (!existing) {
                await supabase.from('audit_flags').insert({
                  location_id: lotData.location_id,
                  product_id: lotData.product_id,
                  lot_id: lot.lot_id,
                  trigger_type: 'fulfillment_overcount',
                  expected_quantity: lot.available_quantity,
                  counted_quantity: null,
                  status: 'open',
                });
              }
            }
          }

          await supabase
            .from('order_items')
            .update({ picked_quantity: state.already_picked + qty })
            .eq('id', state.item_id);

          remaining -= qty;
        }
      }

      const newStatus = isPartial ? 'printed' : 'packed';
      const updateData: Record<string, string | null> = { fulfillment_status: newStatus };
      if (!isPartial) {
        updateData.packed_at = new Date().toISOString();
      }

      await supabase.from('orders').update(updateData).eq('id', order.id);

      await supabase.from('order_activity_log').insert({
        order_id: order.id,
        action: isPartial ? 'Partially picked' : 'Fully picked and packed',
      });

      onClose();
    } catch (err) {
      console.error('Error saving picks:', err);
    } finally {
      setProcessing(false);
    }
  };

  const displayOrderId = order.woo_order_number
    ? `#${order.woo_order_number}`
    : order.order_number;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Pick Items for Order {displayOrderId}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Scan each item's barcode to confirm picking. Follow FIFO (First In, First Out) order.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-2 mt-0.5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading FIFO recommendations...</div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">Progress</span>
                <span className="text-gray-600">{pickedCount} / {totalItems} items picked</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: allDone ? '#16a34a' : '#2563eb',
                  }}
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Items to Pick:</div>
              <div className="space-y-1.5">
                {itemStates.map((state, idx) => (
                  <div
                    key={state.item_id}
                    onClick={() => !state.done && setCurrentItemIndex(idx)}
                    className={`flex items-center gap-3 p-2 rounded-lg border transition-colors cursor-pointer ${
                      state.done
                        ? 'bg-green-50 border-green-200'
                        : idx === currentItemIndex
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {state.done ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        idx === currentItemIndex ? 'border-blue-500 text-blue-600' : 'border-gray-400 text-gray-500'
                      }`}>
                        {idx + 1}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{state.product_name}</div>
                      <div className="text-xs text-gray-500">
                        Qty: {state.quantity - state.already_picked}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {allDone ? (
              <div className="border border-green-200 bg-green-50 rounded-lg p-5 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
                <div className="text-green-700 font-semibold text-base">All Items Picked!</div>
                <div className="text-green-600 text-sm">Order is ready for packing</div>
                <Button
                  variant="primary"
                  className="mt-4 w-full bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={() => submitPicks(false)}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Complete Pick Operation'}
                </Button>
              </div>
            ) : currentItem ? (
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
                <div className="text-sm font-semibold text-gray-700">
                  Current Item ({currentItemIndex + 1}/{totalItems})
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Product</div>
                  <div className="text-base font-bold text-gray-900">{currentItem.product_name}</div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">SKU</div>
                    <div className="font-semibold text-blue-700">{currentItem.sku}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Quantity</div>
                    <div className="font-semibold text-gray-800">
                      {currentItem.quantity - currentItem.already_picked}
                    </div>
                  </div>
                  {order.items[currentItemIndex]?.unit_price != null && (
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Price</div>
                      <div className="font-semibold text-gray-800">
                        ৳{order.items[currentItemIndex].unit_price?.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>

                {currentLot ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-green-700 text-xs font-semibold mb-2">
                      <Package className="h-3.5 w-3.5" />
                      Recommended Lot (FIFO)
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">Barcode to Scan</div>
                        <div className="font-bold text-green-800 font-mono text-xs break-all">
                          {currentLot.barcode}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Location
                        </div>
                        <div className="font-bold text-blue-700">{currentLot.location_code}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">No stock available for this item</span>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <ScanLine className="h-4 w-4" /> Scan Barcode
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Scan or enter barcode..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleScan(barcodeInput);
                        }
                      }}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleScan(barcodeInput)}
                      disabled={!barcodeInput.trim()}
                    >
                      Scan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCamera(true)}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  {scanError && (
                    <p className="text-red-600 text-xs mt-1">{scanError}</p>
                  )}
                  <button
                    onClick={handleManualConfirm}
                    className="text-xs text-blue-600 hover:underline mt-1.5 block"
                  >
                    Click the camera button to use your phone's camera for scanning
                  </button>
                </div>
              </div>
            ) : null}

            {!allDone && pickedCount > 0 && (
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white border-0"
                  onClick={() => submitPicks(true)}
                  disabled={processing}
                >
                  {processing ? 'Saving...' : `Complete Pick (${pickedCount}/${totalItems} - Partial)`}
                </Button>
              </div>
            )}

            {!allDone && pickedCount === 0 && (
              <div className="flex justify-start pt-1">
                <Button variant="outline" onClick={onClose} disabled={processing}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      {showCamera && (
        <BarcodeScannerModal
          onScan={(barcode) => {
            setShowCamera(false);
            handleScan(barcode);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </Dialog>
  );
}
