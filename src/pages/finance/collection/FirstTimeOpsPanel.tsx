/*
  ============================================================
  FIRST-TIME OPERATION PANEL — ADMIN ONLY
  ============================================================

  This panel provides a one-time bulk "Mark as Paid" operation
  for historical orders that existed before the collection system
  was set up.

  HOW TO DISABLE (keep code, just hide the panel):
    In Collection.tsx, change the constant at the top:
      const SHOW_FIRST_TIME_OPS = false;
    The panel will no longer render.

  HOW TO FULLY REMOVE (clean up for production / other deployments):
    1. Delete this file (FirstTimeOpsPanel.tsx)
    2. In Collection.tsx:
       a. Remove the line: const SHOW_FIRST_TIME_OPS = true;
       b. Remove the import: import { FirstTimeOpsPanel } from './collection/FirstTimeOpsPanel';
       c. Remove the JSX block: {SHOW_FIRST_TIME_OPS && <FirstTimeOpsPanel ... />}
    3. In collectionService.ts (optional cleanup):
       - Remove previewBulkMarkHistoricalOrdersAsPaid()
       - Remove bulkMarkHistoricalOrdersAsPaid()
       - Remove BulkMarkPreviewResult and BulkMarkResult interfaces

  INTENDED USE:
    Run this once per business deployment to settle historical
    orders before the collection tracking system went live.
    Set a cutoff date equal to the go-live date of the collection
    system, then Preview → Execute.
  ============================================================
*/

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Loader2, CheckCircle, Search } from 'lucide-react';
import { previewBulkMarkHistoricalOrdersAsPaid, bulkMarkHistoricalOrdersAsPaid, BulkMarkPreviewResult, BulkMarkResult } from './collectionService';
import { useAuth } from '../../../contexts/AuthContext';

const CS_STATUS_LABELS: Record<string, string> = {
  delivered: 'Delivered',
  cancelled_cad: 'CAD',
  exchange: 'Exchange',
  exchange_returnable: 'EXR',
  partial_delivery: 'Partial Delivered',
};

interface Props {
  onComplete: () => void;
}

export function FirstTimeOpsPanel({ onComplete }: Props) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [cutoffDate, setCutoffDate] = useState('2026-03-01');
  const [previewing, setPreviewing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [preview, setPreview] = useState<BulkMarkPreviewResult | null>(null);
  const [result, setResult] = useState<BulkMarkResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    setPreviewing(true);
    setError(null);
    setPreview(null);
    setResult(null);
    setConfirmed(false);
    try {
      const data = await previewBulkMarkHistoricalOrdersAsPaid(cutoffDate);
      setPreview(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load preview');
    } finally {
      setPreviewing(false);
    }
  };

  const handleExecute = async () => {
    if (!confirmed || !preview) return;
    setExecuting(true);
    setError(null);
    try {
      const res = await bulkMarkHistoricalOrdersAsPaid(cutoffDate, user?.id ?? null);
      setResult(res);
      setPreview(null);
      setConfirmed(false);
      onComplete();
    } catch (err: any) {
      setError(err.message ?? 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50/60 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="text-sm font-semibold text-amber-900">First-Time Operation: Bulk Mark Historical Orders as Paid</span>
            <span className="ml-2 text-xs text-amber-700 font-normal hidden sm:inline">Admin only — one-time use</span>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-amber-600 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-amber-600 shrink-0" />
        }
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-amber-200 pt-4 space-y-4">
          <p className="text-xs text-amber-900 leading-relaxed">
            Use this tool <span className="font-semibold">once</span> to mark historical final-status orders as paid before the collection system was in place.
            Orders with <span className="font-semibold">Collected Amount &gt; 0</span> (Delivered, Exchange, EXR, Partial Delivered) and orders with <span className="font-semibold">Delivery Charge &gt; 0</span> (CAD) will be marked paid.
            The date comparison is against the <span className="font-semibold">WooCommerce order date</span>.
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-amber-900 mb-1">Mark orders created before (WooCommerce Order Date)</label>
              <input
                type="date"
                value={cutoffDate}
                onChange={e => { setCutoffDate(e.target.value); setPreview(null); setResult(null); setConfirmed(false); }}
                className="px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white w-44"
              />
            </div>
            <button
              onClick={handlePreview}
              disabled={previewing || !cutoffDate}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:bg-amber-300 transition-colors"
            >
              {previewing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Search className="w-3.5 h-3.5" />
              }
              {previewing ? 'Loading...' : 'Preview'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-900">Operation Complete</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
                  <div className="text-2xl font-bold text-green-700">{result.markedCount}</div>
                  <div className="text-xs text-green-600 mt-0.5">Marked as Paid</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
                  <div className="text-2xl font-bold text-gray-500">{result.skippedCount}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Skipped (no collection data)</div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-semibold text-red-800 mb-1">Errors ({result.errors.length})</p>
                  {result.errors.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-xs text-red-700">• {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {preview && !result && (
            <div className="space-y-3">
              <div className="p-4 bg-white border border-amber-200 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-gray-700">
                  Preview — Orders before <span className="font-mono text-amber-800">{cutoffDate}</span>
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
                    <div className="text-xl font-bold text-amber-800">{preview.eligibleCount}</div>
                    <div className="text-xs text-amber-700 mt-0.5">Will be Marked Paid</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                    <div className="text-xl font-bold text-blue-700">{preview.nonCadWithCollected}</div>
                    <div className="text-xs text-blue-600 mt-0.5">With Collected Amount</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                    <div className="text-xl font-bold text-gray-700">{preview.cadWithDeliveryCharge}</div>
                    <div className="text-xs text-gray-500 mt-0.5">CAD with Delivery Charge</div>
                  </div>
                </div>

                {preview.alreadyPaidCount > 0 && (
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold">{preview.alreadyPaidCount}</span> orders in this date range are already marked paid and will be skipped.
                  </p>
                )}

                {Object.keys(preview.byStatus).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Breakdown by Status</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(preview.byStatus).map(([status, count]) => (
                        <span key={status} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                          {CS_STATUS_LABELS[status] ?? status}
                          <span className="font-bold text-gray-900">{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {preview.eligibleCount === 0 && (
                  <p className="text-xs text-gray-500 italic">No eligible orders found before this date. Either all are already paid, or none have collected amounts / delivery charges recorded.</p>
                )}
              </div>

              {preview.eligibleCount > 0 && (
                <div className="p-3 bg-white border border-amber-200 rounded-lg space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={e => setConfirmed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-400"
                    />
                    <span className="text-xs text-gray-700">
                      I understand this will mark <span className="font-semibold">{preview.eligibleCount} orders</span> as paid. This action adds an activity log entry to each order and cannot be automatically reversed.
                    </span>
                  </label>

                  <button
                    onClick={handleExecute}
                    disabled={!confirmed || executing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:bg-amber-300 transition-colors"
                  >
                    {executing
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Executing...</>
                      : `Execute — Mark ${preview.eligibleCount} Orders as Paid`
                    }
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
