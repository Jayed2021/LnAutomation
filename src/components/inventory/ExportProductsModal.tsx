import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { X, Download, Package, Tag, CheckSquare, ChevronDown } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  category: string | null;
  selling_price: number | null;
  low_stock_threshold: number;
  product_type: string;
  total_quantity: number;
  avg_cost: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface Props {
  products: Product[];
  selectedProductIds: Set<string>;
  onClose: () => void;
}

type ExportScope = 'all' | 'by_supplier' | 'selected';

function escapeCsvValue(val: string | number | null | undefined): string {
  const str = val == null ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function ExportProductsModal({ products, selectedProductIds, onClose }: Props) {
  const [scope, setScope] = useState<ExportScope>('all');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);
    const { data } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setSuppliers(data || []);
    if (data && data.length > 0) setSelectedSupplierId(data[0].id);
    setLoadingSuppliers(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let productIds: string[] = [];

      if (scope === 'all') {
        productIds = products.map(p => p.id);
      } else if (scope === 'selected') {
        productIds = [...selectedProductIds];
      } else if (scope === 'by_supplier') {
        const { data: psRows } = await supabase
          .from('product_suppliers')
          .select('product_id')
          .eq('supplier_id', selectedSupplierId);
        productIds = (psRows || []).map(r => r.product_id);
      }

      const productMap = new Map(products.map(p => [p.id, p]));

      const [psRes, lotsRes] = await Promise.all([
        supabase
          .from('product_suppliers')
          .select('product_id, supplier_id, supplier_sku, unit_price, currency, is_preferred, suppliers(name)')
          .in('product_id', productIds),
        supabase
          .from('inventory_lots')
          .select('product_id, remaining_quantity, landed_cost_per_unit, warehouse_locations(code, name)')
          .in('product_id', productIds)
          .gt('remaining_quantity', 0)
          .order('remaining_quantity', { ascending: false }),
      ]);

      const preferredSupplierMap = new Map<string, { name: string; sku: string; price: number | null; currency: string }>();
      (psRes.data || []).forEach((ps: any) => {
        const existing = preferredSupplierMap.get(ps.product_id);
        if (!existing || ps.is_preferred) {
          preferredSupplierMap.set(ps.product_id, {
            name: ps.suppliers?.name || '',
            sku: ps.supplier_sku || '',
            price: ps.unit_price,
            currency: ps.currency || ''
          });
        }
      });

      const primaryLocationMap = new Map<string, string>();
      (lotsRes.data || []).forEach((lot: any) => {
        if (!primaryLocationMap.has(lot.product_id) && lot.warehouse_locations) {
          primaryLocationMap.set(lot.product_id, lot.warehouse_locations.code);
        }
      });

      const headers = [
        'sku', 'name', 'product_type', 'category', 'selling_price', 'barcode',
        'low_stock_threshold', 'total_stock', 'landed_cost_per_unit',
        'stock_location', 'supplier_name', 'supplier_sku', 'unit_cost', 'currency'
      ];

      const rows = productIds
        .map(id => productMap.get(id))
        .filter(Boolean)
        .map(p => {
          const sup = preferredSupplierMap.get(p!.id);
          return [
            escapeCsvValue(p!.sku),
            escapeCsvValue(p!.name),
            escapeCsvValue(p!.product_type),
            escapeCsvValue(p!.category),
            escapeCsvValue(p!.selling_price),
            escapeCsvValue(p!.barcode),
            escapeCsvValue(p!.low_stock_threshold),
            escapeCsvValue(p!.total_quantity),
            escapeCsvValue(p!.avg_cost > 0 ? p!.avg_cost.toFixed(2) : ''),
            escapeCsvValue(primaryLocationMap.get(p!.id) || ''),
            escapeCsvValue(sup?.name || ''),
            escapeCsvValue(sup?.sku || ''),
            escapeCsvValue(sup?.price ?? ''),
            escapeCsvValue(sup?.currency || '')
          ].join(',');
        });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products-export.csv';
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const selectedCount = selectedProductIds.size;
  const canExport =
    scope === 'all' ||
    (scope === 'selected' && selectedCount > 0) ||
    (scope === 'by_supplier' && !!selectedSupplierId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Export Products</h2>
            <p className="text-xs text-gray-500 mt-0.5">Choose what to include in the export</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <button
            onClick={() => setScope('all')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${scope === 'all' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className={`p-2 rounded-lg ${scope === 'all' ? 'bg-gray-900' : 'bg-gray-100'}`}>
              <Package className={`w-5 h-5 ${scope === 'all' ? 'text-white' : 'text-gray-500'}`} />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">All Products</p>
              <p className="text-xs text-gray-500 mt-0.5">{products.length} products will be exported</p>
            </div>
            {scope === 'all' && (
              <div className="ml-auto w-4 h-4 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            )}
          </button>

          <button
            onClick={() => setScope('by_supplier')}
            className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${scope === 'by_supplier' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${scope === 'by_supplier' ? 'bg-gray-900' : 'bg-gray-100'}`}>
              <Tag className={`w-5 h-5 ${scope === 'by_supplier' ? 'text-white' : 'text-gray-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">By Supplier</p>
              <p className="text-xs text-gray-500 mt-0.5">Export products linked to a specific supplier</p>
              {scope === 'by_supplier' && (
                <div className="mt-3 relative" onClick={e => e.stopPropagation()}>
                  <select
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    disabled={loadingSuppliers}
                    className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none bg-white"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    {suppliers.length === 0 && <option value="">No suppliers found</option>}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>
            {scope === 'by_supplier' && (
              <div className="ml-auto w-4 h-4 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            )}
          </button>

          <button
            onClick={() => setScope('selected')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${scope === 'selected' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className={`p-2 rounded-lg ${scope === 'selected' ? 'bg-gray-900' : 'bg-gray-100'}`}>
              <CheckSquare className={`w-5 h-5 ${scope === 'selected' ? 'text-white' : 'text-gray-500'}`} />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Selected Products</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedCount > 0 ? `${selectedCount} product${selectedCount !== 1 ? 's' : ''} selected` : 'No products selected — check rows in the table first'}
              </p>
            </div>
            {scope === 'selected' && (
              <div className="ml-auto w-4 h-4 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            )}
          </button>

          <div className="bg-gray-50 rounded-lg p-3 mt-1">
            <p className="text-xs text-gray-500">
              The exported CSV will include: SKU, Name, Product Type, Category, Selling Price, Barcode, Low Stock Alert, <strong>Total Stock, Landed Cost/Unit, Stock Location</strong>, Supplier Name, Supplier SKU, Unit Cost, and Currency.
              The new stock columns can be edited and re-imported via "Update via CSV\" to do a bulk stock update.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleExport}
            disabled={exporting || !canExport}
            className="bg-gray-900 text-white hover:bg-gray-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>
    </div>
  );
}
