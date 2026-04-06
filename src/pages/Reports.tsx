import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, TrendingUp, Package, DollarSign, Users,
  FileText, Lock, ArrowRight, TrendingDown, Activity,
  Layers, Receipt, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchExpenses } from './finance/expenseService';
import { fetchManualRevenueTotalForRange } from './finance/collection/manualRevenueService';

function fmt(n: number) {
  return '৳' + n.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getPct(a: number, b: number) {
  if (b === 0) return null;
  return ((a / b) * 100).toFixed(1);
}

interface KpiData {
  revenue: number;
  expenses: number;
  grossProfit: number;
  loading: boolean;
}

export default function Reports() {
  const { canViewDetailedReports } = useAuth();
  const navigate = useNavigate();

  const [kpi, setKpi] = useState<KpiData>({ revenue: 0, expenses: 0, grossProfit: 0, loading: true });

  useEffect(() => {
    async function loadKpi() {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      try {
        const [orderRes, manualRevenue, expenses] = await Promise.all([
          supabase
            .from('order_profit_summary')
            .select('revenue, gross_profit')
            .gte('order_date', from)
            .lte('order_date', to),
          fetchManualRevenueTotalForRange(from, to),
          fetchExpenses({ dateFrom: from, dateTo: to }),
        ]);

        const orderRevenue = (orderRes.data ?? []).reduce((s, r) => s + Number(r.revenue), 0);
        const orderProfit = (orderRes.data ?? []).reduce((s, r) => s + Number(r.gross_profit), 0);
        const totalRevenue = orderRevenue + manualRevenue.total;
        const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

        setKpi({
          revenue: totalRevenue,
          expenses: totalExpenses,
          grossProfit: orderProfit,
          loading: false,
        });
      } catch {
        setKpi(k => ({ ...k, loading: false }));
      }
    }
    loadKpi();
  }, []);

  const monthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const financialReports = [
    {
      name: 'Profit & Loss',
      description: 'Order-level revenue, COGS, and margin breakdown',
      route: '/reports/profit-loss',
      adminOnly: true,
      live: true,
      icon: TrendingUp,
    },
    {
      name: 'Expense Analysis',
      description: 'Category breakdown, trends, and detailed expense records',
      route: '/reports/expense-analysis',
      adminOnly: true,
      live: true,
      icon: Receipt,
    },
    {
      name: 'Cash Flow Statement',
      description: 'Operating, investing, and financing activities',
      route: '/reports/cash-flow',
      adminOnly: true,
      live: true,
      icon: Activity,
    },
  ];

  const inventoryReports = [
    {
      name: 'Stock Levels',
      description: 'Current stock snapshot, valuation, and low-stock alerts',
      route: '/reports/stock-levels',
      adminOnly: false,
      live: true,
      icon: Layers,
    },
    {
      name: 'Inventory Valuation',
      description: 'Total value by category with FIFO costing',
      route: null,
      adminOnly: false,
      live: false,
      icon: Package,
    },
    {
      name: 'Movement History',
      description: 'Full audit trail of stock in/out events',
      route: null,
      adminOnly: false,
      live: false,
      icon: BarChart3,
    },
  ];

  const salesReports = [
    { name: 'Daily Sales Summary', description: 'Revenue by day with order count', route: null, live: false, adminOnly: false, icon: TrendingUp },
    { name: 'Sales by Product', description: 'Top products ranked by revenue and volume', route: null, live: false, adminOnly: false, icon: Package },
    { name: 'Sales Trend Analysis', description: 'Week-over-week and month-over-month trends', route: null, live: false, adminOnly: false, icon: BarChart3 },
  ];

  const customerReports = [
    { name: 'Customer Analytics', description: 'Lifetime value, frequency, and retention', route: null, live: false, adminOnly: false, icon: Users },
    { name: 'Top Customers', description: 'Ranked by revenue with order history', route: null, live: false, adminOnly: false, icon: TrendingUp },
    { name: 'Customer Returns', description: 'Return rate and reason analysis', route: null, live: false, adminOnly: false, icon: TrendingDown },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Business intelligence and financial reporting</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
          <RefreshCw className="w-3 h-3" />
          Live data
        </div>
      </div>

      {/* Month KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label={`Revenue — ${monthLabel}`}
          value={kpi.loading ? null : fmt(kpi.revenue)}
          sub="Orders + manual revenue"
          accent="blue"
          icon={DollarSign}
        />
        <KpiCard
          label={`Expenses — ${monthLabel}`}
          value={kpi.loading ? null : fmt(kpi.expenses)}
          sub="All recorded expenses"
          accent="red"
          icon={TrendingDown}
        />
        <KpiCard
          label={`Gross Profit — ${monthLabel}`}
          value={kpi.loading ? null : fmt(kpi.grossProfit)}
          sub={kpi.loading ? '' : (getPct(kpi.grossProfit, kpi.revenue) !== null ? `${getPct(kpi.grossProfit, kpi.revenue)}% margin` : 'No revenue yet')}
          accent="emerald"
          icon={TrendingUp}
        />
      </div>

      {/* Financial Reports — Live */}
      <Section title="Financial Reports" subtitle="Full financial visibility with live data" accent="emerald">
        {financialReports.map(r => {
          const locked = r.adminOnly && !canViewDetailedReports;
          const clickable = !!r.route && !locked;
          return (
            <ReportRow
              key={r.name}
              report={r}
              locked={locked}
              clickable={clickable}
              onClick={() => clickable && navigate(r.route!)}
            />
          );
        })}
      </Section>

      {/* Inventory Reports */}
      <Section title="Inventory Reports" subtitle="Stock levels, valuation, and movement tracking" accent="blue">
        {inventoryReports.map(r => {
          const locked = r.adminOnly && !canViewDetailedReports;
          const clickable = !!r.route && !locked;
          return (
            <ReportRow
              key={r.name}
              report={r}
              locked={locked}
              clickable={clickable}
              onClick={() => clickable && navigate(r.route!)}
            />
          );
        })}
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales Reports */}
        <Section title="Sales Reports" subtitle="Revenue and order analysis" accent="amber" compact>
          {salesReports.map(r => (
            <ReportRow key={r.name} report={r} locked={false} clickable={false} onClick={() => {}} compact />
          ))}
        </Section>

        {/* Customer Reports */}
        <Section title="Customer Reports" subtitle="Customer behaviour and analytics" accent="teal" compact>
          {customerReports.map(r => (
            <ReportRow key={r.name} report={r} locked={false} clickable={false} onClick={() => {}} compact />
          ))}
        </Section>
      </div>
    </div>
  );
}

/* ─── KPI Card ──────────────────────────────────────────────────── */
const accentMap = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'bg-blue-100 text-blue-600', text: 'text-blue-700' },
  red: { bg: 'bg-red-50', border: 'border-red-100', icon: 'bg-red-100 text-red-600', text: 'text-red-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-700' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-100', icon: 'bg-teal-100 text-teal-600', text: 'text-teal-700' },
};

function KpiCard({ label, value, sub, accent, icon: Icon }: {
  label: string; value: string | null; sub: string;
  accent: keyof typeof accentMap; icon: React.ElementType;
}) {
  const a = accentMap[accent];
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-5 flex items-start gap-4`}>
      <div className={`p-2.5 rounded-lg ${a.icon} shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
        {value === null
          ? <div className="h-7 w-28 bg-gray-200 rounded animate-pulse mt-1" />
          : <p className={`text-2xl font-bold mt-0.5 ${a.text}`}>{value}</p>
        }
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

/* ─── Section wrapper ───────────────────────────────────────────── */
function Section({ title, subtitle, accent, compact, children }: {
  title: string; subtitle: string; accent: keyof typeof accentMap;
  compact?: boolean; children: React.ReactNode;
}) {
  const a = accentMap[accent];
  return (
    <div className={`rounded-xl border ${a.border} overflow-hidden`}>
      <div className={`px-6 py-4 ${a.bg} border-b ${a.border}`}>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <div className={compact ? 'divide-y divide-gray-100' : 'divide-y divide-gray-100'}>
        {children}
      </div>
    </div>
  );
}

/* ─── Report Row ────────────────────────────────────────────────── */
interface ReportMeta {
  name: string;
  description: string;
  route: string | null;
  live: boolean;
  adminOnly: boolean;
  icon: React.ElementType;
}

function ReportRow({ report, locked, clickable, onClick, compact }: {
  report: ReportMeta; locked: boolean; clickable: boolean;
  onClick: () => void; compact?: boolean;
}) {
  const Icon = report.icon;
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-6 ${compact ? 'py-3' : 'py-4'} bg-white transition-colors group ${
        clickable ? 'cursor-pointer hover:bg-gray-50' : locked ? 'opacity-60 cursor-not-allowed' : 'cursor-default'
      }`}
    >
      <div className={`p-2 rounded-lg shrink-0 ${
        report.live && !locked ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'
      }`}>
        {locked ? <Lock className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${clickable ? 'text-gray-800 group-hover:text-gray-900' : 'text-gray-600'}`}>
            {report.name}
          </span>
          {report.live && !locked ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Live
            </span>
          ) : locked ? (
            <span className="text-xs text-gray-400">Restricted</span>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">
              Coming Soon
            </span>
          )}
        </div>
        {!compact && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{report.description}</p>
        )}
      </div>

      {clickable && (
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
      )}
      {!clickable && !locked && report.live && (
        <FileText className="w-4 h-4 text-gray-300 shrink-0" />
      )}
    </div>
  );
}
