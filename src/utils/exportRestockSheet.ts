import ExcelJS from 'exceljs';

export interface RestockExportItem {
  returnId: string;
  returnNumber: string;
  orderId: string; // woo_order_id or order_number
  customerName: string;
  sku: string;
  productName: string;
  quantity: number;
  restockLocationCode: string | null;
  restockLocationName: string | null;
  qcPassedAt: string; // ISO timestamp
}

export interface RestockExportLocationStock {
  sku: string;
  locationCode: string;
  currentStock: number;
}

export async function exportRestockSheet(
  items: RestockExportItem[],
  locationStocks: RestockExportLocationStock[],
  dateLabel: string,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LunettesERP';
  wb.created = new Date();

  // ── Sheet 1: Walking / Print Sheet ─────────────────────────────────────────
  const ws1 = wb.addWorksheet('Restock Summary', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ showGridLines: false }],
  });

  // Title row
  ws1.mergeCells('A1:G1');
  const titleCell = ws1.getCell('A1');
  titleCell.value = `Restock Sheet — ${dateLabel}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF111827' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  ws1.getRow(1).height = 28;

  ws1.addRow([]); // spacer

  // Header row
  const h1 = ws1.addRow(['#', 'Location', 'SKU', 'Product Name', 'Qty to Restock', 'Current Stock', 'Order ID(s)']);
  h1.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF374151' } },
    };
  });
  ws1.getRow(3).height = 22;

  ws1.columns = [
    { key: 'serial',   width: 5  },
    { key: 'location', width: 14 },
    { key: 'sku',      width: 14 },
    { key: 'name',     width: 36 },
    { key: 'qty',      width: 14 },
    { key: 'stock',    width: 14 },
    { key: 'orders',   width: 28 },
  ];

  // Group items: by location → by SKU
  const stockMap = new Map<string, number>();
  for (const s of locationStocks) {
    stockMap.set(`${s.sku}|${s.locationCode}`, s.currentStock);
  }

  type SkuGroup = {
    sku: string;
    productName: string;
    qty: number;
    orderIds: string[];
    locationCode: string;
    locationName: string | null;
  };

  const locationMap = new Map<string, SkuGroup[]>();
  for (const item of items) {
    const loc = item.restockLocationCode ?? 'Not Set';
    if (!locationMap.has(loc)) locationMap.set(loc, []);
    const locGroups = locationMap.get(loc)!;
    const existing = locGroups.find(g => g.sku === item.sku);
    if (existing) {
      existing.qty += item.quantity;
      if (!existing.orderIds.includes(item.orderId)) existing.orderIds.push(item.orderId);
    } else {
      locGroups.push({
        sku: item.sku,
        productName: item.productName,
        qty: item.quantity,
        orderIds: [item.orderId],
        locationCode: loc,
        locationName: item.restockLocationName,
      });
    }
  }

  // Sort locations alphabetically; "Not Set" goes last
  const sortedLocations = [...locationMap.keys()].sort((a, b) => {
    if (a === 'Not Set') return 1;
    if (b === 'Not Set') return -1;
    return a.localeCompare(b);
  });

  let serial = 1;
  const locationColors = ['FFFEF9C3', 'FFECFDF5', 'FFEFF6FF', 'FFFDF4FF', 'FFFFF7ED', 'FFF0FDF4'];
  let colorIdx = 0;

  for (const locCode of sortedLocations) {
    const skuGroups = locationMap.get(locCode)!;
    const bgColor = locationColors[colorIdx % locationColors.length];
    colorIdx++;

    for (const group of skuGroups.sort((a, b) => a.sku.localeCompare(b.sku))) {
      const currentStock = stockMap.get(`${group.sku}|${locCode}`) ?? 0;
      const row = ws1.addRow([
        serial++,
        locCode,
        group.sku,
        group.productName,
        group.qty,
        currentStock > 0 ? currentStock : '—',
        group.orderIds.join(', '),
      ]);

      row.eachCell((cell, colNum) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNum === 4 ? 'left' : colNum === 7 ? 'left' : 'center',
          wrapText: colNum === 7,
        };
        cell.font = { size: 10, color: { argb: 'FF111827' } };
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        };
      });

      // Bold the qty column
      row.getCell(5).font = { size: 10, bold: true, color: { argb: 'FF065F46' } };
      row.getCell(6).font = { size: 10, color: { argb: 'FF6B7280' } };
      row.height = 20;
    }

    // Location separator
    const sepRow = ws1.addRow([]);
    sepRow.height = 4;
  }

  // Freeze header
  ws1.views = [{ state: 'frozen', ySplit: 3, showGridLines: false }];

  // ── Sheet 2: Return Detail ──────────────────────────────────────────────────
  const ws2 = wb.addWorksheet('Return Detail', {
    views: [{ showGridLines: false }],
  });

  ws2.columns = [
    { key: 'returnNumber', header: 'Return ID',        width: 22 },
    { key: 'orderId',      header: 'Order ID',         width: 14 },
    { key: 'customer',     header: 'Customer',         width: 22 },
    { key: 'sku',          header: 'SKU',              width: 14 },
    { key: 'productName',  header: 'Product Name',     width: 34 },
    { key: 'qty',          header: 'Qty',              width: 8  },
    { key: 'location',     header: 'Restock Location', width: 18 },
    { key: 'qcAt',         header: 'QC Passed At',     width: 20 },
  ];

  const h2 = ws2.getRow(1);
  h2.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  h2.height = 22;

  // Sort detail by location then SKU for consistency
  const sortedItems = [...items].sort((a, b) => {
    const la = a.restockLocationCode ?? 'zzz';
    const lb = b.restockLocationCode ?? 'zzz';
    if (la !== lb) return la.localeCompare(lb);
    return a.sku.localeCompare(b.sku);
  });

  let d2row = 2;
  for (const item of sortedItems) {
    const row = ws2.addRow({
      returnNumber: item.returnNumber,
      orderId: item.orderId,
      customer: item.customerName,
      sku: item.sku,
      productName: item.productName,
      qty: item.quantity,
      location: item.restockLocationCode ?? 'Not Set',
      qcAt: item.qcPassedAt
        ? new Date(item.qcPassedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '',
    });
    const bgColor = d2row % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF';
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.font = { size: 10, color: { argb: 'FF111827' } };
      cell.alignment = { vertical: 'middle' };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
    });
    row.height = 18;
    d2row++;
  }

  ws2.views = [{ state: 'frozen', ySplit: 1, showGridLines: false }];

  // ── Download ────────────────────────────────────────────────────────────────
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `restock-sheet-${today}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
