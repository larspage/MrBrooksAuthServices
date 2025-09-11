'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthTestPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        
        if (error) {
          setMessage(`Signup Error: ${error.message}`)
        } else {
          setMessage('Signup successful! Check your email for verification.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) {
          setMessage(`Login Error: ${error.message}`)
        } else {
          setMessage('Login successful!')
        }
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
    }
    
    setLoading(false)
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setMessage(`Sign out error: ${error.message}`)
    } else {
      setMessage('Signed out successfully')
    }
  }

  const testConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('count')
        .limit(1)
      
      if (error) {
        setMessage(`Connection Error: ${error.message}`)
      } else {
        setMessage('Database connection successful!')
      }
    } catch (error) {
      setMessage(`Connection Error: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-md rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Direct Auth Test
          </h1>
          
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded ${
                mode === 'login' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-4 rounded ${
                mode === 'signup' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Signup
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          
          <div className="mt-4 space-y-2">
            <button
              onClick={handleSignOut}
              className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Sign Out
            </button>
            
            <button
              onClick={testConnection}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Test DB Connection
            </button>
          </div>
          
          {message && (
            <div className="mt-4 p-3 bg-gray-100 border rounded-md">
              <p className="text-sm text-gray-700">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}