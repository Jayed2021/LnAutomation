-- ============================================================================
-- FIX RLS POLICIES - Remove Infinite Recursion
-- ============================================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can modify profiles" ON user_profiles;

-- Create new policies without recursion
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles 
  FOR SELECT 
  TO authenticated 
  USING (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles 
  FOR UPDATE 
  TO authenticated 
  USING (id = auth.uid());

-- For now, allow authenticated users to read all profiles (needed for the app to function)
-- We'll add role-based restrictions later if needed
CREATE POLICY "Authenticated users can read all profiles" ON user_profiles 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Allow service role to do everything (for admin user creation via API)
CREATE POLICY "Service role full access" ON user_profiles 
  FOR ALL 
  TO service_role 
  USING (true);
