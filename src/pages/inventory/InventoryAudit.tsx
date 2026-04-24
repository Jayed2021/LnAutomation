import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import LocationSearchGrid from '../../components/inventory/LocationSearchGrid';
import AuditByProduct from './AuditByProduct';
import {
  Plus, ClipboardList, Check, X, AlertTriangle, ChevronRight,
  RefreshCw, Calendar, CheckCircle, Clock, ChevronDown, ChevronUp,
  Info, Flag, History, Package
} from 'lucide-react';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface AuditRecord {
  id: string;
  audit_date: string;
  status: 'in_progress' | 'completed';
  accuracy_percentage: number | null;
  notes: string | null;
  conducted_by: string | null;
  created_at: string;
  location_ids: string[];
  location_names: string;
}

interface Location {
  id: string;
  code: string;
  name: string;
  warehouse_name: string;
}

interface AuditLine {
  lot_id: string | null;
  product_id: string;
  sku: string;
  product_name: string;
  lot_number: string | null;
  location_id: string;
  location_code: string;
  expected_quantity: number;
  counted_quantity: number;
}

interface AuditFlag {
  id: string;
  location_id: string;
  location_code: string;
  product_id: string;
  sku: string;
  product_name: string;
  lot_id: string | null;
  lot_number: string | null;
  trigger_type: 'large_variance' | 'fulfillment_overcount';
  variance_percentage: number | null;
  expected_quantity: number | null;
  counted_quantity: number | null;
  status: 'open' | 'resolved';
  created_at: string;
}

interface StockMovement {
  id: string;
  created_at: string;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
  notes: string | null;
  from_location: string | null;
  to_location: string | null;
}

interface Schedule {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  location_ids: string[];
  location_names: string | null;
  next_due_date: string | null;
  last_completed_date: string | null;
  is_active: boolean;
  created_at: string;
  session_count: number;
}

type AuditStep = 'list' | 'select_locations' | 'count' | 'review';
type TabView = 'audits' | 'cycle_counts' | 'product_audit';
type CycleView = 'list' | 'new_schedule' | 'start_count';

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────

const VARIANCE_THRESHOLD = 0.20;

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly'
};

const FREQUENCY_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30
};

const movementConfig: Record<string, { label: string; positive: boolean }> = {
  receipt: { label: 'Receipt', positive: true },
  sale: { label: 'Sale', positive: false },
  return_restock: { label: 'Return Restock', positive: true },
  adjustment: { label: 'Adjustment', positive: true },
  transfer: { label: 'Transfer', positive: true },
  damaged: { label: 'Damaged', positive: false },
};

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(nextDue: string | null): boolean {
  if (!nextDue) return false;
  return nextDue < todayStr();
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' });
}

// ────────────────────────────────────────────
// Flag Detail Panel
// ────────────────────────────────────────────

function FlagHistoryPanel({
  flag,
  onClose,
  onStartAudit
}: {
  flag: AuditFlag;
  onClose: () => void;
  onStartAudit: (locationIds: string[]) => void;
}) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMovements();
  }, []);

  const loadMovements = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('stock_movements')
        .select(`
          id, created_at, movement_type, quantity, reference_type, notes,
          from_loc:warehouse_locations!from_location_id(code),
          to_loc:warehouse_locations!to_location_id(code)
        `)
        .eq('product_id', flag.product_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (flag.lot_id) {
        query = (query as any).eq('lot_id', flag.lot_id);
      }

      const { data } = await query;
      setMovements((data || []).map((m: any) => ({
        id: m.id,
        created_at: m.created_at,
        movement_type: m.movement_type,
        quantity: m.quantity,
        reference_type: m.reference_type,
        notes: m.notes,
        from_location: m.from_loc?.code || null,
        to_location: m.to_loc?.code || null,
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const triggerLabel = flag.trigger_type === 'large_variance' ? 'Large Variance' : 'Fulfillment Overcount';
  const triggerStyle = flag.trigger_type === 'large_variance'
    ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-700 bg-red-50 border-red-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Panel header */}
        <div className="p-5 border-b border-gray-200 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flag className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-gray-900">Flag Details</h3>
            </div>
            <p className="text-sm text-gray-500 font-mono">
              {flag.sku} · Lot {flag.lot_number || 'N/A'} · {flag.location_code}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trigger summary */}
        <div className="p-5 border-b border-gray-200 space-y-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${triggerStyle}`}>
            <AlertTriangle className="w-4 h-4" />
            {triggerLabel}
            {flag.variance_percentage !== null && (
              <span className="ml-1">— {flag.variance_percentage.toFixed(1)}% gap</span>
            )}
          </div>

          {flag.trigger_type === 'large_variance' && flag.expected_quantity !== null && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase">Expected</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{flag.expected_quantity}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase">Counted</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{flag.counted_quantity ?? '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase">Difference</p>
                <p className={`text-xl font-bold mt-1 ${
                  (flag.counted_quantity ?? 0) > (flag.expected_quantity ?? 0) ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {flag.counted_quantity !== null && flag.expected_quantity !== null
                    ? ((flag.counted_quantity - flag.expected_quantity) > 0 ? '+' : '') + (flag.counted_quantity - flag.expected_quantity)
                    : '—'}
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400">Flagged on {formatDateTime(flag.created_at)}</p>

          <Button
            onClick={() => onStartAudit([flag.location_id])}
            className="w-full flex items-center justify-center gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            Start Targeted Audit for this Location
          </Button>
        </div>

        {/* Movement history */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-gray-400" />
            <h4 className="font-semibold text-gray-700 text-sm">Stock Movement History</h4>
            <span className="text-xs text-gray-400">(this lot)</span>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading movements...</p>
          ) : movements.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No movements found for this lot</p>
          ) : (
            <div className="space-y-2">
              {movements.map(m => {
                const cfg = movementConfig[m.movement_type] || { label: m.movement_type, positive: m.quantity >= 0 };
                const isPos = m.quantity > 0;
                return (
                  <div key={m.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-gray-800">{cfg.label}</span>
                          {(m.from_location || m.to_location) && (
                            <span className="text-xs text-gray-400 font-mono">
                              {m.from_location || '—'}{m.to_location ? ` → ${m.to_location}` : ''}
                            </span>
                          )}
                        </div>
                        {m.notes && <p className="text-xs text-gray-500">{m.notes}</p>}
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(m.created_at)}</p>
                      </div>
                      <span className={`font-bold text-base whitespace-nowrap ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isPos ? '+' : ''}{m.quantity}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────

export default function InventoryAudit() {
  const { user } = useAuth();
  const { lastRefreshed, setRefreshing } = useRefresh();
  const navigate = useNavigate();

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabView>('audits');
  const [infoExpanded, setInfoExpanded] = useState(false);

  // Audit tab state
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [step, setStep] = useState<AuditStep>('list');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [auditLines, setAuditLines] = useState<AuditLine[]>([]);
  const [auditNotes, setAuditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Flags
  const [flags, setFlags] = useState<AuditFlag[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<AuditFlag | null>(null);

  // Cycle counts state
  const [cycleView, setCycleView] = useState<CycleView>('list');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [cycleForm, setCycleForm] = useState({
    name: '',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    next_due_date: todayStr(),
    selectedLocations: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, [lastRefreshed]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [auditRes, locRes, schedRes, flagsRes] = await Promise.all([
        supabase.from('inventory_audits').select('*, users(full_name)').order('created_at', { ascending: false }),
        supabase.from('warehouse_locations').select('id, code, name, warehouses(name)').eq('is_active', true).order('code'),
        supabase.from('inventory_cycle_count_schedules')
          .select('*, inventory_cycle_count_sessions(id)')
          .eq('is_active', true)
          .order('next_due_date', { ascending: true }),
        supabase.from('audit_flags')
          .select(`
            id, location_id, product_id, lot_id, trigger_type,
            variance_percentage, expected_quantity, counted_quantity,
            status, created_at,
            warehouse_locations(code),
            products(sku, name),
            inventory_lots(lot_number)
          `)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
      ]);

      const { data: locsData } = await supabase.from('warehouse_locations').select('id, code');
      const locCodeMap: Record<string, string> = {};
      (locsData || []).forEach((l: any) => { locCodeMap[l.id] = l.code; });

      setAudits((auditRes.data || []).map((a: any) => ({
        id: a.id,
        audit_date: a.audit_date,
        status: a.status,
        accuracy_percentage: a.accuracy_percentage,
        notes: a.notes,
        conducted_by: a.users?.full_name || null,
        created_at: a.created_at,
        location_ids: a.location_ids || [],
        location_names: a.location_names || (a.location_ids || []).map((id: string) => locCodeMap[id] || id).join(', ')
      })));

      setLocations((locRes.data || []).map((l: any) => ({
        id: l.id,
        code: l.code,
        name: l.name,
        warehouse_name: l.warehouses?.name || ''
      })));

      setSchedules((schedRes.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        frequency: s.frequency,
        location_ids: s.location_ids || [],
        location_names: s.location_names,
        next_due_date: s.next_due_date,
        last_completed_date: s.last_completed_date,
        is_active: s.is_active,
        created_at: s.created_at,
        session_count: (s.inventory_cycle_count_sessions || []).length
      })));

      setFlags((flagsRes.data || []).map((f: any) => ({
        id: f.id,
        location_id: f.location_id,
        location_code: (f.warehouse_locations as any)?.code || '?',
        product_id: f.product_id,
        sku: (f.products as any)?.sku || '?',
        product_name: (f.products as any)?.name || 'Unknown',
        lot_id: f.lot_id,
        lot_number: (f.inventory_lots as any)?.lot_number || null,
        trigger_type: f.trigger_type,
        variance_percentage: f.variance_percentage,
        expected_quantity: f.expected_quantity,
        counted_quantity: f.counted_quantity,
        status: f.status,
        created_at: f.created_at,
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Audit flow ──────────────────────────────

  const generateAuditLines = async () => {
    if (selectedLocations.length === 0) return;
    setSaving(true);
    try {
      const { data: lots } = await supabase
        .from('inventory_lots')
        .select('id, lot_number, product_id, location_id, remaining_quantity, products(sku, name), warehouse_locations(code)')
        .in('location_id', selectedLocations)
        .gt('remaining_quantity', 0);

      const lines: AuditLine[] = (lots || []).map((l: any) => ({
        lot_id: l.id,
        product_id: l.product_id,
        sku: l.products?.sku || '?',
        product_name: l.products?.name || 'Unknown',
        lot_number: l.lot_number,
        location_id: l.location_id,
        location_code: l.warehouse_locations?.code || '?',
        expected_quantity: l.remaining_quantity,
        counted_quantity: l.remaining_quantity
      }));

      setAuditLines(lines);
      setStep('count');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const submitAudit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const locationSnapshot = locations
        .filter(l => selectedLocations.includes(l.id))
        .map(l => l.code)
        .join(', ');

      const { data: audit, error: auditError } = await supabase
        .from('inventory_audits')
        .insert({
          audit_date: today,
          location_ids: selectedLocations,
          location_names: locationSnapshot,
          conducted_by: user.id,
          status: 'completed',
          notes: auditNotes || null,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (auditError) throw auditError;

      const totalLines = auditLines.length;
      const accurateLines = auditLines.filter(l => l.counted_quantity === l.expected_quantity).length;
      const accuracy = totalLines > 0 ? (accurateLines / totalLines) * 100 : 100;

      await supabase.from('inventory_audits').update({ accuracy_percentage: accuracy }).eq('id', audit.id);

      await supabase.from('inventory_audit_lines').insert(
        auditLines.map(l => ({
          audit_id: audit.id,
          product_id: l.product_id,
          lot_id: l.lot_id,
          location_id: l.location_id,
          expected_quantity: l.expected_quantity,
          counted_quantity: l.counted_quantity,
          difference: l.counted_quantity - l.expected_quantity
        }))
      );

      const adjustments = auditLines.filter(l => l.counted_quantity !== l.expected_quantity);
      if (adjustments.length > 0) {
        await supabase.from('stock_movements').insert(
          adjustments.map(l => ({
            movement_type: 'adjustment',
            product_id: l.product_id,
            lot_id: l.lot_id,
            to_location_id: l.location_id,
            quantity: l.counted_quantity - l.expected_quantity,
            reference_type: 'audit',
            reference_id: audit.id,
            notes: `Audit adjustment: ${l.lot_number}`,
            performed_by: user.id
          }))
        );
        for (const line of adjustments) {
          if (line.lot_id) {
            await supabase.from('inventory_lots')
              .update({ remaining_quantity: line.counted_quantity })
              .eq('id', line.lot_id);
          }
        }
      }

      // Fire large_variance flags for lines with >= 20% gap
      const flagCandidates = auditLines.filter(l => {
        if (l.expected_quantity === 0) return false;
        const pct = Math.abs(l.counted_quantity - l.expected_quantity) / l.expected_quantity;
        return pct >= VARIANCE_THRESHOLD;
      });

      if (flagCandidates.length > 0) {
        const lotIds = flagCandidates.map(l => l.lot_id).filter(Boolean) as string[];
        const { data: existingFlags } = await supabase
          .from('audit_flags')
          .select('lot_id')
          .eq('status', 'open')
          .in('lot_id', lotIds);

        const alreadyFlagged = new Set((existingFlags || []).map((f: any) => f.lot_id));

        const newFlags = flagCandidates
          .filter(l => l.lot_id && !alreadyFlagged.has(l.lot_id))
          .map(l => {
            const pct = Math.abs(l.counted_quantity - l.expected_quantity) / l.expected_quantity * 100;
            return {
              location_id: l.location_id,
              product_id: l.product_id,
              lot_id: l.lot_id,
              trigger_type: 'large_variance',
              variance_percentage: Math.round(pct * 100) / 100,
              expected_quantity: l.expected_quantity,
              counted_quantity: l.counted_quantity,
              status: 'open'
            };
          });

        if (newFlags.length > 0) {
          await supabase.from('audit_flags').insert(newFlags);
        }
      }

      // Auto-resolve open flags for lots that are now within threshold
      const resolvedLotIds = auditLines
        .filter(l => {
          if (!l.lot_id) return false;
          if (l.expected_quantity === 0) return true;
          const pct = Math.abs(l.counted_quantity - l.expected_quantity) / l.expected_quantity;
          return pct < VARIANCE_THRESHOLD;
        })
        .map(l => l.lot_id) as string[];

      if (resolvedLotIds.length > 0) {
        await supabase
          .from('audit_flags')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
            resolved_by_audit_id: audit.id
          })
          .eq('status', 'open')
          .in('lot_id', resolvedLotIds);
      }

      setStep('list');
      setSelectedLocations([]);
      setAuditLines([]);
      setAuditNotes('');
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const startTargetedAudit = (locationIds: string[]) => {
    setSelectedFlag(null);
    setSelectedLocations(locationIds);
    setTab('audits');
    setStep('select_locations');
  };

  // ── Cycle Counts ────────────────────────────

  const createSchedule = async () => {
    if (!user || !cycleForm.name || cycleForm.selectedLocations.length === 0) return;
    setSaving(true);
    try {
      const locationSnapshot = locations
        .filter(l => cycleForm.selectedLocations.includes(l.id))
        .map(l => l.code)
        .join(', ');

      const { error } = await supabase.from('inventory_cycle_count_schedules').insert({
        name: cycleForm.name,
        frequency: cycleForm.frequency,
        location_ids: cycleForm.selectedLocations,
        location_names: locationSnapshot,
        next_due_date: cycleForm.next_due_date,
        created_by: user.id
      });

      if (error) throw error;
      setCycleForm({ name: '', frequency: 'weekly', next_due_date: todayStr(), selectedLocations: [] });
      setCycleView('list');
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const deactivateSchedule = async (scheduleId: string) => {
    await supabase.from('inventory_cycle_count_schedules').update({ is_active: false }).eq('id', scheduleId);
    loadData();
  };

  const launchAudit = async () => {
    if (!activeSchedule || !user) return;
    setSaving(true);
    try {
      const { data: auditData, error: auditError } = await supabase
        .from('inventory_audits')
        .insert({
          audit_date: todayStr(),
          location_ids: activeSchedule.location_ids,
          location_names: activeSchedule.location_names,
          conducted_by: user.id,
          status: 'in_progress',
          notes: `Cycle count: ${activeSchedule.name}`
        })
        .select()
        .single();

      if (auditError) throw auditError;

      const nextDue = addDays(todayStr(), FREQUENCY_DAYS[activeSchedule.frequency]);

      await Promise.all([
        supabase.from('inventory_cycle_count_sessions').insert({
          schedule_id: activeSchedule.id,
          audit_id: auditData.id,
          created_by: user.id
        }),
        supabase.from('inventory_cycle_count_schedules').update({
          last_completed_date: todayStr(),
          next_due_date: nextDue,
          updated_at: new Date().toISOString()
        }).eq('id', activeSchedule.id)
      ]);

      setCycleView('list');
      setActiveSchedule(null);
      navigate(`/inventory/audit/${auditData.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Derived values ───────────────────────────

  const discrepancyCount = auditLines.filter(l => l.counted_quantity !== l.expected_quantity).length;
  const accuracy = auditLines.length > 0
    ? Math.round(auditLines.filter(l => l.counted_quantity === l.expected_quantity).length / auditLines.length * 100)
    : 100;
  const overdueCount = schedules.filter(s => isOverdue(s.next_due_date)).length;
  const dueToday = schedules.filter(s => s.next_due_date === todayStr()).length;

  // ── Audit wizard: step views ─────────────────

  if (step === 'select_locations') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setStep('list'); setSelectedLocations([]); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Audit</h1>
            <p className="text-sm text-gray-500 mt-1">Step 1 of 3: Select locations to audit</p>
          </div>
        </div>
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Select Locations</h3>
          <LocationSearchGrid
            locations={locations}
            selected={selectedLocations}
            onChange={setSelectedLocations}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => { setStep('list'); setSelectedLocations([]); }}>Cancel</Button>
            <Button onClick={generateAuditLines} disabled={saving || selectedLocations.length === 0}>
              {saving ? 'Loading...' : `Generate Audit Sheet (${selectedLocations.length} location${selectedLocations.length !== 1 ? 's' : ''})`}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'count') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setStep('select_locations')} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Count</h1>
            <p className="text-sm text-gray-500 mt-1">Step 2 of 3: Enter counted quantities</p>
          </div>
        </div>
        <Card>
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {auditLines.length} lot lines across {selectedLocations.length} location{selectedLocations.length !== 1 ? 's' : ''}
              </span>
              {discrepancyCount > 0 && (
                <Badge variant="amber">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {discrepancyCount} discrepancies
                  </span>
                </Badge>
              )}
            </div>
            <Button onClick={() => setStep('review')}>Review & Submit</Button>
          </div>
          {auditLines.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No stock found in selected locations</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU / Lot</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Counted</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {auditLines.map((line, idx) => {
                    const diff = line.counted_quantity - line.expected_quantity;
                    return (
                      <tr key={idx} className={diff !== 0 ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                        <td className="px-5 py-3">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{line.location_code}</span>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm font-semibold text-gray-900">{line.sku}</p>
                          <p className="text-xs text-gray-400 font-mono">{line.lot_number}</p>
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-medium text-gray-900">{line.expected_quantity}</td>
                        <td className="px-5 py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={line.counted_quantity}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              setAuditLines(prev => prev.map((l, i) => i === idx ? { ...l, counted_quantity: val } : l));
                            }}
                            className={`w-20 text-right px-2 py-1 border rounded text-sm ${
                              diff !== 0 ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
                            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                          />
                        </td>
                        <td className="px-5 py-3 text-right">
                          {diff !== 0 ? (
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
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (step === 'review') {
    const willFlagCount = auditLines.filter(l => {
      if (l.expected_quantity === 0) return false;
      return Math.abs(l.counted_quantity - l.expected_quantity) / l.expected_quantity >= VARIANCE_THRESHOLD;
    }).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setStep('count')} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Review & Submit</h1>
            <p className="text-sm text-gray-500 mt-1">Step 3 of 3: Confirm and submit audit</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5">
            <p className="text-xs text-gray-500 uppercase">Accuracy</p>
            <p className={`text-3xl font-bold mt-1 ${accuracy >= 95 ? 'text-emerald-600' : accuracy >= 80 ? 'text-amber-600' : 'text-red-500'}`}>
              {accuracy}%
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-gray-500 uppercase">Discrepancies</p>
            <p className={`text-3xl font-bold mt-1 ${discrepancyCount === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {discrepancyCount}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-gray-500 uppercase">Lines Counted</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{auditLines.length}</p>
          </Card>
        </div>

        {willFlagCount > 0 && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Flag className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {willFlagCount} line{willFlagCount > 1 ? 's' : ''} will be flagged after submission
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                These have a 20% or greater gap between expected and counted quantity.
                They will appear under Flagged Locations for follow-up.
              </p>
            </div>
          </div>
        )}

        {discrepancyCount > 0 && (
          <Card>
            <div className="p-5 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Discrepancies ({discrepancyCount})</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Counted</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Difference</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gap %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {auditLines.filter(l => l.counted_quantity !== l.expected_quantity).map((line, idx) => {
                  const diff = line.counted_quantity - line.expected_quantity;
                  const pct = line.expected_quantity > 0
                    ? Math.abs(diff) / line.expected_quantity * 100
                    : null;
                  const willFlag = pct !== null && pct >= 20;
                  return (
                    <tr key={idx} className="bg-amber-50">
                      <td className="px-5 py-3 font-mono text-sm">{line.location_code}</td>
                      <td className="px-5 py-3 text-sm font-semibold">{line.sku}</td>
                      <td className="px-5 py-3 text-right text-sm">{line.expected_quantity}</td>
                      <td className="px-5 py-3 text-right text-sm">{line.counted_quantity}</td>
                      <td className={`px-5 py-3 text-right font-bold text-sm ${diff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {pct !== null ? (
                          <span className={`text-xs font-semibold flex items-center justify-end gap-1 ${willFlag ? 'text-amber-700' : 'text-gray-500'}`}>
                            {willFlag && <Flag className="w-3 h-3" />}
                            {pct.toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}

        <Card className="p-5">
          <label className="text-sm font-medium text-gray-700">Audit Notes (optional)</label>
          <textarea
            value={auditNotes}
            onChange={e => setAuditNotes(e.target.value)}
            rows={3}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Any observations, issues, or notes..."
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setStep('count')}>Back to Count</Button>
            <Button onClick={submitAudit} disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Audit & Apply Adjustments'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Cycle Counts wizard ──────────────────────

  if (cycleView === 'new_schedule') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setCycleView('list')} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Cycle Count Schedule</h1>
            <p className="text-sm text-gray-500 mt-1">Set up a recurring count for a group of locations</p>
          </div>
        </div>
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Name</label>
              <input
                type="text"
                value={cycleForm.name}
                onChange={e => setCycleForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Weekly A-Row, Monthly Full Count"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={cycleForm.frequency}
                onChange={e => setCycleForm(prev => ({ ...prev, frequency: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Due Date</label>
              <input
                type="date"
                value={cycleForm.next_due_date}
                onChange={e => setCycleForm(prev => ({ ...prev, next_due_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Locations to Count</h3>
            <LocationSearchGrid
              locations={locations}
              selected={cycleForm.selectedLocations}
              onChange={sel => setCycleForm(prev => ({ ...prev, selectedLocations: sel }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setCycleView('list')}>Cancel</Button>
            <Button
              onClick={createSchedule}
              disabled={saving || !cycleForm.name || cycleForm.selectedLocations.length === 0}
            >
              {saving ? 'Creating...' : 'Create Schedule'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (cycleView === 'start_count' && activeSchedule) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setCycleView('list'); setActiveSchedule(null); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Start Count</h1>
            <p className="text-sm text-gray-500 mt-1">{activeSchedule.name}</p>
          </div>
        </div>
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Frequency</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{FREQUENCY_LABELS[activeSchedule.frequency]}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Locations</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{activeSchedule.location_ids.length}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Sessions Completed</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{activeSchedule.session_count}</p>
            </div>
          </div>
          {activeSchedule.location_names && (
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Locations</p>
              <p className="text-sm text-gray-700 font-mono bg-gray-50 p-3 rounded-lg">{activeSchedule.location_names}</p>
            </div>
          )}
          <p className="text-sm text-gray-600">
            This will create a new audit session pre-populated with all inventory in the assigned locations.
            After the count is submitted, the next due date will be updated automatically.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setCycleView('list'); setActiveSchedule(null); }}>Cancel</Button>
            <Button onClick={launchAudit} disabled={saving}>
              {saving ? 'Creating audit...' : 'Start Count Now'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Main list view ───────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Audit</h1>
          <p className="text-sm text-gray-500 mt-1">Physical stock counts, cycle counting, and variance tracking</p>
        </div>
        {tab === 'audits' && (
          <Button onClick={() => setStep('select_locations')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Audit
          </Button>
        )}
        {tab === 'cycle_counts' && (
          <Button onClick={() => setCycleView('new_schedule')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Schedule
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setTab('audits')}
            className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === 'audits'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Audit History
              {flags.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {flags.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setTab('cycle_counts')}
            className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === 'cycle_counts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Cycle Counts
              {overdueCount > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {overdueCount} overdue
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setTab('product_audit')}
            className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === 'product_audit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Audit by Product
            </span>
          </button>
        </nav>
      </div>

      {/* ── Audits tab ── */}
      {tab === 'audits' && (
        <div className="space-y-5">
          {/* Flagged Locations */}
          {flags.length > 0 ? (
            <Card>
              <div className="p-5 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-gray-900">Flagged Locations</h3>
                  <Badge variant="amber">{flags.length} open</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  These locations need a spot-check. Click a flag to see the movement history and start a targeted audit.
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {flags.map(flag => (
                  <div
                    key={flag.id}
                    onClick={() => setSelectedFlag(flag)}
                    className="p-4 hover:bg-amber-50 cursor-pointer transition-colors flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-lg ${
                        flag.trigger_type === 'large_variance' ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                        <AlertTriangle className={`w-3.5 h-3.5 ${
                          flag.trigger_type === 'large_variance' ? 'text-amber-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-gray-900">{flag.location_code}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-sm text-gray-700">{flag.sku}</span>
                          {flag.lot_number && (
                            <>
                              <span className="text-gray-400">·</span>
                              <span className="text-xs font-mono text-gray-500">{flag.lot_number}</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{flag.product_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant={flag.trigger_type === 'large_variance' ? 'amber' : 'red'}>
                            {flag.trigger_type === 'large_variance' ? 'Large Variance' : 'Fulfillment Overcount'}
                          </Badge>
                          {flag.variance_percentage !== null && (
                            <span className="text-xs text-gray-500">{flag.variance_percentage.toFixed(1)}% gap</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">
                        {new Date(flag.created_at).toLocaleDateString('en-BD', { day: '2-digit', month: 'short' })}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">All clear — no flagged locations</p>
            </div>
          )}

          {/* Audit History */}
          <Card>
            <div className="p-5 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Audit History</h3>
            </div>
            {loading ? (
              <div className="py-16 text-center text-gray-400">Loading...</div>
            ) : audits.length === 0 ? (
              <div className="py-16 text-center">
                <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400">No audits conducted yet</p>
                <p className="text-xs text-gray-400 mt-1">Start a new audit to track physical stock accuracy</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Locations</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conducted By</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Accuracy</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {audits.map(a => (
                    <tr
                      key={a.id}
                      onClick={() => navigate(`/inventory/audit/${a.id}`)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4 text-sm text-gray-900">{a.audit_date}</td>
                      <td className="px-5 py-4 text-sm text-gray-500 font-mono max-w-xs truncate">{a.location_names || '—'}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{a.conducted_by || '—'}</td>
                      <td className="px-5 py-4 text-center">
                        {a.accuracy_percentage !== null ? (
                          <span className={`font-bold text-sm ${
                            a.accuracy_percentage >= 95 ? 'text-emerald-600'
                            : a.accuracy_percentage >= 80 ? 'text-amber-600'
                            : 'text-red-500'
                          }`}>
                            {a.accuracy_percentage.toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={a.status === 'completed' ? 'emerald' : 'amber'}>
                          {a.status === 'completed' ? 'Completed' : 'In Progress'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* ── Cycle Counts tab ── */}
      {tab === 'cycle_counts' && (
        <div className="space-y-5">
          {/* Explainer */}
          <div className="border border-blue-200 bg-blue-50 rounded-lg overflow-hidden">
            <button
              onClick={() => setInfoExpanded(p => !p)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-sm font-semibold text-blue-800">What is cycle counting?</span>
              </div>
              {infoExpanded
                ? <ChevronUp className="w-4 h-4 text-blue-500" />
                : <ChevronDown className="w-4 h-4 text-blue-500" />}
            </button>
            {infoExpanded && (
              <div className="px-5 pb-5 text-sm text-blue-900 leading-relaxed border-t border-blue-200 pt-4 space-y-2">
                <p>
                  Instead of shutting down operations for a full warehouse count, cycle counting lets you split your
                  warehouse into zones and count each zone on a rotating schedule. Each zone gets counted daily, weekly,
                  or monthly depending on how fast-moving it is.
                </p>
                <p>
                  A cycle count session automatically generates an audit sheet pre-filled with what the system expects
                  to find. You simply walk the zone, correct any differences, and submit. Over time, this keeps your
                  records accurate without any big disruptions.
                </p>
                <p>
                  Any location showing a 20% or greater gap between expected and counted stock will automatically
                  appear as a <strong>Flagged Location</strong> on the Audit History tab, prompting a follow-up
                  spot-check. Once you re-audit that location and the gap is resolved, the flag clears automatically.
                </p>
              </div>
            )}
          </div>

          {/* Overdue / due today alerts */}
          {!loading && schedules.length > 0 && (overdueCount > 0 || dueToday > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overdueCount > 0 && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700 font-medium">
                    {overdueCount} schedule{overdueCount > 1 ? 's are' : ' is'} overdue
                  </p>
                </div>
              )}
              {dueToday > 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-700 font-medium">
                    {dueToday} schedule{dueToday > 1 ? 's are' : ' is'} due today
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Schedules */}
          <Card>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Active Schedules</h3>
              <span className="text-sm text-gray-500">{schedules.length} schedule{schedules.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-gray-400">Loading...</div>
            ) : schedules.length === 0 ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 font-medium">No cycle count schedules yet</p>
                <p className="text-xs text-gray-400 mt-1">Create a schedule to start recurring counts for your warehouse locations</p>
                <Button className="mt-4" onClick={() => setCycleView('new_schedule')}>
                  <Plus className="w-4 h-4 mr-2" /> Create First Schedule
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {schedules.map(s => {
                  const overdue = isOverdue(s.next_due_date);
                  const dueNow = s.next_due_date === todayStr();
                  return (
                    <div
                      key={s.id}
                      className={`p-5 hover:bg-gray-50 transition-colors ${
                        overdue ? 'border-l-4 border-red-400' : dueNow ? 'border-l-4 border-amber-400' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold text-gray-900">{s.name}</h4>
                            <Badge variant={overdue ? 'red' : dueNow ? 'amber' : 'blue'}>
                              {overdue ? 'Overdue' : dueNow ? 'Due Today' : FREQUENCY_LABELS[s.frequency]}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 font-mono truncate">
                            {s.location_names || `${s.location_ids.length} locations`}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Next due:{' '}
                              <span className={`font-medium ${
                                overdue ? 'text-red-500' : dueNow ? 'text-amber-600' : 'text-gray-600'
                              }`}>
                                {s.next_due_date || 'Not set'}
                              </span>
                            </span>
                            {s.last_completed_date && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                Last done: <span className="font-medium text-gray-600">{s.last_completed_date}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <ClipboardList className="w-3 h-3" />
                              {s.session_count} session{s.session_count !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            onClick={() => { setActiveSchedule(s); setCycleView('start_count'); }}
                            className="flex items-center gap-2 text-sm"
                          >
                            <ChevronRight className="w-4 h-4" />
                            Start Count
                          </Button>
                          <button
                            onClick={() => deactivateSchedule(s.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deactivate schedule"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Audit by Product tab ── */}
      {tab === 'product_audit' && (
        <AuditByProduct onBack={() => setTab('audits')} />
      )}

      {/* Flag detail slide-in panel */}
      {selectedFlag && (
        <FlagHistoryPanel
          flag={selectedFlag}
          onClose={() => setSelectedFlag(null)}
          onStartAudit={startTargetedAudit}
        />
      )}
    </div>
  );
}
