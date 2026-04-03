/*
  # Collection Module Extensions

  ## Overview
  Extends the existing collection_records and collection_line_items tables to support
  multi-provider invoice uploads (Pathao, Bkash, SSL Commerz) with full audit trail
  and auto-reconciliation capabilities.

  ## Changes to collection_records
  - `provider_type` (text) - Which provider issued the invoice: pathao, bkash, ssl_commerz
  - `payment_gateway_charges` (decimal) - Total gateway charges from the invoice (Bkash charges, SSL TDR)
  - `raw_row_count` (integer) - Total rows found in the CSV
  - `unmatched_row_count` (integer) - Rows that could not be matched to an order

  ## Changes to collection_line_items
  - `consignment_id` (text) - Pathao tracking number / consignment ID for matching
  - `woo_order_id` (integer) - WooCommerce order ID extracted from invoice row
  - `invoice_type` (text) - Pathao invoice type: delivery or return
  - `gateway_charge` (decimal) - Per-row gateway charge (Bkash Charges column, SSL TDR)
  - `transaction_id` (text) - Raw transaction identifier from the invoice (Bkash TX ID, SSL TX ID)
  - `raw_data` (jsonb) - Original parsed CSV row for full auditability

  ## Notes
  - All changes use IF NOT EXISTS to be safe on re-run
  - RLS policies are not changed (inherited from existing policies)
  - The tracking_number column on collection_line_items is made nullable since Bkash/SSL
    rows do not have a tracking number
*/

-- Add provider_type to collection_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_records' AND column_name = 'provider_type'
  ) THEN
    ALTER TABLE collection_records ADD COLUMN provider_type text CHECK (provider_type IN ('pathao', 'bkash', 'ssl_commerz'));
  END IF;
END $$;

-- Add payment_gateway_charges to collection_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_records' AND column_name = 'payment_gateway_charges'
  ) THEN
    ALTER TABLE collection_records ADD COLUMN payment_gateway_charges decimal(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Add raw_row_count to collection_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_records' AND column_name = 'raw_row_count'
  ) THEN
    ALTER TABLE collection_records ADD COLUMN raw_row_count integer DEFAULT 0;
  END IF;
END $$;

-- Add unmatched_row_count to collection_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_records' AND column_name = 'unmatched_row_count'
  ) THEN
    ALTER TABLE collection_records ADD COLUMN unmatched_row_count integer DEFAULT 0;
  END IF;
END $$;

-- Make tracking_number nullable on collection_line_items (Bkash/SSL don't have tracking numbers)
ALTER TABLE collection_line_items ALTER COLUMN tracking_number DROP NOT NULL;

-- Add consignment_id to collection_line_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_line_items' AND column_name = 'consignment_id'
  ) THEN
    ALTER TABLE collection_line_items ADD COLUMN consignment_id text;
  END IF;
END $$;

-- Add woo_order_id to collection_line_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_line_items' AND column_name = 'woo_order_id'
  ) THEN
    ALTER TABLE collection_line_items ADD COLUMN woo_order_id integer;
  END IF;
END $$;

-- Add invoice_type to collection_line_items (Pathao: delivery or return)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_line_items' AND column_name = 'invoice_type'
  ) THEN
    ALTER TABLE collection_line_items ADD COLUMN invoice_type text CHECK (invoice_type IN ('delivery', 'return'));
  END IF;
END $$;

-- Add gateway_charge to collection_line_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_line_items' AND column_name = 'gateway_charge'
  ) THEN
    ALTER TABLE collection_line_items ADD COLUMN gateway_charge decimal(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Add transaction_id to collection_line_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_line_items' AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE collection_line_items ADD COLUMN transaction_id text;
  END IF;
END $$;

-- Add raw_data jsonb to collection_line_items for audit trail
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_line_items' AND column_name = 'raw_data'
  ) THEN
    ALTER TABLE collection_line_items ADD COLUMN raw_data jsonb;
  END IF;
END $$;

-- Add overdue_threshold_days to app_settings if app_settings table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'app_settings'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM app_settings WHERE key = 'collection_overdue_threshold_days'
    ) THEN
      INSERT INTO app_settings (key, value) VALUES ('collection_overdue_threshold_days', '14')
      ON CONFLICT (key) DO NOTHING;
    END IF;
  END IF;
END $$;
