import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

type Application = Database['public']['Tables']['applications']['Row']
type ApplicationInsert = Database['public']['Tables']['applications']['Insert']

// GET /api/applications - List all applications (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: isAdminResult, error: adminError } = await supabase.rpc('is_admin')
    if (adminError || !isAdminResult) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get applications
    const { data: applications, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching applications:', error)
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    return NextResponse.json({ applications })
  } catch (error) {
    console.error('Unexpected error in GET /api/applications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/applications - Create new application (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: isAdminResult, error: adminError } = await supabase.rpc('is_admin')
    if (adminError || !isAdminResult) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { name, slug, description, status = 'development' } = body

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // Check if slug already exists
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingApp) {
      return NextResponse.json({ error: 'Application with this slug already exists' }, { status: 409 })
    }

    // Generate API keys
    const apiKeys = {
      public_key: `pk_${slug}_${Date.now()}`,
      secret_key: `sk_${slug}_${Date.now()}_${Math.random().toString(36).substring(2)}`
    }

    // Create application
    const applicationData: ApplicationInsert = {
      name: name.trim(),
      slug: slug.trim(),
      description: description?.trim() || null,
      status,
      api_keys: apiKeys,
      configuration: {
        auth_settings: {
          require_email_confirmation: true,
          allow_signups: true,
          session_timeout: 3600
        },
        cors_origins: [],
        webhook_endpoints: []
      }
    }

    const { data: application, error } = await supabase
      .from('applications')
      .insert(applicationData)
      .select()
      .single()

    if (error) {
      console.error('Error creating application:', error)
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
    }

    return NextResponse.json({ application }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/applications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}