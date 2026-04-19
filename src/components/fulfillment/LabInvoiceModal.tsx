import { useState, useEffect } from 'react';
import { X, Printer, FlaskConical, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Button } from '../ui/Button';

interface LabInvoiceModalProps {
  order: {
    id: string;
    order_number: string;
    woo_order_number?: string | null;
    customer: { full_name: string; phone_primary: string };
    items: { id: string; sku: string; product_name: string; quantity: number }[];
  };
  onClose: () => void;
}

interface StoreProfile {
  store_name: string;
  logo_url: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  phone_primary: string;
  email: string;
  website: string;
  invoice_footer: string;
}

interface PrescriptionDetail {
  id: string;
  order_item_id: string | null;
  prescription_type: string | null;
  lens_type: string | null;
  custom_lens_type: string | null;
  lens_brand_name: string | null;
  high_index: boolean;
  customer_price: number | null;
  od_sph: string | null;
  od_cyl: string | null;
  od_axis: string | null;
  od_pd: string | null;
  os_sph: string | null;
  os_cyl: string | null;
  os_axis: string | null;
  os_pd: string | null;
  add_power: string | null;
}

interface FifoLot {
  lot_number: string;
  barcode: string;
  location_code: string;
}

interface InvoiceItem {
  product_name: string;
  sku: string;
  quantity: number;
  fifo_lot: FifoLot | null;
  prescription: PrescriptionDetail | null;
}

export function LabInvoiceModal({ order, onClose }: LabInvoiceModalProps) {
  const [loading, setLoading] = useState(true);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const [invoiceDate] = useState(new Date().toLocaleDateString('en-GB'));

  useEffect(() => {
    Promise.all([fetchInvoiceData(), fetchStoreProfile()]);
  }, []);

  const fetchStoreProfile = async () => {
    const { data } = await supabase
      .from('store_profile')
      .select('store_name, logo_url, address_line1, address_line2, city, postal_code, country, phone_primary, email, website, invoice_footer')
      .limit(1)
      .maybeSingle();
    setStoreProfile(data ?? null);
  };

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      const { data: prescriptions } = await supabase
        .from('order_prescriptions')
        .select(`
          id,
          order_item_id,
          prescription_type,
          lens_type,
          custom_lens_type,
          lens_brand_name,
          high_index,
          customer_price,
          od_sph, od_cyl, od_axis, od_pd,
          os_sph, os_cyl, os_axis, os_pd,
          add_power
        `)
        .eq('order_id', order.id);

      const physicalItems = order.items.filter(i => i.sku !== 'RX' && i.sku !== 'FEE');
      const items: InvoiceItem[] = [];

      if (physicalItems.length === 0) {
        const unassignedRx = (prescriptions ?? []).filter(p => !p.order_item_id);
        for (const rx of unassignedRx) {
          items.push({
            product_name: 'Frame supplied by customer',
            sku: '—',
            quantity: 1,
            fifo_lot: null,
            prescription: rx,
          });
        }
        setInvoiceItems(items);
        return;
      }

      for (const item of physicalItems) {
        const { data: product } = await supabase
          .from('products')
          .select('id')
          .eq('sku', item.sku)
          .maybeSingle();

        let fifoLot: FifoLot | null = null;
        if (product) {
          const { data: lots } = await supabase
            .from('inventory_lots')
            .select(`
              lot_number,
              barcode,
              location:warehouse_locations(code)
            `)
            .eq('product_id', product.id)
            .gt('remaining_quantity', 0)
            .order('received_date', { ascending: true })
            .limit(1);

          if (lots && lots[0]) {
            fifoLot = {
              lot_number: lots[0].lot_number,
              barcode: lots[0].barcode || lots[0].lot_number,
              location_code: lots[0].location?.code || 'N/A',
            };
          }
        }

        const rx = (prescriptions || []).find(p => p.order_item_id === item.id) || null;

        items.push({
          product_name: item.product_name,
          sku: item.sku,
          quantity: item.quantity,
          fifo_lot: fifoLot,
          prescription: rx,
        });
      }

      setInvoiceItems(items);
    } catch (err) {
      console.error('Error fetching lab invoice data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const displayOrderId = order.woo_order_number
    ? `#${order.woo_order_number}`
    : order.order_number;

  const formatRxVal = (val: string | null) => val || '—';

  const hasAnyAdd = invoiceItems.some(i => i.prescription?.add_power);

  const sp = storeProfile;
  const addressParts = [sp?.address_line1, sp?.address_line2, sp?.city && sp?.postal_code ? `${sp.city} - ${sp.postal_code}` : (sp?.city || sp?.postal_code), sp?.country].filter(Boolean);

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          body * {
            visibility: hidden;
          }
          #lab-invoice-print-area,
          #lab-invoice-print-area * {
            visibility: visible;
          }
          #lab-invoice-print-area {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4 print:hidden">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-teal-600" />
              <h2 className="text-lg font-semibold text-gray-900">Lab Invoice Preview</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1.5" />
                Print / Save as PDF
              </Button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading invoice data...</div>
          ) : (
            <div id="lab-invoice-print-area" className="font-sans text-sm bg-white">

              <div className="flex justify-between items-start pb-4 mb-4 border-b-2 border-gray-800">
                <div className="flex-1">
                  {sp?.logo_url ? (
                    <img src={sp.logo_url} alt="Store Logo" className="h-14 max-w-[160px] object-contain" />
                  ) : (
                    <div className="inline-flex items-center gap-2">
                      <div className="h-10 px-4 bg-gray-900 rounded-lg flex items-center">
                        <span className="text-white text-sm font-bold tracking-wider uppercase">
                          {sp?.store_name || 'LAB INVOICE'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Lab Invoice</div>
                    <div className="text-xs text-gray-500">Prescription Lens Order</div>
                  </div>
                </div>

                <div className="text-right text-xs text-gray-600 space-y-0.5 max-w-[220px]">
                  {sp?.store_name && <p className="font-semibold text-sm text-gray-900">{sp.store_name}</p>}
                  {addressParts.map((line, i) => (
                    <p key={i} className="flex items-center justify-end gap-1">
                      {i === 0 && <MapPin className="w-3 h-3 text-gray-400 shrink-0" />}
                      {line}
                    </p>
                  ))}
                  {sp?.phone_primary && (
                    <p className="flex items-center justify-end gap-1 mt-1">
                      <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                      {sp.phone_primary}
                    </p>
                  )}
                  {sp?.email && (
                    <p className="flex items-center justify-end gap-1">
                      <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                      {sp.email}
                    </p>
                  )}
                  {sp?.website && (
                    <p className="flex items-center justify-end gap-1">
                      <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                      {sp.website}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-5 bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Order</div>
                  <div className="font-bold text-gray-900">{displayOrderId}</div>
                  <div className="text-xs text-gray-500">Date: {invoiceDate}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Customer</div>
                  <div className="font-semibold text-gray-900">{order.customer.full_name}</div>
                  <div className="text-xs text-gray-500">{order.customer.phone_primary}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Items</div>
                  <div className="font-semibold text-gray-900">{invoiceItems.length} frame{invoiceItems.length !== 1 ? 's' : ''}</div>
                </div>
              </div>

              <div className="space-y-5">
                {invoiceItems.map((item, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold">{item.product_name}</span>
                        <span className="text-gray-300 text-xs ml-2">SKU: {item.sku}</span>
                      </div>
                      <span className="text-sm font-semibold">Qty: {item.quantity}</span>
                    </div>

                    {item.fifo_lot && (
                      <div className="px-4 py-2 bg-blue-50 border-b border-gray-100 flex items-center gap-6 text-xs">
                        <div>
                          <span className="text-gray-500">Lot / Barcode: </span>
                          <span className="font-mono font-semibold text-blue-800">{item.fifo_lot.barcode}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Location: </span>
                          <span className="font-bold text-blue-700">{item.fifo_lot.location_code}</span>
                        </div>
                      </div>
                    )}

                    {item.prescription ? (
                      <div className="p-4">
                        <div className="flex flex-wrap gap-4 mb-3 text-xs">
                          <div>
                            <span className="text-gray-400 uppercase tracking-wide">Prescription Details</span>
                          </div>
                          {item.prescription.lens_brand_name && (
                            <div>
                              <span className="text-gray-500">Brand: </span>
                              <span className="font-semibold text-gray-800">{item.prescription.lens_brand_name}</span>
                            </div>
                          )}
                          {(item.prescription.lens_type || item.prescription.custom_lens_type) && (
                            <div>
                              <span className="text-gray-500">Lens: </span>
                              <span className="font-semibold text-gray-800">
                                {item.prescription.custom_lens_type || item.prescription.lens_type}
                              </span>
                            </div>
                          )}
                          {item.prescription.prescription_type && (
                            <div>
                              <span className="text-gray-500">Type: </span>
                              <span className="font-semibold text-gray-800">{item.prescription.prescription_type}</span>
                            </div>
                          )}
                          {(item.prescription.customer_price ?? 0) > 0 && (
                            <div>
                              <span className="text-gray-500">Lens Charge: </span>
                              <span className="font-semibold text-gray-800">৳{item.prescription.customer_price}</span>
                            </div>
                          )}
                        </div>

                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-200 px-3 py-1.5 text-left font-semibold text-gray-700">Eye</th>
                              <th className="border border-gray-200 px-3 py-1.5 text-center font-semibold text-gray-700">SPH</th>
                              <th className="border border-gray-200 px-3 py-1.5 text-center font-semibold text-gray-700">CYL</th>
                              <th className="border border-gray-200 px-3 py-1.5 text-center font-semibold text-gray-700">AXIS</th>
                              <th className="border border-gray-200 px-3 py-1.5 text-center font-semibold text-gray-700">PD</th>
                              {hasAnyAdd && (
                                <th className="border border-gray-200 px-3 py-1.5 text-center font-semibold text-gray-700">ADD</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-gray-200 px-3 py-1.5 font-semibold text-gray-700">OD (Right)</td>
                              <td className="border border-gray-200 px-3 py-1.5 text-center">{formatRxVal(item.prescription.od_sph)}</td>
                              <td className="border border-gray-200 px-3 py-1.5 text-center">{formatRxVal(item.prescription.od_cyl)}</td>
                              <td className="border border-gray-200 px-3 py-1.5 text-center">{formatRxVal(item.prescription.od_axis)}</td>
                              <td className="border border-gray-200 px-3 py-1.5 text-center">{formatRxVal(item.prescription.od_pd)}</td>
                              {hasAnyAdd && (
                                <td className="border border-gray-200 px-3 py-1.5 text-center">{formatRxVal(item.prescription.add_power)}</td>
                              )}
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="border border-gray-200 px-3 py-1.5 font-semibold text-gray-700">OS (Left)</td>
                              <td className="border border-gray-200 px-3 py-1.5 text-center">{formatRxVal(item.prescription.os_sph)}</td>
                              <td className="border border-gray-200 px-3 py-1.5 text-center">{formatRxVal(item.prescription.os_cyl)}</td>
                              <td className="border border-gray-200 px-3 py-1.5 text-center">{formatRxVal(item.prescription.os_axis)}</td>
                              <td className="border border-gray-200 px-3 py-1.5 text-center">{formatRxVal(item.prescription.os_pd)}</td>
                              {hasAnyAdd && (
                                <td className="border border-gray-200 px-3 py-1.5 text-center">{formatRxVal(item.prescription.add_power)}</td>
                              )}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-xs text-gray-400 italic">No prescription details recorded for this frame</div>
                    )}
                  </div>
                ))}
              </div>

              {sp?.invoice_footer && (
                <div className="mt-5 pt-3 border-t border-gray-200 text-xs text-gray-400 text-center italic">
                  {sp.invoice_footer}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-300 text-center print:hidden">
                Lab costs and internal pricing are not shown on this invoice
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
