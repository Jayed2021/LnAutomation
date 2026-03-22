# Eyewear ERP System — Full Technical & Functional Documentation

**Version:** Current Build (March 2026)  
**Platform:** React + Tailwind CSS (Frontend) → Supabase (Target Backend)  
**Operating Region:** Bangladesh  
**Currency Support:** BDT (primary), USD, CNY  
**Source of Truth for Orders/Products:** WooCommerce (bi-directional for orders; read-only for products)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Role-Based Access Control](#2-role-based-access-control)
3. [Dashboard](#3-dashboard)
4. [Purchase Module](#4-purchase-module)
5. [Inventory Module](#5-inventory-module)
6. [Fulfilment Module](#6-fulfilment-module)
7. [Returns Management](#7-returns-management)
8. [Finance Module](#8-finance-module)
9. [Customers Module](#9-customers-module)
10. [Reports Module](#10-reports-module)
11. [Settings Module](#11-settings-module)
12. [Cross-Cutting Concerns](#12-cross-cutting-concerns)
13. [Data Architecture (Current → Target)](#13-data-architecture)
14. [WooCommerce Integration Plan](#14-woocommerce-integration-plan)

---

## 1. System Overview

This is an internal ERP system built for an ecommerce eyewear business operating in Bangladesh. It handles the full operations lifecycle: importing goods from Chinese suppliers, warehousing, fulfilling WooCommerce orders, managing returns, and analysing profitability.

The system follows **Odoo's inventory philosophy** (lot-based tracking, two-step receiving, location-aware stock) to make future migration to Odoo smoother if needed.

### Core Design Principles

- **WooCommerce is the source of truth for orders and products, but the ERP writes order data back.** Products are synced into the ERP read-only — the ERP never pushes product stock quantities back to WooCommerce (stock is managed entirely within the ERP's lot system). Orders, however, are bi-directional: new orders are pulled from WooCommerce into the ERP (via webhooks or manual sync), and order updates made in the ERP (status changes, CS notes, courier tracking, etc.) are pushed back to WooCommerce so the store stays in sync with operational reality.
- **Cost data is strictly role-gated.** Warehouse Managers can never see landed costs, purchase prices, or profit figures — they see quantities and locations only.
- **Everything is Bangladesh-first.** Courier integrations (Pathao, Steadfast, Redx, Sundarban), currency display (BDT ৳), address formatting, and COD-first payment flows are all built for the local market.
- **The system is store-type adaptable.** A global feature flag system allows prescription/lens features to be toggled off for non-eyewear businesses using the same WooCommerce setup.

---

## 2. Role-Based Access Control

There are five fixed roles. Every screen, tab, column, and action is gated at the role level. The current user can be switched via the top-right avatar menu (development convenience — in production this will be replaced by Supabase Auth).

### Role Definitions

| Role | Description |
|---|---|
| **Admin** | Full access to every module, all cost data, all settings, all reports |
| **Operations Manager** | Full access except cannot see Profit Analysis tab; can manage POs, inventory, fulfilment, returns, expenses |
| **Warehouse Manager** | Can see inventory (quantities/locations only, no costs), receive goods, pick orders, pack orders; cannot see Finance, Purchase Orders, or Reports |
| **Customer Service (CS)** | Can see Orders (their assigned ones highlighted), can process returns, can view Customers; cannot see costs, inventory details, purchase, or finance |
| **Accounts** | Can see Finance module (Expenses, Collection) and Orders for reference; cannot see Purchase, raw inventory internals, or Reports |

### Module Access Matrix

| Module / Sub-module | Admin | Ops Manager | Warehouse | CS | Accounts |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Purchase → Purchase Orders | ✅ | ✅ | ❌ | ❌ | ❌ |
| Purchase → Create PO | ✅ | ✅ | ❌ | ❌ | ❌ |
| Purchase → Suppliers | ✅ | ✅ | ❌ | ❌ | ❌ |
| Inventory → Products | ✅ | ✅ | ✅ (no costs) | ❌ | ❌ |
| Inventory → Shipments | ✅ | ✅ | ❌ | ❌ | ❌ |
| Inventory → Stock Movements | ✅ | ✅ | ✅ (no costs) | ❌ | ❌ |
| Inventory → Warehouse | ✅ | ✅ | ✅ | ❌ | ❌ |
| Inventory → Audit | ✅ | ✅ | ✅ | ❌ | ❌ |
| Inventory → Receive Goods | ✅ | ✅ | ✅ (no costs) | ❌ | ❌ |
| Fulfilment → Orders | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fulfilment → Operations | ✅ | ✅ | ✅ | ❌ | ❌ |
| Fulfilment → Returns | ✅ | ✅ | ✅ | ✅ | ❌ |
| Finance → Expenses | ✅ | ✅ | ❌ | ❌ | ✅ |
| Finance → Profit Analysis | ✅ | ❌ | ❌ | ❌ | ❌ |
| Finance → Collection | ✅ | ✅ | ❌ | ❌ | ✅ |
| Customers | ✅ | ✅ | ❌ | ✅ | ❌ |
| Reports | ✅ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ |

### Cost Visibility Rule

A dedicated `canSeeCosts(role)` utility function controls cost column rendering. When `false`, columns for landed cost, purchase price, stock value, profit, and margins are hidden or replaced with "—" across all tables and detail views. This is enforced at the component level, not just routing.

---

## 3. Dashboard

**Access:** All roles

The dashboard is the first screen users see after login. It provides a real-time operational snapshot.

### Metric Cards (Top Row)

- **Total Stock Units** — sum of all `remaining_quantity` across all active inventory lots, with the lot count shown as context
- **Inventory Value** — total stock value calculated at landed cost per unit (hidden from Warehouse Manager, shown as "—")
- **Pending Orders** — count of orders in `not_printed`, `printed`, or `packed` CS status (i.e. confirmed but not yet shipped)
- **Active Returns** — count of returns in `expected` or `received` status (in-transit or awaiting QC)

### Low Stock Alert Panel

Lists all inventory lots where `remaining_quantity < 20`. Shows SKU name, lot ID, warehouse location, and remaining quantity. Each item links to the product detail in Inventory. This threshold is currently hardcoded at 20 units and should be made configurable per-SKU in a future iteration.

### Recent Orders Panel

Shows the 5 most recent orders with order ID, customer name, total value, payment method, and CS status badge. Each row links to the full Order Detail view.

### Pending Purchase Orders Panel

Shows POs in `ordered` or `partially_received` status, with supplier name, PO ID, expected delivery date, and total items. Links to the PO detail view.

---

## 4. Purchase Module

**Access:** Admin, Operations Manager only

This module manages the full import purchasing lifecycle — from creating a Purchase Order for a Chinese supplier through to receiving the physical goods in the warehouse.

### 4.1 Purchase Orders List

The main list view shows all POs with:
- PO ID (internal, auto-generated)
- Supplier name
- Created date / Expected arrival date
- Total items ordered
- Total cost (USD and BDT equivalent)
- Status badge

**PO Statuses:**
| Status | Meaning |
|---|---|
| `draft` | PO created but not yet sent to supplier |
| `ordered` | PO confirmed and sent; goods in transit |
| `partially_received` | Some shipments received, others still in transit |
| `closed` | All ordered quantities received and reconciled |

**Filters:** Search by PO ID or supplier name. Filter by status dropdown.

### 4.2 Create Purchase Order

A form-based screen for raising a new PO. Fields:
- **Supplier** — selected from the Suppliers list
- **Expected Delivery Date** — used for Dashboard pending PO alerts
- **Currency** — USD or CNY (cost entered in supplier's currency; BDT equivalent auto-calculated using a configurable exchange rate)
- **Line Items** — add SKUs with: ordered quantity, unit price in supplier currency, estimated shipping cost per unit, expected landed cost per unit (auto-calculated: unit price + proportional shipping + import duties)
- **Notes** — internal notes for the PO (not sent to supplier)
- **Attachments** — upload supplier proforma invoice or communication screenshots

On save, the PO is created in `draft` status. The Operations Manager or Admin manually changes it to `ordered` once the order is confirmed with the supplier.

### 4.3 Purchase Order Detail

Clicking a PO opens the detail view showing:
- Full PO header (supplier, dates, currency, exchange rate used)
- Line items table with ordered qty, received qty, remaining qty, and per-unit costs
- Shipment history — each receiving event logged with date, user, quantities received, and photo evidence
- Status timeline
- Action button to initiate receiving (navigates to Receive Goods)

### 4.4 Suppliers

A master list of all suppliers with:
- Supplier name
- Country (typically China)
- Contact name, email, phone, WhatsApp
- Payment terms (e.g. 30% deposit, 70% on shipment)
- Default currency
- Notes

**Operations:** Add new supplier, edit supplier details, view all POs for a supplier. No delete (soft-archive only to maintain history).

---

## 5. Inventory Module

**Access:** Admin, Operations Manager, Warehouse Manager (with cost restrictions)

The inventory system follows Odoo's lot-based approach. Every unit of stock is tracked at the lot level — a lot being a single shipment receipt of a specific SKU. This enables FIFO costing and full traceability.

### 5.1 Products (Stock Overview)

The top-level stock view aggregates across all lots to show the current state per SKU.

**Table columns:**
- Product image (thumbnail)
- SKU code
- Product name
- Total units in stock (sum across all lots and locations)
- Number of active lots
- Locations (list of warehouse bins/zones where this SKU exists)
- Average landed cost per unit *(hidden from Warehouse Manager)*
- Total stock value *(hidden from Warehouse Manager)*
- Low stock warning badge (if total < threshold)

**Summary cards:** Total Units, Total Stock Value (role-gated), Low Stock SKU count.

Clicking a SKU row navigates to **Product Detail**.

#### Product Detail

Shows all lots for that SKU with:
- Lot ID
- Received date
- Source PO
- Location (warehouse bin)
- Received quantity
- Sold quantity (deducted via FIFO as orders are fulfilled)
- Remaining quantity
- Landed cost per unit *(role-gated)*
- Total lot value *(role-gated)*
- Days in inventory

**Actions available from Product Detail:**
- View movement history for this SKU
- Adjust stock (with mandatory reason note — for damages, corrections, etc.)
- Transfer between locations

### 5.2 Shipments

Shows all receiving events (one per PO receiving step), providing a shipment-level view rather than SKU-level.

**Table columns:**
- Shipment ID (auto-generated: SHP-XXXX)
- Source PO ID
- Received date
- Total SKUs received
- Total units received
- Total shipment cost *(role-gated)*
- Status (active / fully depleted)

Clicking a shipment shows all lot lines within it — every SKU received in that shipment with quantities, costs, and current remaining stock.

**Warehouse Manager cannot access this tab** (it exposes cost-per-shipment data even if individual costs are hidden).

### 5.3 Stock Movements

A chronological ledger of every stock change:

| Movement Type | Trigger |
|---|---|
| `receipt` | Goods received from a PO shipment |
| `sale` | Units deducted when an order is picked and packed |
| `return_restock` | Units added back when a return passes QC |
| `adjustment` | Manual stock correction with reason |
| `transfer` | Stock moved between warehouse locations |
| `damaged` | Units written off during receiving or QC |

**Columns:** Date, movement type, SKU, lot ID, location (from → to for transfers), quantity change (+/-), reference (PO/Order ID), performed by user.

**Filters:** Date range, movement type, SKU search.

**Export:** Exportable to CSV for audit purposes.

### 5.4 Warehouse Locations

Manages the physical warehouse structure. The warehouse is divided into named locations (bins, zones, shelves).

**Location fields:**
- Location code (e.g. `A-01-03` = Aisle A, Rack 01, Shelf 03)
- Location name / description
- Location type: `storage`, `receiving`, `return_hold`, `damaged`
- Active status

**Operations:**
- Add new location
- Edit location details
- View current stock at a location (aggregated by SKU)
- Disable a location (prevents future putaway, existing stock shown as needing transfer)

### 5.5 Inventory Audit

Supports scheduled and ad-hoc physical stock counts.

**Audit creation workflow:**
1. Select one or more warehouse locations to audit
2. System generates audit sheet: every SKU-lot at those locations with the system's `expected_quantity`
3. Warehouse staff physically count and enter `counted_quantity` for each line
4. System calculates `difference` (counted minus expected)
5. Auditor adds notes and submits
6. System creates adjustment movements for any discrepancies

**Audit record stores:**
- Audit date
- Locations covered
- Conducted by (user)
- All line items with expected, counted, and difference
- Overall accuracy percentage
- Notes

**History:** All completed audits are stored and viewable. Supports export to PDF/CSV for management reporting.

### 5.6 Receive Goods

This is a **two-step receiving process** triggered from a PO (navigated from PO Detail or from the Inventory → Receive tab, which shows a badge with pending shipments count).

#### Step 1 — Quantity Check

For each SKU in the PO line:
- Enter `qty_checked` (physical count of units in the parcel/box)
- System shows `ordered_quantity` for reference
- Discrepancies are flagged (over/under shipment)
- Upload photos of the received parcel (good condition photos)
- Select warehouse location (putaway) for each SKU
- Enter barcode for each SKU if being assigned at this step

#### Step 2 — Quality Check

For each SKU from Step 1:
- Enter `quality_checked` (units that pass inspection)
- Enter `damaged_quantity` (units with defects)
- Upload photos of damaged items
- Damaged units go to the `damaged` location automatically; they do not enter sellable stock
- Enter landed cost per unit *(Admin and Operations Manager only; hidden from Warehouse Manager)*

#### Completion

On completing Step 2:
- Inventory lots are created in the database for all quality-passed units
- Stock movements of type `receipt` are recorded
- The PO shipment is logged with date, user, photos, and quantities
- PO status auto-updates to `partially_received` or `closed` based on total received vs ordered
- A receiving report is generated and can be exported as PDF

---

## 6. Fulfilment Module

**Access:** All roles (with sub-tab restrictions)

The Fulfilment module is the operational heart of the ERP. It is split into three sub-tabs: **Orders**, **Operations**, and **Returns**.

### 6.1 Orders

The Orders tab is the CS team's primary workspace. It shows all WooCommerce orders synced into the ERP.

#### Order List View

**Summary metrics at top:**
- Total orders in current filter view
- Total value
- Average order value
- Total collected amount

**Date range filter:** Today / Yesterday / This Week / This Month / Last Month / This Quarter

**Tabs within Orders:**
| Tab | What it shows |
|---|---|
| All | Every order regardless of CS status |
| Needs Action | Orders in `new_not_called`, `new_called`, `awaiting_payment` |
| Scheduled | Orders in `late_delivery` |
| In Progress | Orders in `exchange`, `send_to_lab`, `in_lab` |
| Completed | Orders in `not_printed` through `delivered` |
| Cancelled | Orders in `refund` or cancelled |

**Search:** By order ID, WooCommerce order number, customer name, or phone number.

**Status filter dropdown:** All statuses available.

**Assigned to me toggle:** CS users can filter to show only their assigned orders.

**CS Status Flow (full order lifecycle):**

```
new_not_called → new_called → awaiting_payment → not_printed
                                                → send_to_lab → in_lab → not_printed
not_printed → printed → packed → shipped → delivered
                                        ↘ late_delivery
At any point → exchange (creates return + new order)
At any point → refund
```

**Table columns:** Order ID, WooCommerce ID, Customer, Phone, Items (count), Total, Payment Method, CS Status, Assigned To, Order Date.

Clicking any row navigates to **Order Detail**.

#### Order Detail

The most feature-rich screen in the system. A CS agent works an order through its entire lifecycle from this single page.

**Header section:**
- Internal order ID + WooCommerce order ID
- Order date + created date
- CS Status badge (colour-coded)
- Assigned To (CS agent name)
- Confirmed By (who confirmed the order verbally)
- Print Invoice and Print Packing Slip buttons

**Customer Information card:**
- Customer name (editable)
- Phone number (editable, with one-click call button)
- Shipping address (editable, multi-line)
- District (editable — used on packing slip)
- Email (editable)
- Payment method (COD / bKash / Nagad / Bank Transfer — editable)
- Payment reference number (for digital payments)
- Payment status (Unpaid / Paid toggle)

**Order Source card:**
- Source: Website / Facebook / Instagram / WhatsApp / Phone
- Conversation URL (for social media orders — Facebook/Instagram message link)
- Meta screenshot upload (evidence of social order)

**Order Items card:**
- Line items table: SKU, Product name, Quantity, Unit price, Line total
- Edit mode: can adjust quantities and prices (for manual orders or corrections)
- Add item (search by SKU)
- Remove item
- Shipping fee (editable)
- Discount amount (editable)
- **Prescription Lens section** *(shown only if `enablePrescriptionLens` feature flag is ON):*
  - Prescription type (Single Vision / Progressive / Bifocal / Blue Light / Transition)
  - Lens type (Multicoated / Hard Coated / Anti-Blue / Premium Anti-Blue / Photochromic / Premium Photochromic / High Index / Custom)
  - Custom lens type text field (if Custom selected)
  - Rx file upload (PDF or image of prescription)
  - Lens price (separate line item)
  - Fitting charge
  - Prescription fields: Right Eye (SPH, CYL, AXIS, PD) and Left Eye (SPH, CYL, AXIS, PD)
- Order total (auto-calculated)

**Courier Information card:**
- Courier company (Pathao / Steadfast / Redx / Sundarban / Other)
- Tracking number (manual entry or auto-assigned by courier API in future)
- Courier area
- Total receivable (amount courier should collect)
- Collected amount (amount actually collected — updated during Collection process)
- Delivery charge
- COD charge

**CS Action Panel:**

The primary workflow control. Current CS status is shown, and a dropdown lets the agent change it. Status-specific forms appear contextually:

- **Confirming order:** Sets confirmed by, confirmation type (phone call / WhatsApp / etc.)
- **Send to Lab:** Routes the order to the optical lab before packing
- **Late Delivery:** Notes the delay reason, expected delivery date
- **Exchange:** Triggers exchange flow (links to return, creates new order reference)
- **Cancel / Refund:** Requires reason; sets refund amount if applicable

**Call Log section:**
- Log a call attempt with a timestamp note
- View all previous call attempts with timestamp and agent name
- Call attempt counter

**SMS section:**
- Pre-filled message templates
- Recipient phone (editable)
- Send SMS button (connects to SMS gateway API in production)

**Internal Notes section:**
- Free-text notes input
- Notes saved with timestamp and user attribution

**Activity Log section:**
- Immutable audit trail of every action taken on the order
- Each entry: timestamp, action description, performing user

**Print functions:**
- **Print Invoice** — generates a PDF invoice using the InvoiceTemplate (A4, includes store logo, address, all contact info from Store Identity settings, customer info, line items, totals, prescription details if applicable)
- **Print Packing Slip** — generates a PDF packing slip using PackingSlipTemplate (includes store info, customer address, items, QR code containing order data in JSON format for warehouse scanning)

### 6.2 Operations

**Access:** Admin, Operations Manager, Warehouse Manager

The Operations tab is the **warehouse workflow screen**. It shows orders that have been confirmed by CS and are ready for physical processing.

#### Status Tabs

| Tab | Orders Shown |
|---|---|
| Not Printed | Confirmed orders awaiting invoice/slip printing |
| Printed | Invoices printed, awaiting picking |
| Packed | Picked and packed, awaiting handover to courier |
| Send to Lab | Orders requiring optical lab processing |

#### Not Printed Tab — Three Action Buttons Per Row

Each order row in the Not Printed tab has three inline action buttons:

1. **Print Invoice** — generates and downloads the PDF invoice for that specific order
2. **Print Packing Slip** — generates and downloads the PDF packing slip with QR code
3. **Mark As Printed** — moves the order from `not_printed` to `printed` status (can also be done after printing via the print buttons)

#### Picking Workflow

Orders in the `printed` tab can be picked. Two scanning methods supported:

**Barcode Scanner (USB/Bluetooth):**
- The Operations page listens for keyboard input globally
- Rapid key input (< 100ms between characters) is treated as a barcode scan, not manual typing
- On Enter key after barcode scan, the order matching that barcode is highlighted and the Pick modal opens automatically

**Camera Scanner:**
- A camera-based barcode scanner dialog (using device camera)
- Scans the barcode on the printed packing slip and triggers the same Pick modal

**Pick Modal:**
The picking dialog shows:
- Order ID and customer name
- Each line item with SKU, name, quantity to pick
- FIFO lot recommendation — the system automatically suggests which lots to pick from, based on oldest receipt date first
- Location for each lot (warehouse bin number)
- Picker can confirm quantities per lot
- Partial picking supported (e.g. if stock is low; order stays in `printed` status with partial pick noted)
- On full confirmation, order moves to `packed` status and stock is deducted from the relevant lots

#### Lab Orders Tab

Orders in `send_to_lab` status. These are eyewear orders requiring prescription lens cutting/fitting at an optical lab before they can be packed.

**Lab Invoice:** A separate Lab Invoice template can be printed for the lab — includes prescription details, lens type, and fitting instructions. This is distinct from the customer-facing invoice.

On lab completion, the order is moved to `in_lab` → `not_printed` (ready for packing as a normal order).

### 6.3 Returns (within Fulfilment)

A quick-access view of returns linked to fulfilled orders. See full Returns Management section below.

---

## 7. Returns Management

**Access:** Admin, Operations Manager, Customer Service, Warehouse Manager

Returns is accessible both from the main sidebar and from within the Fulfilment module.

### Returns List

**Summary metric cards:**
- Expected (in transit back to warehouse)
- Received (physically arrived, awaiting QC)
- QC Passed (good condition, ready to restock)
- QC Failed (damaged/unsalvageable)

**Table columns:** Return ID, Original Order ID, Customer, Return reason, Items, Status, Created date.

**Filters:** Search by Return ID / Order ID / reason. Filter by status.

### Creating a Return

Returns can be initiated from:
- The Order Detail screen (via the CS Action panel, selecting "Return / Refund")
- The Returns list (manual creation for walk-in returns)

**Return creation fields:**
- Source order ID (auto-linked when initiated from order detail)
- Customer name (auto-filled from order)
- Return reason (Defective / Wrong Item / Size Issue / Changed Mind / Damaged in Transit / Other)
- Items being returned (with quantity)
- Expected return date
- Return method (courier pickup / customer drop-off)
- Courier tracking number (for return shipment)
- Refund amount agreed
- Refund method (bKash / Nagad / Cash / Bank Transfer)
- Notes

### Return Status Lifecycle

```
expected → received → qc_passed → restocked
                   ↘ qc_failed → damaged (written off)
```

| Status | Meaning |
|---|---|
| `expected` | Return initiated; items in transit back |
| `received` | Physical items received at warehouse |
| `qc_passed` | Items inspected; condition acceptable |
| `qc_failed` | Items inspected; damaged or unusable |
| `restocked` | Items added back to sellable inventory |
| `damaged` | Items written off to damaged stock |

### Return Detail View

Clicking a return opens the detail view:
- Full return header info
- Items table with per-item condition assessment
- Photo upload (evidence of returned item condition)
- QC form: for each item, mark QC pass/fail with condition notes
- Restock action: on QC pass, triggers an inventory movement of type `return_restock` adding units back to the original lot (or a new return lot)
- Refund processing: record refund issued (amount, method, date, reference)
- Activity log of all actions

---

## 8. Finance Module

**Access:** Admin (all tabs) + Accounts (Expenses and Collection only)

### 8.1 Expenses

Tracks all business operating expenses for profit calculation.

**Expense entry fields:**
- Date
- Category (Rent / Salaries / Utilities / Marketing / Packaging / Software / Shipping / Import Duties / Other)
- Description
- Amount (BDT)
- Currency (BDT / USD / CNY — with exchange rate for auto-conversion)
- Recurring (Yes/No — for auto-generating monthly entries)
- Attached receipt (image or PDF upload)
- Affects profit calculation (toggle — some expenses may be tracked for records but excluded from margin calculation)

**Expense List:**
- Filterable by date range, category, and amount range
- Grouped view by category with category subtotals
- Monthly summary card: total expenses this month vs last month
- Export to CSV

**Expense Categories tracked:**
- Rent & Utilities
- Salaries & Benefits
- Marketing & Advertising (FB/Instagram ads, influencers)
- Software & Subscriptions (WooCommerce hosting, ERP, SMS gateway)
- Packaging Materials (boxes, bubble wrap, tape, labels)
- Import Duties & Taxes
- Courier Charges (not per-order delivery charges — bulk courier account fees)
- Miscellaneous

### 8.2 Profit Analysis

**Access:** Admin only

A comprehensive profitability dashboard calculated from orders, COGS (via landed cost from inventory lots), and operating expenses.

**Date range filters:** Current Month / Last Month / Last 3 Months / Last 6 Months / This Year / Custom Range

**Summary Metric Cards:**
- Total Revenue (sum of order totals for delivered/completed orders)
- Cost of Goods Sold (COGS — calculated using FIFO lot costs per item sold)
- Gross Profit (Revenue − COGS)
- Gross Margin %
- Total Operating Expenses (from Expenses module, filtered to same period)
- Net Profit (Gross Profit − Operating Expenses)
- Net Margin %
- Total Orders (count)
- Average Order Value
- Average Net Profit per Order

**Order-Level Profitability Table:**

Each delivered order is shown with:
- Order ID / WooCommerce ID
- Date
- Customer name
- Revenue (order total)
- COGS (sum of landed costs for items in that order, using FIFO lot assignment)
- Delivery charge collected
- Shipping cost (courier charge paid by store)
- Operating expense allocation (pro-rated share of period expenses by order count)
- Gross Profit
- Net Profit
- Net Margin %

**Sorting:** By date, revenue, gross profit, net profit, margin.

**Export:** Full table exportable to CSV/Excel.

**Note:** Returns are factored in — refunded orders are excluded from revenue; restocked items have their COGS reversed.

### 8.3 Collection

The most sophisticated Finance feature. Handles the process of reconciling courier payment disbursements with the ERP's order records.

#### Background

In Bangladesh's COD-dominant ecommerce market, couriers collect cash from customers on delivery, hold it for a cycle (typically weekly), then disburse to the merchant via bank transfer with a PDF statement listing all collected amounts minus delivery fees and COD charges. This module automates the reconciliation of those courier PDF statements.

#### Collection Workflow

**Step 1 — Upload Courier Invoice**

- Select courier (Pathao / Steadfast / Redx / Sundarban)
- Upload courier PDF invoice (the weekly disbursement statement)
- The PDF is sent to an AI parsing service that:
  - Extracts invoice number, invoice date, total disbursed amount
  - Extracts all individual order rows: tracking number, collected amount, delivery charge, COD charge, net disbursed amount
  - Returns structured JSON

**Step 2 — AI Matching**

- The system matches each extracted tracking number against orders in the ERP
- Match confidence is calculated per row (high/medium/low)
- Three possible match states per row:
  - **Matched** — tracking number found in an ERP order; amounts align
  - **Not Found** — tracking number not in ERP (courier delivered an order not synced, or tracking number format mismatch)
  - **Already Updated** — this tracking number was already processed in a previous collection

**Step 3 — Review & Bulk Update**

- User reviews the matched table
- Can manually resolve `not_found` rows by searching for the order manually
- Can override collection amounts if there's a known discrepancy
- One-click **Apply All Matched** — bulk updates `collected_amount` on all matched orders simultaneously
- Unresolved rows are flagged for manual follow-up

**Step 4 — Bank Reconciliation**

- Enter the corresponding bank transaction: bank reference number, bank transfer date, bank transfer amount
- System checks: does the bank transfer amount match the courier invoice total?
- If match → Collection record status becomes `verified`
- If mismatch → status becomes `discrepancy` with the difference amount shown for investigation

**Collection Record states:** `pending` → `processing` → `verified` / `discrepancy`

**Collection History:**

A list of all past collection records with:
- Courier name
- Invoice number and date
- Total disbursed amount
- Orders matched / total orders on invoice
- Bank reference and amount
- Status badge
- Created by / date

Each collection record can be opened to view all matched orders and their individual amounts.

---

## 9. Customers Module

**Access:** Admin, Operations Manager, Customer Service

### Customer List

Customers are imported from WooCommerce (or created manually for social/phone orders).

**Table columns:** Customer name, Email, Phone, Total orders, Total spent (BDT), Last order date, District.

**Filters:** Search by name, email, or phone. Filter by district.

Clicking a customer row navigates to **Customer Detail**.

### Customer Detail

A full customer profile page with two sections: Customer Information and Prescription History.

#### Customer Information Card

All fields are editable (click Edit button, make changes, click Save):

- Full name
- Email address
- Primary phone number
- Secondary phone number
- Shipping address (line 1, line 2)
- District / City
- Notes (internal)

Changes are saved back to the ERP's customer record. Note: edits here do not sync back to WooCommerce — they are ERP-local overrides for operational purposes.

#### Order History

A table of all orders linked to this customer:
- Order ID / WooCommerce ID
- Date
- Items count
- Total amount
- Payment method
- CS Status
- Link to Order Detail

Summary stats: total orders count, total lifetime value, average order value, confirmed rate (percentage of orders that reached `not_printed` or beyond).

#### Prescription History *(only if `enablePrescriptionLens` is ON)*

A dedicated prescription management section. Customers who have previously ordered prescription lenses have their Rx data stored here for easy reorder reference.

**Prescription record fields:**
- Date recorded
- Right Eye: SPH, CYL, AXIS, PD
- Left Eye: SPH, CYL, AXIS, PD
- Prescription type (Single Vision / Progressive / etc.)
- Notes (e.g. "mild astigmatism", "high index recommended")
- Source order ID (which order this Rx was taken from)

**Operations:**
- Add new prescription record manually
- Edit existing prescription record
- Delete prescription record (with confirmation)
- Multiple prescription records can be stored per customer (e.g. updated Rx each year)

---

## 10. Reports Module

**Access:** Admin only

The Reports module provides comprehensive analytics and insights across three main categories: Sales Reports, Inventory & Operations Reports, and Customer Service Performance. All reports feature interactive filters, visualizations, and export capabilities.

### 10.1 Sales Reports

A comprehensive sales analytics dashboard with multiple sub-tabs for different analytical perspectives.

#### Overview Metrics

Top-level KPI cards showing:
- **Total Revenue** — sum of all delivered orders in selected period
- **Total Orders** — count of orders
- **Average Order Value (AOV)** — revenue / order count
- **Gross Profit** — revenue minus COGS
- **Gross Margin %** — (gross profit / revenue) × 100

#### Sub-Tabs in Sales Reports

**1. Monthly Trends**
- Line and bar charts showing month-over-month performance
- Metrics tracked: Orders, Revenue, COGS, Gross Profit, AOV
- 6-month historical view with trend indicators (up/down/stable)
- Export to CSV

**2. Product Performance**
- Detailed table of all SKUs with sales data
- Columns: SKU, Name, Category, Units Sold, Revenue, COGS, Gross Profit, GP%, Return Rate, Trend
- Sortable by any column
- Search and filter by category
- Trend indicators: up ↑ / stable → / down ↓
- Top performers highlighted with badges
- Shows which products are most profitable vs highest volume

**3. Order Funnel Analysis**
- Visual funnel chart showing order progression through lifecycle:
  - Orders Placed (all WooCommerce orders)
  - Confirmed (CS verified via phone/WhatsApp)
  - Dispatched to Courier
  - Delivered
  - Net Delivered (no returns)
- Conversion rate calculated at each stage
- Drop-off analysis to identify bottlenecks
- Helps identify CS confirmation issues and courier performance

**4. Cancellation Analysis**
- Split view: Before Dispatch vs After Dispatch
- Breakdown by cancellation reason with counts
- Reasons tracked:
  - Before Dispatch: Changed mind, Duplicate, Out of stock, Payment issues, Unreachable
  - After Dispatch: Customer refused, Wrong address, Courier failed
- Most common reasons highlighted for process improvement
- Export for deeper analysis

**5. Courier Performance Comparison**
- Detailed comparison of all courier partners (Pathao, Steadfast, Redx, Sundarban)
- Metrics per courier:
  - Total orders dispatched
  - Delivered count
  - Returned count
  - Pending count
  - Delivery rate % (delivered / total)
  - Return rate % (returned / total)
  - Average delivery days (speed metric)
  - COD expected amount (total receivable)
  - COD collected amount (actually collected)
  - Collection rate % (collected / expected)
  - Total delivery charges paid to courier
  - Total COD charges (% fee on collections)
  - Net amount disbursed to store
- Monthly trend charts per courier showing delivery vs return trends
- Best/worst performer badges for key metrics
- Export for courier negotiation and selection

**6. Revenue Reconciliation**
- Monthly reconciliation between expected and received courier payments
- Table showing:
  - Month
  - Courier name
  - Invoice number
  - Expected amount (from system)
  - Received amount (from courier)
  - Status (balanced / discrepancy)
  - Order count
- Highlights discrepancies for follow-up
- Useful for financial auditing and courier payment verification

**7. Additional Lenses** *(Eyewear-specific feature — visible when prescription lens feature is enabled)*

A specialized report for tracking prescription lens orders and lab billing.

**Overview KPI Cards:**
- **Total Lab Orders** — count of orders with prescription lenses
- **Total Lab Bill** — sum of all lens charges + fitting charges
- **Paid to Lab** — total amount already settled (with order count)
- **Outstanding** — unpaid lab bills (with order count) — highlighted in red

**Outstanding Bill Alert:**
When unpaid bills exist, a prominent amber alert banner shows:
- Total outstanding amount
- Number of orders pending payment
- Quick export button for lab billing

**Search & Filters:**
- Search by customer name, WooCommerce ID, or internal order ID
- Status filter: All / Paid / Unpaid
- Shows count of filtered orders

**Bulk Actions:**
- **Checkbox selection** — select multiple unpaid orders
- **Mark as Paid** button — bulk update selected orders to paid status
- Shows selected count and total amount in the button label

**Detailed Order Table:**
Each row displays comprehensive prescription and billing data:

| Column | Data |
|--------|------|
| Checkbox | Select for bulk payment (disabled if already paid) |
| Order | WooCommerce order ID + internal order ID |
| Customer | Name + phone number |
| Date | Order date |
| Frame | Frame SKU + product name |
| OD (Right Eye) | Sphere, Cylinder, Axis (in monospace font) |
| OS (Left Eye) | Sphere, Cylinder, Axis (in monospace font) |
| PD | Pupillary Distance |
| Lens Type | Full lens specification (e.g., "Blue Light Block 1.56 AR", "Photochromic 1.56 (Transition)") |
| Lens Price | Cost of lenses (BDT) |
| Fitting Charge | Lab fitting/assembly charge (BDT) |
| Total | Total lab bill (lens + fitting) — bold |
| Status | Badge: Paid (green) / Unpaid (amber) |
| Actions | Eye icon to view full prescription details |

**Visual Indicators:**
- Unpaid orders highlighted with amber/yellow background
- Paid orders have green checkmark badge
- Unpaid orders have amber alert badge
- Total row at bottom showing sum of lens prices, fitting charges, and total bills

**Use Cases:**
- Track all prescription lens orders in one place
- Verify prescription details before sending to lab
- Manage lab billing and payments
- Identify outstanding lab bills
- Export billing data for lab payment verification
- Bulk payment processing for efficiency

**Export Capability:**
- "Export Lab Bill" button downloads all data as CSV/PDF
- Useful for reconciling with lab invoices
- Can be filtered before export (e.g., only unpaid, or specific date range)

**Note:** This tab only appears when the "Enable Prescription Lens" feature toggle is ON in Settings → Store Profile. For non-eyewear businesses, this entire tab is hidden.

### 10.2 Inventory & Operations Reports

Four detailed sub-tabs focused on inventory health, operational efficiency, and supplier performance.

#### Sub-Tabs

**1. Inventory Aging Analysis**

Tracks how long inventory has been sitting in the warehouse to identify slow-moving stock.

**Summary Cards (4 aging buckets):**
- 0-30 Days: Fresh inventory (count of lots, total value)
- 31-60 Days: Normal aging (count of lots, total value)
- 61-90 Days: Moderate aging (count of lots, total value)
- 90+ Days: Old stock requiring action (count, value, highlighted in orange)

**Detailed Table:**
All active lots with columns:
- Lot ID
- SKU code
- Received Date
- Age (days) with badge
- Remaining Quantity
- Total Value (qty × landed cost)
- Age Band (0-30 / 31-60 / 61-90 / 90+)

**Visual Indicators:**
- Rows with 90+ days highlighted in orange background
- Age badges color-coded by severity
- Export to CSV for deeper analysis and action planning

**Purpose:** Identify slow-moving inventory and potential dead stock; prioritize sales/promotions for aging inventory.

**2. Return Rates by SKU**

Analyzes product quality and customer satisfaction through return data.

**Table Columns:**
- SKU code
- Product name
- Total Units Sold (count)
- Units Returned (count)
- Return Rate % (returned / sold × 100)
- Status badge:
  - Excellent (0% returns) — green
  - Good (<3% returns) — blue
  - Monitor (≥3% returns) — orange

**Purpose:** Identify problematic products requiring quality review, supplier feedback, or discontinuation; track impact of product improvements.

**3. Supplier Quality Scorecard**

Evaluates supplier performance based on receiving quality metrics from GRN data.

**Table Columns:**
- Supplier name
- Total POs placed (count)
- Total Units Ordered across all POs
- Damaged units received (quality failures)
- Shortage units (ordered but not received)
- Damage Rate % (damaged / ordered × 100)
- Average Delivery Delay (days late vs expected)
- Overall Rating badge: 
  - Excellent (0% damage, 0 delay) — green
  - Good (<2% damage) — blue
  - Fair (≥2% damage or delays) — yellow

**Purpose:** Make data-driven supplier selection and negotiation decisions; identify suppliers requiring quality discussions or replacement.

**4. Capital Analysis**

Shows capital tied up in inventory, helping cash flow management and working capital optimization.

**Top 10 Lots by Value Table:**
- Lot ID
- SKU code
- Age (days) badge
- Quantity remaining
- Cost per unit (landed cost)
- Total value (qty × cost) — highlighted in blue

**Summary Card (prominent):**
- **Total Capital Tied in Inventory** — sum of (remaining_qty × landed_cost) across ALL active lots
- Count of active lots system-wide

**Purpose:** Identify where most cash is locked up; prioritize sales efforts for high-value slow movers; inform purchasing decisions to optimize working capital.

### 10.3 Customer Service Performance Report

**Access:** Admin only (Operations Manager explicitly cannot access this report)

A comprehensive CS team performance dashboard tracking individual agent metrics, team-wide trends, and productivity analysis.

#### Overview Metrics (Team Level)

Top summary cards:
- **Total Active Agents** — CS team size
- **Total Orders Handled** — in selected period
- **Team Confirmation Rate** — overall % of orders successfully confirmed
- **Team Average Response Time** — average hours from order creation to first contact attempt

#### Date Range Filters

Standard period selectors:
- Today
- Yesterday
- This Week
- This Month
- Last Month
- This Quarter
- Custom Range (date picker for any date span)

#### Per-Agent Performance Cards

Individual performance cards for each CS agent showing:
- Agent name and avatar/initials
- Total orders assigned in period
- Confirmed orders count (reached `not_printed` or beyond)
- **Confirmation Rate %** with color-coded badge:
  - Green ≥ 70% (Excellent performance)
  - Yellow 50-70% (Good, needs minor improvement)
  - Red < 50% (Needs Improvement — requires intervention)
- Refund count (cancelled orders)
- Exchange count (return + reorder)
- **Trend vs Previous Period** — up ↑ / stable → / down ↓ arrows with percentage change

#### Performance Visualization Charts

**1. Confirmation Rate Trend (Multi-Line Chart)**
- One line per agent showing confirmation rate % over time
- X-axis: Time periods (daily/weekly depending on date range)
- Y-axis: Confirmation rate percentage (0-100%)
- Legend with agent names
- Hover tooltip showing exact values and date
- Identifies agents improving or declining over time

**2. Order Volume by Agent (Grouped Bar Chart)**
- Bars showing total orders assigned per agent
- Can be grouped by time period for comparison
- Identifies workload distribution and balance issues
- Highlights if certain agents are overloaded or underutilized

**3. Multi-KPI Radar Chart (Spider Chart)**
- One polygon per agent for visual performance profile comparison
- 5 Axes:
  - Confirmation Rate (% of assigned orders confirmed)
  - Volume Handled (order count)
  - Refund Rate (inverted — lower is better)
  - Speed (average days to confirm — lower is better)
  - Exchange Rate (% of orders that became exchanges)
- Allows at-a-glance identification of agent strengths and weaknesses
- Useful for training focus and role assignment

**4. Order Status Distribution (Pie Charts)**
- One pie chart per agent
- Shows breakdown of their assigned orders by final CS status:
  - Delivered (completed successfully)
  - Refund (cancelled/returned)
  - Exchange (returned + new order)
  - Late Delivery (delayed shipments)
  - In Progress (still being processed)
- Helps identify agent-specific patterns (e.g. one agent has unusually high refunds indicating a communication or confirmation issue)

**5. Coverage Exchange Matrix (Table)**
- Matrix showing which agents covered for others during absences
- Rows: Primary assigned agent
- Columns: Agent who actually handled the order
- Cells: Count of orders transferred
- Useful for understanding cross-training effectiveness and backup coverage
- Identifies knowledge silos if certain agents cannot cover for others

#### Export Capabilities

- **Export Full Performance Data** — CSV with all agent metrics for the period
- **Export Individual Agent Reports** — PDF report card per agent
- **Export Charts** — PNG images of visualizations for presentations
- **Export Raw Order Data** — CSV of all orders with agent assignments and outcomes

---

## 11. Settings Module

**Access:** Admin only

Settings has seven tabs: Store Profile, User Management, CS Assignment, WooCommerce Integration, Courier Integration, SMS Integration, and Barcode Integration.

### 11.1 Store Profile

The store identity and feature configuration hub.

#### Store Identity Section

All information entered here is used in printed invoices and exported documents:

- **Logo upload** — accepts PNG/JPG/SVG up to 500 KB; stored as base64 in localStorage (→ Supabase Storage in production); displayed on all invoices
- **Store Name** — the primary business name (used as large header text if no logo uploaded, and in the invoice address block)
- **Tagline / Slogan** — shown on invoices next to the logo
- **Address Line 1** — building/road/house number
- **Address Line 2** — area/neighbourhood
- **City** — e.g. Dhaka
- **Postal Code** — e.g. 1229
- **Country** — Bangladesh (or other)
- **Primary Phone** — main contact number
- **Secondary Phone** — optional second number
- **Email** — support/contact email
- **Website** — store website URL
- **TIN / BIN / Tax Registration No.** — printed on invoices below the address block
- **Invoice Footer Note** — a custom message printed at the bottom of every invoice (e.g. "Thank you for your purchase!")

**Live Invoice Header Preview** — shows exactly how the header will look on printed documents, updating after each save.

#### Business Type Presets

Five preset configurations:
- **Eyewear / Optical** — enables all features including prescription lens
- **Fashion / Apparel** — disables lens features
- **General eCommerce** — disables lens features
- **Beauty / Cosmetics** — disables lens features
- **Other / Custom** — manual feature toggle control

Selecting a preset instantly applies the appropriate feature flag configuration.

#### Feature Toggles

Currently implemented:

**Additional / Prescription Lens toggle:**
- When ON: shows prescription lens card in Order Detail, lens charge line in invoice, Rx fields, packing slip lens section, CS report lens metrics
- When OFF: all lens-related UI is hidden system-wide without data loss
- Affects: Order Detail, Operations packing slip, CS Performance Report, Invoice Template

More toggles planned (multi-currency display, lab workflow, courier API integrations).

### 11.2 User Management

Full CRUD management for ERP users.

**User record fields:**
- Full name
- Email address (used as login username)
- Role (one of the 5 defined roles)
- Status (Active / Inactive — inactive users cannot log in)
- Module-level permissions (granular override on top of role defaults)
- Created date
- Last login date

**Permission matrix per user:**

Each module can be individually controlled with four permission types:
- **View** — can see the module/tab
- **Create** — can create new records
- **Edit** — can modify existing records
- **Delete** — can delete records

Modules with individual permission control:
`Purchase Orders`, `Inventory`, `Fulfilment - Operations`, `Fulfilment - Orders`, `Returns`, `Expenses`, `Collection`, `Profit Analysis`, `Customers`, `Reports`, `Settings`

**Operations:**
- Add new user (opens dialog with all fields + permission matrix)
- Edit existing user
- Toggle active/inactive status
- View user details

Passwords are managed via Supabase Auth (email+password or magic link — not stored in ERP UI).

### 11.3 CS Assignment

Configures how incoming WooCommerce orders are automatically distributed among Customer Service agents.

**Assignment algorithm:**
- Each active CS agent is assigned a percentage allocation (must sum to 100%)
- When a new order syncs from WooCommerce, it is assigned to a CS agent based on their allocation percentage (round-robin weighted by percentage)
- Assignment is deterministic — if Agent A has 40% and Agent B has 60%, every 10 new orders result in 4 for A and 6 for B

**Configuration per agent:**
- Agent name (pulled from users with `customer_service` role)
- Allocation percentage
- Active/Inactive toggle

**Auto-redistribute feature:**
- When an agent is marked inactive (e.g. absent for the day), their percentage is automatically redistributed proportionally among the remaining active agents
- When reactivated, the system assigns a default equal share and adjusts others proportionally
- "Auto Balance" button instantly splits 100% equally among all active agents

**Validation:** Cannot save configuration unless active agent percentages sum to exactly 100%.

**Impact:** This assignment runs at sync time — existing orders already assigned are not re-assigned when percentages change.

### 11.4 WooCommerce Integration

The configuration page for connecting the ERP to your WooCommerce store for bi-directional order sync and product catalog sync.

**Purpose:**
- Automatically import all products from WooCommerce into ERP inventory
- Sync the 100 most recent orders from WooCommerce
- Push order status updates back to WooCommerce (planned)
- Maintain single source of truth for customer orders
- Eliminate manual data entry between store and ERP

**Configuration Fields:**
- **Store URL** — Full WooCommerce site URL (e.g., `https://lunettes.com.bd`)
- **Consumer Key** — WooCommerce REST API key starting with `ck_` (masked with show/hide toggle)
- **Consumer Secret** — WooCommerce REST API secret starting with `cs_` (masked with show/hide toggle)

**How to Generate API Credentials:**
1. Login to WordPress admin panel
2. Navigate to **WooCommerce** → **Settings** → **Advanced** → **REST API**
3. Click **Add Key**
4. Description: "ERP System Integration"
5. User: Select your admin user
6. Permissions: **Read/Write**
7. Click **Generate API Key**
8. Copy the Consumer Key and Consumer Secret immediately (secret is shown only once)
9. Paste both into the ERP Settings page

**Actions Available:**

**Test Connection** button:
- Validates credentials by making a test API call to `wp-json/wc/v3/system_status`
- Displays green "Connected" badge on success
- Shows error message on failure (common errors: invalid credentials, REST API disabled, security plugin blocking)

**Save Settings** button:
- Saves credentials securely to Supabase backend
- Encrypts secrets before storage
- Updates connection status indicator

**Sync Products** button:
- Fetches ALL products from WooCommerce (paginated, 100 per page)
- Creates/updates SKUs in ERP inventory module
- Syncs: Product name, SKU code, category, regular price, image URL, product/variation IDs
- Shows progress indicator and success/failure toast
- Displays count of products imported

**Sync Orders** button:
- Fetches the **100 most recent orders** from WooCommerce
- Creates customers if they don't exist
- Imports order line items
- Maps WooCommerce order status to internal CS status
- Shows progress indicator and success/failure toast
- Displays count of orders imported

**Connection Status Display:**
- **Connected** badge (green) — credentials valid and tested
- **Not Connected** badge (gray) — no credentials or test failed
- Last successful product sync timestamp
- Last successful order sync timestamp
- Sync status indicator (success/failed with error details)

**Security Notes:**
- Consumer Key and Secret are encrypted in database
- API calls use HTTPS and Basic Authentication
- Credentials never exposed in frontend logs
- All WooCommerce communication goes through Supabase Edge Functions

**Current Status:**
- Manual sync functional when credentials are valid
- Currently debugging 401 authentication errors with production API
- Auto-sync (scheduled background sync) planned for future release
- Webhook support (real-time sync) planned for future release

### 11.5 Courier Integration

Configures API connections to Bangladesh courier services for automated parcel booking and tracking.

**Purpose:**
- Automate parcel booking with couriers (Pathao, Steadfast, Redx, Sundarban)
- Generate courier consignment numbers automatically
- Fetch real-time tracking status
- Calculate delivery charges programmatically
- Reduce manual courier portal work

**Supported Couriers:**

#### Pathao Courier API

**Configuration Fields:**
- **Enable Pathao Integration** — toggle switch
- **Environment** — Sandbox (testing) or Production
- **Base URL** — API endpoint (auto-set based on environment)
  - Sandbox: `https://courier-api-sandbox.pathao.com`
  - Production: `https://api-hermes.pathao.com`
- **Client ID** — OAuth client ID from Pathao merchant portal
- **Client Secret** — OAuth client secret (masked with show/hide toggle)
- **Username** — Merchant username
- **Password** — Merchant password (masked with show/hide toggle)
- **Store ID** — Pathao store/merchant ID (optional, fetched from API after auth)

**Features:**
- OAuth 2.0 Authentication with automatic token generation and refresh
- Test Connection button validates credentials and retrieves access token
- Sandbox Credentials button auto-fills Pathao's official sandbox credentials for testing
- Token expiry tracking (Pathao tokens expire after 5 days)

**API Documentation:**
Detailed Pathao API documentation embedded in the system at `/src/imports/pathao-api-docs.md`

#### Steadfast Courier API

**Configuration Fields:**
- **Enable Steadfast Integration** — toggle switch
- **Environment** — Sandbox or Production
- **Base URL** — `https://portal.packzy.com/api/v1` (sandbox) or `https://portal.steadfast.com.bd/api/v1` (production)
- **API Key** — Steadfast API key (masked)
- **Secret Key** — Steadfast secret key (masked)

**Features:**
- Simpler API key-based authentication (no OAuth)
- Test Connection button validates API credentials

**API Documentation:**
Steadfast API docs embedded at `/src/imports/steadfast-api-docs.md`

**Security:**
- All API credentials encrypted at rest in Supabase
- Edge Functions handle all courier API calls (credentials never sent to frontend)
- Secrets masked in UI with show/hide toggle

**Use Cases:**
- "Book Courier" button in Order Detail uses these APIs
- Automatically create consignments when orders reach "Packed" status
- Track shipments in real-time from Fulfilment → Operations view
- Reconcile COD amounts from courier portals

### 11.6 SMS Integration

Configures Greenweb SMS API for sending automated order notifications to customers.

**Purpose:**
- Send order confirmation SMS to customers
- Send shipping notifications with tracking numbers
- Send delivery confirmation messages
- Send payment reminders
- Professional branded SMS sender ID

**Greenweb SMS Configuration:**

**API Settings:**
- **Enable SMS Integration** — toggle switch
- **API Token** — Greenweb API token (masked with show/hide toggle)
- **Base URL** — `https://api.greenweb.com.bd/api.php` (auto-configured)
- **Use SSL** — toggle for HTTPS (recommended: ON)
- **Use JSON** — toggle for JSON response format (recommended: ON)

**How to Get API Token:**
Generate token at: `https://gwb.li/token`

**Test SMS Feature:**
- Test Phone Number field (auto-formats Bangladesh numbers)
- Test Message field (customizable, max 160 chars)
- Send Test SMS button validates credentials with real SMS

**SMS Templates:**
Pre-configured templates for order confirmation, shipping notification, delivery confirmation, and payment reminders

**SMS Sending from Order Detail:**
- SMS section with pre-filled templates
- Recipient phone auto-filled from customer data
- SMS log stored in order activity timeline

**Security:**
- API token encrypted in Supabase
- All SMS sending via Edge Functions
- SMS logs tracked for audit

**API Documentation:**
Full Greenweb SMS API docs at `/src/imports/sms-api-docs.md`

### 11.7 Barcode Integration

Configures barcode label generation and printing for products and warehouse locations.

**Purpose:**
- Generate printable barcode labels for inventory SKUs
- Create location labels for warehouse bins/shelves
- Enable barcode scanning during order picking and receiving
- Standardize product identification across warehouse operations

**Label Configuration:**

**Label Size Settings:**
- Width in inches (default: 2", common: 2", 2.25", 3", 4")
- Height in inches (default: 1", common: 0.75", 1", 1.5", 2")
- Pre-configured for standard label printers (Zebra, Brother, DYMO)

**Barcode Format:**
- CODE128 (default, recommended) — alphanumeric SKUs, high density
- EAN13 — retail products with 13-digit GTINs
- UPC — US retail products with 12-digit UPCs
- CODE39 — simple alphanumeric codes

**Label Types:**

#### Product/SKU Labels
- Product name at top (bold, left-aligned, auto-truncates)
- Large barcode in middle (high-contrast, easy to scan)
- Human-readable SKU code at bottom (bold, monospace)
- Generated at 300 DPI for crisp printing

#### Warehouse Location Labels
- Location name at top
- Barcode encoding location code
- Location code at bottom (large, bold)

**Preview & Download:**
- Live preview updates in real-time
- Download Label button generates 300 DPI PNG
- Ready to print on any label printer

**Integration with Operations:**
- Scan during receiving (GRN process)
- Scan during picking (order fulfillment)
- Scan during inventory audit
- Scan for stock transfers

**Hardware Compatibility:**
- USB barcode scanners (HID keyboard mode)
- Bluetooth barcode scanners
- Mobile camera scanning

**Barcode Scanning Modes:**
1. Hardware Scanner Mode — rapid keypress detection, auto-opens Pick modal
2. Camera Scanner Mode — uses device camera for QR/barcode scanning

---

## 12. Cross-Cutting Concerns

### Print & PDF Generation

Both the Invoice and Packing Slip use `html2canvas` + `jsPDF` to render a hidden off-screen HTML template to a PDF. The templates are full A4 documents with proper print dimensions (210mm × 297mm).

**Invoice Template** renders:
- Store logo (from Store Identity settings) or store name as text
- Store tagline, full address, phone, email, website, TIN
- "INVOICE" heading
- Customer billing/shipping info
- Invoice number, invoice date, order number, order date, payment method
- Line items table (products + prescription lens row if applicable)
- Prescription details box (Rx values, Right/Left eye) if applicable
- Subtotal, discount, shipping, total
- Invoice footer note (from Store Identity settings)

**Packing Slip Template** renders:
- Store info header (condensed)
- Customer name, address, district, phone
- Items table (name, SKU, quantity)
- QR code — encoded JSON containing: `{ orderId, wooOrderId, customerName, customerPhone, items: [{sku, name, qty}], total, packingDate }` — scannable by warehouse staff for verification
- Prescription lens summary if applicable

### Barcode/QR Scanning

Two scanning modes supported throughout Operations:
1. **USB/Bluetooth hardware scanner** — captured via keyboard event listener (fast keypress sequence ending in Enter)
2. **Camera scanner** — mobile/desktop camera-based QR/barcode reader

### FIFO Inventory Costing

A utility module (`fifoLogic.ts`) handles lot assignment for order picking:
- Given a SKU and quantity needed, it sorts available lots by `received_date` ascending
- Allocates units from oldest lot first
- If a lot is exhausted, moves to next oldest
- Returns an array of `{ lotId, location, quantity }` recommendations shown in the Pick Modal

### Multi-Currency

Costs can be entered in USD (supplier), CNY (supplier), or BDT (local). All amounts are stored in original currency with an exchange rate snapshot at time of entry. BDT equivalent is calculated for display. Selling prices and order totals are always in BDT.

### Global App Settings Store

A lightweight pub/sub store (`appSettings.ts`) persists settings to `localStorage` and notifies all subscribed React components on change. No page refresh required when toggling features. In production, settings will be stored in Supabase `settings` table and fetched on app load.

---

## 13. Data Architecture

### Current State (Mock Data)

All data is currently in TypeScript mock data files (`/src/app/data/mockData.ts`, `/src/app/data/customersData.ts`). These files export arrays and objects that are imported directly into components.

This means:
- No persistence across browser sessions (changes are lost on refresh)
- No multi-user synchronisation
- No real WooCommerce data

### Target State (Supabase PostgreSQL)

#### Core Tables

```sql
-- Products synced from WooCommerce
products (
  id uuid PRIMARY KEY,
  woo_id integer UNIQUE NOT NULL,
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  category text,
  regular_price numeric(10,2),
  image_url text,          -- Supabase Storage URL (downloaded from WooCommerce)
  woo_image_url text,      -- Original WooCommerce URL (backup reference)
  stock_quantity integer,
  status text,             -- 'publish' | 'draft' | 'private'
  synced_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- Customers synced from WooCommerce + local additions
customers (
  id uuid PRIMARY KEY,
  woo_id integer UNIQUE,   -- null for manually added customers
  name text NOT NULL,
  email text,
  phone text,
  secondary_phone text,
  address_line1 text,
  address_line2 text,
  city text,
  district text,
  notes text,
  synced_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- Prescription history per customer (eyewear-specific)
prescriptions (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers(id),
  source_order_id uuid REFERENCES orders(id),
  right_sph text, right_cyl text, right_axis text, right_pd text,
  left_sph text, left_cyl text, left_axis text, left_pd text,
  prescription_type text,
  notes text,
  recorded_at timestamptz DEFAULT now()
)

-- Orders synced from WooCommerce
orders (
  id uuid PRIMARY KEY,
  woo_order_id text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  customer_name text,
  customer_phone text,
  customer_email text,
  shipping_address text,
  district text,
  items jsonb NOT NULL,    -- [{sku, name, quantity, price, product_id}]
  subtotal numeric(10,2),
  shipping_fee numeric(10,2),
  discount numeric(10,2),
  total numeric(10,2),
  payment_method text,
  payment_reference text,
  payment_status text DEFAULT 'unpaid',
  cs_status text DEFAULT 'new_not_called',
  assigned_to uuid REFERENCES users(id),
  confirmed_by uuid REFERENCES users(id),
  courier_company text,
  tracking_number text,
  courier_area text,
  total_receivable numeric(10,2),
  collected_amount numeric(10,2) DEFAULT 0,
  delivery_charge numeric(10,2),
  order_source text DEFAULT 'website',
  conversation_url text,
  notes text,
  -- Lens fields (nullable, only used when prescription lens feature on)
  prescription_type text,
  lens_type text,
  custom_lens_type text,
  lens_price numeric(10,2),
  fitting_charge numeric(10,2),
  rx_right_sph text, rx_right_cyl text, rx_right_axis text, rx_right_pd text,
  rx_left_sph text, rx_left_cyl text, rx_left_axis text, rx_left_pd text,
  rx_file_url text,
  woo_created_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Suppliers
suppliers (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  country text DEFAULT 'China',
  contact_name text,
  email text,
  phone text,
  whatsapp text,
  payment_terms text,
  default_currency text DEFAULT 'USD',
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)

-- Purchase Orders
purchase_orders (
  id uuid PRIMARY KEY,
  po_number text UNIQUE NOT NULL,  -- PO-2026-001
  supplier_id uuid REFERENCES suppliers(id),
  currency text NOT NULL,
  exchange_rate numeric(10,4),
  expected_delivery_date date,
  status text DEFAULT 'draft',
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

purchase_order_items (
  id uuid PRIMARY KEY,
  po_id uuid REFERENCES purchase_orders(id),
  product_id uuid REFERENCES products(id),
  sku text NOT NULL,
  ordered_quantity integer NOT NULL,
  unit_price numeric(10,4) NOT NULL,  -- in PO currency
  unit_price_bdt numeric(10,2),       -- converted at time of PO
  estimated_shipping_cost numeric(10,4),
  estimated_landed_cost numeric(10,4),
  received_quantity integer DEFAULT 0
)

-- Inventory lots (created on receiving)
inventory_lots (
  id uuid PRIMARY KEY,
  lot_number text UNIQUE NOT NULL,  -- LOT-2026-001
  product_id uuid REFERENCES products(id),
  sku text NOT NULL,
  po_id uuid REFERENCES purchase_orders(id),
  shipment_id uuid REFERENCES shipments(id),
  location_id uuid REFERENCES warehouse_locations(id),
  received_date date NOT NULL,
  received_quantity integer NOT NULL,
  damaged_quantity integer DEFAULT 0,
  remaining_quantity integer NOT NULL,
  landed_cost_per_unit numeric(10,4),  -- hidden from Warehouse Manager
  total_lot_value numeric(10,2),       -- hidden from Warehouse Manager
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)

-- Shipments (one per PO receiving event)
shipments (
  id uuid PRIMARY KEY,
  shipment_number text UNIQUE NOT NULL,
  po_id uuid REFERENCES purchase_orders(id),
  received_date date NOT NULL,
  received_by uuid REFERENCES users(id),
  step1_completed_at timestamptz,
  step2_completed_at timestamptz,
  total_skus integer,
  total_units_received integer,
  total_units_damaged integer,
  photo_urls jsonb,  -- [{url, type: 'good'|'damaged', filename}]
  notes text,
  created_at timestamptz DEFAULT now()
)

-- Warehouse locations
warehouse_locations (
  id uuid PRIMARY KEY,
  location_code text UNIQUE NOT NULL,
  location_name text,
  location_type text DEFAULT 'storage',  -- storage|receiving|return_hold|damaged
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)

-- Stock movements (full ledger)
stock_movements (
  id uuid PRIMARY KEY,
  movement_type text NOT NULL,
  product_id uuid REFERENCES products(id),
  lot_id uuid REFERENCES inventory_lots(id),
  from_location_id uuid REFERENCES warehouse_locations(id),
  to_location_id uuid REFERENCES warehouse_locations(id),
  quantity integer NOT NULL,
  reference_type text,   -- 'order'|'po'|'return'|'audit'|'manual'
  reference_id uuid,
  performed_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now()
)

-- Inventory audits
inventory_audits (
  id uuid PRIMARY KEY,
  audit_date date NOT NULL,
  location_ids uuid[] NOT NULL,
  conducted_by uuid REFERENCES users(id),
  items jsonb NOT NULL,  -- [{sku, lot_id, expected_qty, counted_qty, difference}]
  overall_accuracy numeric(5,2),
  notes text,
  created_at timestamptz DEFAULT now()
)

-- Returns
returns (
  id uuid PRIMARY KEY,
  return_number text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id),
  customer_id uuid REFERENCES customers(id),
  reason text NOT NULL,
  items jsonb NOT NULL,
  status text DEFAULT 'expected',
  courier_tracking text,
  expected_date date,
  received_date date,
  qc_notes text,
  photo_urls jsonb,
  refund_amount numeric(10,2),
  refund_method text,
  refund_date date,
  refund_reference text,
  processed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Expenses
expenses (
  id uuid PRIMARY KEY,
  expense_date date NOT NULL,
  category text NOT NULL,
  description text,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'BDT',
  exchange_rate numeric(10,4) DEFAULT 1,
  amount_bdt numeric(10,2) NOT NULL,
  is_recurring boolean DEFAULT false,
  affects_profit boolean DEFAULT true,
  receipt_url text,
  entered_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
)

-- Collection records (courier disbursement reconciliation)
collections (
  id uuid PRIMARY KEY,
  courier_name text NOT NULL,
  invoice_number text,
  invoice_date date,
  invoice_pdf_url text,
  total_disbursed numeric(10,2),
  bank_reference text,
  bank_amount numeric(10,2),
  bank_date date,
  status text DEFAULT 'pending',
  orders_matched integer DEFAULT 0,
  total_orders integer DEFAULT 0,
  ai_processed boolean DEFAULT false,
  matched_orders jsonb,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
)

-- App settings (key-value store for all settings)
app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now()
)

-- WooCommerce sync log
woo_sync_log (
  id uuid PRIMARY KEY,
  sync_type text NOT NULL,   -- 'products'|'orders'|'customers'
  status text NOT NULL,       -- 'success'|'failed'|'partial'
  records_synced integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_message text,
  triggered_by text,          -- 'webhook'|'manual'|'scheduled'
  triggered_by_user uuid REFERENCES users(id),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
)

-- Call logs (per order)
order_call_logs (
  id uuid PRIMARY KEY,
  order_id uuid REFERENCES orders(id),
  note text,
  logged_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
)

-- Activity log (per order — immutable audit trail)
order_activity_log (
  id uuid PRIMARY KEY,
  order_id uuid REFERENCES orders(id),
  action text NOT NULL,
  details text,
  performed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
)
```

### Row-Level Security (RLS) Strategy

Every table will have Supabase RLS policies enforcing role-based access at the database level — not just the UI level. Example:

- `inventory_lots.landed_cost_per_unit` — SELECT policy excludes `warehouse_manager` role
- `orders` — CS users can only SELECT orders where `assigned_to = auth.uid()`
- `app_settings` — only `admin` role can UPDATE
- `expenses` — `warehouse_manager` has no SELECT access

---

## 14. WooCommerce Integration Plan

### Architecture

```
WooCommerce Store (WordPress)
         │
         ├── Webhooks (push on events)
         │        │
         │        ▼
         │   Supabase Edge Function: woo-webhook-receiver
         │        │
         │        ▼
         │   PostgreSQL tables (orders, products, customers)
         │
         └── REST API (pull on demand)
                  │
                  ▼
            Supabase Edge Functions (secure — keys never in browser)
            ├── sync-products
            ├── sync-orders
            └── sync-customers
                  │
                  ▼
            PostgreSQL tables
                  │
                  ▼
            React App reads from Supabase (never from WooCommerce directly)
```

### Product Sync (WooCommerce → ERP, read-only)

**What gets synced per product:**
- `woo_id` (WooCommerce product ID)
- `name`
- `sku`
- `categories` (first category name)
- `regular_price`
- `stock_quantity` (for reference; actual sellable stock is managed by ERP lots)
- `status` (publish/draft)
- Featured image: downloaded from WordPress URL → saved to Supabase Storage → `image_url` stored in ERP

**Sync rules:**
- New product in WooCommerce → INSERT into `products`
- Updated product in WooCommerce → UPDATE matching `woo_id` row
- Deleted product in WooCommerce → mark `status = 'archived'` (never hard delete)
- ERP changes to product (e.g. internal notes) → NOT pushed to WooCommerce
- Manual sync button available in Settings → WooCommerce Integration

### Order Sync (WooCommerce → ERP)

**Trigger events:**
- `woocommerce_new_order` webhook → Edge Function creates order row
- `woocommerce_order_updated` webhook → Edge Function updates order row
- Manual "Sync Orders" button → pulls last N orders via REST API

**After sync:**
- New orders auto-assigned to a CS agent based on CS Assignment configuration
- Order status in ERP starts at `new_not_called`
- WooCommerce order status is updated by the ERP when CS status changes (e.g. when an order is confirmed, shipped, or refunded, the corresponding WooCommerce order status is pushed back via the REST API)

**ERP → WooCommerce fields pushed back:**
- Order status (mapped from ERP `cs_status` to WooCommerce order statuses)
- Tracking number (written to the WooCommerce order's shipping info)
- Internal notes / CS notes (optionally written to WooCommerce order notes)
- Courier company and tracking URL

**WooCommerce → ERP fields on initial sync:** All customer info, line items (with SKU, name, quantity, price), payment method, WooCommerce order ID, order date, WooCommerce status (as reference baseline on first import).

### Customer Sync (WooCommerce → ERP)

- Customers pulled via REST API during initial import and on new order webhook (customer upsert)
- Existing ERP customer edits are NOT overwritten on re-sync (ERP local edits take precedence)
- `woo_id` is the link key

### Manual Sync Fallback

If webhooks fail (server downtime, network issues), the Settings → WooCommerce Integration page provides:
- **Sync Products Now** — pulls full product catalogue
- **Sync Orders Now** — pulls orders from last sync timestamp onwards
- **Sync Customers Now** — pulls all customers

Each sync operation logs to `woo_sync_log` with record counts and any errors.

### Credentials Security

WooCommerce Consumer Key and Consumer Secret are stored in **Supabase Vault** (encrypted secret store) — never in the database, never in localStorage, never exposed to the browser. Only Edge Functions can read Vault secrets.

---

*This document represents the complete functional specification of the ERP system as currently built and as planned for production. It should be updated each time a new feature is implemented or an existing one is materially changed.*