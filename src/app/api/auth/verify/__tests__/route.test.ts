import { NextRequest, NextResponse } from 'next/server'

// Mock the auth-helpers-nextjs module
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(() => ({
    auth: { 
      getUser: jest.fn(),
      getSession: jest.fn() 
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      then: jest.fn()
    })),
    rpc: jest.fn()
  }))
}))

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({}))
}))

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const mockCreateRouteHandlerClient = createRouteHandlerClient as jest.MockedFunction<typeof createRouteHandlerClient>
const mockCookies = cookies as jest.MockedFunction<typeof mockCookies>

describe('/api/auth/verify', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn()
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        then: jest.fn()
      })),
      rpc: jest.fn().mockResolvedValue({ data: [], error: null })
    }

    mockCreateRouteHandlerClient.mockReturnValue(mockSupabase as any)
    mockCookies.mockReturnValue({} as any)
  })

  describe('GET', () => {
    it('should return service health information', async () => {
      const { GET } = await import('../route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.service).toBe('MrBrooks Auth Service')
      expect(data.status).toBe('operational')
    })
  })

  describe('POST', () => {
    it('should return 400 when application_id is missing', async () => {
      const { POST } = await import('../route')
      const request = new NextRequest('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('application_id is required')
    })

    it('should return 404 when application is not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        then: jest.fn()
      })

      const { POST } = await import('../route')
      const request = new NextRequest('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ application_id: 'fake-id' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Invalid or inactive application')
    })

    it('should return authorized false when no user_token provided', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { id: 'app-1', name: 'Test App', status: 'active' }, 
          error: null 
        }),
        then: jest.fn()
      })

      const { POST } = await import('../route')
      const request = new NextRequest('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ application_id: 'app-1' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authorized).toBe(false)
      expect(data.application).toEqual({ id: 'app-1', name: 'Test App' })
    })

    it.skip('should return 200 and authorized true with valid token and membership', async () => {
      const mockApp = { id: 'app-1', name: 'Test App', status: 'active' }
      const mockUser = { id: 'user-1', email: 'test@example.com' }
      const mockProfile = { full_name: 'Test User', avatar_url: null }
      const mockMembership = { 
        id: 'mem-1', 
        status: 'active', 
        started_at: '2026-01-01', 
        ends_at: null,
        membership_tier: { id: 'tier-1', name: 'Pro', tier_level: 1, features: {} }
      }

      // Build proper mock chain
      const fromFn = jest.fn()
      fromFn.select = jest.fn().mockReturnThis()
      fromFn.eq = jest.fn().mockReturnThis()
      fromFn.single = jest.fn()
      fromFn.then = jest.fn()
      
      fromFn.select.mockReturnThis()
      fromFn.eq
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockMembership, error: null }),
          then: jest.fn()
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          then: jest.fn()
        })
      
      mockSupabase.from.mockReturnValue(fromFn)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      mockSupabase.rpc.mockResolvedValue({ data: [mockMembership], error: null })

      const { POST } = await import('../route')
      const request = new NextRequest('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ application_id: 'app-1', user_token: 'valid-token' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authorized).toBe(true)
    })

    it('should return 401 with invalid user token', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { id: 'app-1', name: 'Test App', status: 'active' }, 
          error: null 
        }),
        then: jest.fn()
      })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      })

      const { POST } = await import('../route')
      const request = new NextRequest('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ application_id: 'app-1', user_token: 'invalid-token' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid user token')
    })
  })
})