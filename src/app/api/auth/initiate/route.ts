import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Import security and validation
import { sanitizeInput, isAllowedRedirectUrl } from '@/lib/security'
import { authInitiateSchema, safeValidateInput } from '@/lib/validation'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  // Check if origin is allowed
  const { isOriginAllowed } = await import('@/lib/security')
  const allowed = isOriginAllowed(origin, referer)
  
  if (!allowed) {
    return new NextResponse(null, { status: 403 })
  }
  
  // Build allowed origin header
  const allowedOrigin = origin || referer ? new URL(origin || referer).origin : '*'
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    // Parse raw body first
    const rawBody = await request.json()
    
    // Normalize field names for backward compatibility
    // Accept both old format (applicationId) and new format (application_id)
    const body = {
      application_id: rawBody.application_id || rawBody.applicationId,
      redirect_url: rawBody.redirect_url || rawBody.redirectUrl,
      user_email: rawBody.user_email || rawBody.userEmail,
      session_state: rawBody.session_state || rawBody.state,
      expires_in_minutes: rawBody.expires_in_minutes || rawBody.expiresInMinutes,
    }
    
    // Validate with Zod schema
    const validation = safeValidateInput(authInitiateSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error },
        { status: 400 }
      )
    }
    
    const { application_id, redirect_url, user_email, session_state, expires_in_minutes } = validation.data
    
    // Sanitize inputs (defense in depth)
    const applicationId = sanitizeInput(application_id)
    const redirectUrl = redirect_url ? sanitizeInput(redirect_url) : undefined
    const userEmail = user_email ? sanitizeInput(user_email) : undefined
    const state = session_state ? sanitizeInput(session_state) : undefined
    const expiresInMinutes = expires_in_minutes

    console.log('🚀 Auth initiate request received:')
    console.log('🏢 Application ID:', applicationId)
    console.log('🔗 Incoming redirectUrl:', redirectUrl)
    console.log('🔗 redirectUrl length:', redirectUrl ? redirectUrl.length : 'undefined')
    console.log('📧 User email:', userEmail || 'not provided')
    console.log('🎯 State:', state ? JSON.stringify(state) : 'not provided')
    console.log('🎯 State length:', state ? JSON.stringify(state).length : 0)
    console.log('⏰ Expires in minutes:', expiresInMinutes || 30)

    // Check for potential URL length issues early
    if (redirectUrl && redirectUrl.length > 2048) {
      console.warn('⚠️ WARNING: Incoming redirectUrl exceeds 2048 characters, may cause issues later')
    }
    if (redirectUrl && redirectUrl.length > 8192) {
      console.error('❌ ERROR: Incoming redirectUrl exceeds 8192 characters, likely to cause failures')
    }

    // Validate required parameters
    if (!applicationId || !redirectUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters: applicationId and redirectUrl' },
        { status: 400 }
      )
    }

    // Create server-side Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Extract user agent and IP for enhanced error logging
    const userAgent = request.headers.get('user-agent') || undefined
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || undefined

    // Call the enhanced database function to create auth session
    const { data, error } = await supabase.rpc('create_auth_session_enhanced', {
      app_id: applicationId,
      redirect_url: redirectUrl,
      user_email: userEmail || null,
      session_state: state || null,
      expires_in_minutes: expiresInMinutes || 30,
      user_agent: userAgent,
      ip_address: ipAddress
    })

    if (error) {
      console.error('Error creating auth session:', error)
      
      // Check if this is a redirect validation error
      if (error.message?.includes('Invalid redirect URL')) {
        console.error('❌ REDIRECT VALIDATION FAILED')
        console.error('📋 Check audit_logs table for detailed instructions on configuring allowed redirect URLs')
        return NextResponse.json(
          {
            error: 'Invalid redirect URL for application',
            details: 'The provided redirect URL is not allowed for this application. Check the server logs or audit_logs table for instructions on how to configure allowed redirect URLs.',
            applicationId: applicationId,
            redirectUrl: redirectUrl
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create authentication session' },
        { status: 500 }
      )
    }

    const sessionToken = data
    const { origin } = new URL(request.url)

    console.log('✅ Auth session created successfully')
    console.log('🎫 Generated session token:', sessionToken)
    console.log('🎫 Session token length:', sessionToken.length)

    // Return the authentication URL that the client application should redirect to
    const authUrl = `${origin}/auth/login?session=${sessionToken}`
    console.log('🔗 Generated authUrl:', authUrl)
    console.log('🔗 authUrl length:', authUrl.length)

    return NextResponse.json({
      success: true,
      sessionToken,
      authUrl,
      expiresAt: new Date(Date.now() + (expiresInMinutes || 30) * 60 * 1000).toISOString()
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

  } catch (error) {
    console.error('Error in auth initiate:', error)
    
    // Check if this is a redirect validation error
    if (error instanceof Error && error.message?.includes('Invalid redirect URL')) {
      console.error('❌ REDIRECT VALIDATION FAILED')
      console.error('📋 Check audit_logs table for detailed instructions on configuring allowed redirect URLs')
      return NextResponse.json(
        {
          error: 'Invalid redirect URL for application',
          details: 'The provided redirect URL is not allowed for this application. Check the server logs or audit_logs table for instructions on how to configure allowed redirect URLs.'
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}