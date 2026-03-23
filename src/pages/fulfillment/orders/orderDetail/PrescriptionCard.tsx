import React, { useState } from 'react';
import { Plus, Save, X, Trash2, Copy, ChevronDown, ChevronUp, FlaskConical } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { OrderPrescription, OrderItem } from './types';
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
  prescriptions: OrderPrescription[];
  items: OrderItem[];
  userId: string | null;
  onUpdated: () => void;
}

interface RxFields {
  prescription_type: string;
  lens_type: string;
  custom_lens_type: string;
  customer_price: number;
  lens_price: number;
  fitting_charge: number;
  od_sph: string; od_cyl: string; od_axis: string; od_pd: string;
  os_sph: string; os_cyl: string; os_axis: string; os_pd: string;
  rx_file_url: string;
}

const EMPTY_RX: RxFields = {
  prescription_type: '', lens_type: '', custom_lens_type: '',
  customer_price: 0, lens_price: 0, fitting_charge: 0,
  od_sph: '', od_cyl: '', od_axis: '', od_pd: '',
  os_sph: '', os_cyl: '', os_axis: '', os_pd: '',
  rx_file_url: '',
};

function prescriptionToFields(p: OrderPrescription): RxFields {
  return {
    prescription_type: p.prescription_type ?? '',
    lens_type: p.lens_type ?? '',
    custom_lens_type: p.custom_lens_type ?? '',
    customer_price: p.customer_price ?? 0,
    lens_price: p.lens_price ?? 0,
    fitting_charge: p.fitting_charge ?? 0,
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

export function PrescriptionCard({ orderId, prescriptions, items, userId, onUpdated }: Props) {
  const [openForm, setOpenForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [duplicateTargetId, setDuplicateTargetId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

  const handleSave = async () => {
    if (!openForm || !openForm.fields.prescription_type) return;
    setSaving(true);
    try {
      const payload = {
        order_id: orderId,
        order_item_id: openForm.itemId || null,
        prescription_type: openForm.fields.prescription_type,
        lens_type: openForm.fields.lens_type || null,
        custom_lens_type: openForm.fields.lens_type === 'Custom' ? openForm.fields.custom_lens_type : null,
        customer_price: openForm.fields.customer_price,
        lens_price: openForm.fields.lens_price,
        fitting_charge: openForm.fields.fitting_charge,
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

      const targetItem = eligibleItems.find(i => i.id === openForm.itemId);
      const itemLabel = targetItem?.product_name ?? 'item';

      if (openForm.editingId) {
        await supabase.from('order_prescriptions').update(payload).eq('id', openForm.editingId);

        if (openForm.fields.customer_price > 0) {
          const { data: existingRx } = await supabase
            .from('order_items')
            .select('id')
            .eq('order_id', orderId)
            .eq('sku', 'RX')
            .eq('product_name', `${openForm.fields.prescription_type} Lens — ${itemLabel}`)
            .maybeSingle();

          if (existingRx) {
            await supabase.from('order_items').update({
              unit_price: openForm.fields.customer_price,
              line_total: openForm.fields.customer_price,
            }).eq('id', existingRx.id);
          } else {
            await supabase.from('order_items').insert({
              order_id: orderId,
              product_id: null,
              sku: 'RX',
              product_name: `${openForm.fields.prescription_type} Lens — ${itemLabel}`,
              quantity: 1,
              unit_price: openForm.fields.customer_price,
              line_total: openForm.fields.customer_price,
              discount_amount: 0,
            });
          }
          await recalcOrderTotal();
        }

        await logActivity(orderId, `Prescription updated for ${itemLabel}: ${openForm.fields.prescription_type}`, userId);
      } else {
        await supabase.from('order_prescriptions').insert(payload);

        if (openForm.fields.customer_price > 0) {
          await supabase.from('order_items').insert({
            order_id: orderId,
            product_id: null,
            sku: 'RX',
            product_name: `${openForm.fields.prescription_type} Lens — ${itemLabel}`,
            quantity: 1,
            unit_price: openForm.fields.customer_price,
            line_total: openForm.fields.customer_price,
            discount_amount: 0,
          });
          await recalcOrderTotal();
        }

        await logActivity(orderId, `Prescription added for ${itemLabel}: ${openForm.fields.prescription_type}`, userId);
      }

      setOpenForm(null);
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const recalcOrderTotal = async () => {
    const { data: allItems } = await supabase
      .from('order_items')
      .select('quantity, unit_price')
      .eq('order_id', orderId);
    if (!allItems) return;
    const { data: ord } = await supabase
      .from('orders')
      .select('shipping_fee, discount_amount')
      .eq('id', orderId)
      .maybeSingle();
    if (!ord) return;
    const subtotal = allItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const total = subtotal + (ord.shipping_fee ?? 0) - (ord.discount_amount ?? 0);
    await supabase.from('orders').update({
      subtotal,
      total_amount: Math.max(0, total),
    }).eq('id', orderId);
  };

  const handleDelete = async (p: OrderPrescription) => {
    await supabase.from('order_prescriptions').delete().eq('id', p.id);
    const targetItem = eligibleItems.find(i => i.id === p.order_item_id);
    const itemLabel = targetItem?.product_name ?? 'item';
    const rxName = `${p.prescription_type} Lens — ${itemLabel}`;
    await supabase.from('order_items').delete()
      .eq('order_id', orderId).eq('sku', 'RX').eq('product_name', rxName);
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

  const inputCls = "px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white";
  const rxInput = "px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full text-center";

  const RxForm = ({ fields, onChange }: { fields: RxFields; onChange: (f: RxFields) => void }) => {
    const lensOptions = fields.prescription_type ? (LENS_TYPES[fields.prescription_type] ?? []) : [];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Prescription Type</div>
            <select
              value={fields.prescription_type}
              onChange={e => onChange({ ...fields, prescription_type: e.target.value, lens_type: '' })}
              className={inputCls}
            >
              <option value="">Select type</option>
              {PRESCRIPTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Lens Type</div>
            <select
              value={fields.lens_type}
              onChange={e => onChange({ ...fields, lens_type: e.target.value })}
              className={inputCls}
              disabled={!fields.prescription_type}
            >
              <option value="">{fields.prescription_type ? 'Select lens' : 'Select type first'}</option>
              {lensOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">
              Customer Price (৳)
              <span className="ml-1 text-blue-500 font-normal">Added to order</span>
            </div>
            <input
              type="number"
              value={fields.customer_price}
              onChange={e => onChange({ ...fields, customer_price: parseFloat(e.target.value) || 0 })}
              className={inputCls}
            />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Upload Prescription</div>
            <input type="file" accept=".pdf,image/*" className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-gray-200 file:text-xs file:bg-white w-full" />
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
                onChange={e => onChange({ ...fields, lens_price: parseFloat(e.target.value) || 0 })}
                className={inputCls}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Lab Fitting Charge (৳)</div>
              <input
                type="number"
                value={fields.fitting_charge}
                onChange={e => onChange({ ...fields, fitting_charge: parseFloat(e.target.value) || 0 })}
                className={inputCls}
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
  };

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
              {p.lens_type && (
                <span className="text-xs text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded">{p.lens_type}</span>
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
              <a href={p.rx_file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                View prescription file
              </a>
            )}
          </div>
        )}
      </div>
    );
  };

  const isFormForItem = (itemId: string) => openForm?.itemId === itemId && !openForm.editingId;
  const isFormEditingPrescription = (prescriptionId: string) => openForm?.editingId === prescriptionId;

  const totalCustomerPrice = prescriptions.reduce((s, p) => s + (p.customer_price ?? 0), 0);

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

      {eligibleItems.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No items in this order to add prescriptions to.
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
                        <div key={p.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">Edit Prescription</span>
                            <button onClick={() => setOpenForm(null)} className="p-1 hover:bg-gray-100 rounded">
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                          <RxForm
                            fields={openForm!.fields}
                            onChange={f => setOpenForm(prev => prev ? { ...prev, fields: f } : null)}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setOpenForm(null)}
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
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <PrescriptionSummary key={p.id} p={p} itemId={item.id} />
                      )
                    ))}
                  </div>
                )}

                {showAddForm && (
                  <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">
                        New Prescription for <span className="text-blue-700">{item.product_name}</span>
                      </span>
                      <button onClick={() => setOpenForm(null)} className="p-1 hover:bg-gray-100 rounded">
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                    <RxForm
                      fields={openForm.fields}
                      onChange={f => setOpenForm(prev => prev ? { ...prev, fields: f } : null)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOpenForm(null)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving || !openForm.fields.prescription_type}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? 'Saving...' : 'Save Prescription'}
                      </button>
                    </div>
                  </div>
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
