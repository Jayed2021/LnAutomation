import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Search, X, AlertTriangle, CheckCircle, Loader2,
  ArrowRight, Flag, ExternalLink, RefreshCw, Info
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductLot {
  lot_id: string;
  lot_number: string;
  location_id: string;
  location_code: string;
  remaining_quantity: number;
  reserved_quantity: number;
  expected_quantity: number;
  counted_quantity: number;
}

interface ProductResult {
  product_id: string;
  sku: string;
  product_name: string;
  lots: ProductLot[];
  woo_product_id: number | null;
  woo_variation_id: number | null;
  woo_parent_product_id: number | null;
}

type AuditStep = 'search' | 'count' | 'review' | 'woo_sync' | 'done';

const VARIANCE_THRESHOLD = 0.20;

// ─── WooCommerce link helper ──────────────────────────────────────────────────

function wooProductEditUrl(storeUrl: string, product: ProductResult): string {
  const id = product.woo_variation_id
    ? product.woo_parent_product_id
    : product.woo_product_id;
  if (!id) return '';
  return `${storeUrl.replace(/\/$/, '')}/wp-admin/post.php?post=${id}&action=edit`;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export default function AuditByProduct({ onBack }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<AuditStep>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ProductResult | null>(null);
  const [lots, setLots] = useState<ProductLot[]>([]);
  const [saving, setSaving] = useState(false);
  const [auditNotes, setAuditNotes] = useState('');

  // WooCommerce sync state
  const [wooStoreUrl, setWooStoreUrl] = useState('');
  const [currentWooStock, setCurrentWooStock] = useState<number | null>(null);
  const [proposedWooStock, setProposedWooStock] = useState(0);
  const [fetchingWoo, setFetchingWoo] = useState(false);
  const [syncResult, setSyncResult] = useState<'idle' | 'syncing' | 'success' | 'failed'>('idle');
  const [syncError, setSyncError] = useState('');

  const searchProducts = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from('products')
        .select('id, sku, name, woo_product_id, woo_variation_id, woo_parent_product_id')
        .or(`sku.ilike.%${searchQuery.trim()}%,name.ilike.%${searchQuery.trim()}%`)
        .limit(10);

      setSearchResults((data || []).map((p: any) => ({
        product_id: p.id,
        sku: p.sku,
        product_name: p.name,
        lots: [],
        woo_product_id: p.woo_product_id,
        woo_variation_id: p.woo_variation_id,
        woo_parent_product_id: p.woo_parent_product_id,
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const selectProduct = async (product: ProductResult) => {
    setSaving(true);
    try {
      const { data: lotsData } = await supabase
        .from('inventory_lots')
        .select('id, lot_number, location_id, remaining_quantity, reserved_quantity, warehouse_locations(code)')
        .eq('product_id', product.product_id)
        .gt('remaining_quantity', 0)
        .order('received_date', { ascending: true });

      const productLots: ProductLot[] = (lotsData || []).map((l: any) => ({
        lot_id: l.id,
        lot_number: l.lot_number,
        location_id: l.location_id,
        location_code: (l.warehouse_locations as any)?.code || '?',
        remaining_quantity: l.remaining_quantity,
        reserved_quantity: l.reserved_quantity ?? 0,
        expected_quantity: l.remaining_quantity,
        counted_quantity: l.remaining_quantity,
      }));

      setSelected(product);
      setLots(productLots);
      setStep('count');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const submitAudit = async () => {
    if (!user || !selected) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const locationIds = [...new Set(lots.map(l => l.location_id))];
      const locationNames = [...new Set(lots.map(l => l.location_code))].join(', ');

      const { data: audit, error: auditError } = await supabase
        .from('inventory_audits')
        .insert({
          audit_date: today,
          location_ids: locationIds,
          location_names: locationNames,
          conducted_by: user.id,
          status: 'completed',
          notes: auditNotes ? `Product audit: ${selected.sku} — ${auditNotes}` : `Product audit: ${selected.sku}`,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (auditError) throw auditError;

      const totalLines = lots.length;
      const accurateLines = lots.filter(l => l.counted_quantity === l.expected_quantity).length;
      const accuracy = totalLines > 0 ? (accurateLines / totalLines) * 100 : 100;
      await supabase.from('inventory_audits').update({ accuracy_percentage: accuracy }).eq('id', audit.id);

      await supabase.from('inventory_audit_lines').insert(
        lots.map(l => ({
          audit_id: audit.id,
          product_id: selected.product_id,
          lot_id: l.lot_id,
          location_id: l.location_id,
          expected_quantity: l.expected_quantity,
          counted_quantity: l.counted_quantity,
          difference: l.counted_quantity - l.expected_quantity,
        }))
      );

      const adjustments = lots.filter(l => l.counted_quantity !== l.expected_quantity);
      for (const line of adjustments) {
        await supabase.from('stock_movements').insert({
          movement_type: 'adjustment',
          product_id: selected.product_id,
          lot_id: line.lot_id,
          to_location_id: line.location_id,
          quantity: line.counted_quantity - line.expected_quantity,
          reference_type: 'audit',
          reference_id: audit.id,
          notes: `Product audit adjustment: ${line.lot_number}`,
          performed_by: user.id,
        });
        await supabase.from('inventory_lots')
          .update({ remaining_quantity: line.counted_quantity })
          .eq('id', line.lot_id);
      }

      // Flag large variances
      const flagCandidates = lots.filter(l => {
        if (l.expected_quantity === 0) return false;
        return Math.abs(l.counted_quantity - l.expected_quantity) / l.expected_quantity >= VARIANCE_THRESHOLD;
      });

      if (flagCandidates.length > 0) {
        const lotIds = flagCandidates.map(l => l.lot_id);
        const { data: existingFlags } = await supabase
          .from('audit_flags')
          .select('lot_id')
          .eq('status', 'open')
          .in('lot_id', lotIds);

        const alreadyFlagged = new Set((existingFlags || []).map((f: any) => f.lot_id));
        const newFlags = flagCandidates
          .filter(l => !alreadyFlagged.has(l.lot_id))
          .map(l => {
            const pct = Math.abs(l.counted_quantity - l.expected_quantity) / l.expected_quantity * 100;
            return {
              location_id: l.location_id,
              product_id: selected.product_id,
              lot_id: l.lot_id,
              trigger_type: 'large_variance',
              variance_percentage: Math.round(pct * 100) / 100,
              expected_quantity: l.expected_quantity,
              counted_quantity: l.counted_quantity,
              status: 'open',
            };
          });
        if (newFlags.length > 0) await supabase.from('audit_flags').insert(newFlags);
      }

      // Auto-resolve flags for lots now within threshold
      const resolvedLotIds = lots
        .filter(l => {
          if (l.expected_quantity === 0) return true;
          return Math.abs(l.counted_quantity - l.expected_quantity) / l.expected_quantity < VARIANCE_THRESHOLD;
        })
        .map(l => l.lot_id);

      if (resolvedLotIds.length > 0) {
        await supabase.from('audit_flags')
          .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user.id, resolved_by_audit_id: audit.id })
          .eq('status', 'open')
          .in('lot_id', resolvedLotIds);
      }

      // Compute proposed WooCommerce stock
      const physicalTotal = lots.reduce((s, l) => s + l.counted_quantity, 0);
      const reservedTotal = lots.reduce((s, l) => s + l.reserved_quantity, 0);
      const proposed = Math.max(0, physicalTotal - reservedTotal);
      setProposedWooStock(proposed);

      // Fetch WooCommerce store URL and current stock
      await loadWooData(proposed);
      setStep('woo_sync');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const loadWooData = async (proposed: number) => {
    setFetchingWoo(true);
    try {
      const { data: cfg } = await supabase
        .from('woocommerce_config')
        .select('store_url')
        .maybeSingle();

      const storeUrl = cfg?.store_url || '';
      setWooStoreUrl(storeUrl);

      if (!selected || !storeUrl) return;

      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/woo-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
          'Apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ action: 'get-product-stock', product_sku: selected.sku }),
      });

      if (res.ok) {
        const json = await res.json();
        setCurrentWooStock(json.stock_quantity ?? null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingWoo(false);
    }
  };

  const pushToWooCommerce = async () => {
    if (!selected) return;
    setSyncResult('syncing');
    setSyncError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/woo-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
          'Apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          action: 'set-stock',
          product_sku: selected.sku,
          absolute_quantity: proposedWooStock,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setSyncError(json.error || `HTTP ${res.status}`);
        setSyncResult('failed');
      } else {
        setSyncResult('success');
        setCurrentWooStock(proposedWooStock);
        setTimeout(() => setStep('done'), 800);
      }
    } catch (err: any) {
      setSyncError(err?.message || 'Network error');
      setSyncResult('failed');
    }
  };

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const physicalTotal = lots.reduce((s, l) => s + l.counted_quantity, 0);
  const reservedTotal = lots.reduce((s, l) => s + l.reserved_quantity, 0);
  const discrepancies = lots.filter(l => l.counted_quantity !== l.expected_quantity);
  const willFlagCount = lots.filter(l => {
    if (l.expected_quantity === 0) return false;
    return Math.abs(l.counted_quantity - l.expected_quantity) / l.expected_quantity >= VARIANCE_THRESHOLD;
  }).length;
  const accuracy = lots.length > 0
    ? Math.round(lots.filter(l => l.counted_quantity === l.expected_quantity).length / lots.length * 100)
    : 100;

  const wooEditUrl = selected && wooStoreUrl ? wooProductEditUrl(wooStoreUrl, selected) : '';

  // ─── Step: Search ─────────────────────────────────────────────────────────────

  if (step === 'search') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit by Product</h1>
            <p className="text-sm text-gray-500 mt-1">Count all lots of a single SKU across every location, then sync to WooCommerce</p>
          </div>
        </div>
        <Card className="p-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by SKU or product name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchProducts()}
                autoFocus
              />
            </div>
            <Button onClick={searchProducts} disabled={searching} className="flex items-center gap-2">
              {searching && <Loader2 className="w-4 h-4 animate-spin" />}
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map(p => (
                <button
                  key={p.product_id}
                  onClick={() => selectProduct(p)}
                  disabled={saving}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                >
                  <div>
                    <span className="font-mono font-semibold text-sm text-gray-900">{p.sku}</span>
                    <span className="text-xs text-gray-400 ml-2">{p.product_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {p.woo_product_id && <Badge variant="blue">WooCommerce</Badge>}
                    <ChevronRight />
                  </div>
                </button>
              ))}
            </div>
          )}

          {saving && (
            <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading lots...
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ─── Step: Count ─────────────────────────────────────────────────────────────

  if (step === 'count' && selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setStep('search')} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Audit: <span className="font-mono text-blue-700">{selected.sku}</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">Count all lots of this product across {[...new Set(lots.map(l => l.location_id))].length} location(s)</p>
          </div>
        </div>
        <Card>
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">{lots.length} lot line{lots.length !== 1 ? 's' : ''}</span>
            <Button onClick={() => setStep('review')}>Review & Submit</Button>
          </div>
          {lots.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No stock found for this product</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reserved</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Counted</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lots.map((lot, idx) => {
                    const diff = lot.counted_quantity - lot.expected_quantity;
                    return (
                      <tr key={lot.lot_id} className={diff !== 0 ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                        <td className="px-5 py-3">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{lot.location_code}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs text-gray-500">{lot.lot_number}</span>
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-medium text-gray-900">{lot.expected_quantity}</td>
                        <td className="px-5 py-3 text-right text-sm text-blue-600">
                          {lot.reserved_quantity > 0 ? lot.reserved_quantity : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={lot.counted_quantity}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              setLots(prev => prev.map((l, i) => i === idx ? { ...l, counted_quantity: val } : l));
                            }}
                            className={`w-20 text-right px-2 py-1 border rounded text-sm ${
                              diff !== 0 ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
                            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                          />
                        </td>
                        <td className="px-5 py-3 text-right">
                          {diff !== 0 ? (
                            <span className={`font-bold text-sm ${diff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {diff > 0 ? '+' : ''}{diff}
                            </span>
                          ) : (
                            <CheckIcon />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={2} className="px-5 py-3 text-sm font-semibold text-gray-700">Total</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">
                      {lots.reduce((s, l) => s + l.expected_quantity, 0)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-blue-700">
                      {lots.reduce((s, l) => s + l.reserved_quantity, 0)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">{physicalTotal}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
        <div>
          <label className="text-xs font-medium text-gray-700">Notes (optional)</label>
          <textarea
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            value={auditNotes}
            onChange={e => setAuditNotes(e.target.value)}
            placeholder="Any observations..."
          />
        </div>
      </div>
    );
  }

  // ─── Step: Review ─────────────────────────────────────────────────────────────

  if (step === 'review' && selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setStep('count')} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Review & Submit</h1>
            <p className="text-sm text-gray-500 mt-1">Audit: <span className="font-mono">{selected.sku}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5">
            <p className="text-xs text-gray-500 uppercase">Accuracy</p>
            <p className={`text-3xl font-bold mt-1 ${accuracy >= 95 ? 'text-emerald-600' : accuracy >= 80 ? 'text-amber-600' : 'text-red-500'}`}>
              {accuracy}%
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-gray-500 uppercase">Physical Total</p>
            <p className="text-3xl font-bold mt-1 text-gray-900">{physicalTotal}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-gray-500 uppercase">Available (Physical − Reserved)</p>
            <p className="text-3xl font-bold mt-1 text-blue-700">{Math.max(0, physicalTotal - reservedTotal)}</p>
          </Card>
        </div>

        {willFlagCount > 0 && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Flag className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>{willFlagCount} lot{willFlagCount > 1 ? 's' : ''}</strong> will be flagged (≥20% variance).
            </p>
          </div>
        )}

        {discrepancies.length > 0 && (
          <Card>
            <div className="p-5 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Discrepancies ({discrepancies.length})</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Counted</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {discrepancies.map(l => {
                  const diff = l.counted_quantity - l.expected_quantity;
                  return (
                    <tr key={l.lot_id} className="bg-amber-50">
                      <td className="px-5 py-3 font-mono text-sm">{l.location_code}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">{l.lot_number}</td>
                      <td className="px-5 py-3 text-right text-sm">{l.expected_quantity}</td>
                      <td className="px-5 py-3 text-right text-sm">{l.counted_quantity}</td>
                      <td className={`px-5 py-3 text-right font-bold text-sm ${diff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}

        <div className="flex items-center justify-between gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800">
              After submitting, you will be prompted to review and push the corrected stock to WooCommerce.
              <br />Proposed WooCommerce stock = <strong>{physicalTotal} physical − {reservedTotal} reserved = {Math.max(0, physicalTotal - reservedTotal)}</strong>
            </p>
          </div>
          <Button onClick={submitAudit} disabled={saving} className="shrink-0 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Audit
          </Button>
        </div>
      </div>
    );
  }

  // ─── Step: WooCommerce sync ───────────────────────────────────────────────────

  if (step === 'woo_sync' && selected) {
    const stockDiff = currentWooStock !== null ? proposedWooStock - currentWooStock : null;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">WooCommerce Stock Sync</h1>
          <p className="text-sm text-gray-500 mt-1">
            Audit complete for <span className="font-mono font-semibold">{selected.sku}</span>. Review and push corrected stock.
          </p>
        </div>

        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 uppercase mb-1">Physical Total</p>
              <p className="text-3xl font-bold text-gray-900">{physicalTotal}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-xs text-blue-500 uppercase mb-1">Reserved</p>
              <p className="text-3xl font-bold text-blue-700">{reservedTotal}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center border-2 border-emerald-200">
              <p className="text-xs text-emerald-600 uppercase mb-1">Proposed WooCommerce Stock</p>
              <p className="text-3xl font-bold text-emerald-700">{proposedWooStock}</p>
            </div>
          </div>

          {fetchingWoo ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching current WooCommerce stock...
            </div>
          ) : currentWooStock !== null ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 mb-4 text-sm">
              <span className="text-gray-500">Current WooCommerce stock:</span>
              <span className="font-bold text-gray-900">{currentWooStock}</span>
              {stockDiff !== null && stockDiff !== 0 && (
                <span className={`font-semibold ml-1 ${stockDiff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  ({stockDiff > 0 ? '+' : ''}{stockDiff})
                </span>
              )}
              {stockDiff === 0 && (
                <Badge variant="emerald">Already up to date</Badge>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 mb-4 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Could not fetch current WooCommerce stock. You can still push the proposed value.
            </div>
          )}

          {syncResult === 'failed' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">WooCommerce sync failed</p>
                  <p className="text-xs text-red-600 mt-1 font-mono">{syncError}</p>
                </div>
              </div>
              <div className="p-3 bg-red-100 rounded-lg border border-red-200">
                <p className="text-sm font-bold text-red-900">
                  Please update the WooCommerce stock to <span className="text-2xl">{proposedWooStock}</span> manually.
                </p>
                <p className="text-xs text-red-700 mt-1">Go to WooCommerce → Products → {selected.sku} → Inventory → Stock quantity → set to {proposedWooStock}</p>
                {wooEditUrl && (
                  <a
                    href={wooEditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-red-700 underline font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open product in WooCommerce admin
                  </a>
                )}
              </div>
              <Button variant="outline" onClick={pushToWooCommerce} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Retry Sync
              </Button>
            </div>
          )}

          {syncResult === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-sm text-emerald-800 mb-4">
              <CheckCircle className="w-4 h-4 shrink-0" />
              WooCommerce stock successfully updated to {proposedWooStock}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setStep('done')}
              className="text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Skip sync and finish
            </button>
            {syncResult !== 'success' && (
              <Button
                onClick={pushToWooCommerce}
                disabled={syncResult === 'syncing' || stockDiff === 0}
                className="flex items-center gap-2"
              >
                {syncResult === 'syncing' && <Loader2 className="w-4 h-4 animate-spin" />}
                {stockDiff === 0 ? 'Already up to date' : `Push ${proposedWooStock} to WooCommerce`}
                {stockDiff !== 0 && syncResult !== 'syncing' && <ArrowRight className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // ─── Step: Done ───────────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="p-4 bg-emerald-50 rounded-full w-fit mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Complete</h2>
          <p className="text-sm text-gray-500 mt-1">
            Product <span className="font-mono font-semibold">{selected?.sku}</span> has been audited and stock has been updated.
          </p>
          <Button onClick={onBack} className="mt-8">Back to Audits</Button>
        </div>
      </div>
    );
  }

  return null;
}

// Small helpers
function ChevronRight() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
}
function CheckIcon() {
  return (
    <span className="flex justify-end">
      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}
