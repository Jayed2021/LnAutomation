import { FileText, Printer, CheckCheck, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { OperationsOrder } from './types';

interface Props {
  orders: OperationsOrder[];
  displayId: (o: OperationsOrder) => string;
  getAddress: (o: OperationsOrder) => string;
  onPrintInvoice: (o: OperationsOrder) => void;
  onPrintPackingSlip: (o: OperationsOrder) => void;
  onMarkPrinted: (id: string) => void;
  onMarkProcessing: (id: string) => void;
  isWarehouseRole: boolean;
  onNavigate: (id: string) => void;
}

export function NotPrintedTable({
  orders,
  displayId,
  getAddress,
  onPrintInvoice,
  onPrintPackingSlip,
  onMarkPrinted,
  onMarkProcessing,
  isWarehouseRole,
  onNavigate,
}: Props) {
  return (
    <>
      <div className="sm:hidden divide-y divide-gray-100">
        {orders.map(order => (
          <div
            key={order.id}
            className={`p-4 transition-colors ${order.stock_shortage ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-orange-50'}`}
          >
            {order.stock_shortage && (
              <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-100 border border-red-200 rounded-lg px-2.5 py-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-semibold">Stock Shortage</span>
                <span className="text-red-500">— insufficient available inventory to fill this order</span>
              </div>
            )}
            <button className="w-full text-left" onClick={() => onNavigate(order.id)}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-600 text-base">{displayId(order)}</span>
                  {order.has_prescription && (
                    <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">Rx</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-900">৳{order.total_amount}</span>
              </div>
              <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
              <div className="text-sm text-gray-500">{order.customer?.phone_primary}</div>
              <div className="text-xs text-gray-400 mt-0.5">{getAddress(order)} · {order.items?.length || 0} items</div>
            </button>
            <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => onPrintInvoice(order)}
                title="Print Invoice"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 text-sm transition-colors"
              >
                <FileText className="h-4 w-4" /> Invoice
              </button>
              <button
                onClick={() => onPrintPackingSlip(order)}
                title="Print Packing Slip"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 text-sm transition-colors"
              >
                <Printer className="h-4 w-4" /> Slip
              </button>
              {isWarehouseRole && (
                <button
                  onClick={() => onMarkProcessing(order.id)}
                  title="Return to CS"
                  className="py-2.5 px-3 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-600 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0 py-2.5 h-auto"
                onClick={() => onMarkPrinted(order.id)}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Printed
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="px-5 py-3 text-left font-semibold">Order ID</th>
              <th className="px-5 py-3 text-left font-semibold">Customer</th>
              <th className="px-5 py-3 text-left font-semibold">Items</th>
              <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Total</th>
              <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Address</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => (
              <tr
                key={order.id}
                onClick={() => onNavigate(order.id)}
                className={`border-b border-gray-50 transition-colors cursor-pointer ${order.stock_shortage ? 'bg-red-50 hover:bg-red-100' : `hover:bg-orange-50 ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}`}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-blue-600">{displayId(order)}</span>
                    {order.has_prescription && (
                      <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">Rx</span>
                    )}
                    {order.stock_shortage && (
                      <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full font-semibold">
                        <AlertTriangle className="h-3 w-3" /> Shortage
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                  <div className="text-xs text-gray-500">{order.customer?.phone_primary}</div>
                </td>
                <td className="px-5 py-3 text-gray-600">{(order.items?.length || 0)} items</td>
                <td className="px-5 py-3 font-semibold text-gray-900 hidden md:table-cell">৳{order.total_amount}</td>
                <td className="px-5 py-3 text-gray-500 text-xs max-w-40 hidden lg:table-cell">{getAddress(order)}</td>
                <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => onPrintInvoice(order)} title="Print Invoice" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                      <FileText className="h-4 w-4" />
                    </button>
                    <button onClick={() => onPrintPackingSlip(order)} title="Print Packing Slip" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                      <Printer className="h-4 w-4" />
                    </button>
                    {isWarehouseRole && (
                      <button onClick={() => onMarkProcessing(order.id)} title="Return to CS" className="p-2 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors">
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0 px-3" onClick={() => onMarkPrinted(order.id)}>
                      <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark as Printed
                    </Button>
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
