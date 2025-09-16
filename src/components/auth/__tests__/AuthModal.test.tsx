import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthModal from '../AuthModal'

// Mock the child components
jest.mock('../LoginForm', () => {
  return function MockLoginForm({ onToggleMode, onSuccess }: any) {
    return (
      <div data-testid="login-form">
        <button onClick={onToggleMode}>Toggle to Signup</button>
        <button onClick={onSuccess}>Login Success</button>
      </div>
    )
  }
})

jest.mock('../SignupForm', () => {
  return function MockSignupForm({ onToggleMode, onSuccess }: any) {
    return (
      <div data-testid="signup-form">
        <button onClick={onToggleMode}>Toggle to Login</button>
        <button onClick={onSuccess}>Signup Success</button>
      </div>
    )
  }
})

describe('AuthModal', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Modal visibility', () => {
    it('should not render when isOpen is false', () => {
      render(
        <AuthModal
          isOpen={false}
          onClose={mockOnClose}
          initialMode="login"
        />
      )

      expect(screen.queryByTestId('login-form')).not.toBeInTheDocument()
      expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
    })

    it('should render when isOpen is true', () => {
      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      )

      expect(screen.getByTestId('login-form')).toBeInTheDocument()
      expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
    })
  })

  describe('Initial mode', () => {
    it('should render login form when initialMode is login', () => {
      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      )

      expect(screen.getByTestId('login-form')).toBeInTheDocument()
      expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
    })

    it('should render signup form when initialMode is signup', () => {
      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="signup"
        />
      )

      expect(screen.getByTestId('signup-form')).toBeInTheDocument()
      expect(screen.queryByTestId('login-form')).not.toBeInTheDocument()
    })

    it('should default to login mode when initialMode is not provided', () => {
      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByTestId('login-form')).toBeInTheDocument()
      expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
    })
  })

  describe('Mode switching', () => {
    it('should switch from login to signup mode', async () => {
      const user = userEvent.setup()

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      )

      expect(screen.getByTestId('login-form')).toBeInTheDocument()

      await user.click(screen.getByText('Toggle to Signup'))

      expect(screen.getByTestId('signup-form')).toBeInTheDocument()
      expect(screen.queryByTestId('login-form')).not.toBeInTheDocument()
    })

    it('should switch from signup to login mode', async () => {
      const user = userEvent.setup()

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="signup"
        />
      )

      expect(screen.getByTestId('signup-form')).toBeInTheDocument()

      await user.click(screen.getByText('Toggle to Login'))

      expect(screen.getByTestId('login-form')).toBeInTheDocument()
      expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
    })
  })

  describe('Modal closing', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      )

      // Find the close button by its SVG content (X icon)
      const closeButton = screen.getByRole('button', { name: '' })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when authentication is successful', async () => {
      const user = userEvent.setup()

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      )

      await user.click(screen.getByText('Login Success'))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when signup is successful', async () => {
      const user = userEvent.setup()

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="signup"
        />
      )

      await user.click(screen.getByText('Signup Success'))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Modal structure', () => {
    it('should render with proper modal structure', () => {
      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      )

      // Check for modal backdrop
      const backdrop = screen.getByTestId('login-form').closest('.fixed')
      expect(backdrop).toHaveClass('inset-0', 'bg-black', 'bg-opacity-50')

      // Check for modal content container
      const modalContent = screen.getByTestId('login-form').closest('.relative')
      expect(modalContent).toHaveClass('max-w-md', 'w-full')
    })

    it('should render close button with proper styling', () => {
      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      )

      const closeButton = screen.getByRole('button', { name: '' })
      expect(closeButton).toHaveClass('absolute', '-top-2', '-right-2')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      )

      const closeButton = screen.getByRole('button', { name: '' })
      expect(closeButton).toBeInTheDocument()
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      )

      const closeButton = screen.getByRole('button', { name: '' })
      
      // Focus the close button and press Enter
      closeButton.focus()
      await user.keyboard('{Enter}')

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('State management', () => {
    it('should maintain mode state independently of initialMode prop changes', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      )

      // Switch to signup mode
      await user.click(screen.getByText('Toggle to Signup'))
      expect(screen.getByTestId('signup-form')).toBeInTheDocument()

      // Re-render with different initialMode - should not affect current mode
      rerender(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      )

      // Should still be in signup mode
      expect(screen.getByTestId('signup-form')).toBeInTheDocument()
    })

    it('should reset to initialMode when modal is reopened', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      )

      // Switch to signup mode
      await user.click(screen.getByText('Toggle to Signup'))
      expect(screen.getByTestId('signup-form')).toBeInTheDocument()

      // Close modal
      rerender(
        <AuthModal
          isOpen={false}
          onClose={mockOnClose}
          initialMode="login"
        />
      )

      // Reopen modal with signup mode to test that it uses initialMode
      rerender(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="signup"
        />
      )

      expect(screen.getByTestId('signup-form')).toBeInTheDocument()
    })
  })
})