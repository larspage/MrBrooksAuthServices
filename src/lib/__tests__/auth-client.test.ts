import { MrBrooksAuthClient, createAuthClient, createAuthMiddleware, createUseAuth } from '../auth-client'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('MrBrooksAuthClient', () => {
  let client: MrBrooksAuthClient

  beforeEach(() => {
    jest.clearAllMocks()
    client = new MrBrooksAuthClient('https://api.example.com', 'app-123')
  })

  describe('constructor', () => {
    it('should initialize with correct base URL and application ID', () => {
      expect(client['baseUrl']).toBe('https://api.example.com')
      expect(client['applicationId']).toBe('app-123')
    })

    it('should remove trailing slash from base URL', () => {
      const clientWithSlash = new MrBrooksAuthClient('https://api.example.com/', 'app-123')
      expect(clientWithSlash['baseUrl']).toBe('https://api.example.com')
    })
  })

  describe('verifyUser', () => {
    it('should make correct API call for user verification', async () => {
      const mockResponse = {
        authorized: true,
        user: { id: 'user-123', email: 'test@example.com', profile: { full_name: 'Test User', avatar_url: null } },
        application: { id: 'app-123', name: 'Test App' },
        membership: { id: 'membership-123', status: 'active', tier: null, started_at: null, ends_at: null }
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      })

      const result = await client.verifyUser('user-token-123', 2)

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: 'app-123',
          user_token: 'user-token-123',
          required_tier_level: 2
        })
      })

      expect(result).toEqual(mockResponse)
    })

    it('should handle API error responses', async () => {
      const mockErrorResponse = {
        error: 'Invalid token',
        authorized: false,
        application: { id: 'app-123', name: 'Test App' }
      }

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue(mockErrorResponse)
      })

      const result = await client.verifyUser('invalid-token')

      expect(result).toEqual({
        authorized: false,
        application: { id: 'app-123', name: 'Test App' },
        error: 'Invalid token'
      })
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await client.verifyUser('user-token-123')

      expect(result).toEqual({
        authorized: false,
        application: { id: 'app-123', name: 'Unknown' },
        error: 'Network error'
      })
    })

    it('should work without user token', async () => {
      const mockResponse = {
        authorized: false,
        application: { id: 'app-123', name: 'Test App' }
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      })

      const result = await client.verifyUser()

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: 'app-123',
          user_token: undefined,
          required_tier_level: undefined
        })
      })

      expect(result).toEqual(mockResponse)
    })
  })

  describe('hasMinimumTier', () => {
    it('should return true when user has sufficient tier level', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ authorized: true })
      })

      const result = await client.hasMinimumTier('user-token-123', 2)

      expect(result).toBe(true)
    })

    it('should return false when user does not have sufficient tier level', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ authorized: false })
      })

      const result = await client.hasMinimumTier('user-token-123', 2)

      expect(result).toBe(false)
    })
  })

  describe('getUserMembership', () => {
    it('should return user membership when available', async () => {
      const mockMembership = {
        id: 'membership-123',
        status: 'active',
        tier: { id: 'tier-123', name: 'Premium', tier_level: 2, features: [] },
        started_at: '2023-01-01',
        ends_at: '2024-01-01'
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          authorized: true,
          membership: mockMembership
        })
      })

      const result = await client.getUserMembership('user-token-123')

      expect(result).toEqual(mockMembership)
    })

    it('should return null when no membership exists', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          authorized: false,
          membership: null
        })
      })

      const result = await client.getUserMembership('user-token-123')

      expect(result).toBeNull()
    })
  })

  describe('healthCheck', () => {
    it('should return service health information', async () => {
      const mockHealthResponse = {
        service: 'MrBrooks Auth Service',
        status: 'operational',
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z'
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockHealthResponse)
      })

      const result = await client.healthCheck()

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/auth/verify')
      expect(result).toEqual({
        status: 'operational',
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z'
      })
    })

    it('should handle health check errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await client.healthCheck()

      expect(result.status).toBe('error')
      expect(result.version).toBe('1.0.0')
      expect(result.timestamp).toBeDefined()
    })
  })
})

describe('createAuthClient', () => {
  it('should create a new MrBrooksAuthClient instance', () => {
    const client = createAuthClient('https://api.example.com', 'app-123')
    
    expect(client).toBeInstanceOf(MrBrooksAuthClient)
    expect(client['baseUrl']).toBe('https://api.example.com')
    expect(client['applicationId']).toBe('app-123')
  })
})

describe('createAuthMiddleware', () => {
  let mockClient: jest.Mocked<MrBrooksAuthClient>
  let mockReq: any
  let mockRes: any
  let mockNext: jest.Mock

  beforeEach(() => {
    mockClient = {
      verifyUser: jest.fn()
    } as any

    mockReq = {
      headers: {}
    }

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    mockNext = jest.fn()
  })

  it('should call next() when user is authorized', async () => {
    mockReq.headers.authorization = 'Bearer valid-token'
    
    mockClient.verifyUser.mockResolvedValue({
      authorized: true,
      user: { id: 'user-123', email: 'test@example.com', profile: { full_name: 'Test User', avatar_url: null } },
      application: { id: 'app-123', name: 'Test App' },
      membership: null
    })

    const middleware = createAuthMiddleware(mockClient)
    await middleware(mockReq, mockRes, mockNext)

    expect(mockClient.verifyUser).toHaveBeenCalledWith('valid-token', undefined)
    expect(mockReq.user).toBeDefined()
    expect(mockReq.membership).toBeDefined()
    expect(mockReq.application).toBeDefined()
    expect(mockNext).toHaveBeenCalled()
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  it('should return 401 when no authorization header is provided', async () => {
    const middleware = createAuthMiddleware(mockClient)
    await middleware(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authorization token required' })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 401 when authorization header is malformed', async () => {
    mockReq.headers.authorization = 'InvalidFormat'
    
    const middleware = createAuthMiddleware(mockClient)
    await middleware(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authorization token required' })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 403 when user is not authorized', async () => {
    mockReq.headers.authorization = 'Bearer invalid-token'
    
    mockClient.verifyUser.mockResolvedValue({
      authorized: false,
      application: { id: 'app-123', name: 'Test App' },
      error: 'Invalid token'
    })

    const middleware = createAuthMiddleware(mockClient, 2)
    await middleware(mockReq, mockRes, mockNext)

    expect(mockClient.verifyUser).toHaveBeenCalledWith('invalid-token', 2)
    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid token',
      required_tier_level: 2
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 500 when verification throws an error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    mockReq.headers.authorization = 'Bearer valid-token'
    
    mockClient.verifyUser.mockRejectedValue(new Error('Verification error'))

    const middleware = createAuthMiddleware(mockClient)
    await middleware(mockReq, mockRes, mockNext)

    expect(consoleSpy).toHaveBeenCalledWith('Auth middleware error:', expect.any(Error))
    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' })
    expect(mockNext).not.toHaveBeenCalled()
    
    consoleSpy.mockRestore()
  })

  it('should work with required tier level', async () => {
    mockReq.headers.authorization = 'Bearer valid-token'
    
    mockClient.verifyUser.mockResolvedValue({
      authorized: true,
      user: { id: 'user-123', email: 'test@example.com', profile: { full_name: 'Test User', avatar_url: null } },
      application: { id: 'app-123', name: 'Test App' },
      membership: {
        id: 'membership-123',
        status: 'active',
        tier: { id: 'tier-123', name: 'Premium', tier_level: 3, features: [] },
        started_at: '2023-01-01',
        ends_at: '2024-01-01'
      }
    })

    const middleware = createAuthMiddleware(mockClient, 2)
    await middleware(mockReq, mockRes, mockNext)

    expect(mockClient.verifyUser).toHaveBeenCalledWith('valid-token', 2)
    expect(mockNext).toHaveBeenCalled()
  })
})

describe('Additional Edge Cases and Negative Testing', () => {
  let client: MrBrooksAuthClient

  beforeEach(() => {
    jest.clearAllMocks()
    client = new MrBrooksAuthClient('https://api.example.com', 'app-123')
  })

  describe('Constructor Edge Cases', () => {
    it('should handle empty string parameters', () => {
      const clientWithEmpty = new MrBrooksAuthClient('', '')
      expect(clientWithEmpty['baseUrl']).toBe('')
      expect(clientWithEmpty['applicationId']).toBe('')
    })

    it('should handle URLs with multiple trailing slashes', () => {
      const clientWithSlashes = new MrBrooksAuthClient('https://api.example.com///', 'app-123')
      expect(clientWithSlashes['baseUrl']).toBe('https://api.example.com//')
    })

    it('should handle special characters in application ID', () => {
      const specialClient = new MrBrooksAuthClient('https://api.example.com', 'app-123!@#$%^&*()')
      expect(specialClient['applicationId']).toBe('app-123!@#$%^&*()')
    })
  })

  describe('verifyUser Edge Cases', () => {
    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      })

      const result = await client.verifyUser('user-token-123')

      expect(result).toEqual({
        authorized: false,
        application: { id: 'app-123', name: 'Unknown' },
        error: 'Invalid JSON'
      })
    })

    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(null)
      })

      const result = await client.verifyUser('user-token-123')

      expect(result).toBeNull()
    })

    it('should handle response with missing application data', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({
          error: 'Application not found'
        })
      })

      const result = await client.verifyUser('user-token-123')

      expect(result).toEqual({
        authorized: false,
        application: { id: 'app-123', name: 'Unknown' },
        error: 'Application not found'
      })
    })

    it('should handle very long user tokens', async () => {
      const longToken = 'a'.repeat(10000)
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          authorized: true,
          application: { id: 'app-123', name: 'Test App' }
        })
      })

      const result = await client.verifyUser(longToken)

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: 'app-123',
          user_token: longToken,
          required_tier_level: undefined
        })
      })
    })

    it('should handle negative tier levels', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          authorized: false,
          application: { id: 'app-123', name: 'Test App' }
        })
      })

      const result = await client.verifyUser('user-token-123', -1)

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: 'app-123',
          user_token: 'user-token-123',
          required_tier_level: -1
        })
      })
    })

    it('should handle extremely high tier levels', async () => {
      const result = await client.verifyUser('user-token-123', Number.MAX_SAFE_INTEGER)

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: 'app-123',
          user_token: 'user-token-123',
          required_tier_level: Number.MAX_SAFE_INTEGER
        })
      })
    })

    it('should handle fetch timeout errors', async () => {
      mockFetch.mockRejectedValue(new Error('Request timeout'))

      const result = await client.verifyUser('user-token-123')

      expect(result).toEqual({
        authorized: false,
        application: { id: 'app-123', name: 'Unknown' },
        error: 'Request timeout'
      })
    })

    it('should handle non-Error exceptions', async () => {
      mockFetch.mockRejectedValue('String error')

      const result = await client.verifyUser('user-token-123')

      expect(result).toEqual({
        authorized: false,
        application: { id: 'app-123', name: 'Unknown' },
        error: 'Network error'
      })
    })
  })

  describe('hasMinimumTier Edge Cases', () => {
    it('should handle empty token string', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({ authorized: false, error: 'Invalid token' })
      })

      const result = await client.hasMinimumTier('', 2)

      expect(result).toBe(false)
    })

    it('should handle zero tier level requirement', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ authorized: true })
      })

      const result = await client.hasMinimumTier('user-token-123', 0)

      expect(result).toBe(true)
    })

    it('should handle network error in tier check', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await client.hasMinimumTier('user-token-123', 2)

      expect(result).toBe(false)
    })
  })

  describe('getUserMembership Edge Cases', () => {
    it('should handle undefined membership field', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          authorized: true
          // membership field is undefined
        })
      })

      const result = await client.getUserMembership('user-token-123')

      expect(result).toBeNull()
    })

    it('should handle membership with null tier', async () => {
      const mockMembership = {
        id: 'membership-123',
        status: 'active',
        tier: null,
        started_at: '2023-01-01',
        ends_at: null
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          authorized: true,
          membership: mockMembership
        })
      })

      const result = await client.getUserMembership('user-token-123')

      expect(result).toEqual(mockMembership)
    })

    it('should handle API error during membership retrieval', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({
          error: 'Internal server error'
        })
      })

      const result = await client.getUserMembership('user-token-123')

      expect(result).toBeNull()
    })
  })

  describe('healthCheck Edge Cases', () => {
    it('should handle partial health response', async () => {
      const partialResponse = {
        status: 'operational'
        // missing version and timestamp
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(partialResponse)
      })

      const result = await client.healthCheck()

      expect(result).toEqual({
        status: 'operational',
        version: '1.0.0',
        timestamp: expect.any(String)
      })
    })

    it('should handle completely empty health response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      })

      const result = await client.healthCheck()

      expect(result).toEqual({
        status: 'unknown',
        version: '1.0.0',
        timestamp: expect.any(String)
      })
    })

    it('should handle health check with non-200 status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: jest.fn().mockResolvedValue({
          status: 'maintenance',
          version: '1.0.0'
        })
      })

      const result = await client.healthCheck()

      expect(result).toEqual({
        status: 'maintenance',
        version: '1.0.0',
        timestamp: expect.any(String)
      })
    })
  })
})

describe('createAuthMiddleware Edge Cases', () => {
  let mockClient: jest.Mocked<MrBrooksAuthClient>
  let mockReq: any
  let mockRes: any
  let mockNext: jest.Mock

  beforeEach(() => {
    mockClient = {
      verifyUser: jest.fn()
    } as any

    mockReq = {
      headers: {}
    }

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    mockNext = jest.fn()
  })

  it('should handle authorization header with only "Bearer"', async () => {
    mockReq.headers.authorization = 'Bearer'
    
    const middleware = createAuthMiddleware(mockClient)
    await middleware(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authorization token required' })
  })

  it('should handle authorization header with extra spaces', async () => {
    mockReq.headers.authorization = 'Bearer   valid-token   '
    
    mockClient.verifyUser.mockResolvedValue({
      authorized: true,
      user: { id: 'user-123', email: 'test@example.com', profile: { full_name: 'Test User', avatar_url: null } },
      application: { id: 'app-123', name: 'Test App' },
      membership: null
    })

    const middleware = createAuthMiddleware(mockClient)
    await middleware(mockReq, mockRes, mockNext)

    // The middleware extracts everything after "Bearer " including spaces
    expect(mockClient.verifyUser).toHaveBeenCalledWith('  valid-token   ', undefined)
    expect(mockNext).toHaveBeenCalled()
  })

  it('should handle case-insensitive Bearer token', async () => {
    mockReq.headers.authorization = 'bearer valid-token'
    
    const middleware = createAuthMiddleware(mockClient)
    await middleware(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authorization token required' })
  })

  it('should handle authorization header with different case', async () => {
    mockReq.headers.Authorization = 'Bearer valid-token'
    
    const middleware = createAuthMiddleware(mockClient)
    await middleware(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authorization token required' })
  })

  it('should handle verification response without error message', async () => {
    mockReq.headers.authorization = 'Bearer invalid-token'
    
    mockClient.verifyUser.mockResolvedValue({
      authorized: false,
      application: { id: 'app-123', name: 'Test App' }
      // no error field
    })

    const middleware = createAuthMiddleware(mockClient)
    await middleware(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Access denied',
      required_tier_level: undefined
    })
  })

  it('should handle middleware with zero tier requirement', async () => {
    mockReq.headers.authorization = 'Bearer valid-token'
    
    mockClient.verifyUser.mockResolvedValue({
      authorized: true,
      user: { id: 'user-123', email: 'test@example.com', profile: { full_name: 'Test User', avatar_url: null } },
      application: { id: 'app-123', name: 'Test App' },
      membership: null
    })

    const middleware = createAuthMiddleware(mockClient, 0)
    await middleware(mockReq, mockRes, mockNext)

    expect(mockClient.verifyUser).toHaveBeenCalledWith('valid-token', 0)
    expect(mockNext).toHaveBeenCalled()
  })

  it('should handle verification throwing non-Error exception', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    mockReq.headers.authorization = 'Bearer valid-token'
    
    mockClient.verifyUser.mockRejectedValue('String error')

    const middleware = createAuthMiddleware(mockClient)
    await middleware(mockReq, mockRes, mockNext)

    expect(consoleSpy).toHaveBeenCalledWith('Auth middleware error:', 'String error')
    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' })
    
    consoleSpy.mockRestore()
  })
})

describe('createUseAuth Hook', () => {
  it('should return hook function with correct structure', () => {
    const client = new MrBrooksAuthClient('https://api.example.com', 'app-123')
    const useAuth = createUseAuth(client)
    
    expect(typeof useAuth).toBe('function')
    
    const hookResult = useAuth()
    
    expect(hookResult).toEqual({
      user: null,
      membership: null,
      loading: false,
      error: null,
      verifyUser: expect.any(Function),
      hasMinimumTier: expect.any(Function),
      getUserMembership: expect.any(Function)
    })
  })

  it('should bind client methods correctly', () => {
    const client = new MrBrooksAuthClient('https://api.example.com', 'app-123')
    const useAuth = createUseAuth(client)
    const hookResult = useAuth()
    
    // Test that the methods are bound functions by checking their behavior
    expect(typeof hookResult.verifyUser).toBe('function')
    expect(typeof hookResult.hasMinimumTier).toBe('function')
    expect(typeof hookResult.getUserMembership).toBe('function')
    
    // Test that the bound functions have the correct context
    expect(hookResult.verifyUser.name).toBe('bound verifyUser')
    expect(hookResult.hasMinimumTier.name).toBe('bound hasMinimumTier')
    expect(hookResult.getUserMembership.name).toBe('bound getUserMembership')
  })
})