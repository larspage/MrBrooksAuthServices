'use client'

import { useState, useEffect } from 'react'
import { supabase, isAdmin } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from '@/components/auth/AuthModal'
import UserProfile from '@/components/auth/UserProfile'
import Link from 'next/link'

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [isUserAdmin, setIsUserAdmin] = useState(false)

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('count')
          .limit(1)
        
        if (error) {
          setError(error.message)
          setIsConnected(false)
        } else {
          setIsConnected(true)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setIsConnected(false)
      }
    }

    const checkAdminStatus = async () => {
      if (user) {
        try {
          const adminStatus = await isAdmin()
          setIsUserAdmin(adminStatus)
        } catch (error) {
          console.error('Error checking admin status:', error)
          setIsUserAdmin(false)
        }
      } else {
        setIsUserAdmin(false)
      }
    }

    testConnection()
    if (!authLoading) {
      checkAdminStatus()
    }
  }, [user, authLoading])

  const handleAuthClick = (mode: 'login' | 'signup') => {
    setAuthMode(mode)
    setShowAuthModal(true)
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="card max-w-2xl mx-auto text-center">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                MrBrooks Auth Service
              </h1>
              <p className="text-lg text-gray-600">
                Multi-tenant authentication and subscription management service
              </p>
            </div>
            
            {!user && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAuthClick('login')}
                  className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleAuthClick('signup')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* User Profile Section */}
          {user && (
            <div className="mb-8">
              <UserProfile />
            </div>
          )}

          {/* Database Connection Status */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Database Connection Status
            </h2>
            
            {isConnected === null && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Testing connection...</span>
              </div>
            )}
            
            {isConnected === true && (
              <div className="flex items-center justify-center text-green-600">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Connected to Supabase successfully!</span>
              </div>
            )}
            
            {isConnected === false && (
              <div className="text-red-600">
                <div className="flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="font-medium">Connection failed</span>
                </div>
                {error && (
                  <p className="text-sm text-gray-600 bg-gray-100 p-3 rounded-md">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Phase 1: Foundation</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ Project setup</li>
                <li>✅ Database schema</li>
                <li>✅ RLS policies</li>
                <li>✅ Basic authentication</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Next Steps</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ User registration</li>
                <li>✅ Login functionality</li>
                <li>🔄 Admin portal MVP</li>
                <li>🔲 Multi-app authorization</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-4 justify-center">
            <button className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              View Documentation
            </button>
            {user && isUserAdmin && (
              <Link
                href="/admin"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 inline-block"
              >
                Admin Portal
              </Link>
            )}
            {user && !isUserAdmin && (
              <Link
                href="/admin-setup"
                className="px-6 py-2 border border-orange-300 text-orange-700 rounded hover:bg-orange-50 inline-block"
              >
                Setup Admin Access
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </main>
  )
}