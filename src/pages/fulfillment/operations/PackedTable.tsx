import { Truck, RotateCcw, Lock, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { OperationsOrder } from './types';

interface Props {
  orders: OperationsOrder[];
  displayId: (o: OperationsOrder) => string;
  onMarkShipped: (id: string) => void;
  onMarkProcessing: (id: string) => void;
  isWarehouseRole: boolean;
  onNavigate: (id: string) => void;
  packagingDispatchedToday: boolean;
  gateEnabled: boolean;
  shippingOrderId: string | null;
}

export function PackedTable({
  orders,
  displayId,
  onMarkShipped,
  onMarkProcessing,
  isWarehouseRole,
  onNavigate,
  packagingDispatchedToday,
  gateEnabled,
  shippingOrderId,
}: Props) {
  const isShipBlocked = gateEnabled && !packagingDispatchedToday;

  const ShipButton = ({ orderId, fullWidth = false }: { orderId: string; fullWidth?: boolean }) => {
    const isShipping = shippingOrderId === orderId;
    if (isShipBlocked) {
      return (
        <div className="relative group">
          <button
            disabled
            className={`${fullWidth ? 'flex-1 w-full' : 'px-3'} flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed text-sm font-medium border border-gray-200`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Mark as Shipped</span>
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Dispatch packaging first for today
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
          </div>
        </div>
      );
    }

    return (
      <Button
        size="sm"
        disabled={isShipping}
        className={`${fullWidth ? 'flex-1' : ''} bg-slate-700 hover:bg-slate-800 text-white border-0 py-2.5 h-auto disabled:opacity-70`}
        onClick={() => onMarkShipped(orderId)}
      >
        {isShipping
          ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Shipping...</>
          : <><Truck className="h-3.5 w-3.5 mr-1.5" /> Mark as Shipped</>
        }
      </Button>
    );
  };

  return (
    <>
      {isShipBlocked && (
        <div className="mx-4 mt-3 flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <Lock className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Shipping is locked.</span> You must dispatch packaging materials first. Click <span className="font-semibold">Dispatch Packaging</span> above to unlock shipping for today.
          </p>
        </div>
      )}

      <div className="sm:hidden divide-y divide-gray-100">
        {orders.map(order => (
          <div key={order.id} className="p-4 hover:bg-green-50 transition-colors">
            <button className="w-full text-left" onClick={() => onNavigate(order.id)}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-blue-600 text-base">{displayId(order)}</span>
                <span className="text-sm font-semibold text-gray-900">৳{order.total_amount}</span>
              </div>
              <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
              <div className="text-sm text-gray-500">{order.customer?.phone_primary}</div>
              {order.courier_info?.courier_company && (
                <div className="text-xs text-gray-400 mt-0.5 capitalize">{order.courier_info.courier_company}
                  {order.courier_info.tracking_number && <span className="font-mono ml-1">· {order.courier_info.tracking_number}</span>}
                </div>
              )}
              {order.packed_at && (
                <div className="text-xs text-gray-400 mt-0.5">
                  Packed: {new Date(order.packed_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              )}
            </button>
            <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
              {isWarehouseRole && (
                <button onClick={() => onMarkProcessing(order.id)} className="py-2.5 px-3 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-600 transition-colors">
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <ShipButton orderId={order.id} fullWidth />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="px-5 py-3 text-left font-semibold">Order ID</th>
              <th className="px-5 py-3 text-left font-semibold">Customer</th>
              <th className="px-5 py-3 text-left font-semibold">Items</th>
              <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Total</th>
              <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Courier</th>
              <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Packed At</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => (
              <tr
                key={order.id}
                onClick={() => onNavigate(order.id)}
                className={`border-b border-gray-50 hover:bg-green-50 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
              >
                <td className="px-5 py-3 font-semibold text-blue-600">{displayId(order)}</td>
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                  <div className="text-xs text-gray-500">{order.customer?.phone_primary}</div>
                </td>
                <td className="px-5 py-3 text-gray-600 text-xs">
                  {order.items?.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
                </td>
                <td className="px-5 py-3 font-semibold text-gray-900 hidden md:table-cell">৳{order.total_amount}</td>
                <td className="px-5 py-3 hidden lg:table-cell">
                  {order.courier_info?.courier_company ? (
                    <span className="capitalize text-gray-700">{order.courier_info.courier_company}</span>
                  ) : <span className="text-gray-400">—</span>}
                  {order.courier_info?.tracking_number && (
                    <div className="text-xs text-gray-400 font-mono">{order.courier_info.tracking_number}</div>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs hidden lg:table-cell">
                  {order.packed_at ? new Date(order.packed_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </td>
                <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    {isWarehouseRole && (
                      <button onClick={() => onMarkProcessing(order.id)} className="p-2 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors">
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    {isShipBlocked ? (
                      <div className="relative group">
                        <button
                          disabled
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed text-sm font-medium border border-gray-200"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>Mark Shipped</span>
                        </button>
                        <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          Dispatch packaging first for today
                          <span className="absolute top-full right-4 border-4 border-transparent border-t-gray-800" />
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" disabled={shippingOrderId === order.id} className="bg-slate-700 hover:bg-slate-800 text-white border-0 px-3 disabled:opacity-70" onClick={() => onMarkShipped(order.id)}>
                        {shippingOrderId === order.id
                          ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Shipping...</>
                          : <><Truck className="h-3.5 w-3.5 mr-1" /> Mark Shipped</>}
                      </Button>
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
