import React, { useEffect, useState } from 'react';
import { X, ExternalLink, CheckCircle, AlertCircle, Clock, Loader2, ChevronDown, ChevronUp, Save, RefreshCw, Info } from 'lucide-react';
import { CollectionRecord, CollectionLineItem } from './types';
import {
  fetchCollectionRecord,
  fetchCollectionLineItems,
  applyCollectionRecord,
  reapplyCollectionRecord,
  updateCollectionRecordBank,
} from './collectionService';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

const PROVIDER_LABELS: Record<string, string> = {
  pathao: 'Pathao',
  bkash: 'Bkash',
  ssl_commerz: 'SSL Commerz',
};

const PROVIDER_COLORS: Record<string, string> = {
  pathao: 'bg-green-100 text-green-700 border-green-200',
  bkash: 'bg-pink-100 text-pink-700 border-pink-200',
  ssl_commerz: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
  verified: 'bg-green-100 text-green-700',
  discrepancy: 'bg-amber-100 text-amber-700',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
};

interface Props {
  recordId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function CollectionRecordDetail({ recordId, onClose, onUpdated }: Props) {
  const { user } = useAuth();
  const [record, setRecord] = useState<CollectionRecord | null>(null);
  const [lineItems, setLineItems] = useState<CollectionLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [reapplying, setReapplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [reapplyResult, setReapplyResult] = useState<{ ordersUpdated: number; paidStatusSet: number } | null>(null);
  const [bankOpen, setBankOpen] = useState(false);

  const [bankRef, setBankRef] = useState('');
  const [bankDate, setBankDate] = useState('');
  const [bankAmount, setBankAmount] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [rec, items] = await Promise.all([
      fetchCollectionRecord(recordId),
      fetchCollectionLineItems(recordId),
    ]);
    setRecord(rec);
    setLineItems(items);
    if (rec) {
      setBankRef(rec.bank_reference ?? '');
      setBankDate(rec.bank_transfer_date ?? '');
      setBankAmount(rec.bank_transfer_amount?.toString() ?? '');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [recordId]);

  const matchedItems = lineItems.filter(i => i.match_status === 'matched');
  const unmatchedItems = lineItems.filter(i => i.match_status === 'not_found');
  const unappliedCount = matchedItems.filter(i => !i.applied).length;

  const handleApplyAll = async () => {
    setApplying(true);
    setApplyError(null);
    try {
      await applyCollectionRecord(recordId, user?.id ?? null);
      await loadData();
      onUpdated();
    } catch (err: any) {
      setApplyError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const handleReapply = async () => {
    setReapplying(true);
    setApplyError(null);
    setReapplyResult(null);
    try {
      const result = await reapplyCollectionRecord(recordId, user?.id ?? null);
      setReapplyResult({ ordersUpdated: result.ordersUpdated, paidStatusSet: result.paidStatusSet });
      await loadData();
      onUpdated();
    } catch (err: any) {
      setApplyError(err.message);
    } finally {
      setReapplying(false);
    }
  };

  const handleApplySingle = async (lineItemId: string, orderId: string) => {
    try {
      await supabase.from('collection_line_items')
        .update({ applied: false })
        .eq('id', lineItemId);
      await applyCollectionRecord(recordId, user?.id ?? null);
      await loadData();
      onUpdated();
    } catch (err: any) {
      setApplyError(err.message);
    }
  };

  const handleSaveBank = async () => {
    setSavingBank(true);
    try {
      await updateCollectionRecordBank(
        recordId,
        bankRef || null,
        bankDate || null,
        bankAmount ? parseFloat(bankAmount) : null
      );
      await loadData();
    } finally {
      setSavingBank(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-3xl bg-white shadow-2xl z-40 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-3xl bg-white shadow-2xl z-40 flex items-center justify-center">
        <p className="text-gray-500">Record not found</p>
      </div>
    );
  }

  const bankDiscrepancy = record.bank_transfer_amount
    ? record.bank_transfer_amount - record.total_disbursed
    : null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {record.provider_type && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${PROVIDER_COLORS[record.provider_type] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {PROVIDER_LABELS[record.provider_type] ?? record.provider_type}
              </span>
            )}
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {record.invoice_number ? `Invoice #${record.invoice_number}` : 'Collection Record'}
              </h2>
              <p className="text-xs text-gray-400">{record.invoice_date}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[record.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {record.status}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">৳{record.total_disbursed.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</div>
                <div className="text-xs text-gray-500 mt-0.5">Total Payout</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-700">{matchedItems.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Matched Orders</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{unmatchedItems.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Unmatched</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-600">৳{(record.payment_gateway_charges ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</div>
                <div className="text-xs text-gray-500 mt-0.5">Gateway Charges</div>
              </div>
            </div>
          </div>

          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              {unappliedCount > 0 ? (
                <span className="text-blue-800 font-medium">{unappliedCount} matched orders not yet applied</span>
              ) : (
                <span className="text-gray-500">All matched orders applied</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unappliedCount > 0 && (
                <button
                  onClick={handleApplyAll}
                  disabled={applying || reapplying}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                >
                  {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Apply All
                </button>
              )}
              <button
                onClick={handleReapply}
                disabled={applying || reapplying}
                title="Reset all applied flags and re-run the payment resolver with the latest logic"
                className="flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {reapplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Re-Apply
              </button>
            </div>
          </div>

          {reapplyResult && (
            <div className="mx-6 mt-4 flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">
                Re-applied: {reapplyResult.ordersUpdated} orders updated, {reapplyResult.paidStatusSet} newly marked as Paid.
              </p>
            </div>
          )}

          {applyError && (
            <div className="mx-6 mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{applyError}</p>
            </div>
          )}

          <div className="px-6 py-4">
            {matchedItems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Matched Orders</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Order</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Customer</th>
                        {record.provider_type === 'pathao' && (
                          <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Type</th>
                        )}
                        <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Collected</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Del. Charge</th>
                        {record.payment_gateway_charges > 0 && (
                          <th className="px-3 py-2.5 text-right font-semibold text-gray-600">GW Charge</th>
                        )}
                        <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Conf.</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Applied</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-gray-600"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchedItems.map(item => (
                        <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-gray-800">
                              {item.order?.order_number ?? '—'}
                            </div>
                            {item.order?.woo_order_id && (
                              <div className="text-gray-400">#{item.order.woo_order_id}</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 max-w-[100px] truncate">
                            {item.customer?.full_name ?? '—'}
                          </td>
                          {record.provider_type === 'pathao' && (
                            <td className="px-3 py-2.5 text-center">
                              {item.invoice_type && (
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${item.invoice_type === 'delivery' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {item.invoice_type}
                                </span>
                              )}
                            </td>
                          )}
                          <td className="px-3 py-2.5 text-right font-medium text-gray-900">
                            ৳{item.collected_amount.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-600">
                            ৳{item.delivery_charge.toFixed(2)}
                          </td>
                          {record.payment_gateway_charges > 0 && (
                            <td className="px-3 py-2.5 text-right text-gray-600">
                              ৳{(item.gateway_charge ?? 0).toFixed(2)}
                            </td>
                          )}
                          <td className="px-3 py-2.5 text-center">
                            {item.match_confidence && (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${CONFIDENCE_COLORS[item.match_confidence] ?? 'bg-gray-100 text-gray-600'}`}>
                                {item.match_confidence}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {item.applied ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <Clock className="w-4 h-4 text-amber-400" />
                              )}
                              {item.applied && item.not_paid_reason && (
                                <span title={item.not_paid_reason} className="cursor-help">
                                  <Info className="w-3.5 h-3.5 text-amber-500" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {item.order && (
                              <a
                                href={`/fulfillment/orders/${item.order_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {unmatchedItems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-red-700 mb-3">Unmatched Rows</h3>
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-red-50 border-b border-red-200">
                        <th className="px-3 py-2.5 text-left font-semibold text-red-600">Identifier</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-red-600">Extracted Order ID</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-red-600">Amount</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-red-600">Del. Charge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unmatchedItems.map(item => (
                        <tr key={item.id} className="border-b border-red-100 last:border-0">
                          <td className="px-3 py-2.5 font-mono text-red-800 max-w-[180px] truncate">
                            {item.transaction_id ?? item.consignment_id ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 text-red-700">{item.woo_order_id ?? 'Not extracted'}</td>
                          <td className="px-3 py-2.5 text-right text-red-900">৳{item.collected_amount.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right text-red-700">৳{item.delivery_charge.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setBankOpen(o => !o)}
              >
                <span>Bank Reconciliation</span>
                {bankOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {bankOpen && (
                <div className="px-4 pb-4 border-t border-gray-100 space-y-3">
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Invoice Payout</div>
                      <div className="text-base font-bold text-gray-900">৳{record.total_disbursed.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className={`rounded-lg p-3 ${record.bank_transfer_amount ? (bankDiscrepancy === 0 ? 'bg-green-50' : 'bg-amber-50') : 'bg-gray-50'}`}>
                      <div className="text-xs text-gray-500">Bank Transfer</div>
                      <div className="text-base font-bold text-gray-900">
                        {record.bank_transfer_amount ? `৳${record.bank_transfer_amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}` : '—'}
                      </div>
                      {bankDiscrepancy !== null && bankDiscrepancy !== 0 && (
                        <div className="text-xs text-amber-700 mt-0.5">
                          Difference: ৳{Math.abs(bankDiscrepancy).toFixed(2)}
                        </div>
                      )}
                      {bankDiscrepancy === 0 && (
                        <div className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Matched
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Bank Reference</label>
                      <input value={bankRef} onChange={e => setBankRef(e.target.value)} className={inputCls} placeholder="e.g. TXN-2026-001" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Transfer Date</label>
                      <input type="date" value={bankDate} onChange={e => setBankDate(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Bank Transfer Amount</label>
                    <input type="number" value={bankAmount} onChange={e => setBankAmount(e.target.value)} className={inputCls} placeholder="0.00" step="0.01" />
                  </div>
                  <button
                    onClick={handleSaveBank}
                    disabled={savingBank}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 text-white rounded-lg text-xs font-medium hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
                  >
                    {savingBank ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Bank Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
