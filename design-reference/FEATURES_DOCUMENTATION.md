# ERP System - Complete Features Documentation

**Version:** 1.0  
**Date:** March 8, 2026  
**Industry:** Eyewear E-commerce  
**Location:** Bangladesh  

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Authentication & User Management](#authentication--user-management)
3. [Purchase Module](#purchase-module)
4. [Inventory Module](#inventory-module)
5. [Fulfilment Module](#fulfilment-module)
6. [Returns Management](#returns-management)
7. [Finance Module](#finance-module)
8. [Customer Management](#customer-management)
9. [Reports Module](#reports-module)
10. [Settings Module](#settings-module)
11. [Database Schema](#database-schema)
12. [API Endpoints](#api-endpoints)

---

## System Overview

### Core Capabilities
- **Multi-currency Support**: USD, CNY, BDT
- **Role-Based Access Control**: 5 distinct roles with granular permissions
- **Odoo-inspired Inventory**: Following Odoo's inventory management approach
- **Real-time Sync**: WooCommerce integration for orders
- **Barcode Support**: Products and warehouse locations
- **Photo Documentation**: Upload photos during receiving process

### Technology Stack
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Routing**: React Router (Data mode)
- **Authentication**: Supabase Auth
- **Deployment**: Figma Make Platform

---

## Authentication & User Management

### Login/Signup Flow
- **Path**: `/login`, `/signup`
- **Features**:
  - Email/password authentication
  - Session management
  - Automatic profile creation
  - Role-based redirect after login

### User Roles & Permissions

#### 1. **Admin**
- Full system access
- User management
- Settings configuration
- All financial data

#### 2. **Operations Manager**
- Purchase orders management
- Supplier management
- Inventory oversight
- Financial reports
- Cannot modify user settings

#### 3. **Warehouse Manager**
- Inventory management
- Stock movements
- Receiving goods
- Picking/packing
- **NO ACCESS** to cost/financial data

#### 4. **Customer Service**
- Order management
- Returns processing
- Customer data
- Limited inventory visibility

#### 5. **Accounts**
- Financial reports
- Expense tracking
- Profit analysis
- Payment collection
- Limited operational access

---

## Purchase Module

### 1. Purchase Orders (`/purchase`)
**Component**: `PurchaseOrders.tsx`

**Features**:
- Create, edit, approve purchase orders
- Multi-currency support
- Supplier selection
- Product line items with quantities
- Status tracking: Draft → Approved → Partially Received → Received
- Export to PDF/Excel

**Data Fields**:
- PO Number (auto-generated)
- Supplier
- Order Date
- Expected Delivery Date
- Currency (USD/CNY/BDT)
- Line Items (SKU, Quantity, Unit Cost)
- Total Amount
- Notes/Terms

### 2. Create Purchase Order (`/purchase/create`)
**Component**: `CreatePO.tsx`

**Workflow**:
1. Select supplier
2. Choose currency
3. Add product line items
4. Set quantities and unit costs
5. Add notes/terms
6. Save as draft or submit for approval

### 3. Purchase Order Detail (`/purchase/:id`)
**Component**: `PODetail.tsx`

**Features**:
- View PO details
- Edit if status = Draft
- Approve PO
- Track receiving progress
- View receiving history
- Print/Export

### 4. Supplier Management (`/purchase/suppliers`)
**Component**: `Suppliers.tsx`

**Features**:
- Add/edit suppliers
- Contact information
- Default currency
- Payment terms
- Purchase history
- Performance metrics

**Supplier Fields**:
- Name
- Contact Person
- Email, Phone
- Address
- Default Currency
- Payment Terms
- Notes

### 5. Receive Goods (`/inventory/receive/:id`)
**Component**: `ReceiveGoods.tsx`

**Two-Step Receiving Process**:

**Step 1: Initial Receiving**
- Scan/enter PO number
- Verify items
- Enter received quantities
- Upload photos (optional)
- Create receiving record

**Step 2: Quality Check & Put-away**
- Verify quality
- Assign lot numbers
- Assign warehouse locations
- Generate location labels
- Update inventory

**Features**:
- Partial receiving support
- Photo upload for documentation
- Barcode scanning
- Lot number assignment
- Location assignment
- Automatic inventory updates

---

## Inventory Module

### 1. Stock Overview (`/inventory/stock`)
**Component**: `InventoryStock.tsx`

**Features**:
- Real-time stock levels by SKU
- Filter by location, product type
- Stock value (visible to authorized roles only)
- Low stock alerts
- Searchable, sortable table
- Export to Excel

**Display Columns**:
- SKU
- Product Name
- Total Quantity
- Available (not reserved)
- Reserved (for orders)
- Locations
- Last Movement
- Stock Value (role-restricted)

### 2. Inventory Lots (`/inventory/lots`)
**Component**: `InventoryLots.tsx`

**Features**:
- Track inventory by lot number
- Lot expiry tracking (if applicable)
- Traceability to purchase orders
- Lot-based stock queries

**Lot Information**:
- Lot Number
- SKU
- Quantity
- Location
- Received Date
- Source PO
- Expiry Date (optional)

### 3. Stock Movements (`/inventory/movements`)
**Component**: `InventoryMovements.tsx`

**Movement Types**:
- Receiving (from PO)
- Picking (for orders)
- Returns (customer returns)
- Adjustments (cycle counts)
- Transfers (between locations)

**Features**:
- Complete movement history
- Filter by date, type, SKU, location
- Audit trail
- Export reports

**Movement Fields**:
- Timestamp
- Type
- SKU
- Quantity
- From Location
- To Location
- Reference (Order #, PO #, etc.)
- User
- Notes

### 4. Warehouse Locations (`/inventory/warehouse`)
**Component**: `WarehouseLocations.tsx`

**Features**:
- Hierarchical location structure
- Location barcode generation
- Location-based stock queries
- Location capacity tracking

**Location Hierarchy**:
```
Zone → Aisle → Rack → Shelf → Bin
Example: A-01-R3-S2-B05
```

**Features**:
- Add/edit locations
- Generate location barcodes
- View stock by location
- Location audit history

### 5. Inventory Audit (`/inventory/audit`)
**Component**: `InventoryAudit.tsx`

**Cycle Count Process**:
1. Select location(s) to audit
2. Scan location barcode
3. Scan products and count quantities
4. Compare with system quantities
5. Review discrepancies
6. Approve adjustments
7. Generate audit report

**Features**:
- Location-based auditing
- Barcode scanning
- Discrepancy reporting
- Automatic adjustments
- Audit history
- Export reports

### 6. Product Detail (`/inventory/product/:sku`)
**Component**: `ProductDetail.tsx`

**Product Information**:
- SKU, Name, Description
- Current stock levels
- Stock by location
- Stock by lot
- Movement history
- Reserved quantities
- Reorder level
- Images

---

## Fulfilment Module

### 1. Orders List (`/fulfilment/orders`)
**Component**: `Orders.tsx`

**Features**:
- View all WooCommerce orders
- Filter by status, date, customer
- Search by order number
- Assign to Customer Service reps
- Bulk operations
- Export orders

**Order Statuses**:
- New (synced from WooCommerce)
- Processing (assigned to CS)
- Ready to Pick
- Picking in Progress
- Packed
- Shipped
- Delivered
- Cancelled

### 2. Order Detail (`/fulfilment/orders/:id`)
**Component**: `OrderDetail.tsx`

**Features**:
- Complete order information
- Customer details
- Prescription data (if applicable)
- Order line items
- Payment status
- Shipping information
- Order notes/history
- CS assignment
- Generate invoice
- Generate packing slip
- Process return

**Order Information**:
- Order Number
- Customer Name, Phone, Email
- Shipping Address
- Billing Address
- Line Items (Product, Qty, Price)
- Prescription Details
- Payment Method
- Payment Status
- Shipping Method
- Order Notes
- Internal Notes

### 3. Operations/Picking (`/fulfilment/operations`)
**Component**: `Operations.tsx`

**Picking Workflow**:
1. View orders ready to pick
2. Start picking batch
3. Scan products or manually confirm
4. Mark as picked
5. Move to packing
6. Generate packing slip
7. Mark as shipped

**Features**:
- Batch picking support
- Barcode scanning
- Pick location guidance
- Packing slip generation
- Shipping label integration (future)

### 4. Operations Order Detail (`/fulfilment/operations/:id`)
**Component**: `OperationsOrderDetail.tsx`

**Detailed Picking Interface**:
- Order summary
- Line items with locations
- Scan to pick
- Quantity verification
- Packing checklist
- Generate packing slip
- Mark complete

---

## Returns Management

### Returns Module (`/fulfilment/returns`)
**Component**: `Returns.tsx`

**Return Workflow**:
1. Customer initiates return (WooCommerce or manual)
2. CS creates return record
3. Return authorization generated
4. Customer ships item
5. Warehouse receives return
6. Quality inspection
7. Restock or dispose
8. Refund processing

**Features**:
- Return authorization
- Return reasons tracking
- Quality inspection
- Restock to inventory
- Refund management
- Return analytics

**Return Fields**:
- Return Number (auto-generated)
- Original Order Number
- Customer
- Return Items (SKU, Qty, Reason)
- Return Status
- Inspection Notes
- Refund Amount
- Refund Status
- Restocking Fee

**Return Reasons**:
- Wrong item received
- Defective product
- Size/fit issue
- Changed mind
- Prescription error
- Other

---

## Finance Module

### 1. Expenses (`/finance/expenses`)
**Component**: `Expenses.tsx`

**Expense Categories**:
- Purchase Orders
- Shipping/Freight
- Warehouse Rent
- Utilities
- Salaries
- Marketing
- Office Supplies
- Other

**Features**:
- Record expenses
- Categorize expenses
- Multi-currency support
- Attach receipts
- Filter by date, category
- Export reports
- Monthly/yearly summaries

**Expense Fields**:
- Date
- Category
- Amount
- Currency
- Description
- Reference (PO #, Invoice #)
- Receipt attachment
- Approval status

### 2. Profit Analysis (`/finance/profit`)
**Component**: `ProfitAnalysis.tsx`

**Metrics**:
- Revenue (from orders)
- Cost of Goods Sold
- Gross Profit
- Expenses
- Net Profit
- Profit Margin %

**Features**:
- Date range selection
- Multi-currency support
- Product-level profit analysis
- Order-level profit analysis
- Export reports
- Charts and visualizations

**Analysis Views**:
- Overall P&L
- By Product
- By Category
- By Date Range
- By Customer Segment

### 3. Payment Collection (`/finance/collection`)
**Component**: `Collection.tsx`

**Features**:
- Track pending payments
- Record payments received
- Payment method tracking
- Outstanding balances
- Payment reminders
- Collection reports

---

## Customer Management

### 1. Customers List (`/customers`)
**Component**: `Customers.tsx`

**Features**:
- View all customers
- Search by name, phone, email
- Filter by order history
- Export customer list
- Customer segmentation

**Customer Fields**:
- Name
- Email
- Phone
- Total Orders
- Total Spent
- Last Order Date
- Prescription on File

### 2. Customer Detail (`/customers/:id`)
**Component**: `CustomerDetail.tsx`

**Features**:
- Complete customer profile
- Order history
- Prescription history
- Payment history
- Return history
- Customer notes
- Communication history

**Prescription Management**:
- Store multiple prescriptions
- OD (Right Eye) and OS (Left Eye) values
- SPH, CYL, AXIS, ADD, PD
- Prescription date
- Prescribing doctor
- Prescription images

---

## Reports Module

### Reports Dashboard (`/reports`)
**Component**: `Reports.tsx`

**Available Reports**:
1. **CS Performance Report**
   - Orders assigned per CS rep
   - Average handling time
   - Customer satisfaction
   - Returns per CS rep

2. **Sales Reports**
   - Daily/weekly/monthly sales
   - Sales by product
   - Sales by category
   - Revenue trends

3. **Customer Reports**
   - New customers
   - Repeat customers
   - Customer lifetime value
   - Customer segmentation

4. **Inventory Reports**
   - Stock levels
   - Low stock alerts
   - Stock value
   - Inventory turnover

5. **Financial Reports**
   - P&L Statement
   - Expense breakdown
   - Revenue by channel
   - Cash flow

**Features**:
- Date range selection
- Export to PDF/Excel
- Scheduled reports (future)
- Role-based access

---

## Settings Module

### Settings (`/settings`)
**Component**: `Settings.tsx`

**Settings Sections**:
1. Store Profile
2. WooCommerce Integration
3. User Management
4. Barcode Settings
5. CS Assignment Rules
6. Courier Settings
7. SMS Settings

### 1. Store Profile (`/settings`)
**Component**: `StoreProfile.tsx`

**Store Information**:
- Store Name
- Logo Upload
- Address
- Phone, Email, Website
- Tax ID / Business Registration
- Default Currency
- Timezone

**Feature Toggles**:
- Enable "Additional / Prescription Lens" features
- Enable barcode scanning
- Enable SMS notifications
- Enable auto-assignment

**Invoice Settings**:
- Invoice prefix
- Invoice numbering
- Tax rates
- Payment terms
- Footer text

### 2. WooCommerce Integration (`/settings`)
**Component**: `WooCommerceSettings.tsx`

**Configuration**:
- WooCommerce URL
- Consumer Key
- Consumer Secret
- Test connection
- Sync frequency
- Auto-sync toggle

**Sync Options**:
- Sync orders automatically
- Sync products
- Sync customers
- Update order status back to WooCommerce

**Features**:
- Manual sync trigger
- Sync history/logs
- Error handling
- Webhook setup

### 3. User Management (`/settings`)
**Component**: `UserManagement.tsx`

**Features**:
- Add/edit users
- Assign roles
- Activate/deactivate users
- Reset passwords
- View user activity

**User Fields**:
- Name
- Email
- Role (Admin, Operations Manager, etc.)
- Status (Active/Inactive)
- Last Login
- Created Date

### 4. Barcode Settings (`/settings`)
**Component**: `BarcodeSettings.tsx`

**Dual-Purpose Barcode System**:

**Product Barcodes**:
- Enable product barcode scanning
- Barcode format (EAN-13, Code 128, QR Code)
- Auto-generate barcodes
- Print product labels

**Location Barcodes**:
- Enable location barcode scanning
- Location barcode format
- Auto-generate location barcodes
- Print location labels

**Features**:
- Barcode generator
- Bulk barcode generation
- Print templates
- Scanner configuration

### 5. CS Assignment (`/settings`)
**Component**: `CSAssignment.tsx`

**Assignment Rules**:
- Round-robin assignment
- Manual assignment
- Load balancing
- Priority-based assignment

**Features**:
- View CS workload
- Reassign orders
- Assignment history

### 6. Courier Settings (`/settings`)
**Component**: `CourierSettings.tsx`

**Courier Configuration**:
- Add courier companies
- Delivery zones
- Shipping rates
- Tracking integration
- Default courier selection

### 7. SMS Settings (`/settings`)
**Component**: `SMSSettings.tsx`

**SMS Notifications**:
- Order confirmation
- Shipping updates
- Delivery confirmation
- Return authorization

**Configuration**:
- SMS provider API key
- Sender ID
- Message templates
- Test SMS

---

## Database Schema

### Core Tables

#### `user_profiles`
```sql
- id (uuid, PK)
- email (text)
- name (text)
- role (enum)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `suppliers`
```sql
- id (uuid, PK)
- name (text)
- contact_person (text)
- email (text)
- phone (text)
- address (text)
- default_currency (text)
- payment_terms (text)
- created_at (timestamp)
```

#### `purchase_orders`
```sql
- id (uuid, PK)
- po_number (text, unique)
- supplier_id (uuid, FK)
- order_date (date)
- expected_delivery (date)
- currency (text)
- status (enum)
- total_amount (decimal)
- notes (text)
- created_by (uuid, FK)
- created_at (timestamp)
```

#### `purchase_order_items`
```sql
- id (uuid, PK)
- po_id (uuid, FK)
- sku (text)
- product_name (text)
- quantity (integer)
- unit_cost (decimal)
- total_cost (decimal)
```

#### `inventory_stock`
```sql
- id (uuid, PK)
- sku (text)
- product_name (text)
- total_quantity (integer)
- available_quantity (integer)
- reserved_quantity (integer)
- last_movement (timestamp)
- created_at (timestamp)
```

#### `inventory_lots`
```sql
- id (uuid, PK)
- lot_number (text, unique)
- sku (text)
- quantity (integer)
- location_id (uuid, FK)
- po_id (uuid, FK)
- received_date (date)
- expiry_date (date, nullable)
```

#### `warehouse_locations`
```sql
- id (uuid, PK)
- location_code (text, unique)
- location_name (text)
- zone (text)
- aisle (text)
- rack (text)
- shelf (text)
- bin (text)
- barcode (text)
- capacity (integer)
```

#### `inventory_movements`
```sql
- id (uuid, PK)
- movement_type (enum)
- sku (text)
- quantity (integer)
- from_location_id (uuid, FK, nullable)
- to_location_id (uuid, FK, nullable)
- reference_id (uuid, nullable)
- reference_type (text)
- notes (text)
- created_by (uuid, FK)
- created_at (timestamp)
```

#### `orders`
```sql
- id (uuid, PK)
- order_number (text, unique)
- woo_order_id (text, nullable)
- customer_id (uuid, FK)
- status (enum)
- payment_status (enum)
- total_amount (decimal)
- currency (text)
- shipping_address (jsonb)
- billing_address (jsonb)
- assigned_to (uuid, FK, nullable)
- created_at (timestamp)
```

#### `order_items`
```sql
- id (uuid, PK)
- order_id (uuid, FK)
- sku (text)
- product_name (text)
- quantity (integer)
- unit_price (decimal)
- total_price (decimal)
- prescription_data (jsonb, nullable)
```

#### `customers`
```sql
- id (uuid, PK)
- woo_customer_id (text, nullable)
- name (text)
- email (text)
- phone (text)
- total_orders (integer)
- total_spent (decimal)
- last_order_date (date)
- created_at (timestamp)
```

#### `prescriptions`
```sql
- id (uuid, PK)
- customer_id (uuid, FK)
- od_sph, od_cyl, od_axis (decimal)
- os_sph, os_cyl, os_axis (decimal)
- add_power (decimal)
- pd (decimal)
- prescription_date (date)
- prescribing_doctor (text)
- image_url (text, nullable)
```

#### `returns`
```sql
- id (uuid, PK)
- return_number (text, unique)
- order_id (uuid, FK)
- customer_id (uuid, FK)
- status (enum)
- return_reason (text)
- refund_amount (decimal)
- refund_status (enum)
- created_at (timestamp)
```

#### `expenses`
```sql
- id (uuid, PK)
- date (date)
- category (text)
- amount (decimal)
- currency (text)
- description (text)
- reference (text)
- receipt_url (text, nullable)
- approved (boolean)
- created_at (timestamp)
```

#### `settings`
```sql
- id (uuid, PK)
- key (text, unique)
- value (jsonb)
- updated_at (timestamp)
```

---

## API Endpoints

### Server Base URL
```
/make-server-4e2781f4
```

### WooCommerce Integration
```
POST   /woocommerce/sync-orders
GET    /woocommerce/orders
POST   /woocommerce/update-order-status
GET    /woocommerce/products
GET    /woocommerce/customers
```

### Purchase Orders
```
GET    /purchase-orders
POST   /purchase-orders
GET    /purchase-orders/:id
PUT    /purchase-orders/:id
DELETE /purchase-orders/:id
POST   /purchase-orders/:id/approve
```

### Inventory
```
GET    /inventory/stock
GET    /inventory/stock/:sku
GET    /inventory/lots
GET    /inventory/movements
POST   /inventory/movements
GET    /inventory/locations
POST   /inventory/locations
```

### Orders
```
GET    /orders
GET    /orders/:id
PUT    /orders/:id
POST   /orders/:id/assign
POST   /orders/:id/pick
POST   /orders/:id/pack
POST   /orders/:id/ship
```

### Returns
```
GET    /returns
POST   /returns
GET    /returns/:id
PUT    /returns/:id
POST   /returns/:id/restock
```

### Reports
```
GET    /reports/cs-performance
GET    /reports/sales
GET    /reports/inventory
GET    /reports/financial
```

---

## Role-Based Access Summary

| Module | Admin | Ops Manager | Warehouse Manager | Customer Service | Accounts |
|--------|-------|-------------|-------------------|------------------|----------|
| Purchase Orders | ✅ Full | ✅ Full | ❌ | ❌ | 👁️ View |
| Suppliers | ✅ Full | ✅ Full | ❌ | ❌ | 👁️ View |
| Inventory | ✅ Full | ✅ Full | ✅ No Costs | 👁️ View | 👁️ View |
| Orders | ✅ Full | ✅ Full | ✅ Picking | ✅ Full | 👁️ View |
| Returns | ✅ Full | ✅ Full | ✅ Receive | ✅ Full | 👁️ View |
| Customers | ✅ Full | ✅ Full | 👁️ View | ✅ Full | 👁️ View |
| Finance | ✅ Full | ✅ Full | ❌ | ❌ | ✅ Full |
| Reports | ✅ Full | ✅ Full | 👁️ Limited | 👁️ Limited | ✅ Full |
| Settings | ✅ Full | 👁️ View | ❌ | ❌ | ❌ |
| Users | ✅ Full | ❌ | ❌ | ❌ | ❌ |

---

## Notes for Documentation

### Screenshots to Capture:
- [ ] Login page
- [ ] Dashboard overview
- [ ] Purchase Orders list
- [ ] Create PO form
- [ ] Receive goods interface
- [ ] Inventory stock view
- [ ] Warehouse locations
- [ ] Order list
- [ ] Order detail page
- [ ] Picking interface
- [ ] Returns management
- [ ] Customer detail with prescription
- [ ] Finance dashboard
- [ ] Settings pages (all sections)

### Workflows to Document:
- [ ] Complete PO creation → Receiving → Put-away workflow
- [ ] Order fulfillment: Sync → Assign → Pick → Pack → Ship
- [ ] Returns: Authorization → Receive → Inspect → Restock/Dispose
- [ ] Customer prescription management
- [ ] WooCommerce sync process
- [ ] Barcode scanning (products and locations)

### Testing Scenarios:
- [ ] Create sample PO with multiple currencies
- [ ] Receive goods with photo uploads
- [ ] Process order with prescription
- [ ] Handle return with refund
- [ ] Run inventory audit
- [ ] Generate financial reports
- [ ] Test role-based access restrictions

---

## Future Enhancements

### Planned Features:
- [ ] Mobile app for warehouse operations
- [ ] Advanced analytics dashboard
- [ ] Multi-warehouse support
- [ ] Supplier portal
- [ ] Customer portal for order tracking
- [ ] Automated reorder points
- [ ] Integration with shipping carriers
- [ ] WhatsApp notifications
- [ ] Advanced prescription lens calculator
- [ ] Warranty tracking

---

**End of Documentation**

*This is a living document. Update as features are added or modified.*
