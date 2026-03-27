/*
  # Add has_delivered_order column to customers

  ## Summary
  Adds a boolean column `has_delivered_order` to the `customers` table.
  A customer is considered "Returning" when they have at least one order that was
  successfully delivered — determined by either:
    - cs_status = 'delivered'  (manually confirmed by CS)
    - courier_status = 'Delivered' (confirmed by courier API via order_courier_info)

  The existing `refresh_customer_stats` function is updated to also compute this column.
  The trigger already fires on orders INSERT/UPDATE/DELETE so no new trigger is needed.

  ## Changes
  - New column: `customers.has_delivered_order` (boolean, default false)
  - Updated function: `refresh_customer_stats` includes the new column calculation
  - Backfill: all existing customers are recalculated
*/

-- 1. Add the column
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS has_delivered_order boolean NOT NULL DEFAULT false;

-- 2. Replace the stats function to include the new column
CREATE OR REPLACE FUNCTION refresh_customer_stats(p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_orders          integer;
  v_successful            integer;
  v_failed                integer;
  v_cancelled             integer;
  v_total_spent           numeric(12,2);
  v_avg_order_value       numeric(12,2);
  v_delivery_success_rate numeric(5,2);
  v_first_order_date      timestamptz;
  v_last_order_date       timestamptz;
  v_has_delivered         boolean;
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

  -- A customer is "returning" if any order was delivered via cs_status OR courier_status
  SELECT EXISTS (
    SELECT 1
    FROM orders o
    LEFT JOIN order_courier_info oci ON oci.order_id = o.id
    WHERE o.customer_id = p_customer_id
      AND (
        o.cs_status = 'delivered'
        OR oci.courier_status = 'Delivered'
      )
  ) INTO v_has_delivered;

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
    has_delivered_order   = v_has_delivered,
    updated_at            = now()
  WHERE id = p_customer_id;
END;
$$;

-- 3. Also fire the trigger when courier info changes
CREATE OR REPLACE FUNCTION trg_fn_refresh_customer_stats_courier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT customer_id INTO v_customer_id FROM orders WHERE id = OLD.order_id;
  ELSE
    SELECT customer_id INTO v_customer_id FROM orders WHERE id = NEW.order_id;
  END IF;

  IF v_customer_id IS NOT NULL THEN
    PERFORM refresh_customer_stats(v_customer_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_customer_stats_courier ON order_courier_info;
CREATE TRIGGER trg_refresh_customer_stats_courier
  AFTER INSERT OR UPDATE OR DELETE ON order_courier_info
  FOR EACH ROW EXECUTE FUNCTION trg_fn_refresh_customer_stats_courier();

-- 4. Backfill all existing customers
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM customers LOOP
    PERFORM refresh_customer_stats(r.id);
  END LOOP;
END $$;
