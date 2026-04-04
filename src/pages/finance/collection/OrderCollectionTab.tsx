import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Search, RefreshCw, ExternalLink, ChevronLeft, ChevronRight, PackageCheck, X, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OrderCollectionFilters, OrderCollectionRow, OrderCollectionResult } from './types';
import { fetchOrderCollectionStatus, DEFAULT_CS_STATUSES } from './collectionService';
import { STATUS_CONFIG } from '../../fulfillment/orders/types';

const PAGE_SIZE = 50;

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

function getLastMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
  const firstOfLastMonth = new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1);
  return {
    dateFrom: firstOfLastMonth.toISOString().split('T')[0],
    dateTo: lastOfLastMonth.toISOString().split('T')[0],
  };
}

function getThisMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    dateFrom: first.toISOString().split('T')[0],
    dateTo: last.toISOString().split('T')[0],
  };
}

function getThisQuarterRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const qStart = Math.floor(now.getMonth() / 3) * 3;
  const first = new Date(now.getFullYear(), qStart, 1);
  const last = new Date(now.getFullYear(), qStart + 3, 0);
  return {
    dateFrom: first.toISOString().split('T')[0],
    dateTo: last.toISOString().split('T')[0],
  };
}

function getLastQuarterRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const qStart = Math.floor(now.getMonth() / 3) * 3;
  const prevQStart = qStart - 3;
  const year = prevQStart < 0 ? now.getFullYear() - 1 : now.getFullYear();
  const adjustedQStart = prevQStart < 0 ? 9 : prevQStart;
  const first = new Date(year, adjustedQStart, 1);
  const last = new Date(year, adjustedQStart + 3, 0);
  return {
    dateFrom: first.toISOString().split('T')[0],
    dateTo: last.toISOString().split('T')[0],
  };
}

type QuickRange = 'last_month' | 'this_month' | 'this_quarter' | 'last_quarter' | 'custom';

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(v: number | null | undefined): string {
  if (v == null) return '—';
  return '৳' + v.toLocaleString('en-BD', { minimumFractionDigits: 0 });
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

  const availableCouriers = [...new Set(result.rows.map(r => r.courier_company).filter(Boolean))] as string[];

  const load = useCallback(async (f: OrderCollectionFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrderCollectionStatus(f);
      setResult(res);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load');
    } finally {
      setLoading(false);
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
    load(next);
  };

  const applyFilter = (partial: Partial<OrderCollectionFilters>) => {
    const next = { ...filters, ...partial, page: 1 };
    setFilters(next);
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
                onClick={() => load(filters)}
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
          <div className="text-xl font-bold text-green-700">{formatMoney(result.totalCollected)}</div>
          <div className="text-xs text-gray-400 mt-0.5">From courier settlements</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Outstanding</div>
          <div className={`text-xl font-bold ${result.totalOutstanding > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
            {formatMoney(result.totalOutstanding)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Remaining to collect</div>
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
                          <button
                            onClick={() => navigate(`/fulfillment/orders/${row.id}`)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
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
