/*
  # Create cycle count schedule tables

  ## New Tables

  ### `inventory_cycle_count_schedules`
  Defines a recurring cycle count schedule.
  - `id` — UUID primary key
  - `name` — human-readable schedule name (e.g. "Weekly A-Row")
  - `frequency` — one of: 'daily', 'weekly', 'monthly'
  - `location_ids` — jsonb array of warehouse_location UUIDs to count
  - `location_names` — snapshot of location codes at schedule creation time
  - `next_due_date` — date when the next count is due
  - `last_completed_date` — date the most recent count session was completed
  - `is_active` — soft-disable without deleting
  - `created_by` — references users.id
  - `created_at`, `updated_at`

  ### `inventory_cycle_count_sessions`
  Links a completed audit to a cycle count schedule.
  - `id` — UUID primary key
  - `schedule_id` — references inventory_cycle_count_schedules.id
  - `audit_id` — references inventory_audits.id (the actual count)
  - `completed_at` — when the session was finished
  - `created_by` — references users.id

  ## Security
  - RLS enabled on both tables
  - Authenticated users can view all records (operations visibility)
  - Only authenticated users can insert/update/delete
*/

CREATE TABLE IF NOT EXISTS inventory_cycle_count_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  frequency text NOT NULL DEFAULT 'weekly' CHECK (frequency = ANY (ARRAY['daily', 'weekly', 'monthly'])),
  location_ids jsonb NOT NULL DEFAULT '[]',
  location_names text,
  next_due_date date,
  last_completed_date date,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_cycle_count_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cycle count schedules"
  ON inventory_cycle_count_schedules FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert cycle count schedules"
  ON inventory_cycle_count_schedules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cycle count schedules"
  ON inventory_cycle_count_schedules FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete cycle count schedules"
  ON inventory_cycle_count_schedules FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS inventory_cycle_count_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES inventory_cycle_count_schedules(id),
  audit_id uuid REFERENCES inventory_audits(id),
  completed_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_cycle_count_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cycle count sessions"
  ON inventory_cycle_count_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert cycle count sessions"
  ON inventory_cycle_count_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cycle count sessions"
  ON inventory_cycle_count_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete cycle count sessions"
  ON inventory_cycle_count_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
