import { NextRequest } from 'next/server'
import { POST, OPTIONS } from '../route'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
jest.mock('@supabase/supabase-js')
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('/api/auth/initiate', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      rpc: jest.fn()
    }
    mockCreateClient.mockReturnValue(mockSupabase)
    
    // Mock environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('OPTIONS', () => {
    it('should handle CORS preflight requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/initiate', {
        method: 'OPTIONS'
      })

      const response = await OPTIONS(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    })
  })

  describe('POST', () => {
    it('should successfully create auth session with valid parameters', async () => {
      const mockSessionToken = 'test-session-token-123'
      mockSupabase.rpc.mockResolvedValue({
        data: mockSessionToken,
        error: null
      })

      const requestBody = {
        applicationId: '550e8400-e29b-41d4-a716-446655440000',
        redirectUrl: 'http://localhost:3000/callback',
        userEmail: 'test@example.com',
        state: { returnTo: '/dashboard' },
        expiresInMinutes: 30
      }

      const request = new NextRequest('http://localhost:3000/api/auth/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Test Browser',
          'X-Forwarded-For': '192.168.1.1'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.sessionToken).toBe(mockSessionToken)
      expect(responseData.authUrl).toContain('/auth/login?session=')
      expect(responseData.expiresAt).toBeDefined()

      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_auth_session_enhanced', {
        app_id: requestBody.applicationId,
        redirect_url: requestBody.redirectUrl,
        user_email: requestBody.userEmail,
        session_state: requestBody.state,
        expires_in_minutes: requestBody.expiresInMinutes,
        user_agent: 'Test Browser',
        ip_address: '192.168.1.1'
      })
    })

    it('should return 400 for missing required parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: '550e8400-e29b-41d4-a716-446655440000'
          // Missing redirectUrl
        })
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Missing required parameters: applicationId and redirectUrl')
    })

    it('should handle redirect validation errors with detailed response', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Invalid redirect URL for application. Check audit_logs table for detailed instructions on how to configure allowed redirect URLs.'))

      const requestBody = {
        applicationId: '550e8400-e29b-41d4-a716-446655440000',
        redirectUrl: 'https://evil.com/callback'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid redirect URL for application')
      expect(responseData.details).toContain('not allowed for this application')
    })

    it('should handle database errors', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Database connection failed'))

      const requestBody = {
        applicationId: '550e8400-e29b-41d4-a716-446655440000',
        redirectUrl: 'http://localhost:3000/callback'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })

    it('should warn about long redirect URLs', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const mockSessionToken = 'test-session-token-123'
      mockSupabase.rpc.mockResolvedValue({
        data: mockSessionToken,
        error: null
      })

      const longUrl = 'http://localhost:3000/callback?' + 'x'.repeat(2100)
      const requestBody = {
        applicationId: '550e8400-e29b-41d4-a716-446655440000',
        redirectUrl: longUrl
      }

      const request = new NextRequest('http://localhost:3000/api/auth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      await POST(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: Incoming redirectUrl exceeds 2048 characters')
      )

      consoleSpy.mockRestore()
    })

    it('should use default values for optional parameters', async () => {
      const mockSessionToken = 'test-session-token-123'
      mockSupabase.rpc.mockResolvedValue({
        data: mockSessionToken,
        error: null
      })

      const requestBody = {
        applicationId: '550e8400-e29b-41d4-a716-446655440000',
        redirectUrl: 'http://localhost:3000/callback'
        // No optional parameters
      }

      const request = new NextRequest('http://localhost:3000/api/auth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      await POST(request)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_auth_session_enhanced', {
        app_id: requestBody.applicationId,
        redirect_url: requestBody.redirectUrl,
        user_email: null,
        session_state: null,
        expires_in_minutes: 30,
        user_agent: undefined,
        ip_address: undefined
      })
    })

    it('should extract IP address from various headers', async () => {
      const mockSessionToken = 'test-session-token-123'
      mockSupabase.rpc.mockResolvedValue({
        data: mockSessionToken,
        error: null
      })

      const requestBody = {
        applicationId: '550e8400-e29b-41d4-a716-446655440000',
        redirectUrl: 'http://localhost:3000/callback'
      }

      // Test X-Real-IP header
      const request = new NextRequest('http://localhost:3000/api/auth/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Real-IP': '10.0.0.1'
        },
        body: JSON.stringify(requestBody)
      })

      await POST(request)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_auth_session_enhanced', 
        expect.objectContaining({
          ip_address: '10.0.0.1'
        })
      )
    })
  })
})