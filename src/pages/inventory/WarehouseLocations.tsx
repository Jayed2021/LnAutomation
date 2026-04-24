import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { getAppSetting } from '../../lib/appSettings';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import ImportLocationsModal from '../../components/inventory/ImportLocationsModal';
import ImportStockQuantsModal from '../../components/inventory/ImportStockQuantsModal';
import BarcodeLabel from '../../components/inventory/BarcodeLabel';
import { printBarcodeLabels, downloadSingleBarcode } from '../../components/inventory/barcodePrint';
import BulkLocationTransferModal from '../../components/inventory/BulkLocationTransferModal';
import ConsolidationPanel from '../../components/inventory/ConsolidationPanel';
import {
  Plus, Warehouse, MapPin, X, Download, Upload, Search,
  ScanLine, MoreHorizontal, Pencil, Trash2, ToggleLeft, ToggleRight,
  Printer, CheckSquare, Square, AlertTriangle, PackageCheck,
  ArrowRight, Layers, ChevronDown, ChevronRight, Loader2
} from 'lucide-react';

interface WarehouseRow {
  id: string;
  name: string;
  code: string;
  address: string | null;
  is_active: boolean;
  locations: LocationRow[];
}

interface LocationRow {
  id: string;
  code: string;
  name: string;
  location_type: string;
  barcode: string | null;
  is_active: boolean;
  capacity: number | null;
  sku_count: number;
  unit_count: number;
  slots_used: number;
}

function CapacityCell({ capacity, slotsUsed }: { capacity: number | null; slotsUsed: number }) {
  if (capacity === null) {
    return <span className="text-xs text-gray-300 italic">—</span>;
  }
  const pct = Math.min(100, (slotsUsed / capacity) * 100);
  const remaining = Math.max(0, capacity - slotsUsed);
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500';
  const textColor = pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-gray-700';
  return (
    <div className="flex flex-col items-end gap-1 min-w-[80px]">
      <span className={`text-xs font-medium ${textColor}`}>
        {Math.round(slotsUsed)}/{capacity}
        <span className="text-gray-400 font-normal ml-1">({Math.round(remaining)} left)</span>
      </span>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const LOCATION_TYPES = ['storage', 'receiving', 'return_hold', 'damaged'];
const typeVariant: Record<string, string> = {
  storage: 'blue',
  receiving: 'emerald',
  return_hold: 'amber',
  damaged: 'red'
};

function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

interface RowMenuProps {
  location: LocationRow;
  onEdit: () => void;
  onToggle: () => void;
  onDownloadBarcode: () => void;
  onDelete: () => void;
}

function RowMenu({ location, onEdit, onToggle, onDownloadBarcode, onDelete }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => { setOpen(false); onEdit(); }}
          >
            <Pencil className="w-3.5 h-3.5 text-gray-400" /> Edit
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => { setOpen(false); onToggle(); }}
          >
            {location.is_active
              ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500" />
              : <ToggleLeft className="w-3.5 h-3.5 text-gray-400" />}
            {location.is_active ? 'Disable' : 'Enable'}
          </button>
          {location.barcode && (
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => { setOpen(false); onDownloadBarcode(); }}
            >
              <Download className="w-3.5 h-3.5 text-gray-400" /> Download Barcode
            </button>
          )}
          <div className="border-t border-gray-100 my-1" />
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => { setOpen(false); onDelete(); }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

interface EditModalProps {
  location: LocationRow;
  onClose: () => void;
  onSaved: () => void;
}

function EditLocationModal({ location, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    name: location.name,
    location_type: location.location_type,
    barcode: location.barcode ?? '',
    capacity: location.capacity !== null ? String(location.capacity) : '',
  });
  const [saving, setSaving] = useState(false);
  const barcodeChanged = form.barcode !== (location.barcode ?? '');

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const capacityVal = form.capacity.trim() === '' ? null : parseInt(form.capacity, 10);
      const { error } = await supabase.from('warehouse_locations').update({
        name: form.name,
        location_type: form.location_type,
        barcode: form.barcode || null,
        code: form.barcode ? form.barcode.toUpperCase() : location.code,
        capacity: capacityVal,
      }).eq('id', location.id);
      if (error) throw error;
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Edit Location</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700">Location Name *</label>
            <input
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Type</label>
            <select
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.location_type}
              onChange={e => setForm(f => ({ ...f, location_type: e.target.value }))}
            >
              {LOCATION_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Capacity (slots)</label>
            <input
              type="number"
              min="1"
              step="1"
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
              placeholder="e.g. 100"
            />
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 leading-relaxed">
                <span className="font-medium text-gray-700">What is a slot?</span> A slot is the basic unit of space in this location.
                By default, 1 unit of any product takes 1 slot — so a capacity of 100 means 100 units.
                If a product is physically larger, you can set its "Slots per unit" on the product page
                (e.g. a bulky item = 2 slots, so only 50 fit). Leave blank for no limit.
              </p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Barcode</label>
            <input
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.barcode}
              onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
              placeholder="e.g. LN_B-1"
            />
            {barcodeChanged && (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Changing the barcode will not update previously printed labels
              </p>
            )}
          </div>
          {form.barcode && (
            <div className="pt-2 flex justify-center">
              <BarcodeLabel value={form.barcode} width={240} height={70} />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </div>
    </div>
  );
}

interface DeleteDialogProps {
  location: LocationRow;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteDialog({ location, onClose, onDeleted }: DeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const hasStock = location.unit_count > 0;

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('warehouse_locations').delete().eq('id', location.id);
      if (error) throw error;
      onDeleted();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${hasStock ? 'bg-amber-50' : 'bg-red-50'}`}>
              {hasStock
                ? <AlertTriangle className="w-5 h-5 text-amber-500" />
                : <Trash2 className="w-5 h-5 text-red-500" />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {hasStock ? 'Cannot Delete Location' : `Delete "${location.name}"?`}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {hasStock
                  ? `This location holds ${location.unit_count} units across ${location.sku_count} SKU(s). Move all stock out before deleting.`
                  : 'This action cannot be undone. The location will be permanently removed.'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5">
          <Button variant="outline" onClick={onClose}>
            {hasStock ? 'OK' : 'Cancel'}
          </Button>
          {!hasStock && (
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface BulkDeleteDialogProps {
  selected: LocationRow[];
  onClose: () => void;
  onDeleted: () => void;
}

function BulkDeleteDialog({ selected, onClose, onDeleted }: BulkDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const safe = selected.filter(l => l.unit_count === 0);
  const blocked = selected.filter(l => l.unit_count > 0);

  const confirmDelete = async () => {
    if (safe.length === 0) { onClose(); return; }
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('warehouse_locations')
        .delete()
        .in('id', safe.map(l => l.id));
      if (error) throw error;
      onDeleted();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-red-50">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm">Delete Locations</h3>
              {safe.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {safe.length} location{safe.length !== 1 ? 's' : ''} will be permanently deleted.
                </p>
              )}
              {blocked.length > 0 && (
                <div className="mt-2 p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs font-medium text-amber-700 flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" />
                    {blocked.length} location{blocked.length !== 1 ? 's' : ''} skipped (have stock):
                  </p>
                  <ul className="text-xs text-amber-600 space-y-0.5">
                    {blocked.map(l => <li key={l.id}>&bull; {l.name} ({l.unit_count} units)</li>)}
                  </ul>
                </div>
              )}
              {safe.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">All selected locations hold stock and cannot be deleted.</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {safe.length > 0 && (
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : `Delete ${safe.length}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Location accordion detail ─────────────────────────────────────────────────

interface LotDetail {
  sku: string;
  product_name: string;
  lot_number: string;
  units: number;
  reserved: number;
}

function LocationStockDetail({ locationId }: { locationId: string }) {
  const [rows, setRows] = useState<LotDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('inventory_lots')
      .select('lot_number, remaining_quantity, reserved_quantity, products(sku, name)')
      .eq('location_id', locationId)
      .gt('remaining_quantity', 0)
      .order('received_date', { ascending: true })
      .then(({ data }) => {
        setRows(
          (data || []).map((l: any) => ({
            sku: l.products?.sku || '?',
            product_name: l.products?.name || 'Unknown',
            lot_number: l.lot_number,
            units: l.remaining_quantity,
            reserved: l.reserved_quantity ?? 0,
          }))
        );
        setLoading(false);
      });
  }, [locationId]);

  if (loading) {
    return (
      <tr>
        <td colSpan={9} className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading stock...
          </div>
        </td>
      </tr>
    );
  }

  if (rows.length === 0) {
    return (
      <tr>
        <td colSpan={9} className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-xs text-gray-400 italic">No stock in this location</p>
        </td>
      </tr>
    );
  }

  // Group by SKU for a clean display
  const bySkuMap: Record<string, { sku: string; product_name: string; lots: LotDetail[] }> = {};
  for (const row of rows) {
    if (!bySkuMap[row.sku]) bySkuMap[row.sku] = { sku: row.sku, product_name: row.product_name, lots: [] };
    bySkuMap[row.sku].lots.push(row);
  }
  const bySku = Object.values(bySkuMap);

  return (
    <tr>
      <td colSpan={9} className="bg-gray-50 border-b border-gray-200 p-0">
        <div className="px-6 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 uppercase">
                <th className="text-left py-1 pr-4 font-medium w-28">SKU</th>
                <th className="text-left py-1 pr-4 font-medium">Product</th>
                <th className="text-left py-1 pr-4 font-medium">Lot</th>
                <th className="text-right py-1 pr-4 font-medium w-16">Units</th>
                <th className="text-right py-1 font-medium w-16">Reserved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bySku.map(group =>
                group.lots.map((lot, li) => (
                  <tr key={`${group.sku}-${lot.lot_number}`} className="hover:bg-gray-100 transition-colors">
                    <td className="py-1.5 pr-4 font-mono font-semibold text-gray-800">
                      {li === 0 ? group.sku : ''}
                    </td>
                    <td className="py-1.5 pr-4 text-gray-600 truncate max-w-xs">
                      {li === 0 ? group.product_name : ''}
                    </td>
                    <td className="py-1.5 pr-4 font-mono text-gray-500">{lot.lot_number}</td>
                    <td className="py-1.5 pr-4 text-right font-semibold text-gray-900">{lot.units}</td>
                    <td className="py-1.5 text-right">
                      {lot.reserved > 0
                        ? <span className="text-amber-600 font-semibold">{lot.reserved}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={3} className="pt-2 text-gray-400 font-medium">Total</td>
                <td className="pt-2 text-right font-bold text-gray-900 pr-4">
                  {rows.reduce((s, r) => s + r.units, 0)}
                </td>
                <td className="pt-2 text-right font-bold text-amber-600">
                  {rows.reduce((s, r) => s + r.reserved, 0) > 0
                    ? rows.reduce((s, r) => s + r.reserved, 0)
                    : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </td>
    </tr>
  );
}

function RecentBulkTransfers() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('bulk_location_transfers')
      .select(`
        id, lots_moved, units_moved, reserved_units, created_at,
        src:warehouse_locations!source_location_id(code),
        dst:warehouse_locations!dest_location_id(code)
      `)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => { setRows(data || []); setLoading(false); });
  }, []);

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>;
  if (rows.length === 0) return <p className="text-sm text-gray-400">No bulk transfers recorded yet.</p>;

  return (
    <div className="space-y-2">
      {rows.map((r: any) => (
        <div key={r.id} className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl text-sm">
          <span className="font-mono font-semibold text-gray-900">{(r.src as any)?.code}</span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="font-mono font-semibold text-gray-900">{(r.dst as any)?.code}</span>
          <span className="text-gray-500 ml-2">{r.units_moved} units · {r.lots_moved} lots</span>
          {r.reserved_units > 0 && <span className="text-amber-600 text-xs">{r.reserved_units} reserved migrated</span>}
          <span className="ml-auto text-xs text-gray-400">
            {new Date(r.created_at).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      ))}
    </div>
  );
}

type PageTab = 'locations' | 'consolidation' | 'bulk_transfer';

export default function WarehouseLocations() {
  const { lastRefreshed, setRefreshing } = useRefresh();
  const [activeTab, setActiveTab] = useState<PageTab>('locations');
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showImportQuants, setShowImportQuants] = useState(false);
  const [showBulkTransfer, setShowBulkTransfer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [whForm, setWhForm] = useState({ name: '', code: '', address: '' });
  const [locForm, setLocForm] = useState({ name: '', location_type: 'storage', barcode: '' });
  const [saving, setSaving] = useState(false);
  const [editLocation, setEditLocation] = useState<LocationRow | null>(null);
  const [deleteLocation, setDeleteLocation] = useState<LocationRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showImportTools, setShowImportTools] = useState(false);
  const [expandedLocIds, setExpandedLocIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedLocIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    getAppSetting<boolean>('show_location_import_tools').then(val => setShowImportTools(val === true));
  }, []);

  useEffect(() => { loadData(); }, [lastRefreshed]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: whs } = await supabase.from('warehouses').select('*').order('name');
      const { data: locs } = await supabase.from('warehouse_locations').select('*').order('name');
      const { data: lots } = await supabase
        .from('inventory_lots')
        .select('location_id, product_id, remaining_quantity, products(slots_per_unit)');

      const locStockMap: Record<string, { skus: Set<string>; units: number; slots: number }> = {};
      (lots || []).forEach((lot: any) => {
        if (!locStockMap[lot.location_id]) locStockMap[lot.location_id] = { skus: new Set(), units: 0, slots: 0 };
        if (lot.remaining_quantity > 0) {
          const spu = lot.products?.slots_per_unit ?? 1;
          locStockMap[lot.location_id].skus.add(lot.product_id);
          locStockMap[lot.location_id].units += lot.remaining_quantity;
          locStockMap[lot.location_id].slots += lot.remaining_quantity * spu;
        }
      });

      const locsByWh: Record<string, LocationRow[]> = {};
      (locs || []).forEach((l: any) => {
        if (!locsByWh[l.warehouse_id]) locsByWh[l.warehouse_id] = [];
        const stock = locStockMap[l.id] || { skus: new Set(), units: 0, slots: 0 };
        locsByWh[l.warehouse_id].push({
          id: l.id, code: l.code, name: l.name, location_type: l.location_type,
          barcode: l.barcode, is_active: l.is_active,
          capacity: l.capacity ?? null,
          sku_count: stock.skus.size, unit_count: stock.units,
          slots_used: Math.round(stock.slots * 100) / 100,
        });
      });

      setWarehouses((whs || []).map((w: any) => ({ ...w, locations: locsByWh[w.id] || [] })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const addWarehouse = async () => {
    if (!whForm.name || !whForm.code) return;
    setSaving(true);
    try {
      await supabase.from('warehouses').insert({ name: whForm.name, code: whForm.code.toUpperCase(), address: whForm.address || null });
      setShowAddWarehouse(false);
      setWhForm({ name: '', code: '', address: '' });
      loadData();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const addLocation = async (warehouseId: string) => {
    if (!locForm.name || !locForm.barcode) return;
    setSaving(true);
    try {
      await supabase.from('warehouse_locations').insert({
        warehouse_id: warehouseId, code: locForm.barcode.toUpperCase(),
        name: locForm.name, location_type: locForm.location_type, barcode: locForm.barcode
      });
      setShowAddLocation(null);
      setLocForm({ name: '', location_type: 'storage', barcode: '' });
      loadData();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const toggleLocation = async (locId: string, current: boolean) => {
    await supabase.from('warehouse_locations').update({ is_active: !current }).eq('id', locId);
    loadData();
  };

  const exportLocations = () => {
    const rows = [['Location Name', 'Location Type', 'Barcode', 'Warehouse', 'Active'].join(',')];
    warehouses.forEach(wh => {
      wh.locations.forEach(loc => {
        rows.push([escapeCsvCell(loc.name), escapeCsvCell(loc.location_type), escapeCsvCell(loc.barcode ?? ''), escapeCsvCell(wh.name), escapeCsvCell(loc.is_active ? 'TRUE' : 'FALSE')].join(','));
      });
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse-locations-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allLocations = warehouses.flatMap(wh => wh.locations);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectWarehouse = (whId: string, locs: LocationRow[]) => {
    const ids = locs.map(l => l.id);
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedLocations = allLocations.filter(l => selectedIds.has(l.id));

  const bulkToggle = async (active: boolean) => {
    await supabase.from('warehouse_locations').update({ is_active: active }).in('id', Array.from(selectedIds));
    clearSelection();
    loadData();
  };

  const handleBulkPrint = () => {
    const toPrint = selectedLocations.filter(l => l.barcode).map(l => ({ barcode: l.barcode!, name: l.name }));
    printBarcodeLabels(toPrint);
  };

  const q = searchQuery.toLowerCase().trim();
  const filteredWarehouses = warehouses.map(wh => ({
    ...wh,
    locations: q ? wh.locations.filter(l => l.name.toLowerCase().includes(q) || (l.barcode ?? '').toLowerCase().includes(q) || l.code.toLowerCase().includes(q)) : wh.locations
  })).filter(wh => q ? wh.locations.length > 0 : true);

  const warehouseList = warehouses.map(w => ({ id: w.id, name: w.name }));

  // Build flat location list for BulkTransfer modal
  const allLocationsFlat = warehouses.flatMap(wh =>
    wh.locations.map(l => ({
      id: l.id,
      code: l.code,
      name: l.name,
      unit_count: l.unit_count,
      sku_count: l.sku_count,
      last_audited_at: null as string | null,
    }))
  );

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Warehouse Locations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage warehouses and storage locations</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showImportTools && activeTab === 'locations' && (
            <>
              <Button variant="outline" onClick={exportLocations} className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Export Locations
              </Button>
              <Button variant="outline" onClick={() => setShowImport(true)} className="flex items-center gap-2">
                <Upload className="w-4 h-4" /> Import Locations
              </Button>
              <Button variant="outline" onClick={() => setShowImportQuants(true)} className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4" /> Import Stock Quants
              </Button>
            </>
          )}
          {activeTab === 'bulk_transfer' && (
            <Button onClick={() => setShowBulkTransfer(true)} className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4" /> Start Bulk Transfer
            </Button>
          )}
          {activeTab === 'locations' && (
            <Button onClick={() => setShowAddWarehouse(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Warehouse
            </Button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { key: 'locations', label: 'Locations', icon: Warehouse },
          { key: 'consolidation', label: 'Consolidation', icon: Layers },
          { key: 'bulk_transfer', label: 'Bulk Transfer', icon: ArrowRight },
        ] as { key: PageTab; label: string; icon: React.ElementType }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Consolidation tab */}
      {activeTab === 'consolidation' && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <Layers className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="font-semibold text-gray-900">Lot Consolidation</h2>
              <p className="text-xs text-gray-400 mt-0.5">Products stored across multiple locations that can be brought together</p>
            </div>
          </div>
          <ConsolidationPanel />
        </Card>
      )}

      {/* Bulk Transfer tab */}
      {activeTab === 'bulk_transfer' && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowRight className="w-5 h-5 text-blue-500" />
            <div>
              <h2 className="font-semibold text-gray-900">Bulk Location Transfer</h2>
              <p className="text-xs text-gray-400 mt-0.5">Move all inventory from one box to another — for warehouse renumbering and reorganisation</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-800 space-y-2">
            <p className="font-medium">How it works</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-blue-700">
              <li>All lots in the source box move to the destination box atomically</li>
              <li>Lots with the same lot number are automatically merged</li>
              <li>Active order reservations follow the lots — no order data is affected</li>
              <li>A full transfer log is recorded for traceability</li>
              <li>After transfer, print a new barcode label for the destination box</li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Recent bulk transfers</p>
            <RecentBulkTransfers />
          </div>
          <div className="mt-5">
            <Button onClick={() => setShowBulkTransfer(true)} className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4" /> Start Bulk Transfer
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'locations' && showAddWarehouse && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">New Warehouse</h3>
            <button onClick={() => setShowAddWarehouse(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700">Warehouse Name *</label>
              <input className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Main Warehouse" value={whForm.name} onChange={e => setWhForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Code *</label>
              <input className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="WH02" value={whForm.code} onChange={e => setWhForm(f => ({ ...f, code: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Address</label>
              <input className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Dhaka, Bangladesh" value={whForm.address} onChange={e => setWhForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowAddWarehouse(false)}>Cancel</Button>
            <Button onClick={addWarehouse} disabled={saving || !whForm.name || !whForm.code}>{saving ? 'Saving...' : 'Create Warehouse'}</Button>
          </div>
        </Card>
      )}

      {activeTab === 'locations' && <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Search by name or barcode..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>}

      {activeTab === 'locations' && (loading ? (
        <div className="py-16 text-center text-gray-400">Loading...</div>
      ) : warehouses.length === 0 ? (
        <div className="py-16 text-center text-gray-400">No warehouses configured</div>
      ) : (
        <div className="space-y-6">
          {filteredWarehouses.map(wh => {
            const whSelected = wh.locations.length > 0 && wh.locations.every(l => selectedIds.has(l.id));
            const whPartial = !whSelected && wh.locations.some(l => selectedIds.has(l.id));
            return (
              <Card key={wh.id}>
                <div className="flex items-center justify-between p-5 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Warehouse className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{wh.name}</h3>
                      <p className="text-xs text-gray-400">{wh.code}{wh.address ? ` · ${wh.address}` : ''}</p>
                    </div>
                    <Badge variant={wh.is_active ? 'emerald' : 'gray'}>{wh.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowAddLocation(showAddLocation === wh.id ? null : wh.id)} className="flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Location
                  </Button>
                </div>

                {showAddLocation === wh.id && (
                  <div className="p-4 bg-blue-50 border-b border-blue-100">
                    <div className="flex flex-wrap gap-3 items-end">
                      <div>
                        <label className="text-xs font-medium text-gray-700">Location Name *</label>
                        <input className="block mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm w-44" placeholder="Shelf A Row 1" value={locForm.name} onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">Type</label>
                        <select className="block mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" value={locForm.location_type} onChange={e => setLocForm(f => ({ ...f, location_type: e.target.value }))}>
                          {LOCATION_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">Barcode *</label>
                        <input className="block mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm w-36 font-mono" placeholder="LN_B-1" value={locForm.barcode} onChange={e => setLocForm(f => ({ ...f, barcode: e.target.value }))} />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => addLocation(wh.id)} disabled={saving || !locForm.name || !locForm.barcode} size="sm">Add</Button>
                        <Button variant="outline" size="sm" onClick={() => setShowAddLocation(null)}>Cancel</Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">The barcode will also be used as the location code.</p>
                  </div>
                )}

                {wh.locations.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No locations yet
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <button
                            onClick={() => toggleSelectWarehouse(wh.id, wh.locations)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            {whSelected
                              ? <CheckSquare className="w-4 h-4 text-blue-600" />
                              : whPartial
                                ? <CheckSquare className="w-4 h-4 text-blue-400 opacity-60" />
                                : <Square className="w-4 h-4" />}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SKUs</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Units</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Capacity</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {wh.locations.map(loc => {
                        const isExpanded = expandedLocIds.has(loc.id);
                        const hasStock = loc.unit_count > 0;
                        return (
                          <>
                            <tr
                              key={loc.id}
                              className={`border-b border-gray-200 transition-colors ${!loc.is_active ? 'opacity-50' : ''} ${selectedIds.has(loc.id) ? 'bg-blue-50' : isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                            >
                              <td className="px-4 py-3">
                                <button onClick={() => toggleSelect(loc.id)} className="text-gray-400 hover:text-blue-600 transition-colors">
                                  {selectedIds.has(loc.id)
                                    ? <CheckSquare className="w-4 h-4 text-blue-600" />
                                    : <Square className="w-4 h-4" />}
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => hasStock && toggleExpand(loc.id)}
                                  className={`flex items-center gap-2 text-left group ${hasStock ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                  {hasStock ? (
                                    isExpanded
                                      ? <ChevronDown className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                      : <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                                  ) : (
                                    <span className="w-3.5 h-3.5 flex-shrink-0" />
                                  )}
                                  <span className="text-sm font-medium text-gray-900">{loc.name}</span>
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                {loc.barcode ? (
                                  <span className="flex items-center gap-1.5 font-mono text-sm text-gray-700">
                                    <ScanLine className="w-3.5 h-3.5 text-gray-400" />
                                    {loc.barcode}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-300 italic">No barcode</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={typeVariant[loc.location_type] as any}>
                                  {loc.location_type.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-900">{loc.sku_count}</td>
                              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{loc.unit_count}</td>
                              <td className="px-4 py-3 text-right">
                                <CapacityCell capacity={loc.capacity} slotsUsed={loc.slots_used} />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge variant={loc.is_active ? 'emerald' : 'gray'}>{loc.is_active ? 'Active' : 'Disabled'}</Badge>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <RowMenu
                                  location={loc}
                                  onEdit={() => setEditLocation(loc)}
                                  onToggle={() => toggleLocation(loc.id, loc.is_active)}
                                  onDownloadBarcode={() => loc.barcode && downloadSingleBarcode(loc.barcode)}
                                  onDelete={() => setDeleteLocation(loc)}
                                />
                              </td>
                            </tr>
                            {isExpanded && <LocationStockDetail key={`detail-${loc.id}`} locationId={loc.id} />}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </Card>
            );
          })}
        </div>
      ))}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center gap-2 bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3">
            <span className="text-sm font-medium text-gray-200 mr-1">
              {selectedIds.size} selected
            </span>
            <div className="w-px h-5 bg-gray-600 mx-1" />
            <button
              onClick={handleBulkPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Barcodes
            </button>
            <button
              onClick={() => bulkToggle(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
            >
              <ToggleRight className="w-4 h-4 text-emerald-400" /> Activate
            </button>
            <button
              onClick={() => bulkToggle(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
            >
              <ToggleLeft className="w-4 h-4 text-gray-400" /> Deactivate
            </button>
            <button
              onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm font-medium text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <div className="w-px h-5 bg-gray-600 mx-1" />
            <button
              onClick={clearSelection}
              className="p-1.5 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {editLocation && (
        <EditLocationModal
          location={editLocation}
          onClose={() => setEditLocation(null)}
          onSaved={loadData}
        />
      )}

      {deleteLocation && (
        <DeleteDialog
          location={deleteLocation}
          onClose={() => setDeleteLocation(null)}
          onDeleted={loadData}
        />
      )}

      {showBulkDelete && (
        <BulkDeleteDialog
          selected={selectedLocations}
          onClose={() => setShowBulkDelete(false)}
          onDeleted={() => { clearSelection(); loadData(); }}
        />
      )}

      {showImport && (
        <ImportLocationsModal
          onClose={() => setShowImport(false)}
          onImported={loadData}
          warehouses={warehouseList}
        />
      )}

      {showImportQuants && (
        <ImportStockQuantsModal
          onClose={() => setShowImportQuants(false)}
          onImported={loadData}
        />
      )}

      {showBulkTransfer && (
        <BulkLocationTransferModal
          allLocations={allLocationsFlat}
          onClose={() => setShowBulkTransfer(false)}
          onDone={loadData}
        />
      )}
    </div>
  );
}
