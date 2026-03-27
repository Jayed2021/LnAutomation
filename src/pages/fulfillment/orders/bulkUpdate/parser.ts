import { CsvRow, PreviewRow, CS_STATUS_MAP, COURIER_COMPANY_MAP } from './types';

export function parseCsvText(text: string): CsvRow[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());

  const findCol = (...candidates: string[]) => {
    for (const c of candidates) {
      const exact = headers.findIndex(h => h === c);
      if (exact >= 0) return exact;
    }
    for (const c of candidates) {
      const partial = headers.findIndex(h => h.includes(c));
      if (partial >= 0) return partial;
    }
    return -1;
  };

  const idx = {
    orderId: findCol('order id'),
    status: findCol('order status'),
    ecr: findCol('ecr'),
    deliveryMethod: findCol('delivery method'),
    costOfDelivery: findCol('cost of delivery'),
    collectedAmount: findCol('collected amount'),
    recipientName: findCol('recipient name'),
  };

  const result: CsvRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const get = (colIdx: number) => colIdx >= 0 ? (cols[colIdx] ?? '').trim() : '';
    const orderId = get(idx.orderId);
    if (!orderId) continue;
    result.push({
      rawOrderId: orderId,
      rawStatus: get(idx.status),
      rawEcr: get(idx.ecr),
      rawDeliveryMethod: get(idx.deliveryMethod),
      rawCostOfDelivery: get(idx.costOfDelivery),
      rawCollectedAmount: get(idx.collectedAmount),
      rawRecipientName: get(idx.recipientName),
    });
  }

  return result;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (ch === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      i++;
      continue;
    }

    if ((ch === '\r' || ch === '\n') && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      if (currentRow.some(c => c.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      if (ch === '\r' && next === '\n') i++;
      i++;
      continue;
    }

    if ((ch === '\r' || ch === '\n') && inQuotes) {
      currentCell += '\n';
      if (ch === '\r' && next === '\n') i++;
      i++;
      continue;
    }

    currentCell += ch;
    i++;
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some(c => c.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
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

    if (!statusKey) {
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
        status: 'skipped' as const,
        statusReason: 'No status value in CSV',
      };
    }

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
        status: 'skipped' as const,
        statusReason: `Status "${row.rawStatus}" not applicable for update`,
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
