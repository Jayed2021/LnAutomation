/*
  # Add Return Inventory Tracking

  ## Summary
  Extends the return_items table with columns to track the physical lifecycle of
  each returned item through the warehouse — from receipt at the return hold location,
  through QC, to final restock or damage write-off.

  ## Changes to return_items
  - `receive_status` (text, default 'pending') — tracks whether an individual item
    was scanned/received, or marked as lost. Values: 'pending', 'received', 'lost'
  - `lost_reason` (text, nullable) — free-text reason when an item is marked lost
    (e.g. "Not delivered by courier")
  - `lost_at` (timestamptz, nullable) — timestamp when the item was marked lost
  - `hold_location_id` (uuid, FK → warehouse_locations) — the warehouse location
    where this specific item currently sits:
      * Set to the return_hold location when scanned during receive
      * Changed to the damaged location when QC fails
      * Changed to the chosen storage box when restocked

  ## Security
  - Existing RLS policies on return_items cover the new columns (no new policies needed)

  ## Notes
  1. All new columns use IF NOT EXISTS guards to be safe on re-runs
  2. hold_location_id is nullable — null means not yet physically placed
  3. receive_status default 'pending' means no existing rows are broken
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'return_items' AND column_name = 'receive_status'
  ) THEN
    ALTER TABLE return_items ADD COLUMN receive_status text NOT NULL DEFAULT 'pending'
      CHECK (receive_status IN ('pending', 'received', 'lost'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'return_items' AND column_name = 'lost_reason'
  ) THEN
    ALTER TABLE return_items ADD COLUMN lost_reason text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'return_items' AND column_name = 'lost_at'
  ) THEN
    ALTER TABLE return_items ADD COLUMN lost_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'return_items' AND column_name = 'hold_location_id'
  ) THEN
    ALTER TABLE return_items ADD COLUMN hold_location_id uuid REFERENCES warehouse_locations(id);
  END IF;
END $$;
