# Database Setup Guide - MrBrooks Auth Service

## Issue Resolution
The application is showing errors because the database schema and RPC functions haven't been applied to your Supabase database yet.

## Quick Fix Steps

### 1. Apply Database Migrations
You need to run the database migrations to create the required tables and functions:

```bash
# Apply the database migrations
npm run db:migrate
```

If that doesn't work, try:
```bash
# Reset and apply migrations
npm run db:reset
```

### 2. Manual Database Setup (Alternative)
If the migration commands don't work, you can manually apply the SQL files:

1. **Go to your Supabase Dashboard**
   - Open https://supabase.com/dashboard
   - Select your project
   - Go to the SQL Editor

2. **Apply Schema Migration**
   - Copy the contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and run it in the SQL Editor

3. **Apply RLS Policies and Functions**
   - Copy the contents of `supabase/migrations/002_rls_policies.sql`
   - Paste and run it in the SQL Editor

### 3. Verify Setup
After applying the migrations, verify that the functions exist:

```sql
-- Run this in Supabase SQL Editor to check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_admin', 'set_application_context', 'get_application_context');
```

You should see all three functions listed.

### 4. Create Admin User
To test admin functionality, you need to set a user as admin:

```sql
-- Replace 'your-user-id' with your actual user ID from auth.users
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'), 
  '{role}', 
  '"admin"'
) 
WHERE id = 'your-user-id';
```

Or update the user_profiles table:
```sql
-- Replace 'your-user-id' with your actual user ID
UPDATE user_profiles 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'), 
  '{role}', 
  '"admin"'
) 
WHERE id = 'your-user-id';
```

## Expected Database Schema
After successful migration, you should have these tables:
- `applications`
- `user_profiles`
- `membership_tiers`
- `pricing_plans`
- `user_memberships`
- `membership_bundles`
- `audit_logs`

And these functions:
- `is_admin()` - Check if current user is admin
- `set_application_context(UUID)` - Set application context for RLS
- `get_application_context()` - Get current application context
- `update_updated_at_column()` - Trigger function for timestamps

## Troubleshooting

### If migrations fail:
1. Check your Supabase connection in `.env.local`
2. Ensure you have the Supabase CLI installed
3. Try running migrations manually via SQL Editor

### If admin functions don't work:
1. Verify the `is_admin()` function exists
2. Check that your user has the admin role set
3. Ensure RLS policies are properly applied

### If you get permission errors:
1. Check that the functions have proper SECURITY DEFINER settings
2. Verify that the necessary grants are applied
3. Ensure your user has the required permissions

## Critical Fix for User Profile Access

### Issue: 403 Forbidden on user_profiles
If you're getting a 403 error when accessing user profiles after email confirmation, you need to create a database trigger to automatically create user profiles.

**Add this SQL to your Supabase database:**

```sql
-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, metadata)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Alternative Manual Fix
If you already have users who can't access their profiles, manually create their profile records:

```sql
-- Replace 'USER_ID_HERE' with the actual user ID from auth.users
INSERT INTO user_profiles (id, email, full_name, metadata)
SELECT
  id,
  email,
  raw_user_meta_data->>'full_name',
  raw_user_meta_data
FROM auth.users
WHERE id = 'USER_ID_HERE'
ON CONFLICT (id) DO NOTHING;
```

## Testing the Setup
Once the database is set up, you should be able to:

1. **Visit localhost:6010** - No more database errors
2. **Sign up/Sign in** - Authentication should work
3. **Access user profiles** - No more 403 errors
4. **Access admin features** - If you're set as admin
5. **Create applications** - Admin functionality should work

## Next Steps
After the database is properly set up:
1. Test the manual testing procedures in `docs/manual-testing-guide.md`
2. Run the automated tests with `npm test`
3. Verify all functionality is working as expected

The testing framework is complete and ready to use once the database schema is properly applied.