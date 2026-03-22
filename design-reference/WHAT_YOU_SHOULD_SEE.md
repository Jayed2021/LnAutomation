# What You Should See Now - Picking System in Action

## 🎯 How to Test the Picking System

### 1. Navigate to Operations Page
**Path**: `/fulfilment/operations`

You should see:
- 4 clickable status cards at the top (Not Printed, Printed, Packed, Send to Lab)
- The "Not Printed" card selected by default with a colored ring
- A table showing all "Not Printed" orders

---

### 2. Test Invoice with FIFO Picking List

**Steps**:
1. Click on any order in the "Not Printed" section
2. Click the **"Print Invoice"** button
3. A modal opens showing the full invoice

**What to Look For**:
- Invoice has standard header with company info
- Customer details displayed
- **Picking List Table** with columns:
  - Product Name
  - SKU
  - **Lot Barcode** (in green highlighted box) - e.g., `BLG-BLK-M_MQ01`
  - **Location** (with 📍 icon) - e.g., `A-12`
  - Quantity and prices
- **Picking Instructions** box in blue
- Print button at bottom

**FIFO Logic in Action**:
- The system automatically assigns the oldest lot for each SKU
- Example: If you have LOT-001 (received Jan 15) and LOT-015 (received Feb 10), it will show LOT-001's barcode

---

### 3. Test Pick Operation with Barcode Scanning

**Steps**:
1. Click the **"Printed"** status card at the top
2. You'll see orders with status "printed" (currently 16 orders)
3. Click the **"Start Pick"** button on any order
4. The Pick Modal opens

**What Happens in Pick Modal**:

#### A. Overview Section
- Progress bar showing X/Y items picked
- List of all items to pick with checkboxes
- Current item highlighted in blue

#### B. Current Item Details
Shows:
- Product name and details
- **Green box with**:
  - Recommended lot barcode (e.g., `RDG-GLD-1.5_MQ01`)
  - Warehouse location (e.g., `📍 B-05`)
- Barcode input field

#### C. Testing Scenarios

**Scenario 1: Scan Correct Barcode**
1. Type in the exact barcode shown (e.g., `BLG-BLK-M_MQ01`)
2. Press Enter or click "Scan"
3. Result: ✓ Green checkmark, auto-advances to next item

**Scenario 2: Scan Wrong Lot (Same SKU)**
1. Type a different lot (e.g., `BLG-BLK-M_MQ02` instead of `MQ01`)
2. Press Enter
3. Result: ⚠️ Yellow warning appears:
   ```
   ⚠️ Scan Error
   Different lot scanned. This is not the recommended FIFO lot.
   
   [Try Again] [Just Pick (Log Discrepancy)]
   
   ℹ️ Choosing "Just Pick" will log this as a FIFO violation
   and notify managers.
   ```
4. Choose "Try Again" to rescan or "Just Pick" to accept

**Scenario 3: Scan Completely Wrong Item**
1. Type wrong SKU (e.g., `SUN-AVT-M_MQ01` when it should be `BLG-BLK-M_MQ01`)
2. Press Enter
3. Result: ✗ Red error: "Wrong item scanned! This does not match the order."
4. Only option: Try Again

#### D. Completion
When all items scanned:
- Big green checkmark appears
- "All Items Picked!" message
- **"Complete Pick Operation"** button
- Click to finish and close modal

**After Completion**:
- Success toast appears
- If discrepancies: "Pick completed with X FIFO discrepancy(ies). Manager has been notified."
- If all correct: "All items picked correctly using FIFO!"

---

### 4. Test Other Sections

**Packed Orders**:
1. Click "Packed" status card
2. See orders ready to ship
3. Click "Mark as Shipped" button
4. Toast notification confirms action

**Send to Lab**:
1. Click "Send to Lab" status card
2. See orders requiring custom prescriptions
3. View order notes showing prescription requirements

---

## 🔍 Key Visual Elements to Notice

### Status Cards
- **Selected card**: Has colored ring shadow (ring-2 ring-{color}-500 ring-offset-2)
- **Hover effect**: Slight scale increase (hover:scale-[1.02])
- **Colors**:
  - Not Printed: Red
  - Printed: Blue
  - Packed: Green
  - Send to Lab: Purple

### Buttons
- **Print Invoice**: Default button with Printer icon
- **Start Pick**: Blue button with Scan icon
- **Mark as Shipped**: Green button with Truck icon

### Pick Modal Progress
- Progress bar fills as you scan items
- Items show status: ○ Not scanned, → Current, ✓ Scanned
- "Different Lot" badge for discrepancies

### Invoice Display
- Professional print layout
- Green highlighted boxes for lot barcodes
- Blue location icons
- Blue instruction box at bottom

---

## 📊 Sample Data to Test With

### Order in "Not Printed": ORD-2026-157
- Customer: Ahmed Hassan
- Items: 2x Blue Light Glasses - Black - Medium
- Should show lot: `BLG-BLK-M_MQ01` at location `A-12`

### Order in "Printed": ORD-2026-165
- Customer: Rashid Ali
- Items: 
  - 2x Blue Light Glasses - Black - Large → `BLG-BLK-L_MQ01` @ `A-13`
  - 1x Contact Lens Case - Blue → `CLC-BLU_MQ01` @ `D-02`

---

## 🧪 Testing the FIFO Logic

The system uses lots from `/src/app/data/mockData.ts`:

**Available Lots**:
- LOT-001: BLG-BLK-M, received 2026-01-15, location A-12, PO: MQ01
- LOT-002: BLG-BLK-L, received 2026-01-15, location A-13, PO: MQ01
- LOT-003: RDG-GLD-1.5, received 2026-01-20, location B-05, PO: MQ01
- LOT-004: SUN-AVT-M, received 2025-12-10, location C-08, PO: MQ01
- LOT-005: CLC-BLU, received 2026-02-08, location D-02, PO: MQ01
- LOT-006: BLG-TOR-M, received 2026-02-10, location A-14, PO: MQ01

**FIFO Rule**: System always picks the lot with the earliest `received_date`

---

## 🐛 Troubleshooting

### "No lots available" in invoice
- Check that the SKU exists in the `lots` array
- Verify lot has `remaining_quantity > 0`

### Pick modal doesn't open
- Check browser console for errors
- Verify all imports are correct
- Make sure Dialog component is working

### Barcode validation not working
- The validation is simulated - just type the barcode
- Press Enter or click "Scan" button
- Check console.log for validation results

---

## ✅ Success Indicators

You know the system is working when:
1. ✅ Invoice shows lot barcodes and locations
2. ✅ Pick modal opens with item details
3. ✅ Scanning correct barcode shows green checkmark
4. ✅ Scanning wrong lot shows warning with two options
5. ✅ Scanning wrong SKU shows error
6. ✅ Completion shows success toast
7. ✅ Discrepancies trigger warning toast

---

## 📱 Next Steps

Once you verify everything works:
1. Connect real barcode scanners (USB HID devices)
2. Implement database persistence for pick logs
3. Create manager dashboard for discrepancy monitoring
4. Add printer integration for invoices
5. Train warehouse staff

The foundation is complete and functional!
