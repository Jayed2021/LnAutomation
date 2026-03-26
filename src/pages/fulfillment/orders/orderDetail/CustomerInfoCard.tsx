import React, { useState, useEffect } from 'react';
import { Phone, Save, X, CreditCard as Edit2, MessageSquare } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { OrderDetail } from './types';

const PAYMENT_METHODS = ['COD', 'SSL Commerz', 'bKash', 'Nagad', 'Bank Transfer', 'bKash+COD', 'SSL+COD', 'Nagad+COD'];

interface Props {
  order: OrderDetail;
  onUpdated: () => void;
}

interface EditState {
  full_name: string;
  phone_primary: string;
  address_line1: string;
  district: string;
  email: string;
  payment_method: string;
  payment_status: string;
  payment_reference: string;
}

export function CustomerInfoCard({ order, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [districts, setDistricts] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from('bd_districts')
      .select('name')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (data) setDistricts(data.map(d => d.name));
      });
  }, []);

  const [edit, setEdit] = useState<EditState>({
    full_name: order.customer?.full_name ?? '',
    phone_primary: order.customer?.phone_primary ?? '',
    address_line1: order.customer?.address_line1 ?? '',
    district: order.customer?.district ?? '',
    email: order.customer?.email ?? '',
    payment_method: order.payment_method ?? 'COD',
    payment_status: order.payment_status ?? 'unpaid',
    payment_reference: order.payment_reference ?? '',
  });

  const startEdit = () => {
    setEdit({
      full_name: order.customer?.full_name ?? '',
      phone_primary: order.customer?.phone_primary ?? '',
      address_line1: order.customer?.address_line1 ?? '',
      district: order.customer?.district ?? '',
      email: order.customer?.email ?? '',
      payment_method: order.payment_method ?? 'COD',
      payment_status: order.payment_status ?? 'unpaid',
      payment_reference: order.payment_reference ?? '',
    });
    setEditing(true);
  };

  const isNonCod = edit.payment_method !== 'COD';
  const referenceRequired = isNonCod && !edit.payment_reference.trim();
  const canSave = !referenceRequired;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await supabase.from('customers').update({
        full_name: edit.full_name,
        phone_primary: edit.phone_primary,
        address_line1: edit.address_line1,
        district: edit.district,
        email: edit.email,
      }).eq('id', order.customer.id);

      await supabase.from('orders').update({
        payment_method: edit.payment_method,
        payment_status: edit.payment_status,
        payment_reference: edit.payment_reference,
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);

      setEditing(false);
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) => (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
      {children ?? <div className="text-sm text-gray-900 font-medium">{value || '—'}</div>}
    </div>
  );

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const selectCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="font-semibold text-gray-900">Customer Information</h3>
        {!editing ? (
          <button onClick={startEdit} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(false)} className="p-1.5 hover:bg-gray-100 rounded transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !canSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Field label="Name">
          {editing
            ? <input value={edit.full_name} onChange={e => setEdit(p => ({ ...p, full_name: e.target.value }))} className={inputCls} />
            : <div className="text-sm font-semibold text-gray-900">{order.customer?.full_name}</div>}
        </Field>

        <Field label="Phone">
          {editing
            ? <input value={edit.phone_primary} onChange={e => setEdit(p => ({ ...p, phone_primary: e.target.value }))} className={inputCls} />
            : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900">{order.customer?.phone_primary}</span>
                {order.customer?.phone_primary && (
                  <a href={`tel:${order.customer.phone_primary}`} className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors">
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
        </Field>

        <Field label="District">
          {editing
            ? (
              <select value={edit.district} onChange={e => setEdit(p => ({ ...p, district: e.target.value }))} className={selectCls}>
                <option value="">Select district</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )
            : <div className="text-sm text-gray-900">{order.customer?.district || '—'}</div>}
        </Field>

        <Field label="Address">
          {editing
            ? <textarea value={edit.address_line1} onChange={e => setEdit(p => ({ ...p, address_line1: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
            : <div className="text-sm text-gray-900">{order.customer?.address_line1 || '—'}</div>}
        </Field>

        {(order.customer?.email || editing) && (
          <Field label="Email (Optional)">
            {editing
              ? <input value={edit.email} onChange={e => setEdit(p => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="customer@example.com" />
              : <div className="text-sm text-gray-500">{order.customer?.email || '—'}</div>}
          </Field>
        )}

        {editing ? (
          <>
            <Field label="Payment Method">
              <select value={edit.payment_method} onChange={e => setEdit(p => ({ ...p, payment_method: e.target.value }))} className={selectCls}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Payment Status">
              <select value={edit.payment_status} onChange={e => setEdit(p => ({ ...p, payment_status: e.target.value }))} className={selectCls}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </Field>
            {isNonCod && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Payment Reference <span className="text-red-500">*</span>
                </div>
                <input
                  value={edit.payment_reference}
                  onChange={e => setEdit(p => ({ ...p, payment_reference: e.target.value }))}
                  className={`${inputCls} ${referenceRequired ? 'border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="Transaction ID / Reference No."
                />
                {referenceRequired && (
                  <p className="text-xs text-red-600 mt-1">Payment reference is required for non-COD methods.</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-0.5">
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Payment Method</div>
              <div className="text-sm text-gray-900">{order.payment_method || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Payment Status</div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                order.payment_status === 'paid'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
              </span>
            </div>
            {order.payment_method !== 'COD' && order.payment_reference && (
              <div className="col-span-2">
                <div className="text-xs font-medium text-gray-500 mb-1">Payment Reference</div>
                <div className="text-sm text-gray-900">{order.payment_reference}</div>
              </div>
            )}
          </div>
        )}

        {order.customer_note && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-xs font-semibold text-amber-700">Customer Note</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">{order.customer_note}</p>
          </div>
        )}
      </div>
    </div>
  );
}
