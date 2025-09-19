import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Mock dependencies
jest.mock('@supabase/auth-helpers-nextjs')
jest.mock('next/headers')

const mockCreateRouteHandlerClient = createRouteHandlerClient as jest.MockedFunction<typeof createRouteHandlerClient>
const mockCookies = cookies as jest.MockedFunction<typeof cookies>

describe('/api/auth/verify', () => {
  let mockSupabase: any
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      })),
      rpc: jest.fn()
    }

    mockCreateRouteHandlerClient.mockReturnValue(mockSupabase)
    mockCookies.mockReturnValue({} as any)

    // Mock NextRequest
    mockRequest = {
      json: jest.fn(),
      url: 'http://localhost:3000/api/auth/verify'
    } as any
  })

  describe('GET /api/auth/verify', () => {
    it('should return service health information', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.service).toBe('MrBrooks Auth Service')
      expect(data.status).toBe('operational')
      expect(data.version).toBe('1.0.0')
      expect(data.timestamp).toBeDefined()
    })
  })

  describe('POST /api/auth/verify', () => {
    beforeEach(() => {
      mockRequest.json = jest.fn().mockResolvedValue({
        application_id: 'app-123',
        user_token: 'user-token-123',
        required_tier_level: 1
      })
    })

    it('should return 400 when application_id is missing', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        user_token: 'user-token-123'
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('application_id is required')
    })

    it('should return 404 when application does not exist', async () => {
      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Not found')
        })
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Invalid or inactive application')
      expect(data.authorized).toBe(false)
    })

    it('should return 404 when application is not active', async () => {
      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Not found')
        })
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Invalid or inactive application')
      expect(data.authorized).toBe(false)
    })

    it('should return application info when no user token provided', async () => {
      const mockApplication = {
        id: 'app-123',
        name: 'Test App',
        status: 'active'
      }

      mockRequest.json = jest.fn().mockResolvedValue({
        application_id: 'app-123'
      })

      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockApplication,
          error: null
        })
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authorized).toBe(false)
      expect(data.application).toEqual({
        id: mockApplication.id,
        name: mockApplication.name
      })
    })

    it('should return 401 when user token is invalid', async () => {
      const mockApplication = {
        id: 'app-123',
        name: 'Test App',
        status: 'active'
      }

      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockApplication,
          error: null
        })
      })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token')
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid user token')
      expect(data.authorized).toBe(false)
    })

    it('should return 404 when user profile not found', async () => {
      const mockApplication = {
        id: 'app-123',
        name: 'Test App',
        status: 'active'
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockApplication,
            error: null
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Profile not found')
          })
        })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User profile not found')
      expect(data.authorized).toBe(false)
    })

    it('should return user info without membership when no membership exists', async () => {
      const mockApplication = {
        id: 'app-123',
        name: 'Test App',
        status: 'active'
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      const mockProfile = {
        id: 'user-123',
        full_name: 'Test User',
        avatar_url: null
      }

      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockApplication,
            error: null
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('No membership found')
          })
        })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock empty memberships
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authorized).toBe(false)
      expect(data.user.id).toBe(mockUser.id)
      expect(data.user.email).toBe(mockUser.email)
      expect(data.membership).toBeNull()
      expect(data.userMemberships).toEqual([])
    })

    it('should return authorized user with membership', async () => {
      const mockApplication = {
        id: 'app-123',
        name: 'Test App',
        status: 'active'
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      const mockProfile = {
        id: 'user-123',
        full_name: 'Test User',
        avatar_url: null
      }

      const mockMembership = {
        id: 'membership-123',
        status: 'active',
        started_at: '2023-01-01',
        ends_at: '2024-01-01',
        membership_tier: {
          id: 'tier-123',
          name: 'Premium',
          tier_level: 2,
          features: ['feature1', 'feature2']
        }
      }

      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockApplication,
            error: null
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockMembership,
            error: null
          })
        })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock the get_user_memberships_with_pricing function
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            application_id: 'app-123',
            application_name: 'Test App',
            application_slug: 'test-app',
            membership_id: 'membership-123',
            membership_status: 'active',
            tier_id: 'tier-123',
            tier_name: 'Premium',
            tier_level: 2,
            tier_features: ['feature1', 'feature2'],
            started_at: '2023-01-01',
            ends_at: '2024-01-01',
            renewal_date: '2023-12-01',
            monthly_price_cents: 999,
            yearly_price_cents: 9999,
            currency: 'usd'
          }
        ],
        error: null
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authorized).toBe(true)
      expect(data.user.id).toBe(mockUser.id)
      expect(data.membership.id).toBe(mockMembership.id)
      expect(data.membership.tier.name).toBe('Premium')
      expect(data.userMemberships).toHaveLength(1)
      expect(data.userMemberships[0].application_name).toBe('Test App')
      expect(data.userMemberships[0].monthly_price_cents).toBe(999)

      // Verify the RPC call was made
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_memberships_with_pricing', {
        user_uuid: 'user-123'
      })
    })

    it('should check required tier level', async () => {
      const mockApplication = {
        id: 'app-123',
        name: 'Test App',
        status: 'active'
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      const mockProfile = {
        id: 'user-123',
        full_name: 'Test User',
        avatar_url: null
      }

      const mockMembership = {
        id: 'membership-123',
        status: 'active',
        started_at: '2023-01-01',
        ends_at: '2024-01-01',
        membership_tier: {
          id: 'tier-123',
          name: 'Basic',
          tier_level: 1,
          features: ['feature1']
        }
      }

      mockRequest.json = jest.fn().mockResolvedValue({
        application_id: 'app-123',
        user_token: 'user-token-123',
        required_tier_level: 2 // Higher than user's tier level
      })

      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockApplication,
            error: null
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockMembership,
            error: null
          })
        })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authorized).toBe(false) // Should be false due to insufficient tier level
      expect(data.membership.tier.tier_level).toBe(1)
    })

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(data.authorized).toBe(false)
    })

    it('should handle membership tier with missing tier_level', async () => {
      const mockApplication = {
        id: 'app-123',
        name: 'Test App',
        status: 'active'
      }

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      const mockProfile = {
        id: 'user-123',
        full_name: 'Test User',
        avatar_url: null
      }

      const mockMembership = {
        id: 'membership-123',
        status: 'active',
        started_at: '2023-01-01',
        ends_at: '2024-01-01',
        membership_tier: {
          id: 'tier-123',
          name: 'Basic',
          // tier_level is missing
          features: ['feature1']
        }
      }

      mockRequest.json = jest.fn().mockResolvedValue({
        application_id: 'app-123',
        user_token: 'user-token-123',
        required_tier_level: 1
      })

      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockApplication,
            error: null
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockMembership,
            error: null
          })
        })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authorized).toBe(false) // Should be false due to missing tier_level (defaults to 0)
    })

    // Additional Edge Cases and Negative Testing
    describe('Additional Edge Cases', () => {
      it('should handle malformed JSON in request body', async () => {
        mockRequest.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')
        expect(data.authorized).toBe(false)
      })

      it('should handle empty application_id string', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          application_id: '',
          user_token: 'user-token-123'
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('application_id is required')
      })

      it('should handle null application_id', async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
          application_id: null,
          user_token: 'user-token-123'
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('application_id is required')
      })

      it('should handle very long application_id', async () => {
        const longAppId = 'a'.repeat(1000)
        mockRequest.json = jest.fn().mockResolvedValue({
          application_id: longAppId,
          user_token: 'user-token-123'
        })

        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Not found')
          })
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Invalid or inactive application')
      })

      it('should handle empty user_token string', async () => {
        const mockApplication = {
          id: 'app-123',
          name: 'Test App',
          status: 'active'
        }

        mockRequest.json = jest.fn().mockResolvedValue({
          application_id: 'app-123',
          user_token: ''
        })

        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockApplication,
            error: null
          })
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.authorized).toBe(false)
        expect(data.application).toEqual({
          id: mockApplication.id,
          name: mockApplication.name
        })
      })

      it('should handle negative required_tier_level', async () => {
        const mockApplication = {
          id: 'app-123',
          name: 'Test App',
          status: 'active'
        }

        const mockUser = {
          id: 'user-123',
          email: 'test@example.com'
        }

        const mockProfile = {
          id: 'user-123',
          full_name: 'Test User',
          avatar_url: null
        }

        const mockMembership = {
          id: 'membership-123',
          status: 'active',
          started_at: '2023-01-01',
          ends_at: '2024-01-01',
          membership_tier: {
            id: 'tier-123',
            name: 'Basic',
            tier_level: 1,
            features: ['feature1']
          }
        }

        mockRequest.json = jest.fn().mockResolvedValue({
          application_id: 'app-123',
          user_token: 'user-token-123',
          required_tier_level: -1
        })

        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockApplication,
              error: null
            })
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockMembership,
              error: null
            })
          })

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.authorized).toBe(true) // Should be true since user tier (1) >= required (-1)
      })

      it('should handle extremely high required_tier_level', async () => {
        const mockApplication = {
          id: 'app-123',
          name: 'Test App',
          status: 'active'
        }

        const mockUser = {
          id: 'user-123',
          email: 'test@example.com'
        }

        const mockProfile = {
          id: 'user-123',
          full_name: 'Test User',
          avatar_url: null
        }

        const mockMembership = {
          id: 'membership-123',
          status: 'active',
          started_at: '2023-01-01',
          ends_at: '2024-01-01',
          membership_tier: {
            id: 'tier-123',
            name: 'Premium',
            tier_level: 5,
            features: ['feature1', 'feature2']
          }
        }

        mockRequest.json = jest.fn().mockResolvedValue({
          application_id: 'app-123',
          user_token: 'user-token-123',
          required_tier_level: Number.MAX_SAFE_INTEGER
        })

        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockApplication,
              error: null
            })
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockMembership,
              error: null
            })
          })

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.authorized).toBe(false) // Should be false since user tier (5) < required (MAX_SAFE_INTEGER)
      })

      it('should handle database connection timeout', async () => {
        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockRejectedValue(new Error('Connection timeout'))
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')
        expect(data.authorized).toBe(false)
      })

      it('should handle user with null email', async () => {
        const mockApplication = {
          id: 'app-123',
          name: 'Test App',
          status: 'active'
        }

        const mockUser = {
          id: 'user-123',
          email: null // Null email
        }

        const mockProfile = {
          id: 'user-123',
          full_name: 'Test User',
          avatar_url: null
        }

        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockApplication,
              error: null
            })
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('No membership found')
            })
          })

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.user.email).toBeNull()
        expect(data.authorized).toBe(false)
      })

      it('should handle membership with null tier', async () => {
        const mockApplication = {
          id: 'app-123',
          name: 'Test App',
          status: 'active'
        }

        const mockUser = {
          id: 'user-123',
          email: 'test@example.com'
        }

        const mockProfile = {
          id: 'user-123',
          full_name: 'Test User',
          avatar_url: null
        }

        const mockMembership = {
          id: 'membership-123',
          status: 'active',
          started_at: '2023-01-01',
          ends_at: '2024-01-01',
          membership_tier: null // Null tier
        }

        mockRequest.json = jest.fn().mockResolvedValue({
          application_id: 'app-123',
          user_token: 'user-token-123',
          required_tier_level: 1
        })

        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockApplication,
              error: null
            })
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockMembership,
              error: null
            })
          })

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.authorized).toBe(true) // Should be true since membership exists and no tier requirement
        expect(data.membership.tier).toBeNull()
      })

      it('should handle concurrent requests', async () => {
        const mockApplication = {
          id: 'app-123',
          name: 'Test App',
          status: 'active'
        }

        const mockFrom = mockSupabase.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockApplication,
            error: null
          })
        })

        const requests = Array.from({ length: 5 }, () => {
          const req = {
            json: jest.fn().mockResolvedValue({
              application_id: 'app-123'
            }),
            url: 'http://localhost:3000/api/auth/verify'
          } as any
          return POST(req)
        })

        const responses = await Promise.all(requests)

        responses.forEach(async (response) => {
          const data = await response.json()
          expect(response.status).toBe(200)
          expect(data.authorized).toBe(false)
          expect(data.application.id).toBe('app-123')
        })
      })
    })
  })
})