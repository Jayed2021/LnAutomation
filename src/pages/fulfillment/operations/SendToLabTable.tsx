import { useState } from 'react';
import { FileText, Send, FlaskConical, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { OperationsOrder } from './types';

interface Props {
  orders: OperationsOrder[];
  displayId: (o: OperationsOrder) => string;
  onPrintLabInvoice: (o: OperationsOrder) => void;
  onPickForLab: (o: OperationsOrder) => void;
  onMarkAsInLab: (id: string) => void;
  onNavigate: (id: string) => void;
}

export function SendToLabTable({
  orders,
  displayId,
  onPrintLabInvoice,
  onPickForLab,
  onMarkAsInLab,
  onNavigate,
}: Props) {
  const [confirmLabId, setConfirmLabId] = useState<string | null>(null);

  const handleMarkInLab = (orderId: string) => {
    if (confirmLabId === orderId) {
      onMarkAsInLab(orderId);
      setConfirmLabId(null);
    } else {
      setConfirmLabId(orderId);
    }
  };

  return (
    <>
      <div className="sm:hidden divide-y divide-gray-100">
        {orders.map(order => (
          <div key={order.id} className="p-4 hover:bg-teal-50 transition-colors">
            <button className="w-full text-left" onClick={() => onNavigate(order.id)}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-blue-600 text-base">{displayId(order)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.fulfillment_status === 'in_lab' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                  {order.fulfillment_status === 'in_lab' ? 'In Lab' : 'Send to Lab'}
                </span>
              </div>
              <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
              <div className="text-sm text-gray-500">{order.customer?.phone_primary}</div>
              <div className="text-xs text-gray-400 mt-1">
                {order.items?.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
              </div>
            </button>
            <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
              <Button size="sm" variant="outline" onClick={() => onPrintLabInvoice(order)} className="flex-1 py-2.5 h-auto">
                <FileText className="h-3.5 w-3.5 mr-1.5" /> Lab Invoice
              </Button>
              {order.fulfillment_status !== 'in_lab' && (
                <>
                  <Button size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white border-0 py-2.5 h-auto" onClick={() => onPickForLab(order)}>
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Pick for Lab
                  </Button>
                  {confirmLabId === order.id ? (
                    <div className="flex items-center gap-1">
                      <Button size="sm" className="bg-slate-700 hover:bg-slate-800 text-white border-0 py-2.5 h-auto text-xs px-2" onClick={() => handleMarkInLab(order.id)}>
                        Confirm?
                      </Button>
                      <button onClick={() => setConfirmLabId(null)} className="py-2.5 px-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 text-xs transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Button size="sm" className="flex-1 bg-slate-600 hover:bg-slate-700 text-white border-0 py-2.5 h-auto" onClick={() => handleMarkInLab(order.id)}>
                      <FlaskConical className="h-3.5 w-3.5 mr-1.5" /> Mark In Lab
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm min-w-[460px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="px-5 py-3 text-left font-semibold">Order ID</th>
              <th className="px-5 py-3 text-left font-semibold">Customer</th>
              <th className="px-5 py-3 text-left font-semibold">Items</th>
              <th className="px-5 py-3 text-left font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => (
              <tr
                key={order.id}
                onClick={() => onNavigate(order.id)}
                className={`border-b border-gray-50 hover:bg-teal-50 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
              >
                <td className="px-5 py-3 font-semibold text-blue-600">{displayId(order)}</td>
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                  <div className="text-xs text-gray-500">{order.customer?.phone_primary}</div>
                </td>
                <td className="px-5 py-3 text-xs text-gray-600">
                  {order.items?.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.fulfillment_status === 'in_lab' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                    {order.fulfillment_status === 'in_lab' ? 'In Lab' : 'Send to Lab'}
                  </span>
                </td>
                <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onPrintLabInvoice(order)} className="px-3">
                      <FileText className="h-3.5 w-3.5 mr-1" /> Lab Invoice
                    </Button>
                    {order.fulfillment_status !== 'in_lab' && (
                      <>
                        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white border-0 px-3" onClick={() => onPickForLab(order)}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Pick for Lab
                        </Button>
                        {confirmLabId === order.id ? (
                          <div className="flex items-center gap-1">
                            <Button size="sm" className="bg-slate-700 hover:bg-slate-800 text-white border-0 px-2.5 text-xs" onClick={() => handleMarkInLab(order.id)}>
                              Confirm?
                            </Button>
                            <button onClick={() => setConfirmLabId(null)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Button size="sm" className="bg-slate-600 hover:bg-slate-700 text-white border-0 px-3" onClick={() => handleMarkInLab(order.id)}>
                            <FlaskConical className="h-3.5 w-3.5 mr-1" /> Mark In Lab
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
