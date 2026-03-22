import JsBarcode from 'jsbarcode';

interface PrintLocation {
  barcode: string;
  name: string;
}

export function printBarcodeLabels(locations: PrintLocation[]) {
  const validLocations = locations.filter(l => l.barcode);
  if (validLocations.length === 0) return;

  const labelDataUrls: { dataUrl: string; barcode: string }[] = [];

  for (const loc of validLocations) {
    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, loc.barcode, {
        format: 'CODE128',
        width: 2,
        height: 80,
        displayValue: true,
        fontOptions: '',
        font: 'monospace',
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: 4,
        fontSize: 14,
        background: '#ffffff',
        lineColor: '#000000',
        margin: 12,
      });
      labelDataUrls.push({ dataUrl: canvas.toDataURL('image/png'), barcode: loc.barcode });
    } catch {
    }
  }

  if (labelDataUrls.length === 0) return;

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
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding: 12px;
    }
    .label {
      background: #fff;
      border: 1px solid #bbb;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      break-inside: avoid;
    }
    .label img {
      max-width: 100%;
      display: block;
    }
    @media print {
      body { background: #fff; }
      .grid { padding: 0; gap: 4px; }
      .label { border: 1px solid #999; }
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

export function downloadSingleBarcode(barcode: string) {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, barcode, {
      format: 'CODE128',
      width: 2,
      height: 80,
      displayValue: true,
      fontOptions: '',
      font: 'monospace',
      textAlign: 'center',
      textPosition: 'bottom',
      textMargin: 4,
      fontSize: 14,
      background: '#ffffff',
      lineColor: '#000000',
      margin: 12,
    });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `barcode-${barcode}.png`;
    a.click();
  } catch {
  }
}
