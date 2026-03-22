import { useState } from 'react';
import { X, Check, Printer, ScanLine } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface ReturnReceiveModalProps {
  returnData: {
    id: string;
    return_number: string;
    items: Array<{
      id: string;
      sku: string;
      product_name: string;
      quantity: number;
      expected_barcode: string | null;
    }>;
  };
  onClose: () => void;
}

export function ReturnReceiveModal({ returnData, onClose }: ReturnReceiveModalProps) {
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set());
  const [scannedInput, setScannedInput] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [processing, setProcessing] = useState(false);

  useState(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;

      if (timeDiff < 100) {
        setScannedInput(prev => prev + e.key);
      } else {
        setScannedInput(e.key);
      }

      setLastKeyTime(currentTime);

      if (e.key === 'Enter' && scannedInput) {
        handleBarcodeScanned(scannedInput);
        setScannedInput('');
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  });

  const handleBarcodeScanned = (barcode: string) => {
    const item = returnData.items.find(i =>
      i.sku === barcode ||
      i.expected_barcode === barcode
    );

    if (item && !scannedItems.has(item.id)) {
      setScannedItems(prev => new Set(prev).add(item.id));
    }
  };

  const handleManualCheck = (itemId: string) => {
    if (scannedItems.has(itemId)) {
      const newSet = new Set(scannedItems);
      newSet.delete(itemId);
      setScannedItems(newSet);
    } else {
      setScannedItems(prev => new Set(prev).add(itemId));
    }
  };

  const handlePrintBarcode = (item: { sku: string; product_name: string }) => {
    console.log('Printing barcode for:', item.sku);
  };

  const allItemsScanned = returnData.items.every(item => scannedItems.has(item.id));

  const handleCompleteReceive = async () => {
    try {
      setProcessing(true);

      await supabase
        .from('returns')
        .update({ status: 'received' })
        .eq('id', returnData.id);

      await supabase
        .from('order_activity_log')
        .insert({
          order_id: returnData.id,
          action: `Return ${returnData.return_number} received`,
        });

      onClose();
    } catch (error) {
      console.error('Error completing receive:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Receive Return: {returnData.return_number}</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Scan or check each expected item
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <ScanLine className="h-4 w-4" />
            <span>Scan items with barcode scanner or check manually</span>
          </div>

          <div className="space-y-3">
            {returnData.items.map(item => {
              const isScanned = scannedItems.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isScanned
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-gray-900">{item.product_name}</span>
                        {isScanned && (
                          <Badge variant="green">
                            <Check className="h-3 w-3 mr-1" />
                            Received
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>SKU: {item.sku}</div>
                        <div>Quantity: {item.quantity}</div>
                        {item.expected_barcode && (
                          <div className="text-xs">Expected Barcode: {item.expected_barcode}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {item.expected_barcode ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintBarcode(item)}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant={isScanned ? 'outline' : 'primary'}
                        onClick={() => handleManualCheck(item.id)}
                      >
                        {isScanned ? 'Uncheck' : 'Check'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {allItemsScanned && (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <Check className="h-5 w-5" />
              <span className="font-medium">All items received! You can now complete the receive process.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCompleteReceive}
            disabled={!allItemsScanned || processing}
          >
            {processing ? 'Processing...' : 'Complete Receive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
