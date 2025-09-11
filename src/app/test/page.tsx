'use client'

import { useState } from 'react'
import AuthModal from '@/components/auth/AuthModal'

export default function TestPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')

  const handleAuthClick = (mode: 'login' | 'signup') => {
    setAuthMode(mode)
    setShowAuthModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Authentication Test
          </h1>
          
          <div className="space-y-4">
            <button
              onClick={() => handleAuthClick('login')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test Login
            </button>
            
            <button
              onClick={() => handleAuthClick('signup')}
              className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
            >
              Test Signup
            </button>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </div>
  )
}