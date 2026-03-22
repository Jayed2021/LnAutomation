import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Search, Download, TrendingUp, TrendingDown, ArrowLeftRight, RefreshCw, Package } from 'lucide-react';

interface Movement {
  id: string;
  created_at: string;
  movement_type: string;
  sku: string;
  product_name: string;
  lot_number: string | null;
  from_location: string | null;
  to_location: string | null;
  quantity: number;
  reference_type: string | null;
  notes: string | null;
  performed_by: string | null;
}

const MOVEMENT_TYPES = ['all', 'receipt', 'sale', 'return_restock', 'adjustment', 'transfer', 'damaged'];

const movementConfig: Record<string, { label: string; variant: string; icon: React.ReactNode; sign: string }> = {
  receipt: { label: 'Receipt', variant: 'emerald', icon: <TrendingUp className="w-3 h-3" />, sign: '+' },
  sale: { label: 'Sale', variant: 'blue', icon: <TrendingDown className="w-3 h-3" />, sign: '' },
  return_restock: { label: 'Return', variant: 'amber', icon: <RefreshCw className="w-3 h-3" />, sign: '+' },
  adjustment: { label: 'Adjustment', variant: 'gray', icon: <Package className="w-3 h-3" />, sign: '' },
  transfer: { label: 'Transfer', variant: 'blue', icon: <ArrowLeftRight className="w-3 h-3" />, sign: '' },
  damaged: { label: 'Damaged', variant: 'red', icon: <TrendingDown className="w-3 h-3" />, sign: '-' },
};

export default function StockMovements() {
  const { lastRefreshed, setRefreshing } = useRefresh();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadMovements();
    return () => { abortRef.current?.abort(); };
  }, [lastRefreshed]);

  const loadMovements = async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const { data } = await supabase
        .from('stock_movements')
        .select(`
          id, created_at, movement_type, quantity, reference_type, notes,
          performed_by,
          products(sku, name),
          inventory_lots(lot_number),
          from_loc:warehouse_locations!from_location_id(code),
          to_loc:warehouse_locations!to_location_id(code)
        `)
        .order('created_at', { ascending: false })
        .limit(500)
        .abortSignal(abortRef.current.signal);

      const mapped: Movement[] = (data || []).map((m: any) => ({
        id: m.id,
        created_at: m.created_at,
        movement_type: m.movement_type,
        sku: m.products?.sku || '?',
        product_name: m.products?.name || 'Unknown',
        lot_number: m.inventory_lots?.lot_number || null,
        from_location: m.from_loc?.code || null,
        to_location: m.to_loc?.code || null,
        quantity: m.quantity,
        reference_type: m.reference_type,
        notes: m.notes,
        performed_by: m.performed_by || null
      }));

      setMovements(mapped);
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = movements.filter(m => {
    const matchSearch = m.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.lot_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'all' || m.movement_type === typeFilter;
    const date = m.created_at.slice(0, 10);
    const matchFrom = !dateFrom || date >= dateFrom;
    const matchTo = !dateTo || date <= dateTo;
    return matchSearch && matchType && matchFrom && matchTo;
  });

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'SKU', 'Product', 'Lot', 'From', 'To', 'Quantity', 'Reference', 'Notes', 'By'];
    const rows = filtered.map(m => [
      m.created_at.slice(0, 16),
      m.movement_type,
      m.sku,
      m.product_name,
      m.lot_number || '',
      m.from_location || '',
      m.to_location || '',
      m.quantity,
      m.reference_type || '',
      m.notes || '',
      m.performed_by || ''
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

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Movements</h1>
          <p className="text-sm text-gray-500 mt-1">Complete ledger of all inventory changes</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {['receipt', 'sale', 'adjustment'].map(type => {
          const cfg = movementConfig[type];
          const count = movements.filter(m => m.movement_type === type).length;
          const total = movements.filter(m => m.movement_type === type).reduce((s, m) => s + Math.abs(m.quantity), 0);
          return (
            <Card key={type} className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={cfg.variant as any}>
                  <span className="flex items-center gap-1">{cfg.icon} {cfg.label}</span>
                </Badge>
              </div>
              <p className="text-2xl font-bold text-gray-900">{total.toLocaleString()} units</p>
              <p className="text-xs text-gray-400 mt-1">{count} transactions</p>
            </Card>
          );
        })}
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
          <p className="text-xs text-gray-400">{filtered.length} movements</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No movements found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU / Product</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">From → To</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(m => {
                  const cfg = movementConfig[m.movement_type] || { label: m.movement_type, variant: 'gray', icon: null, sign: '' };
                  const isPositive = m.quantity > 0;
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap text-xs text-gray-500">{formatDate(m.created_at)}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge variant={cfg.variant as any}>
                          <span className="flex items-center gap-1">{cfg.icon} {cfg.label}</span>
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-gray-900">{m.sku}</p>
                        <p className="text-xs text-gray-400">{m.product_name}</p>
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-gray-500">{m.lot_number || '—'}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-500">
                          {m.from_location || '—'}{m.to_location ? ` → ${m.to_location}` : ''}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <span className={`font-bold text-sm ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isPositive ? '+' : ''}{m.quantity}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500 max-w-xs truncate">{m.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
