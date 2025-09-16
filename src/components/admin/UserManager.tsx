'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Application = Database['public']['Tables']['applications']['Row']
type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type UserMembership = Database['public']['Tables']['user_memberships']['Row']
type MembershipTier = Database['public']['Tables']['membership_tiers']['Row']

interface UserManagerProps {
  application: Application
}

interface UserWithMembership extends UserProfile {
  user_memberships: (UserMembership & {
    membership_tier: MembershipTier | null
  })[]
}

export function UserManager({ application }: UserManagerProps) {
  const [users, setUsers] = useState<UserWithMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    fetchUsers()
  }, [application.id])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      // Get all users with memberships for this application
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user_memberships!inner(
            *,
            membership_tier:membership_tiers(*)
          )
        `)
        .eq('user_memberships.application_id', application.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setUsers(data as UserWithMembership[] || [])
    } catch (error: any) {
      console.error('Error fetching users:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateMembershipStatus = async (membershipId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('user_memberships')
        .update({ status: newStatus })
        .eq('id', membershipId)

      if (error) throw error

      // Refresh users list
      await fetchUsers()
    } catch (error: any) {
      console.error('Error updating membership status:', error)
      setError(error.message)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || 
      user.user_memberships.some(membership => 
        statusFilter === 'active' ? membership.status === 'active' : membership.status !== 'active'
      )

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'inactive':
        return `${baseClasses} bg-gray-100 text-gray-800`
      case 'past_due':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'canceled':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">User Management</h3>
          <p className="text-sm text-gray-500">Manage users and memberships for {application.name}</p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {error && (
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
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="all">All Users</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'No users have memberships for this application yet.'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <li key={user.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {user.avatar_url ? (
                          <img 
                            className="h-10 w-10 rounded-full" 
                            src={user.avatar_url} 
                            alt={user.full_name || 'User avatar'} 
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.full_name || 'Unnamed User'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    
                    {/* Memberships */}
                    <div className="mt-3 space-y-2">
                      {user.user_memberships.map((membership) => (
                        <div key={membership.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className={getStatusBadge(membership.status)}>{membership.status}</span>
                              {membership.membership_tier && (
                                <span className="text-sm text-gray-600">
                                  {membership.membership_tier.name}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              Started: {formatDate(membership.started_at)} • 
                              Ends: {formatDate(membership.ends_at)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {membership.status === 'active' ? (
                              <button
                                onClick={() => updateMembershipStatus(membership.id, 'inactive')}
                                className="text-red-600 hover:text-red-800 text-xs font-medium"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => updateMembershipStatus(membership.id, 'active')}
                                className="text-green-600 hover:text-green-800 text-xs font-medium"
                              >
                                Activate
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}