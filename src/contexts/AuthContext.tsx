'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  metadata: any
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName?: string, sessionToken?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔐 Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()

        console.log('🔐 Session retrieval result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          error: error ? {
            message: error.message,
            status: error.status,
            name: error.name
          } : null
        })

        if (error) {
          console.error('🔐 Error getting session:', error)
        } else {
          console.log('🔐 Session retrieved:', session ? `User logged in: ${session.user?.email}` : 'No user')
        }

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          console.log('🔐 Fetching user profile for:', session.user.id)
          await fetchUserProfile(session.user.id)
        } else {
          console.log('🔐 No user in session, skipping profile fetch')
        }

        console.log('🔐 Setting loading to false')
        setLoading(false)
      } catch (error) {
        console.error('🔐 Exception in getInitialSession:', error)
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          userId: session?.user?.id
        })

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          console.log('🔐 Fetching profile for user:', session.user.id)
          await fetchUserProfile(session.user.id)
        } else {
          console.log('🔐 No user, clearing profile')
          setProfile(null)
        }

        console.log('🔐 Setting loading to false after auth state change')
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error)
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const signUp = async (email: string, password: string, fullName?: string, sessionToken?: string) => {
    try {
      // Build the redirect URL, including session token if provided
      let redirectUrl = `${window.location.origin}/auth/callback`
      console.log('🔗 Initial redirectUrl:', redirectUrl)
      console.log('🔗 redirectUrl length:', redirectUrl.length)
      
      if (sessionToken) {
        console.log('🎫 sessionToken provided:', sessionToken)
        console.log('🎫 sessionToken length:', sessionToken.length)
        redirectUrl += `?session=${sessionToken}`
        console.log('🔗 Final redirectUrl with session:', redirectUrl)
        console.log('🔗 Final redirectUrl length:', redirectUrl.length)
        
        // Check for potential URL length issues
        if (redirectUrl.length > 2048) {
          console.warn('⚠️ WARNING: redirectUrl exceeds 2048 characters, may cause issues with some browsers/email clients')
        }
        if (redirectUrl.length > 8192) {
          console.error('❌ ERROR: redirectUrl exceeds 8192 characters, likely to cause failures')
        }
      } else {
        console.log('🎫 No sessionToken provided')
      }

      console.log('📧 About to send signup request with emailRedirectTo:', redirectUrl)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: redirectUrl
        }
      })

      console.log('📧 Signup response:', {
        hasData: !!data,
        hasUser: !!data?.user,
        userConfirmed: data?.user?.email_confirmed_at,
        userId: data?.user?.id,
        error: error ? {
          message: error.message,
          status: error.status
        } : null
      })

      if (error) {
        console.error('📧 Signup error details:', error)
        return { error }
      }

      // Create user profile if signup was successful
      if (data.user && !error) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: data.user.email || null,
            full_name: fullName || null,
          } as any)

        if (profileError) {
          console.error('Error creating user profile:', profileError)
        }
      }

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      return { error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      return { error }
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('No user logged in') }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates as any)
        .eq('id', user.id)

      if (!error) {
        setProfile(prev => prev ? { ...prev, ...updates } : null)
      }

      return { error }
    } catch (error) {
      return { error }
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}