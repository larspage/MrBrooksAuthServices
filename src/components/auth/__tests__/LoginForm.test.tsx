import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '../LoginForm'
import { useAuth } from '@/contexts/AuthContext'

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn()
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('LoginForm', () => {
  let mockSignIn: jest.Mock
  let mockOnToggleMode: jest.Mock
  let mockOnSuccess: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockSignIn = jest.fn()
    mockOnToggleMode = jest.fn()
    mockOnSuccess = jest.fn()

    mockUseAuth.mockReturnValue({
      signIn: mockSignIn,
      user: null,
      profile: null,
      session: null,
      loading: false,
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn()
    })
  })

  describe('Rendering', () => {
    it('should render login form with all required elements', () => {
      render(<LoginForm />)

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
      expect(screen.getByText(/welcome back to mrbrooks auth service/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should render toggle mode button when onToggleMode is provided', () => {
      render(<LoginForm onToggleMode={mockOnToggleMode} />)

      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign up here/i })).toBeInTheDocument()
    })

    it('should not render toggle mode button when onToggleMode is not provided', () => {
      render(<LoginForm />)

      expect(screen.queryByText(/don't have an account/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /sign up here/i })).not.toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    it('should update email input value', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      await user.type(emailInput, 'test@example.com')

      expect(emailInput.value).toBe('test@example.com')
    })

    it('should update password input value', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      await user.type(passwordInput, 'password123')

      expect(passwordInput.value).toBe('password123')
    })

    it('should call onToggleMode when sign up button is clicked', async () => {
      const user = userEvent.setup()
      render(<LoginForm onToggleMode={mockOnToggleMode} />)

      const signUpButton = screen.getByRole('button', { name: /sign up here/i })
      await user.click(signUpButton)

      expect(mockOnToggleMode).toHaveBeenCalledTimes(1)
    })
  })

  describe('Form Submission', () => {
    it('should call signIn with correct credentials on form submission', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: null })

      render(<LoginForm onSuccess={mockOnSuccess} />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
    })

    it('should call onSuccess when sign in is successful', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: null })

      render(<LoginForm onSuccess={mockOnSuccess} />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      })
    })

    it('should not call onSuccess when onSuccess is not provided', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: null })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Should not throw error when onSuccess is undefined
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when sign in fails', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Invalid email or password'
      mockSignIn.mockResolvedValue({ error: { message: errorMessage } })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('should display special message for email confirmation errors', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ 
        error: { message: 'Email not confirmed' } 
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email not confirmed/i)).toBeInTheDocument()
        expect(screen.getByText(/please check your email and click the confirmation link/i)).toBeInTheDocument()
      })
    })

    it('should clear error message on new form submission', async () => {
      const user = userEvent.setup()
      mockSignIn
        .mockResolvedValueOnce({ error: { message: 'First error' } })
        .mockResolvedValueOnce({ error: null })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // First submission with error
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Second submission should clear error
      await user.clear(passwordInput)
      await user.type(passwordInput, 'correctpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })

    it('should handle error objects without message property', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: {} })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('should handle null error object', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: null })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Input Validation', () => {
    it('should require email input', () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      expect(emailInput.required).toBe(true)
      expect(emailInput.type).toBe('email')
    })

    it('should require password input', () => {
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      expect(passwordInput.required).toBe(true)
      expect(passwordInput.type).toBe('password')
    })

    it('should have proper placeholder text', () => {
      render(<LoginForm />)

      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading state during sign in', async () => {
      const user = userEvent.setup()
      let resolveSignIn: (value: any) => void
      const signInPromise = new Promise(resolve => {
        resolveSignIn = resolve
      })
      mockSignIn.mockReturnValue(signInPromise)

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Should show loading state
      expect(screen.getByText(/signing in.../i)).toBeInTheDocument()
      expect(submitButton.disabled).toBe(true)
      expect(emailInput.disabled).toBe(true)
      expect(passwordInput.disabled).toBe(true)

      // Resolve the promise
      resolveSignIn!({ error: null })

      await waitFor(() => {
        expect(submitButton.disabled).toBe(false)
      })
    })

    it('should reset loading state after error', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
        expect(submitButton.disabled).toBe(false)
        expect(emailInput.disabled).toBe(false)
        expect(passwordInput.disabled).toBe(false)
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement

      expect(emailInput.id).toBe('email')
      expect(passwordInput.id).toBe('password')
      expect(submitButton.type).toBe('submit')
    })

    it('should have proper form structure', () => {
      render(<LoginForm />)

      const form = document.querySelector('form')
      expect(form).toBeInTheDocument()
      expect(form?.tagName).toBe('FORM')
    })

    it('should associate labels with inputs correctly', () => {
      render(<LoginForm />)

      const emailLabel = screen.getByText('Email') as HTMLLabelElement
      const passwordLabel = screen.getByText('Password') as HTMLLabelElement
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

      expect(emailLabel.getAttribute('for')).toBe('email')
      expect(passwordLabel.getAttribute('for')).toBe('password')
      expect(emailInput.id).toBe('email')
      expect(passwordInput.id).toBe('password')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty form submission', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // HTML5 validation should prevent submission
      expect(mockSignIn).not.toHaveBeenCalled()
    })

    it('should handle very long email addresses', async () => {
      const user = userEvent.setup()
      const longEmail = 'verylongemailaddress@example.com'
      mockSignIn.mockResolvedValue({ error: null })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, longEmail)
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(mockSignIn).toHaveBeenCalledWith(longEmail, 'password123')
    })

    it('should handle special characters in credentials', async () => {
      const user = userEvent.setup()
      const specialEmail = 'test+tag@example.com'
      const specialPassword = 'Pass123!'
      mockSignIn.mockResolvedValue({ error: null })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, specialEmail)
      await user.type(passwordInput, specialPassword)
      await user.click(submitButton)

      expect(mockSignIn).toHaveBeenCalledWith(specialEmail, specialPassword)
    })
  })

  describe('Component Props', () => {
    it('should handle all props being undefined', () => {
      render(<LoginForm />)

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
      expect(screen.queryByText(/don't have an account/i)).not.toBeInTheDocument()
    })

    it('should handle sessionToken prop', () => {
      render(<LoginForm sessionToken="test-session-123" />)

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    })
  })

  describe('Error Display Scenarios', () => {
    it('should display generic error messages', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: { message: 'Authentication failed' } })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Authentication failed')).toBeInTheDocument()
        expect(screen.getByText(/sign in error/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: { message: 'Network request failed' } })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Network request failed')).toBeInTheDocument()
      })
    })

    it('should handle server errors', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: { message: 'Internal server error' } })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Internal server error')).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('should prevent submission with empty email', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(mockSignIn).not.toHaveBeenCalled()
    })

    it('should prevent submission with empty password', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      expect(mockSignIn).not.toHaveBeenCalled()
    })

    it('should validate email format', () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      expect(emailInput.type).toBe('email')
    })
  })
})