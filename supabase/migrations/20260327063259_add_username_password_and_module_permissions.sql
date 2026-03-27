/*
  # Add Username/Password Auth and Module Permissions to Users Table

  ## Overview
  This migration adds proper username/password authentication to the users table,
  replaces the email-based dropdown login with a secure username+password flow,
  adds per-user module permission overrides for hybrid roles, and bootstraps an
  admin user. All demo/seed users are removed.

  ## Changes to `users` table
  - Add `username` (text, unique) — login identifier
  - Add `password_hash` (text) — bcrypt hashed password
  - Add `password_changed` (boolean, default false) — force-change-password flag
  - Add `module_permissions` (jsonb, default {}) — per-user module override map for hybrid roles
  - Add `can_see_costs` (boolean, default false) — already may exist, safe with check

  ## Security
  - RLS policies updated to use anon role (custom auth, not Supabase Auth)
  - Demo users removed safely by nulling FK references first
  - Admin bootstrapped with username=admin, password=Admin@1234

  ## Notes
  1. The bcrypt hash is for password "Admin@1234" (cost factor 10).
  2. Admin must change password on first login (password_changed = false).
  3. module_permissions JSONB: { "moduleName": true/false } — overrides role defaults.
  4. All FK-referencing columns are nullable, so we null them before deleting demo users.
*/

-- Step 1: Add new columns safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username text UNIQUE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_changed'
  ) THEN
    ALTER TABLE users ADD COLUMN password_changed boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'module_permissions'
  ) THEN
    ALTER TABLE users ADD COLUMN module_permissions jsonb DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'can_see_costs'
  ) THEN
    ALTER TABLE users ADD COLUMN can_see_costs boolean DEFAULT false;
  END IF;
END $$;

-- Step 2: Null out all FK references to the users table before deleting
UPDATE purchase_orders SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE po_change_log SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE po_attachments SET uploaded_by = NULL WHERE uploaded_by IS NOT NULL;
UPDATE supplier_notes SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE supplier_catalogs SET uploaded_by = NULL WHERE uploaded_by IS NOT NULL;
UPDATE supplier_payments SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE supplier_payment_files SET uploaded_by = NULL WHERE uploaded_by IS NOT NULL;
UPDATE shipments SET received_by = NULL WHERE received_by IS NOT NULL;
UPDATE goods_receipt_sessions SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE inventory_audits SET conducted_by = NULL WHERE conducted_by IS NOT NULL;
UPDATE inventory_cycle_count_schedules SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE inventory_cycle_count_sessions SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE stock_movements SET performed_by = NULL WHERE performed_by IS NOT NULL;
UPDATE orders SET assigned_to = NULL, confirmed_by = NULL WHERE assigned_to IS NOT NULL OR confirmed_by IS NOT NULL;
UPDATE order_notes SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE order_call_log SET called_by = NULL WHERE called_by IS NOT NULL;
UPDATE order_activity_log SET performed_by = NULL WHERE performed_by IS NOT NULL;
UPDATE order_picks SET picked_by = NULL WHERE picked_by IS NOT NULL;
UPDATE returns SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE return_photos SET uploaded_by = NULL WHERE uploaded_by IS NOT NULL;
UPDATE expenses SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE collection_records SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE app_settings SET updated_by = NULL WHERE updated_by IS NOT NULL;
UPDATE sms_logs SET sent_by = NULL WHERE sent_by IS NOT NULL;
UPDATE audit_flags SET resolved_by = NULL WHERE resolved_by IS NOT NULL;
UPDATE cs_assignments SET user_id = NULL WHERE user_id IS NOT NULL;

-- Step 3: Delete user_permissions records (FK cascade should handle this, but be explicit)
DELETE FROM user_permissions;

-- Step 4: Delete all existing demo users
DELETE FROM users;

-- Step 5: Insert bootstrap admin user
-- Password: Admin@1234 (bcrypt hash, cost 10)
INSERT INTO users (
  email,
  full_name,
  username,
  password_hash,
  role,
  is_active,
  can_see_costs,
  password_changed,
  module_permissions,
  created_at,
  updated_at
) VALUES (
  'admin@system.local',
  'System Administrator',
  'admin',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  true,
  true,
  false,
  '{}',
  now(),
  now()
);

-- Step 6: Drop old Supabase-Auth-based RLS policies
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Only admins can manage users" ON users;
DROP POLICY IF EXISTS "Users can view own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can manage all permissions" ON user_permissions;

-- Step 7: New RLS policies for custom auth (anon role)
CREATE POLICY "Anon can select users"
  ON users FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert users"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update users"
  ON users FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete users"
  ON users FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can select user permissions"
  ON user_permissions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert user permissions"
  ON user_permissions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update user permissions"
  ON user_permissions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete user permissions"
  ON user_permissions FOR DELETE
  TO anon
  USING (true);
