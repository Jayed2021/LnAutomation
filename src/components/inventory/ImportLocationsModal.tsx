import { useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Upload, AlertTriangle, CheckCircle, ChevronRight, FileText, Warehouse } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface ImportLocationsModalProps {
  onClose: () => void;
  onImported: () => void;
  warehouses: { id: string; name: string }[];
}

interface ParsedRow {
  rowIndex: number;
  locationName: string;
  locationType: string;
  barcode: string;
  warehouseName: string;
  active: boolean;
  valid: boolean;
  errors: string[];
  resolvedWarehouseId?: string;
}

const VALID_TYPES = ['storage', 'receiving', 'return_hold', 'damaged'];
const ODOO_PREFIX_RE = /^[A-Z0-9]+\/[A-Z0-9-]+\//i;

function detectOdooFormat(headers: string[]): boolean {
  return headers.some(h => h.toLowerCase().includes('full location name'));
}

function stripOdooPrefix(value: string): string {
  return value.replace(ODOO_PREFIX_RE, '').trim();
}

function parseBoolean(val: string): boolean {
  if (!val) return true;
  return !['false', '0', 'no', 'inactive', 'disabled'].includes(val.toLowerCase().trim());
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
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
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

export default function ImportLocationsModal({ onClose, onImported, warehouses }: ImportLocationsModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isOdoo, setIsOdoo] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fallbackWarehouseId, setFallbackWarehouseId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const warehouseNameMap = Object.fromEntries(
    warehouses.map(w => [w.name.toLowerCase(), w.id])
  );

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCsv(text);
      const odoo = detectOdooFormat(headers);
      setIsOdoo(odoo);

      const hLower = headers.map(h => h.toLowerCase().trim());

      const colIdx = (candidates: string[]): number => {
        for (const c of candidates) {
          const i = hLower.indexOf(c);
          if (i !== -1) return i;
        }
        return -1;
      };

      const nameIdx = odoo
        ? colIdx(['full location name', 'location name', 'name'])
        : colIdx(['location name', 'name']);
      const typeIdx = colIdx(['location type', 'type']);
      const barcodeIdx = colIdx(['barcode']);
      const warehouseIdx = odoo
        ? colIdx(['warehouse', 'warehouse name'])
        : colIdx(['warehouse', 'warehouse name']);
      const activeIdx = colIdx(['active', 'is_active', 'status']);

      const seenBarcodes = new Set<string>();
      const parsed: ParsedRow[] = rows
        .filter(r => r.some(cell => cell.trim()))
        .map((r, idx) => {
          const get = (i: number) => (i !== -1 && i < r.length ? r[i].trim() : '');

          let rawName = get(nameIdx);
          if (odoo && rawName) rawName = stripOdooPrefix(rawName);

          const locationName = rawName;
          const rawType = get(typeIdx).toLowerCase().replace(/\s+/g, '_');
          const locationType = VALID_TYPES.includes(rawType) ? rawType : 'storage';
          const barcode = get(barcodeIdx);
          const warehouseName = get(warehouseIdx);
          const active = parseBoolean(get(activeIdx));

          const errors: string[] = [];
          if (!locationName) errors.push('Missing Location Name');
          if (!barcode) errors.push('Missing Barcode');
          if (barcode && seenBarcodes.has(barcode)) errors.push('Duplicate barcode in file');
          if (barcode) seenBarcodes.add(barcode);

          const resolvedWarehouseId = warehouseName
            ? warehouseNameMap[warehouseName.toLowerCase()]
            : undefined;

          if (warehouseName && !resolvedWarehouseId) {
            errors.push(`Unknown warehouse "${warehouseName}"`);
          }

          return {
            rowIndex: idx + 2,
            locationName,
            locationType,
            barcode,
            warehouseName,
            active,
            valid: errors.length === 0,
            errors,
            resolvedWarehouseId,
          };
        });

      setParsedRows(parsed);
      setStep(2);
    };
    reader.readAsText(file);
  }, [warehouseNameMap]);

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

  const validRows = parsedRows.filter(r => {
    if (!r.valid) return false;
    if (!r.resolvedWarehouseId && !fallbackWarehouseId) return false;
    return true;
  });

  const unknownWarehouseRows = parsedRows.filter(r => r.valid && r.errors.length === 0 && !r.resolvedWarehouseId);
  const allValidHaveWarehouse = unknownWarehouseRows.length === 0 || !!fallbackWarehouseId;

  const warehouseSummary = validRows.reduce<Record<string, number>>((acc, row) => {
    const whId = row.resolvedWarehouseId || fallbackWarehouseId;
    const wh = warehouses.find(w => w.id === whId);
    const label = wh?.name || whId;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const doImport = async () => {
    setImporting(true);
    let imported = 0;
    let skipped = 0;
    try {
      const toInsert = validRows.map(row => ({
        warehouse_id: row.resolvedWarehouseId || fallbackWarehouseId,
        code: row.barcode.toUpperCase(),
        name: row.locationName,
        location_type: row.locationType,
        barcode: row.barcode,
        is_active: row.active,
      }));

      const CHUNK = 50;
      for (let i = 0; i < toInsert.length; i += CHUNK) {
        const chunk = toInsert.slice(i, i + CHUNK);
        const { error, data } = await supabase
          .from('warehouse_locations')
          .upsert(chunk, { onConflict: 'barcode', ignoreDuplicates: false })
          .select('id');
        if (error) {
          console.error('Import chunk error:', error);
          skipped += chunk.length;
        } else {
          imported += (data?.length || 0);
        }
      }
      setImportResult({ imported, skipped });
      setStep(3);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Import Locations</h2>
            <p className="text-xs text-gray-400 mt-0.5">Upload the exported CSV file or a Google Sheets export in the same format</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 pt-4 pb-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {s}
              </div>
              <span className={`text-xs font-medium transition-colors ${step >= s ? 'text-gray-700' : 'text-gray-400'}`}>
                {s === 1 ? 'Upload' : s === 2 ? 'Preview' : 'Confirm'}
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
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
              >
                <div className="p-3 bg-blue-50 rounded-full">
                  <Upload className="w-7 h-7 text-blue-500" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-700">Drop your CSV file here</p>
                  <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Use the Export Locations file as your template</p>
                  <p className="text-amber-700">Expected columns: <span className="font-mono text-xs bg-amber-100 px-1 rounded">Location Name</span>, <span className="font-mono text-xs bg-amber-100 px-1 rounded">Location Type</span>, <span className="font-mono text-xs bg-amber-100 px-1 rounded">Barcode</span>, <span className="font-mono text-xs bg-amber-100 px-1 rounded">Warehouse</span>, <span className="font-mono text-xs bg-amber-100 px-1 rounded">Active</span>. Odoo exports are also supported.</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 pt-2">
              {isOdoo && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2 items-center">
                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <p className="text-sm text-blue-800">Odoo format detected — the location path prefix (e.g. <span className="font-mono text-xs">JSWH/JS-STOCK/</span>) has been stripped automatically.</p>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle className="w-4 h-4" /> {parsedRows.filter(r => r.valid).length} valid
                </span>
                <span className="flex items-center gap-1.5 text-red-600 font-medium">
                  <AlertTriangle className="w-4 h-4" /> {parsedRows.filter(r => !r.valid).length} skipped
                </span>
                <span className="text-gray-400">from file: <span className="font-medium text-gray-600">{fileName}</span></span>
              </div>

              {unknownWarehouseRows.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <Warehouse className="w-4 h-4" /> {unknownWarehouseRows.length} rows have an unrecognized warehouse name
                  </p>
                  <p className="text-xs text-amber-700 mb-3">Assign a fallback warehouse to import them, or leave blank to skip.</p>
                  <select
                    className="px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white w-full max-w-xs"
                    value={fallbackWarehouseId}
                    onChange={e => setFallbackWarehouseId(e.target.value)}
                  >
                    <option value="">— Skip unrecognized warehouse rows —</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              )}

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Location Name</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedRows.map(row => (
                      <tr key={row.rowIndex} className={row.valid ? 'bg-white' : 'bg-red-50'}>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{row.rowIndex}</td>
                        <td className="px-4 py-2.5 text-gray-800">{row.locationName || <span className="text-gray-300 italic">—</span>}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-gray-600">{row.locationType.replace('_', ' ')}</span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{row.barcode || <span className="text-gray-300 italic">—</span>}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">
                          {row.resolvedWarehouseId
                            ? warehouses.find(w => w.id === row.resolvedWarehouseId)?.name || row.warehouseName
                            : row.warehouseName
                              ? <span className="text-amber-600">{row.warehouseName}</span>
                              : <span className="text-gray-300 italic">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {row.valid
                            ? <Badge variant="emerald">Valid</Badge>
                            : <span className="flex flex-col gap-0.5">{row.errors.map((e, i) => <span key={i} className="text-xs text-red-600">{e}</span>)}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && importResult && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="p-4 bg-emerald-50 rounded-full">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{importResult.imported} locations imported</p>
                {importResult.skipped > 0 && <p className="text-sm text-gray-500 mt-1">{importResult.skipped} rows could not be saved</p>}
              </div>
              <Button onClick={() => { onImported(); onClose(); }}>Done</Button>
            </div>
          )}
        </div>

        {step === 2 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4 bg-gray-50 rounded-b-2xl">
            <div className="text-sm text-gray-500">
              Ready to import: <span className="font-semibold text-gray-800">{validRows.length}</span> locations
              {Object.entries(warehouseSummary).length > 0 && (
                <span className="ml-2 text-xs text-gray-400">
                  ({Object.entries(warehouseSummary).map(([name, count]) => `${count} → ${name}`).join(', ')})
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button
                onClick={doImport}
                disabled={importing || validRows.length === 0 || !allValidHaveWarehouse}
              >
                {importing ? 'Importing...' : `Import ${validRows.length} Locations`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
