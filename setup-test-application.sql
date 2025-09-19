-- Setup test application for multi-tenant authentication testing
-- Run this script to prepare the database for testing

-- First, apply the auth sessions migration if not already done
-- This adds the auth_sessions table and related functions

-- Insert test application
INSERT INTO applications (id, name, slug, description, allowed_redirect_urls, status, created_at, updated_at) 
VALUES (
    'test-app-id',
    'Test Client Application',
    'test-client',
    'Test application for multi-tenant authentication flow',
    ARRAY[
        'file://*',
        'http://localhost:*',
        'https://localhost:*',
        'http://127.0.0.1:*',
        'https://127.0.0.1:*'
    ],
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    allowed_redirect_urls = EXCLUDED.allowed_redirect_urls,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the application was created
SELECT 
    id,
    name,
    slug,
    allowed_redirect_urls,
    status,
    created_at
FROM applications 
WHERE id = 'test-app-id';

-- Show all applications for reference
SELECT 
    id,
    name,
    slug,
    status,
    array_length(allowed_redirect_urls, 1) as redirect_url_count
FROM applications 
ORDER BY created_at;

-- Test the validation function
SELECT validate_redirect_url('test-app-id', 'file:///C:/Repos/MrBrooksAuthServices/test-client-app.html') as file_url_valid;
SELECT validate_redirect_url('test-app-id', 'http://localhost:3000/callback') as localhost_valid;
SELECT validate_redirect_url('test-app-id', 'https://evil.com/callback') as invalid_url;

-- Clean up any expired test sessions
SELECT cleanup_expired_auth_sessions() as cleaned_sessions;

COMMIT;