import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Search, Download, TrendingUp, TrendingDown, ArrowLeftRight,
  RefreshCw, Package, ChevronDown, ChevronRight, ExternalLink,
  AlertCircle
} from 'lucide-react';

interface Movement {
  id: string;
  created_at: string;
  movement_type: string;
  product_type: 'saleable_goods' | 'packaging_material';
  sku: string;
  product_name: string;
  lot_number: string | null;
  from_location: string | null;
  to_location: string | null;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  performed_by: string | null;
}

interface DateGroup {
  date: string;
  label: string;
  movements: Movement[];
  saleableOut: number;
  saleableIn: number;
  packagingOut: number;
  goodsReceived: number;
  netSaleable: number;
}

const MOVEMENT_TYPES = ['all', 'receipt', 'sale', 'return_restock', 'adjustment', 'transfer', 'damaged', 'pkg_manual_restock', 'pkg_damaged'];

const movementConfig: Record<string, { label: string; variant: string; icon: React.ReactNode; sign: string }> = {
  receipt: { label: 'Receipt', variant: 'emerald', icon: <TrendingUp className="w-3 h-3" />, sign: '+' },
  sale: { label: 'Sale', variant: 'blue', icon: <TrendingDown className="w-3 h-3" />, sign: '' },
  return_restock: { label: 'Return', variant: 'amber', icon: <RefreshCw className="w-3 h-3" />, sign: '+' },
  return_receive: { label: 'Return In', variant: 'amber', icon: <RefreshCw className="w-3 h-3" />, sign: '+' },
  adjustment: { label: 'Adjustment', variant: 'gray', icon: <Package className="w-3 h-3" />, sign: '' },
  transfer: { label: 'Transfer', variant: 'blue', icon: <ArrowLeftRight className="w-3 h-3" />, sign: '' },
  damaged: { label: 'Damaged', variant: 'red', icon: <TrendingDown className="w-3 h-3" />, sign: '-' },
  qc_damaged: { label: 'QC Damaged', variant: 'red', icon: <TrendingDown className="w-3 h-3" />, sign: '-' },
  pkg_manual_restock: { label: 'Pkg Restock', variant: 'emerald', icon: <TrendingUp className="w-3 h-3" />, sign: '+' },
  pkg_damaged: { label: 'Pkg Damaged', variant: 'red', icon: <TrendingDown className="w-3 h-3" />, sign: '-' },
};

const INBOUND_TYPES = new Set(['receipt', 'return_restock', 'return_receive', 'pkg_manual_restock']);
const OUTBOUND_TYPES = new Set(['sale', 'damaged', 'qc_damaged', 'pkg_damaged']);
const OTHER_TYPES = new Set(['adjustment', 'transfer']);

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-BD', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' });
}

function buildDateGroups(movements: Movement[]): DateGroup[] {
  const map = new Map<string, Movement[]>();
  for (const m of movements) {
    const date = m.created_at.slice(0, 10);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(m);
  }
  const groups: DateGroup[] = [];
  for (const [date, ms] of map) {
    let saleableOut = 0, saleableIn = 0, packagingOut = 0, goodsReceived = 0;
    for (const m of ms) {
      const abQty = Math.abs(m.quantity);
      if (m.product_type === 'packaging_material') {
        if (OUTBOUND_TYPES.has(m.movement_type)) packagingOut += abQty;
      } else {
        if (m.movement_type === 'sale') saleableOut += abQty;
        else if (INBOUND_TYPES.has(m.movement_type)) saleableIn += abQty;
      }
      if (m.movement_type === 'receipt') goodsReceived += abQty;
      if (INBOUND_TYPES.has(m.movement_type) && m.movement_type !== 'receipt') goodsReceived += abQty;
    }
    groups.push({
      date,
      label: formatDateLabel(date),
      movements: ms,
      saleableOut,
      saleableIn,
      packagingOut,
      goodsReceived,
      netSaleable: saleableIn - saleableOut,
    });
  }
  return groups.sort((a, b) => b.date.localeCompare(a.date));
}

function NetBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const isPos = value > 0;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPos ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
      {isPos ? '+' : ''}{value} net
    </span>
  );
}

interface DateAccordionProps {
  group: DateGroup;
  defaultOpen: boolean;
}

function DateAccordion({ group, defaultOpen }: DateAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [othersOpen, setOthersOpen] = useState(false);

  const sales = group.movements.filter(m => m.movement_type === 'sale' && m.product_type === 'saleable_goods');
  const inbound = group.movements.filter(m => INBOUND_TYPES.has(m.movement_type) && m.product_type === 'saleable_goods');
  const packagingMovements = group.movements.filter(m => m.product_type === 'packaging_material');
  const others = group.movements.filter(m => OTHER_TYPES.has(m.movement_type));

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-gray-400">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>

        <span className="font-semibold text-gray-900 text-sm w-28 shrink-0">{group.label}</span>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 flex-1 text-xs text-gray-500">
          {group.saleableOut > 0 && (
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-blue-500" />
              <span className="text-gray-700 font-medium">{group.saleableOut}</span>
              <span>dispatched</span>
              {sales.length > 0 && <span className="text-gray-400">({sales.length} orders)</span>}
            </span>
          )}
          {group.goodsReceived > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-gray-700 font-medium">{group.goodsReceived}</span>
              <span>received</span>
            </span>
          )}
          {group.packagingOut > 0 && (
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3 text-orange-400" />
              <span className="text-gray-700 font-medium">{group.packagingOut}</span>
              <span>pkg used</span>
            </span>
          )}
          {others.length > 0 && (
            <span className="flex items-center gap-1 text-gray-400">
              <AlertCircle className="w-3 h-3" />
              <span>{others.length} misc</span>
            </span>
          )}
        </div>

        <div className="ml-auto shrink-0">
          <NetBadge value={group.netSaleable} />
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MovementSection
              title="Outbound — Sales"
              icon={<TrendingDown className="w-3.5 h-3.5 text-blue-500" />}
              rows={sales}
              emptyText="No sales dispatched"
              linkToOrder
            />
            <MovementSection
              title="Inbound — Goods Received"
              icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
              rows={inbound}
              emptyText="No goods received"
            />
          </div>

          {packagingMovements.length > 0 && (
            <PackagingSummary movements={packagingMovements} />
          )}

          {others.length > 0 && (
            <div>
              <button
                onClick={() => setOthersOpen(v => !v)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2"
              >
                {othersOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {others.length} other movement{others.length !== 1 ? 's' : ''} (adjustments, transfers)
              </button>
              {othersOpen && (
                <OtherMovementsTable rows={others} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MovementSectionProps {
  title: string;
  icon: React.ReactNode;
  rows: Movement[];
  emptyText: string;
  linkToOrder?: boolean;
}

function MovementSection({ title, icon, rows, emptyText, linkToOrder }: MovementSectionProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        {icon}
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</span>
        <span className="ml-auto text-xs text-gray-400">{rows.length} items</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400 px-3 py-4 text-center">{emptyText}</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {rows.map(m => {
            const cfg = movementConfig[m.movement_type] || { label: m.movement_type, variant: 'gray', icon: null, sign: '' };
            const isPos = m.quantity > 0;
            return (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-800 font-mono">{m.sku}</span>
                    <Badge variant={cfg.variant as any} className="text-[10px] px-1 py-0">
                      <span className="flex items-center gap-0.5">{cfg.icon} {cfg.label}</span>
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">{m.product_name}</p>
                  {m.notes && (
                    <p className="text-[10px] text-gray-400 truncate italic">{m.notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-sm font-bold ${isPos ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {isPos ? '+' : ''}{m.quantity}
                  </span>
                  <p className="text-[10px] text-gray-400">{formatTime(m.created_at)}</p>
                </div>
                {linkToOrder && m.reference_id && (
                  <Link
                    to={`/fulfillment/orders/${m.reference_id}`}
                    className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors"
                    onClick={e => e.stopPropagation()}
                    title="View order"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PackagingSummary({ movements }: { movements: Movement[] }) {
  const outMovements = movements.filter(m => OUTBOUND_TYPES.has(m.movement_type) && m.movement_type !== 'pkg_damaged');
  const restockMovements = movements.filter(m => m.movement_type === 'pkg_manual_restock');
  const damagedMovements = movements.filter(m => m.movement_type === 'pkg_damaged');
  const totalOut = outMovements.reduce((s, m) => s + Math.abs(m.quantity), 0);
  const totalRestock = restockMovements.reduce((s, m) => s + Math.abs(m.quantity), 0);
  const totalDamaged = damagedMovements.reduce((s, m) => s + Math.abs(m.quantity), 0);

  const uniqueOut = new Map<string, { name: string; qty: number }>();
  for (const m of outMovements) {
    if (!uniqueOut.has(m.sku)) uniqueOut.set(m.sku, { name: m.product_name, qty: 0 });
    uniqueOut.get(m.sku)!.qty += Math.abs(m.quantity);
  }

  return (
    <div className="bg-orange-50 border border-orange-100 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Package className="w-3.5 h-3.5 text-orange-500" />
        <span className="text-xs font-semibold text-orange-800 uppercase tracking-wide">Packaging Materials</span>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-orange-700">
        {totalOut > 0 && (
          <span>
            <span className="font-semibold">{totalOut}</span> units used
            {uniqueOut.size > 0 && (
              <span className="text-orange-500 ml-1">
                ({[...uniqueOut.entries()].map(([sku, v]) => `${v.qty}× ${sku}`).join(', ')})
              </span>
            )}
          </span>
        )}
        {totalRestock > 0 && (
          <span className="text-emerald-700">
            <span className="font-semibold">+{totalRestock}</span> restocked
          </span>
        )}
        {totalDamaged > 0 && (
          <span className="text-red-600">
            <span className="font-semibold">{totalDamaged}</span> damaged/lost
          </span>
        )}
        {totalOut === 0 && totalRestock === 0 && totalDamaged === 0 && (
          <span className="text-orange-400">No movements</span>
        )}
      </div>
    </div>
  );
}

function OtherMovementsTable({ rows }: { rows: Movement[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-50">
        {rows.map(m => {
          const cfg = movementConfig[m.movement_type] || { label: m.movement_type, variant: 'gray', icon: null, sign: '' };
          const isPos = m.quantity > 0;
          return (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors">
              <Badge variant={cfg.variant as any} className="text-[10px] px-1 py-0 shrink-0">
                <span className="flex items-center gap-0.5">{cfg.icon} {cfg.label}</span>
              </Badge>
              <span className="text-xs font-mono text-gray-700">{m.sku}</span>
              <span className="text-xs text-gray-400 flex-1 truncate">{m.product_name}</span>
              {m.notes && <span className="text-[10px] text-gray-400 italic truncate max-w-xs">{m.notes}</span>}
              <span className={`text-xs font-bold shrink-0 ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
                {isPos ? '+' : ''}{m.quantity}
              </span>
              <span className="text-[10px] text-gray-400 shrink-0">{formatTime(m.created_at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StockMovements() {
  const { lastRefreshed, setRefreshing } = useRefresh();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loadedDays, setLoadedDays] = useState(30);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadMovements();
    return () => { abortRef.current?.abort(); };
  }, [lastRefreshed, typeFilter, loadedDays]);

  const loadMovements = async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - loadedDays);
      const sinceStr = since.toISOString().slice(0, 10);

      let query = supabase
        .from('stock_movements')
        .select(`
          id, created_at, movement_type, quantity, reference_type, reference_id, notes,
          performed_by,
          products(sku, name, product_type),
          inventory_lots(lot_number),
          from_loc:warehouse_locations!from_location_id(code),
          to_loc:warehouse_locations!to_location_id(code)
        `)
        .gte('created_at', sinceStr)
        .order('created_at', { ascending: false })
        .abortSignal(abortRef.current.signal);

      if (typeFilter !== 'all') {
        query = query.eq('movement_type', typeFilter);
      }

      const { data } = await query;

      const mapped: Movement[] = (data || []).map((m: any) => ({
        id: m.id,
        created_at: m.created_at,
        movement_type: m.movement_type,
        product_type: m.products?.product_type || 'saleable_goods',
        sku: m.products?.sku || '?',
        product_name: m.products?.name || 'Unknown',
        lot_number: m.inventory_lots?.lot_number || null,
        from_location: m.from_loc?.code || null,
        to_location: m.to_loc?.code || null,
        quantity: m.quantity,
        reference_type: m.reference_type,
        reference_id: m.reference_id || null,
        notes: m.notes,
        performed_by: m.performed_by || null,
      }));

      setMovements(mapped);
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => movements.filter(m => {
    const matchSearch = !searchTerm ||
      m.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.lot_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const date = m.created_at.slice(0, 10);
    const matchFrom = !dateFrom || date >= dateFrom;
    const matchTo = !dateTo || date <= dateTo;
    return matchSearch && matchFrom && matchTo;
  }), [movements, searchTerm, dateFrom, dateTo]);

  const dateGroups = useMemo(() => buildDateGroups(filtered), [filtered]);

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const totalReceipts = movements.filter(m => m.movement_type === 'receipt').reduce((s, m) => s + Math.abs(m.quantity), 0);
  const totalSales = movements.filter(m => m.movement_type === 'sale').reduce((s, m) => s + Math.abs(m.quantity), 0);
  const totalReturns = movements.filter(m => m.movement_type === 'return_restock' || m.movement_type === 'return_receive').reduce((s, m) => s + Math.abs(m.quantity), 0);

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Product Type', 'SKU', 'Product', 'Lot', 'From', 'To', 'Quantity', 'Reference', 'Notes'];
    const rows = filtered.map(m => [
      m.created_at.slice(0, 16),
      m.movement_type,
      m.product_type,
      m.sku,
      m.product_name,
      m.lot_number || '',
      m.from_location || '',
      m.to_location || '',
      m.quantity,
      m.reference_type || '',
      m.notes || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_movements_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Movements</h1>
          <p className="text-sm text-gray-500 mt-1">Daily inventory activity — grouped by date</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Goods Received</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalReceipts.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">units in last {loadedDays} days</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sales Dispatched</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalSales.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">units in last {loadedDays} days</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Returns Restocked</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalReturns.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">units in last {loadedDays} days</p>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search SKU, product, lot..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {MOVEMENT_TYPES.map(t => (
                <option key={t} value={t}>{t === 'all' ? 'All Types' : movementConfig[t]?.label || t}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {filtered.length} movements across {dateGroups.length} day{dateGroups.length !== 1 ? 's' : ''}
              {' '}· showing last {loadedDays} days
            </p>
          </div>
        </div>

        <div className="p-4 space-y-2">
          {loading ? (
            <div className="py-16 text-center text-gray-400">Loading...</div>
          ) : dateGroups.length === 0 ? (
            <div className="py-16 text-center text-gray-400">No movements found</div>
          ) : (
            <>
              {dateGroups.map(group => (
                <DateAccordion
                  key={group.date}
                  group={group}
                  defaultOpen={group.date === today || group.date === yesterday}
                />
              ))}
              <div className="pt-3 text-center">
                <button
                  onClick={() => setLoadedDays(d => d + 30)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Load earlier ({loadedDays + 30} days)
                </button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
