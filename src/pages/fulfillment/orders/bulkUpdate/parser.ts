import { CsvRow, PreviewRow, CS_STATUS_MAP, COURIER_COMPANY_MAP } from './types';

export function parseCsvText(text: string): CsvRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

  const idx = {
    orderId: headers.findIndex(h => h.includes('order id') || h === 'order id'),
    status: headers.findIndex(h => h.includes('order status') || h === 'order status'),
    ecr: headers.findIndex(h => h === 'ecr' || h.includes('ecr')),
    deliveryMethod: headers.findIndex(h => h.includes('delivery method')),
    costOfDelivery: headers.findIndex(h => h.includes('cost of delivery')),
    collectedAmount: headers.findIndex(h => h.includes('collected amount')),
  };

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const get = (colIdx: number) => colIdx >= 0 ? (cols[colIdx] ?? '').trim().replace(/^"|"$/g, '') : '';
    rows.push({
      rawOrderId: get(idx.orderId),
      rawStatus: get(idx.status),
      rawEcr: get(idx.ecr),
      rawDeliveryMethod: get(idx.deliveryMethod),
      rawCostOfDelivery: get(idx.costOfDelivery),
      rawCollectedAmount: get(idx.collectedAmount),
    });
  }

  return rows.filter(r => r.rawOrderId !== '');
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function buildPreviewRows(
  csvRows: CsvRow[],
  dbOrders: { woo_order_id: number; id: string; cs_status: string; order_date: string }[]
): PreviewRow[] {
  const orderMap = new Map<number, typeof dbOrders[0]>();
  for (const o of dbOrders) {
    if (o.woo_order_id != null) orderMap.set(o.woo_order_id, o);
  }

  return csvRows.map((row, i) => {
    const wooId = parseInt(row.rawOrderId, 10);
    const dbOrder = isNaN(wooId) ? undefined : orderMap.get(wooId);

    if (!dbOrder) {
      return {
        ...row,
        rowIndex: i + 2,
        dbOrderId: null,
        currentCsStatus: null,
        orderDate: null,
        mappedCsStatus: null,
        mappedCourierStatus: null,
        mappedCourierCompany: null,
        costOfDelivery: null,
        collectedAmount: null,
        status: 'not_found' as const,
        statusReason: 'Order ID not found in system',
      };
    }

    const statusKey = row.rawStatus.toLowerCase().trim();
    const statusMapping = CS_STATUS_MAP[statusKey];
    if (!statusMapping) {
      return {
        ...row,
        rowIndex: i + 2,
        dbOrderId: dbOrder.id,
        currentCsStatus: dbOrder.cs_status,
        orderDate: dbOrder.order_date,
        mappedCsStatus: null,
        mappedCourierStatus: null,
        mappedCourierCompany: null,
        costOfDelivery: null,
        collectedAmount: null,
        status: 'invalid_status' as const,
        statusReason: `Unknown status: "${row.rawStatus}"`,
      };
    }

    const deliveryKey = row.rawDeliveryMethod.toLowerCase().trim();
    const courierCompany = deliveryKey in COURIER_COMPANY_MAP
      ? COURIER_COMPANY_MAP[deliveryKey]
      : row.rawDeliveryMethod || null;

    const costRaw = row.rawCostOfDelivery.replace(/[^0-9.]/g, '');
    const collectedRaw = row.rawCollectedAmount.replace(/[^0-9.]/g, '');

    return {
      ...row,
      rowIndex: i + 2,
      dbOrderId: dbOrder.id,
      currentCsStatus: dbOrder.cs_status,
      orderDate: dbOrder.order_date,
      mappedCsStatus: statusMapping.csStatus,
      mappedCourierStatus: statusMapping.courierStatus,
      mappedCourierCompany: courierCompany ?? null,
      costOfDelivery: costRaw ? parseFloat(costRaw) : null,
      collectedAmount: collectedRaw ? parseFloat(collectedRaw) : null,
      status: 'valid' as const,
    };
  });
}
