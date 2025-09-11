import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Helper function to set application context for RLS
export const setApplicationContext = async (applicationId: string) => {
  const { error } = await supabase.rpc('set_application_context', {
    app_id: applicationId
  })
  
  if (error) {
    console.error('Error setting application context:', error)
    throw error
  }
}

// Helper function to get current application context
export const getApplicationContext = async () => {
  const { data, error } = await supabase.rpc('get_application_context')
  
  if (error) {
    console.error('Error getting application context:', error)
    throw error
  }
  
  return data
}

// Helper function to check if user is admin
export const isAdmin = async () => {
  const { data, error } = await supabase.rpc('is_admin')
  
  if (error) {
    console.error('Error checking admin status:', error)
    return false
  }
  
  return data
}