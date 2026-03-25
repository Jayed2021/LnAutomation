import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ArrowLeft, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw,
  ToggleLeft, ToggleRight, MessageSquare, Plus, Pencil, Trash2,
  Save, AlertCircle, X
} from 'lucide-react';

interface SmsConfig {
  id: string;
  provider: string;
  is_enabled: boolean;
  api_token: string | null;
  base_url: string | null;
  use_ssl: boolean;
  use_json: boolean;
  updated_at: string;
}

interface SmsTemplate {
  id: string;
  name: string;
  template_text: string;
  template_type: string | null;
  is_active: boolean;
  created_at: string;
}

const TEMPLATE_TYPES = [
  { value: 'order_confirmation', label: 'Order Confirmation' },
  { value: 'shipping', label: 'Shipping Notification' },
  { value: 'delivery', label: 'Delivery Confirmation' },
  { value: 'payment_reminder', label: 'Payment Reminder' },
];

const TEMPLATE_VARIABLES = [
  { var: '{order_number}', desc: 'Order number' },
  { var: '{customer_name}', desc: 'Customer full name' },
  { var: '{courier}', desc: 'Courier company name' },
  { var: '{tracking_number}', desc: 'Courier tracking code' },
  { var: '{amount}', desc: 'Order total amount' },
];

const DEFAULT_BASE_URL = 'https://api.greenweb.com.bd/api.php';

interface TemplateForm {
  name: string;
  template_text: string;
  template_type: string;
  is_active: boolean;
}

const emptyForm: TemplateForm = {
  name: '',
  template_text: '',
  template_type: 'order_confirmation',
  is_active: true,
};

export default function SmsSettings() {
  const navigate = useNavigate();

  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [useSsl, setUseSsl] = useState(true);

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyForm);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateNotice, setTemplateNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [cfgRes, tplRes] = await Promise.all([
        supabase.from('sms_config').select('*').maybeSingle(),
        supabase.from('sms_templates').select('*').order('created_at', { ascending: true }),
      ]);

      if (cfgRes.data) {
        setConfig(cfgRes.data);
        setEnabled(cfgRes.data.is_enabled);
        setToken(cfgRes.data.api_token || '');
        setUseSsl(cfgRes.data.use_ssl ?? true);
      }
      setTemplates(tplRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const payload = {
        is_enabled: enabled,
        api_token: token,
        use_ssl: useSsl,
        use_json: true,
        base_url: useSsl ? DEFAULT_BASE_URL.replace('http://', 'https://') : DEFAULT_BASE_URL.replace('https://', 'http://'),
        updated_at: new Date().toISOString(),
      };

      if (config?.id) {
        const { error } = await supabase.from('sms_config').update(payload).eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sms_config').insert({ ...payload, provider: 'greenweb' });
        if (error) throw error;
      }
      setNotice({ ok: true, message: 'SMS settings saved' });
      load();
    } catch (err: any) {
      setNotice({ ok: false, message: err?.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm(emptyForm);
    setTemplateNotice(null);
    setShowTemplateModal(true);
  };

  const openEditTemplate = (t: SmsTemplate) => {
    setEditingTemplate(t);
    setTemplateForm({
      name: t.name,
      template_text: t.template_text,
      template_type: t.template_type || 'order_confirmation',
      is_active: t.is_active,
    });
    setTemplateNotice(null);
    setShowTemplateModal(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.template_text.trim()) {
      setTemplateNotice({ ok: false, message: 'Name and message are required' });
      return;
    }
    setSavingTemplate(true);
    setTemplateNotice(null);
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('sms_templates')
          .update({
            name: templateForm.name,
            template_text: templateForm.template_text,
            template_type: templateForm.template_type || null,
            is_active: templateForm.is_active,
          })
          .eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sms_templates')
          .insert({
            name: templateForm.name,
            template_text: templateForm.template_text,
            template_type: templateForm.template_type || null,
            is_active: templateForm.is_active,
          });
        if (error) throw error;
      }
      setShowTemplateModal(false);
      load();
    } catch (err: any) {
      setTemplateNotice({ ok: false, message: err?.message || 'Failed to save template' });
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('sms_templates').delete().eq('id', id);
      if (error) throw error;
      setTemplates(prev => prev.filter(t => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const insertVariable = (v: string) => {
    setTemplateForm(f => ({ ...f, template_text: f.template_text + v }));
  };

  const charCount = templateForm.template_text.length;
  const smsCount = charCount <= 160 ? 1 : Math.ceil(charCount / 153);

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
          <h1 className="text-2xl font-bold text-gray-900">SMS Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Configure Greenweb SMS gateway and manage message templates</p>
        </div>
        {enabled
          ? <Badge variant="emerald" className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Enabled</Badge>
          : <Badge variant="gray">Disabled</Badge>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Gateway Config */}
          <Card>
            <div className="p-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                <MessageSquare className="w-4.5 h-4.5 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Greenweb SMS Gateway</h3>
                <p className="text-xs text-gray-400 mt-0.5">api.greenweb.com.bd · Token-based authentication</p>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEnabled(v => !v)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {enabled
                    ? <ToggleRight className="w-8 h-8 text-emerald-500" />
                    : <ToggleLeft className="w-8 h-8" />}
                </button>
                <div>
                  <p className="text-sm font-medium text-gray-700">Enable SMS</p>
                  <p className="text-xs text-gray-400">Send SMS notifications to customers from order detail</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">API Token</label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    placeholder="Your Greenweb API token"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Generate your token at{' '}
                  <span className="font-mono text-gray-600">gwb.li/token</span>
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-700">Use SSL (HTTPS)</p>
                  <p className="text-xs text-gray-400 mt-0.5">Recommended — use secure HTTPS endpoint</p>
                </div>
                <button
                  onClick={() => setUseSsl(v => !v)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {useSsl
                    ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                    : <ToggleLeft className="w-7 h-7" />}
                </button>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Active endpoint</p>
                <p className="text-xs font-mono text-gray-600">
                  {useSsl ? 'https' : 'http'}://api.greenweb.com.bd/api.php?json
                </p>
              </div>

              {notice && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${notice.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {notice.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                  {notice.message}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-gray-400">
                  {config?.updated_at && <>Last saved: {new Date(config.updated_at).toLocaleString()}</>}
                </div>
                <Button
                  onClick={saveConfig}
                  disabled={saving}
                  className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-700"
                >
                  {saving
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                    : <><Save className="w-4 h-4" /> Save SMS Settings</>}
                </Button>
              </div>
            </div>
          </Card>

          {/* SMS Templates */}
          <Card>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Message Templates</h3>
                <p className="text-xs text-gray-400 mt-0.5">Reusable SMS templates for order notifications</p>
              </div>
              <Button
                onClick={openNewTemplate}
                size="sm"
                className="flex items-center gap-1.5 bg-gray-900 text-white hover:bg-gray-700"
              >
                <Plus className="w-3.5 h-3.5" /> New Template
              </Button>
            </div>

            {templates.length === 0 ? (
              <div className="p-10 text-center">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No templates yet</p>
                <p className="text-xs text-gray-400 mt-1">Create templates to quickly send common SMS messages</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {templates.map(t => (
                  <div key={t.id} className="p-5 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                        {t.template_type && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                            {TEMPLATE_TYPES.find(tt => tt.value === t.template_type)?.label || t.template_type}
                          </span>
                        )}
                        {!t.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1.5 leading-relaxed whitespace-pre-wrap break-words">
                        {t.template_text}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{t.template_text.length} chars</span>
                        <span>·</span>
                        <span>{t.template_text.length <= 160 ? '1 SMS' : `${Math.ceil(t.template_text.length / 153)} SMS`}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => openEditTemplate(t)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        disabled={deletingId === t.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === t.id
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Phone Number Format</h3>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span><span className="font-mono">+8801XXXXXXXXX</span> — full format</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span><span className="font-mono">01XXXXXXXXX</span> — auto-prefixed with +880</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Multiple numbers: comma-separated</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Character Limits</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Single SMS</span>
                <span className="font-mono font-medium text-gray-800">160 chars</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Multi-part per segment</span>
                <span className="font-mono font-medium text-gray-800">153 chars</span>
              </div>
            </div>
            <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-100 text-xs text-amber-700 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              Messages over 160 chars are split and billed as multiple SMS.
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Template Variables</h3>
            <p className="text-xs text-gray-400">Use these placeholders in your templates:</p>
            <div className="space-y-2">
              {TEMPLATE_VARIABLES.map(v => (
                <div key={v.var} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{v.var}</span>
                  <span className="text-xs text-gray-500 text-right">{v.desc}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Template Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  placeholder="e.g. Order Dispatched"
                  value={templateForm.name}
                  onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Template Type</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  value={templateForm.template_type}
                  onChange={e => setTemplateForm(f => ({ ...f, template_type: e.target.value }))}
                >
                  {TEMPLATE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-600">Message</label>
                  <span className={`text-xs font-mono ${charCount > 160 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {charCount} chars · {smsCount} SMS
                  </span>
                </div>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none"
                  placeholder="Your SMS message here..."
                  value={templateForm.template_text}
                  onChange={e => setTemplateForm(f => ({ ...f, template_text: e.target.value }))}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {TEMPLATE_VARIABLES.map(v => (
                    <button
                      key={v.var}
                      type="button"
                      onClick={() => insertVariable(v.var)}
                      className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      {v.var}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTemplateForm(f => ({ ...f, is_active: !f.is_active }))}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {templateForm.is_active
                    ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                    : <ToggleLeft className="w-7 h-7" />}
                </button>
                <span className="text-sm text-gray-700">Active</span>
              </div>

              {templateNotice && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${templateNotice.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {templateNotice.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                  {templateNotice.message}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
              <Button variant="outline" onClick={() => setShowTemplateModal(false)}>Cancel</Button>
              <Button
                onClick={saveTemplate}
                disabled={savingTemplate}
                className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-700"
              >
                {savingTemplate
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                  : <><Save className="w-4 h-4" /> {editingTemplate ? 'Save Changes' : 'Create Template'}</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
