@echo off
echo Applying MrBrooks Auth Service Database Migrations...
echo.

echo Step 1: Applying auth sessions migration...
echo Please run the following SQL in your Supabase SQL Editor:
echo.
echo File: supabase/migrations/003_auth_sessions.sql
echo.
pause

echo Step 2: Applying test application setup...
echo Please run the following SQL in your Supabase SQL Editor:
echo.
echo File: supabase/migrations/004_test_application_setup.sql
echo.
pause

echo.
echo ✅ Migration instructions complete!
echo.
echo Next steps:
echo 1. Go to https://supabase.com/dashboard/project/tiylfbpezoetzccylgeb
echo 2. Navigate to SQL Editor
echo 3. Copy and paste the contents of each migration file
echo 4. Run each migration in order
echo.
echo After migrations are complete:
echo 1. Open test-client-app.html in your browser
echo 2. Test the multi-tenant authentication flow
echo.
pause