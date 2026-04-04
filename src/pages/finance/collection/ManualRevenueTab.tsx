import React, { useState, useCallback, useEffect } from 'react';
import {
  Plus, RefreshCw, Pencil, Trash2, ExternalLink, CircleDot, Filter
} from 'lucide-react';
import {
  ManualRevenueEntry,
  RevenueCategory,
  REVENUE_CATEGORY_LABELS,
  fetchManualRevenueEntries,
  deleteManualRevenueEntry,
} from './manualRevenueService';
import { ManualRevenueModal } from './ManualRevenueModal';

const CATEGORY_COLORS: Record<RevenueCategory, string> = {
  operational_revenue: 'bg-blue-100 text-blue-700',
  bank_transfer: 'bg-emerald-100 text-emerald-700',
  wholesale: 'bg-amber-100 text-amber-700',
};

const CS_STATUS_LABELS: Record<string, string> = {
  delivered: 'Delivered',
  cancelled_cad: 'CAD',
  exchange: 'Exchange',
  exchange_returnable: 'EXR',
  partial_delivery: 'Partial Delivered',
  shipped: 'Shipped',
  new_not_called: 'New',
};

interface Props {
  userId: string | null;
}

export function ManualRevenueTab({ userId }: Props) {
  const [entries, setEntries] = useState<ManualRevenueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<RevenueCategory | ''>('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<ManualRevenueEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchManualRevenueEntries(
      filterFrom || undefined,
      filterTo || undefined,
      filterCategory || undefined
    );
    setEntries(data);
    setLoading(false);
  }, [filterFrom, filterTo, filterCategory]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteManualRevenueEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const totalAmount = entries.reduce((s, e) => s + (e.amount ?? 0), 0);
  const pendingDeposit = entries.filter(e => !e.bank_deposit_date).length;
  const byCategory = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value as RevenueCategory | '')}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Categories</option>
            {(Object.keys(REVENUE_CATEGORY_LABELS) as RevenueCategory[]).map(k => (
              <option key={k} value={k}>{REVENUE_CATEGORY_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="From"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <button
          onClick={load}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
        <div className="ml-auto">
          <button
            onClick={() => { setEditEntry(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 mb-1">Total Revenue</div>
            <div className="text-lg font-bold text-gray-900">৳{totalAmount.toLocaleString('en-BD', { minimumFractionDigits: 0 })}</div>
            <div className="text-xs text-gray-400 mt-0.5">{entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}</div>
          </div>
          {(Object.keys(REVENUE_CATEGORY_LABELS) as RevenueCategory[]).filter(k => byCategory[k]).map(k => (
            <div key={k} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-medium text-gray-500 mb-1">{REVENUE_CATEGORY_LABELS[k]}</div>
              <div className="text-lg font-bold text-gray-900">৳{(byCategory[k] ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 0 })}</div>
              <div className="text-xs text-gray-400 mt-0.5">{entries.filter(e => e.category === k).length} entr{entries.filter(e => e.category === k).length !== 1 ? 'ies' : 'y'}</div>
            </div>
          ))}
          {pendingDeposit > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="text-xs font-medium text-amber-700 mb-1">Pending Bank Deposit</div>
              <div className="text-lg font-bold text-amber-800">{pendingDeposit}</div>
              <div className="text-xs text-amber-600 mt-0.5">No deposit date recorded</div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CircleDot className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No revenue entries yet</p>
            <p className="text-xs mt-1">Record operational revenue, bank transfers, or wholesale payments</p>
            <button
              onClick={() => { setEditEntry(null); setShowModal(true); }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add First Entry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Revenue Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Linked Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Bank Deposit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Recorded By</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => {
                  const hasBankDeposit = !!entry.bank_deposit_date;
                  return (
                    <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {new Date(entry.revenue_date).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${CATEGORY_COLORS[entry.category]}`}>
                          {REVENUE_CATEGORY_LABELS[entry.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 whitespace-nowrap">
                        ৳{entry.amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate">
                        {entry.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">
                        {entry.reference_number || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {entry.order ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`/fulfillment/orders/${entry.order_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                              onClick={e => e.stopPropagation()}
                            >
                              {entry.order.order_number}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              entry.order.payment_status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {entry.order.payment_status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasBankDeposit ? (
                          <div>
                            <div className="text-xs font-medium text-gray-700">
                              {new Date(entry.bank_deposit_date!).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            {entry.bank_deposit_reference && (
                              <div className="text-xs font-mono text-gray-500">{entry.bank_deposit_reference}</div>
                            )}
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {entry.creator?.full_name ?? entry.creator?.username ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditEntry(entry); setShowModal(true); }}
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-500"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteId === entry.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(entry.id)}
                                disabled={deletingId === entry.id}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                              >
                                {deletingId === entry.id ? '...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(entry.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-400 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ManualRevenueModal
          entry={editEntry}
          userId={userId}
          onClose={() => { setShowModal(false); setEditEntry(null); }}
          onSaved={load}
        />
      )}
    </div>
  );
}
