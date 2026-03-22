import { useState, useMemo } from 'react';
import { orders, csAssignmentConfigs } from '../../data/mockData';
import { useAppSettings } from '../../store/appSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Phone, CheckCircle2, XCircle, ArrowLeftRight, TrendingUp,
  TrendingDown, Clock, Star, ShieldCheck, Users, Calendar,
  ChevronDown, BarChart3, Percent, Banknote
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  PieChart, Pie, Cell
} from 'recharts';

type Period = 'daily' | 'monthly' | 'quarterly' | 'yearly';

const CS_PEOPLE = csAssignmentConfigs.map(c => c.name);
const ALL_STATUSES = ['new_not_called', 'new_called', 'awaiting_payment', 'late_delivery', 'exchange', 'send_to_lab', 'in_lab', 'not_printed', 'printed', 'packed', 'shipped', 'delivered', 'processing', 'refund'];
const CONFIRMED_STATUSES = ['not_printed', 'printed', 'packed', 'shipped', 'delivered', 'send_to_lab', 'in_lab', 'exchange'];
const NEGATIVE_STATUSES = ['refund'];

const STATUS_COLORS: Record<string, string> = {
  delivered: '#22c55e',
  shipped: '#3b82f6',
  packed: '#6366f1',
  printed: '#8b5cf6',
  not_printed: '#a78bfa',
  send_to_lab: '#f59e0b',
  in_lab: '#f97316',
  exchange: '#06b6d4',
  awaiting_payment: '#eab308',
  new_called: '#94a3b8',
  new_not_called: '#e2e8f0',
  late_delivery: '#ef4444',
  refund: '#dc2626',
  processing: '#64748b',
};

const AGENT_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#22c55e'];

function getPeriodLabel(date: string, period: Period): string {
  const d = new Date(date);
  if (period === 'daily') return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  if (period === 'monthly') return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  if (period === 'quarterly') {
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `Q${q} ${d.getFullYear()}`;
  }
  return String(d.getFullYear());
}

function getPeriodKey(date: string, period: Period): string {
  const d = new Date(date);
  if (period === 'daily') return d.toISOString().slice(0, 10);
  if (period === 'monthly') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (period === 'quarterly') return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  return String(d.getFullYear());
}

function formatBDT(amount: number) {
  return `৳${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function CSPerformanceReport() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [selectedAgent, setSelectedAgent] = useState<string>('All');
  const [appSettings] = useAppSettings();

  // ── Per-agent aggregate metrics ────────────────────────────────────────────
  const agentStats = useMemo(() => {
    return CS_PEOPLE.map((name, i) => {
      const assigned = orders.filter(o => o.assigned_to_name === name);
      const selfConfirmed = assigned.filter(o => !o.confirmed_by && CONFIRMED_STATUSES.includes(o.cs_status));
      const coveredByOther = assigned.filter(o => o.confirmed_by && o.confirmed_by !== name);
      const coverageGiven = orders.filter(o => o.confirmed_by === name && o.assigned_to_name !== name);
      const refunded = assigned.filter(o => NEGATIVE_STATUSES.includes(o.cs_status));
      const uncontacted = assigned.filter(o => o.cs_status === 'new_not_called');
      const called = assigned.filter(o => o.cs_status !== 'new_not_called');
      const confirmed = assigned.filter(o => CONFIRMED_STATUSES.includes(o.cs_status));
      const totalHandled = selfConfirmed.length + coverageGiven.length;
      const revenue = [...selfConfirmed, ...coverageGiven].reduce((s, o) => s + o.total, 0);
      const confirmationRate = assigned.length > 0 ? Math.round((confirmed.length / assigned.length) * 100) : 0;
      const callRate = assigned.length > 0 ? Math.round((called.length / assigned.length) * 100) : 0;
      const refundRate = assigned.length > 0 ? Math.round((refunded.length / assigned.length) * 100) : 0;

      // Status distribution
      const statusDist: Record<string, number> = {};
      ALL_STATUSES.forEach(s => { statusDist[s] = assigned.filter(o => o.cs_status === s).length; });

      return {
        name,
        color: AGENT_COLORS[i % AGENT_COLORS.length],
        assigned: assigned.length,
        selfConfirmed: selfConfirmed.length,
        coveredByOther: coveredByOther.length,
        coverageGiven: coverageGiven.length,
        totalHandled,
        refunded: refunded.length,
        uncontacted: uncontacted.length,
        called: called.length,
        confirmed: confirmed.length,
        confirmationRate,
        callRate,
        refundRate,
        revenue,
        statusDist,
      };
    });
  }, []);

  // ── Time-series data ───────────────────────────────────────────────────────
  const timeSeriesData = useMemo(() => {
    const buckets: Record<string, Record<string, any>> = {};

    orders.forEach(order => {
      const key = getPeriodKey(order.created_date, period);
      const label = getPeriodLabel(order.created_date, period);
      if (!buckets[key]) {
        buckets[key] = { key, label };
        CS_PEOPLE.forEach(name => {
          buckets[key][`${name}_assigned`] = 0;
          buckets[key][`${name}_confirmed`] = 0;
          buckets[key][`${name}_rate`] = 0;
        });
        buckets[key]['total'] = 0;
      }
      buckets[key]['total']++;

      const agentName = order.assigned_to_name;
      if (agentName && CS_PEOPLE.includes(agentName)) {
        buckets[key][`${agentName}_assigned`]++;
        if (CONFIRMED_STATUSES.includes(order.cs_status)) {
          buckets[key][`${agentName}_confirmed`]++;
        }
      }
    });

    // Calc rates
    Object.values(buckets).forEach(b => {
      CS_PEOPLE.forEach(name => {
        const a = b[`${name}_assigned`];
        const c = b[`${name}_confirmed`];
        b[`${name}_rate`] = a > 0 ? Math.round((c / a) * 100) : 0;
      });
    });

    return Object.values(buckets).sort((a, b) => a.key.localeCompare(b.key));
  }, [period]);

  // ── Coverage exchange matrix ────────────────────────────────────────────────
  const coverageMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    CS_PEOPLE.forEach(a => {
      matrix[a] = {};
      CS_PEOPLE.forEach(b => { matrix[a][b] = 0; });
    });
    orders.forEach(o => {
      if (o.confirmed_by && o.assigned_to_name && o.confirmed_by !== o.assigned_to_name) {
        if (matrix[o.assigned_to_name] && matrix[o.assigned_to_name][o.confirmed_by] !== undefined) {
          matrix[o.assigned_to_name][o.confirmed_by]++;
        }
      }
    });
    return matrix;
  }, []);

  // ── Radar data (for selected or all) ──────────────────────────────────────
  const radarData = useMemo(() => {
    const metrics = ['Confirmation Rate', 'Call Rate', 'Coverage Given', 'Self-handled', 'Low Refund'];
    return metrics.map(metric => {
      const entry: Record<string, any> = { metric };
      agentStats.forEach(a => {
        if (metric === 'Confirmation Rate') entry[a.name] = a.confirmationRate;
        else if (metric === 'Call Rate') entry[a.name] = a.callRate;
        else if (metric === 'Coverage Given') entry[a.name] = Math.min(100, a.coverageGiven * 10);
        else if (metric === 'Self-handled') entry[a.name] = a.assigned > 0 ? Math.round((a.selfConfirmed / a.assigned) * 100) : 0;
        else if (metric === 'Low Refund') entry[a.name] = Math.max(0, 100 - a.refundRate * 10);
      });
      return entry;
    });
  }, [agentStats]);

  const filteredAgent = selectedAgent === 'All' ? null : agentStats.find(a => a.name === selectedAgent);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg">Customer Service Performance</h2>
          <p className="text-sm text-gray-500">Call confirmation rates, coverage patterns, and agent-level analytics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Agent filter */}
          <div className="relative">
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Agents</option>
              {CS_PEOPLE.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {/* Period tabs */}
          <div className="flex border rounded-lg overflow-hidden text-sm">
            {(['daily', 'monthly', 'quarterly', 'yearly'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-2 capitalize transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Summary Cards */}
      <div className={`grid gap-4 ${agentStats.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
        {(filteredAgent ? [filteredAgent] : agentStats).map((agent) => (
          <Card key={agent.name} className={`border-l-4`} style={{ borderLeftColor: agent.color }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: agent.color }}>
                    {agent.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <CardDescription>Customer Service</CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${agent.confirmationRate >= 70 ? 'text-green-600' : agent.confirmationRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {agent.confirmationRate}%
                  </div>
                  <div className="text-xs text-gray-500">Confirmation Rate</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Confirmation rate bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Confirmed {agent.confirmed} / {agent.assigned} assigned</span>
                  <span>{agent.confirmationRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${agent.confirmationRate}%`,
                      backgroundColor: agent.confirmationRate >= 70 ? '#22c55e' : agent.confirmationRate >= 50 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <div className="font-semibold text-blue-700 text-base">{agent.assigned}</div>
                  <div className="text-gray-600">Assigned</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <div className="font-semibold text-green-700 text-base">{agent.selfConfirmed}</div>
                  <div className="text-gray-600">Self-confirmed</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-2 text-center">
                  <div className="font-semibold text-amber-700 text-base">{agent.coverageGiven}</div>
                  <div className="text-gray-600">Covered Others</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <div className="font-semibold text-purple-700 text-base">{agent.coveredByOther}</div>
                  <div className="text-gray-600">Needed Coverage</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <div className="font-semibold text-slate-700 text-base">{agent.uncontacted}</div>
                  <div className="text-gray-600">Not Yet Called</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <div className="font-semibold text-red-700 text-base">{agent.refunded}</div>
                  <div className="text-gray-600">Refunded</div>
                </div>
              </div>

              {/* Revenue */}
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Banknote className="w-3.5 h-3.5" />
                  Revenue handled
                </div>
                <span className="text-sm font-semibold text-gray-800">{formatBDT(agent.revenue)}</span>
              </div>

              {/* Quality badges */}
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {agent.callRate >= 80 && (
                  <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                    <Phone className="w-3 h-3" />High Call Rate
                  </Badge>
                )}
                {agent.coverageGiven > agent.coveredByOther && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs gap-1">
                    <ShieldCheck className="w-3 h-3" />Reliable Backup
                  </Badge>
                )}
                {agent.refundRate === 0 && (
                  <Badge className="bg-purple-100 text-purple-700 text-xs gap-1">
                    <Star className="w-3 h-3" />Zero Refunds
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Confirmation Rate Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Confirmation Rate Trend — {period.charAt(0).toUpperCase() + period.slice(1)}
          </CardTitle>
          <CardDescription>% of assigned orders successfully confirmed per agent over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val: any) => [`${val}%`, '']} />
              <Legend />
              {agentStats.map(agent => (
                <Line
                  key={agent.name}
                  type="monotone"
                  dataKey={`${agent.name}_rate`}
                  name={agent.name}
                  stroke={agent.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Orders Assigned Over Time + Coverage Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assigned Orders Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Orders Assigned per Agent — {period.charAt(0).toUpperCase() + period.slice(1)}
            </CardTitle>
            <CardDescription>Volume of orders each CS person received</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={timeSeriesData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {agentStats.map(agent => (
                  <Bar key={agent.name} dataKey={`${agent.name}_assigned`} name={agent.name} fill={agent.color} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar: Agent Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4" />
              Agent Performance Radar
            </CardTitle>
            <CardDescription>Multi-dimensional comparison across key KPIs</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                {agentStats.map(agent => (
                  <Radar
                    key={agent.name}
                    name={agent.name}
                    dataKey={agent.name}
                    stroke={agent.color}
                    fill={agent.color}
                    fillOpacity={0.15}
                  />
                ))}
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution per Agent */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Order Status Distribution per Agent
          </CardTitle>
          <CardDescription>Breakdown of final order statuses for each CS representative's assigned orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-6 ${agentStats.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
            {(filteredAgent ? [filteredAgent] : agentStats).map(agent => {
              const pieData = ALL_STATUSES
                .filter(s => agent.statusDist[s] > 0)
                .map(s => ({ name: s.replace(/_/g, ' '), value: agent.statusDist[s], status: s }));
              return (
                <div key={agent.name}>
                  <p className="text-sm font-medium mb-3 text-center" style={{ color: agent.color }}>{agent.name}</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {pieData.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name) => [val, String(name)]} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend below */}
                  <div className="mt-2 space-y-1">
                    {pieData.sort((a, b) => b.value - a.value).slice(0, 5).map(entry => (
                      <div key={entry.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[entry.status] || '#94a3b8' }} />
                          <span className="capitalize text-gray-700">{entry.name}</span>
                        </div>
                        <span className="font-medium text-gray-800">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Coverage Exchange Matrix */}
      {CS_PEOPLE.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" />
              Coverage Exchange Matrix
            </CardTitle>
            <CardDescription>
              Shows how many times agent in a row was covered by the agent in the column. A balanced matrix suggests good teamwork.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="text-sm w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-gray-500 font-normal">Assigned To ↓ / Covered By →</th>
                    {CS_PEOPLE.map(name => (
                      <th key={name} className="p-2 text-center font-medium text-gray-700">{name.split(' ')[0]}</th>
                    ))}
                    <th className="p-2 text-center text-gray-500 font-normal">Times Needed Help</th>
                  </tr>
                </thead>
                <tbody>
                  {CS_PEOPLE.map((rowAgent, ri) => {
                    const totalNeeded = CS_PEOPLE.reduce((s, col) => col !== rowAgent ? s + (coverageMatrix[rowAgent]?.[col] || 0) : s, 0);
                    return (
                      <tr key={rowAgent} className={ri % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="p-2 font-medium text-gray-800">{rowAgent}</td>
                        {CS_PEOPLE.map(colAgent => {
                          const count = coverageMatrix[rowAgent]?.[colAgent] || 0;
                          const isSelf = rowAgent === colAgent;
                          return (
                            <td key={colAgent} className="p-2 text-center">
                              {isSelf ? (
                                <span className="text-gray-300">—</span>
                              ) : count > 0 ? (
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${count >= 3 ? 'bg-blue-600 text-white' : count >= 2 ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-700'}`}>
                                  {count}
                                </span>
                              ) : (
                                <span className="text-gray-300">0</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-2 text-center">
                          <Badge className={`text-xs ${totalNeeded > 3 ? 'bg-red-100 text-red-700' : totalNeeded > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {totalNeeded}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Coverage given totals */}
                  <tr className="border-t">
                    <td className="p-2 text-gray-500 text-xs">Times Covered Others</td>
                    {CS_PEOPLE.map(colAgent => {
                      const totalGiven = CS_PEOPLE.reduce((s, row) => row !== colAgent ? s + (coverageMatrix[row]?.[colAgent] || 0) : s, 0);
                      return (
                        <td key={colAgent} className="p-2 text-center">
                          <Badge className={`text-xs ${totalGiven > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>{totalGiven}</Badge>
                        </td>
                      );
                    })}
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Insights */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-blue-800">
            <TrendingUp className="w-4 h-4" />
            Performance Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {agentStats.map(agent => {
              const insights: { icon: any; text: string; color: string }[] = [];
              if (agent.confirmationRate < 60) insights.push({ icon: TrendingDown, text: `${agent.name}'s confirmation rate is below 60% — consider follow-up training or workload review`, color: 'text-red-600' });
              if (agent.uncontacted > 5) insights.push({ icon: Clock, text: `${agent.name} has ${agent.uncontacted} orders not yet called — may need priority attention`, color: 'text-amber-600' });
              if (agent.coveredByOther > 3) insights.push({ icon: Users, text: `${agent.name} needed coverage for ${agent.coveredByOther} orders — check attendance pattern`, color: 'text-orange-600' });
              if (agent.confirmationRate >= 80) insights.push({ icon: CheckCircle2, text: `${agent.name} is performing excellently with ${agent.confirmationRate}% confirmation rate`, color: 'text-green-600' });
              if (agent.coverageGiven > 0) insights.push({ icon: ShieldCheck, text: `${agent.name} proactively covered ${agent.coverageGiven} orders for colleagues`, color: 'text-blue-600' });
              return insights.map((ins, j) => (
                <div key={`${agent.name}-${j}`} className="flex items-start gap-2 p-3 bg-white rounded-lg border border-blue-100">
                  <ins.icon className={`w-4 h-4 mt-0.5 shrink-0 ${ins.color}`} />
                  <p className="text-xs text-gray-700">{ins.text}</p>
                </div>
              ));
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}