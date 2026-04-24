# MrBrooksAuthServices Integration Guide

> Multi-tenant authentication service for Mr Brooks LLC SaaS applications

---

## Quick Start

### 1. Configure Allowed Origins

In your auth service's `.env.local`:
```bash
ALLOWED_ORIGINS=https://your-website.com,https://app.your-website.com
```

### 2. Add the Auth SDK to Your Website

```bash
npm install @mrbrooks/auth-client
```

### 3. Initialize the Client

```typescript
import { MrBrooksAuthClient } from '@mrbrooks/auth-client'

const auth = new MrBrooksAuthClient({
  baseUrl: 'https://your-auth-service.com',
  applicationId: 'YOUR-APPLICATION-UUID'
})
```

### 4. Use in Your App

```typescript
// Initiate login
const { authUrl } = await auth.initiateAuth({
  redirectUrl: 'https://your-app.com/callback'
})

// Redirect user to authUrl
window.location.href = authUrl

// Handle callback (on your /callback page)
const result = await auth.completeAuth(sessionToken)

// Verify user access
const { authorized } = await auth.verifyUser(userToken, {
  requiredTierLevel: 1  // optional
})
```

---

## API Reference

### `MrBrooksAuthClient`

#### Constructor

```typescript
new MrBrooksAuthClient(config: {
  baseUrl: string      // Your auth service URL
  applicationId: string // UUID from auth service admin
})
```

#### Methods

##### `initiateAuth(params)`

Starts an authentication flow.

```typescript
const { sessionToken, authUrl } = await auth.initiateAuth({
  redirectUrl: 'https://your-app.com/callback',
  userEmail?: 'user@example.com',  // optional pre-fill
  expiresInMinutes?: 30
})
```

Returns:
```typescript
{
  sessionToken: string,  // Server-generated token
  authUrl: string       // Redirect user here
}
```

##### `completeAuth(sessionToken)`

Completes auth after redirect.

```typescript
const { user, membership, userMemberships } = await auth.completeAuth(
  sessionToken  // From URL query param
)
```

Returns:
```typescript
{
  user: {
    id: string,
    email: string,
    profile: { full_name: string, avatar_url: string }
  },
  membership: {
    id: string,
    status: 'active' | 'inactive',
    tier: { name: string, tier_level: number },
    ends_at: string
  },
  userMemberships: Membership[]  // All user's memberships
}
```

##### `verifyUser(userToken, options?)`

Verify a user's access without starting a full auth flow.

```typescript
const { authorized, user, membership } = await auth.verifyUser(userToken, {
  requiredTierLevel: 2  // optional - check tier
})
```

Returns:
```typescript
{
  authorized: boolean,
  user?: { id: string, email: string },
  membership?: { status: string, tier: { tier_level: number } }
}
```

---

## Environment Variables

### Auth Service (Server)

| Variable | Required | Description |
|----------|----------|-------------|
| `ALLOWED_ORIGINS` | Yes | Comma-separated allowed domains |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret for payments |
| `NEXTAUTH_SECRET` | Yes | Generate with `openssl rand -base64 32` |
| `NODE_ENV` | Yes | Set to `production` in prod |

### Client Website

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_AUTH_URL` | Yes | Your auth service URL |

---

## Security

### Allowed Origins

The auth service blocks ALL requests from origins not in `ALLOWED_ORIGINS`. Add all websites that will use this auth service.

### Rate Limiting

- 100 requests per 60 seconds per IP
- Configurable via `RATE_LIMIT_REQUESTS` and `RATE_LIMIT_WINDOW_SECONDS`

### Input Validation

All inputs are validated with Zod schemas to prevent SQL injection and other attacks.

---

## Membership Tiers

The auth service supports membership tiers for access control:

| Tier Level | Name | Typical Use |
|------------|------|-------------|
| 0 | Free | Basic access |
| 1 | Pro | Standard features |
| 2 | Premium | Full access |
| 3 | Enterprise | Custom features |

Use `requiredTierLevel` in `verifyUser()` to restrict access.

---

## Stripe Integration

The auth service integrates with Stripe for subscriptions:

1. Create products/tiers in Stripe dashboard
2. Configure in auth service admin panel
3. Users purchase through Stripe checkout
4. Memberships sync automatically via Stripe webhooks

---

## Troubleshooting

### CORS Errors

If you see CORS errors:
1. Check `ALLOWED_ORIGINS` includes your website's domain
2. Ensure you're using HTTPS in production

### Invalid Redirect URL

The redirect URL must be:
- From an allowed origin
- Valid HTTP/HTTPS URL
- Under 2048 characters

### Session Expired

Sessions expire after the configured duration. Re-initiate auth flow.

---

## Support

- Email: mrbrooksprod@gmail.com
- GitHub: https://github.com/larspage/MrBrooksAuthServices
