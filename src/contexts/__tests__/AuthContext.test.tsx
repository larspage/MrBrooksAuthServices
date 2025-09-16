import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../AuthContext'
import { supabase } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase')

const mockSupabase = supabase as jest.Mocked<typeof supabase>

// Test component to access AuthContext
const TestComponent = () => {
  const { user, profile, loading, signUp, signIn, signOut, updateProfile } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <div data-testid="profile">{profile ? profile.full_name : 'no-profile'}</div>
      <button onClick={() => signUp('test@example.com', 'password', 'Test User')}>
        Sign Up
      </button>
      <button onClick={() => signIn('test@example.com', 'password')}>
        Sign In
      </button>
      <button onClick={() => signOut()}>
        Sign Out
      </button>
      <button onClick={() => updateProfile({ full_name: 'Updated Name' })}>
        Update Profile
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    })
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
  })

  describe('Provider initialization', () => {
    it('should render children and initialize with loading state', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('loading')).toHaveTextContent('loading')
      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
      expect(screen.getByTestId('profile')).toHaveTextContent('no-profile')

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })
    })

    it('should initialize with existing session', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {}
      }
      
      const mockSession = {
        user: mockUser,
        access_token: 'token-123'
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-123', full_name: 'Test User', email: 'test@example.com' },
          error: null
        })
      } as any)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('profile')).toHaveTextContent('Test User')
      })
    })
  })

  describe('Authentication methods', () => {
    it('should handle successful sign up', async () => {
      const user = userEvent.setup()
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null })
      } as any)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })

      await user.click(screen.getByText('Sign Up'))

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles')
    })

    it('should handle sign up error', async () => {
      const user = userEvent.setup()
      const mockError = new Error('Sign up failed')

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: mockError
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })

      await user.click(screen.getByText('Sign Up'))

      expect(mockSupabase.auth.signUp).toHaveBeenCalled()
    })

    it('should handle successful sign in', async () => {
      const user = userEvent.setup()

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })

      await user.click(screen.getByText('Sign In'))

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      })
    })

    it('should handle sign in error', async () => {
      const user = userEvent.setup()
      const mockError = new Error('Invalid credentials')

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: mockError
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })

      await user.click(screen.getByText('Sign In'))

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled()
    })

    it('should handle sign out', async () => {
      const user = userEvent.setup()

      mockSupabase.auth.signOut.mockResolvedValue({
        error: null
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })

      await user.click(screen.getByText('Sign Out'))

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('Profile management', () => {
    it('should update user profile', async () => {
      const user = userEvent.setup()
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      // Set up initial state with user
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-123', full_name: 'Test User' },
          error: null
        }),
        update: jest.fn().mockReturnThis()
      } as any)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      // Mock update response
      const mockFrom = mockSupabase.from as jest.Mock
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      })

      await user.click(screen.getByText('Update Profile'))

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles')
    })

    it('should handle profile update error when no user is logged in', async () => {
      const user = userEvent.setup()

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })

      await user.click(screen.getByText('Update Profile'))

      // Should not call Supabase update when no user is logged in
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })

  describe('Auth state changes', () => {
    it('should handle auth state change events', async () => {
      let authStateCallback: any

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return {
          data: { subscription: { unsubscribe: jest.fn() } }
        }
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })

      // Simulate auth state change
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      const mockSession = {
        user: mockUser
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-123', full_name: 'Test User' },
          error: null
        })
      } as any)

      await act(async () => {
        authStateCallback('SIGNED_IN', mockSession)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })
    })
  })

  describe('Error handling', () => {
    it('should handle session retrieval error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Session error')
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error getting session:', expect.any(Error))
      
      consoleErrorSpy.mockRestore()
    })

    it('should handle profile fetch error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Profile fetch error')
        })
      } as any)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching user profile:', expect.any(Error))
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleErrorSpy.mockRestore()
    })
  })
})