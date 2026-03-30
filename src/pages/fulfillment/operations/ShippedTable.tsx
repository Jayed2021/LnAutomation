import { STATUS_CONFIG } from '../orders/types';
import type { OperationsOrder } from './types';

interface Props {
  orders: OperationsOrder[];
  displayId: (o: OperationsOrder) => string;
  onNavigate: (id: string) => void;
}

export function ShippedTable({ orders, displayId, onNavigate }: Props) {
  return (
    <>
      <div className="sm:hidden divide-y divide-gray-100">
        {orders.map(order => {
          const statusCfg = STATUS_CONFIG[order.cs_status];
          return (
            <button
              key={order.id}
              className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
              onClick={() => onNavigate(order.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-blue-600 text-base">{displayId(order)}</span>
                <span className="text-sm font-semibold text-gray-900">৳{order.total_amount}</span>
              </div>
              <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
              <div className="text-sm text-gray-500">{order.customer?.phone_primary}</div>
              <div className="flex items-center gap-2 mt-1.5">
                {statusCfg ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}>
                    {statusCfg.label}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 capitalize">{order.cs_status}</span>
                )}
                {order.courier_info?.courier_company && (
                  <span className="text-xs text-gray-400 capitalize">{order.courier_info.courier_company}</span>
                )}
                {order.shipped_at && (
                  <span className="text-xs text-gray-400">
                    {new Date(order.shipped_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                )}
              </div>
            </button>
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
              <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Total</th>
              <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Courier</th>
              <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Shipped At</th>
              <th className="px-5 py-3 text-left font-semibold">Order Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => {
              const statusCfg = STATUS_CONFIG[order.cs_status];
              return (
                <tr
                  key={order.id}
                  onClick={() => onNavigate(order.id)}
                  className={`border-b border-gray-50 hover:bg-slate-50 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                >
                  <td className="px-5 py-3 font-semibold text-blue-600">{displayId(order)}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{order.customer?.full_name}</div>
                    <div className="text-xs text-gray-500">{order.customer?.phone_primary}</div>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-600">{order.items?.length || 0} item(s)</td>
                  <td className="px-5 py-3 font-semibold text-gray-900 hidden md:table-cell">৳{order.total_amount}</td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    {order.courier_info?.courier_company ? (
                      <div>
                        <span className="capitalize text-gray-700">{order.courier_info.courier_company}</span>
                        {order.courier_info.tracking_number && (
                          <div className="text-xs text-gray-400 font-mono">{order.courier_info.tracking_number}</div>
                        )}
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs hidden lg:table-cell">
                    {order.shipped_at ? new Date(order.shipped_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    {statusCfg ? (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}>
                        {statusCfg.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 capitalize">{order.cs_status}</span>
                    )}
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
