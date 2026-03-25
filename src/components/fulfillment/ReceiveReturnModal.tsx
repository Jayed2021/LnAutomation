import { useState, useRef, useEffect } from 'react';
import { X, Printer, ScanLine, Camera, Check, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { printBarcodeLabels } from '../inventory/barcodePrint';

interface ReturnItemData {
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

interface ReturnData {
  id: string;
  return_number: string;
  order_id: string;
  order: { order_number: string; woo_order_id: number | null; cs_status: string } | null;
  items: ReturnItemData[];
}

interface Props {
  returnData: ReturnData;
  onClose: () => void;
  onReceived: () => void;
}

export function ReceiveReturnModal({ returnData, onClose, onReceived }: Props) {
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set());
  const [scanInput, setScanInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  const items = returnData.items ?? [];
  const totalItems = items.length;
  const receivedCount = scannedItems.size;
  const allScanned = totalItems > 0 && receivedCount === totalItems;
  const currentItem = items[currentItemIndex] ?? null;

  useEffect(() => {
    scanRef.current?.focus();
  }, [currentItemIndex]);

  const getItemName = (item: ReturnItemData) =>
    item.order_item?.product_name || item.product?.name || item.sku;

  const handleScan = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setScanError('');

    const matched = items.find(i =>
      i.sku === trimmed ||
      i.expected_barcode === trimmed ||
      i.product?.sku === trimmed
    );

    if (!matched) {
      setScanError(`No item found for barcode "${trimmed}". Expected: ${currentItem?.expected_barcode ?? currentItem?.sku ?? 'N/A'}`);
      setScanInput('');
      return;
    }

    if (scannedItems.has(matched.id)) {
      setScanError(`Item "${getItemName(matched)}" was already scanned.`);
      setScanInput('');
      return;
    }

    const next = new Set(scannedItems);
    next.add(matched.id);
    setScannedItems(next);
    setScanInput('');

    const nextUnscanned = items.findIndex((item, idx) => idx !== items.indexOf(matched) && !next.has(item.id));
    if (nextUnscanned !== -1) {
      setCurrentItemIndex(nextUnscanned);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan(scanInput);
    }
  };

  const handlePrint = (item: ReturnItemData) => {
    const barcode = item.expected_barcode || item.sku;
    if (!barcode) return;
    printBarcodeLabels([{ barcode, name: getItemName(item) }]);
  };

  const handleCompleteReceive = async () => {
    try {
      setProcessing(true);

      await supabase
        .from('returns')
        .update({ status: 'received', updated_at: new Date().toISOString() })
        .eq('id', returnData.id);

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

  const progressPct = totalItems > 0 ? (receivedCount / totalItems) * 100 : 0;

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
                Receive Return Items for Order {orderLabel}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Scan each returned item's barcode to confirm receipt. The barcode
                shown is the exact one that was dispatched with this order.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors ml-2 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-600">Progress</span>
            <span className="text-xs font-semibold text-blue-600">{receivedCount} / {totalItems} items received</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {totalItems > 0 ? (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                Expected Return Items:
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const isScanned = scannedItems.has(item.id);
                  const isCurrent = idx === currentItemIndex;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                        isScanned
                          ? 'bg-green-50 border-green-200'
                          : isCurrent
                            ? 'bg-blue-50 border-blue-300 shadow-sm'
                            : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isScanned
                            ? 'bg-green-500 text-white'
                            : isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                        }`}>
                          {isScanned ? <Check className="w-3 h-3" /> : idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">{getItemName(item)}</div>
                          <div className="text-xs text-gray-500">
                            SKU: {item.sku} | Qty: {item.quantity}
                            {item.expected_barcode && (
                              <> | <span className={isCurrent && !isScanned ? 'text-blue-600 font-medium' : ''}>Barcode: {item.expected_barcode}</span></>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePrint(item)}
                        title="Print barcode"
                        className="shrink-0 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-600 transition-all ml-2"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              No specific items are linked to this return. You can still mark it as received.
            </div>
          )}

          {currentItem && !allScanned && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-blue-700 mb-2.5 uppercase tracking-wide">
                Current Item ({currentItemIndex + 1}/{totalItems})
              </div>
              <div className="bg-white rounded-lg border border-blue-100 p-3 mb-3">
                <div className="text-xs text-gray-500 mb-0.5">Product</div>
                <div className="font-semibold text-gray-900 text-sm">{getItemName(currentItem)}</div>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div>
                    <div className="text-xs text-gray-400">SKU</div>
                    <div className="text-sm font-medium text-gray-800">{currentItem.sku}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Quantity</div>
                    <div className="text-sm font-medium text-gray-800">{currentItem.quantity}</div>
                  </div>
                </div>
              </div>

              {(currentItem.expected_barcode || currentItem.sku) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700">Expected Barcode (From Dispatch)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-700 text-base">
                      {currentItem.expected_barcode ?? currentItem.sku}
                    </span>
                    <button
                      onClick={() => handlePrint(currentItem)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print
                    </button>
                  </div>
                  <p className="text-xs text-amber-500 mt-1.5 italic">
                    This is the exact barcode that was sent with this order. Print it if the product arrived without packaging.
                  </p>
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
              </div>
            </div>
          )}

          {allScanned && (
            <div className="flex items-center gap-2.5 p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-700">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-sm">All items confirmed</div>
                <div className="text-xs text-green-600">You can now complete the receive process.</div>
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
            disabled={processing || (totalItems > 0 && !allScanned && receivedCount === 0)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              allScanned
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : receivedCount > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {processing
              ? 'Processing...'
              : allScanned
                ? `Complete Receive (${receivedCount}/${totalItems})`
                : receivedCount > 0
                  ? `Complete Receive (${receivedCount}/${totalItems} - Partial)`
                  : totalItems === 0
                    ? 'Mark as Received'
                    : `Complete Receive (0/${totalItems})`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
