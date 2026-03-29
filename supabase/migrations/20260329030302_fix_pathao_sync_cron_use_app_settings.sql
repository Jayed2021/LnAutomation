/*
  # Fix Pathao Sync Cron — Read Credentials from app_settings

  ## Problem
  The `schedule_pathao_sync()` function was reading the Supabase URL and service role
  key via `current_setting('app.settings.supabase_url', true)` and
  `current_setting('app.settings.service_role_key', true)`. These GUC settings are not
  populated in this project, so both return NULL. When pg_cron receives a NULL command it
  throws "command can not be NULL", which silently prevents the cron job from ever being
  registered even when the user enables auto sync from the UI.

  ## Fix
  1. Rewrite `schedule_pathao_sync()` to read `supabase_url` and `service_role_key` from
     the `app_settings` table instead of GUC — the same source used by
     `schedule_auto_distribution()` after its equivalent fix.
  2. Add a NULL/empty guard: if either value is missing, raise a NOTICE and return without
     scheduling so no cryptic pg_cron error is surfaced.
  3. Honour the `pathao_sync_interval_hours` setting when building the cron expression so
     the pg_cron schedule actually matches the interval the user selected (1h, 2h, 4h,
     6h, 12h, 24h). Previously it was always hard-coded to `0 * * * *` (every hour).
  4. Call `SELECT schedule_pathao_sync()` at the end of the migration so the job is
     registered immediately from current settings without requiring a UI re-save.

  ## Changes
  - `schedule_pathao_sync()` function: reads credentials from app_settings, uses dynamic
    cron expression based on interval_hours, guards against NULL/empty credentials.
  - No schema or RLS changes.
*/

-- Rewrite schedule_pathao_sync() to use app_settings for credentials
CREATE OR REPLACE FUNCTION schedule_pathao_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enabled boolean;
  v_interval_hours int;
  v_cron_expr text;
  v_supabase_url text;
  v_service_key text;
  v_sql text;
BEGIN
  SELECT (value::text)::boolean INTO v_enabled
    FROM app_settings WHERE key = 'pathao_sync_enabled';

  -- Remove any existing schedule first (ignore error if not found)
  BEGIN
    PERFORM cron.unschedule('pathao-status-sync-hourly');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF v_enabled IS NOT TRUE THEN
    RETURN;
  END IF;

  SELECT (value::text)::int INTO v_interval_hours
    FROM app_settings WHERE key = 'pathao_sync_interval_hours';

  -- Default to 1 hour if not set
  v_interval_hours := GREATEST(1, COALESCE(v_interval_hours, 1));

  -- Read credentials from app_settings (not GUC which is unavailable in this project)
  SELECT trim('"' FROM value::text) INTO v_supabase_url
    FROM app_settings WHERE key = 'supabase_url';

  SELECT trim('"' FROM value::text) INTO v_service_key
    FROM app_settings WHERE key = 'service_role_key';

  -- Guard: if either credential is missing, skip scheduling to avoid NULL command error
  IF v_supabase_url IS NULL OR v_service_key IS NULL OR
     v_supabase_url = '' OR v_service_key = '' THEN
    RAISE NOTICE 'schedule_pathao_sync: supabase_url or service_role_key not configured in app_settings, skipping cron schedule.';
    RETURN;
  END IF;

  -- Build cron expression from interval_hours
  -- 1h → '0 * * * *', 2h → '0 */2 * * *', 4h → '0 */4 * * *', etc.
  IF v_interval_hours = 1 THEN
    v_cron_expr := '0 * * * *';
  ELSE
    v_cron_expr := '0 */' || v_interval_hours || ' * * *';
  END IF;

  -- Build the HTTP call SQL
  v_sql := format(
    $sql$SELECT net.http_post(url:='%s/functions/v1/pathao-sync-status', headers:='{"Content-Type":"application/json","Authorization":"Bearer %s"}'::jsonb, body:='{}'::jsonb)$sql$,
    v_supabase_url,
    v_service_key
  );

  PERFORM cron.schedule('pathao-status-sync-hourly', v_cron_expr, v_sql);
END;
$$;

-- Re-run scheduling now so any existing enabled setting takes effect immediately
SELECT schedule_pathao_sync();
