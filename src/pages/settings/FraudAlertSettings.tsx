import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft, Eye, EyeOff, ShieldAlert, CheckCircle2, XCircle,
  Save, Search, AlertTriangle, Info, Loader2, FlaskConical,
  TrendingUp, TrendingDown, Package, Star
} from 'lucide-react';

const SANDBOX_KEY = '1302e523911213bc507c3c6dd35ebdb908044b42982345012452ac8f86406cc9';
const PRODUCTION_BASE = 'https://fraudbd.com';
const SANDBOX_BASE = 'https://fraudbd.com/api/sandbox';

interface FraudAlertSettings {
  id: string;
  api_key: string | null;
  is_enabled: boolean;
  use_sandbox: boolean;
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

function SuccessRateBadge({ rate }: { rate: number }) {
  let color = 'bg-emerald-100 text-emerald-700';
  if (rate < 50) color = 'bg-red-100 text-red-700';
  else if (rate < 70) color = 'bg-amber-100 text-amber-700';
  else if (rate < 85) color = 'bg-yellow-100 text-yellow-700';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold ${color}`}>
      {rate >= 70 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {rate.toFixed(1)}% success
    </span>
  );
}

function CourierCard({ name, data }: { name: string; data: CourierSummary }) {
  if (data.data_type === 'rating') {
    const ratingInfo = RATING_LABELS[data.customer_rating ?? ''] ?? { label: data.customer_rating ?? 'Unknown', color: 'text-gray-700', bg: 'bg-gray-100' };
    const riskColor = RISK_COLORS[data.risk_level ?? 'unknown'] ?? 'text-gray-500';
    return (
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-800">{name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ratingInfo.bg} ${ratingInfo.color}`}>
            {ratingInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-gray-600">Rating-based</span>
          {data.risk_level && (
            <span className={`text-xs font-medium capitalize ${riskColor}`}>
              · {data.risk_level.replace('_', ' ')} risk
            </span>
          )}
        </div>
        {data.message && (
          <p className="text-xs text-gray-500 italic">{data.message}</p>
        )}
        {data.success_rate !== undefined && (
          <div className="text-sm text-gray-600">
            Est. success rate: <span className="font-semibold">{data.success_rate}%</span>
          </div>
        )}
      </div>
    );
  }

  const rate = data.total > 0 ? (data.success / data.total) * 100 : 0;
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800">{name}</span>
        {data.total > 0 && <SuccessRateBadge rate={rate} />}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-lg py-2">
          <div className="text-lg font-bold text-gray-800">{data.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="bg-emerald-50 rounded-lg py-2">
          <div className="text-lg font-bold text-emerald-700">{data.success}</div>
          <div className="text-xs text-emerald-600">Delivered</div>
        </div>
        <div className="bg-red-50 rounded-lg py-2">
          <div className="text-lg font-bold text-red-700">{data.cancel}</div>
          <div className="text-xs text-red-600">Cancelled</div>
        </div>
      </div>
      {data.total > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-1.5 rounded-full bg-emerald-500"
            style={{ width: `${rate}%` }}
          />
        </div>
      )}
      {data.total === 0 && (
        <p className="text-xs text-gray-400 text-center">No delivery history</p>
      )}
    </div>
  );
}

export default function FraudAlertSettings() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState<FraudAlertSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [useSandbox, setUseSandbox] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [testMsg, setTestMsg] = useState('');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CourierCheckResult | null>(null);
  const [checkError, setCheckError] = useState('');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fraud_alert_settings')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setSettings(data);
        setApiKey(data.api_key ?? '');
        setIsEnabled(data.is_enabled);
        setUseSandbox(data.use_sandbox);
      }
    } catch (err) {
      console.error('Failed to load fraud alert settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = {
        api_key: apiKey.trim() || null,
        is_enabled: isEnabled,
        use_sandbox: useSandbox,
        updated_at: new Date().toISOString(),
      };
      let error;
      if (settings?.id) {
        ({ error } = await supabase
          .from('fraud_alert_settings')
          .update(payload)
          .eq('id', settings.id));
      } else {
        ({ error } = await supabase
          .from('fraud_alert_settings')
          .insert(payload));
      }
      if (error) throw error;
      setSaveMsg({ type: 'success', text: 'Settings saved successfully.' });
      await loadSettings();
    } catch (err) {
      setSaveMsg({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTestStatus('testing');
    setTestMsg('');
    try {
      const effectiveKey = useSandbox ? SANDBOX_KEY : apiKey.trim();
      const baseUrl = useSandbox ? SANDBOX_BASE : PRODUCTION_BASE + '/api';
      const res = await fetch(`${supabaseUrl}/functions/v1/fraud-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          action: 'test-connection',
          apiKey: effectiveKey,
          baseUrl,
          useSandbox,
        }),
      });
      const json = await res.json();
      if (json.status === true) {
        setTestStatus('ok');
        setTestMsg('Connection successful.');
      } else {
        setTestStatus('fail');
        setTestMsg(json.message || 'Connection failed.');
      }
    } catch {
      setTestStatus('fail');
      setTestMsg('Could not reach the API. Check your network or API key.');
    }
  }

  async function handleCheck() {
    const phone = phoneNumber.trim();
    if (!phone) return;
    setChecking(true);
    setCheckResult(null);
    setCheckError('');
    try {
      const effectiveKey = useSandbox ? SANDBOX_KEY : (settings?.api_key ?? apiKey.trim());
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
        setCheckResult(json.data);
      } else {
        setCheckError(json.message || 'Failed to retrieve courier info.');
      }
    } catch {
      setCheckError('Could not reach the API. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeKey = useSandbox ? SANDBOX_KEY : apiKey;
  const canCheck = useSandbox || !!activeKey;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            Fraud Alert
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Verify customer delivery history via FraudBD API</p>
        </div>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Connection Setup</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Status:</span>
            {isEnabled ? (
              <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Enabled
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-gray-400 font-medium">
                <XCircle className="w-4 h-4" /> Disabled
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <FlaskConical className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">Environment</p>
            <p className="text-xs text-gray-500">Sandbox uses FraudBD test data. No account needed.</p>
          </div>
          <button
            type="button"
            onClick={() => setUseSandbox(!useSandbox)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${useSandbox ? 'bg-amber-400' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${useSandbox ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className={`text-sm font-medium w-20 ${useSandbox ? 'text-amber-600' : 'text-gray-600'}`}>
            {useSandbox ? 'Sandbox' : 'Production'}
          </span>
        </div>

        {!useSandbox && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Enter your FraudBD API key"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Get your API key from{' '}
              <a href="https://www.fraudbd.com/dashboard/settings" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                fraudbd.com/dashboard/settings
              </a>
            </p>
          </div>
        )}

        {useSandbox && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Sandbox mode is active. Using FraudBD public test key — no account or API key required.</span>
          </div>
        )}

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">Enable Fraud Alert</p>
            <p className="text-xs text-gray-500">Allow fraud checks from order detail pages</p>
          </div>
          <button
            type="button"
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEnabled ? 'bg-red-500' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={testStatus === 'testing' || (!useSandbox && !apiKey.trim())}
          >
            {testStatus === 'testing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FlaskConical className="w-4 h-4" />
            )}
            Test Connection
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </Button>
          {testStatus === 'ok' && (
            <span className="flex items-center gap-1 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /> {testMsg}
            </span>
          )}
          {testStatus === 'fail' && (
            <span className="flex items-center gap-1 text-sm text-red-600">
              <XCircle className="w-4 h-4" /> {testMsg}
            </span>
          )}
          {saveMsg && (
            <span className={`text-sm ${saveMsg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {saveMsg.text}
            </span>
          )}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Manual Phone Lookup</h2>
          {useSandbox && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Sandbox</span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Enter a Bangladeshi phone number to check its courier delivery history across Pathao, Steadfast, Paperfly, and Redx.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canCheck && handleCheck()}
            placeholder={useSandbox ? "e.g. 01712345678 (even = rating, odd = counts)" : "e.g. 01712345678"}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <Button onClick={handleCheck} disabled={checking || !phoneNumber.trim() || !canCheck}>
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Check
          </Button>
        </div>

        {!canCheck && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Save an API key or switch to sandbox mode to use this feature.
          </div>
        )}

        {checkError && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {checkError}
          </div>
        )}

        {checkResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-gray-700">Results for {phoneNumber}</h3>
              {checkResult.totalSummary.total > 0 && (
                <SuccessRateBadge rate={checkResult.totalSummary.successRate} />
              )}
            </div>

            {checkResult.totalSummary.total > 0 && (
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
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(checkResult.Summaries).map(([courier, data]) => (
                <CourierCard key={courier} name={courier} data={data} />
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">API Information</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1.5">
            <p className="font-medium text-gray-600">Rate Limits</p>
            <p className="text-gray-500">Standard: 60 requests / minute</p>
            <p className="text-gray-500">Bulk check: 5 requests / minute</p>
            <p className="text-gray-500">Bulk max: 30 phone numbers / request</p>
          </div>
          <div className="space-y-1.5">
            <p className="font-medium text-gray-600">Supported Couriers</p>
            <p className="text-gray-500">Pathao (rating-based)</p>
            <p className="text-gray-500">Steadfast, Paperfly, Redx (count-based)</p>
          </div>
        </div>
        <a
          href="https://www.fraudbd.com/api-documentation"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
        >
          View full API documentation
        </a>
      </Card>
    </div>
  );
}
