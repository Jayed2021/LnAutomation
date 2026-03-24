import { useState } from 'react';
import { X, Download, Filter } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

interface PackedOrder {
  id: string;
  order_number: string;
  woo_order_number: string | null;
  packed_at: string | null;
  total_amount: number;
  courier_info: {
    courier_company: string | null;
    tracking_number: string | null;
  } | null;
}

interface PackedExportModalProps {
  orders: PackedOrder[];
  onClose: () => void;
}

const COURIER_OPTIONS = [
  { value: 'all', label: 'All Couriers' },
  { value: 'pathao', label: 'Pathao' },
  { value: 'steadfast', label: 'Steadfast' },
  { value: 'redx', label: 'RedX' },
  { value: 'sundarban', label: 'Sundarban' },
  { value: 'office', label: 'Office Delivery' },
];

export function PackedExportModal({ orders, onClose }: PackedExportModalProps) {
  const [selectedCourier, setSelectedCourier] = useState('all');
  const [exporting, setExporting] = useState(false);

  const filteredOrders = selectedCourier === 'all'
    ? orders
    : orders.filter(o =>
        o.courier_info?.courier_company?.toLowerCase() === selectedCourier
      );

  const handleExport = async () => {
    try {
      setExporting(true);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Packed Orders');

      sheet.columns = [
        { header: 'SL', key: 'sl', width: 6 },
        { header: 'Shipped Date', key: 'shipped_date', width: 18 },
        { header: 'Order ID', key: 'order_id', width: 16 },
        { header: 'Courier Company', key: 'courier', width: 18 },
        { header: 'Tracking Number', key: 'tracking', width: 22 },
        { header: 'Order Total (৳)', key: 'total', width: 16 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A5F' },
      };
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.height = 20;

      let totalAmount = 0;

      filteredOrders.forEach((order, idx) => {
        const packedDate = order.packed_at
          ? new Date(order.packed_at).toLocaleDateString('en-GB')
          : '—';
        const orderId = order.woo_order_number
          ? `#${order.woo_order_number}`
          : order.order_number;

        const row = sheet.addRow({
          sl: idx + 1,
          shipped_date: packedDate,
          order_id: orderId,
          courier: order.courier_info?.courier_company || '—',
          tracking: order.courier_info?.tracking_number || '—',
          total: order.total_amount,
        });

        row.getCell('total').numFmt = '#,##0.00';
        row.alignment = { vertical: 'middle' };
        if (idx % 2 === 1) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FA' },
          };
        }

        totalAmount += order.total_amount;
      });

      sheet.addRow([]);

      const summaryRow = sheet.addRow({
        sl: '',
        shipped_date: '',
        order_id: `Total Orders: ${filteredOrders.length}`,
        courier: '',
        tracking: 'Total Amount:',
        total: totalAmount,
      });

      summaryRow.font = { bold: true };
      summaryRow.getCell('total').numFmt = '#,##0.00';
      summaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F5E9' },
      };

      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const courierLabel = selectedCourier === 'all'
        ? 'All'
        : COURIER_OPTIONS.find(o => o.value === selectedCourier)?.label || selectedCourier;
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Packed_Orders_${courierLabel}_${dateStr}.xlsx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Export Packed Orders</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Filter className="h-4 w-4 inline mr-1" />
              Filter by Courier
            </label>
            <Select
              value={selectedCourier}
              onChange={(e) => setSelectedCourier(e.target.value)}
            >
              {COURIER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="flex justify-between text-gray-600 mb-1">
              <span>Orders to export:</span>
              <span className="font-semibold text-gray-900">{filteredOrders.length}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Total value:</span>
              <span className="font-semibold text-gray-900">
                ৳{filteredOrders.reduce((s, o) => s + o.total_amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
            The export includes: Serial No, Shipped Date, Order ID, Courier, Tracking Number, Order Total — with totals row at the bottom.
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={exporting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleExport}
              disabled={exporting || filteredOrders.length === 0}
            >
              {exporting ? 'Exporting...' : (
                <>
                  <Download className="h-4 w-4 mr-1.5" />
                  Export Excel
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
