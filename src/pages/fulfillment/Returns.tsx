import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PackageX, Search, Package, PackageCheck, PackageOpen,
  ClipboardList, RotateCcw, Wrench, ScanLine, AlertTriangle, MapPin, Trash2, X, Camera,
  ChevronDown, ChevronRight, Download, Square, CheckSquare, Loader2, Bell,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRefresh } from '../../contexts/RefreshContext';
import { useAuth } from '../../contexts/AuthContext';
import { getAppSetting } from '../../lib/appSettings';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ReceiveReturnModal } from '../../components/fulfillment/ReceiveReturnModal';
import { RestockModal } from '../../components/fulfillment/RestockModal';
import { QCReviewModal } from '../../components/fulfillment/QCReviewModal';
import { BarcodeScannerModal } from '../../components/fulfillment/BarcodeScannerModal';
import { ReceivePackagingModal } from '../../components/fulfillment/ReceivePackagingModal';
import { STATUS_CONFIG } from './orders/types';
import {
  exportRestockSheet,
  type RestockExportItem,
  type RestockExportLocationStock,
} from '../../utils/exportRestockSheet';

// ── Interfaces ───────────────────────────────────────────────────────────────

interface ReturnItem {
  id: string;
  sku: string;
  quantity: number;
  qc_status: string | null;
  receive_status: string;
  hold_location_id: string | null;
  restock_location_id: string | null;
  restocked_at: string | null;
  expected_barcode: string | null;
  product_id: string;
  order_item_id: string | null;
  order_item: { product_name: string; unit_price: number } | null;
  product: { name: string; sku: string } | null;
  hold_location: { code: string; name: string; location_type: string } | null;
  restock_location: { code: string; name: string } | null;
}

interface Return {
  id: string;
  return_number: string;
  return_reason: string;
  status: string;
  refund_amount: number | null;
  refund_status: string | null;
  created_at: string;
  updated_at: string;
  received_at: string | null;
  qc_completed_at: string | null;
  restocked_at: string | null;
  order_id: string;
  exchange_order_id: string | null;
  order: { order_number: string; woo_order_id: number | null; cs_status: string; order_date: string | null } | null;
  exchange_order: { order_number: string; woo_order_id: number | null } | null;
  customer: { full_name: string; phone_primary: string | null } | null;
  items: ReturnItem[];
}

interface WarehouseLocation {
  id: string;
  code: string;
  name: string;
  location_type: string;
}

interface SkuRecommendation {
  locationId: string;
  locationCode: string;
  currentStock: number;
}

interface DateGroup {
  date: string;
  label: string;
  returns: Return[];
  totalUnits: number;
}

// One row in the QC Passed view (one item + its parent return)
interface QcItemRow {
  item: ReturnItem;
  ret: Return;
}

// SKU sub-group within a date group (QC Passed view)
interface SkuGroup {
  sku: string;
  productName: string;
  rows: QcItemRow[];
  totalUnits: number;
}

type FilterStatus = 'expected' | 'received' | 'qc_passed' | 'qc_failed' | 'restocked' | 'damaged';

interface StatusCard {
  key: FilterStatus;
  label: string;
  icon: React.ReactNode;
  numberColor: string;
  activeRing: string;
  activeBg: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CARDS: StatusCard[] = [
  { key: 'expected',  label: 'Expected',  icon: <Package className="w-5 h-5" />,      numberColor: 'text-amber-600',   activeRing: 'ring-2 ring-amber-400',   activeBg: 'bg-amber-50 border-amber-300' },
  { key: 'received',  label: 'Received',  icon: <PackageOpen className="w-5 h-5" />,   numberColor: 'text-blue-600',    activeRing: 'ring-2 ring-blue-400',    activeBg: 'bg-blue-50 border-blue-300' },
  { key: 'qc_passed', label: 'QC Passed', icon: <PackageCheck className="w-5 h-5" />,  numberColor: 'text-green-600',   activeRing: 'ring-2 ring-green-400',   activeBg: 'bg-green-50 border-green-300' },
  { key: 'qc_failed', label: 'QC Failed', icon: <ClipboardList className="w-5 h-5" />, numberColor: 'text-red-600',     activeRing: 'ring-2 ring-red-400',     activeBg: 'bg-red-50 border-red-300' },
  { key: 'restocked', label: 'Restocked', icon: <RotateCcw className="w-5 h-5" />,     numberColor: 'text-emerald-600', activeRing: 'ring-2 ring-emerald-400', activeBg: 'bg-emerald-50 border-emerald-300' },
  { key: 'damaged',   label: 'Damaged',   icon: <Wrench className="w-5 h-5" />,        numberColor: 'text-gray-600',    activeRing: 'ring-2 ring-gray-400',    activeBg: 'bg-gray-50 border-gray-300' },
];

const RETURN_STATUS_LABELS: Record<string, string> = {
  expected: 'Expected', received: 'Received', qc_passed: 'QC Passed',
  qc_failed: 'QC Failed', restocked: 'Restocked', damaged: 'Damaged',
};

const ITEM_QC_BADGE: Record<string, { label: string; cls: string }> = {
  passed:  { label: 'QC Pass', cls: 'text-green-700 bg-green-50 border-green-200' },
  failed:  { label: 'QC Fail', cls: 'text-red-700 bg-red-50 border-red-200' },
  pending: { label: 'Pending', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
};

const ITEM_RECEIVE_BADGE: Record<string, { label: string; cls: string }> = {
  received: { label: 'Received', cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  lost:     { label: 'Lost',     cls: 'text-red-700 bg-red-50 border-red-200' },
  pending:  { label: 'Expected', cls: 'text-gray-600 bg-gray-50 border-gray-200' },
};

const STATUS_TS_CONFIG: Record<FilterStatus, { field: (r: Return) => string | null; label: string }> = {
  expected:   { field: r => r.created_at,                      label: 'Created At'   },
  received:   { field: r => r.received_at ?? r.updated_at,     label: 'Received At'  },
  qc_passed:  { field: r => r.qc_completed_at ?? r.updated_at, label: 'QC Passed At' },
  qc_failed:  { field: r => r.qc_completed_at ?? r.updated_at, label: 'QC Failed At' },
  restocked:  { field: r => r.restocked_at ?? r.updated_at,    label: 'Restocked At' },
  damaged:    { field: r => r.updated_at,                      label: 'Damaged At'   },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-BD', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' });
}

function buildDateGroups(returns: Return[], status: FilterStatus): DateGroup[] {
  const { field } = STATUS_TS_CONFIG[status];
  const map = new Map<string, Return[]>();
  for (const r of returns) {
    const ts = field(r);
    const date = ts ? ts.slice(0, 10) : '1970-01-01';
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(r);
  }
  const groups: DateGroup[] = [];
  for (const [date, rs] of map) {
    const totalUnits = rs.reduce((sum, r) => sum + (r.items?.reduce((s, i) => s + i.quantity, 0) ?? 0), 0);
    groups.push({ date, label: formatDateLabel(date), returns: rs, totalUnits });
  }
  return groups.sort((a, b) => b.date.localeCompare(a.date));
}

function buildSkuGroups(returns: Return[]): SkuGroup[] {
  const map = new Map<string, SkuGroup>();
  for (const ret of returns) {
    for (const item of (ret.items ?? []).filter(
      i => i.qc_status === 'passed' && i.receive_status === 'received' && !i.restocked_at
    )) {
      if (!map.has(item.sku)) {
        map.set(item.sku, {
          sku: item.sku,
          productName: item.order_item?.product_name || item.product?.name || item.sku,
          rows: [],
          totalUnits: 0,
        });
      }
      const g = map.get(item.sku)!;
      g.rows.push({ item, ret });
      g.totalUnits += item.quantity;
    }
  }
  return [...map.values()].sort((a, b) => a.sku.localeCompare(b.sku));
}

function getItemDisplay(r: Return): string {
  if (!r.items?.length) return '—';
  const names = r.items.map(i => i.order_item?.product_name || i.product?.name || i.sku);
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1} more`;
}

// ── Inline Location Cell ─────────────────────────────────────────────────────

interface LocationCellProps {
  item: ReturnItem;
  locations: WarehouseLocation[];
  skuRecommendations: Map<string, SkuRecommendation>;
  saving: boolean;
  onSave: (itemId: string, locationId: string) => void;
}

function LocationCell({ item, locations, skuRecommendations, saving, onSave }: LocationCellProps) {
  const rec = skuRecommendations.get(item.sku);
  const currentId = item.restock_location_id ?? rec?.locationId ?? '';
  const isUserSet = !!item.restock_location_id;

  return (
    <div className="flex items-center gap-1.5 min-w-[120px]">
      <MapPin className={`w-3 h-3 shrink-0 ${isUserSet ? 'text-emerald-500' : 'text-gray-300'}`} />
      <select
        value={currentId}
        disabled={saving}
        onChange={e => onSave(item.id, e.target.value)}
        onClick={e => e.stopPropagation()}
        className="flex-1 min-w-0 px-1.5 py-1 text-xs border rounded-md bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 border-gray-200"
      >
        <option value="">Select location...</option>
        {locations.map(loc => {
          const stock = rec?.locationId === loc.id ? rec.currentStock : undefined;
          return (
            <option key={loc.id} value={loc.id}>
              {loc.code}{stock !== undefined ? ` (${stock})` : ''}
            </option>
          );
        })}
      </select>
      {saving && <Loader2 className="w-3 h-3 animate-spin text-gray-400 shrink-0" />}
    </div>
  );
}

// ── QC Passed: SKU sub-group ─────────────────────────────────────────────────

interface QcSkuGroupProps {
  skuGroup: SkuGroup;
  allReturnIds: string[];
  selectedIds: Set<string>;
  rowRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  locations: WarehouseLocation[];
  skuRecommendations: Map<string, SkuRecommendation>;
  savingItemId: string | null;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[], checked: boolean) => void;
  onRestock: (ret: Return, itemId: string) => void;
  onSaveLocation: (itemId: string, locationId: string) => void;
}

function QcSkuGroup({
  skuGroup, allReturnIds, selectedIds, rowRefs,
  locations, skuRecommendations, savingItemId,
  onToggleSelect, onToggleSelectAll, onRestock, onSaveLocation,
}: QcSkuGroupProps) {
  const [open, setOpen] = useState(true);

  const allSelected = allReturnIds.every(id => selectedIds.has(id));
  const someSelected = allReturnIds.some(id => selectedIds.has(id)) && !allSelected;

  return (
    <div>
      {/* SKU sub-group header */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 cursor-pointer select-none hover:bg-gray-100 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-gray-400">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-800 text-sm truncate">{skuGroup.productName}</span>
          <span className="ml-2 font-mono text-xs text-gray-400">{skuGroup.sku}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-gray-500 hidden sm:inline">
            <span className="font-semibold text-gray-700">{skuGroup.rows.length}</span> return{skuGroup.rows.length !== 1 ? 's' : ''}
            {' · '}
            <span className="font-semibold text-gray-700">{skuGroup.totalUnits}</span> unit{skuGroup.totalUnits !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-gray-500 sm:hidden font-semibold text-gray-700">{skuGroup.totalUnits}u</span>
        </div>
      </div>

      {open && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="px-3 py-2 w-8">
                    <button
                      onClick={() => onToggleSelectAll(allReturnIds, !allSelected)}
                      className="flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      {allSelected
                        ? <CheckSquare className="w-4 h-4 text-emerald-600" />
                        : someSelected
                        ? <div className="w-4 h-4 border-2 border-emerald-500 rounded bg-emerald-100 flex items-center justify-center"><div className="w-2 h-0.5 bg-emerald-500 rounded" /></div>
                        : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Return</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Order</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Qty</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hold Loc</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Restock To</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">QC At</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {skuGroup.rows.map(({ item, ret }) => {
                  const isSelected = selectedIds.has(ret.id);
                  const actionTs = ret.qc_completed_at ?? ret.updated_at;
                  return (
                    <tr
                      key={item.id}
                      ref={el => {
                        if (el) rowRefs.current.set(item.id, el as HTMLElement);
                        else rowRefs.current.delete(item.id);
                      }}
                      className={`transition-colors ${isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => onToggleSelect(ret.id)} className="flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-colors">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs font-semibold text-gray-700">{ret.return_number}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-800 text-xs">
                          {ret.order?.woo_order_id ? `#${ret.order.woo_order_id}` : (ret.order?.order_number ?? '—')}
                        </div>
                        {ret.order?.cs_status ? (() => {
                          const cfg = STATUS_CONFIG[ret.order.cs_status];
                          return cfg ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border mt-0.5 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                              {cfg.label}
                            </span>
                          ) : null;
                        })() : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs text-gray-800 font-medium">{ret.customer?.full_name ?? '—'}</div>
                        {ret.customer?.phone_primary && (
                          <div className="text-xs text-gray-400">{ret.customer.phone_primary}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{item.quantity}</td>
                      <td className="px-3 py-2.5">
                        {item.hold_location
                          ? <span className="text-xs font-mono font-semibold text-blue-600">{item.hold_location.code}</span>
                          : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-2.5 min-w-[140px]" onClick={e => e.stopPropagation()}>
                        <LocationCell
                          item={item}
                          locations={locations}
                          skuRecommendations={skuRecommendations}
                          saving={savingItemId === item.id}
                          onSave={onSaveLocation}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {actionTs ? formatTime(actionTs) : '—'}
                      </td>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => onRestock(ret, item.id)}
                            className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1.5"
                          >
                            <RotateCcw className="w-3 h-3" />Restock
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {skuGroup.rows.map(({ item, ret }) => {
              const isSelected = selectedIds.has(ret.id);
              const actionTs = ret.qc_completed_at ?? ret.updated_at;
              return (
                <div
                  key={item.id}
                  ref={el => {
                    if (el) rowRefs.current.set(item.id, el as HTMLElement);
                    else rowRefs.current.delete(item.id);
                  }}
                  className={`p-4 transition-colors ${isSelected ? 'bg-emerald-50' : 'bg-white'}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <button
                      onClick={() => onToggleSelect(ret.id)}
                      className="mt-0.5 shrink-0 text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      {isSelected ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-gray-500">{ret.return_number}</span>
                        <span className="font-medium text-gray-800 text-sm">
                          {ret.order?.woo_order_id ? `#${ret.order.woo_order_id}` : (ret.order?.order_number ?? '—')}
                        </span>
                        {ret.order?.cs_status ? (() => {
                          const cfg = STATUS_CONFIG[ret.order.cs_status];
                          return cfg ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                              {cfg.label}
                            </span>
                          ) : null;
                        })() : null}
                      </div>
                      <div className="text-sm font-semibold text-gray-800 mt-0.5">{ret.customer?.full_name ?? '—'}</div>
                      {ret.customer?.phone_primary && (
                        <div className="text-xs text-gray-400">{ret.customer.phone_primary}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-gray-400">Qty</div>
                      <div className="text-xl font-bold text-gray-800">{item.quantity}</div>
                    </div>
                  </div>

                  {item.hold_location && (
                    <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      <span>At <span className="font-mono font-semibold text-blue-600">{item.hold_location.code}</span></span>
                      {actionTs && <span className="ml-auto text-gray-400">{formatTime(actionTs)}</span>}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Restock To</label>
                    <LocationCell
                      item={item}
                      locations={locations}
                      skuRecommendations={skuRecommendations}
                      saving={savingItemId === item.id}
                      onSave={onSaveLocation}
                    />
                  </div>

                  <Button
                    onClick={() => onRestock(ret, item.id)}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm py-2.5"
                  >
                    <RotateCcw className="w-4 h-4" />Restock This Item
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── QC Passed: date group accordion ─────────────────────────────────────────

interface QcDateGroupProps {
  group: DateGroup;
  defaultOpen: boolean;
  selectedIds: Set<string>;
  rowRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  locations: WarehouseLocation[];
  skuRecommendations: Map<string, SkuRecommendation>;
  savingItemId: string | null;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[], checked: boolean) => void;
  onRestock: (ret: Return, itemId: string) => void;
  onSaveLocation: (itemId: string, locationId: string) => void;
}

function QcDateGroup({
  group, defaultOpen, selectedIds, rowRefs,
  locations, skuRecommendations, savingItemId,
  onToggleSelect, onToggleSelectAll, onRestock, onSaveLocation,
}: QcDateGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const skuGroups = buildSkuGroups(group.returns);
  const allReturnIds = group.returns.map(r => r.id);
  const selectedInGroup = allReturnIds.filter(id => selectedIds.has(id));
  const pendingUnits = skuGroups.reduce((s, g) => s + g.totalUnits, 0);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-gray-400">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <span className="font-semibold text-gray-900 text-sm w-24 shrink-0">{group.label}</span>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-1 flex-wrap">
          <span><span className="font-semibold text-gray-800">{group.returns.length}</span> return{group.returns.length !== 1 ? 's' : ''}</span>
          {pendingUnits > 0 && <span><span className="font-semibold text-gray-800">{pendingUnits}</span> pending</span>}
          {skuGroups.length > 0 && <span><span className="font-semibold text-gray-800">{skuGroups.length}</span> SKU{skuGroups.length !== 1 ? 's' : ''}</span>}
          {selectedInGroup.length > 0 && <span className="text-emerald-600 font-semibold">{selectedInGroup.length} selected</span>}
        </div>
        <span className="text-xs text-gray-400 shrink-0">{group.date}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {skuGroups.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">All items in this group have been restocked.</p>
          ) : (
            skuGroups.map(skuGroup => (
              <QcSkuGroup
                key={skuGroup.sku}
                skuGroup={skuGroup}
                allReturnIds={allReturnIds}
                selectedIds={selectedIds}
                rowRefs={rowRefs}
                locations={locations}
                skuRecommendations={skuRecommendations}
                savingItemId={savingItemId}
                onToggleSelect={onToggleSelect}
                onToggleSelectAll={onToggleSelectAll}
                onRestock={onRestock}
                onSaveLocation={onSaveLocation}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Regular date group accordion (non-QC views) ──────────────────────────────

interface DateGroupAccordionProps {
  group: DateGroup;
  status: FilterStatus;
  defaultOpen: boolean;
  expandedRows: Set<string>;
  selectedIds: Set<string>;
  deleteConfirmId: string | null;
  deleting: boolean;
  isAdmin: boolean;
  rowRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  locations: WarehouseLocation[];
  skuRecommendations: Map<string, SkuRecommendation>;
  savingItemId: string | null;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[], checked: boolean) => void;
  onReceive: (r: Return) => void;
  onQc: (r: Return) => void;
  onWriteOff: (id: string) => void;
  onDeleteConfirm: (id: string | null) => void;
  onDeleteExecute: (id: string) => void;
  onSaveLocation: (itemId: string, locationId: string) => void;
}

function DateGroupAccordion({
  group, status, defaultOpen,
  expandedRows, selectedIds, deleteConfirmId, deleting, isAdmin, rowRefs,
  onToggleExpand, onToggleSelect, onToggleSelectAll,
  onReceive, onQc, onWriteOff, onDeleteConfirm, onDeleteExecute,
}: DateGroupAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { field: getActionTs, label: dateColLabel } = STATUS_TS_CONFIG[status];

  const groupReturnIds = group.returns.map(r => r.id);
  const selectedInGroup = groupReturnIds.filter(id => selectedIds.has(id));
  const allSelected = selectedInGroup.length === groupReturnIds.length;
  const someSelected = selectedInGroup.length > 0 && !allSelected;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-gray-400">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <span className="font-semibold text-gray-900 text-sm w-24 shrink-0">{group.label}</span>
        <div className="flex items-center gap-4 text-xs text-gray-500 flex-1">
          <span><span className="font-semibold text-gray-800">{group.returns.length}</span> return{group.returns.length !== 1 ? 's' : ''}</span>
          {group.totalUnits > 0 && <span><span className="font-semibold text-gray-800">{group.totalUnits}</span> unit{group.totalUnits !== 1 ? 's' : ''}</span>}
          {selectedInGroup.length > 0 && <span className="text-emerald-600 font-semibold">{selectedInGroup.length} selected</span>}
        </div>
        <span className="text-xs text-gray-400 shrink-0">{group.date}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {status === 'received' && (
                  <th className="px-3 py-2.5 w-8" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleSelectAll(groupReturnIds, !allSelected)}
                      className="flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      {allSelected
                        ? <CheckSquare className="w-4 h-4 text-emerald-600" />
                        : someSelected
                        ? <div className="w-4 h-4 border-2 border-emerald-500 rounded bg-emerald-100 flex items-center justify-center"><div className="w-2 h-0.5 bg-emerald-500 rounded" /></div>
                        : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                )}
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Return ID</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Order Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Items</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">{dateColLabel}</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {group.returns.map(r => {
                const itemCount = r.items?.length ?? 0;
                const isExpanded = expandedRows.has(r.id);
                const isSelected = selectedIds.has(r.id);
                const hasLostItems = r.items?.some(i => i.receive_status === 'lost');
                const isConfirmingDelete = deleteConfirmId === r.id;
                const actionTs = getActionTs(r);
                const colSpan = status === 'received' ? 9 : 8;

                return (
                  <>
                    <tr
                      key={r.id}
                      ref={el => {
                        if (el) rowRefs.current.set(r.id, el as HTMLElement);
                        else rowRefs.current.delete(r.id);
                      }}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-50 hover:bg-emerald-100'
                        : isExpanded ? 'bg-gray-50 hover:bg-gray-100'
                        : 'hover:bg-gray-50'
                      }`}
                      onClick={() => itemCount > 0 && onToggleExpand(r.id)}
                    >
                      {status === 'received' && (
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <button onClick={() => onToggleSelect(r.id)} className="flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-colors">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-gray-800">{r.return_number}</span>
                          {hasLostItems && <AlertTriangle className="w-3.5 h-3.5 text-red-400" title="Has lost items" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 text-sm">
                          {r.order?.woo_order_id ? `#${r.order.woo_order_id}` : (r.order?.order_number ?? '—')}
                        </div>
                        {r.exchange_order && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs text-gray-400">Exch:</span>
                            <span className="text-xs font-medium text-blue-600">
                              {r.exchange_order.woo_order_id ? `#${r.exchange_order.woo_order_id}` : r.exchange_order.order_number}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap hidden sm:table-cell">
                        {r.order?.order_date
                          ? new Date(r.order.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {r.order?.cs_status ? (() => {
                          const cfg = STATUS_CONFIG[r.order.cs_status];
                          return cfg ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                              {cfg.label}
                            </span>
                          ) : <span className="text-xs text-gray-500">{r.order.cs_status}</span>;
                        })() : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-800 font-medium text-sm">{r.customer?.full_name ?? '—'}</div>
                        {r.customer?.phone_primary && <div className="text-xs text-gray-400 mt-0.5">{r.customer.phone_primary}</div>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {itemCount > 0
                          ? <div><span className="text-gray-800 text-xs">{getItemDisplay(r)}</span>{itemCount > 1 && <span className="ml-1 text-xs text-gray-400">({itemCount})</span>}</div>
                          : <span className="text-gray-400 text-xs">No items</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap hidden md:table-cell">
                        {actionTs ? formatTime(actionTs) : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === 'expected' && (
                            <Button size="sm" onClick={() => onReceive(r)} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5">
                              <ScanLine className="w-3.5 h-3.5" /><span className="hidden sm:inline">Receive</span>
                            </Button>
                          )}
                          {r.status === 'received' && (
                            <Button size="sm" onClick={() => onQc(r)} className="gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs px-2.5 py-1.5">
                              <ClipboardList className="w-3.5 h-3.5" /><span className="hidden sm:inline">QC Review</span>
                            </Button>
                          )}
                          {r.status === 'qc_failed' && (
                            <Button size="sm" onClick={() => onWriteOff(r.id)} className="gap-1 bg-gray-700 hover:bg-gray-800 text-white text-xs px-3 py-1.5">
                              <Wrench className="w-3.5 h-3.5" /><span className="hidden sm:inline">Write Off</span>
                            </Button>
                          )}
                          {isAdmin && !isConfirmingDelete && (
                            <button onClick={() => onDeleteConfirm(r.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isAdmin && isConfirmingDelete && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-red-600 font-medium">Delete?</span>
                              <button onClick={() => onDeleteExecute(r.id)} disabled={deleting} className="px-2 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50">Yes</button>
                              <button onClick={() => onDeleteConfirm(null)} className="px-2 py-1 text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">No</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && r.items && r.items.length > 0 && (
                      <tr key={`${r.id}-expanded`} className="bg-gray-50 border-b border-gray-100">
                        <td colSpan={colSpan} className="px-6 py-3">
                          <div className="space-y-1.5">
                            {r.items.map(item => {
                              const receiveBadge = ITEM_RECEIVE_BADGE[item.receive_status] ?? ITEM_RECEIVE_BADGE.pending;
                              const qcBadge = item.qc_status ? (ITEM_QC_BADGE[item.qc_status] ?? null) : null;
                              return (
                                <div key={item.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
                                  <div className="min-w-0">
                                    <div className="font-medium text-gray-900 text-xs truncate">
                                      {item.order_item?.product_name || item.product?.name || item.sku}
                                    </div>
                                    <div className="text-xs text-gray-400">SKU: {item.sku} | Qty: {item.quantity}</div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {item.hold_location && (
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <MapPin className="w-3 h-3" />
                                        <span className={`font-medium ${
                                          item.hold_location.location_type === 'return_hold' ? 'text-blue-600' :
                                          item.hold_location.location_type === 'damaged' ? 'text-red-600' : 'text-emerald-600'
                                        }`}>{item.hold_location.code}</span>
                                      </div>
                                    )}
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${receiveBadge.cls}`}>
                                      {receiveBadge.label}
                                    </span>
                                    {qcBadge && (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${qcBadge.cls}`}>
                                        {qcBadge.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Returns() {
  const { lastRefreshed } = useRefresh();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeFilter, setActiveFilter] = useState<FilterStatus>('expected');
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [receivingReturn, setReceivingReturn] = useState<Return | null>(null);
  const [restockingState, setRestockingState] = useState<{ ret: Return; itemIds: string[] } | null>(null);
  const [qcReturn, setQcReturn] = useState<Return | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanNotFound, setScanNotFound] = useState<string | null>(null);
  const [showReceivePackaging, setShowReceivePackaging] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [storageLocations, setStorageLocations] = useState<WarehouseLocation[]>([]);
  const [skuRecommendations, setSkuRecommendations] = useState<Map<string, SkuRecommendation>>(new Map());
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifPending, setNotifPending] = useState<Return[]>([]);
  const [showNotifConfirm, setShowNotifConfirm] = useState(false);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('returns')
        .select(`
          id,
          return_number,
          return_reason,
          status,
          refund_amount,
          refund_status,
          created_at,
          updated_at,
          received_at,
          qc_completed_at,
          restocked_at,
          notification_sent,
          order_id,
          exchange_order_id,
          order:orders!order_id(order_number, woo_order_id, cs_status, order_date),
          exchange_order:orders!exchange_order_id(order_number, woo_order_id),
          customer:customers!customer_id(full_name, phone_primary),
          items:return_items(
            id,
            sku,
            quantity,
            qc_status,
            receive_status,
            hold_location_id,
            restock_location_id,
            restocked_at,
            expected_barcode,
            product_id,
            order_item_id,
            order_item:order_items!order_item_id(product_name, unit_price),
            product:products!product_id(name, sku),
            hold_location:warehouse_locations!hold_location_id(code, name, location_type),
            restock_location:warehouse_locations!restock_location_id(code, name)
          )
        `)
        .neq('return_reason', 'Refund')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns((data as unknown as Return[]) || []);
    } catch (err) {
      console.error('Error fetching returns:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeFilter !== 'qc_passed') return;
    (async () => {
      const { data: locs } = await supabase
        .from('warehouse_locations')
        .select('id, code, name, location_type')
        .eq('is_active', true)
        .eq('location_type', 'storage')
        .order('code');
      const locations: WarehouseLocation[] = locs ?? [];
      setStorageLocations(locations);

      const qcReturns = returns.filter(r => r.status === 'qc_passed');
      const skus = [...new Set(
        qcReturns.flatMap(r => (r.items ?? []).filter(i => i.qc_status === 'passed').map(i => i.sku))
      )];
      if (skus.length === 0) return;

      const { data: lots } = await supabase
        .from('inventory_lots')
        .select('barcode, location_id, received_quantity, remaining_quantity')
        .in('barcode', skus)
        .in('location_id', locations.map(l => l.id));

      const locMap = new Map(locations.map(l => [l.id, l]));
      const recMap = new Map<string, SkuRecommendation>();
      const perSku = new Map<string, Map<string, { remaining: number; received: number }>>();

      for (const lot of lots ?? []) {
        if (!lot.location_id) continue;
        if (!perSku.has(lot.barcode)) perSku.set(lot.barcode, new Map());
        const locData = perSku.get(lot.barcode)!;
        if (!locData.has(lot.location_id)) locData.set(lot.location_id, { remaining: 0, received: 0 });
        const d = locData.get(lot.location_id)!;
        d.remaining += lot.remaining_quantity ?? 0;
        d.received += lot.received_quantity ?? 0;
      }

      for (const [sku, locData] of perSku) {
        let bestLocId = '';
        let bestRemaining = -1;
        let bestReceived = -1;
        for (const [locId, d] of locData) {
          if (d.remaining > bestRemaining || (d.remaining === bestRemaining && d.received > bestReceived)) {
            bestRemaining = d.remaining;
            bestReceived = d.received;
            bestLocId = locId;
          }
        }
        const loc = locMap.get(bestLocId);
        if (loc) recMap.set(sku, { locationId: bestLocId, locationCode: loc.code, currentStock: bestRemaining });
      }

      setSkuRecommendations(recMap);
    })();
  }, [activeFilter, returns]);

  useEffect(() => { fetchReturns(); }, [lastRefreshed]);

  useEffect(() => {
    const sub = supabase
      .channel('returns_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'returns' }, fetchReturns)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [fetchReturns]);

  useEffect(() => { setSelectedIds(new Set()); }, [activeFilter]);

  useEffect(() => {
    getAppSetting<boolean>('notifications_return_restock_enabled').then(val => {
      setNotifEnabled(val !== false);
    });
  }, []);

  useEffect(() => {
    if (!notifEnabled) { setNotifPending([]); return; }
    const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    (async () => {
      const { data } = await supabase
        .from('returns')
        .select('id, return_number, restocked_at, notification_sent, items:return_items(sku, quantity)')
        .eq('status', 'restocked')
        .eq('notification_sent', false)
        .gte('restocked_at', cutoff)
        .order('restocked_at', { ascending: false });
      setNotifPending((data as unknown as Return[]) ?? []);
    })();
  }, [notifEnabled, returns]);

  const statusCounts = {
    expected:  returns.filter(r => r.status === 'expected').length,
    received:  returns.filter(r => r.status === 'received').length,
    qc_passed: returns.filter(r => r.status === 'qc_passed').length,
    qc_failed: returns.filter(r => r.status === 'qc_failed').length,
    restocked: returns.filter(r => r.status === 'restocked').length,
    damaged:   returns.filter(r => r.status === 'damaged').length,
  };

  const q = searchQuery.toLowerCase();
  const filteredReturns = returns.filter(r => {
    if (r.status !== activeFilter) return false;
    if (!q) return true;
    return (
      r.return_number.toLowerCase().includes(q) ||
      r.order?.order_number?.toLowerCase().includes(q) ||
      (r.order?.woo_order_id?.toString() ?? '').includes(q) ||
      r.exchange_order?.order_number?.toLowerCase().includes(q) ||
      (r.exchange_order?.woo_order_id?.toString() ?? '').includes(q) ||
      r.customer?.full_name?.toLowerCase().includes(q) ||
      r.return_reason?.toLowerCase().includes(q) ||
      (activeFilter === 'qc_passed' && r.items?.some(i =>
        i.sku.toLowerCase().includes(q) ||
        (i.order_item?.product_name ?? '').toLowerCase().includes(q) ||
        (i.product?.name ?? '').toLowerCase().includes(q)
      ))
    );
  });

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleSelectAll = (ids: string[], checked: boolean) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (checked) ids.forEach(id => n.add(id));
      else ids.forEach(id => n.delete(id));
      return n;
    });
  };

  const handleSaveLocation = async (itemId: string, locationId: string) => {
    setSavingItemId(itemId);
    try {
      await supabase.from('return_items').update({ restock_location_id: locationId || null }).eq('id', itemId);
      setReturns(prev => prev.map(r => ({
        ...r,
        items: (r.items ?? []).map(i => {
          if (i.id !== itemId) return i;
          const loc = storageLocations.find(l => l.id === locationId);
          return { ...i, restock_location_id: locationId || null, restock_location: loc ? { code: loc.code, name: loc.name } : null };
        }),
      })));
    } catch (err) {
      console.error('Failed to save restock location:', err);
    } finally {
      setSavingItemId(null);
    }
  };

  const handleWriteOff = async (returnId: string) => {
    await supabase.from('returns').update({ status: 'damaged' }).eq('id', returnId);
    fetchReturns();
  };

  const handleDeleteReturn = async (returnId: string) => {
    try {
      setDeleting(true);
      await supabase.from('return_items').delete().eq('return_id', returnId);
      await supabase.from('returns').delete().eq('id', returnId);
      setDeleteConfirmId(null);
      fetchReturns();
    } catch (err) {
      console.error('Error deleting return:', err);
    } finally {
      setDeleting(false);
    }
  };

  const matchReturn = (value: string): Return | undefined => {
    const t = value.trim();
    return returns.find(r =>
      r.order?.woo_order_id?.toString() === t ||
      r.order?.order_number?.toLowerCase() === t.toLowerCase() ||
      r.return_number.toLowerCase() === t.toLowerCase() ||
      r.exchange_order?.woo_order_id?.toString() === t ||
      r.exchange_order?.order_number?.toLowerCase() === t.toLowerCase()
    );
  };

  // Match a scanned product barcode/SKU to a pending QC-passed item
  const matchQcItemBySku = (value: string): { ret: Return; item: ReturnItem } | undefined => {
    const t = value.trim().toLowerCase();
    for (const ret of returns.filter(r => r.status === 'qc_passed')) {
      const item = (ret.items ?? []).find(i =>
        i.qc_status === 'passed' &&
        !i.restocked_at &&
        (i.sku.toLowerCase() === t ||
         (i.expected_barcode ?? '').toLowerCase() === t ||
         (i.product?.sku ?? '').toLowerCase() === t)
      );
      if (item) return { ret, item };
    }
    return undefined;
  };

  const scrollToItem = (id: string) => {
    setTimeout(() => {
      const el = rowRefs.current.get(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-blue-400', 'ring-inset');
        setTimeout(() => el.classList.remove('ring-2', 'ring-blue-400', 'ring-inset'), 2500);
      }
    }, 120);
  };

  const handleCameraScan = (barcode: string) => {
    setShowScanner(false);
    setScanNotFound(null);

    // In QC Passed view: try product SKU/barcode first
    if (activeFilter === 'qc_passed') {
      const skuMatch = matchQcItemBySku(barcode);
      if (skuMatch) {
        scrollToItem(skuMatch.item.id);
        return;
      }
    }

    const matched = matchReturn(barcode);
    if (!matched) {
      setScanNotFound(`No return found matching "${barcode}"`);
      setTimeout(() => setScanNotFound(null), 4000);
      return;
    }

    const targetTab = matched.status as FilterStatus;
    setActiveFilter(targetTab);
    setSearchQuery('');

    if (matched.status === 'expected') {
      setReceivingReturn(matched);
    } else if (matched.status === 'qc_passed') {
      const firstItem = (matched.items ?? []).find(i => i.qc_status === 'passed' && !i.restocked_at);
      if (firstItem) scrollToItem(firstItem.id);
    } else {
      setExpandedRows(prev => new Set(prev).add(matched.id));
      scrollToItem(matched.id);
    }
  };

  const handleExport = async () => {
    const selectedReturns = filteredReturns.filter(r => selectedIds.has(r.id));
    if (selectedReturns.length === 0) return;
    setExporting(true);
    try {
      const exportItems: RestockExportItem[] = [];
      const locationStockSet = new Map<string, RestockExportLocationStock>();

      for (const r of selectedReturns) {
        const orderId = r.order?.woo_order_id ? `#${r.order.woo_order_id}` : (r.order?.order_number ?? r.return_number);
        for (const item of (r.items ?? []).filter(i => i.qc_status === 'passed' && !i.restocked_at)) {
          const rec = skuRecommendations.get(item.sku);
          const restockLocCode = item.restock_location?.code ?? rec?.locationCode ?? null;
          const currentStock = rec?.currentStock ?? 0;
          exportItems.push({
            returnId: r.id,
            returnNumber: r.return_number,
            orderId,
            customerName: r.customer?.full_name ?? '—',
            sku: item.sku,
            productName: item.order_item?.product_name || item.product?.name || item.sku,
            quantity: item.quantity,
            restockLocationCode: restockLocCode,
            restockLocationName: item.restock_location?.name ?? null,
            qcPassedAt: r.qc_completed_at ?? r.updated_at,
          });
          if (restockLocCode) {
            const key = `${item.sku}|${restockLocCode}`;
            if (!locationStockSet.has(key)) {
              locationStockSet.set(key, { sku: item.sku, locationCode: restockLocCode, currentStock });
            }
          }
        }
      }

      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      await exportRestockSheet(exportItems, [...locationStockSet.values()], today);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleSendNotification = async () => {
    if (!user || notifPending.length === 0) return;
    setSendingNotif(true);
    try {
      const returnsPayload = notifPending.map(r => ({
        return_number: r.return_number,
        items: (r.items ?? []).map(i => ({ sku: i.sku, quantity: i.quantity })),
      }));
      const totalItems = returnsPayload.reduce((sum, r) => sum + r.items.length, 0);
      const title = notifPending.length === 1
        ? `Return Restock: ${notifPending[0].return_number}`
        : `Return Restock: ${notifPending.length} returns (${totalItems} items)`;

      const { data: notifRow, error: notifErr } = await supabase
        .from('notifications')
        .insert({ type: 'return_restock', title, body: { returns: returnsPayload }, created_by: user.id })
        .select('id')
        .maybeSingle();
      if (notifErr || !notifRow) throw notifErr ?? new Error('Failed to create notification');

      const { data: allUsers } = await supabase
        .from('users')
        .select('id')
        .eq('is_active', true)
        .neq('id', user.id);

      if (allUsers && allUsers.length > 0) {
        await supabase.from('notification_reads').insert(
          (allUsers as { id: string }[]).map(u => ({ notification_id: (notifRow as any).id, user_id: u.id, read_at: null }))
        );
      }

      await supabase
        .from('returns')
        .update({ notification_sent: true })
        .in('id', notifPending.map(r => r.id));

      setNotifPending([]);
      setShowNotifConfirm(false);
      setNotifSuccess(true);
      setTimeout(() => setNotifSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to send notification:', err);
    } finally {
      setSendingNotif(false);
    }
  };

  const useGrouping = activeFilter !== 'expected';
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const dateGroups = useGrouping ? buildDateGroups(filteredReturns, activeFilter) : [];

  const selectedCount = selectedIds.size;
  const selectedUnits = filteredReturns
    .filter(r => selectedIds.has(r.id))
    .reduce((sum, r) => sum + (r.items?.filter(i => i.qc_status === 'passed' && !i.restocked_at).reduce((s, i) => s + i.quantity, 0) ?? 0), 0);
  const unsetLocationCount = filteredReturns
    .filter(r => selectedIds.has(r.id))
    .flatMap(r => (r.items ?? []).filter(i => i.qc_status === 'passed' && !i.restocked_at))
    .filter(i => !i.restock_location_id && !skuRecommendations.has(i.sku))
    .length;

  return (
    <div className="p-4 md:p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Returns Management</h1>
          <p className="text-sm text-gray-500 mt-1 hidden sm:block">Manage product returns, quality control, and restocking</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {notifEnabled && notifPending.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowNotifConfirm(true)}
              className="relative gap-2 border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300"
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Send Notification</span>
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-teal-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {notifPending.length}
              </span>
            </Button>
          )}
          {notifSuccess && (
            <span className="text-xs font-medium text-teal-600 hidden sm:inline">Notification sent!</span>
          )}
          <Button variant="outline" onClick={() => setShowReceivePackaging(true)} className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Receive Packaging</span>
          </Button>
          <Button variant="primary" onClick={() => setShowScanner(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Open Scanner</span>
            <span className="sm:hidden">Scan</span>
          </Button>
        </div>
      </div>

      {scanNotFound && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {scanNotFound}
          <button onClick={() => setScanNotFound(null)} className="ml-auto p-0.5 hover:text-red-800 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Status cards — horizontally scrollable on mobile */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUS_CARDS.map(card => {
          const isActive = activeFilter === card.key;
          return (
            <button
              key={card.key}
              onClick={() => setActiveFilter(card.key)}
              className={`relative p-3 md:p-4 rounded-xl border text-left transition-all duration-150 focus:outline-none shrink-0 min-w-[88px] md:flex-1 ${
                isActive ? `${card.activeBg} ${card.activeRing} shadow-sm` : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className={`mb-1.5 ${isActive ? card.numberColor : 'text-gray-400'}`}>{card.icon}</div>
              <div className="text-xs text-gray-500 mb-0.5 font-medium">{card.label}</div>
              <div className={`text-xl md:text-2xl font-bold ${card.numberColor}`}>{statusCounts[card.key]}</div>
              {isActive && <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl ${card.numberColor.replace('text-', 'bg-')}`} />}
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        {/* Search + export toolbar */}
        <div className="p-3 md:p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={activeFilter === 'qc_passed'
                ? 'Search by return ID, order, customer, SKU or product name...'
                : 'Search by return ID, order ID, customer, or reason...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {activeFilter === 'qc_passed' && (
            <button
              onClick={handleExport}
              disabled={selectedCount === 0 || exporting}
              title={unsetLocationCount > 0 ? `${unsetLocationCount} item(s) have no location set` : undefined}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-semibold border transition-all shrink-0 ${
                selectedCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">Export</span>
              {selectedCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold bg-white/20 text-white">{selectedCount}</span>
              )}
              {unsetLocationCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-yellow-300" />}
            </button>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading returns...</div>
        ) : filteredReturns.length === 0 ? (
          <div className="text-center py-16">
            <PackageX className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No {RETURN_STATUS_LABELS[activeFilter]?.toLowerCase()} returns</p>
            <p className="text-gray-400 text-sm mt-1">Returns matching this status will appear here</p>
          </div>
        ) : activeFilter === 'qc_passed' ? (
          /* ── QC Passed: item rows grouped by date then SKU ── */
          <div className="p-3 md:p-4 space-y-2">
            <p className="text-xs text-gray-400 mb-3">
              {filteredReturns.length} return{filteredReturns.length !== 1 ? 's' : ''} across {dateGroups.length} day{dateGroups.length !== 1 ? 's' : ''}
              {selectedCount > 0 && (
                <span className="ml-3 text-emerald-600 font-semibold">{selectedCount} selected · {selectedUnits} unit{selectedUnits !== 1 ? 's' : ''}</span>
              )}
            </p>
            {dateGroups.map(group => (
              <QcDateGroup
                key={group.date}
                group={group}
                defaultOpen={group.date === today || group.date === yesterday}
                selectedIds={selectedIds}
                rowRefs={rowRefs}
                locations={storageLocations}
                skuRecommendations={skuRecommendations}
                savingItemId={savingItemId}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onRestock={(ret, itemId) => setRestockingState({ ret, itemIds: [itemId] })}
                onSaveLocation={handleSaveLocation}
              />
            ))}
          </div>
        ) : useGrouping ? (
          /* ── Other grouped views (received, qc_failed, restocked, damaged) ── */
          <div className="p-3 md:p-4 space-y-2">
            <p className="text-xs text-gray-400 mb-3">
              {filteredReturns.length} return{filteredReturns.length !== 1 ? 's' : ''} across {dateGroups.length} day{dateGroups.length !== 1 ? 's' : ''}
            </p>
            {dateGroups.map(group => (
              <DateGroupAccordion
                key={group.date}
                group={group}
                status={activeFilter}
                defaultOpen={group.date === today || group.date === yesterday}
                expandedRows={expandedRows}
                selectedIds={selectedIds}
                deleteConfirmId={deleteConfirmId}
                deleting={deleting}
                isAdmin={isAdmin}
                rowRefs={rowRefs}
                locations={storageLocations}
                skuRecommendations={skuRecommendations}
                savingItemId={savingItemId}
                onToggleExpand={toggleExpand}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onReceive={setReceivingReturn}
                onQc={setQcReturn}
                onWriteOff={handleWriteOff}
                onDeleteConfirm={setDeleteConfirmId}
                onDeleteExecute={handleDeleteReturn}
                onSaveLocation={handleSaveLocation}
              />
            ))}
          </div>
        ) : (
          /* ── Flat table for Expected ── */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Return ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Order Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Order Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Items</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Created</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredReturns.map(r => {
                  const itemCount = r.items?.length ?? 0;
                  const isExpanded = expandedRows.has(r.id);
                  const hasLostItems = r.items?.some(i => i.receive_status === 'lost');
                  const isConfirmingDelete = deleteConfirmId === r.id;

                  return (
                    <>
                      <tr
                        key={r.id}
                        ref={el => {
                          if (el) rowRefs.current.set(r.id, el as HTMLElement);
                          else rowRefs.current.delete(r.id);
                        }}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`}
                        onClick={() => itemCount > 0 && toggleExpand(r.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-gray-800">{r.return_number}</span>
                            {hasLostItems && <AlertTriangle className="w-3.5 h-3.5 text-red-400" title="Has lost items" />}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">
                            {r.order?.woo_order_id ? `#${r.order.woo_order_id}` : (r.order?.order_number ?? '—')}
                          </div>
                          {r.exchange_order && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs text-gray-400">Exch:</span>
                              <span className="text-xs font-medium text-blue-600">
                                {r.exchange_order.woo_order_id ? `#${r.exchange_order.woo_order_id}` : r.exchange_order.order_number}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap hidden sm:table-cell">
                          {r.order?.order_date
                            ? new Date(r.order.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {r.order?.cs_status ? (() => {
                            const cfg = STATUS_CONFIG[r.order.cs_status];
                            return cfg ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                                {cfg.label}
                              </span>
                            ) : <span className="text-xs text-gray-500">{r.order.cs_status}</span>;
                          })() : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-800 font-medium">{r.customer?.full_name ?? '—'}</div>
                          {r.customer?.phone_primary && <div className="text-xs text-gray-400 mt-0.5">{r.customer.phone_primary}</div>}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {itemCount > 0
                            ? <div><span className="text-gray-800 text-xs">{getItemDisplay(r)}</span>{itemCount > 1 && <span className="ml-1 text-xs text-gray-400">({itemCount})</span>}</div>
                            : <span className="text-gray-400 text-xs">No items</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap hidden md:table-cell">
                          {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" onClick={() => setReceivingReturn(r)} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5">
                              <ScanLine className="w-3.5 h-3.5" /><span className="hidden sm:inline">Receive</span>
                            </Button>
                            {isAdmin && !isConfirmingDelete && (
                              <button onClick={() => setDeleteConfirmId(r.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isAdmin && isConfirmingDelete && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-red-600 font-medium">Delete?</span>
                                <button onClick={() => handleDeleteReturn(r.id)} disabled={deleting} className="px-2 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50">Yes</button>
                                <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">No</button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && r.items && r.items.length > 0 && (
                        <tr key={`${r.id}-expanded`} className="bg-gray-50 border-b border-gray-100">
                          <td colSpan={8} className="px-6 py-3">
                            <div className="space-y-1.5">
                              {r.items.map(item => {
                                const receiveBadge = ITEM_RECEIVE_BADGE[item.receive_status] ?? ITEM_RECEIVE_BADGE.pending;
                                const qcBadge = item.qc_status ? (ITEM_QC_BADGE[item.qc_status] ?? null) : null;
                                return (
                                  <div key={item.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
                                    <div className="min-w-0">
                                      <div className="font-medium text-gray-900 text-xs truncate">
                                        {item.order_item?.product_name || item.product?.name || item.sku}
                                      </div>
                                      <div className="text-xs text-gray-400">SKU: {item.sku} | Qty: {item.quantity}</div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {item.hold_location && (
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                          <MapPin className="w-3 h-3" />
                                          <span className={`font-medium ${
                                            item.hold_location.location_type === 'return_hold' ? 'text-blue-600' :
                                            item.hold_location.location_type === 'damaged' ? 'text-red-600' : 'text-emerald-600'
                                          }`}>{item.hold_location.code}</span>
                                        </div>
                                      )}
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${receiveBadge.cls}`}>
                                        {receiveBadge.label}
                                      </span>
                                      {qcBadge && (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${qcBadge.cls}`}>
                                          {qcBadge.label}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {receivingReturn && (
        <ReceiveReturnModal
          returnData={receivingReturn}
          onClose={() => setReceivingReturn(null)}
          onReceived={() => { setReceivingReturn(null); fetchReturns(); }}
        />
      )}
      {qcReturn && (
        <QCReviewModal
          returnData={qcReturn}
          onClose={() => setQcReturn(null)}
          onQcComplete={() => { setQcReturn(null); fetchReturns(); }}
        />
      )}
      {restockingState && (
        <RestockModal
          returnData={restockingState.ret}
          itemIds={restockingState.itemIds}
          onClose={() => setRestockingState(null)}
          onRestocked={() => { setRestockingState(null); fetchReturns(); }}
        />
      )}
      {showScanner && (
        <BarcodeScannerModal onScan={handleCameraScan} onClose={() => setShowScanner(false)} />
      )}
      {showReceivePackaging && (
        <ReceivePackagingModal onClose={() => setShowReceivePackaging(false)} onSuccess={() => setShowReceivePackaging(false)} />
      )}

      {showNotifConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Send Restock Notification</h2>
                  <p className="text-xs text-gray-500">Notify all team members about these restocked returns</p>
                </div>
              </div>
              <button onClick={() => setShowNotifConfirm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-3">
                <span className="font-semibold text-gray-900">{notifPending.length} return{notifPending.length !== 1 ? 's' : ''}</span> restocked in the last 3 hours will be included:
              </p>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {notifPending.map(r => (
                  <div key={r.id} className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                    <span className="font-mono text-sm font-semibold text-gray-800">{r.return_number}</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(r.items ?? []).map((item, idx) => (
                        <span key={idx} className="text-xs text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono">
                          {item.sku} ×{item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">Once sent, these returns will not appear in future notifications.</p>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setShowNotifConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotification}
                disabled={sendingNotif}
                className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                {sendingNotif ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
