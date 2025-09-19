'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from '@/components/auth/AuthModal'

export default function AuthLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('session')
    const mode = searchParams.get('mode') || 'login'
    
    if (token) {
      setSessionToken(token)
      setAuthMode(mode as 'login' | 'signup')
      setShowAuthModal(true)
    } else {
      setError('No authentication session found')
    }
  }, [searchParams])

  useEffect(() => {
    // If user is already authenticated and we have a session token, complete the flow
    if (user && sessionToken && !loading) {
      completeAuthSession()
    }
  }, [user, sessionToken, loading])

  const completeAuthSession = async () => {
    if (!sessionToken || !user) return

    try {
      const response = await fetch('/api/auth/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken,
          userId: user.id
        })
      })

      const result = await response.json()

      if (result.success) {
        console.log('✅ Auth completion successful')
        console.log('🎯 Retrieved redirectUrl from API:', result.redirectUrl)
        console.log('🎯 redirectUrl length:', result.redirectUrl.length)
        
        // Redirect to the application with success parameters
        const redirectUrl = new URL(result.redirectUrl)
        console.log('🔗 Base redirectUrl created:', redirectUrl.toString())
        
        redirectUrl.searchParams.set('auth_success', 'true')
        redirectUrl.searchParams.set('user_id', user.id)
        console.log('🔗 After adding auth_success and user_id:', redirectUrl.toString())
        console.log('🔗 Current length:', redirectUrl.toString().length)
        
        if (result.state) {
          console.log('🎯 Adding state:', JSON.stringify(result.state))
          console.log('🎯 State length:', JSON.stringify(result.state).length)
          redirectUrl.searchParams.set('state', JSON.stringify(result.state))
          console.log('🔗 After adding state:', redirectUrl.toString())
          console.log('🔗 Final length:', redirectUrl.toString().length)
          
          // Check for potential URL length issues
          if (redirectUrl.toString().length > 2048) {
            console.warn('⚠️ WARNING: Final redirectUrl exceeds 2048 characters, may cause issues with some browsers/email clients')
          }
          if (redirectUrl.toString().length > 8192) {
            console.error('❌ ERROR: Final redirectUrl exceeds 8192 characters, likely to cause failures')
          }
        }

        console.log('🚀 Final redirect URL (login page):', redirectUrl.toString())
        window.location.href = redirectUrl.toString()
      } else {
        setError(result.error || 'Failed to complete authentication')
      }
    } catch (error) {
      console.error('Error completing auth session:', error)
      setError('Failed to complete authentication')
    }
  }

  const handleAuthClose = () => {
    setShowAuthModal(false)
    // If user is authenticated, complete the session, otherwise redirect to home
    if (user && sessionToken) {
      completeAuthSession()
    } else {
      router.push('/')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Authentication Error
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {error}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          MrBrooks Authentication
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please sign in to continue to your application
        </p>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthClose}
        initialMode={authMode}
        sessionToken={sessionToken || undefined}
      />
    </div>
  )
}