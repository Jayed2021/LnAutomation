import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Trash2, Save, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PackagingProduct {
  id: string;
  sku: string;
  name: string;
  selling_price: number;
}

interface DefaultItem {
  product_id: string;
  sku: string;
  product_name: string;
  unit_cost: number;
  quantity: number;
}

export default function PackagingSettings() {
  const navigate = useNavigate();
  const [defaults, setDefaults] = useState<DefaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PackagingProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

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

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'default_packaging_materials')
      .maybeSingle();
    if (data?.value) {
      try {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setDefaults(Array.isArray(parsed) ? parsed as DefaultItem[] : []);
      } catch {
        setDefaults([]);
      }
    }
    setLoading(false);
  };

  const handleSelectProduct = (product: PackagingProduct) => {
    if (defaults.some(d => d.product_id === product.id)) {
      setSearchQuery('');
      setDropdownOpen(false);
      return;
    }
    setDefaults(prev => [...prev, {
      product_id: product.id,
      sku: product.sku,
      product_name: product.name,
      unit_cost: product.selling_price ?? 0,
      quantity: 1,
    }]);
    setSearchQuery('');
    setDropdownOpen(false);
    setSearchResults([]);
  };

  const handleRemove = (productId: string) => {
    setDefaults(prev => prev.filter(d => d.product_id !== productId));
  };

  const handleQtyChange = (productId: string, qty: number) => {
    setDefaults(prev => prev.map(d =>
      d.product_id === productId ? { ...d, quantity: Math.max(1, qty) } : d
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', 'default_packaging_materials')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('app_settings')
        .update({ value: defaults as any })
        .eq('key', 'default_packaging_materials');
    } else {
      await supabase
        .from('app_settings')
        .insert({ key: 'default_packaging_materials', value: defaults as any });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputCls = 'px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Default Packaging Materials</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            These packaging materials will be automatically added to every new order imported from WooCommerce.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Add packaging material</div>
            <div className="relative" ref={searchRef}>
              <div
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-text ${dropdownOpen ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200'}`}
                onClick={() => document.getElementById('pkg-search-input')?.focus()}
              >
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  id="pkg-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
                  placeholder="Search packaging materials by name or SKU..."
                  className="flex-1 outline-none bg-transparent text-sm text-gray-800 placeholder-gray-400"
                />
                {searching && <span className="text-xs text-gray-400 shrink-0">Searching...</span>}
              </div>
              {dropdownOpen && searchResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {searchResults.map(product => {
                    const alreadyAdded = defaults.some(d => d.product_id === product.id);
                    return (
                      <button
                        key={product.id}
                        onMouseDown={e => { e.preventDefault(); handleSelectProduct(product); }}
                        disabled={alreadyAdded}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-medium">{product.name}</span>
                          <span className="ml-2 text-xs opacity-70">{product.sku}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs opacity-70 shrink-0">
                          {alreadyAdded && <span>Already added</span>}
                          {!alreadyAdded && product.selling_price > 0 && <span>৳{product.selling_price}</span>}
                          {!alreadyAdded && <Plus className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {defaults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Package className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No default packaging materials configured.</p>
                <p className="text-xs mt-1">Search above to add items.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 pb-1">
                  <span className="text-xs font-semibold text-gray-500">Product</span>
                  <span className="text-xs font-semibold text-gray-500 w-24 text-center">Qty</span>
                  <span className="text-xs font-semibold text-gray-500 w-24 text-right">Unit Cost</span>
                  <span className="w-8" />
                </div>
                {defaults.map(item => (
                  <div key={item.product_id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                      <div className="text-xs text-gray-400">{item.sku}</div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => handleQtyChange(item.product_id, parseInt(e.target.value) || 1)}
                      className={`${inputCls} w-24 text-center`}
                    />
                    <span className="text-sm text-gray-600 w-24 text-right">
                      {item.unit_cost > 0 ? `৳${item.unit_cost}` : '—'}
                    </span>
                    <button
                      onClick={() => handleRemove(item.product_id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {defaults.length} item{defaults.length !== 1 ? 's' : ''} will be added to new orders
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Defaults'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
