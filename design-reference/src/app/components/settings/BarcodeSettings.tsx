import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Download, Save, Maximize2, Package, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import JsBarcode from 'jsbarcode';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

interface BarcodeConfig {
  width: number; // in inches
  height: number; // in inches
  format: 'CODE128' | 'EAN13' | 'UPC' | 'CODE39';
}

export function BarcodeSettings() {
  const [config, setConfig] = useState<BarcodeConfig>({
    width: 2,
    height: 1,
    format: 'CODE128'
  });
  
  const [previewType, setPreviewType] = useState<'product' | 'location'>('product');
  
  // Product preview data
  const [previewSKU, setPreviewSKU] = useState('SKU-12345');
  const [previewProductName, setPreviewProductName] = useState('Sample Product Name');
  
  // Location preview data
  const [previewLocationCode, setPreviewLocationCode] = useState('LOC-A1-B2');
  const [previewLocationName, setPreviewLocationName] = useState('Warehouse A - Shelf 1');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate barcode whenever preview data changes
  useEffect(() => {
    generateBarcodePreview();
  }, [config, previewSKU, previewProductName, previewLocationCode, previewLocationName, previewType]);

  const generateBarcodePreview = () => {
    if (!canvasRef.current || !barcodeCanvasRef.current) return;

    try {
      // Get the current code based on preview type
      const currentCode = previewType === 'product' ? previewSKU : previewLocationCode;
      
      // Generate barcode on temporary canvas
      JsBarcode(barcodeCanvasRef.current, currentCode, {
        format: config.format,
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
      const widthPx = config.width * dpi;
      const heightPx = config.height * dpi;

      canvas.width = widthPx;
      canvas.height = heightPx;

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, widthPx, heightPx);

      // Add border for visibility
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, widthPx, heightPx);

      if (previewType === 'product') {
        // Product name at top (left aligned)
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.floor(heightPx * 0.08)}px Arial`;
        ctx.textAlign = 'left';
        const productNameY = heightPx * 0.12;
        
        // Truncate product name if too long
        const maxWidth = widthPx - 40;
        let displayName = previewProductName;
        while (ctx.measureText(displayName).width > maxWidth && displayName.length > 0) {
          displayName = displayName.substring(0, displayName.length - 1);
        }
        if (displayName.length < previewProductName.length) {
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
        ctx.fillText(previewSKU, widthPx / 2, heightPx * 0.92);
      } else if (previewType === 'location') {
        // Location name at top (left aligned)
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.floor(heightPx * 0.08)}px Arial`;
        ctx.textAlign = 'left';
        const locationNameY = heightPx * 0.12;
        
        // Truncate location name if too long
        const maxWidth = widthPx - 40;
        let displayName = previewLocationName;
        while (ctx.measureText(displayName).width > maxWidth && displayName.length > 0) {
          displayName = displayName.substring(0, displayName.length - 1);
        }
        if (displayName.length < previewLocationName.length) {
          displayName = displayName + '...';
        }
        
        ctx.fillText(displayName, 20, locationNameY);

        // Barcode in the middle - much larger for easy scanning
        const barcodeCanvas = barcodeCanvasRef.current;
        const barcodeWidth = Math.min(barcodeCanvas.width * 1.5, widthPx - 30);
        const barcodeHeight = Math.min(barcodeCanvas.height * 1.8, heightPx * 0.6);
        const barcodeX = (widthPx - barcodeWidth) / 2;
        const barcodeY = heightPx * 0.25;
        
        ctx.drawImage(barcodeCanvas, barcodeX, barcodeY, barcodeWidth, barcodeHeight);

        // Location code at the bottom (centered) - smaller text
        ctx.font = `${Math.floor(heightPx * 0.07)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(previewLocationCode, widthPx / 2, heightPx * 0.92);
      }

    } catch (error) {
      console.error('Error generating barcode:', error);
      toast.error('Invalid barcode data. Please check the SKU format.');
    }
  };

  const handleSaveConfig = () => {
    // In a real app, this would save to backend/localStorage
    localStorage.setItem('barcodeConfig', JSON.stringify(config));
    toast.success('Barcode settings saved successfully');
  };

  const handleDownloadPreview = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `barcode-preview-${previewSKU}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Barcode preview downloaded');
    });
  };

  const handleGenerateSampleSheet = () => {
    // Generate a sample sheet with multiple barcodes
    const sampleCanvas = document.createElement('canvas');
    const ctx = sampleCanvas.getContext('2d');
    if (!ctx || !canvasRef.current) return;

    const dpi = 300;
    const stickerWidthPx = config.width * dpi;
    const stickerHeightPx = config.height * dpi;
    
    // A4 size at 300 DPI
    const a4WidthPx = 8.27 * dpi;
    const a4HeightPx = 11.69 * dpi;
    
    sampleCanvas.width = a4WidthPx;
    sampleCanvas.height = a4HeightPx;
    
    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, a4WidthPx, a4HeightPx);
    
    // Calculate how many stickers fit
    const cols = Math.floor(a4WidthPx / stickerWidthPx);
    const rows = Math.floor(a4HeightPx / stickerHeightPx);
    
    // Draw grid of stickers
    const stickers = [
      { sku: 'SKU-12345', name: 'Product A' },
      { sku: 'SKU-67890', name: 'Product B' },
      { sku: 'SKU-11111', name: 'Product C' },
      { sku: 'SKU-22222', name: 'Product D' },
      { sku: 'SKU-33333', name: 'Product E' },
      { sku: 'SKU-44444', name: 'Product F' },
    ];
    
    let stickerIndex = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * stickerWidthPx;
        const y = row * stickerHeightPx;
        
        // Use modulo to repeat stickers if we run out
        const sticker = stickers[stickerIndex % stickers.length];
        stickerIndex++;
        
        // Draw a sample sticker at this position
        ctx.save();
        ctx.translate(x, y);
        
        // For simplicity, draw the current preview
        ctx.drawImage(canvasRef.current, 0, 0, stickerWidthPx, stickerHeightPx);
        
        ctx.restore();
      }
    }
    
    // Download the sample sheet
    sampleCanvas.toBlob((blob) => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `barcode-sample-sheet-${config.width}x${config.height}in.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Sample sheet generated (${cols}x${rows} = ${cols * rows} stickers)`);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Barcode Settings</h2>
        <p className="text-sm text-gray-600">
          Configure your barcode sticker dimensions and format for printing. Barcodes can be exported as PNG/JPG 
          for PO receiving, return processing, and product labeling operations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Sticker Dimensions</CardTitle>
            <CardDescription>Set the physical size of your barcode stickers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width (inches)</Label>
                <Input
                  id="width"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="8"
                  value={config.width}
                  onChange={(e) => setConfig({ ...config, width: parseFloat(e.target.value) || 2 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (inches)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="11"
                  value={config.height}
                  onChange={(e) => setConfig({ ...config, height: parseFloat(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Barcode Format</Label>
              <select
                id="format"
                value={config.format}
                onChange={(e) => setConfig({ ...config, format: e.target.value as BarcodeConfig['format'] })}
                className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="CODE128">CODE128 (Recommended)</option>
                <option value="EAN13">EAN13</option>
                <option value="CODE39">CODE39</option>
                <option value="UPC">UPC</option>
              </select>
            </div>

            <div className="pt-4 border-t space-y-2">
              <p className="text-sm text-gray-600">Current Size: <strong>{config.width}" × {config.height}"</strong></p>
              <p className="text-sm text-gray-500">Print Resolution: 300 DPI</p>
            </div>

            <Button onClick={handleSaveConfig} className="w-full gap-2">
              <Save className="w-4 h-4" />
              Save Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Test your barcode design before printing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview Type Tabs */}
            <Tabs value={previewType} onValueChange={(val) => setPreviewType(val as 'product' | 'location')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="product" className="gap-2">
                  <Package className="w-4 h-4" />
                  Product
                </TabsTrigger>
                <TabsTrigger value="location" className="gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="product" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="preview-product-name">Product Name</Label>
                  <Input
                    id="preview-product-name"
                    value={previewProductName}
                    onChange={(e) => setPreviewProductName(e.target.value)}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preview-sku">SKU</Label>
                  <Input
                    id="preview-sku"
                    value={previewSKU}
                    onChange={(e) => setPreviewSKU(e.target.value)}
                    placeholder="Enter SKU"
                  />
                </div>
              </TabsContent>

              <TabsContent value="location" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="preview-location-name">Location Name</Label>
                  <Input
                    id="preview-location-name"
                    value={previewLocationName}
                    onChange={(e) => setPreviewLocationName(e.target.value)}
                    placeholder="Enter location name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preview-location-code">Location Code</Label>
                  <Input
                    id="preview-location-code"
                    value={previewLocationCode}
                    onChange={(e) => setPreviewLocationCode(e.target.value)}
                    placeholder="Enter location code"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Canvas Preview */}
            <div className="border rounded-lg p-4 bg-gray-50">
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

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleDownloadPreview} variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button onClick={handleGenerateSampleSheet} variant="outline" size="sm" className="gap-2">
                <Maximize2 className="w-4 h-4" />
                Sample Sheet
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">1</div>
                <h4 className="font-medium">Products</h4>
              </div>
              <p className="text-sm text-gray-600">Generate barcodes when receiving inventory from suppliers. Print and attach to products.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold text-sm">2</div>
                <h4 className="font-medium">Locations</h4>
              </div>
              <p className="text-sm text-gray-600">Print location barcodes for warehouse shelves, bins, and zones to enable quick location audits.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold text-sm">3</div>
                <h4 className="font-medium">Returns</h4>
              </div>
              <p className="text-sm text-gray-600">Print replacement barcodes for returned items that need relabeling.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-semibold text-sm">4</div>
                <h4 className="font-medium">Labeling</h4>
              </div>
              <p className="text-sm text-gray-600">Create labels for new products or items missing barcodes.</p>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Tips for Best Results</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Use CODE128 format for alphanumeric SKUs and location codes (recommended)</li>
              <li>Ensure your printer is set to 300 DPI for crisp barcodes</li>
              <li>Test print a sample sheet before bulk printing</li>
              <li>Store barcode stickers in a dry place to prevent smudging</li>
              <li>Use the same sticker size for both products and locations for consistency</li>
              <li>Download individual barcodes or generate sample sheets with multiple labels</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}