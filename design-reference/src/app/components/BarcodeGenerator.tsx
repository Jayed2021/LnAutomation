import { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeGeneratorProps {
  sku: string;
  productName: string;
  width?: number; // inches
  height?: number; // inches
  format?: 'CODE128' | 'EAN13' | 'UPC' | 'CODE39';
  showDownload?: boolean;
}

export function BarcodeGenerator({
  sku,
  productName,
  width = 2,
  height = 1,
  format = 'CODE128',
  showDownload = true
}: BarcodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateBarcode();
  }, [sku, productName, width, height, format]);

  const generateBarcode = () => {
    if (!canvasRef.current || !barcodeCanvasRef.current) return;

    try {
      // Generate barcode on temporary canvas
      JsBarcode(barcodeCanvasRef.current, sku, {
        format: format,
        width: 2,
        height: 60,
        displayValue: false,
        margin: 0,
      });

      // Main canvas for complete sticker
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Convert inches to pixels at 300 DPI for print quality
      const dpi = 300;
      const widthPx = width * dpi;
      const heightPx = height * dpi;

      canvas.width = widthPx;
      canvas.height = heightPx;

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, widthPx, heightPx);

      // Add border for visibility
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, widthPx, heightPx);

      // Product name at top (left aligned)
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.floor(heightPx * 0.08)}px Arial`;
      ctx.textAlign = 'left';
      const productNameY = heightPx * 0.12;
      
      // Truncate product name if too long
      const maxWidth = widthPx - 40;
      let displayName = productName;
      while (ctx.measureText(displayName).width > maxWidth && displayName.length > 0) {
        displayName = displayName.substring(0, displayName.length - 1);
      }
      if (displayName.length < productName.length) {
        displayName = displayName + '...';
      }
      
      ctx.fillText(displayName, 20, productNameY);

      // Barcode in the middle - much larger for easy scanning
      const barcodeCanvas = barcodeCanvasRef.current;
      const barcodeWidth = Math.min(barcodeCanvas.width * 1.5, widthPx - 30);
      const barcodeHeight = Math.min(barcodeCanvas.height * 1.8, heightPx * 0.6);
      const barcodeX = (widthPx - barcodeWidth) / 2;
      const barcodeY = heightPx * 0.25;
      
      ctx.drawImage(barcodeCanvas, barcodeX, barcodeY, barcodeWidth, barcodeHeight);

      // SKU at the bottom (centered) - smaller text
      ctx.font = `${Math.floor(heightPx * 0.07)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(sku, widthPx / 2, heightPx * 0.92);

    } catch (error) {
      console.error('Error generating barcode:', error);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `barcode-${sku}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Barcode downloaded successfully');
    });
  };

  return (
    <div className="space-y-3">
      <div className="border rounded-lg p-4 bg-white">
        <div className="flex justify-center items-center">
          <canvas 
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              height: 'auto',
              border: '1px solid #D1D5DB'
            }}
          />
        </div>
        {/* Hidden canvas for barcode generation */}
        <canvas ref={barcodeCanvasRef} style={{ display: 'none' }} />
      </div>
      
      {showDownload && (
        <Button onClick={handleDownload} variant="outline" size="sm" className="w-full gap-2">
          <Download className="w-4 h-4" />
          Download Barcode
        </Button>
      )}
    </div>
  );
}