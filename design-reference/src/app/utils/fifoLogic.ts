import { lots, purchaseOrders } from '../data/mockData';
import type { Lot } from '../data/mockData';

/**
 * Get the oldest available lot for a given SKU using FIFO logic
 * Returns lot with barcode in format: SKU_SHIPMENT (e.g., BLG-BLK-M_MQ01)
 */
export function getRecommendedLotForSKU(sku: string, quantityNeeded: number): {
  lot: Lot;
  barcode: string;
  po_name: string;
  location: string;
} | null {
  // Find all lots for this SKU that have stock available
  const availableLots = lots
    .filter(lot => lot.sku === sku && lot.remaining_quantity > 0)
    .sort((a, b) => new Date(a.received_date).getTime() - new Date(b.received_date).getTime());

  if (availableLots.length === 0) {
    return null;
  }

  // Get the oldest lot (FIFO)
  const oldestLot = availableLots[0];

  // Check if it has enough stock
  if (oldestLot.remaining_quantity < quantityNeeded) {
    // In real implementation, might need to handle split picking from multiple lots
    console.warn(`Not enough stock in oldest lot for SKU ${sku}. Needed: ${quantityNeeded}, Available: ${oldestLot.remaining_quantity}`);
  }

  // Find PO name for the lot
  const po = purchaseOrders.find(p => p.po_id === oldestLot.po_id);
  const po_name = po ? po.po_name : oldestLot.po_id;

  // Generate barcode in format: SKU_SHIPMENT
  const barcode = `${sku}_${po_name}`;

  return {
    lot: oldestLot,
    barcode,
    po_name,
    location: oldestLot.location,
  };
}

/**
 * Generate recommended lots for all items in an order
 */
export function assignRecommendedLotsToOrder(items: Array<{
  sku: string;
  sku_name: string;
  quantity: number;
  price: number;
  attributes?: Record<string, string>;
}>) {
  return items.map(item => {
    const recommendation = getRecommendedLotForSKU(item.sku, item.quantity);
    
    return {
      ...item,
      recommended_lot: recommendation?.barcode || null,
      recommended_location: recommendation?.location || null,
    };
  });
}

/**
 * Validate if scanned barcode matches the recommended lot
 */
export function validateScannedBarcode(
  scannedBarcode: string, 
  recommendedLot: string,
  sku: string
): {
  valid: boolean;
  exactMatch: boolean;
  message: string;
} {
  // Exact match
  if (scannedBarcode === recommendedLot) {
    return {
      valid: true,
      exactMatch: true,
      message: 'Correct item scanned!',
    };
  }

  // Check if it's the same SKU but different lot
  const scannedSKU = scannedBarcode.split('_')[0];
  if (scannedSKU === sku) {
    return {
      valid: true,
      exactMatch: false,
      message: 'Different lot scanned. This is not the recommended FIFO lot.',
    };
  }

  // Completely wrong item
  return {
    valid: false,
    exactMatch: false,
    message: 'Wrong item scanned! This does not match the order.',
  };
}
