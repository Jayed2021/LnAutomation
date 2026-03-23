import { CheckCircle, Download, Package, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import type { ReceiptSession, POForReceiving } from './types';

interface Props {
  po: POForReceiving;
  session: ReceiptSession;
  onDone: () => void;
}

function exportToExcel(po: POForReceiving, session: ReceiptSession) {
  const headers = ['SKU', 'Product Name', 'Ordered Qty', 'Qty Checked', 'Quality Passed', 'Damaged', 'Short / Over', 'Landed Cost/Unit', 'Total Value (Good)'];

  const rows = session.lines.map(l => {
    const shortOver = l.qty_checked - l.ordered_qty;
    const shortOverLabel = shortOver === 0 ? '-' : shortOver > 0 ? `+${shortOver} Over` : `${Math.abs(shortOver)} Short`;
    return [
      l.sku,
      l.product_name,
      l.ordered_qty,
      l.qty_checked,
      l.qty_good,
      l.qty_damaged,
      shortOverLabel,
      l.landed_cost_per_unit,
      (l.qty_good * l.landed_cost_per_unit).toFixed(2)
    ];
  });

  const totalOrdered = session.lines.reduce((s, l) => s + l.ordered_qty, 0);
  const totalChecked = session.lines.reduce((s, l) => s + l.qty_checked, 0);
  const totalGood = session.lines.reduce((s, l) => s + l.qty_good, 0);
  const totalDamaged = session.lines.reduce((s, l) => s + l.qty_damaged, 0);
  const totalValue = session.lines.reduce((s, l) => s + l.qty_good * l.landed_cost_per_unit, 0);
  const totalShortOver = totalChecked - totalOrdered;

  const summaryRow = [
    'TOTAL',
    '',
    totalOrdered,
    totalChecked,
    totalGood,
    totalDamaged,
    totalShortOver === 0 ? '-' : totalShortOver > 0 ? `+${totalShortOver} Over` : `${Math.abs(totalShortOver)} Short`,
    '',
    totalValue.toFixed(2)
  ];

  const metaRows = [
    ['PO Number', po.po_number],
    ['Supplier', po.supplier_name],
    ['Shipment Name', session.shipment_name],
    ['Qty Check Date', session.qty_check_date || '-'],
    ['QC Date', session.qc_date || '-'],
    ['Notes - Qty Check', session.qty_check_notes || '-'],
    ['Notes - QC', session.qc_notes || '-']
  ];

  const BOM = '\uFEFF';
  const csvContent = BOM + [
    `# RECEIVING REPORT - ${po.po_number} - ${session.shipment_name}`,
    '',
    headers.map(v => `"${v}"`).join(','),
    ...rows.map(r => r.map(v => `"${v}"`).join(',')),
    summaryRow.map(v => `"${v}"`).join(','),
    '',
    '# METADATA',
    ...metaRows.map(r => r.map(v => `"${v}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receiving-report-${po.po_number}-${session.shipment_name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StepComplete({ po, session, onDone }: Props) {
  const totalOrdered = session.lines.reduce((s, l) => s + l.ordered_qty, 0);
  const totalChecked = session.lines.reduce((s, l) => s + l.qty_checked, 0);
  const totalGood = session.lines.reduce((s, l) => s + l.qty_good, 0);
  const totalDamaged = session.lines.reduce((s, l) => s + l.qty_damaged, 0);
  const totalValue = session.lines.reduce((s, l) => s + l.qty_good * l.landed_cost_per_unit, 0);

  const poCreatedAt = po.created_at ? new Date(po.created_at) : null;
  const qcDate = session.qc_date ? new Date(session.qc_date) : null;
  const leadTimeDays = poCreatedAt && qcDate
    ? Math.ceil((qcDate.getTime() - poCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onDone} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receive Goods — {po.po_number}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Two-step receiving process</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0">
        {['Quantity Check', 'Quality Check', 'Complete'].map((label, i) => (
          <div key={label} className={`flex items-center ${i < 2 ? 'flex-1' : ''}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-medium text-emerald-600">{label}</span>
            </div>
            {i < 2 && <div className="flex-1 h-0.5 bg-emerald-400 mx-4" />}
          </div>
        ))}
      </div>

      <div className="text-center py-6">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-9 h-9 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Receiving Complete</h2>
        <p className="text-gray-500 mt-1">
          Shipment <span className="font-semibold font-mono">{session.shipment_name}</span> has been fully processed.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Ordered', value: totalOrdered, color: 'text-gray-900' },
          { label: 'Total Received', value: totalGood, color: 'text-emerald-600' },
          { label: 'Damaged', value: totalDamaged, color: totalDamaged > 0 ? 'text-red-500' : 'text-gray-400' },
          { label: leadTimeDays !== null ? `Lead Time: ${leadTimeDays}d` : 'Total Value', value: leadTimeDays !== null ? `PO → QC` : `৳${totalValue.toLocaleString()}`, color: 'text-blue-600' }
        ].map(stat => (
          <Card key={stat.label} className="p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Receiving Report</h3>
          <button
            onClick={() => exportToExcel(po, session)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV / Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU / Product</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Ordered</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Received</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">QC Passed</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Damaged</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Short / Over</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {session.lines.map((line, idx) => {
                const diff = line.qty_checked - line.ordered_qty;
                return (
                  <tr key={idx}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {line.product_image_url ? (
                          <img src={line.product_image_url} alt="" className="w-10 h-10 rounded object-cover border border-gray-200 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{line.sku}</p>
                          <p className="text-xs text-gray-500">{line.product_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-gray-900">{line.ordered_qty}</td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-gray-900">{line.qty_checked}</td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-emerald-600">{line.qty_good}</td>
                    <td className="px-5 py-4 text-right">
                      {line.qty_damaged > 0 ? (
                        <span className="text-sm font-semibold text-red-500">{line.qty_damaged}</span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {diff === 0 ? (
                        <span className="text-xs text-gray-400">Match</span>
                      ) : diff > 0 ? (
                        <span className="text-xs font-semibold text-amber-600">+{diff} Over</span>
                      ) : (
                        <span className="text-xs font-semibold text-red-500">{Math.abs(diff)} Short</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-5 py-3 text-sm font-bold text-gray-700">TOTAL</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-gray-900">{totalOrdered}</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-gray-900">{totalChecked}</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-emerald-600">{totalGood}</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-red-500">{totalDamaged > 0 ? totalDamaged : '—'}</td>
                <td className="px-5 py-3 text-right">
                  {totalChecked - totalOrdered === 0 ? (
                    <span className="text-xs text-gray-400">Match</span>
                  ) : totalChecked - totalOrdered > 0 ? (
                    <span className="text-xs font-semibold text-amber-600">+{totalChecked - totalOrdered} Over</span>
                  ) : (
                    <span className="text-xs font-semibold text-red-500">{Math.abs(totalChecked - totalOrdered)} Short</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {(session.qty_check_notes || session.qc_notes) && (
          <div className="p-5 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            {session.qty_check_notes && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Quantity Check Notes</h4>
                <p className="text-sm text-gray-700">{session.qty_check_notes}</p>
              </div>
            )}
            {session.qc_notes && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Quality Check Notes</h4>
                <p className="text-sm text-gray-700">{session.qc_notes}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="flex justify-center">
        <button
          onClick={onDone}
          className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Back to Receive Goods
        </button>
      </div>
    </div>
  );
}
