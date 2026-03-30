import { FileText, Printer, Package, ScanLine, RotateCcw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { OperationsOrder } from './types';

interface Props {
  orders: OperationsOrder[];
  displayId: (o: OperationsOrder) => string;
  isPartiallyPicked: (o: OperationsOrder) => boolean;
  isFullyPicked: (o: OperationsOrder) => boolean;
  onPrintInvoice: (o: OperationsOrder) => void;
  onPrintPackingSlip: (o: OperationsOrder) => void;
  onStartPick: (o: OperationsOrder) => void;
  onForcePack: (o: OperationsOrder) => void;
  onMarkProcessing: (id: string) => void;
  isWarehouseRole: boolean;
  onNavigate: (id: string) => void;
}

export function PrintedTable({
  orders,
  displayId,
  isPartiallyPicked,
  isFullyPicked,
  onPrintInvoice,
  onPrintPackingSlip,
  onStartPick,
  onForcePack,
  onMarkProcessing,
  isWarehouseRole,
  onNavigate,
}: Props) {
  return (
    <>
      <div className="sm:hidden divide-y divide-gray-100">
        {orders.map(order => {
          const partial = isPartiallyPicked(order);
          const fullyPicked = isFullyPicked(order);
          return (
            <div key={order.id} className="p-4 hover:bg-blue-50 transition-colors">
              <button className="w-full text-left" onClick={() => onNavigate(order.id)}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-blue-600 text-base">{displayId(order)}</span>
                    {fullyPicked && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-200">Picked</span>}
                    {partial && !fullyPicked && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-200">Partial</span>}
                  </div>
                </div>
                <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                <div className="text-sm text-gray-500">{order.customer?.phone_primary}</div>
                <div className="mt-1.5 space-y-0.5">
                  {order.items?.map(item => (
                    <div key={item.id} className="text-xs text-gray-600 flex items-center gap-1.5">
                      <span>{item.quantity}x {item.product_name}</span>
                      {item.picked_quantity >= item.quantity && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Picked</span>}
                    </div>
                  ))}
                </div>
              </button>
              <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                <button onClick={() => onPrintInvoice(order)} className="py-2.5 px-3 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors">
                  <FileText className="h-4 w-4" />
                </button>
                <button onClick={() => onPrintPackingSlip(order)} className="py-2.5 px-3 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors">
                  <Printer className="h-4 w-4" />
                </button>
                {isWarehouseRole && (
                  <button onClick={() => onMarkProcessing(order.id)} className="py-2.5 px-3 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-600 transition-colors">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                {fullyPicked ? (
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0 py-2.5 h-auto" onClick={() => onForcePack(order)}>
                    <Package className="h-3.5 w-3.5 mr-1" /> Pack
                  </Button>
                ) : partial ? (
                  <>
                    <Button size="sm" onClick={() => onStartPick(order)} className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 h-auto">
                      <ScanLine className="h-3.5 w-3.5 mr-1" /> Continue
                    </Button>
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0 py-2.5 h-auto" onClick={() => onForcePack(order)}>
                      <Package className="h-3.5 w-3.5 mr-1" /> Pack
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 py-2.5 h-auto" onClick={() => onStartPick(order)}>
                    <ScanLine className="h-3.5 w-3.5 mr-1" /> Start Pick
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="px-5 py-3 text-left font-semibold">Order ID</th>
              <th className="px-5 py-3 text-left font-semibold">Customer</th>
              <th className="px-5 py-3 text-left font-semibold">Items</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => {
              const partial = isPartiallyPicked(order);
              const fullyPicked = isFullyPicked(order);
              return (
                <tr
                  key={order.id}
                  onClick={() => onNavigate(order.id)}
                  className={`border-b border-gray-50 hover:bg-blue-50 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-blue-600">{displayId(order)}</span>
                      {fullyPicked && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-200">Picked</span>}
                      {partial && !fullyPicked && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-200">Partially Picked</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                    <div className="text-xs text-gray-500">{order.customer?.phone_primary}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="space-y-0.5">
                      {order.items?.map(item => (
                        <div key={item.id} className="text-xs text-gray-600">
                          {item.quantity}x {item.product_name}
                          {item.picked_quantity >= item.quantity && <span className="ml-1.5 bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-xs">Picked</span>}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onPrintInvoice(order)} title="Print Invoice" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                        <FileText className="h-4 w-4" />
                      </button>
                      <button onClick={() => onPrintPackingSlip(order)} title="Print Packing Slip" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                        <Printer className="h-4 w-4" />
                      </button>
                      {isWarehouseRole && (
                        <button onClick={() => onMarkProcessing(order.id)} className="p-2 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                      {fullyPicked ? (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0 px-3" onClick={() => onForcePack(order)}>
                          <Package className="h-3.5 w-3.5 mr-1" /> Pack
                        </Button>
                      ) : partial ? (
                        <>
                          <Button size="sm" onClick={() => onStartPick(order)} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3">
                            <ScanLine className="h-3.5 w-3.5 mr-1" /> Continue Pick
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0 px-3" onClick={() => onForcePack(order)}>
                            <Package className="h-3.5 w-3.5 mr-1" /> Pack
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-4" onClick={() => onStartPick(order)}>
                          <ScanLine className="h-3.5 w-3.5 mr-1.5" /> Start Pick
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
