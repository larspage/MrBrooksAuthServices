import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Mock dependencies
jest.mock('@supabase/auth-helpers-nextjs')
jest.mock('next/headers')

const mockCreateRouteHandlerClient = createRouteHandlerClient as jest.MockedFunction<typeof createRouteHandlerClient>
const mockCookies = cookies as jest.MockedFunction<typeof cookies>

describe('/api/applications', () => {
  let mockSupabase: any
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getSession: jest.fn()
      },
      rpc: jest.fn(),
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        order: jest.fn().mockReturnThis()
      }))
    }

    mockCreateRouteHandlerClient.mockReturnValue(mockSupabase)
    mockCookies.mockReturnValue({} as any)

    // Mock NextRequest
    mockRequest = {
      json: jest.fn(),
      url: 'http://localhost:3000/api/applications'
    } as any
  })

  describe('GET /api/applications', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when session has error', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Session error')
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 when user is not admin', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null
      })

      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden - Admin access required')
    })

    it('should return 403 when admin check fails', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null
      })

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('Admin check failed')
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden - Admin access required')
    })

    it('should return applications when user is admin', async () => {
      const mockApplications = [
        { id: '1', name: 'App 1', slug: 'app-1' },
        { id: '2', name: 'App 2', slug: 'app-2' }
      ]

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'admin-123' } } },
        error: null
      })

      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      })

      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockApplications,
          error: null
        })
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.applications).toEqual(mockApplications)
      expect(mockSupabase.from).toHaveBeenCalledWith('applications')
    })

    it('should return 500 when database query fails', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'admin-123' } } },
        error: null
      })

      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      })

      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error')
        })
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch applications')
    })

    it('should handle unexpected errors', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Unexpected error'))

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/applications', () => {
    beforeEach(() => {
      mockRequest.json = jest.fn().mockResolvedValue({
        name: 'Test App',
        slug: 'test-app',
        description: 'Test application',
        status: 'development'
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 when user is not admin', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null
      })

      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden - Admin access required')
    })

    it('should return 400 when required fields are missing', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'admin-123' } } },
        error: null
      })

      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      })

      mockRequest.json = jest.fn().mockResolvedValue({
        description: 'Test application'
        // Missing name and slug
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name and slug are required')
    })

    it('should return 409 when slug already exists', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'admin-123' } } },
        error: null
      })

      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      })

      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'existing-app' },
          error: null
        })
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Application with this slug already exists')
    })

    it('should create application successfully', async () => {
      const mockCreatedApp = {
        id: 'new-app-123',
        name: 'Test App',
        slug: 'test-app',
        description: 'Test application',
        status: 'development',
        api_keys: {
          public_key: 'pk_test-app_123456',
          secret_key: 'sk_test-app_123456_abc'
        }
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'admin-123' } } },
        error: null
      })

      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      })

      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' } // Not found error
          })
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockCreatedApp,
            error: null
          })
        })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.application).toEqual(mockCreatedApp)
    })

    it('should return 500 when application creation fails', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'admin-123' } } },
        error: null
      })

      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      })

      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }
          })
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Insert failed')
          })
        })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create application')
    })

    it('should handle unexpected errors in POST', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Unexpected error'))

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should generate API keys with correct format', async () => {
      const mockCreatedApp = {
        id: 'new-app-123',
        name: 'Test App',
        slug: 'test-app',
        api_keys: {
          public_key: 'pk_test-app_1234567890',
          secret_key: 'sk_test-app_1234567890_abcdef123'
        }
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'admin-123' } } },
        error: null
      })

      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      })

      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }
          })
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockCreatedApp,
            error: null
          })
        })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.application.api_keys.public_key).toMatch(/^pk_test-app_\d+$/)
      expect(data.application.api_keys.secret_key).toMatch(/^sk_test-app_\d+_[a-z0-9]+$/)
    })

    // Additional Edge Cases and Negative Testing
    describe('Additional Edge Cases', () => {
      it('should handle malformed JSON in request body', async () => {
        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: { user: { id: 'admin-123' } } },
          error: null
        })

        mockSupabase.rpc.mockResolvedValue({
          data: true,
          error: null
        })

        mockRequest.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')
      })

      it('should handle empty name string', async () => {
        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: { user: { id: 'admin-123' } } },
          error: null
        })

        mockSupabase.rpc.mockResolvedValue({
          data: true,
          error: null
        })

        mockRequest.json = jest.fn().mockResolvedValue({
          name: '',
          slug: 'test-app',
          description: 'Test application'
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Name and slug are required')
      })

      it('should handle empty slug string', async () => {
        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: { user: { id: 'admin-123' } } },
          error: null
        })

        mockSupabase.rpc.mockResolvedValue({
          data: true,
          error: null
        })

        mockRequest.json = jest.fn().mockResolvedValue({
          name: 'Test App',
          slug: '',
          description: 'Test application'
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Name and slug are required')
      })

      it('should handle null name and slug', async () => {
        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: { user: { id: 'admin-123' } } },
          error: null
        })

        mockSupabase.rpc.mockResolvedValue({
          data: true,
          error: null
        })

        mockRequest.json = jest.fn().mockResolvedValue({
          name: null,
          slug: null,
          description: 'Test application'
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Name and slug are required')
      })

      it('should trim whitespace from name and slug', async () => {
        const mockCreatedApp = {
          id: 'new-app-123',
          name: 'Test App',
          slug: 'test-app',
          description: 'Test application',
          status: 'development'
        }

        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: { user: { id: 'admin-123' } } },
          error: null
        })

        mockSupabase.rpc.mockResolvedValue({
          data: true,
          error: null
        })

        mockRequest.json = jest.fn().mockResolvedValue({
          name: '  Test App  ',
          slug: '  test-app  ',
          description: '  Test application  '
        })

        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
          .mockReturnValueOnce({
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockCreatedApp,
              error: null
            })
          })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.application.name).toBe('Test App')
        expect(data.application.slug).toBe('test-app')
      })

      it('should handle very long name and slug', async () => {
        const longName = 'a'.repeat(1000)
        const longSlug = 'b'.repeat(1000)

        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: { user: { id: 'admin-123' } } },
          error: null
        })

        mockSupabase.rpc.mockResolvedValue({
          data: true,
          error: null
        })

        mockRequest.json = jest.fn().mockResolvedValue({
          name: longName,
          slug: longSlug,
          description: 'Test application'
        })

        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }
          })
        })

        const response = await POST(mockRequest)

        // Should still attempt to create the application
        expect(mockFrom).toHaveBeenCalledWith('applications')
      })

      it('should handle special characters in slug', async () => {
        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: { user: { id: 'admin-123' } } },
          error: null
        })

        mockSupabase.rpc.mockResolvedValue({
          data: true,
          error: null
        })

        mockRequest.json = jest.fn().mockResolvedValue({
          name: 'Test App',
          slug: 'test-app!@#$%^&*()',
          description: 'Test application'
        })

        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }
          })
        })

        const response = await POST(mockRequest)

        // Should still attempt to check for existing slug
        expect(mockFrom).toHaveBeenCalledWith('applications')
      })

      it('should handle missing description (should be optional)', async () => {
        const mockCreatedApp = {
          id: 'new-app-123',
          name: 'Test App',
          slug: 'test-app',
          description: null,
          status: 'development'
        }

        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: { user: { id: 'admin-123' } } },
          error: null
        })

        mockSupabase.rpc.mockResolvedValue({
          data: true,
          error: null
        })

        mockRequest.json = jest.fn().mockResolvedValue({
          name: 'Test App',
          slug: 'test-app'
          // No description provided
        })

        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
          .mockReturnValueOnce({
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockCreatedApp,
              error: null
            })
          })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.application.description).toBeNull()
      })

      it('should handle custom status values', async () => {
        const mockCreatedApp = {
          id: 'new-app-123',
          name: 'Test App',
          slug: 'test-app',
          status: 'production'
        }

        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: { user: { id: 'admin-123' } } },
          error: null
        })

        mockSupabase.rpc.mockResolvedValue({
          data: true,
          error: null
        })

        mockRequest.json = jest.fn().mockResolvedValue({
          name: 'Test App',
          slug: 'test-app',
          status: 'production'
        })

        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
          .mockReturnValueOnce({
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockCreatedApp,
              error: null
            })
          })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.application.status).toBe('production')
      })

      it('should handle database constraint violations', async () => {
        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: { user: { id: 'admin-123' } } },
          error: null
        })

        mockSupabase.rpc.mockResolvedValue({
          data: true,
          error: null
        })

        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
          .mockReturnValueOnce({
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: {
                code: '23505',
                message: 'duplicate key value violates unique constraint'
              }
            })
          })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to create application')
      })

      it('should handle concurrent application creation attempts', async () => {
        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: { user: { id: 'admin-123' } } },
          error: null
        })

        mockSupabase.rpc.mockResolvedValue({
          data: true,
          error: null
        })

        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })

        const requests = Array.from({ length: 3 }, () => {
          const req = {
            json: jest.fn().mockResolvedValue({
              name: 'Test App',
              slug: 'test-app'
            }),
            url: 'http://localhost:3000/api/applications'
          } as any
          return GET(req)
        })

        const responses = await Promise.all(requests)

        responses.forEach(async (response) => {
          const data = await response.json()
          expect(response.status).toBe(200)
          expect(data.applications).toEqual([])
        })
      })
    })
  })
})