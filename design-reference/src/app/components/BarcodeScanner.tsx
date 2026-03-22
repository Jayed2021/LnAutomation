import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Camera, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  description?: string;
}

export function BarcodeScanner({ 
  isOpen, 
  onClose, 
  onScan,
  title = "Scan Barcode",
  description = "Point your camera at the barcode"
}: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setError(null);
      
      // Check if camera is available
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setError('No camera found on this device');
        setHasPermission(false);
        return;
      }

      setHasPermission(true);

      // Create scanner instance
      const scanner = new Html5Qrcode('barcode-scanner-region');
      scannerRef.current = scanner;

      // Prefer back camera on mobile
      const backCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      ) || devices[0];

      // Start scanning
      await scanner.start(
        backCamera.id,
        {
          fps: 10, // Scans per second
          qrbox: { width: 250, height: 150 }, // Scanning box size
          aspectRatio: 1.777778 // 16:9 aspect ratio
        },
        (decodedText) => {
          // Success - barcode scanned
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Scanning in progress, ignore errors
          // console.log('Scanning...', errorMessage);
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Scanner error:', err);
      setError('Failed to start camera. Please check permissions.');
      setHasPermission(false);
      toast.error('Camera access denied or unavailable');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const handleScanSuccess = (barcode: string) => {
    // Vibrate on successful scan (if supported)
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    toast.success(`Barcode scanned: ${barcode}`);
    onScan(barcode);
    
    // Close scanner after successful scan
    onClose();
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">{description}</p>

          {/* Scanner Region */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <div id="barcode-scanner-region" className="w-full min-h-[300px]" />
            
            {/* Overlay guidance */}
            {isScanning && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                Align barcode within the box
              </div>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Camera Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                {hasPermission === false && (
                  <p className="text-xs text-red-600 mt-2">
                    Please enable camera permissions in your browser settings and refresh the page.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Status */}
          {isScanning && !error && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              <p className="text-sm text-green-900 font-medium">Camera active - Ready to scan</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
