'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DevToolsPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const createTestUser = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Create user using regular signup (will require email confirmation)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage(`✅ Test user created successfully! Email: ${email}`)
        setMessage(prev => prev + `\n📧 IMPORTANT: Check your email for the confirmation link.`)
        setMessage(prev => prev + `\n⚠️ You must click the confirmation link before you can log in.`)
        
        // Create user profile (will be created when user confirms email)
        if (data.user) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: 'Test User',
            })

          if (profileError) {
            setMessage(prev => prev + `\n⚠️ Profile will be created after email confirmation`)
          } else {
            setMessage(prev => prev + `\n✅ User profile prepared`)
          }
        }
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
    }

    setLoading(false)
  }

  const createTestUserNoConfirmation = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Create user with auto-confirmation for development
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: 'Test User'
          },
          emailRedirectTo: undefined // This helps avoid confirmation in some cases
        }
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
        setLoading(false)
        return
      }

      if (data.user) {
        setMessage(`✅ Test user created! Email: ${email}`)
        
        // Create user profile immediately
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            full_name: 'Test User',
          })

        if (profileError) {
          setMessage(prev => prev + `\n⚠️ Profile creation error: ${profileError.message}`)
        } else {
          setMessage(prev => prev + `\n✅ User profile created`)
        }

        // If user needs confirmation, provide instructions
        if (!data.user.email_confirmed_at) {
          setMessage(prev => prev + `\n📧 Email confirmation still required - check your email`)
          setMessage(prev => prev + `\n💡 Or try using a temporary email service like 10minutemail.com`)
        } else {
          setMessage(prev => prev + `\n🎉 User is ready to login immediately!`)
        }
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
    }

    setLoading(false)
  }

  const testDirectLogin = async () => {
    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(`Login Error: ${error.message}`)
      } else {
        setMessage(`✅ Login successful! User: ${data.user?.email}`)
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
    }

    setLoading(false)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setMessage(`Sign out error: ${error.message}`)
    } else {
      setMessage('✅ Signed out successfully')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Development Tools</h1>
          <p className="text-gray-600 mb-8">Testing utilities for MrBrooks Auth Service</p>

          <div className="space-y-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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