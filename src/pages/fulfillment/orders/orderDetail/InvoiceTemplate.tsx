import React from 'react';
import { OrderDetail, OrderItem, OrderPrescription, PackagingItem } from './types';

interface Props {
  order: OrderDetail;
  items: OrderItem[];
  prescription: OrderPrescription | null;
  packagingItems: PackagingItem[];
  storeSettings?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo_url?: string;
  };
}

const DEFAULT_STORE = {
  name: 'Bangladesh Eyewear',
  address: 'Dhaka, Bangladesh',
  phone: '+880 1700 000000',
  email: 'info@eyewear.com',
};

export function InvoiceTemplate({ order, items, prescription, packagingItems, storeSettings }: Props) {
  const store = storeSettings ?? DEFAULT_STORE;
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' });
  const fmt = (v: number) => `৳${v.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`;

  return (
    <div className="invoice-print bg-white p-8 max-w-[800px] mx-auto font-sans text-gray-900 text-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-900">
        <div>
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.name} className="h-12 mb-2 object-contain" />
          ) : (
            <div className="text-2xl font-bold text-gray-900 mb-1">{store.name}</div>
          )}
          <div className="text-gray-600 text-xs space-y-0.5">
            <div>{store.address}</div>
            <div>{store.phone}</div>
            <div>{store.email}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-800 mb-2">INVOICE</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div><span className="font-medium">Order #:</span> {order.woo_order_id ?? order.order_number}</div>
            <div><span className="font-medium">Internal:</span> {order.order_number}</div>
            <div><span className="font-medium">Date:</span> {formatDate(order.order_date)}</div>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-8">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Bill To</div>
        <div className="font-semibold text-base">{order.customer?.full_name}</div>
        <div className="text-gray-600 text-xs space-y-0.5 mt-1">
          {order.customer?.phone_primary && <div>{order.customer.phone_primary}</div>}
          {order.customer?.address_line1 && <div>{order.customer.address_line1}</div>}
          {order.customer?.district && <div>{order.customer.district}</div>}
          {order.customer?.email && <div>{order.customer.email}</div>}
        </div>
      </div>

      {/* Order Items */}
      <table className="w-full mb-6 text-xs">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="text-left px-3 py-2">SKU</th>
            <th className="text-left px-3 py-2">Product</th>
            <th className="text-center px-3 py-2">Location</th>
            <th className="text-center px-3 py-2">Qty</th>
            <th className="text-right px-3 py-2">Unit Price</th>
            <th className="text-right px-3 py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
              <td className="px-3 py-2 font-mono text-gray-600">{item.sku}</td>
              <td className="px-3 py-2 font-medium">{item.product_name}</td>
              <td className="px-3 py-2 text-center text-teal-700 font-medium">{item.pick_location ?? '—'}</td>
              <td className="px-3 py-2 text-center">{item.quantity}</td>
              <td className="px-3 py-2 text-right">{fmt(item.unit_price)}</td>
              <td className="px-3 py-2 text-right font-medium">{fmt(item.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Prescription */}
      {prescription?.prescription_type && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="font-semibold text-blue-900 mb-2 text-xs uppercase tracking-widest">Prescription Details</div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-medium">Type:</span> {prescription.prescription_type}
            </div>
            <div>
              <span className="font-medium">Lens:</span> {prescription.lens_type ?? '—'}
            </div>
          </div>
          <table className="w-full mt-3 text-xs">
            <thead>
              <tr className="border-b border-blue-200">
                <th className="text-left py-1">Eye</th>
                <th className="text-center py-1">SPH</th>
                <th className="text-center py-1">CYL</th>
                <th className="text-center py-1">AXIS</th>
                <th className="text-center py-1">PD</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1 font-medium">Right (OD)</td>
                <td className="text-center py-1">{prescription.od_sph ?? '—'}</td>
                <td className="text-center py-1">{prescription.od_cyl ?? '—'}</td>
                <td className="text-center py-1">{prescription.od_axis ?? '—'}</td>
                <td className="text-center py-1">{prescription.od_pd ?? '—'}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Left (OS)</td>
                <td className="text-center py-1">{prescription.os_sph ?? '—'}</td>
                <td className="text-center py-1">{prescription.os_cyl ?? '—'}</td>
                <td className="text-center py-1">{prescription.os_axis ?? '—'}</td>
                <td className="text-center py-1">{prescription.os_pd ?? '—'}</td>
              </tr>
            </tbody>
          </table>
          {(prescription.lens_price > 0 || prescription.fitting_charge > 0) && (
            <div className="mt-2 flex gap-6 text-xs">
              <span><span className="font-medium">Lens Price:</span> {fmt(prescription.lens_price)}</span>
              <span><span className="font-medium">Fitting:</span> {fmt(prescription.fitting_charge)}</span>
            </div>
          )}
        </div>
      )}

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span>{fmt(order.subtotal)}</span>
          </div>
          {prescription && (prescription.lens_price > 0 || prescription.fitting_charge > 0) && (
            <div className="flex justify-between">
              <span className="text-gray-600">Lens &amp; Fitting</span>
              <span>{fmt((prescription.lens_price ?? 0) + (prescription.fitting_charge ?? 0))}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Shipping</span>
            <span>{fmt(order.shipping_fee)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount</span>
              <span>-{fmt(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-300 pt-2 mt-1">
            <span>Total</span>
            <span>{fmt(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="text-xs text-gray-600 border-t border-gray-200 pt-4">
        <span className="font-medium">Payment Method:</span> {order.payment_method ?? '—'} &nbsp;|&nbsp;
        <span className="font-medium">Payment Status:</span>{' '}
        <span className={order.payment_status === 'paid' ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'}>
          {order.payment_status === 'paid' ? 'PAID' : 'UNPAID (COD)'}
        </span>
        {order.payment_reference && <span> &nbsp;| Ref: {order.payment_reference}</span>}
      </div>

      <div className="text-center text-xs text-gray-400 mt-8 pt-4 border-t border-gray-100">
        Thank you for shopping with {store.name}!
      </div>
    </div>
  );
}

export function PackingSlipTemplate({ order, items }: Pick<Props, 'order' | 'items'>) {
  const fmt = (v: number) => `৳${v.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-BD');

  return (
    <div className="packing-slip-print bg-white p-6 max-w-[400px] mx-auto font-sans text-sm">
      <div className="text-center mb-4 border-b pb-3">
        <div className="font-bold text-lg">Bangladesh Eyewear</div>
        <div className="text-xs text-gray-500 mt-1">PACKING SLIP</div>
      </div>
      <div className="mb-4 text-xs space-y-1">
        <div><span className="font-medium">Order #:</span> {order.woo_order_id ?? order.order_number}</div>
        <div><span className="font-medium">Date:</span> {formatDate(order.order_date)}</div>
      </div>
      <div className="mb-4 p-3 bg-gray-50 rounded text-xs">
        <div className="font-semibold text-base mb-1">{order.customer?.full_name}</div>
        <div>{order.customer?.phone_primary}</div>
        <div>{order.customer?.address_line1}</div>
        <div className="font-medium mt-1">{order.customer?.district}</div>
      </div>
      <table className="w-full text-xs mb-4">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left pb-1">Item</th>
            <th className="text-center pb-1 w-12">Qty</th>
            <th className="text-right pb-1 w-16">Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-1.5">
                <div className="font-medium">{item.product_name}</div>
                <div className="text-gray-400">{item.sku}</div>
                {item.pick_location && <div className="text-teal-600 font-medium">📍 {item.pick_location}</div>}
              </td>
              <td className="py-1.5 text-center">{item.quantity}</td>
              <td className="py-1.5 text-right">{fmt(item.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-between font-bold border-t border-gray-300 pt-2">
        <span>Total</span>
        <span>{fmt(order.total_amount)}</span>
      </div>
    </div>
  );
}
