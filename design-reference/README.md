# Internal ERP System - Documentation

## Overview

A comprehensive internal ERP (Enterprise Resource Planning) system built for an ecommerce eyewear business operating exclusively in Bangladesh. The system handles end-to-end operations including imports, warehousing, fulfillment, returns, and financial analysis, following Odoo's inventory management approach for smoother future migration.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [User Roles & Permissions](#user-roles--permissions)
- [Modules](#modules)
- [Getting Started](#getting-started)
- [WooCommerce Integration](#woocommerce-integration)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Troubleshooting](#troubleshooting)
- [Future Enhancements](#future-enhancements)

---

## Features

### Core Capabilities

✅ **Complete Inventory Management**
- SKU management with categories and pricing
- Location-based inventory tracking (warehouse, showroom, etc.)
- Lot-based inventory system (Odoo-style)
- Stock movement tracking
- Low stock alerts
- Photo uploads for inventory items

✅ **Supplier Management**
- Comprehensive supplier database
- Multi-currency support (USD, CNY, BDT)
- Payment terms and credit tracking
- Contact management

✅ **Purchase Order System**
- Two-step receiving process (PO → GRN)
- Photo uploads during receiving
- Cost tracking in multiple currencies
- Exportable reports (CSV/Excel)
- Approval workflows

✅ **Order Management & Fulfillment**
- WooCommerce integration (products + recent 100 orders)
- Customer database
- Order status tracking
- CS (Customer Service) status workflow
- Order assignment to CS representatives
- Multi-channel support (WooCommerce, Manual, Phone)

✅ **Returns Management**
- Return request tracking
- Photo documentation
- Quality inspection workflow
- Refund/exchange processing
- Return reason categorization

✅ **Financial Analysis**
- Multi-currency financial tracking
- Profit/loss analysis
- Revenue dashboards
- Cost analytics
- Export capabilities

✅ **Role-Based Access Control**
- 5 distinct user roles
- Granular permissions per module
- Data visibility restrictions
- Cost information hiding for Warehouse Managers

✅ **Audit & Compliance**
- Location-based inventory auditing
- Audit trail for all transactions
- Photo documentation
- Exportable audit reports

---

## Technology Stack

### Frontend
- **React** (TypeScript)
- **React Router** - Data mode routing
- **Tailwind CSS v4** - Styling
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Sonner** - Toast notifications

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Storage (blob/file storage)
  - Edge Functions (Deno/Hono web server)
- **Hono** - Web framework for Edge Functions

### Integration
- **WooCommerce REST API v3** - Product and order synchronization

---

## Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────┐
│           Frontend (React)              │
│  - UI Components                        │
│  - State Management                     │
│  - Client-side Routing                  │
└────────────────┬────────────────────────┘
                 │
                 │ HTTPS API Calls
                 │
┌────────────────▼────────────────────────┐
│    Server (Supabase Edge Function)      │
│  - Hono Web Server                      │
│  - Authentication Middleware            │
│  - Business Logic                       │
│  - WooCommerce Integration              │
└────────────────┬────────────────────────┘
                 │
                 │ SQL Queries
                 │
┌────────────────▼────────────────────────┐
│      Database (PostgreSQL)              │
│  - Relational data storage              │
│  - Row Level Security (RLS)             │
│  - JSONB support                        │
└─────────────────────────────────────────┘
```

### Key Design Decisions

1. **Odoo-Compatible Inventory Model**
   - Lot-based inventory tracking
   - Stock movements between locations
   - Facilitates future migration to Odoo

2. **Two-Step Purchase Receiving**
   - Purchase Order (PO) creation
   - Goods Received Note (GRN) confirmation
   - Photo documentation at each step

3. **Multi-Currency Support**
   - All costs stored in original currency
   - Support for USD, CNY, BDT
   - Exchange rate tracking

4. **Role-Based Data Visibility**
   - Warehouse Managers: No cost information
   - Customer Service: Only assigned orders
   - Accounts: Full financial access
   - Operations Manager: Cross-functional visibility
   - Admin: Complete system access

---

## User Roles & Permissions

### 1. Admin
**Full System Access**
- Complete CRUD on all modules
- User management
- System configuration
- WooCommerce integration setup
- Financial data access
- Export all reports

### 2. Operations Manager
**Cross-Functional Access (Excluding User Management)**
- Purchase orders and receiving
- Inventory management
- Supplier management
- Order fulfillment oversight
- Returns processing
- Financial reports
- WooCommerce sync

**Restrictions:**
- Cannot create/edit users
- Cannot modify system settings

### 3. Warehouse Manager
**Inventory & Operations Focus**
- Inventory management (viewing and stock movements)
- Receiving goods (GRN processing)
- Location management
- Stock audits
- Order fulfillment (pick/pack)

**Restrictions:**
- **No cost information visible**
- Cannot see purchase prices
- Cannot create purchase orders
- No financial data access
- Cannot access supplier payment terms

### 4. Customer Service
**Order & Customer Management**
- View/edit assigned orders
- Customer database management
- Order status updates
- Create manual orders
- Process returns
- Customer communication

**Restrictions:**
- Can only see assigned orders (or unassigned)
- No cost/financial data
- No inventory cost visibility
- Cannot access purchase orders
- Cannot modify inventory

### 5. Accounts
**Financial & Supplier Management**
- Full financial reporting
- Supplier payment management
- Cost analysis
- Purchase order review (financial aspect)
- Multi-currency tracking
- Export financial reports

**Restrictions:**
- Cannot modify inventory
- Cannot process orders
- Cannot manage warehouse operations

---

## Modules

### 1. Dashboard
**Overview metrics and KPIs**
- Total revenue (current month)
- Total orders (current month)
- Low stock alerts
- Pending purchase orders
- Recent order activity
- Revenue trends (chart)
- Top-selling products

**Role-based widgets:**
- Warehouse Manager: Inventory-focused
- Customer Service: Order-focused
- Accounts: Financial-focused

### 2. Inventory Management

#### SKU Management
- SKU code and name
- Category assignment
- Regular price
- Product images
- WooCommerce sync status
- Stock levels across locations

#### Location Management
- Warehouse locations
- Showroom locations
- Custom locations
- Location-based stock tracking

#### Lot Management (Odoo-style)
- Lot number tracking
- Purchase order reference
- Received date
- Original quantity
- Remaining quantity
- Unit cost (hidden from Warehouse Managers)
- Location assignment
- Expiry tracking (if applicable)

#### Stock Movements
- Movement type (receive, transfer, sale, adjustment, return)
- Source location
- Destination location
- Quantity moved
- Reference document
- Movement date
- User tracking

#### Inventory Audit
- Location-based audits
- Expected vs actual quantity
- Variance reporting
- Photo documentation
- Audit history

### 3. Supplier Management

#### Supplier Database
- Supplier name and code
- Contact information (email, phone, address)
- Country
- Currency preference
- Payment terms (Net 30, Net 60, etc.)
- Credit limit
- Notes

#### Supplier Performance
- Total purchase value
- Outstanding balance
- Payment history
- On-time delivery tracking

### 4. Purchase Orders

#### PO Creation
- Supplier selection
- Multiple SKU line items
- Quantity and unit price
- Multi-currency support
- Expected delivery date
- Terms and conditions
- Notes

#### PO Workflow
1. **Draft** - Initial creation
2. **Sent** - Sent to supplier
3. **Partially Received** - Some items received
4. **Fully Received** - All items received
5. **Cancelled** - Order cancelled

#### Two-Step Receiving Process

**Step 1: Create GRN (Goods Received Note)**
- Reference PO
- Actual quantities received
- Receiving date
- Photo uploads (package, items, etc.)
- Quality inspection notes

**Step 2: Confirm GRN**
- Creates inventory lots
- Updates stock levels
- Updates PO status
- Records stock movements

#### Export & Reporting
- Export POs to CSV/Excel
- GRN reports
- Cost analysis reports

### 5. Order Management

#### Order Sources
- **WooCommerce** - Synced automatically
- **Manual** - Created in system
- **Phone** - Phone orders

#### Order Fields
- Order number
- Customer information
- Order items (SKU, quantity, price)
- Shipping address
- Payment status
- WooCommerce status (if synced)
- CS status (internal workflow)

#### CS Status Workflow
1. **New/Not Called** - Needs customer verification
2. **Awaiting Payment** - Payment pending
3. **Not Printed** - Ready to print packing slip
4. **Printed** - Packing slip printed
5. **Packed** - Order packed, ready to ship
6. **Shipped** - Order shipped
7. **Delivered** - Confirmed delivery
8. **Refund** - Refunded/cancelled

#### Order Assignment
- Assign orders to CS representatives
- CS can only see assigned orders
- Unassigned orders visible to all CS

### 6. Customer Management

#### Customer Database
- Name, email, phone
- Shipping address
- City, postal code
- Order history
- WooCommerce customer ID (if synced)
- Lifetime value
- Notes

### 7. Returns Management

#### Return Request
- Order reference
- Customer information
- Return reason (defective, wrong size, changed mind, etc.)
- Items being returned
- Return type (refund/exchange)
- Photo uploads

#### Return Workflow
1. **Pending** - Request submitted
2. **Approved** - Approved for return
3. **Received** - Items received back
4. **Inspected** - Quality inspection done
5. **Completed** - Refund/exchange processed
6. **Rejected** - Return rejected

#### Quality Inspection
- Item condition assessment
- Photo documentation
- Restocking decision
- Refund amount calculation

### 8. Financial Analysis

#### Reports & Dashboards
- Revenue by period (daily, monthly, yearly)
- Profit/loss analysis
- Cost of goods sold (COGS)
- Multi-currency financial summary
- Top products by revenue
- Supplier payment analysis
- Outstanding balances

#### Export Capabilities
- CSV/Excel export
- Date range filtering
- Currency conversion
- Tax reports

### 9. Settings

#### User Management (Admin only)
- Create/edit users
- Assign roles
- Activate/deactivate users
- Reset passwords

#### WooCommerce Integration
- Store URL configuration
- Consumer Key/Secret
- Manual sync (Products + Orders)
- Auto-sync settings (planned)
- Last sync timestamps

#### System Configuration
- Default currency
- Company information
- Location setup
- Tax settings

---

## Getting Started

### Prerequisites
- Supabase account
- WooCommerce store (for integration)
- Modern web browser

### Initial Setup

#### 1. Database Setup

Access the setup endpoint to create all database tables:

```bash
POST /make-server-4e2781f4/setup/database
```

This will create:
- `user_profiles` - User accounts
- `skus` - Product SKU master data
- `locations` - Warehouse/showroom locations
- `suppliers` - Supplier database
- `purchase_orders` - PO headers
- `purchase_order_items` - PO line items
- `grns` - Goods Received Notes
- `grn_items` - GRN line items
- `lots` - Inventory lots (Odoo-style)
- `stock_movements` - All inventory movements
- `customers` - Customer database
- `orders` - Order headers
- `order_items` - Order line items
- `returns` - Return requests
- `return_items` - Return line items
- `woo_settings` - WooCommerce configuration
- And more...

#### 2. Create Admin User

```bash
POST /make-server-4e2781f4/setup/create-admin
Content-Type: application/json

{
  "email": "admin@yourcompany.com",
  "password": "secure_password",
  "full_name": "Admin User"
}
```

#### 3. Login

Navigate to `/login` and sign in with admin credentials.

#### 4. Configure WooCommerce (Optional)

1. Go to **Settings** → **WooCommerce**
2. Edit `/src/app/config/woocommerce.ts`:

```typescript
export const wooCommerceConfig = {
  storeUrl: 'https://your-store.com',
  consumerKey: 'ck_xxxxxxxxxxxxx',
  consumerSecret: 'cs_xxxxxxxxxxxxx',
};
```

3. Click **Sync Products** to import all products
4. Click **Sync Orders** to import recent 100 orders

#### 5. Setup Locations

Create warehouse and showroom locations:
- Main Warehouse
- Showroom 1
- Showroom 2
- Damaged/QC Hold

#### 6. Add Suppliers

Add your eyewear suppliers with:
- Company details
- Contact information
- Currency and payment terms

#### 7. Create Additional Users

Create users for your team:
- Operations Managers
- Warehouse Managers
- Customer Service Representatives
- Accounts Team

---

## WooCommerce Integration

### Overview

The system integrates with WooCommerce using the REST API v3 to sync:
- **All Products** - Complete catalog sync
- **Recent 100 Orders** - Only the most recent orders going forward

### Configuration

**File:** `/src/app/config/woocommerce.ts`

```typescript
export const wooCommerceConfig = {
  storeUrl: 'https://your-store.com',
  consumerKey: 'ck_xxxxxxxxxxxxx',
  consumerSecret: 'cs_xxxxxxxxxxxxx',
};

export const isConfigured = () => {
  return !!(
    wooCommerceConfig.storeUrl &&
    wooCommerceConfig.consumerKey &&
    wooCommerceConfig.consumerSecret
  );
};
```

### Generating API Credentials

1. Login to WordPress admin
2. Go to **WooCommerce** → **Settings** → **Advanced** → **REST API**
3. Click **Add Key**
4. Set description: "ERP System Integration"
5. Set permissions: **Read/Write**
6. Click **Generate API Key**
7. Copy the Consumer Key and Consumer Secret

### Product Sync

**Endpoint:** `POST /make-server-4e2781f4/woo/sync-products-simple`

**What it syncs:**
- Product Name
- SKU
- Category
- Regular Price
- Product Image
- Product ID (for reference)

**Product Types Supported:**
- Simple products
- Variable products (with variations)

**Behavior:**
- Fetches all products (paginated, 100 per page)
- Creates new SKUs or updates existing (upsert)
- Handles variations as separate SKUs
- Auto-generates SKU code if missing: `WOO-{product_id}`

### Order Sync

**Endpoint:** `POST /make-server-4e2781f4/woo/sync-orders-simple`

**What it syncs:**
- Order number
- Customer information
- Order items
- Shipping address
- Order status
- Payment information
- Order totals

**Behavior:**
- Fetches **only the 100 most recent orders**
- Creates customers if they don't exist
- Maps WooCommerce status to internal CS status
- Imports order line items
- Links to existing SKUs

**Status Mapping:**
```typescript
WooCommerce Status → CS Status
---------------------------------
pending         → new_not_called
processing      → not_printed
on-hold         → awaiting_payment
completed       → delivered
cancelled       → refund
refunded        → refund
failed          → refund
```

### Authentication Methods

WooCommerce REST API supports two authentication methods:

#### 1. Basic Authentication (HTTPS sites)
```bash
curl -u "consumer_key:consumer_secret" \
  https://your-store.com/wp-json/wc/v3/products
```

#### 2. Query Parameters (HTTP sites or as fallback)
```bash
curl "https://your-store.com/wp-json/wc/v3/products?consumer_key=ck_xxx&consumer_secret=cs_xxx"
```

### Current Status & Troubleshooting

**Status:** Currently debugging authentication issues (401 "Missing authorization header")

**Known Issues:**
- WooCommerce API returning 401 error
- Authentication header may not be reaching WooCommerce
- Possible causes:
  - HTTP Basic Auth on server (staging protection)
  - Security plugin blocking REST API
  - .htaccess configuration
  - CORS issues

**Debugging Steps:**
1. Test credentials directly:
   ```bash
   curl -u "ck_xxx:cs_xxx" https://lunettes.com.bd/wp-json/wc/v3/products?per_page=1
   ```
2. Check WooCommerce REST API is enabled
3. Check for security plugins (Wordfence, etc.)
4. Verify credentials in WooCommerce admin
5. Check server error logs

### Manual Workaround

If automatic sync fails, you can:
1. Export products from WooCommerce (CSV)
2. Import manually via Inventory module
3. Use Google Sheets integration as intermediate

---

## API Documentation

### Base URL

```
https://{projectId}.supabase.co/functions/v1/make-server-4e2781f4
```

### Authentication

Most endpoints require authentication via JWT token:

```
Authorization: Bearer {access_token}
```

Get access token via Supabase Auth:
```typescript
const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});
const accessToken = session.access_token;
```

### Public Endpoints (No Auth Required)

#### Health Check
```
GET /health
```

#### Setup Database
```
POST /setup/database
```

#### Create Admin User
```
POST /setup/create-admin
Body: { email, password, full_name }
```

#### Check Setup Status
```
GET /setup/status
```

### Authentication Endpoints

#### Get Current User
```
GET /auth/me
Headers: Authorization: Bearer {token}
```

### User Management (Admin Only)

#### List Users
```
GET /users
Headers: Authorization: Bearer {token}
```

#### Create User
```
POST /users
Headers: Authorization: Bearer {token}
Body: { email, password, full_name, role }
```

#### Update User
```
PUT /users/:id
Headers: Authorization: Bearer {token}
Body: { full_name, role, is_active }
```

### WooCommerce Integration

#### Sync Products (Simplified - No Auth)
```
POST /woo/sync-products-simple
Body: { store_url, consumer_key, consumer_secret }
```

#### Sync Orders (Simplified - No Auth)
```
POST /woo/sync-orders-simple
Body: { store_url, consumer_key, consumer_secret }
```

#### Get WooCommerce Settings
```
GET /woo/settings
Headers: Authorization: Bearer {token}
```

#### Save WooCommerce Settings
```
POST /woo/settings
Headers: Authorization: Bearer {token}
Body: { store_url, consumer_key, consumer_secret, auto_sync_enabled, sync_interval_minutes }
```

### Inventory Endpoints

#### Get All SKUs
```
GET /inventory/skus
Headers: Authorization: Bearer {token}
```

#### Get Stock Levels
```
GET /inventory/stock
Headers: Authorization: Bearer {token}
```

#### Get Low Stock Items
```
GET /inventory/low-stock?threshold=20
Headers: Authorization: Bearer {token}
```

### Order Endpoints

#### Get All Orders
```
GET /orders
Headers: Authorization: Bearer {token}
```

#### Get Order by ID
```
GET /orders/:id
Headers: Authorization: Bearer {token}
```

#### Update Order Status
```
PUT /orders/:id/status
Headers: Authorization: Bearer {token}
Body: { cs_status }
```

#### Assign Order to CS
```
PUT /orders/:id/assign
Headers: Authorization: Bearer {token}
Body: { assigned_cs }
```

---

## Database Schema

### Key Tables

#### user_profiles
User accounts and roles

```sql
- id (uuid, FK to auth.users)
- email (text)
- full_name (text)
- role (text) - admin, operations_manager, warehouse_manager, customer_service, accounts
- is_active (boolean)
- created_at (timestamp)
```

#### skus
Product master data

```sql
- id (uuid)
- sku (text, unique)
- sku_name (text)
- category (text)
- regular_price (numeric)
- image_url (text)
- product_id (int) - WooCommerce product ID
- variation_id (int) - WooCommerce variation ID
- sync_source (text) - woocommerce, manual
- created_at (timestamp)
```

#### locations
Warehouse and showroom locations

```sql
- id (uuid)
- location_code (text, unique)
- location_name (text)
- location_type (text) - warehouse, showroom, other
- address (text)
- is_active (boolean)
```

#### suppliers
Supplier database

```sql
- id (uuid)
- supplier_code (text, unique)
- supplier_name (text)
- contact_person (text)
- email (text)
- phone (text)
- address (text)
- country (text)
- currency (text) - USD, CNY, BDT
- payment_terms (text)
- credit_limit (numeric)
- notes (text)
```

#### purchase_orders
Purchase order headers

```sql
- id (uuid)
- po_number (text, unique)
- supplier_id (uuid, FK)
- order_date (date)
- expected_delivery_date (date)
- currency (text)
- subtotal (numeric)
- tax (numeric)
- shipping_cost (numeric)
- total (numeric)
- status (text) - draft, sent, partially_received, fully_received, cancelled
- notes (text)
- created_by (uuid, FK)
```

#### purchase_order_items
PO line items

```sql
- id (uuid)
- po_id (uuid, FK)
- sku (text, FK)
- quantity (int)
- unit_price (numeric)
- total (numeric)
- received_quantity (int)
```

#### grns
Goods Received Notes

```sql
- id (uuid)
- grn_number (text, unique)
- po_id (uuid, FK)
- received_date (date)
- received_by (uuid, FK)
- location_id (uuid, FK)
- status (text) - draft, confirmed
- photos (jsonb) - array of photo URLs
- notes (text)
```

#### lots
Inventory lots (Odoo-style)

```sql
- id (uuid)
- lot_number (text, unique)
- sku (text, FK)
- location_id (uuid, FK)
- po_id (uuid, FK)
- grn_id (uuid, FK)
- received_date (date)
- original_quantity (int)
- remaining_quantity (int)
- unit_cost (numeric) - hidden from warehouse_manager
- currency (text)
```

#### stock_movements
All inventory movements

```sql
- id (uuid)
- movement_type (text) - receive, transfer, sale, adjustment, return
- sku (text, FK)
- lot_id (uuid, FK)
- from_location_id (uuid, FK)
- to_location_id (uuid, FK)
- quantity (int)
- reference_type (text) - grn, order, return, adjustment
- reference_id (uuid)
- movement_date (date)
- created_by (uuid, FK)
- notes (text)
```

#### customers
Customer database

```sql
- id (uuid)
- woo_customer_id (int) - WooCommerce customer ID
- name (text)
- email (text)
- phone (text)
- address (text)
- city (text)
- postal_code (text)
- sync_source (text) - woocommerce, manual
```

#### orders
Order headers

```sql
- id (uuid)
- woo_order_id (int, unique) - WooCommerce order ID
- order_number (text)
- customer_id (uuid, FK)
- customer_name (text)
- customer_email (text)
- customer_phone (text)
- status (text) - WooCommerce status
- cs_status (text) - Internal CS workflow status
- subtotal (numeric)
- shipping_cost (numeric)
- tax (numeric)
- discount (numeric)
- total (numeric)
- currency (text)
- shipping_address_1 (text)
- shipping_city (text)
- source (text) - woocommerce, manual, phone
- assigned_cs (uuid, FK) - Assigned CS rep
- created_date (date)
- paid_date (date)
```

#### order_items
Order line items

```sql
- id (uuid)
- order_id (uuid, FK)
- sku (text, FK)
- sku_name (text)
- quantity (int)
- price (numeric)
- total (numeric)
```

#### returns
Return requests

```sql
- id (uuid)
- return_number (text, unique)
- order_id (uuid, FK)
- customer_id (uuid, FK)
- return_date (date)
- reason (text)
- return_type (text) - refund, exchange
- status (text) - pending, approved, received, inspected, completed, rejected
- photos (jsonb)
- notes (text)
- created_by (uuid, FK)
```

#### woo_settings
WooCommerce configuration

```sql
- id (uuid)
- store_url (text)
- consumer_key (text)
- consumer_secret (text)
- last_sync_products (timestamp)
- last_sync_orders (timestamp)
- auto_sync_enabled (boolean)
- sync_interval_minutes (int)
```

---

## Troubleshooting

### Common Issues

#### 1. Cannot Login
- Verify user exists: Check `/setup/status`
- Verify credentials are correct
- Check browser console for errors
- Verify Supabase project is active

#### 2. WooCommerce Sync Failing
**Error: 401 "Missing authorization header"**

Possible causes:
- Invalid Consumer Key/Secret
- WooCommerce REST API disabled
- Server has HTTP Basic Auth (staging protection)
- Security plugin blocking API
- .htaccess configuration issue

**Solution:**
1. Verify credentials in WooCommerce admin
2. Test with curl:
   ```bash
   curl -u "ck_xxx:cs_xxx" https://your-store.com/wp-json/wc/v3/products?per_page=1
   ```
3. Check WooCommerce → Settings → Advanced → REST API
4. Disable security plugins temporarily
5. Check server error logs

**Error: CORS**
- Server doesn't allow cross-origin requests
- Add CORS headers in WordPress

#### 3. Permission Denied
- Verify user role has permission for action
- Check role-based access matrix
- Contact admin to update role

#### 4. Cost Information Visible to Warehouse Manager
- This is a bug - should be hidden
- Report to admin/developer

#### 5. Database Tables Not Created
**Error: "relation does not exist"**

**Solution:**
1. Run database setup: `POST /setup/database`
2. Check Supabase logs for SQL errors
3. Manually run SQL in Supabase dashboard if needed

#### 6. Photos Not Uploading
- Check Supabase Storage bucket exists: `make-4e2781f4-uploads`
- Verify file size < 10MB
- Check file format (JPG, PNG, WebP only)
- Check browser console for errors

### Debug Mode

Enable verbose logging in browser console:
```javascript
localStorage.setItem('debug', 'true');
```

### Getting Help

1. Check browser console for errors
2. Check Supabase Edge Function logs
3. Check network tab for failed requests
4. Review this documentation
5. Contact system administrator

---

## Future Enhancements

### Planned Features

#### Phase 1: WooCommerce Integration (Current)
- ✅ Product sync (all products)
- ✅ Order sync (recent 100)
- 🔄 Auto-sync (scheduled)
- 🔄 Webhook support (real-time updates)
- 🔄 Inventory sync back to WooCommerce
- 🔄 Order status updates to WooCommerce

#### Phase 2: Advanced Inventory
- 🔜 Barcode scanning
- 🔜 Batch operations
- 🔜 Inventory forecasting
- 🔜 Automated reorder points
- 🔜 Dead stock analysis
- 🔜 Multi-warehouse transfer optimization

#### Phase 3: Advanced Fulfillment
- 🔜 Shipping label integration (Pathao, eCourier, etc.)
- 🔜 Automated packing slip generation
- 🔜 Picking optimization (batch picking)
- 🔜 Mobile app for warehouse staff
- 🔜 Quality control checkpoints
- 🔜 Delivery tracking integration

#### Phase 4: Financial & Reporting
- 🔜 Advanced profit analysis per SKU
- 🔜 Supplier performance dashboards
- 🔜 Cash flow projections
- 🔜 Tax compliance reports
- 🔜 Automated invoice generation
- 🔜 Payment gateway integration

#### Phase 5: Customer Experience
- 🔜 Customer portal (order tracking)
- 🔜 Self-service returns
- 🔜 Loyalty program integration
- 🔜 Email notifications
- 🔜 SMS notifications
- 🔜 WhatsApp integration

#### Phase 6: Analytics & AI
- 🔜 Sales forecasting (ML-based)
- 🔜 Customer segmentation
- 🔜 Product recommendations
- 🔜 Demand prediction
- 🔜 Anomaly detection
- 🔜 Automated insights

#### Phase 7: Odoo Migration
- 🔜 Export data to Odoo format
- 🔜 Odoo API integration
- 🔜 Parallel run testing
- 🔜 Complete migration

### Technical Debt

#### High Priority
- Add comprehensive error handling
- Add unit tests
- Add integration tests
- Implement retry logic for API calls
- Add request rate limiting
- Optimize database queries

#### Medium Priority
- Add caching layer (Redis)
- Implement API versioning
- Add request logging
- Add performance monitoring
- Improve photo compression
- Add bulk operations

#### Low Priority
- Dark mode support
- Mobile responsive improvements
- Offline mode (PWA)
- Multi-language support
- Accessibility improvements (WCAG 2.1)

---

## Version History

### Version 2.0.1 (Current)
- Fixed JWT authentication with anon key
- Enhanced error logging for WooCommerce sync
- Improved role-based access control
- Added comprehensive documentation

### Version 2.0.0
- Complete ERP implementation
- All modules operational
- WooCommerce integration (in progress)
- Role-based access system
- Multi-currency support

### Version 1.0.0
- Initial database schema
- Basic authentication
- User management
- Setup endpoints

---

## Credits

**Development Team:**
- Backend: Supabase + Hono (Deno)
- Frontend: React + TypeScript + Tailwind CSS
- Integration: WooCommerce REST API v3

**Inspired by:**
- Odoo ERP (inventory management approach)
- Modern ecommerce best practices

---

## License

Internal use only - Proprietary software for eyewear business operations.

**Confidential:** This system contains sensitive business information and should not be shared externally.

---

## Contact

For support or questions, contact your system administrator.

---

**Last Updated:** March 11, 2026  
**Document Version:** 2.0  
**System Version:** 2.0.1
