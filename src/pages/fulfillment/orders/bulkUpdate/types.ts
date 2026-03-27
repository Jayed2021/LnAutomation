export type BulkRowStatus = 'valid' | 'not_found' | 'skipped';

export interface CsvRow {
  rawOrderId: string;
  rawStatus: string;
  rawEcr: string;
  rawDeliveryMethod: string;
  rawCostOfDelivery: string;
  rawCollectedAmount: string;
  rawRecipientName: string;
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
  'completed': { csStatus: 'delivered', courierStatus: 'Delivered' },
  'shipped': { csStatus: 'shipped', courierStatus: 'Shipped' },
  'partial delivered': { csStatus: 'partial_delivery', courierStatus: 'Partial Delivered' },
  'late delivery': { csStatus: 'late_delivery', courierStatus: 'Late Delivery' },
  'cancelled': { csStatus: 'cancelled', courierStatus: 'Cancelled' },
  'returned': { csStatus: 'returned', courierStatus: 'Returned' },
  'cbd': { csStatus: 'cancelled_cbd', courierStatus: 'Cancelled' },
  'cancel before dispatch': { csStatus: 'cancelled_cbd', courierStatus: 'Cancelled' },
  'cad': { csStatus: 'cancelled_cad', courierStatus: 'Returned' },
  'cancel after dispatch': { csStatus: 'cancelled_cad', courierStatus: 'Returned' },
  'exchange': { csStatus: 'exchange', courierStatus: 'Returned' },
  'exr': { csStatus: 'exchange_returnable', courierStatus: 'Returned' },
  'exchange returnable exr': { csStatus: 'exchange_returnable', courierStatus: 'Returned' },
  'exchange returnable': { csStatus: 'exchange_returnable', courierStatus: 'Returned' },
  'in lab': { csStatus: 'in_lab', courierStatus: '' },
  'not printed': { csStatus: 'not_printed', courierStatus: '' },
  'awaiting payment': { csStatus: 'awaiting_payment', courierStatus: '' },
};

export const COURIER_COMPANY_MAP: Record<string, string | null> = {
  'pathao': 'Pathao',
  'steadfast': 'Steadfast',
  'office': 'Office Delivery',
  'none': null,
  '': null,
};
