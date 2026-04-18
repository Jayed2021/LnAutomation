import { useState, useRef, useEffect } from 'react';
import { X, Download, ScanLine, Camera, Check, Package, AlertTriangle, XCircle, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { downloadSingleBarcode } from '../inventory/barcodePrint';

interface ReturnItemData {
  id: string;
  sku: string;
  quantity: number;
  qc_status: string | null;
  expected_barcode: string | null;
  product_id: string;
  order_item_id: string | null;
  order_item: { product_name: string; unit_price: number } | null;
  product: { name: string; sku: string } | null;
}

interface ReturnData {
  id: string;
  return_number: string;
  return_reason: string;
  order_id: string;
  order: { order_number: string; woo_order_id: number | null; cs_status: string } | null;
  items: ReturnItemData[];
}

interface Props {
  returnData: ReturnData;
  onClose: () => void;
  onReceived: () => void;
}

type ItemAction = 'received' | 'lost' | null;

interface LostReasonState {
  [itemId: string]: string;
}

interface BarcodeOverride {
  barcode: string;
  productId: string;
  productName: string;
  sku: string;
}

type OverrideValidationState = 'idle' | 'loading' | 'valid' | 'invalid';

export function ReceiveReturnModal({ returnData, onClose, onReceived }: Props) {
  const items = returnData.items ?? [];
  const isExchange = returnData.return_reason === 'Exchange';

  const [itemActions, setItemActions] = useState<Record<string, ItemAction>>({});
  const [lostReasons, setLostReasons] = useState<LostReasonState>({});
  const [lostItemId, setLostItemId] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  const [overrideOpenId, setOverrideOpenId] = useState<string | null>(null);
  const [overrideInputs, setOverrideInputs] = useState<Record<string, string>>({});
  const [overrideValidation, setOverrideValidation] = useState<Record<string, OverrideValidationState>>({});
  const [overrideResults, setOverrideResults] = useState<Record<string, BarcodeOverride | null>>({});
  const [customBarcodes, setCustomBarcodes] = useState<Record<string, BarcodeOverride>>({});

  const totalItems = items.length;
  const actedCount = Object.keys(itemActions).length;
  const receivedIds = new Set(Object.entries(itemActions).filter(([, v]) => v === 'received').map(([k]) => k));
  const lostIds = new Set(Object.entries(itemActions).filter(([, v]) => v === 'lost').map(([k]) => k));
  const allActed = totalItems > 0 && actedCount === totalItems;
  const currentItem = items[currentItemIndex] ?? null;
  const canComplete = totalItems === 0 || (actedCount > 0 && receivedIds.size > 0);

  useEffect(() => {
    scanRef.current?.focus();
  }, [currentItemIndex]);

  const getItemName = (item: ReturnItemData) =>
    item.order_item?.product_name || item.product?.name || item.sku;

  const getEffectiveBarcode = (item: ReturnItemData) =>
    customBarcodes[item.id]?.barcode ?? item.expected_barcode ?? item.sku;

  const handleScan = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !currentItem || itemActions[currentItem.id]) return;
    setScanError('');

    const expectedBarcode = getEffectiveBarcode(currentItem);
    const originalExpected = currentItem.expected_barcode ?? currentItem.sku;

    if (
      trimmed !== expectedBarcode &&
      trimmed !== originalExpected &&
      trimmed !== currentItem.sku &&
      trimmed !== currentItem.product?.sku
    ) {
      setScanError(`Wrong barcode. Expected: ${expectedBarcode}`);
      setScanInput('');
      return;
    }

    setItemActions(prev => ({ ...prev, [currentItem.id]: 'received' }));
    setScanInput('');

    const nextUnacted = items.findIndex((item, idx) => idx !== currentItemIndex && !itemActions[item.id]);
    if (nextUnacted !== -1) {
      setCurrentItemIndex(nextUnacted);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleScan(scanInput);
  };

  const handleMarkLost = (itemId: string) => {
    setLostItemId(itemId);
  };

  const confirmMarkLost = (itemId: string) => {
    const reason = lostReasons[itemId] || 'Not delivered by courier';
    setItemActions(prev => ({ ...prev, [itemId]: 'lost' }));
    setLostReasons(prev => ({ ...prev, [itemId]: reason }));
    setLostItemId(null);

    const nextUnacted = items.findIndex(item => item.id !== itemId && !itemActions[item.id]);
    if (nextUnacted !== -1) setCurrentItemIndex(nextUnacted);
  };

  const handleUndoAction = (itemId: string) => {
    setItemActions(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    const idx = items.findIndex(i => i.id === itemId);
    if (idx !== -1) setCurrentItemIndex(idx);
  };

  const handleDownloadBarcode = (item: ReturnItemData) => {
    const barcode = getEffectiveBarcode(item);
    if (!barcode) return;
    downloadSingleBarcode(barcode);
  };

  const lookupBarcode = async (itemId: string, barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) {
      setOverrideValidation(prev => ({ ...prev, [itemId]: 'idle' }));
      setOverrideResults(prev => ({ ...prev, [itemId]: null }));
      return;
    }

    setOverrideValidation(prev => ({ ...prev, [itemId]: 'loading' }));
    setOverrideResults(prev => ({ ...prev, [itemId]: null }));

    const { data: lotRow } = await supabase
      .from('inventory_lots')
      .select('id, barcode, product_id, product:products!product_id(name, sku)')
      .eq('barcode', trimmed)
      .limit(1)
      .maybeSingle();

    if (lotRow) {
      const p = lotRow.product as { name: string; sku: string } | null;
      setOverrideValidation(prev => ({ ...prev, [itemId]: 'valid' }));
      setOverrideResults(prev => ({
        ...prev,
        [itemId]: {
          barcode: trimmed,
          productId: lotRow.product_id,
          productName: p?.name ?? trimmed,
          sku: p?.sku ?? trimmed,
        },
      }));
      return;
    }

    const { data: productRow } = await supabase
      .from('products')
      .select('id, name, sku, barcode')
      .eq('barcode', trimmed)
      .limit(1)
      .maybeSingle();

    if (productRow) {
      setOverrideValidation(prev => ({ ...prev, [itemId]: 'valid' }));
      setOverrideResults(prev => ({
        ...prev,
        [itemId]: {
          barcode: trimmed,
          productId: productRow.id,
          productName: productRow.name,
          sku: productRow.sku,
        },
      }));
      return;
    }

    setOverrideValidation(prev => ({ ...prev, [itemId]: 'invalid' }));
    setOverrideResults(prev => ({ ...prev, [itemId]: null }));
  };

  const handleOverrideInputChange = (itemId: string, value: string) => {
    setOverrideInputs(prev => ({ ...prev, [itemId]: value }));
    if (!value.trim()) {
      setOverrideValidation(prev => ({ ...prev, [itemId]: 'idle' }));
      setOverrideResults(prev => ({ ...prev, [itemId]: null }));
    }
  };

  const handleOverrideLookup = (itemId: string) => {
    lookupBarcode(itemId, overrideInputs[itemId] ?? '');
  };

  const handleApplyOverride = (itemId: string) => {
    const result = overrideResults[itemId];
    if (!result) return;
    setCustomBarcodes(prev => ({ ...prev, [itemId]: result }));
    setOverrideOpenId(null);
    setOverrideInputs(prev => ({ ...prev, [itemId]: '' }));
    setOverrideValidation(prev => ({ ...prev, [itemId]: 'idle' }));
    setOverrideResults(prev => ({ ...prev, [itemId]: null }));
  };

  const handleClearOverride = (itemId: string) => {
    setCustomBarcodes(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleCompleteReceive = async () => {
    try {
      setProcessing(true);

      const { data: returnHoldLoc } = await supabase
        .from('warehouse_locations')
        .select('id')
        .eq('location_type', 'return_hold')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const returnHoldId = returnHoldLoc?.id ?? null;

      for (const item of items) {
        const action = itemActions[item.id];
        if (!action) continue;

        if (action === 'received') {
          const override = customBarcodes[item.id];

          if (override) {
            await supabase
              .from('return_items')
              .update({
                sku: override.sku,
                expected_barcode: override.barcode,
                product_id: override.productId,
              })
              .eq('id', item.id);
          }

          const effectiveProductId = override?.productId ?? item.product_id;
          const effectiveBarcode = override?.barcode ?? item.expected_barcode ?? item.sku;
          const effectiveSku = override?.sku ?? item.sku;

          await supabase
            .from('return_items')
            .update({
              receive_status: 'received',
              hold_location_id: returnHoldId,
            })
            .eq('id', item.id);

          if (returnHoldId) {
            const { data: existingLot } = await supabase
              .from('inventory_lots')
              .select('id, remaining_quantity')
              .eq('barcode', effectiveBarcode)
              .eq('location_id', returnHoldId)
              .maybeSingle();

            if (existingLot) {
              await supabase
                .from('inventory_lots')
                .update({ remaining_quantity: existingLot.remaining_quantity + item.quantity })
                .eq('id', existingLot.id);

              await supabase.from('stock_movements').insert({
                movement_type: 'return_receive',
                product_id: effectiveProductId,
                lot_id: existingLot.id,
                to_location_id: returnHoldId,
                quantity: item.quantity,
                reference_type: 'return',
                reference_id: returnData.id,
              });
            } else {
              const lotNumber = `RET-HOLD-${returnData.return_number}-${effectiveSku}`;
              const { data: newLot } = await supabase
                .from('inventory_lots')
                .insert({
                  lot_number: lotNumber,
                  barcode: effectiveBarcode,
                  product_id: effectiveProductId,
                  location_id: returnHoldId,
                  received_date: new Date().toISOString().split('T')[0],
                  received_quantity: item.quantity,
                  remaining_quantity: item.quantity,
                  landed_cost_per_unit: 0,
                })
                .select('id')
                .single();

              if (newLot) {
                await supabase.from('stock_movements').insert({
                  movement_type: 'return_receive',
                  product_id: effectiveProductId,
                  lot_id: newLot.id,
                  to_location_id: returnHoldId,
                  quantity: item.quantity,
                  reference_type: 'return',
                  reference_id: returnData.id,
                });
              }
            }
          }
        } else if (action === 'lost') {
          const lostReason = lostReasons[item.id] || 'Not delivered by courier';
          await supabase
            .from('return_items')
            .update({
              receive_status: 'lost',
              lost_reason: lostReason,
              lost_at: new Date().toISOString(),
            })
            .eq('id', item.id);
        }
      }

      const hasReceived = receivedIds.size > 0;
      const allLost = lostIds.size === totalItems;
      const newStatus = allLost ? 'expected' : 'received';

      await supabase
        .from('returns')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', returnData.id);

      if (!hasReceived && allLost) {
      } else {
        await supabase
          .from('returns')
          .update({ status: 'received', updated_at: new Date().toISOString() })
          .eq('id', returnData.id);
      }

      onReceived();
    } catch (err) {
      console.error('Error completing receive:', err);
    } finally {
      setProcessing(false);
    }
  };

  const orderLabel = returnData.order?.woo_order_id
    ? `#${returnData.order.woo_order_id}`
    : returnData.order?.order_number ?? returnData.return_number;

  const progressPct = totalItems > 0 ? (actedCount / totalItems) * 100 : 0;
  void progressPct;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-base">
                Receive Return Items — Order {orderLabel}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Scan each item to confirm receipt. Items will be placed in the Return Hold location.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors ml-2 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isExchange && (
          <div className="mx-5 mt-4 flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <RefreshCw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Exchange return.</span> If the supplier sent the wrong item, use the override option per item to match the actual barcode received.
            </p>
          </div>
        )}

        {totalItems > 0 && (
          <div className="px-5 py-3 border-b border-gray-100 mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-600">Progress</span>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-blue-600">{receivedIds.size} received</span>
                {lostIds.size > 0 && <span className="font-semibold text-red-500">{lostIds.size} lost</span>}
                <span className="text-gray-400">{actedCount}/{totalItems}</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${(receivedIds.size / totalItems) * 100}%` }}
              />
              <div
                className="h-full bg-red-400 transition-all duration-300"
                style={{ width: `${(lostIds.size / totalItems) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {totalItems > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                Expected Return Items:
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const action = itemActions[item.id];
                  const isReceived = action === 'received';
                  const isLost = action === 'lost';
                  const isCurrent = idx === currentItemIndex && !action;
                  const override = customBarcodes[item.id];
                  const isOverrideOpen = overrideOpenId === item.id;
                  const validation = overrideValidation[item.id] ?? 'idle';
                  const result = overrideResults[item.id];

                  return (
                    <div key={item.id}>
                      <div
                        onClick={() => !action && setCurrentItemIndex(idx)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                          isReceived
                            ? 'bg-green-50 border-green-200'
                            : isLost
                              ? 'bg-red-50 border-red-200'
                              : isCurrent
                                ? 'bg-blue-50 border-blue-300 shadow-sm'
                                : 'bg-white border-gray-200 hover:border-gray-300 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isReceived
                              ? 'bg-green-500 text-white'
                              : isLost
                                ? 'bg-red-500 text-white'
                                : isCurrent
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-600'
                          }`}>
                            {isReceived ? <Check className="w-3 h-3" /> : isLost ? <XCircle className="w-3 h-3" /> : idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">{getItemName(item)}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                              <span>SKU: {override?.sku ?? item.sku} | Qty: {item.quantity}</span>
                              {override && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded text-xs font-medium">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  Override
                                </span>
                              )}
                              {isLost && lostReasons[item.id] && (
                                <span className="text-red-500 ml-1">— {lostReasons[item.id]}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {!action && isExchange && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (override) {
                                  handleClearOverride(item.id);
                                } else {
                                  setOverrideOpenId(isOverrideOpen ? null : item.id);
                                }
                              }}
                              title={override ? 'Clear barcode override' : 'Override barcode'}
                              className={`p-1.5 rounded-lg border text-xs transition-all ${
                                override
                                  ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                                  : isOverrideOpen
                                    ? 'bg-gray-100 border-gray-300 text-gray-600'
                                    : 'border-transparent text-gray-300 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600'
                              }`}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!action && (
                            <button
                              onClick={e => { e.stopPropagation(); handleMarkLost(item.id); }}
                              title="Mark as lost"
                              className="p-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 text-gray-300 hover:text-red-500 transition-all"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {action && (
                            <button
                              onClick={e => { e.stopPropagation(); handleUndoAction(item.id); }}
                              title="Undo"
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-all text-xs"
                            >
                              Undo
                            </button>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); handleDownloadBarcode(item); }}
                            title="Download barcode"
                            className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-600 transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isOverrideOpen && !action && (
                        <div className="mt-1.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="text-xs font-semibold text-amber-800 mb-2">
                            Override Barcode — {getItemName(item)}
                          </div>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={overrideInputs[item.id] ?? ''}
                              onChange={e => handleOverrideInputChange(item.id, e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleOverrideLookup(item.id); }}
                              placeholder="Enter or scan actual barcode..."
                              className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleOverrideLookup(item.id)}
                              disabled={!overrideInputs[item.id]?.trim() || validation === 'loading'}
                              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <Search className="w-3 h-3" />
                              Lookup
                            </button>
                          </div>

                          {validation === 'loading' && (
                            <div className="text-xs text-amber-700 flex items-center gap-1.5 py-1">
                              <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                              Searching product database...
                            </div>
                          )}

                          {validation === 'valid' && result && (
                            <div className="mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                              <div className="text-xs text-green-700 font-medium flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5" />
                                Product found
                              </div>
                              <div className="text-xs text-gray-800 mt-0.5 font-semibold">{result.productName}</div>
                              <div className="text-xs text-gray-500">SKU: {result.sku}</div>
                            </div>
                          )}

                          {validation === 'invalid' && (
                            <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                              <div className="text-xs text-red-700 font-medium flex items-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5" />
                                Barcode not found in product database
                              </div>
                              <div className="text-xs text-red-600 mt-0.5">Check the barcode and try again.</div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApplyOverride(item.id)}
                              disabled={validation !== 'valid' || !result}
                              className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              Apply Override
                            </button>
                            <button
                              onClick={() => {
                                setOverrideOpenId(null);
                                setOverrideInputs(prev => ({ ...prev, [item.id]: '' }));
                                setOverrideValidation(prev => ({ ...prev, [item.id]: 'idle' }));
                                setOverrideResults(prev => ({ ...prev, [item.id]: null }));
                              }}
                              className="px-3 py-1.5 border border-amber-200 text-amber-700 text-xs font-medium rounded-lg hover:bg-white transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {lostItemId === item.id && (
                        <div className="mt-1.5 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="text-xs font-semibold text-red-700 mb-1.5">Mark as Lost — {getItemName(item)}</div>
                          <input
                            type="text"
                            value={lostReasons[item.id] ?? 'Not delivered by courier'}
                            onChange={e => setLostReasons(prev => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Reason (e.g. Not delivered by courier)"
                            className="w-full px-3 py-2 border border-red-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 mb-2 bg-white"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => confirmMarkLost(item.id)}
                              className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              Confirm Lost
                            </button>
                            <button
                              onClick={() => setLostItemId(null)}
                              className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-white transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {totalItems === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              No items are linked to this return. You can still mark it as received.
            </div>
          )}

          {currentItem && !itemActions[currentItem.id] && lostItemId !== currentItem.id && overrideOpenId !== currentItem.id && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-blue-700 mb-2.5 uppercase tracking-wide">
                Current Item ({currentItemIndex + 1}/{totalItems})
              </div>
              <div className="bg-white rounded-lg border border-blue-100 p-3 mb-3">
                <div className="text-xs text-gray-500 mb-0.5">Product</div>
                <div className="font-semibold text-gray-900 text-sm">{getItemName(currentItem)}</div>
                {customBarcodes[currentItem.id] && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded text-xs font-medium">
                      <RefreshCw className="w-2.5 h-2.5" />
                      Overridden: {customBarcodes[currentItem.id].productName}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div>
                    <div className="text-xs text-gray-400">SKU</div>
                    <div className="text-sm font-medium text-gray-800">{customBarcodes[currentItem.id]?.sku ?? currentItem.sku}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Quantity</div>
                    <div className="text-sm font-medium text-gray-800">{currentItem.quantity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Price</div>
                    <div className="text-sm font-medium text-gray-800">
                      {currentItem.order_item?.unit_price != null
                        ? `৳${currentItem.order_item.unit_price.toFixed(2)}`
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {getEffectiveBarcode(currentItem) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700">
                      {customBarcodes[currentItem.id] ? 'Overridden Barcode' : 'Expected Barcode'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-700 text-base">
                      {getEffectiveBarcode(currentItem)}
                    </span>
                    <button
                      onClick={() => handleDownloadBarcode(currentItem)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <ScanLine className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs font-medium text-gray-600">Scan Barcode</span>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={scanRef}
                    type="text"
                    value={scanInput}
                    onChange={e => { setScanInput(e.target.value); setScanError(''); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Scan or enter barcode..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={() => handleScan(scanInput)}
                    disabled={!scanInput.trim()}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Scan
                  </button>
                  <button
                    className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                    title="Use camera"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                {scanError && (
                  <p className="text-xs text-red-600 mt-1.5">{scanError}</p>
                )}
                <button
                  onClick={() => handleMarkLost(currentItem.id)}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 underline underline-offset-2 transition-colors"
                >
                  Item not received? Mark as lost
                </button>
              </div>
            </div>
          )}

          {allActed && receivedIds.size > 0 && (
            <div className="flex items-center gap-2.5 p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-700">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-sm">All items processed</div>
                <div className="text-xs text-green-600">
                  {receivedIds.size} received, {lostIds.size} lost. Items will go to Return Hold location.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCompleteReceive}
            disabled={processing || !canComplete}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              canComplete
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {processing
              ? 'Processing...'
              : totalItems === 0
                ? 'Mark as Received'
                : `Complete Receive (${receivedIds.size} received${lostIds.size > 0 ? `, ${lostIds.size} lost` : ''})`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
