/*
  # Add Fulfillment Status and Workflow Extensions

  1. Schema Changes
    - Add `fulfillment_status` to orders table for warehouse workflow tracking
    - Add `lab_status` and `lab_sent_date`, `lab_return_date` to order_prescriptions
    - Add `exchange_order_id` to returns table for exchange workflows
    - Add `expected_barcode` to return_items for scanning verification
    - Add `refund_status` to returns table
    - Create `return_photos` table for QC photo evidence
    - Add indexes for performance on status fields

  2. Status Values
    - fulfillment_status: not_printed, printed, packed, send_to_lab, in_lab, shipped
    - lab_status: pending, in_lab, completed
    - refund_status: pending, processed, completed

  3. Data Integrity
    - Add constraints for valid status values
    - Add timestamps for tracking
*/

-- Add fulfillment_status to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'fulfillment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN fulfillment_status text DEFAULT 'not_printed';
    ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_status_check 
      CHECK (fulfillment_status IN ('not_printed', 'printed', 'packed', 'send_to_lab', 'in_lab', 'shipped'));
  END IF;
END $$;

-- Add lab tracking fields to order_prescriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_prescriptions' AND column_name = 'lab_status'
  ) THEN
    ALTER TABLE order_prescriptions ADD COLUMN lab_status text DEFAULT 'pending';
    ALTER TABLE order_prescriptions ADD CONSTRAINT order_prescriptions_lab_status_check 
      CHECK (lab_status IN ('pending', 'in_lab', 'completed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_prescriptions' AND column_name = 'lab_sent_date'
  ) THEN
    ALTER TABLE order_prescriptions ADD COLUMN lab_sent_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_prescriptions' AND column_name = 'lab_return_date'
  ) THEN
    ALTER TABLE order_prescriptions ADD COLUMN lab_return_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_prescriptions' AND column_name = 'expected_return_date'
  ) THEN
    ALTER TABLE order_prescriptions ADD COLUMN expected_return_date date;
  END IF;
END $$;

-- Add exchange tracking to returns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'returns' AND column_name = 'exchange_order_id'
  ) THEN
    ALTER TABLE returns ADD COLUMN exchange_order_id uuid REFERENCES orders(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'returns' AND column_name = 'refund_status'
  ) THEN
    ALTER TABLE returns ADD COLUMN refund_status text DEFAULT 'pending';
    ALTER TABLE returns ADD CONSTRAINT returns_refund_status_check 
      CHECK (refund_status IN ('pending', 'processed', 'completed'));
  END IF;
END $$;

-- Add expected barcode to return_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'return_items' AND column_name = 'expected_barcode'
  ) THEN
    ALTER TABLE return_items ADD COLUMN expected_barcode text;
  END IF;
END $$;

-- Create return_photos table
CREATE TABLE IF NOT EXISTS return_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  return_item_id uuid REFERENCES return_items(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  uploaded_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE return_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view return photos"
  ON return_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload return photos"
  ON return_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_cs_status ON orders(cs_status);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_return_photos_return_id ON return_photos(return_id);
CREATE INDEX IF NOT EXISTS idx_order_prescriptions_lab_status ON order_prescriptions(lab_status);