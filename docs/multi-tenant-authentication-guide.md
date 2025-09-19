# Multi-Tenant Authentication Guide

## Overview

The MrBrooks Auth Service provides a centralized authentication system that allows multiple applications to authenticate users through a single service. This guide explains how to implement cross-application authentication flows.

## Architecture

### Components

1. **Auth Service** (`http://localhost:6010`) - The central authentication service
2. **Client Applications** - External applications that need authentication
3. **Authentication Sessions** - Temporary sessions that track cross-application auth flows
4. **Redirect URLs** - Validated URLs where users are sent after authentication

### Database Schema

The system uses the following key tables:

- `applications` - Registered client applications with allowed redirect URLs
- `auth_sessions` - Temporary authentication sessions for cross-app flows
- `user_profiles` - User account information
- `user_memberships` - User access levels per application

## Authentication Flow

### 1. Initiate Authentication

A client application initiates authentication by calling the auth service:

```javascript
// Client application code
const response = await fetch('http://localhost:6010/api/auth/initiate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    applicationId: 'your-app-id',
    redirectUrl: 'https://yourapp.com/auth/callback',
    userEmail: 'user@example.com', // Optional - pre-fill email
    state: { customData: 'value' }, // Optional - custom state data
    expiresInMinutes: 30 // Optional - session timeout (default: 30)
  })
})

const { authUrl, sessionToken } = await response.json()

// Redirect user to the auth service
window.location.href = authUrl
```

### 2. User Authentication

The user is redirected to the auth service login page:
- URL: `http://localhost:6010/auth/login?session=SESSION_TOKEN`
- User sees the authentication modal
- User can sign in or sign up
- Email confirmation is handled automatically

### 3. Authentication Completion

After successful authentication:
- User is redirected back to the client application
- URL includes success parameters: `https://yourapp.com/auth/callback?auth_success=true&user_id=USER_ID&state=STATE_DATA`

### 4. Client Application Handling

```javascript
// Client application callback handler
const urlParams = new URLSearchParams(window.location.search)
const authSuccess = urlParams.get('auth_success')
const userId = urlParams.get('user_id')
const state = urlParams.get('state')

if (authSuccess === 'true') {
  // Authentication successful
  console.log('User authenticated:', userId)
  
  if (state) {
    const customData = JSON.parse(state)
    console.log('Custom state:', customData)
  }
  
  // Proceed with your application logic
} else {
  // Handle authentication failure
}
```

## Application Registration

### 1. Register Your Application

Applications must be registered in the `applications` table:

```sql
INSERT INTO applications (id, name, slug, allowed_redirect_urls, status) VALUES (
  uuid_generate_v4(),
  'My Application',
  'my-app',
  ARRAY['https://myapp.com/auth/callback', 'https://myapp.com/login/success'],
  'active'
);
```

### 2. Configure Allowed Redirect URLs

For security, only pre-configured redirect URLs are allowed:

```sql
UPDATE applications 
SET allowed_redirect_urls = ARRAY[
  'https://myapp.com/auth/callback',
  'https://myapp.com/login/success',
  'https://staging.myapp.com/auth/callback'
]
WHERE slug = 'my-app';
```

Wildcard patterns are supported:
- `https://myapp.com/*` - Allows any path on myapp.com
- `https://*.myapp.com/callback` - Allows any subdomain

## API Endpoints

### POST /api/auth/initiate

Initiates a new authentication session.

**Request:**
```json
{
  "applicationId": "uuid",
  "redirectUrl": "https://yourapp.com/callback",
  "userEmail": "user@example.com", // Optional
  "state": { "custom": "data" }, // Optional
  "expiresInMinutes": 30 // Optional
}
```

**Response:**
```json
{
  "success": true,
  "sessionToken": "session-token",
  "authUrl": "http://localhost:6010/auth/login?session=session-token",
  "expiresAt": "2024-01-01T12:00:00Z"
}
```

### POST /api/auth/complete

Completes an authentication session (used internally).

**Request:**
```json
{
  "sessionToken": "session-token",
  "userId": "user-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "redirectUrl": "https://yourapp.com/callback",
  "state": { "custom": "data" },
  "applicationId": "app-uuid"
}
```

## Security Considerations

### Redirect URL Validation

- All redirect URLs must be pre-registered in the application configuration
- Wildcard patterns are supported but should be used carefully
- HTTPS is required for production redirect URLs

### Session Security

- Authentication sessions expire after 30 minutes by default
- Session tokens are cryptographically secure random strings
- Sessions are automatically cleaned up after expiration

### State Parameter

- The state parameter allows passing custom data through the auth flow
- State data is returned exactly as provided
- Do not include sensitive information in the state parameter

## Error Handling

### Common Error Scenarios

1. **Invalid Application ID**
   - Status: 400
   - Error: "Invalid application ID"

2. **Invalid Redirect URL**
   - Status: 400
   - Error: "Invalid redirect URL for application"

3. **Expired Session**
   - Status: 400
   - Error: "Invalid or expired session token"

4. **Authentication Failure**
   - User is redirected to: `https://yourapp.com/callback?auth_success=false&error=reason`

## Testing

### Local Development

1. Start the auth service: `npm run dev`
2. Register a test application with redirect URL: `http://localhost:3000/callback`
3. Test the authentication flow using the provided examples

### Example Test Application

```html
<!DOCTYPE html>
<html>
<head>
    <title>Auth Test</title>
</head>
<body>
    <button onclick="startAuth()">Login with MrBrooks Auth</button>
    
    <script>
        async function startAuth() {
            const response = await fetch('http://localhost:6010/api/auth/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    applicationId: 'your-app-id',
                    redirectUrl: window.location.origin + '/callback.html',
                    state: { returnTo: '/dashboard' }
                })
            })
            
            const { authUrl } = await response.json()
            window.location.href = authUrl
        }
        
        // Handle callback (in callback.html)
        const params = new URLSearchParams(window.location.search)
        if (params.get('auth_success') === 'true') {
            console.log('Authenticated user:', params.get('user_id'))
            const state = JSON.parse(params.get('state') || '{}')
            console.log('Return to:', state.returnTo)
        }
    </script>
</body>
</html>
```

## Migration Guide

### From Direct Authentication

If you're currently using direct Supabase authentication:

1. Register your application in the auth service
2. Replace direct auth calls with the initiate/callback flow
3. Update your callback handling to process the new URL parameters
4. Test the integration thoroughly

### Database Migration

Run the migration to add authentication session support:

```bash
# Apply the migration
supabase db push

# Or manually run the SQL
psql -f supabase/migrations/003_auth_sessions.sql
```

## Troubleshooting

### Common Issues

1. **"Invalid redirect URL" error**
   - Ensure the redirect URL is registered in `applications.allowed_redirect_urls`
   - Check for typos in the URL
   - Verify the application is active

2. **Session expires too quickly**
   - Increase `expiresInMinutes` when initiating authentication
   - Check server time synchronization

3. **State data not preserved**
   - Ensure state is valid JSON
   - Check URL length limits (keep state data small)

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=auth:* npm run dev
```

## Best Practices

1. **Always use HTTPS** for redirect URLs in production
2. **Keep state data minimal** to avoid URL length issues
3. **Handle authentication errors gracefully** in your application
4. **Set appropriate session timeouts** based on your use case
5. **Regularly clean up expired sessions** using the provided cleanup function
6. **Validate user permissions** after authentication in your application