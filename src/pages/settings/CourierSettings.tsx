import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ArrowLeft, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw,
  ToggleLeft, ToggleRight, Truck, AlertCircle, ChevronDown, ChevronUp,
  Save, Copy, Check, Link, Clock, Activity, Zap
} from 'lucide-react';

interface CourierConfig {
  id: string;
  courier_name: string;
  is_enabled: boolean;
  environment: 'sandbox' | 'production';
  base_url: string | null;
  credentials: Record<string, string> | null;
  webhook_secret: string | null;
  updated_at: string;
}

interface PathaoCredentials {
  client_id: string;
  client_secret: string;
  username: string;
  password: string;
  store_id: string;
}

interface SteadfastCredentials {
  api_key: string;
  secret_key: string;
}

interface SyncSettings {
  enabled: boolean;
  intervalHours: number;
  lookbackDays: number;
  lastRun: string | null;
  lastResult: SyncResult | null;
}

interface SyncResult {
  checked: number;
  updated: number;
  unchanged: number;
  partial_delivery_count: number;
  errors: { consignment_id: string; error: string }[];
  dry_run?: boolean;
  timestamp?: string;
}

const PATHAO_URLS = {
  sandbox: 'https://courier-api-sandbox.pathao.com',
  production: 'https://api-hermes.pathao.com',
};

const STEADFAST_URL = 'https://portal.packzy.com/api/v1';

const defaultPathao: PathaoCredentials = {
  client_id: '', client_secret: '', username: '', password: '', store_id: '',
};

const defaultSteadfast: SteadfastCredentials = {
  api_key: '', secret_key: '',
};

export default function CourierSettings() {
  const navigate = useNavigate();

  const [pathaoConfig, setPathaoConfig] = useState<CourierConfig | null>(null);
  const [steadfastConfig, setSteadfastConfig] = useState<CourierConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [pathaoForm, setPathaoForm] = useState<PathaoCredentials>(defaultPathao);
  const [pathaoEnv, setPathaoEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [pathaoEnabled, setPathaoEnabled] = useState(false);

  const [steadfastForm, setSteadfastForm] = useState<SteadfastCredentials>(defaultSteadfast);
  const [steadfastEnabled, setSteadfastEnabled] = useState(false);

  const [showPathaoSecret, setShowPathaoSecret] = useState(false);
  const [showPathaoPassword, setShowPathaoPassword] = useState(false);
  const [showSteadfastSecret, setShowSteadfastSecret] = useState(false);

  const [pathaoExpanded, setPathaoExpanded] = useState(true);
  const [steadfastExpanded, setSteadfastExpanded] = useState(true);
  const [syncExpanded, setSyncExpanded] = useState(true);

  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    enabled: true,
    intervalHours: 1,
    lookbackDays: 14,
    lastRun: null,
    lastResult: null,
  });
  const [savingSync, setSavingSync] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncRunResult, setSyncRunResult] = useState<SyncResult | null>(null);
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);

  const [savingPathao, setSavingPathao] = useState(false);
  const [savingSteadfast, setSavingSteadfast] = useState(false);
  const [pathaoNotice, setPathaoNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [steadfastNotice, setSteadfastNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [webhookSecretCopied, setWebhookSecretCopied] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const pathaoWebhookUrl = supabaseUrl
    ? `${supabaseUrl}/functions/v1/pathao-webhook`
    : null;

  const copyWebhookUrl = () => {
    if (!pathaoWebhookUrl) return;
    navigator.clipboard.writeText(pathaoWebhookUrl).then(() => {
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2000);
    });
  };

  const copyWebhookSecret = (secret: string) => {
    navigator.clipboard.writeText(secret).then(() => {
      setWebhookSecretCopied(true);
      setTimeout(() => setWebhookSecretCopied(false), 2000);
    });
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const [{ data: courierData }, { data: settingsData }, { count: eligible }] = await Promise.all([
        supabase.from('courier_configs').select('*').in('courier_name', ['pathao', 'steadfast']),
        supabase.from('app_settings').select('key, value').in('key', [
          'pathao_sync_enabled', 'pathao_sync_interval_hours',
          'pathao_sync_lookback_days', 'pathao_sync_last_run', 'pathao_sync_last_result',
        ]),
        supabase
          .from('order_courier_info')
          .select('id', { count: 'exact', head: true })
          .eq('courier_company', 'Pathao')
          .not('consignment_id', 'is', null)
          .or(`courier_status.is.null,courier_status.not.in.(Delivered,Return,Delivery Failed,Paid Return,Exchange,Partial Delivery)`)
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      if (courierData) {
        const pathao = courierData.find(c => c.courier_name === 'pathao') || null;
        const steadfast = courierData.find(c => c.courier_name === 'steadfast') || null;

        setPathaoConfig(pathao);
        setSteadfastConfig(steadfast);

        if (pathao) {
          setPathaoEnabled(pathao.is_enabled);
          setPathaoEnv(pathao.environment as 'sandbox' | 'production');
          if (pathao.credentials) {
            setPathaoForm({
              client_id: pathao.credentials.client_id || '',
              client_secret: pathao.credentials.client_secret || '',
              username: pathao.credentials.username || '',
              password: pathao.credentials.password || '',
              store_id: pathao.credentials.store_id || '',
            });
          }
        }

        if (steadfast) {
          setSteadfastEnabled(steadfast.is_enabled);
          if (steadfast.credentials) {
            setSteadfastForm({
              api_key: steadfast.credentials.api_key || '',
              secret_key: steadfast.credentials.secret_key || '',
            });
          }
        }
      }

      if (settingsData) {
        const sm: Record<string, unknown> = {};
        for (const row of settingsData) sm[row.key] = row.value;
        setSyncSettings({
          enabled: sm['pathao_sync_enabled'] === true || sm['pathao_sync_enabled'] === 'true',
          intervalHours: parseInt(String(sm['pathao_sync_interval_hours'] ?? '1')) || 1,
          lookbackDays: parseInt(String(sm['pathao_sync_lookback_days'] ?? '14')) || 14,
          lastRun: (sm['pathao_sync_last_run'] && sm['pathao_sync_last_run'] !== 'null') ? sm['pathao_sync_last_run'] as string : null,
          lastResult: (sm['pathao_sync_last_result'] && sm['pathao_sync_last_result'] !== 'null') ? sm['pathao_sync_last_result'] as SyncResult : null,
        });
      }

      setEligibleCount(eligible ?? 0);
    } finally {
      setLoading(false);
    }
  };

  const savePathao = async () => {
    setSavingPathao(true);
    setPathaoNotice(null);
    try {
      const payload = {
        is_enabled: pathaoEnabled,
        environment: pathaoEnv,
        base_url: PATHAO_URLS[pathaoEnv],
        credentials: pathaoForm,
        updated_at: new Date().toISOString(),
      };

      if (pathaoConfig?.id) {
        const { error } = await supabase
          .from('courier_configs')
          .update(payload)
          .eq('id', pathaoConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('courier_configs')
          .insert({ ...payload, courier_name: 'pathao' });
        if (error) throw error;
      }
      setPathaoNotice({ ok: true, message: 'Pathao settings saved' });
      loadConfigs();
    } catch (err: any) {
      setPathaoNotice({ ok: false, message: err?.message || 'Failed to save' });
    } finally {
      setSavingPathao(false);
    }
  };

  const saveSteadfast = async () => {
    setSavingSteadfast(true);
    setSteadfastNotice(null);
    try {
      const payload = {
        is_enabled: steadfastEnabled,
        environment: 'production' as const,
        base_url: STEADFAST_URL,
        credentials: steadfastForm,
        updated_at: new Date().toISOString(),
      };

      if (steadfastConfig?.id) {
        const { error } = await supabase
          .from('courier_configs')
          .update(payload)
          .eq('id', steadfastConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('courier_configs')
          .insert({ ...payload, courier_name: 'steadfast' });
        if (error) throw error;
      }
      setSteadfastNotice({ ok: true, message: 'Steadfast settings saved' });
      loadConfigs();
    } catch (err: any) {
      setSteadfastNotice({ ok: false, message: err?.message || 'Failed to save' });
    } finally {
      setSavingSteadfast(false);
    }
  };

  const saveSync = async () => {
    setSavingSync(true);
    setSyncNotice(null);
    try {
      await Promise.all([
        supabase.from('app_settings').update({ value: syncSettings.enabled }).eq('key', 'pathao_sync_enabled'),
        supabase.from('app_settings').update({ value: syncSettings.intervalHours }).eq('key', 'pathao_sync_interval_hours'),
        supabase.from('app_settings').update({ value: syncSettings.lookbackDays }).eq('key', 'pathao_sync_lookback_days'),
      ]);
      setSyncNotice({ ok: true, message: 'Sync settings saved' });
    } catch (err: unknown) {
      setSyncNotice({ ok: false, message: (err as Error)?.message || 'Failed to save' });
    } finally {
      setSavingSync(false);
    }
  };

  const runSync = async () => {
    setSyncing(true);
    setSyncRunResult(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/pathao-sync-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.skipped) {
        setSyncNotice({ ok: false, message: data.reason ?? 'Sync skipped' });
      } else if (data.error) {
        setSyncNotice({ ok: false, message: data.error });
      } else {
        setSyncRunResult(data as SyncResult);
        setSyncNotice({ ok: true, message: `Sync complete — ${data.updated} updated` });
        loadConfigs();
      }
    } catch (err: unknown) {
      setSyncNotice({ ok: false, message: (err as Error)?.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const formatTs = (ts: string) => new Date(ts).toLocaleString();

  const getSyncStatusIndicator = () => {
    if (!syncSettings.lastRun) return { color: 'bg-gray-300', label: 'Never run' };
    const hoursSince = (Date.now() - new Date(syncSettings.lastRun).getTime()) / (1000 * 60 * 60);
    if (hoursSince < syncSettings.intervalHours * 1.5) return { color: 'bg-emerald-500', label: 'On schedule' };
    if (hoursSince < syncSettings.intervalHours * 3) return { color: 'bg-amber-500', label: 'Slightly overdue' };
    return { color: 'bg-red-500', label: 'Overdue' };
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Courier Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Configure Pathao and Steadfast courier integrations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Pathao */}
          <Card>
            <div
              className="p-5 flex items-center justify-between cursor-pointer select-none"
              onClick={() => setPathaoExpanded(v => !v)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                  <Truck className="w-4.5 h-4.5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Pathao Courier</h3>
                  <p className="text-xs text-gray-400 mt-0.5">OAuth 2.0 authentication — sandbox & production</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {pathaoEnabled
                  ? <Badge variant="emerald">Enabled</Badge>
                  : <Badge variant="gray">Disabled</Badge>}
                {pathaoExpanded
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>

            {pathaoExpanded && (
              <div className="border-t border-gray-100">
                <div className="p-5 space-y-5">
                  {/* Enable toggle + Environment */}
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setPathaoEnabled(v => !v)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {pathaoEnabled
                          ? <ToggleRight className="w-8 h-8 text-emerald-500" />
                          : <ToggleLeft className="w-8 h-8" />}
                      </button>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Enable Pathao</p>
                        <p className="text-xs text-gray-400">Allow creating Pathao deliveries from orders</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-gray-500 font-medium">Environment:</span>
                      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                        <button
                          onClick={() => setPathaoEnv('sandbox')}
                          className={`px-3 py-1.5 transition-colors ${pathaoEnv === 'sandbox' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                          Sandbox
                        </button>
                        <button
                          onClick={() => setPathaoEnv('production')}
                          className={`px-3 py-1.5 transition-colors ${pathaoEnv === 'production' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                          Production
                        </button>
                      </div>
                    </div>
                  </div>

                  {pathaoEnv === 'sandbox' && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Sandbox mode active</p>
                        <p className="mt-0.5">Orders will be submitted to the Pathao test environment. No real deliveries will be created.</p>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Link className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span className="text-xs font-semibold text-gray-700">Webhook Callback URL</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Register this URL in your Pathao merchant dashboard under webhook settings so Pathao can push order status updates to your system.
                    </p>
                    {pathaoWebhookUrl ? (
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 text-xs font-mono bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-800 truncate select-all">
                          {pathaoWebhookUrl}
                        </code>
                        <button
                          type="button"
                          onClick={copyWebhookUrl}
                          title="Copy URL"
                          className="flex-shrink-0 p-2 rounded-md border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors"
                        >
                          {webhookCopied
                            ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                            : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                        VITE_SUPABASE_URL is not set — cannot generate the callback URL.
                      </div>
                    )}
                  </div>

                  {pathaoConfig?.webhook_secret && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Link className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                        <span className="text-xs font-semibold text-gray-700">Webhook Secret</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Enter this value in your Pathao merchant dashboard as the webhook integration secret. It is used to verify that incoming webhook requests are genuine.
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 text-xs font-mono bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-800 truncate select-all">
                          {showWebhookSecret ? pathaoConfig.webhook_secret : '•'.repeat(36)}
                        </code>
                        <button
                          type="button"
                          onClick={() => setShowWebhookSecret(v => !v)}
                          title={showWebhookSecret ? 'Hide secret' : 'Show secret'}
                          className="flex-shrink-0 p-2 rounded-md border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors"
                        >
                          {showWebhookSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyWebhookSecret(pathaoConfig.webhook_secret!)}
                          title="Copy secret"
                          className="flex-shrink-0 p-2 rounded-md border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors"
                        >
                          {webhookSecretCopied
                            ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                            : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Client ID</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                        placeholder="Client ID"
                        value={pathaoForm.client_id}
                        onChange={e => setPathaoForm(f => ({ ...f, client_id: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Client Secret</label>
                      <div className="relative">
                        <input
                          type={showPathaoSecret ? 'text' : 'password'}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                          placeholder="Client Secret"
                          value={pathaoForm.client_secret}
                          onChange={e => setPathaoForm(f => ({ ...f, client_secret: e.target.value }))}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPathaoSecret(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPathaoSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Username (Email)</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                        placeholder="merchant@example.com"
                        value={pathaoForm.username}
                        onChange={e => setPathaoForm(f => ({ ...f, username: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
                      <div className="relative">
                        <input
                          type={showPathaoPassword ? 'text' : 'password'}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                          placeholder="Password"
                          value={pathaoForm.password}
                          onChange={e => setPathaoForm(f => ({ ...f, password: e.target.value }))}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPathaoPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPathaoPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Store ID</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                        placeholder="Your Pathao store ID (numeric)"
                        value={pathaoForm.store_id}
                        onChange={e => setPathaoForm(f => ({ ...f, store_id: e.target.value }))}
                      />
                    </div>
                  </div>

                  {pathaoNotice && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${pathaoNotice.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {pathaoNotice.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                      {pathaoNotice.message}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-gray-400">
                      {pathaoConfig?.updated_at && <>Last saved: {formatTs(pathaoConfig.updated_at)}</>}
                    </div>
                    <Button
                      onClick={savePathao}
                      disabled={savingPathao}
                      className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-700"
                    >
                      {savingPathao
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                        : <><Save className="w-4 h-4" /> Save Pathao Settings</>}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Steadfast */}
          <Card>
            <div
              className="p-5 flex items-center justify-between cursor-pointer select-none"
              onClick={() => setSteadfastExpanded(v => !v)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Truck className="w-4.5 h-4.5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Steadfast Courier</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Header-based authentication — portal.packzy.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {steadfastEnabled
                  ? <Badge variant="emerald">Enabled</Badge>
                  : <Badge variant="gray">Disabled</Badge>}
                {steadfastExpanded
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>

            {steadfastExpanded && (
              <div className="border-t border-gray-100">
                <div className="p-5 space-y-5">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSteadfastEnabled(v => !v)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {steadfastEnabled
                        ? <ToggleRight className="w-8 h-8 text-emerald-500" />
                        : <ToggleLeft className="w-8 h-8" />}
                    </button>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Enable Steadfast</p>
                      <p className="text-xs text-gray-400">Allow creating Steadfast deliveries from orders</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">API Key</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                        placeholder="Api-Key header value"
                        value={steadfastForm.api_key}
                        onChange={e => setSteadfastForm(f => ({ ...f, api_key: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Secret Key</label>
                      <div className="relative">
                        <input
                          type={showSteadfastSecret ? 'text' : 'password'}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                          placeholder="Secret-Key header value"
                          value={steadfastForm.secret_key}
                          onChange={e => setSteadfastForm(f => ({ ...f, secret_key: e.target.value }))}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSteadfastSecret(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showSteadfastSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {steadfastNotice && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${steadfastNotice.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {steadfastNotice.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                      {steadfastNotice.message}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-gray-400">
                      {steadfastConfig?.updated_at && <>Last saved: {formatTs(steadfastConfig.updated_at)}</>}
                    </div>
                    <Button
                      onClick={saveSteadfast}
                      disabled={savingSteadfast}
                      className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-700"
                    >
                      {savingSteadfast
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                        : <><Save className="w-4 h-4" /> Save Steadfast Settings</>}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
          {/* Pathao Status Sync */}
          <Card>
            <div
              className="p-5 flex items-center justify-between cursor-pointer select-none"
              onClick={() => setSyncExpanded(v => !v)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Pathao Status Sync</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Automatically pull delivery status via REST API</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {syncSettings.enabled
                  ? <Badge variant="emerald">Auto Sync On</Badge>
                  : <Badge variant="gray">Auto Sync Off</Badge>}
                {syncExpanded
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>

            {syncExpanded && (
              <div className="border-t border-gray-100">
                <div className="p-5 space-y-5">

                  {/* Status strip */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-gray-900">{eligibleCount ?? '—'}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">Orders to track</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {syncSettings.lastRun ? `${syncSettings.intervalHours}h` : '—'}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">Sync interval</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${getSyncStatusIndicator().color}`} />
                        <span className="text-xs font-medium text-gray-700">{getSyncStatusIndicator().label}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        {syncSettings.lastRun ? formatTs(syncSettings.lastRun) : 'Never run'}
                      </div>
                    </div>
                  </div>

                  {/* Last result */}
                  {syncSettings.lastResult && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5 space-y-2">
                      <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Last sync result
                        {syncSettings.lastRun && <span className="font-normal text-gray-400">— {formatTs(syncSettings.lastRun)}</span>}
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-gray-600"><span className="font-semibold text-gray-900">{syncSettings.lastResult.checked}</span> checked</span>
                        <span className="text-emerald-700"><span className="font-semibold">{syncSettings.lastResult.updated}</span> updated</span>
                        <span className="text-gray-500"><span className="font-semibold">{syncSettings.lastResult.unchanged}</span> unchanged</span>
                        {syncSettings.lastResult.partial_delivery_count > 0 && (
                          <span className="text-orange-600 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {syncSettings.lastResult.partial_delivery_count} partial delivery
                          </span>
                        )}
                        {syncSettings.lastResult.errors.length > 0 && (
                          <span className="text-red-600"><span className="font-semibold">{syncSettings.lastResult.errors.length}</span> errors</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Live result from manual sync */}
                  {syncRunResult && (
                    <div className="rounded-lg border border-teal-200 bg-teal-50 p-3.5 space-y-2">
                      <p className="text-xs font-semibold text-teal-800 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        Manual sync result
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-teal-700"><span className="font-semibold text-teal-900">{syncRunResult.checked}</span> checked</span>
                        <span className="text-emerald-700"><span className="font-semibold">{syncRunResult.updated}</span> updated</span>
                        <span className="text-gray-500"><span className="font-semibold">{syncRunResult.unchanged}</span> unchanged</span>
                        {syncRunResult.partial_delivery_count > 0 && (
                          <span className="text-orange-600 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {syncRunResult.partial_delivery_count} partial delivery
                          </span>
                        )}
                        {syncRunResult.errors.length > 0 && (
                          <span className="text-red-600"><span className="font-semibold">{syncRunResult.errors.length}</span> errors</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Auto sync toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSyncSettings(s => ({ ...s, enabled: !s.enabled }))}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {syncSettings.enabled
                        ? <ToggleRight className="w-8 h-8 text-emerald-500" />
                        : <ToggleLeft className="w-8 h-8" />}
                    </button>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Enable automatic sync</p>
                      <p className="text-xs text-gray-400">Runs every hour via scheduled job — skips if interval not reached</p>
                    </div>
                  </div>

                  {/* Interval + lookback */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Sync Interval</label>
                      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                        {[1, 2, 4, 6, 12, 24].map(h => (
                          <button
                            key={h}
                            onClick={() => setSyncSettings(s => ({ ...s, intervalHours: h }))}
                            className={`flex-1 py-2 transition-colors ${syncSettings.intervalHours === h ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                          >
                            {h}h
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">Minimum 1 hour</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Lookback Window</label>
                      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                        {[7, 14, 21, 30].map(d => (
                          <button
                            key={d}
                            onClick={() => setSyncSettings(s => ({ ...s, lookbackDays: d }))}
                            className={`flex-1 py-2 transition-colors ${syncSettings.lookbackDays === d ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">Only sync orders booked within this window</p>
                    </div>
                  </div>

                  {syncNotice && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${syncNotice.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {syncNotice.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                      {syncNotice.message}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 gap-3 flex-wrap">
                    <Button
                      onClick={runSync}
                      disabled={syncing}
                      className="flex items-center gap-2 bg-teal-600 text-white hover:bg-teal-700"
                    >
                      {syncing
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Syncing...</>
                        : <><RefreshCw className="w-4 h-4" /> Sync Now</>}
                    </Button>
                    <Button
                      onClick={saveSync}
                      disabled={savingSync}
                      className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-700 ml-auto"
                    >
                      {savingSync
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                        : <><Save className="w-4 h-4" /> Save Sync Settings</>}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>

        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Status Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${pathaoEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <span className="text-sm text-gray-700">Pathao</span>
                  {pathaoEnabled && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${pathaoEnv === 'sandbox' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                      {pathaoEnv}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-medium ${pathaoEnabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {pathaoEnabled ? 'Active' : 'Off'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${steadfastEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <span className="text-sm text-gray-700">Steadfast</span>
                </div>
                <span className={`text-xs font-medium ${steadfastEnabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {steadfastEnabled ? 'Active' : 'Off'}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Order Status Mapping</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              After saving credentials, courier order statuses will be pulled and mapped to your ERP delivery status automatically when you view an order.
            </p>
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-gray-600">Pathao statuses tracked:</p>
              {['Pending', 'Processing', 'In Transit', 'Delivered', 'Cancelled', 'Returned', 'Hold'].map(s => (
                <div key={s} className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                  {s}
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-gray-600">Steadfast statuses tracked:</p>
              {['in_review', 'pending', 'delivered', 'partial_delivered', 'cancelled', 'hold', 'unknown'].map(s => (
                <div key={s} className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                  {s}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Pathao Sandbox Credentials</h3>
            <p className="text-xs text-gray-500">Use these to test the integration before going live:</p>
            <div className="space-y-1.5 font-mono text-xs text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div><span className="text-gray-400">client_id:</span> 7N1aMJQbWm</div>
              <div><span className="text-gray-400">client_secret:</span> wRcaibZkUd...</div>
              <div><span className="text-gray-400">username:</span> test@pathao.com</div>
              <div><span className="text-gray-400">password:</span> lovePathao</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
