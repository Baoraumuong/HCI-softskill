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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      code_submission: {
        Row: {
          code: string
          language: string | null
          question: string
          session_id: string
          submission_id: string
          submitted_at: string | null
        }
        Insert: {
          code: string
          language?: string | null
          question: string
          session_id: string
          submission_id?: string
          submitted_at?: string | null
        }
        Update: {
          code?: string
          language?: string | null
          question?: string
          session_id?: string
          submission_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "code_submission_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session"
            referencedColumns: ["session_id"]
          },
        ]
      }
      history: {
        Row: {
          answer: string
          asked_at: string | null
          history_id: string
          question: string
          session_id: string
          video_record: string | null
        }
        Insert: {
          answer: string
          asked_at?: string | null
          history_id?: string
          question: string
          session_id: string
          video_record?: string | null
        }
        Update: {
          answer?: string
          asked_at?: string | null
          history_id?: string
          question?: string
          session_id?: string
          video_record?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session"
            referencedColumns: ["session_id"]
          },
        ]
      }
      problems: {
        Row: {
          description: string
          difficulty: string | null
          id: number
          languages: string[]
          problem_id: string
          title: string
        }
        Insert: {
          description: string
          difficulty?: string | null
          id?: number
          languages: string[]
          problem_id?: string
          title: string
        }
        Update: {
          description?: string
          difficulty?: string | null
          id?: number
          languages?: string[]
          problem_id?: string
          title?: string
        }
        Relationships: []
      }
      result_coding: {
        Row: {
          code_quality: number | null
          correctness: number | null
          created_at: string | null
          feedback: string | null
          history_id: string
          result_id: string
          session_id: string
          time_complexity: number | null
          total_score: number | null
        }
        Insert: {
          code_quality?: number | null
          correctness?: number | null
          created_at?: string | null
          feedback?: string | null
          history_id: string
          result_id?: string
          session_id: string
          time_complexity?: number | null
          total_score?: number | null
        }
        Update: {
          code_quality?: number | null
          correctness?: number | null
          created_at?: string | null
          feedback?: string | null
          history_id?: string
          result_id?: string
          session_id?: string
          time_complexity?: number | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "result_coding_history_id_fkey"
            columns: ["history_id"]
            isOneToOne: false
            referencedRelation: "history"
            referencedColumns: ["history_id"]
          },
          {
            foreignKeyName: "result_coding_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session"
            referencedColumns: ["session_id"]
          },
        ]
      }
      result_communication: {
        Row: {
          communication_skill: number | null
          conciseness: number | null
          created_at: string | null
          feedback: string | null
          history_id: string
          logical_flow: number | null
          result_id: string
          role_relevance: number | null
          session_id: string
          total_score: number | null
        }
        Insert: {
          communication_skill?: number | null
          conciseness?: number | null
          created_at?: string | null
          feedback?: string | null
          history_id: string
          logical_flow?: number | null
          result_id?: string
          role_relevance?: number | null
          session_id: string
          total_score?: number | null
        }
        Update: {
          communication_skill?: number | null
          conciseness?: number | null
          created_at?: string | null
          feedback?: string | null
          history_id?: string
          logical_flow?: number | null
          result_id?: string
          role_relevance?: number | null
          session_id?: string
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "result_communication_history_id_fkey"
            columns: ["history_id"]
            isOneToOne: false
            referencedRelation: "history"
            referencedColumns: ["history_id"]
          },
          {
            foreignKeyName: "result_communication_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session"
            referencedColumns: ["session_id"]
          },
        ]
      }
      result_theoretical: {
        Row: {
          communication_skill: number | null
          conciseness: number | null
          created_at: string | null
          feedback: string | null
          history_id: string
          logical_flow: number | null
          result_id: string
          role_relevance: number | null
          session_id: string
          technical_accuracy: number | null
          total_score: number | null
        }
        Insert: {
          communication_skill?: number | null
          conciseness?: number | null
          created_at?: string | null
          feedback?: string | null
          history_id: string
          logical_flow?: number | null
          result_id?: string
          role_relevance?: number | null
          session_id: string
          technical_accuracy?: number | null
          total_score?: number | null
        }
        Update: {
          communication_skill?: number | null
          conciseness?: number | null
          created_at?: string | null
          feedback?: string | null
          history_id?: string
          logical_flow?: number | null
          result_id?: string
          role_relevance?: number | null
          session_id?: string
          technical_accuracy?: number | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "result_theoretical_history_id_fkey"
            columns: ["history_id"]
            isOneToOne: false
            referencedRelation: "history"
            referencedColumns: ["history_id"]
          },
          {
            foreignKeyName: "result_theoretical_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session"
            referencedColumns: ["session_id"]
          },
        ]
      }
      session: {
        Row: {
          duration_seconds: number | null
          ended_at: string | null
          engagement_score: number | null
          in_frame_pct: number | null
          interview_type: string
          level: string
          role: string
          session_id: string
          started_at: string | null
          upright_pct: number | null
          user_id: string
        }
        Insert: {
          duration_seconds?: number | null
          ended_at?: string | null
          engagement_score?: number | null
          in_frame_pct?: number | null
          interview_type: string
          level: string
          role: string
          session_id?: string
          started_at?: string | null
          upright_pct?: number | null
          user_id: string
        }
        Update: {
          duration_seconds?: number | null
          ended_at?: string | null
          engagement_score?: number | null
          in_frame_pct?: number | null
          interview_type?: string
          level?: string
          role?: string
          session_id?: string
          started_at?: string | null
          upright_pct?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      testcases: {
        Row: {
          id: number
          input: string
          is_public: boolean
          output: string
          problem_id: string
        }
        Insert: {
          id?: number
          input: string
          is_public?: boolean
          output: string
          problem_id: string
        }
        Update: {
          id?: number
          input?: string
          is_public?: boolean
          output?: string
          problem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testcases_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["problem_id"]
          },
        ]
      }
      account_requests: {
        Row: {
          created_at: string
          message: string | null
          request_id: string
          request_type: string
          resolved_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message?: string | null
          request_id?: string
          request_type?: string
          resolved_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          message?: string | null
          request_id?: string
          request_type?: string
          resolved_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      api_usage: {
        Row: {
          completion_tokens: number
          created_at: string
          endpoint: string
          estimated_cost_cents: number
          id: number
          judge0_runs: number
          prompt_tokens: number
          provider: string
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          endpoint: string
          estimated_cost_cents?: number
          id?: number
          judge0_runs?: number
          prompt_tokens?: number
          provider: string
          total_tokens?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          endpoint?: string
          estimated_cost_cents?: number
          id?: number
          judge0_runs?: number
          prompt_tokens?: number
          provider?: string
          total_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          account_plan: string
          created_at: string
          email: string
          role: string
          user_id: string
          user_name: string
        }
        Insert: {
          account_plan?: string
          created_at?: string
          email: string
          role?: string
          user_id: string
          user_name: string
        }
        Update: {
          account_plan?: string
          created_at?: string
          email?: string
          role?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
