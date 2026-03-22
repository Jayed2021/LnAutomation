import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { AlertCircle, CheckCircle2, MapPin, Package, Scan, Camera } from 'lucide-react';
import { BarcodeScanner } from '../BarcodeScanner';
import type { OrderItem } from '../../data/mockData';
import { toast } from 'sonner';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderItems: OrderItem[];
  orderId: string;
  wooOrderId: string;
  onRestockComplete: (restockedItems: OrderItem[]) => void;
}

interface RestockingItem extends OrderItem {
  locationScanned: boolean;
  productScanned: boolean;
  scannedLocation?: string;
  scannedBarcode?: string;
  scanError?: string;
  recommendedRestockLocation?: string;
}

// Mock function to get recommended storage location based on SKU
function getRecommendedLocation(sku: string): string {
  // Group similar products together
  if (sku.startsWith('LN_')) return 'A1-R2-S3'; // Lenses in Aisle A
  if (sku.startsWith('FR_')) return 'B2-R1-S4'; // Frames in Aisle B
  if (sku.startsWith('CS_')) return 'C1-R3-S2'; // Cases in Aisle C
  return 'D1-R1-S1'; // Default location
}

export function RestockModal({ isOpen, onClose, orderItems, orderId, wooOrderId, onRestockComplete }: RestockModalProps) {
  const [restockingItems, setRestockingItems] = useState<RestockingItem[]>(
    orderItems.map(item => ({ 
      ...item, 
      locationScanned: false, 
      productScanned: false,
      recommendedRestockLocation: getRecommendedLocation(item.sku)
    }))
  );
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [scannedInput, setScannedInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'location' | 'product'>('location');

  const currentItem = restockingItems[currentItemIndex];
  const allRestocked = restockingItems.every(item => item.locationScanned && item.productScanned);
  const progress = restockingItems.filter(item => item.locationScanned && item.productScanned).length;

  const handleScan = () => {
    if (!scannedInput.trim()) return;

    setScanning(true);
    
    setTimeout(() => {
      if (scanMode === 'location') {
        // Scanning location first
        setRestockingItems(prev => prev.map((item, idx) => 
          idx === currentItemIndex 
            ? { 
                ...item, 
                locationScanned: true,
                scannedLocation: scannedInput.trim(),
                scanError: undefined 
              }
            : item
        ));
        setScannedInput('');
        setScanMode('product');
        toast.success(`Location ${scannedInput.trim()} confirmed. Now scan the product.`);
      } else {
        // Scanning product
        const expectedBarcode = currentItem.recommended_lot || currentItem.sku;
        
        if (scannedInput.trim() === expectedBarcode || scannedInput.trim() === currentItem.sku) {
          // Correct product scanned
          setRestockingItems(prev => prev.map((item, idx) => 
            idx === currentItemIndex 
              ? { 
                  ...item, 
                  productScanned: true,
                  scannedBarcode: scannedInput.trim(),
                  scanError: undefined 
                }
              : item
          ));
          setScannedInput('');
          setScanMode('location');
          
          toast.success(`Item ${currentItem.sku_name} restocked to ${currentItem.scannedLocation}`);
          
          // Move to next item
          if (currentItemIndex < restockingItems.length - 1) {
            setCurrentItemIndex(currentItemIndex + 1);
          }
        } else {
          // Wrong product
          setRestockingItems(prev => prev.map((item, idx) => 
            idx === currentItemIndex 
              ? { ...item, scanError: 'Wrong product scanned. Please scan the correct item.' }
              : item
          ));
        }
      }
      
      setScanning(false);
    }, 300);
  };

  const handleTryAgain = () => {
    setRestockingItems(prev => prev.map((item, idx) => 
      idx === currentItemIndex 
        ? { 
            ...item, 
            scanError: undefined,
            locationScanned: false,
            productScanned: false,
            scannedLocation: undefined
          }
        : item
    ));
    setScannedInput('');
    setScanMode('location');
  };

  const handleCompleteRestock = () => {
    const restockedCount = restockingItems.filter(item => item.locationScanned && item.productScanned).length;
    
    if (restockedCount === 0) {
      toast.error('Please restock at least one item before completing');
      return;
    }
    
    onRestockComplete(restockingItems);
    onClose();
  };

  const handleSkipToItem = (index: number) => {
    setCurrentItemIndex(index);
    setRestockingItems(prev => prev.map((item, idx) => 
      idx === currentItemIndex 
        ? { ...item, scanError: undefined }
        : item
    ));
    setScannedInput('');
    setScanMode('location');
  };

  const handleCameraScan = (barcode: string) => {
    setScannedInput(barcode);
    
    setScanning(true);
    
    setTimeout(() => {
      if (scanMode === 'location') {
        setRestockingItems(prev => prev.map((item, idx) => 
          idx === currentItemIndex 
            ? { 
                ...item, 
                locationScanned: true,
                scannedLocation: barcode.trim(),
                scanError: undefined 
              }
            : item
        ));
        setScannedInput('');
        setScanMode('product');
        toast.success(`Location ${barcode.trim()} confirmed. Now scan the product.`);
      } else {
        const expectedBarcode = currentItem.recommended_lot || currentItem.sku;
        
        if (barcode.trim() === expectedBarcode || barcode.trim() === currentItem.sku) {
          setRestockingItems(prev => prev.map((item, idx) => 
            idx === currentItemIndex 
              ? { 
                  ...item, 
                  productScanned: true,
                  scannedBarcode: barcode.trim(),
                  scanError: undefined 
                }
              : item
          ));
          setScannedInput('');
          setScanMode('location');
          
          toast.success(`Item ${currentItem.sku_name} restocked to ${currentItem.scannedLocation}`);
          
          if (currentItemIndex < restockingItems.length - 1) {
            setCurrentItemIndex(currentItemIndex + 1);
          }
        } else {
          setRestockingItems(prev => prev.map((item, idx) => 
            idx === currentItemIndex 
              ? { ...item, scanError: 'Wrong product scanned. Please scan the correct item.' }
              : item
          ));
        }
      }
      
      setScanning(false);
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Restock Items for Order {wooOrderId}
          </DialogTitle>
          <DialogDescription>
            First scan the warehouse location, then scan the product. Similar products are stored together.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-gray-600">{progress} / {restockingItems.length} items restocked</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress / restockingItems.length) * 100}%` }}
            />
          </div>
        </div>

        {/* All Items Overview */}
        <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
          <h3 className="font-medium text-sm mb-3">Items to Restock:</h3>
          {restockingItems.map((item, idx) => (
            <div 
              key={idx}
              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                idx === currentItemIndex 
                  ? 'bg-blue-100 border border-blue-300' 
                  : (item.locationScanned && item.productScanned)
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleSkipToItem(idx)}
            >
              <div className="flex items-center gap-3">
                {(item.locationScanned && item.productScanned) ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                    idx === currentItemIndex ? 'border-blue-600 text-blue-600' : 'border-gray-400 text-gray-400'
                  }`}>
                    {idx + 1}
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">{item.sku_name}</p>
                  <p className="text-xs text-gray-600">SKU: {item.sku} | Qty: {item.quantity}</p>
                  {item.scannedLocation && (
                    <p className="text-xs text-purple-600 font-medium">
                      Location: {item.scannedLocation}
                    </p>
                  )}
                </div>
              </div>
              {item.locationScanned && !item.productScanned && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                  Awaiting Product Scan
                </Badge>
              )}
            </div>
          ))}
        </div>

        {!allRestocked && (
          <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <div className="space-y-4">
              {/* Current Item Details */}
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  Current Item ({currentItemIndex + 1}/{restockingItems.length})
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
                  
                  {/* Recommended Location */}
                  <div className="border-t pt-3 mt-3">
                    <div className="bg-purple-50 border border-purple-200 rounded p-3 space-y-2">
                      <p className="text-sm font-medium text-purple-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Recommended Storage Location
                      </p>
                      <p className="font-mono font-bold text-purple-700 text-xl">
                        {currentItem.recommendedRestockLocation}
                      </p>
                      <p className="text-xs text-gray-600 italic">
                        Similar products ({currentItem.sku.split('_')[0]}_*) are stored here. You can scan a different location if needed.
                      </p>
                    </div>
                  </div>

                  {/* Current Scan Step */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {scanMode === 'location' ? (
                        <MapPin className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Package className="w-5 h-5 text-blue-600" />
                      )}
                      <p className="font-semibold text-blue-900">
                        Step {currentItem.locationScanned ? '2' : '1'} of 2: 
                        {scanMode === 'location' ? ' Scan Location' : ' Scan Product'}
                      </p>
                    </div>
                    {currentItem.locationScanned && (
                      <p className="text-sm text-gray-600">
                        ✓ Location confirmed: <span className="font-mono font-bold">{currentItem.scannedLocation}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Barcode Scanner Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Scan className="w-4 h-4" />
                  {scanMode === 'location' ? 'Scan Location Barcode' : 'Scan Product Barcode'}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={scannedInput}
                    onChange={(e) => setScannedInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                    placeholder={scanMode === 'location' ? 'Scan location barcode...' : 'Scan product barcode...'}
                    className="font-mono"
                    disabled={scanning}
                    autoFocus
                  />
                  <Button 
                    onClick={handleScan} 
                    disabled={!scannedInput.trim() || scanning}
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
                <p className="text-xs text-gray-600">
                  {scanMode === 'location' 
                    ? 'Scan the barcode on the warehouse location shelf' 
                    : 'Scan the product barcode to confirm restocking'}
                </p>
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
                    Reset and Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Complete Button */}
        {allRestocked && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <div>
              <p className="font-semibold text-green-900">All Items Restocked!</p>
              <p className="text-sm text-gray-600 mt-1">Inventory has been updated</p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCompleteRestock}
            disabled={progress === 0}
            className={progress === restockingItems.length ? 'bg-purple-600 hover:bg-purple-700' : 'bg-yellow-600 hover:bg-yellow-700'}
          >
            {progress === restockingItems.length 
              ? 'Complete Restock (100%)' 
              : `Complete Restock (${progress}/${restockingItems.length} - Partial)`}
          </Button>
        </div>
      </DialogContent>

      {/* Barcode Scanner for Camera */}
      <BarcodeScanner
        isOpen={cameraScannerOpen}
        onClose={() => setCameraScannerOpen(false)}
        onScan={handleCameraScan}
        title={scanMode === 'location' ? 'Scan Location Barcode' : 'Scan Product Barcode'}
        description={scanMode === 'location' 
          ? 'Point your camera at the warehouse location barcode' 
          : 'Point your camera at the product barcode'}
      />
    </Dialog>
  );
}
