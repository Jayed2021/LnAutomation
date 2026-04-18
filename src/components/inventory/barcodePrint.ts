import JsBarcode from 'jsbarcode';
import QRCodeEncoder from '@zxing/library/esm/core/qrcode/encoder/Encoder';
import QRCodeDecoderErrorCorrectionLevel from '@zxing/library/esm/core/qrcode/decoder/ErrorCorrectionLevel';
import { supabase } from '../../lib/supabase';

interface PrintLocation {
  barcode: string;
  name: string;
}

interface LabelSettings {
  label_width_in: number;
  label_height_in: number;
  barcode_format: string;
  dpi: number;
}

async function getLabelSettings(): Promise<LabelSettings> {
  const { data } = await supabase
    .from('barcode_label_settings')
    .select('label_width_in, label_height_in, barcode_format, dpi')
    .maybeSingle();
  return data || { label_width_in: 1.5, label_height_in: 1.0, barcode_format: 'CODE128', dpi: 300 };
}

function buildQrMatrix(text: string): boolean[][] | null {
  try {
    const qr = QRCodeEncoder.encode(text, QRCodeDecoderErrorCorrectionLevel.M, null);
    const matrix = qr.getMatrix();
    const size = matrix.getWidth();
    const result: boolean[][] = [];
    for (let y = 0; y < size; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < size; x++) {
        row.push(matrix.get(x, y) === 1);
      }
      result.push(row);
    }
    return result;
  } catch {
    return null;
  }
}

function renderQrCanvas(text: string, sizePx: number): HTMLCanvasElement | null {
  const matrix = buildQrMatrix(text);
  if (!matrix) return null;

  const canvas = document.createElement('canvas');
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sizePx, sizePx);

  const qrSize = matrix.length;
  const cellSize = sizePx / qrSize;

  ctx.fillStyle = '#000000';
  for (let y = 0; y < qrSize; y++) {
    for (let x = 0; x < qrSize; x++) {
      if (matrix[y][x]) {
        ctx.fillRect(
          Math.floor(x * cellSize),
          Math.floor(y * cellSize),
          Math.ceil(cellSize),
          Math.ceil(cellSize)
        );
      }
    }
  }

  return canvas;
}

function renderBarcodeCanvas(barcode: string, settings: LabelSettings): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const widthPx = Math.round(settings.label_width_in * settings.dpi);
  const heightPx = Math.round(settings.label_height_in * settings.dpi);
  const barHeight = Math.round(heightPx * 0.6);
  const fontSize = Math.max(8, Math.round(heightPx * 0.1));
  const margin = Math.max(4, Math.round(heightPx * 0.08));

  JsBarcode(canvas, barcode, {
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

  return canvas;
}

function renderDualCanvas(barcode: string, settings: LabelSettings): HTMLCanvasElement {
  const widthPx = Math.round(settings.label_width_in * settings.dpi);
  const heightPx = Math.round(settings.label_height_in * settings.dpi);

  const qrSizePx = Math.round(heightPx * 0.85);
  const barcodeWidthPx = widthPx - qrSizePx - Math.round(widthPx * 0.04);

  const barcodeCanvas = document.createElement('canvas');
  const barHeight = Math.round(heightPx * 0.58);
  const fontSize = Math.max(7, Math.round(heightPx * 0.09));
  const margin = Math.max(3, Math.round(heightPx * 0.06));

  JsBarcode(barcodeCanvas, barcode, {
    format: settings.barcode_format as any,
    width: Math.max(1, Math.round(barcodeWidthPx / 100)),
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

  const qrCanvas = renderQrCanvas(barcode, qrSizePx);

  const combined = document.createElement('canvas');
  combined.width = widthPx;
  combined.height = heightPx;
  const ctx = combined.getContext('2d');
  if (!ctx) return barcodeCanvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  const barcodeY = Math.round((heightPx - barcodeCanvas.height) / 2);
  ctx.drawImage(barcodeCanvas, 0, Math.max(0, barcodeY));

  if (qrCanvas) {
    const qrX = barcodeWidthPx + Math.round(widthPx * 0.02);
    const qrY = Math.round((heightPx - qrSizePx) / 2);
    ctx.drawImage(qrCanvas, qrX, Math.max(0, qrY), qrSizePx, qrSizePx);
  }

  return combined;
}

export async function printBarcodeLabels(locations: PrintLocation[], withQr = false) {
  const validLocations = locations.filter(l => l.barcode);
  if (validLocations.length === 0) return;

  const settings = await getLabelSettings();
  const labelDataUrls: { dataUrl: string; barcode: string }[] = [];

  for (const loc of validLocations) {
    try {
      const canvas = withQr
        ? renderDualCanvas(loc.barcode, settings)
        : renderBarcodeCanvas(loc.barcode, settings);
      labelDataUrls.push({ dataUrl: canvas.toDataURL('image/png'), barcode: loc.barcode });
    } catch {
    }
  }

  if (labelDataUrls.length === 0) return;

  const widthMm = (settings.label_width_in * 25.4).toFixed(1);
  const heightMm = (settings.label_height_in * 25.4).toFixed(1);

  const labelHtml = labelDataUrls.map(({ dataUrl }) => `
    <div class="label">
      <img src="${dataUrl}" />
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode Labels</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f0f0f0; font-family: monospace; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, ${widthMm}mm);
      gap: 3mm;
      padding: 5mm;
    }
    .label {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      background: #fff;
      border: 0.5px solid #bbb;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      break-inside: avoid;
    }
    .label img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    @media print {
      body { background: #fff; }
      .grid { padding: 0; gap: 1mm; }
      .label { border: 0.3px solid #999; }
    }
  </style>
</head>
<body>
  <div class="grid">
    ${labelHtml}
  </div>
  <script>
    window.onload = function() { window.print(); };
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export async function downloadSingleBarcode(barcode: string, withQr = false) {
  const settings = await getLabelSettings();
  try {
    const canvas = withQr
      ? renderDualCanvas(barcode, settings)
      : renderBarcodeCanvas(barcode, settings);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `barcode-${barcode}.png`;
    a.click();
  } catch {
  }
}
