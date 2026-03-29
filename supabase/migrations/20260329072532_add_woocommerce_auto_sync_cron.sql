/*
  # Add WooCommerce Auto Sync Cron Job

  ## Problem
  The WooCommerce auto sync toggle in the UI saves the `auto_sync_enabled` flag to
  `woocommerce_config`, but no background scheduler was ever wired up to actually run
  a sync on a schedule. As a result, enabling auto sync had no real effect.

  This mirrors the exact same issue that affected the Pathao courier sync and the
  auto CS-assignment feature, both of which were fixed by reading credentials from
  the `app_settings` table instead of unavailable GUC variables.

  ## Fix
  1. Create `schedule_woocommerce_sync()` — reads `supabase_url` and `service_role_key`
     from `app_settings` (NOT from GUC which is always NULL in this project), builds a
     pg_cron expression from `sync_interval_minutes` in `woocommerce_config`, guards
     against NULL/empty credentials, then registers the cron job.
  2. Add a trigger on `woocommerce_config` so any UPDATE to `auto_sync_enabled` or
     `sync_interval_minutes` immediately re-runs the scheduling function — toggling
     auto sync in the UI takes effect without any manual intervention.
  3. Call `SELECT schedule_woocommerce_sync()` at the end of this migration so any
     already-enabled config gets a cron job registered right now.

  ## New Objects
  - Function: `schedule_woocommerce_sync()` — manages the pg_cron job
  - Function: `trigger_reschedule_woocommerce_sync()` — trigger wrapper
  - Trigger: `reschedule_woocommerce_sync_on_change` on `woocommerce_config`

  ## Security
  - No RLS changes (no new tables)
  - Functions are SECURITY DEFINER so pg_cron can call them
*/

CREATE OR REPLACE FUNCTION schedule_woocommerce_sync()
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
  SELECT auto_sync_enabled, sync_interval_minutes
    INTO v_enabled, v_interval_minutes
    FROM woocommerce_config
    LIMIT 1;

  -- Remove any existing schedule first (ignore error if not found)
  BEGIN
    PERFORM cron.unschedule('woocommerce-auto-sync');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF v_enabled IS NOT TRUE THEN
    RETURN;
  END IF;

  -- Default to 60 minutes if not set
  v_interval_minutes := GREATEST(15, COALESCE(v_interval_minutes, 60));

  -- Read credentials from app_settings (GUC is unavailable in this project)
  SELECT trim('"' FROM value::text) INTO v_supabase_url
    FROM app_settings WHERE key = 'supabase_url';

  SELECT trim('"' FROM value::text) INTO v_service_key
    FROM app_settings WHERE key = 'service_role_key';

  -- Guard: if either credential is missing, skip to avoid NULL command error
  IF v_supabase_url IS NULL OR v_service_key IS NULL OR
     v_supabase_url = '' OR v_service_key = '' THEN
    RAISE NOTICE 'schedule_woocommerce_sync: supabase_url or service_role_key not configured in app_settings, skipping cron schedule.';
    RETURN;
  END IF;

  -- Build cron expression from interval_minutes
  -- 15 min → '*/15 * * * *', 30 min → '*/30 * * * *'
  -- 60 min → '0 * * * *', 120 min → '0 */2 * * *', etc.
  IF v_interval_minutes < 60 THEN
    v_cron_expr := '*/' || v_interval_minutes || ' * * * *';
  ELSIF v_interval_minutes = 60 THEN
    v_cron_expr := '0 * * * *';
  ELSE
    v_cron_expr := '0 */' || (v_interval_minutes / 60) || ' * * *';
  END IF;

  v_sql := format(
    $sql$SELECT net.http_post(url:='%s/functions/v1/woo-auto-sync', headers:='{"Content-Type":"application/json","Authorization":"Bearer %s"}'::jsonb, body:='{}'::jsonb)$sql$,
    v_supabase_url,
    v_service_key
  );

  PERFORM cron.schedule('woocommerce-auto-sync', v_cron_expr, v_sql);

  RAISE NOTICE 'schedule_woocommerce_sync: scheduled with cron expression "%"', v_cron_expr;
END;
$$;

-- Trigger wrapper function
CREATE OR REPLACE FUNCTION trigger_reschedule_woocommerce_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (OLD.auto_sync_enabled IS DISTINCT FROM NEW.auto_sync_enabled) OR
     (OLD.sync_interval_minutes IS DISTINCT FROM NEW.sync_interval_minutes) THEN
    PERFORM schedule_woocommerce_sync();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on woocommerce_config to auto-reschedule when settings change
DROP TRIGGER IF EXISTS reschedule_woocommerce_sync_on_change ON woocommerce_config;
CREATE TRIGGER reschedule_woocommerce_sync_on_change
  AFTER UPDATE ON woocommerce_config
  FOR EACH ROW
  EXECUTE FUNCTION trigger_reschedule_woocommerce_sync();

-- Apply immediately from current settings
SELECT schedule_woocommerce_sync();
