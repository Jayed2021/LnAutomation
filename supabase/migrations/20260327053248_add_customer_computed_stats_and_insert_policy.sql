/*
  # Add Computed Stats Columns to Customers Table

  ## Summary
  This migration adds pre-computed aggregate columns to the `customers` table to avoid
  expensive JOIN aggregations on every list/detail page load. A trigger function
  automatically keeps these columns in sync whenever an order is inserted, updated, or deleted.

  ## Changes

  ### Modified Table: `customers`
  New computed columns:
  - `total_orders` (int) - Total number of orders for this customer
  - `successful_deliveries` (int) - Orders with cs_status = 'delivered'
  - `failed_deliveries` (int) - Orders with cs_status in cancelled/refund/exchange family
  - `cancelled_orders` (int) - Orders with cs_status IN ('cancelled','cancelled_cbd','cancelled_cad')
  - `total_spent` (numeric) - Sum of total_amount across all orders
  - `avg_order_value` (numeric) - Average order value (total_spent / total_orders)
  - `delivery_success_rate` (numeric) - successful_deliveries / total_orders * 100
  - `first_order_date` (timestamptz) - Date of earliest order
  - `last_order_date` (timestamptz) - Date of most recent order

  ### New Function: `refresh_customer_stats(customer_id uuid)`
  Recalculates all computed columns for a given customer from scratch using the orders table.

  ### New Trigger: `trg_refresh_customer_stats`
  Fires AFTER INSERT, UPDATE, DELETE on the `orders` table and calls `refresh_customer_stats`
  for the affected customer_id. On DELETE, uses OLD.customer_id.

  ### Security
  - The trigger function runs with SECURITY DEFINER to ensure it can always write to customers
  - RLS INSERT policy added so CS/admin/ops users can create customers manually
    (they previously could only use FOR ALL which is less explicit)

  ## Notes
  1. Backfill run at end of migration to populate existing customers
  2. avg_order_value and delivery_success_rate return NULL when total_orders = 0 (safe division)
  3. INSERT policy is added separately from the existing broad FOR ALL policy for clarity
*/

-- 1. Add computed columns to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS total_orders integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS successful_deliveries integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_deliveries integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_orders integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_order_value numeric(12, 2),
  ADD COLUMN IF NOT EXISTS delivery_success_rate numeric(5, 2),
  ADD COLUMN IF NOT EXISTS first_order_date timestamptz,
  ADD COLUMN IF NOT EXISTS last_order_date timestamptz;

-- 2. Create the stats refresh function
CREATE OR REPLACE FUNCTION refresh_customer_stats(p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_orders        integer;
  v_successful          integer;
  v_failed              integer;
  v_cancelled           integer;
  v_total_spent         numeric(12,2);
  v_avg_order_value     numeric(12,2);
  v_delivery_success_rate numeric(5,2);
  v_first_order_date    timestamptz;
  v_last_order_date     timestamptz;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE cs_status = 'delivered'),
    COUNT(*) FILTER (WHERE cs_status IN ('cancelled','cancelled_cbd','cancelled_cad','refund','reverse_pick')),
    COUNT(*) FILTER (WHERE cs_status IN ('cancelled','cancelled_cbd','cancelled_cad')),
    COALESCE(SUM(total_amount), 0),
    MIN(order_date),
    MAX(order_date)
  INTO
    v_total_orders,
    v_successful,
    v_failed,
    v_cancelled,
    v_total_spent,
    v_first_order_date,
    v_last_order_date
  FROM orders
  WHERE customer_id = p_customer_id;

  IF v_total_orders > 0 THEN
    v_avg_order_value := ROUND(v_total_spent / v_total_orders, 2);
    v_delivery_success_rate := ROUND((v_successful::numeric / v_total_orders::numeric) * 100, 2);
  ELSE
    v_avg_order_value := NULL;
    v_delivery_success_rate := NULL;
  END IF;

  UPDATE customers SET
    total_orders          = v_total_orders,
    successful_deliveries = v_successful,
    failed_deliveries     = v_failed,
    cancelled_orders      = v_cancelled,
    total_spent           = v_total_spent,
    avg_order_value       = v_avg_order_value,
    delivery_success_rate = v_delivery_success_rate,
    first_order_date      = v_first_order_date,
    last_order_date       = v_last_order_date,
    updated_at            = now()
  WHERE id = p_customer_id;
END;
$$;

-- 3. Create the trigger function
CREATE OR REPLACE FUNCTION trg_fn_refresh_customer_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_customer_stats(OLD.customer_id);
  ELSE
    PERFORM refresh_customer_stats(NEW.customer_id);
    -- If customer_id changed on update, refresh the old customer too
    IF TG_OP = 'UPDATE' AND OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
      PERFORM refresh_customer_stats(OLD.customer_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- 4. Attach trigger to orders table
DROP TRIGGER IF EXISTS trg_refresh_customer_stats ON orders;
CREATE TRIGGER trg_refresh_customer_stats
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_fn_refresh_customer_stats();

-- 5. Add explicit INSERT policy for customers (manual creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'customers'
      AND policyname = 'CS and above can create customers manually'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "CS and above can create customers manually"
        ON customers FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'operations_manager', 'customer_service')
            AND users.is_active = true
          )
        )
    $pol$;
  END IF;
END $$;

-- 6. Backfill all existing customers
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM customers LOOP
    PERFORM refresh_customer_stats(r.id);
  END LOOP;
END $$;
