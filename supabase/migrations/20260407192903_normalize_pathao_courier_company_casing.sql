/*
  # Normalize courier_company casing for Pathao

  ## Problem
  Some order_courier_info rows have courier_company = 'pathao' (lowercase)
  while others have 'Pathao' (title case). The pathao-sync-status edge function
  was filtering with an exact match on 'Pathao', causing rows stored as 'pathao'
  to be silently skipped (reported as "No matching order found in DB").

  ## Changes
  - Normalize all existing 'pathao' (any case variant) values to 'Pathao'
    in the order_courier_info table.

  ## Notes
  - Safe update — no data is deleted or dropped.
  - Going forward the edge function uses ILIKE for case-insensitive matching,
    but this migration ensures the data is also consistent on disk.
*/

UPDATE order_courier_info
SET courier_company = 'Pathao'
WHERE LOWER(courier_company) = 'pathao'
  AND courier_company <> 'Pathao';
