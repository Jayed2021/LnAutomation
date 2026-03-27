import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Users, AlertTriangle, CheckCircle2,
  Calendar, RefreshCw, ChevronRight, UserCheck, ToggleLeft, ToggleRight,
  Clock, Timer
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CsAgent {
  id: string;
  full_name: string;
  is_active: boolean;
  assignment_id: string | null;
  allocation_percentage: number;
  assignment_active: boolean;
}

interface UnassignedOrder {
  id: string;
  order_number: string;
  order_date: string;
}

interface DistributeResult {
  agentId: string;
  agentName: string;
  count: number;
}

function buildSequence(agents: CsAgent[]): string[] {
  const active = agents.filter(a => a.assignment_active && a.allocation_percentage > 0);
  if (active.length === 0) return [];
  const seq: string[] = [];
  for (const agent of active) {
    for (let i = 0; i < agent.allocation_percentage; i++) {
      seq.push(agent.id);
    }
  }
  return seq;
}

export default function CsAssignment() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [agents, setAgents] = useState<CsAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  // Auto-distribution schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleInterval, setScheduleInterval] = useState(30);
  const [scheduleLastRun, setScheduleLastRun] = useState<string | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleSavedOk, setScheduleSavedOk] = useState(false);

  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [unassignedOrders, setUnassignedOrders] = useState<UnassignedOrder[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [distributePreview, setDistributePreview] = useState<DistributeResult[]>([]);
  const [distributing, setDistributing] = useState(false);
  const [distributeResult, setDistributeResult] = useState<DistributeResult[] | null>(null);

  const totalPct = agents
    .filter(a => a.assignment_active)
    .reduce((sum, a) => sum + a.allocation_percentage, 0);

  const isValid = totalPct === 100 || agents.filter(a => a.assignment_active).length === 0;
  const hasActiveAgents = agents.some(a => a.assignment_active);

  const load = useCallback(async () => {
    setLoading(true);
    const [usersRes, assignmentsRes, settingsRes] = await Promise.all([
      supabase.from('users').select('id, full_name').eq('role', 'customer_service').eq('is_active', true).order('full_name'),
      supabase.from('cs_assignments').select('id, user_id, allocation_percentage, is_active'),
      supabase.from('app_settings').select('key, value').in('key', [
        'auto_distribution_enabled',
        'auto_distribution_interval_minutes',
        'auto_distribution_last_run',
      ]),
    ]);

    const assignmentMap = new Map<string, { id: string; allocation_percentage: number; is_active: boolean }>();
    for (const row of assignmentsRes.data ?? []) {
      assignmentMap.set(row.user_id, row);
    }

    const merged: CsAgent[] = (usersRes.data ?? []).map(u => {
      const existing = assignmentMap.get(u.id);
      return {
        id: u.id,
        full_name: u.full_name,
        is_active: true,
        assignment_id: existing?.id ?? null,
        allocation_percentage: existing?.allocation_percentage ?? 0,
        assignment_active: existing?.is_active ?? true,
      };
    });

    setAgents(merged);

    const settingsMap = new Map<string, unknown>();
    for (const row of settingsRes.data ?? []) {
      settingsMap.set(row.key, row.value);
    }
    setScheduleEnabled(settingsMap.get('auto_distribution_enabled') === true);
    setScheduleInterval(Number(settingsMap.get('auto_distribution_interval_minutes') ?? 30) || 30);
    const lastRun = settingsMap.get('auto_distribution_last_run');
    setScheduleLastRun(lastRun && lastRun !== null ? String(lastRun).replace(/^"|"$/g, '') : null);

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function setPct(id: string, val: string) {
    const num = Math.min(100, Math.max(0, parseInt(val) || 0));
    setAgents(prev => prev.map(a => a.id === id ? { ...a, allocation_percentage: num } : a));
    setSavedOk(false);
  }

  function toggleActive(id: string) {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, assignment_active: !a.assignment_active } : a));
    setSavedOk(false);
  }

  async function handleSave() {
    if (!isValid && hasActiveAgents) return;
    setSaving(true);
    setSavedOk(false);

    for (const agent of agents) {
      const payload = {
        user_id: agent.id,
        allocation_percentage: agent.allocation_percentage,
        is_active: agent.assignment_active,
        updated_at: new Date().toISOString(),
      };
      if (agent.assignment_id) {
        await supabase.from('cs_assignments').update(payload).eq('id', agent.assignment_id);
      } else {
        const { data } = await supabase.from('cs_assignments').insert(payload).select('id').single();
        if (data) {
          setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, assignment_id: data.id } : a));
        }
      }
    }

    setSaving(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 3000);
  }

  async function fetchPreview() {
    if (!isValid || !hasActiveAgents) return;
    setPreviewLoading(true);
    setDistributeResult(null);

    const NEW_STATUSES = ['new_not_called', 'new_called', 'awaiting_payment', 'late_delivery', 'send_to_lab', 'in_lab', 'not_printed'];

    const { data } = await supabase
      .from('orders')
      .select('id, order_number, order_date')
      .is('assigned_to', null)
      .in('cs_status', NEW_STATUSES)
      .gte('order_date', fromDate + 'T00:00:00')
      .lte('order_date', toDate + 'T23:59:59')
      .order('order_date', { ascending: true });

    const orders = (data ?? []) as UnassignedOrder[];
    setUnassignedOrders(orders);

    const seq = buildSequence(agents);
    if (seq.length === 0 || orders.length === 0) {
      setDistributePreview([]);
      setPreviewLoading(false);
      setShowConfirm(true);
      return;
    }

    const { data: counterRow } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'cs_assignment_counter')
      .maybeSingle();
    const offset = parseInt(counterRow?.value ?? '0') || 0;

    const countMap = new Map<string, number>();
    orders.forEach((_, idx) => {
      const agentId = seq[(offset + idx) % seq.length];
      countMap.set(agentId, (countMap.get(agentId) ?? 0) + 1);
    });

    const preview: DistributeResult[] = [];
    for (const [agentId, count] of countMap) {
      const agent = agents.find(a => a.id === agentId);
      if (agent) preview.push({ agentId, agentName: agent.full_name, count });
    }
    preview.sort((a, b) => b.count - a.count);

    setDistributePreview(preview);
    setPreviewLoading(false);
    setShowConfirm(true);
  }

  async function handleDistribute() {
    setDistributing(true);

    const seq = buildSequence(agents);
    const { data: counterRow } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'cs_assignment_counter')
      .maybeSingle();
    let offset = parseInt(counterRow?.value ?? '0') || 0;

    const updates: { id: string; assigned_to: string }[] = unassignedOrders.map((order, idx) => ({
      id: order.id,
      assigned_to: seq[(offset + idx) % seq.length],
    }));

    const resultMap = new Map<string, number>();
    for (const upd of updates) {
      await supabase.from('orders').update({ assigned_to: upd.assigned_to }).eq('id', upd.id);
      resultMap.set(upd.assigned_to, (resultMap.get(upd.assigned_to) ?? 0) + 1);
    }

    const activityLogs = updates.map(upd => ({
      order_id: upd.id,
      action: `Order auto-assigned to CS agent by bulk distribution`,
      performed_by: user?.id ?? null,
    }));
    if (activityLogs.length > 0) {
      await supabase.from('order_activity_log').insert(activityLogs);
    }

    const newCounter = (offset + unassignedOrders.length) % seq.length;
    await supabase.from('app_settings').update({ value: String(newCounter) }).eq('key', 'cs_assignment_counter');

    const finalResult: DistributeResult[] = [];
    for (const [agentId, count] of resultMap) {
      const agent = agents.find(a => a.id === agentId);
      if (agent) finalResult.push({ agentId, agentName: agent.full_name, count });
    }
    finalResult.sort((a, b) => b.count - a.count);

    setDistributeResult(finalResult);
    setDistributing(false);
    setShowConfirm(false);
    setUnassignedOrders([]);
  }

  async function handleSaveSchedule() {
    setScheduleSaving(true);
    setScheduleSavedOk(false);

    const clampedInterval = Math.min(1440, Math.max(5, scheduleInterval));

    await Promise.all([
      supabase.from('app_settings').update({ value: scheduleEnabled }).eq('key', 'auto_distribution_enabled'),
      supabase.from('app_settings').update({ value: clampedInterval }).eq('key', 'auto_distribution_interval_minutes'),
    ]);

    setScheduleInterval(clampedInterval);
    setScheduleSaving(false);
    setScheduleSavedOk(true);
    setTimeout(() => setScheduleSavedOk(false), 3000);
  }

  function formatLastRun(ts: string | null): string {
    if (!ts) return 'Never';
    try {
      return new Date(ts).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return 'Never';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CS Assignment</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure order distribution among Customer Service agents</p>
        </div>
      </div>

      {/* Automatic Distribution Schedule */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Automatic Distribution Schedule</h2>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            scheduleEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {scheduleEnabled ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-600">
            When enabled, unassigned orders from the current day are automatically distributed to CS agents in the background on the configured interval. The same round-robin sequence is used as manual distribution.
          </p>

          <div className="flex flex-wrap items-start gap-6">
            {/* Enable toggle */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Auto-Distribute</span>
              <button
                onClick={() => { setScheduleEnabled(v => !v); setScheduleSavedOk(false); }}
                className="focus:outline-none self-start"
                title={scheduleEnabled ? 'Click to disable' : 'Click to enable'}
              >
                {scheduleEnabled ? (
                  <ToggleRight className="w-10 h-10 text-green-500 hover:text-green-600 transition-colors" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-300 hover:text-gray-400 transition-colors" />
                )}
              </button>
            </div>

            {/* Interval input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Run Every</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={scheduleInterval}
                  onChange={e => { setScheduleInterval(parseInt(e.target.value) || 30); setScheduleSavedOk(false); }}
                  disabled={!scheduleEnabled}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <span className="text-sm text-gray-500 font-medium">minutes</span>
              </div>
              <span className="text-xs text-gray-400">Min: 5 &nbsp;·&nbsp; Max: 1440 (24h)</span>
            </div>

            {/* Last run */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Auto-Run</span>
              <div className="flex items-center gap-1.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{formatLastRun(scheduleLastRun)}</span>
              </div>
            </div>
          </div>

          {scheduleEnabled && (!isValid || !hasActiveAgents) && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                Auto-distribution is enabled but CS agent allocations are not configured correctly. Save a valid allocation (total 100%) to allow the schedule to run.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button
            onClick={handleSaveSchedule}
            disabled={scheduleSaving || loading}
            className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {scheduleSaving ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
            ) : scheduleSavedOk ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved</>
            ) : (
              <><Save className="w-4 h-4" /> Save Schedule</>
            )}
          </button>
        </div>
      </div>

      {/* Allocation Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Allocation Configuration</h2>
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${
            !hasActiveAgents
              ? 'bg-gray-100 text-gray-500'
              : totalPct === 100
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {!hasActiveAgents ? (
              <><Users className="w-3.5 h-3.5" /> No active agents</>
            ) : totalPct === 100 ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Total: 100%</>
            ) : (
              <><AlertTriangle className="w-3.5 h-3.5" /> Total: {totalPct}% (must equal 100%)</>
            )}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No Customer Service agents found</p>
              <p className="text-sm mt-1">Create users with the Customer Service role in User Management</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-400 uppercase tracking-wide px-4">
                <div className="col-span-5">Agent</div>
                <div className="col-span-4 text-center">Allocation %</div>
                <div className="col-span-3 text-center">Active</div>
              </div>

              {agents.map(agent => (
                <div
                  key={agent.id}
                  className={`grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg border transition-colors ${
                    agent.assignment_active
                      ? 'bg-white border-gray-200'
                      : 'bg-gray-50 border-gray-100 opacity-60'
                  }`}
                >
                  <div className="col-span-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
                        {agent.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{agent.full_name}</span>
                    </div>
                  </div>

                  <div className="col-span-4 flex items-center justify-center gap-2">
                    <div className="relative w-24">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={agent.allocation_percentage}
                        onChange={e => setPct(agent.id, e.target.value)}
                        disabled={!agent.assignment_active}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <span className="text-sm text-gray-500 font-medium">%</span>
                  </div>

                  <div className="col-span-3 flex justify-center">
                    <button
                      onClick={() => toggleActive(agent.id)}
                      className="focus:outline-none"
                      title={agent.assignment_active ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {agent.assignment_active ? (
                        <ToggleRight className="w-9 h-9 text-green-500 hover:text-green-600 transition-colors" />
                      ) : (
                        <ToggleLeft className="w-9 h-9 text-gray-300 hover:text-gray-400 transition-colors" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {hasActiveAgents && totalPct !== 100 && (
                <div className="flex items-start gap-2 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800">
                    Allocations for active agents must sum to exactly 100%. Currently at {totalPct}%.
                    {totalPct < 100 && ` Add ${100 - totalPct}% more.`}
                    {totalPct > 100 && ` Remove ${totalPct - 100}%.`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || loading || (hasActiveAgents && !isValid)}
            className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
            ) : savedOk ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved</>
            ) : (
              <><Save className="w-4 h-4" /> Save Configuration</>
            )}
          </button>
        </div>
      </div>

      {/* Distribute Unassigned Orders */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Distribute Unassigned Orders</h2>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-600">
            Assign all unassigned orders within a date range to CS agents based on their current allocation percentages. The sequence continues from where the last distribution left off.
          </p>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">From Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => { setFromDate(e.target.value); setDistributeResult(null); }}
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">To Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={toDate}
                  onChange={e => { setToDate(e.target.value); setDistributeResult(null); }}
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={fetchPreview}
              disabled={!isValid || !hasActiveAgents || previewLoading || loading}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {previewLoading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Loading...</>
              ) : (
                <>Preview & Distribute <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>

          {!isValid && hasActiveAgents && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Save a valid allocation configuration (total must equal 100%) before distributing orders.
            </div>
          )}

          {distributeResult && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-3">
              <div className="flex items-center gap-2 text-green-800 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Distribution Complete
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {distributeResult.map(r => (
                  <div key={r.agentId} className="bg-white rounded-lg border border-green-200 px-4 py-3 text-center">
                    <div className="text-2xl font-bold text-green-700">{r.count}</div>
                    <div className="text-xs text-gray-600 mt-0.5 font-medium">{r.agentName}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-green-800">
                {distributeResult.reduce((s, r) => s + r.count, 0)} orders assigned successfully.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Confirm Distribution</h3>
              <p className="text-sm text-gray-500 mt-1">Review the assignment before proceeding</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date range</span>
                  <span className="font-medium text-gray-900">{fromDate} — {toDate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Unassigned orders found</span>
                  <span className="font-bold text-gray-900">{unassignedOrders.length}</span>
                </div>
              </div>

              {unassignedOrders.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No unassigned orders found in the selected date range.
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Projected Assignment</p>
                    <div className="space-y-2">
                      {distributePreview.map(p => (
                        <div key={p.agentId} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                              {p.agentName.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{p.agentName}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{p.count} orders</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {unassignedOrders.length > 0 && (
                <button
                  onClick={handleDistribute}
                  disabled={distributing}
                  className="flex-1 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {distributing ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Distributing...</>
                  ) : (
                    <>Confirm & Assign</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
