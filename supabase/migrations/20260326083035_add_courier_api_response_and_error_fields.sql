/*
  # Add Courier API Response and Error Fields to order_courier_info

  ## Summary
  Extends the order_courier_info table with two new nullable columns to store
  the raw API response and any error messages from courier API calls (Pathao,
  Steadfast, etc.) when submitting orders automatically.

  ## New Columns
  - `courier_api_response` (jsonb, nullable) — Stores the full raw JSON response
    from the courier API after a successful or attempted order submission.
  - `courier_api_error` (text, nullable) — Stores the error message string if the
    courier API call fails, for debugging and visibility.

  ## Notes
  - Both columns are nullable; NULL means no API call has been attempted yet.
  - No destructive changes; only additive column additions.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_courier_info' AND column_name = 'courier_api_response'
  ) THEN
    ALTER TABLE order_courier_info ADD COLUMN courier_api_response jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_courier_info' AND column_name = 'courier_api_error'
  ) THEN
    ALTER TABLE order_courier_info ADD COLUMN courier_api_error text;
  END IF;
END $$;
