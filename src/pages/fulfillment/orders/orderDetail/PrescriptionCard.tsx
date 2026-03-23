import React, { useState } from 'react';
import { Save, X, CreditCard as Edit2, Upload } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { OrderPrescription } from './types';
import { logActivity } from './service';

const PRESCRIPTION_TYPES = ['Single Vision', 'Progressive', 'Bifocal', 'Blue Light', 'Transition'];
const LENS_TYPES: Record<string, string[]> = {
  'Single Vision': ['Multicoated', 'Hard Coated', 'Anti-Blue', 'Premium Anti-Blue', 'Photochromic', 'Premium Photochromic', 'High Index', 'Custom'],
  'Progressive': ['Multicoated', 'Hard Coated', 'Anti-Blue', 'Premium Anti-Blue', 'High Index', 'Custom'],
  'Bifocal': ['Multicoated', 'Hard Coated', 'Custom'],
  'Blue Light': ['Anti-Blue', 'Premium Anti-Blue', 'Custom'],
  'Transition': ['Photochromic', 'Premium Photochromic', 'Custom'],
};

interface Props {
  orderId: string;
  prescription: OrderPrescription | null;
  userId: string | null;
  onUpdated: () => void;
}

interface RxFields {
  prescription_type: string;
  lens_type: string;
  custom_lens_type: string;
  lens_price: number;
  fitting_charge: number;
  od_sph: string; od_cyl: string; od_axis: string; od_pd: string;
  os_sph: string; os_cyl: string; os_axis: string; os_pd: string;
  rx_file_url: string;
}

const EMPTY: RxFields = {
  prescription_type: '', lens_type: '', custom_lens_type: '',
  lens_price: 0, fitting_charge: 0,
  od_sph: '', od_cyl: '', od_axis: '', od_pd: '',
  os_sph: '', os_cyl: '', os_axis: '', os_pd: '',
  rx_file_url: '',
};

export function PrescriptionCard({ orderId, prescription, userId, onUpdated }: Props) {
  const [editing, setEditing] = useState(!prescription);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<RxFields>(prescription ? {
    prescription_type: prescription.prescription_type ?? '',
    lens_type: prescription.lens_type ?? '',
    custom_lens_type: prescription.custom_lens_type ?? '',
    lens_price: prescription.lens_price ?? 0,
    fitting_charge: prescription.fitting_charge ?? 0,
    od_sph: prescription.od_sph ?? '', od_cyl: prescription.od_cyl ?? '',
    od_axis: prescription.od_axis ?? '', od_pd: prescription.od_pd ?? '',
    os_sph: prescription.os_sph ?? '', os_cyl: prescription.os_cyl ?? '',
    os_axis: prescription.os_axis ?? '', os_pd: prescription.os_pd ?? '',
    rx_file_url: prescription.rx_file_url ?? '',
  } : { ...EMPTY });

  const handleSave = async () => {
    if (!edit.prescription_type) return;
    setSaving(true);
    try {
      const payload = {
        order_id: orderId,
        ...edit,
        custom_lens_type: edit.lens_type === 'Custom' ? edit.custom_lens_type : null,
      };
      if (prescription) {
        await supabase.from('order_prescriptions').update(payload).eq('id', prescription.id);
      } else {
        await supabase.from('order_prescriptions').insert(payload);
      }
      await logActivity(orderId, `Prescription ${prescription ? 'updated' : 'added'}: ${edit.prescription_type}`, userId);
      setEditing(false);
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const lensOptions = edit.prescription_type ? (LENS_TYPES[edit.prescription_type] ?? []) : [];
  const inputCls = "px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white";
  const rxInput = "px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full text-center";

  const RxRow = ({ eye, prefix }: { eye: string; prefix: 'od' | 'os' }) => (
    <tr>
      <td className="py-1.5 pr-3 text-sm font-medium text-gray-700">{eye}</td>
      {(['sph', 'cyl', 'axis', 'pd'] as const).map(field => (
        <td key={field} className="py-1.5 px-1">
          {editing
            ? <input value={edit[`${prefix}_${field}` as keyof RxFields] as string} onChange={e => setEdit(p => ({ ...p, [`${prefix}_${field}`]: e.target.value }))} className={rxInput} placeholder="—" />
            : <span className="block text-center text-sm text-gray-700">{prescription?.[`${prefix}_${field}` as keyof OrderPrescription] as string || '—'}</span>}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-gray-900">Additional / Prescription Lens</h3>
        {prescription && !editing && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
        {editing && prescription && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="p-1.5 hover:bg-gray-100 rounded transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1.5">Prescription Type</div>
          {editing
            ? (
              <select value={edit.prescription_type} onChange={e => setEdit(p => ({ ...p, prescription_type: e.target.value, lens_type: '' }))} className={inputCls}>
                <option value="">Select prescription type</option>
                {PRESCRIPTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )
            : <div className="text-sm text-gray-900">{prescription?.prescription_type || '—'}</div>}
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1.5">Lens Type</div>
          {editing
            ? (
              <select value={edit.lens_type} onChange={e => setEdit(p => ({ ...p, lens_type: e.target.value }))} className={inputCls} disabled={!edit.prescription_type}>
                <option value="">{edit.prescription_type ? 'Select lens type' : 'Select prescription first'}</option>
                {lensOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )
            : <div className="text-sm text-gray-900">{prescription?.lens_type || '—'}</div>}
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1.5">Price (৳)</div>
          {editing
            ? <input type="number" value={edit.lens_price} onChange={e => setEdit(p => ({ ...p, lens_price: parseFloat(e.target.value) || 0 }))} className={inputCls} />
            : <div className="text-sm text-gray-900">৳{prescription?.lens_price ?? 0}</div>}
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1.5">Upload Prescription</div>
          {editing
            ? <input type="file" accept=".pdf,image/*" className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-gray-200 file:text-xs file:bg-white" />
            : (
              prescription?.rx_file_url
                ? <a href={prescription.rx_file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View file</a>
                : <span className="text-xs text-gray-400">No file uploaded</span>
            )}
        </div>
      </div>

      {edit.lens_type === 'Custom' && editing && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 mb-1.5">Custom Lens Type</div>
          <input value={edit.custom_lens_type} onChange={e => setEdit(p => ({ ...p, custom_lens_type: e.target.value }))} className={inputCls} placeholder="Describe custom lens type" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1.5">Lens Price</div>
          {editing
            ? <input type="number" value={edit.lens_price} onChange={e => setEdit(p => ({ ...p, lens_price: parseFloat(e.target.value) || 0 }))} className={inputCls} />
            : <div className="text-sm text-gray-900">৳{prescription?.lens_price ?? 0}</div>}
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1.5">Fitting Charge</div>
          {editing
            ? <input type="number" value={edit.fitting_charge} onChange={e => setEdit(p => ({ ...p, fitting_charge: parseFloat(e.target.value) || 0 }))} className={inputCls} />
            : <div className="text-sm text-gray-900">৳{prescription?.fitting_charge ?? 0}</div>}
        </div>
      </div>

      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-500 px-3 py-2 w-16">Eye</th>
              {['SPH', 'CYL', 'AXIS', 'PD'].map(h => (
                <th key={h} className="text-center text-xs font-semibold text-gray-500 px-2 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <RxRow eye="Right (OD)" prefix="od" />
            <RxRow eye="Left (OS)" prefix="os" />
          </tbody>
        </table>
      </div>

      {!prescription && editing && (
        <div className="mt-4 flex gap-2">
          <button onClick={handleSave} disabled={saving || !edit.prescription_type} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors">
            {saving ? 'Saving...' : 'Save Prescription'}
          </button>
        </div>
      )}
    </div>
  );
}
