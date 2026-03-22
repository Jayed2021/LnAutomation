import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import WooImportModal from '../../components/inventory/WooImportModal';
import CsvBulkUpdateModal from '../../components/inventory/CsvBulkUpdateModal';
import ExportProductsModal from '../../components/inventory/ExportProductsModal';
import { Search, Plus, Package, AlertTriangle, DollarSign, TrendingDown, ChevronRight, X, ShoppingCart, FileDown, FileUp, ChevronLeft, ChevronRight as ChevronRightIcon, ChevronsUpDown, ChevronUp, ChevronDown, Trash2, Image as ImageIcon, Upload } from 'lucide-react';

const PAGE_SIZE = 30;

type SortField = 'units' | 'price' | 'status' | 'newest' | null;
type SortDir = 'asc' | 'desc';
type ProductType = 'saleable_goods' | 'packaging_material';

const STATUS_ORDER: Record<string, number> = { in_stock: 0, low_stock: 1, out_of_stock: 2 };

interface Product {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  category: string | null;
  selling_price: number | null;
  image_url: string | null;
  low_stock_threshold: number;
  is_active: boolean;
  product_type: ProductType;
  created_at: string;
  total_quantity: number;
  lot_count: number;
  stock_value: number;
  avg_cost: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface AddProductForm {
  sku: string;
  name: string;
  barcode: string;
  category: string;
  selling_price: string;
  low_stock_threshold: string;
  product_type: ProductType;
  image_file: File | null;
  image_preview: string | null;
}

const EMPTY_ADD_FORM: AddProductForm = {
  sku: '', name: '', barcode: '', category: '', selling_price: '', low_stock_threshold: '20',
  product_type: 'saleable_goods', image_file: null, image_preview: null,
};

export default function Products() {
  const { canSeeCosts } = useAuth();
  const { lastRefreshed, setRefreshing } = useRefresh();
  const navigate = useNavigate();
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [productSupplierMap, setProductSupplierMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [productTypeFilter, setProductTypeFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('newest');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDragOver, setAddDragOver] = useState(false);
  const [addForm, setAddForm] = useState<AddProductForm>(EMPTY_ADD_FORM);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; sku: string; name: string } | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [conflictProductId, setConflictProductId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showWooImport, setShowWooImport] = useState(false);
  const [showCsvUpdate, setShowCsvUpdate] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadProducts();
  }, [lastRefreshed]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, supplierFilter, productTypeFilter, sortField, sortDir]);

  const fetchAllRows = async <T,>(query: any, batchSize = 1000): Promise<T[]> => {
    const results: T[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await query.range(from, from + batchSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      results.push(...data);
      if (data.length < batchSize) break;
      from += batchSize;
    }
    return results;
  };

  const loadProducts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [allProducts, allLots, suppRes, allProdSupp] = await Promise.all([
        fetchAllRows(supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false })),
        fetchAllRows(supabase.from('inventory_lots').select('product_id, remaining_quantity, received_quantity, landed_cost_per_unit')),
        supabase.from('suppliers').select('id, name').eq('is_active', true).order('name'),
        fetchAllRows(supabase.from('product_suppliers').select('product_id, supplier_id')),
      ]);

      const lots = allLots;
      const lotMap: Record<string, { qty: number; lotCount: number; totalCost: number }> = {};
      lots.forEach(lot => {
        if (!lotMap[lot.product_id]) lotMap[lot.product_id] = { qty: 0, lotCount: 0, totalCost: 0 };
        lotMap[lot.product_id].qty += lot.remaining_quantity;
        lotMap[lot.product_id].lotCount += 1;
        lotMap[lot.product_id].totalCost += lot.remaining_quantity * lot.landed_cost_per_unit;
      });

      const enriched: Product[] = allProducts.map(p => {
        const lm = lotMap[p.id] || { qty: 0, lotCount: 0, totalCost: 0 };
        return {
          ...p,
          product_type: (p.product_type as ProductType) || 'saleable_goods',
          total_quantity: lm.qty,
          lot_count: lm.lotCount,
          stock_value: lm.totalCost,
          avg_cost: lm.qty > 0 ? lm.totalCost / lm.qty : 0
        };
      });

      const psMap: Record<string, string[]> = {};
      allProdSupp.forEach(ps => {
        if (!psMap[ps.product_id]) psMap[ps.product_id] = [];
        psMap[ps.product_id].push(ps.supplier_id);
      });

      setProducts(enriched);
      setAllSuppliers(suppRes.data || []);
      setProductSupplierMap(psMap);
    } catch (err: any) {
      console.error(err);
      setLoadError(err?.message || 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[]))],
    [products]
  );

  const getStockStatus = (p: Product) => {
    if (p.total_quantity === 0) return 'out_of_stock';
    if (p.total_quantity < p.low_stock_threshold) return 'low_stock';
    return 'in_stock';
  };

  const filtered = useMemo(() => {
    let list = products.filter(p => {
      const matchSearch = p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchSupplier = supplierFilter === 'all' ||
        (productSupplierMap[p.id] || []).includes(supplierFilter);
      const matchType = productTypeFilter === 'all' || p.product_type === productTypeFilter;
      return matchSearch && matchCat && matchSupplier && matchType;
    });

    if (sortField) {
      list = [...list].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'units') {
          cmp = a.total_quantity - b.total_quantity;
        } else if (sortField === 'price') {
          cmp = (a.selling_price ?? 0) - (b.selling_price ?? 0);
        } else if (sortField === 'status') {
          cmp = STATUS_ORDER[getStockStatus(a)] - STATUS_ORDER[getStockStatus(b)];
        } else if (sortField === 'newest') {
          cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          return cmp;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  }, [products, searchTerm, categoryFilter, supplierFilter, productTypeFilter, productSupplierMap, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalUnits = products.reduce((s, p) => s + p.total_quantity, 0);
  const saleableUnits = products.filter(p => p.product_type === 'saleable_goods').reduce((s, p) => s + p.total_quantity, 0);
  const packagingUnits = products.filter(p => p.product_type === 'packaging_material').reduce((s, p) => s + p.total_quantity, 0);
  const totalValue = products.reduce((s, p) => s + p.stock_value, 0);
  const lowStockCount = products.filter(p => p.total_quantity > 0 && p.total_quantity < p.low_stock_threshold).length;
  const outOfStockCount = products.filter(p => p.total_quantity === 0).length;

  const handleSort = (field: SortField) => {
    if (field === 'newest') {
      setSortField('newest');
      return;
    }
    if (sortField === field) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortField('newest');
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-gray-400 ml-1 inline" />;
    if (field === 'newest') return <ChevronDown className="w-3 h-3 text-blue-600 ml-1 inline" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-gray-700 ml-1 inline" />
      : <ChevronDown className="w-3 h-3 text-gray-700 ml-1 inline" />;
  };

  const statusVariant: Record<string, 'emerald' | 'amber' | 'red'> = {
    in_stock: 'emerald', low_stock: 'amber', out_of_stock: 'red'
  };
  const statusLabel: Record<string, string> = {
    in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Out of Stock'
  };

  const allPageSelected = paginated.length > 0 && paginated.every(p => selectedProductIds.has(p.id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      const next = new Set(selectedProductIds);
      paginated.forEach(p => next.delete(p.id));
      setSelectedProductIds(next);
    } else {
      const next = new Set(selectedProductIds);
      paginated.forEach(p => next.add(p.id));
      setSelectedProductIds(next);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedProductIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedProductIds(next);
  };

  const handleAddImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      setAddForm(f => ({ ...f, image_file: file, image_preview: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAdd = async () => {
    if (!addForm.sku || !addForm.name) return;
    setSaving(true);
    setAddError(null);
    setConflictProductId(null);
    try {
      let image_url: string | null = null;
      if (addForm.image_file) {
        const ext = addForm.image_file.name.split('.').pop();
        const path = `${addForm.sku.replace(/[^a-zA-Z0-9-_]/g, '_')}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, addForm.image_file, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
          image_url = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from('products').insert({
        sku: addForm.sku,
        name: addForm.name,
        barcode: addForm.barcode || null,
        category: addForm.category || null,
        selling_price: addForm.selling_price ? parseFloat(addForm.selling_price) : null,
        low_stock_threshold: parseInt(addForm.low_stock_threshold) || 20,
        product_type: addForm.product_type,
        image_url,
      });
      if (error) {
        if (error.code === '23505') {
          const { data: existing } = await supabase
            .from('products')
            .select('id, product_type')
            .eq('sku', addForm.sku)
            .maybeSingle();
          if (existing) {
            setConflictProductId(existing.id);
            setAddError(`SKU "${addForm.sku}" already exists in your product list.`);
          } else {
            setAddError(`SKU "${addForm.sku}" already exists. Please use a different SKU.`);
          }
        } else {
          setAddError(error.message || 'Failed to add product. Please try again.');
        }
        return;
      }
      setShowAddModal(false);
      setAddError(null);
      setConflictProductId(null);
      setAddForm(EMPTY_ADD_FORM);
      setProductTypeFilter('all');
      setSearchTerm('');
      setCategoryFilter('all');
      setSupplierFilter('all');
      setSortField('newest');
      setSortDir('asc');
      setCurrentPage(1);
      loadProducts();
    } catch (err) {
      setAddError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleViewConflict = () => {
    if (!conflictProductId) return;
    setShowAddModal(false);
    setAddError(null);
    setConflictProductId(null);
    setSearchTerm('');
    setCategoryFilter('all');
    setSupplierFilter('all');
    setProductTypeFilter('all');
    setSortField(null);
    setCurrentPage(1);
    setHighlightedId(conflictProductId);
    loadProducts().then(() => {
      setTimeout(() => setHighlightedId(null), 3000);
    });
  };

  const handleDeleteClick = async (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    const { data: activeLots } = await supabase
      .from('inventory_lots')
      .select('id')
      .eq('product_id', p.id)
      .gt('remaining_quantity', 0)
      .limit(1);
    if (activeLots && activeLots.length > 0) {
      setDeleteBlocked('This product has active stock in inventory. Remove all stock before deleting.');
      setDeleteTarget({ id: p.id, sku: p.sku, name: p.name });
      return;
    }
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', p.id)
      .limit(1);
    if (orderItems && orderItems.length > 0) {
      setDeleteBlocked('This product is linked to existing orders and cannot be deleted.');
      setDeleteTarget({ id: p.id, sku: p.sku, name: p.name });
      return;
    }
    setDeleteBlocked(null);
    setDeleteTarget({ id: p.id, sku: p.sku, name: p.name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteBlocked) return;
    setDeleting(true);
    try {
      await supabase.from('product_locations').delete().eq('product_id', deleteTarget.id);
      await supabase.from('product_suppliers').delete().eq('product_id', deleteTarget.id);
      await supabase.from('inventory_lots').delete().eq('product_id', deleteTarget.id);
      await supabase.from('stock_movements').delete().eq('product_id', deleteTarget.id);
      const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      setDeleteBlocked(null);
      loadProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">All SKUs and their current stock status</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            Export
            {selectedProductIds.size > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-gray-900 text-white text-xs rounded-full leading-none">
                {selectedProductIds.size}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCsvUpdate(true)}
            className="flex items-center gap-2"
          >
            <FileUp className="w-4 h-4" />
            Update via CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowWooImport(true)}
            className="flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Import from WooCommerce
          </Button>
          <Button onClick={() => { setShowAddModal(true); setAddError(null); setConflictProductId(null); }} className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-700">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Units</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalUnits.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1.5">
            {saleableUnits.toLocaleString()} saleable &middot; {packagingUnits.toLocaleString()} packaging
          </p>
          <div className="mt-2 p-2 bg-blue-50 rounded-lg w-fit">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Stock Value</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {canSeeCosts ? `৳ ${(totalValue / 1000).toFixed(0)}K` : <span className="text-gray-400 text-lg">Restricted</span>}
          </p>
          <div className="mt-2 p-2 bg-emerald-50 rounded-lg w-fit">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Low Stock SKUs</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{lowStockCount}</p>
          <div className="mt-2 p-2 bg-amber-50 rounded-lg w-fit">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Out of Stock</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{outOfStockCount}</p>
          <div className="mt-2 p-2 bg-red-50 rounded-lg w-fit">
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by SKU or product name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
            ))}
          </select>
          <select
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Suppliers</option>
            {allSuppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={productTypeFilter}
            onChange={e => setProductTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="saleable_goods">Saleable Goods</option>
            <option value="packaging_material">Packaging Material</option>
          </select>
        </div>

        {loadError && (
          <div className="mx-4 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{loadError}</p>
            </div>
            <button
              onClick={loadProducts}
              className="text-xs font-medium text-red-600 underline underline-offset-2 hover:text-red-800 transition-colors whitespace-nowrap"
            >
              Retry
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-gray-400">Loading...</div>
          ) : loadError ? (
            <div className="py-16 text-center text-gray-400">Could not load products</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">No products found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                    />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors"
                    onClick={() => handleSort('newest')}
                  >
                    SKU / Product<SortIcon field="newest" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors"
                    onClick={() => handleSort('units')}
                  >
                    Units<SortIcon field="units" />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Cost</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Value</th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors"
                    onClick={() => handleSort('price')}
                  >
                    Sell Price<SortIcon field="price" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    Status<SortIcon field="status" />
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginated.map(p => {
                  const status = getStockStatus(p);
                  const isSelected = selectedProductIds.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`group hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/40' : ''} ${highlightedId === p.id ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/60' : ''}`}
                      onClick={() => navigate(`/inventory/products/${p.id}`)}
                    >
                      <td className="px-4 py-4 w-10" onClick={e => toggleSelect(p.id, e)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 text-sm">{p.sku}</p>
                              {p.product_type === 'packaging_material' && (
                                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">PKG</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{p.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.category || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-semibold ${p.total_quantity < p.low_stock_threshold && p.total_quantity > 0 ? 'text-amber-600' : p.total_quantity === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {p.total_quantity}
                        </span>
                        {p.lot_count > 0 && <span className="text-xs text-gray-400 ml-1">({p.lot_count} lots)</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {canSeeCosts
                          ? <span className="text-gray-900">৳ {p.avg_cost.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</span>
                          : <span className="text-gray-400 italic text-xs">Restricted</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {canSeeCosts
                          ? <span className="font-medium text-gray-900">৳ {p.stock_value.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</span>
                          : <span className="text-gray-400 italic text-xs">Restricted</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {p.selling_price ? `৳ ${p.selling_price.toLocaleString('en-BD')}` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => handleDeleteClick(e, p)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} products
              {selectedProductIds.size > 0 && (
                <span className="ml-3 text-gray-700 font-medium">{selectedProductIds.size} selected</span>
              )}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let page: number;
                if (totalPages <= 7) {
                  page = i + 1;
                } else if (currentPage <= 4) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  page = totalPages - 6 + i;
                } else {
                  page = currentPage - 3 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {showExport && (
        <ExportProductsModal
          products={products}
          selectedProductIds={selectedProductIds}
          onClose={() => setShowExport(false)}
        />
      )}

      {showWooImport && (
        <WooImportModal
          onClose={() => setShowWooImport(false)}
          onImported={() => { loadProducts(); setShowWooImport(false); }}
        />
      )}

      {showCsvUpdate && (
        <CsvBulkUpdateModal
          products={products}
          onClose={() => setShowCsvUpdate(false)}
          onUpdated={loadProducts}
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">Add New Product</h2>
              <button onClick={() => { setShowAddModal(false); setAddError(null); setConflictProductId(null); setAddForm(EMPTY_ADD_FORM); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Product Type</label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAddForm(f => ({ ...f, product_type: 'saleable_goods' }))}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${addForm.product_type === 'saleable_goods' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    Saleable Goods
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddForm(f => ({ ...f, product_type: 'packaging_material' }))}
                    className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${addForm.product_type === 'packaging_material' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    Packaging Material
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">SKU *</label>
                  <input
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${addError ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="e.g. RB-AV-BLK"
                    value={addForm.sku}
                    onChange={e => { setAddError(null); setAddForm(f => ({ ...f, sku: e.target.value })); }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Sunglasses"
                    value={addForm.category}
                    onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Product Name *</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Full product name"
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Barcode</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="EAN/UPC barcode"
                  value={addForm.barcode}
                  onChange={e => setAddForm(f => ({ ...f, barcode: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Selling Price (৳)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    value={addForm.selling_price}
                    onChange={e => setAddForm(f => ({ ...f, selling_price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={addForm.low_stock_threshold}
                    onChange={e => setAddForm(f => ({ ...f, low_stock_threshold: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Product Image <span className="text-gray-400 font-normal">(optional)</span></label>
                {addForm.image_preview ? (
                  <div className="flex items-center gap-3">
                    <img src={addForm.image_preview} alt="Preview" className="w-14 h-14 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 font-medium truncate">{addForm.image_file?.name}</p>
                      <p className="text-xs text-gray-400">{addForm.image_file ? (addForm.image_file.size / 1024).toFixed(0) + ' KB' : ''}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddForm(f => ({ ...f, image_file: null, image_preview: null }))}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={e => { e.preventDefault(); setAddDragOver(true); }}
                    onDragLeave={() => setAddDragOver(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setAddDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file) handleAddImageFile(file);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg transition-colors ${addDragOver ? 'border-blue-400 bg-blue-50' : 'border-dashed border-gray-300 bg-gray-50'}`}
                  >
                    <ImageIcon className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    <span className="text-xs text-gray-400 flex-1">Drop image here</span>
                    <button
                      type="button"
                      onClick={() => addFileInputRef.current?.click()}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex-shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Browse
                    </button>
                  </div>
                )}
                <input
                  ref={addFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleAddImageFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
            {addError && (
              <div className="mx-5 mb-0 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-700">{addError}</p>
                  {conflictProductId && (
                    <button
                      type="button"
                      onClick={handleViewConflict}
                      className="mt-1.5 text-xs font-medium text-red-600 underline underline-offset-2 hover:text-red-800 transition-colors"
                    >
                      View existing product in list
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 p-5 border-t flex-shrink-0">
              <Button variant="outline" onClick={() => { setShowAddModal(false); setAddError(null); setConflictProductId(null); setAddForm(EMPTY_ADD_FORM); }}>Cancel</Button>
              <Button onClick={handleAdd} disabled={saving || !addForm.sku || !addForm.name}>
                {saving ? (addForm.image_file ? 'Uploading...' : 'Saving...') : 'Add Product'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {deleteBlocked ? 'Cannot Delete Product' : 'Delete Product'}
                  </h2>
                  <p className="text-sm text-gray-500 font-mono">{deleteTarget.sku}</p>
                </div>
              </div>
              {deleteBlocked ? (
                <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">{deleteBlocked}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Are you sure you want to permanently delete <span className="font-semibold text-gray-900">{deleteTarget.name}</span>? This will also remove all associated supplier links, locations, and lot history.
                  </p>
                  <p className="text-xs text-red-600 font-medium">This action cannot be undone.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteBlocked(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {deleteBlocked ? 'Close' : 'Cancel'}
              </button>
              {!deleteBlocked && (
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Delete Product'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
