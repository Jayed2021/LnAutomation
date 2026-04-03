export type ProviderType = 'pathao' | 'bkash' | 'ssl_commerz';
export type MatchStatus = 'matched' | 'not_found' | 'already_updated';
export type MatchConfidence = 'high' | 'medium' | 'low';
export type CollectionRecordStatus = 'pending' | 'processing' | 'verified' | 'discrepancy';
export type InvoiceType = 'delivery' | 'return';

export interface CollectionRecord {
  id: string;
  provider_type: ProviderType | null;
  courier_company: string;
  invoice_number: string | null;
  invoice_date: string;
  invoice_file_url: string | null;
  total_disbursed: number;
  payment_gateway_charges: number;
  raw_row_count: number;
  unmatched_row_count: number;
  bank_reference: string | null;
  bank_transfer_date: string | null;
  bank_transfer_amount: number | null;
  status: CollectionRecordStatus;
  discrepancy_amount: number;
  orders_matched: number;
  orders_total: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionLineItem {
  id: string;
  collection_record_id: string;
  order_id: string | null;
  tracking_number: string | null;
  consignment_id: string | null;
  woo_order_id: number | null;
  invoice_type: InvoiceType | null;
  collected_amount: number;
  delivery_charge: number;
  cod_charge: number;
  net_disbursed: number;
  gateway_charge: number;
  transaction_id: string | null;
  match_status: MatchStatus;
  match_confidence: MatchConfidence | null;
  applied: boolean;
  raw_data: Record<string, string> | null;
  created_at: string;
  order?: {
    order_number: string;
    woo_order_id: number | null;
    cs_status: string;
    payment_method: string | null;
    payment_status: string;
    total_amount: number;
  } | null;
  customer?: {
    full_name: string;
  } | null;
}

export interface ParsedRow {
  transaction_id: string | null;
  woo_order_id: number | null;
  consignment_id: string | null;
  invoice_type: InvoiceType | null;
  collected_amount: number;
  delivery_charge: number;
  payout: number;
  gateway_charge: number;
  raw_data: Record<string, string>;
  match_confidence_hint: MatchConfidence;
}

export interface ParseResult {
  rows: ParsedRow[];
  totalRows: number;
  parsedRows: number;
  skippedRows: number;
  errors: string[];
  detectedProvider: ProviderType | null;
  totalGatewayCharges: number;
  totalDisbursed: number;
}

export interface MatchedRow extends ParsedRow {
  order_id: string | null;
  match_status: MatchStatus;
  match_confidence: MatchConfidence;
  order_number: string | null;
  customer_name: string | null;
  cs_status: string | null;
  payment_method: string | null;
  payment_status: string | null;
  total_amount: number | null;
  existing_collected: number;
  existing_delivery_charge: number;
}

export interface MatchResult {
  matched: MatchedRow[];
  unmatched: MatchedRow[];
  totalMatched: number;
  totalUnmatched: number;
}

export interface ApplyResult {
  ordersUpdated: number;
  paidStatusSet: number;
  errors: string[];
}

export interface DuplicateInfo {
  existingRecordId: string;
  existingInvoiceDate: string;
  existingInvoiceNumber: string | null;
  overlapCount: number;
  incomingCount: number;
  overlapPercent: number;
}

export interface OverdueOrder {
  id: string;
  order_number: string;
  woo_order_id: number | null;
  cs_status: string;
  payment_method: string | null;
  total_amount: number;
  shipped_at: string | null;
  order_date: string;
  days_overdue: number;
  customer_name: string;
  customer_phone: string;
  courier_company: string | null;
  tracking_number: string | null;
  total_receivable: number | null;
  collected_amount: number | null;
  delivery_discount: number | null;
}
