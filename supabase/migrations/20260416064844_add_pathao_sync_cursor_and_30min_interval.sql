/*
  # Pathao Sync - Cursor Pagination, Priority Ordering, and 30-Minute Interval

  ## Summary
  Enhances the Pathao status sync system to rotate through all eligible orders
  fairly, prioritise the longest-unsynced orders, and support a 30-minute
  scheduled interval.

  ## New app_settings Rows
  - pathao_sync_cursor: ISO timestamp of the last order processed in the previous
    scheduled run. The next run picks up orders whose courier_status_updated_at
    is older (or NULL). When the pool is exhausted the cursor resets to NULL.
  - pathao_sync_batch_size: integer (default 50). Controls how many orders a
    scheduled run processes. Manual force runs ignore this and process all orders.

  ## Modified: schedule_pathao_sync()
  - Adds support for pathao_sync_interval_hours = 0 (meaning 30 minutes).
    Emits cron expression every 30 minutes in that case.
  - Stores 0 for 30m and existing integers for hourly options.

  ## Security
  - No new tables; no RLS changes required.
*/

INSERT INTO app_settings (key, value)
VALUES
  ('pathao_sync_cursor',     'null'::jsonb),
  ('pathao_sync_batch_size', '50'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION schedule_pathao_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enabled        boolean;
  v_interval_hours int;
  v_cron_expr      text;
  v_supabase_url   text;
  v_service_key    text;
  v_sql            text;
BEGIN
  SELECT (value::text)::boolean INTO v_enabled
    FROM app_settings WHERE key = 'pathao_sync_enabled';

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

  v_interval_hours := COALESCE(v_interval_hours, 1);

  SELECT trim('"' FROM value::text) INTO v_supabase_url
    FROM app_settings WHERE key = 'supabase_url';

  SELECT trim('"' FROM value::text) INTO v_service_key
    FROM app_settings WHERE key = 'service_role_key';

  IF v_supabase_url IS NULL OR v_service_key IS NULL OR
     v_supabase_url = '' OR v_service_key = '' THEN
    RAISE NOTICE 'schedule_pathao_sync: supabase_url or service_role_key not configured in app_settings, skipping cron schedule.';
    RETURN;
  END IF;

  IF v_interval_hours = 0 THEN
    v_cron_expr := '*/30 * * * *';
  ELSIF v_interval_hours = 1 THEN
    v_cron_expr := '0 * * * *';
  ELSE
    v_cron_expr := '0 */' || v_interval_hours || ' * * *';
  END IF;

  v_sql := format(
    $sql$SELECT net.http_post(url:='%s/functions/v1/pathao-sync-status', headers:='{"Content-Type":"application/json","Authorization":"Bearer %s"}'::jsonb, body:='{}'::jsonb)$sql$,
    v_supabase_url,
    v_service_key
  );

  PERFORM cron.schedule('pathao-status-sync-hourly', v_cron_expr, v_sql);
END;
$$;

SELECT schedule_pathao_sync();
