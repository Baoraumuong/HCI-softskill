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
      account_requests: {
        Row: {
          created_at: string
          message: string | null
          request_id: string
          request_type: Database["public"]["Enums"]["account_request_type"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["account_request_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          message?: string | null
          request_id?: string
          request_type?: Database["public"]["Enums"]["account_request_type"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["account_request_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          message?: string | null
          request_id?: string
          request_type?: Database["public"]["Enums"]["account_request_type"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["account_request_status"]
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
          judge0_runs: number
          prompt_tokens: number
          provider: Database["public"]["Enums"]["api_provider"]
          total_tokens: number | null
          usage_id: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          endpoint: string
          estimated_cost_cents?: number
          judge0_runs?: number
          prompt_tokens?: number
          provider: Database["public"]["Enums"]["api_provider"]
          total_tokens?: number | null
          usage_id?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          endpoint?: string
          estimated_cost_cents?: number
          judge0_runs?: number
          prompt_tokens?: number
          provider?: Database["public"]["Enums"]["api_provider"]
          total_tokens?: number | null
          usage_id?: number
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
      problems: {
        Row: {
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          languages: string[]
          problem_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          languages?: string[]
          problem_id?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          languages?: string[]
          problem_id?: string
          title?: string
        }
        Relationships: []
      }
      response_evaluations: {
        Row: {
          created_at: string
          evaluation_id: string
          evaluation_type: Database["public"]["Enums"]["evaluation_type"]
          feedback: string | null
          response_id: string
          rubric: Json
          total_score: number | null
        }
        Insert: {
          created_at?: string
          evaluation_id?: string
          evaluation_type: Database["public"]["Enums"]["evaluation_type"]
          feedback?: string | null
          response_id: string
          rubric?: Json
          total_score?: number | null
        }
        Update: {
          created_at?: string
          evaluation_id?: string
          evaluation_type?: Database["public"]["Enums"]["evaluation_type"]
          feedback?: string | null
          response_id?: string
          rubric?: Json
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "response_evaluations_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: true
            referencedRelation: "responses"
            referencedColumns: ["response_id"]
          },
        ]
      }
      responses: {
        Row: {
          answer: string
          created_at: string
          language: string | null
          problem_id: string | null
          question: string
          question_type: Database["public"]["Enums"]["evaluation_type"]
          response_id: string
          session_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          language?: string | null
          problem_id?: string | null
          question: string
          question_type?: Database["public"]["Enums"]["evaluation_type"]
          response_id?: string
          session_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          language?: string | null
          problem_id?: string | null
          question?: string
          question_type?: Database["public"]["Enums"]["evaluation_type"]
          response_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["problem_id"]
          },
          {
            foreignKeyName: "responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      sessions: {
        Row: {
          duration_seconds: number | null
          ended_at: string | null
          engagement_score: number | null
          in_frame_pct: number | null
          interview_type: Database["public"]["Enums"]["interview_type"]
          level: Database["public"]["Enums"]["interview_level"]
          role: string
          session_id: string
          started_at: string
          upright_pct: number | null
          user_id: string
        }
        Insert: {
          duration_seconds?: number | null
          ended_at?: string | null
          engagement_score?: number | null
          in_frame_pct?: number | null
          interview_type: Database["public"]["Enums"]["interview_type"]
          level: Database["public"]["Enums"]["interview_level"]
          role: string
          session_id?: string
          started_at?: string
          upright_pct?: number | null
          user_id: string
        }
        Update: {
          duration_seconds?: number | null
          ended_at?: string | null
          engagement_score?: number | null
          in_frame_pct?: number | null
          interview_type?: Database["public"]["Enums"]["interview_type"]
          level?: Database["public"]["Enums"]["interview_level"]
          role?: string
          session_id?: string
          started_at?: string
          upright_pct?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      testcases: {
        Row: {
          created_at: string
          id: number
          input: string
          is_public: boolean
          output: string
          problem_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          input: string
          is_public?: boolean
          output: string
          problem_id: string
        }
        Update: {
          created_at?: string
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
      users: {
        Row: {
          account_plan: Database["public"]["Enums"]["account_plan"]
          created_at: string
          email: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
          user_name: string
        }
        Insert: {
          account_plan?: Database["public"]["Enums"]["account_plan"]
          created_at?: string
          email: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
          user_name: string
        }
        Update: {
          account_plan?: Database["public"]["Enums"]["account_plan"]
          created_at?: string
          email?: string
          role?: Database["public"]["Enums"]["user_role"]
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
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      account_plan: "normal" | "plus"
      account_request_status: "open" | "reviewing" | "approved" | "rejected"
      account_request_type: "upgrade_plus"
      api_provider: "gemini" | "judge0"
      difficulty_level: "easy" | "medium" | "hard"
      evaluation_type: "behavioral" | "theoretical" | "coding"
      interview_level: "junior" | "mid" | "senior"
      interview_type: "behavioral" | "technical" | "full"
      user_role: "user" | "admin"
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
      account_plan: ["normal", "plus"],
      account_request_status: ["open", "reviewing", "approved", "rejected"],
      account_request_type: ["upgrade_plus"],
      api_provider: ["gemini", "judge0"],
      difficulty_level: ["easy", "medium", "hard"],
      evaluation_type: ["behavioral", "theoretical", "coding"],
      interview_level: ["junior", "mid", "senior"],
      interview_type: ["behavioral", "technical", "full"],
      user_role: ["user", "admin"],
    },
  },
} as const
