import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import LocationSearchGrid from '../../components/inventory/LocationSearchGrid';
import {
  Plus, RefreshCw, ChevronRight, X, Calendar, AlertTriangle,
  CheckCircle, Clock, ClipboardList
} from 'lucide-react';

interface Location {
  id: string;
  code: string;
  name: string;
  warehouse_name: string;
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

type ViewMode = 'list' | 'new_schedule' | 'start_count';

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

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(nextDue: string | null): boolean {
  if (!nextDue) return false;
  return nextDue < today();
}

export default function CycleCounts() {
  const { user } = useAuth();
  const { lastRefreshed, setRefreshing } = useRefresh();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('list');
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    next_due_date: today(),
    selectedLocations: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, [lastRefreshed]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schedRes, locRes] = await Promise.all([
        supabase
          .from('inventory_cycle_count_schedules')
          .select('*, inventory_cycle_count_sessions(id)')
          .eq('is_active', true)
          .order('next_due_date', { ascending: true }),
        supabase
          .from('warehouse_locations')
          .select('id, code, name, warehouses(name)')
          .eq('is_active', true)
          .order('code')
      ]);

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

      setLocations((locRes.data || []).map((l: any) => ({
        id: l.id,
        code: l.code,
        name: l.name,
        warehouse_name: l.warehouses?.name || ''
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const createSchedule = async () => {
    if (!user || !form.name || form.selectedLocations.length === 0) return;
    setSaving(true);
    try {
      const locationSnapshot = locations
        .filter(l => form.selectedLocations.includes(l.id))
        .map(l => l.code)
        .join(', ');

      const { error } = await supabase.from('inventory_cycle_count_schedules').insert({
        name: form.name,
        frequency: form.frequency,
        location_ids: form.selectedLocations,
        location_names: locationSnapshot,
        next_due_date: form.next_due_date,
        created_by: user.id
      });

      if (error) throw error;
      setForm({ name: '', frequency: 'weekly', next_due_date: today(), selectedLocations: [] });
      setView('list');
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const deactivateSchedule = async (scheduleId: string) => {
    await supabase
      .from('inventory_cycle_count_schedules')
      .update({ is_active: false })
      .eq('id', scheduleId);
    loadData();
  };

  const startCount = (schedule: Schedule) => {
    setActiveSchedule(schedule);
    setView('start_count');
  };

  const launchAudit = async () => {
    if (!activeSchedule || !user) return;
    setSaving(true);
    try {
      const { data: auditData, error: auditError } = await supabase
        .from('inventory_audits')
        .insert({
          audit_date: today(),
          location_ids: activeSchedule.location_ids,
          location_names: activeSchedule.location_names,
          conducted_by: user.id,
          status: 'in_progress',
          notes: `Cycle count: ${activeSchedule.name}`
        })
        .select()
        .single();

      if (auditError) throw auditError;

      const nextDue = addDays(today(), FREQUENCY_DAYS[activeSchedule.frequency]);

      await Promise.all([
        supabase.from('inventory_cycle_count_sessions').insert({
          schedule_id: activeSchedule.id,
          audit_id: auditData.id,
          created_by: user.id
        }),
        supabase.from('inventory_cycle_count_schedules').update({
          last_completed_date: today(),
          next_due_date: nextDue,
          updated_at: new Date().toISOString()
        }).eq('id', activeSchedule.id)
      ]);

      setView('list');
      setActiveSchedule(null);
      navigate(`/inventory/audit/${auditData.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const overdueCount = schedules.filter(s => isOverdue(s.next_due_date)).length;
  const dueToday = schedules.filter(s => s.next_due_date === today()).length;

  if (view === 'new_schedule') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="text-gray-400 hover:text-gray-600">
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
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Weekly A-Row, Monthly Full Count"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={form.frequency}
                onChange={e => setForm(prev => ({ ...prev, frequency: e.target.value as any }))}
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
                value={form.next_due_date}
                onChange={e => setForm(prev => ({ ...prev, next_due_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Locations to Count</h3>
            <LocationSearchGrid
              locations={locations}
              selected={form.selectedLocations}
              onChange={sel => setForm(prev => ({ ...prev, selectedLocations: sel }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
            <Button
              onClick={createSchedule}
              disabled={saving || !form.name || form.selectedLocations.length === 0}
            >
              {saving ? 'Creating...' : 'Create Schedule'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (view === 'start_count' && activeSchedule) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setView('list'); setActiveSchedule(null); }} className="text-gray-400 hover:text-gray-600">
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
            <Button variant="outline" onClick={() => { setView('list'); setActiveSchedule(null); }}>Cancel</Button>
            <Button onClick={launchAudit} disabled={saving}>
              {saving ? 'Creating audit...' : 'Start Count Now'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cycle Counts</h1>
          <p className="text-sm text-gray-500 mt-1">Recurring location-based inventory count schedules</p>
        </div>
        <Button onClick={() => setView('new_schedule')} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Schedule
        </Button>
      </div>

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
            <Button className="mt-4" onClick={() => setView('new_schedule')}>
              <Plus className="w-4 h-4 mr-2" /> Create First Schedule
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {schedules.map(s => {
              const overdue = isOverdue(s.next_due_date);
              const dueNow = s.next_due_date === today();
              return (
                <div key={s.id} className={`p-5 hover:bg-gray-50 transition-colors ${overdue ? 'border-l-4 border-red-400' : dueNow ? 'border-l-4 border-amber-400' : ''}`}>
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
                          Next due: <span className={`font-medium ${overdue ? 'text-red-500' : dueNow ? 'text-amber-600' : 'text-gray-600'}`}>
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
                        onClick={() => startCount(s)}
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
  );
}
