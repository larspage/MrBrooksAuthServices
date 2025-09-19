-- Test application setup for multi-tenant authentication testing
-- This migration creates a test application for validating the authentication flow

-- Generate proper UUIDs for test application
DO $$
DECLARE
    test_app_uuid UUID := '550e8400-e29b-41d4-a716-446655440000';
    basic_tier_uuid UUID := '550e8400-e29b-41d4-a716-446655440001';
    premium_tier_uuid UUID := '550e8400-e29b-41d4-a716-446655440002';
BEGIN
    -- Insert test application with comprehensive redirect URL patterns
    INSERT INTO applications (id, name, slug, description, allowed_redirect_urls, status, created_at, updated_at)
    VALUES (
        test_app_uuid,
        'Test Client Application',
        'test-client',
        'Test application for multi-tenant authentication flow validation',
        ARRAY[
            'file://*',
            'http://localhost:*',
            'https://localhost:*',
            'http://127.0.0.1:*',
            'https://127.0.0.1:*',
            'http://localhost:3000/*',
            'http://localhost:3001/*',
            'http://localhost:8080/*'
        ],
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        allowed_redirect_urls = EXCLUDED.allowed_redirect_urls,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;

    -- Create a basic membership tier for the test application
    INSERT INTO membership_tiers (id, application_id, name, slug, description, tier_level, created_at, updated_at)
    VALUES (
        basic_tier_uuid,
        test_app_uuid,
        'Basic Access',
        'basic',
        'Basic access tier for test application',
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        tier_level = EXCLUDED.tier_level,
        updated_at = CURRENT_TIMESTAMP;

    -- Create a premium membership tier for the test application
    INSERT INTO membership_tiers (id, application_id, name, slug, description, tier_level, created_at, updated_at)
    VALUES (
        premium_tier_uuid,
        test_app_uuid,
        'Premium Access',
        'premium',
        'Premium access tier for test application',
        2,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        tier_level = EXCLUDED.tier_level,
        updated_at = CURRENT_TIMESTAMP;
END $$;

-- Clean up any expired test sessions
SELECT cleanup_expired_auth_sessions();

-- Verification queries (these will show results in the Supabase SQL editor)
-- Verify the test application was created
SELECT
    id,
    name,
    slug,
    description,
    allowed_redirect_urls,
    status,
    created_at
FROM applications
WHERE slug = 'test-client';

-- Verify membership tiers were created
SELECT
    id,
    application_id,
    name,
    slug,
    tier_level
FROM membership_tiers
WHERE application_id = (SELECT id FROM applications WHERE slug = 'test-client')
ORDER BY tier_level;

-- Test the redirect URL validation function
SELECT
    'file:///C:/test.html' as test_url,
    validate_redirect_url((SELECT id FROM applications WHERE slug = 'test-client'), 'file:///C:/test.html') as is_valid
UNION ALL
SELECT
    'http://localhost:3000/callback' as test_url,
    validate_redirect_url((SELECT id FROM applications WHERE slug = 'test-client'), 'http://localhost:3000/callback') as is_valid
UNION ALL
SELECT
    'https://evil.com/callback' as test_url,
    validate_redirect_url((SELECT id FROM applications WHERE slug = 'test-client'), 'https://evil.com/callback') as is_valid;

-- Show summary of all applications
SELECT 
    COUNT(*) as total_applications,
    COUNT(*) FILTER (WHERE status = 'active') as active_applications,
    COUNT(*) FILTER (WHERE status = 'development') as development_applications
FROM applications;