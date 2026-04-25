/*
  # Create category_slot_rules table

  ## Purpose
  Stores default "slots per unit" values keyed by product category. This lets
  warehouse managers define how much space a category of product occupies in a
  storage location without having to edit every product individually.

  ## New Tables
  - `category_slot_rules`
    - `id` (uuid, pk)
    - `category` (text, unique, not null) — matches products.category values
    - `slots_per_unit` (numeric, not null, default 1) — how many slots one unit of
      any product in this category consumes
    - `created_at` (timestamptz)

  ## Security
  RLS enabled. Authenticated users can read and write (the app uses custom
  username/password auth where all logged-in users share the authenticated role).
  No unauthenticated access.

  ## Notes
  - Deleting a rule does NOT retroactively change products.slots_per_unit.
  - Bulk-applying a rule to products is done explicitly from the UI.
*/

CREATE TABLE IF NOT EXISTS category_slot_rules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category      text UNIQUE NOT NULL,
  slots_per_unit numeric NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE category_slot_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read category slot rules"
  ON category_slot_rules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert category slot rules"
  ON category_slot_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update category slot rules"
  ON category_slot_rules
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete category slot rules"
  ON category_slot_rules
  FOR DELETE
  TO authenticated
  USING (true);
