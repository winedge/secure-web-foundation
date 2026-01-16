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
          email: string | null
          exposure_details: string | null
          first_name: string | null
          fraud_risk_score: number | null
          id: string
          is_exclusive: boolean | null
          is_verified: boolean | null
          last_name: string | null
          phone: string | null
          price: number
          source: string | null
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
          email?: string | null
          exposure_details?: string | null
          first_name?: string | null
          fraud_risk_score?: number | null
          id?: string
          is_exclusive?: boolean | null
          is_verified?: boolean | null
          last_name?: string | null
          phone?: string | null
          price: number
          source?: string | null
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
          email?: string | null
          exposure_details?: string | null
          first_name?: string | null
          fraud_risk_score?: number | null
          id?: string
          is_exclusive?: boolean | null
          is_verified?: boolean | null
          last_name?: string | null
          phone?: string | null
          price?: number
          source?: string | null
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
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
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
    }
    Enums: {
      app_role: "admin" | "firm_owner" | "firm_staff" | "claimant"
      lead_status: "available" | "purchased" | "expired" | "flagged"
      lead_tier: "A" | "B" | "C" | "D"
      subscription_plan: "basic" | "premium"
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
      lead_status: ["available", "purchased", "expired", "flagged"],
      lead_tier: ["A", "B", "C", "D"],
      subscription_plan: ["basic", "premium"],
    },
  },
} as const
