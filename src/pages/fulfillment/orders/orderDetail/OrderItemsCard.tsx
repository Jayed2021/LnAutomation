import React, { useState } from 'react';
import { CreditCard as Edit2, Plus, Trash2, Save, X, ChevronDown, ChevronUp, ExternalLink, RefreshCw, Tag } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { OrderItem, OrderDetail } from './types';
import { logActivity } from './service';

interface Props {
  order: OrderDetail;
  items: OrderItem[];
  userId: string | null;
  onUpdated: () => void;
}

function isLikelyUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function fmt(n: number): string {
  return '৳' + n.toLocaleString('en-BD', { minimumFractionDigits: 2 });
}

export function OrderItemsCard({ order, items, userId, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({ sku: '', product_name: '', quantity: 1, unit_price: 0 });
  const [addingItem, setAddingItem] = useState(false);
  const [expandedMeta, setExpandedMeta] = useState<Set<string>>(new Set());
  const [resyncing, setResyncing] = useState(false);
  const [resyncError, setResyncError] = useState<string | null>(null);

  const startEdit = () => {
    setEditItems(items.map(i => ({ ...i })));
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of editItems) {
        const lineTotal = item.quantity * item.unit_price;
        await supabase.from('order_items').update({
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: lineTotal,
          discount_amount: item.discount_amount,
        }).eq('id', item.id);
      }
      const subtotal = editItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const total = subtotal + order.shipping_fee - order.discount_amount;
      await supabase.from('orders').update({
        subtotal,
        total_amount: Math.max(0, total),
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);
      await logActivity(order.id, 'Order items updated', userId);
      setEditing(false);
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.sku || !newItem.product_name) return;
    setSaving(true);
    try {
      const lineTotal = newItem.quantity * newItem.unit_price;
      const { data: product } = await supabase.from('products').select('id').eq('sku', newItem.sku).maybeSingle();
      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: product?.id ?? null,
        sku: newItem.sku,
        product_name: newItem.product_name,
        quantity: newItem.quantity,
        unit_price: newItem.unit_price,
        line_total: lineTotal,
        discount_amount: 0,
      });
      const newSubtotal = items.reduce((s, i) => s + i.line_total, 0) + lineTotal;
      await supabase.from('orders').update({
        subtotal: newSubtotal,
        total_amount: newSubtotal + order.shipping_fee - order.discount_amount,
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);
      await logActivity(order.id, `Added item: ${newItem.product_name} x${newItem.quantity}`, userId);
      setNewItem({ sku: '', product_name: '', quantity: 1, unit_price: 0 });
      setAddingItem(false);
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (itemId: string, itemName: string) => {
    try {
      await supabase.from('order_items').delete().eq('id', itemId);
      const newSubtotal = items.filter(i => i.id !== itemId).reduce((s, i) => s + i.line_total, 0);
      await supabase.from('orders').update({
        subtotal: newSubtotal,
        total_amount: newSubtotal + order.shipping_fee - order.discount_amount,
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);
      await logActivity(order.id, `Removed item: ${itemName}`, userId);
      onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResync = async () => {
    setResyncing(true);
    setResyncError(null);
    try {
      const { data: wooConfig } = await supabase
        .from('woo_config')
        .select('store_url, consumer_key, consumer_secret')
        .maybeSingle();

      if (!wooConfig?.store_url || !wooConfig?.consumer_key || !wooConfig?.consumer_secret) {
        setResyncError('WooCommerce is not configured. Check Settings > WooCommerce.');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/woo-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          action: 'resync-order',
          store_url: wooConfig.store_url,
          consumer_key: wooConfig.consumer_key,
          consumer_secret: wooConfig.consumer_secret,
          internal_order_id: order.id,
        }),
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        setResyncError(result.error || 'Re-sync failed');
        return;
      }

      onUpdated();
    } catch (err: any) {
      setResyncError(err?.message || 'Re-sync failed');
    } finally {
      setResyncing(false);
    }
  };

  const displayItems = editing ? editItems : items;
  const subtotal = displayItems.reduce((s, i) => {
    if (editing) return s + i.quantity * i.unit_price;
    return s + i.line_total;
  }, 0);

  const couponLines = order.coupon_lines ?? [];
  const hasCoupons = couponLines.length > 0;

  const inputCls = "px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Order Items</h3>
        <div className="flex items-center gap-2">
          {!editing && order.woo_order_id && (
            <button
              onClick={handleResync}
              disabled={resyncing}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              title="Re-sync pricing and coupon data from WooCommerce"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resyncing ? 'animate-spin' : ''}`} />
              {resyncing ? 'Syncing...' : 'Sync from WooCommerce'}
            </button>
          )}
          {!editing && (
            <button onClick={() => setAddingItem(!addingItem)} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          )}
          {!editing ? (
            <button onClick={startEdit} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
              Edit Items
            </button>
          ) : (
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
      </div>

      {resyncError && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {resyncError}
        </div>
      )}

      <table className="w-full mb-4">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-500 pb-2">Product</th>
            <th className="text-center text-xs font-semibold text-gray-500 pb-2 w-20">Quantity</th>
            <th className="text-right text-xs font-semibold text-gray-500 pb-2 w-28">Total</th>
            <th className="text-right text-xs font-semibold text-gray-500 pb-2 w-28">Discount</th>
            <th className="text-right text-xs font-semibold text-gray-500 pb-2 w-28">Amount</th>
            {editing && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item, idx) => {
            const rowTotal = editing ? editItems[idx].quantity * editItems[idx].unit_price : item.line_total;
            const rowDiscount = editing ? (editItems[idx].discount_amount ?? 0) : (item.discount_amount ?? 0);
            const rowAmount = rowTotal - rowDiscount;
            return (
              <tr key={item.id} className="border-b border-gray-50">
                <td className="py-3">
                  <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                  <div className="text-xs text-blue-600">{item.sku}</div>
                  {item.pick_location && (
                    <div className="text-xs text-teal-600 mt-0.5">Loc: {item.pick_location}</div>
                  )}
                  {item.meta_data && item.meta_data.length > 0 && (
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
                                <a
                                  href={String(m.value)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
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
                </td>
                <td className="py-3 text-center">
                  {editing ? (
                    <input
                      type="number"
                      min={1}
                      value={editItems[idx]?.quantity}
                      onChange={e => setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: parseInt(e.target.value) || 1 } : it))}
                      className={`${inputCls} text-center w-16`}
                    />
                  ) : (
                    <span className="text-sm text-gray-700">{item.quantity}</span>
                  )}
                </td>
                <td className="py-3 text-right">
                  {editing ? (
                    <input
                      type="number"
                      value={editItems[idx]?.unit_price}
                      onChange={e => setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_price: parseFloat(e.target.value) || 0 } : it))}
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
                      value={editItems[idx]?.discount_amount}
                      onChange={e => setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, discount_amount: parseFloat(e.target.value) || 0 } : it))}
                      className={`${inputCls} text-right`}
                    />
                  ) : (
                    <span className={`text-sm ${rowDiscount > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {rowDiscount > 0 ? `-${fmt(rowDiscount)}` : '—'}
                    </span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {fmt(editing ? editItems[idx].quantity * editItems[idx].unit_price - (editItems[idx].discount_amount ?? 0) : rowAmount)}
                  </span>
                </td>
                {editing && (
                  <td className="py-3 pl-2">
                    <button onClick={() => handleRemoveItem(item.id, item.product_name)} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {addingItem && !editing && (
        <div className="border border-dashed border-gray-300 rounded-lg p-4 mb-4 space-y-3">
          <div className="text-sm font-medium text-gray-700">Add New Item</div>
          <div className="grid grid-cols-2 gap-3">
            <input value={newItem.sku} onChange={e => setNewItem(p => ({ ...p, sku: e.target.value }))} className={inputCls} placeholder="SKU" />
            <input value={newItem.product_name} onChange={e => setNewItem(p => ({ ...p, product_name: e.target.value }))} className={inputCls} placeholder="Product Name" />
            <input type="number" min={1} value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} className={inputCls} placeholder="Qty" />
            <input type="number" value={newItem.unit_price} onChange={e => setNewItem(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} className={inputCls} placeholder="Unit Price" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAddingItem(false)} className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleAddItem} disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors">Add</button>
          </div>
        </div>
      )}

      <div className="space-y-2 border-t border-gray-100 pt-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal:</span>
          <span>{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Shipping Fee:</span>
          <span>{fmt(order.shipping_fee)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Discount:</span>
          <span className={order.discount_amount > 0 ? 'text-red-500' : ''}>
            {order.discount_amount > 0 ? `-${fmt(order.discount_amount)}` : fmt(0)}
          </span>
        </div>

        {hasCoupons && (
          <div className="flex items-start justify-between pt-1">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              Coupon(s):
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {couponLines.map((c, i) => {
                const discountVal = parseFloat(c.discount) || 0;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded">
                      {c.code.toUpperCase()}
                    </span>
                    {discountVal > 0 && (
                      <span className="text-sm text-red-500">-{fmt(discountVal)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2 bg-blue-50 -mx-5 px-5 py-2 rounded-b-xl">
          <span>Order Total:</span>
          <span>{fmt(order.total_amount)}</span>
        </div>
      </div>
    </div>
  );
}
