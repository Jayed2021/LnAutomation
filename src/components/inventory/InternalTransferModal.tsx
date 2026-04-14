import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, ArrowRight, CheckCircle, Trash2, MapPin, ScanLine, Package, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BarcodeScannerModal } from '../fulfillment/BarcodeScannerModal';

interface Location {
  id: string;
  code: string;
  name: string;
}

interface LotResult {
  id: string;
  lotNumber: string;
  productId: string;
  productName: string;
  sku: string;
  remainingQty: number;
}

interface TransferItem {
  lotId: string;
  lotNumber: string;
  productId: string;
  productName: string;
  sku: string;
  availableQty: number;
  transferQty: number;
}

interface InternalTransferModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;

const STEPS = [
  { num: 1 as Step, label: 'Source Location' },
  { num: 2 as Step, label: 'Select Products' },
  { num: 3 as Step, label: 'Destination' },
];

export function InternalTransferModal({ onClose, onSuccess }: InternalTransferModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);

  const [sourceInput, setSourceInput] = useState('');
  const [sourceLocation, setSourceLocation] = useState<Location | null>(null);
  const [sourceError, setSourceError] = useState('');
  const [sourceLoading, setSourceLoading] = useState(false);

  const [productInput, setProductInput] = useState('');
  const [scannedLot, setScannedLot] = useState<LotResult | null>(null);
  const [productError, setProductError] = useState('');
  const [productLoading, setProductLoading] = useState(false);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [pendingQty, setPendingQty] = useState(1);

  const [destInput, setDestInput] = useState('');
  const [destLocation, setDestLocation] = useState<Location | null>(null);
  const [destError, setDestError] = useState('');
  const [destLoading, setDestLoading] = useState(false);

  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [done, setDone] = useState(false);

  const [showSourceScanner, setShowSourceScanner] = useState(false);
  const [showProductScanner, setShowProductScanner] = useState(false);
  const [showDestScanner, setShowDestScanner] = useState(false);

  const sourceInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) sourceInputRef.current?.focus();
    if (step === 2) productInputRef.current?.focus();
    if (step === 3) destInputRef.current?.focus();
  }, [step]);

  const resolveLocation = useCallback(async (value: string): Promise<Location | null> => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const { data } = await supabase
      .from('warehouse_locations')
      .select('id, code, name')
      .eq('is_active', true)
      .or(`barcode.eq.${trimmed},code.ilike.${trimmed}`)
      .maybeSingle();
    return data ? { id: data.id, code: data.code, name: data.name } : null;
  }, []);

  const handleSourceSubmit = async (value?: string) => {
    const val = value ?? sourceInput;
    if (!val.trim()) return;
    setSourceError('');
    setSourceLoading(true);
    const loc = await resolveLocation(val);
    setSourceLoading(false);
    if (loc) {
      setSourceLocation(loc);
      setSourceInput(loc.code);
    } else {
      setSourceLocation(null);
      setSourceError('Location not found. Please check the code or barcode.');
    }
  };

  const handleSourceNext = () => {
    if (sourceLocation) setStep(2);
  };

  const handleProductSubmit = async (value?: string) => {
    const val = value ?? productInput;
    if (!val.trim()) return;
    setProductError('');
    setScannedLot(null);
    setProductLoading(true);

    const trimmed = val.trim();

    let data: any = null;

    const { data: byLotBarcode } = await supabase
      .from('inventory_lots')
      .select(`
        id, lot_number, remaining_quantity,
        products!inner(id, name, sku, barcode)
      `)
      .eq('location_id', sourceLocation!.id)
      .gt('remaining_quantity', 0)
      .eq('barcode', trimmed)
      .maybeSingle();

    if (byLotBarcode) {
      data = byLotBarcode;
    } else {
      const { data: byProductBarcode } = await supabase
        .from('inventory_lots')
        .select(`
          id, lot_number, remaining_quantity,
          products!inner(id, name, sku, barcode)
        `)
        .eq('location_id', sourceLocation!.id)
        .gt('remaining_quantity', 0)
        .eq('products.barcode', trimmed)
        .maybeSingle();

      if (byProductBarcode) {
        data = byProductBarcode;
      } else {
        const { data: byProductSku } = await supabase
          .from('inventory_lots')
          .select(`
            id, lot_number, remaining_quantity,
            products!inner(id, name, sku, barcode)
          `)
          .eq('location_id', sourceLocation!.id)
          .gt('remaining_quantity', 0)
          .ilike('products.sku', trimmed)
          .maybeSingle();

        data = byProductSku ?? null;
      }
    }

    setProductLoading(false);

    if (!data) {
      setProductError(`No stock found for "${val.trim()}" at ${sourceLocation!.code}. Check the SKU/barcode or source location.`);
      return;
    }

    const prod = (data as any).products;
    const alreadyAdded = transferItems.find(i => i.lotId === data.id);
    const existingQty = alreadyAdded?.transferQty ?? 0;
    const available = data.remaining_quantity - existingQty;

    if (available <= 0) {
      setProductError(`All available stock for ${prod.sku} (${data.lot_number}) is already in the transfer list.`);
      return;
    }

    setScannedLot({
      id: data.id,
      lotNumber: data.lot_number,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      remainingQty: available,
    });
    setPendingQty(1);
  };

  const handleAddToList = () => {
    if (!scannedLot) return;
    const qty = Math.min(Math.max(1, pendingQty), scannedLot.remainingQty);
    const existing = transferItems.find(i => i.lotId === scannedLot.id);
    if (existing) {
      setTransferItems(prev => prev.map(i =>
        i.lotId === scannedLot.id ? { ...i, transferQty: Math.min(i.transferQty + qty, i.availableQty + existing.transferQty) } : i
      ));
    } else {
      setTransferItems(prev => [...prev, {
        lotId: scannedLot.id,
        lotNumber: scannedLot.lotNumber,
        productId: scannedLot.productId,
        productName: scannedLot.productName,
        sku: scannedLot.sku,
        availableQty: scannedLot.remainingQty + qty,
        transferQty: qty,
      }]);
    }
    setScannedLot(null);
    setProductInput('');
    setProductError('');
    productInputRef.current?.focus();
  };

  const handleRemoveItem = (lotId: string) => {
    setTransferItems(prev => prev.filter(i => i.lotId !== lotId));
  };

  const handleDestSubmit = async (value?: string) => {
    const val = value ?? destInput;
    if (!val.trim()) return;
    setDestError('');
    setDestLoading(true);
    const loc = await resolveLocation(val);
    setDestLoading(false);
    if (!loc) {
      setDestLocation(null);
      setDestError('Location not found. Please check the code or barcode.');
      return;
    }
    if (loc.id === sourceLocation!.id) {
      setDestLocation(null);
      setDestError('Destination must be different from the source location.');
      return;
    }
    setDestLocation(loc);
    setDestInput(loc.code);
  };

  const handleCompleteTransfer = async () => {
    if (!sourceLocation || !destLocation || transferItems.length === 0) return;
    setTransferring(true);
    setTransferError('');

    try {
      for (const item of transferItems) {
        const { data: lotData, error: fetchErr } = await supabase
          .from('inventory_lots')
          .select('id, lot_number, product_id, shipment_id, po_id, location_id, received_date, received_quantity, remaining_quantity, landed_cost_per_unit, barcode, reserved_quantity')
          .eq('id', item.lotId)
          .single();

        if (fetchErr || !lotData) throw new Error(`Failed to fetch lot ${item.lotNumber}: ${fetchErr?.message}`);

        if (item.transferQty > lotData.remaining_quantity) {
          throw new Error(`Transfer quantity (${item.transferQty}) exceeds available stock (${lotData.remaining_quantity}) for lot ${item.lotNumber}.`);
        }

        let destLotId: string;

        const { data: existingDestLot } = await supabase
          .from('inventory_lots')
          .select('id, remaining_quantity')
          .eq('product_id', lotData.product_id)
          .eq('location_id', destLocation.id)
          .eq('lot_number', lotData.lot_number)
          .maybeSingle();

        if (item.transferQty === lotData.remaining_quantity) {
          if (existingDestLot) {
            const { error: mergeErr } = await supabase
              .from('inventory_lots')
              .update({ remaining_quantity: existingDestLot.remaining_quantity + item.transferQty })
              .eq('id', existingDestLot.id);

            if (mergeErr) throw new Error(`Failed to merge into destination lot ${item.lotNumber}: ${mergeErr.message}`);

            const { error: deleteErr } = await supabase
              .from('inventory_lots')
              .delete()
              .eq('id', item.lotId);

            if (deleteErr) throw new Error(`Failed to remove source lot ${item.lotNumber}: ${deleteErr.message}`);

            destLotId = existingDestLot.id;
          } else {
            const { error: moveErr } = await supabase
              .from('inventory_lots')
              .update({ location_id: destLocation.id })
              .eq('id', item.lotId);

            if (moveErr) throw new Error(`Failed to move lot ${item.lotNumber}: ${moveErr.message}`);

            destLotId = item.lotId;
          }
        } else {
          const { error: deductErr } = await supabase
            .from('inventory_lots')
            .update({ remaining_quantity: lotData.remaining_quantity - item.transferQty })
            .eq('id', item.lotId);

          if (deductErr) throw new Error(`Failed to deduct from lot ${item.lotNumber}: ${deductErr.message}`);

          if (existingDestLot) {
            const { error: mergeErr } = await supabase
              .from('inventory_lots')
              .update({ remaining_quantity: existingDestLot.remaining_quantity + item.transferQty })
              .eq('id', existingDestLot.id);

            if (mergeErr) throw new Error(`Failed to merge into destination lot ${item.lotNumber}: ${mergeErr.message}`);

            destLotId = existingDestLot.id;
          } else {
            const { data: newLot, error: insertErr } = await supabase
              .from('inventory_lots')
              .insert({
                lot_number: lotData.lot_number,
                product_id: lotData.product_id,
                shipment_id: lotData.shipment_id,
                po_id: lotData.po_id,
                location_id: destLocation.id,
                received_date: lotData.received_date,
                received_quantity: item.transferQty,
                remaining_quantity: item.transferQty,
                landed_cost_per_unit: lotData.landed_cost_per_unit,
                barcode: lotData.barcode,
                reserved_quantity: 0,
              })
              .select('id')
              .single();

            if (insertErr || !newLot) throw new Error(`Failed to create destination lot for ${item.lotNumber}: ${insertErr?.message}`);

            destLotId = newLot.id;
          }
        }

        const { error: movErr } = await supabase
          .from('stock_movements')
          .insert({
            movement_type: 'transfer',
            product_id: item.productId,
            lot_id: destLotId,
            from_location_id: sourceLocation.id,
            to_location_id: destLocation.id,
            quantity: item.transferQty,
            reference_type: 'internal_transfer',
            notes: `Transfer from ${sourceLocation.code} to ${destLocation.code}`,
            performed_by: user?.id,
          });

        if (movErr) throw new Error(`Failed to record movement for ${item.sku}: ${movErr.message}`);
      }

      setDone(true);
      onSuccess();
    } catch (err: any) {
      setTransferError(err.message || 'Transfer failed. Please try again.');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl w-full">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Internal Transfer</h2>
              <p className="text-sm text-gray-500 mt-0.5">Move stock between warehouse locations</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!done && (
            <div className="flex items-center gap-0 mb-6">
              {STEPS.map((s, idx) => (
                <div key={s.num} className="flex items-center flex-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      step > s.num ? 'bg-emerald-500 text-white' :
                      step === s.num ? 'bg-blue-600 text-white' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap ${
                      step === s.num ? 'text-blue-700' : step > s.num ? 'text-emerald-600' : 'text-gray-400'
                    }`}>{s.label}</span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`h-px flex-1 mx-3 ${step > s.num ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {done ? (
            <SuccessScreen
              source={sourceLocation!}
              dest={destLocation!}
              items={transferItems}
              onClose={onClose}
            />
          ) : step === 1 ? (
            <Step1
              inputRef={sourceInputRef}
              value={sourceInput}
              onChange={v => { setSourceInput(v); setSourceLocation(null); setSourceError(''); }}
              onSubmit={handleSourceSubmit}
              onScanClick={() => setShowSourceScanner(true)}
              location={sourceLocation}
              error={sourceError}
              loading={sourceLoading}
              onNext={handleSourceNext}
            />
          ) : step === 2 ? (
            <Step2
              inputRef={productInputRef}
              productValue={productInput}
              onProductChange={v => { setProductInput(v); setScannedLot(null); setProductError(''); }}
              onProductSubmit={handleProductSubmit}
              onScanClick={() => setShowProductScanner(true)}
              scannedLot={scannedLot}
              pendingQty={pendingQty}
              onQtyChange={setPendingQty}
              onAddToList={handleAddToList}
              transferItems={transferItems}
              onRemoveItem={handleRemoveItem}
              error={productError}
              loading={productLoading}
              sourceLocation={sourceLocation!}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          ) : (
            <Step3
              inputRef={destInputRef}
              value={destInput}
              onChange={v => { setDestInput(v); setDestLocation(null); setDestError(''); }}
              onSubmit={handleDestSubmit}
              onScanClick={() => setShowDestScanner(true)}
              location={destLocation}
              error={destError}
              loading={destLoading}
              transferItems={transferItems}
              sourceLocation={sourceLocation!}
              onComplete={handleCompleteTransfer}
              transferring={transferring}
              transferError={transferError}
              onBack={() => setStep(2)}
            />
          )}
        </DialogContent>
      </Dialog>

      {showSourceScanner && (
        <BarcodeScannerModal
          onScan={val => { setShowSourceScanner(false); setSourceInput(val); handleSourceSubmit(val); }}
          onClose={() => setShowSourceScanner(false)}
        />
      )}
      {showProductScanner && (
        <BarcodeScannerModal
          onScan={val => { setShowProductScanner(false); setProductInput(val); handleProductSubmit(val); }}
          onClose={() => setShowProductScanner(false)}
        />
      )}
      {showDestScanner && (
        <BarcodeScannerModal
          onScan={val => { setShowDestScanner(false); setDestInput(val); handleDestSubmit(val); }}
          onClose={() => setShowDestScanner(false)}
        />
      )}
    </>
  );
}

interface Step1Props {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onScanClick: () => void;
  location: Location | null;
  error: string;
  loading: boolean;
  onNext: () => void;
}

function Step1({ inputRef, value, onChange, onSubmit, onScanClick, location, error, loading, onNext }: Step1Props) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Source Location
        </label>
        <p className="text-xs text-gray-500 mb-3">Scan or enter the barcode/code of the location you are moving stock FROM.</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={e => onChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSubmit()}
              placeholder="Scan barcode or type location code..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={onScanClick}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Camera</span>
          </button>
          <Button variant="outline" onClick={() => onSubmit()} disabled={loading || !value.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
          </Button>
        </div>

        {location && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-emerald-800">{location.code}</span>
              {location.name && <span className="text-emerald-600 ml-1.5">— {location.name}</span>}
            </div>
          </div>
        )}
        {error && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="primary" onClick={onNext} disabled={!location}>
          Next: Select Products
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

interface Step2Props {
  inputRef: React.RefObject<HTMLInputElement>;
  productValue: string;
  onProductChange: (v: string) => void;
  onProductSubmit: () => void;
  onScanClick: () => void;
  scannedLot: LotResult | null;
  pendingQty: number;
  onQtyChange: (q: number) => void;
  onAddToList: () => void;
  transferItems: TransferItem[];
  onRemoveItem: (id: string) => void;
  error: string;
  loading: boolean;
  sourceLocation: Location;
  onNext: () => void;
  onBack: () => void;
}

function Step2({ inputRef, productValue, onProductChange, onProductSubmit, onScanClick, scannedLot, pendingQty, onQtyChange, onAddToList, transferItems, onRemoveItem, error, loading, sourceLocation, onNext, onBack }: Step2Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span className="text-xs text-blue-700">Scanning from: <span className="font-semibold">{sourceLocation.code}</span></span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Scan Product</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={inputRef}
              type="text"
              value={productValue}
              onChange={e => onProductChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onProductSubmit()}
              placeholder="Scan barcode or type SKU..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={onScanClick}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Camera</span>
          </button>
          <Button variant="outline" onClick={() => onProductSubmit()} disabled={loading || !productValue.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find'}
          </Button>
        </div>

        {error && (
          <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {scannedLot && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{scannedLot.productName}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                  <span className="font-mono">{scannedLot.sku}</span>
                  <span>Lot: <span className="font-medium text-gray-700">{scannedLot.lotNumber}</span></span>
                  <span>Available: <span className="font-semibold text-emerald-700">{scannedLot.remainingQty}</span></span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-gray-600">Transfer Qty:</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onQtyChange(Math.max(1, pendingQty - 1))}
                  className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center font-medium"
                >−</button>
                <input
                  type="number"
                  min={1}
                  max={scannedLot.remainingQty}
                  value={pendingQty}
                  onChange={e => onQtyChange(Math.min(scannedLot.remainingQty, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-16 text-center border border-gray-300 rounded py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => onQtyChange(Math.min(scannedLot.remainingQty, pendingQty + 1))}
                  className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center font-medium"
                >+</button>
              </div>
              <span className="text-xs text-gray-400">of {scannedLot.remainingQty}</span>
              <Button variant="primary" size="sm" onClick={onAddToList} className="ml-auto">
                Add to List
              </Button>
            </div>
          </div>
        )}
      </div>

      {transferItems.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
            <Package className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Transfer List</span>
            <span className="ml-auto text-xs text-gray-400">{transferItems.length} item{transferItems.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {transferItems.map(item => (
              <div key={item.lotId} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span className="font-mono">{item.sku}</span>
                    <span>Lot: {item.lotNumber}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">×{item.transferQty}</span>
                <button
                  onClick={() => onRemoveItem(item.lotId)}
                  className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button variant="primary" onClick={onNext} disabled={transferItems.length === 0}>
          Next: Destination
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

interface Step3Props {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onScanClick: () => void;
  location: Location | null;
  error: string;
  loading: boolean;
  transferItems: TransferItem[];
  sourceLocation: Location;
  onComplete: () => void;
  transferring: boolean;
  transferError: string;
  onBack: () => void;
}

function Step3({ inputRef, value, onChange, onSubmit, onScanClick, location, error, loading, transferItems, sourceLocation, onComplete, transferring, transferError, onBack }: Step3Props) {
  const totalQty = transferItems.reduce((s, i) => s + i.transferQty, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">From</p>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span className="font-semibold text-gray-900 text-sm">{sourceLocation.code}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{totalQty} unit{totalQty !== 1 ? 's' : ''}, {transferItems.length} item{transferItems.length !== 1 ? 's' : ''}</p>
        </div>
        <div className={`p-3 border rounded-lg ${location ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1">To</p>
          {location ? (
            <>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold text-emerald-800 text-sm">{location.code}</span>
              </div>
              {location.name && <p className="text-xs text-emerald-600 mt-0.5">{location.name}</p>}
            </>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Awaiting scan...</p>
          )}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
          <Package className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Items to Transfer</span>
        </div>
        <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
          {transferItems.map(item => (
            <div key={item.lotId} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span className="font-mono">{item.sku}</span>
                  <span>Lot: {item.lotNumber}</span>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900 shrink-0">×{item.transferQty}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Destination Location</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={e => onChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSubmit()}
              placeholder="Scan barcode or type location code..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={onScanClick}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Camera</span>
          </button>
          <Button variant="outline" onClick={() => onSubmit()} disabled={loading || !value.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
          </Button>
        </div>
        {error && (
          <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
        {location && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700">Confirmed: <span className="font-semibold">{location.code}</span></p>
          </div>
        )}
      </div>

      {transferError && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{transferError}</p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={transferring}>Back</Button>
        <Button
          variant="primary"
          onClick={onComplete}
          disabled={!location || transferring}
          className="min-w-36"
        >
          {transferring ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              Transferring...
            </>
          ) : (
            'Complete Transfer'
          )}
        </Button>
      </div>
    </div>
  );
}

interface SuccessScreenProps {
  source: Location;
  dest: Location;
  items: TransferItem[];
  onClose: () => void;
}

function SuccessScreen({ source, dest, items, onClose }: SuccessScreenProps) {
  const totalQty = items.reduce((s, i) => s + i.transferQty, 0);
  return (
    <div className="text-center space-y-5">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Transfer Complete</h3>
          <p className="text-sm text-gray-500 mt-0.5">{totalQty} unit{totalQty !== 1 ? 's' : ''} successfully transferred</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 text-sm">
        <div className="px-3 py-2 bg-gray-100 rounded-lg font-semibold text-gray-700">{source.code}</div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div className="px-3 py-2 bg-emerald-100 rounded-lg font-semibold text-emerald-700">{dest.code}</div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden text-left">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Transferred Items</span>
        </div>
        <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
          {items.map(item => (
            <div key={item.lotId} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span className="font-mono">{item.sku}</span>
                  <span>Lot: {item.lotNumber}</span>
                </div>
              </div>
              <span className="text-sm font-semibold text-emerald-700">×{item.transferQty}</span>
            </div>
          ))}
        </div>
      </div>

      <Button variant="primary" onClick={onClose} className="w-full">Done</Button>
    </div>
  );
}
