/*
  # Fix product_suppliers currency for local suppliers

  ## Problem
  The `product_suppliers` table defaults currency to 'USD'. When products
  are linked to local (BDT) suppliers, they incorrectly get currency = 'USD'.
  This causes PO creation to apply a 110x USD→BDT exchange rate multiplier
  to prices that are already in BDT, resulting in massively inflated landed costs.

  ## Changes
  1. Backfill: Update all `product_suppliers` rows where the linked supplier
     has `supplier_type = 'local'` to set `currency = 'BDT'`
  2. Change the default for new rows linked to local suppliers is enforced
     at the application layer (not DB level, since DB can't know supplier type at insert)

  ## Impact
  - All existing local supplier product prices will now correctly be marked as BDT
  - New POs created for local suppliers will use the correct BDT currency
  - Landed cost calculation will no longer multiply BDT prices by exchange rate
*/

UPDATE product_suppliers ps
SET currency = 'BDT'
FROM suppliers s
WHERE ps.supplier_id = s.id
  AND s.supplier_type = 'local'
  AND ps.currency != 'BDT';
