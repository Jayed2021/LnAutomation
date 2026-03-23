import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';

interface LabelSettings {
  id?: string;
  label_width_in: number;
  label_height_in: number;
  barcode_format: string;
  dpi: number;
}

const BARCODE_FORMATS = ['CODE128', 'CODE39', 'EAN13', 'UPC'];

export default function BarcodeSettings() {
  const navigate = useNavigate();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [settings, setSettings] = useState<LabelSettings>({
    label_width_in: 1.5,
    label_height_in: 1.0,
    barcode_format: 'CODE128',
    dpi: 300,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    renderPreview();
  }, [settings]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('barcode_label_settings')
      .select('*')
      .maybeSingle();
    if (data) {
      setSettings({
        id: data.id,
        label_width_in: data.label_width_in,
        label_height_in: data.label_height_in,
        barcode_format: data.barcode_format,
        dpi: data.dpi,
      });
    }
    setLoading(false);
  };

  const renderPreview = () => {
    if (!previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const PREVIEW_DPI = 96;
    const widthPx = Math.round(settings.label_width_in * PREVIEW_DPI);
    const heightPx = Math.round(settings.label_height_in * PREVIEW_DPI);
    const barHeight = Math.round(heightPx * 0.6);
    const fontSize = Math.max(7, Math.round(heightPx * 0.1));
    const margin = Math.max(3, Math.round(heightPx * 0.08));

    canvas.width = widthPx;
    canvas.height = heightPx;

    try {
      JsBarcode(canvas, 'SAMPLE-SKU-001', {
        format: settings.barcode_format as any,
        width: Math.max(1, Math.round(widthPx / 120)),
        height: barHeight,
        displayValue: true,
        fontOptions: '',
        font: 'monospace',
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: Math.round(margin / 2),
        fontSize: fontSize,
        background: '#ffffff',
        lineColor: '#000000',
        margin: margin,
      });
    } catch {
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        label_width_in: settings.label_width_in,
        label_height_in: settings.label_height_in,
        barcode_format: settings.barcode_format,
        dpi: settings.dpi,
        updated_at: new Date().toISOString(),
      };
      if (settings.id) {
        await supabase.from('barcode_label_settings').update(payload).eq('id', settings.id);
      } else {
        const { data } = await supabase
          .from('barcode_label_settings')
          .insert(payload)
          .select('id')
          .single();
        if (data) setSettings(prev => ({ ...prev, id: data.id }));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mr-2" />
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  const widthMm = (settings.label_width_in * 25.4).toFixed(1);
  const heightMm = (settings.label_height_in * 25.4).toFixed(1);
  const PREVIEW_DPI = 96;
  const previewWidth = Math.round(settings.label_width_in * PREVIEW_DPI);
  const previewHeight = Math.round(settings.label_height_in * PREVIEW_DPI);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Barcode Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure label paper dimensions and barcode format</p>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Label Paper Size</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Width (inches)
              </label>
              <input
                type="number"
                min="0.5"
                max="8"
                step="0.1"
                value={settings.label_width_in}
                onChange={e => setSettings(prev => ({ ...prev, label_width_in: parseFloat(e.target.value) || 1.5 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">{widthMm} mm</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Height (inches)
              </label>
              <input
                type="number"
                min="0.5"
                max="11"
                step="0.1"
                value={settings.label_height_in}
                onChange={e => setSettings(prev => ({ ...prev, label_height_in: parseFloat(e.target.value) || 1.0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">{heightMm} mm</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Barcode Format</h3>
          <div className="grid grid-cols-2 gap-3">
            {BARCODE_FORMATS.map(fmt => (
              <button
                key={fmt}
                onClick={() => setSettings(prev => ({ ...prev, barcode_format: fmt }))}
                className={`px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors text-left ${
                  settings.barcode_format === fmt
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            CODE128 is recommended for alphanumeric SKUs. EAN13/UPC require numeric-only barcodes.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Print Resolution</h3>
          <div className="flex items-center gap-3">
            {[203, 300, 600].map(dpiOption => (
              <button
                key={dpiOption}
                onClick={() => setSettings(prev => ({ ...prev, dpi: dpiOption }))}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  settings.dpi === dpiOption
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {dpiOption} DPI
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Most label printers use 203 or 300 DPI. Use 300+ for crisp barcodes on small labels.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Live Preview</h3>
        <p className="text-xs text-gray-400 mb-4">
          Preview at screen resolution (96 DPI) — actual print output will be at {settings.dpi} DPI
        </p>
        <div className="flex items-center justify-center bg-gray-100 rounded-xl p-6">
          <div
            className="bg-white shadow-md border border-gray-200"
            style={{ width: previewWidth, height: previewHeight, position: 'relative' }}
          >
            <canvas
              ref={previewCanvasRef}
              style={{ display: 'block', width: '100%', height: '100%' }}
            />
          </div>
        </div>
        <div className="mt-3 text-center text-xs text-gray-500">
          {widthMm} mm × {heightMm} mm ({settings.label_width_in}" × {settings.label_height_in}")
        </div>
      </Card>
    </div>
  );
}
