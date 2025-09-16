'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Application = Database['public']['Tables']['applications']['Row']
type ApplicationInsert = Database['public']['Tables']['applications']['Insert']

interface ApplicationRegistrationFormProps {
  onApplicationCreated: (application: Application) => void
  onCancel: () => void
}

export function ApplicationRegistrationForm({ 
  onApplicationCreated, 
  onCancel 
}: ApplicationRegistrationFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    status: 'development' as const
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Application name is required')
      return false
    }
    if (!formData.slug.trim()) {
      setError('Application slug is required')
      return false
    }
    if (formData.slug.length < 3) {
      setError('Application slug must be at least 3 characters')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) return

    setLoading(true)

    try {
      // Check if slug already exists
      const { data: existingApp } = await supabase
        .from('applications')
        .select('id')
        .eq('slug', formData.slug)
        .single()

      if (existingApp) {
        setError('An application with this slug already exists')
        setLoading(false)
        return
      }

      // Generate API keys
      const apiKeys = {
        public_key: `pk_${formData.slug}_${Date.now()}`,
        secret_key: `sk_${formData.slug}_${Date.now()}_${Math.random().toString(36).substring(2)}`
      }

      const applicationData: ApplicationInsert = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
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

      const { data, error } = await supabase
        .from('applications')
        .insert(applicationData)
        .select()
        .single()

      if (error) throw error

      onApplicationCreated(data)
    } catch (error: any) {
      console.error('Error creating application:', error)
      setError(error.message || 'Failed to create application')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Register New Application</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
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

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Application Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="My Awesome App"
            required
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
            Application Slug *
          </label>
          <input
            type="text"
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="my-awesome-app"
            pattern="[a-z0-9-]+"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Used in API calls and URLs. Only lowercase letters, numbers, and hyphens allowed.
          </p>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Brief description of your application..."
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Initial Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="development">Development</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Application'}
          </button>
        </div>
      </form>
    </div>
  )
}