import React, { useState, useEffect } from 'react';
import { Phone, Save, X, CreditCard as Edit2, MessageSquare, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { OrderDetail } from './types';

const PRIMARY_METHODS = ['COD', 'Prepaid', 'Partial Paid'] as const;
type PrimaryMethod = typeof PRIMARY_METHODS[number];

const SUB_METHODS = ['Bkash', 'Nagad', 'SSL Commerz', 'Bank Transfer', 'Other'] as const;
type SubMethod = typeof SUB_METHODS[number];

const LEGACY_PARTIAL: Record<string, SubMethod> = {
  'bkash+cod': 'Bkash',
  'ssl+cod': 'SSL Commerz',
  'nagad+cod': 'Nagad',
};

const LEGACY_PREPAID: Record<string, SubMethod> = {
  'bkash': 'Bkash',
  'nagad': 'Nagad',
  'ssl commerz': 'SSL Commerz',
  'pay online': 'SSL Commerz',
  'bank transfer': 'Bank Transfer',
};

interface ParsedPayment {
  primary: PrimaryMethod;
  sub: SubMethod | '';
  isLegacy: boolean;
}

function parsePaymentMethod(raw: string | null | undefined): ParsedPayment {
  if (!raw) return { primary: 'COD', sub: '', isLegacy: false };
  const lower = raw.toLowerCase().trim();

  if (lower === 'cod' || lower === 'cash on delivery' || lower === 'cash_on_delivery') {
    return { primary: 'COD', sub: '', isLegacy: false };
  }

  if (raw.startsWith('Prepaid - ')) {
    const sub = raw.slice('Prepaid - '.length) as SubMethod;
    return { primary: 'Prepaid', sub: SUB_METHODS.includes(sub as SubMethod) ? sub : '', isLegacy: false };
  }
  if (raw.startsWith('Partial Paid - ')) {
    const sub = raw.slice('Partial Paid - '.length) as SubMethod;
    return { primary: 'Partial Paid', sub: SUB_METHODS.includes(sub as SubMethod) ? sub : '', isLegacy: false };
  }

  for (const [key, sub] of Object.entries(LEGACY_PARTIAL)) {
    if (lower === key || lower.includes(key)) {
      return { primary: 'Partial Paid', sub, isLegacy: true };
    }
  }
  for (const [key, sub] of Object.entries(LEGACY_PREPAID)) {
    if (lower === key || lower.includes(key)) {
      return { primary: 'Prepaid', sub, isLegacy: true };
    }
  }

  return { primary: 'COD', sub: '', isLegacy: false };
}

function buildPaymentMethodString(primary: PrimaryMethod, sub: SubMethod | ''): string {
  if (primary === 'COD') return 'COD';
  if (!sub) return primary;
  return `${primary} - ${sub}`;
}

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const selectCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
      {children ?? <div className="text-sm text-gray-900 font-medium">{value || '—'}</div>}
    </div>
  );
}

interface Props {
  order: OrderDetail;
  onUpdated: () => void;
}

interface EditState {
  full_name: string;
  phone_primary: string;
  phone_secondary: string;
  address_line1: string;
  district: string;
  email: string;
  primary_method: PrimaryMethod;
  sub_method: SubMethod | '';
  payment_status: string;
  payment_reference: string;
  paid_amount: string;
  customer_note: string;
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

  const parsed = parsePaymentMethod(order.payment_method);

  const buildEditState = (): EditState => ({
    full_name: order.customer?.full_name ?? '',
    phone_primary: order.customer?.phone_primary ?? '',
    phone_secondary: order.customer?.phone_secondary ?? '',
    address_line1: order.customer?.address_line1 ?? '',
    district: order.customer?.district ?? '',
    email: order.customer?.email ?? '',
    primary_method: parsed.primary,
    sub_method: parsed.sub,
    payment_status: order.payment_status ?? 'unpaid',
    payment_reference: order.payment_reference ?? '',
    paid_amount: order.paid_amount != null ? String(order.paid_amount) : '',
    customer_note: order.customer_note ?? '',
  });

  const [edit, setEdit] = useState<EditState>(buildEditState);

  const startEdit = () => {
    setEdit(buildEditState());
    setEditing(true);
  };

  const isNonCod = edit.primary_method !== 'COD';
  const isPartialPaid = edit.primary_method === 'Partial Paid';

  const referenceRequired = isNonCod && !edit.payment_reference.trim();
  const paidAmountRequired = isNonCod && (!edit.paid_amount || parseFloat(edit.paid_amount) <= 0);
  const subMethodRequired = isNonCod && !edit.sub_method;
  const canSave = !referenceRequired && !paidAmountRequired && !subMethodRequired;

  const computedCodAmount = isPartialPaid && edit.paid_amount
    ? order.total_amount - (parseFloat(edit.paid_amount) || 0)
    : null;

  const codAmountMismatch =
    isPartialPaid &&
    computedCodAmount !== null &&
    computedCodAmount < 0;

  const handlePrimaryChange = (method: PrimaryMethod) => {
    setEdit(p => ({
      ...p,
      primary_method: method,
      sub_method: method === 'COD' ? '' : p.sub_method,
      payment_reference: method === 'COD' ? '' : p.payment_reference,
      paid_amount: method === 'COD' ? '' : p.paid_amount,
    }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await supabase.from('customers').update({
        full_name: edit.full_name,
        phone_primary: edit.phone_primary,
        phone_secondary: edit.phone_secondary || null,
        address_line1: edit.address_line1,
        district: edit.district,
        email: edit.email,
      }).eq('id', order.customer.id);

      const paymentMethodString = buildPaymentMethodString(edit.primary_method, edit.sub_method);
      const paidAmount = isNonCod && edit.paid_amount ? parseFloat(edit.paid_amount) : null;

      await supabase.from('orders').update({
        payment_method: paymentMethodString,
        payment_status: edit.payment_status,
        payment_reference: isNonCod ? edit.payment_reference : null,
        paid_amount: paidAmount,
        customer_note: edit.customer_note || null,
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

  const displayParsed = parsePaymentMethod(order.payment_method);
  const remainingCod = order.paid_amount != null && displayParsed.primary === 'Partial Paid'
    ? order.total_amount - order.paid_amount
    : null;

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

        <Field label="Secondary Phone (Optional)">
          {editing
            ? <input value={edit.phone_secondary} onChange={e => setEdit(p => ({ ...p, phone_secondary: e.target.value }))} className={inputCls} placeholder="e.g. 01XXXXXXXXX" />
            : (
              order.customer?.phone_secondary
                ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">{order.customer.phone_secondary}</span>
                    <a href={`tel:${order.customer.phone_secondary}`} className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors">
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )
                : <div className="text-sm text-gray-400">—</div>
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
          <div className="space-y-3 pt-1">
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1.5">Payment Method</div>
              <div className="grid grid-cols-3 gap-2">
                {PRIMARY_METHODS.map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => handlePrimaryChange(method)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      edit.primary_method === method
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {isNonCod && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Payment Channel <span className="text-red-500">*</span>
                </div>
                <select
                  value={edit.sub_method}
                  onChange={e => setEdit(p => ({ ...p, sub_method: e.target.value as SubMethod }))}
                  className={`${selectCls} ${subMethodRequired ? 'border-red-400 focus:ring-red-400' : ''}`}
                >
                  <option value="">Select channel...</option>
                  {SUB_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}

            {isNonCod && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Paid Amount <span className="text-red-500">*</span>
                </div>
                <input
                  type="number"
                  value={edit.paid_amount}
                  onChange={e => setEdit(p => ({ ...p, paid_amount: e.target.value }))}
                  className={`${inputCls} ${paidAmountRequired ? 'border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                {paidAmountRequired && (
                  <p className="text-xs text-red-600 mt-1">Paid amount is required.</p>
                )}
                {isPartialPaid && computedCodAmount !== null && !codAmountMismatch && (
                  <p className="text-xs text-blue-600 mt-1">
                    Remaining COD amount: ৳{computedCodAmount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                  </p>
                )}
                {codAmountMismatch && (
                  <div className="flex items-center gap-1.5 mt-1.5 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <p className="text-xs text-red-700">Paid amount exceeds order total — check the value.</p>
                  </div>
                )}
              </div>
            )}

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
                  <p className="text-xs text-red-600 mt-1">Payment reference is required.</p>
                )}
              </div>
            )}

            {isPartialPaid && (
              <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  The courier will collect the remaining balance (Total − Paid Amount) as COD.
                </p>
              </div>
            )}

            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Payment Status</div>
              <select value={edit.payment_status} onChange={e => setEdit(p => ({ ...p, payment_status: e.target.value }))} className={selectCls}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-2 pt-0.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Payment Method</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm text-gray-900">
                    {order.payment_method || 'COD'}
                  </span>
                  {displayParsed.isLegacy && (
                    <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      Legacy — update
                    </span>
                  )}
                </div>
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
            </div>

            {displayParsed.primary !== 'COD' && order.paid_amount != null && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Paid Amount</div>
                  <div className="text-sm font-semibold text-gray-900">
                    ৳{order.paid_amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {remainingCod !== null && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Remaining COD</div>
                    <div className={`text-sm font-semibold ${remainingCod < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      ৳{remainingCod.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {displayParsed.primary !== 'COD' && order.payment_reference && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Payment Reference</div>
                <div className="text-sm text-gray-900">{order.payment_reference}</div>
              </div>
            )}
          </div>
        )}

        {editing ? (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Customer Note / Courier Instruction</label>
            <textarea
              value={edit.customer_note}
              onChange={e => setEdit(p => ({ ...p, customer_note: e.target.value }))}
              rows={3}
              placeholder="Add a note or courier instruction..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        ) : (
          (order.customer_note && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-xs font-semibold text-amber-700">Customer Note / Courier Instruction</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">{order.customer_note}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
