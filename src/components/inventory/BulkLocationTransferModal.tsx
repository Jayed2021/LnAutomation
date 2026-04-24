import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import {
  X, ArrowRight, AlertTriangle, CheckCircle, Package,
  Loader2, Info, ChevronRight, ShieldAlert
} from 'lucide-react';

interface LocationOption {
  id: string;
  code: string;
  name: string;
  unit_count: number;
  sku_count: number;
  last_audited_at: string | null;
}

interface LotPreview {
  lot_id: string;
  lot_number: string;
  sku: string;
  product_name: string;
  units: number;
  reserved: number;
  action: 'move' | 'merge';
  dest_lot_exists: boolean;
}

interface ReservationInfo {
  order_id: string;
  order_number: string | null;
  qty: number;
  lot_number: string;
}

interface Props {
  onClose: () => void;
  onDone: () => void;
  allLocations: LocationOption[];
}

type Step = 'select_source' | 'select_dest' | 'preview' | 'done';

export default function BulkLocationTransferModal({ onClose, onDone, allLocations }: Props) {
  const [step, setStep] = useState<Step>('select_source');
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [sourceSearch, setSourceSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [lotPreviews, setLotPreviews] = useState<LotPreview[]>([]);
  const [reservations, setReservations] = useState<ReservationInfo[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [result, setResult] = useState<{ lots_moved: number; units_moved: number; reserved: number } | null>(null);
  const [error, setError] = useState('');

  const source = allLocations.find(l => l.id === sourceId);
  const dest = allLocations.find(l => l.id === destId);

  const sourceFiltered = allLocations.filter(l =>
    l.id !== destId && l.unit_count > 0 &&
    (l.code.toLowerCase().includes(sourceSearch.toLowerCase()) ||
      l.name.toLowerCase().includes(sourceSearch.toLowerCase()))
  );

  const destFiltered = allLocations.filter(l =>
    l.id !== sourceId &&
    (l.code.toLowerCase().includes(destSearch.toLowerCase()) ||
      l.name.toLowerCase().includes(destSearch.toLowerCase()))
  );

  const loadPreview = async () => {
    if (!sourceId || !destId) return;
    setLoadingPreview(true);
    try {
      const { data: sourceLots } = await supabase
        .from('inventory_lots')
        .select('id, lot_number, product_id, remaining_quantity, reserved_quantity, products(sku, name)')
        .eq('location_id', sourceId)
        .gt('remaining_quantity', 0);

      const { data: destLots } = await supabase
        .from('inventory_lots')
        .select('lot_number')
        .eq('location_id', destId)
        .gt('remaining_quantity', 0);

      const destLotNumbers = new Set((destLots || []).map((l: any) => l.lot_number));

      const previews: LotPreview[] = (sourceLots || []).map((l: any) => ({
        lot_id: l.id,
        lot_number: l.lot_number,
        sku: l.products?.sku || '?',
        product_name: l.products?.name || 'Unknown',
        units: l.remaining_quantity,
        reserved: l.reserved_quantity ?? 0,
        dest_lot_exists: destLotNumbers.has(l.lot_number),
        action: destLotNumbers.has(l.lot_number) ? 'merge' : 'move',
      }));

      setLotPreviews(previews);

      // Load active reservations on source lots
      if (previews.length > 0) {
        const lotIds = previews.map(p => p.lot_id);
        const { data: resData } = await supabase
          .from('order_lot_reservations')
          .select('order_id, quantity, lot_id, inventory_lots(lot_number), orders(woo_order_id)')
          .in('lot_id', lotIds);

        setReservations((resData || []).map((r: any) => ({
          order_id: r.order_id,
          order_number: r.orders?.woo_order_id ? String(r.orders.woo_order_id) : null,
          qty: r.quantity,
          lot_number: (r.inventory_lots as any)?.lot_number || '?',
        })));
      }

      setStep('preview');
    } catch (err) {
      console.error(err);
      setError('Failed to load preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const executeTransfer = async () => {
    if (!sourceId || !destId) return;
    setTransferring(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('bulk_transfer_location', {
        p_source_id: sourceId,
        p_dest_id: destId,
      });
      if (rpcError) throw rpcError;
      setResult(data as any);
      setStep('done');
    } catch (err: any) {
      setError(err?.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const sourceAuditWarning = source && !source.last_audited_at;
  const destHasStock = dest && dest.unit_count > 0;
  const totalReserved = lotPreviews.reduce((s, l) => s + l.reserved, 0);
  const totalUnits = lotPreviews.reduce((s, l) => s + l.units, 0);
  const mergeCount = lotPreviews.filter(l => l.action === 'merge').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <ArrowRight className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Bulk Location Transfer</h2>
              <p className="text-xs text-gray-400">Move all inventory from one box to another</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-xs">
            {(['select_source', 'select_dest', 'preview', 'done'] as Step[]).map((s, i) => {
              const labels = ['Source', 'Destination', 'Preview', 'Done'];
              const isCurrent = step === s;
              const isDone = ['select_source', 'select_dest', 'preview', 'done'].indexOf(step) > i;
              return (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                  <span className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                    isCurrent ? 'bg-blue-100 text-blue-700' :
                    isDone ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400'
                  }`}>{labels[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 1 – Select Source */}
          {step === 'select_source' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Select the box you want to move stock <strong>from</strong>. Only locations with stock are shown.</p>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by code or name..."
                value={sourceSearch}
                onChange={e => setSourceSearch(e.target.value)}
                autoFocus
              />
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {sourceFiltered.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">No locations with stock found</p>
                )}
                {sourceFiltered.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => setSourceId(loc.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      sourceId === loc.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-semibold text-sm text-gray-900">{loc.code}</span>
                      <span className="text-xs text-gray-400 ml-2">{loc.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{loc.unit_count} units</span>
                      <span>{loc.sku_count} SKUs</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 – Select Destination */}
          {step === 'select_dest' && source && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-blue-800">
                  Moving all stock from <strong className="font-mono">{source.code}</strong> ({source.unit_count} units, {source.sku_count} SKUs)
                </span>
              </div>

              {sourceAuditWarning && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    <strong>{source.code}</strong> has no audit record. It is recommended to audit this location before transferring to ensure accuracy.
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-600">Select the box to move stock <strong>into</strong>.</p>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by code or name..."
                value={destSearch}
                onChange={e => setDestSearch(e.target.value)}
                autoFocus
              />
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {destFiltered.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => setDestId(loc.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      destId === loc.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-semibold text-sm text-gray-900">{loc.code}</span>
                      <span className="text-xs text-gray-400 ml-2">{loc.name}</span>
                      {loc.unit_count > 0 && (
                        <span className="ml-2 text-xs text-amber-600 font-medium">has stock</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{loc.unit_count} units</span>
                      <span>{loc.sku_count} SKUs</span>
                    </div>
                  </button>
                ))}
              </div>

              {destId && destHasStock && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    <strong>{dest?.code}</strong> already has {dest?.unit_count} units. Lots with the same lot number will be <strong>merged</strong>. It is recommended to audit this location first.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3 – Preview */}
          {step === 'preview' && source && dest && (
            <div className="space-y-4">
              {/* Transfer summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{lotPreviews.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Lots to transfer</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{totalUnits}</p>
                  <p className="text-xs text-gray-500 mt-1">Units moving</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${totalReserved > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
                  <p className={`text-2xl font-bold ${totalReserved > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{totalReserved}</p>
                  <p className={`text-xs mt-1 ${totalReserved > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Reserved units</p>
                </div>
              </div>

              {/* Direction */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200 text-sm">
                <span className="font-mono font-bold text-blue-900">{source.code}</span>
                <ArrowRight className="w-4 h-4 text-blue-600" />
                <span className="font-mono font-bold text-blue-900">{dest.code}</span>
                {mergeCount > 0 && (
                  <span className="ml-auto text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    {mergeCount} lot{mergeCount > 1 ? 's' : ''} will merge
                  </span>
                )}
              </div>

              {/* Reservation warning */}
              {totalReserved > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">{totalReserved} units are reserved for active orders</p>
                    <p className="text-xs text-amber-700">These reservations will automatically follow the lots to the new location. No order data will be affected.</p>
                    <div className="mt-2 space-y-1">
                      {reservations.slice(0, 5).map((r, i) => (
                        <p key={i} className="text-xs font-mono">
                          Order #{r.order_number || r.order_id.slice(0, 8)} — {r.qty} units from {r.lot_number}
                        </p>
                      ))}
                      {reservations.length > 5 && (
                        <p className="text-xs text-amber-600">+{reservations.length - 5} more reservations</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Lot list */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Lots to transfer</p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {lotPreviews.map(lot => (
                    <div key={lot.lot_id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-xs text-gray-500">{lot.lot_number}</span>
                        <span className="ml-2 text-gray-700">{lot.sku}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs shrink-0">
                        <span className="text-gray-600">{lot.units} units</span>
                        {lot.reserved > 0 && (
                          <span className="text-amber-600">{lot.reserved} reserved</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          lot.action === 'merge'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {lot.action}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 4 – Done */}
          {step === 'done' && result && (
            <div className="flex flex-col items-center text-center py-8 space-y-4">
              <div className="p-4 bg-emerald-50 rounded-full">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Transfer Complete</h3>
                <p className="text-sm text-gray-500 mt-1">
                  All stock from <span className="font-mono font-semibold">{source?.code}</span> has been moved to <span className="font-mono font-semibold">{dest?.code}</span>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 w-full mt-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-gray-900">{result.lots_moved}</p>
                  <p className="text-xs text-gray-500 mt-1">Lots moved</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-gray-900">{result.units_moved}</p>
                  <p className="text-xs text-gray-500 mt-1">Units moved</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-gray-900">{result.reserved}</p>
                  <p className="text-xs text-gray-500 mt-1">Reservations migrated</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200 text-left w-full">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  You can now print a new barcode label for <span className="font-mono font-semibold">{dest?.code}</span> and paste it on the physical box.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          {step === 'select_source' && (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => setStep('select_dest')} disabled={!sourceId}>
                Next: Select Destination
              </Button>
            </>
          )}
          {step === 'select_dest' && (
            <>
              <Button variant="outline" onClick={() => setStep('select_source')}>Back</Button>
              <Button onClick={loadPreview} disabled={!destId || loadingPreview} className="flex items-center gap-2">
                {loadingPreview && <Loader2 className="w-4 h-4 animate-spin" />}
                Preview Transfer
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('select_dest')}>Back</Button>
              <Button
                onClick={executeTransfer}
                disabled={transferring || lotPreviews.length === 0}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {transferring && <Loader2 className="w-4 h-4 animate-spin" />}
                {transferring ? 'Transferring...' : `Confirm Transfer (${totalUnits} units)`}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={() => { onDone(); onClose(); }} className="ml-auto">
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
