import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, ScanLine, Keyboard } from 'lucide-react';

interface BarcodeScannerModalProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const SCAN_INTERVAL_MS = 120;

export function BarcodeScannerModal({ onScan, onClose }: BarcodeScannerModalProps) {
  const [manualInput, setManualInput] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [noDetectSeconds, setNoDetectSeconds] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const noDetectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
      if (noDetectTimerRef.current) clearInterval(noDetectTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (showManual) {
      setTimeout(() => manualInputRef.current?.focus(), 50);
    }
  }, [showManual]);

  useEffect(() => {
    noDetectTimerRef.current = setInterval(() => {
      setNoDetectSeconds(s => s + 1);
    }, 1000);
    return () => {
      if (noDetectTimerRef.current) clearInterval(noDetectTimerRef.current);
    };
  }, []);

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;

      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);

      if ('BarcodeDetector' in window) {
        // @ts-ignore
        const detector = new window.BarcodeDetector({
          formats: ['code_128', 'code_39', 'codabar', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'qr_code', 'data_matrix', 'aztec', 'pdf417'],
        });
        const detect = async () => {
          const now = performance.now();
          if (now - lastScanTimeRef.current < SCAN_INTERVAL_MS) {
            animFrameRef.current = requestAnimationFrame(detect);
            return;
          }
          lastScanTimeRef.current = now;

          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || video.readyState < 2 || !canvas) {
            animFrameRef.current = requestAnimationFrame(detect);
            return;
          }

          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (vw === 0 || vh === 0) {
            animFrameRef.current = requestAnimationFrame(detect);
            return;
          }

          canvas.width = vw;
          canvas.height = vh;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            animFrameRef.current = requestAnimationFrame(detect);
            return;
          }
          ctx.drawImage(video, 0, 0, vw, vh);

          try {
            const barcodes = await detector.detect(canvas);
            if (barcodes.length > 0) {
              const value = barcodes[0].rawValue;
              if (value) {
                if (navigator.vibrate) navigator.vibrate(80);
                stopScanner();
                onScan(value);
                onClose();
                return;
              }
            }
          } catch {
          }
          animFrameRef.current = requestAnimationFrame(detect);
        };
        animFrameRef.current = requestAnimationFrame(detect);
      } else {
        setCameraError('Barcode detection is not supported in this browser. Please use manual input or a USB scanner.');
      }
    } catch {
      setCameraError('Unable to access camera. Please allow camera access or use manual input.');
      setScanning(false);
    }
  };

  const stopScanner = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = manualInput.trim();
    if (!val) return;
    stopScanner();
    onScan(val);
    onClose();
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  const showHint = noDetectSeconds >= 5 && !showManual && !cameraError;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative flex-1 overflow-hidden">
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8 max-w-sm">
              <Camera className="h-16 w-16 mx-auto mb-4 text-gray-500" />
              <p className="text-white text-sm leading-relaxed">{cameraError}</p>
              <button
                onClick={() => setShowManual(true)}
                className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Enter Manually
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              playsInline
              autoPlay
            />

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/40" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 10% 25%, 10% 75%, 90% 75%, 90% 25%, 10% 25%)' }} />
            </div>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative" style={{ width: '80vw', maxWidth: 480, height: '28vw', maxHeight: 160, minHeight: 80 }}>
                <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
                <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl" />
                <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr" />
                <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl" />
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br" />
                {scanning && (
                  <div className="absolute inset-0 overflow-hidden rounded-lg">
                    <div className="animate-scan-line absolute w-full h-0.5 bg-blue-400 opacity-90 shadow-[0_0_6px_2px_rgba(96,165,250,0.8)]" />
                  </div>
                )}
              </div>
            </div>

            <div className="absolute bottom-32 left-0 right-0 flex justify-center pointer-events-none">
              <div className="inline-flex items-center gap-2 bg-black/60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
                <ScanLine className="h-4 w-4 text-blue-400" />
                {scanning ? 'Point camera at barcode — fill the frame' : 'Starting camera...'}
              </div>
            </div>

            {showHint && (
              <div className="absolute bottom-20 left-0 right-0 flex justify-center">
                <button
                  onClick={() => setShowManual(true)}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm transition-colors border border-white/20"
                >
                  <Keyboard className="h-4 w-4" />
                  Can't scan? Enter manually
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-gray-950 border-t border-gray-800 px-4 pt-3 pb-safe">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-semibold text-sm">Scan Barcode</span>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!showManual && !cameraError && (
          <button
            onClick={() => setShowManual(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border border-gray-700 rounded-xl text-gray-300 hover:text-white hover:border-gray-500 transition-colors text-sm mb-3"
          >
            <Keyboard className="h-4 w-4" />
            Enter barcode manually
          </button>
        )}

        {showManual && (
          <form onSubmit={handleManualSubmit} className="flex gap-2 mb-3">
            <input
              ref={manualInputRef}
              type="text"
              placeholder="Type or paste barcode..."
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-600 text-white placeholder-gray-500 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors"
            >
              OK
            </button>
          </form>
        )}

        <p className="text-xs text-gray-500 text-center pb-2">
          Move closer or farther to help camera focus on small barcodes
        </p>
      </div>
    </div>
  );
}
