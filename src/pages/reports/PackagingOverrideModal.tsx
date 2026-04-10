import { useState, useEffect, useCallback } from 'react';
import { X, Package, Calculator, Info, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface PackagingSkuRow {
  product_id: string;
  sku: string;
  product_name: string;
  avg_landed_cost: number;
  system_dispatch_qty: number;
  system_return_qty: number;
  system_damaged_qty: number;
  manual_quantity: number;
  line_cost: number;
}

export interface PackagingOverride {
  id: string;
  period_from: string;
  period_to: string;
  total_cost: number;
  notes: string | null;
  created_by: string;
  updated_at: string;
  items: PackagingOverrideItem[];
}

export interface PackagingOverrideItem {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  manual_quantity: number;
  avg_landed_cost_snapshot: number;
  line_cost: number;
  system_dispatch_qty: number;
}

interface Props {
  periodFrom: string;
  periodTo: string;
  existingOverride: PackagingOverride | null;
  onClose: () => void;
  onSaved: (override: PackagingOverride) => void;
}

function fmtCur(n: number) {
  return n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PackagingOverrideModal({ periodFrom, periodTo, existingOverride, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<PackagingSkuRow[]>([]);
  const [notes, setNotes] = useState(existingOverride?.notes ?? '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [pkgProductsResult, movementsResult] = await Promise.all([
      supabase
        .from('products')
        .select('id, sku, name, avg_landed_cost')
        .eq('product_type', 'packaging_material')
        .gt('avg_landed_cost', 0)
        .order('sku'),
      supabase
        .from('stock_movements')
        .select('product_id, movement_type, quantity')
        .gte('created_at', periodFrom)
        .lte('created_at', periodTo + 'T23:59:59Z')
        .in('movement_type', ['sale', 'adjustment', 'pkg_manual_restock', 'damaged']),
    ]);

    if (pkgProductsResult.error || movementsResult.error) {
      setError('Failed to load packaging data. Please try again.');
      setLoading(false);
      return;
    }

    const products = pkgProductsResult.data ?? [];
    const movements = movementsResult.data ?? [];

    const movementTotals: Record<string, { dispatch: number; restock: number; damaged: number }> = {};
    for (const m of movements) {
      if (!movementTotals[m.product_id]) {
        movementTotals[m.product_id] = { dispatch: 0, restock: 0, damaged: 0 };
      }
      if (m.movement_type === 'sale' || m.movement_type === 'adjustment') {
        movementTotals[m.product_id].dispatch += Math.abs(m.quantity);
      } else if (m.movement_type === 'pkg_manual_restock') {
        movementTotals[m.product_id].restock += Math.abs(m.quantity);
      } else if (m.movement_type === 'damaged') {
        movementTotals[m.product_id].damaged += Math.abs(m.quantity);
      }
    }

    const existingByProductId: Record<string, PackagingOverrideItem> = {};
    if (existingOverride) {
      for (const item of existingOverride.items) {
        existingByProductId[item.product_id] = item;
      }
    }

    const skuRows: PackagingSkuRow[] = products.map(p => {
      const totals = movementTotals[p.id] ?? { dispatch: 0, restock: 0, damaged: 0 };
      const existing = existingByProductId[p.id];
      const manualQty = existing?.manual_quantity ?? 0;
      const cost = Number(p.avg_landed_cost ?? 0);
      return {
        product_id: p.id,
        sku: p.sku,
        product_name: p.name,
        avg_landed_cost: cost,
        system_dispatch_qty: totals.dispatch,
        system_return_qty: totals.restock,
        system_damaged_qty: totals.damaged,
        manual_quantity: manualQty,
        line_cost: manualQty * cost,
      };
    });

    setRows(skuRows);
    setLoading(false);
  }, [periodFrom, periodTo, existingOverride]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateQty = (productId: string, qty: number) => {
    setRows(prev => prev.map(r => {
      if (r.product_id !== productId) return r;
      const safeQty = Math.max(0, isNaN(qty) ? 0 : qty);
      return { ...r, manual_quantity: safeQty, line_cost: safeQty * r.avg_landed_cost };
    }));
  };

  const totalManualCost = rows.reduce((s, r) => s + r.line_cost, 0);
  const systemEstimate = rows.reduce((s, r) => s + r.system_dispatch_qty * r.avg_landed_cost, 0);
  const hasAnyQty = rows.some(r => r.manual_quantity > 0);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      let overrideId: string;

      if (existingOverride) {
        const { error: updateErr } = await supabase
          .from('pl_packaging_overrides')
          .update({
            total_cost: totalManualCost,
            notes: notes || null,
            created_by: (user as { username?: string })?.username ?? 'admin',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingOverride.id);

        if (updateErr) throw updateErr;
        overrideId = existingOverride.id;

        const { error: delErr } = await supabase
          .from('pl_packaging_override_items')
          .delete()
          .eq('override_id', overrideId);

        if (delErr) throw delErr;
      } else {
        const { data: newOverride, error: insertErr } = await supabase
          .from('pl_packaging_overrides')
          .insert({
            period_from: periodFrom,
            period_to: periodTo,
            total_cost: totalManualCost,
            notes: notes || null,
            created_by: (user as { username?: string })?.username ?? 'admin',
          })
          .select('id')
          .single();

        if (insertErr || !newOverride) throw insertErr ?? new Error('Insert failed');
        overrideId = newOverride.id;
      }

      const itemsToInsert = rows
        .filter(r => r.manual_quantity > 0 || r.avg_landed_cost > 0)
        .map(r => ({
          override_id: overrideId,
          product_id: r.product_id,
          sku: r.sku,
          product_name: r.product_name,
          manual_quantity: r.manual_quantity,
          avg_landed_cost_snapshot: r.avg_landed_cost,
          line_cost: r.line_cost,
          system_dispatch_qty: r.system_dispatch_qty,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsErr } = await supabase
          .from('pl_packaging_override_items')
          .insert(itemsToInsert);

        if (itemsErr) throw itemsErr;
      }

      const savedOverride: PackagingOverride = {
        id: overrideId,
        period_from: periodFrom,
        period_to: periodTo,
        total_cost: totalManualCost,
        notes: notes || null,
        created_by: (user as { username?: string })?.username ?? 'admin',
        updated_at: new Date().toISOString(),
        items: rows
          .filter(r => r.manual_quantity > 0 || r.avg_landed_cost > 0)
          .map(r => ({
            id: '',
            product_id: r.product_id,
            sku: r.sku,
            product_name: r.product_name,
            manual_quantity: r.manual_quantity,
            avg_landed_cost_snapshot: r.avg_landed_cost,
            line_cost: r.line_cost,
            system_dispatch_qty: r.system_dispatch_qty,
          })),
      };

      onSaved(savedOverride);
    } catch (err) {
      setError('Failed to save override. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {existingOverride ? 'Edit Packaging Cost Override' : 'Set Packaging Cost Override'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Period: {periodFrom} — {periodTo}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 shrink-0">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            This override replaces the aggregated packaging cost in the P&L summary for this period.
            Per-order packaging costs in the order detail table are not affected.
            Enter the actual quantity of each material consumed during the period.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-gray-500">Loading packaging data...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No packaging materials with a landed cost found.</p>
              <p className="text-xs text-gray-400 mt-1">Set avg landed cost on packaging materials first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">
                      <span className="text-gray-400">System</span>
                      <br />
                      <span className="text-[10px] normal-case font-normal text-gray-400">dispatched</span>
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-24">
                      <span className="text-gray-400">Rcvd Back</span>
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-24">
                      <span className="text-gray-400">Damaged</span>
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">
                      Avg Cost
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-orange-600 uppercase tracking-wider w-32">
                      Manual Qty
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">
                      Line Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(row => (
                    <tr key={row.product_id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.sku}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{row.product_name}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">
                        {row.system_dispatch_qty > 0 ? (
                          <span className="font-mono">{row.system_dispatch_qty.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {row.system_return_qty > 0 ? (
                          <span className="font-mono text-emerald-600">+{row.system_return_qty.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {row.system_damaged_qty > 0 ? (
                          <span className="font-mono text-red-500">{row.system_damaged_qty.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-600 font-mono">
                        ৳{fmtCur(row.avg_landed_cost)}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={row.manual_quantity === 0 ? '' : row.manual_quantity}
                          onChange={e => updateQty(row.product_id, parseInt(e.target.value))}
                          placeholder="0"
                          className="w-full text-center text-sm font-semibold border border-orange-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-orange-50 placeholder-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold">
                        {row.line_cost > 0 ? (
                          <span className="text-gray-900">৳{fmtCur(row.line_cost)}</span>
                        ) : (
                          <span className="text-gray-300">৳0.00</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes */}
          {!loading && rows.length > 0 && (
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Based on physical count on April 30..."
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none placeholder-gray-300"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && rows.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">System Estimate</p>
                  <p className="text-sm font-semibold text-gray-500">৳{fmtCur(systemEstimate)}</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div>
                  <p className="text-[11px] text-orange-600 uppercase tracking-wide font-bold mb-0.5">
                    <Calculator className="w-3 h-3 inline mr-1" />
                    Manual Total
                  </p>
                  <p className={`text-lg font-bold ${hasAnyQty ? 'text-gray-900' : 'text-gray-400'}`}>
                    ৳{fmtCur(totalManualCost)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {error && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {error}
                  </p>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasAnyQty}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : existingOverride ? 'Update Override' : 'Save Override'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
