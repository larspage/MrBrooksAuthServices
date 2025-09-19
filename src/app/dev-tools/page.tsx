'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function DevToolsPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const { signUp: authSignUp, signIn: authSignIn } = useAuth()

  useEffect(() => {
    // Check current auth state and listen for changes
    const checkAuthState = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔐 Dev-tools initial session:', session?.user?.email || 'No user')
      setCurrentUser(session?.user || null)
    }

    checkAuthState()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Dev-tools auth state change:', event, session?.user?.email || 'No user')
      setCurrentUser(session?.user || null)
      
      // If user just signed in, reset loading state and show success
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔐 User signed in, resetting loading state')
        setLoading(false)
        setMessage(`✅ Login successful! User: ${session.user.email}\n🆔 User ID: ${session.user.id}`)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const createTestUser = async () => {
    setLoading(true)
    setMessage('')

    try {
      console.log('🔧 Dev-tools: Creating user with AuthContext signUp')
      // Use AuthContext signUp which sets proper redirect URL
      const { error } = await authSignUp(email, password, 'Test User')

      if (error) {
        console.error('🔧 Dev-tools: Signup error:', error)
        setMessage(`Error: ${error.message}`)
      } else {
        console.log('🔧 Dev-tools: Signup successful')
        setMessage(`✅ Test user created successfully! Email: ${email}`)
        setMessage(prev => prev + `\n📧 IMPORTANT: Check your email for the confirmation link.`)
        setMessage(prev => prev + `\n⚠️ You must click the confirmation link before you can log in.`)
        setMessage(prev => prev + `\n🔗 The email link will redirect to the proper callback URL.`)
      }
    } catch (error) {
      console.error('🔧 Dev-tools: Signup exception:', error)
      setMessage(`Error: ${error}`)
    }

    setLoading(false)
  }

  const createTestUserNoConfirmation = async () => {
    setLoading(true)
    setMessage('')

    try {
      console.log('🔧 Dev-tools: Creating user with AuthContext signUp (dev mode)')
      // Use AuthContext signUp which sets proper redirect URL
      const { error } = await authSignUp(email, password, 'Test User')

      if (error) {
        console.error('🔧 Dev-tools: Dev mode signup error:', error)
        setMessage(`Error: ${error.message}`)
        setLoading(false)
        return
      }

      console.log('🔧 Dev-tools: Dev mode signup successful')
      setMessage(`✅ Test user created! Email: ${email}`)
      setMessage(prev => prev + `\n📧 Email confirmation required - check your email`)
      setMessage(prev => prev + `\n🔗 The email link will redirect to the proper callback URL.`)
      setMessage(prev => prev + `\n💡 Or try using a temporary email service like 10minutemail.com`)
      
    } catch (error) {
      console.error('🔧 Dev-tools: Dev mode signup exception:', error)
      setMessage(`Error: ${error}`)
    }

    setLoading(false)
  }

  const testDirectLogin = async () => {
    console.log('🔐🔐🔐 LOGIN FUNCTION CALLED - Button clicked!')
    setLoading(true)
    setMessage('Starting login...')

    try {
      console.log('🔐 Starting login attempt for:', email)
      
      // Use AuthContext signIn method for consistency
      const { error } = await authSignIn(email, password)

      console.log('🔐 Login response error:', error)

      if (error) {
        console.error('🔐 Login error:', error)
        setMessage(`Login Error: ${error.message}`)
      } else {
        console.log('🔐 Login successful via AuthContext')
        // The auth state change listener will handle updating the UI
        setMessage(`✅ Login successful! Check the auth status above.`)
      }
    } catch (error) {
      console.error('🔐 Login exception:', error)
      setMessage(`Error: ${error}`)
    } finally {
      console.log('🔐 Setting loading to false')
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      console.log('🚪 Starting sign out')
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('🚪 Sign out error:', error)
        setMessage(`Sign out error: ${error.message}`)
      } else {
        console.log('🚪 Sign out successful')
        setMessage('✅ Signed out successfully')
      }
    } catch (error) {
      console.error('🚪 Sign out exception:', error)
      setMessage(`Sign out exception: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Development Tools</h1>
          <p className="text-gray-600 mb-8">Testing utilities for MrBrooks Auth Service</p>

          <div className="space-y-6">
            {/* Current Auth Status */}
            <div className="p-4 bg-gray-50 border rounded-md">
              <h3 className="text-sm font-medium text-gray-800 mb-2">Current Auth Status</h3>
              <p className="text-sm text-gray-600">
                {currentUser ? (
                  <>✅ Logged in as: {currentUser.email}</>
                ) : (
                  <>❌ Not logged in</>
                )}
              </p>
              {loading && (
                <p className="text-sm text-blue-600 mt-1">🔄 Operation in progress...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="testuser@gmail.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use a valid email format like: testuser@gmail.com, test@example.com, or user@domain.org
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="password123"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <button
                onClick={createTestUser}
                disabled={loading || !email || !password}
                className="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create User (Email Required)'}
              </button>

              <button
                onClick={createTestUserNoConfirmation}
                disabled={loading || !email || !password}
                className="py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create User (Dev Mode)'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={testDirectLogin}
                disabled={loading || !email || !password}
                className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Test Login'}
              </button>

              <button
                onClick={signOut}
                className="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Sign Out
              </button>

              <button
                onClick={() => {
                  setLoading(false)
                  setMessage('Reset loading state')
                  console.log('🔄 Manually reset loading state')
                }}
                className="py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Reset State
              </button>
            </div>

            {message && (
              <div className="mt-6 p-4 bg-gray-100 border rounded-md">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">{message}</pre>
              </div>
            )}

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-2">🚀 Development Testing Options</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-blue-800">Option 1: Create User (Email Required)</p>
                  <p className="text-sm text-blue-700">Standard signup - requires email confirmation before login</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800">Option 2: Create User (Dev Mode)</p>
                  <p className="text-sm text-blue-700">Development mode - attempts to minimize email confirmation requirements</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-sm font-medium text-green-800 mb-2">💡 Testing Tips</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Use temporary email services like <strong>10minutemail.com</strong> for quick testing</li>
                <li>• Try <strong>example.com</strong> domain emails (some may skip confirmation)</li>
                <li>• Use <strong>Dev Mode</strong> button for faster testing</li>
                <li>• Valid formats: testuser@gmail.com, user@example.com, test@domain.org</li>
              </ul>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-2">💡 Testing Tip</h3>
              <p className="text-sm text-blue-700">
                After creating a user, check your email for the confirmation link. Once confirmed, you can use the
                "Test Login" button or return to the main app to sign in.
              </p>
            </div>

            <div className="mt-4">
              <a 
                href="http://localhost:6010" 
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Main App
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}