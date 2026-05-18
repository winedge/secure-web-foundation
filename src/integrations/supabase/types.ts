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
      lead_status:
        | "available"
        | "purchased"
        | "expired"
        | "flagged"
        | "pending_review"
      lead_tier: "A" | "B" | "C" | "D"
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
