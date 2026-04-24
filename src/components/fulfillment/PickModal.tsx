import { useState, useEffect, useRef } from 'react';
import { X, Package, MapPin, CheckCircle2, ScanLine, Camera, AlertTriangle, FlaskConical, Check, Lock, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface OrderItem {
  id: string;
  sku: string;
  product_name: string;
  quantity: number;
  picked_quantity: number;
  unit_price?: number;
}

interface PickModalProps {
  order: {
    id: string;
    order_number: string;
    woo_order_number?: string | null;
    customer: { full_name: string };
    items: OrderItem[];
  };
  isLabPick?: boolean;
  onClose: () => void;
}

interface LotRecommendation {
  lot_id: string;
  lot_number: string;
  barcode: string;
  location_code: string;
  available_quantity: number;
  received_date: string;
  recommended_quantity: number;
}

interface ItemPickState {
  item_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  already_picked: number;
  lots: LotRecommendation[];
  picked_this_session: number;
  scanned_count: number;
  done: boolean;
  has_prescription?: boolean;
}

type OverrideReason = 'product_damaged' | 'physically_unavailable' | 'other';

interface AlternativeLot {
  lot_id: string;
  barcode: string;
  lot_number: string;
  location_code: string;
  available_quantity: number;
}

interface LocationGroup {
  location_code: string;
  total_available: number;
  lots: AlternativeLot[];
  is_recommended: boolean;
}

type ScanScenario =
  | { type: 'different_lot'; scannedBarcode: string; recommendedBarcode: string; scannedLocationCode?: string }
  | { type: 'override_selection'; step: 'location' | 'lot' }
  | null;

const OVERRIDE_REASON_LABELS: Record<OverrideReason, string> = {
  product_damaged: 'Product damaged / defective',
  physically_unavailable: 'Cannot find / physically unavailable',
  other: 'Other reason',
};

export function PickModal({ order, isLabPick = false, onClose }: PickModalProps) {
  const [loading, setLoading] = useState(true);
  const [itemStates, setItemStates] = useState<ItemPickState[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [scanEnforced, setScanEnforced] = useState(true);
  const [scanScenario, setScanScenario] = useState<ScanScenario>(null);
  const [discrepancyReason, setDiscrepancyReason] = useState('');
  const [overrideReason, setOverrideReason] = useState<OverrideReason>('physically_unavailable');
  const [noItemsToPick, setNoItemsToPick] = useState(false);
  const [alternativeLots, setAlternativeLots] = useState<AlternativeLot[]>([]);
  const [locationGroups, setLocationGroups] = useState<LocationGroup[]>([]);
  const [alternativeLotsLoading, setAlternativeLotsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationGroup | null>(null);
  const [selectedOverrideLot, setSelectedOverrideLot] = useState<AlternativeLot | null>(null);
  const [overrideProcessing, setOverrideProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerFiredRef = useRef(false);

  useEffect(() => {
    fetchFIFORecommendations();
    loadEnforcementSetting();
  }, []);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading, currentItemIndex, scanScenario]);

  const loadEnforcementSetting = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'pick_scan_enforcement_enabled')
      .maybeSingle();
    if (data) {
      setScanEnforced(data.value !== false);
    }
  };

  const fetchFIFORecommendations = async () => {
    try {
      setLoading(true);
      const states: ItemPickState[] = [];

      const pickableItems = order.items.filter(i => i.sku !== 'RX' && i.sku !== 'FEE');
      if (pickableItems.length === 0) {
        setNoItemsToPick(true);
        setLoading(false);
        return;
      }

      let prescriptionItemIds = new Set<string>();
      if (isLabPick) {
        const { data: prescriptions } = await supabase
          .from('order_prescriptions')
          .select('order_item_id')
          .eq('order_id', order.id)
          .not('order_item_id', 'is', null);
        if (prescriptions) {
          prescriptionItemIds = new Set(prescriptions.map(p => p.order_item_id as string));
        }
      }

      for (const item of order.items) {
        if (item.sku === 'RX' || item.sku === 'FEE') continue;

        const remainingToPick = item.quantity - item.picked_quantity;
        if (remainingToPick <= 0) {
          states.push({
            item_id: item.id,
            product_id: '',
            sku: item.sku,
            product_name: item.product_name,
            quantity: item.quantity,
            already_picked: item.picked_quantity,
            lots: [],
            picked_this_session: 0,
            scanned_count: 0,
            done: true,
            has_prescription: prescriptionItemIds.has(item.id),
          });
          continue;
        }

        const { data: product } = await supabase
          .from('products')
          .select('id')
          .eq('sku', item.sku)
          .maybeSingle();

        if (!product) {
          states.push({
            item_id: item.id,
            product_id: '',
            sku: item.sku,
            product_name: item.product_name,
            quantity: item.quantity,
            already_picked: item.picked_quantity,
            lots: [],
            picked_this_session: 0,
            scanned_count: 0,
            done: false,
            has_prescription: prescriptionItemIds.has(item.id),
          });
          continue;
        }

        const { data: lots } = await supabase
          .from('inventory_lots')
          .select(`
            id,
            lot_number,
            barcode,
            remaining_quantity,
            reserved_quantity,
            received_date,
            location:warehouse_locations(code, name)
          `)
          .eq('product_id', product.id)
          .order('received_date', { ascending: true });

        let remaining = remainingToPick;
        const lotRecs: LotRecommendation[] = [];

        for (const lot of lots || []) {
          if (remaining <= 0) break;
          const availableQty = lot.remaining_quantity - (lot.reserved_quantity ?? 0);
          if (availableQty <= 0) continue;
          const pickQty = Math.min(remaining, availableQty);
          lotRecs.push({
            lot_id: lot.id,
            lot_number: lot.lot_number,
            barcode: lot.barcode || lot.lot_number,
            location_code: (lot.location as any)?.code || 'N/A',
            available_quantity: availableQty,
            received_date: lot.received_date,
            recommended_quantity: pickQty,
          });
          remaining -= pickQty;
        }

        states.push({
          item_id: item.id,
          product_id: product.id,
          sku: item.sku,
          product_name: item.product_name,
          quantity: item.quantity,
          already_picked: item.picked_quantity,
          lots: lotRecs,
          picked_this_session: 0,
          scanned_count: 0,
          done: false,
          has_prescription: prescriptionItemIds.has(item.id),
        });
      }

      setItemStates(states);
      const firstPending = states.findIndex(s => !s.done);
      setCurrentItemIndex(firstPending >= 0 ? firstPending : 0);
    } catch (err) {
      console.error('Error fetching FIFO:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalItems = itemStates.length;
  const pickedCount = itemStates.filter(s => s.done).length;
  const progressPct = totalItems > 0 ? (pickedCount / totalItems) * 100 : 0;
  const allDone = pickedCount === totalItems && totalItems > 0;

  const rxItemsDone = isLabPick && itemStates.some(s => s.has_prescription) &&
    itemStates.filter(s => s.has_prescription).every(s => s.done) &&
    !allDone;

  const currentItem = itemStates[currentItemIndex];
  const currentLot = currentItem?.lots[0];

  const extractSkuFromBarcode = (barcode: string): string => {
    const parts = barcode.split('_');
    if (parts.length >= 2) {
      return parts.slice(0, parts.length - 1).join('_');
    }
    return barcode;
  };

  const advanceToNext = (states: ItemPickState[], fromIndex: number) => {
    const nextIndex = states.findIndex((s, i) => i > fromIndex && !s.done);
    if (nextIndex >= 0) {
      setCurrentItemIndex(nextIndex);
    }
  };

  const markCurrentDone = () => {
    const cur = itemStates[currentItemIndex];
    const newStates = [...itemStates];
    newStates[currentItemIndex] = {
      ...cur,
      picked_this_session: cur.scanned_count > 0 ? cur.scanned_count : cur.quantity - cur.already_picked,
      done: true,
    };
    setItemStates(newStates);
    setBarcodeInput('');
    scannerFiredRef.current = false;
    return newStates;
  };

  const handleScan = async (value: string) => {
    setScanError('');
    setScanScenario(null);
    const trimmed = value.trim();
    if (!trimmed || !currentItem || currentItem.done) return;

    const requiredQty = currentItem.quantity - currentItem.already_picked;
    const expectedBarcode = currentLot?.barcode;

    if (expectedBarcode) {
      if (trimmed === expectedBarcode) {
        const newCount = currentItem.scanned_count + 1;
        if (newCount >= requiredQty) {
          const newStates = [...itemStates];
          newStates[currentItemIndex] = { ...currentItem, scanned_count: newCount };
          setItemStates(newStates);
          const doneStates = [...newStates];
          doneStates[currentItemIndex] = { ...newStates[currentItemIndex], picked_this_session: newCount, done: true };
          setItemStates(doneStates);
          setBarcodeInput('');
          scannerFiredRef.current = false;
          advanceToNext(doneStates, currentItemIndex);
        } else {
          const newStates = [...itemStates];
          newStates[currentItemIndex] = { ...currentItem, scanned_count: newCount };
          setItemStates(newStates);
          setBarcodeInput('');
          scannerFiredRef.current = false;
        }
        return;
      }

      const scannedSku = extractSkuFromBarcode(trimmed);
      const isSameSku = scannedSku.toLowerCase() === currentItem.sku.toLowerCase();

      if (isSameSku) {
        // Look up the location of the scanned lot for the override log
        let scannedLocationCode: string | undefined;
        try {
          const { data: scannedLot } = await supabase
            .from('inventory_lots')
            .select('warehouse_locations(code)')
            .eq('barcode', trimmed)
            .maybeSingle();
          scannedLocationCode = (scannedLot?.warehouse_locations as any)?.code ?? undefined;
        } catch (_) { /* ignore — non-critical */ }
        setScanScenario({ type: 'different_lot', scannedBarcode: trimmed, recommendedBarcode: expectedBarcode, scannedLocationCode });
        setBarcodeInput('');
        return;
      }

      setScanError('Wrong item scanned. This does not match the order. You must scan the correct item.');
      setBarcodeInput('');
      scannerFiredRef.current = false;
      return;
    }

    const newCount = currentItem.scanned_count + 1;
    if (newCount >= requiredQty) {
      const newStates = [...itemStates];
      newStates[currentItemIndex] = { ...currentItem, scanned_count: newCount, picked_this_session: newCount, done: true };
      setItemStates(newStates);
      setBarcodeInput('');
      scannerFiredRef.current = false;
      advanceToNext(newStates, currentItemIndex);
    } else {
      const newStates = [...itemStates];
      newStates[currentItemIndex] = { ...currentItem, scanned_count: newCount };
      setItemStates(newStates);
      setBarcodeInput('');
      scannerFiredRef.current = false;
    }
  };

  const handleJustPick = async () => {
    if (!scanScenario || scanScenario.type !== 'different_lot') return;

    const reasonLabel = OVERRIDE_REASON_LABELS[overrideReason];
    const fullReason = discrepancyReason.trim()
      ? `${reasonLabel}: ${discrepancyReason.trim()}`
      : reasonLabel;

    await supabase.from('pick_discrepancy_log').insert({
      order_id: order.id,
      order_item_id: currentItem.item_id,
      sku: currentItem.sku,
      product_name: currentItem.product_name,
      recommended_lot_barcode: scanScenario.recommendedBarcode,
      recommended_location_code: currentLot?.location_code ?? '',
      scanned_barcode: scanScenario.scannedBarcode,
      override_lot_barcode: scanScenario.scannedBarcode,
      override_location_code: scanScenario.scannedLocationCode ?? '',
      override_reason: overrideReason,
      reason: fullReason,
      picked_by: 'operator',
    });

    setScanScenario(null);
    setDiscrepancyReason('');
    setOverrideReason('physically_unavailable');
    const newStates = markCurrentDone();
    advanceToNext(newStates, currentItemIndex);
  };

  const openOverrideSelection = async () => {
    if (!currentItem || !currentLot) return;
    setAlternativeLots([]);
    setLocationGroups([]);
    setSelectedLocation(null);
    setSelectedOverrideLot(null);
    setOverrideReason('physically_unavailable');
    setDiscrepancyReason('');
    setScanScenario({ type: 'override_selection', step: 'location' });
    setScanError('');
    setAlternativeLotsLoading(true);
    try {
      const { data: lots } = await supabase
        .from('inventory_lots')
        .select(`id, lot_number, barcode, remaining_quantity, reserved_quantity, received_date, location:warehouse_locations(code)`)
        .eq('product_id', currentItem.product_id)
        .order('received_date', { ascending: true });

      const alts: AlternativeLot[] = (lots || [])
        .filter(l => (l.remaining_quantity - (l.reserved_quantity ?? 0)) > 0)
        .map(l => ({
          lot_id: l.id,
          barcode: l.barcode || l.lot_number,
          lot_number: l.lot_number,
          location_code: (l.location as any)?.code || 'N/A',
          available_quantity: l.remaining_quantity - (l.reserved_quantity ?? 0),
        }));

      // Group by location
      const groupMap = new Map<string, LocationGroup>();
      for (const lot of alts) {
        const key = lot.location_code;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            location_code: key,
            total_available: 0,
            lots: [],
            is_recommended: key === currentLot.location_code,
          });
        }
        const g = groupMap.get(key)!;
        g.lots.push(lot);
        g.total_available += lot.available_quantity;
      }

      // Sort: non-recommended first, then recommended, each group sorted by location code
      const groups = Array.from(groupMap.values()).sort((a, b) => {
        if (a.is_recommended !== b.is_recommended) return a.is_recommended ? 1 : -1;
        return a.location_code.localeCompare(b.location_code);
      });

      setAlternativeLots(alts);
      setLocationGroups(groups);
    } catch (err) {
      console.error('Error fetching alternative lots:', err);
    } finally {
      setAlternativeLotsLoading(false);
    }
  };

  const selectLocationForOverride = (group: LocationGroup) => {
    setSelectedLocation(group);
    setSelectedOverrideLot(group.lots.length === 1 ? group.lots[0] : null);
    setScanScenario({ type: 'override_selection', step: 'lot' });
  };

  const backToLocationStep = () => {
    setSelectedLocation(null);
    setSelectedOverrideLot(null);
    setScanScenario({ type: 'override_selection', step: 'location' });
  };

  const handleConfirmOverride = async () => {
    if (!currentItem || !currentLot || !selectedOverrideLot) return;
    setOverrideProcessing(true);
    try {
      const reasonLabel = OVERRIDE_REASON_LABELS[overrideReason];
      const fullReason = discrepancyReason.trim()
        ? `${reasonLabel}: ${discrepancyReason.trim()}`
        : reasonLabel;

      await supabase.from('pick_discrepancy_log').insert({
        order_id: order.id,
        order_item_id: currentItem.item_id,
        sku: currentItem.sku,
        product_name: currentItem.product_name,
        recommended_lot_barcode: currentLot.barcode,
        recommended_location_code: currentLot.location_code,
        override_lot_barcode: selectedOverrideLot.barcode,
        override_location_code: selectedOverrideLot.location_code,
        override_reason: overrideReason,
        reason: fullReason,
        picked_by: 'operator',
      });

      // Swap the active lot in local state so subsequent scans validate against the new lot
      const newLot: LotRecommendation = {
        lot_id: selectedOverrideLot.lot_id,
        lot_number: selectedOverrideLot.lot_number,
        barcode: selectedOverrideLot.barcode,
        location_code: selectedOverrideLot.location_code,
        available_quantity: selectedOverrideLot.available_quantity,
        received_date: '',
        recommended_quantity: currentLot.recommended_quantity,
      };
      const newStates = [...itemStates];
      const updatedLots = [newLot, ...newStates[currentItemIndex].lots.slice(1)];
      newStates[currentItemIndex] = { ...newStates[currentItemIndex], lots: updatedLots };
      setItemStates(newStates);

      setScanScenario(null);
      setSelectedOverrideLot(null);
      setDiscrepancyReason('');
      setOverrideReason('physically_unavailable');
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      console.error('Override confirm error:', err);
    } finally {
      setOverrideProcessing(false);
    }
  };

  const handleManualConfirm = () => {
    if (!currentItem || currentItem.done) return;
    setScanError('');
    setScanScenario(null);
    const newStates = markCurrentDone();
    advanceToNext(newStates, currentItemIndex);
  };

  const submitPicks = async (isPartial: boolean) => {
    try {
      setProcessing(true);

      for (const state of itemStates) {
        if (state.picked_this_session <= 0) continue;

        let remaining = state.picked_this_session;
        for (const lot of state.lots) {
          if (remaining <= 0) break;
          const qty = Math.min(remaining, lot.recommended_quantity);

          await supabase.from('order_picks').insert({
            order_id: order.id,
            order_item_id: state.item_id,
            lot_id: lot.lot_id,
            quantity: qty,
          });

          if (qty >= lot.available_quantity && lot.available_quantity > 0) {
            const { data: lotData } = await supabase
              .from('inventory_lots')
              .select('id, product_id, location_id')
              .eq('id', lot.lot_id)
              .maybeSingle();

            if (lotData) {
              const { data: existing } = await supabase
                .from('audit_flags')
                .select('id')
                .eq('lot_id', lot.lot_id)
                .eq('status', 'open')
                .eq('trigger_type', 'fulfillment_overcount')
                .maybeSingle();

              if (!existing) {
                await supabase.from('audit_flags').insert({
                  location_id: lotData.location_id,
                  product_id: lotData.product_id,
                  lot_id: lot.lot_id,
                  trigger_type: 'fulfillment_overcount',
                  expected_quantity: lot.available_quantity,
                  counted_quantity: null,
                  status: 'open',
                });
              }
            }
          }

          await supabase
            .from('order_items')
            .update({ picked_quantity: state.already_picked + qty })
            .eq('id', state.item_id);

          remaining -= qty;
        }
      }

      let newStatus: string;
      const updateData: Record<string, string | null> = {};

      if (isLabPick) {
        newStatus = 'send_to_lab';
        updateData.fulfillment_status = newStatus;
      } else {
        newStatus = 'printed';
        updateData.fulfillment_status = newStatus;
      }

      await supabase.from('orders').update(updateData).eq('id', order.id);

      await supabase.from('order_activity_log').insert({
        order_id: order.id,
        action: isLabPick
          ? (isPartial ? 'Lab pick partially completed' : 'Lab pick completed — ready to send to lab')
          : (isPartial ? 'Partially picked' : 'Fully picked — ready to pack'),
      });

      onClose();
    } catch (err) {
      console.error('Error saving picks:', err);
    } finally {
      setProcessing(false);
    }
  };

  const displayOrderId = order.woo_order_number
    ? `#${order.woo_order_number}`
    : order.order_number;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full mx-2 sm:mx-auto p-0 overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {isLabPick
              ? <FlaskConical className="h-5 w-5 text-teal-600 flex-shrink-0" />
              : <Package className="h-5 w-5 text-blue-600 flex-shrink-0" />
            }
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {isLabPick ? 'Lab Pick' : 'Pick Items'} — {displayOrderId}
              </h2>
              <p className="text-xs text-gray-500 hidden sm:block">Scan each item's barcode to confirm. Follow FIFO order.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-2 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading FIFO recommendations...</div>
          ) : noItemsToPick ? (
            <div className="p-6 space-y-4">
              <div className="text-center py-4">
                <FlaskConical className="h-10 w-10 text-teal-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">No inventory items to pick</p>
                <p className="text-xs text-gray-500 mt-1">This is a prescription-only order. The lens will be processed directly by the lab.</p>
              </div>
              <button
                onClick={() => submitPicks(false)}
                disabled={processing}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {processing ? 'Processing...' : 'Mark In Lab'}
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium text-gray-700">Progress</span>
                  <span className="text-gray-600 font-semibold">{pickedCount} / {totalItems} picked</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: allDone ? '#16a34a' : '#2563eb',
                    }}
                  />
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items to Pick</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {itemStates.map((state, idx) => (
                    <button
                      key={state.item_id}
                      onClick={() => !state.done && setCurrentItemIndex(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors ${
                        state.done
                          ? 'bg-green-50'
                          : idx === currentItemIndex
                          ? 'bg-blue-50'
                          : 'bg-white hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      {state.done ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          idx === currentItemIndex ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 text-gray-500'
                        }`}>
                          {idx + 1}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${state.done ? 'text-green-800' : 'text-gray-900'} flex items-center gap-1.5`}>
                          <span className="truncate">{state.product_name}</span>
                          {isLabPick && state.has_prescription && (
                            <span className="flex-shrink-0 text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-semibold">Rx</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          Qty: {state.quantity - state.already_picked}
                          {state.lots[0] && <span className="ml-2 text-blue-600 font-mono">{state.lots[0].location_code}</span>}
                          {!state.done && idx === currentItemIndex && state.scanned_count > 0 && (
                            <span className="ml-2 font-semibold text-blue-600">
                              {state.scanned_count}/{state.quantity - state.already_picked} scanned
                            </span>
                          )}
                        </div>
                      </div>
                      {state.done && <span className="text-xs text-green-600 font-medium flex-shrink-0">Done</span>}
                    </button>
                  ))}
                </div>
              </div>

              {allDone ? (
                <div className="border border-green-200 bg-green-50 rounded-xl p-5 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
                  <div className="text-green-700 font-semibold text-base">All Items Picked!</div>
                  <div className="text-green-600 text-sm mt-1">
                    {isLabPick ? 'Press "Send to Lab" to complete the lab pick' : 'Press "Complete Pick" — then use the Pack button'}
                  </div>
                  <Button
                    variant="primary"
                    className="mt-4 w-full bg-gray-900 hover:bg-gray-800 text-white h-12 text-base"
                    onClick={() => submitPicks(false)}
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : (isLabPick ? 'Send to Lab' : 'Complete Pick')}
                  </Button>
                </div>
              ) : scanScenario?.type === 'override_selection' ? (
                <div className="border border-orange-200 bg-orange-50 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 bg-orange-600 text-white flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-semibold">
                      {scanScenario.step === 'location' ? 'Pick from a Different Location' : `Lots at ${selectedLocation?.location_code}`}
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* System recommendation summary */}
                    <div className="bg-white border border-orange-100 rounded-xl p-3">
                      <div className="text-xs font-semibold text-gray-500 mb-1.5">System Recommended</div>
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-xs text-gray-400">Barcode</div>
                          <div className="font-bold text-green-700 font-mono text-sm">{currentLot?.barcode}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin className="h-3 w-3" /> Location</div>
                          <div className="font-bold text-blue-700">{currentLot?.location_code}</div>
                        </div>
                      </div>
                    </div>

                    {/* Reason — always shown */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-orange-800">Reason for override (required)</label>
                      {(Object.keys(OVERRIDE_REASON_LABELS) as OverrideReason[]).filter(k => k !== 'other').map(key => (
                        <label key={key} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${overrideReason === key ? 'border-orange-400 bg-orange-100/60' : 'border-orange-100 bg-white hover:bg-orange-50/60'}`}>
                          <input
                            type="radio"
                            name="proactive_override_reason"
                            value={key}
                            checked={overrideReason === key}
                            onChange={() => setOverrideReason(key)}
                            className="accent-orange-500 flex-shrink-0"
                          />
                          <span className="text-sm text-orange-900">{OVERRIDE_REASON_LABELS[key]}</span>
                        </label>
                      ))}
                    </div>

                    {/* Step 1 — choose location */}
                    {scanScenario.step === 'location' && (
                      <div>
                        <label className="block text-xs font-semibold text-orange-800 mb-1.5">Choose location to pick from</label>
                        {alternativeLotsLoading ? (
                          <div className="text-xs text-gray-400 py-3 text-center">Loading available locations...</div>
                        ) : locationGroups.length === 0 ? (
                          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            No stock available for this product in any location.
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-52 overflow-y-auto">
                            {locationGroups.map(group => (
                              <button
                                key={group.location_code}
                                type="button"
                                onClick={() => selectLocationForOverride(group)}
                                className="w-full flex items-center justify-between p-3 rounded-xl border bg-white hover:bg-orange-50/60 active:bg-orange-100/60 border-orange-100 text-left transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <MapPin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                  <div>
                                    <div className="font-bold text-gray-800 text-sm">{group.location_code}</div>
                                    <div className="text-xs text-gray-400">{group.lots.length} lot{group.lots.length !== 1 ? 's' : ''}</div>
                                  </div>
                                  {group.is_recommended && (
                                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">Recommended</span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-gray-400">Available</div>
                                  <div className="font-bold text-gray-700">{group.total_available}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="pt-2">
                          <button
                            onClick={() => { setScanScenario(null); setTimeout(() => inputRef.current?.focus(), 50); }}
                            className="w-full py-2.5 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 2 — choose lot at selected location */}
                    {scanScenario.step === 'lot' && selectedLocation && (
                      <div>
                        <label className="block text-xs font-semibold text-orange-800 mb-1.5">
                          Select shipment lot at <span className="font-mono">{selectedLocation.location_code}</span>
                        </label>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {selectedLocation.lots.map(lot => (
                            <button
                              key={lot.lot_id}
                              type="button"
                              onClick={() => setSelectedOverrideLot(lot)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors ${selectedOverrideLot?.lot_id === lot.lot_id ? 'border-orange-400 bg-orange-100/60' : 'border-orange-100 bg-white hover:bg-orange-50/60'}`}
                            >
                              <div>
                                <div className="font-bold text-gray-800 font-mono text-sm">{lot.barcode}</div>
                                <div className="text-xs text-gray-400 mt-0.5">Lot: {lot.lot_number}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-400">Available</div>
                                <div className="font-bold text-gray-700">{lot.available_quantity}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-3">
                          <button
                            onClick={backToLocationStep}
                            className="py-2.5 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
                          >
                            Back
                          </button>
                          <button
                            onClick={handleConfirmOverride}
                            disabled={!selectedOverrideLot || overrideProcessing}
                            className="py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
                          >
                            {overrideProcessing ? 'Confirming...' : 'Confirm Override'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : scanScenario?.type === 'different_lot' ? (
                <div className="border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-amber-500 text-white flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-semibold">Different Lot Scanned</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="text-sm text-amber-900">
                      The scanned barcode is the correct product but from a different lot than the FIFO recommendation.
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="bg-white rounded-lg p-2.5 border border-amber-100">
                        <div className="text-gray-500 mb-0.5">Recommended (FIFO)</div>
                        <div className="font-bold text-green-700 font-mono">{scanScenario.recommendedBarcode}</div>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border border-amber-100">
                        <div className="text-gray-500 mb-0.5">Scanned</div>
                        <div className="font-bold text-amber-700 font-mono">{scanScenario.scannedBarcode}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-amber-800">
                        Reason (required)
                      </label>
                      <div className="space-y-1.5">
                        {(Object.keys(OVERRIDE_REASON_LABELS) as OverrideReason[]).map(key => (
                          <label key={key} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${overrideReason === key ? 'border-amber-400 bg-amber-100/60' : 'border-amber-100 bg-white hover:bg-amber-50/60'}`}>
                            <input
                              type="radio"
                              name="override_reason"
                              value={key}
                              checked={overrideReason === key}
                              onChange={() => setOverrideReason(key)}
                              className="accent-amber-500 flex-shrink-0"
                            />
                            <span className="text-sm text-amber-900">{OVERRIDE_REASON_LABELS[key]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-800 mb-1">
                        Additional notes <span className="font-normal text-amber-700">(optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Any extra detail..."
                        value={discrepancyReason}
                        onChange={e => setDiscrepancyReason(e.target.value)}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => { setScanScenario(null); setDiscrepancyReason(''); setOverrideReason('physically_unavailable'); setBarcodeInput(''); setTimeout(() => inputRef.current?.focus(), 50); }}
                        className="py-2.5 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={handleJustPick}
                        className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
                      >
                        Just Pick (Log)
                      </button>
                    </div>
                    <p className="text-xs text-amber-700 text-center">
                      "Just Pick" accepts this lot and logs a discrepancy for reporting.
                    </p>
                  </div>
                </div>
              ) : currentItem ? (
                <div className="border border-blue-200 bg-blue-50 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-blue-600 text-white">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                        Current Item ({currentItemIndex + 1}/{totalItems})
                      </div>
                      {isLabPick && currentItem.has_prescription && (
                        <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <FlaskConical className="h-3 w-3" /> Rx — Send to Lab
                        </span>
                      )}
                    </div>
                    <div className="text-base font-bold mt-0.5 leading-tight">{currentItem.product_name}</div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white rounded-lg p-2.5 border border-blue-100">
                        <div className="text-xs text-gray-500 mb-0.5">SKU</div>
                        <div className="font-bold text-blue-700 truncate">{currentItem.sku}</div>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border border-blue-100">
                        <div className="text-xs text-gray-500 mb-0.5">Qty to Pick</div>
                        <div className="font-bold text-gray-800 text-lg leading-none">
                          {currentItem.quantity - currentItem.already_picked}
                        </div>
                      </div>
                    </div>

                    {currentItem.scanned_count > 0 && (
                      <div className="flex items-center justify-between bg-blue-100 border border-blue-200 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ScanLine className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-800">Scanned</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-blue-900 tabular-nums">
                            {currentItem.scanned_count} / {currentItem.quantity - currentItem.already_picked}
                          </span>
                        </div>
                      </div>
                    )}

                    {currentLot ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-green-700 text-xs font-semibold mb-3">
                          <Package className="h-3.5 w-3.5" />
                          Recommended Lot (FIFO)
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white rounded-lg p-2.5 border border-green-100">
                            <div className="text-xs text-gray-500 mb-1">Barcode to Scan</div>
                            <div className="font-bold text-green-800 font-mono text-sm break-all leading-snug">
                              {currentLot.barcode}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-2.5 border border-green-100">
                            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> Location
                            </div>
                            <div className="font-bold text-blue-700 text-lg leading-none">{currentLot.location_code}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">No stock available for this item</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <ScanLine className="h-4 w-4" /> Scan Barcode
                        {scanEnforced && (
                          <span className="ml-auto flex items-center gap-1 text-gray-400 font-normal">
                            <Lock className="h-3 w-3" /> Scanner only
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          ref={inputRef}
                          type="text"
                          inputMode={scanEnforced ? 'none' : 'text'}
                          readOnly={scanEnforced}
                          placeholder={scanEnforced ? 'Waiting for scanner...' : 'Scan or type barcode...'}
                          value={barcodeInput}
                          onChange={scanEnforced ? undefined : (e) => setBarcodeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              scannerFiredRef.current = true;
                              handleScan(barcodeInput);
                            }
                          }}
                          onInput={scanEnforced ? (e) => {
                            const input = e.currentTarget;
                            setBarcodeInput(input.value);
                            if (input.value.endsWith('\n') || input.value.endsWith('\r')) {
                              scannerFiredRef.current = true;
                              handleScan(input.value.trim());
                            }
                          } : undefined}
                          className={`flex-1 border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white min-h-[52px] ${
                            scanEnforced
                              ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-default'
                              : 'border-gray-300'
                          }`}
                        />
                        <button
                          onClick={() => setShowCamera(true)}
                          className="px-3 border border-gray-300 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors bg-white min-h-[52px] min-w-[52px] flex items-center justify-center"
                          title="Use camera"
                        >
                          <Camera className="h-5 w-5 text-gray-600" />
                        </button>
                      </div>
                      {scanError && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-red-600 text-sm">{scanError}</p>
                        </div>
                      )}
                      {!scanEnforced && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => handleScan(barcodeInput)}
                            disabled={!barcodeInput.trim()}
                            className="flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-900 active:bg-black text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[52px]"
                          >
                            <ScanLine className="h-4 w-4" /> Confirm Scan
                          </button>
                          <button
                            onClick={handleManualConfirm}
                            className="flex items-center justify-center gap-2 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 active:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium transition-colors min-h-[52px]"
                          >
                            <Check className="h-4 w-4" /> Skip / Confirm
                          </button>
                        </div>
                      )}
                      {scanEnforced && (
                        <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                          <Lock className="h-3 w-3" /> Point scanner at the barcode above to continue
                        </p>
                      )}
                      {!scanEnforced && (
                        <p className="text-xs text-gray-400 text-center">
                          "Skip / Confirm" picks without scanning — use if scanner unavailable
                        </p>
                      )}
                    </div>

                    {currentLot && (
                      <div className="pt-1 border-t border-blue-100">
                        <button
                          onClick={openOverrideSelection}
                          className="w-full flex items-center justify-center gap-2 py-2.5 border border-orange-300 text-orange-700 hover:bg-orange-50 active:bg-orange-100 rounded-xl text-sm font-medium transition-colors"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Override Recommended Lot
                        </button>
                        <p className="text-xs text-gray-400 text-center mt-1.5">
                          Use if the recommended lot is damaged or unavailable
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {rxItemsDone && !scanScenario && (
                <div className="border border-teal-200 bg-teal-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <FlaskConical className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-teal-800">Prescription Items Ready</div>
                      <p className="text-xs text-teal-700 mt-0.5">
                        All Rx items are picked. You can send these to the lab now and come back to pick the remaining items after the lab returns the order.
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white border-0 text-sm font-semibold"
                    onClick={() => submitPicks(false)}
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : 'Rx Items Picked — Send to Lab'}
                  </Button>
                </div>
              )}

              {!allDone && !scanScenario && pickedCount > 0 && (
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={onClose}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                  {!rxItemsDone && (
                    <Button
                      className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white border-0 text-sm"
                      onClick={() => submitPicks(true)}
                      disabled={processing}
                    >
                      {processing ? 'Saving...' : `Save Partial (${pickedCount}/${totalItems})`}
                    </Button>
                  )}
                </div>
              )}

              {!allDone && !scanScenario && pickedCount === 0 && (
                <div className="flex justify-start pt-1">
                  <Button variant="outline" className="h-12 px-6" onClick={onClose} disabled={processing}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      {showCamera && (
        <BarcodeScannerModal
          onScan={(barcode) => {
            setShowCamera(false);
            handleScan(barcode);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </Dialog>
  );
}
