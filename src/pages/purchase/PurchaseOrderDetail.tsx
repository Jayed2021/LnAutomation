import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Save, X, FileSpreadsheet, Truck, Package, Check, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/ui/Badge';
import ExcelJS from 'exceljs';

interface PODetail {
  id: string;
  po_number: string;
  shipment_name: string | null;
  status: string;
  currency: string;
  usd_to_bdt_rate: number;
  cny_to_bdt_rate: number;
  usd_to_cny_rate: number;
  exchange_rate_to_bdt: number;
  expected_delivery_date: string | null;
  created_at: string;
  total_weight_kg: number | null;
  number_of_cartons: number | null;
  shipping_cost_bdt: number;
  is_payment_complete: boolean;
  supplier: {
    name: string;
    code: string;
    short_name: string | null;
  };
}

interface POItem {
  id: string;
  sku: string;
  product_name: string;
  product_image_url: string | null;
  ordered_quantity: number;
  received_quantity: number;
  unit_price: number;
  shipping_cost_per_unit: number;
  landed_cost_per_unit: number;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  ordered: 'Ordered',
  partially_received: 'Partially Received',
  closed: 'Closed',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  ordered: 'blue',
  partially_received: 'amber',
  closed: 'emerald',
};

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', CNY: '¥', BDT: '৳' };

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [po, setPo] = useState<PODetail | null>(null);
  const [items, setItems] = useState<POItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingShipping, setEditingShipping] = useState(false);
  const [shippingWeight, setShippingWeight] = useState('');
  const [shippingCartons, setShippingCartons] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [savingShipping, setSavingShipping] = useState(false);

  const [editingETA, setEditingETA] = useState(false);
  const [etaValue, setEtaValue] = useState('');
  const [savingETA, setSavingETA] = useState(false);

  useEffect(() => {
    if (id) fetchPO();
  }, [id]);

  const fetchPO = async () => {
    setLoading(true);

    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        id, po_number, shipment_name, status, currency,
        usd_to_bdt_rate, cny_to_bdt_rate, usd_to_cny_rate, exchange_rate_to_bdt,
        expected_delivery_date, created_at,
        total_weight_kg, number_of_cartons, shipping_cost_bdt, is_payment_complete,
        suppliers!inner(name, code, short_name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (poError || !poData) {
      setLoading(false);
      return;
    }

    const mapped: PODetail = {
      id: poData.id,
      po_number: poData.po_number,
      shipment_name: poData.shipment_name,
      status: poData.status,
      currency: poData.currency,
      usd_to_bdt_rate: poData.usd_to_bdt_rate || 110,
      cny_to_bdt_rate: poData.cny_to_bdt_rate || 15.17,
      usd_to_cny_rate: poData.usd_to_cny_rate || 7.25,
      exchange_rate_to_bdt: poData.exchange_rate_to_bdt || 1,
      expected_delivery_date: poData.expected_delivery_date,
      created_at: poData.created_at,
      total_weight_kg: poData.total_weight_kg,
      number_of_cartons: poData.number_of_cartons,
      shipping_cost_bdt: poData.shipping_cost_bdt || 0,
      is_payment_complete: poData.is_payment_complete || false,
      supplier: {
        name: (poData as any).suppliers?.name || '',
        code: (poData as any).suppliers?.code || '',
        short_name: (poData as any).suppliers?.short_name || null,
      },
    };

    setPo(mapped);
    setShippingWeight(mapped.total_weight_kg?.toString() || '');
    setShippingCartons(mapped.number_of_cartons?.toString() || '');
    setShippingCost(mapped.shipping_cost_bdt?.toString() || '');
    setEtaValue(mapped.expected_delivery_date || '');

    const { data: itemsData } = await supabase
      .from('purchase_order_items')
      .select('id, sku, product_name, product_image_url, ordered_quantity, received_quantity, unit_price, shipping_cost_per_unit, landed_cost_per_unit')
      .eq('po_id', id)
      .order('sku');

    setItems(itemsData || []);
    setLoading(false);
  };

  const saveShipping = async () => {
    if (!po) return;
    setSavingShipping(true);

    const weight = parseFloat(shippingWeight) || null;
    const cartons = parseInt(shippingCartons) || null;
    const cost = parseFloat(shippingCost) || 0;

    const totalQty = items.reduce((s, i) => s + i.ordered_quantity, 0);
    const perUnitShipping = totalQty > 0 ? cost / totalQty : 0;

    const getRate = () => {
      if (po.currency === 'USD') return po.usd_to_bdt_rate;
      if (po.currency === 'CNY') return po.cny_to_bdt_rate;
      return 1;
    };
    const rate = getRate();

    await supabase
      .from('purchase_orders')
      .update({
        total_weight_kg: weight,
        number_of_cartons: cartons,
        shipping_cost_bdt: cost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', po.id);

    for (const item of items) {
      const landedCost = item.unit_price * rate + perUnitShipping;
      await supabase
        .from('purchase_order_items')
        .update({
          shipping_cost_per_unit: perUnitShipping,
          landed_cost_per_unit: landedCost,
        })
        .eq('id', item.id);
    }

    await fetchPO();
    setEditingShipping(false);
    setSavingShipping(false);
  };

  const saveETA = async () => {
    if (!po) return;
    setSavingETA(true);
    await supabase
      .from('purchase_orders')
      .update({ expected_delivery_date: etaValue || null, updated_at: new Date().toISOString() })
      .eq('id', po.id);
    setPo((prev) => prev ? { ...prev, expected_delivery_date: etaValue } : prev);
    setEditingETA(false);
    setSavingETA(false);
  };

  const [markingOrdered, setMarkingOrdered] = useState(false);

  const markAsOrdered = async () => {
    if (!po || po.status !== 'draft') return;
    setMarkingOrdered(true);
    await supabase
      .from('purchase_orders')
      .update({ status: 'ordered', updated_at: new Date().toISOString() })
      .eq('id', po.id);
    setPo((prev) => prev ? { ...prev, status: 'ordered' } : prev);
    setMarkingOrdered(false);
  };

  const exportPackingList = async () => {
    if (!po) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ERP System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Packing List', {
      pageSetup: { orientation: 'portrait' },
    });

    sheet.columns = [
      { header: '', key: 'image', width: 12 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Product Name', key: 'product_name', width: 40 },
      { header: 'Ordered Qty', key: 'ordered_qty', width: 14 },
      { header: 'Received Qty', key: 'received_qty', width: 14 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    });

    const ROW_HEIGHT = 60;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowIndex = i + 2;
      const row = sheet.getRow(rowIndex);
      row.height = ROW_HEIGHT;

      row.getCell(1).value = null;
      row.getCell('sku').value = item.sku;
      row.getCell('product_name').value = item.product_name;
      row.getCell('ordered_qty').value = item.ordered_quantity;
      row.getCell('received_qty').value = item.received_quantity;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 3 ? 'left' : 'center', wrapText: true };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
        if (i % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }
      });

      if (item.product_image_url) {
        try {
          const isSupabaseUrl = item.product_image_url.includes(supabaseUrl);
          const fetchUrl = isSupabaseUrl
            ? item.product_image_url
            : `${supabaseUrl}/functions/v1/image-proxy?url=${encodeURIComponent(item.product_image_url)}`;
          const fetchHeaders: Record<string, string> = isSupabaseUrl
            ? {}
            : { Authorization: `Bearer ${supabaseAnonKey}` };
          const res = await fetch(fetchUrl, { headers: fetchHeaders });
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const contentType = res.headers.get('content-type') || 'image/jpeg';
            const ext = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : 'jpeg';
            const imageId = workbook.addImage({
              buffer: buf,
              extension: ext as 'jpeg' | 'png' | 'gif',
            });
            sheet.addImage(imageId, {
              tl: { col: 0, row: i + 1 },
              br: { col: 1, row: i + 2 },
              editAs: 'oneCell',
            });
          }
        } catch (err) {
          console.warn(`Error fetching image for ${item.product_name}:`, err);
        }
      }
    }

    const totalsRowIndex = items.length + 2;
    const totalsRow = sheet.getRow(totalsRowIndex);
    totalsRow.height = 28;
    totalsRow.getCell('product_name').value = 'TOTAL';
    totalsRow.getCell('ordered_qty').value = items.reduce((s, i) => s + i.ordered_quantity, 0);
    totalsRow.getCell('received_qty').value = items.reduce((s, i) => s + i.received_quantity, 0);
    totalsRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'medium', color: { argb: 'FF3B82F6' } } };
    });
    totalsRow.getCell('product_name').alignment = { vertical: 'middle', horizontal: 'left' };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packing-list-${po.po_number}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getItemStatus = (item: POItem) => {
    if (item.received_quantity >= item.ordered_quantity) return { label: 'Received', color: 'emerald' };
    if (item.received_quantity > 0) return { label: 'Partial', color: 'amber' };
    return { label: 'Pending', color: 'gray' };
  };

  const totalValue = items.reduce((s, i) => s + i.ordered_quantity * i.unit_price, 0);
  const sym = CURRENCY_SYMBOL[po?.currency || 'USD'] || '';

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Package className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">Purchase order not found</p>
        <button onClick={() => navigate('/purchase/orders')} className="mt-3 text-sm text-blue-600 hover:underline">
          Back to Purchase Orders
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-screen-xl">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/purchase/orders')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{po.po_number}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Purchase Order Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportPackingList}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Create Packing List
          </button>
          {po.status === 'draft' && (
            <button
              onClick={markAsOrdered}
              disabled={markingOrdered}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {markingOrdered ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Mark as Ordered
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Supplier</p>
          <div className="flex items-center gap-2 mb-1">
            {po.supplier.code && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                {po.supplier.code}
              </span>
            )}
          </div>
          <p className="text-base font-semibold text-gray-900">{po.supplier.name}</p>
          <p className="text-xs text-gray-500 mt-1">Currency: {po.currency}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Status</p>
          <div className="mb-2">
            <Badge variant={STATUS_COLORS[po.status] as any}>
              <span className="flex items-center gap-1">
                {po.status === 'closed' ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {STATUS_LABELS[po.status] || po.status}
              </span>
            </Badge>
          </div>
          <p className="text-xs text-gray-500">
            Created {formatDate(po.created_at)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">ETA</p>
            {!editingETA ? (
              <button onClick={() => setEditingETA(true)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={saveETA} disabled={savingETA} className="text-emerald-600 hover:text-emerald-700">
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setEditingETA(false); setEtaValue(po.expected_delivery_date || ''); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          {editingETA ? (
            <input
              type="date"
              value={etaValue}
              onChange={(e) => setEtaValue(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              autoFocus
            />
          ) : (
            <>
              <p className="text-base font-semibold text-gray-900">
                {formatDate(po.expected_delivery_date)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Estimated Arrival</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Total Value</p>
          <p className="text-xl font-bold text-gray-900">
            {sym}{totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {po.currency} {totalValue.toFixed(2)} × {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-800">Shipping Details</h2>
          </div>
          {!editingShipping ? (
            <button
              onClick={() => setEditingShipping(true)}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={saveShipping}
                disabled={savingShipping}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {savingShipping ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save & Recalculate
              </button>
              <button
                onClick={() => {
                  setEditingShipping(false);
                  setShippingWeight(po.total_weight_kg?.toString() || '');
                  setShippingCartons(po.number_of_cartons?.toString() || '');
                  setShippingCost(po.shipping_cost_bdt?.toString() || '');
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1.5">Total Weight (kg)</p>
            {editingShipping ? (
              <input
                type="number"
                step="0.1"
                value={shippingWeight}
                onChange={(e) => setShippingWeight(e.target.value)}
                placeholder="0.0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-base font-semibold text-gray-900">
                {po.total_weight_kg ? `${po.total_weight_kg} kg` : '—'}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1.5">Number of Cartons</p>
            {editingShipping ? (
              <input
                type="number"
                step="1"
                value={shippingCartons}
                onChange={(e) => setShippingCartons(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-base font-semibold text-gray-900">
                {po.number_of_cartons ?? '—'}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1.5">Shipping Cost (BDT)</p>
            {editingShipping ? (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">৳</span>
                <input
                  type="number"
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ) : (
              <p className="text-base font-semibold text-gray-900">
                {po.shipping_cost_bdt > 0 ? `৳${po.shipping_cost_bdt.toLocaleString('en-US')}` : '—'}
              </p>
            )}
          </div>
        </div>

        {po.shipping_cost_bdt > 0 && items.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>
                Per unit shipping: ৳{(po.shipping_cost_bdt / items.reduce((s, i) => s + i.ordered_quantity, 0)).toFixed(2)}
              </span>
              <span className="text-gray-300">|</span>
              <span>
                Exchange rate used: {po.currency === 'USD' ? `1 USD = ৳${po.usd_to_bdt_rate}` : po.currency === 'CNY' ? `1 CNY = ৳${po.cny_to_bdt_rate}` : 'BDT'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Order Items</h2>
        </div>
        <div className="overflow-x-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Package className="w-10 h-10 mb-2 text-gray-300" />
              <p className="text-sm">No items in this purchase order</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Received</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Unit Cost ({po.currency})</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Total Cost ({po.currency})</th>
                  {po.shipping_cost_bdt > 0 && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Landed Cost (BDT)</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const itemStatus = getItemStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-700">{item.sku}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {item.product_image_url ? (
                              <img
                                src={item.product_image_url}
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">IMG</div>
                            )}
                          </div>
                          <span className="text-sm text-gray-900">{item.product_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{item.ordered_quantity}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${item.received_quantity > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {item.received_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-amber-600">
                          {item.unit_price.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {(item.ordered_quantity * item.unit_price).toFixed(2)}
                        </span>
                      </td>
                      {po.shipping_cost_bdt > 0 && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            ৳{item.landed_cost_per_unit.toFixed(2)}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={itemStatus.color as any}>
                          {itemStatus.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-700">Total</td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">
                    {items.reduce((s, i) => s + i.ordered_quantity, 0)}
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold text-emerald-600">
                    {items.reduce((s, i) => s + i.received_quantity, 0)}
                  </td>
                  <td className="px-6 py-3"></td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">
                    {sym}{totalValue.toFixed(2)}
                  </td>
                  {po.shipping_cost_bdt > 0 && (
                    <td className="px-6 py-3 text-sm font-bold text-gray-900">
                      ৳{items.reduce((s, i) => s + i.landed_cost_per_unit * i.ordered_quantity, 0).toFixed(2)}
                    </td>
                  )}
                  <td className="px-6 py-3"></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
