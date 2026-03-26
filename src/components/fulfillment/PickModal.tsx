import { useState, useEffect, useRef } from 'react';
import { X, Package, MapPin, CheckCircle2, ScanLine, Camera, AlertTriangle, FlaskConical, Check } from 'lucide-react';
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
  isLabPick?: boolean;
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

export function PickModal({ order, isLabPick = false, onClose }: PickModalProps) {
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
        if (item.sku === 'RX' || item.sku === 'FEE') continue;

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

      let newStatus: string;
      const updateData: Record<string, string | null> = {};

      if (isLabPick) {
        newStatus = isPartial ? 'send_to_lab' : 'in_lab';
        updateData.fulfillment_status = newStatus;
        if (!isPartial) {
          await supabase.from('order_prescriptions').update({
            lab_status: 'in_lab',
            lab_sent_date: new Date().toISOString(),
          }).eq('order_id', order.id);
        }
      } else {
        newStatus = 'printed';
        updateData.fulfillment_status = newStatus;
      }

      await supabase.from('orders').update(updateData).eq('id', order.id);

      await supabase.from('order_activity_log').insert({
        order_id: order.id,
        action: isLabPick
          ? (isPartial ? 'Lab pick partially completed' : 'Lab pick completed — sent to lab')
          : (isPartial ? 'Partially picked' : 'Fully picked — ready to pack'),
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
      <DialogContent className="max-w-lg w-full mx-2 sm:mx-auto p-0 overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {isLabPick
              ? <FlaskConical className="h-5 w-5 text-teal-600 flex-shrink-0" />
              : <Package className="h-5 w-5 text-blue-600 flex-shrink-0" />
            }
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {isLabPick ? 'Lab Pick' : 'Pick Items'} — {displayOrderId}
              </h2>
              <p className="text-xs text-gray-500 hidden sm:block">Scan each item's barcode to confirm. Follow FIFO order.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-2 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading FIFO recommendations...</div>
          ) : (
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium text-gray-700">Progress</span>
                  <span className="text-gray-600 font-semibold">{pickedCount} / {totalItems} picked</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: allDone ? '#16a34a' : '#2563eb',
                    }}
                  />
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items to Pick</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {itemStates.map((state, idx) => (
                    <button
                      key={state.item_id}
                      onClick={() => !state.done && setCurrentItemIndex(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors ${
                        state.done
                          ? 'bg-green-50'
                          : idx === currentItemIndex
                          ? 'bg-blue-50'
                          : 'bg-white hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      {state.done ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          idx === currentItemIndex ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 text-gray-500'
                        }`}>
                          {idx + 1}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${state.done ? 'text-green-800' : 'text-gray-900'}`}>
                          {state.product_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Qty: {state.quantity - state.already_picked}
                          {state.lots[0] && <span className="ml-2 text-blue-600 font-mono">{state.lots[0].location_code}</span>}
                        </div>
                      </div>
                      {state.done && <span className="text-xs text-green-600 font-medium flex-shrink-0">Done</span>}
                    </button>
                  ))}
                </div>
              </div>

              {allDone ? (
                <div className="border border-green-200 bg-green-50 rounded-xl p-5 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
                  <div className="text-green-700 font-semibold text-base">All Items Picked!</div>
                  <div className="text-green-600 text-sm mt-1">Press "Complete Pick" — then use the Pack button</div>
                  <Button
                    variant="primary"
                    className="mt-4 w-full bg-gray-900 hover:bg-gray-800 text-white h-12 text-base"
                    onClick={() => submitPicks(false)}
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : 'Complete Pick'}
                  </Button>
                </div>
              ) : currentItem ? (
                <div className="border border-blue-200 bg-blue-50 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-blue-600 text-white">
                    <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                      Current Item ({currentItemIndex + 1}/{totalItems})
                    </div>
                    <div className="text-base font-bold mt-0.5 leading-tight">{currentItem.product_name}</div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white rounded-lg p-2.5 border border-blue-100">
                        <div className="text-xs text-gray-500 mb-0.5">SKU</div>
                        <div className="font-bold text-blue-700 truncate">{currentItem.sku}</div>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border border-blue-100">
                        <div className="text-xs text-gray-500 mb-0.5">Qty to Pick</div>
                        <div className="font-bold text-gray-800 text-lg leading-none">
                          {currentItem.quantity - currentItem.already_picked}
                        </div>
                      </div>
                    </div>

                    {currentLot ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-green-700 text-xs font-semibold mb-3">
                          <Package className="h-3.5 w-3.5" />
                          Recommended Lot (FIFO)
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white rounded-lg p-2.5 border border-green-100">
                            <div className="text-xs text-gray-500 mb-1">Barcode to Scan</div>
                            <div className="font-bold text-green-800 font-mono text-sm break-all leading-snug">
                              {currentLot.barcode}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-2.5 border border-green-100">
                            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> Location
                            </div>
                            <div className="font-bold text-blue-700 text-lg leading-none">{currentLot.location_code}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">No stock available for this item</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <ScanLine className="h-4 w-4" /> Scan Barcode
                      </div>
                      <div className="flex gap-2">
                        <input
                          ref={inputRef}
                          type="text"
                          inputMode="text"
                          placeholder="Scan or type barcode..."
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleScan(barcodeInput);
                          }}
                          className="flex-1 border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white min-h-[52px]"
                        />
                        <button
                          onClick={() => setShowCamera(true)}
                          className="px-3 border border-gray-300 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors bg-white min-h-[52px] min-w-[52px] flex items-center justify-center"
                          title="Use camera"
                        >
                          <Camera className="h-5 w-5 text-gray-600" />
                        </button>
                      </div>
                      {scanError && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-red-600 text-sm">{scanError}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleScan(barcodeInput)}
                          disabled={!barcodeInput.trim()}
                          className="flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-900 active:bg-black text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[52px]"
                        >
                          <ScanLine className="h-4 w-4" /> Confirm Scan
                        </button>
                        <button
                          onClick={handleManualConfirm}
                          className="flex items-center justify-center gap-2 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 active:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium transition-colors min-h-[52px]"
                        >
                          <Check className="h-4 w-4" /> Skip / Confirm
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 text-center">
                        "Skip / Confirm" picks without scanning — use if scanner unavailable
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {!allDone && pickedCount > 0 && (
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={onClose}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white border-0 text-sm"
                    onClick={() => submitPicks(true)}
                    disabled={processing}
                  >
                    {processing ? 'Saving...' : `Save Partial (${pickedCount}/${totalItems})`}
                  </Button>
                </div>
              )}

              {!allDone && pickedCount === 0 && (
                <div className="flex justify-start pt-1">
                  <Button variant="outline" className="h-12 px-6" onClick={onClose} disabled={processing}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
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
