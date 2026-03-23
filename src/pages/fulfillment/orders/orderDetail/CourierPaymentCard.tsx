import React, { useState } from 'react';
import { Save, X, CreditCard as Edit2, CheckCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { OrderDetail, OrderCourierInfo } from './types';
import { logActivity } from './service';

const COURIERS = ['Pathao', 'Steadfast', 'Redx', 'Sundarban', 'Office Delivery'];
const CONFIRMATION_TYPES = [
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'partial_paid', label: 'Partial Paid' },
  { value: 'assumption', label: 'Assumption' },
];
const COURIER_ENTRY_METHODS = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'api', label: 'Automatic API' },
];

interface Props {
  order: OrderDetail;
  courier: OrderCourierInfo | null;
  userId: string | null;
  onUpdated: () => void;
}

export function CourierPaymentCard({ order, courier, userId, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [edit, setEdit] = useState({
    courier_company: courier?.courier_company ?? '',
    tracking_number: courier?.tracking_number ?? '',
    courier_area: courier?.courier_area ?? '',
    total_receivable: courier?.total_receivable ?? order.total_amount,
    collected_amount: courier?.collected_amount ?? 0,
    delivery_charge: courier?.delivery_charge ?? 0,
    cod_charge: courier?.cod_charge ?? 0,
  });
  const [confirmEdit, setConfirmEdit] = useState({
    confirmation_type: order.confirmation_type ?? '',
    courier_entry_method: order.courier_entry_method ?? 'manual',
  });

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  const handleSaveCourier = async () => {
    setSaving(true);
    try {
      if (courier) {
        await supabase.from('order_courier_info').update({
          courier_company: edit.courier_company,
          tracking_number: edit.tracking_number,
          courier_area: edit.courier_area,
          total_receivable: edit.total_receivable,
          collected_amount: edit.collected_amount,
          delivery_charge: edit.delivery_charge,
          cod_charge: edit.cod_charge,
          updated_at: new Date().toISOString(),
        }).eq('id', courier.id);
      } else {
        await supabase.from('order_courier_info').insert({
          order_id: order.id,
          ...edit,
        });
      }
      await logActivity(order.id, `Courier info updated`, userId);
      setEditing(false);
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!confirmEdit.confirmation_type) return;
    setConfirmingOrder(true);
    try {
      await supabase.from('orders').update({
        cs_status: 'confirmed',
        confirmation_type: confirmEdit.confirmation_type,
        courier_entry_method: confirmEdit.courier_entry_method,
        confirmed_by: userId,
        fulfillment_status: 'not_printed',
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);
      await logActivity(order.id, `Order confirmed via ${confirmEdit.confirmation_type}`, userId);
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmingOrder(false);
    }
  };

  const isConfirmable = ['new_not_called', 'new_called'].includes(order.cs_status);
  const isConfirmed = !['new_not_called', 'new_called'].includes(order.cs_status);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-gray-900">Courier &amp; Payment</h3>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="p-1.5 hover:bg-gray-100 rounded transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={handleSaveCourier}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Courier Company</div>
          {editing
            ? <select value={edit.courier_company} onChange={e => setEdit(p => ({ ...p, courier_company: e.target.value }))} className={inputCls}>
                <option value="">Select courier</option>
                {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            : <div className="text-sm text-gray-900">{courier?.courier_company || '—'}</div>}
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Area</div>
          {editing
            ? <input value={edit.courier_area} onChange={e => setEdit(p => ({ ...p, courier_area: e.target.value }))} className={inputCls} placeholder="Delivery area" />
            : <div className="text-sm text-gray-900">{courier?.courier_area || '—'}</div>}
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Tracking Number</div>
          {editing
            ? <input value={edit.tracking_number} onChange={e => setEdit(p => ({ ...p, tracking_number: e.target.value }))} className={inputCls} placeholder="Tracking #" />
            : <div className="text-sm text-gray-900 font-mono">{courier?.tracking_number || '—'}</div>}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs font-medium text-green-700 mb-0.5">Total Receivable (Courier Collection)</div>
          {editing
            ? <input type="number" value={edit.total_receivable} onChange={e => setEdit(p => ({ ...p, total_receivable: parseFloat(e.target.value) || 0 }))} className={inputCls} />
            : <div className="text-lg font-bold text-green-800">৳{(courier?.total_receivable ?? order.total_amount).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</div>}
          <div className="text-xs text-green-600 mt-0.5">Amount to collect from customer</div>
        </div>

        {editing && (
          <>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Delivery Charge</div>
              <input type="number" value={edit.delivery_charge} onChange={e => setEdit(p => ({ ...p, delivery_charge: parseFloat(e.target.value) || 0 }))} className={inputCls} />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">COD Charge</div>
              <input type="number" value={edit.cod_charge} onChange={e => setEdit(p => ({ ...p, cod_charge: parseFloat(e.target.value) || 0 }))} className={inputCls} />
            </div>
          </>
        )}
      </div>

      {/* Confirm Order Section */}
      {isConfirmable && (
        <div className="mt-6 pt-5 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-900">Confirm Order</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Confirmation Type</div>
              <select
                value={confirmEdit.confirmation_type}
                onChange={e => setConfirmEdit(p => ({ ...p, confirmation_type: e.target.value }))}
                className={inputCls}
              >
                <option value="">Select type...</option>
                {CONFIRMATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Courier Entry Method</div>
              <select
                value={confirmEdit.courier_entry_method}
                onChange={e => setConfirmEdit(p => ({ ...p, courier_entry_method: e.target.value }))}
                className={inputCls}
              >
                {COURIER_ENTRY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <button
              onClick={handleConfirmOrder}
              disabled={confirmingOrder || !confirmEdit.confirmation_type}
              className="w-full py-2.5 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {confirmingOrder ? 'Confirming...' : 'Confirm Order'}
            </button>
          </div>
        </div>
      )}

      {isConfirmed && order.confirmation_type && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span>Confirmed via {CONFIRMATION_TYPES.find(t => t.value === order.confirmation_type)?.label ?? order.confirmation_type}</span>
          </div>
        </div>
      )}
    </div>
  );
}
