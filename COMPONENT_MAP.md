# Component Map & Bolt.new Session Guide

This document is your reference for knowing exactly which file to open when making any change to this ERP system. Use it to start every new Bolt.new session with a precise file path rather than a vague description.

---

## How to Use This Document in Bolt.new

**Golden Rule:** One session = one file or one tightly related feature.

**Session Starter Template:**
```
I'm working on the [Module] module.
File: src/pages/[path/to/file].tsx

Change I need: [Describe the specific change here]
```

**Example (Good):**
```
I'm working on the Fulfillment module.
File: src/pages/fulfillment/operations/PackedTable.tsx

Add a "courier company" column between "Items" and "Total" in the desktop table view.
```

**Example (Bad):**
> "Can you update the fulfillment page to show the courier when orders are packed?"

The bad example forces the AI to search the entire codebase to find the right file, consuming 3-5x more tokens.

---

## When to Start a New Session

| Situation | Action |
|-----------|--------|
| Switching to a different module | New session |
| Finished a feature, starting another | New session |
| Session has 10+ back-and-forth messages | New session |
| Bug in one specific file | New session referencing only that file |
| Iterating on UI you just built | Same session is fine |
| Fixing 2-3 things in the same file | Same session is fine |

---

## Quick Reference by Task Type

| What you want to change | File to reference |
|-------------------------|-------------------|
| Order list columns, filters, tabs | `src/pages/fulfillment/orders/Orders.tsx` |
| Order detail layout or cards | `src/pages/fulfillment/orders/orderDetail/OrderDetail.tsx` |
| Order status transitions & CS actions | `src/pages/fulfillment/orders/orderDetail/CsActionPanel.tsx` |
| Invoice or packing slip HTML template | `src/pages/fulfillment/orders/orderDetail/InvoiceTemplate.tsx` |
| Not Printed table (warehouse) | `src/pages/fulfillment/operations/NotPrintedTable.tsx` |
| Printed / picking table (warehouse) | `src/pages/fulfillment/operations/PrintedTable.tsx` |
| Packed table / mark as shipped | `src/pages/fulfillment/operations/PackedTable.tsx` |
| Send to Lab table | `src/pages/fulfillment/operations/SendToLabTable.tsx` |
| Shipped orders table | `src/pages/fulfillment/operations/ShippedTable.tsx` |
| Operations page header, tabs, modals | `src/pages/fulfillment/Operations.tsx` |
| Barcode picking workflow | `src/components/fulfillment/PickModal.tsx` |
| Lab invoice modal | `src/components/fulfillment/LabInvoiceModal.tsx` |
| Return orders list | `src/pages/fulfillment/Returns.tsx` |
| Return order detail | `src/pages/fulfillment/ReturnDetail.tsx` |
| Bulk order status update via CSV | `src/pages/fulfillment/orders/bulkUpdate/BulkUpdateOrders.tsx` |
| Product list, create product, filters | `src/pages/inventory/Products.tsx` |
| Product detail, images, stock, suppliers | `src/pages/inventory/ProductDetail.tsx` |
| Warehouse locations | `src/pages/inventory/WarehouseLocations.tsx` |
| Stock levels view | `src/pages/inventory/Stock.tsx` |
| Stock movements history | `src/pages/inventory/StockMovements.tsx` |
| Goods receipt from PO | `src/pages/inventory/ReceiveGoods.tsx` |
| Receive flow steps (quantity/quality/complete) | `src/pages/inventory/receive/` |
| Inventory audit sessions | `src/pages/inventory/InventoryAudit.tsx` |
| Audit detail and adjustments | `src/pages/inventory/AuditDetail.tsx` |
| Purchase order list | `src/pages/purchase/PurchaseOrders.tsx` |
| Create or edit purchase order | `src/pages/purchase/CreatePurchaseOrder.tsx` |
| Purchase order detail view | `src/pages/purchase/PurchaseOrderDetail.tsx` |
| Supplier list | `src/pages/purchase/Suppliers.tsx` |
| Supplier detail and profile | `src/pages/purchase/SupplierDetail.tsx` |
| Expense tracking and list | `src/pages/finance/Expenses.tsx` |
| Add/edit expense modal | `src/components/finance/ExpenseModal.tsx` |
| Expense category management | `src/components/finance/CategoryManager.tsx` |
| Payment collection tracking | `src/pages/finance/Collection.tsx` |
| Profit & loss report | `src/pages/reports/ProfitLoss.tsx` |
| Customer list | `src/pages/customers/Customers.tsx` |
| Customer detail and order history | `src/pages/customers/CustomerDetail.tsx` |
| WooCommerce sync settings | `src/pages/settings/WooCommerceSettings.tsx` |
| Courier configuration | `src/pages/settings/CourierSettings.tsx` |
| SMS gateway settings | `src/pages/settings/SmsSettings.tsx` |
| User management and permissions | `src/pages/settings/UserManagement.tsx` |
| Barcode label printing settings | `src/pages/settings/BarcodeSettings.tsx` |
| Packaging materials settings | `src/pages/settings/PackagingSettings.tsx` |
| Store profile (name, logo, address) | `src/pages/settings/StoreProfile.tsx` |
| CS team assignment rules | `src/pages/settings/CsAssignment.tsx` |
| Sidebar navigation and layout | `src/components/Layout.tsx` |
| Login page | `src/pages/Login.tsx` |
| Dashboard KPIs and charts | `src/pages/Dashboard.tsx` |
| Role/permission checks | `src/lib/permissions.ts` |
| Shared Button component | `src/components/ui/Button.tsx` |
| Shared Input component | `src/components/ui/Input.tsx` |
| Shared Badge component | `src/components/ui/Badge.tsx` |
| Shared Card component | `src/components/ui/Card.tsx` |
| Shared Dialog/Modal component | `src/components/ui/Dialog.tsx` |
| Shared Select component | `src/components/ui/Select.tsx` |
| Shared Tabs component | `src/components/ui/Tabs.tsx` |
| Route definitions | `src/App.tsx` |
| Auth state and user context | `src/contexts/AuthContext.tsx` |
| Supabase client setup | `src/lib/supabase.ts` |

---

## Module-by-Module Breakdown

### App Entry

| File | Purpose |
|------|---------|
| `src/App.tsx` | Route definitions. All 30+ routes use lazy loading — pages only load when visited. |
| `src/main.tsx` | React entry point. |
| `src/contexts/AuthContext.tsx` | Global user state, role checks, permissions. |
| `src/contexts/RefreshContext.tsx` | Global data refresh trigger used across all modules. |
| `src/lib/supabase.ts` | Supabase client singleton. |
| `src/lib/permissions.ts` | Role-based access helper functions. |
| `src/lib/utils.ts` | General utility functions. |

### Layout

| File | Purpose |
|------|---------|
| `src/components/Layout.tsx` | App shell: sidebar, header, navigation, change password modal. |
| `src/components/ProtectedRoute.tsx` | Route guard — redirects to login if not authenticated. |

---

### Fulfillment Module

**Orders**

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/fulfillment/orders/Orders.tsx` | ~1,503 | Main order list. 6 tabs, date filters, search, bulk actions, pagination, grouping by customer, order locking. |
| `src/pages/fulfillment/orders/types.ts` | ~80 | TypeScript types for orders, `STATUS_CONFIG` map. |
| `src/pages/fulfillment/orders/StatusBadge.tsx` | ~30 | Renders a colored status badge. |
| `src/pages/fulfillment/orders/PullOrderModal.tsx` | ~80 | Modal to pull an order by WooCommerce ID. |

**Order Detail**

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/fulfillment/orders/orderDetail/OrderDetail.tsx` | ~200 | Main order detail page — composes all cards below. |
| `src/pages/fulfillment/orders/orderDetail/OrderHeader.tsx` | ~100 | Top bar: order ID, status badge, back button. |
| `src/pages/fulfillment/orders/orderDetail/CsActionPanel.tsx` | ~861 | Order status transitions, confirm/reject, reassign CS, call log. **Largest card.** |
| `src/pages/fulfillment/orders/orderDetail/OrderItemsCard.tsx` | ~610 | Line items table with picking status per item. |
| `src/pages/fulfillment/orders/orderDetail/CustomerInfoCard.tsx` | ~150 | Customer name, phone, address, email. |
| `src/pages/fulfillment/orders/orderDetail/CourierPaymentCard.tsx` | ~680 | Courier charges and payment tracking modal. |
| `src/pages/fulfillment/orders/orderDetail/CourierResponseCard.tsx` | ~150 | Courier tracking status from API. |
| `src/pages/fulfillment/orders/orderDetail/PrescriptionCard.tsx` | ~666 | Lens/prescription options editor. |
| `src/pages/fulfillment/orders/orderDetail/PackagingCard.tsx` | ~200 | Packaging items selected for order. |
| `src/pages/fulfillment/orders/orderDetail/SmsCard.tsx` | ~150 | SMS communication history and send panel. |
| `src/pages/fulfillment/orders/orderDetail/NotesCallLog.tsx` | ~200 | Order notes and call history log. |
| `src/pages/fulfillment/orders/orderDetail/ActivityLogCard.tsx` | ~150 | Audit trail of all changes. |
| `src/pages/fulfillment/orders/orderDetail/OrderSourceCard.tsx` | ~100 | WooCommerce ID, order origin, conversation link. |
| `src/pages/fulfillment/orders/orderDetail/AddProductsModal.tsx` | ~200 | Add products to existing order. |
| `src/pages/fulfillment/orders/orderDetail/InvoiceTemplate.tsx` | ~400 | HTML generator for invoices and packing slips. |
| `src/pages/fulfillment/orders/orderDetail/service.ts` | ~200 | All API calls for order detail. |
| `src/pages/fulfillment/orders/orderDetail/types.ts` | ~100 | TypeScript types for order detail. |

**Bulk Update**

| File | Purpose |
|------|---------|
| `src/pages/fulfillment/orders/bulkUpdate/BulkUpdateOrders.tsx` | CSV upload UI for bulk status changes. |
| `src/pages/fulfillment/orders/bulkUpdate/parser.ts` | CSV parsing logic. |
| `src/pages/fulfillment/orders/bulkUpdate/service.ts` | Batch update API calls. |
| `src/pages/fulfillment/orders/bulkUpdate/types.ts` | Types for bulk update. |

**Operations (Warehouse)**

| File | Purpose |
|------|---------|
| `src/pages/fulfillment/Operations.tsx` | Operations page container: tab state, data fetching, print handlers, modals. |
| `src/pages/fulfillment/operations/types.ts` | Shared types for operations tables. |
| `src/pages/fulfillment/operations/NotPrintedTable.tsx` | Table of orders needing invoice printing. |
| `src/pages/fulfillment/operations/PrintedTable.tsx` | Table of printed orders ready to pick with picking status. |
| `src/pages/fulfillment/operations/PackedTable.tsx` | Table of packed orders ready to ship. |
| `src/pages/fulfillment/operations/SendToLabTable.tsx` | Table of prescription lab orders. |
| `src/pages/fulfillment/operations/ShippedTable.tsx` | Table of recently shipped orders. |

**Returns**

| File | Purpose |
|------|---------|
| `src/pages/fulfillment/Returns.tsx` | Return orders list with status filtering. |
| `src/pages/fulfillment/ReturnDetail.tsx` | Return detail, edit, process refunds. |

**Fulfillment Modals (components)**

| File | Purpose |
|------|---------|
| `src/components/fulfillment/PickModal.tsx` | Barcode-driven pick workflow with location scanning (~821 lines). |
| `src/components/fulfillment/LabInvoiceModal.tsx` | Generate and print lab invoices for prescriptions. |
| `src/components/fulfillment/PackedExportModal.tsx` | Export packed orders list to file. |
| `src/components/fulfillment/BarcodeScannerModal.tsx` | Camera barcode scanner modal. |
| `src/components/fulfillment/QCReviewModal.tsx` | Quality check review modal. |
| `src/components/fulfillment/ReceiveReturnModal.tsx` | Process returned goods (~545 lines). |
| `src/components/fulfillment/ReturnReceiveModal.tsx` | Receive returns workflow. |
| `src/components/fulfillment/RestockModal.tsx` | Restock products to warehouse. |

---

### Inventory Module

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/inventory/Products.tsx` | ~971 | Product catalog: search, filter, create, bulk import. |
| `src/pages/inventory/ProductDetail.tsx` | ~1,348 | Product detail: images, form, locations, suppliers, stock, lots. |
| `src/pages/inventory/Stock.tsx` | ~200 | Real-time stock levels by location. |
| `src/pages/inventory/StockMovements.tsx` | ~300 | Stock transaction history. |
| `src/pages/inventory/WarehouseLocations.tsx` | ~780 | Manage warehouse locations (add, edit, deactivate). |
| `src/pages/inventory/Shipments.tsx` | ~200 | Purchase shipment/lot tracking. |
| `src/pages/inventory/InventoryAudit.tsx` | ~1,437 | Create audit sessions, count products, view flags. |
| `src/pages/inventory/AuditDetail.tsx` | ~300 | Audit session results and adjustments. |
| `src/pages/inventory/ReceiveGoods.tsx` | ~100 | Goods receipt launcher (delegates to receive flow). |
| `src/pages/inventory/CycleCounts.tsx` | ~200 | Cycle count scheduling. |

**Receive Flow**

| File | Purpose |
|------|---------|
| `src/pages/inventory/receive/ReceiveFlow.tsx` | Master receive workflow controller. |
| `src/pages/inventory/receive/ReceiveList.tsx` | List of POs pending goods receipt. |
| `src/pages/inventory/receive/StepQuantityCheck.tsx` | Step 1: verify received quantities. |
| `src/pages/inventory/receive/StepQualityCheck.tsx` | Step 2: quality inspection. |
| `src/pages/inventory/receive/StepComplete.tsx` | Step 3: finalize and commit receipt. |
| `src/pages/inventory/receive/service.ts` | API calls for receive flow. |
| `src/pages/inventory/receive/types.ts` | Types for receive flow. |

**Inventory Modals (components)**

| File | Purpose |
|------|---------|
| `src/components/inventory/BarcodeLabel.tsx` | Product barcode label display. |
| `src/components/inventory/barcodePrint.ts` | CODE39 barcode SVG generation utility. |
| `src/components/inventory/ExportProductsModal.tsx` | Export product catalog to Excel. |
| `src/components/inventory/CsvBulkUpdateModal.tsx` | Bulk product update via CSV (~958 lines). |
| `src/components/inventory/ImportStockQuantsModal.tsx` | Bulk stock quantity import (~471 lines). |
| `src/components/inventory/ImportLocationsModal.tsx` | Import warehouse locations from file. |
| `src/components/inventory/WooImportModal.tsx` | Import products from WooCommerce. |
| `src/components/inventory/LocationSearchGrid.tsx` | Location picker with search, used across modules. |

---

### Purchase Module

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/purchase/PurchaseOrders.tsx` | ~400 | PO list with status/supplier/date filters. |
| `src/pages/purchase/CreatePurchaseOrder.tsx` | ~1,979 | Create/edit PO: line items, costs, payments, file attachments, Excel export. **Largest file.** |
| `src/pages/purchase/PurchaseOrderDetail.tsx` | ~1,022 | View PO details, show received quantities. |
| `src/pages/purchase/Suppliers.tsx` | ~300 | Supplier list with search and status filter. |
| `src/pages/purchase/SupplierDetail.tsx` | ~1,185 | Supplier profile: contacts, banking, products, history. |

**Purchase Modals (components)**

| File | Purpose |
|------|---------|
| `src/components/purchase/AddSupplierModal.tsx` | Create new supplier modal. |

---

### Finance Module

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/finance/Expenses.tsx` | ~699 | Expense list with category/date filters, bulk actions, add expense. |
| `src/pages/finance/Collection.tsx` | ~300 | Payment collection tracking for orders. |
| `src/pages/finance/expenseService.ts` | ~100 | API calls for expenses. |
| `src/pages/reports/ProfitLoss.tsx` | ~479 | P&L report with revenue, COGS, expenses breakdown. |

**Finance Modals (components)**

| File | Purpose |
|------|---------|
| `src/components/finance/ExpenseModal.tsx` | Add/edit expense with receipt upload. |
| `src/components/finance/CategoryManager.tsx` | Manage expense categories hierarchy. |

---

### Customers Module

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/customers/Customers.tsx` | ~472 | Customer list with search and create. |
| `src/pages/customers/CustomerDetail.tsx` | ~681 | Customer profile, order history, stats, communication. |
| `src/pages/customers/service.ts` | ~100 | API calls for customers. |
| `src/pages/customers/types.ts` | ~50 | Customer types. |

---

### Settings Module

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/Settings.tsx` | ~100 | Settings hub with links to all sub-pages. |
| `src/pages/settings/WooCommerceSettings.tsx` | ~1,371 | WC API credentials, product/order sync, webhooks, sync log, image migration, auto-sync. |
| `src/pages/settings/CourierSettings.tsx` | ~1,197 | Configure courier providers (RedX, Pathao, etc.), API keys, pickup locations. |
| `src/pages/settings/SmsSettings.tsx` | ~567 | SMS gateway setup, templates, test SMS. |
| `src/pages/settings/UserManagement.tsx` | ~616 | User accounts, roles, module permissions, password reset. |
| `src/pages/settings/CsAssignment.tsx` | ~725 | CS team assignment rules and workload balancing. |
| `src/pages/settings/StoreProfile.tsx` | ~200 | Store name, address, phone, logo, tax ID. |
| `src/pages/settings/BarcodeSettings.tsx` | ~200 | Barcode label format and printer configuration. |
| `src/pages/settings/PackagingSettings.tsx` | ~200 | Packaging materials list and default selections. |
| `src/pages/settings/FraudAlertSettings.tsx` | ~548 | Fraud Alert External customer success rate checker service integration |

---

### Shared UI Components

All base UI components live in `src/components/ui/`. These are used everywhere — reference them when you want to change how a common element looks across the entire app.

| File | Purpose |
|------|---------|
| `src/components/ui/Button.tsx` | Button with variants: default, outline, primary; sizes: sm, md. |
| `src/components/ui/Input.tsx` | Text input with consistent focus ring styling. |
| `src/components/ui/Badge.tsx` | Status badges with color variants (emerald, red, blue, amber, gray). |
| `src/components/ui/Card.tsx` | White container with border and optional shadow. |
| `src/components/ui/Dialog.tsx` | Modal dialog overlay. |
| `src/components/ui/Select.tsx` | Dropdown select element. |
| `src/components/ui/Tabs.tsx` | Tabbed navigation component. |
| `src/components/ui/Label.tsx` | Form field label. |
| `src/components/ui/Textarea.tsx` | Multi-line text input. |

---

## Files That Are Still Large (Handle with Care)

These files are large and should be referenced precisely. When making a change, describe the exact section by name to avoid the AI rewriting unrelated parts.

| File | Lines | Sections Inside |
|------|-------|----------------|
| `src/pages/purchase/CreatePurchaseOrder.tsx` | ~1,979 | Header section, Line items table, Summary section, Payment rows, Notes & files, Changelog |
| `src/pages/fulfillment/orders/Orders.tsx` | ~1,503 | Global stats cards, Tab filters, Search bar, Order table, Pagination, Bulk actions modal |
| `src/pages/inventory/InventoryAudit.tsx` | ~1,437 | Audit list, Create audit modal, Count workflow, Flags table, Schedule section |
| `src/pages/settings/WooCommerceSettings.tsx` | ~1,371 | Credentials section, Product sync section, Order sync section, Webhooks section, Sync log table, Image migration section |
| `src/pages/inventory/ProductDetail.tsx` | ~1,348 | Image upload section, Product form, Locations section, Suppliers section, Stock section, Lots table |
| `src/pages/settings/CourierSettings.tsx` | ~1,197 | Per-courier cards, API credentials form, Webhook config |
| `src/pages/purchase/SupplierDetail.tsx` | ~1,185 | Contact info, Banking details, Products list, PO history |
| `src/pages/purchase/PurchaseOrderDetail.tsx` | ~1,022 | PO header, Line items, Receiving history |
| `src/pages/fulfillment/orders/orderDetail/CsActionPanel.tsx` | ~861 | Status buttons, Confirm modal, Reject modal, Reassign section, Call log |
| `src/components/fulfillment/PickModal.tsx` | ~821 | Scanner input, Pick list, Location confirm, Complete step |

**When referencing a large file, add a comment like:**
> "I'm looking at the **Webhooks section** in `WooCommerceSettings.tsx` — specifically the button that reactivates a paused webhook."

---

## Edge Functions

Supabase Edge Functions live in `supabase/functions/`. Each folder is one function.

| Function | Purpose |
|----------|---------|
| `supabase/functions/woo-proxy/` | Proxies WooCommerce API calls (avoids CORS). |
| `supabase/functions/woo-webhook/` | Receives WooCommerce order.created/updated webhooks. |
| `supabase/functions/woo-auto-sync/` | Cron-triggered automatic WooCommerce sync. |
| `supabase/functions/pathao-create-order/` | Creates shipment orders in Pathao API. |
| `supabase/functions/pathao-sync-status/` | Syncs delivery status from Pathao. |
| `supabase/functions/pathao-webhook/` | Receives Pathao delivery status webhooks. |
| `supabase/functions/auto-distribute-orders/` | Cron-triggered auto CS assignment. |
| `supabase/functions/image-proxy/` | Proxies external product images (fixes CORS for Excel export). |
| `supabase/functions/migrate-product-images/` | Migrates product images to Supabase Storage. |

---

## Database Migrations

All schema changes are in `supabase/migrations/`. Files are named by timestamp and description. Never edit existing migration files — always create a new one.

---

## Performance Notes

- **Lazy loading** is active on all 30+ pages. Only the current page's JavaScript loads on first visit. Navigating to a new page loads that page's code on-demand.
- **Dashboard** and **Login** are eagerly loaded (always needed immediately).
- Each operations table (NotPrintedTable, PrintedTable, etc.) is now its own file — changing the picked table no longer requires loading the shipped table's code.
