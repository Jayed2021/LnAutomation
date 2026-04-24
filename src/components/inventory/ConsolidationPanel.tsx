import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import {
  Layers, RefreshCw, ChevronDown, ChevronUp,
  ArrowRight, AlertTriangle, CheckCircle, Loader2, Package
} from 'lucide-react';

interface Fragment {
  lot_id: string;
  lot_number: string;
  location_id: string;
  location_code: string;
  qty: number;
  reserved: number;
}

interface CandidateLocation {
  location_id: string;
  location_code: string;
  capacity: number | null;
  slots_used: number;
  slots_free: number | null;
  already_has_product: boolean;
}

interface Suggestion {
  product_id: string;
  sku: string;
  product_name: string;
  total_qty: number;
  total_reserved: number;
  num_locations: number;
  fragments: Fragment[];
  candidate_locations: CandidateLocation[];
}

interface TransferState {
  productId: string;
  destLocationId: string;
  status: 'idle' | 'running' | 'done' | 'error';
  message: string;
}

export default function ConsolidationPanel() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedDest, setSelectedDest] = useState<Record<string, string>>({});
  const [transfers, setTransfers] = useState<Record<string, TransferState>>({});

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_consolidation_suggestions');
      if (error) throw error;
      setSuggestions((data || []) as Suggestion[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (productId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const executeConsolidation = async (suggestion: Suggestion) => {
    const destId = selectedDest[suggestion.product_id];
    if (!destId) return;

    // Get all unique source locations (excluding the destination)
    const sourceLocIds = [...new Set(suggestion.fragments.map(f => f.location_id))].filter(id => id !== destId);

    setTransfers(prev => ({
      ...prev,
      [suggestion.product_id]: { productId: suggestion.product_id, destLocationId: destId, status: 'running', message: 'Consolidating...' }
    }));

    try {
      // Transfer each source location to destination sequentially
      // We only transfer the specific product, not the whole location.
      // So we do a targeted lot move: update location_id for matching lots.
      const fragmentsToMove = suggestion.fragments.filter(f => f.location_id !== destId);

      for (const frag of fragmentsToMove) {
        // Check if dest already has a lot with the same lot_number
        const { data: existingDestLot } = await supabase
          .from('inventory_lots')
          .select('id, remaining_quantity, reserved_quantity, received_quantity')
          .eq('location_id', destId)
          .eq('lot_number', frag.lot_number)
          .maybeSingle();

        if (existingDestLot) {
          // Merge: add to existing
          await supabase.from('inventory_lots').update({
            remaining_quantity: existingDestLot.remaining_quantity + frag.qty,
            reserved_quantity: existingDestLot.reserved_quantity + frag.reserved,
            received_quantity: existingDestLot.received_quantity + frag.qty,
          }).eq('id', existingDestLot.id);

          // Migrate reservations
          await supabase.from('order_lot_reservations')
            .update({ lot_id: existingDestLot.id })
            .eq('lot_id', frag.lot_id);

          // Remove source lot
          await supabase.from('inventory_lots').delete().eq('id', frag.lot_id);
        } else {
          // Simple move: update location_id
          await supabase.from('inventory_lots')
            .update({ location_id: destId })
            .eq('id', frag.lot_id);
        }

        // Record stock movement
        await supabase.from('stock_movements').insert({
          product_id: suggestion.product_id,
          lot_id: existingDestLot?.id ?? frag.lot_id,
          movement_type: 'transfer',
          quantity: frag.qty,
          from_location_id: frag.location_id,
          to_location_id: destId,
          reference_type: 'consolidation',
          notes: `Lot consolidation for ${suggestion.sku}`,
        });
      }

      setTransfers(prev => ({
        ...prev,
        [suggestion.product_id]: { productId: suggestion.product_id, destLocationId: destId, status: 'done', message: 'Consolidated successfully' }
      }));

      // Refresh suggestions after a short delay
      setTimeout(() => loadSuggestions(), 800);
    } catch (err: any) {
      setTransfers(prev => ({
        ...prev,
        [suggestion.product_id]: { productId: suggestion.product_id, destLocationId: destId, status: 'error', message: err?.message || 'Failed' }
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Analysing inventory fragmentation...</span>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="p-4 bg-emerald-50 rounded-full w-fit mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="font-semibold text-gray-900">No Fragmentation Found</h3>
        <p className="text-sm text-gray-500 mt-1">All products are stored in a single location each.</p>
        <Button variant="outline" onClick={loadSuggestions} className="mt-4 flex items-center gap-2 mx-auto">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-gray-700">
            {suggestions.length} product{suggestions.length > 1 ? 's' : ''} spread across multiple locations
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={loadSuggestions} className="flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {suggestions.map(s => {
          const isExpanded = expanded.has(s.product_id);
          const transfer = transfers[s.product_id];
          const destId = selectedDest[s.product_id] || '';
          const destLoc = s.candidate_locations.find(c => c.location_id === destId);

          return (
            <div key={s.product_id} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Row header */}
              <div className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
                <button onClick={() => toggleExpand(s.product_id)} className="text-gray-400 hover:text-gray-600">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm text-gray-900">{s.sku}</span>
                    <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                      {s.num_locations} locations
                    </span>
                    {s.total_reserved > 0 && (
                      <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        {s.total_reserved} reserved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{s.product_name}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{s.total_qty} units</p>
                  <p className="text-xs text-gray-400">total</p>
                </div>

                {/* Destination picker */}
                <div className="shrink-0 w-36">
                  <select
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={destId}
                    onChange={e => setSelectedDest(prev => ({ ...prev, [s.product_id]: e.target.value }))}
                    disabled={transfer?.status === 'running' || transfer?.status === 'done'}
                  >
                    <option value="">Pick destination</option>
                    {s.candidate_locations.map(c => (
                      <option key={c.location_id} value={c.location_id}>
                        {c.location_code}{c.slots_free !== null ? ` (${c.slots_free} free)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action button */}
                <div className="shrink-0">
                  {transfer?.status === 'done' ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                      <CheckCircle className="w-4 h-4" /> Done
                    </span>
                  ) : transfer?.status === 'error' ? (
                    <span className="text-xs text-red-600">{transfer.message}</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => executeConsolidation(s)}
                      disabled={!destId || transfer?.status === 'running'}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {transfer?.status === 'running'
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Moving...</>
                        : <><ArrowRight className="w-3 h-3" /> Consolidate</>}
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  {destId && destLoc && (
                    <div className="mb-3 flex items-center gap-2 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <Package className="w-3.5 h-3.5 flex-shrink-0" />
                      All {s.sku} lots will be consolidated into <strong className="font-mono ml-1">{destLoc.location_code}</strong>.
                      Different shipment lots will share the box but remain as separate records for cost tracking.
                    </div>
                  )}
                  {s.total_reserved > 0 && (
                    <div className="mb-3 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      {s.total_reserved} units are reserved for active orders. Reservations will automatically follow the lots.
                    </div>
                  )}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 uppercase">
                        <th className="text-left py-1 pr-4 font-medium">Lot</th>
                        <th className="text-left py-1 pr-4 font-medium">Location</th>
                        <th className="text-right py-1 pr-4 font-medium">Qty</th>
                        <th className="text-right py-1 font-medium">Reserved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {s.fragments.map(f => (
                        <tr key={f.lot_id} className={f.location_id === destId ? 'bg-blue-50' : ''}>
                          <td className="py-1.5 pr-4 font-mono text-gray-700">{f.lot_number}</td>
                          <td className="py-1.5 pr-4">
                            <span className="font-mono text-gray-900">{f.location_code}</span>
                            {f.location_id === destId && (
                              <span className="ml-2 text-blue-600 font-medium">(destination)</span>
                            )}
                          </td>
                          <td className="py-1.5 pr-4 text-right text-gray-900">{f.qty}</td>
                          <td className="py-1.5 text-right text-amber-600">{f.reserved > 0 ? f.reserved : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
