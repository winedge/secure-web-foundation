export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      ai_feedback: {
        Row: {
          action_type: string
          campaign_id: string | null
          created_at: string
          feedback_text: string | null
          firm_id: string
          id: string
          outcome_metrics: Json | null
          rating: string | null
          recommendation: Json | null
          was_applied: boolean | null
        }
        Insert: {
          action_type: string
          campaign_id?: string | null
          created_at?: string
          feedback_text?: string | null
          firm_id: string
          id?: string
          outcome_metrics?: Json | null
          rating?: string | null
          recommendation?: Json | null
          was_applied?: boolean | null
        }
        Update: {
          action_type?: string
          campaign_id?: string | null
          created_at?: string
          feedback_text?: string | null
          firm_id?: string
          id?: string
          outcome_metrics?: Json | null
          rating?: string | null
          recommendation?: Json | null
          was_applied?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_performance_snapshots: {
        Row: {
          ai_action_applied: string | null
          campaign_id: string | null
          captured_at: string
          created_at: string
          firm_id: string
          id: string
          metrics: Json
          snapshot_type: string
          target_states: string[] | null
          tort_type: string | null
        }
        Insert: {
          ai_action_applied?: string | null
          campaign_id?: string | null
          captured_at?: string
          created_at?: string
          firm_id: string
          id?: string
          metrics: Json
          snapshot_type: string
          target_states?: string[] | null
          tort_type?: string | null
        }
        Update: {
          ai_action_applied?: string | null
          campaign_id?: string | null
          captured_at?: string
          created_at?: string
          firm_id?: string
          id?: string
          metrics?: Json
          snapshot_type?: string
          target_states?: string[] | null
          tort_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_performance_snapshots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_performance_snapshots_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      autopilot_logs: {
        Row: {
          action_taken: string
          ai_reasoning: string | null
          campaign_id: string | null
          created_at: string
          details: Json | null
          firm_id: string
          id: string
          rule_id: string
        }
        Insert: {
          action_taken: string
          ai_reasoning?: string | null
          campaign_id?: string | null
          created_at?: string
          details?: Json | null
          firm_id: string
          id?: string
          rule_id: string
        }
        Update: {
          action_taken?: string
          ai_reasoning?: string | null
          campaign_id?: string | null
          created_at?: string
          details?: Json | null
          firm_id?: string
          id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autopilot_logs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autopilot_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "autopilot_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_rules: {
        Row: {
          actions: Json
          campaign_id: string | null
          conditions: Json
          created_at: string
          firm_id: string
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          rule_type: string
          trigger_count: number | null
          updated_at: string
        }
        Insert: {
          actions: Json
          campaign_id?: string | null
          conditions: Json
          created_at?: string
          firm_id: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          rule_type: string
          trigger_count?: number | null
          updated_at?: string
        }
        Update: {
          actions?: Json
          campaign_id?: string | null
          conditions?: Json
          created_at?: string
          firm_id?: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          rule_type?: string
          trigger_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autopilot_rules_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_reallocation_logs: {
        Row: {
          ai_confidence: number | null
          amount_moved: number | null
          applied: boolean | null
          campaign_id: string
          created_at: string
          from_ad_set_id: string | null
          from_budget: number | null
          id: string
          reason: string | null
          to_ad_set_id: string | null
          to_budget: number | null
        }
        Insert: {
          ai_confidence?: number | null
          amount_moved?: number | null
          applied?: boolean | null
          campaign_id: string
          created_at?: string
          from_ad_set_id?: string | null
          from_budget?: number | null
          id?: string
          reason?: string | null
          to_ad_set_id?: string | null
          to_budget?: number | null
        }
        Update: {
          ai_confidence?: number | null
          amount_moved?: number | null
          applied?: boolean | null
          campaign_id?: string
          created_at?: string
          from_ad_set_id?: string | null
          from_budget?: number | null
          id?: string
          reason?: string | null
          to_ad_set_id?: string | null
          to_budget?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_reallocation_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_reallocation_logs_from_ad_set_id_fkey"
            columns: ["from_ad_set_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_reallocation_logs_to_ad_set_id_fkey"
            columns: ["to_ad_set_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          daily_budget: number | null
          firm_id: string
          id: string
          name: string
          status: string | null
          target_age_max: number | null
          target_age_min: number | null
          target_states: string[] | null
          tort_type: string
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_budget?: number | null
          firm_id: string
          id?: string
          name: string
          status?: string | null
          target_age_max?: number | null
          target_age_min?: number | null
          target_states?: string[] | null
          tort_type: string
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_budget?: number | null
          firm_id?: string
          id?: string
          name?: string
          status?: string | null
          target_age_max?: number | null
          target_age_min?: number | null
          target_states?: string[] | null
          tort_type?: string
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_logs: {
        Row: {
          consent_type: string
          consented: boolean
          created_at: string
          id: string
          ip_address: string | null
          lead_id: string | null
          user_agent: string | null
        }
        Insert: {
          consent_type: string
          consented: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          user_agent?: string | null
        }
        Update: {
          consent_type?: string
          consented?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          duplicate_of: string | null
          email: string | null
          external_id: string | null
          firm_id: string | null
          first_name: string | null
          id: string
          is_duplicate: boolean | null
          last_name: string | null
          lead_id: string | null
          metadata: Json | null
          phone: string | null
          source_id: string | null
          state: string | null
          status: Database["public"]["Enums"]["contact_status"] | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          duplicate_of?: string | null
          email?: string | null
          external_id?: string | null
          firm_id?: string | null
          first_name?: string | null
          id?: string
          is_duplicate?: boolean | null
          last_name?: string | null
          lead_id?: string | null
          metadata?: Json | null
          phone?: string | null
          source_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["contact_status"] | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          duplicate_of?: string | null
          email?: string | null
          external_id?: string | null
          firm_id?: string | null
          first_name?: string | null
          id?: string
          is_duplicate?: boolean | null
          last_name?: string | null
          lead_id?: string | null
          metadata?: Json | null
          phone?: string | null
          source_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["contact_status"] | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_branding: {
        Row: {
          accent_color: string | null
          background_color: string | null
          chatbot_agent_name: string | null
          chatbot_avatar_url: string | null
          chatbot_enabled: boolean | null
          created_at: string
          custom_fields: Json | null
          description_text: string | null
          firm_display_name: string | null
          firm_id: string
          heading_text: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          slug: string
          updated_at: string
          visible_fields: Json | null
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          chatbot_agent_name?: string | null
          chatbot_avatar_url?: string | null
          chatbot_enabled?: boolean | null
          created_at?: string
          custom_fields?: Json | null
          description_text?: string | null
          firm_display_name?: string | null
          firm_id: string
          heading_text?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          slug: string
          updated_at?: string
          visible_fields?: Json | null
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          chatbot_agent_name?: string | null
          chatbot_avatar_url?: string | null
          chatbot_enabled?: boolean | null
          created_at?: string
          custom_fields?: Json | null
          description_text?: string | null
          firm_display_name?: string | null
          firm_id?: string
          heading_text?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          slug?: string
          updated_at?: string
          visible_fields?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "firm_branding_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_members: {
        Row: {
          created_at: string
          firm_id: string
          id: string
          is_owner: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          firm_id: string
          id?: string
          is_owner?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          firm_id?: string
          id?: string
          is_owner?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_members_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          practice_type: string | null
          states: string[] | null
          stripe_customer_id: string | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_status: string | null
          updated_at: string
          wallet_balance: number | null
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          practice_type?: string | null
          states?: string[] | null
          stripe_customer_id?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_status?: string | null
          updated_at?: string
          wallet_balance?: number | null
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          practice_type?: string | null
          states?: string[] | null
          stripe_customer_id?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_status?: string | null
          updated_at?: string
          wallet_balance?: number | null
          website?: string | null
        }
        Relationships: []
      }
      journey_data: {
        Row: {
          contact_id: string
          created_at: string
          duration_seconds: number | null
          entered_at: string
          exited_at: string | null
          id: string
          metadata: Json | null
          stage: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          duration_seconds?: number | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          metadata?: Json | null
          stage: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          duration_seconds?: number | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          metadata?: Json | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_data_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_purchases: {
        Row: {
          amount: number
          firm_id: string
          id: string
          lead_id: string
          payment_method: string | null
          purchased_at: string
          stripe_payment_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          firm_id: string
          id?: string
          lead_id: string
          payment_method?: string | null
          purchased_at?: string
          stripe_payment_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          firm_id?: string
          id?: string
          lead_id?: string
          payment_method?: string | null
          purchased_at?: string
          stripe_payment_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_purchases_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          configuration: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          source_type: Database["public"]["Enums"]["lead_source_type"]
          updated_at: string
        }
        Insert: {
          configuration?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          source_type: Database["public"]["Enums"]["lead_source_type"]
          updated_at?: string
        }
        Update: {
          configuration?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          source_type?: Database["public"]["Enums"]["lead_source_type"]
          updated_at?: string
        }
        Relationships: []
      }
      lead_statuses: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          contact_id: string | null
          created_at: string
          id: string
          lead_id: string
          metadata: Json | null
          previous_status: string | null
          status: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          metadata?: Json | null
          previous_status?: string | null
          status: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
          previous_status?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_statuses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_statuses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_statuses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          age_bucket: string | null
          ai_quality_score: number | null
          campaign_id: string | null
          city: string | null
          consent_hipaa: boolean | null
          consent_privacy: boolean | null
          consent_tcpa: boolean | null
          created_at: string
          diagnosis_details: string | null
          documents_url: string[] | null
          duplicate_of: string | null
          email: string | null
          exposure_details: string | null
          external_id: string | null
          first_name: string | null
          fraud_risk_score: number | null
          id: string
          ingested_at: string | null
          is_duplicate: boolean | null
          is_exclusive: boolean | null
          is_verified: boolean | null
          last_name: string | null
          metadata: Json | null
          phone: string | null
          price: number
          source: string | null
          source_id: string | null
          state: string
          status: Database["public"]["Enums"]["lead_status"] | null
          tier: Database["public"]["Enums"]["lead_tier"]
          tort_type: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          age_bucket?: string | null
          ai_quality_score?: number | null
          campaign_id?: string | null
          city?: string | null
          consent_hipaa?: boolean | null
          consent_privacy?: boolean | null
          consent_tcpa?: boolean | null
          created_at?: string
          diagnosis_details?: string | null
          documents_url?: string[] | null
          duplicate_of?: string | null
          email?: string | null
          exposure_details?: string | null
          external_id?: string | null
          first_name?: string | null
          fraud_risk_score?: number | null
          id?: string
          ingested_at?: string | null
          is_duplicate?: boolean | null
          is_exclusive?: boolean | null
          is_verified?: boolean | null
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          price: number
          source?: string | null
          source_id?: string | null
          state: string
          status?: Database["public"]["Enums"]["lead_status"] | null
          tier?: Database["public"]["Enums"]["lead_tier"]
          tort_type: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          age_bucket?: string | null
          ai_quality_score?: number | null
          campaign_id?: string | null
          city?: string | null
          consent_hipaa?: boolean | null
          consent_privacy?: boolean | null
          consent_tcpa?: boolean | null
          created_at?: string
          diagnosis_details?: string | null
          documents_url?: string[] | null
          duplicate_of?: string | null
          email?: string | null
          exposure_details?: string | null
          external_id?: string | null
          first_name?: string | null
          fraud_risk_score?: number | null
          id?: string
          ingested_at?: string | null
          is_duplicate?: boolean | null
          is_exclusive?: boolean | null
          is_verified?: boolean | null
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          price?: number
          source?: string | null
          source_id?: string | null
          state?: string
          status?: Database["public"]["Enums"]["lead_status"] | null
          tier?: Database["public"]["Enums"]["lead_tier"]
          tort_type?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ad_sets: {
        Row: {
          age_max: number | null
          age_min: number | null
          bid_amount: number | null
          campaign_id: string
          created_at: string
          custom_audience_id: string | null
          daily_budget: number | null
          genders: string[] | null
          id: string
          interests: Json | null
          locations: Json | null
          lookalike_audience_id: string | null
          meta_adset_id: string | null
          name: string
          optimization_event: string | null
          placement_type: string | null
          placements: string[] | null
          status: string
          targeting: Json | null
          updated_at: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          bid_amount?: number | null
          campaign_id: string
          created_at?: string
          custom_audience_id?: string | null
          daily_budget?: number | null
          genders?: string[] | null
          id?: string
          interests?: Json | null
          locations?: Json | null
          lookalike_audience_id?: string | null
          meta_adset_id?: string | null
          name: string
          optimization_event?: string | null
          placement_type?: string | null
          placements?: string[] | null
          status?: string
          targeting?: Json | null
          updated_at?: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          bid_amount?: number | null
          campaign_id?: string
          created_at?: string
          custom_audience_id?: string | null
          daily_budget?: number | null
          genders?: string[] | null
          id?: string
          interests?: Json | null
          locations?: Json | null
          lookalike_audience_id?: string | null
          meta_adset_id?: string | null
          name?: string
          optimization_event?: string | null
          placement_type?: string | null
          placements?: string[] | null
          status?: string
          targeting?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ad_sets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads: {
        Row: {
          ad_set_id: string
          ai_generated: boolean | null
          ai_score: number | null
          body_text: string | null
          call_to_action: string | null
          created_at: string
          creative_type: string | null
          description: string | null
          display_link: string | null
          headline: string | null
          id: string
          image_url: string | null
          link_url: string | null
          meta_ad_id: string | null
          name: string
          status: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          ad_set_id: string
          ai_generated?: boolean | null
          ai_score?: number | null
          body_text?: string | null
          call_to_action?: string | null
          created_at?: string
          creative_type?: string | null
          description?: string | null
          display_link?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          meta_ad_id?: string | null
          name: string
          status?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          ad_set_id?: string
          ai_generated?: boolean | null
          ai_score?: number | null
          body_text?: string | null
          call_to_action?: string | null
          created_at?: string
          creative_type?: string | null
          description?: string | null
          display_link?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          meta_ad_id?: string | null
          name?: string
          status?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_ad_set_id_fkey"
            columns: ["ad_set_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ai_logs: {
        Row: {
          action_type: string
          applied: boolean | null
          applied_at: string | null
          campaign_id: string
          created_at: string
          description: string | null
          id: string
          recommendation: Json | null
        }
        Insert: {
          action_type: string
          applied?: boolean | null
          applied_at?: string | null
          campaign_id: string
          created_at?: string
          description?: string | null
          id?: string
          recommendation?: Json | null
        }
        Update: {
          action_type?: string
          applied?: boolean | null
          applied_at?: string | null
          campaign_id?: string
          created_at?: string
          description?: string | null
          id?: string
          recommendation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_ai_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_campaign_analytics: {
        Row: {
          ad_id: string | null
          ad_set_id: string | null
          campaign_id: string
          clicks: number | null
          conversions: number | null
          cpc: number | null
          cpl: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          date: string
          frequency: number | null
          id: string
          impressions: number | null
          leads: number | null
          reach: number | null
          spend: number | null
        }
        Insert: {
          ad_id?: string | null
          ad_set_id?: string | null
          campaign_id: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          reach?: number | null
          spend?: number | null
        }
        Update: {
          ad_id?: string | null
          ad_set_id?: string | null
          campaign_id?: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          reach?: number | null
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_campaign_analytics_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "meta_ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_campaign_analytics_ad_set_id_fkey"
            columns: ["ad_set_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_campaigns: {
        Row: {
          ai_recommendations: Json | null
          bid_strategy: string | null
          created_at: string
          daily_budget: number | null
          end_date: string | null
          firm_id: string
          id: string
          lifetime_budget: number | null
          meta_campaign_id: string | null
          name: string
          objective: string
          optimization_goal: string | null
          start_date: string | null
          status: string
          target_states: string[] | null
          tort_type: string | null
          updated_at: string
        }
        Insert: {
          ai_recommendations?: Json | null
          bid_strategy?: string | null
          created_at?: string
          daily_budget?: number | null
          end_date?: string | null
          firm_id: string
          id?: string
          lifetime_budget?: number | null
          meta_campaign_id?: string | null
          name: string
          objective?: string
          optimization_goal?: string | null
          start_date?: string | null
          status?: string
          target_states?: string[] | null
          tort_type?: string | null
          updated_at?: string
        }
        Update: {
          ai_recommendations?: Json | null
          bid_strategy?: string | null
          created_at?: string
          daily_budget?: number | null
          end_date?: string | null
          firm_id?: string
          id?: string
          lifetime_budget?: number | null
          meta_campaign_id?: string | null
          name?: string
          objective?: string
          optimization_goal?: string | null
          start_date?: string | null
          status?: string
          target_states?: string[] | null
          tort_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_campaigns_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          contact_id: string | null
          content: string
          created_at: string
          firm_id: string | null
          id: string
          is_pinned: boolean | null
          lead_id: string | null
          metadata: Json | null
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          content: string
          created_at?: string
          firm_id?: string | null
          id?: string
          is_pinned?: boolean | null
          lead_id?: string | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          content?: string
          created_at?: string
          firm_id?: string | null
          id?: string
          is_pinned?: boolean | null
          lead_id?: string | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          firm_id: string
          id: string
          notify_email: string | null
          notify_new_leads: boolean
          states: string[] | null
          tort_types: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          firm_id: string
          id?: string
          notify_email?: string | null
          notify_new_leads?: boolean
          states?: string[] | null
          tort_types?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          firm_id?: string
          id?: string
          notify_email?: string | null
          notify_new_leads?: boolean
          states?: string[] | null
          tort_types?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: true
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connections: {
        Row: {
          access_token: string | null
          connected_at: string | null
          created_at: string
          firm_id: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          page_access_token: string | null
          page_id: string | null
          page_name: string | null
          permissions: string[] | null
          platform: string
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string
          firm_id?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          page_access_token?: string | null
          page_id?: string | null
          page_name?: string | null
          permissions?: string[] | null
          platform: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string
          firm_id?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          page_access_token?: string | null
          page_id?: string | null
          page_name?: string | null
          permissions?: string[] | null
          platform?: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      report_schedules: {
        Row: {
          config: Json | null
          created_at: string
          created_by: string
          emails: string[]
          firm_id: string
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          next_send_at: string | null
          report_type: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          created_by: string
          emails?: string[]
          firm_id: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          next_send_at?: string | null
          report_type?: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          created_by?: string
          emails?: string[]
          firm_id?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          next_send_at?: string | null
          report_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          ai_generated: boolean | null
          ai_prompt: string | null
          content: string
          created_at: string
          engagement_metrics: Json | null
          error_message: string | null
          firm_id: string | null
          hashtags: string[] | null
          id: string
          media_type: string | null
          media_urls: string[] | null
          plagiarism_checked: boolean | null
          plagiarism_score: number | null
          platform_post_ids: Json | null
          platforms: string[]
          published_at: string | null
          scheduled_at: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          ai_prompt?: string | null
          content: string
          created_at?: string
          engagement_metrics?: Json | null
          error_message?: string | null
          firm_id?: string | null
          hashtags?: string[] | null
          id?: string
          media_type?: string | null
          media_urls?: string[] | null
          plagiarism_checked?: boolean | null
          plagiarism_score?: number | null
          platform_post_ids?: Json | null
          platforms?: string[]
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean | null
          ai_prompt?: string | null
          content?: string
          created_at?: string
          engagement_metrics?: Json | null
          error_message?: string | null
          firm_id?: string | null
          hashtags?: string[] | null
          id?: string
          media_type?: string | null
          media_urls?: string[] | null
          plagiarism_checked?: boolean | null
          plagiarism_score?: number | null
          platform_post_ids?: Json | null
          platforms?: string[]
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      tort_types: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          firm_id: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          firm_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          firm_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tort_types_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      touchpoints: {
        Row: {
          channel: string | null
          completed_at: string | null
          contact_id: string | null
          content: string | null
          created_at: string
          direction: string | null
          duration_seconds: number | null
          firm_id: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          outcome: string | null
          scheduled_at: string | null
          subject: string | null
          touchpoint_type: Database["public"]["Enums"]["touchpoint_type"]
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          completed_at?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          direction?: string | null
          duration_seconds?: number | null
          firm_id?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          outcome?: string | null
          scheduled_at?: string | null
          subject?: string | null
          touchpoint_type: Database["public"]["Enums"]["touchpoint_type"]
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          completed_at?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          direction?: string | null
          duration_seconds?: number | null
          firm_id?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          outcome?: string | null
          scheduled_at?: string | null
          subject?: string | null
          touchpoint_type?: Database["public"]["Enums"]["touchpoint_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "touchpoints_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "touchpoints_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "touchpoints_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "touchpoints_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leads_marketplace: {
        Row: {
          age_bucket: string | null
          ai_quality_score: number | null
          created_at: string | null
          id: string | null
          is_exclusive: boolean | null
          is_verified: boolean | null
          price: number | null
          state: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          tier: Database["public"]["Enums"]["lead_tier"] | null
          tort_type: string | null
        }
        Insert: {
          age_bucket?: string | null
          ai_quality_score?: number | null
          created_at?: string | null
          id?: string | null
          is_exclusive?: boolean | null
          is_verified?: boolean | null
          price?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          tier?: Database["public"]["Enums"]["lead_tier"] | null
          tort_type?: string | null
        }
        Update: {
          age_bucket?: string | null
          ai_quality_score?: number | null
          created_at?: string | null
          id?: string | null
          is_exclusive?: boolean | null
          is_verified?: boolean | null
          price?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          tier?: Database["public"]["Enums"]["lead_tier"] | null
          tort_type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_firm_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_firm_owner: {
        Args: { _firm_id: string; _user_id: string }
        Returns: boolean
      }
      match_lead_to_firms: {
        Args: { _lead_id: string }
        Returns: {
          firm_id: string
          firm_name: string
          match_score: number
        }[]
      }
      purchase_lead: {
        Args: { _firm_id: string; _lead_id: string; _user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "firm_owner" | "firm_staff" | "claimant"
      contact_status:
        | "new"
        | "contacted"
        | "qualified"
        | "nurturing"
        | "converted"
        | "lost"
        | "do_not_contact"
      lead_source_type:
        | "csv_upload"
        | "google_ads"
        | "meta_ads"
        | "dialer"
        | "crm"
        | "intake_form"
        | "referral"
        | "other"
      lead_status: "available" | "purchased" | "expired" | "flagged"
      lead_tier: "A" | "B" | "C" | "D"
      subscription_plan: "basic" | "premium"
      touchpoint_type:
        | "call"
        | "email"
        | "sms"
        | "meeting"
        | "note"
        | "status_change"
        | "document"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "firm_owner", "firm_staff", "claimant"],
      contact_status: [
        "new",
        "contacted",
        "qualified",
        "nurturing",
        "converted",
        "lost",
        "do_not_contact",
      ],
      lead_source_type: [
        "csv_upload",
        "google_ads",
        "meta_ads",
        "dialer",
        "crm",
        "intake_form",
        "referral",
        "other",
      ],
      lead_status: ["available", "purchased", "expired", "flagged"],
      lead_tier: ["A", "B", "C", "D"],
      subscription_plan: ["basic", "premium"],
      touchpoint_type: [
        "call",
        "email",
        "sms",
        "meeting",
        "note",
        "status_change",
        "document",
        "other",
      ],
    },
  },
} as const
