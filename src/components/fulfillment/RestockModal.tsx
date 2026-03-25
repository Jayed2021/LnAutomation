import { useState, useEffect } from 'react';
import { X, RotateCcw, MapPin, Package, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ReturnItemData {
  id: string;
  sku: string;
  quantity: number;
  qc_status: string | null;
  product_id: string;
  order_item_id: string | null;
  order_item: { product_name: string } | null;
  product: { name: string; sku: string } | null;
}

interface ReturnData {
  id: string;
  return_number: string;
  order_id: string;
  order: { order_number: string; woo_order_id: number | null } | null;
  items: ReturnItemData[];
}

interface WarehouseLocation {
  id: string;
  code: string;
  name: string;
}

interface ItemRestockState {
  item: ReturnItemData;
  selectedLocationId: string;
  lotId: string | null;
  recommendedLocationId: string;
  recommendedStockQty: number;
}

interface Props {
  returnData: ReturnData;
  onClose: () => void;
  onRestocked: () => void;
}

export function RestockModal({ returnData, onClose, onRestocked }: Props) {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [itemStates, setItemStates] = useState<ItemRestockState[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const items = (returnData.items ?? []).filter(i => i.qc_status !== 'failed');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: locs } = await supabase
        .from('warehouse_locations')
        .select('id, code, name')
        .eq('is_active', true)
        .order('code');

      const allLocations: WarehouseLocation[] = locs || [];
      setLocations(allLocations);

      const states: ItemRestockState[] = [];

      for (const item of items) {
        let bestLocationId = '';
        let bestLotId: string | null = null;
        let bestStockQty = 0;

        const { data: lots } = await supabase
          .from('inventory_lots')
          .select('id, location_id, received_quantity, remaining_quantity, product_id')
          .eq('barcode', item.sku)
          .order('received_quantity', { ascending: false });

        if (lots && lots.length > 0) {
          const locationTotals: Record<string, { received: number; remaining: number; lotId: string }> = {};
          for (const lot of lots) {
            if (!lot.location_id) continue;
            if (!locationTotals[lot.location_id]) {
              locationTotals[lot.location_id] = { received: 0, remaining: 0, lotId: lot.id };
            }
            locationTotals[lot.location_id].received += lot.received_quantity ?? 0;
            locationTotals[lot.location_id].remaining += lot.remaining_quantity ?? 0;
            if ((lot.remaining_quantity ?? 0) > 0) {
              locationTotals[lot.location_id].lotId = lot.id;
            }
          }

          let topReceived = -1;
          for (const [locId, totals] of Object.entries(locationTotals)) {
            if (totals.received > topReceived) {
              topReceived = totals.received;
              bestLocationId = locId;
              bestLotId = totals.remaining > 0 ? totals.lotId : null;
              bestStockQty = totals.remaining;
            }
          }
        }

        if (!bestLocationId && allLocations.length > 0) {
          bestLocationId = allLocations[0].id;
        }

        states.push({
          item,
          selectedLocationId: bestLocationId,
          lotId: bestLotId,
          recommendedLocationId: bestLocationId,
          recommendedStockQty: bestStockQty,
        });
      }

      setItemStates(states);
    } catch (err) {
      console.error('Error loading restock data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = async (index: number, locationId: string) => {
    const item = items[index];
    let lotId: string | null = null;

    if (item.sku && locationId) {
      const { data: lots } = await supabase
        .from('inventory_lots')
        .select('id')
        .eq('barcode', item.sku)
        .eq('location_id', locationId)
        .gt('remaining_quantity', 0)
        .order('remaining_quantity', { ascending: false })
        .limit(1);

      if (lots && lots.length > 0) {
        lotId = lots[0].id;
      }
    }

    setItemStates(prev => prev.map((s, i) =>
      i === index ? { ...s, selectedLocationId: locationId, lotId } : s
    ));

  };

  const handleConfirmRestock = async () => {
    try {
      setProcessing(true);
      setError('');

      for (const state of itemStates) {
        if (!state.selectedLocationId) continue;

        let resolvedLotId = state.lotId;
        let resolvedProductId = state.item.product_id;

        if (state.lotId) {
          const { data: lot } = await supabase
            .from('inventory_lots')
            .select('remaining_quantity, product_id')
            .eq('id', state.lotId)
            .maybeSingle();

          if (lot) {
            resolvedProductId = lot.product_id ?? resolvedProductId;
            await supabase
              .from('inventory_lots')
              .update({ remaining_quantity: lot.remaining_quantity + state.item.quantity })
              .eq('id', state.lotId);
          }
        } else {
          const { data: existingLot } = await supabase
            .from('inventory_lots')
            .select('id, product_id')
            .eq('barcode', state.item.sku)
            .limit(1)
            .maybeSingle();

          if (existingLot) {
            resolvedProductId = existingLot.product_id ?? resolvedProductId;
          }

          const lotNumber = `RET-${returnData.return_number}-${state.item.sku}`;
          const { data: newLot } = await supabase
            .from('inventory_lots')
            .insert({
              lot_number: lotNumber,
              barcode: state.item.sku,
              product_id: resolvedProductId,
              location_id: state.selectedLocationId,
              received_date: new Date().toISOString().split('T')[0],
              received_quantity: state.item.quantity,
              remaining_quantity: state.item.quantity,
              landed_cost_per_unit: 0,
            })
            .select('id')
            .single();

          if (newLot) {
            resolvedLotId = newLot.id;
          }
        }

        if (resolvedProductId && resolvedLotId) {
          await supabase.from('stock_movements').insert({
            movement_type: 'return_restock',
            product_id: resolvedProductId,
            lot_id: resolvedLotId,
            to_location_id: state.selectedLocationId,
            quantity: state.item.quantity,
            reference_type: 'return',
            reference_id: returnData.id,
          });
        }
      }

      await supabase
        .from('returns')
        .update({ status: 'restocked', updated_at: new Date().toISOString() })
        .eq('id', returnData.id);

      onRestocked();
    } catch (err) {
      console.error('Error restocking:', err);
      setError('Failed to restock. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getItemName = (item: ReturnItemData) =>
    item.order_item?.product_name || item.product?.name || item.sku;

  const orderLabel = returnData.order?.woo_order_id
    ? `#${returnData.order.woo_order_id}`
    : returnData.order?.order_number ?? returnData.return_number;

  const allLocationsSelected = itemStates.every(s => s.selectedLocationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-base">
                Restock Return — Order {orderLabel}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Select the restock location for each item. The default is based on where the product is currently stocked.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors ml-2 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-10 text-center text-gray-400 text-sm">Loading stock locations...</div>
          ) : items.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              No restockable items found in this return.
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        Item
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        Restock Location
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itemStates.map((state, idx) => {
                    const isRecommended = state.selectedLocationId === state.recommendedLocationId && state.recommendedLocationId !== '';
                    return (
                      <tr key={state.item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-gray-900 text-sm">{getItemName(state.item)}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            SKU: {state.item.sku} &nbsp;|&nbsp; Qty: {state.item.quantity}
                          </div>
                          {state.lotId && isRecommended && (
                            <div className="flex items-center gap-1 mt-1">
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-xs text-emerald-600">
                                Currently stocked here ({state.recommendedStockQty} units)
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <select
                            value={state.selectedLocationId}
                            onChange={e => handleLocationChange(idx, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                          >
                            <option value="">Select location...</option>
                            {locations.map(loc => (
                              <option key={loc.id} value={loc.id}>
                                {loc.id === state.recommendedLocationId ? '★ ' : ''}{loc.code} — {loc.name}
                              </option>
                            ))}
                          </select>
                          {isRecommended && (
                            <p className="text-xs text-emerald-600 mt-1">Recommended based on stock history</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
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
            onClick={handleConfirmRestock}
            disabled={processing || loading || items.length === 0 || !allLocationsSelected}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {processing ? 'Restocking...' : `Confirm Restock (${items.length} item${items.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    </div>
  );
}
