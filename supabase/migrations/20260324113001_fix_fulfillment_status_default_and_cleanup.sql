/*
  # Fix fulfillment_status default value and clean up incorrectly set orders

  ## Problem
  The `orders.fulfillment_status` column had a database-level default of `'not_printed'`.
  This caused every newly imported WooCommerce order to automatically get
  `fulfillment_status = 'not_printed'` even before a CS agent ever confirmed the order,
  making all unconfirmed orders appear in the Fulfillment Operations "Not Printed" queue.

  ## Changes

  ### 1. Column Default Fix
  - Remove the `'not_printed'` default from `fulfillment_status`
  - New default is NULL — orders will only enter the Operations queue after CS explicitly confirms them

  ### 2. One-Time Data Cleanup
  - Reset `fulfillment_status` to NULL for orders that were incorrectly set by the old default
  - Conservative criteria: only resets orders where ALL of these are true:
    - `fulfillment_status = 'not_printed'`
    - `confirmation_type IS NULL` (never went through the confirm flow)
    - `confirmed_by IS NULL` (no CS agent confirmed it)
  - This preserves all legitimately confirmed orders (e.g. those with confirmation_type = 'assumption', 'phone_call', etc.)

  ## Expected Result
  - 20 incorrectly set orders are cleaned up and return to the CS Orders tab only
  - 1 legitimate confirmed order (with confirmation_type and confirmed_by set) is untouched
  - All future imported orders will have fulfillment_status = NULL until CS confirms them
*/

ALTER TABLE orders ALTER COLUMN fulfillment_status DROP DEFAULT;

UPDATE orders
SET fulfillment_status = NULL
WHERE fulfillment_status = 'not_printed'
  AND confirmation_type IS NULL
  AND confirmed_by IS NULL;
