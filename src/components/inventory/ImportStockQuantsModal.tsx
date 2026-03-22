import { useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  X, Upload, AlertTriangle, CheckCircle, ChevronRight,
  FileText, Info, PackageCheck, Loader2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface ImportStockQuantsModalProps {
  onClose: () => void;
  onImported: () => void;
}

interface ParsedRow {
  rowIndex: number;
  locationBarcode: string;
  productSku: string;
  quantity: number;
  status: 'valid' | 'skip_location' | 'skip_product' | 'skip_quantity';
  skipReason?: string;
  resolvedLocationId?: string;
  resolvedProductId?: string;
}

interface DbResolution {
  locationMap: Record<string, string>;
  productMap: Record<string, string>;
  missingLocations: string[];
  missingProducts: string[];
}

function parseCsv(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  });
}

async function resolveFromDb(locationBarcodes: string[], productSkus: string[]): Promise<DbResolution> {
  const [{ data: locs }, { data: prods }] = await Promise.all([
    supabase.from('warehouse_locations').select('id, barcode').in('barcode', locationBarcodes),
    supabase.from('products').select('id, sku').in('sku', productSkus),
  ]);

  const locationMap: Record<string, string> = {};
  (locs || []).forEach((l: any) => { if (l.barcode) locationMap[l.barcode] = l.id; });

  const productMap: Record<string, string> = {};
  (prods || []).forEach((p: any) => { if (p.sku) productMap[p.sku] = p.id; });

  const missingLocations = locationBarcodes.filter(b => !locationMap[b]);
  const missingProducts = productSkus.filter(s => !productMap[s]);

  return { locationMap, productMap, missingLocations, missingProducts };
}

export default function ImportStockQuantsModal({ onClose, onImported }: ImportStockQuantsModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [resolution, setResolution] = useState<DbResolution | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null);
  const [parseError, setParseError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a .csv file');
      return;
    }
    setParseError('');
    setFileName(file.name);

    const text = await file.text();
    const allRows = parseCsv(text);
    if (allRows.length < 2) {
      setParseError('File appears to be empty or has no data rows');
      return;
    }

    const headers = allRows[0].map(h => h.toLowerCase().trim());
    const locIdx = headers.findIndex(h => h.includes('location') || h.includes('loc/barcode') || h === 'location/barcode');
    const prodIdx = headers.findIndex(h => h.includes('product') || h.includes('prod/barcode') || h === 'product/barcode');
    const qtyIdx = headers.findIndex(h => h.includes('quantity') || h.includes('qty') || h.includes('inventoried'));

    if (locIdx === -1 || prodIdx === -1 || qtyIdx === -1) {
      setParseError('Could not detect required columns. Expected: Location/Barcode, Product/Barcode, Inventoried Quantity');
      return;
    }

    const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim()));

    const uniqueLocationBarcodes = [...new Set(dataRows.map(r => r[locIdx]?.trim()).filter(Boolean))];
    const uniqueProductSkus = [...new Set(dataRows.map(r => r[prodIdx]?.trim()).filter(Boolean))];

    const res = await resolveFromDb(uniqueLocationBarcodes, uniqueProductSkus);
    setResolution(res);

    const parsed: ParsedRow[] = dataRows.map((r, idx) => {
      const locationBarcode = r[locIdx]?.trim() ?? '';
      const productSku = r[prodIdx]?.trim() ?? '';
      const rawQty = r[qtyIdx]?.trim() ?? '';
      const quantity = parseInt(rawQty, 10);

      if (!locationBarcode || !productSku) {
        return { rowIndex: idx + 2, locationBarcode, productSku, quantity: 0, status: 'skip_quantity', skipReason: 'Missing barcode or SKU' };
      }

      if (isNaN(quantity) || quantity <= 0) {
        return { rowIndex: idx + 2, locationBarcode, productSku, quantity: isNaN(quantity) ? 0 : quantity, status: 'skip_quantity', skipReason: quantity < 0 ? `Negative quantity (${quantity})` : 'Zero or invalid quantity' };
      }

      const resolvedLocationId = res.locationMap[locationBarcode];
      if (!resolvedLocationId) {
        return { rowIndex: idx + 2, locationBarcode, productSku, quantity, status: 'skip_location', skipReason: `Location "${locationBarcode}" not found in system` };
      }

      const resolvedProductId = res.productMap[productSku];
      if (!resolvedProductId) {
        return { rowIndex: idx + 2, locationBarcode, productSku, quantity, status: 'skip_product', skipReason: `Product SKU "${productSku}" not found in system` };
      }

      return { rowIndex: idx + 2, locationBarcode, productSku, quantity, status: 'valid', resolvedLocationId, resolvedProductId };
    });

    setParsedRows(parsed);
    setStep(2);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const validRows = parsedRows.filter(r => r.status === 'valid');
  const skippedRows = parsedRows.filter(r => r.status !== 'valid');

  const doImport = async () => {
    setImporting(true);
    setProgress(0);
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    try {
      const today = new Date().toISOString().split('T')[0];
      const ts = Date.now();

      const CHUNK = 50;
      for (let i = 0; i < validRows.length; i += CHUNK) {
        const chunk = validRows.slice(i, i + CHUNK);

        const lotsToInsert = chunk.map((row, j) => ({
          lot_number: `LOT-${row.productSku}-ODO-${ts}-${i + j}`,
          product_id: row.resolvedProductId!,
          location_id: row.resolvedLocationId!,
          received_date: today,
          received_quantity: row.quantity,
          remaining_quantity: row.quantity,
          landed_cost_per_unit: 0,
          barcode: `${row.productSku}-ODO`,
        }));

        const { data: insertedLots, error: lotError } = await supabase
          .from('inventory_lots')
          .insert(lotsToInsert)
          .select('id, product_id, location_id');

        if (lotError) {
          console.error('Lot insert error:', lotError);
          failed += chunk.length;
        } else if (insertedLots) {
          const movements = insertedLots.map((lot: any, j: number) => ({
            movement_type: 'receipt',
            product_id: lot.product_id,
            lot_id: lot.id,
            to_location_id: lot.location_id,
            quantity: chunk[j].quantity,
            reference_type: 'audit',
            notes: 'Imported from Odoo stock quants',
            performed_by: user?.id ?? null,
          }));

          const { error: movErr } = await supabase.from('stock_movements').insert(movements);
          if (movErr) console.error('Movement insert error:', movErr);

          imported += insertedLots.length;
        }

        setProgress(Math.round(((i + chunk.length) / validRows.length) * 100));
      }

      skipped = skippedRows.length;
      setImportResult({ imported, skipped, failed });
      setStep(3);
    } finally {
      setImporting(false);
    }
  };

  const statusGroups = {
    skip_location: skippedRows.filter(r => r.status === 'skip_location'),
    skip_product: skippedRows.filter(r => r.status === 'skip_product'),
    skip_quantity: skippedRows.filter(r => r.status === 'skip_quantity'),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg">
              <PackageCheck className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import Stock Quantities</h2>
              <p className="text-xs text-gray-400 mt-0.5">Import Odoo stock quant export — creates inventory lots per location</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 pt-4 pb-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step >= s ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {step > s ? <CheckCircle className="w-3.5 h-3.5" /> : s}
              </div>
              <span className={`text-xs font-medium transition-colors ${step >= s ? 'text-gray-700' : 'text-gray-400'}`}>
                {s === 1 ? 'Upload' : s === 2 ? 'Review' : 'Complete'}
              </span>
              {s < 3 && <ChevronRight className="w-3 h-3 text-gray-300 mx-1" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">

          {step === 1 && (
            <div className="space-y-4 pt-2">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${dragging ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'}`}
              >
                <div className="p-3 bg-teal-50 rounded-full">
                  <Upload className="w-7 h-7 text-teal-500" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-700">Drop your CSV file here</p>
                  <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </div>

              {parseError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{parseError}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Expected CSV format (Odoo stock quants export)</p>
                  <p className="text-blue-700">Required columns: <span className="font-mono text-xs bg-blue-100 px-1 rounded">Location/Barcode</span>, <span className="font-mono text-xs bg-blue-100 px-1 rounded">Product/Barcode</span>, <span className="font-mono text-xs bg-blue-100 px-1 rounded">Inventoried Quantity</span></p>
                  <p className="text-blue-600 mt-1.5 text-xs">Each row creates one inventory lot. Location and product barcodes must match existing records. Rows with negative or zero quantities are skipped.</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && resolution && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-teal-700">{validRows.length}</p>
                  <p className="text-xs text-teal-600 mt-0.5 font-medium">Ready to Import</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{skippedRows.length}</p>
                  <p className="text-xs text-amber-600 mt-0.5 font-medium">Will be Skipped</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-700">{parsedRows.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">Total Rows</p>
                </div>
              </div>

              {(resolution.missingLocations.length > 0 || resolution.missingProducts.length > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Unrecognized records — these rows will be skipped
                  </p>
                  {resolution.missingLocations.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-amber-700 mb-1.5">{resolution.missingLocations.length} location barcode{resolution.missingLocations.length !== 1 ? 's' : ''} not found:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {resolution.missingLocations.map(l => (
                          <span key={l} className="font-mono text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">{l}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {resolution.missingProducts.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-amber-700 mb-1.5">{resolution.missingProducts.length} product SKU{resolution.missingProducts.length !== 1 ? 's' : ''} not found:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {resolution.missingProducts.map(s => (
                          <span key={s} className="font-mono text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">File: <span className="font-medium text-gray-600">{fileName}</span></p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-teal-600 font-medium"><span className="w-2 h-2 rounded-full bg-teal-400 inline-block" /> Valid</span>
                  <span className="flex items-center gap-1 text-amber-600 font-medium"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Skipped</span>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-12">Row</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Location Barcode</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Product SKU</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedRows.map(row => (
                        <tr key={row.rowIndex} className={row.status === 'valid' ? 'bg-white' : 'bg-amber-50/60'}>
                          <td className="px-4 py-2 text-xs text-gray-400">{row.rowIndex}</td>
                          <td className="px-4 py-2 font-mono text-xs text-gray-700">{row.locationBarcode || <span className="text-gray-300 italic">—</span>}</td>
                          <td className="px-4 py-2 font-mono text-xs text-gray-700">{row.productSku || <span className="text-gray-300 italic">—</span>}</td>
                          <td className="px-4 py-2 text-right text-sm font-medium text-gray-800">{row.quantity}</td>
                          <td className="px-4 py-2">
                            {row.status === 'valid'
                              ? <Badge variant="emerald">Ready</Badge>
                              : <span className="text-xs text-amber-700">{row.skipReason}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {validRows.length === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">No valid rows to import. Please check that location barcodes and product SKUs match existing records, and that quantities are positive.</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && importResult && (
            <div className="flex flex-col items-center justify-center py-12 gap-5">
              <div className="p-4 bg-teal-50 rounded-full">
                <CheckCircle className="w-12 h-12 text-teal-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-2xl font-bold text-gray-900">{importResult.imported} lots imported</p>
                <p className="text-sm text-gray-500">Inventory quantities have been updated with location data from the quants file.</p>
              </div>
              <div className="flex gap-4 text-sm">
                {importResult.skipped > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <AlertTriangle className="w-4 h-4" /> {importResult.skipped} rows skipped
                  </span>
                )}
                {importResult.failed > 0 && (
                  <span className="flex items-center gap-1.5 text-red-600">
                    <X className="w-4 h-4" /> {importResult.failed} rows failed
                  </span>
                )}
              </div>
              {(statusGroups.skip_location.length > 0 || statusGroups.skip_product.length > 0) && (
                <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm space-y-2">
                  <p className="font-medium text-gray-700 text-xs uppercase tracking-wide">Skipped rows summary</p>
                  {statusGroups.skip_location.length > 0 && (
                    <p className="text-gray-600"><span className="font-semibold text-amber-700">{statusGroups.skip_location.length}</span> unknown locations — create them in Warehouse Locations first</p>
                  )}
                  {statusGroups.skip_product.length > 0 && (
                    <p className="text-gray-600"><span className="font-semibold text-amber-700">{statusGroups.skip_product.length}</span> unknown product SKUs — add them to the Products catalog first</p>
                  )}
                  {statusGroups.skip_quantity.length > 0 && (
                    <p className="text-gray-600"><span className="font-semibold text-amber-700">{statusGroups.skip_quantity.length}</span> rows with zero or negative quantities</p>
                  )}
                </div>
              )}
              <Button onClick={() => { onImported(); onClose(); }}>Done</Button>
            </div>
          )}
        </div>

        {step === 2 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4 bg-gray-50 rounded-b-2xl">
            <div className="text-sm text-gray-500">
              {importing
                ? <span className="flex items-center gap-2 text-teal-700 font-medium"><Loader2 className="w-4 h-4 animate-spin" /> Importing... {progress}%</span>
                : <span>Ready to import <span className="font-semibold text-gray-800">{validRows.length}</span> inventory lots</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep(1); setParsedRows([]); setFileName(''); }} disabled={importing}>Back</Button>
              <Button
                onClick={doImport}
                disabled={importing || validRows.length === 0}
              >
                {importing
                  ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Importing...</span>
                  : `Import ${validRows.length} Lots`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
