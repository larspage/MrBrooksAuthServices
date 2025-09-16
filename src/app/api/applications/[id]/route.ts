import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

type Application = Database['public']['Tables']['applications']['Row']
type ApplicationUpdate = Database['public']['Tables']['applications']['Update']

// GET /api/applications/[id] - Get specific application (admin only)
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

    // Get application
    const { data: application, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      console.error('Error fetching application:', error)
      return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 })
    }

    return NextResponse.json({ application })
  } catch (error) {
    console.error('Unexpected error in GET /api/applications/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/applications/[id] - Update application (admin only)
export async function PUT(
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

    // Parse request body
    const body = await request.json()
    const { name, description, status, configuration } = body

    // Validate at least one field is provided
    if (!name && !description && !status && !configuration) {
      return NextResponse.json({ error: 'At least one field must be provided for update' }, { status: 400 })
    }

    // Build update object
    const updateData: ApplicationUpdate = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (status !== undefined) updateData.status = status
    if (configuration !== undefined) updateData.configuration = configuration

    // Update application
    const { data: application, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      console.error('Error updating application:', error)
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
    }

    return NextResponse.json({ application })
  } catch (error) {
    console.error('Unexpected error in PUT /api/applications/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/applications/[id] - Delete application (admin only)
export async function DELETE(
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

    // Check if application exists and get related data count
    const { data: application, error: fetchError } = await supabase
      .from('applications')
      .select(`
        *,
        membership_tiers(count),
        user_memberships(count)
      `)
      .eq('id', params.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      console.error('Error fetching application for deletion:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 })
    }

    // Check if application has active memberships
    const membershipCount = (application as any).user_memberships?.[0]?.count || 0
    if (membershipCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete application with active memberships. Please remove all memberships first.' 
      }, { status: 409 })
    }

    // Delete application (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('applications')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting application:', deleteError)
      return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Application deleted successfully' })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/applications/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}