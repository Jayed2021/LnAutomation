import React, { useState, useEffect } from 'react';
import { CreditCard as Edit2, Trash2, Save, X, ChevronDown, ChevronUp, ExternalLink, Tag, Receipt, Plus, Lock, Eye, Percent, DollarSign, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { OrderItem, OrderDetail, OrderPrescription, FeeLine } from './types';
import { logActivity } from './service';
import { AddProductsModal } from './AddProductsModal';

interface Props {
  order: OrderDetail;
  items: OrderItem[];
  prescriptions: OrderPrescription[];
  userId: string | null;
  onUpdated: () => void;
}

interface FeeRow {
  _type: 'fee';
  _tempId: string;
  name: string;
  amount: number;
}

interface EditableFeeLine extends FeeLine {
  _deleted?: boolean;
}

type EditableItem = OrderItem & { _deleted?: boolean };

type DiscountType = 'percentage' | 'flat';

interface DiscountState {
  type: DiscountType;
  value: string;
}

function isLikelyUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

const RX_KEYS = ['prescription', 'lens', 'sph', 'cyl', 'axis', 'pd', 'rx', 'power', 'bifocal', 'progressive', 'vision'];

function hasPrescriptionMeta(meta_data: { key: string; value: string }[]): boolean {
  return meta_data.some(m => {
    const k = m.key.toLowerCase();
    return RX_KEYS.some(rx => k.includes(rx));
  });
}

function hasFeeMeta(meta_data: { key: string; value: string }[]): boolean {
  return meta_data.some(m => m.key.toLowerCase().includes('fee'));
}

function fmt(n: number): string {
  return '৳' + n.toLocaleString('en-BD', { minimumFractionDigits: 2 });
}

export function OrderItemsCard({ order, items, prescriptions, userId, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [feeRows, setFeeRows] = useState<FeeRow[]>([]);
  const [editFeeLines, setEditFeeLines] = useState<EditableFeeLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [expandedMeta, setExpandedMeta] = useState<Set<string>>(new Set());
  const [showAddProducts, setShowAddProducts] = useState(false);
  const [addingFee, setAddingFee] = useState(false);
  const [reservedByProduct, setReservedByProduct] = useState<Record<string, number>>({});

  const [editShippingFee, setEditShippingFee] = useState<string>('0');
  const [editDiscount, setEditDiscount] = useState<string>('0');

  const [showDiscountPanel, setShowDiscountPanel] = useState(false);
  const [discount, setDiscount] = useState<DiscountState>({ type: 'flat', value: '' });

  const RESERVATION_STATUSES = ['new_not_called', 'new_called', 'late_delivery', 'not_printed', 'in_lab', 'send_to_lab', 'printed', 'packed'];

  const loadReservations = async () => {
    if (!RESERVATION_STATUSES.includes(order.cs_status)) return;
    const { data } = await supabase
      .from('order_lot_reservations')
      .select('product_id, quantity')
      .eq('order_id', order.id);
    if (!data) return;
    const byProduct: Record<string, number> = {};
    for (const r of data) {
      if (r.product_id) {
        byProduct[r.product_id] = (byProduct[r.product_id] ?? 0) + r.quantity;
      }
    }
    setReservedByProduct(byProduct);
  };

  useEffect(() => {
    loadReservations();
  }, [order.id, order.cs_status]);

  const startEdit = () => {
    setEditItems(items.map(i => ({ ...i })));
    setFeeRows([]);
    setEditFeeLines((order.fee_lines ?? []).map(f => ({ ...f })));
    setEditShippingFee(String(order.shipping_fee ?? 0));
    setEditDiscount(String(order.discount_amount ?? 0));
    setShowDiscountPanel(false);
    setDiscount({ type: 'flat', value: '' });
    setEditing(true);
    setSyncStatus('idle');
    setSyncMessage(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setFeeRows([]);
    setEditFeeLines([]);
    setShowDiscountPanel(false);
    setDiscount({ type: 'flat', value: '' });
    setSyncStatus('idle');
    setSyncMessage(null);
  };

  const applyDiscount = () => {
    const val = parseFloat(discount.value) || 0;
    if (val <= 0) return;

    if (discount.type === 'flat') {
      setEditDiscount(String(val));
    } else {
      const base = liveSubtotalForDiscount;
      const computed = Math.round((base * val) / 100 * 100) / 100;
      setEditDiscount(String(computed));
    }
    setShowDiscountPanel(false);
    setDiscount({ type: 'flat', value: '' });
  };

  const handleSave = async () => {
    setSaving(true);
    setSyncStatus('idle');
    setSyncMessage(null);

    const originalIds = new Set(items.map(i => i.id));
    const deletedItems = editItems.filter(i => i._deleted);
    const addedItems = editItems.filter(i => !originalIds.has(i.id));
    const itemsChanged = deletedItems.length > 0 || addedItems.length > 0;

    const updatedFeeLines = editFeeLines.filter(f => !f._deleted);
    const feeLinesChanged = editFeeLines.some(f => f._deleted) ||
      JSON.stringify(editFeeLines.filter(f => !f._deleted)) !== JSON.stringify(order.fee_lines ?? []);

    const newShippingFee = parseFloat(editShippingFee) || 0;
    const newDiscountAmount = parseFloat(editDiscount) || 0;

    try {
      for (const item of editItems.filter(i => !i._deleted)) {
        const lineTotal = item.quantity * item.unit_price;
        if (originalIds.has(item.id)) {
          await supabase.from('order_items').update({
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: lineTotal,
            discount_amount: item.discount_amount,
          }).eq('id', item.id);
        } else {
          await supabase.from('order_items').insert({
            id: item.id,
            order_id: order.id,
            product_id: item.product_id,
            sku: item.sku,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: lineTotal,
            discount_amount: item.discount_amount ?? 0,
            woo_item_id: (item as any).woo_item_id ?? null,
          });
        }
      }

      for (const item of deletedItems) {
        if (originalIds.has(item.id)) {
          await supabase.from('order_items').delete().eq('id', item.id);
        }
      }

      for (const fee of feeRows) {
        await supabase.from('order_items').insert({
          order_id: order.id,
          product_id: null,
          sku: 'FEE',
          product_name: fee.name,
          quantity: 1,
          unit_price: fee.amount,
          line_total: fee.amount,
          discount_amount: 0,
        });
      }

      const activeItems = editItems.filter(i => !i._deleted && i.sku !== 'RX');
      const itemsSubtotal = activeItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
        + feeRows.reduce((s, f) => s + f.amount, 0);
      const feeLineTotal = updatedFeeLines.reduce((s, f) => s + (parseFloat(f.total) || parseFloat(f.amount) || 0), 0);
      const subtotal = itemsSubtotal + rxFeeTotal;
      const total = itemsSubtotal + feeLineTotal + rxFeeTotal + newShippingFee - newDiscountAmount;

      await supabase.from('orders').update({
        subtotal,
        total_amount: Math.max(0, total),
        fee_lines: updatedFeeLines,
        shipping_fee: newShippingFee,
        discount_amount: newDiscountAmount,
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);

      await logActivity(order.id, 'Order items updated', userId);

      if (RESERVATION_STATUSES.includes(order.cs_status)) {
        await supabase.rpc('reserve_stock_for_order', { p_order_id: order.id });
        await loadReservations();
      }

      if (itemsChanged || feeRows.length > 0) {
        setSyncStatus('syncing');
        await syncToWooCommerce(addedItems, deletedItems, feeRows);
      } else {
        setEditing(false);
        setFeeRows([]);
        setEditFeeLines([]);
        onUpdated();
      }
    } catch (err: any) {
      console.error(err);
      setSyncMessage(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const syncToWooCommerce = async (
    addedItems: EditableItem[],
    deletedItems: EditableItem[],
    fees: FeeRow[]
  ) => {
    try {
      const { data: wooConfig } = await supabase
        .from('woocommerce_config')
        .select('store_url, consumer_key, consumer_secret')
        .maybeSingle();

      if (!wooConfig?.store_url || !wooConfig?.consumer_key || !wooConfig?.consumer_secret) {
        setSyncStatus('error');
        setSyncMessage('WooCommerce is not configured — items saved locally but not synced.');
        await logActivity(order.id, 'WooCommerce sync skipped: not configured', userId);
        onUpdated();
        return;
      }

      if (!order.woo_order_id) {
        setSyncStatus('error');
        setSyncMessage('Order has no WooCommerce ID — items saved locally but not synced.');
        await logActivity(order.id, 'WooCommerce sync skipped: no woo_order_id', userId);
        onUpdated();
        return;
      }

      const lineItemsToAdd = [
        ...addedItems.map(i => ({
          sku: i.sku,
          name: i.product_name,
          quantity: i.quantity,
          price: String(i.unit_price),
          product_id: (i as any).woo_product_id ?? undefined,
          variation_id: (i as any).woo_variation_id ?? undefined,
        })),
        ...fees.map(f => ({
          sku: 'FEE',
          name: f.name,
          quantity: 1,
          price: String(f.amount),
        })),
      ];

      const removedWooIds = deletedItems
        .map(i => i.woo_item_id)
        .filter((id): id is number => typeof id === 'number');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/woo-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          action: 'sync-order-items',
          store_url: wooConfig.store_url,
          consumer_key: wooConfig.consumer_key,
          consumer_secret: wooConfig.consumer_secret,
          internal_order_id: order.id,
          line_items: lineItemsToAdd.length > 0 ? lineItemsToAdd : undefined,
          removed_item_ids: removedWooIds.length > 0 ? removedWooIds : undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        const errMsg = result.error || 'WooCommerce sync failed';
        setSyncStatus('error');
        setSyncMessage(errMsg);
        await logActivity(order.id, `WooCommerce sync failed: ${errMsg}`, userId);
        onUpdated();
        return;
      }

      setSyncStatus('success');
      setSyncMessage('Changes saved and synced to WooCommerce.');
      onUpdated();
      setTimeout(() => {
        setEditing(false);
        setFeeRows([]);
        setEditFeeLines([]);
        setSyncStatus('idle');
        setSyncMessage(null);
      }, 2000);
    } catch (err: any) {
      const errMsg = err?.message || 'WooCommerce sync failed';
      setSyncStatus('error');
      setSyncMessage(errMsg);
      await logActivity(order.id, `WooCommerce sync failed: ${errMsg}`, userId);
      onUpdated();
    }
  };

  const handleRemoveEditItem = (itemId: string) => {
    setEditItems(prev => prev.map(i => i.id === itemId ? { ...i, _deleted: true } : i));
  };

  const handleAddProductRows = (rows: { product: any; quantity: number }[]) => {
    const newItems: EditableItem[] = rows.map(row => ({
      id: crypto.randomUUID(),
      product_id: row.product.id,
      sku: row.product.sku,
      product_name: row.product.name,
      quantity: row.quantity,
      unit_price: row.product.selling_price ?? 0,
      line_total: row.quantity * (row.product.selling_price ?? 0),
      discount_amount: 0,
      pick_location: null,
      meta_data: null,
      woo_item_id: null,
      woo_product_id: row.product.woo_product_id ?? undefined,
      woo_variation_id: row.product.woo_variation_id ?? undefined,
    } as any));
    setEditItems(prev => [...prev, ...newItems]);
    setShowAddProducts(false);
  };

  const handleAddFeeRow = () => {
    setFeeRows(prev => [...prev, { _type: 'fee', _tempId: crypto.randomUUID(), name: '', amount: 0 }]);
    setAddingFee(false);
  };

  const rxFeeTotal = prescriptions.reduce((s, p) => s + (p.customer_price ?? 0), 0);

  const displayItems = editing
    ? editItems.filter(i => !i._deleted && i.sku !== 'RX')
    : items.filter(i => i.sku !== 'RX');

  const subtotal = editing
    ? editItems.filter(i => !i._deleted && i.sku !== 'RX').reduce((s, i) => s + i.quantity * i.unit_price, 0)
      + feeRows.reduce((s, f) => s + f.amount, 0)
      + rxFeeTotal
    : items.filter(i => i.sku !== 'RX').reduce((s, i) => s + i.line_total, 0) + rxFeeTotal;

  const activeFeeLines = editing
    ? editFeeLines.filter(f => !f._deleted)
    : (order.fee_lines ?? []);

  const feeLineTotal = activeFeeLines.reduce((s, f) => s + (parseFloat(f.total) || parseFloat(f.amount) || 0), 0);

  const liveSubtotalForDiscount = editing
    ? editItems.filter(i => !i._deleted && i.sku !== 'RX').reduce((s, i) => s + i.quantity * i.unit_price, 0)
      + feeRows.reduce((s, f) => s + f.amount, 0)
      + rxFeeTotal + feeLineTotal
    : subtotal + feeLineTotal;

  const effectiveShipping = editing ? (parseFloat(editShippingFee) || 0) : order.shipping_fee;
  const effectiveDiscount = editing ? (parseFloat(editDiscount) || 0) : order.discount_amount;

  const liveOrderTotal = subtotal + feeLineTotal + effectiveShipping - effectiveDiscount;

  const couponLines = order.coupon_lines ?? [];
  const hasCoupons = couponLines.length > 0;

  const inputCls = 'px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full';
  const isSavingOrSyncing = saving || syncStatus === 'syncing';

  const EDITABLE_STATUSES = ['new_not_called', 'new_called', 'awaiting_payment', 'late_delivery'];
  const canEditItems = EDITABLE_STATUSES.includes(order.cs_status);

  const discountPreview = (() => {
    const val = parseFloat(discount.value) || 0;
    if (val <= 0) return null;
    if (discount.type === 'flat') return val;
    return Math.round((liveSubtotalForDiscount * val) / 100 * 100) / 100;
  })();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Order Items</h3>
        <div className="flex items-center gap-2">
          {!editing && canEditItems && (
            <button onClick={startEdit} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
              Edit Items
            </button>
          )}
          {!editing && !canEditItems && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400 border border-gray-200 px-2.5 py-1.5 rounded-lg cursor-not-allowed" title="Item editing is only available for orders in New, Awaiting Payment, or Late Delivery status">
              <Lock className="w-3.5 h-3.5" />
              Edit Items
            </span>
          )}
        </div>
      </div>

      {syncStatus === 'success' && (
        <div className="mb-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {syncMessage}
        </div>
      )}
      {syncStatus === 'error' && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {syncMessage}
        </div>
      )}

      <table className="w-full mb-4">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-500 pb-2">Product</th>
            <th className="text-center text-xs font-semibold text-gray-500 pb-2 w-20">Quantity</th>
            {!editing && RESERVATION_STATUSES.includes(order.cs_status) && (
              <th className="text-center text-xs font-semibold text-gray-500 pb-2 w-20">Reserved</th>
            )}
            <th className="text-right text-xs font-semibold text-gray-500 pb-2 w-28">Total</th>
            <th className="text-right text-xs font-semibold text-gray-500 pb-2 w-28">Discount</th>
            <th className="text-right text-xs font-semibold text-gray-500 pb-2 w-28">Amount</th>
            {editing && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item) => {
            const rowTotal = editing ? item.quantity * item.unit_price : item.line_total;
            const rowDiscount = item.discount_amount ?? 0;
            const rowAmount = rowTotal - rowDiscount;
            return (
              <tr key={item.id} className="border-b border-gray-50">
                <td className="py-3">
                  <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                  <div className="text-xs text-blue-600">{item.sku}</div>
                  {item.pick_location && (
                    <div className="text-xs text-teal-600 mt-0.5">Loc: {item.pick_location}</div>
                  )}
                  {item.meta_data && item.meta_data.length > 0 && hasPrescriptionMeta(item.meta_data) && (
                    <div className="mt-1.5">
                      <button
                        onClick={() => setExpandedMeta(prev => {
                          const next = new Set(prev);
                          next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                          return next;
                        })}
                        className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hover:bg-amber-100 transition-colors"
                      >
                        Rx / Lens Options
                        {expandedMeta.has(item.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {expandedMeta.has(item.id) && (
                        <div className="mt-2 space-y-1 bg-amber-50/60 border border-amber-100 rounded-lg p-2.5">
                          {item.meta_data.map((m, mi) => (
                            <div key={mi} className="flex gap-2 text-xs">
                              <span className="text-gray-500 font-medium shrink-0">{m.key}:</span>
                              {isLikelyUrl(String(m.value)) ? (
                                <a href={String(m.value)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                  View file <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-gray-700">{String(m.value)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {item.meta_data && item.meta_data.length > 0 && !hasPrescriptionMeta(item.meta_data) && hasFeeMeta(item.meta_data) && (
                    <div className="mt-1.5">
                      <span className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                        <Receipt className="w-3 h-3" />
                        Fee
                      </span>
                    </div>
                  )}
                </td>
                <td className="py-3 text-center">
                  {editing ? (
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => setEditItems(prev => prev.map(it => it.id === item.id ? { ...it, quantity: parseInt(e.target.value) || 1 } : it))}
                      className={`${inputCls} text-center w-16`}
                    />
                  ) : (
                    <span className="text-sm text-gray-700">{item.quantity}</span>
                  )}
                </td>
                {!editing && RESERVATION_STATUSES.includes(order.cs_status) && item.product_id && (
                  <td className="py-3 text-center">
                    {(() => {
                      const reserved = reservedByProduct[item.product_id!] ?? 0;
                      const shortage = reserved < item.quantity;
                      return (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded ${
                          reserved === 0 ? 'text-red-700 bg-red-50' :
                          shortage ? 'text-amber-700 bg-amber-50' :
                          'text-emerald-700 bg-emerald-50'
                        }`}>
                          {reserved === 0 && <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
                          {reserved}/{item.quantity}
                        </span>
                      );
                    })()}
                  </td>
                )}
                {!editing && RESERVATION_STATUSES.includes(order.cs_status) && !item.product_id && (
                  <td className="py-3 text-center"><span className="text-xs text-gray-300">—</span></td>
                )}
                <td className="py-3 text-right">
                  {editing ? (
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={e => setEditItems(prev => prev.map(it => it.id === item.id ? { ...it, unit_price: parseFloat(e.target.value) || 0 } : it))}
                      className={`${inputCls} text-right`}
                    />
                  ) : (
                    <span className="text-sm text-gray-700">{fmt(rowTotal)}</span>
                  )}
                </td>
                <td className="py-3 text-right">
                  {editing ? (
                    <input
                      type="number"
                      min={0}
                      value={item.discount_amount ?? 0}
                      onChange={e => setEditItems(prev => prev.map(it => it.id === item.id ? { ...it, discount_amount: parseFloat(e.target.value) || 0 } : it))}
                      className={`${inputCls} text-right`}
                    />
                  ) : (
                    <span className={`text-sm ${rowDiscount > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {rowDiscount > 0 ? `-${fmt(rowDiscount)}` : '—'}
                    </span>
                  )}
                </td>
                <td className="py-3 text-right">
                  {editing ? (
                    <input
                      type="number"
                      min={0}
                      value={rowAmount}
                      onChange={e => {
                        const newAmount = parseFloat(e.target.value) || 0;
                        const computedDiscount = Math.max(0, item.quantity * item.unit_price - newAmount);
                        setEditItems(prev => prev.map(it => it.id === item.id ? { ...it, discount_amount: Math.round(computedDiscount * 100) / 100 } : it));
                      }}
                      className={`${inputCls} text-right font-medium`}
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-900">
                      {fmt(rowAmount)}
                    </span>
                  )}
                </td>
                {editing && (
                  <td className="py-3 pl-2">
                    <button onClick={() => handleRemoveEditItem(item.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}

          {editing && editFeeLines.filter(f => !f._deleted).map((fee, idx) => {
            const feeAmt = parseFloat(fee.total) || parseFloat(fee.amount) || 0;
            const originalIdx = editFeeLines.indexOf(fee);
            return (
              <tr key={idx} className="border-b border-gray-50 bg-orange-50/40">
                <td className="py-3">
                  <input
                    type="text"
                    value={fee.name}
                    onChange={e => setEditFeeLines(prev => prev.map((f, i) => i === originalIdx ? { ...f, name: e.target.value } : f))}
                    className={inputCls}
                  />
                </td>
                <td className="py-3 text-center">
                  <span className="text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">Woo fee</span>
                </td>
                <td className="py-3 text-right">
                  <input
                    type="number"
                    value={feeAmt}
                    onChange={e => {
                      const val = String(parseFloat(e.target.value) || 0);
                      setEditFeeLines(prev => prev.map((f, i) => i === originalIdx ? { ...f, total: val, amount: val } : f));
                    }}
                    className={`${inputCls} text-right`}
                  />
                </td>
                <td className="py-3 text-right">
                  <span className="text-sm text-gray-400">—</span>
                </td>
                <td className="py-3 text-right">
                  <span className="text-sm font-medium text-gray-900">{fmt(feeAmt)}</span>
                </td>
                <td className="py-3 pl-2">
                  <button
                    onClick={() => setEditFeeLines(prev => prev.map((f, i) => i === originalIdx ? { ...f, _deleted: true } : f))}
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}

          {editing && feeRows.map((fee, idx) => (
            <tr key={fee._tempId} className="border-b border-gray-50 bg-orange-50/40">
              <td className="py-3">
                <input
                  type="text"
                  value={fee.name}
                  onChange={e => setFeeRows(prev => prev.map((f, i) => i === idx ? { ...f, name: e.target.value } : f))}
                  placeholder="Fee name"
                  className={inputCls}
                />
              </td>
              <td className="py-3 text-center">
                <span className="text-sm text-gray-400">—</span>
              </td>
              <td className="py-3 text-right">
                <input
                  type="number"
                  value={fee.amount}
                  onChange={e => setFeeRows(prev => prev.map((f, i) => i === idx ? { ...f, amount: parseFloat(e.target.value) || 0 } : f))}
                  className={`${inputCls} text-right`}
                />
              </td>
              <td className="py-3 text-right">
                <span className="text-sm text-gray-400">—</span>
              </td>
              <td className="py-3 text-right">
                <span className="text-sm font-medium text-gray-900">{fmt(fee.amount)}</span>
              </td>
              <td className="py-3 pl-2">
                <button onClick={() => setFeeRows(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-2 border-t border-gray-100 pt-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal:</span>
          <span>{fmt(subtotal)}</span>
        </div>

        {rxFeeTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1.5 text-gray-500">
              <Eye className="w-3.5 h-3.5 shrink-0 text-blue-400" />
              Prescription Lens Fee:
            </span>
            <span className="text-blue-700 font-medium">{fmt(rxFeeTotal)}</span>
          </div>
        )}

        {activeFeeLines.length > 0 && (
          <div className="space-y-1.5">
            {activeFeeLines.map((fee, i) => {
              const feeTotal = parseFloat(fee.total) || parseFloat(fee.amount) || 0;
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Receipt className="w-3.5 h-3.5 shrink-0 text-orange-400" />
                    {fee.name}:
                  </span>
                  <span className="text-gray-700 font-medium">{fmt(feeTotal)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Shipping Fee:</span>
          {editing ? (
            <input
              type="number"
              min={0}
              value={editShippingFee}
              onChange={e => setEditShippingFee(e.target.value)}
              className="px-2 py-0.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
            />
          ) : (
            <span>{fmt(order.shipping_fee)}</span>
          )}
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Discount:</span>
          {editing ? (
            <input
              type="number"
              min={0}
              value={editDiscount}
              onChange={e => setEditDiscount(e.target.value)}
              className="px-2 py-0.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
            />
          ) : (
            <span className={order.discount_amount > 0 ? 'text-red-500' : ''}>
              {order.discount_amount > 0 ? `-${fmt(order.discount_amount)}` : fmt(0)}
            </span>
          )}
        </div>

        {hasCoupons && (
          <div className="flex items-start justify-between pt-1">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              Coupon(s):
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {couponLines.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded">
                  {c.code.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2 bg-blue-50 -mx-5 px-5 py-2 rounded-b-xl">
          <span>Order Total:</span>
          <span>{fmt(Math.max(0, liveOrderTotal))}</span>
        </div>
      </div>

      {editing && (
        <div className="border-t border-gray-100 pt-4 mt-4">
          {showDiscountPanel && (
            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-gray-700">Add Discount</span>
                <button
                  onClick={() => { setShowDiscountPanel(false); setDiscount({ type: 'flat', value: '' }); }}
                  className="ml-auto p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setDiscount(d => ({ ...d, type: 'flat' }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                    discount.type === 'flat'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <DollarSign className="w-3 h-3" />
                  Flat
                </button>
                <button
                  onClick={() => setDiscount(d => ({ ...d, type: 'percentage' }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                    discount.type === 'percentage'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Percent className="w-3 h-3" />
                  Percentage
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={0}
                    max={discount.type === 'percentage' ? 100 : undefined}
                    placeholder={discount.type === 'percentage' ? 'e.g. 10' : 'e.g. 100'}
                    value={discount.value}
                    onChange={e => setDiscount(d => ({ ...d, value: e.target.value }))}
                    className="w-full px-3 py-1.5 pr-8 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                    {discount.type === 'percentage' ? '%' : '৳'}
                  </span>
                </div>
                {discountPreview !== null && (
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    = {fmt(discountPreview)}
                  </span>
                )}
                <button
                  onClick={applyDiscount}
                  disabled={!discount.value || parseFloat(discount.value) <= 0}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            {!showDiscountPanel && (
              <button
                onClick={() => setShowDiscountPanel(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Percent className="w-4 h-4" />
                Add Discount
              </button>
            )}
            <button
              onClick={() => setShowAddProducts(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add product(s)
            </button>
            <button
              onClick={handleAddFeeRow}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add fee
            </button>
            <button
              onClick={cancelEdit}
              disabled={isSavingOrSyncing}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSavingOrSyncing}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : syncStatus === 'syncing' ? 'Syncing to WooCommerce...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {showAddProducts && (
        <AddProductsModal
          onClose={() => setShowAddProducts(false)}
          onAdd={handleAddProductRows}
        />
      )}
    </div>
  );
}
