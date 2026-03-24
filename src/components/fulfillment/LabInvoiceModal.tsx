import { useState, useEffect } from 'react';
import { X, Printer, FlaskConical } from 'lucide-react';
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

interface PrescriptionDetail {
  id: string;
  order_item_id: string | null;
  prescription_type: string | null;
  lens_type: string | null;
  custom_lens_type: string | null;
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
  const [invoiceDate] = useState(new Date().toLocaleDateString('en-GB'));

  useEffect(() => {
    fetchInvoiceData();
  }, []);

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
          od_sph, od_cyl, od_axis, od_pd,
          os_sph, os_cyl, os_axis, os_pd
        `)
        .eq('order_id', order.id);

      const items: InvoiceItem[] = [];

      for (const item of order.items) {
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

        const rx = (prescriptions || []).find(
          p => p.order_item_id === item.id
        ) || (prescriptions && prescriptions[0]) || null;

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

  return (
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
              Print
            </Button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading invoice data...</div>
        ) : (
          <div id="lab-invoice-content" className="font-sans text-sm">
            <div className="border-b-2 border-gray-800 pb-3 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">LAB INVOICE</h1>
                  <p className="text-gray-600 text-sm mt-0.5">Prescription Lens Order</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <div className="font-semibold text-gray-900">Order {displayOrderId}</div>
                  <div>Date: {invoiceDate}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5 bg-gray-50 rounded-lg p-3">
              <div>
                <div className="text-xs text-gray-500 font-semibold uppercase mb-0.5">Customer</div>
                <div className="font-semibold text-gray-900">{order.customer.full_name}</div>
                <div className="text-gray-600">{order.customer.phone_primary}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-semibold uppercase mb-0.5">Items</div>
                <div className="font-semibold text-gray-900">{invoiceItems.length} item(s)</div>
              </div>
            </div>

            <div className="space-y-5">
              {invoiceItems.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{item.product_name}</span>
                      <span className="text-gray-300 text-xs ml-2">SKU: {item.sku}</span>
                    </div>
                    <span className="text-sm font-semibold">Qty: {item.quantity}</span>
                  </div>

                  {item.fifo_lot && (
                    <div className="px-4 py-2 bg-blue-50 border-b border-gray-200 flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-gray-500">Lot: </span>
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
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Prescription Details</div>

                      {(item.prescription.lens_type || item.prescription.custom_lens_type) && (
                        <div className="mb-3 flex flex-wrap gap-3">
                          <div>
                            <span className="text-xs text-gray-500">Lens Type: </span>
                            <span className="font-semibold text-gray-800">
                              {item.prescription.custom_lens_type || item.prescription.lens_type}
                            </span>
                          </div>
                          {item.prescription.prescription_type && (
                            <div>
                              <span className="text-xs text-gray-500">Type: </span>
                              <span className="font-semibold text-gray-800">{item.prescription.prescription_type}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold">Eye</th>
                            <th className="border border-gray-300 px-3 py-1.5 text-center font-semibold">SPH</th>
                            <th className="border border-gray-300 px-3 py-1.5 text-center font-semibold">CYL</th>
                            <th className="border border-gray-300 px-3 py-1.5 text-center font-semibold">AXIS</th>
                            <th className="border border-gray-300 px-3 py-1.5 text-center font-semibold">PD</th>
                            {item.prescription.add_power && (
                              <th className="border border-gray-300 px-3 py-1.5 text-center font-semibold">ADD</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 px-3 py-1.5 font-semibold">OD (Right)</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-center">{formatRxVal(item.prescription.od_sph)}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-center">{formatRxVal(item.prescription.od_cyl)}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-center">{formatRxVal(item.prescription.od_axis)}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-center">{formatRxVal(item.prescription.od_pd)}</td>
                            {item.prescription.add_power && (
                              <td className="border border-gray-300 px-3 py-1.5 text-center">{formatRxVal(item.prescription.add_power)}</td>
                            )}
                          </tr>
                          <tr className="bg-gray-50">
                            <td className="border border-gray-300 px-3 py-1.5 font-semibold">OS (Left)</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-center">{formatRxVal(item.prescription.os_sph)}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-center">{formatRxVal(item.prescription.os_cyl)}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-center">{formatRxVal(item.prescription.os_axis)}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-center">{formatRxVal(item.prescription.os_pd)}</td>
                            {item.prescription.add_power && (
                              <td className="border border-gray-300 px-3 py-1.5 text-center">{formatRxVal(item.prescription.add_power)}</td>
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-xs text-gray-400 italic">No prescription details recorded</div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-gray-200 pt-4 text-xs text-gray-400 text-center print:hidden">
              Lab costs and pricing are not shown on this invoice
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
