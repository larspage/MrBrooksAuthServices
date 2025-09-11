'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SimpleTestPage() {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const testLogin = async () => {
    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setMessage(`❌ Email not confirmed for ${email}`)
          setMessage(prev => prev + `\n\n📧 To fix this:`)
          setMessage(prev => prev + `\n1. Check your email inbox for a confirmation email`)
          setMessage(prev => prev + `\n2. Click the confirmation link in the email`)
          setMessage(prev => prev + `\n3. Return here and try logging in again`)
          setMessage(prev => prev + `\n\n💡 If you don't see the email, check your spam folder`)
        } else {
          setMessage(`❌ Login Error: ${error.message}`)
        }
      } else {
        setMessage(`✅ Login successful!`)
        setMessage(prev => prev + `\n👤 User: ${data.user?.email}`)
        setMessage(prev => prev + `\n🆔 ID: ${data.user?.id}`)
        setMessage(prev => prev + `\n✅ Email confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No'}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`)
    }

    setLoading(false)
  }

  const testSignup = async () => {
    setLoading(true)
    setMessage('')

    try {
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
        setMessage(`❌ Signup Error: ${error.message}`)
      } else {
        setMessage(`✅ Signup successful!`)
        setMessage(prev => prev + `\n📧 Confirmation email sent to: ${email}`)
        setMessage(prev => prev + `\n\n⚠️ IMPORTANT: You must confirm your email before you can log in`)
        setMessage(prev => prev + `\n1. Check your email inbox`)
        setMessage(prev => prev + `\n2. Click the confirmation link`)
        setMessage(prev => prev + `\n3. Then use the "Test Login" button`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`)
    }

    setLoading(false)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setMessage(`❌ Sign out error: ${error.message}`)
    } else {
      setMessage('✅ Signed out successfully')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Simple Authentication Test</h1>
          <p className="text-gray-600 mb-8">Test the complete email confirmation flow</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="test@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="password123"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={testSignup}
                disabled={loading || !email || !password}
                className="py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Creating...' : '1. Sign Up'}
              </button>

              <button
                onClick={testLogin}
                disabled={loading || !email || !password}
                className="py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Testing...' : '2. Test Login'}
              </button>

              <button
                onClick={signOut}
                className="py-3 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
              >
                3. Sign Out
              </button>
            </div>

            {message && (
              <div className="mt-6 p-4 bg-gray-100 border rounded-md">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{message}</pre>
              </div>
            )}

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-2">📋 Testing Steps</h3>
              <ol className="text-sm text-blue-700 space-y-1">
                <li><strong>1. Sign Up:</strong> Creates a new user account (requires email confirmation)</li>
                <li><strong>2. Check Email:</strong> Look for confirmation email in your inbox</li>
                <li><strong>3. Confirm:</strong> Click the confirmation link in the email</li>
                <li><strong>4. Test Login:</strong> Return here and test login with confirmed account</li>
              </ol>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Email Confirmation Required</h3>
              <p className="text-sm text-yellow-700">
                This is the standard Supabase authentication flow. All users must confirm their email address 
                before they can log in. This is a security feature that prevents unauthorized account creation.
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