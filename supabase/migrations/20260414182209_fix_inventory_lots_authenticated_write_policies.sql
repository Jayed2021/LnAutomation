/*
  # Fix inventory_lots RLS policies for authenticated users

  ## Problem
  The inventory_lots table was missing INSERT, UPDATE, and DELETE policies for
  authenticated users. Only the anon role had write access. This caused internal
  transfer operations to silently fail when logged-in users attempted to:
    - Deduct quantity from the source lot (UPDATE)
    - Create a new split lot at the destination (INSERT)

  Supabase does not raise an error for RLS-blocked writes — it returns success
  with 0 rows affected — so the stock movement log recorded the correct quantity
  (10 pcs) but the actual lot data never changed, causing the entire lot (50 pcs)
  to appear moved.

  ## Changes
  - Add INSERT policy for authenticated role on inventory_lots
  - Add UPDATE policy for authenticated role on inventory_lots
  - Add DELETE policy for authenticated role on inventory_lots

  ## Notes
  - The existing SELECT policy for authenticated and full-access anon policy are unchanged
  - Policies are permissive (allow all rows) matching the existing pattern for this table
*/

CREATE POLICY "Authenticated users can insert lots"
  ON inventory_lots
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update lots"
  ON inventory_lots
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete lots"
  ON inventory_lots
  FOR DELETE
  TO authenticated
  USING (true);
