import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft, KeyRound, Eye, EyeOff, Copy, RefreshCw,
  CheckCircle2, Terminal, Info, Loader2, ShieldCheck
} from 'lucide-react';

const SETTING_KEY = 'order_lookup_api_secret';

function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function ApiAccessSettings() {
  const navigate = useNavigate();

  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  const endpointUrl = `${supabaseUrl}/functions/v1/order-lookup`;

  useEffect(() => {
    loadSecret();
  }, []);

  async function loadSecret() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle();
      if (error) throw error;
      if (data?.value) {
        setSecret(typeof data.value === 'string' ? data.value : String(data.value));
      }
    } catch (err) {
      console.error('Failed to load API secret:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(newSecret: string) {
    setSaving(true);
    setSaveMsg(null);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { key: SETTING_KEY, value: newSecret },
          { onConflict: 'key' }
        );
      if (error) throw error;
      setSecret(newSecret);
      setSaveMsg({ type: 'success', text: 'API secret saved successfully.' });
    } catch {
      setSaveMsg({ type: 'error', text: 'Failed to save API secret.' });
    } finally {
      setSaving(false);
    }
  }

  function handleRegenerate() {
    const newSecret = generateSecret();
    handleSave(newSecret);
  }

  async function handleCopy() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const maskedSecret = secret ? secret.slice(0, 8) + '••••••••••••••••••••••••' + secret.slice(-4) : '';
  const displayValue = showSecret ? secret : maskedSecret;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-blue-600" />
            API Access
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage API keys for external integrations</p>
        </div>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 rounded-lg mt-0.5">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800">Order Lookup API</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Authenticate external requests to the order lookup endpoint. Include this secret
              in the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">X-API-Key</code> header with every request.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">API Secret</label>
          {secret ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  readOnly
                  type="text"
                  value={displayValue}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm font-mono bg-gray-50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">No API secret configured. Generate one to enable API access.</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRegenerate}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {secret ? 'Regenerate Secret' : 'Generate Secret'}
          </Button>
          {saveMsg && (
            <span className={`text-sm ${saveMsg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {saveMsg.text}
            </span>
          )}
        </div>

        {secret && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Regenerating the secret will immediately invalidate the current key. Any external integrations using the old key must be updated.
            </span>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Endpoint Reference</h2>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-700">Endpoint URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-900 text-green-400 text-xs font-mono px-4 py-2.5 rounded-lg overflow-x-auto">
              {endpointUrl}
            </code>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Example Request</p>
          <pre className="bg-gray-900 text-gray-100 text-xs font-mono px-4 py-3 rounded-lg overflow-x-auto leading-relaxed">
{`curl -X GET \\
  "${endpointUrl}?order_id=<ORDER_UUID>" \\
  -H "X-API-Key: <your-api-secret>"`}
          </pre>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Example Response</p>
          <pre className="bg-gray-900 text-gray-100 text-xs font-mono px-4 py-3 rounded-lg overflow-x-auto leading-relaxed">
{`{
  "success": true,
  "data": {
    "order_id": "uuid",
    "order_number": "WC-1001",
    "customer_name": "John Doe",
    "phone": "01712345678",
    "order_total": 1200,
    "cs_status": "confirmed",
    "items": [...],
    "courier_company": "pathao",
    "tracking_number": "PTH123456",
    "courier_status": "Delivered"
  }
}`}
          </pre>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm pt-1">
          <div className="space-y-1.5">
            <p className="font-medium text-gray-600">Supported Methods</p>
            <p className="text-gray-500">GET — pass <code className="bg-gray-100 px-1 rounded text-xs">order_id</code> as query param</p>
            <p className="text-gray-500">POST — pass <code className="bg-gray-100 px-1 rounded text-xs">order_id</code> in request body</p>
          </div>
          <div className="space-y-1.5">
            <p className="font-medium text-gray-600">Authentication</p>
            <p className="text-gray-500">Header: <code className="bg-gray-100 px-1 rounded text-xs">X-API-Key: &lt;secret&gt;</code></p>
            <p className="text-gray-500">Returns <code className="bg-gray-100 px-1 rounded text-xs">401</code> if key is missing or invalid</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
