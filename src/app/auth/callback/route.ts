import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin, hash } = new URL(request.url)
  const code = searchParams.get('code')
  const sessionToken = searchParams.get('session')
  const next = searchParams.get('next') ?? '/'

  // Check for error parameters that might come from Supabase
  const error = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')

  // Check for tokens in URL fragment (when Supabase doesn't use our callback)
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')
  const tokenType = searchParams.get('token_type')
  const expiresAt = searchParams.get('expires_at')
  const type = searchParams.get('type')

  console.log('🔄 Auth callback received:')
  console.log('🔄 Full URL:', request.url)
  console.log('🔄 Code:', code ? 'present' : 'missing')
  console.log('🔄 Session token:', sessionToken ? `present (${sessionToken.length} chars)` : 'missing')
  console.log('🔄 Next:', next)
  console.log('🔄 Error:', error || 'none')
  console.log('🔄 Error code:', errorCode || 'none')
  console.log('🔄 Error description:', errorDescription || 'none')

  // Handle tokens passed in URL parameters (alternative flow)
  console.log('🔄 Alternative token flow:')
  console.log('🔄 Access token:', accessToken ? 'present' : 'missing')
  console.log('🔄 Refresh token:', refreshToken ? 'present' : 'missing')
  console.log('🔄 Token type:', tokenType || 'none')
  console.log('🔄 Expires at:', expiresAt || 'none')
  console.log('🔄 Type:', type || 'none')

  // Handle errors from Supabase (like expired tokens)
  if (error) {
    console.error('🔄 Supabase error in callback:', { error, errorCode, errorDescription })

    if (errorCode === 'otp_expired') {
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=expired&message=${encodeURIComponent('Email confirmation link has expired. Please request a new one.')}`)
    }

    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${error}&message=${encodeURIComponent(errorDescription || 'Authentication error occurred')}`)
  }

  // Handle direct token flow (when Supabase doesn't use our callback properly)
  if (accessToken && refreshToken && type === 'signup') {
    console.log('🔄 Handling direct token flow - Supabase bypassed our callback')

    try {
      // Create a server-side Supabase client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Set the session using the tokens provided
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      console.log('🔄 Direct token session result:', {
        hasData: !!data,
        hasSession: !!data?.session,
        hasUser: !!data?.user,
        sessionError: sessionError ? {
          message: sessionError.message,
          status: sessionError.status
        } : null
      })

      if (sessionError) {
        console.error('🔄 Error setting session from direct tokens:', sessionError)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=session_failed&message=${encodeURIComponent('Failed to establish session from tokens')}`)
      }

      if (data.session) {
        console.log('✅ Successfully authenticated user via direct tokens:', data.user?.email)

        // Create user profile if it doesn't exist
        if (data.user) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
              id: data.user.id,
              email: data.user.email || null,
              full_name: data.user.user_metadata?.full_name || null,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })

          if (profileError) {
            console.error('Error creating/updating user profile:', profileError)
          }
        }

        // Check if this is part of a cross-application authentication flow
        if (sessionToken && data.user) {
          try {
            // Complete the auth session and get redirect information
            const { data: sessionData, error: sessionError } = await supabase.rpc('complete_auth_session', {
              session_token: sessionToken,
              authenticated_user_id: data.user.id
            })

            if (!sessionError && sessionData && sessionData.length > 0) {
              const { redirect_url, state } = sessionData[0]

              console.log('🎯 Retrieved redirect_url from session:', redirect_url)
              console.log('🎯 redirect_url length:', redirect_url.length)

              // Build the redirect URL with success parameters
              const redirectUrl = new URL(redirect_url)
              console.log('🔗 Base redirectUrl created:', redirectUrl.toString())

              redirectUrl.searchParams.set('auth_success', 'true')
              if (data.user) {
                redirectUrl.searchParams.set('user_id', data.user.id)
              }
              console.log('🔗 After adding auth_success and user_id:', redirectUrl.toString())
              console.log('🔗 Current length:', redirectUrl.toString().length)

              if (state) {
                console.log('🎯 Adding state:', JSON.stringify(state))
                console.log('🎯 State length:', JSON.stringify(state).length)
                redirectUrl.searchParams.set('state', JSON.stringify(state))
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

              console.log('🚀 Final redirect URL (direct tokens):', redirectUrl.toString())
              return NextResponse.redirect(redirectUrl.toString())
            } else {
              console.error('Error completing auth session:', sessionError)
            }
          } catch (sessionError) {
            console.error('Error processing auth session:', sessionError)
          }
        }

        // Default redirect to the next URL or home page
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (error) {
      console.error('Unexpected error in direct token flow:', error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }
  }

  if (code) {
    try {
      console.log('🔄 Processing auth code:', code.substring(0, 10) + '...')
      console.log('🔄 Server time:', new Date().toISOString())
      
      // Create a server-side Supabase client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Exchange the code for a session
      console.log('🔄 Attempting to exchange code for session...')
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('🔄 Exchange result:', {
        hasData: !!data,
        hasSession: !!data?.session,
        hasUser: !!data?.user,
        error: error ? {
          message: error.message,
          status: error.status,
          name: error.name
        } : null
      })
      
      if (error) {
        console.error('🔄 Detailed error exchanging code for session:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack
        })
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=exchange_failed&message=${encodeURIComponent(error.message)}`)
      }

      if (data.session) {
        console.log('Successfully authenticated user:', data.user?.email)
        
        // Create user profile if it doesn't exist
        if (data.user) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
              id: data.user.id,
              email: data.user.email || null,
              full_name: data.user.user_metadata?.full_name || null,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })

          if (profileError) {
            console.error('Error creating/updating user profile:', profileError)
          }
        }

        // Check if this is part of a cross-application authentication flow
        if (sessionToken) {
          try {
            // Complete the auth session and get redirect information
            const { data: sessionData, error: sessionError } = await supabase.rpc('complete_auth_session', {
              session_token: sessionToken,
              authenticated_user_id: data.user.id
            })

            if (!sessionError && sessionData && sessionData.length > 0) {
              const { redirect_url, state } = sessionData[0]
              
              console.log('🎯 Retrieved redirect_url from session:', redirect_url)
              console.log('🎯 redirect_url length:', redirect_url.length)
              
              // Build the redirect URL with success parameters
              const redirectUrl = new URL(redirect_url)
              console.log('🔗 Base redirectUrl created:', redirectUrl.toString())
              
              redirectUrl.searchParams.set('auth_success', 'true')
              redirectUrl.searchParams.set('user_id', data.user.id)
              console.log('🔗 After adding auth_success and user_id:', redirectUrl.toString())
              console.log('🔗 Current length:', redirectUrl.toString().length)
              
              if (state) {
                console.log('🎯 Adding state:', JSON.stringify(state))
                console.log('🎯 State length:', JSON.stringify(state).length)
                redirectUrl.searchParams.set('state', JSON.stringify(state))
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

              console.log('🚀 Final redirect URL:', redirectUrl.toString())
              return NextResponse.redirect(redirectUrl.toString())
            } else {
              console.error('Error completing auth session:', sessionError)
            }
          } catch (sessionError) {
            console.error('Error processing auth session:', sessionError)
          }
        }

        // Default redirect to the next URL or home page
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }
  }

  // If no code, redirect to home
  return NextResponse.redirect(`${origin}/`)
}