import { MapPin, Package, Calendar, Phone, CreditCard } from 'lucide-react';
import type { Order, OrderItem } from '../../data/mockData';

interface InvoiceProps {
  order: Order;
  itemsWithLots: OrderItem[];
}

export function Invoice({ order, itemsWithLots }: InvoiceProps) {
  const today = new Date().toLocaleDateString('en-GB');
  
  return (
    <div className="bg-white p-8 max-w-4xl mx-auto" id="invoice-print">
      {/* Invoice Header */}
      <div className="border-b-2 border-gray-800 pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">INVOICE</h1>
            <p className="text-gray-600 mt-1">Your Company Name</p>
            <p className="text-sm text-gray-600">Dhaka, Bangladesh</p>
            <p className="text-sm text-gray-600">Phone: +880 1XXX XXXXXX</p>
          </div>
          <div className="text-right">
            <div className="text-sm space-y-1">
              <p><span className="font-semibold">Invoice #:</span> {order.woo_order_id}</p>
              <p><span className="font-semibold">Order ID:</span> {order.order_id}</p>
              <p><span className="font-semibold">Date:</span> {today}</p>
              <p><span className="font-semibold">Order Date:</span> {new Date(order.created_date).toLocaleDateString('en-GB')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Bill To
          </h2>
          <div className="text-sm space-y-1">
            <p className="font-semibold text-base">{order.customer_name}</p>
            <p className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {order.customer_phone}
            </p>
            <p className="flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-1" />
              <span>{order.shipping_address}</span>
            </p>
          </div>
        </div>
        <div>
          <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Details
          </h2>
          <div className="text-sm space-y-1">
            <p><span className="font-semibold">Method:</span> {order.payment_method}</p>
            <p><span className="font-semibold">Total Amount:</span> ৳{order.total.toFixed(2)}</p>
            {order.payment_method === 'COD' && (
              <p className="text-red-600 font-semibold mt-2">⚠ Collect ৳{order.total.toFixed(2)} from customer</p>
            )}
          </div>
        </div>
      </div>

      {/* Order Items with Picking Information */}
      <div className="mb-6">
        <h2 className="font-bold text-lg mb-3 bg-gray-100 p-2 rounded">Order Items - Picking List</h2>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 p-2 text-left text-sm">#</th>
              <th className="border border-gray-300 p-2 text-left text-sm">Product</th>
              <th className="border border-gray-300 p-2 text-left text-sm">SKU</th>
              <th className="border border-gray-300 p-2 text-left text-sm">Lot Barcode (FIFO)</th>
              <th className="border border-gray-300 p-2 text-left text-sm">Location</th>
              <th className="border border-gray-300 p-2 text-center text-sm">Qty</th>
              <th className="border border-gray-300 p-2 text-right text-sm">Price</th>
              <th className="border border-gray-300 p-2 text-right text-sm">Total</th>
            </tr>
          </thead>
          <tbody>
            {itemsWithLots.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2 text-sm">{index + 1}</td>
                <td className="border border-gray-300 p-2 text-sm">
                  <div>
                    <p className="font-medium">{item.sku_name}</p>
                    {item.attributes && Object.keys(item.attributes).length > 0 && (
                      <p className="text-xs text-gray-600">
                        {Object.entries(item.attributes).map(([key, value]) => `${key}: ${value}`).join(', ')}
                      </p>
                    )}
                  </div>
                </td>
                <td className="border border-gray-300 p-2 text-sm font-mono">{item.sku}</td>
                <td className="border border-gray-300 p-2 text-sm">
                  {item.recommended_lot ? (
                    <div className="bg-green-50 border border-green-300 p-1.5 rounded">
                      <p className="font-mono font-bold text-green-800">{item.recommended_lot}</p>
                      <p className="text-xs text-gray-600 mt-0.5">Scan this barcode</p>
                    </div>
                  ) : (
                    <span className="text-red-600 text-xs">No stock</span>
                  )}
                </td>
                <td className="border border-gray-300 p-2 text-sm">
                  {item.recommended_location ? (
                    <div className="flex items-center gap-1 text-blue-700 font-semibold">
                      <MapPin className="w-3 h-3" />
                      {item.recommended_location}
                    </div>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </td>
                <td className="border border-gray-300 p-2 text-center text-sm font-semibold">{item.quantity}</td>
                <td className="border border-gray-300 p-2 text-right text-sm">৳{item.price.toFixed(2)}</td>
                <td className="border border-gray-300 p-2 text-right text-sm font-semibold">
                  ৳{(item.quantity * item.price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={7} className="border border-gray-300 p-2 text-right text-sm">TOTAL</td>
              <td className="border border-gray-300 p-2 text-right text-sm">৳{order.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="border border-gray-300 rounded p-3 mb-6">
          <h3 className="font-semibold text-sm mb-1">Special Notes:</h3>
          <p className="text-sm text-gray-700">{order.notes}</p>
        </div>
      )}

      {/* Order Barcode for Quick Pick Access */}
      <div className="border-2 border-blue-300 rounded-lg p-6 mb-6 bg-blue-50 text-center">
        <h3 className="font-bold text-blue-900 mb-3 flex items-center justify-center gap-2">
          <Package className="w-5 h-5" />
          Quick Pick Access
        </h3>
        <div className="bg-white rounded-lg p-4 inline-block border-2 border-gray-300">
          <p className="text-sm text-gray-600 mb-2">Scan this barcode to start picking</p>
          <div className="font-mono text-3xl font-bold tracking-wider mb-2">
            {order.woo_order_id}
          </div>
          {/* Barcode representation - simple bars */}
          <div className="flex justify-center gap-[2px] h-16 items-end">
            {order.woo_order_id.split('').map((char, idx) => (
              <div 
                key={idx}
                className="bg-black"
                style={{ 
                  width: '4px',
                  height: `${30 + (char.charCodeAt(0) % 30)}px`
                }}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Order: {order.order_id}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-4 mt-6 text-center text-sm text-gray-600">
        <p>Thank you for your business!</p>
        <p className="mt-2">This is a computer-generated invoice. No signature required.</p>
      </div>

      {/* Print-only barcode section */}
      <div className="mt-6 print:block hidden border-t pt-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-gray-600">Packed by: _________________</p>
            <p className="text-xs text-gray-600 mt-2">Date: _________________</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Checked by: _________________</p>
            <p className="text-xs text-gray-600 mt-2">Signature: _________________</p>
          </div>
        </div>
      </div>
    </div>
  );
}