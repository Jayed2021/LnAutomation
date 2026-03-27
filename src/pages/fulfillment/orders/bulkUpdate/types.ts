export type BulkRowStatus = 'valid' | 'not_found' | 'invalid_status' | 'skipped';

export interface CsvRow {
  rawOrderId: string;
  rawStatus: string;
  rawEcr: string;
  rawDeliveryMethod: string;
  rawCostOfDelivery: string;
  rawCollectedAmount: string;
}

export interface PreviewRow extends CsvRow {
  rowIndex: number;
  dbOrderId: string | null;
  currentCsStatus: string | null;
  orderDate: string | null;
  mappedCsStatus: string | null;
  mappedCourierStatus: string | null;
  mappedCourierCompany: string | null;
  costOfDelivery: number | null;
  collectedAmount: number | null;
  status: BulkRowStatus;
  statusReason?: string;
}

export const CS_STATUS_MAP: Record<string, { csStatus: string; courierStatus: string }> = {
  'shipped': { csStatus: 'shipped', courierStatus: 'Shipped' },
  'partial delivered': { csStatus: 'partial_delivery', courierStatus: 'Partial Delivered' },
  'late delivery': { csStatus: 'late_delivery', courierStatus: 'Late Delivery' },
};

export const COURIER_COMPANY_MAP: Record<string, string | null> = {
  'pathao': 'Pathao',
  'steadfast': 'Steadfast',
  'office': 'Office Delivery',
  'none': null,
  '': null,
};
