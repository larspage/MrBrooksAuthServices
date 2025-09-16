'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Application = Database['public']['Tables']['applications']['Row']
type MembershipTier = Database['public']['Tables']['membership_tiers']['Row']

interface MembershipTierManagerProps {
  application: Application
}

interface TierFormData {
  name: string
  slug: string
  description: string
  tier_level: number
  features: string[]
}

export function MembershipTierManager({ application }: MembershipTierManagerProps) {
  const [tiers, setTiers] = useState<MembershipTier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTier, setEditingTier] = useState<string | null>(null)
  const [formData, setFormData] = useState<TierFormData>({
    name: '',
    slug: '',
    description: '',
    tier_level: 0,
    features: []
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchTiers()
  }, [application.id])

  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_tiers')
        .select('*')
        .eq('application_id', application.id)
        .order('tier_level', { ascending: true })

      if (error) throw error
      setTiers(data || [])
    } catch (error: any) {
      console.error('Error fetching tiers:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

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

  const handleFeatureAdd = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }))
  }

  const handleFeatureChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((feature, i) => i === index ? value : feature)
    }))
  }

  const handleFeatureRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      tier_level: 0,
      features: []
    })
    setEditingTier(null)
    setShowForm(false)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const tierData = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        tier_level: formData.tier_level,
        features: formData.features.filter(f => f.trim()).length > 0 ? formData.features.filter(f => f.trim()) : null
      }

      if (editingTier) {
        // Update existing tier
        const { data, error } = await supabase
          .from('membership_tiers')
          .update(tierData)
          .eq('id', editingTier)
          .select()
          .single()

        if (error) throw error

        setTiers(prev => prev.map(tier => tier.id === editingTier ? data : tier))
      } else {
        // Create new tier
        const { data, error } = await supabase
          .from('membership_tiers')
          .insert({
            ...tierData,
            application_id: application.id
          })
          .select()
          .single()

        if (error) throw error

        setTiers(prev => [...prev, data].sort((a, b) => (a.tier_level || 0) - (b.tier_level || 0)))
      }

      resetForm()
    } catch (error: any) {
      console.error('Error saving tier:', error)
      setError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (tier: MembershipTier) => {
    setFormData({
      name: tier.name,
      slug: tier.slug,
      description: tier.description || '',
      tier_level: tier.tier_level || 0,
      features: Array.isArray(tier.features) ? tier.features.filter((f): f is string => typeof f === 'string') : []
    })
    setEditingTier(tier.id)
    setShowForm(true)
  }

  const handleDelete = async (tierId: string, tierName: string) => {
    if (!confirm(`Are you sure you want to delete the "${tierName}" tier? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('membership_tiers')
        .delete()
        .eq('id', tierId)

      if (error) throw error

      setTiers(prev => prev.filter(tier => tier.id !== tierId))
    } catch (error: any) {
      console.error('Error deleting tier:', error)
      setError(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading membership tiers...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Membership Tiers</h3>
          <p className="text-sm text-gray-500">Manage membership tiers for {application.name}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Add Tier
        </button>
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

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingTier ? 'Edit Membership Tier' : 'Create New Membership Tier'}
          </h4>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Basic, Premium, Enterprise..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="basic, premium, enterprise..."
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tier Level</label>
              <input
                type="number"
                value={formData.tier_level}
                onChange={(e) => setFormData(prev => ({ ...prev, tier_level: parseInt(e.target.value) || 0 }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="0"
                min="0"
              />
              <p className="mt-1 text-sm text-gray-500">Higher numbers indicate higher tiers</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Brief description of this tier..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Features</label>
                <button
                  type="button"
                  onClick={handleFeatureAdd}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Add Feature
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => handleFeatureChange(index, e.target.value)}
                      className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Feature description..."
                    />
                    <button
                      type="button"
                      onClick={() => handleFeatureRemove(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : (editingTier ? 'Update Tier' : 'Create Tier')}
              </button>
            </div>
          </form>
        </div>
      )}

      {tiers.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No membership tiers</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first membership tier.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {tiers.map((tier) => (
              <li key={tier.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-gray-900">{tier.name}</h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Level {tier.tier_level || 0}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Slug: <code className="bg-gray-100 px-1 rounded">{tier.slug}</code></span>
                    </div>
                    {tier.description && (
                      <p className="mt-2 text-sm text-gray-600">{tier.description}</p>
                    )}
                    {tier.features && Array.isArray(tier.features) && tier.features.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">Features:</p>
                        <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                          {tier.features
                            .filter((feature): feature is string => typeof feature === 'string')
                            .map((feature, index) => (
                              <li key={index}>{feature}</li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(tier)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tier.id, tier.name)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
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