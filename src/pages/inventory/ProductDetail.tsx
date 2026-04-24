import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { loadBarcodeLabelSettings, downloadBarcodePNG, type BarcodeLabelSettings } from '../../lib/barcodeUtils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ArrowLeft, Pencil, Package, Plus, Trash2, X, Check,
  Barcode, DollarSign, MapPin, Download, Image as ImageIcon,
  Tag, ChevronDown, ChevronUp, Upload, SlidersHorizontal, PlusCircle, AlertTriangle
} from 'lucide-react';

type ProductType = 'saleable_goods' | 'packaging_material';

interface Product {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  category: string | null;
  tags: string[] | null;
  selling_price: number | null;
  image_url: string | null;
  low_stock_threshold: number;
  slots_per_unit: number | null;
  is_active: boolean;
  product_type: ProductType;
  woo_attributes: Array<Record<string, string>> | null;
  woo_parent_name: string | null;
}

interface Lot {
  id: string;
  lot_number: string;
  received_date: string;
  received_quantity: number;
  remaining_quantity: number;
  landed_cost_per_unit: number;
  barcode: string | null;
  po_id: string | null;
  shipment_id: string | null;
  location: { id: string; code: string; name: string } | null;
  po_number: string | null;
}

interface SupplierLink {
  id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_sku: string | null;
  unit_price: number | null;
  currency: string;
  is_preferred: boolean;
}

interface Supplier {
  id: string;
  name: string;
}

interface ProductLocation {
  id: string;
  location_id: string;
  location_code: string;
  location_name: string;
}

interface AllLocation {
  id: string;
  code: string;
  name: string;
}


export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canSeeCosts, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [supplierLinks, setSupplierLinks] = useState<SupplierLink[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [productLocations, setProductLocations] = useState<ProductLocation[]>([]);
  const [allLocations, setAllLocations] = useState<AllLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Product & { image_url: string }>>({});
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState({ supplier_id: '', unit_price: '', currency: 'USD', supplier_sku: '' });
  const [saving, setSaving] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocationId, setNewLocationId] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<string | null>(null);
  const [supplierEditValues, setSupplierEditValues] = useState<Partial<SupplierLink>>({});
  const [showLocationsDropdown, setShowLocationsDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showInitialStockModal, setShowInitialStockModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ lotId: '', delta: '', notes: '' });
  const [initialStockForm, setInitialStockForm] = useState({ quantity: '', landed_cost: '', location_id: '' });
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [barcodeSettings, setBarcodeSettings] = useState<BarcodeLabelSettings | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [showEditLotModal, setShowEditLotModal] = useState(false);
  const [editLotForm, setEditLotForm] = useState({ lotId: '', lotNumber: '', barcode: '' });
  const [editLotSaving, setEditLotSaving] = useState(false);
  const [editLotError, setEditLotError] = useState<string | null>(null);
  const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) loadAll(id);
  }, [id]);

  const loadAll = async (productId: string) => {
    setLoading(true);
    try {
      const [prodRes, lotRes, supplierLinkRes, allSupRes, prodLocRes, allLocRes] = await Promise.all([
        supabase.from('products').select('*').eq('id', productId).maybeSingle(),
        supabase.from('inventory_lots')
          .select('*, warehouse_locations(id, code, name), purchase_orders(po_number)')
          .eq('product_id', productId)
          .order('received_date', { ascending: false }),
        supabase.from('product_suppliers').select('*, suppliers(name)').eq('product_id', productId),
        supabase.from('suppliers').select('id, name').eq('is_active', true).order('name'),
        supabase.from('product_locations').select('id, location_id, warehouse_locations(code, name)').eq('product_id', productId),
        supabase.from('warehouse_locations').select('id, code, name').eq('is_active', true).order('code'),
      ]);

      if (prodRes.data) setProduct(prodRes.data);

      const mappedLots: Lot[] = (lotRes.data || []).map((l: any) => ({
        id: l.id,
        lot_number: l.lot_number,
        received_date: l.received_date,
        received_quantity: l.received_quantity,
        remaining_quantity: l.remaining_quantity,
        landed_cost_per_unit: l.landed_cost_per_unit,
        barcode: l.barcode,
        po_id: l.po_id,
        shipment_id: l.shipment_id,
        location: l.warehouse_locations
          ? { id: l.warehouse_locations.id, code: l.warehouse_locations.code, name: l.warehouse_locations.name }
          : null,
        po_number: l.purchase_orders?.po_number || null,
      }));
      setLots(mappedLots);

      const mappedSuppliers: SupplierLink[] = (supplierLinkRes.data || []).map((sl: any) => ({
        id: sl.id,
        supplier_id: sl.supplier_id,
        supplier_name: sl.suppliers?.name || 'Unknown',
        supplier_sku: sl.supplier_sku,
        unit_price: sl.unit_price,
        currency: sl.currency,
        is_preferred: sl.is_preferred,
      }));
      setSupplierLinks(mappedSuppliers);
      setAllSuppliers(allSupRes.data || []);

      const mappedProdLocs: ProductLocation[] = (prodLocRes.data || []).map((pl: any) => ({
        id: pl.id,
        location_id: pl.location_id,
        location_code: pl.warehouse_locations?.code || '',
        location_name: pl.warehouse_locations?.name || '',
      }));
      setProductLocations(mappedProdLocs);
      setAllLocations(allLocRes.data || []);

      const labelSettings = await loadBarcodeLabelSettings();
      setBarcodeSettings(labelSettings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageFileUpload = async (file: File) => {
    if (!product || !file.type.startsWith('image/')) return;
    setImageUploading(true);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const ext = file.name.split('.').pop();
      const path = `${product.sku.replace(/[^a-zA-Z0-9-_]/g, '_')}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
        setEditForm(f => ({ ...f, image_url: urlData.publicUrl }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImageUploading(false);
    }
  };

  const saveEdit = async () => {
    if (!id || !editForm) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('products').update({
        name: editForm.name,
        barcode: editForm.barcode,
        category: editForm.category,
        selling_price: editForm.selling_price,
        image_url: editForm.image_url,
        low_stock_threshold: editForm.low_stock_threshold,
        slots_per_unit: editForm.slots_per_unit ?? null,
        product_type: editForm.product_type,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
      setProduct(p => p ? { ...p, ...editForm } as Product : p);
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const addSupplierLink = async () => {
    if (!id || !newSupplierForm.supplier_id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('product_suppliers').insert({
        product_id: id,
        supplier_id: newSupplierForm.supplier_id,
        unit_price: newSupplierForm.unit_price ? parseFloat(newSupplierForm.unit_price) : null,
        currency: newSupplierForm.currency,
        supplier_sku: newSupplierForm.supplier_sku || null,
      });
      if (error) throw error;
      setShowAddSupplier(false);
      setNewSupplierForm({ supplier_id: '', unit_price: '', currency: 'USD', supplier_sku: '' });
      loadAll(id);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const removeSupplierLink = async (linkId: string) => {
    await supabase.from('product_suppliers').delete().eq('id', linkId);
    setSupplierLinks(s => s.filter(l => l.id !== linkId));
  };

  const saveSupplierEdit = async (linkId: string) => {
    if (!supplierEditValues) return;
    try {
      await supabase.from('product_suppliers').update({
        unit_price: supplierEditValues.unit_price,
        currency: supplierEditValues.currency,
        supplier_sku: supplierEditValues.supplier_sku,
        is_preferred: supplierEditValues.is_preferred,
      }).eq('id', linkId);
      setSupplierLinks(links => links.map(l =>
        l.id === linkId ? { ...l, ...supplierEditValues } : l
      ));
      setEditingSupplier(null);
    } catch (err) {
      console.error(err);
    }
  };

  const addProductLocation = async () => {
    if (!id || !newLocationId) return;
    try {
      const { error } = await supabase.from('product_locations').insert({
        product_id: id,
        location_id: newLocationId,
      });
      if (error) throw error;
      setShowAddLocation(false);
      setNewLocationId('');
      loadAll(id);
    } catch (err) {
      console.error(err);
    }
  };

  const removeProductLocation = async (plId: string) => {
    await supabase.from('product_locations').delete().eq('id', plId);
    setProductLocations(l => l.filter(x => x.id !== plId));
  };

  const handleDeleteClick = async () => {
    if (!id) return;
    const { data: activeLots } = await supabase
      .from('inventory_lots')
      .select('id')
      .eq('product_id', id)
      .gt('remaining_quantity', 0)
      .limit(1);
    if (activeLots && activeLots.length > 0) {
      setDeleteBlocked('This product has active stock in inventory. Remove all stock before deleting.');
      setShowDeleteConfirm(true);
      return;
    }
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', id)
      .limit(1);
    if (orderItems && orderItems.length > 0) {
      setDeleteBlocked('This product is linked to existing orders and cannot be deleted.');
      setShowDeleteConfirm(true);
      return;
    }
    setDeleteBlocked(null);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!id || deleteBlocked) return;
    setDeleting(true);
    try {
      await supabase.from('product_locations').delete().eq('product_id', id);
      await supabase.from('product_suppliers').delete().eq('product_id', id);
      await supabase.from('inventory_lots').delete().eq('product_id', id);
      await supabase.from('stock_movements').delete().eq('product_id', id);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      navigate('/inventory/products');
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  const handleAdjust = async () => {
    if (!id || !adjustForm.lotId || !adjustForm.delta) return;
    const delta = parseInt(adjustForm.delta);
    if (isNaN(delta) || delta === 0) { setAdjustError('Enter a non-zero delta (e.g. +50 or -10)'); return; }
    const lot = lots.find(l => l.id === adjustForm.lotId);
    if (!lot) return;
    const newQty = lot.remaining_quantity + delta;
    if (newQty < 0) { setAdjustError(`Cannot reduce below 0. Current: ${lot.remaining_quantity}, Delta: ${delta}`); return; }
    setAdjustSaving(true);
    setAdjustError(null);
    try {
      const { error: lotError } = await supabase
        .from('inventory_lots')
        .update({ remaining_quantity: newQty })
        .eq('id', adjustForm.lotId);
      if (lotError) throw lotError;
      const { error: mvtError } = await supabase
        .from('stock_movements')
        .insert({
          movement_type: 'adjustment',
          product_id: id,
          lot_id: adjustForm.lotId,
          quantity: delta,
          reference_type: 'audit',
          notes: adjustForm.notes || 'Manual stock adjustment',
        });
      if (mvtError) throw mvtError;
      setShowAdjustModal(false);
      setAdjustForm({ lotId: '', delta: '', notes: '' });
      loadAll(id);
    } catch (err: any) {
      setAdjustError(err?.message || 'Failed to save adjustment');
    } finally {
      setAdjustSaving(false);
    }
  };

  const handleInitialStock = async () => {
    if (!id || !initialStockForm.quantity || !initialStockForm.landed_cost || !initialStockForm.location_id) return;
    const qty = parseInt(initialStockForm.quantity);
    const cost = parseFloat(initialStockForm.landed_cost);
    if (isNaN(qty) || qty <= 0) { setAdjustError('Quantity must be a positive number'); return; }
    if (isNaN(cost) || cost < 0) { setAdjustError('Landed cost must be a valid number'); return; }
    setAdjustSaving(true);
    setAdjustError(null);
    try {
      const lotNumber = `LOT-${product!.sku}-INIT-${Date.now()}`;
      const { data: lotData, error: lotError } = await supabase
        .from('inventory_lots')
        .insert({
          lot_number: lotNumber,
          product_id: id,
          location_id: initialStockForm.location_id,
          received_date: new Date().toISOString().split('T')[0],
          received_quantity: qty,
          remaining_quantity: qty,
          landed_cost_per_unit: cost,
          barcode: `${product!.sku}-INIT`,
        })
        .select('id')
        .single();
      if (lotError) throw lotError;
      const { error: mvtError } = await supabase
        .from('stock_movements')
        .insert({
          movement_type: 'receipt',
          product_id: id,
          lot_id: lotData.id,
          to_location_id: initialStockForm.location_id,
          quantity: qty,
          reference_type: 'po',
          notes: 'Initial stock entry',
        });
      if (mvtError) throw mvtError;
      setShowInitialStockModal(false);
      setInitialStockForm({ quantity: '', landed_cost: '', location_id: '' });
      loadAll(id);
    } catch (err: any) {
      setAdjustError(err?.message || 'Failed to add initial stock');
    } finally {
      setAdjustSaving(false);
    }
  };

  const handleEditLot = async () => {
    if (!id || !editLotForm.lotId || !editLotForm.lotNumber.trim()) return;
    setEditLotSaving(true);
    setEditLotError(null);
    try {
      const { error } = await supabase
        .from('inventory_lots')
        .update({
          lot_number: editLotForm.lotNumber.trim(),
          barcode: editLotForm.barcode.trim() || null,
        })
        .eq('id', editLotForm.lotId);
      if (error) {
        if (error.code === '23505') {
          setEditLotError(`Lot ID "${editLotForm.lotNumber.trim()}" already exists. Please use a unique value.`);
        } else {
          throw error;
        }
        return;
      }
      setShowEditLotModal(false);
      loadAll(id);
    } catch (err: any) {
      setEditLotError(err?.message || 'Failed to save changes');
    } finally {
      setEditLotSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading product...</p>
      </div>
    </div>
  );
  if (!product) return <div className="py-20 text-center text-gray-400">Product not found</div>;

  const totalStock = lots.reduce((s, l) => s + l.remaining_quantity, 0);
  const totalValue = lots.reduce((s, l) => s + l.remaining_quantity * l.landed_cost_per_unit, 0);
  const avgCost = totalStock > 0 ? totalValue / totalStock : 0;

  const lotLocations = Array.from(
    new Map(
      lots
        .filter(l => l.location !== null && l.remaining_quantity > 0)
        .map(l => [l.location!.id, l.location!])
    ).values()
  );

  const availableLocations = allLocations.filter(
    loc =>
      !productLocations.find(pl => pl.location_id === loc.id) &&
      !lotLocations.find(ll => ll.id === loc.id)
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/inventory/products')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5 font-mono">{product.sku}</p>
        </div>
        {!editing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteClick}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <Button
              variant="default"
              onClick={() => { setEditing(true); setEditForm({ ...product }); setImagePreview(null); }}
              className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-700"
            >
              <Pencil className="w-4 h-4" /> Edit Product
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={saveEdit} disabled={saving} className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-700">
              <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => { setEditing(false); setImagePreview(null); }}>Cancel</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Product Image</h3>
            </div>
            <div
              className={`relative bg-gray-50 ${editing ? 'cursor-pointer' : ''}`}
              onDragOver={editing ? e => { e.preventDefault(); setImageDragOver(true); } : undefined}
              onDragLeave={editing ? () => setImageDragOver(false) : undefined}
              onDrop={editing ? e => {
                e.preventDefault();
                setImageDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleImageFileUpload(file);
              } : undefined}
            >
              {(imagePreview || (editing ? editForm.image_url : product.image_url)) ? (
                <img
                  src={imagePreview || (editing ? editForm.image_url : product.image_url) as string}
                  alt={product.name}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className={`w-full aspect-square flex flex-col items-center justify-center transition-colors ${imageDragOver ? 'bg-blue-50 text-blue-300' : 'text-gray-300'}`}>
                  <ImageIcon className="w-16 h-16 mb-2" />
                  <span className="text-xs">{editing ? 'Drop image here' : 'No image'}</span>
                </div>
              )}
              {editing && (imagePreview || editForm.image_url) && (
                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${imageDragOver ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-white text-center pointer-events-none">
                    <Upload className="w-8 h-8 mx-auto mb-1" />
                    <span className="text-xs">Replace image</span>
                  </div>
                </div>
              )}
              {imageUploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                </div>
              )}
            </div>
            {editing && (
              <div className="p-3 border-t border-gray-100 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-3 h-3" /> Upload Image
                  </button>
                  {(imagePreview || editForm.image_url) && (
                    <button
                      type="button"
                      onClick={() => { setImagePreview(null); setEditForm(f => ({ ...f, image_url: '' })); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFileUpload(file);
                    e.target.value = '';
                  }}
                />
                <input
                  type="text"
                  placeholder="Or paste image URL..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  value={editForm.image_url || ''}
                  onChange={e => { setEditForm(f => ({ ...f, image_url: e.target.value })); setImagePreview(null); }}
                />
              </div>
            )}
          </Card>

          <Card className="divide-y divide-gray-100">
            <div className="px-4 py-3 flex justify-between items-center gap-2">
              <span className="text-sm text-gray-500">Total Stock</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{totalStock.toLocaleString()} units</span>
                {totalStock === 0 ? (
                  <button
                    onClick={() => { setAdjustError(null); setInitialStockForm({ quantity: '', landed_cost: '', location_id: '' }); setShowInitialStockModal(true); }}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
                    title="Add initial stock"
                  >
                    <PlusCircle className="w-3 h-3" /> Add Stock
                  </button>
                ) : (
                  <button
                    onClick={() => { setAdjustError(null); setAdjustForm({ lotId: (lots.find(l => l.remaining_quantity > 0) ?? lots[0])?.id || '', delta: '', notes: '' }); setShowAdjustModal(true); }}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                    title="Adjust stock"
                  >
                    <SlidersHorizontal className="w-3 h-3" /> Adjust
                  </button>
                )}
              </div>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-gray-500">Total Value</span>
              <span className="text-sm font-bold text-gray-900">
                {canSeeCosts
                  ? `৳ ${totalValue.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`
                  : <span className="text-gray-400 italic text-xs">Restricted</span>}
              </span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-gray-500">Avg. Cost</span>
              <span className="text-sm font-bold text-gray-900">
                {canSeeCosts
                  ? `৳ ${avgCost.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`
                  : <span className="text-gray-400 italic text-xs">Restricted</span>}
              </span>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Product Details</h3>
            </div>
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Package className="w-3.5 h-3.5 text-gray-400" />
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</label>
                  </div>
                  <p className="text-sm text-gray-700 font-mono">{product.sku}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Product Name</label>
                  {editing ? (
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                      value={editForm.name || ''}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm text-gray-700">{product.name}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</label>
                  </div>
                  {editing ? (
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                      value={editForm.category || ''}
                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm text-gray-700">{product.category || <span className="text-gray-400">—</span>}</p>
                  )}
                </div>

                {(product.tags && product.tags.length > 0) && (
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Tag className="w-3.5 h-3.5 text-gray-400" />
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</label>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {product.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Product Type</label>
                  </div>
                  {editing ? (
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setEditForm(f => ({ ...f, product_type: 'saleable_goods' }))}
                        className={`flex-1 py-1.5 text-xs font-medium transition-colors ${editForm.product_type === 'saleable_goods' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        Saleable Goods
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm(f => ({ ...f, product_type: 'packaging_material' }))}
                        className={`flex-1 py-1.5 text-xs font-medium transition-colors border-l border-gray-300 ${editForm.product_type === 'packaging_material' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        Packaging Material
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">
                        {product.product_type === 'packaging_material' ? 'Packaging Material' : 'Saleable Goods'}
                      </span>
                      {product.product_type === 'packaging_material' && (
                        <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">PKG</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</label>
                  </div>
                  {editing ? (
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                      value={editForm.selling_price || ''}
                      onChange={e => setEditForm(f => ({ ...f, selling_price: parseFloat(e.target.value) || null }))}
                    />
                  ) : (
                    <p className="text-sm text-gray-700">
                      {product.selling_price ? `৳ ${product.selling_price.toLocaleString('en-BD')}` : <span className="text-gray-400">—</span>}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <Barcode className="w-3.5 h-3.5 text-gray-400" />
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode (Same as SKU)</label>
                </div>
                <div className="flex items-center gap-3">
                  {editing ? (
                    <input
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                      value={editForm.barcode || ''}
                      onChange={e => setEditForm(f => ({ ...f, barcode: e.target.value }))}
                      placeholder="Leave blank to use SKU"
                    />
                  ) : (
                    <span className="flex-1 text-sm font-mono text-gray-700">
                      {product.barcode || product.sku}
                    </span>
                  )}
                  <button
                    onClick={() => barcodeSettings && downloadBarcodePNG(product.barcode || product.sku, product.sku, barcodeSettings)}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
                    title="Download barcode PNG"
                    disabled={!barcodeSettings}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Product-level barcode for identification</p>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse Locations</label>
                  </div>
                  {editing && (
                    <button
                      onClick={() => setShowLocationsDropdown(v => !v)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Plus className="w-3 h-3" /> Add Location
                      {showLocationsDropdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {editing && showLocationsDropdown && availableLocations.length > 0 && (
                  <div className="mb-3 flex items-center gap-2">
                    <select
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400"
                      value={newLocationId}
                      onChange={e => setNewLocationId(e.target.value)}
                    >
                      <option value="">Select location...</option>
                      {availableLocations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.code} — {loc.name}</option>
                      ))}
                    </select>
                    <Button size="sm" onClick={addProductLocation} disabled={!newLocationId} className="bg-gray-900 text-white hover:bg-gray-700">
                      Add
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowLocationsDropdown(false); setNewLocationId(''); }}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {lotLocations.length === 0 && productLocations.length === 0 ? (
                    <span className="text-sm text-gray-400">No locations assigned</span>
                  ) : (
                    <>
                      {lotLocations.map(ll => (
                        <div key={ll.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-md text-sm font-mono text-blue-700">
                          <MapPin className="w-3 h-3 text-blue-400" />
                          {ll.code}
                        </div>
                      ))}
                      {productLocations.map(pl => (
                        <div key={pl.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-md text-sm font-mono text-gray-700">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {pl.location_code}
                          {editing && (
                            <button onClick={() => removeProductLocation(pl.id)} className="ml-1 text-gray-400 hover:text-red-500 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {(product.woo_attributes && product.woo_attributes.length > 0) && (
                <div className="border-t border-gray-100 pt-5">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Attributes</label>
                  <div className="flex flex-wrap gap-2">
                    {product.woo_attributes.map((attr, i) => (
                      Object.entries(attr).map(([key, val]) => (
                        <span key={`${i}-${key}`} className="px-2.5 py-1 bg-gray-100 rounded-md text-xs text-gray-700">
                          {key}: <span className="font-medium">{val}</span>
                        </span>
                      ))
                    ))}
                  </div>
                </div>
              )}

              {editing && (
                <>
                  <div className="border-t border-gray-100 pt-5">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Low Stock Alert Threshold</label>
                    <input
                      type="number"
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                      value={editForm.low_stock_threshold || 20}
                      onChange={e => setEditForm(f => ({ ...f, low_stock_threshold: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="border-t border-gray-100 pt-5">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Slots per Unit</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                      value={editForm.slots_per_unit ?? 1}
                      onChange={e => setEditForm(f => ({ ...f, slots_per_unit: parseFloat(e.target.value) || 1 }))}
                    />
                    <p className="text-xs text-gray-400 mt-1.5 leading-relaxed max-w-xs">
                      How many slots in a storage location this product occupies per unit. Default is 1. Set higher for physically larger items (e.g. 2 means only half as many fit in a location).
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Suppliers</h3>
            <p className="text-xs text-gray-400 mt-0.5">Manage multiple suppliers with different unit costs</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddSupplier(true)}
            className="flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Supplier
          </Button>
        </div>

        {showAddSupplier && (
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Supplier</label>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={newSupplierForm.supplier_id}
                  onChange={e => setNewSupplierForm(f => ({ ...f, supplier_id: e.target.value }))}
                >
                  <option value="">Select supplier...</option>
                  {allSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Supplier SKU</label>
                <input className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32" placeholder="Optional" value={newSupplierForm.supplier_sku} onChange={e => setNewSupplierForm(f => ({ ...f, supplier_sku: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Unit Cost</label>
                <input type="number" className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-28" placeholder="0.00" value={newSupplierForm.unit_price} onChange={e => setNewSupplierForm(f => ({ ...f, unit_price: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Currency</label>
                <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={newSupplierForm.currency} onChange={e => setNewSupplierForm(f => ({ ...f, currency: e.target.value }))}>
                  <option>USD</option><option>CNY</option><option>BDT</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={addSupplierLink} disabled={saving || !newSupplierForm.supplier_id} size="sm" className="bg-gray-900 text-white hover:bg-gray-700">Add</Button>
                <Button variant="outline" size="sm" onClick={() => setShowAddSupplier(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {supplierLinks.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No suppliers linked to this product</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {supplierLinks.map(sl => {
                  const isEditing = editingSupplier === sl.id;
                  const totalCost = sl.unit_price ? sl.unit_price * totalStock : null;
                  return (
                    <tr key={sl.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">{sl.supplier_name}</span>
                          {sl.is_preferred && <Badge variant="blue">Preferred</Badge>}
                        </div>
                        {sl.supplier_sku && <p className="text-xs text-gray-400 mt-0.5">SKU: {sl.supplier_sku}</p>}
                      </td>
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            value={supplierEditValues.unit_price || ''}
                            onChange={e => setSupplierEditValues(v => ({ ...v, unit_price: parseFloat(e.target.value) }))}
                          />
                        ) : (
                          <span className="text-sm text-gray-700">{sl.unit_price ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <select
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            value={supplierEditValues.currency || 'USD'}
                            onChange={e => setSupplierEditValues(v => ({ ...v, currency: e.target.value }))}
                          >
                            <option>USD</option><option>CNY</option><option>BDT</option>
                          </select>
                        ) : (
                          <span className="text-sm text-gray-700">{sl.currency}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700">
                        {totalCost != null ? `${totalCost.toFixed(2)} ${sl.currency}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button onClick={() => saveSupplierEdit(sl.id)} className="text-emerald-600 hover:text-emerald-700 transition-colors">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingSupplier(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => { setEditingSupplier(sl.id); setSupplierEditValues({ unit_price: sl.unit_price ?? undefined, currency: sl.currency, supplier_sku: sl.supplier_sku ?? undefined, is_preferred: sl.is_preferred }); }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => removeSupplierLink(sl.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Shipments</h3>
            <p className="text-xs text-gray-400 mt-0.5">Each shipment has a unique barcode for tracking and dispatch</p>
          </div>
          {lots.length > 0 && (
            <button
              onClick={() => {
                if (expandedLots.size === lots.length) {
                  setExpandedLots(new Set());
                } else {
                  setExpandedLots(new Set(lots.map(l => l.id)));
                }
              }}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              {expandedLots.size === lots.length ? 'Collapse all' : 'Expand all'}
            </button>
          )}
        </div>
        {lots.length === 0 ? (
          <div className="p-10 text-center">
            <Package className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">No shipments on record</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {lots.map((lot, idx) => {
              const lotValue = lot.remaining_quantity * lot.landed_cost_per_unit;
              const shipmentBarcode = lot.barcode || lot.lot_number;
              const isOpen = expandedLots.has(lot.id);
              const toggleOpen = () => setExpandedLots(prev => {
                const next = new Set(prev);
                if (next.has(lot.id)) next.delete(lot.id); else next.add(lot.id);
                return next;
              });
              return (
                <div key={lot.id} className={idx === 0 ? '' : ''}>
                  {/* Accordion header */}
                  <button
                    onClick={toggleOpen}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors ${isOpen ? 'text-gray-700' : 'text-gray-400'}`}>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                    {/* Lot ID */}
                    <span className="font-mono text-sm font-semibold text-gray-800 w-28 flex-shrink-0">{lot.lot_number}</span>
                    {/* Location badge */}
                    <span className="flex items-center gap-1 text-xs text-gray-500 w-24 flex-shrink-0">
                      <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      {lot.location ? lot.location.code : <span className="text-gray-300">—</span>}
                    </span>
                    {/* Received date */}
                    <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                      {new Date(lot.received_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div className="flex-1" />
                    {/* Remaining qty pill */}
                    <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${lot.remaining_quantity === 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {lot.remaining_quantity} remaining
                    </span>
                    {/* Lot value */}
                    {canSeeCosts && (
                      <span className="flex-shrink-0 text-sm font-medium text-gray-700 w-24 text-right hidden md:block">
                        ৳ {lotValue.toLocaleString('en-BD', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </button>

                  {/* Accordion body */}
                  {isOpen && (
                    <div className="bg-gray-50 border-t border-gray-100 px-5 py-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Shipment Barcode</p>
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 border border-gray-300 rounded text-xs font-mono text-gray-700 bg-white">
                              {shipmentBarcode}
                            </span>
                            <button
                              onClick={() => barcodeSettings && downloadBarcodePNG(shipmentBarcode, lot.lot_number, barcodeSettings)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="Download barcode PNG"
                              disabled={!barcodeSettings}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Received Date</p>
                          <p className="text-sm text-gray-700">
                            {new Date(lot.received_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">PO ID</p>
                          <p className="text-sm font-mono text-gray-700">{lot.po_number || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Location</p>
                          {lot.location ? (
                            <span className="flex items-center gap-1 text-sm text-gray-700">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {lot.location.code}
                            </span>
                          ) : <span className="text-sm text-gray-400">—</span>}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Landed Cost</p>
                          <p className="text-sm text-gray-700">
                            {canSeeCosts
                              ? `৳ ${lot.landed_cost_per_unit.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : <span className="text-gray-400 italic text-xs">Restricted</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Initial Qty</p>
                          <p className="text-sm text-gray-700">{lot.received_quantity}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Remaining Qty</p>
                          <p className={`text-sm font-semibold ${lot.remaining_quantity === 0 ? 'text-red-500' : 'text-gray-900'}`}>
                            {lot.remaining_quantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Lot Value</p>
                          <p className="text-sm font-medium text-gray-900">
                            {canSeeCosts
                              ? `৳ ${lotValue.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`
                              : <span className="text-gray-400 italic text-xs">Restricted</span>}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
                          <button
                            onClick={() => {
                              setEditLotForm({ lotId: lot.id, lotNumber: lot.lot_number, barcode: lot.barcode || '' });
                              setEditLotError(null);
                              setShowEditLotModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-white hover:text-gray-800 transition-colors"
                          >
                            <Pencil className="w-3 h-3" /> Edit Lot / Barcode
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Adjust Stock</h2>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{product.sku}</p>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Select Lot</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  value={adjustForm.lotId}
                  onChange={e => { setAdjustError(null); setAdjustForm(f => ({ ...f, lotId: e.target.value, delta: '' })); }}
                >
                  {lots.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.lot_number} — {l.remaining_quantity} units {l.location ? `@ ${l.location.code}` : ''}{l.remaining_quantity === 0 ? ' (depleted)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Delta <span className="font-normal text-gray-400">(use negative to remove, e.g. -10)</span>
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent font-mono"
                  placeholder="e.g. +50 or -10"
                  value={adjustForm.delta}
                  onChange={e => setAdjustForm(f => ({ ...f, delta: e.target.value }))}
                />
                {adjustForm.lotId && adjustForm.delta && (() => {
                  const d = parseInt(adjustForm.delta);
                  const lot = lots.find(l => l.id === adjustForm.lotId);
                  if (!lot || isNaN(d)) return null;
                  const newQty = lot.remaining_quantity + d;
                  return (
                    <p className={`text-xs mt-1.5 ${newQty < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {lot.remaining_quantity} → <span className="font-semibold">{newQty}</span> units
                    </p>
                  );
                })()}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Reason <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  placeholder="e.g. Damaged items, recount correction..."
                  value={adjustForm.notes}
                  onChange={e => setAdjustForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              {adjustError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {adjustError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <Button variant="outline" onClick={() => setShowAdjustModal(false)}>Cancel</Button>
              <Button
                onClick={handleAdjust}
                disabled={adjustSaving || !adjustForm.lotId || !adjustForm.delta}
                className="bg-gray-900 text-white hover:bg-gray-700"
              >
                {adjustSaving ? 'Saving...' : 'Save Adjustment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showInitialStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Add Initial Stock</h2>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{product.sku}</p>
              </div>
              <button onClick={() => setShowInitialStockModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Quantity *</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    placeholder="e.g. 200"
                    value={initialStockForm.quantity}
                    onChange={e => setInitialStockForm(f => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Avg. Landed Cost (৳) *</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    placeholder="e.g. 450.00"
                    value={initialStockForm.landed_cost}
                    onChange={e => setInitialStockForm(f => ({ ...f, landed_cost: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Warehouse Location *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  value={initialStockForm.location_id}
                  onChange={e => setInitialStockForm(f => ({ ...f, location_id: e.target.value }))}
                >
                  <option value="">Select location...</option>
                  {allLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.code} — {loc.name}</option>
                  ))}
                </select>
              </div>
              {initialStockForm.quantity && initialStockForm.landed_cost && (
                <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-600">
                    Total stock value: <span className="font-semibold text-gray-900">
                      ৳ {(parseInt(initialStockForm.quantity || '0') * parseFloat(initialStockForm.landed_cost || '0')).toLocaleString('en-BD', { maximumFractionDigits: 2 })}
                    </span>
                  </p>
                </div>
              )}
              {adjustError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {adjustError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <Button variant="outline" onClick={() => setShowInitialStockModal(false)}>Cancel</Button>
              <Button
                onClick={handleInitialStock}
                disabled={adjustSaving || !initialStockForm.quantity || !initialStockForm.landed_cost || !initialStockForm.location_id}
                className="bg-emerald-700 text-white hover:bg-emerald-800"
              >
                {adjustSaving ? 'Saving...' : 'Add Stock'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showEditLotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit Shipment</h2>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{product.sku}</p>
              </div>
              <button onClick={() => setShowEditLotModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Changing the Lot ID or Shipment Barcode affects barcode labels and stock tracking records. Proceed with care.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Lot ID <span className="font-normal text-gray-400">(must be unique)</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  value={editLotForm.lotNumber}
                  onChange={e => setEditLotForm(f => ({ ...f, lotNumber: e.target.value }))}
                  placeholder="e.g. LOT-001"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Shipment Barcode <span className="font-normal text-gray-400">(leave blank to use Lot ID as barcode)</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  value={editLotForm.barcode}
                  onChange={e => setEditLotForm(f => ({ ...f, barcode: e.target.value }))}
                  placeholder={`e.g. ${editLotForm.lotNumber || 'LN_1054'}`}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Preview: <span className="font-mono font-medium text-gray-600">{editLotForm.barcode.trim() || editLotForm.lotNumber.trim() || '—'}</span>
                </p>
              </div>
              {editLotError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {editLotError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <Button variant="outline" onClick={() => setShowEditLotModal(false)}>Cancel</Button>
              <Button
                onClick={handleEditLot}
                disabled={editLotSaving || !editLotForm.lotNumber.trim()}
                className="bg-gray-900 text-white hover:bg-gray-700"
              >
                {editLotSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
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
                  <p className="text-sm text-gray-500 font-mono">{product.sku}</p>
                </div>
              </div>
              {deleteBlocked ? (
                <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">{deleteBlocked}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Are you sure you want to permanently delete <span className="font-semibold text-gray-900">{product.name}</span>? This will also remove all associated supplier links, locations, and lot history.
                  </p>
                  <p className="text-xs text-red-600 font-medium">This action cannot be undone.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteBlocked(null); }}
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
