/*
  # Add last_synced_page to woo_sync_log

  ## Changes
  - Adds `last_synced_page` integer column to `woo_sync_log` table
    - Tracks the last page successfully processed during a product sync
    - Used to resume an interrupted sync from where it left off
    - Defaults to 0 (no pages synced yet)
  - Adds `total_pages` integer column to track total pages in the sync run
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'woo_sync_log' AND column_name = 'last_synced_page'
  ) THEN
    ALTER TABLE woo_sync_log ADD COLUMN last_synced_page integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'woo_sync_log' AND column_name = 'total_pages'
  ) THEN
    ALTER TABLE woo_sync_log ADD COLUMN total_pages integer DEFAULT 0;
  END IF;
END $$;
