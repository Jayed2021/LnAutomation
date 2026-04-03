import { ParsedRow, ParseResult, ProviderType, InvoiceType, MatchConfidence } from './types';

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] ?? '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

function parseAmount(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[",\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function detectProvider(text: string): ProviderType | null {
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  if (firstLine.includes('Consignment_ID') && firstLine.includes('Final_Fee')) return 'pathao';
  if (firstLine.includes('Transaction Type') && firstLine.includes('Charges')) return 'bkash';
  if (firstLine.includes('Store Credit Amount') && firstLine.includes('TDR')) return 'ssl_commerz';
  return null;
}

function extractWooOrderIdFromReference(ref: string): { id: number | null; confidence: MatchConfidence } {
  if (!ref) return { id: null, confidence: 'low' };

  const pgwMatch = ref.match(/bfw_[a-z0-9_]+_(\d{6,8})/i);
  if (pgwMatch) return { id: parseInt(pgwMatch[1], 10), confidence: 'high' };

  const orderIdMatch = ref.match(/order\s*(?:id|#|no\.?)?\s*:?\s*(\d{6,8})/i);
  if (orderIdMatch) return { id: parseInt(orderIdMatch[1], 10), confidence: 'medium' };

  const bareNumber = ref.match(/^\s*(\d{6,8})\s*$/);
  if (bareNumber) return { id: parseInt(bareNumber[1], 10), confidence: 'low' };

  return { id: null, confidence: 'low' };
}

export function parsePathaoCSV(text: string): ParseResult {
  const allRows = parseCSV(text);
  const errors: string[] = [];
  let skippedRows = 0;

  const orderMap = new Map<string, {
    delivery: Record<string, string> | null;
    returns: Record<string, string>[];
  }>();

  for (const row of allRows) {
    const orderId = row['Merchant_Order_ID']?.trim();
    const invoiceType = row['Invoice type']?.toLowerCase().trim() as InvoiceType;

    if (!orderId) {
      skippedRows++;
      continue;
    }

    if (!orderMap.has(orderId)) {
      orderMap.set(orderId, { delivery: null, returns: [] });
    }

    const entry = orderMap.get(orderId)!;
    if (invoiceType === 'delivery') {
      entry.delivery = row;
    } else if (invoiceType === 'return') {
      entry.returns.push(row);
    }
  }

  const parsedRows: ParsedRow[] = [];

  for (const [orderId, { delivery, returns }] of orderMap.entries()) {
    const primaryRow = delivery ?? returns[0];
    if (!primaryRow) continue;

    const wooOrderIdNum = parseInt(orderId, 10);
    if (isNaN(wooOrderIdNum)) {
      errors.push(`Invalid Merchant_Order_ID: ${orderId}`);
      skippedRows++;
      continue;
    }

    let totalDeliveryCharge = 0;
    let collectedAmount = 0;
    let payout = 0;
    let mainConsignmentId: string | null = null;

    if (delivery) {
      totalDeliveryCharge += parseAmount(delivery['Final_Fee']);
      collectedAmount = parseAmount(delivery['Collected_Amount']);
      payout = parseAmount(delivery['Payout']);
      mainConsignmentId = delivery['Consignment_ID'] ?? null;
    }

    for (const ret of returns) {
      totalDeliveryCharge += parseAmount(ret['Final_Fee']);
      if (!mainConsignmentId) mainConsignmentId = ret['Consignment_ID'] ?? null;
    }

    const mergedRaw: Record<string, string> = {
      ...(delivery ?? returns[0]),
      _return_rows: returns.length.toString(),
      _total_final_fee: totalDeliveryCharge.toString(),
    };

    parsedRows.push({
      transaction_id: null,
      woo_order_id: wooOrderIdNum,
      consignment_id: mainConsignmentId,
      invoice_type: delivery ? 'delivery' : 'return',
      collected_amount: collectedAmount,
      delivery_charge: totalDeliveryCharge,
      payout,
      gateway_charge: 0,
      raw_data: mergedRaw,
      match_confidence_hint: 'high',
    });
  }

  const totalGatewayCharges = 0;
  const totalDisbursed = parsedRows.reduce((sum, r) => sum + r.payout, 0);

  return {
    rows: parsedRows,
    totalRows: allRows.length,
    parsedRows: parsedRows.length,
    skippedRows,
    errors,
    detectedProvider: 'pathao',
    totalGatewayCharges,
    totalDisbursed,
  };
}

export function parseBkashCSV(text: string): ParseResult {
  const allRows = parseCSV(text);
  const errors: string[] = [];
  const parsedRows: ParsedRow[] = [];
  let skippedRows = 0;

  for (const row of allRows) {
    const txType = row['Transaction Type']?.trim();
    if (txType !== 'Payment') {
      skippedRows++;
      continue;
    }

    const status = row['Transaction Status']?.trim();
    if (status && status.toLowerCase() !== 'success') {
      skippedRows++;
      continue;
    }

    const transactionId = row['Transaction ID']?.trim() ?? null;
    if (!transactionId) {
      errors.push(`Row missing Transaction ID`);
      skippedRows++;
      continue;
    }

    const txRef = row['Transaction Reference']?.trim() ?? '';
    const { id: wooOrderId, confidence } = extractWooOrderIdFromReference(txRef);

    const amount = parseAmount(row['Transaction Amount']);
    const charges = parseAmount(row['Charges']);

    parsedRows.push({
      transaction_id: transactionId,
      woo_order_id: wooOrderId,
      consignment_id: null,
      invoice_type: null,
      collected_amount: amount,
      delivery_charge: 0,
      payout: amount - charges,
      gateway_charge: charges,
      raw_data: row,
      match_confidence_hint: confidence,
    });
  }

  const totalGatewayCharges = parsedRows.reduce((sum, r) => sum + r.gateway_charge, 0);
  const totalDisbursed = parsedRows.reduce((sum, r) => sum + r.payout, 0);

  return {
    rows: parsedRows,
    totalRows: allRows.length,
    parsedRows: parsedRows.length,
    skippedRows,
    errors,
    detectedProvider: 'bkash',
    totalGatewayCharges,
    totalDisbursed,
  };
}

export function parseSSLCommerzCSV(text: string): ParseResult {
  const allRows = parseCSV(text);
  const errors: string[] = [];
  const parsedRows: ParsedRow[] = [];
  let skippedRows = 0;

  for (const row of allRows) {
    const txType = row['Transaction Type']?.trim();
    if (txType && txType !== 'ONLINE_PAYMENT') {
      skippedRows++;
      continue;
    }

    const transactionId = row['Transaction Id']?.trim() ?? null;
    if (!transactionId) {
      errors.push(`Row missing Transaction Id`);
      skippedRows++;
      continue;
    }

    const wooOrderIdNum = parseInt(transactionId, 10);
    if (isNaN(wooOrderIdNum)) {
      errors.push(`Transaction Id is not a valid order number: ${transactionId}`);
      skippedRows++;
      continue;
    }

    const storeCreditStr = row['Store Credit Amount'] ?? row['Store Credited'] ?? '';
    const tdr = parseAmount(row['TDR']);
    const storeCredit = parseAmount(storeCreditStr);
    const txAmount = parseAmount(row['Transaction Amount']);

    parsedRows.push({
      transaction_id: transactionId,
      woo_order_id: wooOrderIdNum,
      consignment_id: null,
      invoice_type: null,
      collected_amount: txAmount || storeCredit,
      delivery_charge: 0,
      payout: storeCredit,
      gateway_charge: tdr,
      raw_data: row,
      match_confidence_hint: 'high',
    });
  }

  const totalGatewayCharges = parsedRows.reduce((sum, r) => sum + r.gateway_charge, 0);
  const totalDisbursed = parsedRows.reduce((sum, r) => sum + r.payout, 0);

  return {
    rows: parsedRows,
    totalRows: allRows.length,
    parsedRows: parsedRows.length,
    skippedRows,
    errors,
    detectedProvider: 'ssl_commerz',
    totalGatewayCharges,
    totalDisbursed,
  };
}

export function parseInvoiceCSV(text: string, provider?: ProviderType): ParseResult {
  const detected = provider ?? detectProvider(text);
  if (detected === 'pathao') return parsePathaoCSV(text);
  if (detected === 'bkash') return parseBkashCSV(text);
  if (detected === 'ssl_commerz') return parseSSLCommerzCSV(text);
  return {
    rows: [],
    totalRows: 0,
    parsedRows: 0,
    skippedRows: 0,
    errors: ['Could not detect invoice format. Please select the provider manually.'],
    detectedProvider: null,
    totalGatewayCharges: 0,
    totalDisbursed: 0,
  };
}
