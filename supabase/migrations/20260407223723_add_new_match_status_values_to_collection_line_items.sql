/*
  # Add new match_status values to collection_line_items

  ## Summary
  Expands the match_status CHECK constraint on collection_line_items to allow
  two new status values introduced for Bkash/prepaid invoice processing:

  - `paid_no_collection`: Order is already marked as Paid by CS but has no
    collected amount recorded. The invoice apply will backfill the collected
    amount without changing payment status.

  - `paid_already_settled`: Order is already fully settled (Paid + collected
    amount already set). The row is saved for record-keeping but not re-processed.

  ## Changes
  - `collection_line_items`: DROP old match_status CHECK constraint, ADD new
    one with all five allowed values.
*/

ALTER TABLE collection_line_items
  DROP CONSTRAINT IF EXISTS collection_line_items_match_status_check;

ALTER TABLE collection_line_items
  ADD CONSTRAINT collection_line_items_match_status_check
  CHECK (match_status = ANY (ARRAY[
    'matched'::text,
    'not_found'::text,
    'already_updated'::text,
    'paid_no_collection'::text,
    'paid_already_settled'::text
  ]));
