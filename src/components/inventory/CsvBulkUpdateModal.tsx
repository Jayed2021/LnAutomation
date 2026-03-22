import { useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { parseWooCategory } from '../../lib/categoryParser';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { X, Upload, FileText, CheckCircle, AlertTriangle, ChevronRight, ArrowRight, Zap } from 'lucide-react';

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
}

interface CsvRow {
  sku: string;
  name?: string;
  category?: string;
  selling_price?: string;
  barcode?: string;
  low_stock_threshold?: string;
  product_type?: string;
  total_stock?: string;
  landed_cost_per_unit?: string;
  stock_location?: string;
  supplier_name?: string;
  supplier_sku?: string;
  unit_cost?: string;
  currency?: string;
}

interface ReviewRow {
  csvRow: CsvRow;
  product: Product | null;
  status: 'will_update' | 'no_change' | 'not_found';
  changes: { field: string; label: string; old: string; new: string }[];
  supplierUnresolved?: boolean;
}

interface CurrentSupplierInfo {
  supplierName: string;
  supplierSku: string;
  unitPrice: number | null;
  currency: string;
}

interface SupplierRecord {
  id: string;
  name: string;
  short_name: string | null;
}

interface Props {
  products: Product[];
  onClose: () => void;
  onUpdated: () => void;
}

type Step = 'upload' | 'review' | 'done';

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '_'));

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || '').trim().replace(/^"|"$/g, '');
    });
    return row as CsvRow;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function fetchCurrentSupplierMap(productIds: string[]): Promise<Map<string, CurrentSupplierInfo>> {
  if (productIds.length === 0) return new Map();
  const { data } = await supabase
    .from('product_suppliers')
    .select('product_id, supplier_sku, unit_price, currency, is_preferred, suppliers(name)')
    .in('product_id', productIds);

  const map = new Map<string, CurrentSupplierInfo>();
  (data || []).forEach((ps: any) => {
    const existing = map.get(ps.product_id);
    if (!existing || ps.is_preferred) {
      map.set(ps.product_id, {
        supplierName: ps.suppliers?.name || '',
        supplierSku: ps.supplier_sku || '',
        unitPrice: ps.unit_price,
        currency: ps.currency || ''
      });
    }
  });
  return map;
}

async function fetchAllSuppliers(): Promise<SupplierRecord[]> {
  const { data } = await supabase
    .from('suppliers')
    .select('id, name, short_name')
    .eq('is_active', true);
  return (data || []) as SupplierRecord[];
}

function resolveSupplierFromList(supplierInitialOrName: string, suppliers: SupplierRecord[]): SupplierRecord | null {
  const val = supplierInitialOrName.trim().toLowerCase();
  return suppliers.find(s =>
    s.name.toLowerCase() === val ||
    (s.short_name && s.short_name.toLowerCase() === val) ||
    s.name.toLowerCase().includes(val)
  ) || null;
}

function buildReviewRows(
  csvRows: CsvRow[],
  products: Product[],
  supplierMap: Map<string, CurrentSupplierInfo>,
  allSuppliers: SupplierRecord[],
  initialSetupMode: boolean
): ReviewRow[] {
  const productBySku = new Map(products.map(p => [p.sku.toLowerCase(), p]));

  return csvRows.map(row => {
    if (!row.sku) return null;
    const product = productBySku.get(row.sku.toLowerCase()) || null;
    if (!product) return { csvRow: row, product: null, status: 'not_found' as const, changes: [], supplierUnresolved: false };

    const changes: ReviewRow['changes'] = [];

    if (row.name !== undefined && row.name !== '' && row.name !== product.name) {
      changes.push({ field: 'name', label: 'Name', old: product.name, new: row.name });
    }
    if (row.category !== undefined && row.category !== '' && row.category !== (product.category || '')) {
      changes.push({ field: 'category', label: 'Category', old: product.category || '—', new: row.category });
    }
    if (row.selling_price !== undefined && row.selling_price !== '') {
      const newPrice = parseFloat(row.selling_price);
      if (!isNaN(newPrice) && newPrice !== (product.selling_price || 0)) {
        changes.push({ field: 'selling_price', label: 'Sell Price', old: product.selling_price ? `৳ ${product.selling_price}` : '—', new: `৳ ${newPrice}` });
      }
    }
    if (row.barcode !== undefined && row.barcode !== '' && row.barcode !== (product.barcode || '')) {
      changes.push({ field: 'barcode', label: 'Barcode', old: product.barcode || '—', new: row.barcode });
    }
    if (row.low_stock_threshold !== undefined && row.low_stock_threshold !== '') {
      const newThreshold = parseInt(row.low_stock_threshold);
      if (!isNaN(newThreshold) && newThreshold !== product.low_stock_threshold) {
        changes.push({ field: 'low_stock_threshold', label: 'Low Stock Alert', old: String(product.low_stock_threshold), new: String(newThreshold) });
      }
    }
    if (row.product_type !== undefined && row.product_type !== '' && row.product_type !== product.product_type) {
      changes.push({ field: 'product_type', label: 'Product Type', old: product.product_type, new: row.product_type });
    }

    if (row.total_stock !== undefined && row.total_stock !== '') {
      const newStock = parseInt(row.total_stock);
      if (!isNaN(newStock)) {
        if (initialSetupMode) {
          if (newStock === 0) {
            changes.push({
              field: 'total_stock',
              label: 'Stock Lot',
              old: '—',
              new: 'Zero-stock baseline'
            });
          } else if (newStock !== product.total_quantity) {
            const delta = newStock - product.total_quantity;
            changes.push({
              field: 'total_stock',
              label: 'Total Stock',
              old: String(product.total_quantity),
              new: `${newStock} (${delta >= 0 ? '+' : ''}${delta})`
            });
          }
        } else {
          if (newStock !== product.total_quantity) {
            const delta = newStock - product.total_quantity;
            changes.push({
              field: 'total_stock',
              label: 'Total Stock',
              old: String(product.total_quantity),
              new: `${newStock} (${delta >= 0 ? '+' : ''}${delta})`
            });
          }
        }
      }
    }

    if (row.landed_cost_per_unit !== undefined && row.landed_cost_per_unit !== '') {
      const newCost = parseFloat(row.landed_cost_per_unit);
      if (!isNaN(newCost)) {
        if (initialSetupMode) {
          const label = product.total_quantity > 0 ? 'Lot Cost Update' : 'Cost Baseline';
          changes.push({ field: 'landed_cost_per_unit', label, old: '—', new: `৳ ${newCost}` });
        } else {
          changes.push({ field: 'landed_cost_per_unit', label: 'Landed Cost/Unit', old: '—', new: `৳ ${newCost}` });
        }
      }
    }

    if (row.stock_location !== undefined && row.stock_location !== '') {
      changes.push({ field: 'stock_location', label: 'Stock Location', old: '—', new: row.stock_location });
    }

    const currentSup = supplierMap.get(product.id);

    let supplierUnresolved = false;

    if (row.supplier_name !== undefined && row.supplier_name !== '') {
      const resolved = resolveSupplierFromList(row.supplier_name, allSuppliers);
      if (!resolved) {
        supplierUnresolved = true;
      }

      if (initialSetupMode) {
        const displayName = resolved?.name || row.supplier_name;
        changes.push({ field: 'supplier_name', label: 'Supplier', old: currentSup?.supplierName || '—', new: displayName });
      } else {
        const oldName = currentSup?.supplierName || '—';
        if (row.supplier_name !== (currentSup?.supplierName || '')) {
          changes.push({ field: 'supplier_name', label: 'Supplier', old: oldName, new: resolved?.name || row.supplier_name });
        }
      }
    }

    if (row.supplier_sku !== undefined && row.supplier_sku !== '') {
      if (initialSetupMode) {
        changes.push({ field: 'supplier_sku', label: 'Supplier SKU', old: currentSup?.supplierSku || '—', new: row.supplier_sku });
      } else {
        const oldSku = currentSup?.supplierSku || '—';
        if (row.supplier_sku !== (currentSup?.supplierSku || '')) {
          changes.push({ field: 'supplier_sku', label: 'Supplier SKU', old: oldSku, new: row.supplier_sku });
        }
      }
    }

    if (row.unit_cost !== undefined && row.unit_cost !== '') {
      const newCost = parseFloat(row.unit_cost);
      if (!isNaN(newCost)) {
        if (initialSetupMode) {
          const oldCost = currentSup?.unitPrice != null ? String(currentSup.unitPrice) : '—';
          changes.push({ field: 'unit_cost', label: 'Unit Cost', old: oldCost, new: String(newCost) });
        } else {
          if (newCost !== (currentSup?.unitPrice || 0)) {
            const oldCost = currentSup?.unitPrice != null ? String(currentSup.unitPrice) : '—';
            changes.push({ field: 'unit_cost', label: 'Unit Cost', old: oldCost, new: String(newCost) });
          }
        }
      }
    }

    if (row.currency !== undefined && row.currency !== '') {
      if (initialSetupMode) {
        changes.push({ field: 'currency', label: 'Currency', old: currentSup?.currency || '—', new: row.currency });
      } else {
        const oldCurrency = currentSup?.currency || '—';
        if (row.currency !== (currentSup?.currency || '')) {
          changes.push({ field: 'currency', label: 'Currency', old: oldCurrency, new: row.currency });
        }
      }
    }

    return {
      csvRow: row,
      product,
      status: changes.length > 0 ? 'will_update' : 'no_change',
      changes,
      supplierUnresolved
    };
  }).filter(Boolean) as ReviewRow[];
}

export default function CsvBulkUpdateModal({ products, onClose, onUpdated }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [updateResult, setUpdateResult] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const [initialSetupMode, setInitialSetupMode] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState<SupplierRecord[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a .csv file.');
      return;
    }
    setFileName(file.name);
    setParseError('');
    const reader = new FileReader();
    reader.onload = async e => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) { setParseError('The file appears empty or has no data rows.'); return; }
      if (!Object.keys(rows[0]).includes('sku')) {
        setParseError('Missing required "sku" column. Please use the sample template.');
        return;
      }

      const productBySku = new Map(products.map(p => [p.sku.toLowerCase(), p]));
      const matchedProductIds = rows
        .map(r => r.sku ? productBySku.get(r.sku.toLowerCase())?.id : undefined)
        .filter(Boolean) as string[];

      const [supplierMap, suppliers] = await Promise.all([
        fetchCurrentSupplierMap(matchedProductIds),
        fetchAllSuppliers()
      ]);
      setAllSuppliers(suppliers);
      const review = buildReviewRows(rows, products, supplierMap, suppliers, initialSetupMode);
      setReviewRows(review);
      setStep('review');
    };
    reader.readAsText(file);
  }, [products, initialSetupMode]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleConfirm = async () => {
    const toUpdate = reviewRows.filter(r => r.status === 'will_update');
    if (toUpdate.length === 0) return;
    setUpdating(true);
    setProgress({ current: 0, total: toUpdate.length });
    let success = 0;
    let failed = 0;

    const locationCache = new Map<string, string>();

    const resolveLocationId = async (code: string): Promise<string | null> => {
      if (locationCache.has(code)) return locationCache.get(code)!;
      const { data } = await supabase
        .from('warehouse_locations')
        .select('id')
        .ilike('code', code)
        .eq('is_active', true)
        .maybeSingle();
      if (data) { locationCache.set(code, data.id); return data.id; }
      return null;
    };

    try {
      for (let i = 0; i < toUpdate.length; i++) {
        const row = toUpdate[i];
        setProgress({ current: i + 1, total: toUpdate.length });

        const productFields = ['name', 'category', 'selling_price', 'barcode', 'low_stock_threshold', 'product_type'];
        const supplierFields = ['supplier_name', 'supplier_sku', 'unit_cost', 'currency'];
        const stockFields = ['total_stock', 'landed_cost_per_unit', 'stock_location'];

        const hasProductChanges = row.changes.some(c => productFields.includes(c.field));
        const hasSupplierChanges = row.changes.some(c => supplierFields.includes(c.field));
        const hasStockChanges = row.changes.some(c => stockFields.includes(c.field));

        let rowFailed = false;

        if (hasProductChanges && row.product) {
          const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
          for (const change of row.changes.filter(c => productFields.includes(c.field))) {
            if (change.field === 'selling_price') payload[change.field] = parseFloat(row.csvRow.selling_price!);
            else if (change.field === 'low_stock_threshold') payload[change.field] = parseInt(row.csvRow.low_stock_threshold!);
            else if (change.field === 'category') {
              const { category, tags } = parseWooCategory(row.csvRow.category);
              payload['category'] = category || row.csvRow.category;
              if (tags.length > 0) payload['tags'] = tags;
            }
            else payload[change.field] = row.csvRow[change.field as keyof CsvRow];
          }
          const { error } = await supabase
            .from('products')
            .update(payload)
            .eq('sku', row.csvRow.sku);
          if (error) rowFailed = true;
        }

        if (hasSupplierChanges && row.csvRow.supplier_name && row.product) {
          const resolved = resolveSupplierFromList(row.csvRow.supplier_name, allSuppliers);
          if (resolved) {
            const upsertPayload: Record<string, unknown> = {
              product_id: row.product.id,
              supplier_id: resolved.id,
              is_preferred: true
            };
            if (row.csvRow.supplier_sku !== undefined && row.csvRow.supplier_sku !== '') {
              upsertPayload.supplier_sku = row.csvRow.supplier_sku;
            }
            if (row.csvRow.unit_cost !== undefined && row.csvRow.unit_cost !== '') {
              const cost = parseFloat(row.csvRow.unit_cost);
              if (!isNaN(cost)) upsertPayload.unit_price = cost;
            }
            if (row.csvRow.currency !== undefined && row.csvRow.currency !== '') {
              upsertPayload.currency = row.csvRow.currency;
            }
            const { error: psError } = await supabase
              .from('product_suppliers')
              .upsert(upsertPayload, { onConflict: 'product_id,supplier_id' });
            if (psError) rowFailed = true;
          }
        }

        const hasLotCostData = row.csvRow.landed_cost_per_unit !== undefined && row.csvRow.landed_cost_per_unit !== '';
        const shouldProcessLot = initialSetupMode ? hasLotCostData : (hasStockChanges && hasLotCostData);

        if (shouldProcessLot && row.product) {
          const landedCost = parseFloat(row.csvRow.landed_cost_per_unit!);
          const rawStock = row.csvRow.total_stock;
          const newStock = rawStock !== undefined && rawStock !== '' ? parseInt(rawStock) : 0;

          if (!isNaN(landedCost) && landedCost >= 0 && !isNaN(newStock)) {
            let locationId: string | null = null;
            if (row.csvRow.stock_location) {
              locationId = await resolveLocationId(row.csvRow.stock_location);
            }
            if (!locationId) {
              const { data: defaultLoc } = await supabase
                .from('warehouse_locations')
                .select('id')
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();
              locationId = defaultLoc?.id || null;
            }

            if (locationId) {
              if (initialSetupMode) {
                const lotNumber = row.product.sku;
                const { data: existingLot } = await supabase
                  .from('inventory_lots')
                  .select('id')
                  .eq('lot_number', lotNumber)
                  .eq('product_id', row.product.id)
                  .maybeSingle();

                if (!existingLot) {
                  const { data: otherLots } = await supabase
                    .from('inventory_lots')
                    .select('id, remaining_quantity')
                    .eq('product_id', row.product.id);

                  if (otherLots && otherLots.length > 0) {
                    const { error: updateError } = await supabase
                      .from('inventory_lots')
                      .update({ landed_cost_per_unit: landedCost })
                      .eq('product_id', row.product.id);
                    if (updateError) rowFailed = true;
                  } else {
                    const { data: lotData, error: lotError } = await supabase
                      .from('inventory_lots')
                      .insert({
                        lot_number: lotNumber,
                        product_id: row.product.id,
                        location_id: locationId,
                        received_date: new Date().toISOString().split('T')[0],
                        received_quantity: newStock,
                        remaining_quantity: newStock,
                        landed_cost_per_unit: landedCost,
                        barcode: row.product.sku,
                      })
                      .select('id')
                      .single();

                    if (!lotError && lotData && newStock > 0) {
                      await supabase.from('stock_movements').insert({
                        movement_type: 'receipt',
                        product_id: row.product.id,
                        lot_id: lotData.id,
                        to_location_id: locationId,
                        quantity: newStock,
                        reference_type: 'audit',
                        notes: 'Initial setup — CSV bulk load',
                      });
                    } else if (lotError) {
                      rowFailed = true;
                    }
                  }
                } else {
                  const { error: updateError } = await supabase
                    .from('inventory_lots')
                    .update({ landed_cost_per_unit: landedCost })
                    .eq('lot_number', lotNumber)
                    .eq('product_id', row.product.id);
                  if (updateError) rowFailed = true;
                }
              } else {
                if (newStock > 0) {
                  const delta = newStock - row.product.total_quantity;
                  const lotNumber = `LOT-${row.product.sku}-CSV-${Date.now()}`;
                  const { data: lotData, error: lotError } = await supabase
                    .from('inventory_lots')
                    .insert({
                      lot_number: lotNumber,
                      product_id: row.product.id,
                      location_id: locationId,
                      received_date: new Date().toISOString().split('T')[0],
                      received_quantity: newStock,
                      remaining_quantity: newStock,
                      landed_cost_per_unit: landedCost,
                      barcode: `${row.product.sku}-CSV`,
                    })
                    .select('id')
                    .single();

                  if (!lotError && lotData) {
                    await supabase.from('stock_movements').insert({
                      movement_type: delta === 0 ? 'adjustment' : delta > 0 ? 'receipt' : 'adjustment',
                      product_id: row.product.id,
                      lot_id: lotData.id,
                      to_location_id: locationId,
                      quantity: newStock,
                      reference_type: 'audit',
                      notes: 'CSV bulk upload',
                    });
                  } else if (lotError) {
                    rowFailed = true;
                  }
                }
              }
            } else {
              rowFailed = true;
            }
          }
        }

        if (rowFailed) failed++;
        else success++;
      }

      setUpdateResult({ success, failed });
      setStep('done');
      if (success > 0) onUpdated();
    } finally {
      setUpdating(false);
    }
  };

  const willUpdate = reviewRows.filter(r => r.status === 'will_update').length;
  const notFound = reviewRows.filter(r => r.status === 'not_found').length;
  const noChange = reviewRows.filter(r => r.status === 'no_change').length;
  const supplierUnresolvedCount = reviewRows.filter(r => r.supplierUnresolved).length;
  const lotsWillCreate = reviewRows.filter(r =>
    r.status === 'will_update' &&
    r.csvRow.landed_cost_per_unit !== undefined &&
    r.csvRow.landed_cost_per_unit !== '' &&
    (!initialSetupMode || (r.product?.total_quantity ?? 0) === 0)
  ).length;
  const lotCostsWillUpdate = initialSetupMode ? reviewRows.filter(r =>
    r.status === 'will_update' &&
    r.csvRow.landed_cost_per_unit !== undefined &&
    r.csvRow.landed_cost_per_unit !== '' &&
    (r.product?.total_quantity ?? 0) > 0
  ).length : 0;
  const supplierLinksWillWrite = reviewRows.filter(r =>
    r.status === 'will_update' &&
    r.changes.some(c => c.field === 'supplier_name')
  ).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bulk Update Products via CSV</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'upload' && 'Upload a CSV file to update product details by SKU'}
              {step === 'review' && `Reviewing ${reviewRows.length} rows from ${fileName}`}
              {step === 'done' && 'Update complete'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'upload' && (
          <div className="p-6 space-y-5">
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-blue-50 rounded-full">
                  <Upload className="w-8 h-8 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-700">Drop your CSV file here</p>
                  <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                </div>
                <p className="text-xs text-gray-400">.csv files only</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
            </div>

            <button
              type="button"
              onClick={() => setInitialSetupMode(v => !v)}
              className={`w-full flex items-start gap-3.5 p-4 rounded-xl border-2 text-left transition-all ${
                initialSetupMode
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                initialSetupMode ? 'bg-amber-500 border-amber-500' : 'border-gray-300 bg-white'
              }`}>
                {initialSetupMode && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Zap className={`w-3.5 h-3.5 ${initialSetupMode ? 'text-amber-500' : 'text-gray-400'}`} />
                  <span className={`text-sm font-semibold ${initialSetupMode ? 'text-amber-800' : 'text-gray-700'}`}>
                    Initial data load (first-time setup)
                  </span>
                </div>
                <p className={`text-xs mt-1 leading-relaxed ${initialSetupMode ? 'text-amber-700' : 'text-gray-500'}`}>
                  Products with existing stock will have their lot costs updated in place. Zero-stock products get a new cost baseline lot. Supplier links are always written. Safe to re-run.
                </p>
              </div>
            </button>

            {parseError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {parseError}
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="w-4 h-4" />
                Expected CSV format
              </div>
              <p className="text-xs text-gray-500 font-mono bg-white border border-gray-200 rounded px-3 py-2 break-all">
                sku, name, product_type, category, selling_price, barcode, low_stock_threshold, total_stock, landed_cost_per_unit, stock_location, supplier_name, supplier_sku, unit_cost, currency
              </p>
              <ul className="text-xs text-gray-500 space-y-1 mt-2">
                <li>• <strong>sku</strong> is required — used to match products</li>
                <li>• Leave any field blank to skip updating it</li>
                <li>• <strong>total_stock</strong> + <strong>landed_cost_per_unit</strong> together create a new inventory lot</li>
                <li>• <strong>stock_location</strong> must match a warehouse location code (e.g. A-01)</li>
                <li>• <strong>supplier_name</strong> accepts the supplier's full name or short code (e.g. QC, ZHJ, PG, MQ)</li>
                <li>• Supplier fields will create or update the preferred supplier link</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'review' && (
          <>
            {initialSetupMode && (
              <div className="mx-5 mt-4 flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex-shrink-0">
                <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm font-medium text-amber-800">
                  Initial Setup Mode — lots will be created using SKU as lot number
                </span>
              </div>
            )}

            <div className="px-6 pt-4 pb-3 border-b bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span className="text-gray-700 font-medium">{willUpdate} will update</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block"></span>
                  <span className="text-gray-500">{noChange} no changes</span>
                </div>
                {notFound > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                    <span className="text-amber-700">{notFound} not found (will be skipped)</span>
                  </div>
                )}
                {lotsWillCreate > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"></span>
                    <span className="text-blue-700">{lotsWillCreate} lot{lotsWillCreate !== 1 ? 's' : ''} will be created</span>
                  </div>
                )}
                {lotCostsWillUpdate > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
                    <span className="text-sky-700">{lotCostsWillUpdate} lot cost{lotCostsWillUpdate !== 1 ? 's' : ''} will be updated</span>
                  </div>
                )}
                {supplierLinksWillWrite > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block"></span>
                    <span className="text-teal-700">{supplierLinksWillWrite} supplier link{supplierLinksWillWrite !== 1 ? 's' : ''} will be written</span>
                  </div>
                )}
                {supplierUnresolvedCount > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block"></span>
                    <span className="text-orange-700">{supplierUnresolvedCount} supplier{supplierUnresolvedCount !== 1 ? 's' : ''} not recognized</span>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {reviewRows.map((row, i) => (
                <div
                  key={i}
                  className={`px-6 py-3.5 ${row.status === 'no_change' || row.status === 'not_found' ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${row.status === 'will_update' ? 'bg-emerald-500' : row.status === 'not_found' ? 'bg-amber-400' : 'bg-gray-300'}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{row.csvRow.sku}</span>
                          {row.status === 'not_found' && <Badge variant="amber">Not Found</Badge>}
                          {row.status === 'no_change' && <span className="text-xs text-gray-400">No changes</span>}
                          {row.supplierUnresolved && <Badge variant="amber">Supplier not found</Badge>}
                        </div>
                        {row.product && <p className="text-xs text-gray-500 mt-0.5 truncate">{row.product.name}</p>}
                      </div>
                    </div>
                    {row.status === 'will_update' && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 flex-shrink-0">
                        {row.changes.map(c => (
                          <span key={c.field} className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-500">{c.label}:</span>
                            <span className="text-gray-400 line-through">{c.old}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="font-medium text-emerald-700">{c.new}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t flex-shrink-0">
              {updating && (
                <div className="px-5 pt-4 pb-2 space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Updating products...</span>
                    <span className="font-medium text-gray-700">{progress.current} / {progress.total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full transition-all duration-300 ease-out"
                      style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center px-5 py-4">
                <button
                  onClick={() => setStep('upload')}
                  disabled={updating}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  Upload different file
                </button>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={onClose} disabled={updating}>Cancel</Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={updating || willUpdate === 0}
                    className="bg-gray-900 text-white hover:bg-gray-700 flex items-center gap-2"
                  >
                    {updating ? `Updating ${progress.current} of ${progress.total}...` : `Confirm Update (${willUpdate})`}
                    {!updating && <ChevronRight className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="p-10 flex flex-col items-center gap-5 text-center">
            <div className="p-5 bg-emerald-50 rounded-full">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Update Complete</h3>
              <p className="text-gray-500 mt-1 text-sm">The product list has been refreshed</p>
            </div>
            <div className="flex items-center gap-6 mt-2">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-600">{updateResult.success}</p>
                <p className="text-sm text-gray-500 mt-0.5">Updated</p>
              </div>
              {updateResult.failed > 0 && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-500">{updateResult.failed}</p>
                  <p className="text-sm text-gray-500 mt-0.5">Failed</p>
                </div>
              )}
            </div>
            <Button onClick={onClose} className="mt-2 bg-gray-900 text-white hover:bg-gray-700">
              Done
            </Button>
          </div>
        )}

        {step === 'upload' && (
          <div className="px-6 pb-5 flex justify-end gap-3 flex-shrink-0">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        )}
      </div>
    </div>
  );
}
