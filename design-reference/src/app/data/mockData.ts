// Mock data for ERP system

export type UserRole = 'admin' | 'operations_manager' | 'warehouse_manager' | 'customer_service' | 'accounts';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface Product {
  product_id: string;
  woocommerce_product_id: string;
  name: string;
  type: 'simple' | 'variable';
  active: boolean;
}

export interface SupplierProduct {
  supplier_id: string;
  supplier_name: string;
  unit_cost: number;
  currency: string;
  last_purchase_date?: string;
  performance_score?: number; // 1-5 rating based on quality, delivery time
  total_ordered_last_quarter?: number;
}

export interface SKU {
  sku: string;
  product_id: string;
  name: string;
  attributes: Record<string, string>;
  barcode: string;
  selling_price: number;
  image?: string;
  suppliers: SupplierProduct[]; // Multiple suppliers per SKU
  current_stock?: number;
}

export interface Supplier {
  supplier_id: string;
  initial: string;
  company_name: string;
  email: string;
  phone: string;
  alibaba_url?: string;
  alipay_qr?: string;
  alipay_chinese_name?: string;
  wechat_qr?: string;
  wechat_chinese_name?: string;
  alipay_email?: string;
  wechat_number?: string;
  catalogs: SupplierCatalog[];
  created_date: string;
}

export interface SupplierCatalog {
  catalog_id: string;
  file_name: string;
  file_url: string;
  upload_date: string;
  notes?: string;
}

export interface Warehouse {
  warehouse_id: string;
  name: string;
  address?: string;
  created_date: string;
}

export interface PurchaseOrder {
  po_id: string;
  po_name: string; // Short name for the shipment (e.g., MQ01, MQ02)
  supplier: string;
  currency: string;
  fx_rate: number;
  estimated_arrival: string;
  status: 'draft' | 'ordered' | 'qty_checked' | 'quality_checked' | 'partially_received' | 'closed';
  items: POItem[];
  total_cost: number;
  created_date: string;
  quantity_check?: QuantityCheck;
  quality_check?: QualityCheck;
}

export interface POItem {
  sku: string;
  sku_name: string;
  quantity: number;
  unit_cost: number;
  received_quantity: number;
  qty_checked?: number;
  quality_checked?: number;
  damaged_quantity?: number;
}

export interface QuantityCheck {
  checked_date: string;
  checked_by: string;
  notes?: string;
  added_to_stock: boolean;
}

export interface QualityCheck {
  checked_date: string;
  checked_by: string;
  photos: QCPhoto[];
  notes?: string;
}

export interface QCPhoto {
  photo_id: string;
  file_name: string;
  file_url: string;
  upload_date: string;
  type: 'good' | 'damaged';
}

export interface Lot {
  lot_id: string;
  sku: string;
  sku_name: string;
  received_date: string;
  landed_cost: number;
  initial_quantity: number;
  remaining_quantity: number;
  reserved_quantity: number; // Stock reserved for orders (picked/packed but not shipped)
  available_quantity: number; // remaining_quantity - reserved_quantity
  po_id: string;
  warehouse: string;
  location: string;
}

export interface InventoryMovement {
  movement_id: string;
  sku: string;
  sku_name: string;
  lot_id: string;
  movement_type: 'receive' | 'dispatch' | 'return' | 'adjustment';
  quantity: number;
  from_location: string;
  to_location: string;
  reference_type: 'order' | 'return' | 'audit' | 'po';
  reference_id: string;
  timestamp: string;
  user: string;
}

export interface OrderPackagingMaterial {
  sku: string;
  name: string;
  quantity: number;
  cost_per_unit: number;
}

export interface Order {
  order_id: string;
  woo_order_id: string;
  customer_name: string;
  customer_phone: string;
  cs_status: 'new_not_called' | 'new_called' | 'awaiting_payment' | 'late_delivery' | 'exchange' | 'send_to_lab' | 'in_lab' | 'not_printed' | 'printed' | 'packed' | 'shipped' | 'delivered' | 'processing' | 'refund';
  items: OrderItem[];
  packaging_materials?: OrderPackagingMaterial[]; // Packaging materials used for this order
  total: number;
  collected_amount: number; // Amount collected from customer
  delivery_charge: number; // Delivery charge for this order
  payment_method: string;
  shipping_address: string;
  created_date: string;
  late_delivery_date?: string; // Date for late delivery orders
  shipped_date?: string; // Exact date when order was dispatched
  delivered_date?: string; // Date when order was delivered
  follow_up_date?: string;
  notes: string;
  refund_amount?: number; // Refund amount if order is refunded
  woo_meta?: Record<string, any>; // WooCommerce meta values
  assigned_to?: string; // User ID of assigned CS person
  assigned_to_name?: string; // Display name of assigned CS person
  confirmed_by?: string; // Name of CS person who actually handled the order (if covering for assigned)
}

export interface OrderItem {
  sku: string;
  sku_name: string;
  quantity: number;
  price: number;
  attributes?: Record<string, string>;
  recommended_lot?: string; // FIFO recommended lot barcode (e.g., BLG-BLK-M_MQ01)
  recommended_location?: string; // Warehouse location for picking
  picked_lot?: string; // Actual lot picked (if different from recommended)
  picked_barcode?: string; // Scanned barcode during pick
  pick_discrepancy?: boolean; // True if picked lot differs from recommended
}

export interface PickLog {
  log_id: string;
  order_id: string;
  order_woo_id: string;
  sku: string;
  sku_name: string;
  recommended_lot: string;
  picked_lot: string;
  picked_barcode: string;
  picked_by: string;
  picked_date: string;
  discrepancy: boolean;
  reason?: string; // Why different lot was picked
}

export interface PickNotification {
  notification_id: string;
  order_id: string;
  order_woo_id: string;
  type: 'pick_discrepancy';
  message: string;
  created_date: string;
  read: boolean;
  severity: 'warning' | 'info';
}

export interface Return {
  return_id: string;
  order_id: string;
  status: 'expected' | 'received' | 'qc_passed' | 'qc_failed' | 'restocked' | 'damaged';
  items: ReturnItem[];
  expected_date?: string;
  received_date?: string;
  reason: string;
  courier: string;
}

export interface ReturnItem {
  sku: string;
  sku_name: string;
  quantity: number;
  qc_status?: 'passed' | 'failed';
  lot_id?: string;
}

export interface Expense {
  expense_id: string;
  category: string;
  amount: number;
  date: string;
  affects_profit: boolean;
  description: string;
  reference?: string;
}

export interface WarehouseLocation {
  location_id: string;
  warehouse_id: string;
  warehouse_name: string;
  location_name: string;
  barcode: string;
  capacity: number; // Maximum units this location can hold
  current_stock: number; // Current units in this location
  created_date: string;
}

export interface InventoryAudit {
  audit_id: string;
  audit_date: string;
  locations: string[];
  items: AuditItem[];
  status: 'in_progress' | 'completed';
  audited_by: string;
}

export interface AuditItem {
  sku: string;
  sku_name: string;
  location: string;
  expected_quantity: number;
  counted_quantity?: number;
  difference?: number;
}

// Current user (can be changed in UI)
export let currentUser: User = {
  id: 'user1',
  name: 'Admin User',
  role: 'admin',
};

export const setCurrentUser = (user: User) => {
  currentUser = user;
};

export const users: User[] = [
  { id: 'user1', name: 'Admin User', role: 'admin' },
  { id: 'user2', name: 'Sarah Chen', role: 'customer_service' },
  { id: 'user3', name: 'Mike Johnson', role: 'operations_manager' },
  { id: 'user4', name: 'Lisa Wang', role: 'accounts' },
  { id: 'user5', name: 'James Smith', role: 'warehouse_manager' },
  { id: 'user6', name: 'Rania Islam', role: 'customer_service' },
];

// ─── CS Assignment Configuration ─────────────────────────────────────────────

export interface CSAssignmentConfig {
  userId: string;
  name: string;
  percentage: number;
  isActive: boolean; // If false, orders redistribute to other active CS people
}

export let csAssignmentConfigs: CSAssignmentConfig[] = [
  { userId: 'user2', name: 'Sarah Chen', percentage: 60, isActive: true },
  { userId: 'user6', name: 'Rania Islam', percentage: 40, isActive: true },
];

export const updateCSAssignmentConfigs = (configs: CSAssignmentConfig[]) => {
  csAssignmentConfigs = configs;
};

export const products: Product[] = [
  { product_id: 'prod1', woocommerce_product_id: 'woo_123', name: 'Blue Light Glasses', type: 'variable', active: true },
  { product_id: 'prod2', woocommerce_product_id: 'woo_124', name: 'Reading Glasses', type: 'variable', active: true },
  { product_id: 'prod3', woocommerce_product_id: 'woo_125', name: 'Sunglasses', type: 'simple', active: true },
  { product_id: 'prod4', woocommerce_product_id: 'woo_126', name: 'Contact Lens Case', type: 'simple', active: true },
];

export let skus: SKU[] = [
  { sku: 'BLG-BLK-M', product_id: 'prod1', name: 'Blue Light Glasses - Black - Medium', attributes: { color: 'Black', size: 'Medium' }, barcode: '1234567890001', selling_price: 45.00, suppliers: [{ supplier_id: 'SUP-001', supplier_name: 'Vision Supply Co.', unit_cost: 15.00, currency: 'USD', last_purchase_date: '2026-01-15', performance_score: 4, total_ordered_last_quarter: 150 }], current_stock: 87, image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400' },
  { sku: 'BLG-BLK-L', product_id: 'prod1', name: 'Blue Light Glasses - Black - Large', attributes: { color: 'Black', size: 'Large' }, barcode: '1234567890002', selling_price: 45.00, suppliers: [{ supplier_id: 'SUP-001', supplier_name: 'Vision Supply Co.', unit_cost: 15.00, currency: 'USD', last_purchase_date: '2026-01-15', performance_score: 4, total_ordered_last_quarter: 150 }], current_stock: 124, image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400' },
  { sku: 'BLG-TOR-M', product_id: 'prod1', name: 'Blue Light Glasses - Tortoise - Medium', attributes: { color: 'Tortoise', size: 'Medium' }, barcode: '1234567890003', selling_price: 45.00, suppliers: [{ supplier_id: 'SUP-001', supplier_name: 'Vision Supply Co.', unit_cost: 15.00, currency: 'USD', last_purchase_date: '2026-02-10', performance_score: 4, total_ordered_last_quarter: 60 }], current_stock: 48, image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400' },
  { sku: 'RDG-GLD-1.5', product_id: 'prod2', name: 'Reading Glasses - Gold - +1.5', attributes: { color: 'Gold', power: '+1.5' }, barcode: '1234567890004', selling_price: 35.00, suppliers: [{ supplier_id: 'SUP-002', supplier_name: 'Eyewear Imports Ltd.', unit_cost: 12.00, currency: 'CNY', last_purchase_date: '2026-01-20', performance_score: 5, total_ordered_last_quarter: 100 }], current_stock: 45, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400' },
  { sku: 'RDG-GLD-2.0', product_id: 'prod2', name: 'Reading Glasses - Gold - +2.0', attributes: { color: 'Gold', power: '+2.0' }, barcode: '1234567890005', selling_price: 35.00, suppliers: [{ supplier_id: 'SUP-002', supplier_name: 'Eyewear Imports Ltd.', unit_cost: 12.00, currency: 'CNY', last_purchase_date: '2026-01-20', performance_score: 5, total_ordered_last_quarter: 100 }], current_stock: 0, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400' },
  { sku: 'SUN-AVT-M', product_id: 'prod3', name: 'Sunglasses - Aviator - Medium', attributes: { style: 'Aviator', size: 'Medium' }, barcode: '1234567890006', selling_price: 65.00, suppliers: [{ supplier_id: 'SUP-002', supplier_name: 'Eyewear Imports Ltd.', unit_cost: 40.00, currency: 'CNY', last_purchase_date: '2025-12-10', performance_score: 5, total_ordered_last_quarter: 75 }], current_stock: 12, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400' },
  { sku: 'CLC-BLU', product_id: 'prod4', name: 'Contact Lens Case - Blue', attributes: { color: 'Blue' }, barcode: '1234567890007', selling_price: 8.00, suppliers: [{ supplier_id: 'SUP-001', supplier_name: 'Vision Supply Co.', unit_cost: 3.00, currency: 'USD', last_purchase_date: '2026-02-08', performance_score: 4, total_ordered_last_quarter: 200 }], current_stock: 156, image: 'https://images.unsplash.com/photo-1628507993937-451fbac0b0b2?w=400' },
];

// Packaging Materials (tracked as products in inventory)
export interface PackagingMaterial {
  sku: string;
  name: string;
  barcode: string;
  cost_per_unit: number; // For expense tracking
  current_stock: number;
  unit: string; // pcs, meters, etc.
}

export const packagingMaterials: PackagingMaterial[] = [
  { sku: 'PKG-BOX-S', name: 'Small Eyewear Box', barcode: '9900000001', cost_per_unit: 15, current_stock: 450, unit: 'pcs' },
  { sku: 'PKG-BOX-M', name: 'Medium Eyewear Box', barcode: '9900000002', cost_per_unit: 20, current_stock: 320, unit: 'pcs' },
  { sku: 'PKG-POUCH', name: 'Microfiber Pouch', barcode: '9900000003', cost_per_unit: 10, current_stock: 600, unit: 'pcs' },
  { sku: 'PKG-CLOTH', name: 'Cleaning Cloth', barcode: '9900000004', cost_per_unit: 5, current_stock: 800, unit: 'pcs' },
  { sku: 'PKG-CASE', name: 'Hard Case', barcode: '9900000005', cost_per_unit: 25, current_stock: 180, unit: 'pcs' },
  { sku: 'PKG-BUBBLE', name: 'Bubble Wrap (roll)', barcode: '9900000006', cost_per_unit: 150, current_stock: 45, unit: 'roll' },
  { sku: 'PKG-TAPE', name: 'Packing Tape', barcode: '9900000007', cost_per_unit: 80, current_stock: 60, unit: 'roll' },
  { sku: 'PKG-STICKER', name: 'Brand Sticker', barcode: '9900000008', cost_per_unit: 2, current_stock: 2000, unit: 'pcs' },
];

export const purchaseOrders: PurchaseOrder[] = [
  {
    po_id: 'PO-2026-001',
    po_name: 'MQ01',
    supplier: 'Vision Supply Co.',
    currency: 'USD',
    fx_rate: 1.0,
    estimated_arrival: '2026-02-25',
    status: 'ordered',
    created_date: '2026-02-10',
    total_cost: 4500.00,
    items: [
      { sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', quantity: 100, unit_cost: 15.00, received_quantity: 0 },
      { sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', quantity: 100, unit_cost: 15.00, received_quantity: 0 },
      { sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 50, unit_cost: 12.00, received_quantity: 0 },
    ],
  },
  {
    po_id: 'PO-2026-002',
    po_name: 'MQ02',
    supplier: 'Eyewear Imports Ltd.',
    currency: 'CNY',
    fx_rate: 0.14,
    estimated_arrival: '2026-03-05',
    status: 'draft',
    created_date: '2026-02-15',
    total_cost: 3200.00,
    items: [
      { sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 80, unit_cost: 40.00, received_quantity: 0 },
    ],
  },
  {
    po_id: 'PO-2026-003',
    po_name: 'MQ03',
    supplier: 'Vision Supply Co.',
    currency: 'USD',
    fx_rate: 1.0,
    estimated_arrival: '2026-02-20',
    status: 'partially_received',
    created_date: '2026-02-05',
    total_cost: 2100.00,
    items: [
      { sku: 'BLG-TOR-M', sku_name: 'Blue Light Glasses - Tortoise - Medium', quantity: 100, unit_cost: 15.00, received_quantity: 60 },
      { sku: 'CLC-BLU', sku_name: 'Contact Lens Case - Blue', quantity: 200, unit_cost: 3.00, received_quantity: 200 },
    ],
  },
];

export const lots: Lot[] = [
  { lot_id: 'LOT-001', sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', received_date: '2026-01-15', landed_cost: 16.50, initial_quantity: 150, remaining_quantity: 87, reserved_quantity: 15, available_quantity: 72, po_id: 'PO-2025-045', warehouse: 'Main Warehouse', location: 'A-12' },
  { lot_id: 'LOT-002', sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', received_date: '2026-01-15', landed_cost: 16.50, initial_quantity: 150, remaining_quantity: 124, reserved_quantity: 8, available_quantity: 116, po_id: 'PO-2025-045', warehouse: 'Main Warehouse', location: 'A-13' },
  { lot_id: 'LOT-003', sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', received_date: '2026-01-20', landed_cost: 13.20, initial_quantity: 100, remaining_quantity: 45, reserved_quantity: 12, available_quantity: 33, po_id: 'PO-2025-046', warehouse: 'Main Warehouse', location: 'B-05' },
  { lot_id: 'LOT-004', sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', received_date: '2025-12-10', landed_cost: 42.00, initial_quantity: 75, remaining_quantity: 12, reserved_quantity: 5, available_quantity: 7, po_id: 'PO-2025-038', warehouse: 'Main Warehouse', location: 'C-08' },
  { lot_id: 'LOT-005', sku: 'CLC-BLU', sku_name: 'Contact Lens Case - Blue', received_date: '2026-02-08', landed_cost: 3.30, initial_quantity: 200, remaining_quantity: 156, reserved_quantity: 0, available_quantity: 156, po_id: 'PO-2026-003', warehouse: 'Main Warehouse', location: 'D-02' },
  { lot_id: 'LOT-006', sku: 'BLG-TOR-M', sku_name: 'Blue Light Glasses - Tortoise - Medium', received_date: '2026-02-10', landed_cost: 16.80, initial_quantity: 60, remaining_quantity: 48, reserved_quantity: 3, available_quantity: 45, po_id: 'PO-2026-003', warehouse: 'Main Warehouse', location: 'A-14' },
];

// Shipment aggregation interface
export interface ShipmentSummary {
  shipment_id: string; // PO name (e.g., MQ01)
  po_id: string;
  received_date: string;
  total_skus: number;
  total_initial_quantity: number;
  total_remaining_quantity: number;
  total_sold_quantity: number;
  total_landed_cost: number;
  utilization_percent: number;
  items: ShipmentItem[];
}

export interface ShipmentItem {
  sku: string;
  sku_name: string;
  lot_id: string;
  initial_quantity: number;
  remaining_quantity: number;
  sold_quantity: number;
  landed_cost: number;
  selling_price: number;
  total_cost: number;
  total_revenue: number;
  profit: number;
  location: string;
}

// Helper function to get shipment details by PO
export const getShipmentByPO = (po_id: string): ShipmentSummary | null => {
  const shipmentLots = lots.filter(lot => lot.po_id === po_id);
  if (shipmentLots.length === 0) return null;

  // Try to find PO name from purchaseOrders
  const po = purchaseOrders.find(p => p.po_id === po_id);
  const shipment_id = po ? po.po_name : po_id;

  const items: ShipmentItem[] = shipmentLots.map(lot => {
    const sold_quantity = lot.initial_quantity - lot.remaining_quantity;
    const sku_info = skus.find(s => s.sku === lot.sku);
    const selling_price = sku_info?.selling_price || 0;
    const total_cost = lot.landed_cost * lot.initial_quantity;
    const total_revenue = selling_price * sold_quantity;
    const profit = total_revenue - (lot.landed_cost * sold_quantity);

    return {
      sku: lot.sku,
      sku_name: lot.sku_name,
      lot_id: lot.lot_id,
      initial_quantity: lot.initial_quantity,
      remaining_quantity: lot.remaining_quantity,
      sold_quantity,
      landed_cost: lot.landed_cost,
      selling_price,
      total_cost,
      total_revenue,
      profit,
      location: lot.location,
    };
  });

  const total_initial_quantity = items.reduce((sum, item) => sum + item.initial_quantity, 0);
  const total_remaining_quantity = items.reduce((sum, item) => sum + item.remaining_quantity, 0);
  const total_sold_quantity = items.reduce((sum, item) => sum + item.sold_quantity, 0);
  const total_landed_cost = items.reduce((sum, item) => sum + item.total_cost, 0);
  const utilization_percent = (total_sold_quantity / total_initial_quantity) * 100;

  return {
    shipment_id,
    po_id,
    received_date: shipmentLots[0].received_date,
    total_skus: items.length,
    total_initial_quantity,
    total_remaining_quantity,
    total_sold_quantity,
    total_landed_cost,
    utilization_percent,
    items,
  };
};

// Helper function to get all shipments
export const getAllShipments = (): ShipmentSummary[] => {
  // Get unique PO IDs from lots
  const uniquePOIds = [...new Set(lots.map(lot => lot.po_id))];
  
  const shipments = uniquePOIds
    .map(po_id => getShipmentByPO(po_id))
    .filter((shipment): shipment is ShipmentSummary => shipment !== null)
    .sort((a, b) => new Date(b.received_date).getTime() - new Date(a.received_date).getTime());
  
  return shipments;
};

export const inventoryMovements: InventoryMovement[] = [
  { movement_id: 'MV-001', sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', lot_id: 'LOT-001', movement_type: 'receive', quantity: 150, from_location: 'Receiving', to_location: 'A-12', reference_type: 'po', reference_id: 'PO-2025-045', timestamp: '2026-01-15T10:30:00', user: 'Mike Johnson' },
  { movement_id: 'MV-002', sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', lot_id: 'LOT-001', movement_type: 'dispatch', quantity: -2, from_location: 'A-12', to_location: 'Shipped', reference_type: 'order', reference_id: 'ORD-2026-157', timestamp: '2026-02-15T14:22:00', user: 'Mike Johnson' },
  { movement_id: 'MV-003', sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', lot_id: 'LOT-003', movement_type: 'dispatch', quantity: -1, from_location: 'B-05', to_location: 'Shipped', reference_type: 'order', reference_id: 'ORD-2026-158', timestamp: '2026-02-16T09:15:00', user: 'Mike Johnson' },
  { movement_id: 'MV-004', sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', lot_id: 'LOT-004', movement_type: 'return', quantity: 1, from_location: 'Returns', to_location: 'C-08', reference_type: 'return', reference_id: 'RET-2026-012', timestamp: '2026-02-16T16:45:00', user: 'Mike Johnson' },
  { movement_id: 'MV-005', sku: 'CLC-BLU', sku_name: 'Contact Lens Case - Blue', lot_id: 'LOT-005', movement_type: 'receive', quantity: 200, from_location: 'Receiving', to_location: 'D-02', reference_type: 'po', reference_id: 'PO-2026-003', timestamp: '2026-02-08T11:00:00', user: 'Mike Johnson' },
];

export const orders: Order[] = [
  {
    order_id: 'ORD-2026-157',
    woo_order_id: '#10157',
    customer_name: 'Ahmed Hassan',
    customer_phone: '+880 1711 123456',
    cs_status: 'not_printed',
    items: [
      { sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', quantity: 2, price: 45.00 },
    ],
    packaging_materials: [
      { sku: 'PKG-BOX-S', name: 'Small Eyewear Box', quantity: 2, cost_per_unit: 15 },
      { sku: 'PKG-POUCH', name: 'Microfiber Pouch', quantity: 2, cost_per_unit: 10 },
      { sku: 'PKG-CLOTH', name: 'Cleaning Cloth', quantity: 2, cost_per_unit: 5 },
    ],
    total: 90.00,
    collected_amount: 0,
    delivery_charge: 60,
    payment_method: 'COD',
    shipping_address: 'Dhaka, Bangladesh',
    notes: 'Customer requested expedited shipping',
    created_date: '2026-02-24',
  },
  {
    order_id: 'ORD-2026-158',
    woo_order_id: '#10158',
    customer_name: 'Fatima Al-Mansoori',
    customer_phone: '+880 1712 234567',
    cs_status: 'new_not_called',
    items: [
      { sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 1, price: 35.00 },
    ],
    total: 35.00,
    collected_amount: 0,
    delivery_charge: 60,
    payment_method: 'Card',
    shipping_address: 'Chittagong, Bangladesh',
    notes: '',
    created_date: '2026-02-24',
  },
  {
    order_id: 'ORD-2026-159',
    woo_order_id: '#10159',
    customer_name: 'Omar Ibrahim',
    customer_phone: '+880 1713 345678',
    cs_status: 'new_called',
    items: [
      { sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', quantity: 1, price: 45.00, attributes: { 'Prescription': 'Custom' } },
      { sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 1, price: 65.00 },
      { sku: 'CLC-BLU', sku_name: 'Contact Lens Case - Blue', quantity: 2, price: 8.00 },
    ],
    total: 125.00,
    collected_amount: 0,
    delivery_charge: 80,
    payment_method: 'COD',
    shipping_address: 'Sylhet, Bangladesh',
    notes: 'Customer not picking up phone - try again',
    created_date: '2026-02-24',
  },
  {
    order_id: 'ORD-2026-160',
    woo_order_id: '#10160',
    customer_name: 'Layla Mohammed',
    customer_phone: '+880 1714 456789',
    cs_status: 'in_lab',
    items: [
      { sku: 'BLG-TOR-M', sku_name: 'Blue Light Glasses - Tortoise - Medium', quantity: 2, price: 45.00, attributes: { 'Prescription': 'Custom' } },
    ],
    total: 90.00,
    collected_amount: 90.00,
    delivery_charge: 60,
    payment_method: 'Card',
    shipping_address: 'Dhaka, Bangladesh',
    notes: 'Custom lens order - lab processing',
    created_date: '2026-02-23',
  },
  {
    order_id: 'ORD-2026-161',
    woo_order_id: '#10161',
    customer_name: 'Khalid Rashid',
    customer_phone: '+880 1715 567890',
    cs_status: 'late_delivery',
    items: [
      { sku: 'RDG-GLD-2.0', sku_name: 'Reading Glasses - Gold - +2.0', quantity: 2, price: 35.00 },
    ],
    total: 70.00,
    collected_amount: 70.00,
    delivery_charge: 100,
    payment_method: 'COD',
    shipping_address: 'Rajshahi, Bangladesh',
    notes: 'Customer requested to delay delivery',
    late_delivery_date: '2026-03-01',
    created_date: '2026-02-20',
  },
  {
    order_id: 'ORD-2026-162',
    woo_order_id: '#10162',
    customer_name: 'Nadia Khan',
    customer_phone: '+880 1716 678901',
    cs_status: 'awaiting_payment',
    items: [
      { sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', quantity: 1, price: 45.00 },
    ],
    total: 45.00,
    collected_amount: 22.50,
    delivery_charge: 80,
    payment_method: 'Bank Transfer',
    shipping_address: 'Khulna, Bangladesh',
    notes: 'Awaiting advance payment of 50%',
    created_date: '2026-02-24',
  },
  {
    order_id: 'ORD-2026-163',
    woo_order_id: '#10163',
    customer_name: 'Tariq Ahmed',
    customer_phone: '+880 1717 789012',
    cs_status: 'send_to_lab',
    items: [
      { sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 1, price: 35.00, attributes: { 'Prescription': 'Custom' } },
    ],
    total: 35.00,
    collected_amount: 0,
    delivery_charge: 60,
    payment_method: 'COD',
    shipping_address: 'Dhaka, Bangladesh',
    notes: 'Pick and send to lab for prescription',
    created_date: '2026-02-23',
  },
  {
    order_id: 'ORD-2026-164',
    woo_order_id: '#10164',
    customer_name: 'Zainab Hossain',
    customer_phone: '+880 1718 890123',
    cs_status: 'exchange',
    items: [
      { sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 1, price: 65.00 },
    ],
    total: 65.00,
    collected_amount: 65.00,
    delivery_charge: 60,
    payment_method: 'Card',
    shipping_address: 'Dhaka, Bangladesh',
    notes: 'Customer wants to exchange for different color',
    created_date: '2026-02-22',
  },
  {
    order_id: 'ORD-2026-165',
    woo_order_id: '#10165',
    customer_name: 'Rashid Ali',
    customer_phone: '+880 1719 901234',
    cs_status: 'printed',
    items: [
      { sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', quantity: 2, price: 45.00 },
      { sku: 'CLC-BLU', sku_name: 'Contact Lens Case - Blue', quantity: 1, price: 8.00 },
    ],
    total: 98.00,
    collected_amount: 0,
    delivery_charge: 80,
    payment_method: 'COD',
    shipping_address: 'Chittagong, Bangladesh',
    notes: '',
    created_date: '2026-02-24',
  },
  {
    order_id: 'ORD-2026-166',
    woo_order_id: '#10166',
    customer_name: 'Amina Rahman',
    customer_phone: '+880 1720 012345',
    cs_status: 'packed',
    items: [
      { sku: 'BLG-TOR-M', sku_name: 'Blue Light Glasses - Tortoise - Medium', quantity: 1, price: 45.00 },
    ],
    total: 45.00,
    collected_amount: 0,
    delivery_charge: 60,
    payment_method: 'COD',
    shipping_address: 'Dhaka, Bangladesh',
    notes: '',
    created_date: '2026-02-23',
  },
  {
    order_id: 'ORD-2026-167',
    woo_order_id: '#10167',
    customer_name: 'Karim Uddin',
    customer_phone: '+880 1721 123456',
    cs_status: 'shipped',
    items: [
      { sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 3, price: 35.00 },
    ],
    total: 105.00,
    collected_amount: 105.00,
    delivery_charge: 80,
    payment_method: 'Card',
    shipping_address: 'Sylhet, Bangladesh',
    notes: '',
    created_date: '2026-02-22',
    shipped_date: '2026-02-24',
  },
  {
    order_id: 'ORD-2026-168',
    woo_order_id: '#10168',
    customer_name: 'Sara Begum',
    customer_phone: '+880 1722 234567',
    cs_status: 'new_not_called',
    items: [
      { sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 2, price: 65.00 },
    ],
    total: 130.00,
    collected_amount: 0,
    delivery_charge: 60,
    payment_method: 'COD',
    shipping_address: 'Dhaka, Bangladesh',
    notes: '',
    created_date: '2026-02-24',
  },
  // Additional orders for NOT PRINTED status
  { order_id: 'ORD-2026-169', woo_order_id: '#10169', customer_name: 'Habib Rahman', customer_phone: '+880 1723 345678', cs_status: 'not_printed', items: [{ sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', quantity: 1, price: 45.00 }], total: 45.00, payment_method: 'COD', shipping_address: 'Mirpur, Dhaka', notes: '', created_date: '2026-02-25' },
  { order_id: 'ORD-2026-170', woo_order_id: '#10170', customer_name: 'Yasmin Akter', customer_phone: '+880 1724 456789', cs_status: 'not_printed', items: [{ sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 2, price: 35.00 }], total: 70.00, payment_method: 'Bkash', shipping_address: 'Uttara, Dhaka', notes: '', created_date: '2026-02-25' },
  { order_id: 'ORD-2026-171', woo_order_id: '#10171', customer_name: 'Mahmud Hasan', customer_phone: '+880 1725 567890', cs_status: 'not_printed', items: [{ sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 1, price: 65.00 }, { sku: 'CLC-BLU', sku_name: 'Contact Lens Case - Blue', quantity: 1, price: 8.00 }], total: 73.00, payment_method: 'COD', shipping_address: 'Banani, Dhaka', notes: '', created_date: '2026-02-25' },
  { order_id: 'ORD-2026-172', woo_order_id: '#10172', customer_name: 'Razia Sultana', customer_phone: '+880 1726 678901', cs_status: 'not_printed', items: [{ sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', quantity: 1, price: 45.00 }], total: 45.00, payment_method: 'COD', shipping_address: 'Gulshan, Dhaka', notes: '', created_date: '2026-02-25' },
  { order_id: 'ORD-2026-173', woo_order_id: '#10173', customer_name: 'Shakil Ahmed', customer_phone: '+880 1727 789012', cs_status: 'not_printed', items: [{ sku: 'BLG-TOR-M', sku_name: 'Blue Light Glasses - Tortoise - Medium', quantity: 2, price: 45.00 }], total: 90.00, payment_method: 'SSL Commerz', shipping_address: 'Dhanmondi, Dhaka', notes: '', created_date: '2026-02-25' },
  { order_id: 'ORD-2026-174', woo_order_id: '#10174', customer_name: 'Farzana Islam', customer_phone: '+880 1728 890123', cs_status: 'not_printed', items: [{ sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 1, price: 35.00 }], total: 35.00, payment_method: 'COD', shipping_address: 'Mohammadpur, Dhaka', notes: '', created_date: '2026-02-25' },
  { order_id: 'ORD-2026-175', woo_order_id: '#10175', customer_name: 'Nasir Uddin', customer_phone: '+880 1729 901234', cs_status: 'not_printed', items: [{ sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 1, price: 65.00 }], total: 65.00, payment_method: 'COD', shipping_address: 'Motijheel, Dhaka', notes: '', created_date: '2026-02-25' },
  { order_id: 'ORD-2026-176', woo_order_id: '#10176', customer_name: 'Rehana Khatun', customer_phone: '+880 1730 012345', cs_status: 'not_printed', items: [{ sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', quantity: 3, price: 45.00 }], total: 135.00, payment_method: 'Bkash', shipping_address: 'Tejgaon, Dhaka', notes: '', created_date: '2026-02-25' },
  { order_id: 'ORD-2026-177', woo_order_id: '#10177', customer_name: 'Kamal Hossain', customer_phone: '+880 1731 123456', cs_status: 'not_printed', items: [{ sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 1, price: 35.00 }], total: 35.00, payment_method: 'COD', shipping_address: 'Khilgaon, Dhaka', notes: '', created_date: '2026-02-25' },
  { order_id: 'ORD-2026-178', woo_order_id: '#10178', customer_name: 'Shamima Begum', customer_phone: '+880 1732 234567', cs_status: 'not_printed', items: [{ sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', quantity: 2, price: 45.00 }, { sku: 'CLC-BLU', sku_name: 'Contact Lens Case - Blue', quantity: 2, price: 8.00 }], total: 106.00, payment_method: 'COD', shipping_address: 'Rampura, Dhaka', notes: '', created_date: '2026-02-25' },
  { order_id: 'ORD-2026-179', woo_order_id: '#10179', customer_name: 'Jalal Uddin', customer_phone: '+880 1733 345678', cs_status: 'not_printed', items: [{ sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 2, price: 65.00 }], total: 130.00, payment_method: 'COD', shipping_address: 'Badda, Dhaka', notes: '', created_date: '2026-02-25' },
  { order_id: 'ORD-2026-180', woo_order_id: '#10180', customer_name: 'Asma Khatun', customer_phone: '+880 1734 456789', cs_status: 'not_printed', items: [{ sku: 'BLG-TOR-M', sku_name: 'Blue Light Glasses - Tortoise - Medium', quantity: 1, price: 45.00 }], total: 45.00, payment_method: 'Nagad', shipping_address: 'Malibagh, Dhaka', notes: '', created_date: '2026-02-25' },
  { order_id: 'ORD-2026-181', woo_order_id: '#10181', customer_name: 'Rafiq Islam', customer_phone: '+880 1735 567890', cs_status: 'not_printed', items: [{ sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 3, price: 35.00 }], total: 105.00, payment_method: 'COD', shipping_address: 'Shantinagar, Dhaka', notes: '', created_date: '2026-02-25' },
  { order_id: 'ORD-2026-182', woo_order_id: '#10182', customer_name: 'Salma Begum', customer_phone: '+880 1736 678901', cs_status: 'not_printed', items: [{ sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', quantity: 1, price: 45.00 }], total: 45.00, payment_method: 'COD', shipping_address: 'Paltan, Dhaka', notes: '', created_date: '2026-02-25' },
  { order_id: 'ORD-2026-183', woo_order_id: '#10183', customer_name: 'Aziz Rahman', customer_phone: '+880 1737 789012', cs_status: 'not_printed', items: [{ sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 1, price: 65.00 }], total: 65.00, payment_method: 'Bkash', shipping_address: 'Farmgate, Dhaka', notes: '', created_date: '2026-02-25' },
  // Additional orders for PRINTED status
  { order_id: 'ORD-2026-184', woo_order_id: '#10184', customer_name: 'Monir Hossain', customer_phone: '+880 1738 890123', cs_status: 'printed', items: [{ sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', quantity: 1, price: 45.00 }], total: 45.00, payment_method: 'COD', shipping_address: 'Eskaton, Dhaka', notes: '', created_date: '2026-02-24' },
  { order_id: 'ORD-2026-185', woo_order_id: '#10185', customer_name: 'Rukhsana Parvin', customer_phone: '+880 1739 901234', cs_status: 'printed', items: [{ sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 2, price: 35.00 }], total: 70.00, payment_method: 'COD', shipping_address: 'Purana Paltan, Dhaka', notes: '', created_date: '2026-02-24' },
  { order_id: 'ORD-2026-186', woo_order_id: '#10186', customer_name: 'Shahidul Islam', customer_phone: '+880 1740 012345', cs_status: 'printed', items: [{ sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 1, price: 65.00 }, { sku: 'CLC-BLU', sku_name: 'Contact Lens Case - Blue', quantity: 1, price: 8.00 }], total: 73.00, payment_method: 'SSL Commerz', shipping_address: 'Karwan Bazar, Dhaka', notes: '', created_date: '2026-02-24' },
  { order_id: 'ORD-2026-187', woo_order_id: '#10187', customer_name: 'Nazma Akter', customer_phone: '+880 1741 123456', cs_status: 'printed', items: [{ sku: 'BLG-TOR-M', sku_name: 'Blue Light Glasses - Tortoise - Medium', quantity: 1, price: 45.00 }], total: 45.00, payment_method: 'COD', shipping_address: 'Kawran Bazar, Dhaka', notes: '', created_date: '2026-02-24' },
  { order_id: 'ORD-2026-188', woo_order_id: '#10188', customer_name: 'Delwar Hossain', customer_phone: '+880 1742 234567', cs_status: 'printed', items: [{ sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', quantity: 2, price: 45.00 }], total: 90.00, payment_method: 'COD', shipping_address: 'Panthapath, Dhaka', notes: '', created_date: '2026-02-24' },
  { order_id: 'ORD-2026-189', woo_order_id: '#10189', customer_name: 'Rowshan Ara', customer_phone: '+880 1743 345678', cs_status: 'printed', items: [{ sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 1, price: 35.00 }], total: 35.00, payment_method: 'Bkash', shipping_address: 'Green Road, Dhaka', notes: '', created_date: '2026-02-24' },
  { order_id: 'ORD-2026-190', woo_order_id: '#10190', customer_name: 'Jamal Uddin', customer_phone: '+880 1744 456789', cs_status: 'printed', items: [{ sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 2, price: 65.00 }], total: 130.00, payment_method: 'COD', shipping_address: 'Sat Masjid Road, Dhaka', notes: '', created_date: '2026-02-24' },
  { order_id: 'ORD-2026-191', woo_order_id: '#10191', customer_name: 'Kulsum Begum', customer_phone: '+880 1745 567890', cs_status: 'printed', items: [{ sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', quantity: 1, price: 45.00 }], total: 45.00, payment_method: 'COD', shipping_address: 'Kalabagan, Dhaka', notes: '', created_date: '2026-02-24' },
  { order_id: 'ORD-2026-192', woo_order_id: '#10192', customer_name: 'Rahim Mia', customer_phone: '+880 1746 678901', cs_status: 'printed', items: [{ sku: 'BLG-TOR-M', sku_name: 'Blue Light Glasses - Tortoise - Medium', quantity: 3, price: 45.00 }], total: 135.00, payment_method: 'Nagad', shipping_address: 'Lalmatia, Dhaka', notes: '', created_date: '2026-02-24' },
  { order_id: 'ORD-2026-193', woo_order_id: '#10193', customer_name: 'Shirina Akter', customer_phone: '+880 1747 789012', cs_status: 'printed', items: [{ sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 2, price: 35.00 }], total: 70.00, payment_method: 'COD', shipping_address: 'Jigatola, Dhaka', notes: '', created_date: '2026-02-24' },
  { order_id: 'ORD-2026-194', woo_order_id: '#10194', customer_name: 'Abdul Jabbar', customer_phone: '+880 1748 890123', cs_status: 'printed', items: [{ sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 1, price: 65.00 }], total: 65.00, payment_method: 'COD', shipping_address: 'Basabo, Dhaka', notes: '', created_date: '2026-02-24' },
  { order_id: 'ORD-2026-195', woo_order_id: '#10195', customer_name: 'Taslima Begum', customer_phone: '+880 1749 901234', cs_status: 'printed', items: [{ sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', quantity: 1, price: 45.00 }, { sku: 'CLC-BLU', sku_name: 'Contact Lens Case - Blue', quantity: 2, price: 8.00 }], total: 61.00, payment_method: 'Bkash', shipping_address: 'Matuail, Dhaka', notes: '', created_date: '2026-02-24' },
  { order_id: 'ORD-2026-196', woo_order_id: '#10196', customer_name: 'Hafiz Rahman', customer_phone: '+880 1750 012345', cs_status: 'printed', items: [{ sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', quantity: 2, price: 45.00 }], total: 90.00, payment_method: 'COD', shipping_address: 'Jatrabari, Dhaka', notes: '', created_date: '2026-02-24' },
  { order_id: 'ORD-2026-197', woo_order_id: '#10197', customer_name: 'Rahela Khatun', customer_phone: '+880 1751 123456', cs_status: 'printed', items: [{ sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 1, price: 35.00 }], total: 35.00, payment_method: 'COD', shipping_address: 'Demra, Dhaka', notes: '', created_date: '2026-02-24' },
  { order_id: 'ORD-2026-198', woo_order_id: '#10198', customer_name: 'Sohel Rana', customer_phone: '+880 1752 234567', cs_status: 'printed', items: [{ sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 1, price: 65.00 }], total: 65.00, payment_method: 'SSL Commerz', shipping_address: 'Sayedabad, Dhaka', notes: '', created_date: '2026-02-24' },
  // Additional orders for PACKED status
  { order_id: 'ORD-2026-199', woo_order_id: '#10199', customer_name: 'Shamsul Haque', customer_phone: '+880 1753 345678', cs_status: 'packed', items: [{ sku: 'BLG-TOR-M', sku_name: 'Blue Light Glasses - Tortoise - Medium', quantity: 1, price: 45.00 }], total: 45.00, payment_method: 'COD', shipping_address: 'Mugdapara, Dhaka', notes: '', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-200', woo_order_id: '#10200', customer_name: 'Amena Begum', customer_phone: '+880 1754 456789', cs_status: 'packed', items: [{ sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', quantity: 2, price: 45.00 }], total: 90.00, payment_method: 'Bkash', shipping_address: 'Kamrangirchar, Dhaka', notes: '', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-201', woo_order_id: '#10201', customer_name: 'Nurul Amin', customer_phone: '+880 1755 567890', cs_status: 'packed', items: [{ sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 1, price: 35.00 }], total: 35.00, payment_method: 'COD', shipping_address: 'Lalbagh, Dhaka', notes: '', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-202', woo_order_id: '#10202', customer_name: 'Hasina Akter', customer_phone: '+880 1756 678901', cs_status: 'packed', items: [{ sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 1, price: 65.00 }], total: 65.00, payment_method: 'COD', shipping_address: 'Nawabganj, Dhaka', notes: '', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-203', woo_order_id: '#10203', customer_name: 'Abul Kashem', customer_phone: '+880 1757 789012', cs_status: 'packed', items: [{ sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', quantity: 1, price: 45.00 }, { sku: 'CLC-BLU', sku_name: 'Contact Lens Case - Blue', quantity: 1, price: 8.00 }], total: 53.00, payment_method: 'Nagad', shipping_address: 'Hazaribagh, Dhaka', notes: '', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-204', woo_order_id: '#10204', customer_name: 'Fatema Khatun', customer_phone: '+880 1758 890123', cs_status: 'packed', items: [{ sku: 'BLG-TOR-M', sku_name: 'Blue Light Glasses - Tortoise - Medium', quantity: 2, price: 45.00 }], total: 90.00, payment_method: 'COD', shipping_address: 'Narinda, Dhaka', notes: '', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-205', woo_order_id: '#10205', customer_name: 'Siddique Ahmed', customer_phone: '+880 1759 901234', cs_status: 'packed', items: [{ sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 3, price: 35.00 }], total: 105.00, payment_method: 'Bkash', shipping_address: 'Wari, Dhaka', notes: '', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-206', woo_order_id: '#10206', customer_name: 'Halima Begum', customer_phone: '+880 1760 012345', cs_status: 'packed', items: [{ sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 2, price: 65.00 }], total: 130.00, payment_method: 'COD', shipping_address: 'Gendaria, Dhaka', notes: '', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-207', woo_order_id: '#10207', customer_name: 'Mizanur Rahman', customer_phone: '+880 1761 123456', cs_status: 'packed', items: [{ sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', quantity: 1, price: 45.00 }], total: 45.00, payment_method: 'COD', shipping_address: 'Sutrapur, Dhaka', notes: '', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-208', woo_order_id: '#10208', customer_name: 'Shahinur Akter', customer_phone: '+880 1762 234567', cs_status: 'packed', items: [{ sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', quantity: 2, price: 45.00 }], total: 90.00, payment_method: 'SSL Commerz', shipping_address: 'Kotwali, Dhaka', notes: '', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-209', woo_order_id: '#10209', customer_name: 'Mosharraf Hossain', customer_phone: '+880 1763 345678', cs_status: 'packed', items: [{ sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 1, price: 35.00 }], total: 35.00, payment_method: 'COD', shipping_address: 'Bangshal, Dhaka', notes: '', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-210', woo_order_id: '#10210', customer_name: 'Ayesha Siddika', customer_phone: '+880 1764 456789', cs_status: 'packed', items: [{ sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 1, price: 65.00 }], total: 65.00, payment_method: 'Bkash', shipping_address: 'Chawkbazar, Dhaka', notes: '', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-211', woo_order_id: '#10211', customer_name: 'Hanif Mia', customer_phone: '+880 1765 567890', cs_status: 'packed', items: [{ sku: 'BLG-TOR-M', sku_name: 'Blue Light Glasses - Tortoise - Medium', quantity: 1, price: 45.00 }, { sku: 'CLC-BLU', sku_name: 'Contact Lens Case - Blue', quantity: 2, price: 8.00 }], total: 61.00, payment_method: 'COD', shipping_address: 'Islampur, Dhaka', notes: '', created_date: '2026-02-23' },
  // Additional orders for SEND TO LAB status  
  { order_id: 'ORD-2026-212', woo_order_id: '#10212', customer_name: 'Zobeda Khatun', customer_phone: '+880 1766 678901', cs_status: 'send_to_lab', items: [{ sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', quantity: 1, price: 45.00, attributes: { 'Prescription': 'Custom' } }], total: 45.00, payment_method: 'COD', shipping_address: 'Laxmibazar, Dhaka', notes: 'Send to lab for prescription lenses', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-213', woo_order_id: '#10213', customer_name: 'Altaf Hossain', customer_phone: '+880 1767 789012', cs_status: 'send_to_lab', items: [{ sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 1, price: 35.00, attributes: { 'Prescription': 'Custom' } }], total: 35.00, payment_method: 'Nagad', shipping_address: 'Sadarghat, Dhaka', notes: 'Progressive lenses required', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-214', woo_order_id: '#10214', customer_name: 'Morsheda Begum', customer_phone: '+880 1768 890123', cs_status: 'send_to_lab', items: [{ sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 1, price: 65.00, attributes: { 'Prescription': 'Custom' } }], total: 65.00, payment_method: 'COD', shipping_address: 'Armanitola, Dhaka', notes: 'Prescription sunglasses', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-215', woo_order_id: '#10215', customer_name: 'Shahabuddin Ahmed', customer_phone: '+880 1769 901234', cs_status: 'send_to_lab', items: [{ sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', quantity: 2, price: 45.00, attributes: { 'Prescription': 'Custom' } }], total: 90.00, payment_method: 'Bkash', shipping_address: 'Postogola, Dhaka', notes: 'Blue light filter with prescription', created_date: '2026-02-23' },
  { order_id: 'ORD-2026-216', woo_order_id: '#10216', customer_name: 'Nasrin Sultana', customer_phone: '+880 1770 012345', cs_status: 'send_to_lab', items: [{ sku: 'BLG-TOR-M', sku_name: 'Blue Light Glasses - Tortoise - Medium', quantity: 1, price: 45.00, attributes: { 'Prescription': 'Custom' } }], total: 45.00, payment_method: 'COD', shipping_address: 'Kamalapur, Dhaka', notes: 'High index lenses needed', created_date: '2026-02-22' },
  { order_id: 'ORD-2026-217', woo_order_id: '#10217', customer_name: 'Kabir Hossain', customer_phone: '+880 1771 123456', cs_status: 'send_to_lab', items: [{ sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 1, price: 35.00, attributes: { 'Prescription': 'Custom' } }], total: 35.00, payment_method: 'SSL Commerz', shipping_address: 'Fakirapul, Dhaka', notes: 'Bifocal lenses', created_date: '2026-02-22' },
  { order_id: 'ORD-2026-218', woo_order_id: '#10218', customer_name: 'Rahima Begum', customer_phone: '+880 1772 234567', cs_status: 'send_to_lab', items: [{ sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 1, price: 65.00, attributes: { 'Prescription': 'Custom' } }], total: 65.00, payment_method: 'COD', shipping_address: 'Rajarbagh, Dhaka', notes: 'Transition lenses', created_date: '2026-02-22' },
  { order_id: 'ORD-2026-219', woo_order_id: '#10219', customer_name: 'Belal Uddin', customer_phone: '+880 1773 345678', cs_status: 'send_to_lab', items: [{ sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', quantity: 1, price: 45.00, attributes: { 'Prescription': 'Custom' } }], total: 45.00, payment_method: 'Bkash', shipping_address: 'Segunbagicha, Dhaka', notes: 'Anti-glare coating', created_date: '2026-02-22' },
  { order_id: 'ORD-2026-220', woo_order_id: '#10220', customer_name: 'Parvin Akter', customer_phone: '+880 1774 456789', cs_status: 'send_to_lab', items: [{ sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', quantity: 1, price: 45.00, attributes: { 'Prescription': 'Custom' } }], total: 45.00, payment_method: 'COD', shipping_address: 'Malibagh, Dhaka', notes: 'Single vision lenses', created_date: '2026-02-22' },
  { order_id: 'ORD-2026-221', woo_order_id: '#10221', customer_name: 'Shafiq Ahmed', customer_phone: '+880 1775 567890', cs_status: 'send_to_lab', items: [{ sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 2, price: 35.00, attributes: { 'Prescription': 'Custom' } }], total: 70.00, payment_method: 'Nagad', shipping_address: 'Moghbazar, Dhaka', notes: 'Two pairs with different prescriptions', created_date: '2026-02-22' },
];

// ─── Auto-assign CS people to orders ─────────────────────────────────────────
// Uses a deterministic 60/40 split: indices 0,1,2 → Sarah Chen; 3,4 → Rania Islam (per 5)
// A few orders are given a "confirmed_by" different from assigned to simulate coverage
const _csSlots = [
  { userId: 'user2', name: 'Sarah Chen' }, // slot 0,1,2
  { userId: 'user2', name: 'Sarah Chen' },
  { userId: 'user2', name: 'Sarah Chen' },
  { userId: 'user6', name: 'Rania Islam' }, // slot 3,4
  { userId: 'user6', name: 'Rania Islam' },
];
// IDs of orders where coverage occurred (Rania covered for Sarah or vice versa)
const _coverageMap: Record<string, string> = {
  'ORD-2026-159': 'Rania Islam', // Rania covered
  'ORD-2026-168': 'Sarah Chen',  // Sarah covered
  'ORD-2026-178': 'Rania Islam',
  'ORD-2026-195': 'Sarah Chen',
  'ORD-2026-213': 'Rania Islam',
};
orders.forEach((order, index) => {
  const slot = _csSlots[index % 5];
  order.assigned_to = slot.userId;
  order.assigned_to_name = slot.name;
  if (_coverageMap[order.order_id]) {
    order.confirmed_by = _coverageMap[order.order_id];
  }
});

export const returns: Return[] = [
  {
    return_id: 'RET-2026-012',
    order_id: 'ORD-2026-145',
    status: 'restocked',
    reason: 'Customer changed mind',
    courier: 'Aramex',
    expected_date: '2026-02-10',
    received_date: '2026-02-12',
    items: [
      { sku: 'SUN-AVT-M', sku_name: 'Sunglasses - Aviator - Medium', quantity: 1, qc_status: 'passed', lot_id: 'LOT-004' },
    ],
  },
  {
    return_id: 'RET-2026-013',
    order_id: 'ORD-2026-148',
    status: 'expected',
    reason: 'Wrong size delivered',
    courier: 'FedEx',
    expected_date: '2026-02-19',
    items: [
      { sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', quantity: 1 },
    ],
  },
  {
    return_id: 'RET-2026-014',
    order_id: 'ORD-2026-151',
    status: 'received',
    reason: 'Product damaged in transit',
    courier: 'Aramex',
    expected_date: '2026-02-15',
    received_date: '2026-02-16',
    items: [
      { sku: 'RDG-GLD-1.5', sku_name: 'Reading Glasses - Gold - +1.5', quantity: 1, qc_status: 'failed' },
    ],
  },
];

export const expenses: Expense[] = [
  { expense_id: 'EXP-001', category: 'Advertising', amount: 15000, date: '2026-02-01', affects_profit: true, description: 'Google Ads - February campaign', reference: 'INV-GA-202602' },
  { expense_id: 'EXP-002', category: 'Salaries', amount: 45000, date: '2026-02-01', affects_profit: true, description: 'Staff salaries - February', reference: 'PAY-202602' },
  { expense_id: 'EXP-003', category: 'Rent', amount: 8000, date: '2026-02-01', affects_profit: true, description: 'Warehouse rent - February', reference: 'RENT-202602' },
  { expense_id: 'EXP-004', category: 'Courier', amount: 3240, date: '2026-02-15', affects_profit: true, description: 'Aramex shipping fees - first half Feb', reference: 'INV-ARX-0215' },
  { expense_id: 'EXP-005', category: 'Payment Gateway', amount: 1250, date: '2026-02-10', affects_profit: true, description: 'Credit card processing fees', reference: 'INV-STRIPE-202602' },
  { expense_id: 'EXP-006', category: 'Utilities', amount: 850, date: '2026-02-05', affects_profit: true, description: 'Electricity and water - February', reference: 'UTIL-202602' },
];

export let warehouseLocations: WarehouseLocation[] = [
  { location_id: 'WL-001', warehouse_id: 'WH-001', warehouse_name: 'Main Warehouse', location_name: 'A-12', barcode: 'LOC-A12-001', capacity: 100, current_stock: 87, created_date: '2025-12-01' },
  { location_id: 'WL-002', warehouse_id: 'WH-001', warehouse_name: 'Main Warehouse', location_name: 'A-13', barcode: 'LOC-A13-002', capacity: 100, current_stock: 124, created_date: '2025-12-01' },
  { location_id: 'WL-003', warehouse_id: 'WH-001', warehouse_name: 'Main Warehouse', location_name: 'A-14', barcode: 'LOC-A14-003', capacity: 100, current_stock: 48, created_date: '2025-12-01' },
  { location_id: 'WL-004', warehouse_id: 'WH-001', warehouse_name: 'Main Warehouse', location_name: 'B-05', barcode: 'LOC-B05-004', capacity: 100, current_stock: 45, created_date: '2025-12-01' },
  { location_id: 'WL-005', warehouse_id: 'WH-001', warehouse_name: 'Main Warehouse', location_name: 'C-08', barcode: 'LOC-C08-005', capacity: 100, current_stock: 12, created_date: '2025-12-01' },
  { location_id: 'WL-006', warehouse_id: 'WH-001', warehouse_name: 'Main Warehouse', location_name: 'D-02', barcode: 'LOC-D02-006', capacity: 100, current_stock: 156, created_date: '2025-12-01' },
];

export let warehouses: Warehouse[] = [
  { warehouse_id: 'WH-001', name: 'Main Warehouse', address: 'Dubai Industrial Park, UAE', created_date: '2025-11-01' },
  { warehouse_id: 'WH-002', name: 'Secondary Storage', address: 'Sharjah Warehouse District, UAE', created_date: '2025-12-15' },
];

export let suppliers: Supplier[] = [
  {
    supplier_id: 'SUP-001',
    initial: 'VSC',
    company_name: 'Vision Supply Co.',
    email: 'orders@visionsupply.com',
    phone: '+86 138 0013 4567',
    alibaba_url: 'https://visionsupply.en.alibaba.com',
    alipay_chinese_name: '视觉供应有限公司',
    alipay_email: 'payment@visionsupply.com',
    created_date: '2025-10-01',
    catalogs: [
      { catalog_id: 'CAT-001', file_name: '2026-Spring-Catalog.pdf', file_url: '#', upload_date: '2026-01-15', notes: 'New spring collection' },
      { catalog_id: 'CAT-002', file_name: '2025-Winter-Products.pdf', file_url: '#', upload_date: '2025-11-20' },
    ],
  },
  {
    supplier_id: 'SUP-002',
    initial: 'EIL',
    company_name: 'Eyewear Imports Ltd.',
    email: 'sales@eyewearimports.cn',
    phone: '+86 755 8899 1234',
    alibaba_url: 'https://eyewearimports.en.alibaba.com',
    wechat_chinese_name: '眼镜进口有限公司',
    wechat_number: 'eyewear_imports',
    alipay_email: 'finance@eyewearimports.cn',
    created_date: '2025-09-15',
    catalogs: [
      { catalog_id: 'CAT-003', file_name: 'Premium-Sunglasses-2026.pdf', file_url: '#', upload_date: '2026-02-01', notes: 'High-end aviator collection' },
    ],
  },
];

export let inventoryAudits: InventoryAudit[] = [
  {
    audit_id: 'AUD-001',
    audit_date: '2026-02-18',
    locations: ['A-12', 'A-13'],
    status: 'completed',
    audited_by: 'Mike Johnson',
    items: [
      { sku: 'BLG-BLK-M', sku_name: 'Blue Light Glasses - Black - Medium', location: 'A-12', expected_quantity: 87, counted_quantity: 87, difference: 0 },
      { sku: 'BLG-BLK-L', sku_name: 'Blue Light Glasses - Black - Large', location: 'A-13', expected_quantity: 124, counted_quantity: 122, difference: -2 },
    ],
  },
];

// Helper function to update SKU data
export const updateSKU = (sku: string, updates: Partial<SKU>) => {
  const index = skus.findIndex(s => s.sku === sku);
  if (index !== -1) {
    skus[index] = { ...skus[index], ...updates };
  }
};

// Helper function to add warehouse location
export const addWarehouseLocation = (location: WarehouseLocation) => {
  warehouseLocations.push(location);
};

// Helper function to update warehouse location
export const updateWarehouseLocation = (location_id: string, updates: Partial<WarehouseLocation>) => {
  const index = warehouseLocations.findIndex(l => l.location_id === location_id);
  if (index !== -1) {
    warehouseLocations[index] = { ...warehouseLocations[index], ...updates };
  }
};

// Helper function to add warehouse
export const addWarehouse = (warehouse: Warehouse) => {
  warehouses.push(warehouse);
};

// Helper function to add supplier
export const addSupplier = (supplier: Supplier) => {
  suppliers.push(supplier);
};

// Helper function to update supplier
export const updateSupplier = (supplier_id: string, updates: Partial<Supplier>) => {
  const index = suppliers.findIndex(s => s.supplier_id === supplier_id);
  if (index !== -1) {
    suppliers[index] = { ...suppliers[index], ...updates };
  }
};

// Helper function to add catalog to supplier
export const addCatalogToSupplier = (supplier_id: string, catalog: SupplierCatalog) => {
  const supplier = suppliers.find(s => s.supplier_id === supplier_id);
  if (supplier) {
    supplier.catalogs.push(catalog);
  }
};

// Helper function to remove catalog from supplier
export const removeCatalogFromSupplier = (supplier_id: string, catalog_id: string) => {
  const supplier = suppliers.find(s => s.supplier_id === supplier_id);
  if (supplier) {
    supplier.catalogs = supplier.catalogs.filter(c => c.catalog_id !== catalog_id);
  }
};

// Helper function to add inventory audit
export const addInventoryAudit = (audit: InventoryAudit) => {
  inventoryAudits.push(audit);
};

// Helper function to update inventory audit
export const updateInventoryAudit = (audit_id: string, updates: Partial<InventoryAudit>) => {
  const index = inventoryAudits.findIndex(a => a.audit_id === audit_id);
  if (index !== -1) {
    inventoryAudits[index] = { ...inventoryAudits[index], ...updates };
  }
};

// Helper function to update location stock
export const updateLocationStock = (location_id: string, quantityChange: number) => {
  const index = warehouseLocations.findIndex(l => l.location_id === location_id);
  if (index !== -1) {
    warehouseLocations[index].current_stock += quantityChange;
    // Ensure stock doesn't go negative
    if (warehouseLocations[index].current_stock < 0) {
      warehouseLocations[index].current_stock = 0;
    }
  }
};

// Helper function to get recommended location for a SKU
export const getRecommendedLocation = (sku: string, quantity: number) => {
  // Find existing locations where this SKU is stored
  const existingLotsForSKU = lots.filter(lot => lot.sku === sku && lot.remaining_quantity > 0);
  const existingLocations = [...new Set(existingLotsForSKU.map(lot => lot.location))];
  
  // Strategy: Keep same items together for faster picking
  // 1. First, try to find a location that already has this SKU with enough capacity
  if (existingLocations.length > 0) {
    for (const locName of existingLocations) {
      const location = warehouseLocations.find(l => l.location_name === locName);
      if (location) {
        const availableCapacity = location.capacity - location.current_stock;
        if (availableCapacity >= quantity) {
          return {
            location_id: location.location_id,
            location_name: location.location_name,
            barcode: location.barcode,
            reason: `Same product already stored here (${location.current_stock}/${location.capacity} units)`,
            available_capacity: availableCapacity,
            proximity_score: 10, // Highest score - same product
          };
        }
      }
    }
  }
  
  // 2. If no exact match, find nearby locations (same aisle/zone)
  if (existingLocations.length > 0) {
    const primaryLocation = existingLocations[0];
    const zone = primaryLocation.split('-')[0]; // e.g., 'A' from 'A-12'
    
    const nearbyLocations = warehouseLocations
      .filter(l => {
        const lZone = l.location_name.split('-')[0];
        return lZone === zone && !existingLocations.includes(l.location_name);
      })
      .map(l => ({
        ...l,
        available_capacity: l.capacity - l.current_stock,
      }))
      .filter(l => l.available_capacity >= quantity)
      .sort((a, b) => b.available_capacity - a.available_capacity);
    
    if (nearbyLocations.length > 0) {
      const best = nearbyLocations[0];
      return {
        location_id: best.location_id,
        location_name: best.location_name,
        barcode: best.barcode,
        reason: `Near existing stock (Zone ${zone}) - optimizes picking`,
        available_capacity: best.available_capacity,
        proximity_score: 8,
      };
    }
  }
  
  // 3. Find any location with enough capacity, prioritize those with more space
  const availableLocations = warehouseLocations
    .map(l => ({
      ...l,
      available_capacity: l.capacity - l.current_stock,
    }))
    .filter(l => l.available_capacity >= quantity)
    .sort((a, b) => b.available_capacity - a.available_capacity);
  
  if (availableLocations.length > 0) {
    const best = availableLocations[0];
    return {
      location_id: best.location_id,
      location_name: best.location_name,
      barcode: best.barcode,
      reason: `Available capacity: ${best.available_capacity} units`,
      available_capacity: best.available_capacity,
      proximity_score: 5,
    };
  }
  
  // 4. No suitable location found
  return null;
};

export { skus }

export { currentUser }

export { inventoryAudits, warehouseLocations }

export { suppliers }

export { warehouses }

export { csAssignmentConfigs }