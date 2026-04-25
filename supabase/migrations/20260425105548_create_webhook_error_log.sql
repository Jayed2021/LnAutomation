/*
  # Create webhook_error_log table

  ## Purpose
  Captures failed WooCommerce webhook deliveries so missing orders can be identified
  and manually recovered. Only stores the WooCommerce order ID and error message —
  no customer PII or raw payloads.

  ## Tables
  - `webhook_error_log`
    - `id` (uuid, pk)
    - `woo_order_id` (bigint, nullable — null if payload couldn't be parsed)
    - `error_message` (text)
    - `received_at` (timestamptz, default now)

  ## Retention
  Rows older than 14 days are cleaned up by the woo-webhook edge function on each
  invocation, keeping the table lean without a dedicated cron job.

  ## Security
  RLS enabled. Only authenticated users can read. The service role (used by the
  edge function) bypasses RLS for inserts.
*/

CREATE TABLE IF NOT EXISTS webhook_error_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  woo_order_id  bigint,
  error_message text NOT NULL,
  received_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE webhook_error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read webhook error log"
  ON webhook_error_log
  FOR SELECT
  TO authenticated
  USING (true);
