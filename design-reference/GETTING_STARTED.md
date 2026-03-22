# 🚀 Getting Your ERP System Working - Step by Step Guide

**Goal**: Get WooCommerce → Inventory → Fulfilment workflow fully operational

---

## ✅ Phase 1: Database Setup (5 minutes)

### Step 1: Check Setup Status
Your backend server has a setup endpoint. Let's check if the database is ready.

**Action**: Open your browser console and run:
```javascript
// Check if database is set up
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-4e2781f4/setup/status', {
  headers: { 'Authorization': 'Bearer YOUR_ANON_KEY' }
})
  .then(r => r.json())
  .then(data => console.log(data));
```

**Expected Response**:
```json
{
  "database_setup": true,
  "admin_user_exists": true,
  "ready_to_use": true,
  "next_action": "System is ready! Go to /login to sign in"
}
```

### Step 2: If Database Not Set Up
If `database_setup: false`, run:
```javascript
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-4e2781f4/setup/database', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer YOUR_ANON_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(r => r.json())
  .then(data => console.log(data));
```

### Step 3: Create Admin User
If `admin_user_exists: false`, create your first admin:
```javascript
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-4e2781f4/setup/create-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your-email@example.com',
    password: 'YourSecurePassword123!',
    full_name: 'Your Name'
  })
})
  .then(r => r.json())
  .then(data => console.log(data));
```

---

## ✅ Phase 2: Connect WooCommerce (10 minutes)

### Step 1: Get WooCommerce API Credentials

1. Go to your WooCommerce store admin
2. Navigate to: **WooCommerce → Settings → Advanced → REST API**
3. Click **"Add Key"**
4. Set:
   - **Description**: "ERP System Integration"
   - **User**: Select your admin user
   - **Permissions**: **Read/Write**
5. Click **"Generate API Key"**
6. **COPY and SAVE** the Consumer Key and Consumer Secret (you won't see them again!)

### Step 2: Configure in Your ERP

1. Log in to your ERP system
2. Go to **Settings**
3. Click **WooCommerce Integration**
4. Enter:
   - **Store URL**: `https://yourstore.com` (no trailing slash)
   - **Consumer Key**: `ck_xxxxx...`
   - **Consumer Secret**: `cs_xxxxx...`
5. Click **Test Connection**
6. Click **Save**

---

## ✅ Phase 3: Sync Products (First Critical Step)

### Why Products First?
Orders contain product SKUs. If products don't exist in your inventory, orders can't be fulfilled.

### Step 1: Sync Products from WooCommerce

1. In **Settings → WooCommerce Integration**
2. Click **"Sync Products Now"**
3. Wait for confirmation (should see: "Successfully synced X products")

### Step 2: Verify Products

1. Go to **Inventory → Stock**
2. You should see all your WooCommerce products
3. Each product will have:
   - SKU (from WooCommerce)
   - Product Name
   - Category
   - Image
   - **Quantity: 0** (we'll add stock next)

**⚠️ IMPORTANT**: If products don't appear, check:
- WooCommerce credentials are correct
- Your WooCommerce products have SKUs assigned
- Check browser console for errors

---

## ✅ Phase 4: Add Initial Stock (Purchase Orders)

Since you're just starting, you have two options:

### Option A: Create a Purchase Order (Recommended for Real Workflow)

1. Go to **Purchase → Suppliers**
2. Create a supplier (your actual supplier or "Initial Stock" as placeholder)
3. Go to **Purchase → Create PO**
4. Add products and quantities
5. Save and Approve PO
6. Go to **Inventory → Receive Goods**
7. Select the PO
8. Confirm quantities received
9. Assign locations (create locations if needed in **Inventory → Warehouse**)
10. Complete receiving

**Result**: Products now have stock!

### Option B: Manual Stock Adjustment (Quick Test)

Since your system doesn't have a "manual adjustment" feature yet, we'll build one in the next update. For now, use Option A.

---

## ✅ Phase 5: Sync Orders from WooCommerce

Now that you have products and stock, let's sync orders.

### Step 1: Sync Orders

1. In **Settings → WooCommerce Integration**
2. Click **"Sync Orders Now"**
3. Wait for confirmation

### Step 2: View Orders

1. Go to **Fulfilment → Orders**
2. You should see all WooCommerce orders
3. Each order will show:
   - Order Number (from WooCommerce)
   - Customer details
   - Order items (matched to your SKUs)
   - Status
   - Total amount

---

## ✅ Phase 6: Fulfill Your First Order

### Step 1: Assign Order to Customer Service

1. In **Fulfilment → Orders**
2. Click on an order
3. Assign to a CS rep (or yourself if testing)

### Step 2: Process Order

1. Review customer details
2. Check if all items are in stock
3. Change CS Status to appropriate stage
4. Add internal notes if needed

### Step 3: Pick Order (Warehouse Operations)

1. Go to **Fulfilment → Operations**
2. Find orders ready to pick
3. Click on order
4. For each item:
   - See which location it's in
   - Scan barcode (or manually confirm)
   - Mark as picked
5. Generate packing slip
6. Mark as shipped

**Result**: Order is fulfilled! 🎉

---

## ✅ Phase 7: Test Complete Workflow

### End-to-End Test:

1. **Create a test order in WooCommerce**
   - Add products
   - Complete checkout
   
2. **Sync to ERP**
   - Click "Sync Orders" in settings
   
3. **Assign in CS**
   - Go to Fulfilment → Orders
   - Assign order
   
4. **Pick & Pack**
   - Go to Operations
   - Pick items
   - Generate packing slip
   
5. **Mark as Shipped**
   - Update status
   - (Future: auto-update WooCommerce)

**Success!** You've completed the full workflow!

---

## 🚨 Common Issues & Solutions

### Issue 1: "WooCommerce not configured" error
**Solution**: 
- Check that settings are saved correctly
- Verify API credentials are correct
- Test connection first

### Issue 2: Products not syncing
**Solution**:
- Ensure WooCommerce products have SKUs
- Check if products are published (not drafts)
- Look at browser console for API errors

### Issue 3: Orders syncing but items missing
**Solution**:
- Products must be synced BEFORE orders
- Run product sync first, then order sync

### Issue 4: Can't receive goods - no locations
**Solution**:
- Go to Inventory → Warehouse
- Create at least one location (e.g., "MAIN-A1-R1-S1-B1")
- Then receive goods

### Issue 5: Stock not deducting when order fulfilled
**Solution**:
- This feature needs to be connected
- Will be implemented in next update

---

## 📋 Current Status Checklist

Use this to track your progress:

- [ ] Database set up
- [ ] Admin user created
- [ ] Logged in successfully
- [ ] WooCommerce credentials configured
- [ ] Connection tested successfully
- [ ] Products synced (at least 1 product)
- [ ] Supplier created
- [ ] First PO created
- [ ] Goods received (stock > 0)
- [ ] Orders synced (at least 1 order)
- [ ] First order assigned
- [ ] First order picked
- [ ] First order shipped

---

## 🔄 What Works Now vs What Needs Work

### ✅ Already Working:
- Database schema
- Authentication (login/signup)
- WooCommerce API endpoints (backend)
- Product sync (backend ready)
- Order sync (backend ready)
- Purchase orders
- Inventory management
- UI for all modules

### ⚠️ Needs Connection (Next Priority):
- [ ] Connect WooCommerce Settings UI to backend API
- [ ] Connect Orders page to backend API
- [ ] Connect Inventory Stock to backend API
- [ ] Auto-deduct stock when order fulfilled
- [ ] Update WooCommerce order status from ERP

### 🔮 Future Enhancements:
- Manual stock adjustments
- Barcode scanning (hardware integration)
- SMS notifications
- Email notifications
- Reports with real data

---

## 🎯 Next Steps After This Guide

Once you complete the checklist above, you'll have:
1. ✅ Products in your system
2. ✅ Stock levels tracked
3. ✅ Orders flowing from WooCommerce
4. ✅ Ability to fulfill orders

**Then we'll tackle**:
1. Connecting all UI components to backend
2. Real-time stock updates
3. Automatic order status sync back to WooCommerce
4. Reports with actual data

---

**Questions?** Let me know which step you're on and I'll help you through it!
