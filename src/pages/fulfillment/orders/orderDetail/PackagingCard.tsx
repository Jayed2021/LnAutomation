import React, { useState } from 'react';
import { Package, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { PackagingItem } from './types';
import { logActivity } from './service';

interface Props {
  orderId: string;
  items: PackagingItem[];
  userId: string | null;
  onUpdated: () => void;
}

export function PackagingCard({ orderId, items, userId, onUpdated }: Props) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({ sku: '', product_name: '', quantity: 1, unit_cost: 0 });

  const totalCost = items.reduce((s, i) => s + i.line_total, 0);

  const handleAdd = async () => {
    if (!newItem.sku || !newItem.product_name) return;
    setSaving(true);
    try {
      const lineTotal = newItem.quantity * newItem.unit_cost;
      await supabase.from('order_packaging_items').insert({
        order_id: orderId,
        sku: newItem.sku,
        product_name: newItem.product_name,
        quantity: newItem.quantity,
        unit_cost: newItem.unit_cost,
        line_total: lineTotal,
      });
      await logActivity(orderId, `Added packaging: ${newItem.product_name} x${newItem.quantity}`, userId);
      setNewItem({ sku: '', product_name: '', quantity: 1, unit_cost: 0 });
      setAdding(false);
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQty = async (item: PackagingItem, qty: number) => {
    const newQty = Math.max(1, qty);
    await supabase.from('order_packaging_items').update({
      quantity: newQty,
      line_total: newQty * item.unit_cost,
    }).eq('id', item.id);
    onUpdated();
  };

  const handleRemove = async (item: PackagingItem) => {
    await supabase.from('order_packaging_items').delete().eq('id', item.id);
    await logActivity(orderId, `Removed packaging: ${item.product_name}`, userId);
    onUpdated();
  };

  const inputCls = "px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Packaging Materials</h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{items.length} items</span>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Material
        </button>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
              <div className="text-xs text-gray-400">{item.sku}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Qty:</span>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={e => handleUpdateQty(item, parseInt(e.target.value) || 1)}
                className={`${inputCls} w-16 text-center`}
              />
            </div>
            <span className="text-sm text-gray-700 w-20 text-right">
              ৳{item.line_total.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
            </span>
            <button onClick={() => handleRemove(item)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {items.length === 0 && !adding && (
          <div className="text-center py-6 text-gray-400 text-sm">No packaging materials added</div>
        )}
      </div>

      {adding && (
        <div className="mt-3 border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
          <div className="text-sm font-medium text-gray-700">Add Packaging Material</div>
          <div className="grid grid-cols-2 gap-3">
            <input value={newItem.sku} onChange={e => setNewItem(p => ({ ...p, sku: e.target.value }))} className={`${inputCls} w-full`} placeholder="SKU" />
            <input value={newItem.product_name} onChange={e => setNewItem(p => ({ ...p, product_name: e.target.value }))} className={`${inputCls} w-full`} placeholder="Name" />
            <input type="number" min={1} value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} className={`${inputCls} w-full`} placeholder="Qty" />
            <input type="number" value={newItem.unit_cost} onChange={e => setNewItem(p => ({ ...p, unit_cost: parseFloat(e.target.value) || 0 }))} className={`${inputCls} w-full`} placeholder="Unit Cost" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleAdd} disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors">Add</button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-3 text-right text-sm font-semibold text-orange-600">
          Total Packaging Cost: ৳{totalCost.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
}
