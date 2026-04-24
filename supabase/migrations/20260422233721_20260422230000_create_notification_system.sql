/*
  # Create Notification System

  ## Overview
  Foundation tables for the in-app notification system. Phase 1 supports
  return restock notifications sent by warehouse staff to all other active users.

  ## New Tables

  ### `notifications`
  One row per notification event (e.g. a batch restock update).
  - `id` (uuid, pk)
  - `type` (text) — category key, e.g. `return_restock`. Used to group notifications on the page.
  - `title` (text) — short display title
  - `body` (jsonb) — structured payload. For return_restock:
      { returns: [{ return_number, items: [{ sku, quantity }] }] }
  - `created_by` (uuid, fk → users) — the user who triggered the send
  - `created_at` (timestamptz)

  ### `notification_reads`
  One row per (notification, user) pair. Inserted at send time with read_at = NULL.
  Marking as read sets read_at = now().
  - `id` (uuid, pk)
  - `notification_id` (uuid, fk → notifications CASCADE DELETE)
  - `user_id` (uuid, fk → users CASCADE DELETE)
  - `read_at` (timestamptz, nullable) — NULL = unread

  ## Modified Tables

  ### `returns`
  - `notification_sent` (boolean, default false) — once true, this return is never
    included in another notification batch, preventing duplicate sends.

  ## Security
  - RLS enabled on both new tables
  - Anon role (custom auth pattern used throughout this app) can read/write both tables

  ## App Settings
  - Inserts default setting `notifications_return_restock_enabled = true`
*/

-- ── notifications ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,
  title       text NOT NULL,
  body        jsonb NOT NULL DEFAULT '{}',
  created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can read notifications"
  ON notifications FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert notifications"
  ON notifications FOR INSERT
  TO anon
  WITH CHECK (true);

-- ── notification_reads ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_reads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at         timestamptz,
  UNIQUE (notification_id, user_id)
);

ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can read notification_reads"
  ON notification_reads FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert notification_reads"
  ON notification_reads FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update notification_reads"
  ON notification_reads FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ── returns: add notification_sent flag ───────────────────────────────────────

ALTER TABLE returns ADD COLUMN IF NOT EXISTS notification_sent boolean NOT NULL DEFAULT false;

-- ── indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id ON notification_reads(notification_id);

-- ── default app setting ───────────────────────────────────────────────────────

INSERT INTO app_settings (key, value)
VALUES ('notifications_return_restock_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
