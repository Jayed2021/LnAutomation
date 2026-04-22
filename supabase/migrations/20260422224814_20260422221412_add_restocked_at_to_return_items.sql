/*
  # Add restocked_at to return_items

  1. Modified Tables
    - `return_items`
      - `restocked_at` (timestamptz, nullable) — timestamp set per-item when that item is restocked,
        enabling partial restocking of multi-item returns independently

  2. Notes
    - Uses IF NOT EXISTS so it is safe to run on databases that already have the column
    - The Returns page filters out items where restocked_at IS NOT NULL from the QC Passed view
    - RestockModal stamps this field per item and only promotes the parent return to "restocked"
      status once all QC-passed items have been stamped
*/

ALTER TABLE return_items ADD COLUMN IF NOT EXISTS restocked_at timestamptz;
