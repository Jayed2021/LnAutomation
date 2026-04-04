import React, { useState } from 'react';
import { Save, X, CreditCard as Edit2, CheckCircle, AlertCircle, Zap, Pencil, DollarSign, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { OrderDetail, OrderCourierInfo } from './types';
import { logActivity } from './service';

const COURIERS = ['Pathao', 'Steadfast', 'Redx', 'Sundarban', 'Office Delivery'];
const CONFIRMATION_METHODS = [
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'assumption', label: 'Assumption' },
  { value: 'in_person', label: 'In Person' },
];

const FINAL_STATUSES = new Set(['delivered', 'cancel_after_dispatch', 'exchange', 'partial_delivery']);
const POST_SHIPPED_STATUSES = new Set(['shipped', 'delivered', 'cancel_after_dispatch', 'exchange', 'partial_delivery']);

const SOURCE_LABELS: Record<string, string> = {
  courier_api: 'Courier API',
  invoice_upload: 'Invoice Upload',
  manual: 'Manual',
};

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
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [settlementEditing, setSettlementEditing] = useState(false);
  const [settlementSaving, setSettlementSaving] = useState(false);

  const isPartialPaidOrder = order.payment_method?.toLowerCase().startsWith('partial paid') ||
    order.payment_method?.toLowerCase().includes('+cod');
  const expectedReceivable = isPartialPaidOrder && order.paid_amount != null
    ? order.total_amount - order.paid_amount
    : order.total_amount;

  const isPostShipped = POST_SHIPPED_STATUSES.has(order.cs_status);

  const [edit, setEdit] = useState({
    courier_company: courier?.courier_company ?? '',
    tracking_number: courier?.tracking_number ?? '',
    courier_area: courier?.courier_area ?? '',
    total_receivable: Number(courier?.total_receivable ?? expectedReceivable),
    cod_charge: Number(courier?.cod_charge ?? 0),
    delivery_discount: Number(courier?.delivery_discount ?? 0),
  });

  const [settlementEdit, setSettlementEdit] = useState({
    collected_amount: Number(courier?.collected_amount ?? 0),
    delivery_charge: Number(courier?.delivery_charge ?? 0),
  });

  const [confirmEdit, setConfirmEdit] = useState({
    confirmation_method: order.confirmation_type ?? '',
    courier_entry_method: order.courier_entry_method ?? 'manual',
  });

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  const isShipped = order.cs_status === 'shipped';
  const isOfficeDelivery = edit.courier_company === 'Office Delivery';
  const isPathao = edit.courier_company === 'Pathao';

  const getOfficeDeliveryErrors = (): string[] => {
    if (!isOfficeDelivery) return [];
    const errors: string[] = [];
    const pm = order.payment_method?.toLowerCase().trim() ?? '';
    const isEffectivelyCod = !pm || pm === 'cod' || pm === 'cash on delivery' || pm === 'cash_on_delivery';
    const isNonCodLegacy = !isEffectivelyCod && !pm.startsWith('prepaid') && !pm.startsWith('partial paid');
    if (isEffectivelyCod) {
      errors.push('Payment method must not be COD for Office Delivery');
    }
    if (!isNonCodLegacy && !order.payment_reference?.trim()) {
      errors.push('Payment reference is required for Office Delivery');
    }
    return errors;
  };

  const officeDeliveryErrors = getOfficeDeliveryErrors();

  const performSave = async () => {
    if (courier) {
      await supabase.from('order_courier_info').update({
        courier_company: edit.courier_company,
        tracking_number: edit.tracking_number,
        courier_area: edit.courier_area,
        total_receivable: isPostShipped ? courier.total_receivable : edit.total_receivable,
        cod_charge: edit.cod_charge,
        delivery_discount: isPostShipped ? edit.delivery_discount : 0,
        updated_at: new Date().toISOString(),
      }).eq('id', courier.id);
    } else {
      await supabase.from('order_courier_info').insert({
        order_id: order.id,
        courier_company: edit.courier_company,
        tracking_number: edit.tracking_number,
        courier_area: edit.courier_area,
        total_receivable: edit.total_receivable,
        cod_charge: edit.cod_charge,
        delivery_discount: 0,
      });
    }
    await logActivity(order.id, `Courier info updated`, userId);
    setEditing(false);
    onUpdated();
  };

  const handleSaveCourier = async () => {
    if (officeDeliveryErrors.length > 0) return;
    setSaving(true);
    try {
      await performSave();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettlement = async () => {
    setSettlementSaving(true);
    try {
      const prevCollected = courier?.collected_amount ?? 0;
      const prevDelivery = courier?.delivery_charge ?? 0;
      const newCollected = settlementEdit.collected_amount;
      const newDelivery = settlementEdit.delivery_charge;

      const changes: string[] = [];
      if (newCollected !== prevCollected) {
        changes.push(`collected_amount changed from ${prevCollected} to ${newCollected}`);
      }
      if (newDelivery !== prevDelivery) {
        changes.push(`delivery_charge changed from ${prevDelivery} to ${newDelivery}`);
      }

      if (courier) {
        await supabase.from('order_courier_info').update({
          collected_amount: newCollected,
          delivery_charge: newDelivery,
          settlement_source: 'manual',
          updated_at: new Date().toISOString(),
        }).eq('id', courier.id);
      } else {
        await supabase.from('order_courier_info').insert({
          order_id: order.id,
          collected_amount: newCollected,
          delivery_charge: newDelivery,
          settlement_source: 'manual',
          total_receivable: order.total_amount,
        });
      }

      if (changes.length > 0) {
        await logActivity(order.id, `Settlement override (manual): ${changes.join(', ')}`, userId);
      }

      setSettlementEditing(false);
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSettlementSaving(false);
    }
  };

  const hasCourierCompany = !!edit.courier_company;
  const hasTrackingNumber = !!(courier?.tracking_number?.trim());
  const isManualEntry = confirmEdit.courier_entry_method === 'manual';

  const isCodPaymentMethod = (() => {
    const pm = order.payment_method?.toLowerCase().trim() ?? '';
    return !pm || pm === 'cod' || pm === 'cash on delivery' || pm === 'cash_on_delivery' ||
      pm.startsWith('partial paid') || pm.includes('+cod');
  })();

  const currentReceivable = courier?.total_receivable ?? expectedReceivable;
  const isReceivableZeroBlock = isCodPaymentMethod && (currentReceivable <= 0);

  const getManualMissingFields = () => {
    const missing: string[] = [];
    if (!hasCourierCompany) missing.push('Courier Company');
    if (!hasTrackingNumber) missing.push('Tracking Number');
    if (isReceivableZeroBlock) missing.push('Total Receivable Amount');
    return missing;
  };

  const COURIERS_REQUIRING_AREA: string[] = [];

  const getAutoMissingFields = () => {
    const missing: string[] = [];
    if (!hasCourierCompany) missing.push('Courier Company');
    if (
      edit.courier_company &&
      COURIERS_REQUIRING_AREA.includes(edit.courier_company) &&
      !edit.courier_area?.trim()
    ) missing.push('Area');
    if (isReceivableZeroBlock) missing.push('Total Receivable Amount');
    return missing;
  };

  const missingConfirmFields = isManualEntry ? getManualMissingFields() : getAutoMissingFields();
  const canConfirm = !!confirmEdit.confirmation_method && missingConfirmFields.length === 0;

  const submitToPathao = async (orderId: string): Promise<string | null> => {
    const { data, error } = await supabase.functions.invoke('pathao-create-order', {
      body: { order_id: orderId },
    });
    if (error) return error.message ?? 'Edge function invocation failed';
    if (!data?.success) return data?.error ?? 'Pathao order creation failed';
    return null;
  };

  const handleConfirmOrder = async () => {
    if (!canConfirm) return;
    setConfirmingOrder(true);
    setConfirmError(null);
    try {
      if (confirmEdit.courier_entry_method === 'automatic') {
        await supabase.from('orders').update({
          confirmation_type: confirmEdit.confirmation_method,
          courier_entry_method: confirmEdit.courier_entry_method,
          confirmed_by: userId,
          updated_at: new Date().toISOString(),
        }).eq('id', order.id);

        const err = await submitToPathao(order.id);
        if (err) {
          setConfirmError(err);
          onUpdated();
          return;
        }

        await supabase.from('orders').update({
          cs_status: 'not_printed',
          fulfillment_status: 'not_printed',
          updated_at: new Date().toISOString(),
        }).eq('id', order.id);
        await logActivity(order.id, `Order confirmed via ${confirmEdit.confirmation_method} (Automatic API)`, userId);
      } else {
        await supabase.from('orders').update({
          cs_status: 'not_printed',
          confirmation_type: confirmEdit.confirmation_method,
          courier_entry_method: confirmEdit.courier_entry_method,
          confirmed_by: userId,
          fulfillment_status: 'not_printed',
          updated_at: new Date().toISOString(),
        }).eq('id', order.id);
        await logActivity(order.id, `Order confirmed via ${confirmEdit.confirmation_method} (Manual entry)`, userId);
      }

      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmingOrder(false);
    }
  };

  const handleRetryPathao = async () => {
    setRetrying(true);
    setConfirmError(null);
    try {
      const err = await submitToPathao(order.id);
      if (err) setConfirmError(err);
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setRetrying(false);
    }
  };

  const CONFIRMABLE_STATUSES = ['new_not_called', 'new_called', 'in_lab', 'awaiting_payment', 'late_delivery', 'exchange'];
  const isConfirmable = CONFIRMABLE_STATUSES.includes(order.cs_status);
  const isConfirmed = !CONFIRMABLE_STATUSES.includes(order.cs_status) && !!order.confirmation_type;
  const isFinalStatus = FINAL_STATUSES.has(order.cs_status);

  const settlementSource = courier?.settlement_source ?? null;
  const hasPostShipFlag = courier?.total_receivable_modified_after_ship === true;

  const deliveryDiscount = isPostShipped ? (editing ? edit.delivery_discount : Number(courier?.delivery_discount ?? 0)) : 0;
  const displayReceivable = Number(courier?.total_receivable ?? expectedReceivable);
  const effectiveCollection = displayReceivable - deliveryDiscount;

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900">Courier &amp; Payment</h3>
          {!editing ? (
            <button onClick={() => {
              setEdit({
                courier_company: courier?.courier_company ?? '',
                tracking_number: courier?.tracking_number ?? '',
                courier_area: courier?.courier_area ?? '',
                total_receivable: Number(courier?.total_receivable ?? expectedReceivable),
                cod_charge: Number(courier?.cod_charge ?? 0),
                delivery_discount: Number(courier?.delivery_discount ?? 0),
              });
              setEditing(true);
            }} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
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
                disabled={saving || officeDeliveryErrors.length > 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {hasPostShipFlag && !editing && (
          <div className="mb-4 flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-300 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Receivable Modified After Dispatch</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Total receivable was changed after shipment — needs accounts review.
              </p>
              {courier?.total_receivable_ship_note && (
                <p className="text-xs text-amber-900 mt-1 font-medium">Remark: {courier.total_receivable_ship_note}</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Courier Company</div>
            {editing
              ? <select value={edit.courier_company} onChange={e => {
                  const company = e.target.value;
                  setEdit(p => ({ ...p, courier_company: company }));
                  if (company !== 'Pathao') {
                    setConfirmEdit(p => ({ ...p, courier_entry_method: 'manual' }));
                  }
                }} className={inputCls}>
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
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-medium text-gray-500">Tracking Number</span>
              {isConfirmable && !hasTrackingNumber && isManualEntry && (
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Required for manual entry</span>
              )}
            </div>
            {editing
              ? <input value={edit.tracking_number} onChange={e => setEdit(p => ({ ...p, tracking_number: e.target.value }))} className={`${inputCls} ${isConfirmable && isManualEntry && !edit.tracking_number ? 'border-amber-400 focus:ring-amber-400' : ''}`} placeholder="Enter tracking number from courier" />
              : <div className={`text-sm font-mono ${courier?.tracking_number ? 'text-gray-900' : 'text-gray-400'}`}>{courier?.tracking_number || '—'}</div>}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-xs font-medium text-green-700 mb-0.5">Total Receivable (Courier Collection)</div>
            {editing && !isPostShipped
              ? <input type="number" value={edit.total_receivable} onChange={e => setEdit(p => ({ ...p, total_receivable: parseFloat(e.target.value) || 0 }))} className={inputCls} />
              : <div className="text-lg font-bold text-green-800">৳{displayReceivable.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</div>}
            <div className="text-xs text-green-600 mt-0.5">Amount to collect from customer</div>
            {editing && isPartialPaidOrder && order.paid_amount != null && !isPostShipped && edit.total_receivable !== expectedReceivable && (
              <p className="text-xs text-amber-700 mt-1 font-medium flex items-center gap-1">
                Expected COD amount is ৳{expectedReceivable.toLocaleString('en-BD', { minimumFractionDigits: 2 })} based on paid amount.
              </p>
            )}
          </div>

          {isPostShipped && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
              <div>
                <div className="text-xs font-medium text-orange-700 mb-1">Discount During Delivery</div>
                {editing
                  ? <input
                      type="number"
                      value={edit.delivery_discount}
                      onChange={e => setEdit(p => ({ ...p, delivery_discount: parseFloat(e.target.value) || 0 }))}
                      className={inputCls}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  : <div className="text-sm font-semibold text-orange-800">
                      ৳{(courier?.delivery_discount ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </div>}
              </div>
              {(deliveryDiscount > 0 || editing) && (
                <div className="pt-2 border-t border-orange-200">
                  <div className="text-xs text-orange-600">Effective Collection</div>
                  <div className="text-sm font-bold text-orange-900">
                    ৳{effectiveCollection.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}
            </div>
          )}

          {editing && !isPostShipped && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Delivery Charge</div>
              <input type="number" value={edit.cod_charge} onChange={e => setEdit(p => ({ ...p, cod_charge: parseFloat(e.target.value) || 0 }))} className={inputCls} />
            </div>
          )}

          {editing && isOfficeDelivery && officeDeliveryErrors.length > 0 && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-800">Office Delivery Requirements</p>
                <ul className="mt-1 space-y-0.5">
                  {officeDeliveryErrors.map((err, i) => (
                    <li key={i} className="text-xs text-red-700">• {err}</li>
                  ))}
                </ul>
                <p className="text-xs text-red-600 mt-1">Update Payment Method and Payment Reference in the Customer Information section before saving.</p>
              </div>
            </div>
          )}
        </div>

        {/* Settlement Amounts — only shown after a final status */}
        {isFinalStatus && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-900">Settlement Amounts</span>
                {settlementSource && (
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                    {SOURCE_LABELS[settlementSource] ?? settlementSource}
                  </span>
                )}
              </div>
              {!settlementEditing ? (
                <button
                  onClick={() => {
                    setSettlementEdit({
                      collected_amount: Number(courier?.collected_amount ?? 0),
                      delivery_charge: Number(courier?.delivery_charge ?? 0),
                    });
                    setSettlementEditing(true);
                  }}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setSettlementEditing(false)} className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={handleSaveSettlement}
                    disabled={settlementSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {settlementSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Collected Amount</div>
                {settlementEditing
                  ? <input
                      type="number"
                      value={settlementEdit.collected_amount}
                      onChange={e => setSettlementEdit(p => ({ ...p, collected_amount: parseFloat(e.target.value) || 0 }))}
                      className={inputCls}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  : <div className="text-sm font-semibold text-gray-900">
                      ৳{(courier?.collected_amount ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </div>
                }
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Delivery Charge</div>
                {settlementEditing
                  ? <input
                      type="number"
                      value={settlementEdit.delivery_charge}
                      onChange={e => setSettlementEdit(p => ({ ...p, delivery_charge: parseFloat(e.target.value) || 0 }))}
                      className={inputCls}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  : <div className="text-sm font-semibold text-gray-900">
                      ৳{(courier?.delivery_charge ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </div>
                }
              </div>
            </div>
          </div>
        )}

        {/* Confirm Order Section */}
        {isConfirmable && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-900">Confirm Order</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1.5">Courier Entry Method</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfirmEdit(p => ({ ...p, courier_entry_method: 'manual' }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                      confirmEdit.courier_entry_method === 'manual'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5 shrink-0" />
                    Manual Entry
                  </button>
                  <button
                    onClick={() => isPathao && setConfirmEdit(p => ({ ...p, courier_entry_method: 'automatic' }))}
                    disabled={!isPathao}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                      !isPathao
                        ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        : confirmEdit.courier_entry_method === 'automatic'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 shrink-0" />
                    Automatic API
                  </button>
                </div>
                {!isPathao && (
                  <p className="text-xs text-gray-400 mt-1.5">Automatic API is only available for Pathao.</p>
                )}
                {isPathao && confirmEdit.courier_entry_method === 'automatic' && (
                  <p className="text-xs text-blue-600 mt-1.5">Order will be submitted to Pathao automatically when you confirm.</p>
                )}
              </div>

              {missingConfirmFields.length > 0 && (
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">
                      {isManualEntry ? 'Required for Manual Entry' : 'Required for Automatic API'}
                    </p>
                    <ul className="mt-0.5 space-y-0.5">
                      {missingConfirmFields.map((f, i) => (
                        <li key={i} className="text-xs text-amber-700">
                          {f === 'Total Receivable Amount'
                            ? '• Required Total Receivable Amount'
                            : `• ${f} — save above before confirming`}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Confirmation Method</div>
                <select
                  value={confirmEdit.confirmation_method}
                  onChange={e => setConfirmEdit(p => ({ ...p, confirmation_method: e.target.value }))}
                  className={inputCls}
                  disabled={missingConfirmFields.length > 0}
                >
                  <option value="">Select method...</option>
                  {CONFIRMATION_METHODS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <button
                onClick={handleConfirmOrder}
                disabled={confirmingOrder || !canConfirm}
                className="w-full py-2.5 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {confirmingOrder ? 'Confirming...' : 'Confirm Order'}
              </button>

              {confirmError && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-800">Pathao Submission Failed</p>
                    <p className="text-xs text-red-700 mt-0.5 break-words">{confirmError}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isConfirmed && order.confirmation_type && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span>Confirmed via {CONFIRMATION_METHODS.find(t => t.value === order.confirmation_type)?.label ?? order.confirmation_type}</span>
            </div>

            {order.courier_entry_method === 'automatic' && courier?.courier_api_error && !courier?.consignment_id && (
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-800">Pathao submission failed — retries available</p>
                  <p className="text-xs text-amber-700 mt-0.5 break-words">{courier.courier_api_error}</p>
                  {confirmError && (
                    <p className="text-xs text-red-700 mt-1 break-words font-medium">{confirmError}</p>
                  )}
                  <button
                    onClick={handleRetryPathao}
                    disabled={retrying}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Zap className="w-3 h-3" />
                    {retrying ? 'Retrying...' : 'Retry Pathao Submission'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
