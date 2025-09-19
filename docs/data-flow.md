# MrBrooks Auth Service - Data Flow Documentation

## Overview

The MrBrooks Auth Service implements a secure, multi-tenant authentication system that allows client applications to authenticate users through a centralized service. This document outlines the complete data flow through the authentication process.

## Architecture Components

### Core Services
- **Auth Service API**: Next.js API routes handling authentication flows
- **Supabase Database**: PostgreSQL database with Row Level Security (RLS)
- **Client Applications**: External apps integrating with the auth service
- **Auth Client Library**: TypeScript/JavaScript SDK for easy integration

### Key Data Entities
- **Applications**: Registered client applications with API keys and configuration
- **Users**: Authenticated users with profiles and memberships
- **Auth Sessions**: Temporary sessions for authentication flows
- **Memberships**: User subscriptions to applications with tier levels

## Authentication Flow

### Phase 1: Authentication Initiation

**Endpoint**: `POST /api/auth/initiate`

**Data Flow**:
```
Client App → Auth Service API → Database
```

**Request Data**:
```json
{
  "applicationId": "string",
  "redirectUrl": "string",
  "userEmail": "string (optional)",
  "state": "object (optional)",
  "expiresInMinutes": "number (default: 30)"
}
```

**Process**:
1. **Validation**: Verify application exists and is active
2. **Session Creation**: Generate unique session token
3. **Database Storage**: Store session data in `auth_sessions` table
4. **URL Generation**: Create authentication URL with session token

**Response Data**:
```json
{
  "success": true,
  "sessionToken": "string",
  "authUrl": "string",
  "expiresAt": "ISO string"
}
```

### Phase 2: User Authentication

**Endpoint**: `/auth/login` (Page Route)

**Data Flow**:
```
User → Login Form → Auth Context → Supabase Auth → Database
```

**Process**:
1. **User Input**: Email and password collection
2. **Supabase Authentication**: Sign in with Supabase Auth
3. **Profile Creation**: Create/update user profile if needed
4. **Session Management**: Update React context with user data

**Data Stored**:
- User credentials in Supabase Auth
- User profile in `user_profiles` table
- Session data in browser/client

### Phase 3: Authentication Completion

**Endpoint**: `POST /api/auth/complete`

**Data Flow**:
```
Auth Service → Database → Client App
```

**Request Data**:
```json
{
  "sessionToken": "string",
  "userId": "string"
}
```

**Process**:
1. **Session Retrieval**: Fetch session data using token
2. **User Verification**: Confirm user is authenticated
3. **Membership Lookup**: Get user's memberships for the application
4. **Session Completion**: Mark session as completed
5. **Redirect Preparation**: Prepare final redirect with state

**Response Data**:
```json
{
  "success": true,
  "redirectUrl": "string",
  "state": "object",
  "applicationId": "string",
  "userMemberships": "array"
}
```

### Phase 4: Authorization Verification

**Endpoint**: `POST /api/auth/verify`

**Data Flow**:
```
Client App → Auth Service API → Database → Client App
```

**Request Data**:
```json
{
  "application_id": "string",
  "user_token": "string (optional)",
  "required_tier_level": "number (optional)"
}
```

**Process**:
1. **Application Validation**: Verify application exists and is active
2. **Token Verification**: Decode and validate user token
3. **Profile Retrieval**: Get user profile information
4. **Membership Check**: Verify user has active membership
5. **Tier Validation**: Check if user meets required tier level
6. **Response Assembly**: Build authorization response

**Response Data**:
```json
{
  "authorized": "boolean",
  "user": {
    "id": "string",
    "email": "string",
    "profile": {
      "full_name": "string",
      "avatar_url": "string"
    }
  },
  "application": {
    "id": "string",
    "name": "string"
  },
  "membership": {
    "id": "string",
    "status": "string",
    "tier": {
      "id": "string",
      "name": "string",
      "tier_level": "number",
      "features": "object"
    },
    "started_at": "string",
    "ends_at": "string"
  },
  "userMemberships": "array"
}
```

## Data Storage Schema

### Core Tables

**applications**
- `id`: UUID (Primary Key)
- `name`: Application name
- `slug`: URL-friendly identifier
- `description`: Application description
- `status`: 'development' | 'active' | 'inactive'
- `api_keys`: Public and secret keys
- `configuration`: Auth settings, CORS origins, webhooks

**user_profiles**
- `id`: UUID (Foreign Key to auth.users)
- `email`: User email
- `full_name`: User's full name
- `avatar_url`: Profile picture URL
- `metadata`: Additional user data

**auth_sessions**
- `id`: UUID (Primary Key)
- `session_token`: Unique token for session
- `application_id`: Reference to application
- `redirect_url`: Where to redirect after auth
- `user_email`: Optional pre-filled email
- `session_state`: State data to preserve
- `status`: 'pending' | 'completed' | 'expired'
- `expires_at`: Session expiration timestamp

**user_memberships**
- `id`: UUID (Primary Key)
- `user_id`: Reference to user
- `application_id`: Reference to application
- `membership_tier_id`: Reference to tier
- `status`: 'active' | 'inactive' | 'cancelled'
- `started_at`: Membership start date
- `ends_at`: Membership end date

**membership_tiers**
- `id`: UUID (Primary Key)
- `application_id`: Reference to application
- `name`: Tier name (e.g., "Free", "Pro", "Enterprise")
- `tier_level`: Numeric level for comparison
- `features`: JSON object with tier features

## Security Considerations

### Data Protection
- **Row Level Security (RLS)**: All database queries filtered by application context
- **Token Validation**: JWT tokens validated on each request
- **Session Expiration**: Automatic cleanup of expired sessions
- **Input Sanitization**: All user inputs validated and sanitized

### Access Control
- **Application Isolation**: Users can only access data for their applications
- **Tier-Based Access**: Features restricted based on membership level
- **Admin Permissions**: Separate admin role for system management

## Error Handling Flow

### Common Error Scenarios
1. **Invalid Application**: Application not found or inactive
2. **Expired Session**: Session token has expired
3. **Invalid Token**: User token is malformed or invalid
4. **Insufficient Tier**: User doesn't have required membership level
5. **Redirect URL Mismatch**: Redirect URL not allowed for application

### Error Response Format
```json
{
  "error": "Error message",
  "authorized": false,
  "details": "Additional error information"
}
```

## Client Integration Flow

### Using Auth Client Library

```typescript
import { createAuthClient } from '@mrbrooks/auth-client'

const authClient = createAuthClient('https://auth.mrbrooks.com', 'app-id')

// Initiate authentication
const { sessionToken, authUrl } = await authClient.initiateAuth({
  redirectUrl: 'https://myapp.com/callback',
  state: { returnPath: '/dashboard' }
})

// Redirect user to auth URL
window.location.href = authUrl

// In callback handler
const result = await authClient.verifyUser(userToken)
if (result.authorized) {
  // User is authenticated
  console.log('User:', result.user)
  console.log('Membership:', result.membership)
}
```

### Manual Integration

```typescript
// 1. Initiate auth
const response = await fetch('/api/auth/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    applicationId: 'app-id',
    redirectUrl: 'https://myapp.com/callback'
  })
})

// 2. Redirect to auth URL
const { authUrl } = await response.json()
window.location.href = authUrl

// 3. Verify user (after callback)
const verifyResponse = await fetch('/api/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    application_id: 'app-id',
    user_token: 'jwt-token'
  })
})
```

## Monitoring and Logging

### Key Metrics
- Authentication success/failure rates
- Session creation and completion times
- User membership distribution
- API endpoint usage patterns

### Audit Trail
- All authentication attempts logged
- Session lifecycle events tracked
- Admin actions recorded
- Security events monitored

This data flow ensures secure, scalable authentication while maintaining clear separation between applications and providing comprehensive user management capabilities.