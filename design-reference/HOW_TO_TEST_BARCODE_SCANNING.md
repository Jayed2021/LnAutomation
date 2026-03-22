# How to Test the Barcode Scanning Feature

## ✅ What's Now Working

1. **Invoice with Order Barcode** - Removed picking instructions, added order barcode
2. **Global Barcode Scanner** - Automatic order detection and pick modal opening
3. **Full Integration** - Complete workflow from print to pick

---

## 🧪 Testing the Complete Workflow

### Step 1: Print Invoice
1. Go to `/fulfilment/operations`
2. You'll see "Not Printed" section is selected (red ring)
3. Click **"Print Invoice"** on any order
4. Invoice opens in modal showing:
   - Order details
   - Items with FIFO lot barcodes (green boxes)
   - Warehouse locations
   - **Order Barcode** at bottom (visual barcode representation)

### Step 2: Simulate Barcode Scan
**Option A: Keyboard Simulation (Easiest)**
1. Stay on the Operations page
2. Look at the blue message: "Barcode scanner ready - Scan order barcode to start picking"
3. Find an order ID from the "Printed" section (e.g., `#10166`)
4. Type the order ID: `#10166` (quickly, like a scanner would)
5. Press **Enter**
6. 🎉 Pick modal opens automatically!

**Option B: From Invoice**
1. Print an invoice for an order
2. Note the order number in the barcode section (e.g., `#10157`)
3. Close the invoice modal
4. Make sure that order is in "Printed" status (click the blue "Printed" card)
5. Type `#10157` and press Enter
6. Pick modal opens for that order!

### Step 3: Test Pick Modal
Once the pick modal opens:
1. You'll see the first item highlighted
2. It shows the recommended lot barcode (e.g., `SUN-AVT-M_MQ01`)
3. Type that exact barcode in the scan field
4. Press Enter
5. ✓ Green checkmark, moves to next item

**Test Error Scenarios**:
- Type a different lot (e.g., `SUN-AVT-M_MQ02` instead of `MQ01`)
  - Gets yellow warning with "Try Again" or "Just Pick" options
- Type completely wrong SKU
  - Gets red error, must try again

---

## 📝 Sample Order IDs to Test

### From "Printed" Section (Ready for Picking):
- `#10166` - Rashid Ali (2 items)
- `#10167` - Sharmin Akter (1 item)
- `#10168` - Imran Khan (3 items)
- `#10169` - Farhana Begum (2 items)

### How to Scan:
1. Make sure you're on Operations page
2. Type the order number (including #)
3. Press Enter quickly
4. System finds order and opens pick modal

---

## 🎯 Expected Behavior

### When Order is Found and Status is "Printed":
```
✓ Success toast: "Order #10166 scanned! Opening pick modal..."
→ Pick modal opens with FIFO-assigned items
```

### When Order is Found but Status is "Not Printed":
```
ℹ Info toast: "Order #10157 found but not yet printed. Please print invoice first."
→ No modal opens, user needs to print invoice
```

### When Order is Found but Different Status:
```
ℹ Info toast: "Order #10157 is currently in status: packed"
→ Informs user of current status
```

### When Barcode is Not an Order ID:
```
→ Silent, system ignores (assumes it's an item barcode)
```

---

## 🔍 Visual Indicators

### On Operations Page:
- Blue message at top: "Barcode scanner ready - Scan order barcode to start picking"
- Scan icon next to message
- Status cards change color when selected

### In Invoice:
- Large order barcode section with blue border
- "Quick Pick Access" heading
- Order ID in large font
- Visual barcode representation (black bars)
- Text: "Scan this barcode to start picking"

### In Pick Modal:
- Progress bar showing X/Y items
- Current item highlighted in blue
- Green box with recommended lot barcode
- Location with pin icon
- Real-time scan validation

---

## 🛠️ Technical Details

### Barcode Scanner Behavior:
- Listens for rapid keypress events (simulates scanner)
- Buffers characters within 100ms
- Enter key triggers search
- Ignores input when user is in text fields

### Order Matching:
- Searches by `woo_order_id` (e.g., #10166)
- Checks order status
- Routes appropriately based on status

### FIFO Assignment:
- Automatically assigns oldest lot to each item
- Happens when invoice is printed
- Happens again when pick modal opens
- Ensures consistency

---

## 📊 Real-World Usage

### Warehouse Staff Workflow:

**Step 1: Morning Start**
- Open Operations page
- See all "Not Printed" orders

**Step 2: Print Invoices**
- Click "Print Invoice" for each order
- Invoices show exactly what to pick and where
- Order barcode printed on each invoice

**Step 3: Pick Orders**
- Grab first invoice from printer
- Scan the order barcode on invoice
- Pick modal opens automatically
- Follow on-screen instructions
- Scan each item barcode
- Complete pick

**Step 4: Pack**
- Order marked as ready to pack
- Move to packing station

**No clicking through menus! Just scan and go.**

---

## ✨ Advantages of This System

1. **Speed**: Scan invoice barcode → instant pick modal
2. **No Navigation**: Don't need to find order in system
3. **Error Prevention**: System validates every scan
4. **FIFO Compliance**: Always picks oldest inventory
5. **Traceability**: Every pick is logged with exact lot
6. **Manager Oversight**: Discrepancies auto-notify managers

---

## 🐛 Troubleshooting

### Barcode scan doesn't work:
- Make sure you're on Operations page (not in a modal)
- Type quickly (within 100ms between characters)
- Press Enter after typing order ID
- Check order exists and has correct status

### Pick modal doesn't open:
- Verify order status is "printed"
- Check browser console for errors
- Make sure order has items with assigned lots

### Can't complete pick:
- Must scan all items
- Use "Just Pick" if recommended lot unavailable
- Check that barcodes match format (SKU_SHIPMENT)

---

## 🎬 Demo Script

**"Let me show you how picking works with barcodes..."**

1. "First, I print the invoice" → Click Print Invoice
2. "See this barcode at the bottom? That's the order barcode"
3. "Now I'm back on the Operations page"
4. "Watch - I scan the order barcode" → Type #10166, press Enter
5. "Boom! Pick modal opens automatically"
6. "Now I see exactly what to pick - this lot, from this location"
7. "I scan the item barcode" → Type barcode, press Enter
8. "Perfect! Green checkmark, next item"
9. "All done - order ready for packing"

**"That's it! From invoice scan to completed pick in under 30 seconds!"**

---

The system is now fully functional and ready for testing!
