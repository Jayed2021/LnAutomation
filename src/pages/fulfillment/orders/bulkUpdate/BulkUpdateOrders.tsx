import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, FileText, CheckCircle2, XCircle,
  AlertTriangle, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { parseCsvText, buildPreviewRows } from './parser';
import { fetchOrdersByWooIds, applyBulkUpdate, ApplyResult } from './service';
import { PreviewRow } from './types';

type Step = 'upload' | 'preview' | 'done';

const STATUS_LABELS: Record<string, string> = {
  delivered: 'Delivered',
  shipped: 'Shipped',
  partial_delivery: 'Partial Delivered',
  late_delivery: 'Late Delivery',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

function StatusPill({ status }: { status: PreviewRow['status'] }) {
  if (status === 'valid') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <CheckCircle2 className="w-3 h-3" /> Valid
    </span>
  );
  if (status === 'not_found') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <XCircle className="w-3 h-3" /> Not Found
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <AlertTriangle className="w-3 h-3" /> Skipped
    </span>
  );
}

function CsStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400">—</span>;
  const colors: Record<string, string> = {
    shipped: 'bg-blue-100 text-blue-700',
    partial_delivery: 'bg-amber-100 text-amber-700',
    late_delivery: 'bg-orange-100 text-orange-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  const cls = colors[status] ?? 'bg-gray-100 text-gray-600';
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default function BulkUpdateOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);
  const [fileName, setFileName] = useState('');

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file.');
      return;
    }
    setError(null);
    setLoading(true);
    setFileName(file.name);
    try {
      const text = await file.text();
      const csvRows = parseCsvText(text);
      if (csvRows.length === 0) {
        setError('No data rows found in CSV. Make sure the file has headers and data rows.');
        return;
      }

      const wooIds = csvRows
        .map(r => parseInt(r.rawOrderId, 10))
        .filter(n => !isNaN(n));

      const dbOrders = await fetchOrdersByWooIds(wooIds);
      const rows = buildPreviewRows(csvRows, dbOrders);
      setPreviewRows(rows);
      setStep('preview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process file.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleConfirm = async () => {
    setApplying(true);
    try {
      const result = await applyBulkUpdate(previewRows, user?.id ?? null);
      setApplyResult(result);
      setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to apply updates.');
    } finally {
      setApplying(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setPreviewRows([]);
    setApplyResult(null);
    setError(null);
    setFileName('');
    setShowInvalid(false);
  };

  const validRows = previewRows.filter(r => r.status === 'valid');
  const skippedRows = previewRows.filter(r => r.status !== 'valid');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/fulfillment/orders')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Update Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload a CSV to update order statuses and courier information in bulk</p>
        </div>
      </div>

      {step === 'upload' && (
        <div className="max-w-2xl">
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
              dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-gray-600 font-medium">Processing file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-blue-500" />
                </div>
                <div>
                  <p className="text-gray-900 font-semibold text-lg">Drop your CSV file here</p>
                  <p className="text-gray-500 text-sm mt-1">or click to browse</p>
                </div>
                <p className="text-xs text-gray-400 mt-1">Accepts .csv files only</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-6 bg-gray-50 border border-gray-100 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> CSV Column Reference
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Upload your standard order export CSV. The following columns are read automatically by their header names:
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs text-gray-600 w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['Column header', 'Example value', 'What gets updated'].map(h => (
                      <th key={h} className="text-left py-1.5 pr-6 font-semibold text-gray-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['ORDER ID', '1964786', 'Matches order by WooCommerce ID'],
                    ['ORDER STATUS', 'Completed', 'Order status in the system'],
                    ['ECR', 'DL010326YM2BNX', 'Courier tracking number'],
                    ['Delivery Method', 'Pathao', 'Courier company'],
                    ['Cost of delivery', '80', 'Delivery charge'],
                    ['Collected amount', '1250', 'Amount collected from customer'],
                  ].map(([col, ex, desc]) => (
                    <tr key={col}>
                      <td className="py-1.5 pr-6 font-mono font-medium text-gray-800">{col}</td>
                      <td className="py-1.5 pr-6 text-gray-500">{ex}</td>
                      <td className="py-1.5 pr-6 text-gray-500">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-1 text-xs text-gray-500">
              <p><span className="font-medium text-gray-700">Updatable ORDER STATUS values:</span> Completed, Shipped, Partial delivered, Late delivery, Cancelled, Returned</p>
              <p><span className="font-medium text-gray-700">Other status values</span> (e.g. Confirmed, Processing) will be silently skipped — the row won't be updated.</p>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <FileText className="w-4 h-4" />
              <span className="font-medium">{fileName}</span>
              <span className="text-gray-400">•</span>
              <span>{previewRows.length} rows parsed</span>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
            >
              Upload different file
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Will Update</p>
              <p className="text-3xl font-bold text-green-700 mt-1">{validRows.length}</p>
              <p className="text-xs text-green-600 mt-0.5">orders ready to update</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Will Skip</p>
              <p className="text-3xl font-bold text-gray-600 mt-1">{skippedRows.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">rows skipped or invalid</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total Rows</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">{previewRows.length}</p>
              <p className="text-xs text-blue-600 mt-0.5">rows in CSV</p>
            </div>
          </div>

          {validRows.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <h3 className="text-sm font-semibold text-gray-800">Orders to Update ({validRows.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Order ID', 'Recipient', 'Current Status', 'New Status', 'Courier', 'Tracking (ECR)', 'Delivery Cost', 'Collected'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {validRows.map(row => (
                      <tr key={row.rowIndex} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-gray-900 font-medium">{row.rawOrderId}</td>
                        <td className="px-4 py-3 text-gray-700 max-w-[140px] truncate">{row.rawRecipientName || <span className="text-gray-400">—</span>}</td>
                        <td className="px-4 py-3">
                          <CsStatusBadge status={row.currentCsStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <CsStatusBadge status={row.mappedCsStatus} />
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.mappedCourierCompany ?? <span className="text-gray-400">—</span>}</td>
                        <td className="px-4 py-3 font-mono text-gray-600 text-xs">{row.rawEcr || <span className="text-gray-400">—</span>}</td>
                        <td className="px-4 py-3 text-gray-700">{row.costOfDelivery != null ? row.costOfDelivery : <span className="text-gray-400">—</span>}</td>
                        <td className="px-4 py-3 text-gray-700">{row.collectedAmount != null ? row.collectedAmount : <span className="text-gray-400">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {skippedRows.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                className="w-full px-5 py-3.5 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                onClick={() => setShowInvalid(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-800">Skipped Rows ({skippedRows.length})</h3>
                  <span className="text-xs text-gray-400">These rows will not be updated</span>
                </div>
                {showInvalid ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showInvalid && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Row', 'Order ID', 'Status in CSV', 'Reason'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {skippedRows.map(row => (
                        <tr key={row.rowIndex} className="bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-400 text-xs">{row.rowIndex}</td>
                          <td className="px-4 py-3 font-mono text-gray-700">{row.rawOrderId}</td>
                          <td className="px-4 py-3 text-gray-600">{row.rawStatus || <span className="text-gray-400">—</span>}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <StatusPill status={row.status} />
                              {row.statusReason && <span className="text-xs text-gray-500">{row.statusReason}</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={applying || validRows.length === 0}
              className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {applying && <RefreshCw className="w-4 h-4 animate-spin" />}
              {applying ? 'Applying...' : `Confirm & Update ${validRows.length} Orders`}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && applyResult && (
        <div className="max-w-lg space-y-5">
          <div className={`rounded-xl p-6 ${applyResult.failed === 0 ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
            <div className="flex items-center gap-3 mb-4">
              {applyResult.failed === 0
                ? <CheckCircle2 className="w-8 h-8 text-green-500" />
                : <AlertTriangle className="w-8 h-8 text-amber-500" />
              }
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {applyResult.failed === 0 ? 'Update Complete' : 'Update Completed with Errors'}
                </h2>
                <p className="text-sm text-gray-600">
                  {applyResult.updated} updated, {applyResult.failed} failed
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{applyResult.updated}</p>
                <p className="text-xs text-gray-500 mt-0.5">Orders Updated</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-500">{applyResult.failed}</p>
                <p className="text-xs text-gray-500 mt-0.5">Failed</p>
              </div>
            </div>
          </div>

          {applyResult.errors.length > 0 && (
            <div className="bg-white border border-red-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-700 mb-2">Errors</h3>
              <ul className="space-y-1">
                {applyResult.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-600">{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Upload Another File
            </button>
            <button
              onClick={() => navigate('/fulfillment/orders')}
              className="px-4 py-2 text-sm bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors"
            >
              Go to Orders
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
