/*
  # Auto Distribution Settings and Cron Scheduling

  ## Overview
  Adds support for time-based automatic CS order distribution that runs silently
  in the background on a configurable interval.

  ## New app_settings keys
  - `auto_distribution_enabled` — jsonb boolean, default false
  - `auto_distribution_interval_minutes` — jsonb integer, default 30
  - `auto_distribution_last_run` — jsonb null (updated to ISO string after each run)

  ## Extensions
  - Enables `pg_cron` for scheduled job execution
  - Enables `pg_net` for HTTP calls from the database to Edge Functions

  ## New Functions
  - `schedule_auto_distribution()` — reads settings from app_settings and
    (re)schedules the pg_cron job accordingly. Called via trigger on settings changes.

  ## Triggers
  - `trg_reschedule_auto_distribution` on `app_settings` — fires after UPDATE
    on the two relevant keys to keep the cron job in sync with the UI settings.

  ## Notes
  1. The cron job is named 'auto-distribute-orders' for easy identification.
  2. If auto_distribution_enabled is false, the cron job is unscheduled.
  3. The Edge Function is called via pg_net HTTP POST.
  4. app.supabase_url and app.supabase_service_role_key must be set as GUC params
     for the cron job HTTP call to work (Supabase sets these automatically).
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Insert default settings as proper jsonb (no-op if already present)
INSERT INTO app_settings (key, value) VALUES
  ('auto_distribution_enabled', 'false'::jsonb),
  ('auto_distribution_interval_minutes', '30'::jsonb),
  ('auto_distribution_last_run', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Function to (re)schedule or unschedule the cron job based on app_settings
CREATE OR REPLACE FUNCTION schedule_auto_distribution()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enabled boolean;
  v_interval_minutes int;
  v_cron_expr text;
  v_supabase_url text;
  v_service_key text;
  v_sql text;
BEGIN
  SELECT (value::text)::boolean INTO v_enabled
    FROM app_settings WHERE key = 'auto_distribution_enabled';
  SELECT (value::text)::int INTO v_interval_minutes
    FROM app_settings WHERE key = 'auto_distribution_interval_minutes';

  -- Remove any existing schedule first (ignore error if not found)
  BEGIN
    PERFORM cron.unschedule('auto-distribute-orders');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF v_enabled = true AND v_interval_minutes IS NOT NULL AND v_interval_minutes > 0 THEN
    -- Build cron expression
    IF v_interval_minutes >= 60 THEN
      v_cron_expr := '0 */' || GREATEST(1, (v_interval_minutes / 60)::int) || ' * * *';
    ELSE
      v_cron_expr := '*/' || v_interval_minutes || ' * * * *';
    END IF;

    -- Get connection details from GUC settings set by Supabase
    v_supabase_url := current_setting('app.settings.jwt_secret', true);

    -- Build the HTTP call SQL using string concatenation to avoid quoting issues
    v_sql := 'SELECT net.http_post(' ||
      'url:=''' || current_setting('app.settings.supabase_url', true) || '/functions/v1/auto-distribute-orders''' ||
      ', headers:=''{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key', true) || '''}''::jsonb' ||
      ', body:=''{}''::jsonb' ||
      ')';

    PERFORM cron.schedule('auto-distribute-orders', v_cron_expr, v_sql);
  END IF;
END;
$$;

-- Trigger function that fires when relevant app_settings keys are changed
CREATE OR REPLACE FUNCTION trg_reschedule_auto_distribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.key IN ('auto_distribution_enabled', 'auto_distribution_interval_minutes') THEN
    PERFORM schedule_auto_distribution();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists, then recreate
DROP TRIGGER IF EXISTS trg_reschedule_auto_distribution ON app_settings;

CREATE TRIGGER trg_reschedule_auto_distribution
  AFTER UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION trg_reschedule_auto_distribution();
