import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, AlertTriangle, Lock, Package } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { OrderDetail, OrderItem } from './types';
import { logActivity } from './service';
import { STATUS_CONFIG } from '../types';

interface Props {
  order: OrderDetail;
  items: OrderItem[];
  userId: string | null;
  userRole: string | null;
  hasPrescription: boolean;
  onUpdated: () => void;
}

interface CancellationReason {
  id: string;
  reason_text: string;
  cancellation_type: string;
}

const WAREHOUSE_ROLES = ['admin', 'warehouse_manager', 'operations_manager'];

const BASE_ACTIONS: Record<string, string[]> = {
  new_not_called:    ['awaiting_payment', 'late_delivery', 'cancel_before_dispatch', 'refund', 'exchange'],
  new_called:        ['awaiting_payment', 'late_delivery', 'cancel_before_dispatch', 'refund', 'exchange'],
  awaiting_payment:  ['cancel_before_dispatch', 'refund', 'exchange'],
  late_delivery:     ['cancel_before_dispatch', 'cancel_after_dispatch', 'refund', 'exchange'],
  send_to_lab:       ['mark_processing', 'cancel_before_dispatch', 'refund'],
  in_lab:            ['mark_processing', 'cancel_before_dispatch', 'refund'],
  not_printed:       ['mark_processing'],
  printed:           ['mark_processing'],
  packed:            ['mark_processing'],
  shipped:           ['mark_processing', 'delivered', 'cancel_after_dispatch', 'exchange', 'partial_delivery', 'reverse_pick', 'refund'],
  delivered:         ['exchange', 'partial_delivery', 'reverse_pick', 'refund'],
  cancelled:         ['mark_processing', 'refund'],
  cancelled_cbd:     ['mark_processing', 'refund'],
  cancelled_cad:     ['refund'],
  refund:            [],
  exchange:          ['refund'],
  partial_delivery:  ['refund'],
  reverse_pick:      ['refund'],
  exchange_returnable: [],
};

const ACTION_LABELS: Record<string, string> = {
  new_called:             'Mark as New & Called',
  send_to_lab:            'Send to Lab',
  in_lab:                 'Mark as In Lab',
  not_printed:            'Confirm Order',
  packed:                 'Mark as Packed',
  printed:                'Mark as Printed',
  shipped:                'Mark as Shipped',
  delivered:              'Mark as Delivered',
  awaiting_payment:       'Awaiting Payment',
  late_delivery:          'Late Delivery',
  exchange:               'Exchange',
  cancel_before_dispatch: 'Cancel Before Dispatch (CBD)',
  cancel_after_dispatch:  'Cancel After Dispatch (CAD)',
  partial_delivery:       'Partial Delivery',
  mark_processing:        'Mark as Processing',
  reverse_pick:           'Reverse Pick',
  refund:                 'Refund',
};

const STATUS_MAP: Record<string, string> = {
  new_called:             'new_called',
  send_to_lab:            'send_to_lab',
  in_lab:                 'in_lab',
  not_printed:            'not_printed',
  packed:                 'packed',
  printed:                'printed',
  shipped:                'shipped',
  delivered:              'delivered',
  awaiting_payment:       'awaiting_payment',
  late_delivery:          'late_delivery',
  exchange:               'exchange',
  cancel_before_dispatch: 'cancelled_cbd',
  cancel_after_dispatch:  'cancelled_cad',
  partial_delivery:       'partial_delivery',
  reverse_pick:           'reverse_pick',
  refund:                 'refund',
};


export function CsActionPanel({ order, items, userId, userRole, hasPrescription, onUpdated }: Props) {
  const [selectedAction, setSelectedAction] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancellationReasons, setCancellationReasons] = useState<CancellationReason[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    cancellation_reason_id: '',
    cancellation_reason_text: '',
    late_delivery_reason: '',
    expected_delivery_date: '',
    exchange_return_id: '',
    partial_items: [] as string[],
    refund_amount: '',
  });

  useEffect(() => {
    supabase.from('cancellation_reasons').select('id, reason_text, cancellation_type').eq('is_active', true).order('sort_order').then(({ data }) => {
      setCancellationReasons(data ?? []);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      cancellation_reason_id: '',
      cancellation_reason_text: '',
      late_delivery_reason: '',
      expected_delivery_date: '',
      exchange_return_id: '',
      partial_items: [],
      refund_amount: '',
    }));
  }, [selectedAction]);

  const isWarehouseRole = WAREHOUSE_ROLES.includes(userRole ?? '');
  const isInWarehouseOps = ['not_printed', 'printed', 'packed'].includes(order.cs_status);

  const CS_STATUSES_WITH_LAB = ['new_not_called', 'new_called', 'awaiting_payment', 'late_delivery'];
  const baseActions = BASE_ACTIONS[order.cs_status] ?? [];

  let availableActions = [...baseActions];

  if (CS_STATUSES_WITH_LAB.includes(order.cs_status) && hasPrescription) {
    availableActions = [...availableActions, 'send_to_lab'];
  }

  if (order.cs_status === 'in_lab') {
    if (hasPrescription) {
      availableActions = ['not_printed', 'cancel_before_dispatch', 'refund'];
    } else {
      availableActions = ['not_printed', 'cancel_before_dispatch', 'refund'];
    }
  }

  if ((CS_STATUSES_WITH_LAB.includes(order.cs_status) || order.cs_status === 'send_to_lab') && hasPrescription) {
    availableActions = availableActions.filter(a => a !== 'not_printed');
  }

  const showLabFlowNotice = hasPrescription && CS_STATUSES_WITH_LAB.includes(order.cs_status);

  const getWooConfig = async () => {
    const { data } = await supabase.from('woocommerce_config').select('store_url, consumer_key, consumer_secret').eq('is_connected', true).maybeSingle();
    return data;
  };

  const callWooProxy = async (action: string, extra: Record<string, unknown> = {}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> => {
    const config = await getWooConfig();
    if (!config) return { ok: false, error: 'No active WooCommerce configuration found.' };
    if (!order.woo_order_id) return { ok: false, skipped: true, error: 'Order has no WooCommerce order ID linked.' };
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/woo-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({ action, store_url: config.store_url, consumer_key: config.consumer_key, consumer_secret: config.consumer_secret, order_id: order.woo_order_id, ...extra }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => `HTTP ${res.status}`);
        return { ok: false, error: `WooCommerce API error: ${text}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error reaching WooCommerce.' };
    }
  };

  const handleApply = async () => {
    if (!selectedAction) return;
    setSaving(true);
    let wooSyncWarning: string | null = null;
    try {
      const newStatus = STATUS_MAP[selectedAction] ?? selectedAction;
      const updates: Record<string, unknown> = {
        cs_status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (selectedAction === 'not_printed') {
        updates.fulfillment_status = 'not_printed';
        await callWooProxy('update-order-status', { status: 'processing' });
      }

      if (selectedAction === 'send_to_lab') {
        updates.fulfillment_status = 'send_to_lab';
        await supabase.from('order_prescriptions').update({ lab_status: 'in_lab', lab_sent_date: new Date().toISOString() }).eq('order_id', order.id);
      }

      if (selectedAction === 'shipped') {
        updates.fulfillment_status = 'shipped';
        await callWooProxy('update-order-status', { status: 'completed' });
      }

      if (selectedAction === 'mark_processing') {
        const { count } = await supabase
          .from('order_call_log')
          .select('id', { count: 'exact', head: true })
          .eq('order_id', order.id);
        updates.cs_status = (count ?? 0) > 0 ? 'new_called' : 'new_not_called';
        updates.fulfillment_status = null;
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

      if (selectedAction === 'exchange') {
        if (!form.exchange_return_id.trim()) {
          alert('Please enter the returnable order number for the exchange.');
          setSaving(false);
          return;
        }
        const returnOrderNumber = form.exchange_return_id.trim();
        const isNumeric = /^\d+$/.test(returnOrderNumber);
        let retOrder: { id: string; customer_id: string; cs_status: string } | null = null;
        if (isNumeric) {
          const { data: byWooId } = await supabase
            .from('orders')
            .select('id, customer_id, cs_status')
            .eq('woo_order_id', parseInt(returnOrderNumber, 10))
            .maybeSingle();
          retOrder = byWooId;
          if (!retOrder) {
            const { data: byWooNumber } = await supabase
              .from('orders')
              .select('id, customer_id, cs_status')
              .eq('woo_order_number', returnOrderNumber)
              .maybeSingle();
            retOrder = byWooNumber;
          }
        } else {
          const { data: byOrderNumber } = await supabase
            .from('orders')
            .select('id, customer_id, cs_status')
            .eq('order_number', returnOrderNumber)
            .maybeSingle();
          retOrder = byOrderNumber;
        }
        if (!retOrder) {
          alert('No order found with that order number or WooCommerce ID. Please double-check the value and try again.');
          setSaving(false);
          return;
        }
        if (retOrder.cs_status !== 'delivered' && retOrder.cs_status !== 'partial_delivery') {
          alert('This order cannot be exchanged. Only orders that have been Delivered or Partially Delivered to the customer can be exchanged.');
          setSaving(false);
          return;
        }
        const returnNumber = `RET-${Date.now()}`;
        const { data: newReturn } = await supabase.from('returns').insert({
          return_number: returnNumber,
          order_id: retOrder.id,
          exchange_order_id: order.id,
          customer_id: order.customer.id,
          return_reason: 'Exchange',
          status: 'expected',
          created_by: userId,
        }).select('id').single();
        if (newReturn) {
          updates.exchange_return_id = newReturn.id;
          const { data: retOrderItems } = await supabase
            .from('order_items')
            .select('id, product_id, sku, quantity')
            .eq('order_id', retOrder.id);
          if (retOrderItems?.length) {
            await supabase.from('return_items').insert(
              retOrderItems.map(oi => ({
                return_id: newReturn.id,
                order_item_id: oi.id,
                product_id: oi.product_id,
                sku: oi.sku,
                quantity: oi.quantity,
                qc_status: 'pending',
              }))
            );
          }
        }
        await supabase.from('orders').update({
          cs_status: 'exchange_returnable',
          updated_at: new Date().toISOString(),
        }).eq('id', retOrder.id);
        await logActivity(retOrder.id, `Status changed to Exchange Returnable (EXR) — linked to exchange on order ${order.order_number}`, userId);
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
        updates.cancellation_type = 'cbd';
        const wooResult = await callWooProxy('cancel-order');
        if (!wooResult.ok) {
          wooSyncWarning = wooResult.skipped
            ? `Order cancelled in ERP. WooCommerce sync skipped — no WooCommerce order ID is linked to this order.`
            : `Order cancelled in ERP, but WooCommerce sync failed: ${wooResult.error}. Please update the status on WooCommerce manually.`;
        }
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
        updates.cancellation_type = 'cad';
        const { data: existingCadReturn } = await supabase
          .from('returns')
          .select('id')
          .eq('order_id', order.id)
          .maybeSingle();
        if (!existingCadReturn) {
          const returnNumber = `RET-${Date.now()}`;
          const { data: cadReturn } = await supabase.from('returns').insert({
            return_number: returnNumber,
            order_id: order.id,
            customer_id: order.customer.id,
            return_reason: 'CAD',
            status: 'expected',
            created_by: userId,
          }).select('id').single();
          if (cadReturn) {
            const { data: cadOrderItems } = await supabase
              .from('order_items')
              .select('id, product_id, sku, quantity')
              .eq('order_id', order.id);
            if (cadOrderItems?.length) {
              await supabase.from('return_items').insert(
                cadOrderItems.map(oi => ({
                  return_id: cadReturn.id,
                  order_item_id: oi.id,
                  product_id: oi.product_id,
                  sku: oi.sku,
                  quantity: oi.quantity,
                  qc_status: 'pending',
                }))
              );
            }
          }
        }
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

      if (selectedAction === 'delivered') {
        updates.fulfillment_status = 'shipped';
      }

      if (selectedAction === 'reverse_pick') {
        const returnNumber = `RET-${Date.now()}`;
        const { data: rpReturn } = await supabase.from('returns').insert({
          return_number: returnNumber,
          order_id: order.id,
          customer_id: order.customer.id,
          return_reason: 'Reverse Pick',
          status: 'expected',
          created_by: userId,
        }).select('id').single();
        if (rpReturn) {
          const { data: rpOrderItems } = await supabase
            .from('order_items')
            .select('id, product_id, sku, quantity')
            .eq('order_id', order.id);
          if (rpOrderItems?.length) {
            await supabase.from('return_items').insert(
              rpOrderItems.map(oi => ({
                return_id: rpReturn.id,
                order_item_id: oi.id,
                product_id: oi.product_id,
                sku: oi.sku,
                quantity: oi.quantity,
                qc_status: 'pending',
              }))
            );
          }
        }
      }

      if (selectedAction === 'refund') {
        const amount = parseFloat(form.refund_amount);
        if (!form.refund_amount || isNaN(amount) || amount <= 0) {
          alert('Please enter a valid refund amount.');
          setSaving(false);
          return;
        }
        const { data: refundCat } = await supabase.from('expense_categories').select('id').eq('name', 'Refund').maybeSingle();
        const { data: newExpense } = await supabase.from('expenses').insert({
          expense_date: new Date().toISOString().slice(0, 10),
          category_id: refundCat?.id ?? null,
          description: `Refund for Order ${order.order_number}`,
          amount,
          affects_profit: true,
          created_by: userId,
        }).select('id').single();
        if (newExpense) {
          updates.order_refund_expense_id = newExpense.id;
        }
      }

      await supabase.from('orders').update(updates).eq('id', order.id);
      const finalStatus = (updates.cs_status as string) ?? newStatus;
      await logActivity(order.id, `Status changed to: ${STATUS_CONFIG[finalStatus]?.label ?? finalStatus} (action: ${ACTION_LABELS[selectedAction]})`, userId);

      if (wooSyncWarning) {
        await logActivity(order.id, `WooCommerce sync warning: ${wooSyncWarning}`, userId);
      }

      setSelectedAction('');
      setForm({
        cancellation_reason_id: '', cancellation_reason_text: '',
        late_delivery_reason: '', expected_delivery_date: '',
        exchange_return_id: '', partial_items: [],
        refund_amount: '',
      });
      onUpdated();

      if (wooSyncWarning) {
        alert(wooSyncWarning);
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  const needsCancellationReason = selectedAction === 'cancel_before_dispatch' || selectedAction === 'cancel_after_dispatch';

  const getButtonLabel = () => {
    if (saving) return 'Applying...';
    switch (selectedAction) {
      case 'exchange':          return 'Mark as Exchange';
      case 'cancel_after_dispatch': return 'Confirm CAD';
      case 'cancel_before_dispatch': return 'Confirm CBD';
      case 'partial_delivery':  return 'Process Partial Delivery';
      case 'reverse_pick':      return 'Confirm Status Change';
      case 'refund':            return 'Process Refund';
      default: return `Apply: ${ACTION_LABELS[selectedAction] ?? selectedAction}`;
    }
  };

  const getButtonColor = () => {
    switch (selectedAction) {
      case 'cancel_before_dispatch':
      case 'cancel_after_dispatch':
        return 'bg-red-600 hover:bg-red-700 disabled:bg-red-300';
      case 'refund':
        return 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300';
      case 'exchange':
      case 'partial_delivery':
      case 'reverse_pick':
        return 'bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400';
      default:
        return 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="font-semibold text-gray-900 mb-4">CS Actions</h3>

      <div className="mb-3">
        <div className="text-xs font-medium text-gray-500 mb-1.5">Current Status</div>
        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${STATUS_CONFIG[order.cs_status]?.color ?? 'text-gray-700'} ${STATUS_CONFIG[order.cs_status]?.bg ?? 'bg-gray-100'} ${STATUS_CONFIG[order.cs_status]?.border ?? 'border-gray-200'}`}>
          {STATUS_CONFIG[order.cs_status]?.label ?? order.cs_status}
        </div>
      </div>

      {isInWarehouseOps && (
        <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5">
          <Package className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-0.5">Order in Warehouse Operations</div>
            <p className="text-xs text-slate-600">
              This order is being processed by the warehouse team.{isWarehouseRole ? ' Use Mark as Processing to return it to the CS queue.' : ' Ask the warehouse to use Mark as Processing to make CS changes.'}
            </p>
          </div>
        </div>
      )}

      {showLabFlowNotice && (
        <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-teal-800 mb-0.5">Prescription Order — Lab Required</div>
            <p className="text-xs text-teal-700">
              This order has prescription lenses. Use <strong>Send to Lab</strong> first. The order can only be confirmed after it returns from the lab (<strong>In Lab</strong> status).
            </p>
          </div>
        </div>
      )}

      {availableActions.length === 0 ? (
        <p className="text-sm text-gray-400">No actions available for this status.</p>
      ) : (
        <>
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-500 mb-1.5">Change Status</div>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <span>{selectedAction ? ACTION_LABELS[selectedAction] : 'Select status change...'}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 overflow-y-auto">
                  {availableActions.map(action => {
                    const isLocked = action === 'mark_processing' && !isWarehouseRole;
                    return (
                      <button
                        key={action}
                        onClick={() => {
                          if (!isLocked) {
                            setSelectedAction(action);
                            setShowDropdown(false);
                          }
                        }}
                        disabled={isLocked}
                        title={isLocked ? 'Only warehouse staff can use this action' : undefined}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                          isLocked
                            ? 'text-gray-300 cursor-not-allowed'
                            : selectedAction === action
                              ? 'text-blue-600 font-medium hover:bg-gray-50'
                              : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{ACTION_LABELS[action]}</span>
                        {isLocked && <Lock className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedAction === 'mark_processing' && !isWarehouseRole && (
              <p className="text-xs text-amber-600 mt-1">Only warehouse staff can mark orders as processing.</p>
            )}
          </div>

          {/* Late delivery form */}
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

          {/* Exchange form */}
          {selectedAction === 'exchange' && (
            <div className="space-y-3 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <div className="text-xs font-medium text-blue-800 mb-1">Returnable Order Number *</div>
                <input value={form.exchange_return_id} onChange={e => setForm(p => ({ ...p, exchange_return_id: e.target.value }))} className={inputCls} placeholder="e.g. ORD-2026-123456 or 1966207" />
                <p className="text-xs text-blue-500 mt-1">Enter the ERP order number or WooCommerce order ID. The linked order must be in Delivered or Partial Delivery status — it will be changed to Exchange Returnable (EXR).</p>
              </div>
            </div>
          )}

          {/* Cancellation reason */}
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
                  {cancellationReasons
                    .filter(r => {
                      const type = selectedAction === 'cancel_after_dispatch' ? 'cad' : 'cbd';
                      return r.cancellation_type === type || r.cancellation_type === 'both';
                    })
                    .map(r => <option key={r.id} value={r.id}>{r.reason_text}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Partial delivery item selection */}
          {selectedAction === 'partial_delivery' && (
            <div className="space-y-2 mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-xs font-medium text-orange-800 mb-2">Select Items to Return *</div>
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
                  <span className="text-sm text-gray-800">{item.product_name} <span className="text-gray-400">(Qty: {item.quantity})</span></span>
                </label>
              ))}
            </div>
          )}

          {/* Reverse pick info */}
          {selectedAction === 'reverse_pick' && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-xs text-rose-700">
                The order will be listed in Returns with <strong>Reverse Pick</strong> status for the warehouse team to prioritize retrieval.
              </p>
            </div>
          )}

          {/* Mark as processing info (warehouse only) */}
          {selectedAction === 'mark_processing' && isWarehouseRole && (
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-700">
                This will return the order to the CS queue (New & Called or New & Not Called based on call history) and sync status to WooCommerce as processing.
              </p>
            </div>
          )}

          {/* Refund form */}
          {selectedAction === 'refund' && (
            <div className="space-y-3 mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <div>
                <div className="text-xs font-medium text-rose-800 mb-1">Refund Amount *</div>
                <input
                  type="number"
                  value={form.refund_amount}
                  onChange={e => setForm(p => ({ ...p, refund_amount: e.target.value }))}
                  className={inputCls}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-rose-600 mt-1">Will be recorded as an expense in the Refund category.</p>
              </div>
            </div>
          )}

          {selectedAction && (
            <button
              onClick={handleApply}
              disabled={saving}
              className={`w-full py-2.5 text-white rounded-lg text-sm font-semibold transition-colors ${getButtonColor()}`}
            >
              {getButtonLabel()}
            </button>
          )}
        </>
      )}
    </div>
  );
}
