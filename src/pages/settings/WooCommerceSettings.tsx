import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ArrowLeft, ShoppingCart, Eye, EyeOff, CheckCircle2,
  XCircle, RefreshCw, Clock, ToggleLeft, ToggleRight,
  AlertCircle, Info, Plus, Pencil, ChevronDown, ChevronUp,
  PlayCircle, Image, CheckCheck, Webhook, Zap, Trash2, RotateCcw
} from 'lucide-react';

interface WooConfig {
  id: string;
  store_url: string | null;
  consumer_key: string | null;
  consumer_secret: string | null;
  is_connected: boolean;
  last_product_sync: string | null;
  last_order_sync: string | null;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  updated_at: string;
  webhook_id: number | null;
  webhook_status: string | null;
  webhook_secret: string | null;
  last_webhook_received_at: string | null;
}

interface SyncLog {
  id: string;
  sync_type: 'products' | 'orders';
  started_at: string;
  completed_at: string | null;
  records_synced: number;
  status: 'running' | 'success' | 'failed';
  error_message: string | null;
  last_synced_page: number;
  total_pages: number;
}

interface LiveLogEntry {
  sku: string;
  name: string;
  action: 'added' | 'updated' | 'skipped';
}

export default function WooCommerceSettings() {
  const navigate = useNavigate();

  const [config, setConfig] = useState<WooConfig | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ store_url: '', consumer_key: '', consumer_secret: '' });
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<'products' | 'orders' | null>(null);

  const [showOrderFilter, setShowOrderFilter] = useState(false);
  const [orderFilter, setOrderFilter] = useState({ type: 'id' as 'date' | 'id', from_date: '', to_date: '', min_order_id: '' });
  const [orderSyncProgress, setOrderSyncProgress] = useState<{ imported: number; skipped: number; total: number } | null>(null);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const [liveLog, setLiveLog] = useState<LiveLogEntry[]>([]);
  const [syncProgress, setSyncProgress] = useState<{ page: number; totalPages: number; processed: number } | null>(null);
  const [showLiveLog, setShowLiveLog] = useState(true);
  const liveLogRef = useRef<HTMLDivElement>(null);

  const [webhookWorking, setWebhookWorking] = useState(false);
  const [webhookNotice, setWebhookNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [checkingWebhook, setCheckingWebhook] = useState(false);

  const [imageMigrating, setImageMigrating] = useState(false);
  const [imageMigrationDone, setImageMigrationDone] = useState(false);
  const [imageMigrationProgress, setImageMigrationProgress] = useState<{ migrated: number; errors: number; skipped: number; total: number } | null>(null);
  const [imageMigrationLog, setImageMigrationLog] = useState<{ batch: number; migrated: number; errors: number; skipped: number }[]>([]);
  const imageMigrationAbortRef = useRef(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (liveLogRef.current) {
      liveLogRef.current.scrollTop = liveLogRef.current.scrollHeight;
    }
  }, [liveLog]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const [cfgRes, logRes] = await Promise.all([
        supabase.from('woocommerce_config').select('*').maybeSingle(),
        supabase.from('woo_sync_log').select('*').order('started_at', { ascending: false }).limit(10),
      ]);

      if (cfgRes.data) {
        setConfig(cfgRes.data);
        setForm({
          store_url: cfgRes.data.store_url || '',
          consumer_key: cfgRes.data.consumer_key || '',
          consumer_secret: cfgRes.data.consumer_secret || '',
        });
      }
      setSyncLogs(logRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const refreshLogs = async () => {
    const { data } = await supabase
      .from('woo_sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);
    setSyncLogs(data || []);
  };

  const callProxy = async (body: Record<string, unknown>) => {
    const res = await fetch(`${supabaseUrl}/functions/v1/woo-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const data = await callProxy({
        action: 'test-connection',
        store_url: form.store_url,
        consumer_key: form.consumer_key,
        consumer_secret: form.consumer_secret,
      });
      if (data.connected) {
        setTestResult({ ok: true, message: `Connected — WooCommerce v${data.wc_version}` });
      } else {
        setTestResult({ ok: false, message: data.error || 'Connection failed' });
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.message || 'Network error' });
    } finally {
      setTesting(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload = {
        store_url: form.store_url,
        consumer_key: form.consumer_key,
        consumer_secret: form.consumer_secret,
        is_connected: testResult?.ok ?? config?.is_connected ?? false,
        updated_at: new Date().toISOString(),
      };

      if (config?.id) {
        const { error } = await supabase.from('woocommerce_config').update(payload).eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('woocommerce_config').insert(payload);
        if (error) throw error;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadConfig();
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleAutoSync = async () => {
    if (!config?.id) return;
    const newVal = !config.auto_sync_enabled;
    await supabase.from('woocommerce_config').update({ auto_sync_enabled: newVal }).eq('id', config.id);
    setConfig(c => c ? { ...c, auto_sync_enabled: newVal } : c);
  };

  const runProductSync = async (resumeFromPage?: number) => {
    setSyncing('products');
    setSyncNotice(null);
    setLiveLog([]);
    setShowLiveLog(true);
    setSyncProgress(null);

    const { data: logRow } = await supabase
      .from('woo_sync_log')
      .insert({ sync_type: 'products', status: 'running', last_synced_page: resumeFromPage ? resumeFromPage - 1 : 0 })
      .select()
      .maybeSingle();

    await refreshLogs();

    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let totalPages = 1;
    let startPage = resumeFromPage ?? 1;

    try {
      for (let page = startPage; page <= totalPages; page++) {
        const data = await callProxy({
          action: 'fetch-products-page',
          store_url: form.store_url,
          consumer_key: form.consumer_key,
          consumer_secret: form.consumer_secret,
          page,
        });

        if (data.error) throw new Error(data.error);

        totalPages = data.total_pages ?? 1;

        setSyncProgress({ page, totalPages, processed: (page - 1) * 100 });

        for (const p of (data.products || [])) {
          const sku = p.sku || String(p.id);
          const displayName = p._parent_id
            ? `${p._parent_name} - ${p.name || p.attributes?.map((a: any) => a.option).join(' / ')}`
            : p.name;

          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('sku', sku)
            .maybeSingle();

          if (existing) {
            skippedCount++;
            setLiveLog(prev => [...prev, { sku, name: displayName, action: 'skipped' }]);
          } else {
            const productData = {
              sku,
              name: displayName,
              selling_price: p.price ? parseFloat(p.price) : null,
              image_url: p.images?.[0]?.src || p._parent_image || null,
              woo_product_id: p._parent_id ? p._parent_id : p.id,
              woo_variation_id: p._parent_id ? p.id : null,
              woo_parent_product_id: p._parent_id || null,
              woo_parent_name: p._parent_name || null,
              woo_attributes: p.attributes?.length
                ? p.attributes.map((a: any) => ({ [a.name]: a.option }))
                : null,
              is_active: true,
              low_stock_threshold: 20,
              updated_at: new Date().toISOString(),
            };
            await supabase.from('products').insert(productData);
            newCount++;
            setLiveLog(prev => [...prev, { sku, name: displayName, action: 'added' }]);
          }
        }

        if (logRow?.id) {
          await supabase.from('woo_sync_log').update({
            last_synced_page: page,
            total_pages: totalPages,
            records_synced: newCount + updatedCount,
          }).eq('id', logRow.id);
        }
      }

      if (logRow?.id) {
        await supabase.from('woo_sync_log').update({
          completed_at: new Date().toISOString(),
          records_synced: newCount + updatedCount,
          status: 'success',
          total_pages: totalPages,
          last_synced_page: totalPages,
        }).eq('id', logRow.id);
      }

      if (config?.id) {
        await supabase.from('woocommerce_config')
          .update({ last_product_sync: new Date().toISOString() })
          .eq('id', config.id);
      }

      setSyncNotice({ ok: true, message: `Sync complete: ${newCount} added, ${skippedCount} already existed` });
      loadConfig();
    } catch (err: any) {
      if (logRow?.id) {
        await supabase.from('woo_sync_log').update({
          completed_at: new Date().toISOString(),
          status: 'failed',
          error_message: err?.message,
        }).eq('id', logRow.id);
      }
      setSyncNotice({ ok: false, message: `Sync failed: ${err?.message}` });
      await refreshLogs();
    } finally {
      setSyncing(null);
      setSyncProgress(null);
      await refreshLogs();
    }
  };

  const syncProducts = () => runProductSync(1);

  const resumeSync = () => {
    const lastInterrupted = syncLogs.find(
      l => l.sync_type === 'products' && (l.status === 'failed' || l.status === 'running') && l.last_synced_page > 0
    );
    if (lastInterrupted) {
      runProductSync(lastInterrupted.last_synced_page + 1);
    }
  };

  const syncOrders = async () => {
    if (orderFilter.type === 'date' && (!orderFilter.from_date || !orderFilter.to_date)) return;
    if (orderFilter.type === 'id' && !orderFilter.min_order_id) return;

    setSyncing('orders');
    setSyncNotice(null);
    setShowOrderFilter(false);
    setOrderSyncProgress(null);

    const { data: logRow } = await supabase
      .from('woo_sync_log')
      .insert({ sync_type: 'orders', status: 'running' })
      .select()
      .maybeSingle();

    await refreshLogs();

    try {
      const body: Record<string, unknown> = {
        action: 'fetch-orders',
        store_url: form.store_url,
        consumer_key: form.consumer_key,
        consumer_secret: form.consumer_secret,
      };

      if (orderFilter.type === 'date' && orderFilter.from_date && orderFilter.to_date) {
        body.from_date = new Date(orderFilter.from_date).toISOString();
        body.to_date = new Date(orderFilter.to_date + 'T23:59:59').toISOString();
      } else if (orderFilter.type === 'id' && orderFilter.min_order_id) {
        body.min_order_id = parseInt(orderFilter.min_order_id);
      }

      const data = await callProxy(body);
      if (data.error) throw new Error(data.error);

      const orders: any[] = data.orders || [];
      const total = orders.length;
      let imported = 0;
      let skipped = 0;

      setOrderSyncProgress({ imported: 0, skipped: 0, total });

      for (const order of orders) {
        try {
          const result = await callProxy({
            action: 'import-order',
            store_url: form.store_url,
            consumer_key: form.consumer_key,
            consumer_secret: form.consumer_secret,
            order,
          });
          if (result.skipped) {
            skipped++;
          } else if (result.order_id) {
            imported++;
          } else {
            skipped++;
          }
        } catch {
          skipped++;
        }
        setOrderSyncProgress({ imported, skipped, total });
      }

      if (logRow?.id) {
        await supabase.from('woo_sync_log').update({
          completed_at: new Date().toISOString(),
          records_synced: imported,
          status: 'success',
        }).eq('id', logRow.id);
      }

      if (config?.id) {
        await supabase.from('woocommerce_config')
          .update({ last_order_sync: new Date().toISOString() })
          .eq('id', config.id);
      }

      setSyncNotice({ ok: true, message: `Order sync complete: ${imported} imported, ${skipped} already existed (${total} total fetched)` });
      loadConfig();
    } catch (err: any) {
      if (logRow?.id) {
        await supabase.from('woo_sync_log').update({
          completed_at: new Date().toISOString(),
          status: 'failed',
          error_message: err?.message,
        }).eq('id', logRow.id);
      }
      setSyncNotice({ ok: false, message: `Order sync failed: ${err?.message}` });
      await refreshLogs();
    } finally {
      setSyncing(null);
      setOrderFilter({ type: 'id', from_date: '', to_date: '', min_order_id: '' });
      await refreshLogs();
    }
  };

  const webhookUrl = `${supabaseUrl}/functions/v1/woo-webhook`;

  const registerWebhook = async () => {
    setWebhookWorking(true);
    setWebhookNotice(null);
    try {
      const data = await callProxy({
        action: 'register-webhook',
        store_url: form.store_url,
        consumer_key: form.consumer_key,
        consumer_secret: form.consumer_secret,
        webhook_url: webhookUrl,
      });
      if (data.error) throw new Error(data.error);
      setWebhookNotice({ ok: true, message: `Webhook registered — ${data.webhooks?.length ?? 1} topic(s) active` });
      loadConfig();
    } catch (err: any) {
      setWebhookNotice({ ok: false, message: err?.message || 'Failed to register webhook' });
    } finally {
      setWebhookWorking(false);
    }
  };

  const checkWebhookStatus = async () => {
    if (!config?.webhook_id) return;
    setCheckingWebhook(true);
    setWebhookNotice(null);
    try {
      const data = await callProxy({
        action: 'check-webhook',
        store_url: form.store_url,
        consumer_key: form.consumer_key,
        consumer_secret: form.consumer_secret,
        webhook_id: config.webhook_id,
      });
      if (data.error) throw new Error(data.error);
      const status = data.webhook?.status ?? 'unknown';
      setWebhookNotice({ ok: status === 'active', message: `Webhook status on WooCommerce: ${status}` });
      loadConfig();
    } catch (err: any) {
      setWebhookNotice({ ok: false, message: err?.message || 'Failed to check webhook' });
    } finally {
      setCheckingWebhook(false);
    }
  };

  const reactivateWebhook = async () => {
    if (!config?.webhook_id) return;
    setWebhookWorking(true);
    setWebhookNotice(null);
    try {
      const data = await callProxy({
        action: 'reactivate-webhook',
        store_url: form.store_url,
        consumer_key: form.consumer_key,
        consumer_secret: form.consumer_secret,
        webhook_id: config.webhook_id,
      });
      if (data.error) throw new Error(data.error);
      setWebhookNotice({ ok: true, message: 'Webhook reactivated successfully' });
      loadConfig();
    } catch (err: any) {
      setWebhookNotice({ ok: false, message: err?.message || 'Failed to reactivate webhook' });
    } finally {
      setWebhookWorking(false);
    }
  };

  const deleteWebhook = async () => {
    if (!config?.webhook_id) return;
    setWebhookWorking(true);
    setWebhookNotice(null);
    try {
      const data = await callProxy({
        action: 'delete-webhook',
        store_url: form.store_url,
        consumer_key: form.consumer_key,
        consumer_secret: form.consumer_secret,
        webhook_id: config.webhook_id,
      });
      if (data.error) throw new Error(data.error);
      setWebhookNotice({ ok: true, message: 'Webhook removed' });
      loadConfig();
    } catch (err: any) {
      setWebhookNotice({ ok: false, message: err?.message || 'Failed to delete webhook' });
    } finally {
      setWebhookWorking(false);
    }
  };

  const runImageMigration = async () => {
    setImageMigrating(true);
    setImageMigrationDone(false);
    setImageMigrationLog([]);
    imageMigrationAbortRef.current = false;

    const { count: totalCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .not('image_url', 'is', null)
      .not('image_url', 'like', `%${supabaseUrl}%`);

    const total = totalCount || 0;
    setImageMigrationProgress({ migrated: 0, errors: 0, skipped: 0, total });

    if (total === 0) {
      setImageMigrating(false);
      setImageMigrationDone(true);
      return;
    }

    const batchSize = 20;
    let offset = 0;
    let batchNum = 0;
    let cumulativeMigrated = 0;
    let cumulativeErrors = 0;
    let cumulativeSkipped = 0;

    while (!imageMigrationAbortRef.current) {
      const res = await fetch(
        `${supabaseUrl}/functions/v1/migrate-product-images?batch=${batchSize}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${supabaseAnonKey}` } }
      );
      const data = await res.json();

      if (!res.ok || data.error) break;

      cumulativeMigrated += data.migrated || 0;
      cumulativeErrors += data.errors || 0;
      cumulativeSkipped += data.skipped || 0;
      batchNum += 1;

      setImageMigrationLog(prev => [...prev, {
        batch: batchNum,
        migrated: data.migrated || 0,
        errors: data.errors || 0,
        skipped: data.skipped || 0,
      }]);
      setImageMigrationProgress({ migrated: cumulativeMigrated, errors: cumulativeErrors, skipped: cumulativeSkipped, total });

      if (!data.batch_size || data.batch_size < batchSize) break;

      offset += batchSize;
    }

    setImageMigrating(false);
    setImageMigrationDone(true);
  };

  const formatTs = (ts: string | null) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString();
  };

  const interruptedSync = syncLogs.find(
    l => l.sync_type === 'products' && (l.status === 'failed' || l.status === 'running') && l.last_synced_page > 0
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
    </div>
  );

  const hasCredentials = form.store_url && form.consumer_key && form.consumer_secret;

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
          <h1 className="text-2xl font-bold text-gray-900">WooCommerce Integration</h1>
          <p className="text-sm text-gray-400 mt-0.5">Connect and sync products and orders from your WooCommerce store</p>
        </div>
        {config?.is_connected ? (
          <Badge variant="emerald" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Connected
          </Badge>
        ) : (
          <Badge variant="gray" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Not Connected
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">API Credentials</h3>
              <p className="text-xs text-gray-400 mt-0.5">Generate these from WooCommerce → Settings → Advanced → REST API</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Store URL</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  placeholder="https://yourstore.com"
                  value={form.store_url}
                  onChange={e => setForm(f => ({ ...f, store_url: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Consumer Key</label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    placeholder="ck_xxxxxxxxxxxxxxxxxxxx"
                    value={form.consumer_key}
                    onChange={e => setForm(f => ({ ...f, consumer_key: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Consumer Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    placeholder="cs_xxxxxxxxxxxxxxxxxxxx"
                    value={form.consumer_secret}
                    onChange={e => setForm(f => ({ ...f, consumer_secret: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {testResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {testResult.ok
                    ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 flex-shrink-0" />}
                  {testResult.message}
                </div>
              )}

              {saveError && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-red-50 text-red-700">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Settings saved successfully
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={testConnection}
                  disabled={testing || !hasCredentials}
                  className="flex items-center gap-2"
                >
                  {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button
                  onClick={saveSettings}
                  disabled={saving || !hasCredentials}
                  className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-700"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Manual Sync</h3>
              <p className="text-xs text-gray-400 mt-0.5">Trigger an immediate sync from your WooCommerce store</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-gray-200 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Products</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-400">Last sync: {formatTs(config?.last_product_sync || null)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={syncProducts}
                      disabled={!hasCredentials || syncing !== null}
                      className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white hover:bg-gray-700"
                    >
                      {syncing === 'products'
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Syncing...</>
                        : <><RefreshCw className="w-4 h-4" /> Sync Products</>}
                    </Button>
                    {interruptedSync && syncing === null && (
                      <Button
                        onClick={resumeSync}
                        disabled={!hasCredentials}
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        <PlayCircle className="w-4 h-4" />
                        Resume from Page {interruptedSync.last_synced_page + 1}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-gray-200 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Orders</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-400">Last sync: {formatTs(config?.last_order_sync || null)}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowOrderFilter(true)}
                    disabled={!hasCredentials || syncing !== null}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white hover:bg-gray-700"
                  >
                    {syncing === 'orders'
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Syncing...</>
                      : <><RefreshCw className="w-4 h-4" /> Sync Orders</>}
                  </Button>
                </div>
              </div>

              {syncNotice && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${syncNotice.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {syncNotice.ok
                    ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 flex-shrink-0" />}
                  {syncNotice.message}
                </div>
              )}

              {(syncing === 'products' || liveLog.length > 0) && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 cursor-pointer"
                    onClick={() => setShowLiveLog(v => !v)}
                  >
                    <div className="flex items-center gap-2">
                      {syncing === 'products' && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                      <span className="text-xs font-medium text-gray-700">
                        {syncing === 'products' ? 'Importing...' : 'Import Complete'}
                        {syncProgress && (
                          <span className="ml-2 text-gray-400 font-normal">
                            Page {syncProgress.page} of {syncProgress.totalPages}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">
                        {liveLog.filter(e => e.action === 'added').length} added
                        {liveLog.filter(e => e.action === 'skipped').length > 0 && (
                          <> · {liveLog.filter(e => e.action === 'skipped').length} skipped</>
                        )}
                      </span>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      {showLiveLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {showLiveLog && (
                    <>
                      {syncProgress && (
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                            <span>Page {syncProgress.page} of {syncProgress.totalPages}</span>
                            <span>{Math.round((syncProgress.page / syncProgress.totalPages) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-gray-800 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${Math.round((syncProgress.page / syncProgress.totalPages) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div
                        ref={liveLogRef}
                        className="h-56 overflow-y-auto divide-y divide-gray-50 font-mono text-xs"
                      >
                        {liveLog.length === 0 && syncing === 'products' && (
                          <div className="px-4 py-3 text-gray-400">Fetching products from WooCommerce...</div>
                        )}
                        {liveLog.map((entry, i) => (
                          <div key={i} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-gray-50">
                            {entry.action === 'added' && (
                              <Plus className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            )}
                            {entry.action === 'updated' && (
                              <Pencil className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            )}
                            {entry.action === 'skipped' && (
                              <span className="w-3 h-3 flex-shrink-0 text-gray-300 text-center leading-none">—</span>
                            )}
                            <span className={`font-semibold flex-shrink-0 ${
                              entry.action === 'added' ? 'text-gray-700' :
                              entry.action === 'updated' ? 'text-blue-700' :
                              'text-gray-400'
                            }`}>
                              {entry.sku}
                            </span>
                            <span className={`truncate ${
                              entry.action === 'skipped' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {entry.name}
                            </span>
                            <span className={`ml-auto flex-shrink-0 text-xs ${
                              entry.action === 'added' ? 'text-emerald-500' :
                              entry.action === 'updated' ? 'text-blue-500' :
                              'text-gray-300'
                            }`}>
                              {entry.action === 'added' ? 'added' :
                               entry.action === 'updated' ? 'updated' :
                               'exists'}
                            </span>
                          </div>
                        ))}
                        {syncing === 'products' && liveLog.length > 0 && (
                          <div className="px-4 py-2 flex items-center gap-2 text-gray-400">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Processing...
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {syncing === 'orders' && orderSyncProgress && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-sm font-medium text-gray-700">
                      Importing orders... {orderSyncProgress.imported + orderSyncProgress.skipped} of {orderSyncProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-gray-800 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${orderSyncProgress.total > 0 ? Math.round(((orderSyncProgress.imported + orderSyncProgress.skipped) / orderSyncProgress.total) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span className="text-emerald-600 font-medium">{orderSyncProgress.imported} imported</span>
                    <span>{orderSyncProgress.skipped} already existed</span>
                  </div>
                </div>
              )}

              {showOrderFilter && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-800">Set a date range or starting order ID for sync</p>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={orderFilter.type === 'id'} onChange={() => setOrderFilter(f => ({ ...f, type: 'id' }))} />
                      From Order ID
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={orderFilter.type === 'date'} onChange={() => setOrderFilter(f => ({ ...f, type: 'date' }))} />
                      Date Range
                    </label>
                  </div>
                  {orderFilter.type === 'date' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                            value={orderFilter.from_date}
                            onChange={e => setOrderFilter(f => ({ ...f, from_date: e.target.value }))}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">To Date <span className="text-red-500">*</span></label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                            value={orderFilter.to_date}
                            min={orderFilter.from_date || undefined}
                            onChange={e => setOrderFilter(f => ({ ...f, to_date: e.target.value }))}
                          />
                        </div>
                      </div>
                      {orderFilter.from_date && orderFilter.to_date && (
                        <p className="text-xs text-blue-700">
                          Importing orders from{' '}
                          <strong>{new Date(orderFilter.from_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                          {' '}to{' '}
                          <strong>{new Date(orderFilter.to_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                          . Already-imported orders will be skipped.
                        </p>
                      )}
                    </div>
                  ) : (
                    <input
                      type="number"
                      placeholder="Min Order ID (e.g. 1000)"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
                      value={orderFilter.min_order_id}
                      onChange={e => setOrderFilter(f => ({ ...f, min_order_id: e.target.value }))}
                    />
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={syncOrders}
                      disabled={
                        orderFilter.type === 'date'
                          ? !orderFilter.from_date || !orderFilter.to_date
                          : !orderFilter.min_order_id
                      }
                      className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-700"
                      size="sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Start Sync
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowOrderFilter(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-gray-500" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Real-time Webhook</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Push new orders instantly into the system as they are placed</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {!config?.webhook_id ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-700 space-y-1">
                      <p className="font-medium">No webhook registered yet</p>
                      <p>Click below to automatically register <strong>order.created</strong> and <strong>order.updated</strong> webhooks on your WooCommerce store. New orders will appear in this system instantly.</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1.5">Webhook endpoint</p>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="text-xs font-mono text-gray-500 truncate flex-1">{webhookUrl}</span>
                    </div>
                  </div>
                  <Button
                    onClick={registerWebhook}
                    disabled={webhookWorking || !hasCredentials || !config?.id}
                    className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-700"
                  >
                    {webhookWorking
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Registering...</>
                      : <><Zap className="w-4 h-4" /> Register Webhook</>}
                  </Button>
                  {!config?.id && (
                    <p className="text-xs text-amber-600 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Save your settings first before registering a webhook.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <div className="flex items-center gap-1.5">
                        {config.webhook_status === 'active' ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm font-medium text-emerald-700">Active</span>
                          </>
                        ) : config.webhook_status === 'paused' ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="text-sm font-medium text-amber-700">Paused</span>
                          </>
                        ) : config.webhook_status === 'disabled' ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-sm font-medium text-red-700">Disabled</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                            <span className="text-sm font-medium text-gray-600 capitalize">{config.webhook_status ?? 'Unknown'}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                      <p className="text-xs text-gray-500 mb-1">Last delivery</p>
                      <p className="text-sm font-medium text-gray-800">
                        {config.last_webhook_received_at ? formatTs(config.last_webhook_received_at) : 'Never'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1.5">Webhook ID</p>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="text-xs font-mono text-gray-500">#{config.webhook_id}</span>
                      <span className="text-gray-300 mx-1">·</span>
                      <span className="text-xs font-mono text-gray-400 truncate flex-1">{webhookUrl}</span>
                    </div>
                  </div>

                  {config.webhook_status === 'disabled' && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Webhook disabled by WooCommerce</p>
                        <p className="mt-0.5">This happens after 5 consecutive delivery failures. Use "Re-enable" to restore it.</p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkWebhookStatus}
                      disabled={checkingWebhook || !hasCredentials}
                      className="flex items-center gap-1.5"
                    >
                      {checkingWebhook
                        ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking...</>
                        : <><RefreshCw className="w-3.5 h-3.5" /> Check Status</>}
                    </Button>
                    {config.webhook_status !== 'active' && (
                      <Button
                        size="sm"
                        onClick={reactivateWebhook}
                        disabled={webhookWorking || !hasCredentials}
                        className="flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        {webhookWorking
                          ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Working...</>
                          : <><RotateCcw className="w-3.5 h-3.5" /> Re-enable</>}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deleteWebhook}
                      disabled={webhookWorking || !hasCredentials}
                      className="flex items-center gap-1.5 border-red-200 text-red-600 hover:bg-red-50 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </Button>
                  </div>
                </div>
              )}

              {webhookNotice && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${webhookNotice.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {webhookNotice.ok
                    ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 flex-shrink-0" />}
                  {webhookNotice.message}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Sync Log</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 10 sync runs</p>
            </div>
            {syncLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No sync runs yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {syncLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <span className="text-sm text-gray-700 capitalize">{log.sync_type}</span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">{formatTs(log.started_at)}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">{formatTs(log.completed_at)}</td>
                        <td className="px-5 py-3 text-right text-sm text-gray-700">{log.records_synced}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {log.total_pages > 0
                            ? `Page ${log.last_synced_page} / ${log.total_pages}`
                            : '—'}
                        </td>
                        <td className="px-5 py-3">
                          {log.status === 'success' && <Badge variant="emerald">Success</Badge>}
                          {log.status === 'failed' && (
                            <div>
                              <Badge variant="red">Failed</Badge>
                              {log.error_message && (
                                <p className="text-xs text-red-500 mt-0.5 max-w-xs truncate">{log.error_message}</p>
                              )}
                            </div>
                          )}
                          {log.status === 'running' && <Badge variant="amber">Running</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-800">Product Image Migration</h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Copy product images from your WooCommerce store into Supabase storage to fix CORS errors and enable Excel export with images.
              </p>
            </div>
            <div className="p-5 space-y-4">
              {!imageMigrating && !imageMigrationDone && !imageMigrationProgress && (
                <p className="text-sm text-gray-500">
                  Products with external image URLs will be downloaded and re-hosted in Supabase storage. This runs in batches and may take several minutes for large catalogs.
                </p>
              )}

              {imageMigrationProgress && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {imageMigrationDone ? 'Migration complete' : 'Migrating images...'}
                    </span>
                    <span className="font-medium text-gray-800">
                      {imageMigrationProgress.migrated + imageMigrationProgress.skipped} / {imageMigrationProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-gray-800 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${imageMigrationProgress.total > 0 ? Math.round(((imageMigrationProgress.migrated + imageMigrationProgress.skipped) / imageMigrationProgress.total) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="w-3 h-3" /> {imageMigrationProgress.migrated} migrated
                    </span>
                    {imageMigrationProgress.skipped > 0 && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Clock className="w-3 h-3" /> {imageMigrationProgress.skipped} skipped
                      </span>
                    )}
                    {imageMigrationProgress.errors > 0 && (
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle className="w-3 h-3" /> {imageMigrationProgress.errors} errors
                      </span>
                    )}
                  </div>
                </div>
              )}

              {imageMigrationLog.length > 0 && (
                <div className="bg-gray-50 rounded-lg border border-gray-100 max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        <th className="px-3 py-1.5 text-left text-gray-500 font-medium">Batch</th>
                        <th className="px-3 py-1.5 text-right text-emerald-600 font-medium">Migrated</th>
                        <th className="px-3 py-1.5 text-right text-amber-500 font-medium">Skipped</th>
                        <th className="px-3 py-1.5 text-right text-red-500 font-medium">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {imageMigrationLog.map(entry => (
                        <tr key={entry.batch} className="hover:bg-white">
                          <td className="px-3 py-1.5 text-gray-500">#{entry.batch}</td>
                          <td className="px-3 py-1.5 text-right text-emerald-600">{entry.migrated}</td>
                          <td className="px-3 py-1.5 text-right text-amber-500">{entry.skipped}</td>
                          <td className="px-3 py-1.5 text-right text-red-500">{entry.errors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {imageMigrationDone && imageMigrationProgress?.total === 0 && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCheck className="w-4 h-4" />
                  All product images are already hosted in Supabase storage.
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button
                  onClick={runImageMigration}
                  disabled={imageMigrating}
                  className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-700"
                  size="sm"
                >
                  {imageMigrating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Migrating...
                    </>
                  ) : imageMigrationDone ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" /> Re-run Migration
                    </>
                  ) : (
                    <>
                      <Image className="w-3.5 h-3.5" /> Migrate Images
                    </>
                  )}
                </Button>
                {imageMigrating && (
                  <button
                    onClick={() => { imageMigrationAbortRef.current = true; }}
                    className="text-xs text-red-500 hover:text-red-700 underline"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>
          </Card>

        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Auto Sync</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Auto Sync</p>
                <p className="text-xs text-gray-400 mt-0.5">Sync automatically on a schedule</p>
              </div>
              <button onClick={toggleAutoSync} className="text-gray-400 hover:text-gray-600 transition-colors">
                {config?.auto_sync_enabled
                  ? <ToggleRight className="w-8 h-8 text-emerald-500" />
                  : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
            {config?.auto_sync_enabled && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Interval (minutes)</label>
                <input
                  type="number"
                  min="15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={config.sync_interval_minutes}
                  onChange={async e => {
                    const val = parseInt(e.target.value);
                    setConfig(c => c ? { ...c, sync_interval_minutes: val } : c);
                    if (config?.id) {
                      await supabase.from('woocommerce_config')
                        .update({ sync_interval_minutes: val })
                        .eq('id', config.id);
                    }
                  }}
                />
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-800">Setup Instructions</h3>
            </div>
            <ol className="space-y-2 text-xs text-gray-500 list-decimal list-inside">
              <li>Log in to your WordPress admin dashboard</li>
              <li>Go to <strong className="text-gray-700">WooCommerce → Settings → Advanced → REST API</strong></li>
              <li>Click <strong className="text-gray-700">Add Key</strong></li>
              <li>Set Description to "ERP", User to your admin, Permissions to <strong className="text-gray-700">Read/Write</strong></li>
              <li>Click <strong className="text-gray-700">Generate API Key</strong></li>
              <li>Copy the Consumer Key and Consumer Secret into the fields on the left</li>
            </ol>
          </Card>

          <Card className="p-5 divide-y divide-gray-100">
            <div className="pb-3">
              <p className="text-xs text-gray-500">Last Product Sync</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{formatTs(config?.last_product_sync || null)}</p>
            </div>
            <div className="pt-3">
              <p className="text-xs text-gray-500">Last Order Sync</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{formatTs(config?.last_order_sync || null)}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
