import React, { useState, useEffect } from 'react';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { OrderDetail, OrderItem } from './types';
import { logActivity } from './service';
import { STATUS_CONFIG } from '../types';

interface Props {
  order: OrderDetail;
  items: OrderItem[];
  userId: string | null;
  userRole: string | null;
  onUpdated: () => void;
}

interface CancellationReason {
  id: string;
  reason_text: string;
}

const AVAILABLE_ACTIONS: Record<string, string[]> = {
  new_not_called: ['new_called', 'send_to_lab', 'confirmed', 'awaiting_payment', 'late_delivery', 'cancel_before_dispatch'],
  new_called:     ['confirmed', 'send_to_lab', 'awaiting_payment', 'late_delivery', 'cancel_before_dispatch'],
  confirmed:      ['send_to_lab', 'not_printed', 'awaiting_payment', 'late_delivery', 'exchange', 'cancel_before_dispatch', 'cancel_after_dispatch'],
  awaiting_payment: ['confirmed', 'cancel_before_dispatch'],
  late_delivery:  ['confirmed', 'cancel_before_dispatch', 'cancel_after_dispatch'],
  send_to_lab:    ['in_lab', 'cancel_before_dispatch'],
  in_lab:         ['packed', 'cancel_before_dispatch'],
  not_printed:    ['printed', 'exchange', 'cancel_before_dispatch', 'cancel_after_dispatch'],
  printed:        ['packed', 'exchange', 'cancel_before_dispatch', 'cancel_after_dispatch'],
  packed:         ['shipped', 'exchange', 'cancel_before_dispatch', 'cancel_after_dispatch', 'mark_processing'],
  shipped:        ['delivered', 'cancel_after_dispatch', 'exchange', 'partial_delivery'],
  delivered:      ['exchange', 'partial_delivery'],
  cancelled:      [],
  refund:         [],
  exchange:       [],
  partial_delivery: [],
};

const ACTION_LABELS: Record<string, string> = {
  new_called:             'Mark as New & Called',
  confirmed:              'Confirm Order',
  send_to_lab:            'Send to Lab',
  in_lab:                 'Mark as In Lab',
  not_printed:            'Mark as Not Printed',
  packed:                 'Mark as Packed',
  printed:                'Mark as Printed',
  shipped:                'Mark as Shipped',
  delivered:              'Mark as Delivered',
  awaiting_payment:       'Awaiting Payment',
  late_delivery:          'Late Delivery',
  exchange:               'Exchange',
  cancel_before_dispatch: 'Cancel Before Dispatch',
  cancel_after_dispatch:  'Cancel After Dispatch',
  partial_delivery:       'Partial Delivery',
  mark_processing:        'Mark as Processing',
};

const STATUS_MAP: Record<string, string> = {
  new_called: 'new_called',
  confirmed: 'confirmed',
  send_to_lab: 'send_to_lab',
  in_lab: 'in_lab',
  not_printed: 'not_printed',
  packed: 'packed',
  printed: 'printed',
  shipped: 'shipped',
  delivered: 'delivered',
  awaiting_payment: 'awaiting_payment',
  late_delivery: 'late_delivery',
  exchange: 'exchange',
  cancel_before_dispatch: 'cancelled',
  cancel_after_dispatch: 'cancelled',
  partial_delivery: 'partial_delivery',
  mark_processing: 'not_printed',
};

export function CsActionPanel({ order, items, userId, userRole, onUpdated }: Props) {
  const [selectedAction, setSelectedAction] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancellationReasons, setCancellationReasons] = useState<CancellationReason[]>([]);

  const [form, setForm] = useState({
    cancellation_reason_id: '',
    cancellation_reason_text: '',
    late_delivery_reason: '',
    expected_delivery_date: '',
    exchange_return_id: '',
    partial_items: [] as string[],
  });

  useEffect(() => {
    supabase.from('cancellation_reasons').select('id, reason_text').eq('is_active', true).order('sort_order').then(({ data }) => {
      setCancellationReasons(data ?? []);
    });
  }, []);

  const availableActions = AVAILABLE_ACTIONS[order.cs_status] ?? [];

  const getWooConfig = async () => {
    const { data } = await supabase.from('woocommerce_config').select('store_url, consumer_key, consumer_secret').eq('is_active', true).maybeSingle();
    return data;
  };

  const callWooProxy = async (action: string, extra: Record<string, any> = {}) => {
    const config = await getWooConfig();
    if (!config || !order.woo_order_id) return;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    await fetch(`${supabaseUrl}/functions/v1/woo-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseKey}` },
      body: JSON.stringify({ action, store_url: config.store_url, consumer_key: config.consumer_key, consumer_secret: config.consumer_secret, order_id: order.woo_order_id, ...extra }),
    });
  };

  const handleApply = async () => {
    if (!selectedAction) return;
    setSaving(true);
    try {
      const newStatus = STATUS_MAP[selectedAction] ?? selectedAction;
      const updates: Record<string, any> = {
        cs_status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (selectedAction === 'send_to_lab') {
        updates.fulfillment_status = 'send_to_lab';
        await supabase.from('order_prescriptions').update({ lab_status: 'in_lab', lab_sent_date: new Date().toISOString() }).eq('order_id', order.id);
      }

      if (selectedAction === 'in_lab') {
        updates.fulfillment_status = 'in_lab';
      }

      if (selectedAction === 'packed') {
        updates.fulfillment_status = 'packed';
      }

      if (selectedAction === 'printed') {
        updates.fulfillment_status = 'printed';
      }

      if (selectedAction === 'not_printed') {
        updates.fulfillment_status = 'not_printed';
      }

      if (selectedAction === 'shipped') {
        updates.fulfillment_status = 'shipped';
        await callWooProxy('update-order-status', { status: 'completed' });
      }

      if (selectedAction === 'mark_processing') {
        if (userRole !== 'admin' && userRole !== 'warehouse_manager' && userRole !== 'operations_manager') {
          alert('Only warehouse staff can mark orders as processing.');
          setSaving(false);
          return;
        }
        updates.fulfillment_status = 'not_printed';
        await callWooProxy('update-order-status', { status: 'processing' });
      }

      if (selectedAction === 'late_delivery') {
        if (!form.late_delivery_reason || !form.expected_delivery_date) {
          alert('Please fill in the delay reason and expected delivery date.');
          setSaving(false);
          return;
        }
        updates.late_delivery_reason = form.late_delivery_reason;
        updates.expected_delivery_date = form.expected_delivery_date;
      }

      if (selectedAction === 'awaiting_payment') {
        // no extra fields required
      }

      if (selectedAction === 'exchange') {
        if (!form.exchange_return_id.trim()) {
          alert('Please enter the returnable order ID for the exchange.');
          setSaving(false);
          return;
        }
        const returnOrderId = form.exchange_return_id.trim();
        const returnNumber = `RET-${Date.now()}`;
        const { data: retOrder } = await supabase.from('orders').select('customer_id').eq('order_number', returnOrderId).maybeSingle();
        if (!retOrder) {
          alert('Return order not found. Please check the order number.');
          setSaving(false);
          return;
        }
        const { data: newReturn } = await supabase.from('returns').insert({
          return_number: returnNumber,
          order_id: order.id,
          customer_id: order.customer.id,
          return_reason: 'Exchange',
          status: 'expected',
          created_by: userId,
        }).select('id').single();
        if (newReturn) {
          updates.exchange_return_id = newReturn.id;
        }
      }

      if (selectedAction === 'cancel_before_dispatch') {
        if (!form.cancellation_reason_id) {
          alert('Please select a cancellation reason.');
          setSaving(false);
          return;
        }
        const reason = cancellationReasons.find(r => r.id === form.cancellation_reason_id);
        updates.cancellation_reason = reason?.reason_text ?? '';
        updates.cancellation_reason_id = form.cancellation_reason_id;
        await callWooProxy('cancel-order');
      }

      if (selectedAction === 'cancel_after_dispatch') {
        if (!form.cancellation_reason_id) {
          alert('Please select a cancellation reason.');
          setSaving(false);
          return;
        }
        const reason = cancellationReasons.find(r => r.id === form.cancellation_reason_id);
        updates.cancellation_reason = reason?.reason_text ?? '';
        updates.cancellation_reason_id = form.cancellation_reason_id;
      }

      if (selectedAction === 'partial_delivery') {
        if (form.partial_items.length === 0) {
          alert('Please select items that were not received.');
          setSaving(false);
          return;
        }
        const returnNumber = `RET-${Date.now()}`;
        const { data: newReturn } = await supabase.from('returns').insert({
          return_number: returnNumber,
          order_id: order.id,
          customer_id: order.customer.id,
          return_reason: 'Partial Delivery',
          status: 'expected',
          created_by: userId,
        }).select('id').single();
        if (newReturn) {
          for (const itemId of form.partial_items) {
            const item = items.find(i => i.id === itemId);
            if (item) {
              await supabase.from('return_items').insert({
                return_id: newReturn.id,
                order_item_id: itemId,
                product_id: item.product_id,
                sku: item.sku,
                quantity: item.quantity,
                qc_status: 'pending',
              });
            }
          }
        }
        updates.partial_delivery_notes = `Partial delivery: ${form.partial_items.length} item(s) returned.`;
      }

      await supabase.from('orders').update(updates).eq('id', order.id);
      await logActivity(order.id, `Status changed to: ${STATUS_CONFIG[newStatus]?.label ?? newStatus} (action: ${ACTION_LABELS[selectedAction]})`, userId);

      setSelectedAction('');
      setForm({ cancellation_reason_id: '', cancellation_reason_text: '', late_delivery_reason: '', expected_delivery_date: '', exchange_return_id: '', partial_items: [] });
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  const needsCancellationReason = selectedAction === 'cancel_before_dispatch' || selectedAction === 'cancel_after_dispatch';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="font-semibold text-gray-900 mb-4">CS Actions</h3>

      <div className="mb-3">
        <div className="text-xs font-medium text-gray-500 mb-1.5">Current Status</div>
        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${STATUS_CONFIG[order.cs_status]?.color ?? 'text-gray-700'} ${STATUS_CONFIG[order.cs_status]?.bg ?? 'bg-gray-100'} ${STATUS_CONFIG[order.cs_status]?.border ?? 'border-gray-200'}`}>
          {STATUS_CONFIG[order.cs_status]?.label ?? order.cs_status}
        </div>
      </div>

      {availableActions.length === 0 ? (
        <p className="text-sm text-gray-400">No actions available for this status.</p>
      ) : (
        <>
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-500 mb-1.5">Change Status</div>
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <span>{selectedAction ? ACTION_LABELS[selectedAction] : 'Select status change...'}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  {availableActions.map(action => (
                    <button
                      key={action}
                      onClick={() => { setSelectedAction(action); setShowDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${selectedAction === action ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      {ACTION_LABELS[action]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contextual Forms */}
          {selectedAction === 'late_delivery' && (
            <div className="space-y-3 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div>
                <div className="text-xs font-medium text-amber-800 mb-1">Delay Reason *</div>
                <input value={form.late_delivery_reason} onChange={e => setForm(p => ({ ...p, late_delivery_reason: e.target.value }))} className={inputCls} placeholder="Reason for late delivery..." />
              </div>
              <div>
                <div className="text-xs font-medium text-amber-800 mb-1">Expected Delivery Date *</div>
                <input type="date" value={form.expected_delivery_date} onChange={e => setForm(p => ({ ...p, expected_delivery_date: e.target.value }))} className={inputCls} />
              </div>
            </div>
          )}

          {selectedAction === 'exchange' && (
            <div className="space-y-3 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <div className="text-xs font-medium text-blue-800 mb-1">Returnable Order Number *</div>
                <input value={form.exchange_return_id} onChange={e => setForm(p => ({ ...p, exchange_return_id: e.target.value }))} className={inputCls} placeholder="e.g. ORD-2026-123456" />
                <p className="text-xs text-blue-600 mt-1">This order will appear in the Returns list.</p>
              </div>
            </div>
          )}

          {needsCancellationReason && (
            <div className="space-y-3 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              {selectedAction === 'cancel_before_dispatch' && (
                <div className="flex items-start gap-2 text-xs text-red-700 mb-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This will cancel the order on WooCommerce and restore stock.</span>
                </div>
              )}
              <div>
                <div className="text-xs font-medium text-red-800 mb-1">Cancellation Reason *</div>
                <select value={form.cancellation_reason_id} onChange={e => setForm(p => ({ ...p, cancellation_reason_id: e.target.value }))} className={inputCls}>
                  <option value="">Select a reason...</option>
                  {cancellationReasons.map(r => <option key={r.id} value={r.id}>{r.reason_text}</option>)}
                </select>
              </div>
            </div>
          )}

          {selectedAction === 'partial_delivery' && (
            <div className="space-y-2 mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-xs font-medium text-orange-800 mb-2">Select items NOT received by customer *</div>
              {items.map(item => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.partial_items.includes(item.id)}
                    onChange={e => setForm(p => ({
                      ...p,
                      partial_items: e.target.checked
                        ? [...p.partial_items, item.id]
                        : p.partial_items.filter(id => id !== item.id)
                    }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-800">{item.product_name} × {item.quantity}</span>
                </label>
              ))}
            </div>
          )}

          {selectedAction === 'mark_processing' && (
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-700">
                This will mark the order as processing on WooCommerce. Only warehouse staff can perform this action.
              </p>
            </div>
          )}

          {selectedAction && (
            <button
              onClick={handleApply}
              disabled={saving}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {saving ? 'Applying...' : `Apply: ${ACTION_LABELS[selectedAction]}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
