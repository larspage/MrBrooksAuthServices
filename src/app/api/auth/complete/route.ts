import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { sessionToken, userId } = await request.json()

    console.log('🏁 Auth complete request received:')
    console.log('🎫 Session token:', sessionToken)
    console.log('🎫 Session token length:', sessionToken ? sessionToken.length : 'undefined')
    console.log('👤 User ID:', userId)

    // Validate required parameters
    if (!sessionToken || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: sessionToken and userId' },
        { status: 400 }
      )
    }

    // Create server-side Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Call the database function to complete auth session
    const { data, error } = await supabase.rpc('complete_auth_session', {
      session_token: sessionToken,
      authenticated_user_id: userId
    })

    if (error) {
      console.error('Error completing auth session:', error)
      return NextResponse.json(
        { error: 'Failed to complete authentication session' },
        { status: 500 }
      )
    }

    // The function returns application_id, redirect_url, and state
    const sessionData = data[0]
    if (!sessionData) {
      console.error('❌ No session data found for token:', sessionToken)
      return NextResponse.json(
        { error: 'Invalid or expired session token' },
        { status: 400 }
      )
    }

    console.log('✅ Session data retrieved successfully:')
    console.log('🏢 Application ID:', sessionData.application_id)
    console.log('🔗 Retrieved redirectUrl:', sessionData.redirect_url)
    console.log('🔗 redirectUrl length:', sessionData.redirect_url ? sessionData.redirect_url.length : 'undefined')
    console.log('🎯 State:', sessionData.state ? JSON.stringify(sessionData.state) : 'not provided')
    console.log('🎯 State length:', sessionData.state ? JSON.stringify(sessionData.state).length : 0)

    // Check for potential URL length issues
    if (sessionData.redirect_url && sessionData.redirect_url.length > 2048) {
      console.warn('⚠️ WARNING: Retrieved redirectUrl exceeds 2048 characters, may cause issues')
    }
    if (sessionData.redirect_url && sessionData.redirect_url.length > 8192) {
      console.error('❌ ERROR: Retrieved redirectUrl exceeds 8192 characters, likely to cause failures')
    }

    return NextResponse.json({
      success: true,
      redirectUrl: sessionData.redirect_url,
      state: sessionData.state,
      applicationId: sessionData.application_id
    })

  } catch (error) {
    console.error('Error in auth complete:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}