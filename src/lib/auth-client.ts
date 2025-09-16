/**
 * MrBrooks Auth Service Client Library
 * 
 * This library provides utilities for applications to integrate with
 * the MrBrooks Auth Service for authentication and authorization.
 */

export interface AuthUser {
  id: string
  email: string
  profile: {
    full_name: string | null
    avatar_url: string | null
  }
}

export interface MembershipTier {
  id: string
  name: string
  tier_level: number
  features: any
}

export interface UserMembership {
  id: string
  status: string
  tier: MembershipTier | null
  started_at: string | null
  ends_at: string | null
}

export interface AuthVerificationResponse {
  authorized: boolean
  user?: AuthUser
  application: {
    id: string
    name: string
  }
  membership?: UserMembership | null
  error?: string
}

export class MrBrooksAuthClient {
  private baseUrl: string
  private applicationId: string

  constructor(baseUrl: string, applicationId: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.applicationId = applicationId
  }

  /**
   * Verify user authentication and authorization for this application
   */
  async verifyUser(userToken?: string, requiredTierLevel?: number): Promise<AuthVerificationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: this.applicationId,
          user_token: userToken,
          required_tier_level: requiredTierLevel
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        return {
          authorized: false,
          application: data.application || { id: this.applicationId, name: 'Unknown' },
          error: data.error || 'Verification failed'
        }
      }

      return data
    } catch (error) {
      return {
        authorized: false,
        application: { id: this.applicationId, name: 'Unknown' },
        error: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  /**
   * Check if user has a specific tier level or higher
   */
  async hasMinimumTier(userToken: string, minimumTierLevel: number): Promise<boolean> {
    const result = await this.verifyUser(userToken, minimumTierLevel)
    return result.authorized
  }

  /**
   * Get user's membership details for this application
   */
  async getUserMembership(userToken: string): Promise<UserMembership | null> {
    const result = await this.verifyUser(userToken)
    return result.membership || null
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<{ status: string; version: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/verify`)
      const data = await response.json()
      return {
        status: data.status || 'unknown',
        version: data.version || '1.0.0',
        timestamp: data.timestamp || new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'error',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    }
  }
}

/**
 * Express.js middleware for protecting routes
 */
export function createAuthMiddleware(authClient: MrBrooksAuthClient, requiredTierLevel?: number) {
  return async (req: any, res: any, next: any) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

      if (!token) {
        return res.status(401).json({ error: 'Authorization token required' })
      }

      // Verify user
      const result = await authClient.verifyUser(token, requiredTierLevel)

      if (!result.authorized) {
        return res.status(403).json({ 
          error: result.error || 'Access denied',
          required_tier_level: requiredTierLevel
        })
      }

      // Add user info to request
      req.user = result.user
      req.membership = result.membership
      req.application = result.application

      next()
    } catch (error) {
      console.error('Auth middleware error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

/**
 * React hook for authentication (example implementation)
 */
export function createUseAuth(authClient: MrBrooksAuthClient) {
  return function useAuth() {
    // This would be implemented with React state management
    // For now, providing the structure
    return {
      user: null,
      membership: null,
      loading: false,
      error: null,
      verifyUser: authClient.verifyUser.bind(authClient),
      hasMinimumTier: authClient.hasMinimumTier.bind(authClient),
      getUserMembership: authClient.getUserMembership.bind(authClient)
    }
  }
}

// Export default factory function
export function createAuthClient(baseUrl: string, applicationId: string): MrBrooksAuthClient {
  return new MrBrooksAuthClient(baseUrl, applicationId)
}