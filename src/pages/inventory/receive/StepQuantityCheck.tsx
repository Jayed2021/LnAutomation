import { useState, useRef } from 'react';
import {
  ArrowLeft, Save, Download, Package, CheckCircle, AlertTriangle, XCircle,
  Calendar, ChevronDown, Upload, X
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { printBarcodeLabels, downloadSingleBarcode } from '../../../components/inventory/barcodePrint';
import { uploadReceiptPhoto } from './service';
import type { ReceiptSession, ReceiptLine, Location, POForReceiving } from './types';

interface Props {
  po: POForReceiving;
  session: ReceiptSession;
  locations: Location[];
  saving: boolean;
  onUpdate: (updates: Partial<ReceiptSession>) => void;
  onSave: () => void;
  onCompleteWithoutStock: () => void;
  onCompleteAndAddStock: () => void;
  onBack: () => void;
}

export default function StepQuantityCheck({
  po, session, locations, saving, onUpdate, onSave, onCompleteWithoutStock, onCompleteAndAddStock, onBack
}: Props) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const goodPhotoRef = useRef<HTMLInputElement>(null);

  const updateLine = (idx: number, updates: Partial<ReceiptLine>) => {
    const lines = session.lines.map((l, i) => i === idx ? { ...l, ...updates } : l);
    onUpdate({ lines });
  };

  const handleGoodPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !session.id) return;
    setUploadingPhoto(true);
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadReceiptPhoto(file, session.id || 'temp', 'good');
      if (url) urls.push(url);
    }
    onUpdate({ good_photo_urls: [...session.good_photo_urls, ...urls] });
    setUploadingPhoto(false);
  };

  const removeGoodPhoto = (url: string) => {
    onUpdate({ good_photo_urls: session.good_photo_urls.filter(u => u !== url) });
  };

  const allChecked = session.lines.every(l => l.qty_checked > 0 || l.ordered_qty === 0);
  const hasDiscrepancies = session.lines.some(l => l.qty_checked !== l.ordered_qty);

  const getDiffIcon = (line: ReceiptLine) => {
    const diff = line.qty_checked - line.ordered_qty;
    if (diff === 0) return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (diff > 0) return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receive Goods — {po.po_number}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Two-step receiving process</p>
          </div>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Progress'}
        </button>
      </div>

      <div className="flex items-center gap-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</div>
          <span className="text-sm font-semibold text-blue-600">Quantity Check</span>
        </div>
        <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold">2</div>
          <span className="text-sm text-gray-400">Quality Check</span>
        </div>
        <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold">3</div>
          <span className="text-sm text-gray-400">Complete</span>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Supplier</label>
            <p className="text-sm font-semibold text-gray-900">{po.supplier_name}</p>
          </div>
          {po.expected_delivery_date && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Expected Date</label>
              <p className="text-sm text-gray-700">{po.expected_delivery_date}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Shipment Name *</label>
            <input
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={session.shipment_name}
              onChange={e => onUpdate({ shipment_name: e.target.value })}
              placeholder="e.g. PG-test-1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Check Date</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={session.qty_check_date}
                onChange={e => onUpdate({ qty_check_date: e.target.value })}
              />
              <button
                onClick={() => onUpdate({ qty_check_date: new Date().toISOString().slice(0, 10) })}
                className="flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
              >
                <Calendar className="w-3 h-3" />
                Today
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Step 1: Quantity Check</h3>
            <p className="text-xs text-gray-500 mt-0.5">Count physical units received. Barcodes are auto-generated as SKU-ShipmentName.</p>
          </div>
          <button
            onClick={() => printBarcodeLabels(session.lines.map(l => ({ barcode: l.barcode, name: l.sku })))}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Print All Barcodes
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Barcode / SKU</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Ordered</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty Checked</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {session.lines.map((line, idx) => {
                const diff = line.qty_checked - line.ordered_qty;
                return (
                  <tr key={idx} className={diff < 0 ? 'bg-red-50/40' : diff > 0 ? 'bg-amber-50/40' : ''}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">{line.barcode}</code>
                        <button
                          onClick={() => downloadSingleBarcode(line.barcode)}
                          title="Download barcode"
                          className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-500 hover:text-gray-700"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs font-semibold text-gray-700 mt-1">{line.sku}</p>
                      {!line.product_id && (
                        <p className="text-xs text-red-500 mt-0.5">Not in product catalog</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {line.product_image_url ? (
                          <img src={line.product_image_url} alt="" className="w-10 h-10 rounded object-cover border border-gray-200 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                        <span className="text-sm text-gray-800">{line.product_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-semibold text-gray-900">{line.ordered_qty}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min="0"
                          value={line.qty_checked || ''}
                          onChange={e => updateLine(idx, { qty_checked: parseInt(e.target.value) || 0 })}
                          className={`w-20 text-right px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${diff !== 0 ? 'border-amber-400' : 'border-gray-300'}`}
                        />
                        <div className="w-5 flex items-center justify-center">
                          {getDiffIcon(line)}
                        </div>
                        {diff !== 0 && (
                          <span className={`text-xs font-bold w-8 text-right ${diff > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={line.location_id}
                        onChange={e => updateLine(idx, { location_id: e.target.value })}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent max-w-[200px]"
                      >
                        {locations.map(l => (
                          <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-5 border-t border-gray-100 space-y-4">
          {hasDiscrepancies && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Quantity discrepancies detected</p>
                <p className="text-amber-700 mt-0.5">Some SKUs have counts that differ from the ordered quantity. Please verify before proceeding.</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parcel / Delivery Photos
              <span className="text-xs text-gray-400 ml-2">(photos of received goods in good condition)</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {session.good_photo_urls.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                  <button
                    onClick={() => removeGoodPhoto(url)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => goodPhotoRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
              >
                <Upload className="w-5 h-5" />
                <span className="text-xs">{uploadingPhoto ? '...' : 'Upload'}</span>
              </button>
            </div>
            <input ref={goodPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGoodPhotoUpload} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity Check Notes</label>
            <textarea
              rows={3}
              value={session.qty_check_notes}
              onChange={e => onUpdate({ qty_check_notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Add any notes about the quantity check, delivery condition, etc..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCompleteWithoutStock}
              disabled={saving || !session.shipment_name}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Complete Check (Don't Add to Stock)
            </button>
            <button
              onClick={onCompleteAndAddStock}
              disabled={saving || !session.shipment_name}
              className="flex-1 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Processing...' : 'Complete & Add to Stock'}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">
            "Add to Stock" immediately creates inventory lots. "Don't Add to Stock" waits until Quality Check is done.
          </p>
        </div>
      </Card>
    </div>
  );
}
