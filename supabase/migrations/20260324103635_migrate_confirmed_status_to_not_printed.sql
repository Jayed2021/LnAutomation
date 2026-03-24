/*
  # Migrate confirmed status to not_printed

  ## Summary
  The "confirmed" cs_status is being removed from the order workflow. When an order is
  confirmed by CS, it should go directly to "not_printed" (the warehouse queue) without
  an intermediate "confirmed" state.

  ## Changes
  - All existing orders with cs_status = 'confirmed' are updated to cs_status = 'not_printed'
  - This ensures historical data is consistent with the new simplified workflow

  ## Notes
  - Safe operation: only updates orders currently stuck in 'confirmed' status
  - fulfillment_status is left unchanged (already 'not_printed' for these orders)
*/

UPDATE orders
SET
  cs_status = 'not_printed',
  updated_at = now()
WHERE cs_status = 'confirmed';
