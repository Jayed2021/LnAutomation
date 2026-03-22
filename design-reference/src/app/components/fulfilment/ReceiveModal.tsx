import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { AlertCircle, CheckCircle2, Package, Scan, Camera, Download, Printer } from 'lucide-react';
import { BarcodeScanner } from '../BarcodeScanner';
import type { OrderItem } from '../../data/mockData';
import { toast } from 'sonner';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderItems: OrderItem[];
  orderId: string;
  wooOrderId: string;
  onReceiveComplete: (receivedItems: OrderItem[]) => void;
}

interface ReceivingItem extends OrderItem {
  scanned: boolean;
  scanError?: string;
}

export function ReceiveModal({ isOpen, onClose, orderItems, orderId, wooOrderId, onReceiveComplete }: ReceiveModalProps) {
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>(
    orderItems.map(item => ({ ...item, scanned: false }))
  );
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);

  const currentItem = receivingItems[currentItemIndex];
  const allScanned = receivingItems.every(item => item.scanned);
  const progress = receivingItems.filter(item => item.scanned).length;

  const handleScan = () => {
    if (!scannedBarcode.trim()) return;

    setScanning(true);
    
    setTimeout(() => {
      // Check if scanned barcode matches the expected barcode for this item
      const expectedBarcode = currentItem.recommended_lot || currentItem.sku;
      
      if (scannedBarcode.trim() === expectedBarcode) {
        // Correct item scanned
        setReceivingItems(prev => prev.map((item, idx) => 
          idx === currentItemIndex 
            ? { 
                ...item, 
                scanned: true, 
                picked_barcode: scannedBarcode.trim(),
                scanError: undefined 
              }
            : item
        ));
        setScannedBarcode('');
        
        // Move to next item
        if (currentItemIndex < receivingItems.length - 1) {
          setCurrentItemIndex(currentItemIndex + 1);
        }
      } else {
        // Wrong item
        setReceivingItems(prev => prev.map((item, idx) => 
          idx === currentItemIndex 
            ? { ...item, scanError: 'Wrong barcode scanned. Please scan the correct item.' }
            : item
        ));
      }
      
      setScanning(false);
    }, 300);
  };

  const handleTryAgain = () => {
    setReceivingItems(prev => prev.map((item, idx) => 
      idx === currentItemIndex 
        ? { ...item, scanError: undefined }
        : item
    ));
    setScannedBarcode('');
  };

  const handleCompleteReceive = () => {
    const receivedCount = receivingItems.filter(item => item.scanned).length;
    
    if (receivedCount === 0) {
      toast.error('Please scan at least one item before completing');
      return;
    }
    
    onReceiveComplete(receivingItems);
    onClose();
  };

  const handleSkipToItem = (index: number) => {
    setCurrentItemIndex(index);
    setReceivingItems(prev => prev.map((item, idx) => 
      idx === currentItemIndex 
        ? { ...item, scanError: undefined }
        : item
    ));
    setScannedBarcode('');
  };

  const handleCameraScan = (barcode: string) => {
    setScannedBarcode(barcode);
    
    setScanning(true);
    
    setTimeout(() => {
      const expectedBarcode = currentItem.recommended_lot || currentItem.sku;
      
      if (barcode.trim() === expectedBarcode) {
        setReceivingItems(prev => prev.map((item, idx) => 
          idx === currentItemIndex 
            ? { 
                ...item, 
                scanned: true, 
                picked_barcode: barcode.trim(),
                scanError: undefined 
              }
            : item
        ));
        setScannedBarcode('');
        
        if (currentItemIndex < receivingItems.length - 1) {
          setCurrentItemIndex(currentItemIndex + 1);
        }
      } else {
        setReceivingItems(prev => prev.map((item, idx) => 
          idx === currentItemIndex 
            ? { ...item, scanError: 'Wrong barcode scanned. Please scan the correct item.' }
            : item
        ));
      }
      
      setScanning(false);
    }, 300);
  };

  const handlePrintBarcode = (item: ReceivingItem) => {
    // Generate barcode print view
    const barcode = item.recommended_lot || item.sku;
    const printWindow = window.open('', '', 'width=400,height=300');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Barcode - ${item.sku}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
              }
              .barcode-container {
                text-align: center;
                border: 2px solid #000;
                padding: 20px;
                margin: 20px;
              }
              .barcode {
                font-family: 'Courier New', monospace;
                font-size: 24px;
                font-weight: bold;
                letter-spacing: 2px;
                margin: 10px 0;
              }
              .bars {
                display: flex;
                gap: 2px;
                justify-content: center;
                margin: 10px 0;
              }
              .bar {
                width: 3px;
                background: #000;
              }
              .product-info {
                margin-top: 10px;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="barcode-container">
              <h3>Order: ${wooOrderId}</h3>
              <div class="barcode">${barcode}</div>
              <div class="bars">
                ${Array.from({ length: 30 }, (_, i) => 
                  `<div class="bar" style="height: ${20 + Math.random() * 40}px;"></div>`
                ).join('')}
              </div>
              <div class="product-info">
                <strong>${item.sku_name}</strong><br/>
                SKU: ${item.sku}<br/>
                Qty: ${item.quantity}
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    toast.success(`Barcode for ${item.sku} sent to printer`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Receive Return Items for Order {wooOrderId}
          </DialogTitle>
          <DialogDescription>
            Scan each returned item's barcode to confirm receipt. The barcode shown is the exact one that was dispatched with this order.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-gray-600">{progress} / {receivingItems.length} items received</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress / receivingItems.length) * 100}%` }}
            />
          </div>
        </div>

        {/* All Items Overview */}
        <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
          <h3 className="font-medium text-sm mb-3">Expected Return Items:</h3>
          {receivingItems.map((item, idx) => (
            <div 
              key={idx}
              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                idx === currentItemIndex 
                  ? 'bg-blue-100 border border-blue-300' 
                  : item.scanned 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleSkipToItem(idx)}
            >
              <div className="flex items-center gap-3 flex-1">
                {item.scanned ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                    idx === currentItemIndex ? 'border-blue-600 text-blue-600' : 'border-gray-400 text-gray-400'
                  }`}>
                    {idx + 1}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.sku_name}</p>
                  <p className="text-xs text-gray-600">SKU: {item.sku} | Qty: {item.quantity}</p>
                  <p className="text-xs font-mono text-blue-600">Barcode: {item.recommended_lot || item.sku}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintBarcode(item);
                }}
                className="ml-2"
              >
                <Printer className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {!allScanned && (
          <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <div className="space-y-4">
              {/* Current Item Details */}
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  Current Item ({currentItemIndex + 1}/{receivingItems.length})
                </h3>
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Product</p>
                    <p className="font-semibold text-lg">{currentItem.sku_name}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">SKU</p>
                      <p className="font-medium">{currentItem.sku}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quantity</p>
                      <p className="font-medium">{currentItem.quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Price</p>
                      <p className="font-medium">৳{currentItem.price.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {/* Expected Barcode */}
                  <div className="border-t pt-3 mt-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 space-y-2">
                      <p className="text-sm font-medium text-yellow-900 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Expected Barcode (From Dispatch)
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-bold text-yellow-700 text-lg">
                          {currentItem.recommended_lot || currentItem.sku}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintBarcode(currentItem)}
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          Print
                        </Button>
                      </div>
                      <p className="text-xs text-gray-600 italic">
                        This is the exact barcode that was sent with this order. Print it if the product arrived without packaging.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barcode Scanner Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Scan className="w-4 h-4" />
                  Scan Barcode
                </label>
                <div className="flex gap-2">
                  <Input
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                    placeholder="Scan or enter barcode..."
                    className="font-mono"
                    disabled={scanning}
                    autoFocus
                  />
                  <Button 
                    onClick={handleScan} 
                    disabled={!scannedBarcode.trim() || scanning}
                  >
                    {scanning ? 'Scanning...' : 'Scan'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setCameraScannerOpen(true)}
                    className="bg-blue-50 border-blue-300 hover:bg-blue-100"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Error Display */}
              {currentItem.scanError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-900">Scan Error</p>
                      <p className="text-sm text-red-700 mt-1">{currentItem.scanError}</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleTryAgain} className="w-full">
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Complete Button */}
        {allScanned && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <div>
              <p className="font-semibold text-green-900">All Items Received!</p>
              <p className="text-sm text-gray-600 mt-1">Ready for quality control</p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCompleteReceive}
            disabled={progress === 0}
            className={progress === receivingItems.length ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}
          >
            {progress === receivingItems.length 
              ? 'Complete Receive (100%)' 
              : `Complete Receive (${progress}/${receivingItems.length} - Partial)`}
          </Button>
        </div>
      </DialogContent>

      {/* Barcode Scanner for Camera */}
      <BarcodeScanner
        isOpen={cameraScannerOpen}
        onClose={() => setCameraScannerOpen(false)}
        onScan={handleCameraScan}
        title="Scan Return Item Barcode"
        description="Point your camera at the item barcode"
      />
    </Dialog>
  );
}
