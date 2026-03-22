import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeLabelProps {
  value: string;
  width?: number;
  height?: number;
}

export default function BarcodeLabel({ value, width = 280, height = 100 }: BarcodeLabelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    try {
      JsBarcode(canvasRef.current, value, {
        format: 'CODE128',
        width: 2,
        height: height,
        displayValue: true,
        fontOptions: '',
        font: 'monospace',
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: 4,
        fontSize: 14,
        background: '#ffffff',
        lineColor: '#000000',
        margin: 10,
      });
    } catch {
    }
  }, [value, height]);

  if (!value) return null;

  return (
    <div
      style={{ width, display: 'inline-block', border: '1px solid #ccc', background: '#fff', borderRadius: 4 }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
    </div>
  );
}
