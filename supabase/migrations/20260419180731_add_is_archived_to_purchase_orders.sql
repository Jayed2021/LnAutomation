/*
  # Add is_archived column to purchase_orders

  ## Summary
  Adds a soft-delete/archive capability to purchase orders so admins can
  hide test or unwanted POs without permanently deleting any data.

  ## Changes

  ### Modified Tables
  - `purchase_orders`
    - New column `is_archived` (boolean, NOT NULL, DEFAULT false)
      - When true, the PO is hidden from the standard list and shipment
        performance report views.
      - Existing rows automatically receive false (active/visible).

  ## Notes
  1. No data is deleted — this is a reversible soft-archive.
  2. An index is added on `is_archived` so filtering active POs stays fast.
  3. No RLS policy changes are needed — the existing anon full-access policy
     already covers UPDATE.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_is_archived
  ON purchase_orders (is_archived);
