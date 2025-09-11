-- Enable Row Level Security on all tables
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Applications policies
-- Applications can only access their own data
CREATE POLICY "Applications own data" ON applications
  FOR ALL
  USING (
    -- Allow if user is admin
    (auth.jwt() ->> 'role' = 'admin') OR
    -- Allow if accessing own application data
    (id = (current_setting('app.current_application_id', true))::UUID)
  );

-- User profiles policies
-- Users can only see and modify their own profiles
CREATE POLICY "Users own profiles" ON user_profiles
  FOR ALL
  USING (
    -- Allow if user is admin
    (auth.jwt() ->> 'role' = 'admin') OR
    -- Allow if accessing own profile
    (id = auth.uid())
  );

-- Membership tiers policies
-- Applications can only access their own tiers
CREATE POLICY "Applications own tiers" ON membership_tiers
  FOR ALL
  USING (
    -- Allow if user is admin
    (auth.jwt() ->> 'role' = 'admin') OR
    -- Allow if accessing tiers for current application
    (application_id = (current_setting('app.current_application_id', true))::UUID)
  );

-- Public read access for membership tiers (for display purposes)
CREATE POLICY "Public read membership tiers" ON membership_tiers
  FOR SELECT
  USING (true);

-- Pricing plans policies
-- Applications can access pricing for their own tiers
CREATE POLICY "Applications own pricing" ON pricing_plans
  FOR ALL
  USING (
    -- Allow if user is admin
    (auth.jwt() ->> 'role' = 'admin') OR
    -- Allow if accessing pricing for application's tiers
    (membership_tier_id IN (
      SELECT id FROM membership_tiers 
      WHERE application_id = (current_setting('app.current_application_id', true))::UUID
    ))
  );

-- Public read access for pricing plans (for display purposes)
CREATE POLICY "Public read pricing plans" ON pricing_plans
  FOR SELECT
  USING (true);

-- User memberships policies
-- Applications can only access memberships for their app
CREATE POLICY "Applications own memberships" ON user_memberships
  FOR ALL
  USING (
    -- Allow if user is admin
    (auth.jwt() ->> 'role' = 'admin') OR
    -- Allow if accessing memberships for current application
    (application_id = (current_setting('app.current_application_id', true))::UUID)
  );

-- Users can only see their own memberships
CREATE POLICY "Users own memberships" ON user_memberships
  FOR SELECT
  USING (
    -- Allow if user is admin
    (auth.jwt() ->> 'role' = 'admin') OR
    -- Allow if accessing own memberships
    (user_id = auth.uid())
  );

-- Membership bundles policies
-- Admin full access to bundles
CREATE POLICY "Admin access bundles" ON membership_bundles
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Public read access for bundles (for display purposes)
CREATE POLICY "Public read bundles" ON membership_bundles
  FOR SELECT
  USING (true);

-- Audit logs policies
-- Admin full access to audit logs
CREATE POLICY "Admin access audit logs" ON audit_logs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Users can see audit logs for their own actions
CREATE POLICY "Users own audit logs" ON audit_logs
  FOR SELECT
  USING (
    -- Allow if user is admin
    (auth.jwt() ->> 'role' = 'admin') OR
    -- Allow if accessing own audit logs
    (user_id = auth.uid())
  );

-- Function to set application context
CREATE OR REPLACE FUNCTION set_application_context(app_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_application_id', app_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current application context
CREATE OR REPLACE FUNCTION get_application_context()
RETURNS UUID AS $$
BEGIN
  RETURN (current_setting('app.current_application_id', true))::UUID;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (auth.jwt() ->> 'role' = 'admin');
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;