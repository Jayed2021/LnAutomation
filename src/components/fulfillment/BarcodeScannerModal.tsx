import { useState, useRef, useEffect } from 'react';
import { X, Camera, ScanLine } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface BarcodeScannerModalProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({ onScan, onClose }: BarcodeScannerModalProps) {
  const [manualInput, setManualInput] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;

      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);

      if ('BarcodeDetector' in window) {
        // @ts-ignore
        const detector = new window.BarcodeDetector({ formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'code_39', 'upc_a', 'upc_e', 'itf', 'data_matrix'] });
        const detect = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(detect);
            return;
          }
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const value = barcodes[0].rawValue;
              stopScanner();
              onScan(value);
              onClose();
              return;
            }
          } catch {
          }
          animFrameRef.current = requestAnimationFrame(detect);
        };
        animFrameRef.current = requestAnimationFrame(detect);
      } else {
        setCameraError('Camera is active but barcode detection is not supported in this browser. Please use manual input or a USB scanner.');
      }
    } catch {
      setCameraError('Unable to access camera. Please use manual input or a USB scanner.');
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      stopScanner();
      onScan(manualInput.trim());
      onClose();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Scan Barcode</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            {cameraError ? (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center p-6">
                  <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">{cameraError}</p>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-blue-500 w-64 h-32 rounded-lg relative">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-blue-500"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-blue-500"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-blue-500"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-blue-500"></div>
                    {scanning && (
                      <div className="absolute inset-0 overflow-hidden rounded-lg">
                        <div className="animate-scan-line absolute w-full h-0.5 bg-blue-400 opacity-80" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <div className="inline-flex items-center gap-2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                    <ScanLine className="h-4 w-4" />
                    {scanning ? 'Scanning — point camera at barcode' : 'Starting camera...'}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="h-px bg-gray-300 flex-1"></div>
              <span>Or enter manually</span>
              <div className="h-px bg-gray-300 flex-1"></div>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter order number or barcode..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="primary">
                Submit
              </Button>
            </form>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Camera scanner works for barcodes and QR codes on packing slips</p>
            <p>• USB barcode scanners work automatically on the main screen</p>
            <p>• Manual input can be used for order numbers</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
