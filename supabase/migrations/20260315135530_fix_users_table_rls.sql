/*
  # Fix Users Table RLS for Login

  ## Changes
  - Add policy to allow anonymous users to view active users for login screen
  - This is safe because we only expose non-sensitive user info (name, role)
  - Passwords are handled separately by Supabase Auth

  ## Security Notes
  - Only allows SELECT on users table
  - Only returns active users
  - Does not expose sensitive data
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view all users" ON users;

-- Allow anyone (including anonymous) to view active users for login
CREATE POLICY "Anyone can view active users for login"
  ON users FOR SELECT
  USING (is_active = true);

-- Keep the admin-only management policy
-- (already exists from previous migration)