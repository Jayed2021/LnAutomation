import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Trash2, Search } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { PackagingItem } from './types';
import { logActivity } from './service';

interface Props {
  orderId: string;
  items: PackagingItem[];
  userId: string | null;
  onUpdated: () => void;
}

interface PackagingProduct {
  id: string;
  sku: string;
  name: string;
  selling_price: number;
}

export function PackagingCard({ orderId, items, userId, onUpdated }: Props) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<PackagingProduct | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PackagingProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalCost = items.reduce((s, i) => s + i.line_total, 0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('products')
        .select('id, sku, name, selling_price')
        .eq('is_active', true)
        .or(`name.ilike.%${searchQuery.trim()}%,sku.ilike.%${searchQuery.trim()}%`)
        .order('name')
        .limit(20);
      setSearchResults((data ?? []) as PackagingProduct[]);
      setDropdownOpen(true);
      setSearching(false);
    }, 250);
  }, [searchQuery]);

  const handleSelectProduct = (product: PackagingProduct) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setDropdownOpen(false);
    setSearchResults([]);
  };

  const resetForm = () => {
    setAdding(false);
    setSelectedProduct(null);
    setSearchQuery('');
    setQuantity(1);
  };

  const handleAdd = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const lineTotal = quantity * selectedProduct.selling_price;
      await supabase.from('order_packaging_items').insert({
        order_id: orderId,
        product_id: selectedProduct.id,
        sku: selectedProduct.sku,
        product_name: selectedProduct.name,
        quantity,
        unit_cost: selectedProduct.selling_price,
        line_total: lineTotal,
      });
      await logActivity(orderId, `Added packaging: ${selectedProduct.name} x${quantity}`, userId);
      resetForm();
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
          onClick={() => { setAdding(!adding); if (adding) resetForm(); }}
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
          <div className="grid grid-cols-[1fr_auto] gap-3 items-start" ref={searchRef}>
            <div className="relative">
              <div
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-text ${dropdownOpen ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200'}`}
                onClick={() => document.getElementById('pkg-add-search')?.focus()}
              >
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  id="pkg-add-search"
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSelectedProduct(null); }}
                  onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
                  placeholder="Search packaging materials..."
                  className="flex-1 outline-none bg-transparent text-sm text-gray-800 placeholder-gray-400"
                />
                {searching && <span className="text-xs text-gray-400 shrink-0">Searching...</span>}
              </div>
              {dropdownOpen && searchResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map(product => (
                    <button
                      key={product.id}
                      onMouseDown={e => { e.preventDefault(); handleSelectProduct(product); }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <div>
                        <span className="font-medium">{product.name}</span>
                        <span className="ml-2 text-xs opacity-70">{product.sku}</span>
                      </div>
                      {product.selling_price > 0 && <span className="text-xs opacity-70 shrink-0">৳{product.selling_price}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className={`${inputCls} w-20 text-center`}
              placeholder="Qty"
            />
          </div>
          {selectedProduct && (
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span className="font-medium text-gray-700">{selectedProduct.name}</span>
              {selectedProduct.selling_price > 0 && <span>· ৳{selectedProduct.selling_price} / unit</span>}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={resetForm} className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={saving || !selectedProduct}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Adding...' : 'Add'}
            </button>
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
