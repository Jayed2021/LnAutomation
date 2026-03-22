import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Check, AlertTriangle, Download, Filter } from 'lucide-react';

interface AuditDetail {
  id: string;
  audit_date: string;
  status: 'in_progress' | 'completed';
  accuracy_percentage: number | null;
  notes: string | null;
  conducted_by: string | null;
  created_at: string;
  completed_at: string | null;
  location_names: string | null;
  location_ids: string[];
}

interface AuditLine {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  lot_id: string | null;
  lot_number: string | null;
  location_id: string;
  location_code: string;
  expected_quantity: number;
  counted_quantity: number | null;
  difference: number | null;
  notes: string | null;
}

export default function AuditDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [lines, setLines] = useState<AuditLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [discrepanciesOnly, setDiscrepanciesOnly] = useState(false);

  useEffect(() => {
    if (id) loadAudit(id);
  }, [id]);

  const loadAudit = async (auditId: string) => {
    setLoading(true);
    try {
      const [auditRes, linesRes] = await Promise.all([
        supabase
          .from('inventory_audits')
          .select('*, users(full_name)')
          .eq('id', auditId)
          .maybeSingle(),
        supabase
          .from('inventory_audit_lines')
          .select('*, products(sku, name), inventory_lots(lot_number), warehouse_locations(code)')
          .eq('audit_id', auditId)
          .order('warehouse_locations(code)', { ascending: true })
      ]);

      if (auditRes.data) {
        const a = auditRes.data as any;
        setAudit({
          id: a.id,
          audit_date: a.audit_date,
          status: a.status,
          accuracy_percentage: a.accuracy_percentage,
          notes: a.notes,
          conducted_by: a.users?.full_name || null,
          created_at: a.created_at,
          completed_at: a.completed_at,
          location_names: a.location_names,
          location_ids: a.location_ids || []
        });
      }

      setLines((linesRes.data || []).map((l: any) => ({
        id: l.id,
        product_id: l.product_id,
        sku: l.products?.sku || '?',
        product_name: l.products?.name || 'Unknown',
        lot_id: l.lot_id,
        lot_number: l.inventory_lots?.lot_number || null,
        location_id: l.location_id,
        location_code: l.warehouse_locations?.code || '?',
        expected_quantity: l.expected_quantity,
        counted_quantity: l.counted_quantity,
        difference: l.difference,
        notes: l.notes
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!audit || lines.length === 0) return;
    const headers = ['Location', 'SKU', 'Product Name', 'Lot Number', 'Expected Qty', 'Counted Qty', 'Difference', 'Notes'];
    const rows = lines.map(l => [
      l.location_code,
      l.sku,
      l.product_name,
      l.lot_number || '',
      l.expected_quantity,
      l.counted_quantity ?? '',
      l.difference ?? '',
      l.notes || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${audit.audit_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleLines = discrepanciesOnly
    ? lines.filter(l => l.difference !== 0 && l.difference !== null)
    : lines;

  const discrepancyCount = lines.filter(l => l.difference !== 0 && l.difference !== null).length;
  const totalExpected = lines.reduce((s, l) => s + l.expected_quantity, 0);
  const totalCounted = lines.reduce((s, l) => s + (l.counted_quantity ?? l.expected_quantity), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading audit...</p>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">Audit not found.</p>
        <Button variant="outline" onClick={() => navigate('/inventory/audit')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Audits
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/inventory/audit')}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit — {audit.audit_date}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {audit.conducted_by ? `Conducted by ${audit.conducted_by}` : 'No conductor recorded'}
              {audit.completed_at ? ` · Completed ${new Date(audit.completed_at).toLocaleString()}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportCsv} className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Badge variant={audit.status === 'completed' ? 'emerald' : 'amber'}>
            {audit.status === 'completed' ? 'Completed' : 'In Progress'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Accuracy</p>
          {audit.accuracy_percentage !== null ? (
            <p className={`text-3xl font-bold mt-1 ${
              audit.accuracy_percentage >= 95 ? 'text-emerald-600'
              : audit.accuracy_percentage >= 80 ? 'text-amber-600'
              : 'text-red-500'
            }`}>
              {audit.accuracy_percentage.toFixed(1)}%
            </p>
          ) : (
            <p className="text-3xl font-bold mt-1 text-gray-400">—</p>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Discrepancies</p>
          <p className={`text-3xl font-bold mt-1 ${discrepancyCount === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {discrepancyCount}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Lines Counted</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{lines.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Net Variance</p>
          <p className={`text-3xl font-bold mt-1 ${
            totalCounted - totalExpected === 0 ? 'text-emerald-600'
            : totalCounted > totalExpected ? 'text-emerald-600'
            : 'text-red-500'
          }`}>
            {totalCounted - totalExpected > 0 ? '+' : ''}{totalCounted - totalExpected}
          </p>
        </Card>
      </div>

      {audit.notes && (
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-700">{audit.notes}</p>
        </Card>
      )}

      {audit.location_names && (
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Locations Audited</p>
          <p className="text-sm text-gray-700 font-mono">{audit.location_names}</p>
        </Card>
      )}

      <Card>
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">Count Sheet</h3>
            {discrepancyCount > 0 && (
              <Badge variant="amber">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {discrepancyCount} discrepanc{discrepancyCount === 1 ? 'y' : 'ies'}
                </span>
              </Badge>
            )}
          </div>
          {discrepancyCount > 0 && (
            <button
              onClick={() => setDiscrepanciesOnly(prev => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                discrepanciesOnly
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-3 h-3" />
              {discrepanciesOnly ? 'Showing discrepancies only' : 'Show discrepancies only'}
            </button>
          )}
        </div>

        {lines.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p>No count lines recorded for this audit.</p>
          </div>
        ) : visibleLines.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Check className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
            <p>No discrepancies found — all counts matched.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Counted</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleLines.map(line => {
                  const diff = line.difference ?? 0;
                  const isDiscrepancy = diff !== 0;
                  return (
                    <tr key={line.id} className={isDiscrepancy ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                      <td className="px-5 py-3">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{line.location_code}</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-sm text-gray-900">{line.sku}</td>
                      <td className="px-5 py-3 text-sm text-gray-700 max-w-[200px] truncate">{line.product_name}</td>
                      <td className="px-5 py-3 text-xs text-gray-400 font-mono">{line.lot_number || '—'}</td>
                      <td className="px-5 py-3 text-right text-sm font-medium text-gray-900">{line.expected_quantity}</td>
                      <td className="px-5 py-3 text-right text-sm text-gray-700">
                        {line.counted_quantity ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {isDiscrepancy ? (
                          <span className={`font-bold text-sm ${diff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </span>
                        ) : (
                          <Check className="w-4 h-4 text-emerald-500 ml-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-gray-700">Total</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">{totalExpected}</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">{totalCounted}</td>
                  <td className={`px-5 py-3 text-right font-bold text-sm ${
                    totalCounted - totalExpected === 0 ? 'text-emerald-600'
                    : totalCounted > totalExpected ? 'text-emerald-600'
                    : 'text-red-500'
                  }`}>
                    {totalCounted - totalExpected > 0 ? '+' : ''}{totalCounted - totalExpected}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
