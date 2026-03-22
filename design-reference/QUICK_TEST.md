# 🧪 Quick Test Guide

Use this to verify everything is working!

---

## Test 1: Check if Database is Set Up

**Open Browser Console** (Press F12, then click "Console" tab)

**Paste this code**:
```javascript
// Replace YOUR_PROJECT_ID and YOUR_ANON_KEY with your actual values
const projectId = 'YOUR_PROJECT_ID';
const anonKey = 'YOUR_ANON_KEY';

fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4e2781f4/setup/status`, {
  headers: { 'Authorization': `Bearer ${anonKey}` }
})
  .then(r => r.json())
  .then(data => {
    console.log('✅ Setup Status:', data);
    if (data.ready_to_use) {
      console.log('🎉 System is ready!');
    } else {
      console.log('⚠️ Action needed:', data.next_action);
    }
  })
  .catch(err => console.error('❌ Error:', err));
```

**Expected Output**:
```
✅ Setup Status: { database_setup: true, admin_user_exists: true, ready_to_use: true }
🎉 System is ready!
```

---

## Test 2: Check if You Can Log In

1. Go to `/login` in your app
2. Enter your email and password
3. Click "Sign In"

**Expected**: You should be redirected to the dashboard

**If not working**: Go back to console and create admin:
```javascript
fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4e2781f4/setup/create-admin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@yourcompany.com',
    password: 'YourSecurePassword123!',
    full_name: 'Admin User'
  })
})
  .then(r => r.json())
  .then(data => console.log('Admin created:', data))
  .catch(err => console.error('Error:', err));
```

---

## Test 3: Test WooCommerce Connection

**In your app**:
1. Go to **Settings**
2. Look for **WooCommerce Integration** section
3. Enter:
   - **Store URL**: `https://your-store.com` (replace with your actual store)
   - **Consumer Key**: Your actual key from WooCommerce
   - **Consumer Secret**: Your actual secret
4. Click **"Test Connection"**

**Expected**: "Connection test successful!" green message

**If failed**: Check:
- Is your WooCommerce URL correct?
- Did you copy the full consumer key and secret?
- Is your WordPress site accessible?

---

## Test 4: Sync Products

**After Test 3 passes**:

1. Click **"Save Settings"**
2. Click **"Sync Products"** button
3. Wait (may take 30 seconds for many products)

**Expected**: "Successfully synced X products" message

**Verify in console**:
```javascript
// Check if products were imported
const session = await supabase.auth.getSession();
fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4e2781f4/inventory/skus`, {
  headers: { 'Authorization': `Bearer ${session.data.session.access_token}` }
})
  .then(r => r.json())
  .then(data => {
    console.log(`✅ Total Products: ${data.skus.length}`);
    console.log('First 5 products:', data.skus.slice(0, 5));
  });
```

---

## Test 5: Sync Orders

1. Click **"Sync Orders"** button
2. Wait (may take 30-60 seconds)

**Expected**: "Successfully synced X orders" message

**Verify in console**:
```javascript
// Check if orders were imported
fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4e2781f4/orders`, {
  headers: { 'Authorization': `Bearer ${session.data.session.access_token}` }
})
  .then(r => r.json())
  .then(data => {
    console.log(`✅ Total Orders: ${data.orders.length}`);
    console.log('First 5 orders:', data.orders.slice(0, 5));
  });
```

---

## Test 6: View Inventory (Next to implement)

**Currently**: Inventory → Stock shows mock data  
**Soon**: Will show real data from WooCommerce sync

---

## Test 7: View Orders (Next to implement)

**Currently**: Fulfilment → Orders shows mock data  
**Soon**: Will show real orders from WooCommerce

---

## 🐛 Troubleshooting

### Error: "Failed to fetch"
**Cause**: CORS error or network issue  
**Fix**: Check if Supabase project is running. Check URL is correct.

### Error: "Unauthorized"
**Cause**: Session expired or not logged in  
**Fix**: Log out and log in again. Check auth token.

### Error: "WooCommerce API error: Unauthorized"
**Cause**: Wrong credentials  
**Fix**: Regenerate WooCommerce API keys. Make sure you have Read/Write permissions.

### Error: "No products synced"
**Cause**: Products don't have SKUs or are drafts  
**Fix**: 
- Go to WooCommerce → Products
- Make sure products are Published
- Make sure each product has a unique SKU
- Try syncing again

### Products synced but showing 0 quantity
**Cause**: This is expected! Products are synced but have no stock yet  
**Solution**: You need to:
1. Create a Purchase Order
2. Receive the goods
3. Assign to warehouse location
4. Then stock will show up

---

## ✅ Success Criteria

You're ready to move forward when:
- [x] ✅ Database is set up
- [x] ✅ Admin user exists
- [x] ✅ You can log in
- [x] ✅ WooCommerce connection test passes
- [x] ✅ Products sync successfully (even with 0 quantity)
- [x] ✅ Orders sync successfully

**If all checked**: Congratulations! 🎉 You're ready for the next phase!

---

## 📞 Next Steps

Once all tests pass, we'll:
1. Connect Inventory Stock page to show real products
2. Connect Orders page to show real orders
3. Implement receive goods workflow
4. Test complete order fulfillment flow

**Ready to continue?** Let me know your test results!
