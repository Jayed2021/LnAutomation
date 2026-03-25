import { OrderDetail, OrderItem, OrderPrescription, PackagingItem } from './types';
import { StoreProfile, FifoLotInfo } from './service';

const fmt = (v: number) =>
  `&#2547;${v.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildInvoiceHtml(
  order: OrderDetail,
  items: OrderItem[],
  prescriptions: OrderPrescription[],
  storeProfile: StoreProfile | null,
): string {
  const sp = storeProfile;
  const addressParts = [
    sp?.address_line1, sp?.address_line2, sp?.city, sp?.postal_code, sp?.country,
  ].filter(Boolean) as string[];

  const invoiceNumber = order.woo_order_id ?? order.order_number;
  const subtotal = order.subtotal;
  const discount = order.discount_amount;
  const shipping = order.shipping_fee;
  const total = order.total_amount;

  const logoHtml = sp?.logo_url
    ? `<img src="${esc(sp.logo_url)}" alt="${esc(sp.store_name)}" style="height:48px;object-fit:contain;" />`
    : `<div style="font-size:22px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${esc(sp?.store_name ?? 'Store')}</div>`;

  const storeAddressHtml = addressParts.map(l => `<span>${esc(l)}<br/></span>`).join('');

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;vertical-align:top;">
        <div>${esc(item.product_name)}</div>
        <div style="font-size:11px;color:#777;font-weight:600;margin-top:2px;">SKU: ${esc(item.sku)}</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">${fmt(item.line_total)}</td>
    </tr>
  `).join('');

  const discountRow = discount > 0
    ? `<tr><td style="padding:5px 12px;color:#16a34a;">Discount</td><td style="padding:5px 12px;text-align:right;color:#16a34a;">-${fmt(discount)}</td></tr>`
    : '';

  const shippingRow = shipping > 0
    ? `<tr><td style="padding:5px 12px;">Shipping</td><td style="padding:5px 12px;text-align:right;">${fmt(shipping)}</td></tr>`
    : '';

  const paymentRow = order.payment_method
    ? `<tr><td style="padding:0 0 2px;color:#555;padding-right:24px;white-space:nowrap;">Payment Method:</td><td style="padding:0 0 2px;font-weight:500;">${esc(order.payment_method)}</td></tr>`
    : '';

  const validRx = prescriptions.filter(p => p.prescription_type);
  const rxHtml = validRx.length > 0 ? `
    <div style="margin-bottom:24px;">
      <h4 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin-bottom:8px;">Prescription Details</h4>
      ${validRx.map(rx => `
        <div style="border:1px solid #bfdbfe;background:#eff6ff;padding:14px;border-radius:6px;margin-bottom:10px;">
          <div style="font-size:11.5px;margin-bottom:8px;">
            <strong>Type:</strong> ${esc(rx.prescription_type)}
            ${rx.lens_type ? `&nbsp;|&nbsp;<strong>Lens:</strong> ${esc(rx.lens_type)}` : ''}
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
            <thead>
              <tr>
                <th style="padding:4px 8px;border-bottom:1px solid #dbeafe;text-align:left;color:#1e40af;font-weight:600;">Eye</th>
                <th style="padding:4px 8px;border-bottom:1px solid #dbeafe;text-align:center;color:#1e40af;font-weight:600;">SPH</th>
                <th style="padding:4px 8px;border-bottom:1px solid #dbeafe;text-align:center;color:#1e40af;font-weight:600;">CYL</th>
                <th style="padding:4px 8px;border-bottom:1px solid #dbeafe;text-align:center;color:#1e40af;font-weight:600;">AXIS</th>
                <th style="padding:4px 8px;border-bottom:1px solid #dbeafe;text-align:center;color:#1e40af;font-weight:600;">PD</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:4px 8px;border-bottom:1px solid #dbeafe;text-align:left;font-weight:600;">Right (OD)</td>
                <td style="padding:4px 8px;border-bottom:1px solid #dbeafe;text-align:center;">${esc(rx.od_sph ?? '—')}</td>
                <td style="padding:4px 8px;border-bottom:1px solid #dbeafe;text-align:center;">${esc(rx.od_cyl ?? '—')}</td>
                <td style="padding:4px 8px;border-bottom:1px solid #dbeafe;text-align:center;">${esc(rx.od_axis ?? '—')}</td>
                <td style="padding:4px 8px;border-bottom:1px solid #dbeafe;text-align:center;">${esc(rx.od_pd ?? '—')}</td>
              </tr>
              <tr>
                <td style="padding:4px 8px;text-align:left;font-weight:600;">Left (OS)</td>
                <td style="padding:4px 8px;text-align:center;">${esc(rx.os_sph ?? '—')}</td>
                <td style="padding:4px 8px;text-align:center;">${esc(rx.os_cyl ?? '—')}</td>
                <td style="padding:4px 8px;text-align:center;">${esc(rx.os_axis ?? '—')}</td>
                <td style="padding:4px 8px;text-align:center;">${esc(rx.os_pd ?? '—')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `).join('')}
    </div>
  ` : '';

  const footerHtml = sp?.invoice_footer
    ? `<div style="font-size:11px;color:#999;border-top:1px solid #eee;padding-top:16px;text-align:center;">${esc(sp.invoice_footer)}</div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice #${esc(String(invoiceNumber))}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
    #print-btn { position:fixed; top:16px; right:16px; z-index:9999; display:flex; align-items:center; gap:8px; padding:10px 20px; background:#111; color:#fff; border:none; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.18); transition:background 0.15s; }
    #print-btn:hover { background:#333; }
    @media print {
      #print-btn { display:none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <button id="print-btn" onclick="window.print()">
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    Print / Download
  </button>
  <div style="max-width:794px;margin:0 auto;padding:48px 48px 64px;">

    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;">
      <div>${logoHtml}</div>
      <div style="text-align:right;font-size:12px;line-height:1.6;color:#222;">
        <strong style="display:block;font-size:13px;font-weight:700;">${esc(sp?.store_name ?? '')}</strong>
        ${storeAddressHtml}
        ${sp?.phone_primary ? `<span>${esc(sp.phone_primary)}<br/></span>` : ''}
        ${sp?.email ? `<span>${esc(sp.email)}</span>` : ''}
      </div>
    </div>

    <div style="font-size:28px;font-weight:800;margin-bottom:24px;">INVOICE</div>

    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;gap:32px;">
      <div style="font-size:12.5px;line-height:1.7;">
        <div style="font-weight:600;font-size:13px;">${esc(order.customer?.full_name)}</div>
        ${order.customer?.address_line1 ? `<div>${esc(order.customer.address_line1)}</div>` : ''}
        ${order.customer?.city && order.customer?.district && order.customer.city !== order.customer.district ? `<div>${esc(order.customer.city)}</div>` : ''}
        ${order.customer?.district ? `<div style="text-transform:uppercase;">${esc(order.customer.district)}</div>` : ''}
        ${order.customer?.phone_primary ? `<div>${esc(order.customer.phone_primary)}</div>` : ''}
      </div>
      <div style="font-size:12.5px;line-height:1.7;">
        <table style="border-collapse:collapse;">
          <tbody>
            <tr>
              <td style="color:#555;padding-right:24px;padding-bottom:2px;white-space:nowrap;">Order Number:</td>
              <td style="font-weight:500;padding-bottom:2px;">${esc(String(invoiceNumber))}</td>
            </tr>
            <tr>
              <td style="color:#555;padding-right:24px;padding-bottom:2px;white-space:nowrap;">Order Date:</td>
              <td style="font-weight:500;padding-bottom:2px;">${fmtDate(order.order_date)}</td>
            </tr>
            ${paymentRow}
          </tbody>
        </table>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:24px;">
      <thead>
        <tr style="background:#111;color:#fff;">
          <th style="padding:10px 12px;text-align:left;font-weight:600;letter-spacing:0.3px;">Product</th>
          <th style="padding:10px 12px;text-align:center;font-weight:600;letter-spacing:0.3px;">Quantity</th>
          <th style="padding:10px 12px;text-align:right;font-weight:600;letter-spacing:0.3px;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-bottom:32px;">
      <table style="width:260px;border-collapse:collapse;font-size:12.5px;">
        <tbody>
          <tr>
            <td style="padding:5px 12px;">Subtotal</td>
            <td style="padding:5px 12px;text-align:right;">${fmt(subtotal)}</td>
          </tr>
          ${discountRow}
          ${shippingRow}
          <tr>
            <td style="padding:8px 12px;font-weight:700;font-size:14px;border-top:2px solid #111;">Total</td>
            <td style="padding:8px 12px;text-align:right;font-weight:700;font-size:14px;border-top:2px solid #111;">${fmt(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${rxHtml}
    ${footerHtml}

  </div>
</body>
</html>`;
}

export function buildPackingSlipHtml(
  order: OrderDetail,
  items: OrderItem[],
  packagingItems: PackagingItem[],
  fifoLots: Map<string, FifoLotInfo>,
  storeProfile: StoreProfile | null,
): string {
  const sp = storeProfile;

  const logoHtml = sp?.logo_url
    ? `<img src="${esc(sp.logo_url)}" alt="${esc(sp.store_name)}" style="height:36px;object-fit:contain;" />`
    : `<div style="font-size:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${esc(sp?.store_name ?? 'Store')}</div>`;

  const itemsHtml = items.map(item => {
    const lot = fifoLots.get(item.id);
    const barcodeCell = lot
      ? `<span style="display:inline-block;padding:4px 10px;background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;border-radius:4px;font-size:11.5px;font-weight:700;font-family:monospace;letter-spacing:0.5px;">${esc(lot.barcode)}</span>`
      : `<span style="display:inline-block;padding:4px 10px;background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:4px;font-size:11px;">No Stock</span>`;
    const locationCell = lot && lot.location_code !== 'N/A'
      ? `<span style="display:inline-block;padding:4px 10px;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;border-radius:4px;font-size:11.5px;font-weight:700;letter-spacing:0.5px;">${esc(lot.location_code)}</span>`
      : `<span style="display:inline-block;padding:4px 10px;background:#f3f4f6;color:#9ca3af;border-radius:4px;font-size:11px;">—</span>`;
    return `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee;vertical-align:middle;">
          <div style="font-weight:600;">${esc(item.product_name)}</div>
          <div style="font-size:10.5px;color:#888;margin-top:2px;">${esc(item.sku)}</div>
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${barcodeCell}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${locationCell}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;font-weight:700;font-size:14px;">${item.quantity}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">
          <div style="width:18px;height:18px;border:2px solid #999;display:inline-block;border-radius:3px;"></div>
        </td>
      </tr>
    `;
  }).join('');

  const packagingHtml = packagingItems.length > 0 ? `
    <div style="border-top:1px solid #e5e7eb;padding-top:16px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin-bottom:10px;">Packaging Materials</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 10px;text-align:left;font-weight:600;font-size:11.5px;color:#374151;border-bottom:1px solid #e5e7eb;">Material</th>
            <th style="padding:8px 10px;text-align:left;font-weight:600;font-size:11.5px;color:#374151;border-bottom:1px solid #e5e7eb;">SKU</th>
            <th style="padding:8px 10px;text-align:center;font-weight:600;font-size:11.5px;color:#374151;border-bottom:1px solid #e5e7eb;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${packagingItems.map(pkg => `
            <tr>
              <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle;">
                <div style="font-weight:500;">${esc(pkg.product_name)}</div>
                ${pkg.source_item_name ? `<div style="font-size:10.5px;color:#9ca3af;">For: ${esc(pkg.source_item_name)}</div>` : ''}
              </td>
              <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle;">
                <span style="font-size:10.5px;color:#9ca3af;">${esc(pkg.sku)}</span>
              </td>
              <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:center;font-weight:600;">${pkg.quantity}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Packing Slip #${esc(String(order.woo_order_id ?? order.order_number))}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
    #print-btn { position:fixed; top:16px; right:16px; z-index:9999; display:flex; align-items:center; gap:8px; padding:10px 20px; background:#111; color:#fff; border:none; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.18); transition:background 0.15s; }
    #print-btn:hover { background:#333; }
    @media print {
      #print-btn { display:none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <button id="print-btn" onclick="window.print()">
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    Print / Download
  </button>
  <div style="max-width:794px;margin:0 auto;padding:32px 40px 48px;">

    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #111;margin-bottom:20px;">
      <div>${logoHtml}</div>
      <div style="text-align:right;">
        <div style="font-size:20px;font-weight:800;letter-spacing:1px;">PACKING SLIP</div>
        <div style="font-size:11px;color:#777;margin-top:2px;">For Warehouse Use</div>
      </div>
    </div>

    <div style="display:flex;gap:24px;margin-bottom:20px;">
      <div style="flex:1;padding:12px 16px;border:1px solid #ddd;border-radius:6px;font-size:12px;">
        <div style="color:#777;font-size:11px;">Order #</div>
        <div style="font-weight:600;font-size:13px;margin-top:2px;">${esc(String(order.woo_order_id ?? order.order_number))}</div>
        <div style="margin-top:8px;">
          <div style="color:#777;font-size:11px;">Date</div>
          <div style="font-weight:500;margin-top:2px;font-size:12px;">${new Date(order.order_date).toLocaleDateString('en-BD', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
        </div>
      </div>
      <div style="flex:1.5;padding:12px 16px;border:1px solid #ddd;border-radius:6px;font-size:12px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${esc(order.customer?.full_name)}</div>
        ${order.customer?.phone_primary ? `<div>${esc(order.customer.phone_primary)}</div>` : ''}
        ${order.customer?.address_line1 ? `<div>${esc(order.customer.address_line1)}</div>` : ''}
        ${order.customer?.city && order.customer?.district && order.customer.city !== order.customer.district ? `<div>${esc(order.customer.city)}</div>` : ''}
        ${order.customer?.district ? `<div style="font-weight:600;">${esc(order.customer.district)}</div>` : ''}
      </div>
    </div>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin-bottom:8px;">Items to Pack</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px;">
      <thead>
        <tr style="background:#111;color:#fff;">
          <th style="padding:9px 10px;text-align:left;font-weight:600;font-size:11.5px;">Product</th>
          <th style="padding:9px 10px;text-align:center;font-weight:600;font-size:11.5px;">Lot Barcode (FIFO)</th>
          <th style="padding:9px 10px;text-align:center;font-weight:600;font-size:11.5px;">Location</th>
          <th style="padding:9px 10px;text-align:center;font-weight:600;font-size:11.5px;">Qty</th>
          <th style="padding:9px 10px;text-align:center;font-weight:600;font-size:11.5px;">Done</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    ${packagingHtml}

  </div>
</body>
</html>`;
}
