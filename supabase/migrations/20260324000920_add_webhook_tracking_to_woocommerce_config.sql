/*
  # Add Webhook Tracking to WooCommerce Config

  ## Summary
  Adds columns to `woocommerce_config` to track the state of the WooCommerce webhook
  that pushes new orders into the system in real-time.

  ## Changes to woocommerce_config
  - `webhook_id` (integer) — The WooCommerce webhook ID returned when the webhook is registered
  - `webhook_status` (text) — The WooCommerce webhook status: 'active', 'paused', 'disabled', or null if not registered
  - `webhook_secret` (text) — The HMAC-SHA256 shared secret used to verify incoming webhook payloads
  - `last_webhook_received_at` (timestamptz) — Timestamp of the most recently received webhook delivery; used to detect if the webhook has gone silent

  ## Notes
  - All new columns are nullable to remain backwards-compatible with existing rows
  - webhook_secret is stored here so the edge function can retrieve it at runtime without hardcoding
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'woocommerce_config' AND column_name = 'webhook_id'
  ) THEN
    ALTER TABLE woocommerce_config ADD COLUMN webhook_id integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'woocommerce_config' AND column_name = 'webhook_status'
  ) THEN
    ALTER TABLE woocommerce_config ADD COLUMN webhook_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'woocommerce_config' AND column_name = 'webhook_secret'
  ) THEN
    ALTER TABLE woocommerce_config ADD COLUMN webhook_secret text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'woocommerce_config' AND column_name = 'last_webhook_received_at'
  ) THEN
    ALTER TABLE woocommerce_config ADD COLUMN last_webhook_received_at timestamptz;
  END IF;
END $$;
