/*
  # Fix WooCommerce Config and Sync Log RLS Write Policies

  ## Problem
  The woocommerce_config table has a FOR ALL policy with only USING (no WITH CHECK),
  which means INSERT and UPDATE operations are blocked by RLS even for admins.
  The woo_sync_log INSERT policy is correct but the woocommerce_config UPDATE during
  save was silently failing.

  ## Changes
  1. Drop the broken FOR ALL policy on woocommerce_config
  2. Add proper separate INSERT, UPDATE, DELETE policies each with correct WITH CHECK
  3. Fix woo_sync_log to ensure all write operations work correctly
*/

DROP POLICY IF EXISTS "Only admin can manage WooCommerce config" ON woocommerce_config;

CREATE POLICY "Only admin can insert WooCommerce config"
  ON woocommerce_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

CREATE POLICY "Only admin can update WooCommerce config"
  ON woocommerce_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

CREATE POLICY "Only admin can delete WooCommerce config"
  ON woocommerce_config FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );
