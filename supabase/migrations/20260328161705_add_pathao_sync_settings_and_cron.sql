/*
  # Add Pathao Courier Status Sync Settings and Scheduled Job

  ## Summary
  Sets up automated Pathao courier status polling via REST API to replace reliance
  on webhook-based status updates. Runs on a configurable interval (default 1 hour)
  and only checks orders that are not yet in a final courier state.

  ## New app_settings rows
  - `pathao_sync_enabled` — master on/off toggle (default true)
  - `pathao_sync_interval_hours` — how often to auto-sync (default 1, min 1)
  - `pathao_sync_lookback_days` — only sync orders booked within this many days (default 14)
  - `pathao_sync_last_run` — timestamp of last completed sync run
  - `pathao_sync_last_result` — jsonb summary of the last sync result

  ## Scheduled cron job
  - Runs every hour via pg_cron
  - Calls the pathao-sync-status edge function via pg_net HTTP POST
  - The function itself checks pathao_sync_interval_hours to decide if a run is due

  ## Notes
  - pg_cron and pg_net extensions are already enabled in this project
  - The cron schedule is fixed at every hour; interval enforcement is in the edge function
  - Uses SUPABASE_URL and SUPABASE_ANON_KEY from vault/env if available
*/

INSERT INTO app_settings (key, value) VALUES
  ('pathao_sync_enabled', 'true'::jsonb),
  ('pathao_sync_interval_hours', '1'::jsonb),
  ('pathao_sync_lookback_days', '14'::jsonb),
  ('pathao_sync_last_run', 'null'::jsonb),
  ('pathao_sync_last_result', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;

SELECT cron.schedule(
  'pathao-status-sync-hourly',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/pathao-sync-status',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);
