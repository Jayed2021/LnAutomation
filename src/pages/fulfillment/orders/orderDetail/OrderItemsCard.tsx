import React, { useState } from 'react';
import { CreditCard as Edit2, Plus, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { OrderItem, OrderDetail } from './types';
import { logActivity } from './service';

interface Props {
  order: OrderDetail;
  items: OrderItem[];
  userId: string | null;
  onUpdated: () => void;
}

export function OrderItemsCard({ order, items, userId, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({ sku: '', product_name: '', quantity: 1, unit_price: 0 });
  const [addingItem, setAddingItem] = useState(false);

  const startEdit = () => {
    setEditItems(items.map(i => ({ ...i })));
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of editItems) {
        await supabase.from('order_items').update({
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.quantity * item.unit_price,
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
      const item = items.find(i => i.id === itemId);
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

  const displayItems = editing ? editItems : items;
  const subtotal = displayItems.reduce((s, i) => s + (editing ? i.quantity * i.unit_price : i.line_total), 0);

  const inputCls = "px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Order Items</h3>
        <div className="flex items-center gap-2">
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

      <table className="w-full mb-4">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-500 pb-2">Product</th>
            <th className="text-center text-xs font-semibold text-gray-500 pb-2 w-20">Quantity</th>
            <th className="text-right text-xs font-semibold text-gray-500 pb-2 w-24">Amount</th>
            <th className="text-right text-xs font-semibold text-gray-500 pb-2 w-24">Discount</th>
            <th className="text-right text-xs font-semibold text-gray-500 pb-2 w-24">Total</th>
            {editing && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item, idx) => (
            <tr key={item.id} className="border-b border-gray-50">
              <td className="py-3">
                <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                <div className="text-xs text-blue-600">{item.sku}</div>
                {item.pick_location && (
                  <div className="text-xs text-teal-600 mt-0.5">📍 {item.pick_location}</div>
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
                  <span className="text-sm text-gray-700">৳{item.unit_price.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
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
                  <span className="text-sm text-gray-500">৳{(item.discount_amount ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
                )}
              </td>
              <td className="py-3 text-right">
                <span className="text-sm font-medium text-gray-900">
                  ৳{(editing ? editItems[idx].quantity * editItems[idx].unit_price : item.line_total).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
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
          ))}
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
          <span>৳{subtotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Shipping Fee:</span>
          <span>৳{order.shipping_fee.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Discount:</span>
          <span>৳{(order.discount_amount ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2 bg-blue-50 -mx-5 px-5 py-2 rounded-b-xl">
          <span>Order Total:</span>
          <span>৳{order.total_amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
}
