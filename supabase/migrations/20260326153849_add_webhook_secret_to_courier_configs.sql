/*
  # Add webhook_secret column to courier_configs

  ## Summary
  Adds a dedicated `webhook_secret` column to the `courier_configs` table to store
  the webhook integration secret for each courier. This secret is used to verify
  the authenticity of incoming webhook requests.

  ## Changes
  ### Modified Tables
  - `courier_configs`
    - Added `webhook_secret` (text, nullable) — stores the shared secret used to
      validate incoming webhook payloads from the courier.

  ## Data
  - Seeds the fixed Pathao webhook secret (`f3992ecc-59da-4cbe-a049-a13da2018d51`)
    into the existing `pathao` courier config row.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courier_configs' AND column_name = 'webhook_secret'
  ) THEN
    ALTER TABLE courier_configs ADD COLUMN webhook_secret text;
  END IF;
END $$;

UPDATE courier_configs
SET webhook_secret = 'f3992ecc-59da-4cbe-a049-a13da2018d51'
WHERE courier_name = 'pathao';
