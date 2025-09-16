'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import Link from 'next/link'

type Application = Database['public']['Tables']['applications']['Row']

interface ApplicationsListProps {
  applications: Application[]
  onApplicationUpdated: (application: Application) => void
  onApplicationDeleted: (applicationId: string) => void
}

export function ApplicationsList({ 
  applications, 
  onApplicationUpdated, 
  onApplicationDeleted 
}: ApplicationsListProps) {
  const [editingApp, setEditingApp] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Application>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleEdit = (app: Application) => {
    setEditingApp(app.id)
    setEditForm({
      name: app.name,
      description: app.description,
      status: app.status
    })
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditingApp(null)
    setEditForm({})
    setError(null)
  }

  const handleSaveEdit = async (appId: string) => {
    setLoading(appId)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('applications')
        .update({
          name: editForm.name,
          description: editForm.description,
          status: editForm.status
        })
        .eq('id', appId)
        .select()
        .single()

      if (error) throw error

      onApplicationUpdated(data)
      setEditingApp(null)
      setEditForm({})
    } catch (error: any) {
      console.error('Error updating application:', error)
      setError(error.message || 'Failed to update application')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (appId: string, appName: string) => {
    if (!confirm(`Are you sure you want to delete "${appName}"? This action cannot be undone.`)) {
      return
    }

    setLoading(appId)
    setError(null)

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', appId)

      if (error) throw error

      onApplicationDeleted(appId)
    } catch (error: any) {
      console.error('Error deleting application:', error)
      setError(error.message || 'Failed to delete application')
    } finally {
      setLoading(null)
    }
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No applications</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by registering your first application.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {applications.map((app) => (
            <li key={app.id} className="px-6 py-4">
              {editingApp === app.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      rows={2}
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={editForm.status || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="development">Development</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(app.id)}
                      disabled={loading === app.id}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading === app.id ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900 truncate">{app.name}</h3>
                      <span className={getStatusBadge(app.status)}>{app.status}</span>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Slug: <code className="bg-gray-100 px-1 rounded">{app.slug}</code></span>
                      <span>Created: {formatDate(app.created_at)}</span>
                    </div>
                    {app.description && (
                      <p className="mt-2 text-sm text-gray-600">{app.description}</p>
                    )}
                    <div className="mt-2">
                      <details className="text-sm">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                          View API Keys
                        </summary>
                        <div className="mt-2 p-3 bg-gray-50 rounded-md">
                          <div className="space-y-2">
                            <div>
                              <span className="font-medium">Public Key:</span>
                              <code className="ml-2 bg-white px-2 py-1 rounded border text-xs">
                                {(app.api_keys as any)?.public_key || 'Not generated'}
                              </code>
                            </div>
                            <div>
                              <span className="font-medium">Secret Key:</span>
                              <code className="ml-2 bg-white px-2 py-1 rounded border text-xs">
                                {(app.api_keys as any)?.secret_key || 'Not generated'}
                              </code>
                            </div>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/admin/applications/${app.id}`}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Manage
                    </Link>
                    <button
                      onClick={() => handleEdit(app)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(app.id, app.name)}
                      disabled={loading === app.id}
                      className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                    >
                      {loading === app.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}