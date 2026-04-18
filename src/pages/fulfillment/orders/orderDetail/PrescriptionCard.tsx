import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Save, X, Trash2, Copy, ChevronDown, ChevronUp, FlaskConical, Upload, Download, Paperclip } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { OrderPrescription, OrderItem } from './types';
import { logActivity } from './service';

const PRESCRIPTION_TYPES = ['Single Vision', 'Progressive', 'Bifocal', 'Blue Light', 'Transition'];

interface LensBrandType {
  id: string;
  lens_type_name: string;
  is_high_index_applicable: boolean;
  default_lab_price: number;
  default_customer_price: number;
}

interface LensBrand {
  id: string;
  name: string;
  types: LensBrandType[];
}

interface Props {
  orderId: string;
  prescriptions: OrderPrescription[];
  items: OrderItem[];
  userId: string | null;
  onUpdated: () => void;
}

export interface RxFields {
  prescription_type: string;
  lens_brand_id: string;
  lens_brand_name: string;
  lens_type: string;
  lens_type_id: string;
  high_index: boolean;
  custom_lens_type: string;
  customer_price: string;
  lens_price: string;
  fitting_charge: string;
  od_sph: string; od_cyl: string; od_axis: string; od_pd: string;
  os_sph: string; os_cyl: string; os_axis: string; os_pd: string;
  rx_file_url: string;
}

const EMPTY_RX: RxFields = {
  prescription_type: '',
  lens_brand_id: '', lens_brand_name: '',
  lens_type: '', lens_type_id: '',
  high_index: false,
  custom_lens_type: '',
  customer_price: '0', lens_price: '0', fitting_charge: '0',
  od_sph: '', od_cyl: '', od_axis: '', od_pd: '',
  os_sph: '', os_cyl: '', os_axis: '', os_pd: '',
  rx_file_url: '',
};

function prescriptionToFields(p: OrderPrescription): RxFields {
  return {
    prescription_type: p.prescription_type ?? '',
    lens_brand_id: p.lens_brand_id ?? '',
    lens_brand_name: p.lens_brand_name ?? '',
    lens_type: p.lens_type ?? '',
    lens_type_id: '',
    high_index: p.high_index ?? false,
    custom_lens_type: p.custom_lens_type ?? '',
    customer_price: String(p.customer_price ?? 0),
    lens_price: String(p.lens_price ?? 0),
    fitting_charge: String(p.fitting_charge ?? 0),
    od_sph: p.od_sph ?? '', od_cyl: p.od_cyl ?? '',
    od_axis: p.od_axis ?? '', od_pd: p.od_pd ?? '',
    os_sph: p.os_sph ?? '', os_cyl: p.os_cyl ?? '',
    os_axis: p.os_axis ?? '', os_pd: p.os_pd ?? '',
    rx_file_url: p.rx_file_url ?? '',
  };
}

interface FormState {
  itemId: string;
  fields: RxFields;
  editingId: string | null;
}

interface RxFormProps {
  fields: RxFields;
  brands: LensBrand[];
  onChange: (f: RxFields) => void;
  uploading: boolean;
  onChooseFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const inputCls = "px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white";
const rxInput = "px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full text-center";

function RxForm({ fields, brands, onChange, uploading, onChooseFile, fileInputRef, onFileChange }: RxFormProps) {
  const selectedBrand = brands.find(b => b.id === fields.lens_brand_id);
  const brandTypes = selectedBrand?.types ?? [];
  const selectedBrandType = brandTypes.find(t => t.lens_type_name === fields.lens_type);
  const showHighIndex = selectedBrandType?.is_high_index_applicable === true;

  const handleBrandChange = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    onChange({
      ...fields,
      lens_brand_id: brandId,
      lens_brand_name: brand?.name ?? '',
      lens_type: '',
      lens_type_id: '',
      high_index: false,
    });
  };

  const handleLensTypeChange = (lensTypeName: string) => {
    const brand = brands.find(b => b.id === fields.lens_brand_id);
    const lt = brand?.types.find(t => t.lens_type_name === lensTypeName);
    onChange({
      ...fields,
      lens_type: lensTypeName,
      lens_type_id: lt?.id ?? '',
      high_index: false,
      lens_price: lt ? String(lt.default_lab_price) : fields.lens_price,
      customer_price: lt ? String(lt.default_customer_price) : fields.customer_price,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Prescription Type</div>
          <select
            value={fields.prescription_type}
            onChange={e => onChange({ ...fields, prescription_type: e.target.value })}
            className={inputCls}
          >
            <option value="">Select type</option>
            {PRESCRIPTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Lens Brand</div>
          <select
            value={fields.lens_brand_id}
            onChange={e => handleBrandChange(e.target.value)}
            className={inputCls}
          >
            <option value="">Select brand</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Lens Type</div>
          <select
            value={fields.lens_type}
            onChange={e => handleLensTypeChange(e.target.value)}
            className={inputCls}
            disabled={!fields.lens_brand_id}
          >
            <option value="">{fields.lens_brand_id ? 'Select lens type' : 'Select brand first'}</option>
            {brandTypes.map(t => <option key={t.id} value={t.lens_type_name}>{t.lens_type_name}</option>)}
          </select>
          {showHighIndex && (
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={fields.high_index}
                onChange={e => onChange({ ...fields, high_index: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-gray-700">High Index</span>
            </label>
          )}
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">
            Customer Price (৳)
            <span className="ml-1 text-blue-500 font-normal">Added to order</span>
          </div>
          <input
            type="number"
            value={fields.customer_price}
            onChange={e => onChange({ ...fields, customer_price: e.target.value })}
            className={inputCls}
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Upload Prescription</div>
          <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={onFileChange} />
          {fields.rx_file_url ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <a
                href={fields.rx_file_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-2 py-1 rounded bg-blue-50"
              >
                <Paperclip className="w-3 h-3" />
                View File
              </a>
              <a
                href={fields.rx_file_url}
                download
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50"
              >
                <Download className="w-3 h-3" />
                Download
              </a>
              <button
                type="button"
                onClick={() => onChange({ ...fields, rx_file_url: '' })}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 border border-red-100 px-2 py-1 rounded hover:bg-red-50"
              >
                <X className="w-3 h-3" />
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onChooseFile}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 w-full justify-center"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading...' : 'Choose File'}
            </button>
          )}
        </div>
      </div>

      {fields.lens_type === 'Custom' && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Custom Lens Type</div>
          <input
            value={fields.custom_lens_type}
            onChange={e => onChange({ ...fields, custom_lens_type: e.target.value })}
            className={inputCls}
            placeholder="Describe custom lens type"
          />
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-2.5">
          <FlaskConical className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lab Cost — Internal Only</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Lab Lens Price (৳)</div>
            <input
              type="number"
              value={fields.lens_price}
              onChange={e => onChange({ ...fields, lens_price: e.target.value })}
              className={inputCls}
              min="0"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Lab Fitting Charge (৳)</div>
            <input
              type="number"
              value={fields.fitting_charge}
              onChange={e => onChange({ ...fields, fitting_charge: e.target.value })}
              className={inputCls}
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-500 px-3 py-2 w-20">Eye</th>
              {['SPH', 'CYL', 'AXIS', 'PD'].map(h => (
                <th key={h} className="text-center text-xs font-semibold text-gray-500 px-2 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(['od', 'os'] as const).map(prefix => (
              <tr key={prefix}>
                <td className="py-2 px-3 text-sm font-medium text-gray-700 whitespace-nowrap">
                  {prefix === 'od' ? 'Right (OD)' : 'Left (OS)'}
                </td>
                {(['sph', 'cyl', 'axis', 'pd'] as const).map(field => (
                  <td key={field} className="py-2 px-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={fields[`${prefix}_${field}` as keyof RxFields] as string}
                      onChange={e => onChange({ ...fields, [`${prefix}_${field}`]: e.target.value })}
                      className={rxInput}
                      placeholder="—"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PrescriptionCard({ orderId, prescriptions, items, userId, onUpdated }: Props) {
  const [openForm, setOpenForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duplicateTargetId, setDuplicateTargetId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [brands, setBrands] = useState<LensBrand[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: brandRows } = await supabase
        .from('lens_brands')
        .select('id, name, sort_order')
        .eq('is_active', true)
        .order('sort_order');

      const { data: typeRows } = await supabase
        .from('lens_brand_types')
        .select('id, brand_id, lens_type_name, is_high_index_applicable, default_lab_price, default_customer_price, sort_order')
        .eq('is_active', true)
        .order('sort_order');

      if (!brandRows) return;
      const built: LensBrand[] = brandRows.map(b => ({
        id: b.id,
        name: b.name,
        types: (typeRows ?? [])
          .filter(t => t.brand_id === b.id)
          .map(t => ({
            id: t.id,
            lens_type_name: t.lens_type_name,
            is_high_index_applicable: t.is_high_index_applicable,
            default_lab_price: t.default_lab_price,
            default_customer_price: t.default_customer_price,
          })),
      }));
      setBrands(built);
    };
    load();
  }, []);

  const handleRxFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !openForm) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `orders/${orderId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('prescription-files').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: signedData, error: signedError } = await supabase.storage
        .from('prescription-files')
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signedError) throw signedError;
      setOpenForm(prev => prev ? { ...prev, fields: { ...prev.fields, rx_file_url: signedData.signedUrl, _storagePath: path } as any } : null);
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to upload prescription file. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const eligibleItems = items.filter(i => i.sku !== 'FEE' && i.sku !== 'RX');

  const prescriptionForItem = (itemId: string) =>
    prescriptions.filter(p => p.order_item_id === itemId);

  const unassignedPrescriptions = prescriptions.filter(p => !p.order_item_id);

  const openAddForm = (itemId: string) => {
    setOpenForm({ itemId, fields: { ...EMPTY_RX }, editingId: null });
  };

  const openEditForm = (p: OrderPrescription) => {
    setOpenForm({ itemId: p.order_item_id ?? '', fields: prescriptionToFields(p), editingId: p.id });
  };

  const openDuplicateForm = (p: OrderPrescription, targetItemId: string) => {
    setOpenForm({ itemId: targetItemId, fields: prescriptionToFields(p), editingId: null });
    setDuplicateTargetId(null);
  };

  const recalcOrderTotal = useCallback(async () => {
    const { data: allItems } = await supabase
      .from('order_items')
      .select('quantity, unit_price')
      .eq('order_id', orderId);
    if (!allItems) return;
    const { data: allRx } = await supabase
      .from('order_prescriptions')
      .select('customer_price')
      .eq('order_id', orderId);
    const { data: ord } = await supabase
      .from('orders')
      .select('shipping_fee, discount_amount')
      .eq('id', orderId)
      .maybeSingle();
    if (!ord) return;
    const itemsSubtotal = allItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const rxFee = (allRx ?? []).reduce((s, r) => s + (r.customer_price ?? 0), 0);
    const subtotal = itemsSubtotal + rxFee;
    const total = subtotal + (ord.shipping_fee ?? 0) - (ord.discount_amount ?? 0);
    await supabase.from('orders').update({
      subtotal,
      total_amount: Math.max(0, total),
    }).eq('id', orderId);
  }, [orderId]);

  const handleSave = async () => {
    if (!openForm || !openForm.fields.prescription_type) return;
    setSaving(true);
    try {
      const targetItem = eligibleItems.find(i => i.id === openForm.itemId);
      const itemLabel = targetItem?.product_name ?? (eligibleItems.length === 0 ? 'frame-supplied order' : 'item');

      const brandName = openForm.fields.lens_brand_name || null;
      const lensTypeDisplay = openForm.fields.lens_type
        ? openForm.fields.high_index
          ? `${openForm.fields.lens_type} + High Index`
          : openForm.fields.lens_type
        : null;

      const payload = {
        order_id: orderId,
        order_item_id: openForm.itemId || null,
        prescription_type: openForm.fields.prescription_type,
        lens_brand_id: openForm.fields.lens_brand_id || null,
        lens_brand_name: brandName,
        lens_type: lensTypeDisplay,
        high_index: openForm.fields.high_index,
        custom_lens_type: openForm.fields.lens_type === 'Custom' ? openForm.fields.custom_lens_type : null,
        customer_price: parseFloat(openForm.fields.customer_price) || 0,
        lens_price: parseFloat(openForm.fields.lens_price) || 0,
        fitting_charge: parseFloat(openForm.fields.fitting_charge) || 0,
        od_sph: openForm.fields.od_sph || null,
        od_cyl: openForm.fields.od_cyl || null,
        od_axis: openForm.fields.od_axis || null,
        od_pd: openForm.fields.od_pd || null,
        os_sph: openForm.fields.os_sph || null,
        os_cyl: openForm.fields.os_cyl || null,
        os_axis: openForm.fields.os_axis || null,
        os_pd: openForm.fields.os_pd || null,
        rx_file_url: openForm.fields.rx_file_url || null,
      };

      if (openForm.editingId) {
        await supabase.from('order_prescriptions').update(payload).eq('id', openForm.editingId);
        await logActivity(orderId, `Prescription updated for ${itemLabel}: ${openForm.fields.prescription_type}${brandName ? ` (${brandName})` : ''}`, userId);
      } else {
        await supabase.from('order_prescriptions').insert(payload);
        await supabase.from('orders').update({ has_prescription: true }).eq('id', orderId);
        await logActivity(orderId, `Prescription added for ${itemLabel}: ${openForm.fields.prescription_type}${brandName ? ` (${brandName})` : ''}`, userId);
      }

      await recalcOrderTotal();

      setOpenForm(null);
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: OrderPrescription) => {
    await supabase.from('order_prescriptions').delete().eq('id', p.id);

    const targetItem = eligibleItems.find(i => i.id === p.order_item_id);
    const itemLabel = targetItem?.product_name ?? 'item';

    const { count } = await supabase
      .from('order_prescriptions')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', orderId);
    await supabase.from('orders').update({ has_prescription: (count ?? 0) > 0 }).eq('id', orderId);

    await recalcOrderTotal();
    await logActivity(orderId, `Prescription removed for ${itemLabel}`, userId);
    onUpdated();
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleFormChange = useCallback((f: RxFields) => {
    setOpenForm(prev => prev ? { ...prev, fields: f } : null);
  }, []);

  const handleChooseFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const PrescriptionSummary = ({ p, itemId }: { p: OrderPrescription; itemId: string }) => {
    const expanded = expandedIds.has(p.id);
    const otherItems = eligibleItems.filter(i => i.id !== itemId);
    return (
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50">
          <button
            onClick={() => toggleExpand(p.id)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <span className="text-xs font-semibold text-gray-800">{p.prescription_type ?? '—'}</span>
              {p.lens_brand_name && (
                <span className="text-xs text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-medium">
                  {p.lens_brand_name}
                </span>
              )}
              {p.lens_type && (
                <span className="text-xs text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                  {p.lens_type}
                </span>
              )}
              {(p.customer_price ?? 0) > 0 && (
                <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                  ৳{p.customer_price}
                </span>
              )}
            </div>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => openEditForm(p)}
              className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              Edit
            </button>
            {otherItems.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setDuplicateTargetId(duplicateTargetId === p.id ? null : p.id)}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Duplicate
                </button>
                {duplicateTargetId === p.id && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                    <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100">Assign duplicate to:</div>
                    {otherItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => openDuplicateForm(p, item.id)}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        {item.product_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => handleDelete(p)}
              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="px-3 pb-3 pt-2 space-y-2 bg-white">
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-1.5 text-gray-500">Eye</th>
                    {['SPH', 'CYL', 'AXIS', 'PD'].map(h => (
                      <th key={h} className="text-center px-2 py-1.5 text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(['od', 'os'] as const).map(prefix => (
                    <tr key={prefix}>
                      <td className="px-3 py-1.5 font-medium text-gray-700">{prefix === 'od' ? 'Right (OD)' : 'Left (OS)'}</td>
                      {(['sph', 'cyl', 'axis', 'pd'] as const).map(field => (
                        <td key={field} className="text-center px-2 py-1.5 text-gray-700">
                          {p[`${prefix}_${field}` as keyof OrderPrescription] as string || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {((p.lens_price ?? 0) > 0 || (p.fitting_charge ?? 0) > 0) && (
              <div className="flex gap-4 text-xs bg-gray-50 rounded px-2.5 py-2 text-gray-500">
                <span>Lab Lens: <span className="font-medium text-gray-700">৳{p.lens_price}</span></span>
                <span>Lab Fitting: <span className="font-medium text-gray-700">৳{p.fitting_charge}</span></span>
              </div>
            )}
            {p.rx_file_url && (
              <div className="flex items-center gap-2">
                <a
                  href={p.rx_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-2 py-1 rounded bg-blue-50"
                >
                  <Paperclip className="w-3 h-3" />
                  View File
                </a>
                <a
                  href={p.rx_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50"
                >
                  <Download className="w-3 h-3" />
                  Download
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const isFormForItem = (itemId: string) => openForm?.itemId === itemId && !openForm.editingId;
  const isFormEditingPrescription = (prescriptionId: string) => openForm?.editingId === prescriptionId;

  const totalCustomerPrice = prescriptions.reduce((s, p) => s + (p.customer_price ?? 0), 0);
  const showFrameSuppliedSection = eligibleItems.length === 0;

  const renderForm = (label: string, onCancel: () => void) => (
    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <RxForm
        fields={openForm!.fields}
        brands={brands}
        onChange={handleFormChange}
        uploading={uploading}
        onChooseFile={handleChooseFile}
        fileInputRef={fileInputRef}
        onFileChange={handleRxFileUpload}
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !openForm?.fields.prescription_type}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Prescription'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-gray-900">Additional / Prescription Lens</h3>
          {prescriptions.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''} added
              {totalCustomerPrice > 0 && ` · ৳${totalCustomerPrice} added to order`}
            </p>
          )}
        </div>
      </div>

      {showFrameSuppliedSection ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-sm font-medium text-gray-700">Frame supplied by customer</span>
            </div>
            {!openForm && (
              <button
                onClick={() => openAddForm('')}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-blue-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Rx
              </button>
            )}
          </div>

          {unassignedPrescriptions.length > 0 && (
            <div className="space-y-2">
              {unassignedPrescriptions.map(p => (
                isFormEditingPrescription(p.id) ? (
                  <div key={p.id}>
                    {renderForm('Edit Prescription', () => setOpenForm(null))}
                  </div>
                ) : (
                  <PrescriptionSummary key={p.id} p={p} itemId="" />
                )
              ))}
            </div>
          )}

          {openForm && !openForm.editingId && openForm.itemId === '' && (
            renderForm('New Prescription — Frame supplied by customer', () => setOpenForm(null))
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {eligibleItems.map(item => {
            const itemPrescriptions = prescriptionForItem(item.id);
            const showAddForm = isFormForItem(item.id);
            return (
              <div key={item.id}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{item.product_name}</span>
                    <span className="ml-2 text-xs text-gray-400">{item.sku}</span>
                  </div>
                  {!showAddForm && !(openForm?.editingId && itemPrescriptions.some(p => p.id === openForm.editingId)) && (
                    <button
                      onClick={() => openAddForm(item.id)}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-blue-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Rx
                    </button>
                  )}
                </div>

                {itemPrescriptions.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {itemPrescriptions.map(p => (
                      isFormEditingPrescription(p.id) ? (
                        <div key={p.id}>
                          {renderForm('Edit Prescription', () => setOpenForm(null))}
                        </div>
                      ) : (
                        <PrescriptionSummary key={p.id} p={p} itemId={item.id} />
                      )
                    ))}
                  </div>
                )}

                {showAddForm && renderForm(
                  `New Prescription for ${item.product_name}`,
                  () => setOpenForm(null)
                )}
              </div>
            );
          })}

          {unassignedPrescriptions.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">Unassigned Prescriptions</div>
              <div className="space-y-2">
                {unassignedPrescriptions.map(p => (
                  <PrescriptionSummary key={p.id} p={p} itemId="" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
