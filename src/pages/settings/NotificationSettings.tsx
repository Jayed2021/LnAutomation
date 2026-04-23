import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle2, Bell, RotateCcw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getAppSetting, setAppSetting } from '../../lib/appSettings';

interface State {
  notifications_return_restock_enabled: boolean;
}

const DEFAULT: State = { notifications_return_restock_enabled: true };

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<State>(DEFAULT);
  const [saved, setSaved] = useState<State>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(saved);

  useEffect(() => {
    (async () => {
      const val = await getAppSetting<boolean>('notifications_return_restock_enabled');
      const loaded: State = { notifications_return_restock_enabled: val !== false };
      setSettings(loaded);
      setSaved(loaded);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setAppSetting('notifications_return_restock_enabled', settings.notifications_return_restock_enabled);
      setSaved({ ...settings });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save notification settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleClass = (active: boolean) =>
    `relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${active ? 'bg-blue-600' : 'bg-gray-200'}`;

  const thumbClass = (active: boolean) =>
    `pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${active ? 'translate-x-4' : 'translate-x-0'}`;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settings')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">Configure system notifications and alerts</p>
          </div>
        </div>
        <div className="py-16 text-center text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settings')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">Configure system notifications and alerts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Saved
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={`flex items-center gap-2 ${isDirty ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} border-0`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Card className="divide-y divide-gray-100">
        <div className="px-5 py-4 flex items-center gap-3 bg-gray-50/50">
          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
            <Bell className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Return Notifications</h3>
            <p className="text-xs text-gray-500">Controls related to the returns and restocking workflow</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Return restock notifications</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  When enabled, a "Send Notification" button appears on the Returns page after items are restocked.
                  Warehouse staff can press it to notify all other users about restocked returns from the last 3 hours.
                  Each return is only included once &mdash; once sent, it will not appear in future batches.
                </p>
                <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${settings.notifications_return_restock_enabled ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
                  {settings.notifications_return_restock_enabled
                    ? 'Enabled — Send Notification button is active'
                    : 'Disabled — button is hidden on Returns page'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, notifications_return_restock_enabled: !prev.notifications_return_restock_enabled }))}
              className={toggleClass(settings.notifications_return_restock_enabled)}
              role="switch"
              aria-checked={settings.notifications_return_restock_enabled}
            >
              <span className={thumbClass(settings.notifications_return_restock_enabled)} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
