# 🚀 Quick Start Guide - Eyewear ERP System

## Where is the App?

**Your app is running right now in the Figma Make preview panel!**

Look at the top-right of your screen - you should see a preview window showing the app. The URL in the address bar looks something like:
```
https://[random-id].makeproxy-m.figma.site/
```

---

## How to Navigate to /setup

### Method 1: Change the URL (Easiest)
1. **Click on the address bar** at the top of the preview
2. **Add `/setup`** to the end of the URL
3. Press **Enter**

**Before:**
```
https://[random-id].makeproxy-m.figma.site/
```

**After:**
```
https://[random-id].makeproxy-m.figma.site/setup
```

### Method 2: Open in New Tab
1. Right-click on the preview
2. Select "Open in New Tab" or copy the URL
3. Add `/setup` to the end and press Enter

---

## 📋 Complete Setup Process

### Step 1: Navigate to Setup Page
- Go to `/setup` using the method above

### Step 2: Run Database Setup
- You'll see a beautiful setup wizard
- Click the **"Run Database Setup"** button
- Wait for confirmation (should take 10-20 seconds)
- ✅ You should see "Database is configured"

### Step 3: Create Admin User
- Fill in the form:
  - **Full Name:** Your name (e.g., "Ahmed Khan")
  - **Email:** Your email (e.g., "admin@yourstore.com")
  - **Password:** At least 6 characters
- Click **"Create Admin User"**
- ✅ You should see "Admin user is configured"

### Step 4: Go to Login
- Click the **"Go to Login"** button
- Or manually navigate to `/login`

### Step 5: Sign In
- Enter the email and password you just created
- Click **Sign In**
- 🎉 You're in!

---

## 🧭 How to Navigate the System

### Once Logged In:

**The sidebar on the left** is your main navigation menu. You'll see:

- 📊 **Dashboard** - Overview of your business
- 🛒 **Purchase** - Create POs, manage suppliers
  - Purchase Orders
  - Create PO
  - Suppliers
- 📦 **Inventory** - Stock management
  - Products
  - Shipments
  - Stock Movements
  - Warehouse
  - Audit
  - Receive
- 📋 **Fulfilment** - Order processing
  - Orders
  - Operations
  - Returns
- 💰 **Finance** - Financial tracking
  - Expenses
  - Profit Analysis
  - Collection
- 👥 **Customers** - Customer management
- 📈 **Reports** - Business analytics
- ⚙️ **Settings** - System configuration

### Toggle Sidebar:
- Click the **☰ menu icon** (top-left) to collapse/expand the sidebar

### User Menu:
- Click your **name** (top-right) to sign out

---

## 🔍 Current Status

### ✅ What's Working:
- Authentication (Login/Logout)
- Database connection
- Navigation structure
- Role-based access control
- Backend API (27+ endpoints ready)

### ⏳ What Shows "Coming Soon":
- Most feature pages (we're building these next!)
- The pages exist but show placeholder content

---

## 🛠️ Next Steps After Setup

### 1. Configure WooCommerce Integration
- Go to **Settings** in the sidebar
- Enter your WooCommerce store details:
  - Store URL
  - Consumer Key
  - Consumer Secret
- Click **Save** and then **Sync Products**

### 2. Set Up Warehouse Locations
- Go to **Inventory → Warehouse**
- Create location codes (e.g., A1-01-01)

### 3. Import Your Data
- Products will sync from WooCommerce
- Orders will sync automatically
- You can start receiving inventory

---

## 🆘 Troubleshooting

### Can't see the preview?
- Make sure you're in Figma Make (not regular Figma)
- Look for a panel on the right side of the screen

### Can't navigate to /setup?
- Try copying the full URL from the address bar
- Paste it in a new browser tab
- Add `/setup` at the end

### Database setup fails?
- Check the browser console (F12) for errors
- The setup endpoint might need a few seconds
- Try again - the setup is idempotent (safe to run multiple times)

### Already have an admin?
- If you see "Admin user already exists", just go to `/login`
- Sign in with your existing credentials

### Navigation not showing?
- Make sure you're logged in
- Click the menu icon (☰) to expand the sidebar
- Your role determines which menu items you see

---

## 📱 App URL Pattern

Your app is always accessible at:
```
https://[project-id].makeproxy-m.figma.site/[route]
```

**Available Routes:**
- `/` - Dashboard (requires login)
- `/setup` - Setup wizard (public)
- `/login` - Login page (public)
- `/purchase` - Purchase orders (requires login)
- `/inventory/stock` - Inventory (requires login)
- `/fulfilment/orders` - Orders (requires login)
- `/settings` - Settings (requires login)
- ...and many more!

---

## 🎯 Quick Access Checklist

- [ ] Navigate to `/setup`
- [ ] Run database setup
- [ ] Create admin user
- [ ] Go to `/login`
- [ ] Sign in
- [ ] Explore the sidebar navigation
- [ ] Configure WooCommerce in Settings
- [ ] Start using the system!

---

**Need Help?** 
- Check the browser console (press F12) for error messages
- All backend endpoints are at: `https://sptjgtzgpgsgrccgcrpv.supabase.co/functions/v1/make-server-4e2781f4/`

**Happy Managing! 🎉**
