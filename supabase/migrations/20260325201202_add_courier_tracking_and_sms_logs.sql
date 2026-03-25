/*
  # Courier Tracking Fields + SMS Logs

  ## Summary
  This migration extends the existing `order_courier_info` table with courier API
  tracking fields, and creates a new `sms_logs` table for SMS delivery history.

  ## Changes to `order_courier_info`
  - `consignment_id` (text, nullable) - Courier-issued consignment/parcel ID
    from Pathao or Steadfast after order creation via API
  - `courier_status` (text, nullable) - Latest delivery status string as returned
    by the courier API (e.g. "Pending", "In Transit", "Delivered", "Cancelled")
  - `courier_status_updated_at` (timestamptz, nullable) - When the status was
    last fetched or updated

  ## New Table: `sms_logs`
  Stores a record of every SMS sent through the system.
  - `id` (uuid, primary key)
  - `order_id` (uuid, nullable FK to orders) - The order this SMS relates to
  - `phone_number` (text) - Recipient phone number
  - `message` (text) - Full SMS body that was sent
  - `template_type` (text, nullable) - Which template was used if any
  - `status` (text) - 'sent' or 'failed'
  - `error_message` (text, nullable) - Error details if failed
  - `sent_by` (uuid, nullable FK to users) - User who triggered the send
  - `sent_at` (timestamptz)

  ## Security
  - RLS enabled on sms_logs
  - All authenticated users can view SMS logs
  - All authenticated users can insert SMS logs (triggered from order detail)
  - No update/delete - logs are immutable
*/

-- Add courier tracking columns to order_courier_info
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_courier_info' AND column_name = 'consignment_id'
  ) THEN
    ALTER TABLE order_courier_info ADD COLUMN consignment_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_courier_info' AND column_name = 'courier_status'
  ) THEN
    ALTER TABLE order_courier_info ADD COLUMN courier_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_courier_info' AND column_name = 'courier_status_updated_at'
  ) THEN
    ALTER TABLE order_courier_info ADD COLUMN courier_status_updated_at timestamptz;
  END IF;
END $$;

-- SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  message text NOT NULL,
  template_type text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message text,
  sent_by uuid REFERENCES users(id) ON DELETE SET NULL,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view SMS logs"
  ON sms_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert SMS logs"
  ON sms_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );
