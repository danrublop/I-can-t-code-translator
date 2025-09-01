import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          preferred_languages: string[]
          experience_level: string
          use_case: string
          notifications: boolean
          theme: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preferred_languages: string[]
          experience_level: string
          use_case: string
          notifications: boolean
          theme: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preferred_languages?: string[]
          experience_level?: string
          use_case?: string
          notifications?: boolean
          theme?: string
          created_at?: string
          updated_at?: string
        }
      }
      downloads: {
        Row: {
          id: string
          user_id: string
          device_fingerprint: string
          platform: string
          version: string
          user_agent: string | null
          ip_address: string | null
          downloaded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          device_fingerprint: string
          platform: string
          version: string
          user_agent?: string | null
          ip_address?: string | null
          downloaded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          device_fingerprint?: string
          platform?: string
          version?: string
          user_agent?: string | null
          ip_address?: string | null
          downloaded_at?: string
        }
      }
    }
  }
}
