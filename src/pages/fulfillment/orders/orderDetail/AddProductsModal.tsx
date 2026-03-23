import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface ProductResult {
  id: string;
  sku: string;
  name: string;
  selling_price: number;
  woo_product_id: number | null;
  woo_variation_id: number | null;
  stock: number;
}

interface SelectedRow {
  product: ProductResult;
  quantity: number;
}

interface Props {
  onClose: () => void;
  onAdd: (rows: SelectedRow[]) => void;
}

export function AddProductsModal({ onClose, onAdd }: Props) {
  const [rows, setRows] = useState<SelectedRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeQty, setActiveQty] = useState(1);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const q = searchQuery.trim();
      const { data } = await supabase
        .from('products')
        .select('id, sku, name, selling_price, woo_product_id, woo_variation_id')
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
        .eq('is_active', true)
        .order('name')
        .limit(20);

      if (!data) { setSearching(false); return; }

      const ids = data.map(p => p.id);
      const stockMap: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: lots } = await supabase
          .from('inventory_lots')
          .select('product_id, remaining_quantity')
          .in('product_id', ids);
        for (const lot of lots ?? []) {
          stockMap[lot.product_id] = (stockMap[lot.product_id] ?? 0) + (lot.remaining_quantity ?? 0);
        }
      }

      const results: ProductResult[] = data.map(p => ({
        ...p,
        stock: stockMap[p.id] ?? 0,
      }));
      setSearchResults(results);
      setDropdownOpen(true);
      setSearching(false);
    }, 250);
  }, [searchQuery]);

  const handleSelect = (product: ProductResult) => {
    setRows(prev => [...prev, { product, quantity: activeQty }]);
    setSearchQuery('');
    setActiveQty(1);
    setDropdownOpen(false);
    setSearchResults([]);
  };

  const handleRemoveRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleQtyChange = (index: number, qty: number) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, quantity: Math.max(1, qty) } : r));
  };

  const handleAdd = () => {
    if (rows.length === 0) return;
    onAdd(rows);
  };

  const inputCls = 'px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Add products</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-4 flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-[1fr_auto] gap-3 mb-1">
            <span className="text-xs font-semibold text-blue-600">Product</span>
            <span className="text-xs font-semibold text-blue-600 w-24 text-right">Quantity</span>
          </div>

          <div className="overflow-y-auto flex-1">
            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_auto] gap-3 mb-3 items-center">
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-800">
                  <span className="flex-1 truncate">
                    {row.product.name} ({row.product.sku}) – Stock: {row.product.stock}
                  </span>
                  <button
                    onClick={() => handleRemoveRow(idx)}
                    className="text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={e => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                  className={`${inputCls} w-24 text-right`}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3 items-start mt-1" ref={searchRef}>
            <div className="relative">
              <div
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-text ${dropdownOpen ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200'}`}
                onClick={() => document.getElementById('product-search-input')?.focus()}
              >
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  id="product-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
                  placeholder="Search for a product..."
                  className="flex-1 outline-none bg-transparent text-sm text-gray-800 placeholder-gray-400"
                />
                {searching ? (
                  <span className="text-xs text-gray-400 shrink-0">Searching...</span>
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                )}
              </div>

              {dropdownOpen && searchResults.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {searchResults.map(product => (
                    <button
                      key={product.id}
                      onMouseDown={e => { e.preventDefault(); handleSelect(product); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-600 hover:text-white transition-colors"
                    >
                      {product.name} ({product.sku}) – Stock: {product.stock}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              type="number"
              min={1}
              value={activeQty}
              onChange={e => setActiveQty(parseInt(e.target.value) || 1)}
              className={`${inputCls} w-24 text-right`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={rows.length === 0}
            className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
