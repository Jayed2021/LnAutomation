/*
  # Add can_see_costs flag and confirmed PO status

  ## Changes

  ### Modified Tables

  #### `users`
  - Added `can_see_costs` (boolean, default false) - Allows admin to grant cost visibility to any user
    regardless of role. Combined with role-based check in the app: admin OR can_see_costs = true
    means the user can see landed costs, COGS, stock values, and profit figures.

  #### `purchase_orders`
  - Added `confirmed` to the status check constraint.
    Status lifecycle: draft -> ordered -> confirmed -> partially_received -> closed
    "Confirmed" means the PO has been fully paid and goods are on their way (ready to receive).
    The Receive Goods page only shows POs in `confirmed` status.

  ### Also fixes the shipments RLS policy to allow warehouse managers to view shipments.

  ## Important Notes
  1. Existing `can_see_costs` defaults to false for all current users.
   Admin must explicitly grant cost visibility per user in Settings > User Management.
  2. The `confirmed` status sits between `ordered` (payment pending) and `partially_received`
   (physical receipt started). When a PO is fully paid, update it to `confirmed`.
*/

-- Add can_see_costs to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'can_see_costs'
  ) THEN
    ALTER TABLE users ADD COLUMN can_see_costs boolean DEFAULT false;
  END IF;
END $$;

-- Update purchase_orders status constraint to include 'confirmed'
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN ('draft', 'ordered', 'confirmed', 'partially_received', 'closed'));

-- Allow warehouse managers to view shipments (they need this for Receive Goods flow)
DROP POLICY IF EXISTS "Admin and Operations Manager can view shipments" ON shipments;
CREATE POLICY "Authenticated users can view shipments"
  ON shipments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

-- Allow warehouse managers to view purchase orders (needed for Receive Goods flow)
DROP POLICY IF EXISTS "Admin and Operations Manager can view purchase orders" ON purchase_orders;
CREATE POLICY "Authenticated users can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

-- Allow warehouse managers to view PO items (needed for Receive Goods flow)
DROP POLICY IF EXISTS "Admin and Operations Manager can view PO items" ON purchase_order_items;
CREATE POLICY "Authenticated users can view PO items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );
