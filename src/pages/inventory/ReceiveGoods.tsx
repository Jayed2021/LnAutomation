import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Package, X, Check, AlertTriangle, Truck } from 'lucide-react';

interface POForReceiving {
  id: string;
  po_number: string;
  supplier_name: string;
  expected_delivery_date: string | null;
  notes: string | null;
  items: POItemForReceiving[];
}

interface POItemForReceiving {
  id: string;
  sku: string;
  product_name: string;
  ordered_quantity: number;
  received_quantity: number;
  landed_cost_per_unit: number;
  remaining: number;
}

interface ReceivingLine {
  po_item_id: string;
  sku: string;
  product_name: string;
  ordered_quantity: number;
  qty_checked: number;
  qty_quality_passed: number;
  qty_damaged: number;
  landed_cost_per_unit: number;
  location_id: string;
  barcode_suggestion: string;
  barcode_override: string;
  product_id: string | null;
}

interface Location {
  id: string;
  code: string;
  name: string;
}

type ReceivingStep = 'list' | 'select_po' | 'quantity_check' | 'quality_check' | 'complete';

export default function ReceiveGoods() {
  const { user, canSeeCosts } = useAuth();
  const { lastRefreshed, setRefreshing } = useRefresh();
  const [confirmedPOs, setConfirmedPOs] = useState<POForReceiving[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<ReceivingStep>('list');
  const [selectedPO, setSelectedPO] = useState<POForReceiving | null>(null);
  const [receivingLines, setReceivingLines] = useState<ReceivingLine[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [shipmentIdInput, setShipmentIdInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [completedShipmentId, setCompletedShipmentId] = useState('');

  useEffect(() => {
    loadData();
  }, [lastRefreshed]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [posRes, locsRes] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select(`id, po_number, expected_delivery_date, notes, suppliers(name), purchase_order_items(id, sku, product_name, ordered_quantity, received_quantity, landed_cost_per_unit)`)
          .in('status', ['ordered', 'confirmed', 'partially_received'])
          .order('expected_delivery_date'),
        supabase
          .from('warehouse_locations')
          .select('id, code, name')
          .eq('is_active', true)
          .eq('location_type', 'storage')
          .order('code')
      ]);

      const pos: POForReceiving[] = (posRes.data || []).map((po: any) => ({
        id: po.id,
        po_number: po.po_number,
        supplier_name: po.suppliers?.name || 'Unknown',
        expected_delivery_date: po.expected_delivery_date,
        notes: po.notes,
        items: (po.purchase_order_items || []).map((item: any) => ({
          id: item.id,
          sku: item.sku,
          product_name: item.product_name,
          ordered_quantity: item.ordered_quantity,
          received_quantity: item.received_quantity,
          landed_cost_per_unit: item.landed_cost_per_unit,
          remaining: item.ordered_quantity - (item.received_quantity || 0)
        })).filter((i: POItemForReceiving) => i.remaining > 0)
      })).filter(po => po.items.length > 0);

      setConfirmedPOs(pos);
      setLocations((locsRes.data || []).map((l: any) => ({ id: l.id, code: l.code, name: l.name })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const selectPO = async (po: POForReceiving) => {
    setSelectedPO(po);
    const defaultLocationId = locations[0]?.id || '';

    const productRes = await supabase
      .from('products')
      .select('id, sku')
      .in('sku', po.items.map(i => i.sku));

    const productMap: Record<string, string> = {};
    (productRes.data || []).forEach((p: any) => { productMap[p.sku] = p.id; });

    const lines: ReceivingLine[] = po.items.map(item => ({
      po_item_id: item.id,
      sku: item.sku,
      product_name: item.product_name,
      ordered_quantity: item.remaining,
      qty_checked: item.remaining,
      qty_quality_passed: item.remaining,
      qty_damaged: 0,
      landed_cost_per_unit: item.landed_cost_per_unit,
      location_id: defaultLocationId,
      barcode_suggestion: `${item.sku}-${po.po_number}`,
      barcode_override: `${item.sku}-${po.po_number}`,
      product_id: productMap[item.sku] || null
    }));

    setReceivingLines(lines);
    setShipmentIdInput(`SHP-${po.po_number}`);
    setStep('quantity_check');
  };

  const updateLine = (idx: number, updates: Partial<ReceivingLine>) => {
    setReceivingLines(prev => prev.map((l, i) => i === idx ? { ...l, ...updates } : l));
  };

  const handleQtyCheckNext = () => {
    const syncedLines = receivingLines.map(l => ({
      ...l,
      qty_quality_passed: l.qty_checked,
      qty_damaged: 0
    }));
    setReceivingLines(syncedLines);
    setStep('quality_check');
  };

  const finalizeReceiving = async () => {
    if (!selectedPO || !user || !shipmentIdInput) return;
    setSaving(true);
    try {
      const { data: shipment, error: shipError } = await supabase
        .from('shipments')
        .insert({
          shipment_id: shipmentIdInput,
          po_id: selectedPO.id,
          received_date: new Date().toISOString().slice(0, 10),
          received_by: user.id,
          notes: `Received via Receive Goods flow`
        })
        .select()
        .single();

      if (shipError) throw shipError;

      const { data: damagedLoc } = await supabase
        .from('warehouse_locations')
        .select('id')
        .eq('location_type', 'damaged')
        .maybeSingle();

      for (const line of receivingLines) {
        if (!line.product_id || line.qty_quality_passed <= 0) continue;

        const lotNumber = `LOT-${shipmentIdInput}-${line.sku}`.toUpperCase().replace(/[^A-Z0-9-]/g, '-');

        await supabase.from('inventory_lots').insert({
          lot_number: lotNumber,
          product_id: line.product_id,
          shipment_id: shipment.id,
          po_id: selectedPO.id,
          location_id: line.location_id,
          received_date: new Date().toISOString().slice(0, 10),
          received_quantity: line.qty_quality_passed,
          remaining_quantity: line.qty_quality_passed,
          landed_cost_per_unit: line.landed_cost_per_unit,
          barcode: line.barcode_override || line.barcode_suggestion
        });

        await supabase.from('stock_movements').insert({
          movement_type: 'receipt',
          product_id: line.product_id,
          to_location_id: line.location_id,
          quantity: line.qty_quality_passed,
          reference_type: 'po',
          notes: `Received from ${selectedPO.po_number}`,
          performed_by: user.id
        });

        const { data: currentItem } = await supabase
          .from('purchase_order_items')
          .select('received_quantity')
          .eq('id', line.po_item_id)
          .maybeSingle();
        const previousReceived = currentItem?.received_quantity ?? 0;
        await supabase
          .from('purchase_order_items')
          .update({ received_quantity: previousReceived + line.qty_quality_passed })
          .eq('id', line.po_item_id);

        if (line.qty_damaged > 0 && damagedLoc) {
          const dmgLotNumber = `LOT-${shipmentIdInput}-${line.sku}-DMG`.toUpperCase().replace(/[^A-Z0-9-]/g, '-');
          await supabase.from('inventory_lots').insert({
            lot_number: dmgLotNumber,
            product_id: line.product_id,
            shipment_id: shipment.id,
            po_id: selectedPO.id,
            location_id: damagedLoc.id,
            received_date: new Date().toISOString().slice(0, 10),
            received_quantity: line.qty_damaged,
            remaining_quantity: line.qty_damaged,
            landed_cost_per_unit: line.landed_cost_per_unit,
            barcode: `${line.barcode_override}-DMG`
          });

          await supabase.from('stock_movements').insert({
            movement_type: 'damaged',
            product_id: line.product_id,
            to_location_id: damagedLoc.id,
            quantity: line.qty_damaged,
            reference_type: 'po',
            notes: `Damaged on receipt from ${selectedPO.po_number}`,
            performed_by: user.id
          });
        }
      }

      const { data: updatedItems } = await supabase
        .from('purchase_order_items')
        .select('ordered_quantity, received_quantity')
        .eq('po_id', selectedPO.id);
      const totalOrdered = (updatedItems || []).reduce((s, i) => s + (i.ordered_quantity ?? 0), 0);
      const totalReceived = (updatedItems || []).reduce((s, i) => s + (i.received_quantity ?? 0), 0);
      const newStatus = totalReceived >= totalOrdered ? 'closed' : 'partially_received';
      await supabase.from('purchase_orders').update({ status: newStatus }).eq('id', selectedPO.id);

      setCompletedShipmentId(shipmentIdInput);
      setStep('complete');
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (step === 'complete') {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Receiving Complete</h2>
          <p className="text-gray-500 mt-2">Shipment <span className="font-semibold">{completedShipmentId}</span> has been recorded successfully.</p>
          <p className="text-sm text-gray-400 mt-1">Inventory lots and stock movements have been created.</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => { setStep('list'); setSelectedPO(null); }}>Back to List</Button>
          <Button onClick={() => { setStep('list'); setSelectedPO(null); loadData(); }}>Done</Button>
        </div>
      </div>
    );
  }

  if (step === 'quantity_check' && selectedPO) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setStep('list')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Receive: {selectedPO.po_number}</h1>
            <p className="text-sm text-gray-500 mt-1">Step 1 of 2: Quantity Check — count and confirm quantities received</p>
          </div>
        </div>

        <Card className="p-5">
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-gray-400">Supplier:</span> <span className="font-medium text-gray-900">{selectedPO.supplier_name}</span></div>
            {selectedPO.expected_delivery_date && <div><span className="text-gray-400">Expected:</span> <span className="font-medium text-gray-900">{selectedPO.expected_delivery_date}</span></div>}
            <div>
              <span className="text-gray-400">Shipment ID:</span>
              <input
                className="ml-2 px-2 py-0.5 border border-gray-300 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={shipmentIdInput}
                onChange={e => setShipmentIdInput(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-5 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Item Quantities</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU / Product</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ordered</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Counted</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {receivingLines.map((line, idx) => {
                  const diff = line.qty_checked - line.ordered_quantity;
                  return (
                    <tr key={idx} className={diff !== 0 ? 'bg-amber-50' : ''}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-sm text-gray-900">{line.sku}</p>
                        <p className="text-xs text-gray-400">{line.product_name}</p>
                        {!line.product_id && <p className="text-xs text-red-400 mt-0.5">Not in product catalog</p>}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">{line.ordered_quantity}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min="0"
                            value={line.qty_checked}
                            onChange={e => updateLine(idx, { qty_checked: parseInt(e.target.value) || 0 })}
                            className={`w-20 text-right px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${diff !== 0 ? 'border-amber-400' : 'border-gray-300'}`}
                          />
                          {diff !== 0 && (
                            <span className={`text-xs font-bold ${diff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {diff > 0 ? '+' : ''}{diff}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={line.location_id}
                          onChange={e => updateLine(idx, { location_id: e.target.value })}
                          className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {locations.map(l => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <input
                          className="w-44 px-2 py-1 border border-gray-300 rounded text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={line.barcode_override}
                          onChange={e => updateLine(idx, { barcode_override: e.target.value })}
                          placeholder={line.barcode_suggestion}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
            <Button variant="outline" onClick={() => setStep('list')}>Cancel</Button>
            <Button onClick={handleQtyCheckNext}>Next: Quality Check</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'quality_check' && selectedPO) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setStep('quantity_check')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quality Check</h1>
            <p className="text-sm text-gray-500 mt-1">Step 2 of 2: Separate good units from damaged</p>
          </div>
        </div>

        <Card>
          <div className="p-5 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Quality Inspection</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU / Product</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Checked In</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Good Qty</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Damaged</th>
                  {canSeeCosts && <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost/Unit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {receivingLines.map((line, idx) => {
                  const total = line.qty_quality_passed + line.qty_damaged;
                  const mismatch = total !== line.qty_checked;
                  return (
                    <tr key={idx} className={mismatch ? 'bg-red-50' : ''}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-sm text-gray-900">{line.sku}</p>
                        <p className="text-xs text-gray-400">{line.product_name}</p>
                        {mismatch && (
                          <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Good + Damaged must equal {line.qty_checked}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">{line.qty_checked}</td>
                      <td className="px-5 py-4 text-right">
                        <input
                          type="number"
                          min="0"
                          max={line.qty_checked}
                          value={line.qty_quality_passed}
                          onChange={e => {
                            const val = Math.min(parseInt(e.target.value) || 0, line.qty_checked);
                            updateLine(idx, { qty_quality_passed: val, qty_damaged: line.qty_checked - val });
                          }}
                          className="w-20 text-right px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <input
                          type="number"
                          min="0"
                          max={line.qty_checked}
                          value={line.qty_damaged}
                          onChange={e => {
                            const val = Math.min(parseInt(e.target.value) || 0, line.qty_checked);
                            updateLine(idx, { qty_damaged: val, qty_quality_passed: line.qty_checked - val });
                          }}
                          className={`w-20 text-right px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${line.qty_damaged > 0 ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                        />
                      </td>
                      {canSeeCosts && (
                        <td className="px-5 py-4 text-right">
                          <input
                            type="number"
                            value={line.landed_cost_per_unit}
                            onChange={e => updateLine(idx, { landed_cost_per_unit: parseFloat(e.target.value) || 0 })}
                            className="w-28 text-right px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
            <Button variant="outline" onClick={() => setStep('quantity_check')}>Back</Button>
            <Button
              onClick={finalizeReceiving}
              disabled={saving || receivingLines.some(l => l.qty_quality_passed + l.qty_damaged !== l.qty_checked)}
            >
              {saving ? 'Processing...' : 'Complete Receiving'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Receive Goods</h1>
        <p className="text-sm text-gray-500 mt-1">Ordered POs awaiting physical receipt</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading...</div>
      ) : confirmedPOs.length === 0 ? (
        <Card>
          <div className="py-20 text-center">
            <Truck className="w-14 h-14 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No POs Ready to Receive</h3>
            <p className="text-sm text-gray-400 mt-2">
              POs in <span className="font-mono bg-gray-100 px-1 rounded">ordered</span> or <span className="font-mono bg-gray-100 px-1 rounded">partially received</span> status will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {confirmedPOs.map(po => (
            <Card key={po.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900 text-lg">{po.po_number}</h3>
                    <Badge variant="blue">Ready to Receive</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{po.supplier_name}</p>
                  {po.expected_delivery_date && (
                    <p className="text-xs text-gray-400">Expected: {po.expected_delivery_date}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {po.items.map(item => (
                      <span key={item.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        {item.sku} × {item.remaining}
                      </span>
                    ))}
                  </div>
                </div>
                <Button onClick={() => selectPO(po)} className="ml-4 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Start Receiving
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
