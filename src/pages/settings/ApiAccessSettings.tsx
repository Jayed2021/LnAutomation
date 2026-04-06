import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft, KeyRound, Eye, EyeOff, Copy, RefreshCw,
  CheckCircle2, Terminal, Info, Loader2, ShieldCheck,
  Phone, Hash, Search, AlertTriangle
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

      {/* Overview */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 rounded-lg mt-0.5 shrink-0">
            <Search className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-gray-800">Order Lookup API</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              The Order Lookup API gives external systems read-only access to order data. It is designed
              for integrations such as customer service bots, third-party dashboards, chatbots, and
              automated notification tools that need to retrieve order status without direct database access.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              The API exposes a single endpoint that supports two distinct query modes: <strong>order lookup</strong> —
              fetching full details of a specific order by its identifier — and <strong>phone lookup</strong> —
              returning a summary list of all orders associated with a given customer phone number.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              All requests must include the API secret in the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">X-API-Key</code> header.
              The secret is generated and stored here, and can be rotated at any time. There are no expiry
              policies — the secret remains valid until you regenerate it.
            </p>
          </div>
        </div>
      </Card>

      {/* Secret management */}
      <Card className="p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 rounded-lg mt-0.5 shrink-0">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800">API Secret</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              A 256-bit random secret used to authenticate all API requests. Treat this like a password —
              do not share it in public channels or commit it to source control.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
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
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Regenerating the secret will immediately invalidate the current key. All external integrations
              using the old key will stop working and must be updated.
            </span>
          </div>
        )}
      </Card>

      {/* Endpoint reference */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Endpoint Reference</h2>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-700">Base URL</p>
          <code className="block bg-gray-900 text-green-400 text-xs font-mono px-4 py-2.5 rounded-lg overflow-x-auto">
            {endpointUrl}
          </code>
        </div>

        {/* Lookup parameters table */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Accepted Lookup Parameters</p>
          <p className="text-sm text-gray-500">
            Pass exactly one of the following query parameters (GET) or JSON body fields (POST):
          </p>
          <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Parameter</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-white">
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-700">order_id</td>
                  <td className="px-4 py-2.5 text-gray-500">string</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    Accepts either a UUID (internal order ID) or a plain integer (WooCommerce order ID).
                    The API automatically detects which type was provided.
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-700">woo_order_id</td>
                  <td className="px-4 py-2.5 text-gray-500">integer</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    Explicit WooCommerce order ID (e.g. <code className="bg-gray-100 px-1 rounded text-xs">1966669</code>).
                    Use this when the caller always has a WooCommerce ID.
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-700">order_number</td>
                  <td className="px-4 py-2.5 text-gray-500">string</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    Internal order reference number (e.g. <code className="bg-gray-100 px-1 rounded text-xs">WC-1001</code>).
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-700">phone</td>
                  <td className="px-4 py-2.5 text-gray-500">string</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    Customer phone number. Triggers phone lookup mode — returns all orders for that customer
                    instead of a single order detail.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Lookup section */}
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded">
              <Hash className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Order Lookup</h3>
            <span className="text-xs text-gray-400">Returns full details for a single order</span>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Example — by WooCommerce ID</p>
            <pre className="bg-gray-900 text-gray-100 text-xs font-mono px-4 py-3 rounded-lg overflow-x-auto leading-relaxed">
{`curl -X GET \\
  "${endpointUrl}?woo_order_id=1966669" \\
  -H "X-API-Key: <your-api-secret>"`}
            </pre>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Example — by internal UUID</p>
            <pre className="bg-gray-900 text-gray-100 text-xs font-mono px-4 py-3 rounded-lg overflow-x-auto leading-relaxed">
{`curl -X GET \\
  "${endpointUrl}?order_id=3f2a1b4c-..." \\
  -H "X-API-Key: <your-api-secret>"`}
            </pre>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Response</p>
            <pre className="bg-gray-900 text-gray-100 text-xs font-mono px-4 py-3 rounded-lg overflow-x-auto leading-relaxed">
{`{
  "success": true,
  "type": "order",
  "data": {
    "order_id": "3f2a1b4c-uuid",
    "order_number": "WC-1001",
    "woo_order_id": 1966669,
    "order_date": "2026-03-15T10:30:00Z",
    "customer_name": "Jane Doe",
    "phone": "01712345678",
    "order_total": 1850,
    "payment_status": "paid",
    "cs_status": "confirmed",
    "items": [
      { "product_name": "...", "sku": "SKU-001", "quantity": 2, "unit_price": 925 }
    ],
    "courier_company": "pathao",
    "tracking_number": "PTH123456",
    "courier_status": "Delivered"
  }
}`}
            </pre>
          </div>
        </div>

        {/* Phone Lookup section */}
        <div className="space-y-4 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-2 pt-2">
            <div className="p-1.5 bg-emerald-50 rounded">
              <Phone className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Phone Lookup</h3>
            <span className="text-xs text-gray-400">Returns all orders linked to a customer phone number</span>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            When a <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">phone</code> parameter is provided,
            the API searches both primary and secondary phone fields across all customers. It then returns a chronological
            list of all orders placed by matching customers, most recent first, up to 50 orders.
            This is useful for call centre agents or bots that receive an inbound phone number and need
            to pull up the caller's order history instantly.
          </p>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Example Request</p>
            <pre className="bg-gray-900 text-gray-100 text-xs font-mono px-4 py-3 rounded-lg overflow-x-auto leading-relaxed">
{`curl -X GET \\
  "${endpointUrl}?phone=01712345678" \\
  -H "X-API-Key: <your-api-secret>"`}
            </pre>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Response</p>
            <pre className="bg-gray-900 text-gray-100 text-xs font-mono px-4 py-3 rounded-lg overflow-x-auto leading-relaxed">
{`{
  "success": true,
  "type": "phone_lookup",
  "phone": "01712345678",
  "customer_count": 1,
  "order_count": 3,
  "orders": [
    {
      "order_id": "uuid",
      "order_number": "WC-1005",
      "woo_order_id": 1966669,
      "order_date": "2026-03-20T08:15:00Z",
      "order_total": 1200,
      "payment_status": "paid",
      "cs_status": "delivered",
      "customer_name": "Jane Doe",
      "phone_primary": "01712345678",
      "courier_company": "steadfast",
      "tracking_number": "SF789012",
      "courier_status": "Delivered"
    }
  ]
}`}
            </pre>
          </div>
        </div>

        {/* Auth and methods summary */}
        <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-100">
          <div className="space-y-2 pt-2">
            <p className="font-medium text-gray-600">HTTP Methods</p>
            <div className="space-y-1 text-gray-500">
              <p><span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">GET</span> — parameters as query string</p>
              <p><span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">POST</span> — parameters in JSON body</p>
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <p className="font-medium text-gray-600">Authentication</p>
            <div className="space-y-1 text-gray-500">
              <p>Header: <code className="bg-gray-100 px-1 rounded text-xs">X-API-Key: &lt;secret&gt;</code></p>
              <p>Returns <code className="bg-gray-100 px-1 rounded text-xs">401</code> if key is missing or wrong</p>
              <p>Returns <code className="bg-gray-100 px-1 rounded text-xs">404</code> if order / phone not found</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
