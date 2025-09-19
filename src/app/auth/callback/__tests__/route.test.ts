import { NextRequest } from 'next/server'

// Mock Supabase
const mockExchangeCodeForSession = jest.fn()
const mockFrom = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}))

import { GET } from '../route'
import { createClient } from '@supabase/supabase-js'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('/auth/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup the mock Supabase client
    mockCreateClient.mockReturnValue({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession
      },
      from: mockFrom
    } as any)
  })

  describe('GET /auth/callback', () => {
    it('should exchange code for session and redirect to home', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User'
        }
      }

      const mockSession = {
        user: mockUser,
        access_token: 'token-123',
        refresh_token: 'refresh-123',
        expires_in: 3600
      }

      const mockUpsert = jest.fn().mockResolvedValue({
        data: null,
        error: null
      })

      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      } as any)

      mockFrom.mockReturnValue({
        upsert: mockUpsert
      } as any)

      const request = new NextRequest('http://localhost:6010/auth/callback?code=auth-code-123')
      const response = await GET(request)

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('auth-code-123')
      expect(mockFrom).toHaveBeenCalledWith('user_profiles')
      expect(mockUpsert).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        updated_at: expect.any(String)
      }, {
        onConflict: 'id'
      })
      
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:6010/')
    })

    it('should redirect to custom next URL when provided', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {}
      }

      const mockSession = {
        user: mockUser,
        access_token: 'token-123',
        refresh_token: 'refresh-123',
        expires_in: 3600
      }

      const mockUpsert = jest.fn().mockResolvedValue({
        data: null,
        error: null
      })

      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      } as any)

      mockFrom.mockReturnValue({
        upsert: mockUpsert
      } as any)

      const request = new NextRequest('http://localhost:6010/auth/callback?code=auth-code-123&next=/dashboard')
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:6010/dashboard')
    })

    it('should redirect to error page when code exchange fails', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid code' }
      } as any)

      const request = new NextRequest('http://localhost:6010/auth/callback?code=invalid-code')
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:6010/auth/auth-code-error')
    })

    it('should redirect to home when no code provided', async () => {
      const request = new NextRequest('http://localhost:6010/auth/callback')
      const response = await GET(request)

      expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:6010/')
    })

    it('should handle unexpected errors gracefully', async () => {
      mockExchangeCodeForSession.mockRejectedValue(new Error('Network error'))

      const request = new NextRequest('http://localhost:6010/auth/callback?code=auth-code-123')
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:6010/auth/auth-code-error')
    })

    it('should handle profile creation errors gracefully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User'
        }
      }

      const mockSession = {
        user: mockUser,
        access_token: 'token-123',
        refresh_token: 'refresh-123',
        expires_in: 3600
      }

      const mockUpsert = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Profile creation failed' }
      })

      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      } as any)

      mockFrom.mockReturnValue({
        upsert: mockUpsert
      } as any)

      const request = new NextRequest('http://localhost:6010/auth/callback?code=auth-code-123')
      const response = await GET(request)

      // Should still redirect successfully even if profile creation fails
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:6010/')
    })
  })
})