import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { parseWooCategory } from '../../lib/categoryParser';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  X, RefreshCw, CheckSquare, Square, ShoppingCart,
  Package, ChevronDown, ChevronRight, AlertCircle, Check
} from 'lucide-react';

interface WooProduct {
  _id: number;
  _parent_id: number | null;
  _parent_name: string | null;
  _parent_image: string | null;
  sku: string;
  name: string;
  price: string;
  type: string;
  images: Array<{ src: string }>;
  attributes: Array<{ name: string; option: string }>;
  raw_categories: string | null;
  alreadyImported?: boolean;
  existingId?: string;
}

interface ImportRow extends WooProduct {
  selected: boolean;
  overridePrice: string;
}

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function WooImportModal({ onClose, onImported }: Props) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const [step, setStep] = useState<'fetch' | 'review' | 'done'>('fetch');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; updated: number } | null>(null);
  const [parentFilter, setParentFilter] = useState('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const fetchProducts = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const { data: cfg } = await supabase
        .from('woocommerce_config')
        .select('store_url, consumer_key, consumer_secret')
        .maybeSingle();

      if (!cfg?.store_url || !cfg?.consumer_key || !cfg?.consumer_secret) {
        setFetchError('WooCommerce credentials not configured. Go to Settings → WooCommerce Integration first.');
        return;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/woo-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          action: 'fetch-products',
          store_url: cfg.store_url,
          consumer_key: cfg.consumer_key,
          consumer_secret: cfg.consumer_secret,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const wooProducts: WooProduct[] = (data.products || []).map((p: any) => ({
        _id: p.id,
        _parent_id: p._parent_id || null,
        _parent_name: p._parent_name || null,
        _parent_image: p._parent_image || null,
        sku: p.sku || String(p.id),
        name: p._parent_id
          ? (p.name || p.attributes?.map((a: any) => a.option).join(' - ') || String(p.id))
          : p.name,
        price: p.price || '',
        type: p.type || 'simple',
        images: p.images || [],
        attributes: p.attributes || [],
        raw_categories: p.categories?.length
          ? p.categories.map((c: any) => c.name).join(', ')
          : (p._parent_categories?.length
            ? p._parent_categories.map((c: any) => c.name).join(', ')
            : null),
      }));

      const skus = wooProducts.map(p => p.sku).filter(Boolean);
      const { data: existing } = await supabase
        .from('products')
        .select('id, sku, woo_product_id, woo_variation_id')
        .in('sku', skus);

      const skuMap = new Map((existing || []).map(e => [e.sku, e]));

      const importRows: ImportRow[] = wooProducts.map(p => {
        const ex = skuMap.get(p.sku);
        return {
          ...p,
          alreadyImported: !!ex,
          existingId: ex?.id,
          selected: !ex,
          overridePrice: p.price || '',
        };
      });

      setRows(importRows);
      setStep('review');
    } catch (err: any) {
      setFetchError(err?.message || 'Failed to fetch products');
    } finally {
      setFetching(false);
    }
  };

  const toggleRow = (sku: string) => {
    setRows(r => r.map(row => row.sku === sku ? { ...row, selected: !row.selected } : row));
  };

  const toggleAll = () => {
    const anySelected = rows.some(r => r.selected);
    setRows(r => r.map(row => ({ ...row, selected: !anySelected })));
  };

  const toggleCollapse = (parentName: string) => {
    setCollapsed(s => {
      const n = new Set(s);
      if (n.has(parentName)) n.delete(parentName);
      else n.add(parentName);
      return n;
    });
  };

  const importSelected = async () => {
    const toImport = rows.filter(r => r.selected);
    if (!toImport.length) return;
    setImporting(true);

    let added = 0;
    let updated = 0;

    for (const p of toImport) {
      const sku = p.sku;
      const { category, tags } = parseWooCategory(p.raw_categories);
      const productData = {
        sku,
        name: p._parent_id ? `${p._parent_name} - ${p.name}` : p.name,
        selling_price: p.overridePrice ? parseFloat(p.overridePrice) : null,
        image_url: p.images?.[0]?.src || p._parent_image || null,
        woo_product_id: p._parent_id ? p._parent_id : p._id,
        woo_variation_id: p._parent_id ? p._id : null,
        woo_parent_product_id: p._parent_id || null,
        woo_parent_name: p._parent_name || null,
        woo_attributes: p.attributes?.length
          ? p.attributes.map(a => ({ [a.name]: a.option }))
          : null,
        barcode: sku,
        category: category || undefined,
        tags: tags.length > 0 ? tags : undefined,
        updated_at: new Date().toISOString(),
      };

      if (p.existingId) {
        await supabase.from('products').update(productData).eq('id', p.existingId);
        updated++;
      } else {
        await supabase.from('products').insert({
          ...productData,
          is_active: true,
          low_stock_threshold: 20,
        });
        added++;
      }
    }

    setImportResult({ added, updated });
    setStep('done');
    setImporting(false);
  };

  const uniqueParents = Array.from(
    new Set(rows.map(r => r._parent_name || '__standalone__'))
  );

  const filteredRows = parentFilter === 'all'
    ? rows
    : rows.filter(r => (r._parent_name || '__standalone__') === parentFilter);

  const selectedCount = rows.filter(r => r.selected).length;
  const allSelected = rows.length > 0 && rows.every(r => r.selected);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import from WooCommerce</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {step === 'fetch' && 'Fetch your WooCommerce product catalog'}
                {step === 'review' && `${rows.length} products fetched — select which to import`}
                {step === 'done' && 'Import complete'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'fetch' && (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fetch Product Catalog</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm">
                This will connect to your WooCommerce store and retrieve all published products including variations.
              </p>
              {fetchError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4 max-w-md text-left">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {fetchError}
                </div>
              )}
              <Button
                onClick={fetchProducts}
                disabled={fetching}
                className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-700 px-6"
              >
                {fetching
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Fetching products...</>
                  : <><RefreshCw className="w-4 h-4" /> Fetch Products</>}
              </Button>
            </div>
          )}

          {step === 'review' && (
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {allSelected
                    ? <CheckSquare className="w-4 h-4 text-gray-900" />
                    : <Square className="w-4 h-4" />}
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-gray-400">{selectedCount} of {rows.length} selected</span>

                <div className="ml-auto flex items-center gap-2">
                  <select
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                    value={parentFilter}
                    onChange={e => setParentFilter(e.target.value)}
                  >
                    <option value="all">All Products</option>
                    {uniqueParents.map(p => (
                      <option key={p} value={p}>
                        {p === '__standalone__' ? 'Standalone Products' : p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 w-10"></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Woo ID</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      const groupedParents = Array.from(
                        new Set(filteredRows.map(r => r._parent_name || '__standalone__'))
                      );

                      return groupedParents.map(parentName => {
                        const group = filteredRows.filter(
                          r => (r._parent_name || '__standalone__') === parentName
                        );
                        const isVariation = parentName !== '__standalone__';
                        const isCollapsed = collapsed.has(parentName);

                        return (
                          <tbody key={parentName} className="contents">
                            {isVariation && (
                              <tr
                                className="bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => toggleCollapse(parentName)}
                              >
                                <td colSpan={6} className="px-4 py-2">
                                  <div className="flex items-center gap-2">
                                    {isCollapsed
                                      ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                      : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                                    <span className="text-xs font-semibold text-gray-600">{parentName}</span>
                                    <span className="text-xs text-gray-400">({group.length} variants)</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                            {!isCollapsed && group.map(row => (
                              <tr
                                key={row.sku}
                                className={`hover:bg-gray-50 transition-colors ${row.selected ? 'bg-blue-50/40' : ''}`}
                              >
                                <td className="px-4 py-3 text-center">
                                  <button onClick={() => toggleRow(row.sku)} className="text-gray-400 hover:text-gray-700 transition-colors">
                                    {row.selected
                                      ? <CheckSquare className="w-4 h-4 text-gray-800" />
                                      : <Square className="w-4 h-4" />}
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                                      {(row.images?.[0]?.src || row._parent_image) ? (
                                        <img
                                          src={row.images?.[0]?.src || row._parent_image || ''}
                                          alt={row.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Package className="w-4 h-4 text-gray-300" />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-900 font-medium leading-tight">
                                        {isVariation ? row.name : row.name}
                                      </p>
                                      {row.attributes?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                          {row.attributes.map(a => (
                                            <span key={a.name} className="text-xs text-gray-400">
                                              {a.name}: {a.option}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-gray-600">{row.sku}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{row._parent_id || row._id}</td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                    value={row.overridePrice}
                                    onChange={e => setRows(rs => rs.map(r =>
                                      r.sku === row.sku ? { ...r, overridePrice: e.target.value } : r
                                    ))}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  {row.alreadyImported
                                    ? <Badge variant="amber">Already Imported</Badge>
                                    : <Badge variant="emerald">New</Badge>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'done' && importResult && (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Complete</h3>
              <div className="flex gap-6 mt-2">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{importResult.added}</p>
                  <p className="text-xs text-gray-500 mt-1">New Products Added</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{importResult.updated}</p>
                  <p className="text-xs text-gray-500 mt-1">Existing Updated</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="text-xs text-gray-400">
            {step === 'review' && `${rows.filter(r => r.alreadyImported).length} already in system`}
          </div>
          <div className="flex gap-3">
            {step === 'done' ? (
              <Button
                onClick={() => { onImported(); onClose(); }}
                className="bg-gray-900 text-white hover:bg-gray-700"
              >
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                {step === 'review' && (
                  <Button
                    onClick={importSelected}
                    disabled={importing || selectedCount === 0}
                    className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-700"
                  >
                    {importing
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importing...</>
                      : `Import ${selectedCount} Product${selectedCount !== 1 ? 's' : ''}`}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
