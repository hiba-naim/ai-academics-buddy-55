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
      assessments: {
        Row: {
          course_id: number
          created_at: string
          date: string | null
          id: number
          max_score: number
          name: string
          score: number | null
          type: string
          updated_at: string
          weight: number
        }
        Insert: {
          course_id: number
          created_at?: string
          date?: string | null
          id?: number
          max_score?: number
          name: string
          score?: number | null
          type?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          course_id?: number
          created_at?: string
          date?: string | null
          id?: number
          max_score?: number
          name?: string
          score?: number | null
          type?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_catalog: {
        Row: {
          code: string
          created_at: string
          credits: number
          department: string | null
          description: string | null
          id: number
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          credits?: number
          department?: string | null
          description?: string | null
          id?: number
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          credits?: number
          department?: string | null
          description?: string | null
          id?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      semester_plan_items: {
        Row: {
          catalog_id: number
          created_at: string
          difficulty: string
          id: number
          priority: string
          semester_id: number
          status: string
          updated_at: string
          user_id: number
        }
        Insert: {
          catalog_id: number
          created_at?: string
          difficulty?: string
          id?: number
          priority?: string
          semester_id: number
          status?: string
          updated_at?: string
          user_id: number
        }
        Update: {
          catalog_id?: number
          created_at?: string
          difficulty?: string
          id?: number
          priority?: string
          semester_id?: number
          status?: string
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "semester_plan_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "course_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semester_plan_items_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semester_plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          catalog_id: number
          color: string
          created_at: string
          credits: number | null
          difficulty: string
          grade: string | null
          id: number
          instructor_id: number | null
          progress: number
          status: string
          target_grade: string | null
          term: string
          updated_at: string
          user_id: number
          weekly_study_hours: number
        }
        Insert: {
          catalog_id: number
          color?: string
          created_at?: string
          credits?: number | null
          difficulty?: string
          grade?: string | null
          id?: number
          instructor_id?: number | null
          progress?: number
          status?: string
          target_grade?: string | null
          term: string
          updated_at?: string
          user_id: number
          weekly_study_hours?: number
        }
        Update: {
          catalog_id?: number
          color?: string
          created_at?: string
          credits?: number | null
          difficulty?: string
          grade?: string | null
          id?: number
          instructor_id?: number | null
          progress?: number
          status?: string
          target_grade?: string | null
          term?: string
          updated_at?: string
          user_id?: number
          weekly_study_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "course_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          academic_year: number
          created_at: string
          id: number
          term: string
          updated_at: string
          user_id: number
        }
        Insert: {
          academic_year: number
          created_at?: string
          id?: number
          term: string
          updated_at?: string
          user_id: number
        }
        Update: {
          academic_year?: number
          created_at?: string
          id?: number
          term?: string
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "semesters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          bio: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: number
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          id?: number
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          course_difficulty_rating: number
          comment: string | null
          course_id: number | null
          created_at: string
          id: number
          instructor_id: number
          rating: number
          teaching_quality_rating: number
          workload_rating: number
          updated_at: string
          user_id: number
        }
        Insert: {
          course_difficulty_rating?: number
          comment?: string | null
          course_id?: number | null
          created_at?: string
          id?: number
          instructor_id: number
          rating: number
          teaching_quality_rating?: number
          workload_rating?: number
          updated_at?: string
          user_id: number
        }
        Update: {
          course_difficulty_rating?: number
          comment?: string | null
          course_id?: number | null
          created_at?: string
          id?: number
          instructor_id?: number
          rating?: number
          teaching_quality_rating?: number
          workload_rating?: number
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          course_id: number | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_minutes: number
          id: number
          priority: string
          status: string
          task_type: string
          title: string
          updated_at: string
          user_id: number
          weight: number
        }
        Insert: {
          course_id?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number
          id?: number
          priority?: string
          status?: string
          task_type?: string
          title: string
          updated_at?: string
          user_id: number
          weight?: number
        }
        Update: {
          course_id?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number
          id?: number
          priority?: string
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          gpa: number | null
          id: number
          university: string | null
          major: string | null
          graduation_year: number | null
          target_gpa: number | null
          weekly_study_goal_hours: number | null
          preferred_study_days: string[] | null
          preferred_study_session_length: number | null
          default_semester: string | null
          max_credits_per_semester: number | null
          preferred_workload: string | null
          max_difficult_courses: number | null
          show_ai_recommendations: boolean
          enable_planner_warnings: boolean
          notify_assignments: boolean
          notify_exams: boolean
          notify_weekly_summary: boolean
          notify_registration: boolean
          theme: string
          compact_mode: boolean
          animations_enabled: boolean
          updated_at: string
          year: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          gpa?: number | null
          id?: number
          university?: string | null
          major?: string | null
          graduation_year?: number | null
          target_gpa?: number | null
          weekly_study_goal_hours?: number | null
          preferred_study_days?: string[] | null
          preferred_study_session_length?: number | null
          default_semester?: string | null
          max_credits_per_semester?: number | null
          preferred_workload?: string | null
          max_difficult_courses?: number | null
          show_ai_recommendations?: boolean
          enable_planner_warnings?: boolean
          notify_assignments?: boolean
          notify_exams?: boolean
          notify_weekly_summary?: boolean
          notify_registration?: boolean
          theme?: string
          compact_mode?: boolean
          animations_enabled?: boolean
          updated_at?: string
          year?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          gpa?: number | null
          id?: number
          university?: string | null
          major?: string | null
          graduation_year?: number | null
          target_gpa?: number | null
          weekly_study_goal_hours?: number | null
          preferred_study_days?: string[] | null
          preferred_study_session_length?: number | null
          default_semester?: string | null
          max_credits_per_semester?: number | null
          preferred_workload?: string | null
          max_difficult_courses?: number | null
          show_ai_recommendations?: boolean
          enable_planner_warnings?: boolean
          notify_assignments?: boolean
          notify_exams?: boolean
          notify_weekly_summary?: boolean
          notify_registration?: boolean
          theme?: string
          compact_mode?: boolean
          animations_enabled?: boolean
          updated_at?: string
          year?: number | null
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
