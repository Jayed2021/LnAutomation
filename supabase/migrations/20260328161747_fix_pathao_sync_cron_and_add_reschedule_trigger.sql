/*
  # Fix Pathao Sync Cron Job and Add Reschedule Trigger

  ## Changes
  - Removes the incorrectly configured initial cron job (from previous migration)
  - Adds schedule_pathao_sync() function using correct GUC setting names
  - Adds trigger to reschedule cron job when pathao_sync_enabled or
    pathao_sync_interval_hours settings change
  - The cron job is activated when the user enables sync from the settings UI
    (same pattern as auto-distribute-orders)

  ## Notes
  1. GUC settings (app.settings.supabase_url etc.) are only available at runtime,
     not during migrations, so we do NOT call schedule_pathao_sync() here directly.
  2. The trigger fires on any UPDATE to pathao_sync_enabled in app_settings,
     which happens when the user saves settings from the UI.
*/

-- Remove the incorrectly configured initial job from previous migration
DO $$
BEGIN
  PERFORM cron.unschedule('pathao-status-sync-hourly');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- Function to schedule/unschedule the Pathao sync cron job
CREATE OR REPLACE FUNCTION schedule_pathao_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enabled boolean;
  v_sql text;
  v_url text;
  v_key text;
BEGIN
  SELECT (value::text)::boolean INTO v_enabled
    FROM app_settings WHERE key = 'pathao_sync_enabled';

  -- Remove any existing schedule first
  BEGIN
    PERFORM cron.unschedule('pathao-status-sync-hourly');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF v_enabled = true THEN
    v_url := current_setting('app.settings.supabase_url', true);
    v_key := current_setting('app.settings.service_role_key', true);

    IF v_url IS NULL OR v_key IS NULL THEN
      RETURN;
    END IF;

    v_sql := 'SELECT net.http_post(' ||
      'url:=''' || v_url || '/functions/v1/pathao-sync-status''' ||
      ', headers:=''{"Content-Type":"application/json","Authorization":"Bearer ' || v_key || '''}''::jsonb' ||
      ', body:=''{}''::jsonb' ||
      ')';

    PERFORM cron.schedule('pathao-status-sync-hourly', '0 * * * *', v_sql);
  END IF;
END;
$$;

-- Trigger function that fires when relevant app_settings keys are changed
CREATE OR REPLACE FUNCTION trg_reschedule_pathao_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.key IN ('pathao_sync_enabled', 'pathao_sync_interval_hours') THEN
    PERFORM schedule_pathao_sync();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reschedule_pathao_sync ON app_settings;

CREATE TRIGGER trg_reschedule_pathao_sync
  AFTER UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION trg_reschedule_pathao_sync();
