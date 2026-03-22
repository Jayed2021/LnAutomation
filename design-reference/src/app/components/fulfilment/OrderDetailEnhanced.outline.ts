// Enhanced Order Detail Component Outline
// This document outlines the complete structure for the Order Detail view with FIFO picking

/**
 * ENHANCED ORDER DETAIL VIEW - STRUCTURE
 * =======================================
 * 
 * PURPOSE:
 * This view integrates FIFO inventory management with order fulfillment operations,
 * ensuring accurate profit tracking and streamlined warehouse operations.
 * 
 * KEY FEATURES:
 * 1. FIFO-based lot assignment for all order items
 * 2. Warehouse location display for easy picking
 * 3. Integrated barcode scanning for pick verification
 * 4. Pick discrepancy logging and notifications
 * 5. Invoice generation with picking list
 * 6. Activity tracking for each order
 * 
 * WORKFLOW STAGES:
 * ================
 * 
 * Stage 1: NOT PRINTED
 * - Show order details with FIFO-assigned lots
 * - Display "Print Invoice" button
 * - Invoice includes picking list with barcodes and locations
 * 
 * Stage 2: PRINTED
 * - Invoice has been printed
 * - Show "Start Pick" button
 * - Opens Pick Modal for barcode scanning
 * - System validates each scanned item against FIFO recommendation
 * 
 * Stage 3: PICKED (Ready to Pack)
 * - All items have been picked and verified
 * - Show "Mark as Packed" button
 * - Display picked lot information for each item
 * - Flag any FIFO violations
 * 
 * Stage 4: PACKED
 * - Order is ready for courier handoff
 * - Show "Mark as Shipped" button
 * - Select courier and enter tracking number
 * 
 * Stage 5: SHIPPED
 * - Order has been dispatched
 * - Display shipping information
 * - Track delivery status
 * 
 * COMPONENT STRUCTURE:
 * ===================
 * 
 * OrderDetailEnhanced Component:
 * 
 * 1. Header Section (Compact):
 *    - Order ID, WooCommerce ID
 *    - Status Badge
 *    - Action Buttons:
 *      - Call Customer
 *      - Edit Order
 *      - Print Invoice (if not_printed)
 *      - Start Pick (if printed)
 *      - Mark as Packed (if picked)
 *      - Mark as Shipped (if packed)
 * 
 * 2. Three-Column Layout:
 *    
 *    Column 1: Customer Information
 *    - Name, Phone, Email
 *    - Shipping Address, District
 *    - Call History (expandable)
 *    - SMS Quick Actions
 *    
 *    Column 2: Courier & Payment
 *    - Payment Method & Status
 *    - Payment Reference
 *    - Total Receivable (highlighted if COD)
 *    - Courier Company & Area
 *    - Tracking Number
 *    
 *    Column 3: Order Status & Source
 *    - Current Status
 *    - Order Source (Website/Facebook/WhatsApp)
 *    - Created Date
 *    - Last Updated
 *    - Special Flags (Late Delivery, Custom Prescription, etc.)
 * 
 * 3. Order Items Section (Enhanced with FIFO):
 *    
 *    Table Columns:
 *    - Item # | Product Name | SKU | Qty | Price | Subtotal
 *    - Recommended Lot (FIFO) | Location | Status
 *    
 *    For each item, show:
 *    - Product details and attributes
 *    - Recommended lot barcode (e.g., BLG-BLK-M_MQ01)
 *    - Warehouse location (e.g., A-12)
 *    - Pick status:
 *      - Not Picked (gray)
 *      - Picked - Correct Lot (green checkmark)
 *      - Picked - Different Lot (yellow warning with lot info)
 *    
 *    Bottom Summary:
 *    - Items Subtotal
 *    - Shipping Fee
 *    - Discount
 *    - Total
 * 
 * 4. Picking Information Panel (Conditional Display):
 *    
 *    When status = 'not_printed':
 *    - Show FIFO recommendations summary
 *    - "Items are ready to be picked from these locations"
 *    
 *    When status = 'printed':
 *    - Show "Start Pick" button (large, prominent)
 *    - Instructions: "Click to open pick modal and scan barcodes"
 *    
 *    When status = 'picked' (custom status):
 *    - Show pick summary
 *    - List any FIFO violations
 *    - Display "Mark as Packed" button
 * 
 * 5. Activity Log:
 *    - Chronological list of all actions
 *    - Order created
 *    - Customer called
 *    - Invoice printed
 *    - Pick started/completed
 *    - Pick discrepancies logged
 *    - Packed
 *    - Shipped
 *    - Each entry shows timestamp, user, and details
 * 
 * 6. Notes Section:
 *    - Customer notes
 *    - Internal notes
 *    - Special handling instructions
 * 
 * PICK MODAL:
 * ===========
 * (See PickModal.tsx component)
 * 
 * Features:
 * - Step-by-step item scanning
 * - Progress bar
 * - Current item highlight with:
 *   - Product name and image
 *   - Recommended lot barcode (large, bold)
 *   - Warehouse location (prominent)
 * - Barcode input field (auto-focus)
 * - Scan validation:
 *   - Exact match: Green checkmark, auto-advance
 *   - Same SKU, different lot: Yellow warning with options
 *   - Wrong item: Red error, must try again
 * - Error handling with two options:
 *   - "Try Again" - rescan
 *   - "Just Pick" - accept different lot and log discrepancy
 * - Completion summary
 * 
 * INVOICE COMPONENT:
 * ==================
 * (See Invoice.tsx component)
 * 
 * Features:
 * - Standard invoice header with company info
 * - Customer details
 * - Order items table with FIFO information:
 *   - Product, SKU, Qty, Price
 *   - Lot Barcode (highlighted)
 *   - Warehouse Location (prominent)
 * - Picking instructions box
 * - Payment information (COD warning if applicable)
 * - Print-friendly layout
 * - Signature lines for packed by / checked by
 * 
 * FIFO LOGIC IMPLEMENTATION:
 * ==========================
 * (See utils/fifoLogic.ts)
 * 
 * Functions:
 * 
 * 1. getRecommendedLotForSKU(sku, quantity):
 *    - Finds all lots for SKU with available stock
 *    - Sorts by received_date (oldest first)
 *    - Returns lot with barcode format: SKU_SHIPMENT
 *    - Returns location
 * 
 * 2. assignRecommendedLotsToOrder(orderItems):
 *    - For each item in order, calls getRecommendedLotForSKU
 *    - Adds recommended_lot and recommended_location to item
 *    - Returns enhanced order items
 * 
 * 3. validateScannedBarcode(scanned, recommended, sku):
 *    - Checks if scanned matches recommended (exact match)
 *    - Checks if scanned is same SKU but different lot
 *    - Returns validation result with message
 * 
 * DATA STRUCTURES:
 * ================
 * 
 * Enhanced OrderItem:
 * {
 *   sku: string;
 *   sku_name: string;
 *   quantity: number;
 *   price: number;
 *   attributes?: Record<string, string>;
 *   recommended_lot?: string;      // FIFO lot barcode
 *   recommended_location?: string;  // Warehouse location
 *   picked_lot?: string;            // Actually picked lot
 *   picked_barcode?: string;        // Scanned barcode
 *   pick_discrepancy?: boolean;     // True if different from recommended
 * }
 * 
 * PickLog:
 * {
 *   log_id: string;
 *   order_id: string;
 *   order_woo_id: string;
 *   sku: string;
 *   sku_name: string;
 *   recommended_lot: string;
 *   picked_lot: string;
 *   picked_barcode: string;
 *   picked_by: string;
 *   picked_date: string;
 *   discrepancy: boolean;
 *   reason?: string;
 * }
 * 
 * PickNotification:
 * {
 *   notification_id: string;
 *   order_id: string;
 *   order_woo_id: string;
 *   type: 'pick_discrepancy';
 *   message: string;
 *   created_date: string;
 *   read: boolean;
 *   severity: 'warning' | 'info';
 * }
 * 
 * BARCODE FORMAT:
 * ===============
 * 
 * Format: {SKU}_{SHIPMENT_NAME}
 * Examples:
 * - BLG-BLK-M_MQ01
 * - RDG-GLD-1.5_MQ02
 * - SUN-AVT-M_MQ01
 * 
 * This format ensures:
 * - Easy scanning and matching
 * - Clear identification of which shipment/lot
 * - Traceability for returns
 * 
 * RETURNS TRACKING:
 * =================
 * 
 * When order is returned:
 * - System shows which specific lot barcode was picked
 * - Can trace back to original shipment
 * - If barcode label is missing, can reprint based on picked_lot
 * - Helps identify quality issues by shipment
 * 
 * NOTIFICATIONS SYSTEM:
 * ====================
 * 
 * Admin/Manager Dashboard shows:
 * - Count of pick discrepancies today/this week
 * - List of orders with FIFO violations
 * - Which items were picked from wrong lots
 * - Which users have highest discrepancy rates
 * 
 * This helps identify:
 * - Training needs
 * - Inventory organization issues
 * - Systematic problems with specific locations
 * 
 * TRAINING SIMPLICITY:
 * ====================
 * 
 * For warehouse staff:
 * 
 * 1. Print invoice (automatically shows what to pick)
 * 2. Click "Start Pick"
 * 3. For each item:
 *    a. Go to the location shown
 *    b. Find the item with the barcode shown
 *    c. Scan the barcode
 *    d. System says ✓ or ✗
 * 4. If system says wrong item, you can:
 *    - Try scanning again, OR
 *    - Click "Just Pick" to use different lot (manager notified)
 * 5. When all items scanned, click "Complete"
 * 6. Order moves to "Ready to Pack"
 * 
 * Clear, simple, error-proof.
 */

export const OrderDetailEnhancedOutline = `
This file serves as a comprehensive specification for the enhanced order detail view
with integrated FIFO picking operations. See above for complete structure.
`;
