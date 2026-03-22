import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Check, AlertCircle, Search, TrendingDown, Download, Paperclip, X, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';
import ExcelJS from 'exceljs';

interface Supplier {
  id: string;
  name: string;
  code: string;
  short_name: string | null;
  currency?: string;
}

interface ProductRow {
  product_id: string;
  sku: string;
  name: string;
  image_url: string | null;
  current_qty: number;
  low_stock_threshold: number;
  order_qty: number;
  unit_cost: number;
  currency: string;
  original_unit_cost: number;
  supplier_sku: string | null;
  original_supplier_sku: string | null;
  is_recommended: boolean;
  is_custom: boolean;
}

interface PaymentFile {
  id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  is_pending: boolean;
  pending_file?: File;
}

interface PaymentRow {
  id: string;
  date: string;
  payment_currency: 'USD' | 'CNY' | 'BDT';
  amount_original: number;
  cnY_to_usd_rate: number;
  amount_usd_equivalent: number;
  remarks: string;
  files: PaymentFile[];
}

interface ChangeLogEntry {
  message: string;
  created_at: string;
}

const CURRENCIES = ['USD', 'CNY', 'BDT'];

function computeUsdEquivalent(
  paymentCurrency: string,
  amountOriginal: number,
  cnyToUsdRate: number,
  usdToBdt: string
): number {
  if (paymentCurrency === 'USD') return amountOriginal;
  if (paymentCurrency === 'CNY') return amountOriginal * cnyToUsdRate;
  if (paymentCurrency === 'BDT') {
    const rate = parseFloat(usdToBdt) || 110;
    return amountOriginal / rate;
  }
  return 0;
}

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { lastRefreshed, setRefreshing } = useRefresh();
  const [loadingDraft, setLoadingDraft] = useState(!!editId);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [shipmentName, setShipmentName] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [currency, setCurrency] = useState('USD');

  const [usdToCny, setUsdToCny] = useState('7.25');
  const [cnyToBdt, setCnyToBdt] = useState('15.17');
  const [usdToBdt, setUsdToBdt] = useState('110');
  const [rateDate, setRateDate] = useState(new Date().toISOString().split('T')[0]);

  const [lineItems, setLineItems] = useState<ProductRow[]>([]);
  const [allSupplierProducts, setAllSupplierProducts] = useState<ProductRow[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);

  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  const [costChangeDialog, setCostChangeDialog] = useState<{
    productId: string;
    sku: string;
    oldCost: number;
    newCost: number;
    itemIndex: number;
  } | null>(null);

  const [skuChangeDialog, setSkuChangeDialog] = useState<{
    productId: string;
    sku: string;
    oldSupplierSku: string | null;
    newSupplierSku: string;
    itemIndex: number;
  } | null>(null);

  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSuppliers();
  }, [lastRefreshed]);

  useEffect(() => {
    if (editId) loadDraft(editId);
  }, [editId, lastRefreshed]);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, code, short_name')
      .eq('is_active', true)
      .order('name');
    setSuppliers(data || []);
    setRefreshing(false);
  };

  const getDefaultCnyToUsdRate = () => {
    const cnyToBdtVal = parseFloat(cnyToBdt) || 15.17;
    const usdToBdtVal = parseFloat(usdToBdt) || 110;
    return cnyToBdtVal > 0 ? usdToBdtVal / cnyToBdtVal : 1 / (parseFloat(usdToCny) || 7.25);
  };

  const loadDraft = async (poId: string) => {
    setLoadingDraft(true);

    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        id, po_number, supplier_id, shipment_name, currency,
        usd_to_cny_rate, cny_to_bdt_rate, usd_to_bdt_rate,
        expected_delivery_date, is_payment_complete, status
      `)
      .eq('id', poId)
      .maybeSingle();

    if (poError || !po) { setLoadingDraft(false); return; }

    if (po.status !== 'draft') {
      navigate(`/purchase/orders/${poId}`, { replace: true });
      return;
    }

    setDraftId(poId);
    setSelectedSupplierId(po.supplier_id);
    setShipmentName(po.shipment_name || '');
    setEstimatedArrival(po.expected_delivery_date ? po.expected_delivery_date.split('T')[0] : '');
    setCurrency(po.currency || 'USD');
    setUsdToCny(String(po.usd_to_cny_rate || 7.25));
    setCnyToBdt(String(po.cny_to_bdt_rate || 15.17));
    setUsdToBdt(String(po.usd_to_bdt_rate || 110));
    setIsPaymentComplete(po.is_payment_complete || false);

    const [itemsRes, paymentsRes, supplierProductsRes] = await Promise.all([
      supabase
        .from('purchase_order_items')
        .select('id, sku, product_name, ordered_quantity, unit_price, product_image_url')
        .eq('po_id', poId),
      supabase
        .from('supplier_payments')
        .select('id, payment_date, payment_currency, amount_original, cny_to_usd_rate, amount_usd_equivalent, remarks')
        .eq('po_id', poId),
      supabase
        .from('product_suppliers')
        .select(`
          unit_price, currency, supplier_sku,
          products!inner(id, sku, name, image_url, low_stock_threshold, default_landed_cost)
        `)
        .eq('supplier_id', po.supplier_id),
    ]);

    const savedItems = itemsRes.data || [];
    const savedPayments = paymentsRes.data || [];
    const supplierProducts = supplierProductsRes.data || [];

    const productIds = supplierProducts.map((r: any) => r.products.id);
    let stockMap: Record<string, number> = {};
    if (productIds.length > 0) {
      const { data: lots } = await supabase
        .from('inventory_lots')
        .select('product_id, remaining_quantity')
        .in('product_id', productIds);
      (lots || []).forEach((lot: any) => {
        stockMap[lot.product_id] = (stockMap[lot.product_id] || 0) + lot.remaining_quantity;
      });
    }

    const allProductRows: ProductRow[] = supplierProducts.map((row: any) => {
      const p = row.products;
      const currentQty = stockMap[p.id] || 0;
      const threshold = p.low_stock_threshold || 10;
      return {
        product_id: p.id,
        sku: p.sku,
        name: p.name,
        image_url: p.image_url,
        current_qty: currentQty,
        low_stock_threshold: threshold,
        order_qty: 0,
        unit_cost: row.unit_price || 0,
        currency: row.currency || 'USD',
        original_unit_cost: row.unit_price || 0,
        supplier_sku: row.supplier_sku || null,
        original_supplier_sku: row.supplier_sku || null,
        is_recommended: currentQty <= threshold,
        is_custom: false,
      };
    });

    setAllSupplierProducts(allProductRows);

    const savedSkuSet = new Set(savedItems.map((i: any) => i.sku));
    const productsBySku = Object.fromEntries(allProductRows.map((r) => [r.sku, r]));

    const restoredItems: ProductRow[] = savedItems.map((item: any) => {
      const base = productsBySku[item.sku];
      return {
        product_id: base?.product_id || '',
        sku: item.sku,
        name: item.product_name,
        image_url: base?.image_url || item.product_image_url || null,
        current_qty: base?.current_qty || 0,
        low_stock_threshold: base?.low_stock_threshold || 0,
        order_qty: item.ordered_quantity,
        unit_cost: item.unit_price,
        currency: base?.currency || po.currency || 'USD',
        original_unit_cost: base?.original_unit_cost || item.unit_price,
        supplier_sku: base?.supplier_sku || null,
        original_supplier_sku: base?.original_supplier_sku || null,
        is_recommended: base?.is_recommended || false,
        is_custom: !base,
      };
    });

    const extraItems = allProductRows.filter((r) => !savedSkuSet.has(r.sku));
    setLineItems([...restoredItems, ...extraItems]);

    const paymentIds = savedPayments.map((p: any) => p.id);
    let filesMap: Record<string, PaymentFile[]> = {};
    if (paymentIds.length > 0) {
      const { data: filesData } = await supabase
        .from('supplier_payment_files')
        .select('id, payment_id, file_url, file_name, file_size')
        .in('payment_id', paymentIds);
      (filesData || []).forEach((f: any) => {
        if (!filesMap[f.payment_id]) filesMap[f.payment_id] = [];
        filesMap[f.payment_id].push({
          id: f.id,
          file_url: f.file_url,
          file_name: f.file_name,
          file_size: f.file_size,
          is_pending: false,
        });
      });
    }

    const restoredPayments: PaymentRow[] = savedPayments.map((p: any) => ({
      id: p.id,
      date: p.payment_date ? p.payment_date.split('T')[0] : new Date().toISOString().split('T')[0],
      payment_currency: (p.payment_currency as 'USD' | 'CNY' | 'BDT') || 'BDT',
      amount_original: p.amount_original || 0,
      cnY_to_usd_rate: p.cny_to_usd_rate || getDefaultCnyToUsdRate(),
      amount_usd_equivalent: p.amount_usd_equivalent || 0,
      remarks: p.remarks || '',
      files: filesMap[p.id] || [],
    }));
    setPayments(restoredPayments);

    setLoadingDraft(false);
  };

  const addChangeLog = useCallback((message: string) => {
    setChangeLog((prev) => [
      { message, created_at: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const handleSaveRates = () => {
    const message = `Exchange rates saved as of ${rateDate}: 1 USD = ${usdToCny} CNY, 1 CNY = ${cnyToBdt} BDT, 1 USD = ${usdToBdt} BDT`;
    addChangeLog(message);
    if (draftId) {
      supabase
        .from('purchase_orders')
        .update({
          usd_to_cny_rate: parseFloat(usdToCny) || 7.25,
          cny_to_bdt_rate: parseFloat(cnyToBdt) || 15.17,
          usd_to_bdt_rate: parseFloat(usdToBdt) || 110,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId);
    }
  };

  const handleSupplierChange = async (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    if (!supplierId) {
      setLineItems([]);
      setAllSupplierProducts([]);
      return;
    }

    const { data, error } = await supabase
      .from('product_suppliers')
      .select(`
        unit_price,
        currency,
        supplier_sku,
        products!inner(
          id,
          sku,
          name,
          image_url,
          low_stock_threshold,
          default_landed_cost
        )
      `)
      .eq('supplier_id', supplierId);

    if (error || !data) return;

    const productIds = data.map((row: any) => row.products.id);

    let stockMap: Record<string, number> = {};
    if (productIds.length > 0) {
      const { data: lots } = await supabase
        .from('inventory_lots')
        .select('product_id, remaining_quantity')
        .in('product_id', productIds);

      (lots || []).forEach((lot: any) => {
        stockMap[lot.product_id] = (stockMap[lot.product_id] || 0) + lot.remaining_quantity;
      });
    }

    const rows: ProductRow[] = data.map((row: any) => {
      const p = row.products;
      const currentQty = stockMap[p.id] || 0;
      const threshold = p.low_stock_threshold || 10;
      const isLow = currentQty <= threshold;
      return {
        product_id: p.id,
        sku: p.sku,
        name: p.name,
        image_url: p.image_url,
        current_qty: currentQty,
        low_stock_threshold: threshold,
        order_qty: 0,
        unit_cost: row.unit_price || 0,
        currency: row.currency || 'USD',
        original_unit_cost: row.unit_price || 0,
        supplier_sku: row.supplier_sku || null,
        original_supplier_sku: row.supplier_sku || null,
        is_recommended: isLow,
        is_custom: false,
      };
    });

    rows.sort((a, b) => {
      if (a.is_recommended && !b.is_recommended) return -1;
      if (!a.is_recommended && b.is_recommended) return 1;
      return a.name.localeCompare(b.name);
    });

    setAllSupplierProducts(rows);
    setLineItems(rows.map((r) => ({ ...r })));
    addChangeLog('Supplier selected and items populated');
  };

  const updateLineItem = (index: number, field: keyof ProductRow, value: any) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleUnitCostBlur = (index: number, newCost: number) => {
    const item = lineItems[index];
    if (item.is_custom) return;
    if (Math.abs(newCost - item.original_unit_cost) > 0.001 && item.original_unit_cost > 0) {
      setCostChangeDialog({
        productId: item.product_id,
        sku: item.sku,
        oldCost: item.original_unit_cost,
        newCost,
        itemIndex: index,
      });
    }
  };

  const handleSupplierSkuBlur = (index: number, newSupplierSku: string) => {
    const item = lineItems[index];
    if (item.is_custom) return;
    const trimmed = newSupplierSku.trim();
    if (trimmed !== (item.original_supplier_sku || '')) {
      setSkuChangeDialog({
        productId: item.product_id,
        sku: item.sku,
        oldSupplierSku: item.original_supplier_sku,
        newSupplierSku: trimmed,
        itemIndex: index,
      });
    }
  };

  const confirmCostUpdate = async (updateProduct: boolean) => {
    if (!costChangeDialog) return;
    if (updateProduct) {
      await supabase
        .from('product_suppliers')
        .update({ unit_price: costChangeDialog.newCost })
        .eq('product_id', costChangeDialog.productId)
        .eq('supplier_id', selectedSupplierId);

      setLineItems((prev) => {
        const updated = [...prev];
        updated[costChangeDialog.itemIndex] = {
          ...updated[costChangeDialog.itemIndex],
          original_unit_cost: costChangeDialog.newCost,
        };
        return updated;
      });
      addChangeLog(`Unit cost updated for ${costChangeDialog.sku}`);
    }
    setCostChangeDialog(null);
  };

  const confirmSkuUpdate = async (save: boolean) => {
    if (!skuChangeDialog) return;
    if (save) {
      await supabase
        .from('product_suppliers')
        .update({ supplier_sku: skuChangeDialog.newSupplierSku || null })
        .eq('product_id', skuChangeDialog.productId)
        .eq('supplier_id', selectedSupplierId);

      setLineItems((prev) => {
        const updated = [...prev];
        updated[skuChangeDialog.itemIndex] = {
          ...updated[skuChangeDialog.itemIndex],
          original_supplier_sku: skuChangeDialog.newSupplierSku || null,
        };
        return updated;
      });
      addChangeLog(`Supplier SKU updated for ${skuChangeDialog.sku}: "${skuChangeDialog.newSupplierSku}"`);
    } else {
      setLineItems((prev) => {
        const updated = [...prev];
        updated[skuChangeDialog.itemIndex] = {
          ...updated[skuChangeDialog.itemIndex],
          supplier_sku: skuChangeDialog.oldSupplierSku,
        };
        return updated;
      });
    }
    setSkuChangeDialog(null);
  };

  const removeLineItem = (index: number) => {
    const item = lineItems[index];
    setLineItems((prev) => prev.filter((_, i) => i !== index));
    addChangeLog(`Item removed from PO: ${item.sku || item.name}`);
  };

  const addCustomItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        product_id: '',
        sku: '',
        name: '',
        image_url: null,
        current_qty: 0,
        low_stock_threshold: 0,
        order_qty: 1,
        unit_cost: 0,
        currency,
        original_unit_cost: 0,
        supplier_sku: null,
        original_supplier_sku: null,
        is_recommended: false,
        is_custom: true,
      },
    ]);
  };

  const addPaymentRow = () => {
    setPayments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        payment_currency: 'BDT',
        amount_original: 0,
        cnY_to_usd_rate: getDefaultCnyToUsdRate(),
        amount_usd_equivalent: 0,
        remarks: '',
        files: [],
      },
    ]);
    addChangeLog('Payment entry added');
  };

  const updatePayment = (id: string, field: keyof PaymentRow, value: any) => {
    setPayments((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        if (field === 'amount_original' || field === 'payment_currency' || field === 'cnY_to_usd_rate') {
          updated.amount_usd_equivalent = computeUsdEquivalent(
            updated.payment_currency,
            updated.amount_original,
            updated.cnY_to_usd_rate,
            usdToBdt
          );
        }
        return updated;
      })
    );
  };

  const addFilesToPayment = (paymentId: string, files: FileList) => {
    const newFiles: PaymentFile[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      file_url: '',
      file_name: f.name,
      file_size: f.size,
      is_pending: true,
      pending_file: f,
    }));
    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId ? { ...p, files: [...p.files, ...newFiles] } : p
      )
    );
  };

  const removeFileFromPayment = (paymentId: string, fileId: string) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId ? { ...p, files: p.files.filter((f) => f.id !== fileId) } : p
      )
    );
  };

  const removePayment = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const getExchangeRate = () => {
    if (currency === 'USD') return parseFloat(usdToBdt) || 110;
    if (currency === 'CNY') return parseFloat(cnyToBdt) || 15.17;
    return 1;
  };

  const totalUnits = lineItems.reduce((s, i) => s + (i.order_qty || 0), 0);
  const totalUSD = lineItems.reduce((s, i) => {
    const qty = i.order_qty || 0;
    const cost = i.unit_cost || 0;
    if (i.currency === 'USD') return s + qty * cost;
    if (i.currency === 'CNY') return s + qty * cost / (parseFloat(usdToCny) || 7.25);
    return s;
  }, 0);
  const totalCNY = lineItems.reduce((s, i) => {
    const qty = i.order_qty || 0;
    const cost = i.unit_cost || 0;
    if (i.currency === 'CNY') return s + qty * cost;
    if (i.currency === 'USD') return s + qty * cost * (parseFloat(usdToCny) || 7.25);
    return s;
  }, 0);
  const totalBDT = lineItems.reduce((s, i) => {
    const qty = i.order_qty || 0;
    const cost = i.unit_cost || 0;
    if (i.currency === 'USD') return s + qty * cost * (parseFloat(usdToBdt) || 110);
    if (i.currency === 'CNY') return s + qty * cost * (parseFloat(cnyToBdt) || 15.17);
    return s + qty * cost;
  }, 0);

  const totalPaidUSD = payments.reduce((s, p) => s + (p.amount_usd_equivalent || 0), 0);
  const balanceUSD = totalUSD - totalPaidUSD;
  const isPaymentSufficient = totalUSD > 0 && totalPaidUSD >= totalUSD;

  const uploadPaymentFiles = async (paymentId: string, files: PaymentFile[], poId: string): Promise<void> => {
    const pendingFiles = files.filter((f) => f.is_pending && f.pending_file);
    for (const pf of pendingFiles) {
      const file = pf.pending_file!;
      const ext = file.name.split('.').pop() || 'bin';
      const path = `payment-slips/${poId}/${paymentId}/${pf.id}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-slips')
        .upload(path, file, { upsert: true });
      if (uploadError) {
        console.error('File upload error:', uploadError);
        continue;
      }
      const { data: urlData } = supabase.storage.from('payment-slips').getPublicUrl(path);
      await supabase.from('supplier_payment_files').insert({
        payment_id: paymentId,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: user?.id,
      });
    }
  };

  const saveDraft = async (): Promise<string | null> => {
    if (!selectedSupplierId) return null;
    setSaving(true);

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    const poNumber = `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    const poData = {
      po_number: draftId ? undefined : poNumber,
      supplier_id: selectedSupplierId,
      shipment_name: shipmentName || null,
      status: 'draft',
      currency,
      usd_to_cny_rate: parseFloat(usdToCny) || 7.25,
      cny_to_bdt_rate: parseFloat(cnyToBdt) || 15.17,
      usd_to_bdt_rate: parseFloat(usdToBdt) || 110,
      exchange_rate_to_bdt: getExchangeRate(),
      expected_delivery_date: estimatedArrival || null,
      is_payment_complete: isPaymentComplete,
    };

    let poId = draftId;

    if (draftId) {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ ...poData, updated_at: new Date().toISOString() })
        .eq('id', draftId);
      if (error) { setSaving(false); console.error(error); return null; }
    } else {
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert({ ...poData, po_number: poNumber, created_by: user?.id })
        .select('id')
        .single();
      if (error || !data) { setSaving(false); console.error(error); return null; }
      poId = data.id;
      setDraftId(poId);
    }

    if (poId) {
      await supabase.from('purchase_order_items').delete().eq('po_id', poId);

      const itemsToInsert = lineItems
        .filter((item) => item.order_qty > 0 && (item.sku || item.name))
        .map((item) => ({
          po_id: poId,
          sku: item.sku,
          product_name: item.name,
          ordered_quantity: item.order_qty,
          unit_price: item.unit_cost,
          product_image_url: item.image_url,
          received_quantity: 0,
          shipping_cost_per_unit: 0,
          import_duty_per_unit: 0,
          landed_cost_per_unit: item.unit_cost * getExchangeRate(),
        }));

      if (itemsToInsert.length > 0) {
        await supabase.from('purchase_order_items').insert(itemsToInsert);
      }

      for (const payment of payments) {
        if (payment.amount_original > 0) {
          const usdEq = computeUsdEquivalent(
            payment.payment_currency,
            payment.amount_original,
            payment.cnY_to_usd_rate,
            usdToBdt
          );
          await supabase.from('supplier_payments').upsert({
            id: payment.id,
            po_id: poId,
            supplier_id: selectedSupplierId,
            payment_date: payment.date,
            amount: payment.amount_original,
            amount_bdt: payment.payment_currency === 'BDT' ? payment.amount_original : 0,
            currency: payment.payment_currency,
            payment_currency: payment.payment_currency,
            amount_original: payment.amount_original,
            cny_to_usd_rate: payment.payment_currency === 'CNY' ? payment.cnY_to_usd_rate : null,
            amount_usd_equivalent: usdEq,
            remarks: payment.remarks || null,
            created_by: user?.id,
          });

          await uploadPaymentFiles(payment.id, payment.files, poId);

          setPayments((prev) =>
            prev.map((p) =>
              p.id === payment.id
                ? {
                    ...p,
                    amount_usd_equivalent: usdEq,
                    files: p.files.map((f) => ({ ...f, is_pending: false })),
                  }
                : p
            )
          );
        }
      }
    }

    setSaving(false);
    addChangeLog('Draft saved');
    return poId;
  };

  const handleSave = async () => {
    await saveDraft();
  };

  const handleCreatePO = async () => {
    if (!isPaymentSufficient) return;
    setCreating(true);

    const poId = await saveDraft();
    if (!poId) { setCreating(false); return; }

    const overpayUSD = totalPaidUSD - totalUSD;

    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'ordered', is_payment_complete: true, updated_at: new Date().toISOString() })
      .eq('id', poId);

    if (!error) {
      await supabase.from('po_change_log').insert({
        po_id: poId,
        message: 'Purchase order confirmed and created',
        created_by: user?.id,
      });

      if (overpayUSD > 0.005) {
        await supabase.from('po_change_log').insert({
          po_id: poId,
          message: `Overpayment of $${overpayUSD.toFixed(2)} USD recorded at PO creation`,
          created_by: user?.id,
        });
        addChangeLog(`Overpayment of $${overpayUSD.toFixed(2)} USD recorded`);
      }

      navigate(`/purchase/orders/${poId}`);
    }
    setCreating(false);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const supplier = suppliers.find((s) => s.id === selectedSupplierId);
      const activeItems = lineItems.filter((i) => i.order_qty > 0 && (i.sku || i.name));

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ERP System';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Purchase Order', {
        pageSetup: { orientation: 'landscape' },
      });

      sheet.columns = [
        { header: '', key: 'image', width: 12 },
        { header: 'Product Name', key: 'name', width: 36 },
        { header: 'SKU', key: 'sku', width: 18 },
        { header: 'Supplier SKU', key: 'supplier_sku', width: 18 },
        { header: 'Current Stock', key: 'current_qty', width: 14 },
        { header: 'Order Qty', key: 'order_qty', width: 12 },
        { header: 'Unit Cost', key: 'unit_cost', width: 14 },
        { header: 'Currency', key: 'currency', width: 10 },
        { header: 'Total Cost', key: 'total_cost', width: 16 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });

      const ROW_HEIGHT = 60;

      for (let i = 0; i < activeItems.length; i++) {
        const item = activeItems[i];
        const rowIndex = i + 2;
        const row = sheet.getRow(rowIndex);
        row.height = ROW_HEIGHT;

        row.getCell(1).value = null;
        row.getCell('name').value = item.name;
        row.getCell('sku').value = item.sku || '';
        row.getCell('supplier_sku').value = item.supplier_sku || '';
        row.getCell('current_qty').value = item.is_custom ? '' : item.current_qty;
        row.getCell('order_qty').value = item.order_qty;
        row.getCell('unit_cost').value = item.unit_cost;
        row.getCell('currency').value = item.currency;
        row.getCell('total_cost').value = (item.order_qty || 0) * (item.unit_cost || 0);

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 ? 'left' : 'center', wrapText: true };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          };
          if (i % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
          }
        });

        if (item.image_url) {
          try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
            const isSupabaseUrl = item.image_url.includes(supabaseUrl);
            const fetchUrl = isSupabaseUrl
              ? item.image_url
              : `${supabaseUrl}/functions/v1/image-proxy?url=${encodeURIComponent(item.image_url)}`;
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
            console.warn(`Error fetching image for ${item.name}:`, err);
          }
        }
      }

      const totalsRowIndex = activeItems.length + 2;
      const totalsRow = sheet.getRow(totalsRowIndex);
      totalsRow.height = 28;
      totalsRow.getCell('name').value = 'TOTAL';
      totalsRow.getCell('order_qty').value = activeItems.reduce((s, i) => s + (i.order_qty || 0), 0);
      totalsRow.getCell('total_cost').value = activeItems.reduce((s, i) => s + (i.order_qty || 0) * (i.unit_cost || 0), 0);
      totalsRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF3B82F6' } },
        };
      });
      totalsRow.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };

      const metaSheet = workbook.addWorksheet('PO Info');
      metaSheet.columns = [{ key: 'label', width: 24 }, { key: 'value', width: 36 }];
      const metaData = [
        ['Supplier', supplier?.name || ''],
        ['Shipment Name', shipmentName || ''],
        ['Estimated Arrival', estimatedArrival || ''],
        ['Currency', currency],
        ['USD → CNY', usdToCny],
        ['CNY → BDT', cnyToBdt],
        ['USD → BDT', usdToBdt],
        ['Rate Date', rateDate],
        ['Total USD', `$${totalUSD.toFixed(2)}`],
        ['Total CNY', `¥${totalCNY.toFixed(2)}`],
        ['Total BDT', `৳${Math.round(totalBDT).toLocaleString()}`],
        ['Generated', new Date().toLocaleString()],
      ];
      metaData.forEach(([label, value]) => {
        const r = metaSheet.addRow({ label, value });
        r.getCell('label').font = { bold: true };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PO_${shipmentName || supplier?.code || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      addChangeLog('Excel export downloaded');
    } finally {
      setExporting(false);
    }
  };

  const filteredProducts = allSupplierProducts.filter((p) => {
    const term = productSearch.toLowerCase();
    return (
      p.sku.toLowerCase().includes(term) ||
      p.name.toLowerCase().includes(term) ||
      (p.supplier_sku || '').toLowerCase().includes(term)
    );
  });

  const addProductFromSearch = (product: ProductRow) => {
    const existingIndex = lineItems.findIndex((i) => i.product_id === product.product_id);
    if (existingIndex === -1) {
      setLineItems((prev) => [...prev, { ...product }]);
      addChangeLog(`Product added: ${product.sku}`);
      setTimeout(() => {
        const newIndex = lineItems.length;
        const el = rowRefs.current.get(newIndex);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedIndex(newIndex);
          setTimeout(() => setHighlightedIndex(null), 1800);
        }
      }, 50);
    } else {
      const el = rowRefs.current.get(existingIndex);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedIndex(existingIndex);
        setTimeout(() => setHighlightedIndex(null), 1800);
      }
    }
    setShowProductSearch(false);
    setProductSearch('');
  };

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loadingDraft) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading draft...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex gap-6 p-6 max-w-screen-xl mx-auto">
        <div className="flex-1 space-y-6 min-w-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/purchase/orders')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {editId ? 'Edit Purchase Order' : 'Create Purchase Order'}
              </h1>
              <p className="text-sm text-gray-500">
                {editId ? 'Continue editing this draft purchase order' : 'Create a new purchase order for supplier'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-800">PO Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code ? `${s.code} — ` : ''}{s.name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedSupplier && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                      {selectedSupplier.code}
                    </span>
                    <span className="text-xs text-gray-500">{selectedSupplier.name}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Shipment Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={shipmentName}
                  onChange={(e) => setShipmentName(e.target.value)}
                  placeholder="e.g., MQ01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">This will be used for barcode generation (e.g., SKU_MQ01)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Estimated Arrival <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={estimatedArrival}
                  onChange={(e) => setEstimatedArrival(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Exchange Rates</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={rateDate}
                    onChange={(e) => setRateDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={handleSaveRates}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors"
                  >
                    Save Rates
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">USD to CNY</label>
                  <input
                    type="number"
                    step="0.01"
                    value={usdToCny}
                    onChange={(e) => setUsdToCny(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">CNY to BDT</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cnyToBdt}
                    onChange={(e) => setCnyToBdt(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">USD to BDT</label>
                  <input
                    type="number"
                    step="0.01"
                    value={usdToBdt}
                    onChange={(e) => setUsdToBdt(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {!selectedSupplierId ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">Select a supplier to begin</p>
              <p className="text-sm text-gray-400 mt-1">Line items will be automatically populated based on supplier products</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-800">
                  Line Items — {selectedSupplier?.name}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowProductSearch(!showProductSearch)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Search className="w-4 h-4" />
                      Search Products
                    </button>
                    {showProductSearch && (
                      <div className="absolute right-0 top-full mt-1 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-20">
                        <div className="p-3 border-b border-gray-100">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search by SKU, name, or supplier SKU..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {filteredProducts.length === 0 ? (
                            <p className="text-sm text-gray-400 p-4 text-center">No products found</p>
                          ) : (
                            filteredProducts.map((p) => {
                              const alreadyAdded = lineItems.find((i) => i.product_id === p.product_id);
                              return (
                                <button
                                  key={p.product_id}
                                  onClick={() => addProductFromSearch(p)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left"
                                >
                                  <div className="w-8 h-8 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                    {p.image_url ? (
                                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">N/A</div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {p.sku}
                                      {p.supplier_sku && <span className="ml-2 text-gray-400">· {p.supplier_sku}</span>}
                                    </p>
                                  </div>
                                  {alreadyAdded && (
                                    <span className="text-xs text-blue-600 font-medium flex-shrink-0">Scroll to</span>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={addCustomItem}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add Custom Item
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[560px] overflow-y-auto" ref={tableContainerRef}>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-14">Image</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name + SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Supplier SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">Current Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Order Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-36">Unit Cost</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-36">Total Cost</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lineItems.map((item, index) => (
                      <tr
                        key={index}
                        ref={(el) => {
                          if (el) rowRefs.current.set(index, el);
                          else rowRefs.current.delete(index);
                        }}
                        className={`transition-colors duration-300 ${
                          highlightedIndex === index
                            ? 'bg-blue-50'
                            : 'hover:bg-gray-50/50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">IMG</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item.is_custom ? (
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateLineItem(index, 'name', e.target.value)}
                              placeholder="Description (e.g. Logo Cost, Shipping)"
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                            />
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                {item.is_recommended && (
                                  <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                    <TrendingDown className="w-3 h-3" />
                                    Low Stock
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">{item.sku}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!item.is_custom && (
                            <input
                              type="text"
                              value={item.supplier_sku || ''}
                              onChange={(e) => updateLineItem(index, 'supplier_sku', e.target.value)}
                              onBlur={(e) => handleSupplierSkuBlur(index, e.target.value)}
                              placeholder="—"
                              className={`w-full border rounded px-2 py-1.5 text-xs font-mono transition-colors ${
                                item.supplier_sku
                                  ? 'border-gray-300 text-gray-700'
                                  : 'border-dashed border-gray-300 text-gray-400 bg-gray-50'
                              } focus:border-blue-400 focus:ring-1 focus:ring-blue-200 focus:outline-none`}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!item.is_custom && (
                            <span className={`text-sm font-semibold ${item.current_qty <= item.low_stock_threshold ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {item.current_qty}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={item.order_qty || ''}
                            onChange={(e) => updateLineItem(index, 'order_qty', parseInt(e.target.value) || 0)}
                            className="w-16 min-w-[4rem] border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {item.is_custom ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unit_cost || ''}
                                onChange={(e) => updateLineItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                                placeholder="Total cost"
                                className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <select
                                value={item.currency}
                                onChange={(e) => updateLineItem(index, 'currency', e.target.value)}
                                className="border border-gray-300 rounded-lg px-1 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                              >
                                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unit_cost || ''}
                                onChange={(e) => updateLineItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                                onBlur={(e) => handleUnitCostBlur(index, parseFloat(e.target.value) || 0)}
                                className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <select
                                value={item.currency}
                                onChange={(e) => updateLineItem(index, 'currency', e.target.value)}
                                className="border border-gray-300 rounded-lg px-1 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                              >
                                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-900">
                            {((item.order_qty || 0) * (item.unit_cost || 0)).toFixed(2)} {item.currency}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeLineItem(index)}
                            className="text-red-400 hover:text-red-600 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {lineItems.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                          No products added. Products from this supplier are listed above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedSupplierId && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Payment Tracking</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Payments in any currency are tracked as USD equivalent against the PO total (${totalUSD.toFixed(2)} USD)
                  </p>
                </div>
                <button
                  onClick={addPaymentRow}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Make Payment
                </button>
              </div>

              {payments.length > 0 && (
                <div className="space-y-4">
                  {payments.map((payment, idx) => {
                    const currencySymbol = payment.payment_currency === 'USD' ? '$' : payment.payment_currency === 'CNY' ? '¥' : '৳';
                    return (
                      <div key={payment.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Payment #{idx + 1}
                          </span>
                          <button
                            onClick={() => removePayment(payment.id)}
                            className="text-red-400 hover:text-red-600 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Date</label>
                            <input
                              type="date"
                              value={payment.date}
                              onChange={(e) => updatePayment(payment.id, 'date', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Payment Currency</label>
                            <select
                              value={payment.payment_currency}
                              onChange={(e) => updatePayment(payment.id, 'payment_currency', e.target.value as 'USD' | 'CNY' | 'BDT')}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="BDT">BDT (Bangladeshi Taka)</option>
                              <option value="USD">USD (US Dollar)</option>
                              <option value="CNY">CNY (Chinese Yuan / RMB)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                              Amount ({payment.payment_currency})
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                                {currencySymbol}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={payment.amount_original || ''}
                                onChange={(e) => updatePayment(payment.id, 'amount_original', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        {payment.payment_currency === 'CNY' && (
                          <div className="grid grid-cols-3 gap-3 items-end">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1.5">CNY → USD Rate</label>
                              <input
                                type="number"
                                step="0.0001"
                                min="0"
                                value={payment.cnY_to_usd_rate || ''}
                                onChange={(e) => updatePayment(payment.id, 'cnY_to_usd_rate', parseFloat(e.target.value) || 0)}
                                placeholder="e.g. 0.1379"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <p className="text-xs text-gray-400 mt-1">1 CNY = ? USD</p>
                            </div>
                            <div className="col-span-2">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
                                <span className="text-xs text-blue-600 font-medium">USD Equivalent</span>
                                <span className="text-sm font-bold text-blue-700">
                                  ${(payment.amount_original * payment.cnY_to_usd_rate).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {payment.payment_currency === 'BDT' && payment.amount_original > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
                            <span className="text-xs text-blue-600 font-medium">
                              USD Equivalent (at ৳{usdToBdt} = $1)
                            </span>
                            <span className="text-sm font-bold text-blue-700">
                              ${(payment.amount_original / (parseFloat(usdToBdt) || 110)).toFixed(2)}
                            </span>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">Remarks</label>
                          <input
                            type="text"
                            value={payment.remarks}
                            onChange={(e) => updatePayment(payment.id, 'remarks', e.target.value)}
                            placeholder="e.g., Wire transfer via HSBC, ref #12345"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">
                            Payment Slips / Invoices
                          </label>
                          <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-white hover:border-blue-400 transition-colors w-fit">
                            <Paperclip className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">Attach files</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  addFilesToPayment(payment.id, e.target.files);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </label>

                          {payment.files.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {payment.files.map((file) => (
                                <div
                                  key={file.id}
                                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg group"
                                >
                                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    {file.is_pending ? (
                                      <span className="text-sm text-gray-700 truncate block">{file.file_name}</span>
                                    ) : (
                                      <a
                                        href={file.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block"
                                      >
                                        {file.file_name}
                                      </a>
                                    )}
                                    {file.file_size && (
                                      <span className="text-xs text-gray-400">{formatFileSize(file.file_size)}</span>
                                    )}
                                  </div>
                                  {file.is_pending && (
                                    <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">
                                      Pending
                                    </span>
                                  )}
                                  <button
                                    onClick={() => removeFileFromPayment(payment.id, file.id)}
                                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Paid (USD equivalent):</span>
                  <span className="font-medium text-gray-900">${totalPaidUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">PO Total (USD):</span>
                  <span className="font-medium text-gray-900">${totalUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">PO Total (CNY):</span>
                  <span className="font-medium text-gray-900">¥{totalCNY.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-2">
                  <span className="text-gray-700">Remaining Balance (USD):</span>
                  <span className={balanceUSD > 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {balanceUSD > 0 ? `-$${balanceUSD.toFixed(2)}` : balanceUSD < -0.005 ? `+$${Math.abs(balanceUSD).toFixed(2)} overpaid` : '$0.00'}
                  </span>
                </div>
                {balanceUSD < -0.005 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                    Overpayment of ${Math.abs(balanceUSD).toFixed(2)} USD will be recorded in the change log on PO creation.
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (!isPaymentSufficient) return;
                  setIsPaymentComplete(!isPaymentComplete);
                  if (!isPaymentComplete) addChangeLog('Payment marked as complete');
                }}
                disabled={!isPaymentSufficient}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  isPaymentSufficient
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 cursor-pointer hover:bg-emerald-100'
                    : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isPaymentSufficient && <Check className="w-4 h-4" />}
                {isPaymentSufficient ? 'Payment Complete' : `Payment Complete — Pay $${balanceUSD.toFixed(2)} more to unlock`}
              </button>
            </div>
          )}

          {changeLog.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Change Log</h2>
              <div className="space-y-2">
                {changeLog.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-400 text-xs whitespace-nowrap mt-0.5">
                      {new Date(entry.created_at).toLocaleString('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span className="text-gray-700">{entry.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-72 flex-shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Summary</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Items:</span>
                <span className="font-medium text-gray-900">{lineItems.filter((i) => i.order_qty > 0).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Units:</span>
                <span className="font-medium text-gray-900">{totalUnits}</span>
              </div>
              <div className="border-t border-gray-100 pt-2.5 mt-2.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total (USD):</span>
                  <span className="font-medium text-gray-900">${totalUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total (CNY):</span>
                  <span className="font-medium text-gray-900">¥{totalCNY.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600 font-medium">Total (BDT):</span>
                  <span className="font-bold text-blue-600">৳{Math.round(totalBDT).toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-[calc(6rem+200px)]">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Actions</h2>
            <div className="space-y-2">
              <button
                onClick={handleCreatePO}
                disabled={!isPaymentSufficient || creating || !selectedSupplierId}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isPaymentSufficient && selectedSupplierId
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Create PO
              </button>

              <button
                onClick={handleSave}
                disabled={saving || !selectedSupplierId}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>

              <button
                onClick={handleExportExcel}
                disabled={exporting || !selectedSupplierId || lineItems.filter((i) => i.order_qty > 0).length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                {exporting ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export Excel
              </button>

              <button
                onClick={() => navigate('/purchase/orders')}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              {!isPaymentSufficient && selectedSupplierId && totalUSD > 0 && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700 text-center">
                  Pay ${balanceUSD.toFixed(2)} more (USD equiv.) to enable PO creation
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {costChangeDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Update Product Cost?</h3>
            <p className="text-sm text-gray-600 mb-4">
              The unit cost for <strong>{costChangeDialog.sku}</strong> has changed from{' '}
              <strong>{costChangeDialog.oldCost}</strong> to{' '}
              <strong>{costChangeDialog.newCost}</strong>.
              Would you like to update the product's cost in the system?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => confirmCostUpdate(true)}
                className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
              >
                Yes, Update
              </button>
              <button
                onClick={() => confirmCostUpdate(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                No, Keep as is
              </button>
            </div>
          </div>
        </div>
      )}

      {skuChangeDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Save Supplier SKU?</h3>
            <p className="text-sm text-gray-600 mb-1">
              You've {skuChangeDialog.oldSupplierSku ? 'changed' : 'added'} the supplier SKU for <strong>{skuChangeDialog.sku}</strong>.
            </p>
            {skuChangeDialog.oldSupplierSku && (
              <p className="text-sm text-gray-500 mb-1">
                From: <span className="font-mono text-gray-700">{skuChangeDialog.oldSupplierSku}</span>
              </p>
            )}
            <p className="text-sm text-gray-500 mb-4">
              To: <span className="font-mono text-gray-900 font-medium">{skuChangeDialog.newSupplierSku || '(empty)'}</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Would you like to save this as the supplier SKU for this product?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => confirmSkuUpdate(true)}
                className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
              >
                Yes, Save
              </button>
              <button
                onClick={() => confirmSkuUpdate(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                No, Keep as is
              </button>
            </div>
          </div>
        </div>
      )}

      {showProductSearch && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => { setShowProductSearch(false); setProductSearch(''); }}
        />
      )}
    </div>
  );
}
