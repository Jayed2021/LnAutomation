/*
  # Add Courier Success Rate Columns to Customers Table

  ## Summary
  Adds two new columns to the `customers` table to cache the FraudBD courier
  delivery success rate for each customer. This avoids repeated API calls when
  the same customer places multiple orders — the last fetched result is stored
  and displayed with a timestamp.

  ## Changes

  ### Modified Table: `customers`
  New columns:
  - `courier_success_rate` (numeric 5,2) — The overall courier delivery success
    rate percentage fetched from the FraudBD API for this customer's phone number.
    NULL means it has never been checked.
  - `courier_success_rate_updated_at` (timestamptz) — Timestamp of when the
    courier_success_rate was last fetched and stored.

  ## Notes
  1. Both columns are nullable — NULL indicates no check has been performed yet.
  2. No RLS changes required; existing customer RLS policies cover these columns.
  3. No backfill needed — values will be populated on first manual fraud check.
*/

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS courier_success_rate numeric(5, 2),
  ADD COLUMN IF NOT EXISTS courier_success_rate_updated_at timestamptz;
