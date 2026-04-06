import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { fetchExpenses, type Expense, type ExpenseType } from '../finance/expenseService';
import { fetchManualRevenueEntries, type ManualRevenueEntry, REVENUE_CATEGORY_LABELS } from '../finance/collection/manualRevenueService';

/* ─── Date helpers ──────────────────────────────────────────────── */
function getRange(period: string, custom: { from: string; to: string }) {
  const now = new Date();
  if (period === 'this_month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    };
  }
  if (period === 'last_month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
      to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0],
    };
  }
  if (period === 'last_3_months') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0],
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    };
  }
  return custom;
}

function fmt(n: number, sign = false) {
  const s = '৳' + Math.abs(n).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (!sign) return s;
  return n >= 0 ? '+' + s : '-' + s;
}

interface CollectionRow {
  id: string;
  invoice_date: string;
  courier_company: string;
  total_disbursed: number;
  bank_transfer_date: string | null;
  bank_transfer_amount: number | null;
  provider_type: string | null;
}

export default function CashFlow() {
  const { canViewDetailedReports } = useAuth();
  if (!canViewDetailedReports) return <Navigate to="/reports" replace />;

  const navigate = useNavigate();
  const [period, setPeriod] = useState('this_month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [manualRevenue, setManualRevenue] = useState<ManualRevenueEntry[]>([]);
  const [collections, setCollections] = useState<CollectionRow[]>([]);

  const range = getRange(period, custom);

  const load = useCallback(async () => {
    if (period === 'custom' && (!custom.from || !custom.to)) return;
    setLoading(true);
    try {
      const [exp, manRev, colRes] = await Promise.all([
        fetchExpenses({ dateFrom: range.from, dateTo: range.to }),
        fetchManualRevenueEntries(range.from, range.to),
        supabase
          .from('collection_records')
          .select('id, invoice_date, courier_company, total_disbursed, bank_transfer_date, bank_transfer_amount, provider_type')
          .gte('invoice_date', range.from)
          .lte('invoice_date', range.to)
          .eq('status', 'verified')
          .order('invoice_date', { ascending: false }),
      ]);
      setExpenses(exp);
      setManualRevenue(manRev);
      setCollections((colRes.data ?? []) as CollectionRow[]);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, period, custom.from, custom.to]);

  useEffect(() => { load(); }, [load]);

  /* ─── Categorise ────────────────────────────────────────────────── */
  const byType = (t: ExpenseType) => expenses.filter(e => e.expense_type === t);

  const operatingOutflows = byType('operating');
  const investingOutflows = byType('investing');
  const financingOutflows = byType('financing');

  const operatingInflows = manualRevenue;
  const collectionInflows = collections;

  const totalCollectionInflow = collectionInflows.reduce((s, c) => s + Number(c.bank_transfer_amount ?? c.total_disbursed), 0);
  const totalManualInflow = operatingInflows.reduce((s, m) => s + Number(m.amount), 0);
  const totalOperatingIn = totalCollectionInflow + totalManualInflow;
  const totalOperatingOut = operatingOutflows.reduce((s, e) => s + Number(e.amount), 0);
  const netOperating = totalOperatingIn - totalOperatingOut;

  const totalInvestingOut = investingOutflows.reduce((s, e) => s + Number(e.amount), 0);
  const netInvesting = -totalInvestingOut;

  const totalFinancingOut = financingOutflows.reduce((s, e) => s + Number(e.amount), 0);
  const netFinancing = -totalFinancingOut;

  const netCash = netOperating + netInvesting + netFinancing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/reports')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Flow Statement</h1>
          <p className="text-sm text-gray-500 mt-0.5">Operating, investing, and financing activities</p>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: 'this_month', label: 'This Month' },
          { value: 'last_month', label: 'Last Month' },
          { value: 'last_3_months', label: 'Last 3 Months' },
          { value: 'custom', label: 'Custom' },
        ].map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === p.value
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={custom.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={custom.to} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
        {!loading && (
          <span className="text-xs text-gray-400 ml-2">{range.from} → {range.to}</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Net Cash Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              label="Net Operating"
              value={netOperating}
              icon={Activity}
              accent={netOperating >= 0 ? 'emerald' : 'red'}
            />
            <SummaryCard
              label="Net Investing"
              value={netInvesting}
              icon={TrendingDown}
              accent={netInvesting >= 0 ? 'emerald' : 'amber'}
            />
            <SummaryCard
              label="Net Financing"
              value={netFinancing}
              icon={Minus}
              accent={netFinancing >= 0 ? 'emerald' : 'blue'}
            />
            <div className={`rounded-xl border p-5 flex items-start gap-4 ${
              netCash >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className={`p-2.5 rounded-lg shrink-0 ${netCash >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {netCash >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Net Cash Flow</p>
                <p className={`text-2xl font-bold mt-0.5 ${netCash >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {fmt(netCash, true)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">For the period</p>
              </div>
            </div>
          </div>

          {/* Section 1: Operating Activities */}
          <CashSection
            title="Operating Activities"
            subtitle="Day-to-day business cash flows"
            accentColor="border-blue-200"
            headerBg="bg-blue-50"
          >
            {/* Inflows */}
            {(collectionInflows.length > 0 || operatingInflows.length > 0) && (
              <SubSection label="Inflows" positive>
                {collectionInflows.map(c => (
                  <LineItem
                    key={c.id}
                    date={c.bank_transfer_date ?? c.invoice_date}
                    label={`${c.courier_company} — Courier Collection`}
                    sub={c.provider_type ?? undefined}
                    amount={Number(c.bank_transfer_amount ?? c.total_disbursed)}
                    positive
                  />
                ))}
                {operatingInflows.map(m => (
                  <LineItem
                    key={m.id}
                    date={m.revenue_date}
                    label={m.description ?? REVENUE_CATEGORY_LABELS[m.category]}
                    sub={REVENUE_CATEGORY_LABELS[m.category]}
                    amount={Number(m.amount)}
                    positive
                  />
                ))}
                <SubTotal label="Total Inflows" amount={totalOperatingIn} positive />
              </SubSection>
            )}

            {/* Outflows */}
            {operatingOutflows.length > 0 && (
              <SubSection label="Outflows" positive={false}>
                {operatingOutflows.map(e => (
                  <LineItem
                    key={e.id}
                    date={e.expense_date}
                    label={e.description}
                    sub={e.category?.name}
                    amount={Number(e.amount)}
                    positive={false}
                  />
                ))}
                <SubTotal label="Total Outflows" amount={totalOperatingOut} positive={false} />
              </SubSection>
            )}

            <NetRow label="Net Operating Cash Flow" amount={netOperating} />
          </CashSection>

          {/* Section 2: Investing Activities */}
          <CashSection
            title="Investing Activities"
            subtitle="Capital expenditures and asset purchases"
            accentColor="border-amber-200"
            headerBg="bg-amber-50"
          >
            {investingOutflows.length === 0 ? (
              <EmptyState label="No investing activity recorded for this period" />
            ) : (
              <>
                <SubSection label="Outflows" positive={false}>
                  {investingOutflows.map(e => (
                    <LineItem
                      key={e.id}
                      date={e.expense_date}
                      label={e.description}
                      sub={e.category?.name}
                      amount={Number(e.amount)}
                      positive={false}
                    />
                  ))}
                  <SubTotal label="Total Outflows" amount={totalInvestingOut} positive={false} />
                </SubSection>
                <NetRow label="Net Investing Cash Flow" amount={netInvesting} />
              </>
            )}
          </CashSection>

          {/* Section 3: Financing Activities */}
          <CashSection
            title="Financing Activities"
            subtitle="Loans, repayments, and equity transactions"
            accentColor="border-emerald-200"
            headerBg="bg-emerald-50"
          >
            {financingOutflows.length === 0 ? (
              <EmptyState label="No financing activity recorded for this period" />
            ) : (
              <>
                <SubSection label="Outflows" positive={false}>
                  {financingOutflows.map(e => (
                    <LineItem
                      key={e.id}
                      date={e.expense_date}
                      label={e.description}
                      sub={e.category?.name}
                      amount={Number(e.amount)}
                      positive={false}
                    />
                  ))}
                  <SubTotal label="Total Outflows" amount={totalFinancingOut} positive={false} />
                </SubSection>
                <NetRow label="Net Financing Cash Flow" amount={netFinancing} />
              </>
            )}
          </CashSection>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

const summaryAccents = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700' },
  red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'bg-red-100 text-red-600', text: 'text-red-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-700' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', text: 'text-blue-700' },
};

function SummaryCard({ label, value, icon: Icon, accent }: {
  label: string; value: number; icon: React.ElementType; accent: keyof typeof summaryAccents;
}) {
  const a = summaryAccents[accent];
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-5 flex items-start gap-4`}>
      <div className={`p-2.5 rounded-lg shrink-0 ${a.icon}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className={`text-xl font-bold mt-0.5 ${a.text}`}>{fmt(value, true)}</p>
      </div>
    </div>
  );
}

function CashSection({ title, subtitle, accentColor, headerBg, children }: {
  title: string; subtitle: string; accentColor: string; headerBg: string; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border ${accentColor} overflow-hidden`}>
      <div className={`${headerBg} px-6 py-4 border-b ${accentColor}`}>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="bg-white">
        {children}
      </div>
    </div>
  );
}

function SubSection({ label, positive, children }: {
  label: string; positive: boolean; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="px-6 py-2 bg-gray-50">
        <span className={`text-xs font-semibold uppercase tracking-wider ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
          {label}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function LineItem({ date, label, sub, amount, positive }: {
  date: string; label: string; sub?: string; amount: number; positive: boolean;
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-2.5 hover:bg-gray-50 transition-colors group">
      <span className="text-xs text-gray-400 w-24 shrink-0">{date}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-700 truncate block">{label}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
      <span className={`text-sm font-semibold whitespace-nowrap ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
        {positive ? '+' : '−'}{fmt(amount)}
      </span>
    </div>
  );
}

function SubTotal({ label, amount, positive }: { label: string; amount: number; positive: boolean }) {
  return (
    <div className="flex items-center justify-between px-6 py-2.5 bg-gray-50 border-t border-gray-100">
      <span className="text-xs font-semibold text-gray-600">{label}</span>
      <span className={`text-sm font-bold ${positive ? 'text-emerald-700' : 'text-red-600'}`}>
        {positive ? '+' : '−'}{fmt(amount)}
      </span>
    </div>
  );
}

function NetRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className={`flex items-center justify-between px-6 py-3 border-t-2 ${amount >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <span className={`text-base font-bold ${amount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
        {fmt(amount, true)}
      </span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="px-6 py-8 text-center text-sm text-gray-400">{label}</div>
  );
}
