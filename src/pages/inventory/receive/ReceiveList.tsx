import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, Clock, RefreshCw, ChevronRight, AlertCircle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { loadPOsForReceiving } from './service';
import type { POForReceiving, Location } from './types';

interface Props {
  onSelectPO: (po: POForReceiving, locations: Location[], resumeSessionId?: string) => void;
  refreshTrigger: number;
}

export default function ReceiveList({ onSelectPO, refreshTrigger }: Props) {
  const [pos, setPos] = useState<POForReceiving[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [refreshTrigger]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await loadPOsForReceiving();
      setPos(data.pos);
      setLocations(data.locations);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mr-2" />
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (pos.length === 0) {
    return (
      <Card>
        <div className="py-20 text-center">
          <Truck className="w-14 h-14 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No POs Ready to Receive</h3>
          <p className="text-sm text-gray-400 mt-2">
            POs in <span className="font-mono bg-gray-100 px-1 rounded">ordered</span> or{' '}
            <span className="font-mono bg-gray-100 px-1 rounded">partially received</span> status will appear here.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pos.map(po => {
        const totalOrdered = po.items.reduce((s, i) => s + i.ordered_quantity, 0);
        const totalReceived = po.items.reduce((s, i) => s + i.received_quantity, 0);
        const isPartial = totalReceived > 0;
        const inProgressSession = po.activeSessions.find(s => s.step === 'qty_check' || s.step === 'qc_in_progress');
        const pendingQCSession = po.activeSessions.find(s => s.step === 'qty_checked');

        return (
          <Card key={po.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <h3 className="font-bold text-gray-900 text-lg">{po.po_number}</h3>
                  {isPartial ? (
                    <Badge variant="yellow">
                      Partially Received — {totalReceived} / {totalOrdered} units
                    </Badge>
                  ) : (
                    <Badge variant="blue">Ready to Receive</Badge>
                  )}
                  {inProgressSession && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      <Clock className="w-3 h-3" />
                      Draft: {inProgressSession.shipment_name}
                    </span>
                  )}
                  {pendingQCSession && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      <AlertCircle className="w-3 h-3" />
                      QC Pending: {pendingQCSession.shipment_name}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 font-medium mb-0.5">{po.supplier_name}</p>
                {po.expected_delivery_date && (
                  <p className="text-xs text-gray-400 mb-3">Expected: {po.expected_delivery_date}</p>
                )}

                <div className="flex flex-wrap gap-2 mt-2">
                  {po.items.slice(0, 6).map(item => (
                    <span key={item.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {item.sku} × {item.remaining}
                    </span>
                  ))}
                  {po.items.length > 6 && (
                    <span className="text-xs text-gray-400 px-2 py-1">+{po.items.length - 6} more</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {inProgressSession && (
                  <button
                    onClick={() => onSelectPO(po, locations, inProgressSession.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    Resume
                  </button>
                )}
                {pendingQCSession && (
                  <button
                    onClick={() => onSelectPO(po, locations, pendingQCSession.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Do QC
                  </button>
                )}
                {po.items.length > 0 && (
                  <button
                    onClick={() => onSelectPO(po, locations)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Package className="w-4 h-4" />
                    {isPartial ? 'Receive More' : 'Start Receiving'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
