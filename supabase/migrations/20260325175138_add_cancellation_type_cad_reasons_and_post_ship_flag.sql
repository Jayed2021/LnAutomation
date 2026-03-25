/*
  # Cancellation Reasons Type + CAD Reasons + Post-Ship Total Receivable Flag

  ## Changes

  ### 1. cancellation_reasons table
  - Adds a `cancellation_type` column (`cbd` | `cad` | `both`) so CBD and CAD flows
    can each show their own relevant reason list.
  - Existing reasons are assigned `cancellation_type = 'cbd'` (they were originally
    CBD-oriented: Change of Mind, Test Order, Duplicate Order, etc.)
  - New CAD-specific reasons are seeded: Size Issue, Unreachable, Deliveryman Issue,
    Product Damaged, Discount Issue, Other (CAD)

  ### 2. order_courier_info table
  - Adds `total_receivable_modified_after_ship` boolean (default false) — set to true
    whenever the total_receivable amount is changed while the order is in Shipped status.
  - Adds `total_receivable_ship_note` text — free-text remark explaining why the amount
    was changed (e.g. discount given to customer at door).

  These two columns support the accounts-review flag workflow.
*/

-- 1a. Add cancellation_type column to cancellation_reasons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cancellation_reasons' AND column_name = 'cancellation_type'
  ) THEN
    ALTER TABLE cancellation_reasons
      ADD COLUMN cancellation_type text NOT NULL DEFAULT 'cbd'
      CHECK (cancellation_type IN ('cbd', 'cad', 'both'));
  END IF;
END $$;

-- 1b. Mark the shared "Other" reason as available to both flows
UPDATE cancellation_reasons
SET cancellation_type = 'both'
WHERE reason_text = 'Other'
  AND (cancellation_type IS NULL OR cancellation_type = 'cbd');

-- 1c. Seed CAD-specific cancellation reasons (skip if already present)
INSERT INTO cancellation_reasons (reason_text, is_active, sort_order, cancellation_type)
SELECT reason_text, true, sort_order, 'cad'
FROM (VALUES
  ('Size Issue',          10),
  ('Unreachable',         20),
  ('Deliveryman Issue',   30),
  ('Product Damaged',     40),
  ('Discount Issue',      50)
) AS new_reasons(reason_text, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM cancellation_reasons cr
  WHERE cr.reason_text = new_reasons.reason_text
    AND cr.cancellation_type = 'cad'
);

-- Re-insert "Other" for CAD if not already there as a cad entry
INSERT INTO cancellation_reasons (reason_text, is_active, sort_order, cancellation_type)
SELECT 'Other', true, 60, 'cad'
WHERE NOT EXISTS (
  SELECT 1 FROM cancellation_reasons
  WHERE reason_text = 'Other' AND cancellation_type = 'cad'
);

-- 2a. Add post-ship modification flag to order_courier_info
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_courier_info'
      AND column_name = 'total_receivable_modified_after_ship'
  ) THEN
    ALTER TABLE order_courier_info
      ADD COLUMN total_receivable_modified_after_ship boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2b. Add remark note for post-ship modification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_courier_info'
      AND column_name = 'total_receivable_ship_note'
  ) THEN
    ALTER TABLE order_courier_info
      ADD COLUMN total_receivable_ship_note text DEFAULT NULL;
  END IF;
END $$;
