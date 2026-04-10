import { useState, useEffect } from 'react';
import { X, Package, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

interface LotOption {
  id: string;
  lot_number: string;
  remaining_quantity: number;
}

interface PackagingRow {
  product_id: string;
  sku: string;
  name: string;
  lots: LotOption[];
  selected_lot_id: string;
  received_qty: number;
  damaged_qty: number;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function ReceivePackagingModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<PackagingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    loadPackagingProducts();
  }, []);

  const loadPackagingProducts = async () => {
    try {
      setLoading(true);
      const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, sku, name')
        .eq('product_type', 'packaging_material')
        .eq('is_active', true)
        .order('name');

      if (prodErr) throw prodErr;
      if (!products?.length) {
        setRows([]);
        setLoading(false);
        return;
      }

      const productIds = products.map(p => p.id);
      const { data: lots, error: lotErr } = await supabase
        .from('inventory_lots')
        .select('id, lot_number, remaining_quantity, product_id')
        .in('product_id', productIds)
        .gt('remaining_quantity', 0)
        .order('created_at', { ascending: true });

      if (lotErr) throw lotErr;

      const lotsByProduct = new Map<string, LotOption[]>();
      for (const lot of lots || []) {
        if (!lotsByProduct.has(lot.product_id)) lotsByProduct.set(lot.product_id, []);
        lotsByProduct.get(lot.product_id)!.push({
          id: lot.id,
          lot_number: lot.lot_number,
          remaining_quantity: lot.remaining_quantity,
        });
      }

      setRows(products.map(p => ({
        product_id: p.id,
        sku: p.sku,
        name: p.name,
        lots: lotsByProduct.get(p.id) ?? [],
        selected_lot_id: '',
        received_qty: 0,
        damaged_qty: 0,
      })));
    } catch (err: any) {
      setError(err.message || 'Failed to load packaging products');
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (idx: number, field: keyof PackagingRow, value: any) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const hasAnyEntry = rows.some(r => r.received_qty > 0 || r.damaged_qty > 0);

  const handleSubmit = async () => {
    if (!hasAnyEntry) return;
    setSubmitting(true);
    setError(null);

    try {
      const performedBy = user?.id ?? null;
      const now = new Date().toISOString();
      const noteBase = `Manual packaging receipt — ${new Date().toLocaleString('en-BD')}${user?.username ? ` by ${user.username}` : ''}`;

      for (const row of rows) {
        if (row.received_qty <= 0 && row.damaged_qty <= 0) continue;

        if (row.received_qty > 0) {
          let lotId = row.selected_lot_id || null;

          if (lotId) {
            const lot = row.lots.find(l => l.id === lotId);
            if (lot) {
              const { error: updateErr } = await supabase
                .from('inventory_lots')
                .update({ remaining_quantity: lot.remaining_quantity + row.received_qty })
                .eq('id', lotId);
              if (updateErr) throw updateErr;
            }
          } else if (row.lots.length > 0) {
            const bestLot = row.lots.reduce((a, b) => a.remaining_quantity >= b.remaining_quantity ? a : b);
            lotId = bestLot.id;
            const { error: updateErr } = await supabase
              .from('inventory_lots')
              .update({ remaining_quantity: bestLot.remaining_quantity + row.received_qty })
              .eq('id', lotId);
            if (updateErr) throw updateErr;
          }

          const { error: movErr } = await supabase.from('stock_movements').insert({
            movement_type: 'pkg_manual_restock',
            product_id: row.product_id,
            lot_id: lotId,
            quantity: row.received_qty,
            reference_type: 'manual',
            notes: noteBase,
            performed_by: performedBy,
            created_at: now,
          });
          if (movErr) throw movErr;
        }

        if (row.damaged_qty > 0) {
          const { error: dmgErr } = await supabase.from('stock_movements').insert({
            movement_type: 'pkg_damaged',
            product_id: row.product_id,
            lot_id: row.selected_lot_id || null,
            quantity: -row.damaged_qty,
            reference_type: 'manual',
            notes: `${noteBase} — damage/loss record`,
            performed_by: performedBy,
            created_at: now,
          });
          if (dmgErr) throw dmgErr;
        }
      }

      setDone(true);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save packaging receipt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Receive Packaging Material</h2>
              <p className="text-xs text-gray-500 mt-0.5">Enter received and/or damaged quantities per item</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">Loading packaging products...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No active packaging materials found</p>
              <p className="text-xs text-gray-400 mt-1">Add products with type "Packaging Material" first</p>
            </div>
          ) : done ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-gray-800 font-semibold text-lg">Receipt Recorded</p>
              <p className="text-sm text-gray-400 mt-1">Stock movements have been saved</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <div className="col-span-4">Product</div>
                <div className="col-span-4">Lot (optional)</div>
                <div className="col-span-2 text-center">Received</div>
                <div className="col-span-2 text-center">Damaged</div>
              </div>

              {rows.map((row, idx) => (
                <div
                  key={row.product_id}
                  className={`grid grid-cols-12 gap-3 items-center px-3 py-3 rounded-lg transition-colors ${
                    row.received_qty > 0 || row.damaged_qty > 0
                      ? 'bg-orange-50 border border-orange-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-gray-800 leading-tight">{row.name}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{row.sku}</p>
                  </div>

                  <div className="col-span-4">
                    <select
                      value={row.selected_lot_id}
                      onChange={e => updateRow(idx, 'selected_lot_id', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white text-gray-700"
                    >
                      <option value="">— No Lot —</option>
                      {row.lots.map(lot => (
                        <option key={lot.id} value={lot.id}>
                          {lot.lot_number} ({lot.remaining_quantity} rem.)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min={0}
                      value={row.received_qty || ''}
                      placeholder="0"
                      onChange={e => updateRow(idx, 'received_qty', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2 py-1.5 text-sm text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min={0}
                      value={row.damaged_qty || ''}
                      placeholder="0"
                      onChange={e => updateRow(idx, 'damaged_qty', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2 py-1.5 text-sm text-center border border-red-100 rounded-lg focus:ring-2 focus:ring-red-300 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {!done && !loading && rows.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {rows.filter(r => r.received_qty > 0 || r.damaged_qty > 0).length} item{rows.filter(r => r.received_qty > 0 || r.damaged_qty > 0).length !== 1 ? 's' : ''} with entries
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!hasAnyEntry || submitting}
                className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    Record Receipt
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
