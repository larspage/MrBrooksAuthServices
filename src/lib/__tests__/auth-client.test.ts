import { MrBrooksAuthClient, createAuthClient, createAuthMiddleware } from '../auth-client'

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