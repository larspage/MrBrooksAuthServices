# Enhanced Auth Service Features

This document describes the enhanced features added to the MrBrooks Auth Service to support redirect validation and membership information in authentication responses.

## Overview

The Auth Service has been enhanced with the following key features:

1. **Enhanced Redirect Validation** - Improved error logging with detailed instructions for configuring allowed redirect URLs
2. **Membership Information in Responses** - All authentication endpoints now return comprehensive user membership data
3. **Comprehensive Error Logging** - Detailed audit logging for redirect validation failures
4. **Enhanced Database Functions** - New PostgreSQL functions for retrieving membership data with pricing information

## Enhanced Features

### 1. Redirect Validation with Error Logging

#### What Changed
- Enhanced [`create_auth_session_enhanced()`](supabase/migrations/005_enhanced_auth_responses.sql:67) function with improved error logging
- Added [`log_redirect_validation_error()`](supabase/migrations/005_enhanced_auth_responses.sql:37) function for detailed error tracking
- Updated [`/api/auth/initiate`](src/app/api/auth/initiate/route.ts:16) endpoint to use enhanced functions

#### How It Works
When an application calls the Auth Service with an invalid redirect URL:

1. **Validation Occurs**: The [`validate_redirect_url()`](supabase/migrations/003_auth_sessions.sql:37) function checks the URL against allowed patterns
2. **Error Logging**: If validation fails, [`log_redirect_validation_error()`](supabase/migrations/005_enhanced_auth_responses.sql:37) logs detailed information to [`audit_logs`](src/types/database.ts:225) table
3. **Helpful Instructions**: The error log includes specific SQL commands to add the redirect URL to the allowed list
4. **API Response**: Returns a 400 error with clear instructions for the developer

#### Example Error Log Entry
```json
{
  "error_message": "Invalid redirect URL attempted for application \"My App\" (my-app): https://evil.com/callback",
  "instructions": "To allow this redirect URL, add it to the allowed_redirect_urls array for application \"My App\". Current allowed patterns: [\"http://localhost:*\", \"https://myapp.com/*\"]. You can update this in Supabase by running: UPDATE applications SET allowed_redirect_urls = array_append(allowed_redirect_urls, 'https://evil.com/callback') WHERE slug = 'my-app';"
}
```

### 2. Membership Information in Authentication Responses

#### What Changed
- Added [`get_user_memberships_with_pricing()`](supabase/migrations/005_enhanced_auth_responses.sql:8) function
- Enhanced [`complete_auth_session_enhanced()`](supabase/migrations/005_enhanced_auth_responses.sql:109) function to include membership data
- Updated all auth endpoints to return comprehensive membership information

#### Response Structure
All authentication endpoints now include a `userMemberships` array with the following structure:

```typescript
interface UserMembership {
  application_id: string
  application_name: string
  application_slug: string
  membership: {
    id: string
    status: 'active' | 'inactive' | 'past_due' | 'canceled'
    tier: {
      id: string
      name: string
      level: number
      features: any[]
    }
    started_at: string
    ends_at: string
    renewal_date: string
    pricing: {
      monthly_cents: number
      yearly_cents: number
      currency: string
    }
  }
}
```

#### Enhanced Endpoints

##### POST /api/auth/initiate
**Request:**
```json
{
  "applicationId": "550e8400-e29b-41d4-a716-446655440000",
  "redirectUrl": "http://localhost:3000/callback",
  "userEmail": "user@example.com",
  "state": { "returnTo": "/dashboard" },
  "expiresInMinutes": 30
}
```

**Enhanced Features:**
- Captures user agent and IP address for error logging
- Uses [`create_auth_session_enhanced()`](supabase/migrations/005_enhanced_auth_responses.sql:67) for better error handling

##### POST /api/auth/complete
**Request:**
```json
{
  "sessionToken": "session-token-123",
  "userId": "user-456"
}
```

**Enhanced Response:**
```json
{
  "success": true,
  "redirectUrl": "http://localhost:3000/callback",
  "state": { "returnTo": "/dashboard" },
  "applicationId": "550e8400-e29b-41d4-a716-446655440000",
  "userMemberships": [
    {
      "application_id": "550e8400-e29b-41d4-a716-446655440000",
      "application_name": "Test App",
      "application_slug": "test-app",
      "membership": {
        "id": "membership-123",
        "status": "active",
        "tier": {
          "id": "tier-123",
          "name": "Premium",
          "level": 2,
          "features": ["feature1", "feature2"]
        },
        "started_at": "2024-01-01T00:00:00Z",
        "ends_at": "2024-12-31T23:59:59Z",
        "renewal_date": "2024-12-01T00:00:00Z",
        "pricing": {
          "monthly_cents": 999,
          "yearly_cents": 9999,
          "currency": "usd"
        }
      }
    }
  ]
}
```

##### POST /api/auth/verify
**Enhanced Response:**
```json
{
  "authorized": true,
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "profile": {
      "full_name": "John Doe",
      "avatar_url": "https://example.com/avatar.jpg"
    }
  },
  "application": {
    "id": "app-123",
    "name": "Test App"
  },
  "membership": {
    "id": "membership-123",
    "status": "active",
    "tier": {
      "id": "tier-123",
      "name": "Premium",
      "tier_level": 2,
      "features": ["feature1", "feature2"]
    },
    "started_at": "2024-01-01T00:00:00Z",
    "ends_at": "2024-12-31T23:59:59Z"
  },
  "userMemberships": [
    // Array of all user memberships across applications
  ]
}
```

## Database Schema Changes

### New Functions

#### [`get_user_memberships_with_pricing(user_uuid UUID)`](supabase/migrations/005_enhanced_auth_responses.sql:8)
Returns comprehensive membership information including pricing for a user across all applications.

**Returns:**
- `application_id`, `application_name`, `application_slug`
- `membership_id`, `membership_status`
- `tier_id`, `tier_name`, `tier_level`, `tier_features`
- `started_at`, `ends_at`, `renewal_date`
- `monthly_price_cents`, `yearly_price_cents`, `currency`

#### [`log_redirect_validation_error()`](supabase/migrations/005_enhanced_auth_responses.sql:37)
Logs detailed redirect validation errors with helpful instructions.

**Parameters:**
- `app_id UUID` - Application ID
- `attempted_redirect_url TEXT` - The invalid URL that was attempted
- `user_agent TEXT` - Optional user agent string
- `ip_address INET` - Optional IP address

#### [`create_auth_session_enhanced()`](supabase/migrations/005_enhanced_auth_responses.sql:67)
Enhanced version of the original function with better error logging.

**Additional Parameters:**
- `user_agent TEXT` - User agent for error logging
- `ip_address INET` - IP address for error logging

#### [`complete_auth_session_enhanced()`](supabase/migrations/005_enhanced_auth_responses.sql:109)
Enhanced version that returns membership information along with session data.

**Returns:**
- `application_id`, `redirect_url`, `state` (original)
- `user_memberships JSONB` (new) - Complete membership data

## Testing

### Test Coverage
- **Initiate Endpoint**: 8 test cases covering success, validation, error handling
- **Complete Endpoint**: 7 test cases covering success, errors, membership data
- **Verify Endpoint**: Enhanced existing tests to include membership data validation

### Key Test Scenarios
1. **Redirect Validation**: Tests for valid/invalid URLs and error responses
2. **Membership Data**: Verification that all endpoints return complete membership information
3. **Error Handling**: Comprehensive error scenarios and appropriate responses
4. **Edge Cases**: Long URLs, missing parameters, database errors

## Usage Examples

### Configuring Allowed Redirect URLs

To add a new redirect URL for an application:

```sql
UPDATE applications 
SET allowed_redirect_urls = array_append(allowed_redirect_urls, 'https://newdomain.com/callback') 
WHERE slug = 'your-app-slug';
```

To set multiple allowed patterns:

```sql
UPDATE applications 
SET allowed_redirect_urls = ARRAY[
  'http://localhost:*',
  'https://yourdomain.com/*',
  'https://staging.yourdomain.com/*'
] 
WHERE slug = 'your-app-slug';
```

### Checking Error Logs

To view redirect validation errors:

```sql
SELECT 
  created_at,
  old_values->>'attempted_redirect_url' as attempted_url,
  old_values->>'application_name' as app_name,
  new_values->>'instructions' as fix_instructions
FROM audit_logs 
WHERE action = 'REDIRECT_VALIDATION_ERROR'
ORDER BY created_at DESC;
```

## Security Considerations

1. **Redirect Validation**: All redirect URLs must be explicitly allowed in the [`applications.allowed_redirect_urls`](supabase/migrations/003_auth_sessions.sql:31) array
2. **Error Logging**: Sensitive information is not exposed in error responses to end users
3. **Audit Trail**: All redirect validation failures are logged for security monitoring
4. **Input Validation**: All user inputs are properly sanitized and validated

## Performance Impact

- **Database Functions**: New functions use efficient queries with proper indexing
- **Response Size**: Membership data adds ~1-5KB per user depending on number of memberships
- **Caching**: Consider implementing response caching for frequently accessed membership data
- **Indexing**: Existing indexes on [`user_memberships`](src/types/database.ts:143) support efficient queries

## Migration Notes

1. **Database Migration**: Run [`005_enhanced_auth_responses.sql`](supabase/migrations/005_enhanced_auth_responses.sql) to add new functions
2. **Backward Compatibility**: Original functions remain available for existing integrations
3. **Client Updates**: Update client applications to handle new `userMemberships` field in responses
4. **Error Handling**: Update error handling to process new redirect validation error format

## Troubleshooting

### Common Issues

1. **Redirect URL Rejected**: Check [`audit_logs`](src/types/database.ts:225) table for detailed instructions
2. **Missing Membership Data**: Verify user has active memberships and proper database permissions
3. **Performance Issues**: Consider adding indexes on frequently queried membership fields

### Debug Queries

Check application redirect configuration:
```sql
SELECT name, slug, allowed_redirect_urls 
FROM applications 
WHERE slug = 'your-app-slug';
```

View user memberships:
```sql
SELECT * FROM get_user_memberships_with_pricing('user-uuid-here');
```

Check recent auth sessions:
```sql
SELECT * FROM auth_sessions 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;