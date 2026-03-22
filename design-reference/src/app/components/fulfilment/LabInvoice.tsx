import { Package } from 'lucide-react';
import type { Order, OrderItem } from '../../data/mockData';

interface LabInvoiceProps {
  order: Order;
  itemsWithLots: OrderItem[];
}

export function LabInvoice({ order, itemsWithLots }: LabInvoiceProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">LAB WORK ORDER</h1>
            <p className="text-sm text-gray-600 mt-1">Prescription Lens Processing</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Order ID</p>
            <p className="text-xl font-bold">{order.woo_order_id}</p>
            <p className="text-xs text-gray-500 mt-1">Internal: {order.order_id}</p>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-bold text-sm mb-2 text-gray-700">CUSTOMER DETAILS</h3>
          <div className="space-y-1">
            <p className="font-semibold">{order.customer_name}</p>
            <p className="text-sm text-gray-600">{order.customer_phone}</p>
            <p className="text-sm text-gray-600">{order.shipping_address}</p>
          </div>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-2 text-gray-700">ORDER INFORMATION</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">{new Date(order.created_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment:</span>
              <span className="font-medium">{order.payment_method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-semibold text-blue-600">{order.cs_status.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div>
        <h3 className="font-bold mb-3 text-gray-700">ITEMS FOR LAB PROCESSING</h3>
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">#</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Product Details</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Frame Barcode</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Location</th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Qty</th>
            </tr>
          </thead>
          <tbody>
            {itemsWithLots.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2 text-sm">{idx + 1}</td>
                <td className="border border-gray-300 px-3 py-2">
                  <p className="font-semibold text-sm">{item.sku_name}</p>
                  <p className="text-xs text-gray-600">SKU: {item.sku}</p>
                  {item.attributes && Object.keys(item.attributes).length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {Object.entries(item.attributes).map(([key, value]) => `${key}: ${value}`).join(', ')}
                    </p>
                  )}
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  <div className="bg-green-50 border border-green-300 rounded px-2 py-1 inline-block">
                    <p className="font-mono text-sm font-bold text-green-700">
                      {item.recommended_lot || 'N/A'}
                    </p>
                  </div>
                </td>
                <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-blue-600">
                  {item.recommended_location || 'N/A'}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center font-semibold">
                  {item.quantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lens Prescription Details Section */}
      <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
        <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
          <Package className="w-5 h-5" />
          PRESCRIPTION LENS DETAILS
        </h3>
        
        <div className="bg-white rounded-lg p-4 space-y-4">
          {/* Right Eye */}
          <div className="border-b pb-3">
            <h4 className="font-semibold text-sm mb-2">RIGHT EYE (OD)</h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 text-xs">SPH (Sphere)</p>
                <p className="font-mono font-semibold border-b-2 border-gray-300 py-1">_______</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs">CYL (Cylinder)</p>
                <p className="font-mono font-semibold border-b-2 border-gray-300 py-1">_______</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs">AXIS</p>
                <p className="font-mono font-semibold border-b-2 border-gray-300 py-1">_______</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs">ADD</p>
                <p className="font-mono font-semibold border-b-2 border-gray-300 py-1">_______</p>
              </div>
            </div>
          </div>

          {/* Left Eye */}
          <div className="border-b pb-3">
            <h4 className="font-semibold text-sm mb-2">LEFT EYE (OS)</h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 text-xs">SPH (Sphere)</p>
                <p className="font-mono font-semibold border-b-2 border-gray-300 py-1">_______</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs">CYL (Cylinder)</p>
                <p className="font-mono font-semibold border-b-2 border-gray-300 py-1">_______</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs">AXIS</p>
                <p className="font-mono font-semibold border-b-2 border-gray-300 py-1">_______</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs">ADD</p>
                <p className="font-mono font-semibold border-b-2 border-gray-300 py-1">_______</p>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600 text-xs">PD (Pupillary Distance)</p>
              <p className="font-mono font-semibold border-b-2 border-gray-300 py-1">_______</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Lens Type</p>
              <p className="font-mono font-semibold border-b-2 border-gray-300 py-1">_______</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Coating</p>
              <p className="font-mono font-semibold border-b-2 border-gray-300 py-1">_______</p>
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <p className="text-gray-600 text-xs mb-1">Special Instructions</p>
            <div className="border-2 border-gray-300 rounded p-2 min-h-[60px]">
              <p className="text-sm text-gray-400 italic">Write special instructions here...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="border border-gray-300 rounded p-3 mb-6">
          <h3 className="font-semibold text-sm mb-1">Order Notes:</h3>
          <p className="text-sm text-gray-700">{order.notes}</p>
        </div>
      )}

      {/* Order Barcode for Quick Pick Access */}
      <div className="border-2 border-blue-300 rounded-lg p-6 bg-blue-50 text-center">
        <h3 className="font-bold text-blue-900 mb-3 flex items-center justify-center gap-2">
          <Package className="w-5 h-5" />
          Quick Pick Access
        </h3>
        <div className="bg-white rounded-lg p-4 inline-block border-2 border-gray-300">
          <p className="text-sm text-gray-600 mb-2">Scan this barcode to start picking frames</p>
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

      {/* Lab Checklist */}
      <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
        <h3 className="font-bold mb-3">LAB PROCESSING CHECKLIST</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4" />
            <label className="text-sm">Frame picked and verified</label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4" />
            <label className="text-sm">Prescription verified and entered</label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4" />
            <label className="text-sm">Lens cut and fitted</label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4" />
            <label className="text-sm">Quality check passed</label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4" />
            <label className="text-sm">Ready for final inspection</label>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">Processed By</p>
            <p className="border-b-2 border-gray-300 py-2">________________</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Date Completed</p>
            <p className="border-b-2 border-gray-300 py-2">________________</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 border-t pt-4">
        <p>This is a lab work order. Please handle frames with care.</p>
        <p className="mt-1">For questions, contact Operations Manager</p>
      </div>
    </div>
  );
}
