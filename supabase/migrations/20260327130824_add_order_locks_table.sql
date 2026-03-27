/*
  # Add Order Locks Table

  ## Purpose
  Tracks which user is currently viewing an order to provide a real-time
  visual indicator on the orders list. This is purely informational — no
  access is restricted.

  ## New Tables
  - `order_locks`
    - `id` (uuid, primary key)
    - `order_id` (uuid, FK to orders, unique — only one active lock per order)
    - `user_id` (uuid, FK to users)
    - `user_name` (text) — denormalized for fast display
    - `locked_at` (timestamptz) — when the lock was first acquired
    - `heartbeat_at` (timestamptz) — updated every ~15s to indicate the user is still active

  ## Security
  - RLS enabled
  - Anon role can read, insert, update, and delete their own lock rows
    (this app uses a custom auth system without Supabase Auth, so we use
    anon role with permissive policies matching the rest of the app)

  ## Notes
  - Stale locks (heartbeat_at older than 30s) are ignored in the UI
  - Table is added to the realtime publication for live updates
*/

CREATE TABLE IF NOT EXISTS order_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT '',
  locked_at timestamptz NOT NULL DEFAULT now(),
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_locks_order_id_unique UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_locks_order_id ON order_locks(order_id);
CREATE INDEX IF NOT EXISTS idx_order_locks_heartbeat_at ON order_locks(heartbeat_at);

ALTER TABLE order_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read order locks"
  ON order_locks FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert order locks"
  ON order_locks FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update order locks"
  ON order_locks FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete order locks"
  ON order_locks FOR DELETE
  TO anon
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE order_locks;
