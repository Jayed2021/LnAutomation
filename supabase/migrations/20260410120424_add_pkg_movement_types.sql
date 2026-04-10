/*
  # Add Packaging Material Movement Types

  ## Summary
  Extends the stock_movements table to support two new movement types
  specifically for packaging material inventory management:

  ## Changes

  ### 1. Modified Tables
  - `stock_movements`
    - DROP existing movement_type CHECK constraint
    - ADD new CHECK constraint that includes `pkg_manual_restock` and `pkg_damaged`
      in addition to all previous valid values

  ### 2. New Movement Types
  - `pkg_manual_restock` — records packaging material received/restocked manually;
    treated as an inbound movement; increments lot remaining_quantity
  - `pkg_damaged` — records packaging material written off as damaged;
    treated as an outbound loss; used for P&L cost tracking (no inventory update)
  - `return_receive` — already used in code but was missing from the constraint;
    added here for completeness and correctness
  - `qc_damaged` — already used in code but was missing from the constraint;
    added here for completeness and correctness

  ## Notes
  - No data is modified; this is a constraint-only change
  - All existing rows remain valid
*/

ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_movement_type_check
    CHECK (movement_type IN (
      'receipt',
      'sale',
      'return_restock',
      'return_receive',
      'adjustment',
      'transfer',
      'damaged',
      'qc_damaged',
      'pkg_manual_restock',
      'pkg_damaged'
    ));
