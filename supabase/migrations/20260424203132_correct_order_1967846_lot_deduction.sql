/*
  # Correct inventory deduction for order #1967846

  ## Background
  Order #1967846 (LN_1031 / Explora Flip Silver Grey) was picked from LN_B-33
  (lot e9287d80) via a picker override. However, at the time of picking, the
  swap_lot_reservation fix had not yet been deployed. The reservation remained
  on the original FIFO lot LN_B-54 (lot 8ef15b96), and stock was incorrectly
  deducted from LN_B-54 at ship time.

  ## Corrections applied
  1. Reverse the incorrect -1 deduction from LN_B-54 (lot 8ef15b96)
  2. Apply the correct -1 deduction to LN_B-33 (lot e9287d80)
  3. Insert correcting stock_movement records for full audit trail
*/

-- 1. Undo incorrect deduction from LN_B-54
UPDATE inventory_lots
SET remaining_quantity = remaining_quantity + 1
WHERE id = '8ef15b96-8f78-4553-a0c2-d8ea207ead3b';

-- 2. Apply correct deduction to LN_B-33
UPDATE inventory_lots
SET remaining_quantity = GREATEST(0, remaining_quantity - 1)
WHERE id = 'e9287d80-ed9c-4523-885a-a523e84ca253';

-- 3. Reversal record on LN_B-54
INSERT INTO stock_movements (product_id, lot_id, movement_type, quantity, reference_type, reference_id, notes)
SELECT
  il.product_id,
  il.id,
  'adjustment',
  1,
  'order',
  '37d29287-a3df-47c3-a4b0-033ada76d1f9',
  'Correction: stock incorrectly deducted from LN_B-54 for order #1967846 — picker had overridden to LN_B-33 before swap_lot_reservation fix was deployed'
FROM inventory_lots il
WHERE il.id = '8ef15b96-8f78-4553-a0c2-d8ea207ead3b';

-- 4. Correct deduction record on LN_B-33
INSERT INTO stock_movements (product_id, lot_id, movement_type, quantity, reference_type, reference_id, notes)
SELECT
  il.product_id,
  il.id,
  'sale',
  -1,
  'order',
  '37d29287-a3df-47c3-a4b0-033ada76d1f9',
  'Correction: stock deducted from actual override lot LN_B-33 for order #1967846'
FROM inventory_lots il
WHERE il.id = 'e9287d80-ed9c-4523-885a-a523e84ca253';
