# PICKING SYSTEM - DESIGN SPECIFICATION

## Executive Summary

This document outlines the complete design for a FIFO (First-In-First-Out) based picking system integrated with order fulfillment operations. The system ensures accurate profit tracking, streamlines warehouse operations, and is designed for easy training with minimal errors.

---

## 1. SYSTEM OVERVIEW

### Key Objectives
- **Accurate Profit Data**: Track which inventory lot is used for each order
- **FIFO Compliance**: Ensure oldest inventory is sold first
- **Error Prevention**: Barcode scanning validates correct items are picked
- **Simple Training**: Operations staff can learn in ~1 hour
- **Full Traceability**: Track exact items used for returns and quality issues

---

## 2. WORKFLOW STAGES

### Stage 1: NOT PRINTED
**View**: Order detail with FIFO assignments  
**Actions**: 
- System automatically assigns oldest lot (FIFO) to each order item
- Displays lot barcode format: `SKU_SHIPMENT` (e.g., `BLG-BLK-M_MQ01`)
- Shows warehouse location for each item (e.g., `A-12`)
- **Button**: "Print Invoice"

**Invoice Includes**:
- Standard invoice information
- **Picking List** with:
  - Product name and SKU  
  - Lot barcode to scan (highlighted in green box)
  - Warehouse location (prominent with icon)
  - Quantity needed
- Picking instructions
- Signature lines

---

### Stage 2: PRINTED
**View**: Order with printed status  
**Actions**:
- **Button**: "Start Pick" (opens Pick Modal)
- Modal guides user through scanning each item
- Real-time validation of scanned barcodes

---

### Stage 3: PICK MODAL WORKFLOW

#### Interface Design
```
┌─────────────────────────────────────────────┐
│  Pick Items for Order #10157               │
│  Scan each item's barcode to confirm       │
├─────────────────────────────────────────────┤
│  Progress: [████████░░░░] 2/3 items picked │
├─────────────────────────────────────────────┤
│  Items to Pick:                            │
│  ✓ 2x Blue Light Glasses - Black - M      │
│  → 1x Reading Glasses - Gold - +1.5  [Current]│
│  ○ 1x Sunglasses - Aviator - Medium       │
├─────────────────────────────────────────────┤
│  CURRENT ITEM (2/3)                        │
│  ┌───────────────────────────────────────┐ │
│  │ Product: Reading Glasses - Gold - +1.5│ │
│  │ SKU: RDG-GLD-1.5  │  Qty: 1  │ ৳35.00│ │
│  │                                        │ │
│  │ ╔════ Recommended Lot (FIFO) ═════╗  │ │
│  │ ║ Barcode: RDG-GLD-1.5_MQ01       ║  │ │
│  │ ║ Location: 📍 B-05                ║  │ │
│  │ ╚══════════════════════════════════╝  │ │
│  └───────────────────────────────────────┘ │
│                                            │
│  🔍 Scan Barcode:                         │
│  [________________________] [Scan Button]  │
│                                            │
│  💡 Go to location B-05 and scan          │
│      barcode: RDG-GLD-1.5_MQ01            │
└─────────────────────────────────────────────┘
```

#### Scanning Logic

**Scenario A: Exact Match**
- User scans: `RDG-GLD-1.5_MQ01`
- System validates: ✓ Correct!
- Result: Green checkmark, auto-advance to next item
- Logged: Correct FIFO pick

**Scenario B: Same SKU, Different Lot**
- User scans: `RDG-GLD-1.5_MQ02` (wrong shipment)
- System detects: Same SKU but not recommended lot
- Shows error:
```
┌─────────────────────────────────────────┐
│ ⚠️ Scan Error                           │
│                                         │
│ Different lot scanned. This is not     │
│ the recommended FIFO lot.              │
│                                         │
│ [Try Again]  [Just Pick (Log Discrepancy)]│
│                                         │
│ ℹ️ Choosing "Just Pick" will log this │
│   as a FIFO violation and notify       │
│   managers.                             │
└─────────────────────────────────────────┘
```

**User Options**:
1. **Try Again**: Clear input, allow rescan
2. **Just Pick**: Accept different lot, log discrepancy

**Scenario C: Wrong Item Entirely**
- User scans: `BLG-BLK-M_MQ01` (completely different SKU)
- System shows error: "Wrong item scanned! This does not match the order."
- Only option: Try Again (must scan correct SKU)

---

### Stage 4: PICK COMPLETION
**When all items scanned**:
```
┌─────────────────────────────────────────┐
│        ✓ All Items Picked!              │
│                                         │
│    Order is ready for packing          │
│                                         │
│ [Complete Pick Operation - Large Button]│
└─────────────────────────────────────────┘
```

**System Actions**:
- Updates order status to "Ready for Pack"
- Saves picked_lot for each item
- Flags any discrepancies
- Creates pick log entries
- Sends notifications to managers if discrepancies exist

---

### Stage 5: PACKED
**View**: Order with all items picked  
**Actions**:
- Shows picked lot information
- Displays any FIFO violations with yellow badge
- **Button**: "Mark as Packed"

---

### Stage 6: SHIPPED
**View**: Order ready for courier  
**Actions**:
- Enter courier information
- Enter tracking number
- **Button**: "Mark as Shipped"

---

## 3. DATA STRUCTURES

### Enhanced OrderItem
```typescript
interface OrderItem {
  sku: string;                    // Product SKU
  sku_name: string;               // Product name
  quantity: number;               // Quantity ordered
  price: number;                  // Unit price
  attributes?: Record<string, string>; // Product attributes
  
  // FIFO System Fields
  recommended_lot?: string;       // FIFO lot barcode (e.g., "BLG-BLK-M_MQ01")
  recommended_location?: string;  // Warehouse location (e.g., "A-12")
  picked_lot?: string;            // Actually picked lot (if different)
  picked_barcode?: string;        // Scanned barcode
  pick_discrepancy?: boolean;     // True if different from recommended
}
```

### PickLog
```typescript
interface PickLog {
  log_id: string;                 // Unique log identifier
  order_id: string;               // Order ID
  order_woo_id: string;           // WooCommerce order number
  sku: string;                    // Product SKU
  sku_name: string;               // Product name
  recommended_lot: string;        // What should have been picked
  picked_lot: string;             // What was actually picked
  picked_barcode: string;         // Scanned barcode
  picked_by: string;              // User who picked
  picked_date: string;            // Date/time of pick
  discrepancy: boolean;           // FIFO violation flag
  reason?: string;                // Why different lot was used
}
```

### PickNotification
```typescript
interface PickNotification {
  notification_id: string;
  order_id: string;
  order_woo_id: string;
  type: 'pick_discrepancy';
  message: string;                // e.g., "Order #10157: Wrong lot picked for RDG-GLD-1.5"
  created_date: string;
  read: boolean;
  severity: 'warning' | 'info';
}
```

---

## 4. FIFO LOGIC IMPLEMENTATION

### Function: `getRecommendedLotForSKU(sku, quantity)`

**Purpose**: Find the oldest available lot for a SKU

**Algorithm**:
1. Query all lots where:
   - `lot.sku === sku`
   - `lot.remaining_quantity > 0`
2. Sort by `received_date` ascending (oldest first)
3. Select first lot (oldest)
4. Lookup PO name from `purchaseOrders` table
5. Generate barcode: `{SKU}_{PO_NAME}`
6. Return: lot object, barcode, location

**Example**:
```typescript
// Input: SKU = "RDG-GLD-1.5", Quantity = 1

// System finds:
// LOT-003: received 2026-01-20, remaining: 45, PO: MQ01, location: B-05
// LOT-015: received 2026-02-10, remaining: 30, PO: MQ02, location: B-06

// Returns oldest:
{
  lot: LOT-003,
  barcode: "RDG-GLD-1.5_MQ01",
  po_name: "MQ01",
  location: "B-05"
}
```

---

### Function: `assignRecommendedLotsToOrder(orderItems)`

**Purpose**: Assign FIFO lots to all items in an order

**Algorithm**:
1. For each item in order:
   - Call `getRecommendedLotForSKU(item.sku, item.quantity)`
   - Add `recommended_lot` to item
   - Add `recommended_location` to item
2. Return enhanced order items

**Used When**:
- Order detail page loads
- Invoice is generated
- Pick modal opens

---

### Function: `validateScannedBarcode(scanned, recommended, sku)`

**Purpose**: Validate barcode scan during pick operation

**Algorithm**:
1. **Exact Match Check**:
   - If `scanned === recommended`: Return valid, exactMatch
2. **Same SKU Check**:
   - Extract SKU from scanned barcode: `scanned.split('_')[0]`
   - If extracted SKU === order SKU: Return valid, notExactMatch
3. **Wrong Item**:
   - Return invalid

**Returns**:
```typescript
{
  valid: boolean,
  exactMatch: boolean,
  message: string
}
```

---

## 5. BARCODE FORMAT

### Standard Format
```
{SKU}_{SHIPMENT_NAME}
```

### Examples
- `BLG-BLK-M_MQ01` - Blue Light Glasses, Black, Medium, Shipment MQ01
- `RDG-GLD-1.5_MQ02` - Reading Glasses, Gold, +1.5, Shipment MQ02
- `SUN-AVT-M_MQ01` - Sunglasses, Aviator, Medium, Shipment MQ01

### Physical Implementation
- Print barcode labels for each lot when received
- Include both barcode and human-readable text
- Place on shelf location
- Item units also have individual barcodes

---

## 6. INVOICE DESIGN

### Layout

```
┌─────────────────────────────────────────────────────┐
│  INVOICE                        Your Company Name   │
│                                 Dhaka, Bangladesh   │
│                                                     │
│  Invoice #: #10157              Date: 26/02/2026   │
│  Order ID: ORD-2026-157         Order: 24/02/2026  │
├─────────────────────────────────────────────────────┤
│  BILL TO                    │  PAYMENT DETAILS     │
│  Ahmed Hassan               │  Method: COD         │
│  📞 +880 1711 123456        │  Total: ৳90.00       │
│  📍 Dhaka, Bangladesh       │  ⚠️ Collect ৳90.00  │
├─────────────────────────────────────────────────────┤
│  ORDER ITEMS - PICKING LIST                        │
│  ┌────┬────────┬─────┬────────────┬────────┬───┐ │
│  │ #  │Product │ SKU │ Lot Barcode│Location│Qty│ │
│  ├────┼────────┼─────┼────────────┼────────┼───┤ │
│  │ 1  │Blue Lt │BLG- │╔══════════╗│📍A-12  │ 2 │ │
│  │    │Glasses │BLK-M│║BLG-BLK-M_║│        │   │ │
│  │    │- Black │     │║  MQ01    ║│        │   │ │
│  │    │- Medium│     │║Scan this ║│        │   │ │
│  │    │        │     │╚══════════╝│        │   │ │
│  └────┴────────┴─────┴────────────┴────────┴───┘ │
├─────────────────────────────────────────────────────┤
│  📦 PICKING INSTRUCTIONS                           │
│  1. Follow FIFO rule - pick from lot shown above  │
│  2. Go to warehouse location                       │
│  3. Scan barcode during pick to verify            │
│  4. If unavailable, scan alternative & log        │
│  5. Complete all items before packing             │
├─────────────────────────────────────────────────────┤
│  Thank you for your business!                      │
│                                                     │
│  Packed by: ____________  Checked by: ___________  │
└─────────────────────────────────────────────────────┘
```

### Key Features
- **Lot barcode prominently displayed** in green box
- **Location shown with icon** for easy recognition
- **FIFO instructions** clearly stated
- **Print-friendly** layout (white background, good contrast)
- **Signature lines** for accountability

---

## 7. RETURNS TRACKING

### When Order is Returned
System shows:
- **Exact lot barcode** that was picked for this order
- **Which shipment** it came from
- **Original location**
- **Picked date and user**

### Use Cases
1. **Quality Issues**: Identify if problem is shipment-specific
2. **Missing Labels**: Reprint barcode based on `picked_lot`
3. **Profit Analysis**: Know exact landed cost of returned item
4. **Supplier Performance**: Track returns by supplier/shipment

---

## 8. NOTIFICATIONS & MONITORING

### For Managers/Admins

**Dashboard Metrics**:
- Count of FIFO violations today/this week
- Orders with discrepancies (list view)
- User with highest discrepancy rate
- SKUs with frequent wrong picks

**Notification Format**:
```
⚠️ Pick Discrepancy Alert

Order: #10157 (ORD-2026-157)
Customer: Ahmed Hassan
Item: Reading Glasses - Gold - +1.5
Recommended: RDG-GLD-1.5_MQ01 (Location: B-05)
Picked: RDG-GLD-1.5_MQ02 (Location: B-06)
Picked By: Warehouse User
Time: 2026-02-25 14:35

Reason: [User selected "Just Pick"]

[View Order] [View All Discrepancies]
```

---

## 9. TRAINING GUIDE (For Operations Staff)

### Simple 5-Step Process

**Step 1: Print Invoice**
- Click "Print Invoice" button
- Invoice shows what to pick and from where

**Step 2: Start Picking**
- Click "Start Pick" button
- Modal opens with first item

**Step 3: For Each Item**
- Look at screen - see barcode and location
- Go to that location
- Find item with that barcode
- Scan barcode with scanner

**Step 4: Handle Results**
- **Green ✓**: Correct! Move to next item
- **Yellow ⚠️**: Wrong lot - choose:
  - "Try Again" if you found the right one
  - "Just Pick" if recommended lot is empty (manager notified)
- **Red ✗**: Wrong item completely - must try again

**Step 5: Complete**
- When all items scanned: Click "Complete"
- Order moves to packing area

### Training Time: ~1 Hour
- 15 min: Explain system
- 15 min: Demo pick operation
- 30 min: Practice with sample orders

---

## 10. ERROR PREVENTION

### Built-in Safeguards

1. **Can't proceed without scanning**: No manual override
2. **Visual validation**: Shows what should be scanned
3. **Clear error messages**: Explains what went wrong
4. **Two-tier errors**:
   - Same SKU, different lot: Allowed with logging
   - Wrong SKU: Must fix
5. **Manager notification**: Discrepancies flagged immediately
6. **Progress tracking**: Can't skip items

---

## 11. PROFIT DATA ACCURACY

### How System Ensures Accuracy

**Traditional Problem**:
- Don't know which shipment items came from
- Can't calculate exact landed cost
- Profit margins are estimates

**This System**:
- Every order item linked to specific lot
- Lot linked to PO with known costs
- Profit = (Selling Price) - (Landed Cost of Picked Lot)
- Returns tracked to original lot
- Quality issues traced to supplier/shipment

**Example**:
```
Order #10157: 2x Blue Light Glasses - Black - Medium

Picked Lot: BLG-BLK-M_MQ01
Linked to: LOT-001
From PO: PO-2025-045
Landed Cost: ৳16.50 per unit
Selling Price: ৳45.00 per unit

Profit = (2 × ৳45.00) - (2 × ৳16.50) = ৳57.00

If returned:
- Know exact ৳33.00 cost to restock
- Check if MQ01 shipment has quality issues
- Accurate profit adjustment
```

---

## 12. IMPLEMENTATION CHECKLIST

### Phase 1: Data Structure
- [x] Extend OrderItem interface with FIFO fields
- [x] Create PickLog interface
- [x] Create PickNotification interface
- [ ] Add database migrations

### Phase 2: FIFO Logic
- [x] Implement `getRecommendedLotForSKU()`
- [x] Implement `assignRecommendedLotsToOrder()`
- [x] Implement `validateScannedBarcode()`
- [ ] Add unit tests for FIFO logic

### Phase 3: UI Components
- [x] Create PickModal component
- [x] Create Invoice component with picking list
- [x] Design OrderDetail enhanced view
- [ ] Integrate with existing OrderDetail
- [ ] Add print CSS for invoice

### Phase 4: Integration
- [ ] Connect to real barcode scanners
- [ ] Integrate with inventory system
- [ ] Update stock levels on pick completion
- [ ] Generate pick logs in database

### Phase 5: Notifications
- [ ] Create notification system
- [ ] Manager dashboard for discrepancies
- [ ] Email/SMS alerts for critical issues
- [ ] Weekly reports

### Phase 6: Testing
- [ ] Test with sample orders
- [ ] Train operations staff
- [ ] Run parallel with old system for 1 week
- [ ] Full cutover

---

## 13. SUCCESS METRICS

### Key Performance Indicators

**Operational Efficiency**:
- Pick time per order (target: < 5 min)
- Pick accuracy rate (target: >95%)
- FIFO compliance rate (target: >90%)

**Data Accuracy**:
- Orders with complete lot tracking (target: 100%)
- Profit calculation accuracy (validate monthly)
- Return traceability (target: 100%)

**Training**:
- New staff training time (target: < 1 hour)
- Staff confidence rating (survey)
- Error rate by user (monitor for retraining needs)

---

## 14. FUTURE ENHANCEMENTS

### Potential Additions

1. **Mobile App**: Pick operations on handheld devices
2. **Voice Guidance**: Audio prompts during picking
3. **Multi-lot Picking**: Handle cases where one lot doesn't have enough stock
4. **Batch Picking**: Pick multiple orders simultaneously
5. **AI Optimization**: Suggest warehouse layout improvements
6. **Photo Verification**: Take photo of picked item
7. **Weight Verification**: Weigh package to catch errors

---

## CONCLUSION

This picking system provides:
- ✅ **Accurate profit data** through FIFO tracking
- ✅ **Simple operations** anyone can learn quickly
- ✅ **Error prevention** through barcode validation
- ✅ **Full traceability** for returns and quality issues
- ✅ **Manager oversight** through discrepancy notifications
- ✅ **Scalable design** for future enhancements

The system balances automation with flexibility, ensuring operations run smoothly while maintaining data integrity for business intelligence.
