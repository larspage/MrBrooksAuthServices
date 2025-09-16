import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

type MembershipTier = Database['public']['Tables']['membership_tiers']['Row']
type MembershipTierInsert = Database['public']['Tables']['membership_tiers']['Insert']

// GET /api/applications/[id]/tiers - List membership tiers for an application
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify application exists
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, name')
      .eq('id', params.id)
      .single()

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Get membership tiers
    const { data: tiers, error } = await supabase
      .from('membership_tiers')
      .select(`
        *,
        pricing_plans(*)
      `)
      .eq('application_id', params.id)
      .order('tier_level', { ascending: true })

    if (error) {
      console.error('Error fetching membership tiers:', error)
      return NextResponse.json({ error: 'Failed to fetch membership tiers' }, { status: 500 })
    }

    return NextResponse.json({ 
      application,
      tiers: tiers || []
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/applications/[id]/tiers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/applications/[id]/tiers - Create new membership tier
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify application exists
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', params.id)
      .single()

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { name, slug, description, features, tier_level } = body

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // Check if slug already exists for this application
    const { data: existingTier } = await supabase
      .from('membership_tiers')
      .select('id')
      .eq('application_id', params.id)
      .eq('slug', slug)
      .single()

    if (existingTier) {
      return NextResponse.json({ error: 'Membership tier with this slug already exists' }, { status: 409 })
    }

    // Create membership tier
    const tierData: MembershipTierInsert = {
      application_id: params.id,
      name: name.trim(),
      slug: slug.trim(),
      description: description?.trim() || null,
      features: features || null,
      tier_level: tier_level || 0
    }

    const { data: tier, error } = await supabase
      .from('membership_tiers')
      .insert(tierData)
      .select()
      .single()

    if (error) {
      console.error('Error creating membership tier:', error)
      return NextResponse.json({ error: 'Failed to create membership tier' }, { status: 500 })
    }

    return NextResponse.json({ tier }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/applications/[id]/tiers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}