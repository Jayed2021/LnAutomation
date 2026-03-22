import { useState, useEffect } from 'react';
import { X, Package, MapPin, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

interface PickModalProps {
  order: {
    id: string;
    order_number: string;
    customer: {
      full_name: string;
    };
    items: OrderItem[];
  };
  onClose: () => void;
}

interface OrderItem {
  id: string;
  sku: string;
  product_name: string;
  quantity: number;
  picked_quantity: number;
}

interface LotRecommendation {
  lot_id: string;
  lot_number: string;
  location_code: string;
  location_name: string;
  available_quantity: number;
  received_date: string;
  recommended_quantity: number;
  picked_quantity: number;
}

interface ItemPick {
  item_id: string;
  product_id: string;
  lots: LotRecommendation[];
}

export function PickModal({ order, onClose }: PickModalProps) {
  const [loading, setLoading] = useState(true);
  const [picks, setPicks] = useState<ItemPick[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchFIFORecommendations();
  }, []);

  const fetchFIFORecommendations = async () => {
    try {
      setLoading(true);
      const itemPicks: ItemPick[] = [];

      for (const item of order.items) {
        const { data: product } = await supabase
          .from('products')
          .select('id')
          .eq('sku', item.sku)
          .single();

        if (!product) continue;

        const { data: lots, error } = await supabase
          .from('inventory_lots')
          .select(`
            id,
            lot_number,
            remaining_quantity,
            received_date,
            location:warehouse_locations(code, name)
          `)
          .eq('product_id', product.id)
          .gt('remaining_quantity', 0)
          .order('received_date', { ascending: true });

        if (error) throw error;

        let remainingToPick = item.quantity - item.picked_quantity;
        const lotRecommendations: LotRecommendation[] = [];

        for (const lot of lots || []) {
          if (remainingToPick <= 0) break;

          const pickQty = Math.min(remainingToPick, lot.remaining_quantity);
          lotRecommendations.push({
            lot_id: lot.id,
            lot_number: lot.lot_number,
            location_code: lot.location?.code || 'N/A',
            location_name: lot.location?.name || 'Unknown',
            available_quantity: lot.remaining_quantity,
            received_date: lot.received_date,
            recommended_quantity: pickQty,
            picked_quantity: pickQty,
          });

          remainingToPick -= pickQty;
        }

        itemPicks.push({
          item_id: item.id,
          product_id: product.id,
          lots: lotRecommendations,
        });
      }

      setPicks(itemPicks);
    } catch (error) {
      console.error('Error fetching FIFO recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePickQuantity = (itemIndex: number, lotIndex: number, quantity: number) => {
    const newPicks = [...picks];
    const lot = newPicks[itemIndex].lots[lotIndex];
    lot.picked_quantity = Math.min(Math.max(0, quantity), lot.available_quantity);
    setPicks(newPicks);
  };

  const getTotalPicked = (itemIndex: number) => {
    return picks[itemIndex].lots.reduce((sum, lot) => sum + lot.picked_quantity, 0);
  };

  const getRequiredQuantity = (itemIndex: number) => {
    return order.items[itemIndex].quantity - order.items[itemIndex].picked_quantity;
  };

  const isFullyPicked = () => {
    return picks.every((pick, index) => {
      const totalPicked = getTotalPicked(index);
      const required = getRequiredQuantity(index);
      return totalPicked >= required;
    });
  };

  const hasInsufficientStock = () => {
    return picks.some((pick, index) => {
      const totalPicked = getTotalPicked(index);
      const required = getRequiredQuantity(index);
      const available = pick.lots.reduce((sum, lot) => sum + lot.available_quantity, 0);
      return totalPicked < required && available < required;
    });
  };

  const handleConfirmPick = async () => {
    try {
      setProcessing(true);

      for (let i = 0; i < picks.length; i++) {
        const pick = picks[i];
        const item = order.items[i];

        for (const lot of pick.lots) {
          if (lot.picked_quantity > 0) {
            await supabase
              .from('order_picks')
              .insert({
                order_id: order.id,
                order_item_id: pick.item_id,
                lot_id: lot.lot_id,
                quantity: lot.picked_quantity,
              });

            if (lot.picked_quantity >= lot.available_quantity) {
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
                    status: 'open'
                  });
                }
              }
            }
          }
        }

        const totalPicked = getTotalPicked(i);
        await supabase
          .from('order_items')
          .update({
            picked_quantity: item.picked_quantity + totalPicked
          })
          .eq('id', pick.item_id);
      }

      const allFullyPicked = isFullyPicked();
      await supabase
        .from('orders')
        .update({
          fulfillment_status: allFullyPicked ? 'packed' : 'printed'
        })
        .eq('id', order.id);

      await supabase
        .from('order_activity_log')
        .insert({
          order_id: order.id,
          action: allFullyPicked ? 'Fully picked and packed' : 'Partially picked',
        });

      onClose();
    } catch (error) {
      console.error('Error confirming pick:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Pick Order: {order.order_number}</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">{order.customer.full_name}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading FIFO recommendations...</div>
        ) : (
          <div className="space-y-6">
            {order.items.map((item, itemIndex) => {
              const totalPicked = getTotalPicked(itemIndex);
              const required = getRequiredQuantity(itemIndex);
              const isComplete = totalPicked >= required;

              return (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                        {isComplete ? (
                          <Badge variant="green">
                            <Check className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="amber">Picking</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {totalPicked} / {required}
                      </div>
                      <div className="text-sm text-gray-500">Quantity</div>
                    </div>
                  </div>

                  {picks[itemIndex]?.lots.length === 0 ? (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="text-sm font-medium">No stock available for this item</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Pick from these lots (FIFO order):
                      </div>
                      {picks[itemIndex]?.lots.map((lot, lotIndex) => (
                        <div
                          key={lot.lot_id}
                          className="bg-gray-50 rounded-lg p-3 flex items-center gap-4"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Package className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-sm text-gray-900">
                                Lot: {lot.lot_number}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({new Date(lot.received_date).toLocaleDateString()})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span>{lot.location_code} - {lot.location_name}</span>
                              <span className="text-gray-400">•</span>
                              <span>Available: {lot.available_quantity}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Pick:</span>
                            <Input
                              type="number"
                              min="0"
                              max={lot.available_quantity}
                              value={lot.picked_quantity}
                              onChange={(e) =>
                                updatePickQuantity(itemIndex, lotIndex, parseInt(e.target.value) || 0)
                              }
                              className="w-20 text-center"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {hasInsufficientStock() && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Insufficient Stock</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Some items cannot be fully picked due to insufficient stock. You can proceed with a partial pick.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmPick}
            disabled={loading || processing || picks.length === 0}
          >
            {processing ? 'Processing...' : isFullyPicked() ? 'Confirm Pick & Pack' : 'Confirm Partial Pick'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
