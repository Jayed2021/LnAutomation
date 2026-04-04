import React, { useState, useEffect, useRef } from 'react';
import { X, Search, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import {
  ManualRevenueEntry,
  CreateManualRevenueInput,
  RevenueCategory,
  REVENUE_CATEGORY_LABELS,
  createManualRevenueEntry,
  updateManualRevenueEntry,
  searchOrdersForRevenue,
} from './manualRevenueService';

interface Props {
  entry?: ManualRevenueEntry | null;
  userId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const FINAL_CS_STATUSES = new Set(['delivered', 'cancelled_cad', 'exchange', 'exchange_returnable', 'partial_delivery']);

const CS_STATUS_LABELS: Record<string, string> = {
  delivered: 'Delivered',
  cancelled_cad: 'CAD',
  exchange: 'Exchange',
  exchange_returnable: 'EXR',
  partial_delivery: 'Partial Delivered',
  shipped: 'Shipped',
  new_not_called: 'New',
  not_printed: 'Not Printed',
};

const today = () => new Date().toISOString().split('T')[0];

export function ManualRevenueModal({ entry, userId, onClose, onSaved }: Props) {
  const isEditing = !!entry;

  const [form, setForm] = useState<CreateManualRevenueInput>({
    revenue_date: entry?.revenue_date ?? today(),
    category: entry?.category ?? 'operational_revenue',
    amount: entry?.amount ?? 0,
    description: entry?.description ?? '',
    reference_number: entry?.reference_number ?? '',
    order_id: entry?.order_id ?? null,
    bank_deposit_date: entry?.bank_deposit_date ?? '',
    bank_deposit_reference: entry?.bank_deposit_reference ?? '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orderSearch, setOrderSearch] = useState('');
  const [orderResults, setOrderResults] = useState<Array<{
    id: string;
    order_number: string;
    order_date: string;
    total_amount: number;
    customer_name: string;
    payment_status: string;
    cs_status: string;
  }>>([]);
  const [orderSearching, setOrderSearching] = useState(false);
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [linkedOrderSummary, setLinkedOrderSummary] = useState<{
    id: string;
    order_number: string;
    order_date: string;
    total_amount: number;
    customer_name: string;
    payment_status: string;
    cs_status: string;
  } | null>(
    entry?.order
      ? {
          id: entry.order_id!,
          order_number: entry.order.order_number,
          order_date: entry.order.order_date,
          total_amount: 0,
          customer_name: '',
          payment_status: entry.order.payment_status,
          cs_status: entry.order.cs_status,
        }
      : null
  );

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!orderSearch.trim()) {
      setOrderResults([]);
      setShowOrderDropdown(false);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setOrderSearching(true);
      const results = await searchOrdersForRevenue(orderSearch);
      setOrderResults(results);
      setShowOrderDropdown(true);
      setOrderSearching(false);
    }, 300);
  }, [orderSearch]);

  const handleSelectOrder = (order: typeof orderResults[0]) => {
    setForm(f => ({ ...f, order_id: order.id }));
    setLinkedOrderSummary(order);
    setOrderSearch('');
    setShowOrderDropdown(false);
  };

  const handleClearOrder = () => {
    setForm(f => ({ ...f, order_id: null }));
    setLinkedOrderSummary(null);
    setOrderSearch('');
  };

  const handleSubmit = async () => {
    if (!form.revenue_date) { setError('Revenue date is required'); return; }
    if (!form.amount || form.amount <= 0) { setError('Amount must be greater than 0'); return; }
    setError(null);
    setSaving(true);
    try {
      if (isEditing && entry) {
        await updateManualRevenueEntry(entry.id, form, userId, entry.order_id ?? null);
      } else {
        await createManualRevenueEntry(form, userId);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isEditing ? 'Edit Revenue Entry' : 'Add Revenue Entry'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Record revenue outside courier invoice system</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Revenue Details</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Revenue Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={form.revenue_date}
                    onChange={e => setForm(f => ({ ...f, revenue_date: e.target.value }))}
                    className={inputCls}
                  />
                  <p className="text-xs text-gray-400 mt-1">Date revenue was earned (can be backdated)</p>
                </div>
                <div>
                  <label className={labelCls}>Category <span className="text-red-500">*</span></label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as RevenueCategory }))}
                    className={inputCls}
                  >
                    {(Object.keys(REVENUE_CATEGORY_LABELS) as RevenueCategory[]).map(k => (
                      <option key={k} value={k}>{REVENUE_CATEGORY_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Amount (BDT) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={form.amount || ''}
                  onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  className={inputCls}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className={labelCls}>Reference Number</label>
                <input
                  type="text"
                  value={form.reference_number ?? ''}
                  onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))}
                  className={inputCls}
                  placeholder="Internal ref, invoice #, etc."
                />
              </div>

              <div>
                <label className={labelCls}>Link to Order (optional)</label>
                {linkedOrderSummary ? (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-blue-800">{linkedOrderSummary.order_number}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          linkedOrderSummary.payment_status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {linkedOrderSummary.payment_status}
                        </span>
                      </div>
                      <div className="text-xs text-blue-600 mt-0.5">
                        {linkedOrderSummary.customer_name && `${linkedOrderSummary.customer_name} · `}
                        {CS_STATUS_LABELS[linkedOrderSummary.cs_status] ?? linkedOrderSummary.cs_status}
                        {linkedOrderSummary.total_amount > 0 && ` · ৳${linkedOrderSummary.total_amount.toLocaleString('en-BD')}`}
                      </div>
                      {linkedOrderSummary.payment_status !== 'paid' && FINAL_CS_STATUSES.has(linkedOrderSummary.cs_status) && (
                        <p className="text-xs text-green-700 font-medium mt-1">This order will be marked as paid on save.</p>
                      )}
                    </div>
                    <button onClick={handleClearOrder} className="p-1 hover:bg-blue-100 rounded transition-colors shrink-0">
                      <X className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={orderSearch}
                        onChange={e => setOrderSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Search by order number..."
                      />
                      {orderSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                      )}
                    </div>
                    {showOrderDropdown && orderResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {orderResults.map(o => (
                          <button
                            key={o.id}
                            onClick={() => handleSelectOrder(o)}
                            className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800">{o.order_number}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                o.payment_status === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>{o.payment_status}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {o.customer_name} · {CS_STATUS_LABELS[o.cs_status] ?? o.cs_status} · ৳{o.total_amount.toLocaleString('en-BD')}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {showOrderDropdown && orderResults.length === 0 && !orderSearching && orderSearch.length > 1 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 px-3 py-4 text-center text-sm text-gray-400">
                        No orders found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Bank Deposit Details</p>
            <p className="text-xs text-gray-400 mb-4">These can be filled in later when funds are deposited — separate from the revenue date.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Bank Deposit Date</label>
                  <input
                    type="date"
                    value={form.bank_deposit_date ?? ''}
                    onChange={e => setForm(f => ({ ...f, bank_deposit_date: e.target.value || null }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Bank Deposit Reference</label>
                  <input
                    type="text"
                    value={form.bank_deposit_reference ?? ''}
                    onChange={e => setForm(f => ({ ...f, bank_deposit_reference: e.target.value || null }))}
                    className={inputCls}
                    placeholder="Transaction ID, ref #..."
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {isEditing ? 'Save Changes' : 'Add Entry'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
