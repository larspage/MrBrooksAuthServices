# Supabase Email Redirect Configuration

## Problem
When users click email confirmation links, they may be redirected to the root URL (`http://localhost:6010/`) instead of the callback route (`http://localhost:6010/auth/callback`).

## Solution

### 1. Configure Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/tiylfbpezoetzccylgeb
2. **Navigate to Authentication → URL Configuration**
3. **Add the following URLs to "Redirect URLs"**:
   - `http://localhost:6010/auth/callback` (primary callback route)
   - `http://localhost:6010/` (fallback for direct redirects)
   - For production, add your production URLs as well

### 2. Fallback Handling (Already Implemented)

The home page (`src/app/page.tsx`) now includes fallback handling for authentication tokens in the URL. This ensures that even if Supabase redirects to the root URL, the authentication will still work properly.

## How It Works

### Primary Flow (Preferred)
1. User clicks email confirmation link
2. Supabase redirects to `/auth/callback?code=...`
3. Callback route processes the code and redirects to home page
4. User is authenticated

### Fallback Flow (Backup)
1. User clicks email confirmation link
2. Supabase redirects to `/?access_token=...&refresh_token=...&type=signup`
3. Home page detects authentication tokens in URL
4. Home page processes the tokens and authenticates the user
5. URL is cleaned up to remove sensitive tokens

## Testing

After configuring the Supabase dashboard:

1. Sign up with a new email address
2. Check the email confirmation link format
3. Click the link and verify you're redirected properly
4. Confirm you're logged in after clicking the link

## Security Notes

- The fallback handling automatically cleans up authentication tokens from the URL after processing
- User profiles are created/updated automatically during the confirmation process
- Errors are handled gracefully with redirects to the error page