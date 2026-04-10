import { useState, useEffect } from 'react';
import { X, Package, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';

interface PackagingProduct {
  id: string;
  sku: string;
  name: string;
  lots: LotOption[];
}

interface LotOption {
  id: string;
  lot_number: string;
  available_qty: number;
  received_date: string | null;
}

interface DispatchRow {
  product_id: string;
  sku: string;
  name: string;
  selected_lot_id: string;
  quantity: number;
  available_qty: number;
  lots: LotOption[];
  error: string;
}

interface Props {
  onClose: () => void;
  onDispatched: () => void;
  currentUser?: string;
}

export function DispatchPackagingModal({ onClose, onDispatched, currentUser }: Props) {
  const [rows, setRows] = useState<DispatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadPackagingProducts();
  }, []);

  const loadPackagingProducts = async () => {
    setLoading(true);
    try {
      const { data: products } = await supabase
        .from('products')
        .select('id, sku, name')
        .eq('product_type', 'packaging_material')
        .order('name');

      if (!products || products.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const productIds = products.map(p => p.id);

      const { data: lots } = await supabase
        .from('inventory_lots')
        .select('id, product_id, lot_number, remaining_quantity, reserved_quantity, received_date')
        .in('product_id', productIds)
        .gt('remaining_quantity', 0)
        .order('received_date', { ascending: true })
        .order('created_at', { ascending: true });

      const lotsByProduct = new Map<string, LotOption[]>();
      for (const lot of lots || []) {
        const available = Math.max(0, (lot.remaining_quantity || 0) - (lot.reserved_quantity || 0));
        if (available <= 0) continue;
        if (!lotsByProduct.has(lot.product_id)) lotsByProduct.set(lot.product_id, []);
        lotsByProduct.get(lot.product_id)!.push({
          id: lot.id,
          lot_number: lot.lot_number || 'Default',
          available_qty: available,
          received_date: lot.received_date,
        });
      }

      const initialRows: DispatchRow[] = products.map(p => {
        const productLots = lotsByProduct.get(p.id) || [];
        const fifoLot = productLots[0] || null;
        const totalAvailable = productLots.reduce((s, l) => s + l.available_qty, 0);
        return {
          product_id: p.id,
          sku: p.sku,
          name: p.name,
          selected_lot_id: fifoLot?.id || '',
          quantity: 0,
          available_qty: totalAvailable,
          lots: productLots,
          error: '',
        };
      });

      setRows(initialRows);
    } catch (err) {
      console.error('Failed to load packaging products:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (index: number, changes: Partial<DispatchRow>) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== index) return r;
      const updated = { ...r, ...changes };
      if (changes.selected_lot_id !== undefined) {
        const lot = updated.lots.find(l => l.id === changes.selected_lot_id);
        updated.available_qty = lot ? lot.available_qty : updated.lots.reduce((s, l) => s + l.available_qty, 0);
      }
      return updated;
    }));
  };

  const validateRows = () => {
    let valid = true;
    setRows(prev => prev.map(r => {
      if (r.quantity <= 0) return { ...r, error: '' };
      if (!r.selected_lot_id) {
        valid = false;
        return { ...r, error: 'Select a lot' };
      }
      const lot = r.lots.find(l => l.id === r.selected_lot_id);
      if (lot && r.quantity > lot.available_qty) {
        valid = false;
        return { ...r, error: `Only ${lot.available_qty} available in this lot` };
      }
      return { ...r, error: '' };
    }));
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateRows()) return;

    const activeRows = rows.filter(r => r.quantity > 0 && r.selected_lot_id);
    if (activeRows.length === 0) return;

    setSubmitting(true);
    try {
      const { data: logData, error: logError } = await supabase
        .from('packaging_dispatch_logs')
        .insert({
          dispatch_date: new Date().toISOString().slice(0, 10),
          notes: notes.trim() || null,
          created_by: currentUser || null,
        })
        .select('id')
        .single();

      if (logError || !logData) throw logError;

      const dispatchLogId = logData.id;

      const itemsToInsert = activeRows.map(r => ({
        dispatch_log_id: dispatchLogId,
        product_id: r.product_id,
        lot_id: r.selected_lot_id,
        lot_number: r.lots.find(l => l.id === r.selected_lot_id)?.lot_number || null,
        quantity: r.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('packaging_dispatch_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      for (const r of activeRows) {
        const { data: lotData } = await supabase
          .from('inventory_lots')
          .select('remaining_quantity, product_id, location_id')
          .eq('id', r.selected_lot_id)
          .maybeSingle();

        if (lotData) {
          const newQty = Math.max(0, (lotData.remaining_quantity || 0) - r.quantity);
          await supabase
            .from('inventory_lots')
            .update({ remaining_quantity: newQty })
            .eq('id', r.selected_lot_id);

          await supabase
            .from('stock_movements')
            .insert({
              product_id: r.product_id,
              lot_id: r.selected_lot_id,
              from_location_id: lotData.location_id || null,
              movement_type: 'pkg_dispatch',
              quantity: -r.quantity,
              reference_type: 'packaging_dispatch',
              reference_id: dispatchLogId,
              notes: `Packaging dispatched — ${r.lots.find(l => l.id === r.selected_lot_id)?.lot_number || 'lot'}`,
            });
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onDispatched();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Dispatch failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = rows.filter(r => r.quantity > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Dispatch Packaging Materials</h2>
              <p className="text-xs text-gray-500">Enter quantities dispatched today. Stock will be deducted per lot (FIFO recommended).</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading packaging products...</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No packaging materials found in inventory.</div>
          ) : success ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <CheckCircle className="h-12 w-12 text-emerald-500" />
              <p className="text-base font-semibold text-gray-800">Dispatch recorded successfully</p>
              <p className="text-sm text-gray-500">Stock has been deducted from the selected lots.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_180px_100px] gap-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <span>Product</span>
                <span>Lot (FIFO recommended)</span>
                <span>Qty</span>
              </div>

              {rows.map((row, idx) => (
                <div key={row.product_id} className="grid grid-cols-[1fr_180px_100px] gap-2 items-start">
                  <div className="py-2 px-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 leading-tight">{row.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{row.sku}</p>
                    {row.available_qty > 0 ? (
                      <p className="text-xs text-emerald-600 mt-0.5">{row.available_qty} available</p>
                    ) : (
                      <p className="text-xs text-red-500 mt-0.5">No stock</p>
                    )}
                  </div>

                  <div className="relative">
                    {row.lots.length === 0 ? (
                      <div className="py-2 px-3 bg-gray-50 rounded-lg text-xs text-gray-400 text-center h-full flex items-center justify-center">
                        No lots
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={row.selected_lot_id}
                          onChange={e => updateRow(idx, { selected_lot_id: e.target.value })}
                          className="w-full appearance-none pl-3 pr-8 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                          disabled={row.lots.length === 0}
                        >
                          {row.lots.map(lot => (
                            <option key={lot.id} value={lot.id}>
                              {lot.lot_number} ({lot.available_qty} avail)
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  <div>
                    <input
                      type="number"
                      min="0"
                      value={row.quantity || ''}
                      onChange={e => updateRow(idx, { quantity: Math.max(0, parseInt(e.target.value) || 0), error: '' })}
                      placeholder="0"
                      className={`w-full px-3 py-2 text-sm border rounded-lg text-center focus:ring-2 focus:ring-amber-400 focus:border-transparent ${row.error ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                      disabled={row.lots.length === 0}
                    />
                    {row.error && (
                      <p className="text-[10px] text-red-500 mt-0.5 text-center leading-tight">{row.error}</p>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Morning dispatch batch"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
                />
              </div>
            </>
          )}
        </div>

        {!success && !loading && rows.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-500">
              {activeCount > 0 ? (
                <span className="text-amber-600 font-medium">{activeCount} product{activeCount !== 1 ? 's' : ''} to dispatch</span>
              ) : (
                <span>Enter quantities to dispatch</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={activeCount === 0 || submitting}
                className="bg-amber-600 hover:bg-amber-700 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Confirm Dispatch'}
              </Button>
            </div>
          </div>
        )}

        {activeCount === 0 && !loading && rows.length > 0 && !success && (
          <div className="mx-6 mb-4 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Enter at least one quantity above to record a dispatch.</p>
          </div>
        )}
      </div>
    </div>
  );
}
