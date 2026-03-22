-- ============================================================================
-- COMPLETE RLS FIX - Remove ALL policies and recreate them correctly
-- ============================================================================

-- 1. DROP ALL EXISTING POLICIES ON user_profiles
DROP POLICY IF EXISTS "Users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can modify profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role full access" ON user_profiles;

-- 2. DISABLE RLS temporarily to verify table access
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 3. RE-ENABLE RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. CREATE SIMPLE, NON-RECURSIVE POLICIES
-- Allow all authenticated users to read all profiles
CREATE POLICY "allow_authenticated_read" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "allow_own_update" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (needed for signup)
CREATE POLICY "allow_own_insert" ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow service role full access (for server-side operations)
CREATE POLICY "allow_service_role_all" ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
