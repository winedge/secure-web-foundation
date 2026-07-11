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
      ai_case_evaluations: {
        Row: {
          created_at: string
          evaluated_at: string
          evaluation_details: Json | null
          firm_id: string
          id: string
          jurisdiction_notes: string | null
          lead_id: string
          model_version: string | null
          recommendations: string[] | null
          settlement_estimate_high: number | null
          settlement_estimate_low: number | null
          similar_cases_summary: string | null
          statute_of_limitations: string | null
          strengths: string[] | null
          viability_score: number
          weaknesses: string[] | null
        }
        Insert: {
          created_at?: string
          evaluated_at?: string
          evaluation_details?: Json | null
          firm_id: string
          id?: string
          jurisdiction_notes?: string | null
          lead_id: string
          model_version?: string | null
          recommendations?: string[] | null
          settlement_estimate_high?: number | null
          settlement_estimate_low?: number | null
          similar_cases_summary?: string | null
          statute_of_limitations?: string | null
          strengths?: string[] | null
          viability_score?: number
          weaknesses?: string[] | null
        }
        Update: {
          created_at?: string
          evaluated_at?: string
          evaluation_details?: Json | null
          firm_id?: string
          id?: string
          jurisdiction_notes?: string | null
          lead_id?: string
          model_version?: string | null
          recommendations?: string[] | null
          settlement_estimate_high?: number | null
          settlement_estimate_low?: number | null
          similar_cases_summary?: string | null
          statute_of_limitations?: string | null
          strengths?: string[] | null
          viability_score?: number
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_case_evaluations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_case_evaluations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_case_evaluations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_decision_consents: {
        Row: {
          acknowledged_at: string
          action_type: string
          firm_id: string | null
          id: string
          ip_address: string | null
          lead_id: string | null
          transparency_log_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          action_type: string
          firm_id?: string | null
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          transparency_log_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          action_type?: string
          firm_id?: string | null
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          transparency_log_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_decision_consents_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_decision_consents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_decision_consents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_decision_consents_transparency_log_id_fkey"
            columns: ["transparency_log_id"]
            isOneToOne: false
            referencedRelation: "ai_transparency_logs"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "ai_feedback_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_lead_scores: {
        Row: {
          conversion_probability: number
          created_at: string
          firm_id: string
          id: string
          lead_id: string
          model_version: string | null
          optimal_contact_time: string | null
          predicted_value: number | null
          recommended_action: string | null
          scored_at: string
          scoring_factors: Json | null
        }
        Insert: {
          conversion_probability?: number
          created_at?: string
          firm_id: string
          id?: string
          lead_id: string
          model_version?: string | null
          optimal_contact_time?: string | null
          predicted_value?: number | null
          recommended_action?: string | null
          scored_at?: string
          scoring_factors?: Json | null
        }
        Update: {
          conversion_probability?: number
          created_at?: string
          firm_id?: string
          id?: string
          lead_id?: string
          model_version?: string | null
          optimal_contact_time?: string | null
          predicted_value?: number | null
          recommended_action?: string | null
          scored_at?: string
          scoring_factors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_lead_scores_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_lead_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_lead_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
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
            foreignKeyName: "ai_performance_snapshots_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_seo_runs: {
        Row: {
          created_at: string
          error: string | null
          firm_id: string | null
          id: string
          input: Json
          model: string | null
          output: Json
          status: string
          tool: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          firm_id?: string | null
          id?: string
          input?: Json
          model?: string | null
          output?: Json
          status?: string
          tool: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          firm_id?: string | null
          id?: string
          input?: Json
          model?: string | null
          output?: Json
          status?: string
          tool?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_tool_results: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          firm_id: string
          id: string
          input_file_name: string | null
          input_file_url: string | null
          input_text: string | null
          model_used: string | null
          output_data: Json | null
          output_text: string | null
          status: string
          tokens_used: number | null
          tool_key: string
          updated_at: string
          user_id: string
          vertical_slug: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          firm_id: string
          id?: string
          input_file_name?: string | null
          input_file_url?: string | null
          input_text?: string | null
          model_used?: string | null
          output_data?: Json | null
          output_text?: string | null
          status?: string
          tokens_used?: number | null
          tool_key: string
          updated_at?: string
          user_id: string
          vertical_slug?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          firm_id?: string
          id?: string
          input_file_name?: string | null
          input_file_url?: string | null
          input_text?: string | null
          model_used?: string | null
          output_data?: Json | null
          output_text?: string | null
          status?: string
          tokens_used?: number | null
          tool_key?: string
          updated_at?: string
          user_id?: string
          vertical_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_results_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_transparency_logs: {
        Row: {
          action_type: string
          compliant_frameworks: string[] | null
          confidence_score: number | null
          created_at: string
          decision_factors: Json | null
          firm_id: string | null
          id: string
          input_summary: string | null
          lead_id: string | null
          model_name: string
          model_version: string | null
          output_summary: string | null
          processing_time_ms: number | null
        }
        Insert: {
          action_type: string
          compliant_frameworks?: string[] | null
          confidence_score?: number | null
          created_at?: string
          decision_factors?: Json | null
          firm_id?: string | null
          id?: string
          input_summary?: string | null
          lead_id?: string | null
          model_name: string
          model_version?: string | null
          output_summary?: string | null
          processing_time_ms?: number | null
        }
        Update: {
          action_type?: string
          compliant_frameworks?: string[] | null
          confidence_score?: number | null
          created_at?: string
          decision_factors?: Json | null
          firm_id?: string | null
          id?: string
          input_summary?: string | null
          lead_id?: string | null
          model_name?: string
          model_version?: string | null
          output_summary?: string | null
          processing_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_transparency_logs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_transparency_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_transparency_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_notifications: {
        Row: {
          alert_rule_id: string | null
          created_at: string
          firm_id: string
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          severity: string | null
          title: string
          user_id: string
        }
        Insert: {
          alert_rule_id?: string | null
          created_at?: string
          firm_id: string
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          severity?: string | null
          title: string
          user_id: string
        }
        Update: {
          alert_rule_id?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          severity?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_notifications_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_notifications_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          conditions: Json
          created_at: string
          firm_id: string
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          notify_email: boolean | null
          notify_in_app: boolean | null
          rule_type: string
          trigger_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          firm_id: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          notify_email?: boolean | null
          notify_in_app?: boolean | null
          rule_type: string
          trigger_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          firm_id?: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          notify_email?: boolean | null
          notify_in_app?: boolean | null
          rule_type?: string
          trigger_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      api_audit_log: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          ip: string | null
          latency_ms: number | null
          method: string
          path: string
          status: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          latency_ms?: number | null
          method: string
          path: string
          status: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          latency_ms?: number | null
          method?: string
          path?: string
          status?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_clients: {
        Row: {
          allowed_origins: string[]
          allowed_redirect_uris: string[]
          allowed_scopes: string[]
          client_id: string
          client_secret_hash: string
          created_at: string
          firm_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          allowed_origins?: string[]
          allowed_redirect_uris?: string[]
          allowed_scopes?: string[]
          client_id: string
          client_secret_hash: string
          created_at?: string
          firm_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          allowed_origins?: string[]
          allowed_redirect_uris?: string[]
          allowed_scopes?: string[]
          client_id?: string
          client_secret_hash?: string
          created_at?: string
          firm_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_clients_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      api_tokens: {
        Row: {
          client_id: string
          created_at: string
          expires_at: string
          id: string
          last_used_at: string | null
          refresh_token_hash: string
          revoked_at: string | null
          scopes: string[]
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_at: string
          id?: string
          last_used_at?: string | null
          refresh_token_hash: string
          revoked_at?: string | null
          scopes?: string[]
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_used_at?: string | null
          refresh_token_hash?: string
          revoked_at?: string | null
          scopes?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      api_webhook_subscriptions: {
        Row: {
          client_id: string
          created_at: string
          event: string
          firm_id: string
          id: string
          is_active: boolean
          signing_secret: string
          target_url: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          event: string
          firm_id: string
          id?: string
          is_active?: boolean
          signing_secret: string
          target_url: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          event?: string
          firm_id?: string
          id?: string
          is_active?: boolean
          signing_secret?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_webhook_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "api_webhook_subscriptions_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_profiles: {
        Row: {
          behavioral_signals: Json | null
          created_at: string
          demographics: Json | null
          estimated_reach: number | null
          firm_id: string
          id: string
          match_quality: number | null
          name: string
          psychographics: Json | null
          seed_data: Json | null
          status: string | null
          synced_platforms: string[] | null
          tort_type: string | null
          updated_at: string
        }
        Insert: {
          behavioral_signals?: Json | null
          created_at?: string
          demographics?: Json | null
          estimated_reach?: number | null
          firm_id: string
          id?: string
          match_quality?: number | null
          name: string
          psychographics?: Json | null
          seed_data?: Json | null
          status?: string | null
          synced_platforms?: string[] | null
          tort_type?: string | null
          updated_at?: string
        }
        Update: {
          behavioral_signals?: Json | null
          created_at?: string
          demographics?: Json | null
          estimated_reach?: number | null
          firm_id?: string
          id?: string
          match_quality?: number | null
          name?: string
          psychographics?: Json | null
          seed_data?: Json | null
          status?: string | null
          synced_platforms?: string[] | null
          tort_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audience_profiles_firm_id_fkey"
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
            foreignKeyName: "autopilot_rules_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      browser_sessions: {
        Row: {
          cookies: Json
          created_at: string
          health: string
          id: string
          label: string | null
          last_used_at: string | null
          marketplace: string
          storage_state: Json
          updated_at: string
        }
        Insert: {
          cookies?: Json
          created_at?: string
          health?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          marketplace: string
          storage_state?: Json
          updated_at?: string
        }
        Update: {
          cookies?: Json
          created_at?: string
          health?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          marketplace?: string
          storage_state?: Json
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
      }
      campaigns: {
        Row: {
          ab_test_hypothesis: string | null
          ad_body: string | null
          ad_cta: string | null
          ad_headline: string | null
          best_platform: string | null
          created_at: string
          daily_budget: number | null
          emotional_angle: string | null
          firm_id: string
          id: string
          name: string
          status: string | null
          target_age_max: number | null
          target_age_min: number | null
          target_hook: string | null
          target_states: string[] | null
          tort_type: string
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          ab_test_hypothesis?: string | null
          ad_body?: string | null
          ad_cta?: string | null
          ad_headline?: string | null
          best_platform?: string | null
          created_at?: string
          daily_budget?: number | null
          emotional_angle?: string | null
          firm_id: string
          id?: string
          name: string
          status?: string | null
          target_age_max?: number | null
          target_age_min?: number | null
          target_hook?: string | null
          target_states?: string[] | null
          tort_type: string
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          ab_test_hypothesis?: string | null
          ad_body?: string | null
          ad_cta?: string | null
          ad_headline?: string | null
          best_platform?: string | null
          created_at?: string
          daily_budget?: number | null
          emotional_angle?: string | null
          firm_id?: string
          id?: string
          name?: string
          status?: string | null
          target_age_max?: number | null
          target_age_min?: number | null
          target_hook?: string | null
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
      case_simulations: {
        Row: {
          created_at: string
          firm_id: string
          id: string
          judge_id: string | null
          jurisdiction: string
          lead_id: string | null
          recommended_strategy: string | null
          settlement_range_high: number | null
          settlement_range_low: number | null
          simulated_at: string
          simulation_results: Json
          tort_type: string
          win_probability: number | null
        }
        Insert: {
          created_at?: string
          firm_id: string
          id?: string
          judge_id?: string | null
          jurisdiction: string
          lead_id?: string | null
          recommended_strategy?: string | null
          settlement_range_high?: number | null
          settlement_range_low?: number | null
          simulated_at?: string
          simulation_results?: Json
          tort_type: string
          win_probability?: number | null
        }
        Update: {
          created_at?: string
          firm_id?: string
          id?: string
          judge_id?: string | null
          jurisdiction?: string
          lead_id?: string | null
          recommended_strategy?: string | null
          settlement_range_high?: number | null
          settlement_range_low?: number | null
          simulated_at?: string
          simulation_results?: Json
          tort_type?: string
          win_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "case_simulations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_simulations_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "judge_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_simulations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_simulations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      category_select_events: {
        Row: {
          allow_free_text_fallback: boolean
          category_count: number
          created_at: string
          firm_id: string | null
          id: string
          is_missing: boolean
          state: string
          user_id: string | null
          vertical_name: string | null
          vertical_slug: string
        }
        Insert: {
          allow_free_text_fallback?: boolean
          category_count?: number
          created_at?: string
          firm_id?: string | null
          id?: string
          is_missing?: boolean
          state: string
          user_id?: string | null
          vertical_name?: string | null
          vertical_slug: string
        }
        Update: {
          allow_free_text_fallback?: boolean
          category_count?: number
          created_at?: string
          firm_id?: string | null
          id?: string
          is_missing?: boolean
          state?: string
          user_id?: string | null
          vertical_name?: string | null
          vertical_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_select_events_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          created_by: string
          firm_id: string | null
          id: string
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          firm_id?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          firm_id?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_ad_creatives: {
        Row: {
          body: string | null
          created_at: string
          creative_id: string | null
          destination_url: string | null
          first_seen: string | null
          format: string | null
          headline: string | null
          id: string
          last_seen: string | null
          media_url: string | null
          raw: Json | null
          regions: string[] | null
          run_id: string
          transparency_url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          creative_id?: string | null
          destination_url?: string | null
          first_seen?: string | null
          format?: string | null
          headline?: string | null
          id?: string
          last_seen?: string | null
          media_url?: string | null
          raw?: Json | null
          regions?: string[] | null
          run_id: string
          transparency_url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          creative_id?: string | null
          destination_url?: string | null
          first_seen?: string | null
          format?: string | null
          headline?: string | null
          id?: string
          last_seen?: string | null
          media_url?: string | null
          raw?: Json | null
          regions?: string[] | null
          run_id?: string
          transparency_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_ad_creatives_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "competitor_ad_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_ad_runs: {
        Row: {
          advertiser_id: string | null
          advertiser_url: string | null
          ai_summary: Json | null
          brand: string | null
          created_at: string
          date_range: string | null
          domain: string | null
          error_message: string | null
          firm_id: string
          formats: string[] | null
          id: string
          region: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          advertiser_id?: string | null
          advertiser_url?: string | null
          ai_summary?: Json | null
          brand?: string | null
          created_at?: string
          date_range?: string | null
          domain?: string | null
          error_message?: string | null
          firm_id: string
          formats?: string[] | null
          id?: string
          region?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          advertiser_id?: string | null
          advertiser_url?: string | null
          ai_summary?: Json | null
          brand?: string | null
          created_at?: string
          date_range?: string | null
          domain?: string | null
          error_message?: string | null
          firm_id?: string
          formats?: string[] | null
          id?: string
          region?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      creative_image_jobs: {
        Row: {
          created_at: string
          error: string | null
          firm_id: string | null
          id: string
          provider: string
          request: Json
          result: Json | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          firm_id?: string | null
          id?: string
          provider: string
          request: Json
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          firm_id?: string | null
          id?: string
          provider?: string
          request?: Json
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      creative_studio_projects: {
        Row: {
          ai_score: number | null
          best_performer_id: string | null
          brand_tone: string | null
          brief: string | null
          created_at: string
          firm_id: string
          generated_variants: Json | null
          id: string
          name: string
          status: string | null
          target_audience: string | null
          tort_type: string | null
          updated_at: string
        }
        Insert: {
          ai_score?: number | null
          best_performer_id?: string | null
          brand_tone?: string | null
          brief?: string | null
          created_at?: string
          firm_id: string
          generated_variants?: Json | null
          id?: string
          name: string
          status?: string | null
          target_audience?: string | null
          tort_type?: string | null
          updated_at?: string
        }
        Update: {
          ai_score?: number | null
          best_performer_id?: string | null
          brand_tone?: string | null
          brief?: string | null
          created_at?: string
          firm_id?: string
          generated_variants?: Json | null
          id?: string
          name?: string
          status?: string | null
          target_audience?: string | null
          tort_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_studio_projects_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_integrations: {
        Row: {
          config: Json | null
          created_at: string
          crm_type: string
          field_mapping: Json | null
          firm_id: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          name: string
          sync_frequency: string | null
          total_failed: number | null
          total_synced: number | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          crm_type: string
          field_mapping?: Json | null
          firm_id: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name: string
          sync_frequency?: string | null
          total_failed?: number | null
          total_synced?: number | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          crm_type?: string
          field_mapping?: Json | null
          firm_id?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name?: string
          sync_frequency?: string | null
          total_failed?: number | null
          total_synced?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_integrations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_sync_logs: {
        Row: {
          created_at: string
          crm_record_id: string | null
          error_message: string | null
          firm_id: string
          id: string
          integration_id: string
          lead_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
          sync_type: string
        }
        Insert: {
          created_at?: string
          crm_record_id?: string | null
          error_message?: string | null
          firm_id: string
          id?: string
          integration_id: string
          lead_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          sync_type?: string
        }
        Update: {
          created_at?: string
          crm_record_id?: string | null
          error_message?: string | null
          firm_id?: string
          id?: string
          integration_id?: string
          lead_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_sync_logs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "crm_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sync_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sync_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_platform_campaigns: {
        Row: {
          ai_optimized_allocation: Json | null
          created_at: string
          firm_id: string
          id: string
          last_optimization_at: string | null
          name: string
          performance_summary: Json | null
          platform_allocation: Json | null
          platforms_active: string[] | null
          status: string | null
          tort_type: string | null
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          ai_optimized_allocation?: Json | null
          created_at?: string
          firm_id: string
          id?: string
          last_optimization_at?: string | null
          name: string
          performance_summary?: Json | null
          platform_allocation?: Json | null
          platforms_active?: string[] | null
          status?: string | null
          tort_type?: string | null
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          ai_optimized_allocation?: Json | null
          created_at?: string
          firm_id?: string
          id?: string
          last_optimization_at?: string | null
          name?: string
          performance_summary?: Json | null
          platform_allocation?: Json | null
          platforms_active?: string[] | null
          status?: string | null
          tort_type?: string | null
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_platform_campaigns_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      dark_funnel_visitors: {
        Row: {
          converted: boolean | null
          created_at: string
          device_type: string | null
          estimated_intent: number | null
          firm_id: string
          first_seen_at: string
          geographic_region: string | null
          id: string
          last_seen_at: string
          lead_id: string | null
          tort_interest: string | null
          touchpoints: Json | null
          visitor_hash: string
        }
        Insert: {
          converted?: boolean | null
          created_at?: string
          device_type?: string | null
          estimated_intent?: number | null
          firm_id: string
          first_seen_at?: string
          geographic_region?: string | null
          id?: string
          last_seen_at?: string
          lead_id?: string | null
          tort_interest?: string | null
          touchpoints?: Json | null
          visitor_hash: string
        }
        Update: {
          converted?: boolean | null
          created_at?: string
          device_type?: string | null
          estimated_intent?: number | null
          firm_id?: string
          first_seen_at?: string
          geographic_region?: string | null
          id?: string
          last_seen_at?: string
          lead_id?: string | null
          tort_interest?: string | null
          touchpoints?: Json | null
          visitor_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "dark_funnel_visitors_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dark_funnel_visitors_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dark_funnel_visitors_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      document_analyses: {
        Row: {
          ai_summary: string | null
          analyzed_at: string | null
          auto_populated_fields: Json | null
          created_at: string
          document_type: string | null
          extracted_facts: Json | null
          file_name: string
          file_url: string
          firm_id: string
          id: string
          lead_id: string | null
          status: string | null
          statute_risks: Json | null
        }
        Insert: {
          ai_summary?: string | null
          analyzed_at?: string | null
          auto_populated_fields?: Json | null
          created_at?: string
          document_type?: string | null
          extracted_facts?: Json | null
          file_name: string
          file_url: string
          firm_id: string
          id?: string
          lead_id?: string | null
          status?: string | null
          statute_risks?: Json | null
        }
        Update: {
          ai_summary?: string | null
          analyzed_at?: string | null
          auto_populated_fields?: Json | null
          created_at?: string
          document_type?: string | null
          extracted_facts?: Json | null
          file_name?: string
          file_url?: string
          firm_id?: string
          id?: string
          lead_id?: string | null
          status?: string | null
          statute_risks?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_analyses_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_analyses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_analyses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signatures: {
        Row: {
          created_at: string
          created_by: string
          document_content: string | null
          document_name: string
          firm_id: string
          id: string
          ip_address: string | null
          lead_id: string | null
          sha256_hash: string | null
          signature_data: string
          signed_at: string
          signer_email: string | null
          signer_name: string
          signer_role: string | null
          status: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          document_content?: string | null
          document_name: string
          firm_id: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          sha256_hash?: string | null
          signature_data: string
          signed_at?: string
          signer_email?: string | null
          signer_name: string
          signer_role?: string | null
          status?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          document_content?: string | null
          document_name?: string
          firm_id?: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          sha256_hash?: string | null
          signature_data?: string
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          signer_role?: string | null
          status?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_signatures_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_landing_pages: {
        Row: {
          campaign_id: string | null
          conversion_rate: number | null
          conversions: number | null
          created_at: string
          cta_color: string | null
          cta_text: string | null
          firm_id: string
          headline: string | null
          id: string
          is_published: boolean | null
          page_title: string
          personalization_rules: Json | null
          sections: Json | null
          slug: string
          subheadline: string | null
          updated_at: string
          visits: number | null
        }
        Insert: {
          campaign_id?: string | null
          conversion_rate?: number | null
          conversions?: number | null
          created_at?: string
          cta_color?: string | null
          cta_text?: string | null
          firm_id: string
          headline?: string | null
          id?: string
          is_published?: boolean | null
          page_title: string
          personalization_rules?: Json | null
          sections?: Json | null
          slug: string
          subheadline?: string | null
          updated_at?: string
          visits?: number | null
        }
        Update: {
          campaign_id?: string | null
          conversion_rate?: number | null
          conversions?: number | null
          created_at?: string
          cta_color?: string | null
          cta_text?: string | null
          firm_id?: string
          headline?: string | null
          id?: string
          is_published?: boolean | null
          page_title?: string
          personalization_rules?: Json | null
          sections?: Json | null
          slug?: string
          subheadline?: string | null
          updated_at?: string
          visits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_landing_pages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamic_landing_pages_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      ecom_ai_recommendations: {
        Row: {
          confidence: number | null
          created_at: string
          details: Json
          evidence_refs: Json
          firm_id: string
          id: string
          rec_type: string
          status: string
          summary: string | null
          title: string
          updated_at: string
          watchlist_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          details?: Json
          evidence_refs?: Json
          firm_id: string
          id?: string
          rec_type: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          watchlist_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          details?: Json
          evidence_refs?: Json
          firm_id?: string
          id?: string
          rec_type?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          watchlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_ai_recommendations_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "ecom_watchlist"
            referencedColumns: ["id"]
          },
        ]
      }
      ecom_alerts: {
        Row: {
          alert_type: string
          created_at: string
          firm_id: string
          id: string
          is_read: boolean
          message: string | null
          payload: Json
          severity: string
          title: string
          watchlist_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          firm_id: string
          id?: string
          is_read?: boolean
          message?: string | null
          payload?: Json
          severity?: string
          title: string
          watchlist_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          firm_id?: string
          id?: string
          is_read?: boolean
          message?: string | null
          payload?: Json
          severity?: string
          title?: string
          watchlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_alerts_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "ecom_watchlist"
            referencedColumns: ["id"]
          },
        ]
      }
      ecom_briefs: {
        Row: {
          created_at: string
          firm_id: string
          id: string
          pdf_url: string | null
          period_end: string
          period_start: string
          summary: Json
        }
        Insert: {
          created_at?: string
          firm_id: string
          id?: string
          pdf_url?: string | null
          period_end: string
          period_start: string
          summary?: Json
        }
        Update: {
          created_at?: string
          firm_id?: string
          id?: string
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          summary?: Json
        }
        Relationships: []
      }
      ecom_creators: {
        Row: {
          captured_at: string
          contact_info: Json | null
          engagement_rate: number | null
          firm_id: string
          followers: number | null
          gmv_proxy: number | null
          handle: string
          id: string
          niches: string[] | null
          profile_url: string | null
        }
        Insert: {
          captured_at?: string
          contact_info?: Json | null
          engagement_rate?: number | null
          firm_id: string
          followers?: number | null
          gmv_proxy?: number | null
          handle: string
          id?: string
          niches?: string[] | null
          profile_url?: string | null
        }
        Update: {
          captured_at?: string
          contact_info?: Json | null
          engagement_rate?: number | null
          firm_id?: string
          followers?: number | null
          gmv_proxy?: number | null
          handle?: string
          id?: string
          niches?: string[] | null
          profile_url?: string | null
        }
        Relationships: []
      }
      ecom_mentions: {
        Row: {
          author: string | null
          captured_at: string
          content: string | null
          firm_id: string
          id: string
          platform: string | null
          rating: number | null
          sentiment: string | null
          source_url: string | null
          topics: string[] | null
          watchlist_id: string | null
        }
        Insert: {
          author?: string | null
          captured_at?: string
          content?: string | null
          firm_id: string
          id?: string
          platform?: string | null
          rating?: number | null
          sentiment?: string | null
          source_url?: string | null
          topics?: string[] | null
          watchlist_id?: string | null
        }
        Update: {
          author?: string | null
          captured_at?: string
          content?: string | null
          firm_id?: string
          id?: string
          platform?: string | null
          rating?: number | null
          sentiment?: string | null
          source_url?: string | null
          topics?: string[] | null
          watchlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_mentions_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "ecom_watchlist"
            referencedColumns: ["id"]
          },
        ]
      }
      ecom_price_history: {
        Row: {
          captured_at: string
          discount_pct: number | null
          firm_id: string
          id: string
          in_stock: boolean | null
          original_price: number | null
          price: number | null
          promo_label: string | null
          rating: number | null
          rating_count: number | null
          source_url: string | null
          watchlist_id: string | null
        }
        Insert: {
          captured_at?: string
          discount_pct?: number | null
          firm_id: string
          id?: string
          in_stock?: boolean | null
          original_price?: number | null
          price?: number | null
          promo_label?: string | null
          rating?: number | null
          rating_count?: number | null
          source_url?: string | null
          watchlist_id?: string | null
        }
        Update: {
          captured_at?: string
          discount_pct?: number | null
          firm_id?: string
          id?: string
          in_stock?: boolean | null
          original_price?: number | null
          price?: number | null
          promo_label?: string | null
          rating?: number | null
          rating_count?: number | null
          source_url?: string | null
          watchlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_price_history_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "ecom_watchlist"
            referencedColumns: ["id"]
          },
        ]
      }
      ecom_scrape_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          firecrawl_job_id: string | null
          firm_id: string
          id: string
          job_type: string
          payload: Json
          result: Json | null
          started_at: string | null
          status: string
          updated_at: string
          watchlist_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          firecrawl_job_id?: string | null
          firm_id: string
          id?: string
          job_type: string
          payload?: Json
          result?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          watchlist_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          firecrawl_job_id?: string | null
          firm_id?: string
          id?: string
          job_type?: string
          payload?: Json
          result?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          watchlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_scrape_jobs_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "ecom_watchlist"
            referencedColumns: ["id"]
          },
        ]
      }
      ecom_snapshots: {
        Row: {
          active_products: number | null
          active_shops: number | null
          avg_price: number | null
          captured_on: string
          created_at: string
          firm_id: string
          id: string
          market_share: number | null
          raw: Json
          revenue: number | null
          units_sold: number | null
          watchlist_id: string | null
        }
        Insert: {
          active_products?: number | null
          active_shops?: number | null
          avg_price?: number | null
          captured_on?: string
          created_at?: string
          firm_id: string
          id?: string
          market_share?: number | null
          raw?: Json
          revenue?: number | null
          units_sold?: number | null
          watchlist_id?: string | null
        }
        Update: {
          active_products?: number | null
          active_shops?: number | null
          avg_price?: number | null
          captured_on?: string
          created_at?: string
          firm_id?: string
          id?: string
          market_share?: number | null
          raw?: Json
          revenue?: number | null
          units_sold?: number | null
          watchlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_snapshots_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "ecom_watchlist"
            referencedColumns: ["id"]
          },
        ]
      }
      ecom_top_entities: {
        Row: {
          captured_on: string
          category: string | null
          entity_name: string
          entity_url: string | null
          firm_id: string
          id: string
          metric_label: string | null
          metric_value: number | null
          platform: string
          rank: number
          rank_type: string
        }
        Insert: {
          captured_on?: string
          category?: string | null
          entity_name: string
          entity_url?: string | null
          firm_id: string
          id?: string
          metric_label?: string | null
          metric_value?: number | null
          platform: string
          rank: number
          rank_type: string
        }
        Update: {
          captured_on?: string
          category?: string | null
          entity_name?: string
          entity_url?: string | null
          firm_id?: string
          id?: string
          metric_label?: string | null
          metric_value?: number | null
          platform?: string
          rank?: number
          rank_type?: string
        }
        Relationships: []
      }
      ecom_trend_signals: {
        Row: {
          detected_at: string
          entity_name: string
          entity_url: string | null
          evidence: Json
          firm_id: string
          id: string
          platform: string
          signal_type: string
          velocity_score: number | null
        }
        Insert: {
          detected_at?: string
          entity_name: string
          entity_url?: string | null
          evidence?: Json
          firm_id: string
          id?: string
          platform: string
          signal_type: string
          velocity_score?: number | null
        }
        Update: {
          detected_at?: string
          entity_name?: string
          entity_url?: string | null
          evidence?: Json
          firm_id?: string
          id?: string
          platform?: string
          signal_type?: string
          velocity_score?: number | null
        }
        Relationships: []
      }
      ecom_watchlist: {
        Row: {
          created_at: string
          entity_type: string
          entity_url: string
          firm_id: string
          id: string
          is_active: boolean
          is_own: boolean
          label: string | null
          last_scraped_at: string | null
          next_scan_at: string | null
          platform: string
          priority: Database["public"]["Enums"]["scrape_priority"]
          retention_months: number
          scan_interval_minutes: number
          track_frequency_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          entity_url: string
          firm_id: string
          id?: string
          is_active?: boolean
          is_own?: boolean
          label?: string | null
          last_scraped_at?: string | null
          next_scan_at?: string | null
          platform: string
          priority?: Database["public"]["Enums"]["scrape_priority"]
          retention_months?: number
          scan_interval_minutes?: number
          track_frequency_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          entity_url?: string
          firm_id?: string
          id?: string
          is_active?: boolean
          is_own?: boolean
          label?: string | null
          last_scraped_at?: string | null
          next_scan_at?: string | null
          platform?: string
          priority?: Database["public"]["Enums"]["scrape_priority"]
          retention_months?: number
          scan_interval_minutes?: number
          track_frequency_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      evidence_audit_trail: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          evidence_id: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          evidence_id: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          evidence_id?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_audit_trail_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_vault"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_vault: {
        Row: {
          chain_position: number
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          firm_id: string
          id: string
          integrity_verified: boolean | null
          lead_id: string | null
          metadata: Json | null
          mime_type: string | null
          previous_hash: string | null
          sha256_hash: string
          tamper_detected: boolean | null
          uploaded_by: string
          verified_at: string | null
        }
        Insert: {
          chain_position?: number
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          firm_id: string
          id?: string
          integrity_verified?: boolean | null
          lead_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          previous_hash?: string | null
          sha256_hash: string
          tamper_detected?: boolean | null
          uploaded_by: string
          verified_at?: string | null
        }
        Update: {
          chain_position?: number
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          firm_id?: string
          id?: string
          integrity_verified?: boolean | null
          lead_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          previous_hash?: string | null
          sha256_hash?: string
          tamper_detected?: boolean | null
          uploaded_by?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_vault_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_vault_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_vault_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      filter_rejection_logs: {
        Row: {
          context: Json | null
          created_at: string
          field: string
          firm_id: string | null
          id: string
          reason: string
          rejected_value: string | null
          user_id: string | null
          vertical_slug: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          field: string
          firm_id?: string | null
          id?: string
          reason: string
          rejected_value?: string | null
          user_id?: string | null
          vertical_slug?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          field?: string
          firm_id?: string | null
          id?: string
          reason?: string
          rejected_value?: string | null
          user_id?: string | null
          vertical_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filter_rejection_logs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_benchmarks: {
        Row: {
          avg_case_value: number | null
          avg_conversion_rate: number | null
          avg_cpl: number | null
          avg_response_time_minutes: number | null
          created_at: string
          firm_id: string
          id: string
          period: string
          pipeline_velocity_days: number | null
          tort_type: string | null
          total_leads_purchased: number | null
          total_spend: number | null
        }
        Insert: {
          avg_case_value?: number | null
          avg_conversion_rate?: number | null
          avg_cpl?: number | null
          avg_response_time_minutes?: number | null
          created_at?: string
          firm_id: string
          id?: string
          period: string
          pipeline_velocity_days?: number | null
          tort_type?: string | null
          total_leads_purchased?: number | null
          total_spend?: number | null
        }
        Update: {
          avg_case_value?: number | null
          avg_conversion_rate?: number | null
          avg_cpl?: number | null
          avg_response_time_minutes?: number | null
          created_at?: string
          firm_id?: string
          id?: string
          period?: string
          pipeline_velocity_days?: number | null
          tort_type?: string | null
          total_leads_purchased?: number | null
          total_spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "firm_benchmarks_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_brand_kit: {
        Row: {
          colors: Json
          contact: Json
          created_at: string
          dark_logo_url: string | null
          disclaimer: string | null
          firm_id: string
          fonts: Json
          guidelines_md: string | null
          logo_url: string | null
          product_images: Json
          tone_of_voice: string | null
          trust_badges: Json
          updated_at: string
          wordmark_url: string | null
        }
        Insert: {
          colors?: Json
          contact?: Json
          created_at?: string
          dark_logo_url?: string | null
          disclaimer?: string | null
          firm_id: string
          fonts?: Json
          guidelines_md?: string | null
          logo_url?: string | null
          product_images?: Json
          tone_of_voice?: string | null
          trust_badges?: Json
          updated_at?: string
          wordmark_url?: string | null
        }
        Update: {
          colors?: Json
          contact?: Json
          created_at?: string
          dark_logo_url?: string | null
          disclaimer?: string | null
          firm_id?: string
          fonts?: Json
          guidelines_md?: string | null
          logo_url?: string | null
          product_images?: Json
          tone_of_voice?: string | null
          trust_badges?: Json
          updated_at?: string
          wordmark_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firm_brand_kit_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: true
            referencedRelation: "firms"
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
          hero_config: Json
          id: string
          is_published: boolean
          layout_config: Json
          logo_url: string | null
          primary_color: string | null
          published_at: string | null
          sections: Json
          seo_config: Json
          slug: string
          testimonials: Json
          theme_key: string | null
          trust_signals: Json
          typography: Json
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
          hero_config?: Json
          id?: string
          is_published?: boolean
          layout_config?: Json
          logo_url?: string | null
          primary_color?: string | null
          published_at?: string | null
          sections?: Json
          seo_config?: Json
          slug: string
          testimonials?: Json
          theme_key?: string | null
          trust_signals?: Json
          typography?: Json
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
          hero_config?: Json
          id?: string
          is_published?: boolean
          layout_config?: Json
          logo_url?: string | null
          primary_color?: string | null
          published_at?: string | null
          sections?: Json
          seo_config?: Json
          slug?: string
          testimonials?: Json
          theme_key?: string | null
          trust_signals?: Json
          typography?: Json
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
      firm_encryption_keys: {
        Row: {
          algorithm: string
          created_at: string
          encrypted_master_key: string
          firm_id: string
          id: string
          key_salt: string
          key_version: number
          pqc_public_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          algorithm?: string
          created_at?: string
          encrypted_master_key: string
          firm_id: string
          id?: string
          key_salt: string
          key_version?: number
          pqc_public_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          algorithm?: string
          created_at?: string
          encrypted_master_key?: string
          firm_id?: string
          id?: string
          key_salt?: string
          key_version?: number
          pqc_public_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_encryption_keys_firm_id_fkey"
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
          categories: string[]
          contact_email: string | null
          contact_phone: string | null
          country: string
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
          vertical_id: string | null
          vertical_locked: boolean
          wallet_balance: number | null
          website: string | null
        }
        Insert: {
          categories?: string[]
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
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
          vertical_id?: string | null
          vertical_locked?: boolean
          wallet_balance?: number | null
          website?: string | null
        }
        Update: {
          categories?: string[]
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
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
          vertical_id?: string | null
          vertical_locked?: boolean
          wallet_balance?: number | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firms_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "industry_verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_checks: {
        Row: {
          check_type: string
          created_at: string
          details: Json | null
          id: string
          is_confirmed: boolean | null
          lead_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
        }
        Insert: {
          check_type: string
          created_at?: string
          details?: Json | null
          id?: string
          is_confirmed?: boolean | null
          lead_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
        }
        Update: {
          check_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          is_confirmed?: boolean | null
          lead_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_checks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_checks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      geofence_campaigns: {
        Row: {
          ad_creative: Json | null
          clicks: number | null
          conversions: number | null
          created_at: string
          daily_budget: number | null
          firm_id: string
          id: string
          impressions: number | null
          is_active: boolean | null
          locations: Json
          name: string
          radius_meters: number | null
          tort_type: string | null
          updated_at: string
        }
        Insert: {
          ad_creative?: Json | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          daily_budget?: number | null
          firm_id: string
          id?: string
          impressions?: number | null
          is_active?: boolean | null
          locations?: Json
          name: string
          radius_meters?: number | null
          tort_type?: string | null
          updated_at?: string
        }
        Update: {
          ad_creative?: Json | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          daily_budget?: number | null
          firm_id?: string
          id?: string
          impressions?: number | null
          is_active?: boolean | null
          locations?: Json
          name?: string
          radius_meters?: number | null
          tort_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofence_campaigns_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      gmb_account_links: {
        Row: {
          created_at: string
          email: string | null
          firm_id: string
          google_account_id: string
          id: string
          pubsub_topic: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          firm_id: string
          google_account_id: string
          id?: string
          pubsub_topic?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          firm_id?: string
          google_account_id?: string
          id?: string
          pubsub_topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gmb_locations: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          firm_id: string
          google_account_id: string | null
          google_location_id: string | null
          hours: Json | null
          id: string
          is_connected: boolean
          last_synced_at: string | null
          name: string
          phone: string | null
          place_id: string | null
          postal_code: string | null
          primary_category: string | null
          raw_payload: Json | null
          region: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          firm_id: string
          google_account_id?: string | null
          google_location_id?: string | null
          hours?: Json | null
          id?: string
          is_connected?: boolean
          last_synced_at?: string | null
          name: string
          phone?: string | null
          place_id?: string | null
          postal_code?: string | null
          primary_category?: string | null
          raw_payload?: Json | null
          region?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          firm_id?: string
          google_account_id?: string | null
          google_location_id?: string | null
          hours?: Json | null
          id?: string
          is_connected?: boolean
          last_synced_at?: string | null
          name?: string
          phone?: string | null
          place_id?: string | null
          postal_code?: string | null
          primary_category?: string | null
          raw_payload?: Json | null
          region?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      gmb_oauth_consents: {
        Row: {
          consented: boolean
          created_at: string
          data_categories: string[]
          disclosure_sha256: string
          disclosure_version: string
          firm_id: string
          id: string
          ip_address: string | null
          purposes: string[]
          retention_days: number
          revoked_at: string | null
          scopes: string[]
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consented?: boolean
          created_at?: string
          data_categories?: string[]
          disclosure_sha256: string
          disclosure_version: string
          firm_id: string
          id?: string
          ip_address?: string | null
          purposes?: string[]
          retention_days?: number
          revoked_at?: string | null
          scopes?: string[]
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consented?: boolean
          created_at?: string
          data_categories?: string[]
          disclosure_sha256?: string
          disclosure_version?: string
          firm_id?: string
          id?: string
          ip_address?: string | null
          purposes?: string[]
          retention_days?: number
          revoked_at?: string | null
          scopes?: string[]
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gmb_posts: {
        Row: {
          created_at: string
          cta_label: string | null
          cta_url: string | null
          firm_id: string
          id: string
          location_id: string
          media_url: string | null
          post_type: string
          scheduled_for: string | null
          status: string
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          firm_id: string
          id?: string
          location_id: string
          media_url?: string | null
          post_type?: string
          scheduled_for?: string | null
          status?: string
          summary: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          firm_id?: string
          id?: string
          location_id?: string
          media_url?: string | null
          post_type?: string
          scheduled_for?: string | null
          status?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmb_posts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      gmb_reply_templates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          firm_id: string
          id: string
          is_active: boolean
          name: string
          rating_filter: number | null
          tone: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          firm_id: string
          id?: string
          is_active?: boolean
          name: string
          rating_filter?: number | null
          tone?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          firm_id?: string
          id?: string
          is_active?: boolean
          name?: string
          rating_filter?: number | null
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      gmb_review_replies: {
        Row: {
          ai_generated: boolean
          ai_model: string | null
          approved_at: string | null
          approved_by: string | null
          body: string
          created_at: string
          created_by: string | null
          firm_id: string
          id: string
          rejected_reason: string | null
          review_id: string
          sent_at: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          ai_model?: string | null
          approved_at?: string | null
          approved_by?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          firm_id: string
          id?: string
          rejected_reason?: string | null
          review_id: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          ai_model?: string | null
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          firm_id?: string
          id?: string
          rejected_reason?: string | null
          review_id?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmb_review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "gmb_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_review_replies_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "gmb_reply_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      gmb_reviews: {
        Row: {
          created_at: string
          external_id: string | null
          firm_id: string
          id: string
          location_id: string
          rating: number | null
          replied_at: string | null
          reply_status: string
          reply_text: string | null
          reviewer_name: string | null
          text: string | null
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          firm_id: string
          id?: string
          location_id: string
          rating?: number | null
          replied_at?: string | null
          reply_status?: string
          reply_text?: string | null
          reviewer_name?: string | null
          text?: string | null
        }
        Update: {
          created_at?: string
          external_id?: string | null
          firm_id?: string
          id?: string
          location_id?: string
          rating?: number | null
          replied_at?: string | null
          reply_status?: string
          reply_text?: string | null
          reviewer_name?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gmb_reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      gmb_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          firm_id: string
          id: string
          insights_synced: number
          location_id: string | null
          posts_synced: number
          reviews_synced: number
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          firm_id: string
          id?: string
          insights_synced?: number
          location_id?: string | null
          posts_synced?: number
          reviews_synced?: number
          started_at?: string
          status?: string
          sync_type?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          firm_id?: string
          id?: string
          insights_synced?: number
          location_id?: string | null
          posts_synced?: number
          reviews_synced?: number
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmb_sync_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_verticals: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      intent_signals: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          detected_at: string
          id: string
          intensity: number | null
          is_active: boolean | null
          keyword: string | null
          recommended_action: string | null
          signal_source: string
          state: string | null
          tort_type: string
          volume_change_pct: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          detected_at?: string
          id?: string
          intensity?: number | null
          is_active?: boolean | null
          keyword?: string | null
          recommended_action?: string | null
          signal_source: string
          state?: string | null
          tort_type: string
          volume_change_pct?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          detected_at?: string
          id?: string
          intensity?: number | null
          is_active?: boolean | null
          keyword?: string | null
          recommended_action?: string | null
          signal_source?: string
          state?: string | null
          tort_type?: string
          volume_change_pct?: number | null
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
      judge_profiles: {
        Row: {
          ai_strategy_notes: string | null
          appointment_year: number | null
          avg_case_duration_days: number | null
          avg_settlement_modifier: number | null
          court: string | null
          created_at: string
          id: string
          judge_name: string
          jurisdiction: string
          last_analyzed_at: string | null
          notable_rulings: Json | null
          plaintiff_win_rate: number | null
          ruling_history: Json | null
          sentiment_profile: Json | null
          state: string | null
          tort_specialties: string[] | null
          updated_at: string
        }
        Insert: {
          ai_strategy_notes?: string | null
          appointment_year?: number | null
          avg_case_duration_days?: number | null
          avg_settlement_modifier?: number | null
          court?: string | null
          created_at?: string
          id?: string
          judge_name: string
          jurisdiction: string
          last_analyzed_at?: string | null
          notable_rulings?: Json | null
          plaintiff_win_rate?: number | null
          ruling_history?: Json | null
          sentiment_profile?: Json | null
          state?: string | null
          tort_specialties?: string[] | null
          updated_at?: string
        }
        Update: {
          ai_strategy_notes?: string | null
          appointment_year?: number | null
          avg_case_duration_days?: number | null
          avg_settlement_modifier?: number | null
          court?: string | null
          created_at?: string
          id?: string
          judge_name?: string
          jurisdiction?: string
          last_analyzed_at?: string | null
          notable_rulings?: Json | null
          plaintiff_win_rate?: number | null
          ruling_history?: Json | null
          sentiment_profile?: Json | null
          state?: string | null
          tort_specialties?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      landing_design_presets: {
        Row: {
          background: Json
          created_at: string
          firm_id: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          background: Json
          created_at?: string
          firm_id?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          background?: Json
          created_at?: string
          firm_id?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      landing_page_domains: {
        Row: {
          created_at: string
          firm_id: string
          hostname: string
          id: string
          is_primary: boolean
          last_checked_at: string | null
          notes: string | null
          ssl_status: string
          status: string
          updated_at: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          firm_id: string
          hostname: string
          id?: string
          is_primary?: boolean
          last_checked_at?: string | null
          notes?: string | null
          ssl_status?: string
          status?: string
          updated_at?: string
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          firm_id?: string
          hostname?: string
          id?: string
          is_primary?: boolean
          last_checked_at?: string | null
          notes?: string | null
          ssl_status?: string
          status?: string
          updated_at?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      landing_page_previews: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          firm_id: string
          id: string
          token: string
          version_id: string
          view_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          firm_id: string
          id?: string
          token: string
          version_id: string
          view_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          firm_id?: string
          id?: string
          token?: string
          version_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_previews_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "landing_page_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          firm_id: string | null
          id: string
          is_public: boolean
          is_starter: boolean
          name: string
          snapshot: Json
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          vertical_slug: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          firm_id?: string | null
          id?: string
          is_public?: boolean
          is_starter?: boolean
          name: string
          snapshot: Json
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          vertical_slug?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          firm_id?: string | null
          id?: string
          is_public?: boolean
          is_starter?: boolean
          name?: string
          snapshot?: Json
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          vertical_slug?: string | null
        }
        Relationships: []
      }
      landing_page_versions: {
        Row: {
          created_at: string
          created_by: string | null
          firm_id: string
          id: string
          label: string | null
          note: string | null
          snapshot: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          firm_id: string
          id?: string
          label?: string | null
          note?: string | null
          snapshot: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          firm_id?: string
          id?: string
          label?: string | null
          note?: string | null
          snapshot?: Json
        }
        Relationships: []
      }
      lead_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          firm_id: string
          id: string
          lead_id: string
          metadata: Json | null
          title: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          firm_id: string
          id?: string
          lead_id: string
          metadata?: Json | null
          title: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          firm_id?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lead_blockchain: {
        Row: {
          actor_id: string | null
          block_number: number
          created_at: string
          event_data: Json
          event_type: string
          id: string
          integrity_status: string | null
          last_verified_at: string | null
          lead_id: string
          nonce: string
          previous_hash: string | null
          sha256_hash: string
        }
        Insert: {
          actor_id?: string | null
          block_number: number
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          integrity_status?: string | null
          last_verified_at?: string | null
          lead_id: string
          nonce: string
          previous_hash?: string | null
          sha256_hash: string
        }
        Update: {
          actor_id?: string | null
          block_number?: number
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          integrity_status?: string | null
          last_verified_at?: string | null
          lead_id?: string
          nonce?: string
          previous_hash?: string | null
          sha256_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_blockchain_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_blockchain_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
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
          pipeline_stage: string
          purchased_at: string
          stage_updated_at: string | null
          stripe_payment_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          firm_id: string
          id?: string
          lead_id: string
          payment_method?: string | null
          pipeline_stage?: string
          purchased_at?: string
          stage_updated_at?: string | null
          stripe_payment_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          firm_id?: string
          id?: string
          lead_id?: string
          payment_method?: string | null
          pipeline_stage?: string
          purchased_at?: string
          stage_updated_at?: string | null
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
      lead_referrals: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          reason: string | null
          referral_fee: number
          referred_to_firm_id: string | null
          referring_firm_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          reason?: string | null
          referral_fee?: number
          referred_to_firm_id?: string | null
          referring_firm_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          reason?: string | null
          referral_fee?: number
          referred_to_firm_id?: string | null
          referring_firm_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_referrals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_referrals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_referrals_referred_to_firm_id_fkey"
            columns: ["referred_to_firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_referrals_referring_firm_id_fkey"
            columns: ["referring_firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
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
          category: string | null
          city: string | null
          consent_hipaa: boolean | null
          consent_privacy: boolean | null
          consent_tcpa: boolean | null
          created_at: string
          custom_fields: Json
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
          session_recording_url: string | null
          source: string | null
          source_id: string | null
          state: string
          status: Database["public"]["Enums"]["lead_status"] | null
          tier: Database["public"]["Enums"]["lead_tier"]
          tort_type: string
          updated_at: string
          vertical_id: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          age_bucket?: string | null
          ai_quality_score?: number | null
          campaign_id?: string | null
          category?: string | null
          city?: string | null
          consent_hipaa?: boolean | null
          consent_privacy?: boolean | null
          consent_tcpa?: boolean | null
          created_at?: string
          custom_fields?: Json
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
          session_recording_url?: string | null
          source?: string | null
          source_id?: string | null
          state: string
          status?: Database["public"]["Enums"]["lead_status"] | null
          tier?: Database["public"]["Enums"]["lead_tier"]
          tort_type: string
          updated_at?: string
          vertical_id?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          age_bucket?: string | null
          ai_quality_score?: number | null
          campaign_id?: string | null
          category?: string | null
          city?: string | null
          consent_hipaa?: boolean | null
          consent_privacy?: boolean | null
          consent_tcpa?: boolean | null
          created_at?: string
          custom_fields?: Json
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
          session_recording_url?: string | null
          source?: string | null
          source_id?: string | null
          state?: string
          status?: Database["public"]["Enums"]["lead_status"] | null
          tier?: Database["public"]["Enums"]["lead_tier"]
          tort_type?: string
          updated_at?: string
          vertical_id?: string | null
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
          {
            foreignKeyName: "leads_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "industry_verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      market_pulse_alerts: {
        Row: {
          affected_states: string[] | null
          ai_analysis: Json | null
          ai_confidence: number | null
          competition_level: string | null
          created_at: string
          description: string | null
          detected_at: string
          estimated_market_size: string | null
          expires_at: string | null
          id: string
          is_trending: boolean | null
          severity: string
          source_type: string
          source_url: string | null
          title: string
          tort_type: string | null
        }
        Insert: {
          affected_states?: string[] | null
          ai_analysis?: Json | null
          ai_confidence?: number | null
          competition_level?: string | null
          created_at?: string
          description?: string | null
          detected_at?: string
          estimated_market_size?: string | null
          expires_at?: string | null
          id?: string
          is_trending?: boolean | null
          severity?: string
          source_type?: string
          source_url?: string | null
          title: string
          tort_type?: string | null
        }
        Update: {
          affected_states?: string[] | null
          ai_analysis?: Json | null
          ai_confidence?: number | null
          competition_level?: string | null
          created_at?: string
          description?: string | null
          detected_at?: string
          estimated_market_size?: string | null
          expires_at?: string | null
          id?: string
          is_trending?: boolean | null
          severity?: string
          source_type?: string
          source_url?: string | null
          title?: string
          tort_type?: string | null
        }
        Relationships: []
      }
      market_pulse_watchlist: {
        Row: {
          created_at: string
          firm_id: string
          id: string
          keywords: string[]
          notify_email: boolean | null
          notify_in_app: boolean | null
          states: string[]
          tort_types: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          firm_id: string
          id?: string
          keywords?: string[]
          notify_email?: boolean | null
          notify_in_app?: boolean | null
          states?: string[]
          tort_types?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          firm_id?: string
          id?: string
          keywords?: string[]
          notify_email?: boolean | null
          notify_in_app?: boolean | null
          states?: string[]
          tort_types?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_pulse_watchlist_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ab_tests: {
        Row: {
          ad_account_id: string | null
          cells: Json | null
          confidence_level: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          firm_id: string
          id: string
          meta_study_id: string | null
          name: string
          raw: Json | null
          start_time: string | null
          status: string | null
          updated_at: string
          variable: string
          winner_campaign_id: string | null
        }
        Insert: {
          ad_account_id?: string | null
          cells?: Json | null
          confidence_level?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          firm_id: string
          id?: string
          meta_study_id?: string | null
          name: string
          raw?: Json | null
          start_time?: string | null
          status?: string | null
          updated_at?: string
          variable: string
          winner_campaign_id?: string | null
        }
        Update: {
          ad_account_id?: string | null
          cells?: Json | null
          confidence_level?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          firm_id?: string
          id?: string
          meta_study_id?: string | null
          name?: string
          raw?: Json | null
          start_time?: string | null
          status?: string | null
          updated_at?: string
          variable?: string
          winner_campaign_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_ab_tests_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ad_accounts: {
        Row: {
          account_status: number | null
          amount_spent: number | null
          balance: number | null
          business_manager_id: string | null
          created_at: string
          currency: string | null
          disable_reason: number | null
          firm_id: string
          funding_source: string | null
          gen_ai_capabilities: Json | null
          gen_ai_capabilities_checked_at: string | null
          id: string
          meta_ad_account_id: string
          name: string | null
          raw: Json | null
          spend_cap: number | null
          timezone_name: string | null
          updated_at: string
        }
        Insert: {
          account_status?: number | null
          amount_spent?: number | null
          balance?: number | null
          business_manager_id?: string | null
          created_at?: string
          currency?: string | null
          disable_reason?: number | null
          firm_id: string
          funding_source?: string | null
          gen_ai_capabilities?: Json | null
          gen_ai_capabilities_checked_at?: string | null
          id?: string
          meta_ad_account_id: string
          name?: string | null
          raw?: Json | null
          spend_cap?: number | null
          timezone_name?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: number | null
          amount_spent?: number | null
          balance?: number | null
          business_manager_id?: string | null
          created_at?: string
          currency?: string | null
          disable_reason?: number | null
          firm_id?: string
          funding_source?: string | null
          gen_ai_capabilities?: Json | null
          gen_ai_capabilities_checked_at?: string | null
          id?: string
          meta_ad_account_id?: string
          name?: string | null
          raw?: Json | null
          spend_cap?: number | null
          timezone_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ad_accounts_business_manager_id_fkey"
            columns: ["business_manager_id"]
            isOneToOne: false
            referencedRelation: "meta_business_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ad_sets: {
        Row: {
          adset_schedule: Json | null
          advantage_audience_enabled: boolean
          attribution_spec: Json | null
          bid_amount: number | null
          bid_strategy: Database["public"]["Enums"]["meta_bid_strategy"] | null
          billing_event:
            | Database["public"]["Enums"]["meta_billing_event"]
            | null
          campaign_id: string
          created_at: string
          daily_budget: number | null
          destination_type: string | null
          effective_status: string | null
          end_time: string | null
          firm_id: string
          frequency_control_specs: Json | null
          id: string
          ig_account_id: string | null
          lifetime_budget: number | null
          meta_adset_id: string | null
          name: string
          optimization_goal:
            | Database["public"]["Enums"]["meta_optimization_goal"]
            | null
          pacing_type: string[] | null
          page_id: string | null
          pixel_id: string | null
          placement_mode: string
          promoted_object: Json | null
          raw: Json | null
          start_time: string | null
          status: Database["public"]["Enums"]["meta_campaign_status"] | null
          targeting: Json | null
          updated_at: string
        }
        Insert: {
          adset_schedule?: Json | null
          advantage_audience_enabled?: boolean
          attribution_spec?: Json | null
          bid_amount?: number | null
          bid_strategy?: Database["public"]["Enums"]["meta_bid_strategy"] | null
          billing_event?:
            | Database["public"]["Enums"]["meta_billing_event"]
            | null
          campaign_id: string
          created_at?: string
          daily_budget?: number | null
          destination_type?: string | null
          effective_status?: string | null
          end_time?: string | null
          firm_id: string
          frequency_control_specs?: Json | null
          id?: string
          ig_account_id?: string | null
          lifetime_budget?: number | null
          meta_adset_id?: string | null
          name: string
          optimization_goal?:
            | Database["public"]["Enums"]["meta_optimization_goal"]
            | null
          pacing_type?: string[] | null
          page_id?: string | null
          pixel_id?: string | null
          placement_mode?: string
          promoted_object?: Json | null
          raw?: Json | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["meta_campaign_status"] | null
          targeting?: Json | null
          updated_at?: string
        }
        Update: {
          adset_schedule?: Json | null
          advantage_audience_enabled?: boolean
          attribution_spec?: Json | null
          bid_amount?: number | null
          bid_strategy?: Database["public"]["Enums"]["meta_bid_strategy"] | null
          billing_event?:
            | Database["public"]["Enums"]["meta_billing_event"]
            | null
          campaign_id?: string
          created_at?: string
          daily_budget?: number | null
          destination_type?: string | null
          effective_status?: string | null
          end_time?: string | null
          firm_id?: string
          frequency_control_specs?: Json | null
          id?: string
          ig_account_id?: string | null
          lifetime_budget?: number | null
          meta_adset_id?: string | null
          name?: string
          optimization_goal?:
            | Database["public"]["Enums"]["meta_optimization_goal"]
            | null
          pacing_type?: string[] | null
          page_id?: string | null
          pixel_id?: string | null
          placement_mode?: string
          promoted_object?: Json | null
          raw?: Json | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["meta_campaign_status"] | null
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
          {
            foreignKeyName: "meta_ad_sets_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ig_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_ad_sets_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "meta_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_ad_sets_pixel_id_fkey"
            columns: ["pixel_id"]
            isOneToOne: false
            referencedRelation: "meta_pixels"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads: {
        Row: {
          ad_format: string | null
          ad_set_id: string
          ai_generated: boolean | null
          ai_score: number | null
          body_text: string | null
          call_to_action: string | null
          carousel_cards: Json | null
          conversion_specs: Json | null
          created_at: string
          creative_id: string | null
          creative_type: string | null
          description: string | null
          display_link: string | null
          dynamic_creative_specs: Json | null
          effective_status: string | null
          firm_id: string
          headline: string | null
          id: string
          image_url: string | null
          instagram_actor_id: string | null
          instagram_permalink_url: string | null
          link_url: string | null
          meta_ad_id: string | null
          meta_creative_id: string | null
          name: string
          page_id: string | null
          page_name: string | null
          page_picture_url: string | null
          permalink_url: string | null
          post_created_time: string | null
          post_message: string | null
          preview_shareable_link: string | null
          raw: Json | null
          status: Database["public"]["Enums"]["meta_campaign_status"] | null
          tracking_specs: Json | null
          updated_at: string
          video_source_url: string | null
          video_thumbnail_url: string | null
          video_url: string | null
        }
        Insert: {
          ad_format?: string | null
          ad_set_id: string
          ai_generated?: boolean | null
          ai_score?: number | null
          body_text?: string | null
          call_to_action?: string | null
          carousel_cards?: Json | null
          conversion_specs?: Json | null
          created_at?: string
          creative_id?: string | null
          creative_type?: string | null
          description?: string | null
          display_link?: string | null
          dynamic_creative_specs?: Json | null
          effective_status?: string | null
          firm_id: string
          headline?: string | null
          id?: string
          image_url?: string | null
          instagram_actor_id?: string | null
          instagram_permalink_url?: string | null
          link_url?: string | null
          meta_ad_id?: string | null
          meta_creative_id?: string | null
          name: string
          page_id?: string | null
          page_name?: string | null
          page_picture_url?: string | null
          permalink_url?: string | null
          post_created_time?: string | null
          post_message?: string | null
          preview_shareable_link?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["meta_campaign_status"] | null
          tracking_specs?: Json | null
          updated_at?: string
          video_source_url?: string | null
          video_thumbnail_url?: string | null
          video_url?: string | null
        }
        Update: {
          ad_format?: string | null
          ad_set_id?: string
          ai_generated?: boolean | null
          ai_score?: number | null
          body_text?: string | null
          call_to_action?: string | null
          carousel_cards?: Json | null
          conversion_specs?: Json | null
          created_at?: string
          creative_id?: string | null
          creative_type?: string | null
          description?: string | null
          display_link?: string | null
          dynamic_creative_specs?: Json | null
          effective_status?: string | null
          firm_id?: string
          headline?: string | null
          id?: string
          image_url?: string | null
          instagram_actor_id?: string | null
          instagram_permalink_url?: string | null
          link_url?: string | null
          meta_ad_id?: string | null
          meta_creative_id?: string | null
          name?: string
          page_id?: string | null
          page_name?: string | null
          page_picture_url?: string | null
          permalink_url?: string | null
          post_created_time?: string | null
          post_message?: string | null
          preview_shareable_link?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["meta_campaign_status"] | null
          tracking_specs?: Json | null
          updated_at?: string
          video_source_url?: string | null
          video_thumbnail_url?: string | null
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
          {
            foreignKeyName: "meta_ads_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "meta_creatives"
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
        Relationships: []
      }
      meta_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          diff: Json | null
          firm_id: string
          id: string
          ip_address: string | null
          meta_object_id: string | null
          object_id: string | null
          object_level: Database["public"]["Enums"]["meta_object_level"] | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          diff?: Json | null
          firm_id: string
          id?: string
          ip_address?: string | null
          meta_object_id?: string | null
          object_id?: string | null
          object_level?: Database["public"]["Enums"]["meta_object_level"] | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          diff?: Json | null
          firm_id?: string
          id?: string
          ip_address?: string | null
          meta_object_id?: string | null
          object_id?: string | null
          object_level?: Database["public"]["Enums"]["meta_object_level"] | null
          user_agent?: string | null
        }
        Relationships: []
      }
      meta_automated_rules: {
        Row: {
          actions: Json
          ad_account_id: string | null
          created_at: string
          created_by: string | null
          firm_id: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          meta_rule_id: string | null
          name: string
          raw: Json | null
          schedule: Json | null
          scope: string
          trigger_conditions: Json
          updated_at: string
        }
        Insert: {
          actions?: Json
          ad_account_id?: string | null
          created_at?: string
          created_by?: string | null
          firm_id: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          meta_rule_id?: string | null
          name: string
          raw?: Json | null
          schedule?: Json | null
          scope: string
          trigger_conditions?: Json
          updated_at?: string
        }
        Update: {
          actions?: Json
          ad_account_id?: string | null
          created_at?: string
          created_by?: string | null
          firm_id?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          meta_rule_id?: string | null
          name?: string
          raw?: Json | null
          schedule?: Json | null
          scope?: string
          trigger_conditions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_automated_rules_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_business_managers: {
        Row: {
          created_at: string
          firm_id: string
          id: string
          meta_business_id: string
          name: string | null
          primary_page_id: string | null
          raw: Json | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          created_at?: string
          firm_id: string
          id?: string
          meta_business_id: string
          name?: string | null
          primary_page_id?: string | null
          raw?: Json | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          created_at?: string
          firm_id?: string
          id?: string
          meta_business_id?: string
          name?: string | null
          primary_page_id?: string | null
          raw?: Json | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      meta_campaigns: {
        Row: {
          ad_account_id: string | null
          ai_generated: boolean | null
          ai_metadata: Json | null
          attribution_setting: string | null
          bid_strategy: Database["public"]["Enums"]["meta_bid_strategy"] | null
          budget_remaining: number | null
          budget_schedule_specs: Json | null
          buying_type: Database["public"]["Enums"]["meta_buying_type"] | null
          created_at: string
          created_by: string | null
          daily_budget: number | null
          effective_status: string | null
          firm_id: string
          id: string
          is_cbo: boolean | null
          lifetime_budget: number | null
          meta_campaign_id: string | null
          name: string
          objective: Database["public"]["Enums"]["meta_objective"] | null
          published_at: string | null
          raw: Json | null
          review_status:
            | Database["public"]["Enums"]["meta_review_status"]
            | null
          reviewed_at: string | null
          reviewed_by: string | null
          special_ad_categories: string[] | null
          special_ad_category_country: string[] | null
          spend_cap: number | null
          start_time: string | null
          status: Database["public"]["Enums"]["meta_campaign_status"] | null
          stop_time: string | null
          target_country: string | null
          target_states: string[] | null
          tort_type: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id?: string | null
          ai_generated?: boolean | null
          ai_metadata?: Json | null
          attribution_setting?: string | null
          bid_strategy?: Database["public"]["Enums"]["meta_bid_strategy"] | null
          budget_remaining?: number | null
          budget_schedule_specs?: Json | null
          buying_type?: Database["public"]["Enums"]["meta_buying_type"] | null
          created_at?: string
          created_by?: string | null
          daily_budget?: number | null
          effective_status?: string | null
          firm_id: string
          id?: string
          is_cbo?: boolean | null
          lifetime_budget?: number | null
          meta_campaign_id?: string | null
          name: string
          objective?: Database["public"]["Enums"]["meta_objective"] | null
          published_at?: string | null
          raw?: Json | null
          review_status?:
            | Database["public"]["Enums"]["meta_review_status"]
            | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          special_ad_categories?: string[] | null
          special_ad_category_country?: string[] | null
          spend_cap?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["meta_campaign_status"] | null
          stop_time?: string | null
          target_country?: string | null
          target_states?: string[] | null
          tort_type?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string | null
          ai_generated?: boolean | null
          ai_metadata?: Json | null
          attribution_setting?: string | null
          bid_strategy?: Database["public"]["Enums"]["meta_bid_strategy"] | null
          budget_remaining?: number | null
          budget_schedule_specs?: Json | null
          buying_type?: Database["public"]["Enums"]["meta_buying_type"] | null
          created_at?: string
          created_by?: string | null
          daily_budget?: number | null
          effective_status?: string | null
          firm_id?: string
          id?: string
          is_cbo?: boolean | null
          lifetime_budget?: number | null
          meta_campaign_id?: string | null
          name?: string
          objective?: Database["public"]["Enums"]["meta_objective"] | null
          published_at?: string | null
          raw?: Json | null
          review_status?:
            | Database["public"]["Enums"]["meta_review_status"]
            | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          special_ad_categories?: string[] | null
          special_ad_category_country?: string[] | null
          spend_cap?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["meta_campaign_status"] | null
          stop_time?: string | null
          target_country?: string | null
          target_states?: string[] | null
          tort_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_campaigns_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_creatives: {
        Row: {
          ad_account_id: string | null
          advantage_creative_features: Json | null
          asset_feed_spec: Json | null
          body: string | null
          call_to_action_type: string | null
          created_at: string
          creative_source: string
          degrees_of_freedom_spec: Json | null
          display_url: string | null
          firm_id: string
          id: string
          ig_account_id: string | null
          link_url: string | null
          meta_creative_id: string | null
          meta_genai_request_id: string | null
          name: string | null
          object_story_spec: Json | null
          page_id: string | null
          primary_media_id: string | null
          raw: Json | null
          status: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id?: string | null
          advantage_creative_features?: Json | null
          asset_feed_spec?: Json | null
          body?: string | null
          call_to_action_type?: string | null
          created_at?: string
          creative_source?: string
          degrees_of_freedom_spec?: Json | null
          display_url?: string | null
          firm_id: string
          id?: string
          ig_account_id?: string | null
          link_url?: string | null
          meta_creative_id?: string | null
          meta_genai_request_id?: string | null
          name?: string | null
          object_story_spec?: Json | null
          page_id?: string | null
          primary_media_id?: string | null
          raw?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string | null
          advantage_creative_features?: Json | null
          asset_feed_spec?: Json | null
          body?: string | null
          call_to_action_type?: string | null
          created_at?: string
          creative_source?: string
          degrees_of_freedom_spec?: Json | null
          display_url?: string | null
          firm_id?: string
          id?: string
          ig_account_id?: string | null
          link_url?: string | null
          meta_creative_id?: string | null
          meta_genai_request_id?: string | null
          name?: string | null
          object_story_spec?: Json | null
          page_id?: string | null
          primary_media_id?: string | null
          raw?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_creatives_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_creatives_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ig_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_creatives_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "meta_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_creatives_primary_media_id_fkey"
            columns: ["primary_media_id"]
            isOneToOne: false
            referencedRelation: "meta_media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_custom_audiences: {
        Row: {
          ad_account_id: string | null
          approximate_count: number | null
          created_at: string
          description: string | null
          firm_id: string
          id: string
          meta_audience_id: string
          name: string | null
          operation_status: Json | null
          raw: Json | null
          retention_days: number | null
          rule: Json | null
          subtype: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id?: string | null
          approximate_count?: number | null
          created_at?: string
          description?: string | null
          firm_id: string
          id?: string
          meta_audience_id: string
          name?: string | null
          operation_status?: Json | null
          raw?: Json | null
          retention_days?: number | null
          rule?: Json | null
          subtype?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string | null
          approximate_count?: number | null
          created_at?: string
          description?: string | null
          firm_id?: string
          id?: string
          meta_audience_id?: string
          name?: string | null
          operation_status?: Json | null
          raw?: Json | null
          retention_days?: number | null
          rule?: Json | null
          subtype?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_custom_audiences_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ig_accounts: {
        Row: {
          created_at: string
          firm_id: string
          followers_count: number | null
          id: string
          meta_ig_id: string
          page_id: string | null
          profile_picture_url: string | null
          raw: Json | null
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          firm_id: string
          followers_count?: number | null
          id?: string
          meta_ig_id: string
          page_id?: string | null
          profile_picture_url?: string | null
          raw?: Json | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          firm_id?: string
          followers_count?: number | null
          id?: string
          meta_ig_id?: string
          page_id?: string | null
          profile_picture_url?: string | null
          raw?: Json | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_ig_accounts_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "meta_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_insights_ad_daily: {
        Row: {
          actions: Json | null
          ad_id: string
          clicks: number | null
          conversion_value: number | null
          conversions: number | null
          cpc: number | null
          cpm: number | null
          ctr: number | null
          date_start: string
          fetched_at: string
          firm_id: string
          frequency: number | null
          id: string
          impressions: number | null
          raw: Json | null
          reach: number | null
          roas: number | null
          spend: number | null
          video_p100_watched_actions: Json | null
          video_p25_watched_actions: Json | null
          video_p50_watched_actions: Json | null
          video_p75_watched_actions: Json | null
        }
        Insert: {
          actions?: Json | null
          ad_id: string
          clicks?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          ctr?: number | null
          date_start: string
          fetched_at?: string
          firm_id: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          raw?: Json | null
          reach?: number | null
          roas?: number | null
          spend?: number | null
          video_p100_watched_actions?: Json | null
          video_p25_watched_actions?: Json | null
          video_p50_watched_actions?: Json | null
          video_p75_watched_actions?: Json | null
        }
        Update: {
          actions?: Json | null
          ad_id?: string
          clicks?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          ctr?: number | null
          date_start?: string
          fetched_at?: string
          firm_id?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          raw?: Json | null
          reach?: number | null
          roas?: number | null
          spend?: number | null
          video_p100_watched_actions?: Json | null
          video_p25_watched_actions?: Json | null
          video_p50_watched_actions?: Json | null
          video_p75_watched_actions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_insights_ad_daily_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "meta_ads"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_insights_adset_daily: {
        Row: {
          actions: Json | null
          ad_set_id: string
          clicks: number | null
          conversion_value: number | null
          conversions: number | null
          cpc: number | null
          cpm: number | null
          ctr: number | null
          date_start: string
          fetched_at: string
          firm_id: string
          frequency: number | null
          id: string
          impressions: number | null
          raw: Json | null
          reach: number | null
          roas: number | null
          spend: number | null
        }
        Insert: {
          actions?: Json | null
          ad_set_id: string
          clicks?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          ctr?: number | null
          date_start: string
          fetched_at?: string
          firm_id: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          raw?: Json | null
          reach?: number | null
          roas?: number | null
          spend?: number | null
        }
        Update: {
          actions?: Json | null
          ad_set_id?: string
          clicks?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          ctr?: number | null
          date_start?: string
          fetched_at?: string
          firm_id?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          raw?: Json | null
          reach?: number | null
          roas?: number | null
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_insights_adset_daily_ad_set_id_fkey"
            columns: ["ad_set_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_insights_campaign_daily: {
        Row: {
          action_values: Json | null
          actions: Json | null
          campaign_id: string
          clicks: number | null
          conversion_value: number | null
          conversions: number | null
          cpc: number | null
          cpm: number | null
          ctr: number | null
          date_start: string
          fetched_at: string
          firm_id: string
          frequency: number | null
          id: string
          impressions: number | null
          raw: Json | null
          reach: number | null
          roas: number | null
          spend: number | null
          unique_clicks: number | null
        }
        Insert: {
          action_values?: Json | null
          actions?: Json | null
          campaign_id: string
          clicks?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          ctr?: number | null
          date_start: string
          fetched_at?: string
          firm_id: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          raw?: Json | null
          reach?: number | null
          roas?: number | null
          spend?: number | null
          unique_clicks?: number | null
        }
        Update: {
          action_values?: Json | null
          actions?: Json | null
          campaign_id?: string
          clicks?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          ctr?: number | null
          date_start?: string
          fetched_at?: string
          firm_id?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          raw?: Json | null
          reach?: number | null
          roas?: number | null
          spend?: number | null
          unique_clicks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_insights_campaign_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_job_queue: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string
          firm_id: string | null
          id: string
          job_type: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number | null
          payload: Json
          priority: number | null
          result: Json | null
          run_after: string
          status: Database["public"]["Enums"]["meta_job_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string
          firm_id?: string | null
          id?: string
          job_type: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number | null
          payload?: Json
          priority?: number | null
          result?: Json | null
          run_after?: string
          status?: Database["public"]["Enums"]["meta_job_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string
          firm_id?: string | null
          id?: string
          job_type?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number | null
          payload?: Json
          priority?: number | null
          result?: Json | null
          run_after?: string
          status?: Database["public"]["Enums"]["meta_job_status"]
          updated_at?: string
        }
        Relationships: []
      }
      meta_lead_forms: {
        Row: {
          created_at: string
          firm_id: string
          follow_up_action_url: string | null
          id: string
          meta_form_id: string
          name: string | null
          page_id: string | null
          privacy_policy_url: string | null
          questions: Json | null
          raw: Json | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          firm_id: string
          follow_up_action_url?: string | null
          id?: string
          meta_form_id: string
          name?: string | null
          page_id?: string | null
          privacy_policy_url?: string | null
          questions?: Json | null
          raw?: Json | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          firm_id?: string
          follow_up_action_url?: string | null
          id?: string
          meta_form_id?: string
          name?: string | null
          page_id?: string | null
          privacy_policy_url?: string | null
          questions?: Json | null
          raw?: Json | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_lead_forms_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "meta_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_lead_submissions: {
        Row: {
          ad_id: string | null
          campaign_id: string | null
          created_at: string
          created_time: string | null
          field_data: Json | null
          firm_id: string
          form_id: string | null
          id: string
          meta_leadgen_id: string
          raw: Json | null
          synced_lead_id: string | null
        }
        Insert: {
          ad_id?: string | null
          campaign_id?: string | null
          created_at?: string
          created_time?: string | null
          field_data?: Json | null
          firm_id: string
          form_id?: string | null
          id?: string
          meta_leadgen_id: string
          raw?: Json | null
          synced_lead_id?: string | null
        }
        Update: {
          ad_id?: string | null
          campaign_id?: string | null
          created_at?: string
          created_time?: string | null
          field_data?: Json | null
          firm_id?: string
          form_id?: string | null
          id?: string
          meta_leadgen_id?: string
          raw?: Json | null
          synced_lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_lead_submissions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "meta_ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_lead_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_lead_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "meta_lead_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_media_assets: {
        Row: {
          ad_account_id: string | null
          created_at: string
          duration_seconds: number | null
          file_size_bytes: number | null
          firm_id: string
          height: number | null
          id: string
          meta_hash: string | null
          meta_video_id: string | null
          raw: Json | null
          storage_path: string | null
          thumbnail_url: string | null
          type: string
          updated_at: string
          url: string | null
          width: number | null
        }
        Insert: {
          ad_account_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          firm_id: string
          height?: number | null
          id?: string
          meta_hash?: string | null
          meta_video_id?: string | null
          raw?: Json | null
          storage_path?: string | null
          thumbnail_url?: string | null
          type: string
          updated_at?: string
          url?: string | null
          width?: number | null
        }
        Update: {
          ad_account_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          firm_id?: string
          height?: number | null
          id?: string
          meta_hash?: string | null
          meta_video_id?: string | null
          raw?: Json | null
          storage_path?: string | null
          thumbnail_url?: string | null
          type?: string
          updated_at?: string
          url?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_media_assets_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_pages: {
        Row: {
          access_token_ciphertext: string | null
          access_token_iv: string | null
          category: string | null
          created_at: string
          firm_id: string
          id: string
          meta_page_id: string
          name: string | null
          picture_url: string | null
          raw: Json | null
          tasks: string[] | null
          updated_at: string
        }
        Insert: {
          access_token_ciphertext?: string | null
          access_token_iv?: string | null
          category?: string | null
          created_at?: string
          firm_id: string
          id?: string
          meta_page_id: string
          name?: string | null
          picture_url?: string | null
          raw?: Json | null
          tasks?: string[] | null
          updated_at?: string
        }
        Update: {
          access_token_ciphertext?: string | null
          access_token_iv?: string | null
          category?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          meta_page_id?: string
          name?: string | null
          picture_url?: string | null
          raw?: Json | null
          tasks?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      meta_pixels: {
        Row: {
          ad_account_id: string | null
          code: string | null
          created_at: string
          firm_id: string
          id: string
          is_active: boolean | null
          last_fired_time: string | null
          meta_pixel_id: string
          name: string | null
          raw: Json | null
          updated_at: string
        }
        Insert: {
          ad_account_id?: string | null
          code?: string | null
          created_at?: string
          firm_id: string
          id?: string
          is_active?: boolean | null
          last_fired_time?: string | null
          meta_pixel_id: string
          name?: string | null
          raw?: Json | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string | null
          code?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          is_active?: boolean | null
          last_fired_time?: string | null
          meta_pixel_id?: string
          name?: string | null
          raw?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_pixels_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_recommendations: {
        Row: {
          ad_account_id: string | null
          applied_at: string | null
          applied_by: string | null
          body: string | null
          category: string
          confidence: number | null
          created_at: string
          dismissed_at: string | null
          firm_id: string
          id: string
          model_name: string | null
          raw: Json | null
          scope_id: string | null
          scope_level: Database["public"]["Enums"]["meta_object_level"] | null
          severity: string | null
          status: string | null
          suggested_action: Json | null
          title: string
        }
        Insert: {
          ad_account_id?: string | null
          applied_at?: string | null
          applied_by?: string | null
          body?: string | null
          category: string
          confidence?: number | null
          created_at?: string
          dismissed_at?: string | null
          firm_id: string
          id?: string
          model_name?: string | null
          raw?: Json | null
          scope_id?: string | null
          scope_level?: Database["public"]["Enums"]["meta_object_level"] | null
          severity?: string | null
          status?: string | null
          suggested_action?: Json | null
          title: string
        }
        Update: {
          ad_account_id?: string | null
          applied_at?: string | null
          applied_by?: string | null
          body?: string | null
          category?: string
          confidence?: number | null
          created_at?: string
          dismissed_at?: string | null
          firm_id?: string
          id?: string
          model_name?: string | null
          raw?: Json | null
          scope_id?: string | null
          scope_level?: Database["public"]["Enums"]["meta_object_level"] | null
          severity?: string | null
          status?: string | null
          suggested_action?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_recommendations_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_saved_audiences: {
        Row: {
          ad_account_id: string | null
          created_at: string
          created_by: string | null
          firm_id: string
          id: string
          name: string
          targeting_spec: Json
          updated_at: string
        }
        Insert: {
          ad_account_id?: string | null
          created_at?: string
          created_by?: string | null
          firm_id: string
          id?: string
          name: string
          targeting_spec?: Json
          updated_at?: string
        }
        Update: {
          ad_account_id?: string | null
          created_at?: string
          created_by?: string | null
          firm_id?: string
          id?: string
          name?: string
          targeting_spec?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_saved_audiences_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_saved_reports: {
        Row: {
          breakdowns: Json | null
          columns: Json | null
          created_at: string
          created_by: string | null
          date_preset: string | null
          description: string | null
          filters: Json | null
          firm_id: string
          id: string
          level: Database["public"]["Enums"]["meta_object_level"]
          name: string
          recipients: string[] | null
          schedule: Json | null
          updated_at: string
        }
        Insert: {
          breakdowns?: Json | null
          columns?: Json | null
          created_at?: string
          created_by?: string | null
          date_preset?: string | null
          description?: string | null
          filters?: Json | null
          firm_id: string
          id?: string
          level: Database["public"]["Enums"]["meta_object_level"]
          name: string
          recipients?: string[] | null
          schedule?: Json | null
          updated_at?: string
        }
        Update: {
          breakdowns?: Json | null
          columns?: Json | null
          created_at?: string
          created_by?: string | null
          date_preset?: string | null
          description?: string | null
          filters?: Json | null
          firm_id?: string
          id?: string
          level?: Database["public"]["Enums"]["meta_object_level"]
          name?: string
          recipients?: string[] | null
          schedule?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      meta_sync_state: {
        Row: {
          ad_account_id: string | null
          created_at: string
          entity_type: string
          firm_id: string
          id: string
          last_cursor: string | null
          last_error: string | null
          last_status: string | null
          last_synced_at: string | null
          next_run_at: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id?: string | null
          created_at?: string
          entity_type: string
          firm_id: string
          id?: string
          last_cursor?: string | null
          last_error?: string | null
          last_status?: string | null
          last_synced_at?: string | null
          next_run_at?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string | null
          created_at?: string
          entity_type?: string
          firm_id?: string
          id?: string
          last_cursor?: string | null
          last_error?: string | null
          last_status?: string | null
          last_synced_at?: string | null
          next_run_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_sync_state_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_webhook_events: {
        Row: {
          error: string | null
          field: string | null
          firm_id: string | null
          id: string
          meta_object_id: string | null
          object: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          received_at: string
          signature_header: string | null
          signature_valid: boolean | null
        }
        Insert: {
          error?: string | null
          field?: string | null
          firm_id?: string | null
          id?: string
          meta_object_id?: string | null
          object: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string
          signature_header?: string | null
          signature_valid?: boolean | null
        }
        Update: {
          error?: string | null
          field?: string | null
          firm_id?: string | null
          id?: string
          meta_object_id?: string | null
          object?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string
          signature_header?: string | null
          signature_valid?: boolean | null
        }
        Relationships: []
      }
      mt_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          firm_id: string
          id: string
          ip: unknown
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          firm_id: string
          id?: string
          ip?: unknown
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          firm_id?: string
          id?: string
          ip?: unknown
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      mt_case_documents: {
        Row: {
          case_id: string
          created_at: string
          file_name: string
          firm_id: string
          id: string
          mime_type: string | null
          scan_result: Json
          scan_status: Database["public"]["Enums"]["mt_scan_status"]
          size_bytes: number
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          file_name: string
          firm_id: string
          id?: string
          mime_type?: string | null
          scan_result?: Json
          scan_status?: Database["public"]["Enums"]["mt_scan_status"]
          size_bytes?: number
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          file_name?: string
          firm_id?: string
          id?: string
          mime_type?: string | null
          scan_result?: Json
          scan_status?: Database["public"]["Enums"]["mt_scan_status"]
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mt_case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "mt_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      mt_cases: {
        Row: {
          assigned_to: string | null
          case_number: string
          created_at: string
          created_by: string | null
          firm_id: string
          id: string
          incident_date: string | null
          metadata: Json
          plaintiff_display: string | null
          plaintiff_name_encrypted: string | null
          status: Database["public"]["Enums"]["mt_case_status"]
          statute_of_limitations: string | null
          title: string
          tort_type: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          case_number: string
          created_at?: string
          created_by?: string | null
          firm_id: string
          id?: string
          incident_date?: string | null
          metadata?: Json
          plaintiff_display?: string | null
          plaintiff_name_encrypted?: string | null
          status?: Database["public"]["Enums"]["mt_case_status"]
          statute_of_limitations?: string | null
          title: string
          tort_type?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          case_number?: string
          created_at?: string
          created_by?: string | null
          firm_id?: string
          id?: string
          incident_date?: string | null
          metadata?: Json
          plaintiff_display?: string | null
          plaintiff_name_encrypted?: string | null
          status?: Database["public"]["Enums"]["mt_case_status"]
          statute_of_limitations?: string | null
          title?: string
          tort_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mt_firm_quotas: {
        Row: {
          cases_count: number
          cases_limit: number
          doc_count: number
          doc_count_limit: number
          firm_id: string
          storage_bytes_limit: number
          storage_bytes_used: number
          updated_at: string
        }
        Insert: {
          cases_count?: number
          cases_limit?: number
          doc_count?: number
          doc_count_limit?: number
          firm_id: string
          storage_bytes_limit?: number
          storage_bytes_used?: number
          updated_at?: string
        }
        Update: {
          cases_count?: number
          cases_limit?: number
          doc_count?: number
          doc_count_limit?: number
          firm_id?: string
          storage_bytes_limit?: number
          storage_bytes_used?: number
          updated_at?: string
        }
        Relationships: []
      }
      mt_notifications: {
        Row: {
          body: string | null
          created_at: string
          firm_id: string
          id: string
          payload: Json
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["mt_notification_type"]
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          firm_id: string
          id?: string
          payload?: Json
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["mt_notification_type"]
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          payload?: Json
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["mt_notification_type"]
          user_id?: string | null
        }
        Relationships: []
      }
      mt_saved_views: {
        Row: {
          created_at: string
          filters: Json
          firm_id: string
          id: string
          is_shared: boolean
          name: string
          updated_at: string
          user_id: string
          view_type: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          firm_id: string
          id?: string
          is_shared?: boolean
          name: string
          updated_at?: string
          user_id: string
          view_type: string
        }
        Update: {
          created_at?: string
          filters?: Json
          firm_id?: string
          id?: string
          is_shared?: boolean
          name?: string
          updated_at?: string
          user_id?: string
          view_type?: string
        }
        Relationships: []
      }
      mt_webhook_errors: {
        Row: {
          created_at: string
          endpoint: string
          error: string | null
          event_type: string
          firm_id: string
          id: string
          last_attempt_at: string | null
          next_retry_at: string | null
          payload: Json
          resolved_at: string | null
          retry_count: number
          status_code: number | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          error?: string | null
          event_type: string
          firm_id: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          resolved_at?: string | null
          retry_count?: number
          status_code?: number | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          error?: string | null
          event_type?: string
          firm_id?: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          resolved_at?: string | null
          retry_count?: number
          status_code?: number | null
        }
        Relationships: []
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
      pipeline_charges: {
        Row: {
          amount: number
          created_at: string
          firm_id: string
          from_stage: string
          id: string
          lead_id: string
          payment_method: string
          status: string
          stripe_session_id: string | null
          to_stage: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          firm_id: string
          from_stage: string
          id?: string
          lead_id: string
          payment_method?: string
          status?: string
          stripe_session_id?: string | null
          to_stage: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          firm_id?: string
          from_stage?: string
          id?: string
          lead_id?: string
          payment_method?: string
          status?: string
          stripe_session_id?: string | null
          to_stage?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_connections: {
        Row: {
          access_token: string | null
          access_token_ciphertext: string | null
          access_token_iv: string | null
          ad_account_id: string | null
          business_id: string | null
          connected_at: string | null
          created_at: string
          firm_id: string | null
          id: string
          is_active: boolean | null
          last_token_refresh_at: string | null
          metadata: Json | null
          page_access_token: string | null
          page_id: string | null
          page_name: string | null
          permissions: string[] | null
          platform: string
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          refresh_token_ciphertext: string | null
          refresh_token_iv: string | null
          token_expires_at: string | null
          token_refresh_error: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          access_token_ciphertext?: string | null
          access_token_iv?: string | null
          ad_account_id?: string | null
          business_id?: string | null
          connected_at?: string | null
          created_at?: string
          firm_id?: string | null
          id?: string
          is_active?: boolean | null
          last_token_refresh_at?: string | null
          metadata?: Json | null
          page_access_token?: string | null
          page_id?: string | null
          page_name?: string | null
          permissions?: string[] | null
          platform: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          refresh_token_ciphertext?: string | null
          refresh_token_iv?: string | null
          token_expires_at?: string | null
          token_refresh_error?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          access_token_ciphertext?: string | null
          access_token_iv?: string | null
          ad_account_id?: string | null
          business_id?: string | null
          connected_at?: string | null
          created_at?: string
          firm_id?: string | null
          id?: string
          is_active?: boolean | null
          last_token_refresh_at?: string | null
          metadata?: Json | null
          page_access_token?: string | null
          page_id?: string | null
          page_name?: string | null
          permissions?: string[] | null
          platform?: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          refresh_token_ciphertext?: string | null
          refresh_token_iv?: string | null
          token_expires_at?: string | null
          token_refresh_error?: string | null
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
      predictive_lead_signals: {
        Row: {
          ai_reasoning: string | null
          confidence: number | null
          created_at: string
          data_sources: Json | null
          detected_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          predicted_timeframe: string | null
          predicted_volume: number | null
          signal_strength: number
          signal_type: string
          state: string
          tort_type: string
        }
        Insert: {
          ai_reasoning?: string | null
          confidence?: number | null
          created_at?: string
          data_sources?: Json | null
          detected_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          predicted_timeframe?: string | null
          predicted_volume?: number | null
          signal_strength?: number
          signal_type: string
          state: string
          tort_type: string
        }
        Update: {
          ai_reasoning?: string | null
          confidence?: number | null
          created_at?: string
          data_sources?: Json | null
          detected_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          predicted_timeframe?: string | null
          predicted_volume?: number | null
          signal_strength?: number
          signal_type?: string
          state?: string
          tort_type?: string
        }
        Relationships: []
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
      recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          source: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          source?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          source?: string
          used_at?: string | null
          user_id?: string
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
      role_module_permissions: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          module_key: string
          role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_key: string
          role: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_key?: string
          role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      scrape_insights: {
        Row: {
          firm_id: string
          generated_at: string
          id: string
          job_id: string | null
          new_products: Json
          price_changes: Json
          removed_products: Json
          summary: string | null
          trending: Json
          watchlist_id: string
        }
        Insert: {
          firm_id: string
          generated_at?: string
          id?: string
          job_id?: string | null
          new_products?: Json
          price_changes?: Json
          removed_products?: Json
          summary?: string | null
          trending?: Json
          watchlist_id: string
        }
        Update: {
          firm_id?: string
          generated_at?: string
          id?: string
          job_id?: string | null
          new_products?: Json
          price_changes?: Json
          removed_products?: Json
          summary?: string | null
          trending?: Json
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_insights_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_insights_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scrape_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_insights_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "ecom_watchlist"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_jobs: {
        Row: {
          attempts: number
          created_at: string
          duration_ms: number | null
          error_class: string | null
          finished_at: string | null
          firm_id: string
          id: string
          marketplace: string
          price_changes_count: number | null
          priority: Database["public"]["Enums"]["scrape_priority"]
          products_found: number | null
          products_new: number | null
          products_removed: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["scrape_job_status"]
          updated_at: string
          watchlist_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          duration_ms?: number | null
          error_class?: string | null
          finished_at?: string | null
          firm_id: string
          id?: string
          marketplace: string
          price_changes_count?: number | null
          priority?: Database["public"]["Enums"]["scrape_priority"]
          products_found?: number | null
          products_new?: number | null
          products_removed?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["scrape_job_status"]
          updated_at?: string
          watchlist_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          duration_ms?: number | null
          error_class?: string | null
          finished_at?: string | null
          firm_id?: string
          id?: string
          marketplace?: string
          price_changes_count?: number | null
          priority?: Database["public"]["Enums"]["scrape_priority"]
          products_found?: number | null
          products_new?: number | null
          products_removed?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["scrape_job_status"]
          updated_at?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_jobs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_jobs_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "ecom_watchlist"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_logs: {
        Row: {
          created_at: string
          error_class: string | null
          html_url: string | null
          id: string
          job_id: string
          level: string
          message: string
          meta: Json
          screenshot_url: string | null
        }
        Insert: {
          created_at?: string
          error_class?: string | null
          html_url?: string | null
          id?: string
          job_id: string
          level?: string
          message: string
          meta?: Json
          screenshot_url?: string | null
        }
        Update: {
          created_at?: string
          error_class?: string | null
          html_url?: string | null
          id?: string
          job_id?: string
          level?: string
          message?: string
          meta?: Json
          screenshot_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrape_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scrape_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_product_history: {
        Row: {
          id: string
          original_price: number | null
          price: number | null
          product_ref: string
          rating: number | null
          review_count: number | null
          snapshot_at: string
          sold_count: number | null
          stock_status: string | null
          watchlist_id: string
        }
        Insert: {
          id?: string
          original_price?: number | null
          price?: number | null
          product_ref: string
          rating?: number | null
          review_count?: number | null
          snapshot_at?: string
          sold_count?: number | null
          stock_status?: string | null
          watchlist_id: string
        }
        Update: {
          id?: string
          original_price?: number | null
          price?: number | null
          product_ref?: string
          rating?: number | null
          review_count?: number | null
          snapshot_at?: string
          sold_count?: number | null
          stock_status?: string | null
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_product_history_product_ref_fkey"
            columns: ["product_ref"]
            isOneToOne: false
            referencedRelation: "scrape_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_product_history_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "ecom_watchlist"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_products: {
        Row: {
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          discount: number | null
          external_product_id: string
          firm_id: string
          id: string
          image: string | null
          images: Json
          marketplace: string
          original_price: number | null
          price: number | null
          product_url: string | null
          rating: number | null
          raw: Json
          review_count: number | null
          scraped_at: string
          seller: string | null
          seller_id: string | null
          seller_rating: number | null
          sold_count: number | null
          stock_status: string | null
          title: string | null
          updated_at: string
          watchlist_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          discount?: number | null
          external_product_id: string
          firm_id: string
          id?: string
          image?: string | null
          images?: Json
          marketplace: string
          original_price?: number | null
          price?: number | null
          product_url?: string | null
          rating?: number | null
          raw?: Json
          review_count?: number | null
          scraped_at?: string
          seller?: string | null
          seller_id?: string | null
          seller_rating?: number | null
          sold_count?: number | null
          stock_status?: string | null
          title?: string | null
          updated_at?: string
          watchlist_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          discount?: number | null
          external_product_id?: string
          firm_id?: string
          id?: string
          image?: string | null
          images?: Json
          marketplace?: string
          original_price?: number | null
          price?: number | null
          product_url?: string | null
          rating?: number | null
          raw?: Json
          review_count?: number | null
          scraped_at?: string
          seller?: string | null
          seller_id?: string | null
          seller_rating?: number | null
          sold_count?: number | null
          stock_status?: string | null
          title?: string | null
          updated_at?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_products_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_products_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "ecom_watchlist"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_issues: {
        Row: {
          category: string
          created_at: string
          firm_id: string
          id: string
          message: string
          page_url: string | null
          recommendation: string | null
          scan_id: string
          severity: string
        }
        Insert: {
          category: string
          created_at?: string
          firm_id: string
          id?: string
          message: string
          page_url?: string | null
          recommendation?: string | null
          scan_id: string
          severity?: string
        }
        Update: {
          category?: string
          created_at?: string
          firm_id?: string
          id?: string
          message?: string
          page_url?: string | null
          recommendation?: string | null
          scan_id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_issues_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "seo_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_scans: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          errors_count: number | null
          firm_id: string
          id: string
          overall_score: number | null
          pages_crawled: number | null
          raw_report: Json | null
          status: string
          summary: Json | null
          url: string
          warnings_count: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          errors_count?: number | null
          firm_id: string
          id?: string
          overall_score?: number | null
          pages_crawled?: number | null
          raw_report?: Json | null
          status?: string
          summary?: Json | null
          url: string
          warnings_count?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          errors_count?: number | null
          firm_id?: string
          id?: string
          overall_score?: number | null
          pages_crawled?: number | null
          raw_report?: Json | null
          status?: string
          summary?: Json | null
          url?: string
          warnings_count?: number | null
        }
        Relationships: []
      }
      seo_thresholds: {
        Row: {
          description_max: number
          description_min: number
          firm_id: string
          h1_max: number
          title_max: number
          title_min: number
          updated_at: string
          updated_by: string | null
          word_count_min: number
        }
        Insert: {
          description_max?: number
          description_min?: number
          firm_id: string
          h1_max?: number
          title_max?: number
          title_min?: number
          updated_at?: string
          updated_by?: string | null
          word_count_min?: number
        }
        Update: {
          description_max?: number
          description_min?: number
          firm_id?: string
          h1_max?: number
          title_max?: number
          title_min?: number
          updated_at?: string
          updated_by?: string | null
          word_count_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "seo_thresholds_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: true
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
      team_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          invited_by: string
          permissions: Database["public"]["Enums"]["team_permission"][]
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          invited_by: string
          permissions?: Database["public"]["Enums"]["team_permission"][]
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          invited_by?: string
          permissions?: Database["public"]["Enums"]["team_permission"][]
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          firm_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          firm_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          firm_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_ad_accounts: {
        Row: {
          advertiser_id: string
          balance: number | null
          business_center_id: string | null
          connection_id: string | null
          created_at: string
          currency: string | null
          firm_id: string
          id: string
          is_active: boolean
          is_selected: boolean
          name: string | null
          raw: Json | null
          role: string | null
          status: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          balance?: number | null
          business_center_id?: string | null
          connection_id?: string | null
          created_at?: string
          currency?: string | null
          firm_id: string
          id?: string
          is_active?: boolean
          is_selected?: boolean
          name?: string | null
          raw?: Json | null
          role?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          balance?: number | null
          business_center_id?: string | null
          connection_id?: string | null
          created_at?: string
          currency?: string | null
          firm_id?: string
          id?: string
          is_active?: boolean
          is_selected?: boolean
          name?: string | null
          raw?: Json | null
          role?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tiktok_ad_groups: {
        Row: {
          advertiser_id: string
          bid_price: number | null
          bid_type: string | null
          budget: number | null
          budget_mode: string | null
          campaign_id: string | null
          created_at: string
          firm_id: string
          frequency_cap: Json | null
          id: string
          name: string
          optimization_goal: string | null
          placement_type: string | null
          placements: Json | null
          raw: Json | null
          schedule_end_time: string | null
          schedule_start_time: string | null
          schedule_type: string | null
          status: string | null
          targeting: Json | null
          tiktok_adgroup_id: string | null
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          bid_price?: number | null
          bid_type?: string | null
          budget?: number | null
          budget_mode?: string | null
          campaign_id?: string | null
          created_at?: string
          firm_id: string
          frequency_cap?: Json | null
          id?: string
          name: string
          optimization_goal?: string | null
          placement_type?: string | null
          placements?: Json | null
          raw?: Json | null
          schedule_end_time?: string | null
          schedule_start_time?: string | null
          schedule_type?: string | null
          status?: string | null
          targeting?: Json | null
          tiktok_adgroup_id?: string | null
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          bid_price?: number | null
          bid_type?: string | null
          budget?: number | null
          budget_mode?: string | null
          campaign_id?: string | null
          created_at?: string
          firm_id?: string
          frequency_cap?: Json | null
          id?: string
          name?: string
          optimization_goal?: string | null
          placement_type?: string | null
          placements?: Json | null
          raw?: Json | null
          schedule_end_time?: string | null
          schedule_start_time?: string | null
          schedule_type?: string | null
          status?: string | null
          targeting?: Json | null
          tiktok_adgroup_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_ad_groups_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "tiktok_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_ads: {
        Row: {
          ad_format: string | null
          ad_text: string | null
          adgroup_id: string | null
          advertiser_id: string
          ai_generated: boolean | null
          call_to_action: string | null
          campaign_id: string | null
          created_at: string
          display_name: string | null
          firm_id: string
          id: string
          identity_id: string | null
          identity_type: string | null
          image_ids: Json | null
          is_spark_ad: boolean | null
          landing_page_url: string | null
          name: string
          raw: Json | null
          status: string | null
          tiktok_ad_id: string | null
          tiktok_item_id: string | null
          updated_at: string
          utm_params: Json | null
          video_id: string | null
        }
        Insert: {
          ad_format?: string | null
          ad_text?: string | null
          adgroup_id?: string | null
          advertiser_id: string
          ai_generated?: boolean | null
          call_to_action?: string | null
          campaign_id?: string | null
          created_at?: string
          display_name?: string | null
          firm_id: string
          id?: string
          identity_id?: string | null
          identity_type?: string | null
          image_ids?: Json | null
          is_spark_ad?: boolean | null
          landing_page_url?: string | null
          name: string
          raw?: Json | null
          status?: string | null
          tiktok_ad_id?: string | null
          tiktok_item_id?: string | null
          updated_at?: string
          utm_params?: Json | null
          video_id?: string | null
        }
        Update: {
          ad_format?: string | null
          ad_text?: string | null
          adgroup_id?: string | null
          advertiser_id?: string
          ai_generated?: boolean | null
          call_to_action?: string | null
          campaign_id?: string | null
          created_at?: string
          display_name?: string | null
          firm_id?: string
          id?: string
          identity_id?: string | null
          identity_type?: string | null
          image_ids?: Json | null
          is_spark_ad?: boolean | null
          landing_page_url?: string | null
          name?: string
          raw?: Json | null
          status?: string | null
          tiktok_ad_id?: string | null
          tiktok_item_id?: string | null
          updated_at?: string
          utm_params?: Json | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_ads_adgroup_id_fkey"
            columns: ["adgroup_id"]
            isOneToOne: false
            referencedRelation: "tiktok_ad_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiktok_ads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "tiktok_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_ai_logs: {
        Row: {
          action_type: string
          actor_id: string | null
          created_at: string
          firm_id: string | null
          id: string
          metadata: Json | null
          model: string | null
          prompt_summary: string | null
          response_summary: string | null
          tokens_used: number | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          created_at?: string
          firm_id?: string | null
          id?: string
          metadata?: Json | null
          model?: string | null
          prompt_summary?: string | null
          response_summary?: string | null
          tokens_used?: number | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          created_at?: string
          firm_id?: string | null
          id?: string
          metadata?: Json | null
          model?: string | null
          prompt_summary?: string | null
          response_summary?: string | null
          tokens_used?: number | null
        }
        Relationships: []
      }
      tiktok_audiences: {
        Row: {
          advertiser_id: string
          audience_type: string | null
          created_at: string
          firm_id: string
          id: string
          name: string
          raw: Json | null
          size_estimate: number | null
          spec: Json | null
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          audience_type?: string | null
          created_at?: string
          firm_id: string
          id?: string
          name: string
          raw?: Json | null
          size_estimate?: number | null
          spec?: Json | null
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          audience_type?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          name?: string
          raw?: Json | null
          size_estimate?: number | null
          spec?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      tiktok_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          diff: Json | null
          firm_id: string
          id: string
          object_id: string | null
          object_level:
            | Database["public"]["Enums"]["tiktok_object_level"]
            | null
          tiktok_object_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          diff?: Json | null
          firm_id: string
          id?: string
          object_id?: string | null
          object_level?:
            | Database["public"]["Enums"]["tiktok_object_level"]
            | null
          tiktok_object_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          diff?: Json | null
          firm_id?: string
          id?: string
          object_id?: string | null
          object_level?:
            | Database["public"]["Enums"]["tiktok_object_level"]
            | null
          tiktok_object_id?: string | null
        }
        Relationships: []
      }
      tiktok_automated_rules: {
        Row: {
          actions: Json
          advertiser_id: string | null
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          firm_id: string
          id: string
          is_enabled: boolean | null
          last_result: Json | null
          last_run_at: string | null
          name: string
          scope: string | null
          scope_ids: Json | null
          updated_at: string
        }
        Insert: {
          actions?: Json
          advertiser_id?: string | null
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          firm_id: string
          id?: string
          is_enabled?: boolean | null
          last_result?: Json | null
          last_run_at?: string | null
          name: string
          scope?: string | null
          scope_ids?: Json | null
          updated_at?: string
        }
        Update: {
          actions?: Json
          advertiser_id?: string | null
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          firm_id?: string
          id?: string
          is_enabled?: boolean | null
          last_result?: Json | null
          last_run_at?: string | null
          name?: string
          scope?: string | null
          scope_ids?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      tiktok_business_centers: {
        Row: {
          bc_id: string
          created_at: string
          firm_id: string
          id: string
          name: string | null
          raw: Json | null
        }
        Insert: {
          bc_id: string
          created_at?: string
          firm_id: string
          id?: string
          name?: string | null
          raw?: Json | null
        }
        Update: {
          bc_id?: string
          created_at?: string
          firm_id?: string
          id?: string
          name?: string | null
          raw?: Json | null
        }
        Relationships: []
      }
      tiktok_campaigns: {
        Row: {
          advertiser_id: string
          ai_generated: boolean | null
          bid_strategy: string | null
          budget: number | null
          budget_mode: string | null
          created_at: string
          created_by: string | null
          end_time: string | null
          firm_id: string
          id: string
          is_archived: boolean | null
          name: string
          objective: string | null
          published_at: string | null
          raw: Json | null
          start_time: string | null
          status: string | null
          tiktok_campaign_id: string | null
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          ai_generated?: boolean | null
          bid_strategy?: string | null
          budget?: number | null
          budget_mode?: string | null
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          firm_id: string
          id?: string
          is_archived?: boolean | null
          name: string
          objective?: string | null
          published_at?: string | null
          raw?: Json | null
          start_time?: string | null
          status?: string | null
          tiktok_campaign_id?: string | null
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          ai_generated?: boolean | null
          bid_strategy?: string | null
          budget?: number | null
          budget_mode?: string | null
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          firm_id?: string
          id?: string
          is_archived?: boolean | null
          name?: string
          objective?: string | null
          published_at?: string | null
          raw?: Json | null
          start_time?: string | null
          status?: string | null
          tiktok_campaign_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tiktok_creatives: {
        Row: {
          advertiser_id: string | null
          ai_generated: boolean | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          file_name: string | null
          firm_id: string
          height: number | null
          id: string
          material_type: string | null
          raw: Json | null
          size_bytes: number | null
          storage_path: string | null
          tags: string[] | null
          thumbnail_url: string | null
          tiktok_material_id: string | null
          url: string | null
          width: number | null
        }
        Insert: {
          advertiser_id?: string | null
          ai_generated?: boolean | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          file_name?: string | null
          firm_id: string
          height?: number | null
          id?: string
          material_type?: string | null
          raw?: Json | null
          size_bytes?: number | null
          storage_path?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          tiktok_material_id?: string | null
          url?: string | null
          width?: number | null
        }
        Update: {
          advertiser_id?: string | null
          ai_generated?: boolean | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          file_name?: string | null
          firm_id?: string
          height?: number | null
          id?: string
          material_type?: string | null
          raw?: Json | null
          size_bytes?: number | null
          storage_path?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          tiktok_material_id?: string | null
          url?: string | null
          width?: number | null
        }
        Relationships: []
      }
      tiktok_custom_audiences: {
        Row: {
          advertiser_id: string
          audience_subtype: string | null
          created_at: string
          firm_id: string
          id: string
          name: string
          raw: Json | null
          size: number | null
          status: string | null
          tiktok_audience_id: string | null
        }
        Insert: {
          advertiser_id: string
          audience_subtype?: string | null
          created_at?: string
          firm_id: string
          id?: string
          name: string
          raw?: Json | null
          size?: number | null
          status?: string | null
          tiktok_audience_id?: string | null
        }
        Update: {
          advertiser_id?: string
          audience_subtype?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          name?: string
          raw?: Json | null
          size?: number | null
          status?: string | null
          tiktok_audience_id?: string | null
        }
        Relationships: []
      }
      tiktok_insights_ad_daily: {
        Row: {
          ad_id: string | null
          advertiser_id: string
          clicks: number | null
          conversions: number | null
          cost_per_conversion: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          engagements: number | null
          firm_id: string
          id: string
          impressions: number | null
          raw: Json | null
          spend: number | null
          stat_date: string
          tiktok_ad_id: string | null
          video_play_actions: number | null
        }
        Insert: {
          ad_id?: string | null
          advertiser_id: string
          clicks?: number | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          engagements?: number | null
          firm_id: string
          id?: string
          impressions?: number | null
          raw?: Json | null
          spend?: number | null
          stat_date: string
          tiktok_ad_id?: string | null
          video_play_actions?: number | null
        }
        Update: {
          ad_id?: string | null
          advertiser_id?: string
          clicks?: number | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          engagements?: number | null
          firm_id?: string
          id?: string
          impressions?: number | null
          raw?: Json | null
          spend?: number | null
          stat_date?: string
          tiktok_ad_id?: string | null
          video_play_actions?: number | null
        }
        Relationships: []
      }
      tiktok_insights_adgroup_daily: {
        Row: {
          adgroup_id: string | null
          advertiser_id: string
          clicks: number | null
          conversions: number | null
          cost_per_conversion: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          firm_id: string
          frequency: number | null
          id: string
          impressions: number | null
          raw: Json | null
          reach: number | null
          spend: number | null
          stat_date: string
          tiktok_adgroup_id: string | null
        }
        Insert: {
          adgroup_id?: string | null
          advertiser_id: string
          clicks?: number | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          firm_id: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          raw?: Json | null
          reach?: number | null
          spend?: number | null
          stat_date: string
          tiktok_adgroup_id?: string | null
        }
        Update: {
          adgroup_id?: string | null
          advertiser_id?: string
          clicks?: number | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          firm_id?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          raw?: Json | null
          reach?: number | null
          spend?: number | null
          stat_date?: string
          tiktok_adgroup_id?: string | null
        }
        Relationships: []
      }
      tiktok_insights_campaign_daily: {
        Row: {
          advertiser_id: string
          average_video_play: number | null
          campaign_id: string | null
          clicks: number | null
          conversion_rate: number | null
          conversions: number | null
          cost_per_conversion: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          engagements: number | null
          firm_id: string
          frequency: number | null
          id: string
          impressions: number | null
          purchases: number | null
          raw: Json | null
          reach: number | null
          revenue: number | null
          roas: number | null
          spend: number | null
          stat_date: string
          tiktok_campaign_id: string | null
          video_play_actions: number | null
          video_watched_2s: number | null
          video_watched_6s: number | null
        }
        Insert: {
          advertiser_id: string
          average_video_play?: number | null
          campaign_id?: string | null
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          engagements?: number | null
          firm_id: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          purchases?: number | null
          raw?: Json | null
          reach?: number | null
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          stat_date: string
          tiktok_campaign_id?: string | null
          video_play_actions?: number | null
          video_watched_2s?: number | null
          video_watched_6s?: number | null
        }
        Update: {
          advertiser_id?: string
          average_video_play?: number | null
          campaign_id?: string | null
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          engagements?: number | null
          firm_id?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          purchases?: number | null
          raw?: Json | null
          reach?: number | null
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          stat_date?: string
          tiktok_campaign_id?: string | null
          video_play_actions?: number | null
          video_watched_2s?: number | null
          video_watched_6s?: number | null
        }
        Relationships: []
      }
      tiktok_job_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          firm_id: string | null
          id: string
          job_type: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          payload: Json
          priority: number
          result: Json | null
          run_after: string
          status: Database["public"]["Enums"]["tiktok_job_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          firm_id?: string | null
          id?: string
          job_type: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          result?: Json | null
          run_after?: string
          status?: Database["public"]["Enums"]["tiktok_job_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          firm_id?: string | null
          id?: string
          job_type?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          result?: Json | null
          run_after?: string
          status?: Database["public"]["Enums"]["tiktok_job_status"]
          updated_at?: string
        }
        Relationships: []
      }
      tiktok_lookalikes: {
        Row: {
          advertiser_id: string
          country_code: string | null
          created_at: string
          firm_id: string
          id: string
          name: string
          raw: Json | null
          seed_audience_id: string | null
          similarity: string | null
          size: number | null
          status: string | null
          tiktok_audience_id: string | null
        }
        Insert: {
          advertiser_id: string
          country_code?: string | null
          created_at?: string
          firm_id: string
          id?: string
          name: string
          raw?: Json | null
          seed_audience_id?: string | null
          similarity?: string | null
          size?: number | null
          status?: string | null
          tiktok_audience_id?: string | null
        }
        Update: {
          advertiser_id?: string
          country_code?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          name?: string
          raw?: Json | null
          seed_audience_id?: string | null
          similarity?: string | null
          size?: number | null
          status?: string | null
          tiktok_audience_id?: string | null
        }
        Relationships: []
      }
      tiktok_recommendations: {
        Row: {
          advertiser_id: string | null
          applied_at: string | null
          applied_by: string | null
          created_at: string
          dismissed_at: string | null
          firm_id: string
          id: string
          metadata: Json | null
          rationale: string | null
          recommendation_type: string
          scope: Database["public"]["Enums"]["tiktok_object_level"] | null
          scope_id: string | null
          severity: string | null
          status: string | null
          suggested_action: Json | null
          summary: string | null
          tiktok_object_id: string | null
          title: string
        }
        Insert: {
          advertiser_id?: string | null
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string
          dismissed_at?: string | null
          firm_id: string
          id?: string
          metadata?: Json | null
          rationale?: string | null
          recommendation_type: string
          scope?: Database["public"]["Enums"]["tiktok_object_level"] | null
          scope_id?: string | null
          severity?: string | null
          status?: string | null
          suggested_action?: Json | null
          summary?: string | null
          tiktok_object_id?: string | null
          title: string
        }
        Update: {
          advertiser_id?: string | null
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string
          dismissed_at?: string | null
          firm_id?: string
          id?: string
          metadata?: Json | null
          rationale?: string | null
          recommendation_type?: string
          scope?: Database["public"]["Enums"]["tiktok_object_level"] | null
          scope_id?: string | null
          severity?: string | null
          status?: string | null
          suggested_action?: Json | null
          summary?: string | null
          tiktok_object_id?: string | null
          title?: string
        }
        Relationships: []
      }
      tiktok_sync_state: {
        Row: {
          advertiser_id: string
          cursor: string | null
          entity: string
          firm_id: string
          id: string
          last_synced_at: string | null
          raw: Json | null
          status: string | null
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          cursor?: string | null
          entity: string
          firm_id: string
          id?: string
          last_synced_at?: string | null
          raw?: Json | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          cursor?: string | null
          entity?: string
          firm_id?: string
          id?: string
          last_synced_at?: string | null
          raw?: Json | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
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
      user_presence: {
        Row: {
          id: string
          is_online: boolean | null
          last_seen_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      vertical_ai_prompts: {
        Row: {
          created_at: string
          firm_id: string | null
          id: string
          is_active: boolean
          model: string | null
          output_schema: Json | null
          prompt_type: string
          system_prompt: string
          updated_at: string
          version: number
          vertical_id: string
        }
        Insert: {
          created_at?: string
          firm_id?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          output_schema?: Json | null
          prompt_type: string
          system_prompt: string
          updated_at?: string
          version?: number
          vertical_id: string
        }
        Update: {
          created_at?: string
          firm_id?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          output_schema?: Json | null
          prompt_type?: string
          system_prompt?: string
          updated_at?: string
          version?: number
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertical_ai_prompts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vertical_ai_prompts_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "industry_verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      vertical_intake_fields: {
        Row: {
          created_at: string
          field_key: string
          field_order: number
          field_type: string
          firm_id: string | null
          id: string
          is_active: boolean
          label: string
          options: Json | null
          placeholder: string | null
          required: boolean
          updated_at: string
          validation_regex: string | null
          vertical_id: string
        }
        Insert: {
          created_at?: string
          field_key: string
          field_order?: number
          field_type?: string
          firm_id?: string | null
          id?: string
          is_active?: boolean
          label: string
          options?: Json | null
          placeholder?: string | null
          required?: boolean
          updated_at?: string
          validation_regex?: string | null
          vertical_id: string
        }
        Update: {
          created_at?: string
          field_key?: string
          field_order?: number
          field_type?: string
          firm_id?: string | null
          id?: string
          is_active?: boolean
          label?: string
          options?: Json | null
          placeholder?: string | null
          required?: boolean
          updated_at?: string
          validation_regex?: string | null
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertical_intake_fields_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vertical_intake_fields_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "industry_verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      vertical_lead_categories: {
        Row: {
          created_at: string
          description: string | null
          firm_id: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          updated_at: string
          vertical_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          firm_id?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          updated_at?: string
          vertical_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          firm_id?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          updated_at?: string
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertical_lead_categories_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vertical_lead_categories_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "industry_verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      vertical_module_access: {
        Row: {
          created_at: string
          firm_id: string | null
          id: string
          is_enabled: boolean
          module_key: string
          updated_at: string
          vertical_id: string
        }
        Insert: {
          created_at?: string
          firm_id?: string | null
          id?: string
          is_enabled?: boolean
          module_key: string
          updated_at?: string
          vertical_id: string
        }
        Update: {
          created_at?: string
          firm_id?: string | null
          id?: string
          is_enabled?: boolean
          module_key?: string
          updated_at?: string
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertical_module_access_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vertical_module_access_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "industry_verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      vertical_pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          default_fee: number
          firm_id: string | null
          icon: string | null
          id: string
          is_active: boolean
          label: string
          requires_payment: boolean
          stage_key: string
          stage_order: number
          updated_at: string
          vertical_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          default_fee?: number
          firm_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          requires_payment?: boolean
          stage_key: string
          stage_order?: number
          updated_at?: string
          vertical_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          default_fee?: number
          firm_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          requires_payment?: boolean
          stage_key?: string
          stage_order?: number
          updated_at?: string
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertical_pipeline_stages_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vertical_pipeline_stages_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "industry_verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      vertical_terminology: {
        Row: {
          created_at: string
          firm_id: string | null
          id: string
          terminology: Json
          updated_at: string
          vertical_id: string
        }
        Insert: {
          created_at?: string
          firm_id?: string | null
          id?: string
          terminology?: Json
          updated_at?: string
          vertical_id: string
        }
        Update: {
          created_at?: string
          firm_id?: string | null
          id?: string
          terminology?: Json
          updated_at?: string
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertical_terminology_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vertical_terminology_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "industry_verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      video_ad_projects: {
        Row: {
          ai_metadata: Json | null
          brief: string | null
          created_at: string
          duration_seconds: number | null
          firm_id: string
          format: string | null
          id: string
          script: string | null
          status: string | null
          thumbnail_url: string | null
          title: string
          tort_type: string | null
          updated_at: string
          video_url: string | null
          voiceover_text: string | null
        }
        Insert: {
          ai_metadata?: Json | null
          brief?: string | null
          created_at?: string
          duration_seconds?: number | null
          firm_id: string
          format?: string | null
          id?: string
          script?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          tort_type?: string | null
          updated_at?: string
          video_url?: string | null
          voiceover_text?: string | null
        }
        Update: {
          ai_metadata?: Json | null
          brief?: string | null
          created_at?: string
          duration_seconds?: number | null
          firm_id?: string
          format?: string | null
          id?: string
          script?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          tort_type?: string | null
          updated_at?: string
          video_url?: string | null
          voiceover_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_ad_projects_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      viral_content_library: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          engagement_score: number | null
          firm_id: string
          id: string
          inspired_variants: Json | null
          original_ad_summary: string | null
          source_platform: string | null
          tort_type: string | null
          trend_tags: string[] | null
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          engagement_score?: number | null
          firm_id: string
          id?: string
          inspired_variants?: Json | null
          original_ad_summary?: string | null
          source_platform?: string | null
          tort_type?: string | null
          trend_tags?: string[] | null
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          engagement_score?: number | null
          firm_id?: string
          id?: string
          inspired_variants?: Json | null
          original_ad_summary?: string | null
          source_platform?: string | null
          tort_type?: string | null
          trend_tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "viral_content_library_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      war_room_messages: {
        Row: {
          content: string
          created_at: string
          firm_id: string
          id: string
          lead_id: string
          message_type: string | null
          metadata: Json | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          firm_id: string
          id?: string
          lead_id: string
          message_type?: string | null
          metadata?: Json | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          firm_id?: string
          id?: string
          lead_id?: string
          message_type?: string | null
          metadata?: Json | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "war_room_messages_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "war_room_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "war_room_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      wd_ai_activity: {
        Row: {
          action: string
          agent: string
          cost_cents: number | null
          created_at: string
          firm_id: string
          id: string
          input: Json | null
          output: Json | null
          project_id: string | null
          tokens: number | null
        }
        Insert: {
          action: string
          agent: string
          cost_cents?: number | null
          created_at?: string
          firm_id: string
          id?: string
          input?: Json | null
          output?: Json | null
          project_id?: string | null
          tokens?: number | null
        }
        Update: {
          action?: string
          agent?: string
          cost_cents?: number | null
          created_at?: string
          firm_id?: string
          id?: string
          input?: Json | null
          output?: Json | null
          project_id?: string | null
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wd_ai_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wd_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wd_audits: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          firm_id: string
          id: string
          kind: string
          lighthouse: Json | null
          project_id: string
          screenshots: Json | null
          started_at: string | null
          status: string
          summary: Json
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          firm_id: string
          id?: string
          kind: string
          lighthouse?: Json | null
          project_id: string
          screenshots?: Json | null
          started_at?: string | null
          status?: string
          summary?: Json
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          firm_id?: string
          id?: string
          kind?: string
          lighthouse?: Json | null
          project_id?: string
          screenshots?: Json | null
          started_at?: string | null
          status?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "wd_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wd_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wd_connectors: {
        Row: {
          created_at: string
          firm_id: string
          framework_metadata: Json
          id: string
          last_seen_at: string | null
          project_id: string
          public_id: string
          status: string
          token_hash: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          firm_id: string
          framework_metadata?: Json
          id?: string
          last_seen_at?: string | null
          project_id: string
          public_id: string
          status?: string
          token_hash: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          firm_id?: string
          framework_metadata?: Json
          id?: string
          last_seen_at?: string | null
          project_id?: string
          public_id?: string
          status?: string
          token_hash?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wd_connectors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wd_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wd_findings: {
        Row: {
          audit_id: string
          category: string
          confidence: number | null
          created_at: string
          description: string | null
          evidence: Json
          firm_id: string
          id: string
          project_id: string
          severity: string
          status: string
          suggested_fix: Json | null
          title: string
        }
        Insert: {
          audit_id: string
          category: string
          confidence?: number | null
          created_at?: string
          description?: string | null
          evidence?: Json
          firm_id: string
          id?: string
          project_id: string
          severity: string
          status?: string
          suggested_fix?: Json | null
          title: string
        }
        Update: {
          audit_id?: string
          category?: string
          confidence?: number | null
          created_at?: string
          description?: string | null
          evidence?: Json
          firm_id?: string
          id?: string
          project_id?: string
          severity?: string
          status?: string
          suggested_fix?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "wd_findings_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "wd_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wd_findings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wd_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wd_jobs: {
        Row: {
          attempts: number
          created_at: string
          firm_id: string
          id: string
          last_error: string | null
          locked_until: string | null
          payload: Json
          project_id: string | null
          run_after: string
          status: string
          type: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          firm_id: string
          id?: string
          last_error?: string | null
          locked_until?: string | null
          payload?: Json
          project_id?: string | null
          run_after?: string
          status?: string
          type: string
        }
        Update: {
          attempts?: number
          created_at?: string
          firm_id?: string
          id?: string
          last_error?: string | null
          locked_until?: string | null
          payload?: Json
          project_id?: string | null
          run_after?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wd_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wd_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wd_monitor_events: {
        Row: {
          created_at: string
          firm_id: string
          id: string
          kind: string
          payload: Json
          project_id: string
          severity: string
        }
        Insert: {
          created_at?: string
          firm_id: string
          id?: string
          kind: string
          payload?: Json
          project_id: string
          severity?: string
        }
        Update: {
          created_at?: string
          firm_id?: string
          id?: string
          kind?: string
          payload?: Json
          project_id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "wd_monitor_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wd_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wd_patches: {
        Row: {
          after_preview: string | null
          applied_at: string | null
          applied_by: string | null
          before_preview: string | null
          confidence: number | null
          created_at: string
          diff: string
          explanation: string | null
          file_path: string | null
          finding_id: string | null
          firm_id: string
          id: string
          project_id: string
          risk: string
          rollback_ref: string | null
          status: string
        }
        Insert: {
          after_preview?: string | null
          applied_at?: string | null
          applied_by?: string | null
          before_preview?: string | null
          confidence?: number | null
          created_at?: string
          diff: string
          explanation?: string | null
          file_path?: string | null
          finding_id?: string | null
          firm_id: string
          id?: string
          project_id: string
          risk?: string
          rollback_ref?: string | null
          status?: string
        }
        Update: {
          after_preview?: string | null
          applied_at?: string | null
          applied_by?: string | null
          before_preview?: string | null
          confidence?: number | null
          created_at?: string
          diff?: string
          explanation?: string | null
          file_path?: string | null
          finding_id?: string | null
          firm_id?: string
          id?: string
          project_id?: string
          risk?: string
          rollback_ref?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "wd_patches_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "wd_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wd_patches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wd_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wd_projects: {
        Row: {
          created_at: string
          created_by: string | null
          detected_stack: Json
          firm_id: string
          health_score: number | null
          id: string
          monitoring_enabled: boolean
          name: string
          normalized_domain: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          detected_stack?: Json
          firm_id: string
          health_score?: number | null
          id?: string
          monitoring_enabled?: boolean
          name: string
          normalized_domain: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          detected_stack?: Json
          firm_id?: string
          health_score?: number | null
          id?: string
          monitoring_enabled?: boolean
          name?: string
          normalized_domain?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      benchmark_aggregates: {
        Row: {
          firm_count: number | null
          industry_avg_case_value: number | null
          industry_avg_conversion: number | null
          industry_avg_cpl: number | null
          industry_avg_pipeline_velocity: number | null
          industry_avg_response_time: number | null
          p25_cpl: number | null
          p75_cpl: number | null
          period: string | null
          tort_type: string | null
        }
        Relationships: []
      }
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
      mt_analytics_daily: {
        Row: {
          cases_created: number | null
          cases_rejected: number | null
          cases_settled: number | null
          day: string | null
          docs_uploaded: number | null
          firm_id: string | null
        }
        Relationships: []
      }
      platform_connections_safe: {
        Row: {
          connected_at: string | null
          created_at: string | null
          firm_id: string | null
          id: string | null
          is_active: boolean | null
          metadata: Json | null
          page_id: string | null
          page_name: string | null
          permissions: string[] | null
          platform: string | null
          platform_user_id: string | null
          platform_username: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          connected_at?: string | null
          created_at?: string | null
          firm_id?: string | null
          id?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          page_id?: string | null
          page_name?: string | null
          permissions?: string[] | null
          platform?: string | null
          platform_user_id?: string | null
          platform_username?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          connected_at?: string | null
          created_at?: string | null
          firm_id?: string | null
          id?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          page_id?: string | null
          page_name?: string | null
          permissions?: string[] | null
          platform?: string | null
          platform_user_id?: string | null
          platform_username?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
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
    }
    Functions: {
      append_lead_block: {
        Args: {
          _actor_id?: string
          _event_data: Json
          _event_type: string
          _lead_id: string
        }
        Returns: string
      }
      charge_and_move_stage: {
        Args: {
          _charge_amount: number
          _firm_id: string
          _from_stage: string
          _lead_id: string
          _to_stage: string
          _user_id: string
        }
        Returns: Json
      }
      clone_vertical_stages_for_firm: {
        Args: { _firm_id: string; _vertical_id: string }
        Returns: {
          color: string | null
          created_at: string
          default_fee: number
          firm_id: string | null
          icon: string | null
          id: string
          is_active: boolean
          label: string
          requires_payment: boolean
          stage_key: string
          stage_order: number
          updated_at: string
          vertical_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "vertical_pipeline_stages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_marketplace_leads: {
        Args: never
        Returns: {
          age_bucket: string
          ai_quality_score: number
          created_at: string
          id: string
          is_exclusive: boolean
          is_verified: boolean
          price: number
          state: string
          status: Database["public"]["Enums"]["lead_status"]
          tier: Database["public"]["Enums"]["lead_tier"]
          tort_type: string
        }[]
      }
      get_pipeline_stage_counts: { Args: { _firm_id: string }; Returns: Json }
      get_user_firm_id: { Args: { _user_id: string }; Returns: string }
      get_vertical_config: { Args: { _firm_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_chat_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_firm_member: {
        Args: { _firm_id: string; _user_id: string }
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
      meta_claim_jobs: {
        Args: { _batch_size?: number; _worker_id: string }
        Returns: {
          attempts: number | null
          completed_at: string | null
          created_at: string
          firm_id: string | null
          id: string
          job_type: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number | null
          payload: Json
          priority: number | null
          result: Json | null
          run_after: string
          status: Database["public"]["Enums"]["meta_job_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "meta_job_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      meta_complete_job: {
        Args: { _job_id: string; _result?: Json }
        Returns: undefined
      }
      meta_enqueue_job: {
        Args: {
          _delay_seconds?: number
          _firm_id?: string
          _job_type: string
          _max_attempts?: number
          _payload?: Json
          _priority?: number
        }
        Returns: string
      }
      meta_fail_job: {
        Args: { _error: string; _job_id: string }
        Returns: undefined
      }
      meta_log_audit: {
        Args: {
          _action: string
          _actor_id: string
          _after: Json
          _before: Json
          _firm_id: string
          _level: Database["public"]["Enums"]["meta_object_level"]
          _meta_object_id: string
          _object_id: string
        }
        Returns: string
      }
      purchase_lead: {
        Args: { _firm_id: string; _lead_id: string; _user_id: string }
        Returns: Json
      }
      tiktok_claim_jobs: {
        Args: { _batch_size?: number; _worker_id: string }
        Returns: {
          attempts: number
          completed_at: string | null
          created_at: string
          firm_id: string | null
          id: string
          job_type: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          payload: Json
          priority: number
          result: Json | null
          run_after: string
          status: Database["public"]["Enums"]["tiktok_job_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tiktok_job_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      tiktok_complete_job: {
        Args: { _job_id: string; _result?: Json }
        Returns: undefined
      }
      tiktok_enqueue_job: {
        Args: {
          _delay_seconds?: number
          _firm_id?: string
          _job_type: string
          _max_attempts?: number
          _payload?: Json
          _priority?: number
        }
        Returns: string
      }
      tiktok_fail_job: {
        Args: { _error: string; _job_id: string }
        Returns: undefined
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
      lead_status:
        | "available"
        | "purchased"
        | "expired"
        | "flagged"
        | "pending_review"
      lead_tier: "A" | "B" | "C" | "D"
      meta_audience_type: "saved" | "custom" | "lookalike"
      meta_bid_strategy:
        | "LOWEST_COST_WITHOUT_CAP"
        | "LOWEST_COST_WITH_BID_CAP"
        | "COST_CAP"
        | "LOWEST_COST_WITH_MIN_ROAS"
      meta_billing_event:
        | "IMPRESSIONS"
        | "LINK_CLICKS"
        | "PAGE_LIKES"
        | "POST_ENGAGEMENT"
        | "VIDEO_VIEWS"
        | "THRUPLAY"
        | "APP_INSTALLS"
      meta_buying_type: "AUCTION" | "RESERVED"
      meta_campaign_status:
        | "active"
        | "paused"
        | "deleted"
        | "archived"
        | "draft"
        | "pending_review"
        | "disapproved"
        | "preapproved"
        | "pending_billing_info"
        | "campaign_paused"
        | "adset_paused"
        | "with_issues"
      meta_job_status:
        | "queued"
        | "running"
        | "done"
        | "failed"
        | "cancelled"
        | "retrying"
        | "completed"
      meta_object_level: "account" | "campaign" | "adset" | "ad"
      meta_objective:
        | "OUTCOME_AWARENESS"
        | "OUTCOME_TRAFFIC"
        | "OUTCOME_ENGAGEMENT"
        | "OUTCOME_LEADS"
        | "OUTCOME_APP_PROMOTION"
        | "OUTCOME_SALES"
      meta_optimization_goal:
        | "REACH"
        | "IMPRESSIONS"
        | "LINK_CLICKS"
        | "LANDING_PAGE_VIEWS"
        | "POST_ENGAGEMENT"
        | "PAGE_LIKES"
        | "VIDEO_VIEWS"
        | "LEAD_GENERATION"
        | "CONVERSIONS"
        | "OFFSITE_CONVERSIONS"
        | "APP_INSTALLS"
        | "VALUE"
        | "THRUPLAY"
        | "QUALITY_LEAD"
      meta_rec_status: "pending" | "applied" | "dismissed" | "expired"
      meta_review_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "published"
        | "failed"
      mt_case_status:
        | "intake"
        | "qualifying"
        | "retained"
        | "in_treatment"
        | "documents_pending"
        | "ready_to_file"
        | "filed"
        | "settled"
        | "rejected"
        | "closed"
      mt_notification_type:
        | "case.assigned"
        | "case.status_changed"
        | "doc.scanned"
        | "quota.warning"
        | "webhook.failed"
      mt_scan_status: "pending" | "clean" | "infected" | "error"
      scrape_job_status: "queued" | "running" | "succeeded" | "failed" | "dead"
      scrape_priority: "high" | "medium" | "low"
      subscription_plan: "basic" | "premium"
      team_permission:
        | "view_leads"
        | "manage_leads"
        | "view_campaigns"
        | "manage_campaigns"
        | "view_reports"
        | "manage_reports"
        | "view_wallet"
        | "manage_wallet"
        | "view_settings"
        | "manage_settings"
        | "view_meta_ads"
        | "manage_meta_ads"
        | "view_social"
        | "manage_social"
        | "manage_team"
        | "view_lead_contact_info"
        | "view_lead_case_details"
        | "view_lead_financials"
        | "view_session_logs"
        | "view_session_recordings"
      tiktok_job_status:
        | "queued"
        | "running"
        | "retrying"
        | "completed"
        | "failed"
        | "cancelled"
      tiktok_object_level:
        | "account"
        | "campaign"
        | "adgroup"
        | "ad"
        | "creative"
        | "audience"
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
      lead_status: [
        "available",
        "purchased",
        "expired",
        "flagged",
        "pending_review",
      ],
      lead_tier: ["A", "B", "C", "D"],
      meta_audience_type: ["saved", "custom", "lookalike"],
      meta_bid_strategy: [
        "LOWEST_COST_WITHOUT_CAP",
        "LOWEST_COST_WITH_BID_CAP",
        "COST_CAP",
        "LOWEST_COST_WITH_MIN_ROAS",
      ],
      meta_billing_event: [
        "IMPRESSIONS",
        "LINK_CLICKS",
        "PAGE_LIKES",
        "POST_ENGAGEMENT",
        "VIDEO_VIEWS",
        "THRUPLAY",
        "APP_INSTALLS",
      ],
      meta_buying_type: ["AUCTION", "RESERVED"],
      meta_campaign_status: [
        "active",
        "paused",
        "deleted",
        "archived",
        "draft",
        "pending_review",
        "disapproved",
        "preapproved",
        "pending_billing_info",
        "campaign_paused",
        "adset_paused",
        "with_issues",
      ],
      meta_job_status: [
        "queued",
        "running",
        "done",
        "failed",
        "cancelled",
        "retrying",
        "completed",
      ],
      meta_object_level: ["account", "campaign", "adset", "ad"],
      meta_objective: [
        "OUTCOME_AWARENESS",
        "OUTCOME_TRAFFIC",
        "OUTCOME_ENGAGEMENT",
        "OUTCOME_LEADS",
        "OUTCOME_APP_PROMOTION",
        "OUTCOME_SALES",
      ],
      meta_optimization_goal: [
        "REACH",
        "IMPRESSIONS",
        "LINK_CLICKS",
        "LANDING_PAGE_VIEWS",
        "POST_ENGAGEMENT",
        "PAGE_LIKES",
        "VIDEO_VIEWS",
        "LEAD_GENERATION",
        "CONVERSIONS",
        "OFFSITE_CONVERSIONS",
        "APP_INSTALLS",
        "VALUE",
        "THRUPLAY",
        "QUALITY_LEAD",
      ],
      meta_rec_status: ["pending", "applied", "dismissed", "expired"],
      meta_review_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "published",
        "failed",
      ],
      mt_case_status: [
        "intake",
        "qualifying",
        "retained",
        "in_treatment",
        "documents_pending",
        "ready_to_file",
        "filed",
        "settled",
        "rejected",
        "closed",
      ],
      mt_notification_type: [
        "case.assigned",
        "case.status_changed",
        "doc.scanned",
        "quota.warning",
        "webhook.failed",
      ],
      mt_scan_status: ["pending", "clean", "infected", "error"],
      scrape_job_status: ["queued", "running", "succeeded", "failed", "dead"],
      scrape_priority: ["high", "medium", "low"],
      subscription_plan: ["basic", "premium"],
      team_permission: [
        "view_leads",
        "manage_leads",
        "view_campaigns",
        "manage_campaigns",
        "view_reports",
        "manage_reports",
        "view_wallet",
        "manage_wallet",
        "view_settings",
        "manage_settings",
        "view_meta_ads",
        "manage_meta_ads",
        "view_social",
        "manage_social",
        "manage_team",
        "view_lead_contact_info",
        "view_lead_case_details",
        "view_lead_financials",
        "view_session_logs",
        "view_session_recordings",
      ],
      tiktok_job_status: [
        "queued",
        "running",
        "retrying",
        "completed",
        "failed",
        "cancelled",
      ],
      tiktok_object_level: [
        "account",
        "campaign",
        "adgroup",
        "ad",
        "creative",
        "audience",
      ],
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
