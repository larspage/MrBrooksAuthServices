'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase, isAdmin } from '@/lib/supabase'
import { Database } from '@/types/database'
import { ApplicationRegistrationForm } from '@/components/admin/ApplicationRegistrationForm'
import { ApplicationsList } from '@/components/admin/ApplicationsList'

type Application = Database['public']['Tables']['applications']['Row']

export default function AdminPortal() {
  const { user, loading: authLoading } = useAuth()
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const adminStatus = await isAdmin()
        setIsUserAdmin(adminStatus)
        
        if (adminStatus) {
          await fetchApplications()
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      checkAdminStatus()
    }
  }, [user, authLoading])

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
    }
  }

  const handleApplicationCreated = (newApplication: Application) => {
    setApplications(prev => [newApplication, ...prev])
    setShowRegistrationForm(false)
  }

  const handleApplicationUpdated = (updatedApplication: Application) => {
    setApplications(prev => 
      prev.map(app => 
        app.id === updatedApplication.id ? updatedApplication : app
      )
    )
  }

  const handleApplicationDeleted = (deletedId: string) => {
    setApplications(prev => prev.filter(app => app.id !== deletedId))
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin portal...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please log in to access the admin portal.</p>
        </div>
      </div>
    )
  }

  if (!isUserAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You do not have admin privileges to access this portal.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Portal</h1>
          <p className="mt-2 text-gray-600">Manage applications and system settings</p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Applications</h2>
              <button
                onClick={() => setShowRegistrationForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Register New Application
              </button>
            </div>
          </div>

          <div className="p-6">
            {showRegistrationForm ? (
              <ApplicationRegistrationForm
                onApplicationCreated={handleApplicationCreated}
                onCancel={() => setShowRegistrationForm(false)}
              />
            ) : (
              <ApplicationsList
                applications={applications}
                onApplicationUpdated={handleApplicationUpdated}
                onApplicationDeleted={handleApplicationDeleted}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}