/*
  # Add Slot-Based Location Capacity

  ## Summary
  Implements a flexible, slot-based capacity system for warehouse locations.
  A "slot" is the basic unit of space in a location. By default every product
  consumes 1 slot per unit; products that are physically larger can be given a
  higher slots_per_unit value without changing location records.

  ## Changes

  ### `warehouse_locations`
  - `capacity` (integer, nullable) — total number of slots available in this
    location. NULL means unlimited / no capacity tracking.

  ### `products`
  - `slots_per_unit` (numeric(6,2), nullable, default 1.0) — how many slots
    one unit of this product occupies. NULL is treated as 1.0 by the
    application. Must be > 0.

  ## Notes
  1. Capacity is intentionally optional so non-storage locations (receiving,
     damaged, return_hold) can remain unlimited without any overhead.
  2. slots_per_unit defaults to 1.0, keeping the eyewear setup working as a
     simple unit counter until per-product sizes are needed.
  3. No data is modified — both columns are purely additive.
*/

-- Add capacity to warehouse_locations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouse_locations' AND column_name = 'capacity'
  ) THEN
    ALTER TABLE warehouse_locations ADD COLUMN capacity integer CHECK (capacity > 0);
  END IF;
END $$;

-- Add slots_per_unit to products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'slots_per_unit'
  ) THEN
    ALTER TABLE products ADD COLUMN slots_per_unit numeric(6,2) DEFAULT 1.0 CHECK (slots_per_unit > 0);
  END IF;
END $$;
