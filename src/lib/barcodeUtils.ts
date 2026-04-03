import JsBarcode from 'jsbarcode';
import { supabase } from './supabase';

export interface BarcodeLabelSettings {
  label_width_in: number;
  label_height_in: number;
  barcode_format: string;
  dpi: number;
}

const DEFAULT_SETTINGS: BarcodeLabelSettings = {
  label_width_in: 1.5,
  label_height_in: 1.0,
  barcode_format: 'CODE128',
  dpi: 300,
};

export async function loadBarcodeLabelSettings(): Promise<BarcodeLabelSettings> {
  const { data } = await supabase
    .from('barcode_label_settings')
    .select('label_width_in, label_height_in, barcode_format, dpi')
    .maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    label_width_in: data.label_width_in ?? DEFAULT_SETTINGS.label_width_in,
    label_height_in: data.label_height_in ?? DEFAULT_SETTINGS.label_height_in,
    barcode_format: data.barcode_format ?? DEFAULT_SETTINGS.barcode_format,
    dpi: data.dpi ?? DEFAULT_SETTINGS.dpi,
  };
}

export function downloadBarcodePNG(
  value: string,
  filename: string,
  settings: BarcodeLabelSettings
): void {
  const widthPx = Math.round(settings.label_width_in * settings.dpi);
  const heightPx = Math.round(settings.label_height_in * settings.dpi);
  const barHeight = Math.round(heightPx * 0.6);
  const fontSize = Math.max(10, Math.round(heightPx * 0.1));
  const margin = Math.max(5, Math.round(heightPx * 0.08));

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;

  let format = settings.barcode_format;
  let barcodeValue = value;

  if (format === 'EAN13') {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 12 && digits.length !== 13) {
      format = 'CODE128';
    } else {
      barcodeValue = digits.slice(0, 13);
    }
  } else if (format === 'UPC' || format === 'UPCA') {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 11 && digits.length !== 12) {
      format = 'CODE128';
    } else {
      barcodeValue = digits.slice(0, 12);
      format = 'UPC';
    }
  }

  try {
    JsBarcode(canvas, barcodeValue, {
      format: format as any,
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
    JsBarcode(canvas, barcodeValue, {
      format: 'CODE128',
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
  }

  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
