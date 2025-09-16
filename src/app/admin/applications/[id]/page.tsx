'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase, isAdmin } from '@/lib/supabase'
import { Database } from '@/types/database'
import { MembershipTierManager } from '@/components/admin/MembershipTierManager'
import { UserManager } from '@/components/admin/UserManager'
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard'
import Link from 'next/link'

type Application = Database['public']['Tables']['applications']['Row']

export default function ApplicationDetails({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState<Application | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'tiers' | 'users' | 'analytics'>('overview')

  useEffect(() => {
    const checkAdminAndFetchApp = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const adminStatus = await isAdmin()
        setIsUserAdmin(adminStatus)
        
        if (adminStatus) {
          await fetchApplication()
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      checkAdminAndFetchApp()
    }
  }, [user, authLoading, params.id])

  const fetchApplication = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setApplication(data)
    } catch (error) {
      console.error('Error fetching application:', error)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application details...</p>
        </div>
      </div>
    )
  }

  if (!user || !isUserAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You do not have admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Not Found</h1>
          <p className="text-gray-600 mb-4">The requested application could not be found.</p>
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">
            Back to Admin Portal
          </Link>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'development':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'inactive':
        return `${baseClasses} bg-gray-100 text-gray-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link 
              href="/admin"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Admin Portal
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-gray-900">{application.name}</h1>
                <span className={getStatusBadge(application.status)}>{application.status}</span>
              </div>
              <p className="mt-2 text-gray-600">
                Slug: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{application.slug}</code>
              </p>
              {application.description && (
                <p className="mt-2 text-gray-600">{application.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'tiers', name: 'Membership Tiers' },
              { id: 'users', name: 'Users' },
              { id: 'analytics', name: 'Analytics' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white shadow rounded-lg">
          {activeTab === 'overview' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Application Overview</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Basic Information</h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Created</dt>
                      <dd className="text-sm text-gray-900">{formatDate(application.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Last Updated</dt>
                      <dd className="text-sm text-gray-900">{formatDate(application.updated_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Status</dt>
                      <dd className="text-sm text-gray-900">
                        <span className={getStatusBadge(application.status)}>{application.status}</span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">API Keys</h4>
                  <div className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Public Key</dt>
                      <dd className="text-xs font-mono bg-gray-100 p-2 rounded">
                        {(application.api_keys as any)?.public_key || 'Not generated'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Secret Key</dt>
                      <dd className="text-xs font-mono bg-gray-100 p-2 rounded">
                        {(application.api_keys as any)?.secret_key || 'Not generated'}
                      </dd>
                    </div>
                  </div>
                </div>
              </div>

              {application.configuration && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Configuration</h4>
                  <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
                    {JSON.stringify(application.configuration, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tiers' && (
            <div className="p-6">
              <MembershipTierManager application={application} />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="p-6">
              <UserManager application={application} />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-6">
              <AnalyticsDashboard application={application} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}