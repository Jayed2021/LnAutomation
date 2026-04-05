import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Upload, AlertTriangle, Search, Filter,
  RefreshCw, ExternalLink, Clock, Truck
} from 'lucide-react';
import { CollectionRecord, OverdueOrder } from './collection/types';
import { fetchCollectionRecords, fetchOverdueOrders, fetchCollectionStats } from './collection/collectionService';
import { UploadInvoiceModal } from './collection/UploadInvoiceModal';
import { CollectionRecordDetail } from './collection/CollectionRecordDetail';
import { FirstTimeOpsPanel } from './collection/FirstTimeOpsPanel';
import { ManualRevenueTab } from './collection/ManualRevenueTab';
import { OrderCollectionTab } from './collection/OrderCollectionTab';
import { fetchManualRevenueTotalForMonth } from './collection/manualRevenueService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

/*
  ============================================================
  FIRST-TIME OPERATION FLAG
  ============================================================
  Set SHOW_FIRST_TIME_OPS = false to hide the bulk historical
  "Mark as Paid" panel once initial setup is complete.

  To fully remove this feature:
    1. Delete src/pages/finance/collection/FirstTimeOpsPanel.tsx
    2. Remove this comment block and the SHOW_FIRST_TIME_OPS constant below
    3. Remove the FirstTimeOpsPanel import line above
    4. Remove the {SHOW_FIRST_TIME_OPS && <FirstTimeOpsPanel ... />} JSX block
    5. Optionally remove the service functions previewBulkMarkHistoricalOrdersAsPaid
       and bulkMarkHistoricalOrdersAsPaid from collectionService.ts
  ============================================================
*/
const SHOW_FIRST_TIME_OPS = false;

const PROVIDER_LABELS: Record<string, string> = {
  pathao: 'Pathao',
  bkash: 'Bkash',
  ssl_commerz: 'SSL Commerz',
};

const PROVIDER_COLORS: Record<string, string> = {
  pathao: 'bg-green-100 text-green-700',
  bkash: 'bg-pink-100 text-pink-700',
  ssl_commerz: 'bg-blue-100 text-blue-700',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  processing: 'bg-blue-100 text-blue-700',
  verified: 'bg-green-100 text-green-700',
  discrepancy: 'bg-amber-100 text-amber-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  verified: 'Verified',
  discrepancy: 'Discrepancy',
};

const CS_STATUS_LABELS: Record<string, string> = {
  delivered: 'Delivered',
  cancelled_cad: 'CAD',
  exchange: 'Exchange',
  exchange_returnable: 'EXR',
  partial_delivery: 'Partial Delivered',
};

type Tab = 'records' | 'overdue' | 'manual_revenue' | 'order_status';

export default function Collection() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const validTabs: Tab[] = ['records', 'overdue', 'manual_revenue', 'order_status'];
  const [tab, setTabState] = useState<Tab>(validTabs.includes(tabParam as Tab) ? (tabParam as Tab) : 'records');

  const setTab = (t: Tab) => {
    setTabState(t);
    setSearchParams({ tab: t }, { replace: true });
  };
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [overdueOrders, setOverdueOrders] = useState<OverdueOrder[]>([]);
  const [stats, setStats] = useState({ totalCollectedMonth: 0, totalGatewayChargesMonth: 0, unmatchedCount: 0 });
  const [otherRevenueMonth, setOtherRevenueMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [overdueLoading, setOverdueLoading] = useState(false);
  const [thresholdDays, setThresholdDays] = useState(14);
  const [overdueFetched, setOverdueFetched] = useState(false);

  const [showUpload, setShowUpload] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [filterProvider, setFilterProvider] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [overdueFilterPayment, setOverdueFilterPayment] = useState('');
  const [overdueFilterCourier, setOverdueFilterCourier] = useState('');

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const [recs, s, otherRev] = await Promise.all([
      fetchCollectionRecords(),
      fetchCollectionStats(),
      fetchManualRevenueTotalForMonth(now.getFullYear(), now.getMonth() + 1),
    ]);
    setRecords(recs);
    setStats(s);
    setOtherRevenueMonth(otherRev);
    setLoading(false);
  }, []);

  const loadOverdue = useCallback(async () => {
    setOverdueLoading(true);
    const orders = await fetchOverdueOrders(thresholdDays);
    setOverdueOrders(orders);
    setOverdueFetched(true);
    setOverdueLoading(false);
  }, [thresholdDays]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  useEffect(() => {
    if (tab === 'overdue' && !overdueFetched) {
      loadOverdue();
    }
  }, [tab, overdueFetched, loadOverdue]);

  const filteredRecords = records.filter(r => {
    if (filterProvider && r.provider_type !== filterProvider) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.invoice_number?.toLowerCase().includes(q) && !r.bank_reference?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredOverdue = overdueOrders.filter(o => {
    if (overdueFilterPayment && o.payment_method !== overdueFilterPayment) return false;
    if (overdueFilterCourier && o.courier_company !== overdueFilterCourier) return false;
    return true;
  });

  const uniqueCouriers = [...new Set(overdueOrders.map(o => o.courier_company).filter(Boolean))];
  const uniquePaymentMethods = [...new Set(overdueOrders.map(o => o.payment_method).filter(Boolean))];

  const overdueCount = overdueOrders.length;
  const criticalOverdue = overdueOrders.filter(o => o.days_overdue >= 30).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cash In</h1>
            <p className="text-sm text-gray-500 mt-0.5">Invoice reconciliation and payment collection tracking</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Invoice
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 mb-1">Collected This Month</div>
            <div className="text-xl font-bold text-gray-900">৳{stats.totalCollectedMonth.toLocaleString('en-BD', { minimumFractionDigits: 0 })}</div>
            <div className="text-xs text-gray-400 mt-0.5">From verified invoices</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 mb-1">Other Revenue</div>
            <div className="text-xl font-bold text-emerald-700">৳{otherRevenueMonth.toLocaleString('en-BD', { minimumFractionDigits: 0 })}</div>
            <div className="text-xs text-gray-400 mt-0.5">Manual entries this month</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 mb-1">Gateway Charges</div>
            <div className="text-xl font-bold text-amber-700">৳{stats.totalGatewayChargesMonth.toLocaleString('en-BD', { minimumFractionDigits: 0 })}</div>
            <div className="text-xs text-gray-400 mt-0.5">Bkash &amp; SSL TDR this month</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 mb-1">Unmatched Rows</div>
            <div className={`text-xl font-bold ${stats.unmatchedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.unmatchedCount}</div>
            <div className="text-xs text-gray-400 mt-0.5">Orders not found in system</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 mb-1">Overdue Orders</div>
            <div className={`text-xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {overdueFetched ? overdueCount : '—'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {overdueFetched && criticalOverdue > 0 ? `${criticalOverdue} critical (30+ days)` : `Unpaid after ${thresholdDays} days`}
            </div>
          </div>
        </div>

        {SHOW_FIRST_TIME_OPS && (
          <div className="mb-5">
            <FirstTimeOpsPanel onComplete={loadRecords} />
          </div>
        )}

        <div className="flex border-b border-gray-200 mb-5">
          <button
            onClick={() => setTab('records')}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'records' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Invoice Records
          </button>
          <button
            onClick={() => setTab('overdue')}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'overdue' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overdue Orders
            {overdueFetched && overdueCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">{overdueCount}</span>
            )}
          </button>
          <button
            onClick={() => setTab('manual_revenue')}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'manual_revenue' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Other Income
          </button>
          <button
            onClick={() => setTab('order_status')}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'order_status' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Order Status
          </button>
        </div>

        {tab === 'records' && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search invoice number or bank reference..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-sm focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterProvider}
                  onChange={e => setFilterProvider(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All Providers</option>
                  <option value="pathao">Pathao</option>
                  <option value="bkash">Bkash</option>
                  <option value="ssl_commerz">SSL Commerz</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="verified">Verified</option>
                  <option value="discrepancy">Discrepancy</option>
                </select>
                <button
                  onClick={loadRecords}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Upload className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No invoice records yet</p>
                <p className="text-xs mt-1">Upload a Pathao, Bkash, or SSL Commerz invoice to get started</p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Invoice
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Upload Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Provider</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Invoice #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Invoice Date</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Orders</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Matched</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Payout</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">GW Charges</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Bank Ref</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(record => (
                      <tr
                        key={record.id}
                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedRecordId(record.id)}
                      >
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(record.created_at).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          {record.provider_type ? (
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PROVIDER_COLORS[record.provider_type] ?? 'bg-gray-100 text-gray-600'}`}>
                              {PROVIDER_LABELS[record.provider_type] ?? record.provider_type}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">{record.courier_company}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">{record.invoice_number ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.invoice_date}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">{record.orders_total}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-sm font-medium text-green-700">{record.orders_matched}</span>
                            {record.unmatched_row_count > 0 && (
                              <span className="text-xs text-red-500">/ {record.unmatched_row_count} unmatched</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          ৳{record.total_disbursed.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-amber-700">
                          {(record.payment_gateway_charges ?? 0) > 0 ? `৳${(record.payment_gateway_charges ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{record.bank_reference ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[record.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABELS[record.status] ?? record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'overdue' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600">Overdue threshold:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={thresholdDays}
                    onChange={e => setThresholdDays(parseInt(e.target.value) || 14)}
                    className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                  <span className="text-xs text-gray-500">days</span>
                </div>
                <button
                  onClick={() => { setOverdueFetched(false); loadOverdue(); }}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply
                </button>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <select
                  value={overdueFilterPayment}
                  onChange={e => setOverdueFilterPayment(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white"
                >
                  <option value="">All Payment Methods</option>
                  {uniquePaymentMethods.map(pm => <option key={pm} value={pm!}>{pm}</option>)}
                </select>
                <select
                  value={overdueFilterCourier}
                  onChange={e => setOverdueFilterCourier(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white"
                >
                  <option value="">All Couriers</option>
                  {uniqueCouriers.map(c => <option key={c} value={c!}>{c}</option>)}
                </select>
              </div>
            </div>

            {overdueLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredOverdue.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No overdue orders</p>
                <p className="text-xs mt-1">All final-status orders have been collected or it's within the threshold period</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {filteredOverdue.length} Overdue Order{filteredOverdue.length !== 1 ? 's' : ''}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-100 rounded inline-block" /> 14–30 days</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded inline-block" /> 30+ days</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Order</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Payment Method</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Expected</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Collected</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Courier</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Tracking</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Days Overdue</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOverdue
                        .sort((a, b) => b.days_overdue - a.days_overdue)
                        .map(order => {
                          const isCritical = order.days_overdue >= 30;
                          const isWarning = order.days_overdue >= 14 && order.days_overdue < 30;
                          const rowBg = isCritical ? 'bg-red-50/50' : isWarning ? 'bg-amber-50/50' : '';
                          const expectedAmount = (order.total_receivable ?? order.total_amount) - (order.delivery_discount ?? 0);
                          return (
                            <tr key={order.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${rowBg}`}>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-800">{order.order_number}</div>
                                {order.woo_order_id && <div className="text-xs text-gray-400">#{order.woo_order_id}</div>}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-700">{order.customer_name}</div>
                                <div className="text-xs text-gray-400">{order.customer_phone}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                  {CS_STATUS_LABELS[order.cs_status] ?? order.cs_status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{order.payment_method ?? 'COD'}</td>
                              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                                ৳{expectedAmount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-600">
                                ৳{(order.collected_amount ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{order.courier_company ?? '—'}</td>
                              <td className="px-4 py-3 text-xs font-mono text-gray-500">{order.tracking_number ?? '—'}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isCritical ? 'bg-red-100 text-red-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                  <Clock className="w-3 h-3" />
                                  {order.days_overdue}d
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <a
                                  href={`/fulfillment/orders/${order.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-500 hover:text-blue-700 transition-colors"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'manual_revenue' && (
          <ManualRevenueTab userId={user?.id ?? null} />
        )}

        {tab === 'order_status' && (
          <OrderCollectionTab />
        )}
      </div>

      {showUpload && (
        <UploadInvoiceModal
          onClose={() => setShowUpload(false)}
          onSuccess={loadRecords}
        />
      )}

      {selectedRecordId && (
        <CollectionRecordDetail
          recordId={selectedRecordId}
          onClose={() => setSelectedRecordId(null)}
          onUpdated={loadRecords}
        />
      )}
    </div>
  );
}
