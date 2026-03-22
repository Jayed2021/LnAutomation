import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Search, Ship, Package, ChevronDown, ChevronRight } from 'lucide-react';

interface Shipment {
  id: string;
  shipment_id: string;
  received_date: string;
  notes: string | null;
  po_number: string | null;
  supplier_name: string | null;
  total_skus: number;
  initial_quantity: number;
  remaining_quantity: number;
  total_landed_cost: number;
  age_days: number;
  lots: LotRow[];
}

interface LotRow {
  id: string;
  lot_number: string;
  sku: string;
  product_name: string;
  location_code: string | null;
  received_quantity: number;
  remaining_quantity: number;
  landed_cost_per_unit: number;
}

export default function Shipments() {
  const { canSeeCosts } = useAuth();
  const { lastRefreshed, setRefreshing } = useRefresh();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadShipments();
  }, [lastRefreshed]);

  const loadShipments = async () => {
    setLoading(true);
    try {
      const { data: shipmentsData } = await supabase
        .from('shipments')
        .select(`
          id, shipment_id, received_date, notes,
          purchase_orders(po_number, suppliers(name))
        `)
        .order('received_date', { ascending: false });

      const { data: lotsData } = await supabase
        .from('inventory_lots')
        .select(`
          id, lot_number, shipment_id, received_quantity, remaining_quantity,
          landed_cost_per_unit, barcode,
          products(sku, name),
          warehouse_locations(code)
        `);

      const lotsByShipment: Record<string, LotRow[]> = {};
      (lotsData || []).forEach((l: any) => {
        if (!l.shipment_id) return;
        if (!lotsByShipment[l.shipment_id]) lotsByShipment[l.shipment_id] = [];
        lotsByShipment[l.shipment_id].push({
          id: l.id,
          lot_number: l.lot_number,
          sku: l.products?.sku || '?',
          product_name: l.products?.name || 'Unknown',
          location_code: l.warehouse_locations?.code || null,
          received_quantity: l.received_quantity,
          remaining_quantity: l.remaining_quantity,
          landed_cost_per_unit: l.landed_cost_per_unit
        });
      });

      const today = new Date();
      const mapped: Shipment[] = (shipmentsData || []).map((s: any) => {
        const lots = lotsByShipment[s.id] || [];
        const initialQty = lots.reduce((sum, l) => sum + l.received_quantity, 0);
        const remainingQty = lots.reduce((sum, l) => sum + l.remaining_quantity, 0);
        const totalCost = lots.reduce((sum, l) => sum + l.remaining_quantity * l.landed_cost_per_unit, 0);
        return {
          id: s.id,
          shipment_id: s.shipment_id,
          received_date: s.received_date,
          notes: s.notes,
          po_number: s.purchase_orders?.po_number || null,
          supplier_name: s.purchase_orders?.suppliers?.name || null,
          total_skus: new Set(lots.map(l => l.sku)).size,
          initial_quantity: initialQty,
          remaining_quantity: remainingQty,
          total_landed_cost: totalCost,
          age_days: Math.floor((today.getTime() - new Date(s.received_date).getTime()) / 86400000),
          lots
        };
      });

      setShipments(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = shipments.filter(s =>
    s.shipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.po_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const utilizationColor = (pct: number) => {
    if (pct >= 80) return 'text-emerald-600';
    if (pct >= 40) return 'text-amber-600';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Shipments</h1>
        <p className="text-sm text-gray-500 mt-1">All received shipments and their lot breakdown</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Shipments</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{shipments.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Units In</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{shipments.reduce((s, sh) => s + sh.initial_quantity, 0).toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Units Remaining</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{shipments.reduce((s, sh) => s + sh.remaining_quantity, 0).toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Value</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {canSeeCosts
              ? `৳ ${(shipments.reduce((s, sh) => s + sh.total_landed_cost, 0) / 1000).toFixed(0)}K`
              : <span className="text-gray-400 text-lg italic">Restricted</span>}
          </p>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search shipment ID, PO number, supplier..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Ship className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No shipments found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filtered.map(s => {
              const isExpanded = expandedRows.has(s.id);
              const utilization = s.initial_quantity > 0 ? Math.round((s.initial_quantity - s.remaining_quantity) / s.initial_quantity * 100) : 0;
              return (
                <div key={s.id}>
                  <div
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => toggleExpand(s.id)}
                  >
                    <div className="w-6">
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-gray-400" />
                        : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{s.shipment_id}</span>
                        {s.po_number && <span className="text-xs text-gray-500">from {s.po_number}</span>}
                      </div>
                      {s.supplier_name && <p className="text-xs text-gray-400 mt-0.5">{s.supplier_name}</p>}
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm">
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Received</p>
                        <p className="font-medium text-gray-700">{s.received_date}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Age</p>
                        <p className="font-medium text-gray-700">{s.age_days}d</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">SKUs</p>
                        <p className="font-medium text-gray-700">{s.total_skus}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Units In</p>
                        <p className="font-medium text-gray-700">{s.initial_quantity}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Remaining</p>
                        <p className="font-medium text-gray-700">{s.remaining_quantity}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Sold</p>
                        <p className={`font-semibold ${utilizationColor(utilization)}`}>{utilization}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Value</p>
                        <p className="font-medium text-gray-700">
                          {canSeeCosts
                            ? `৳ ${s.total_landed_cost.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`
                            : <span className="text-gray-400 italic text-xs">Restricted</span>}
                        </p>
                      </div>
                    </div>
                  </div>

                  {isExpanded && s.lots.length > 0 && (
                    <div className="bg-gray-50 border-t border-gray-100 px-5 py-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 uppercase">
                            <th className="text-left pb-2 font-medium">Lot</th>
                            <th className="text-left pb-2 font-medium">SKU</th>
                            <th className="text-left pb-2 font-medium">Product</th>
                            <th className="text-left pb-2 font-medium">Location</th>
                            <th className="text-right pb-2 font-medium">Received</th>
                            <th className="text-right pb-2 font-medium">Remaining</th>
                            <th className="text-right pb-2 font-medium">Cost/Unit</th>
                            <th className="text-right pb-2 font-medium">Lot Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {s.lots.map(lot => (
                            <tr key={lot.id} className="text-gray-700">
                              <td className="py-2 font-mono text-xs">{lot.lot_number}</td>
                              <td className="py-2 font-medium">{lot.sku}</td>
                              <td className="py-2 text-gray-500">{lot.product_name}</td>
                              <td className="py-2">
                                {lot.location_code
                                  ? <span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded font-mono">{lot.location_code}</span>
                                  : '—'}
                              </td>
                              <td className="py-2 text-right">{lot.received_quantity}</td>
                              <td className="py-2 text-right font-semibold">{lot.remaining_quantity}</td>
                              <td className="py-2 text-right">
                                {canSeeCosts
                                  ? `৳ ${lot.landed_cost_per_unit.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`
                                  : <span className="text-gray-400 italic text-xs">Restricted</span>}
                              </td>
                              <td className="py-2 text-right">
                                {canSeeCosts
                                  ? `৳ ${(lot.remaining_quantity * lot.landed_cost_per_unit).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`
                                  : <span className="text-gray-400 italic text-xs">Restricted</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
