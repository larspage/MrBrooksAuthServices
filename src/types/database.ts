export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      applications: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          api_keys: Json | null
          configuration: Json | null
          created_at: string
          updated_at: string
          status: 'active' | 'inactive' | 'development'
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          api_keys?: Json | null
          configuration?: Json | null
          created_at?: string
          updated_at?: string
          status?: 'active' | 'inactive' | 'development'
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          api_keys?: Json | null
          configuration?: Json | null
          created_at?: string
          updated_at?: string
          status?: 'active' | 'inactive' | 'development'
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      membership_tiers: {
        Row: {
          id: string
          application_id: string
          name: string
          slug: string
          description: string | null
          features: Json | null
          tier_level: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id: string
          name: string
          slug: string
          description?: string | null
          features?: Json | null
          tier_level?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          name?: string
          slug?: string
          description?: string | null
          features?: Json | null
          tier_level?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      pricing_plans: {
        Row: {
          id: string
          membership_tier_id: string
          billing_period: 'monthly' | 'yearly'
          price_cents: number
          currency: string
          stripe_price_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          membership_tier_id: string
          billing_period: 'monthly' | 'yearly'
          price_cents: number
          currency?: string
          stripe_price_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          membership_tier_id?: string
          billing_period?: 'monthly' | 'yearly'
          price_cents?: number
          currency?: string
          stripe_price_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_memberships: {
        Row: {
          id: string
          user_id: string
          application_id: string
          membership_tier_id: string | null
          pricing_plan_id: string | null
          stripe_subscription_id: string | null
          status: 'active' | 'inactive' | 'past_due' | 'canceled'
          started_at: string | null
          ends_at: string | null
          renewal_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          application_id: string
          membership_tier_id?: string | null
          pricing_plan_id?: string | null
          stripe_subscription_id?: string | null
          status?: 'active' | 'inactive' | 'past_due' | 'canceled'
          started_at?: string | null
          ends_at?: string | null
          renewal_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          application_id?: string
          membership_tier_id?: string | null
          pricing_plan_id?: string | null
          stripe_subscription_id?: string | null
          status?: 'active' | 'inactive' | 'past_due' | 'canceled'
          started_at?: string | null
          ends_at?: string | null
          renewal_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      membership_bundles: {
        Row: {
          id: string
          name: string
          description: string | null
          application_ids: string[]
          monthly_price_cents: number | null
          yearly_price_cents: number | null
          stripe_monthly_price_id: string | null
          stripe_yearly_price_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          application_ids: string[]
          monthly_price_cents?: number | null
          yearly_price_cents?: number | null
          stripe_monthly_price_id?: string | null
          stripe_yearly_price_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          application_ids?: string[]
          monthly_price_cents?: number | null
          yearly_price_cents?: number | null
          stripe_monthly_price_id?: string | null
          stripe_yearly_price_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: string
          old_values: Json | null
          new_values: Json | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: string
          old_values?: Json | null
          new_values?: Json | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: string
          old_values?: Json | null
          new_values?: Json | null
          user_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_application_context: {
        Args: {
          app_id: string
        }
        Returns: undefined
      }
      get_application_context: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      application_status: 'active' | 'inactive' | 'development'
      billing_period: 'monthly' | 'yearly'
      membership_status: 'active' | 'inactive' | 'past_due' | 'canceled'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}