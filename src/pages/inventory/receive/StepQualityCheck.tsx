import { useRef, useState } from 'react';
import { ArrowLeft, Save, Upload, X, Link, AlertTriangle, Package, Calendar, Plus } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { uploadReceiptPhoto } from './service';
import type { ReceiptSession, ReceiptLine, POForReceiving } from './types';

interface Props {
  po: POForReceiving;
  session: ReceiptSession;
  saving: boolean;
  onUpdate: (updates: Partial<ReceiptSession>) => void;
  onSave: () => void;
  onComplete: () => void;
  onBack: () => void;
}

export default function StepQualityCheck({
  po, session, saving, onUpdate, onSave, onComplete, onBack
}: Props) {
  const [uploadingGood, setUploadingGood] = useState(false);
  const [uploadingDamaged, setUploadingDamaged] = useState(false);
  const [newGoodDriveLink, setNewGoodDriveLink] = useState('');
  const [newDamagedDriveLink, setNewDamagedDriveLink] = useState('');
  const goodPhotoRef = useRef<HTMLInputElement>(null);
  const damagedPhotoRef = useRef<HTMLInputElement>(null);

  const updateLine = (idx: number, updates: Partial<ReceiptLine>) => {
    const lines = session.lines.map((l, i) => {
      if (i !== idx) return l;
      const merged = { ...l, ...updates };
      return merged;
    });
    onUpdate({ lines });
  };

  const handleGoodQtyChange = (idx: number, val: number) => {
    const line = session.lines[idx];
    const clamped = Math.min(Math.max(0, val), line.qty_checked);
    updateLine(idx, { qty_good: clamped, qty_damaged: line.qty_checked - clamped });
  };

  const handleDamagedQtyChange = (idx: number, val: number) => {
    const line = session.lines[idx];
    const clamped = Math.min(Math.max(0, val), line.qty_checked);
    updateLine(idx, { qty_damaged: clamped, qty_good: line.qty_checked - clamped });
  };

  const handleGoodPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingGood(true);
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadReceiptPhoto(file, session.id || 'temp', 'good');
      if (url) urls.push(url);
    }
    onUpdate({ good_photo_urls: [...session.good_photo_urls, ...urls] });
    setUploadingGood(false);
  };

  const handleDamagedPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingDamaged(true);
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadReceiptPhoto(file, session.id || 'temp', 'damaged');
      if (url) urls.push(url);
    }
    onUpdate({ damaged_photo_urls: [...session.damaged_photo_urls, ...urls] });
    setUploadingDamaged(false);
  };

  const addGoodDriveLink = () => {
    if (!newGoodDriveLink.trim()) return;
    onUpdate({ good_drive_links: [...session.good_drive_links, newGoodDriveLink.trim()] });
    setNewGoodDriveLink('');
  };

  const addDamagedDriveLink = () => {
    if (!newDamagedDriveLink.trim()) return;
    onUpdate({ damaged_drive_links: [...session.damaged_drive_links, newDamagedDriveLink.trim()] });
    setNewDamagedDriveLink('');
  };

  const totalDamaged = session.lines.reduce((s, l) => s + l.qty_damaged, 0);
  const isValid = session.lines.every(l => l.qty_good + l.qty_damaged === l.qty_checked);

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
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm font-medium text-emerald-600">Quantity Check</span>
        </div>
        <div className="flex-1 h-0.5 bg-emerald-400 mx-4" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">2</div>
          <span className="text-sm font-semibold text-blue-600">Quality Check</span>
        </div>
        <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold">3</div>
          <span className="text-sm text-gray-400">Complete</span>
        </div>
      </div>

      {session.stock_added_at_qty_check && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-blue-800">Stock already added to inventory</p>
            <p className="text-blue-700 mt-0.5">Units were added to stock after the quantity check. Any damaged units found here will be moved to the damaged location and deducted from sellable stock.</p>
          </div>
        </div>
      )}

      <Card>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Step 2: Quality Check</h3>
            <p className="text-xs text-gray-500 mt-0.5">Shipment: <span className="font-mono font-semibold">{session.shipment_name}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-500">QC Date</label>
            <input
              type="date"
              value={session.qc_date}
              onChange={e => onUpdate({ qc_date: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => onUpdate({ qc_date: new Date().toISOString().slice(0, 10) })}
              className="flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <Calendar className="w-3 h-3" />
              Today
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU / Product</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty Checked</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Quality Passed</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Damaged</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Final Good</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {session.lines.map((line, idx) => {
                const mismatch = line.qty_good + line.qty_damaged !== line.qty_checked;
                return (
                  <tr key={idx} className={mismatch ? 'bg-red-50/50' : line.qty_damaged > 0 ? 'bg-amber-50/30' : ''}>
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
                          {mismatch && (
                            <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Passed + Damaged must equal {line.qty_checked}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-bold text-gray-900">{line.qty_checked}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <input
                        type="number"
                        min="0"
                        max={line.qty_checked}
                        value={line.qty_good || ''}
                        onChange={e => handleGoodQtyChange(idx, parseInt(e.target.value) || 0)}
                        className="w-20 text-right px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <input
                        type="number"
                        min="0"
                        max={line.qty_checked}
                        value={line.qty_damaged || ''}
                        onChange={e => handleDamagedQtyChange(idx, parseInt(e.target.value) || 0)}
                        className={`w-20 text-right px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent ${line.qty_damaged > 0 ? 'border-red-300 bg-red-50 text-red-700 font-semibold' : 'border-gray-300'}`}
                      />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`text-sm font-bold ${line.qty_good > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {line.qty_good}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="text"
                        value={line.line_notes}
                        onChange={e => updateLine(idx, { line_notes: e.target.value })}
                        placeholder="Optional note..."
                        className="w-40 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-5 border-t border-gray-100 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Photos — Good Items
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {session.good_photo_urls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                    <button
                      onClick={() => onUpdate({ good_photo_urls: session.good_photo_urls.filter((_, j) => j !== i) })}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => goodPhotoRef.current?.click()}
                  disabled={uploadingGood}
                  className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-xs">{uploadingGood ? '...' : 'Upload'}</span>
                </button>
              </div>
              <input ref={goodPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGoodPhotoUpload} />
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={newGoodDriveLink}
                  onChange={e => setNewGoodDriveLink(e.target.value)}
                  placeholder="Google Drive link..."
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={e => e.key === 'Enter' && addGoodDriveLink()}
                />
                <button onClick={addGoodDriveLink} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              {session.good_drive_links.map((link, i) => (
                <div key={i} className="flex items-center gap-2 mt-1.5">
                  <Link className="w-3 h-3 text-blue-500 shrink-0" />
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate flex-1">{link}</a>
                  <button onClick={() => onUpdate({ good_drive_links: session.good_drive_links.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Photos — Damaged Items
                {totalDamaged > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">{totalDamaged} units damaged</span>
                )}
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {session.damaged_photo_urls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-red-200" />
                    <button
                      onClick={() => onUpdate({ damaged_photo_urls: session.damaged_photo_urls.filter((_, j) => j !== i) })}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => damagedPhotoRef.current?.click()}
                  disabled={uploadingDamaged}
                  className="w-16 h-16 border-2 border-dashed border-red-200 rounded-lg flex flex-col items-center justify-center gap-1 text-red-300 hover:border-red-400 hover:text-red-500 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-xs">{uploadingDamaged ? '...' : 'Upload'}</span>
                </button>
              </div>
              <input ref={damagedPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={handleDamagedPhotoUpload} />
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={newDamagedDriveLink}
                  onChange={e => setNewDamagedDriveLink(e.target.value)}
                  placeholder="Google Drive link..."
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={e => e.key === 'Enter' && addDamagedDriveLink()}
                />
                <button onClick={addDamagedDriveLink} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              {session.damaged_drive_links.map((link, i) => (
                <div key={i} className="flex items-center gap-2 mt-1.5">
                  <Link className="w-3 h-3 text-red-500 shrink-0" />
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate flex-1">{link}</a>
                  <button onClick={() => onUpdate({ damaged_drive_links: session.damaged_drive_links.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Quality Check Notes</label>
            <textarea
              rows={3}
              value={session.qc_notes}
              onChange={e => onUpdate({ qc_notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Add notes about quality findings, damage descriptions, or supplier feedback..."
            />
          </div>

          {!isValid && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              For each SKU, Quality Passed + Damaged must equal the Qty Checked. Please correct the values above.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-xl text-sm font-semibold transition-colors"
            >
              Back to Quantity Check
            </button>
            <button
              onClick={onComplete}
              disabled={saving || !isValid}
              className="flex-1 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Processing...' : 'Complete Quality Check'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
