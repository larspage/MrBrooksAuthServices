'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Application = Database['public']['Tables']['applications']['Row']

interface AnalyticsDashboardProps {
  application: Application
}

interface AnalyticsData {
  totalUsers: number
  activeUsers: number
  totalTiers: number
  recentSignups: number
  membershipsByTier: { tier_name: string; count: number }[]
  membershipsByStatus: { status: string; count: number }[]
}

export function AnalyticsDashboard({ application }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [application.id, timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Calculate date range
      const now = new Date()
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      const startDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000))

      // Fetch total users with memberships
      const { data: totalUsersData, error: totalUsersError } = await supabase
        .from('user_memberships')
        .select('user_id')
        .eq('application_id', application.id)

      if (totalUsersError) throw totalUsersError

      const uniqueUsers = new Set(totalUsersData?.map(m => m.user_id) || [])
      const totalUsers = uniqueUsers.size

      // Fetch active users
      const { data: activeUsersData, error: activeUsersError } = await supabase
        .from('user_memberships')
        .select('user_id')
        .eq('application_id', application.id)
        .eq('status', 'active')

      if (activeUsersError) throw activeUsersError

      const uniqueActiveUsers = new Set(activeUsersData?.map(m => m.user_id) || [])
      const activeUsers = uniqueActiveUsers.size

      // Fetch total tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('membership_tiers')
        .select('id')
        .eq('application_id', application.id)

      if (tiersError) throw tiersError

      const totalTiers = tiersData?.length || 0

      // Fetch recent signups
      const { data: recentSignupsData, error: recentSignupsError } = await supabase
        .from('user_memberships')
        .select('id')
        .eq('application_id', application.id)
        .gte('created_at', startDate.toISOString())

      if (recentSignupsError) throw recentSignupsError

      const recentSignups = recentSignupsData?.length || 0

      // Fetch memberships by tier
      const { data: membershipsByTierData, error: membershipsByTierError } = await supabase
        .from('user_memberships')
        .select(`
          membership_tier:membership_tiers(name)
        `)
        .eq('application_id', application.id)
        .eq('status', 'active')

      if (membershipsByTierError) throw membershipsByTierError

      const tierCounts: { [key: string]: number } = {}
      membershipsByTierData?.forEach(membership => {
        const tierName = (membership.membership_tier as any)?.name || 'No Tier'
        tierCounts[tierName] = (tierCounts[tierName] || 0) + 1
      })

      const membershipsByTier = Object.entries(tierCounts).map(([tier_name, count]) => ({
        tier_name,
        count
      }))

      // Fetch memberships by status
      const { data: membershipsByStatusData, error: membershipsByStatusError } = await supabase
        .from('user_memberships')
        .select('status')
        .eq('application_id', application.id)

      if (membershipsByStatusError) throw membershipsByStatusError

      const statusCounts: { [key: string]: number } = {}
      membershipsByStatusData?.forEach(membership => {
        statusCounts[membership.status] = (statusCounts[membership.status] || 0) + 1
      })

      const membershipsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }))

      setAnalytics({
        totalUsers,
        activeUsers,
        totalTiers,
        recentSignups,
        membershipsByTier,
        membershipsByStatus
      })
    } catch (error: any) {
      console.error('Error fetching analytics:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800'
      case 'canceled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No analytics data available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Analytics Dashboard</h3>
          <p className="text-sm text-gray-500">Overview of {application.name} metrics</p>
        </div>
        <div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{analytics.totalUsers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{analytics.activeUsers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Membership Tiers</dt>
                  <dd className="text-lg font-medium text-gray-900">{analytics.totalTiers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Recent Signups</dt>
                  <dd className="text-lg font-medium text-gray-900">{analytics.recentSignups}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memberships by Tier */}
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Memberships by Tier</h4>
          {analytics.membershipsByTier.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active memberships</p>
          ) : (
            <div className="space-y-3">
              {analytics.membershipsByTier.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{item.tier_name}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.max(10, (item.count / Math.max(...analytics.membershipsByTier.map(t => t.count))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Memberships by Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Memberships by Status</h4>
          {analytics.membershipsByStatus.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No memberships</p>
          ) : (
            <div className="space-y-3">
              {analytics.membershipsByStatus.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.max(10, (item.count / Math.max(...analytics.membershipsByStatus.map(s => s.count))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}