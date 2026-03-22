import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { AlertCircle, CheckCircle2, MapPin, Package, Scan, Camera } from 'lucide-react';
import { validateScannedBarcode } from '../../utils/fifoLogic';
import { BarcodeScanner } from '../BarcodeScanner';
import type { OrderItem } from '../../data/mockData';

interface PickModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderItems: OrderItem[];
  orderId: string;
  wooOrderId: string;
  onPickComplete: (pickedItems: OrderItem[]) => void;
}

interface PickingItem extends OrderItem {
  scanned: boolean;
  scanError?: string;
  allowDifferentLot?: boolean;
}

export function PickModal({ isOpen, onClose, orderItems, orderId, wooOrderId, onPickComplete }: PickModalProps) {
  const [pickingItems, setPickingItems] = useState<PickingItem[]>(
    orderItems.map(item => ({ ...item, scanned: false }))
  );
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);

  const currentItem = pickingItems[currentItemIndex];
  const allScanned = pickingItems.every(item => item.scanned);
  const progress = pickingItems.filter(item => item.scanned).length;

  const handleScan = () => {
    if (!scannedBarcode.trim()) return;

    setScanning(true);
    
    // Simulate barcode scan delay
    setTimeout(() => {
      const validation = validateScannedBarcode(
        scannedBarcode.trim(),
        currentItem.recommended_lot || '',
        currentItem.sku
      );

      if (!validation.valid) {
        // Wrong item entirely
        setPickingItems(prev => prev.map((item, idx) => 
          idx === currentItemIndex 
            ? { ...item, scanError: validation.message }
            : item
        ));
        setScanning(false);
        return;
      }

      if (validation.exactMatch) {
        // Correct item - exact match
        setPickingItems(prev => prev.map((item, idx) => 
          idx === currentItemIndex 
            ? { 
                ...item, 
                scanned: true, 
                picked_barcode: scannedBarcode.trim(),
                picked_lot: currentItem.recommended_lot,
                pick_discrepancy: false,
                scanError: undefined 
              }
            : item
        ));
        setScannedBarcode('');
        
        // Move to next item
        if (currentItemIndex < pickingItems.length - 1) {
          setCurrentItemIndex(currentItemIndex + 1);
        }
      } else {
        // Same SKU but different lot - needs confirmation
        if (currentItem.allowDifferentLot) {
          // User chose "Just Pick" - accept different lot
          setPickingItems(prev => prev.map((item, idx) => 
            idx === currentItemIndex 
              ? { 
                  ...item, 
                  scanned: true, 
                  picked_barcode: scannedBarcode.trim(),
                  picked_lot: scannedBarcode.trim(),
                  pick_discrepancy: true,
                  scanError: undefined 
                }
              : item
          ));
          setScannedBarcode('');
          
          // Move to next item
          if (currentItemIndex < pickingItems.length - 1) {
            setCurrentItemIndex(currentItemIndex + 1);
          }
        } else {
          // Show error with options
          setPickingItems(prev => prev.map((item, idx) => 
            idx === currentItemIndex 
              ? { ...item, scanError: validation.message }
              : item
          ));
        }
      }
      
      setScanning(false);
    }, 300);
  };

  const handleTryAgain = () => {
    setPickingItems(prev => prev.map((item, idx) => 
      idx === currentItemIndex 
        ? { ...item, scanError: undefined, allowDifferentLot: false }
        : item
    ));
    setScannedBarcode('');
  };

  const handleJustPick = () => {
    setPickingItems(prev => prev.map((item, idx) => 
      idx === currentItemIndex 
        ? { ...item, scanError: undefined, allowDifferentLot: true }
        : item
    ));
  };

  const handleComplete = () => {
    onPickComplete(pickingItems);
    onClose();
  };

  const handleCompletePick = () => {
    const pickedCount = pickingItems.filter(item => item.scanned).length;
    const totalCount = pickingItems.length;
    
    if (pickedCount === totalCount) {
      // 100% picked
      onPickComplete(pickingItems);
      onClose();
    } else if (pickedCount > 0) {
      // Partial pick
      onPickComplete(pickingItems);
      onClose();
    }
  };

  const handleSkipToItem = (index: number) => {
    // Allow clicking on any item to jump to it
    setCurrentItemIndex(index);
    // Clear any existing error on the previously selected item
    setPickingItems(prev => prev.map((item, idx) => 
      idx === currentItemIndex 
        ? { ...item, scanError: undefined, allowDifferentLot: false }
        : item
    ));
    setScannedBarcode('');
  };

  const handleCameraScan = (barcode: string) => {
    // Set the barcode from camera scan and trigger validation
    setScannedBarcode(barcode);
    
    // Need to manually trigger validation since state update is async
    setScanning(true);
    
    setTimeout(() => {
      const validation = validateScannedBarcode(
        barcode.trim(),
        currentItem.recommended_lot || '',
        currentItem.sku
      );

      if (!validation.valid) {
        setPickingItems(prev => prev.map((item, idx) => 
          idx === currentItemIndex 
            ? { ...item, scanError: validation.message }
            : item
        ));
        setScanning(false);
        return;
      }

      if (validation.exactMatch) {
        setPickingItems(prev => prev.map((item, idx) => 
          idx === currentItemIndex 
            ? { 
                ...item, 
                scanned: true, 
                picked_barcode: barcode.trim(),
                picked_lot: currentItem.recommended_lot,
                pick_discrepancy: false,
                scanError: undefined 
              }
            : item
        ));
        setScannedBarcode('');
        
        if (currentItemIndex < pickingItems.length - 1) {
          setCurrentItemIndex(currentItemIndex + 1);
        }
      } else {
        if (currentItem.allowDifferentLot) {
          setPickingItems(prev => prev.map((item, idx) => 
            idx === currentItemIndex 
              ? { 
                  ...item, 
                  scanned: true, 
                  picked_barcode: barcode.trim(),
                  picked_lot: barcode.trim(),
                  pick_discrepancy: true,
                  scanError: undefined 
                }
              : item
          ));
          setScannedBarcode('');
          
          if (currentItemIndex < pickingItems.length - 1) {
            setCurrentItemIndex(currentItemIndex + 1);
          }
        } else {
          setPickingItems(prev => prev.map((item, idx) => 
            idx === currentItemIndex 
              ? { ...item, scanError: validation.message }
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
            Pick Items for Order {wooOrderId}
          </DialogTitle>
          <DialogDescription>
            Scan each item's barcode to confirm picking. Follow FIFO (First In, First Out) order.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-gray-600">{progress} / {pickingItems.length} items picked</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress / pickingItems.length) * 100}%` }}
            />
          </div>
        </div>

        {/* All Items Overview */}
        <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
          <h3 className="font-medium text-sm mb-3">Items to Pick:</h3>
          {pickingItems.map((item, idx) => (
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
              <div className="flex items-center gap-3">
                {item.scanned ? (
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
                  <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                </div>
              </div>
              {item.scanned && item.pick_discrepancy && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                  Different Lot
                </Badge>
              )}
            </div>
          ))}
        </div>

        {!allScanned && (
          <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <div className="space-y-4">
              {/* Current Item Details */}
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  Current Item ({currentItemIndex + 1}/{pickingItems.length})
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
                  
                  {/* FIFO Recommendation */}
                  <div className="border-t pt-3 mt-3">
                    <div className="bg-green-50 border border-green-200 rounded p-3 space-y-2">
                      <p className="text-sm font-medium text-green-900 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Recommended Lot (FIFO)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-600">Barcode to Scan</p>
                          <p className="font-mono font-bold text-green-700">{currentItem.recommended_lot || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Location
                          </p>
                          <p className="font-semibold text-blue-700">{currentItem.recommended_location || 'N/A'}</p>
                        </div>
                      </div>
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
                <p className="text-xs text-gray-600">
                  Click the camera button to use your phone's camera for scanning
                </p>
              </div>

              {/* Error Display with Actions */}
              {currentItem.scanError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-900">Scan Error</p>
                      <p className="text-sm text-red-700 mt-1">{currentItem.scanError}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={handleTryAgain} className="flex-1">
                      Try Again
                    </Button>
                    {currentItem.scanError.includes('Different lot') && (
                      <Button 
                        variant="default" 
                        onClick={handleJustPick}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                      >
                        Just Pick (Log Discrepancy)
                      </Button>
                    )}
                  </div>
                  {currentItem.scanError.includes('Different lot') && (
                    <p className="text-xs text-gray-600 italic">
                      Choosing "Just Pick" will log this as a FIFO violation and notify managers.
                    </p>
                  )}
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
              <p className="font-semibold text-green-900">All Items Picked!</p>
              <p className="text-sm text-gray-600 mt-1">Order is ready for packing</p>
            </div>
            <Button onClick={handleComplete} className="w-full" size="lg">
              Complete Pick Operation
            </Button>
          </div>
        )}

        {/* Footer Actions */}
        {!allScanned && (
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleCompletePick}
              disabled={progress === 0}
              className={progress === pickingItems.length ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}
            >
              {progress === pickingItems.length ? 'Complete Pick (100%)' : `Complete Pick (${progress}/${pickingItems.length} - Partial)`}
            </Button>
          </div>
        )}
      </DialogContent>

      {/* Barcode Scanner for Camera */}
      <BarcodeScanner
        isOpen={cameraScannerOpen}
        onClose={() => setCameraScannerOpen(false)}
        onScan={handleCameraScan}
        title="Scan Item Barcode"
        description="Point your camera at the item barcode on the product label"
      />
    </Dialog>
  );
}