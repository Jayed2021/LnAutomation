import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle2, Package, Lock, Archive } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getAppSetting, setAppSetting } from '../../lib/appSettings';
import { LensBrandManager } from './LensBrandManager';

interface MiscSettingsState {
  require_packaging_dispatch_gate: boolean;
  initial_inventory_date: string;
  initial_inventory_shipment_name: string;
  initial_inventory_supplier_name: string;
}

const DEFAULT_STATE: MiscSettingsState = {
  require_packaging_dispatch_gate: true,
  initial_inventory_date: '',
  initial_inventory_shipment_name: 'Initial Inventory',
  initial_inventory_supplier_name: 'Pre-existing Stock',
};

export default function MiscSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<MiscSettingsState>(DEFAULT_STATE);
  const [saved, setSaved] = useState<MiscSettingsState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(saved);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [gateVal, invDate, invName, invSupplier] = await Promise.all([
        getAppSetting<boolean>('require_packaging_dispatch_gate'),
        getAppSetting<string>('initial_inventory_date'),
        getAppSetting<string>('initial_inventory_shipment_name'),
        getAppSetting<string>('initial_inventory_supplier_name'),
      ]);
      const loaded: MiscSettingsState = {
        require_packaging_dispatch_gate: gateVal !== false,
        initial_inventory_date: invDate ?? '',
        initial_inventory_shipment_name: invName ?? 'Initial Inventory',
        initial_inventory_supplier_name: invSupplier ?? 'Pre-existing Stock',
      };
      setSettings(loaded);
      setSaved(loaded);
    } catch (err) {
      console.error('Failed to load misc settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        setAppSetting('require_packaging_dispatch_gate', settings.require_packaging_dispatch_gate),
        setAppSetting('initial_inventory_date', settings.initial_inventory_date),
        setAppSetting('initial_inventory_shipment_name', settings.initial_inventory_shipment_name),
        setAppSetting('initial_inventory_supplier_name', settings.initial_inventory_supplier_name),
      ]);
      setSaved({ ...settings });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save misc settings:', err);
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
            <h1 className="text-2xl font-bold text-gray-900">Misc Settings</h1>
            <p className="text-sm text-gray-500">General operational controls</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Misc Settings</h1>
            <p className="text-sm text-gray-500">General operational controls and toggles</p>
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
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <Package className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Fulfillment Controls</h3>
            <p className="text-xs text-gray-500">Settings that affect the order fulfillment workflow</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Require daily packaging dispatch before shipping</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  When enabled, the "Mark as Shipped" button on the Packed tab will be locked until someone clicks
                  "Dispatch Packaging" for that day. This ensures packaging materials are always recorded before
                  orders go out. Multiple dispatches per day are allowed.
                </p>
                <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${settings.require_packaging_dispatch_gate ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                  {settings.require_packaging_dispatch_gate ? 'Gate is ON — shipping requires dispatch' : 'Gate is OFF — shipping always allowed'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, require_packaging_dispatch_gate: !prev.require_packaging_dispatch_gate }))}
              className={toggleClass(settings.require_packaging_dispatch_gate)}
              role="switch"
              aria-checked={settings.require_packaging_dispatch_gate}
            >
              <span className={thumbClass(settings.require_packaging_dispatch_gate)} />
            </button>
          </div>
        </div>
      </Card>

      <Card className="divide-y divide-gray-100">
        <div className="px-5 py-4 flex items-center gap-3 bg-gray-50/50">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <Archive className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Initial Inventory</h3>
            <p className="text-xs text-gray-500">Configure how pre-existing stock appears in the Shipment Performance report</p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Inventory Date
            </label>
            <p className="text-xs text-gray-500 mb-2 leading-relaxed">
              The date that will be used as the "received date" for the initial stock grouping.
              Pre-populated with the earliest lot date found in the system.
            </p>
            <input
              type="date"
              value={settings.initial_inventory_date}
              onChange={e => setSettings(prev => ({ ...prev, initial_inventory_date: e.target.value }))}
              className="w-full max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Shipment Name
            </label>
            <p className="text-xs text-gray-500 mb-2">
              The label shown in the "Shipment" column of the report.
            </p>
            <input
              type="text"
              value={settings.initial_inventory_shipment_name}
              onChange={e => setSettings(prev => ({ ...prev, initial_inventory_shipment_name: e.target.value }))}
              placeholder="e.g. Initial Inventory"
              className="w-full max-w-sm px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Supplier / Source Label
            </label>
            <p className="text-xs text-gray-500 mb-2">
              The label shown in the "Supplier" column of the report.
            </p>
            <input
              type="text"
              value={settings.initial_inventory_supplier_name}
              onChange={e => setSettings(prev => ({ ...prev, initial_inventory_supplier_name: e.target.value }))}
              placeholder="e.g. Pre-existing Stock"
              className="w-full max-w-sm px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </Card>

      <Card className="divide-y divide-gray-100 overflow-hidden">
        <LensBrandManager />
      </Card>
    </div>
  );
}
