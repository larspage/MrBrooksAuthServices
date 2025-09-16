import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

// POST /api/auth/verify - Verify user authentication and authorization for an application
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Parse request body
    const body = await request.json()
    const { application_id, user_token, required_tier_level } = body

    // Validate required fields
    if (!application_id) {
      return NextResponse.json({ error: 'application_id is required' }, { status: 400 })
    }

    // Verify application exists and is active
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, name, status')
      .eq('id', application_id)
      .eq('status', 'active')
      .single()

    if (appError || !application) {
      return NextResponse.json({ 
        error: 'Invalid or inactive application',
        authorized: false 
      }, { status: 404 })
    }

    // If no user token provided, return application info only
    if (!user_token) {
      return NextResponse.json({
        authorized: false,
        application: {
          id: application.id,
          name: application.name
        }
      })
    }

    // Verify user token
    const { data: { user }, error: userError } = await supabase.auth.getUser(user_token)
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Invalid user token',
        authorized: false 
      }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ 
        error: 'User profile not found',
        authorized: false 
      }, { status: 404 })
    }

    // Get user membership for this application
    const { data: membership, error: membershipError } = await supabase
      .from('user_memberships')
      .select(`
        *,
        membership_tier:membership_tiers(
          id,
          name,
          tier_level,
          features
        )
      `)
      .eq('user_id', user.id)
      .eq('application_id', application_id)
      .eq('status', 'active')
      .single()

    // Check if user has required tier level
    let hasRequiredTier = true
    if (required_tier_level && membership?.membership_tier) {
      const userTierLevel = (membership.membership_tier as any).tier_level || 0
      hasRequiredTier = userTierLevel >= required_tier_level
    }

    // Build response
    const response = {
      authorized: !!membership && hasRequiredTier,
      user: {
        id: user.id,
        email: user.email,
        profile: {
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        }
      },
      application: {
        id: application.id,
        name: application.name
      },
      membership: membership ? {
        id: membership.id,
        status: membership.status,
        tier: membership.membership_tier ? {
          id: (membership.membership_tier as any).id,
          name: (membership.membership_tier as any).name,
          tier_level: (membership.membership_tier as any).tier_level,
          features: (membership.membership_tier as any).features
        } : null,
        started_at: membership.started_at,
        ends_at: membership.ends_at
      } : null
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in POST /api/auth/verify:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      authorized: false 
    }, { status: 500 })
  }
}

// GET /api/auth/verify - Health check for auth service
export async function GET() {
  return NextResponse.json({
    service: 'MrBrooks Auth Service',
    status: 'operational',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
}