import React from 'react';
import { OrderDetail, OrderItem, OrderPrescription, PackagingItem } from './types';
import { StoreProfile, FifoLotInfo } from './service';

interface InvoiceProps {
  order: OrderDetail;
  items: OrderItem[];
  prescriptions: OrderPrescription[];
  packagingItems: PackagingItem[];
  storeProfile: StoreProfile | null;
}

interface PackingSlipProps {
  order: OrderDetail;
  items: OrderItem[];
  packagingItems: PackagingItem[];
  fifoLots: Map<string, FifoLotInfo>;
  storeProfile: StoreProfile | null;
}

const fmt = (v: number) =>
  `৳${v.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export function InvoiceTemplate({
  order,
  items,
  prescriptions,
  storeProfile,
}: InvoiceProps) {
  const sp = storeProfile;
  const addressParts = [
    sp?.address_line1,
    sp?.address_line2,
    sp?.city,
    sp?.postal_code,
    sp?.country,
  ].filter(Boolean);

  const invoiceNumber = order.woo_order_id ?? order.order_number;
  const orderNumber = order.woo_order_id ?? order.order_number;

  const subtotal = order.subtotal;
  const discount = order.discount_amount;
  const shipping = order.shipping_fee;
  const total = order.total_amount;

  const shippingMethod = order.coupon_lines?.length
    ? undefined
    : undefined;

  const printStyles = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
    .page { max-width: 794px; margin: 0 auto; padding: 48px 48px 64px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo-block img { height: 48px; object-fit: contain; }
    .logo-text { font-size: 22px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
    .store-info { text-align: right; font-size: 12px; line-height: 1.6; color: #222; }
    .store-info strong { display: block; font-size: 13px; font-weight: 700; }
    .invoice-title { font-size: 28px; font-weight: 800; margin-bottom: 24px; }
    .meta-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; gap: 32px; }
    .billing-info { font-size: 12.5px; line-height: 1.7; }
    .billing-info .name { font-weight: 600; font-size: 13px; }
    .order-meta { font-size: 12.5px; line-height: 1.7; }
    .order-meta table { border-collapse: collapse; }
    .order-meta td { padding: 0 0 2px; }
    .order-meta td:first-child { color: #555; padding-right: 24px; white-space: nowrap; }
    .order-meta td:last-child { font-weight: 500; }
    .items-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 24px; }
    .items-table thead tr { background: #111; color: #fff; }
    .items-table th { padding: 10px 12px; text-align: left; font-weight: 600; letter-spacing: 0.3px; }
    .items-table th:last-child, .items-table td:last-child { text-align: right; }
    .items-table th:nth-child(2), .items-table td:nth-child(2) { text-align: center; }
    .items-table td { padding: 10px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
    .items-table td .sku { font-size: 11px; color: #777; font-weight: 600; margin-top: 2px; }
    .totals-block { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .totals-table { width: 260px; border-collapse: collapse; font-size: 12.5px; }
    .totals-table td { padding: 5px 12px; }
    .totals-table td:last-child { text-align: right; }
    .totals-table .divider td { border-top: 1px solid #ddd; padding-top: 8px; }
    .totals-table .total-row td { font-weight: 700; font-size: 14px; border-top: 2px solid #111; padding-top: 8px; }
    .totals-table .discount-row td { color: #16a34a; }
    .rx-block { margin-bottom: 24px; }
    .rx-block h4 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 8px; }
    .rx-inner { border: 1px solid #bfdbfe; background: #eff6ff; padding: 14px; border-radius: 6px; margin-bottom: 10px; }
    .rx-meta { font-size: 11.5px; margin-bottom: 8px; }
    .rx-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    .rx-table th, .rx-table td { padding: 4px 8px; border-bottom: 1px solid #dbeafe; }
    .rx-table th { font-weight: 600; text-align: center; color: #1e40af; }
    .rx-table td { text-align: center; }
    .rx-table td:first-child { text-align: left; font-weight: 600; }
    .footer-note { font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 16px; text-align: center; }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="page">
        <div className="header">
          <div className="logo-block">
            {sp?.logo_url ? (
              <img src={sp.logo_url} alt={sp.store_name ?? 'Store'} />
            ) : (
              <div className="logo-text">{sp?.store_name ?? 'Store'}</div>
            )}
          </div>
          <div className="store-info">
            <strong>{sp?.store_name ?? ''}</strong>
            {addressParts.map((line, i) => <span key={i}>{line}<br /></span>)}
            {sp?.phone_primary && <span>{sp.phone_primary}<br /></span>}
            {sp?.email && <span>{sp.email}</span>}
          </div>
        </div>

        <div className="invoice-title">INVOICE</div>

        <div className="meta-row">
          <div className="billing-info">
            <div className="name">{order.customer?.full_name}</div>
            {order.customer?.address_line1 && <div>{order.customer.address_line1}</div>}
            {order.customer?.city && order.customer?.district && order.customer.city !== order.customer.district && (
              <div>{order.customer.city}</div>
            )}
            {order.customer?.district && <div style={{ textTransform: 'uppercase' }}>{order.customer.district}</div>}
            {order.customer?.phone_primary && <div>{order.customer.phone_primary}</div>}
          </div>

          <div className="order-meta">
            <table>
              <tbody>
                <tr>
                  <td>Invoice Number:</td>
                  <td>{invoiceNumber}</td>
                </tr>
                <tr>
                  <td>Invoice Date:</td>
                  <td>{fmtDate(order.order_date)}</td>
                </tr>
                <tr>
                  <td>Order Number:</td>
                  <td>{orderNumber}</td>
                </tr>
                <tr>
                  <td>Order Date:</td>
                  <td>{fmtDate(order.order_date)}</td>
                </tr>
                {order.payment_method && (
                  <tr>
                    <td>Payment Method:</td>
                    <td>{order.payment_method}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <table className="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>
                  <div>{item.product_name}</div>
                  <div className="sku">SKU: {item.sku}</div>
                </td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{fmt(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals-block">
          <table className="totals-table">
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td>{fmt(subtotal)}</td>
              </tr>
              {discount > 0 && (
                <tr className="discount-row">
                  <td>Discount</td>
                  <td>-{fmt(discount)}</td>
                </tr>
              )}
              {shipping > 0 && (
                <tr>
                  <td>Shipping</td>
                  <td>
                    {fmt(shipping)}
                    {shippingMethod ? ` via ${shippingMethod}` : ''}
                  </td>
                </tr>
              )}
              <tr className="total-row">
                <td>Total</td>
                <td>{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {prescriptions.filter(p => p.prescription_type).length > 0 && (
          <div className="rx-block">
            <h4>Prescription Details</h4>
            {prescriptions.filter(p => p.prescription_type).map((rx, i) => (
              <div key={rx.id} className="rx-inner">
                <div className="rx-meta">
                  <strong>Type:</strong> {rx.prescription_type}
                  {rx.lens_type && <> &nbsp;|&nbsp; <strong>Lens:</strong> {rx.lens_type}</>}
                </div>
                <table className="rx-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Eye</th>
                      <th>SPH</th>
                      <th>CYL</th>
                      <th>AXIS</th>
                      <th>PD</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Right (OD)</td>
                      <td>{rx.od_sph ?? '—'}</td>
                      <td>{rx.od_cyl ?? '—'}</td>
                      <td>{rx.od_axis ?? '—'}</td>
                      <td>{rx.od_pd ?? '—'}</td>
                    </tr>
                    <tr>
                      <td>Left (OS)</td>
                      <td>{rx.os_sph ?? '—'}</td>
                      <td>{rx.os_cyl ?? '—'}</td>
                      <td>{rx.os_axis ?? '—'}</td>
                      <td>{rx.os_pd ?? '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {sp?.invoice_footer && (
          <div className="footer-note">{sp.invoice_footer}</div>
        )}
      </div>
    </>
  );
}

export function PackingSlipTemplate({
  order,
  items,
  packagingItems,
  fifoLots,
  storeProfile,
}: PackingSlipProps) {
  const sp = storeProfile;

  const printStyles = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
    .page { max-width: 794px; margin: 0 auto; padding: 32px 40px 48px; }
    .ps-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #111; margin-bottom: 20px; }
    .ps-logo img { height: 36px; object-fit: contain; }
    .ps-logo-text { font-size: 18px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
    .ps-title-block { text-align: right; }
    .ps-title { font-size: 20px; font-weight: 800; letter-spacing: 1px; }
    .ps-subtitle { font-size: 11px; color: #777; margin-top: 2px; }
    .ps-info-row { display: flex; gap: 24px; margin-bottom: 20px; }
    .ps-order-box { flex: 1; padding: 12px 16px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px; }
    .ps-order-box .label { color: #777; font-size: 11px; }
    .ps-order-box .val { font-weight: 600; font-size: 13px; margin-top: 2px; }
    .ps-customer-box { flex: 1.5; padding: 12px 16px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px; }
    .ps-customer-box .name { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
    .ps-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 8px; }
    .items-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; }
    .items-table thead tr { background: #111; color: #fff; }
    .items-table th { padding: 9px 10px; text-align: left; font-weight: 600; font-size: 11.5px; }
    .items-table td { padding: 10px 10px; border-bottom: 1px solid #eee; vertical-align: middle; }
    .items-table .sku { font-size: 10.5px; color: #888; margin-top: 2px; }
    .barcode-cell { text-align: center; }
    .barcode-tag { display: inline-block; padding: 4px 10px; background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; border-radius: 4px; font-size: 11.5px; font-weight: 700; font-family: monospace; letter-spacing: 0.5px; }
    .barcode-none { display: inline-block; padding: 4px 10px; background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; border-radius: 4px; font-size: 11px; }
    .location-cell { text-align: center; }
    .location-tag { display: inline-block; padding: 4px 10px; background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; border-radius: 4px; font-size: 11.5px; font-weight: 700; letter-spacing: 0.5px; }
    .location-none { display: inline-block; padding: 4px 10px; background: #f3f4f6; color: #9ca3af; border-radius: 4px; font-size: 11px; }
    .qty-cell { text-align: center; font-weight: 700; font-size: 14px; }
    .check-cell { text-align: center; }
    .check-box { width: 18px; height: 18px; border: 2px solid #999; display: inline-block; border-radius: 3px; }
    .pkg-section { border-top: 1px solid #e5e7eb; padding-top: 16px; }
    .pkg-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .pkg-table thead tr { background: #f3f4f6; }
    .pkg-table th { padding: 8px 10px; text-align: left; font-weight: 600; font-size: 11.5px; color: #374151; border-bottom: 1px solid #e5e7eb; }
    .pkg-table td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    .pkg-table td:last-child { text-align: center; font-weight: 600; }
    .pkg-table .sku { font-size: 10.5px; color: #9ca3af; }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="page">
        <div className="ps-header">
          <div className="ps-logo">
            {sp?.logo_url ? (
              <img src={sp.logo_url} alt={sp.store_name ?? 'Store'} />
            ) : (
              <div className="ps-logo-text">{sp?.store_name ?? 'Store'}</div>
            )}
          </div>
          <div className="ps-title-block">
            <div className="ps-title">PACKING SLIP</div>
            <div className="ps-subtitle">For Warehouse Use</div>
          </div>
        </div>

        <div className="ps-info-row">
          <div className="ps-order-box">
            <div className="label">Order #</div>
            <div className="val">{order.woo_order_id ?? order.order_number}</div>
            <div style={{ marginTop: '8px' }}>
              <div className="label">Date</div>
              <div style={{ fontWeight: 500, marginTop: '2px', fontSize: '12px' }}>
                {new Date(order.order_date).toLocaleDateString('en-BD', { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
          <div className="ps-customer-box">
            <div className="name">{order.customer?.full_name}</div>
            {order.customer?.phone_primary && <div>{order.customer.phone_primary}</div>}
            {order.customer?.address_line1 && <div>{order.customer.address_line1}</div>}
            {order.customer?.city && order.customer?.district && order.customer.city !== order.customer.district && (
              <div>{order.customer.city}</div>
            )}
            {order.customer?.district && <div style={{ fontWeight: 600 }}>{order.customer.district}</div>}
          </div>
        </div>

        <div className="ps-section-title">Items to Pack</div>
        <table className="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th style={{ textAlign: 'center' }}>Lot Barcode (FIFO)</th>
              <th style={{ textAlign: 'center' }}>Location</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th style={{ textAlign: 'center' }}>Done</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const lot = fifoLots.get(item.id);
              return (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                    <div className="sku">{item.sku}</div>
                  </td>
                  <td className="barcode-cell">
                    {lot ? (
                      <span className="barcode-tag">{lot.barcode}</span>
                    ) : (
                      <span className="barcode-none">No Stock</span>
                    )}
                  </td>
                  <td className="location-cell">
                    {lot && lot.location_code !== 'N/A' ? (
                      <span className="location-tag">{lot.location_code}</span>
                    ) : (
                      <span className="location-none">—</span>
                    )}
                  </td>
                  <td className="qty-cell">{item.quantity}</td>
                  <td className="check-cell">
                    <div className="check-box"></div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {packagingItems.length > 0 && (
          <div className="pkg-section">
            <div className="ps-section-title" style={{ marginBottom: '10px' }}>Packaging Materials</div>
            <table className="pkg-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>SKU</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {packagingItems.map(pkg => (
                  <tr key={pkg.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{pkg.product_name}</div>
                      {pkg.source_item_name && (
                        <div className="sku">For: {pkg.source_item_name}</div>
                      )}
                    </td>
                    <td>
                      <span className="sku">{pkg.sku}</span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{pkg.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
