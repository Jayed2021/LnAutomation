import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Search, RefreshCw, ExternalLink, ChevronLeft, ChevronRight, PackageCheck, X, ChevronDown, CreditCard as Edit2, Check, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OrderCollectionFilters, OrderCollectionRow, OrderCollectionResult } from './types';
import {
  fetchOrderCollectionStatus,
  fetchOrderCollectionAggregates,
  updateOrderSettlement,
  DEFAULT_CS_STATUSES,
  OrderCollectionAggregates,
} from './collectionService';
import { STATUS_CONFIG } from '../../fulfillment/orders/types';

const PAGE_SIZE = 50;
const BD_OFFSET_MS = 6 * 60 * 60 * 1000;

const ALL_CS_STATUS_OPTIONS = [
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'partial_delivery', label: 'Partial Delivery' },
  { value: 'exchange', label: 'Exchange' },
  { value: 'exchange_returnable', label: 'EXR' },
  { value: 'cancelled_cad', label: 'CAD Orders' },
  { value: 'new_not_called', label: 'New & Not Called' },
  { value: 'new_called', label: 'New & Called' },
  { value: 'awaiting_payment', label: 'Awaiting Payment' },
  { value: 'late_delivery', label: 'Late Delivery' },
  { value: 'send_to_lab', label: 'Send to Lab' },
  { value: 'in_lab', label: 'In Lab' },
  { value: 'not_printed', label: 'Not Printed' },
  { value: 'printed', label: 'Printed' },
  { value: 'packed', label: 'Packed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'cancelled_cbd', label: 'CBD' },
  { value: 'refund', label: 'Refund' },
  { value: 'reverse_pick', label: 'Reverse Pick' },
];

function toLocalDateStr(utcDate: Date): string {
  const localMs = utcDate.getTime() + BD_OFFSET_MS;
  const local = new Date(localMs);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localDateToUtcFrom(localDateStr: string): string {
  return `${localDateStr}T00:00:00+06:00`;
}

function localDateToUtcTo(localDateStr: string): string {
  return `${localDateStr}T23:59:59+06:00`;
}

function getLastMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const localMs = now.getTime() + BD_OFFSET_MS;
  const local = new Date(localMs);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  return {
    dateFrom: toLocalDateStr(new Date(Date.UTC(prevYear, prevMonth, 1))),
    dateTo: toLocalDateStr(new Date(Date.UTC(prevYear, prevMonth + 1, 0))),
  };
}

function getThisMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const localMs = now.getTime() + BD_OFFSET_MS;
  const local = new Date(localMs);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const firstMs = Date.UTC(year, month, 1);
  const lastMs = Date.UTC(year, month + 1, 0);
  return {
    dateFrom: toLocalDateStr(new Date(firstMs)),
    dateTo: toLocalDateStr(new Date(lastMs)),
  };
}

function getThisQuarterRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const localMs = now.getTime() + BD_OFFSET_MS;
  const local = new Date(localMs);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const qStart = Math.floor(month / 3) * 3;
  return {
    dateFrom: toLocalDateStr(new Date(Date.UTC(year, qStart, 1))),
    dateTo: toLocalDateStr(new Date(Date.UTC(year, qStart + 3, 0))),
  };
}

function getLastQuarterRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const localMs = now.getTime() + BD_OFFSET_MS;
  const local = new Date(localMs);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const qStart = Math.floor(month / 3) * 3;
  const prevQStart = qStart - 3;
  const qYear = prevQStart < 0 ? year - 1 : year;
  const adjQ = prevQStart < 0 ? 9 : prevQStart;
  return {
    dateFrom: toLocalDateStr(new Date(Date.UTC(qYear, adjQ, 1))),
    dateTo: toLocalDateStr(new Date(Date.UTC(qYear, adjQ + 3, 0))),
  };
}

type QuickRange = 'last_month' | 'this_month' | 'this_quarter' | 'last_quarter' | 'custom';

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' });
}

function formatMoney(v: number | null | undefined): string {
  if (v == null) return '—';
  return '৳' + v.toLocaleString('en-BD', { minimumFractionDigits: 0 });
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function CsStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <span className="text-xs text-gray-400">{status}</span>;
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

interface CsStatusDropdownProps {
  selected: string[];
  onChange: (v: string[]) => void;
}

function CsStatusDropdown({ selected, onChange }: CsStatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (v: string) => {
    if (selected.includes(v)) {
      onChange(selected.filter(s => s !== v));
    } else {
      onChange([...selected, v]);
    }
  };

  const label = selected.length === DEFAULT_CS_STATUSES.length && DEFAULT_CS_STATUSES.every(s => selected.includes(s))
    ? 'Default Statuses'
    : selected.length === 0
      ? 'All Statuses'
      : `${selected.length} selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:border-gray-300 transition-colors min-w-[140px] justify-between"
      >
        <span className="text-gray-700 truncate">{label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-56 py-1.5">
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-100 mb-1">
            <span className="text-xs font-semibold text-gray-500">CS Order Status</span>
            <div className="flex gap-2">
              <button
                onClick={() => onChange(DEFAULT_CS_STATUSES)}
                className="text-xs text-blue-600 hover:underline"
              >
                Default
              </button>
              <button
                onClick={() => onChange(ALL_CS_STATUS_OPTIONS.map(o => o.value))}
                className="text-xs text-blue-600 hover:underline"
              >
                All
              </button>
              <button
                onClick={() => onChange([])}
                className="text-xs text-gray-400 hover:underline"
              >
                None
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {ALL_CS_STATUS_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <CsStatusBadge status={opt.value} />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface QuickEditModalProps {
  row: OrderCollectionRow;
  onClose: () => void;
  onSaved: (updated: Partial<OrderCollectionRow>) => void;
}

function QuickEditModal({ row, onClose, onSaved }: QuickEditModalProps) {
  const [collectedAmount, setCollectedAmount] = useState(row.collected_amount ?? 0);
  const [deliveryCharge, setDeliveryCharge] = useState(row.delivery_charge ?? 0);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>(
    row.payment_status === 'paid' ? 'paid' : 'unpaid'
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateOrderSettlement(row.id, collectedAmount, deliveryCharge, paymentStatus);
      onSaved({
        collected_amount: collectedAmount,
        delivery_charge: deliveryCharge,
        payment_status: paymentStatus,
      });
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const orderLabel = row.woo_order_id ? `#${row.woo_order_id}` : row.order_number;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="text-sm font-semibold text-gray-900">Quick Edit Settlement</div>
            <div className="text-xs text-gray-400 mt-0.5">{orderLabel} &mdash; {row.customer_name}</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Collected Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">৳</span>
              <input
                type="number"
                min={0}
                step={1}
                value={collectedAmount}
                onChange={e => setCollectedAmount(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Delivery Charge</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">৳</span>
              <input
                type="number"
                min={0}
                step={1}
                value={deliveryCharge}
                onChange={e => setDeliveryCharge(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={e => setPaymentStatus(e.target.value as 'paid' | 'unpaid')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrderCollectionTab() {
  const navigate = useNavigate();
  const lastMonthRange = getLastMonthRange();

  const [quickRange, setQuickRange] = useState<QuickRange>('last_month');
  const [filters, setFilters] = useState<OrderCollectionFilters>({
    dateFrom: lastMonthRange.dateFrom,
    dateTo: lastMonthRange.dateTo,
    paymentStatus: 'all',
    paymentMethod: '',
    csStatuses: [...DEFAULT_CS_STATUSES],
    courierCompany: '',
    searchQuery: '',
    page: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [result, setResult] = useState<OrderCollectionResult>({ rows: [], totalCount: 0, totalCollected: 0, totalOutstanding: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [aggregates, setAggregates] = useState<OrderCollectionAggregates | null>(null);
  const [aggLoading, setAggLoading] = useState(false);
  const [aggError, setAggError] = useState<string | null>(null);

  const [editingRow, setEditingRow] = useState<OrderCollectionRow | null>(null);

  const availableCouriers = [...new Set(result.rows.map(r => r.courier_company).filter(Boolean))] as string[];

  const load = useCallback(async (f: OrderCollectionFilters) => {
    setLoading(true);
    setError(null);
    try {
      const adjustedFilters = {
        ...f,
        dateFrom: localDateToUtcFrom(f.dateFrom),
        dateTo: localDateToUtcTo(f.dateTo),
      };
      const res = await fetchOrderCollectionStatus(adjustedFilters);
      setResult(res);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAggregates = useCallback(async (f: OrderCollectionFilters) => {
    setAggLoading(true);
    setAggError(null);
    try {
      const adjustedFilters = {
        ...f,
        dateFrom: localDateToUtcFrom(f.dateFrom),
        dateTo: localDateToUtcTo(f.dateTo),
      };
      const agg = await fetchOrderCollectionAggregates(adjustedFilters);
      setAggregates(agg);
    } catch (err: any) {
      setAggError(err.message ?? 'Failed to fetch aggregates');
    } finally {
      setAggLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
  }, []);

  const applyQuickRange = (range: QuickRange) => {
    setQuickRange(range);
    let dr = lastMonthRange;
    if (range === 'this_month') dr = getThisMonthRange();
    else if (range === 'this_quarter') dr = getThisQuarterRange();
    else if (range === 'last_quarter') dr = getLastQuarterRange();
    const next = { ...filters, dateFrom: dr.dateFrom, dateTo: dr.dateTo, page: 1 };
    setFilters(next);
    setAggregates(null);
    load(next);
  };

  const applyFilter = (partial: Partial<OrderCollectionFilters>) => {
    const next = { ...filters, ...partial, page: 1 };
    setFilters(next);
    setAggregates(null);
    load(next);
  };

  const applySearch = () => {
    applyFilter({ searchQuery: searchInput });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applySearch();
  };

  const goPage = (p: number) => {
    const next = { ...filters, page: p };
    setFilters(next);
    load(next);
  };

  const handleRowUpdated = (rowId: string, updated: Partial<OrderCollectionRow>) => {
    setResult(prev => ({
      ...prev,
      rows: prev.rows.map(r => r.id === rowId ? { ...r, ...updated } : r),
    }));
    setAggregates(null);
  };

  const totalPages = Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE));

  const quickRangeOptions: { value: QuickRange; label: string }[] = [
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'last_quarter', label: 'Last Quarter' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-4">
      {editingRow && (
        <QuickEditModal
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSaved={updated => handleRowUpdated(editingRow.id, updated)}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            {quickRangeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => opt.value !== 'custom' ? applyQuickRange(opt.value) : setQuickRange('custom')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  quickRange === opt.value
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {quickRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => { setAggregates(null); load(filters); }}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Order #, Woo ID, customer, tracking..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm bg-transparent focus:outline-none"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); applyFilter({ searchQuery: '' }); }}>
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          <select
            value={filters.paymentStatus}
            onChange={e => applyFilter({ paymentStatus: e.target.value as any })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Payment</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>

          <select
            value={filters.paymentMethod}
            onChange={e => applyFilter({ paymentMethod: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Methods</option>
            <option value="COD">COD</option>
            <option value="Prepaid">Prepaid</option>
            <option value="Partial Paid">Partial Paid</option>
          </select>

          <select
            value={filters.courierCompany}
            onChange={e => applyFilter({ courierCompany: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Couriers</option>
            {availableCouriers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <CsStatusDropdown
            selected={filters.csStatuses}
            onChange={v => applyFilter({ csStatuses: v })}
          />

          <button
            onClick={() => load(filters)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Orders</div>
          <div className="text-xl font-bold text-gray-900">{result.totalCount.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-0.5">Matching filters</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Collected</div>
          {aggregates ? (
            <>
              <div className="text-xl font-bold text-green-700">{formatMoney(aggregates.totalCollected)}</div>
              <div className="text-xs text-gray-400 mt-0.5">All orders &mdash; {formatTimeAgo(aggregates.fetchedAt)}</div>
            </>
          ) : (
            <>
              <div className="text-xl font-bold text-gray-300">—</div>
              <div className="text-xs text-gray-400 mt-0.5">{aggError ? <span className="text-red-500">{aggError}</span> : 'Fetch data to see totals'}</div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium text-gray-500">Outstanding</div>
            <button
              onClick={() => fetchAggregates(filters)}
              disabled={aggLoading}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
              title="Fetch totals for current filters"
            >
              <Database className={`w-3 h-3 ${aggLoading ? 'animate-pulse' : ''}`} />
              {aggLoading ? 'Fetching...' : 'Fetch Data'}
            </button>
          </div>
          {aggregates ? (
            <>
              <div className={`text-xl font-bold ${aggregates.totalOutstanding > 0 ? 'text-amber-700' : 'text-green-600'}`}>
                {aggregates.totalOutstanding > 0 ? formatMoney(aggregates.totalOutstanding) : 'All Cleared'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Remaining to collect</div>
            </>
          ) : (
            <>
              <div className="text-xl font-bold text-gray-300">—</div>
              <div className="text-xs text-gray-400 mt-0.5">Click "Fetch Data" to load</div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : result.rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <PackageCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No orders found</p>
            <p className="text-xs mt-1">Try adjusting filters or date range</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Courier & Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Collection</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Outstanding</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map(row => {
                    const receivable = row.total_receivable ?? row.total_amount;
                    const discount = row.delivery_discount ?? 0;
                    const collected = row.collected_amount ?? 0;
                    const outstanding = Math.max(0, receivable - discount - collected);
                    const pm = row.payment_method ?? 'COD';
                    const isPartialPaid = pm.toLowerCase().startsWith('partial paid');

                    return (
                      <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {row.woo_order_id ? `#${row.woo_order_id}` : row.order_number}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{formatDate(row.order_date)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-800">{row.customer_name}</div>
                          <div className="text-xs text-gray-400">{row.customer_phone}</div>
                          {row.customer_district && (
                            <div className="text-xs text-gray-400">{row.customer_district}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700">{pm}</div>
                          <div className="mt-1">
                            {row.payment_status === 'paid' ? (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Paid</span>
                            ) : (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Unpaid</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700">
                            {row.courier_company ?? <span className="text-gray-400">—</span>}
                          </div>
                          {row.tracking_number && (
                            <div className="text-xs font-mono text-gray-400 mt-0.5">{row.tracking_number}</div>
                          )}
                          {row.courier_status && (
                            <div className="mt-1">
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {row.courier_status}
                              </span>
                            </div>
                          )}
                          <div className="mt-1">
                            <CsStatusBadge status={row.cs_status} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-xs text-gray-400">{formatMoney(row.total_amount)}</div>
                          <div className="text-sm font-semibold text-gray-900">{formatMoney(collected)}</div>
                          {(row.delivery_charge ?? 0) > 0 && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              D/C: {formatMoney(row.delivery_charge)}
                            </div>
                          )}
                          {isPartialPaid && (row.cod_charge ?? 0) > 0 && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              COD: {formatMoney(row.cod_charge)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`text-sm font-semibold ${outstanding > 0 ? 'text-amber-700' : 'text-green-600'}`}>
                            {outstanding > 0 ? formatMoney(outstanding) : <span className="text-green-600">Cleared</span>}
                          </div>
                          {discount > 0 && (
                            <div className="text-xs text-gray-400 mt-0.5">Disc: {formatMoney(discount)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => setEditingRow(row)}
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                              title="Quick edit settlement"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/fulfillment/orders/${row.id}`, { state: { from: '/finance/collection?tab=order_status' } })}
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                              title="Open full order detail"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Page {filters.page} of {totalPages} &mdash; {result.totalCount.toLocaleString()} orders
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goPage(filters.page - 1)}
                    disabled={filters.page <= 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(filters.page - 2, totalPages - 4));
                    const p = start + i;
                    return (
                      <button
                        key={p}
                        onClick={() => goPage(p)}
                        className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                          p === filters.page
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => goPage(filters.page + 1)}
                    disabled={filters.page >= totalPages}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
