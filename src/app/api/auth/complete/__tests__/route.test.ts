import { NextRequest } from 'next/server'
import { POST } from '../route'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
jest.mock('@supabase/supabase-js')
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('/api/auth/complete', () => {
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

  describe('POST', () => {
    it('should successfully complete auth session with membership information', async () => {
      const mockSessionData = {
        application_id: '550e8400-e29b-41d4-a716-446655440000',
        redirect_url: 'http://localhost:3000/callback',
        state: { returnTo: '/dashboard' },
        user_memberships: [
          {
            application_id: '550e8400-e29b-41d4-a716-446655440000',
            application_name: 'Test App',
            application_slug: 'test-app',
            membership: {
              id: 'membership-123',
              status: 'active',
              tier: {
                id: 'tier-123',
                name: 'Premium',
                level: 2,
                features: ['feature1', 'feature2']
              },
              started_at: '2024-01-01T00:00:00Z',
              ends_at: '2024-12-31T23:59:59Z',
              renewal_date: '2024-12-01T00:00:00Z',
              pricing: {
                monthly_cents: 999,
                yearly_cents: 9999,
                currency: 'usd'
              }
            }
          }
        ]
      }

      mockSupabase.rpc.mockResolvedValue({
        data: [mockSessionData],
        error: null
      })

      const requestBody = {
        sessionToken: 'test-session-token-123',
        userId: 'user-456'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.redirectUrl).toBe(mockSessionData.redirect_url)
      expect(responseData.state).toEqual(mockSessionData.state)
      expect(responseData.applicationId).toBe(mockSessionData.application_id)
      expect(responseData.userMemberships).toEqual(mockSessionData.user_memberships)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_auth_session_enhanced', {
        session_token: requestBody.sessionToken,
        authenticated_user_id: requestBody.userId
      })
    })

    it('should return 400 for missing required parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: 'test-session-token-123'
          // Missing userId
        })
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Missing required parameters: sessionToken and userId')
    })

    it('should return 400 for invalid or expired session token', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      })

      const requestBody = {
        sessionToken: 'invalid-token',
        userId: 'user-456'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid or expired session token')
    })

    it('should handle database errors', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Database connection failed'))

      const requestBody = {
        sessionToken: 'test-session-token-123',
        userId: 'user-456'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })

    it('should handle empty user memberships', async () => {
      const mockSessionData = {
        application_id: '550e8400-e29b-41d4-a716-446655440000',
        redirect_url: 'http://localhost:3000/callback',
        state: null,
        user_memberships: []
      }

      mockSupabase.rpc.mockResolvedValue({
        data: [mockSessionData],
        error: null
      })

      const requestBody = {
        sessionToken: 'test-session-token-123',
        userId: 'user-456'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.userMemberships).toEqual([])
    })

    it('should warn about long redirect URLs', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      const longUrl = 'http://localhost:3000/callback?' + 'x'.repeat(2100)
      const mockSessionData = {
        application_id: '550e8400-e29b-41d4-a716-446655440000',
        redirect_url: longUrl,
        state: null,
        user_memberships: []
      }

      mockSupabase.rpc.mockResolvedValue({
        data: [mockSessionData],
        error: null
      })

      const requestBody = {
        sessionToken: 'test-session-token-123',
        userId: 'user-456'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      await POST(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: Retrieved redirectUrl exceeds 2048 characters')
      )

      consoleSpy.mockRestore()
    })

    it('should log session completion details', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      const mockSessionData = {
        application_id: '550e8400-e29b-41d4-a716-446655440000',
        redirect_url: 'http://localhost:3000/callback',
        state: { returnTo: '/dashboard' },
        user_memberships: [{ application_id: 'app-1' }]
      }

      mockSupabase.rpc.mockResolvedValue({
        data: [mockSessionData],
        error: null
      })

      const requestBody = {
        sessionToken: 'test-session-token-123',
        userId: 'user-456'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      await POST(request)

      expect(consoleSpy).toHaveBeenCalledWith('✅ Session data retrieved successfully:')
      expect(consoleSpy).toHaveBeenCalledWith('👥 User memberships count:', 1)

      consoleSpy.mockRestore()
    })
  })
})