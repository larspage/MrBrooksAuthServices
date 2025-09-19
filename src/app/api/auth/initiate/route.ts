import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { applicationId, redirectUrl, userEmail, state, expiresInMinutes } = await request.json()

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

    // Call the database function to create auth session
    const { data, error } = await supabase.rpc('create_auth_session', {
      app_id: applicationId,
      redirect_url: redirectUrl,
      user_email: userEmail || null,
      session_state: state || null,
      expires_in_minutes: expiresInMinutes || 30
    })

    if (error) {
      console.error('Error creating auth session:', error)
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}