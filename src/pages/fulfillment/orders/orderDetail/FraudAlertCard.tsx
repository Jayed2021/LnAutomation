import { useState, useEffect } from 'react';
import {
  ShieldAlert, Search, ChevronDown, ChevronUp, TrendingUp, TrendingDown,
  Package, Star, Loader2, XCircle, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

const SANDBOX_KEY = '1302e523911213bc507c3c6dd35ebdb908044b42982345012452ac8f86406cc9';
const PRODUCTION_BASE = 'https://fraudbd.com';
const SANDBOX_BASE = 'https://fraudbd.com/api/sandbox';

interface Props {
  customerId: string;
  defaultPhone: string;
}

interface CourierSummary {
  logo?: string;
  data_type: 'rating' | 'delivery';
  customer_rating?: string;
  risk_level?: string;
  message?: string;
  success_rate?: number;
  total: number;
  success: number;
  cancel: number;
}

interface TotalSummary {
  total: number;
  success: number;
  cancel: number;
  successRate: number;
  cancelRate: number;
}

interface CourierCheckResult {
  Summaries: Record<string, CourierSummary>;
  totalSummary: TotalSummary;
}

interface CustomerStats {
  courier_success_rate: number | null;
  courier_success_rate_updated_at: string | null;
  delivery_success_rate: number | null;
  total_orders: number;
  successful_deliveries: number;
  cancelled_orders: number;
}

interface FraudSettings {
  api_key: string | null;
  use_sandbox: boolean;
  is_enabled: boolean;
}

const RATING_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  excellent_customer: { label: 'Excellent', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  good_customer: { label: 'Good', color: 'text-green-700', bg: 'bg-green-100' },
  moderate_customer: { label: 'Moderate', color: 'text-amber-700', bg: 'bg-amber-100' },
  risky_customer: { label: 'Risky', color: 'text-red-700', bg: 'bg-red-100' },
  new_customer: { label: 'New', color: 'text-gray-700', bg: 'bg-gray-100' },
};

const RISK_COLORS: Record<string, string> = {
  low: 'text-emerald-600',
  medium: 'text-amber-600',
  high: 'text-red-600',
  very_high: 'text-red-700',
  unknown: 'text-gray-500',
};

function rateColor(rate: number) {
  if (rate >= 85) return 'bg-emerald-100 text-emerald-700';
  if (rate >= 70) return 'bg-yellow-100 text-yellow-700';
  if (rate >= 50) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function SuccessRateBadge({ rate, size = 'sm' }: { rate: number; size?: 'sm' | 'xs' }) {
  const cls = rateColor(rate);
  const text = size === 'xs' ? 'text-xs' : 'text-sm';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${text} ${cls}`}>
      {rate >= 70 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {rate.toFixed(1)}%
    </span>
  );
}

function CourierCard({ name, data }: { name: string; data: CourierSummary }) {
  if (data.data_type === 'rating') {
    const ratingInfo = RATING_LABELS[data.customer_rating ?? ''] ?? {
      label: data.customer_rating ?? 'Unknown',
      color: 'text-gray-700',
      bg: 'bg-gray-100',
    };
    const riskColor = RISK_COLORS[data.risk_level ?? 'unknown'] ?? 'text-gray-500';
    return (
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-800 text-sm">{name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ratingInfo.bg} ${ratingInfo.color}`}>
            {ratingInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs text-gray-500">Rating-based</span>
          {data.risk_level && (
            <span className={`text-xs font-medium capitalize ${riskColor}`}>
              · {data.risk_level.replace('_', ' ')} risk
            </span>
          )}
        </div>
        {data.message && <p className="text-xs text-gray-400 italic">{data.message}</p>}
        {data.success_rate !== undefined && (
          <div className="text-xs text-gray-500">
            Est. success: <span className="font-semibold text-gray-700">{data.success_rate}%</span>
          </div>
        )}
      </div>
    );
  }

  const rate = data.total > 0 ? (data.success / data.total) * 100 : 0;
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">{name}</span>
        {data.total > 0 && <SuccessRateBadge rate={rate} size="xs" />}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-lg py-2">
          <div className="text-base font-bold text-gray-800">{data.total}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
        <div className="bg-emerald-50 rounded-lg py-2">
          <div className="text-base font-bold text-emerald-700">{data.success}</div>
          <div className="text-xs text-emerald-500">Delivered</div>
        </div>
        <div className="bg-red-50 rounded-lg py-2">
          <div className="text-base font-bold text-red-600">{data.cancel}</div>
          <div className="text-xs text-red-400">Cancelled</div>
        </div>
      </div>
      {data.total > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
        </div>
      )}
      {data.total === 0 && (
        <p className="text-xs text-gray-400 text-center">No delivery history</p>
      )}
    </div>
  );
}

function OurRateAccordion({ stats }: { stats: CustomerStats }) {
  const [open, setOpen] = useState(false);
  const rate = stats.delivery_success_rate;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Our Success Rate</span>
          {rate !== null ? (
            <SuccessRateBadge rate={rate} size="xs" />
          ) : (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">No history</span>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center bg-white">
          <div>
            <div className="text-base font-bold text-gray-800">{stats.total_orders}</div>
            <div className="text-xs text-gray-400 flex items-center justify-center gap-0.5 mt-0.5">
              <Package className="w-2.5 h-2.5" /> Total
            </div>
          </div>
          <div>
            <div className="text-base font-bold text-emerald-600">{stats.successful_deliveries}</div>
            <div className="text-xs text-emerald-500 mt-0.5">Delivered</div>
          </div>
          <div>
            <div className="text-base font-bold text-red-500">{stats.cancelled_orders}</div>
            <div className="text-xs text-red-400 mt-0.5">Cancelled</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FraudAlertCard({ customerId, defaultPhone }: Props) {
  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CourierCheckResult | null>(null);
  const [checkError, setCheckError] = useState('');
  const [checkedPhone, setCheckedPhone] = useState('');
  const [settings, setSettings] = useState<FraudSettings | null>(null);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    supabase
      .from('fraud_alert_settings')
      .select('api_key, use_sandbox, is_enabled')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings(data);
        else setSettings({ api_key: null, use_sandbox: true, is_enabled: false });
      });

    supabase
      .from('customers')
      .select('courier_success_rate, courier_success_rate_updated_at, delivery_success_rate, total_orders, successful_deliveries, cancelled_orders')
      .eq('id', customerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCustomerStats(data as CustomerStats);
      });
  }, [customerId]);

  const useSandbox = settings?.use_sandbox ?? true;
  const canCheck = useSandbox || !!(settings?.api_key);

  async function handleCheck() {
    const phone = phoneNumber.trim();
    if (!phone || !canCheck) return;
    setChecking(true);
    setCheckResult(null);
    setCheckError('');
    try {
      const effectiveKey = useSandbox ? SANDBOX_KEY : (settings?.api_key ?? '');
      const baseUrl = useSandbox ? SANDBOX_BASE : PRODUCTION_BASE + '/api';
      const res = await fetch(`${supabaseUrl}/functions/v1/fraud-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          action: 'check-courier-info',
          apiKey: effectiveKey,
          baseUrl,
          useSandbox,
          phoneNumber: phone,
        }),
      });
      const json = await res.json();
      if (json.status === true && json.data) {
        const result: CourierCheckResult = json.data;
        setCheckResult(result);
        setCheckedPhone(phone);
        setOpen(true);

        const newRate = result.totalSummary.total > 0 ? result.totalSummary.successRate : null;
        if (newRate !== null) {
          await supabase
            .from('customers')
            .update({
              courier_success_rate: newRate,
              courier_success_rate_updated_at: new Date().toISOString(),
            })
            .eq('id', customerId);

          setCustomerStats(prev => prev
            ? { ...prev, courier_success_rate: newRate, courier_success_rate_updated_at: new Date().toISOString() }
            : prev
          );
        }
      } else {
        setCheckError(json.message || 'Failed to retrieve courier info.');
        setOpen(true);
      }
    } catch {
      setCheckError('Could not reach the API. Please try again.');
      setOpen(true);
    } finally {
      setChecking(false);
    }
  }

  const cachedRate = customerStats?.courier_success_rate ?? null;
  const cachedAt = customerStats?.courier_success_rate_updated_at ?? null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Always-visible header row */}
      <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold text-gray-800">Fraud Alert</span>
          {settings?.use_sandbox && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Sandbox</span>
          )}
        </div>

        {/* Phone input + check button */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canCheck && !checking && handleCheck()}
            placeholder="Enter phone number"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-gray-50"
          />
          <button
            onClick={handleCheck}
            disabled={checking || !phoneNumber.trim() || !canCheck}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {checking
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Search className="w-3.5 h-3.5" />
            }
            Check
          </button>
        </div>

        {/* Cached FraudBD rate badge */}
        {cachedRate !== null && !checkResult && (
          <div className="flex items-center gap-1.5 shrink-0">
            <SuccessRateBadge rate={cachedRate} size="xs" />
            {cachedAt && (
              <span className="text-xs text-gray-400">· {formatDate(cachedAt)}</span>
            )}
          </div>
        )}
        {checkResult && checkResult.totalSummary.total > 0 && (
          <SuccessRateBadge rate={checkResult.totalSummary.successRate} size="xs" />
        )}

        {/* Accordion toggle */}
        {(checkResult || checkError || cachedRate !== null) && (
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
          >
            {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
        )}
      </div>

      {!canCheck && (
        <div className="mx-4 mb-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Configure an API key or enable Sandbox mode in Fraud Alert settings.
        </div>
      )}

      {/* Expandable body */}
      {open && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
          {/* Error state */}
          {checkError && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {checkError}
            </div>
          )}

          {/* FraudBD results */}
          {checkResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-gray-700">Results for {checkedPhone}</span>
                </div>
                {checkResult.totalSummary.total > 0 && (
                  <SuccessRateBadge rate={checkResult.totalSummary.successRate} />
                )}
              </div>

              {checkResult.totalSummary.total > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-xl p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800">{checkResult.totalSummary.total}</div>
                      <div className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-0.5">
                        <Package className="w-3 h-3" /> Total Orders
                      </div>
                    </div>
                    <div className="text-center border-x border-gray-200">
                      <div className="text-2xl font-bold text-emerald-600">{checkResult.totalSummary.success}</div>
                      <div className="text-xs text-emerald-600 mt-0.5">Delivered</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{checkResult.totalSummary.cancel}</div>
                      <div className="text-xs text-red-500 mt-0.5">Cancelled</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(checkResult.Summaries).map(([courier, data]) => (
                      <CourierCard key={courier} name={courier} data={data} />
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No courier history found for this number.</p>
              )}
            </div>
          )}

          {/* Cached result shown when no fresh check yet */}
          {!checkResult && !checkError && cachedRate !== null && (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                Last FraudBD check: <span className="font-semibold text-gray-700">{cachedRate.toFixed(1)}% success rate</span>
                {cachedAt && <span className="text-gray-400"> on {formatDate(cachedAt)}</span>}
              </span>
            </div>
          )}

          {/* Our success rate accordion */}
          {customerStats && (
            <OurRateAccordion stats={customerStats} />
          )}
        </div>
      )}

      {/* Show Our Rate accordion inline when collapsed but has stats and no accordion trigger shown */}
      {!open && customerStats && (checkResult !== null || cachedRate !== null) && (
        <div className="px-4 pb-4">
          <OurRateAccordion stats={customerStats} />
        </div>
      )}
    </div>
  );
}
