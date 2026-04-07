import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, ChevronRight, Loader2, Download, RefreshCw, Layers } from 'lucide-react';
import { ProviderType, ParseResult, MatchResult, DuplicateInfo, BulkParseResult, BulkApplyResult } from './types';
import { detectProvider, parseInvoiceCSV, isBulkPathaoFormat } from './collectionParser';
import { matchParsedRows } from './collectionMatcher';
import { saveCollectionRecord, applyCollectionRecord, checkDuplicateCollectionRecord, checkBulkDuplicates, saveAndApplyBulkCollectionRecords } from './collectionService';
import { useAuth } from '../../../contexts/AuthContext';

type Step = 'upload' | 'preview' | 'matching' | 'bulk_preview' | 'bulk_matching' | 'done';

const PROVIDER_LABELS: Record<ProviderType, string> = {
  pathao: 'Pathao',
  bkash: 'Bkash',
  ssl_commerz: 'SSL Commerz',
};

const PROVIDER_COLORS: Record<ProviderType, string> = {
  pathao: 'bg-green-100 text-green-700 border-green-200',
  bkash: 'bg-pink-100 text-pink-700 border-pink-200',
  ssl_commerz: 'bg-blue-100 text-blue-700 border-blue-200',
};

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

function exportUnmatchedCSV(rows: { transaction_id: string | null; consignment_id: string | null; woo_order_id: number | null; collected_amount: number; delivery_charge: number; gateway_charge: number; payout: number }[], provider: ProviderType) {
  if (rows.length === 0) return;

  const headers = ['identifier', 'woo_order_id', 'collected_amount', 'delivery_charge', 'gateway_charge', 'payout'];
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      r.transaction_id ?? r.consignment_id ?? '',
      r.woo_order_id ?? '',
      r.collected_amount,
      r.delivery_charge,
      r.gateway_charge,
      r.payout,
    ].join(','))
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `unmatched_${PROVIDER_LABELS[provider]}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function UploadInvoiceModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);

  const [fileName, setFileName] = useState('');
  const [fileText, setFileText] = useState('');
  const [detectedProvider, setDetectedProvider] = useState<ProviderType | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [bankDepositAmount, setBankDepositAmount] = useState('');
  const [bankDepositReference, setBankDepositReference] = useState('');
  const [isBulk, setIsBulk] = useState(false);

  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const [parsing, setParsing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ ordersUpdated: number; paidStatusSet: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  const [bulkParseResult, setBulkParseResult] = useState<BulkParseResult | null>(null);
  const [bulkGroupDates, setBulkGroupDates] = useState<string[]>([]);
  const [bulkMatchResults, setBulkMatchResults] = useState<MatchResult[]>([]);
  const [bulkDuplicates, setBulkDuplicates] = useState<Map<string, string>>(new Map());
  const [bulkApplyResult, setBulkApplyResult] = useState<BulkApplyResult | null>(null);
  const [bulkMatchingProgress, setBulkMatchingProgress] = useState<number>(0);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setFileText(text);
      setFileName(file.name);
      const detected = detectProvider(text);
      setDetectedProvider(detected);
      setSelectedProvider(detected);
      setIsBulk(detected === 'pathao' && isBulkPathaoFormat(text));
      setError(null);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleParse = async () => {
    const provider = selectedProvider;
    if (!fileText || !provider) return;
    setParsing(true);
    setError(null);
    try {
      const result = parseInvoiceCSV(fileText, provider);
      if ('isBulk' in result) {
        setBulkParseResult(result);
        setBulkGroupDates(result.groups.map(g => g.suggestedDate));
        setBulkMatchResults([]);
        setBulkDuplicates(new Map());
        setBulkApplyResult(null);
        setStep('bulk_preview');
      } else {
        setParseResult(result);
        if (result.suggestedBankDeposit != null && !bankDepositAmount) {
          setBankDepositAmount(result.suggestedBankDeposit.toFixed(2));
        }
        setStep('preview');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleMatch = async () => {
    if (!parseResult || !selectedProvider) return;
    setMatching(true);
    setError(null);
    setDuplicateInfo(null);
    setDuplicateDismissed(false);
    try {
      const result = await matchParsedRows(parseResult.rows);
      setMatchResult(result);
      const dupInfo = await checkDuplicateCollectionRecord(result.matched, selectedProvider);
      setDuplicateInfo(dupInfo);
      setStep('matching');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMatching(false);
    }
  };

  const handleBulkMatch = async () => {
    if (!bulkParseResult || !selectedProvider) return;
    setMatching(true);
    setError(null);
    setBulkMatchingProgress(0);
    try {
      const results: MatchResult[] = [];
      for (let i = 0; i < bulkParseResult.groups.length; i++) {
        const group = bulkParseResult.groups[i];
        const result = await matchParsedRows(group.parseResult.rows);
        results.push(result);
        setBulkMatchingProgress(i + 1);
      }
      setBulkMatchResults(results);

      const invoiceNumbers = bulkParseResult.groups.map(g => g.invoiceNumber);
      const dupes = await checkBulkDuplicates(invoiceNumbers, selectedProvider);
      setBulkDuplicates(dupes);

      setStep('bulk_matching');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMatching(false);
    }
  };

  const isUpdateMode = duplicateInfo !== null && !duplicateDismissed;

  const handleApply = async () => {
    if (!matchResult || !selectedProvider || !parseResult) return;
    setApplying(true);
    setError(null);
    try {
      const replaceRecordId = isUpdateMode ? duplicateInfo!.existingRecordId : null;
      const recordId = await saveCollectionRecord(
        selectedProvider,
        invoiceDate,
        invoiceNumber || null,
        parseResult,
        matchResult.matched,
        matchResult.unmatched,
        user?.id ?? null,
        bankDepositAmount ? parseFloat(bankDepositAmount) : null,
        bankDepositReference || null,
        replaceRecordId,
        user?.id ?? null
      );
      const result = await applyCollectionRecord(recordId, user?.id ?? null);
      setApplyResult(result);
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const handleBulkApply = async () => {
    if (!bulkParseResult || !selectedProvider || bulkMatchResults.length === 0) return;
    setApplying(true);
    setError(null);
    try {
      const groups = bulkParseResult.groups.map((g, i) => ({
        invoiceNumber: g.invoiceNumber,
        invoiceDate: bulkGroupDates[i] ?? g.suggestedDate,
        parseResult: g.parseResult,
        matchResult: bulkMatchResults[i],
      }));
      const result = await saveAndApplyBulkCollectionRecords(groups, selectedProvider, user?.id ?? null);
      setBulkApplyResult(result);
      setApplyResult({
        ordersUpdated: result.ordersUpdated,
        paidStatusSet: result.paidStatusSet,
        errors: result.groupErrors.map(e => `${e.invoiceNumber}: ${e.error}`),
      });
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  const effectiveProvider = selectedProvider;

  const singleStepLabels: Step[] = ['upload', 'preview', 'matching', 'done'];
  const bulkStepLabels: Step[] = ['upload', 'bulk_preview', 'bulk_matching', 'done'];
  const activeStepList = isBulk ? bulkStepLabels : singleStepLabels;

  const stepDisplayName = (s: Step) => {
    if (s === 'bulk_preview') return 'Preview';
    if (s === 'bulk_matching') return 'Match';
    if (s === 'matching') return 'Match';
    if (s === 'preview') return 'Preview';
    if (s === 'upload') return 'Upload';
    return 'Done';
  };

  const totalBulkMatched = bulkMatchResults.reduce((s, r) => s + r.totalMatched, 0);
  const totalBulkUnmatched = bulkMatchResults.reduce((s, r) => s + r.totalUnmatched, 0);
  const totalBulkMatchRate = totalBulkMatched + totalBulkUnmatched > 0
    ? Math.round((totalBulkMatched / (totalBulkMatched + totalBulkUnmatched)) * 100)
    : 0;

  const isReturnOnlyBatch = bulkParseResult !== null &&
    bulkParseResult.groups.every(g =>
      g.parseResult.rows.every(r => r.invoice_type === 'return')
    );

  const totalReturnFees = bulkParseResult
    ? bulkParseResult.groups.reduce(
        (s, g) => s + g.parseResult.rows.reduce((rs, r) => rs + r.delivery_charge, 0),
        0
      )
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upload Invoice</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'upload' && 'Select and configure your invoice file'}
              {step === 'preview' && 'Review parsed rows before matching'}
              {step === 'matching' && 'Review matched orders before applying'}
              {step === 'bulk_preview' && 'Review grouped invoice batches — adjust dates if needed'}
              {step === 'bulk_matching' && 'Review match results for all batches before applying'}
              {step === 'done' && 'Invoice applied successfully'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {activeStepList.map((s, idx) => {
              const currentIndex = activeStepList.indexOf(step);
              const isActive = s === step;
              const isDone = idx < currentIndex;
              return (
                <React.Fragment key={s}>
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <span className="capitalize hidden sm:inline">{stepDisplayName(s)}</span>
                  </div>
                  {idx < activeStepList.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-5">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {fileName ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">{fileName}</span>
                    <span className="text-xs text-gray-500">Click to replace</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">Drop CSV file here or click to browse</p>
                    <p className="text-xs text-gray-400">Supports Pathao, Bkash, and SSL Commerz CSV formats</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              </div>

              {fileName && (
                <>
                  {isBulk && (
                    <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800">
                        <span className="font-semibold">Bulk format detected</span> — invoice numbers will be set automatically from the Payment Reference column. You can adjust the date for each batch in the next step.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Provider</label>
                      <div className="space-y-1.5">
                        {detectedProvider && (
                          <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${PROVIDER_COLORS[detectedProvider]}`}>
                            Auto-detected: {PROVIDER_LABELS[detectedProvider]}
                          </div>
                        )}
                        <select
                          value={selectedProvider ?? ''}
                          onChange={e => setSelectedProvider(e.target.value as ProviderType || null)}
                          className={inputCls}
                        >
                          <option value="">Select provider...</option>
                          <option value="pathao">Pathao</option>
                          <option value="bkash">Bkash</option>
                          <option value="ssl_commerz">SSL Commerz</option>
                        </select>
                      </div>
                    </div>
                    {!isBulk && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Invoice Date</label>
                        <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inputCls} />
                      </div>
                    )}
                  </div>

                  {!isBulk && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Invoice Number (optional)</label>
                        <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className={inputCls} placeholder="e.g. 300326LBSNYBD" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Bank Deposit Amount (optional)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={bankDepositAmount}
                            onChange={e => setBankDepositAmount(e.target.value)}
                            className={inputCls}
                            placeholder="e.g. 43825.95"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Bank Deposit Reference (optional)</label>
                          <input
                            type="text"
                            value={bankDepositReference}
                            onChange={e => setBankDepositReference(e.target.value)}
                            className={inputCls}
                            placeholder="e.g. TXN-XXXXXXXX"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {step === 'preview' && parseResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Rows', value: parseResult.totalRows, color: 'bg-gray-50' },
                  { label: 'Parsed', value: parseResult.parsedRows, color: 'bg-blue-50' },
                  { label: 'Skipped', value: parseResult.skippedRows, color: 'bg-amber-50' },
                  { label: 'Errors', value: parseResult.errors.length, color: 'bg-red-50' },
                ].map(s => (
                  <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                    <div className="text-xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {parseResult.errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-semibold text-red-800 mb-1">Parse Errors</p>
                  <ul className="space-y-0.5">
                    {parseResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i} className="text-xs text-red-700">• {err}</li>
                    ))}
                    {parseResult.errors.length > 5 && (
                      <li className="text-xs text-red-500">...and {parseResult.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Preview (first 10 rows)</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Identifier</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Order ID</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Collected</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Del. Charge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.rows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0">
                          <td className="px-3 py-2 font-mono text-gray-700 max-w-[140px] truncate">{row.transaction_id ?? row.consignment_id ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{row.woo_order_id ?? '—'}</td>
                          <td className="px-3 py-2 text-right text-gray-900">৳{row.collected_amount.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-gray-700">৳{row.delivery_charge.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parseResult.rows.length > 10 && (
                  <p className="text-xs text-gray-400 mt-1.5 text-center">+{parseResult.rows.length - 10} more rows</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-3 flex justify-between text-sm">
                <span className="text-gray-600">Total Payout</span>
                <span className="font-semibold text-gray-900">৳{parseResult.totalDisbursed.toFixed(2)}</span>
              </div>
              {parseResult.totalGatewayCharges > 0 && (
                <div className="bg-amber-50 rounded-lg p-3 flex justify-between text-sm">
                  <span className="text-amber-700">Gateway Charges</span>
                  <span className="font-semibold text-amber-900">৳{parseResult.totalGatewayCharges.toFixed(2)}</span>
                </div>
              )}
              {parseResult.suggestedBankDeposit != null && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex justify-between text-sm">
                  <span className="text-green-700">Auto-calculated Bank Deposit <span className="font-normal text-green-600 text-xs">(from Settlement rows)</span></span>
                  <span className="font-semibold text-green-900">৳{parseResult.suggestedBankDeposit.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {step === 'bulk_preview' && bulkParseResult && (
            <div className="space-y-4">
              {isReturnOnlyBatch ? (
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-900">Return Invoice — Additive Delivery Charges</p>
                    <p className="text-xs text-amber-800 mt-0.5">
                      All rows in this file are <span className="font-semibold">return type</span>. The <span className="font-mono font-semibold">Final_Fee</span> from each row will be <span className="font-semibold">added on top</span> of any existing delivery charge on the matched order. Collected amounts will not be changed. Total return fees across all batches: <span className="font-semibold">৳{totalReturnFees.toFixed(2)}</span>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-800">
                    <span className="font-semibold">{bulkParseResult.totalGroups} invoice batches</span> detected. Adjust the date for each batch if needed, then click Match All Orders.
                  </p>
                </div>
              )}

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Invoice (Payment Ref)</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-600">Orders</th>
                      {isReturnOnlyBatch ? (
                        <th className="px-3 py-2 text-right font-semibold text-amber-700">Return Fee Added</th>
                      ) : (
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Payout</th>
                      )}
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Invoice Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkParseResult.groups.map((group, i) => {
                      const batchReturnFee = group.parseResult.rows.reduce((s, r) => s + r.delivery_charge, 0);
                      return (
                        <tr key={group.invoiceNumber} className="border-b border-gray-100 last:border-0">
                          <td className="px-3 py-2 font-mono text-gray-800 font-medium">{group.invoiceNumber}</td>
                          <td className="px-3 py-2 text-center text-gray-700">{group.parseResult.parsedRows}</td>
                          {isReturnOnlyBatch ? (
                            <td className="px-3 py-2 text-right text-amber-800 font-medium">৳{batchReturnFee.toFixed(2)}</td>
                          ) : (
                            <td className="px-3 py-2 text-right text-gray-900 font-medium">৳{group.parseResult.totalDisbursed.toFixed(2)}</td>
                          )}
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={bulkGroupDates[i] ?? group.suggestedDate}
                              onChange={e => {
                                const updated = [...bulkGroupDates];
                                updated[i] = e.target.value;
                                setBulkGroupDates(updated);
                              }}
                              className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white w-36"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isReturnOnlyBatch ? (
                <div className="bg-amber-50 rounded-lg p-3 flex justify-between text-sm border border-amber-100">
                  <span className="text-amber-800">Total Return Fees to Add (all batches)</span>
                  <span className="font-semibold text-amber-900">৳{totalReturnFees.toFixed(2)}</span>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3 flex justify-between text-sm">
                  <span className="text-gray-600">Total Payout (all batches)</span>
                  <span className="font-semibold text-gray-900">
                    ৳{bulkParseResult.groups.reduce((s, g) => s + g.parseResult.totalDisbursed, 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {step === 'matching' && matchResult && (
            <div className="space-y-4">
              {duplicateInfo && !duplicateDismissed && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-xl">
                  <RefreshCw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-900">Duplicate invoice detected</p>
                    <p className="text-xs text-amber-800 mt-1">
                      {Math.round(duplicateInfo.overlapPercent)}% of the incoming delivery orders ({duplicateInfo.overlapCount} of {duplicateInfo.incomingCount}) already exist in a previous record from{' '}
                      <span className="font-semibold">{duplicateInfo.existingInvoiceDate}</span>
                      {duplicateInfo.existingInvoiceNumber ? ` (${duplicateInfo.existingInvoiceNumber})` : ''}.
                    </p>
                    <p className="text-xs text-amber-700 mt-1.5">
                      Clicking <span className="font-semibold">Update Existing</span> will remove the old delivery settlement data and replace it with this upload.
                    </p>
                    <button
                      onClick={() => setDuplicateDismissed(true)}
                      className="mt-2 text-xs text-amber-700 underline hover:text-amber-900 transition-colors"
                    >
                      No, save as a new record instead
                    </button>
                  </div>
                </div>
              )}

              {duplicateInfo && duplicateDismissed && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                  <AlertCircle className="w-4 h-4 shrink-0 text-gray-400" />
                  Duplicate warning dismissed — this will be saved as a new collection record.
                  <button onClick={() => setDuplicateDismissed(false)} className="ml-auto text-blue-600 hover:underline shrink-0">Undo</button>
                </div>
              )}

              {(() => {
                const paidBackfill = matchResult.matched.filter(r => r.match_status === 'paid_no_collection');
                const paidSettled = matchResult.unmatched.filter(r => r.match_status === 'paid_already_settled');
                const notFound = matchResult.unmatched.filter(r => r.match_status === 'not_found');
                const totalAll = matchResult.totalMatched + matchResult.totalUnmatched;
                const matchRate = totalAll > 0 ? Math.round((matchResult.totalMatched / totalAll) * 100) : 0;
                return (
                  <>
                    <div className={`grid gap-3 ${paidBackfill.length > 0 || paidSettled.length > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-green-700">{matchResult.totalMatched}</div>
                        <div className="text-xs text-green-600 mt-0.5">Matched</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-red-700">{notFound.length}</div>
                        <div className="text-xs text-red-600 mt-0.5">Not Found</div>
                      </div>
                      {paidBackfill.length > 0 && (
                        <div className="bg-amber-50 rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-amber-700">{paidBackfill.length}</div>
                          <div className="text-xs text-amber-600 mt-0.5">Already Paid</div>
                        </div>
                      )}
                      {paidSettled.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-gray-600">{paidSettled.length}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Skip — Settled</div>
                        </div>
                      )}
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-blue-700">{matchRate}%</div>
                        <div className="text-xs text-blue-600 mt-0.5">Match Rate</div>
                      </div>
                    </div>

                    {paidBackfill.length > 0 && (
                      <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800">
                          <span className="font-semibold">{paidBackfill.length} prepaid order{paidBackfill.length > 1 ? 's' : ''} already marked as Paid with no collected amount recorded.</span>{' '}
                          The collected amount will be backfilled from this invoice. Payment status will not change.
                        </p>
                      </div>
                    )}

                    {paidSettled.length > 0 && (
                      <div className="flex items-start gap-2.5 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">{paidSettled.length} order{paidSettled.length > 1 ? 's' : ''} already fully settled</span> (Paid + collected amount already recorded). These rows will be saved but not re-processed.
                        </p>
                      </div>
                    )}

                    {matchResult.matched.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">Matched Orders (preview)</p>
                        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Order</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Customer</th>
                                <th className="px-3 py-2 text-right font-semibold text-gray-600">Collected</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-600">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {matchResult.matched.slice(0, 20).map((row, i) => (
                                <tr key={i} className="border-b border-gray-100 last:border-0">
                                  <td className="px-3 py-2 font-medium text-gray-800">{row.order_number ?? row.woo_order_id ?? '—'}</td>
                                  <td className="px-3 py-2 text-gray-600 max-w-[110px] truncate">{row.customer_name ?? '—'}</td>
                                  <td className="px-3 py-2 text-right">৳{row.collected_amount.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-center">
                                    {row.match_status === 'paid_no_collection' ? (
                                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                        Backfill
                                      </span>
                                    ) : (
                                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                                        row.match_confidence === 'high' ? 'bg-green-100 text-green-700' :
                                        row.match_confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                                        'bg-gray-100 text-gray-600'
                                      }`}>
                                        {row.match_confidence}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {(notFound.length > 0 || paidSettled.length > 0) && (
                      <div>
                        <p className="text-xs font-semibold text-red-700 mb-2">
                          Unmatched / Skipped Rows ({notFound.length + paidSettled.length})
                        </p>
                        <div className="border border-red-200 bg-red-50 rounded-lg overflow-hidden max-h-32 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-red-100 border-b border-red-200">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-red-700">Identifier</th>
                                <th className="px-3 py-2 text-left font-semibold text-red-700">Order</th>
                                <th className="px-3 py-2 text-center font-semibold text-red-700">Reason</th>
                                <th className="px-3 py-2 text-right font-semibold text-red-700">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...notFound, ...paidSettled].slice(0, 10).map((row, i) => (
                                <tr key={i} className="border-b border-red-100 last:border-0">
                                  <td className="px-3 py-2 font-mono text-red-800 max-w-[130px] truncate">{row.transaction_id ?? row.consignment_id ?? '—'}</td>
                                  <td className="px-3 py-2 text-red-700">{row.order_number ?? row.woo_order_id ?? '—'}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                                      row.match_status === 'paid_already_settled'
                                        ? 'bg-gray-100 text-gray-600'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {row.match_status === 'paid_already_settled' ? 'Skip — Settled' : 'No match'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right text-red-800">৳{row.collected_amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {step === 'bulk_matching' && bulkParseResult && bulkMatchResults.length > 0 && (
            <div className="space-y-4">
              {isReturnOnlyBatch && (
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900">
                    <span className="font-semibold">Return Invoice:</span> Applying will add the return <span className="font-mono font-semibold">Final_Fee</span> on top of any existing delivery charge on matched orders. Collected amounts are unchanged. Total fees: <span className="font-semibold">৳{totalReturnFees.toFixed(2)}</span>
                  </p>
                </div>
              )}

              {bulkDuplicates.size > 0 && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-300 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-900">Duplicate invoice numbers detected</p>
                    <p className="text-xs text-amber-800 mt-0.5">
                      The following invoice numbers already exist and will create new records alongside the existing ones:{' '}
                      <span className="font-mono font-semibold">{Array.from(bulkDuplicates.keys()).join(', ')}</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-700">{totalBulkMatched}</div>
                  <div className="text-xs text-green-600 mt-0.5">Total Matched</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-red-700">{totalBulkUnmatched}</div>
                  <div className="text-xs text-red-600 mt-0.5">Total Unmatched</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-700">{totalBulkMatchRate}%</div>
                  <div className="text-xs text-blue-600 mt-0.5">Match Rate</div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Invoice</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Date</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-600">Matched</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-600">Unmatched</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-600">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkParseResult.groups.map((group, i) => {
                      const mr = bulkMatchResults[i];
                      const rate = mr.totalMatched + mr.totalUnmatched > 0
                        ? Math.round((mr.totalMatched / (mr.totalMatched + mr.totalUnmatched)) * 100)
                        : 0;
                      const isDupe = bulkDuplicates.has(group.invoiceNumber);
                      return (
                        <tr key={group.invoiceNumber} className="border-b border-gray-100 last:border-0">
                          <td className="px-3 py-2 font-mono text-gray-800">
                            {group.invoiceNumber}
                            {isDupe && <span className="ml-1.5 text-amber-600 text-xs">(exists)</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{bulkGroupDates[i] ?? group.suggestedDate}</td>
                          <td className="px-3 py-2 text-center text-green-700 font-medium">{mr.totalMatched}</td>
                          <td className="px-3 py-2 text-center text-red-700">{mr.totalUnmatched}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`font-medium ${rate >= 80 ? 'text-green-700' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'done' && applyResult && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4">
                <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {bulkApplyResult ? `${bulkApplyResult.recordsCreated} Invoices Applied` : 'Invoice Applied'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">Settlement data has been recorded and orders updated</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{applyResult.ordersUpdated}</div>
                  <div className="text-xs text-blue-600 mt-1">Orders Updated</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{applyResult.paidStatusSet}</div>
                  <div className="text-xs text-green-600 mt-1">Marked as Paid</div>
                </div>
              </div>

              {bulkApplyResult && (
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-700">{bulkApplyResult.recordsCreated}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Collection Records Created</div>
                </div>
              )}

              {applyResult.errors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Some orders had errors</p>
                  {applyResult.errors.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-xs text-amber-700">• {e}</p>
                  ))}
                </div>
              )}

              {bulkApplyResult && bulkApplyResult.allUnmatched.length > 0 && effectiveProvider && (
                <button
                  onClick={() => exportUnmatchedCSV(bulkApplyResult.allUnmatched, effectiveProvider)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Unmatched Report ({bulkApplyResult.allUnmatched.length} rows)
                </button>
              )}

              {!bulkApplyResult && matchResult && matchResult.unmatched.length > 0 && effectiveProvider && (
                <button
                  onClick={() => exportUnmatchedCSV(matchResult.unmatched, effectiveProvider)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Unmatched Report ({matchResult.unmatched.length} rows)
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>

          <div className="flex gap-2">
            {step === 'preview' && (
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            {step === 'matching' && (
              <button
                onClick={() => setStep('preview')}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            {step === 'bulk_preview' && (
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            {step === 'bulk_matching' && (
              <button
                onClick={() => setStep('bulk_preview')}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}

            {step === 'upload' && (
              <button
                onClick={handleParse}
                disabled={!fileText || !selectedProvider || parsing}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              >
                {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Parse File
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleMatch}
                disabled={!parseResult || parseResult.parsedRows === 0 || matching}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              >
                {matching ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Match Orders
              </button>
            )}

            {step === 'bulk_preview' && (
              <button
                onClick={handleBulkMatch}
                disabled={!bulkParseResult || matching}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              >
                {matching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Matching {bulkMatchingProgress}/{bulkParseResult?.totalGroups ?? 0}...
                  </>
                ) : (
                  'Match All Orders'
                )}
              </button>
            )}

            {step === 'matching' && (
              <button
                onClick={handleApply}
                disabled={!matchResult || matchResult.totalMatched === 0 || applying}
                className={`flex items-center gap-2 px-5 py-2 text-white rounded-lg text-sm font-medium transition-colors ${
                  isUpdateMode
                    ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300'
                    : 'bg-green-600 hover:bg-green-700 disabled:bg-green-300'
                }`}
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : isUpdateMode ? <RefreshCw className="w-4 h-4" /> : null}
                {isUpdateMode ? 'Update Existing' : 'Apply & Save'}
              </button>
            )}

            {step === 'bulk_matching' && (
              <button
                onClick={handleBulkApply}
                disabled={bulkMatchResults.length === 0 || totalBulkMatched === 0 || applying}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-green-300 transition-colors"
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {applying ? 'Applying...' : `Apply All (${bulkParseResult?.totalGroups ?? 0} Batches)`}
              </button>
            )}

            {step === 'done' && (
              <button
                onClick={() => { onSuccess(); onClose(); }}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                View Collection Records
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
