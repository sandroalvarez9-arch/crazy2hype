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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      backup_teams: {
        Row: {
          captain_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          players_count: number | null
          priority_order: number | null
          promoted_to_main: boolean | null
          tournament_id: string
          updated_at: string
        }
        Insert: {
          captain_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          players_count?: number | null
          priority_order?: number | null
          promoted_to_main?: boolean | null
          tournament_id: string
          updated_at?: string
        }
        Update: {
          captain_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          players_count?: number | null
          priority_order?: number | null
          promoted_to_main?: boolean | null
          tournament_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          bracket_position: string | null
          completed_at: string | null
          court_number: number | null
          created_at: string
          current_set: number | null
          id: string
          match_number: number
          pool_name: string | null
          referee_team_id: string | null
          round_number: number
          scheduled_time: string | null
          set_scores: Json | null
          sets_won_team1: number | null
          sets_won_team2: number | null
          status: string
          team1_id: string | null
          team1_score: number | null
          team2_id: string | null
          team2_score: number | null
          tournament_id: string
          tournament_phase: string | null
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          bracket_position?: string | null
          completed_at?: string | null
          court_number?: number | null
          created_at?: string
          current_set?: number | null
          id?: string
          match_number: number
          pool_name?: string | null
          referee_team_id?: string | null
          round_number: number
          scheduled_time?: string | null
          set_scores?: Json | null
          sets_won_team1?: number | null
          sets_won_team2?: number | null
          status?: string
          team1_id?: string | null
          team1_score?: number | null
          team2_id?: string | null
          team2_score?: number | null
          tournament_id: string
          tournament_phase?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          bracket_position?: string | null
          completed_at?: string | null
          court_number?: number | null
          created_at?: string
          current_set?: number | null
          id?: string
          match_number?: number
          pool_name?: string | null
          referee_team_id?: string | null
          round_number?: number
          scheduled_time?: string | null
          set_scores?: Json | null
          sets_won_team1?: number | null
          sets_won_team2?: number | null
          status?: string
          team1_id?: string | null
          team1_score?: number | null
          team2_id?: string | null
          team2_score?: number | null
          tournament_id?: string
          tournament_phase?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          email: string | null
          id: string
          jersey_number: number | null
          name: string
          phone: string | null
          position: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          jersey_number?: number | null
          name: string
          phone?: string | null
          position?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          jersey_number?: number | null
          name?: string
          phone?: string | null
          position?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          position: string | null
          role: string
          shirt_size: string | null
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_connected: boolean
          stripe_details_submitted: boolean
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          position?: string | null
          role?: string
          shirt_size?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_connected?: boolean
          stripe_details_submitted?: boolean
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          position?: string | null
          role?: string
          shirt_size?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_connected?: boolean
          stripe_details_submitted?: boolean
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      stripe_oauth_states: {
        Row: {
          created_at: string | null
          org_id: string | null
          redirect_uri: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          org_id?: string | null
          redirect_uri?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          org_id?: string | null
          redirect_uri?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      team_stats: {
        Row: {
          created_at: string
          id: string
          matches_lost: number | null
          matches_played: number | null
          matches_won: number | null
          points_against: number | null
          points_for: number | null
          team_id: string
          tournament_id: string
          updated_at: string
          win_percentage: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          matches_lost?: number | null
          matches_played?: number | null
          matches_won?: number | null
          points_against?: number | null
          points_for?: number | null
          team_id: string
          tournament_id: string
          updated_at?: string
          win_percentage?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          matches_lost?: number | null
          matches_played?: number | null
          matches_won?: number | null
          points_against?: number | null
          points_for?: number | null
          team_id?: string
          tournament_id?: string
          updated_at?: string
          win_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_stats_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_id: string
          check_in_status: string | null
          check_in_time: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          division: string | null
          id: string
          is_backup: boolean | null
          is_registered: boolean | null
          name: string
          payment_date: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_status: string | null
          players_count: number | null
          seed_number: number | null
          skill_level: string | null
          tournament_id: string
          updated_at: string
        }
        Insert: {
          captain_id: string
          check_in_status?: string | null
          check_in_time?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          division?: string | null
          id?: string
          is_backup?: boolean | null
          is_registered?: boolean | null
          name: string
          payment_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_status?: string | null
          players_count?: number | null
          seed_number?: number | null
          skill_level?: string | null
          tournament_id: string
          updated_at?: string
        }
        Update: {
          captain_id?: string
          check_in_status?: string | null
          check_in_time?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          division?: string | null
          id?: string
          is_backup?: boolean | null
          is_registered?: boolean | null
          name?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_status?: string | null
          players_count?: number | null
          seed_number?: number | null
          skill_level?: string | null
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          performed_by: string | null
          tournament_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string | null
          tournament_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string | null
          tournament_id?: string
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          allow_backup_teams: boolean | null
          bank_details: string | null
          bracket_version: number | null
          brackets_generated: boolean | null
          calculated_courts: number | null
          cashapp_info: string | null
          check_in_deadline: string | null
          created_at: string
          deciding_set_points: number | null
          description: string | null
          divisions: string[] | null
          end_date: string
          entry_fee: number | null
          estimated_game_duration: number | null
          first_game_time: string | null
          game_format_locked: boolean | null
          id: string
          location: string | null
          max_teams: number
          max_teams_per_division_skill: Json | null
          max_teams_per_skill_level: Json | null
          must_win_by: number | null
          number_of_courts: number | null
          organizer_id: string
          other_payment_methods: string | null
          payment_instructions: string | null
          paypal_email: string | null
          players_per_team: number
          playoff_format: Json | null
          points_per_set: number | null
          pool_play_format: Json | null
          pools_per_skill_level: Json | null
          registration_deadline: string
          sets_per_game: number | null
          skill_levels: string[] | null
          skill_levels_by_division: Json | null
          start_date: string
          status: string
          title: string
          tournament_format: string | null
          updated_at: string
          uses_phase_formats: boolean | null
          venmo_username: string | null
          warm_up_duration: number | null
        }
        Insert: {
          allow_backup_teams?: boolean | null
          bank_details?: string | null
          bracket_version?: number | null
          brackets_generated?: boolean | null
          calculated_courts?: number | null
          cashapp_info?: string | null
          check_in_deadline?: string | null
          created_at?: string
          deciding_set_points?: number | null
          description?: string | null
          divisions?: string[] | null
          end_date: string
          entry_fee?: number | null
          estimated_game_duration?: number | null
          first_game_time?: string | null
          game_format_locked?: boolean | null
          id?: string
          location?: string | null
          max_teams?: number
          max_teams_per_division_skill?: Json | null
          max_teams_per_skill_level?: Json | null
          must_win_by?: number | null
          number_of_courts?: number | null
          organizer_id: string
          other_payment_methods?: string | null
          payment_instructions?: string | null
          paypal_email?: string | null
          players_per_team?: number
          playoff_format?: Json | null
          points_per_set?: number | null
          pool_play_format?: Json | null
          pools_per_skill_level?: Json | null
          registration_deadline: string
          sets_per_game?: number | null
          skill_levels?: string[] | null
          skill_levels_by_division?: Json | null
          start_date: string
          status?: string
          title: string
          tournament_format?: string | null
          updated_at?: string
          uses_phase_formats?: boolean | null
          venmo_username?: string | null
          warm_up_duration?: number | null
        }
        Update: {
          allow_backup_teams?: boolean | null
          bank_details?: string | null
          bracket_version?: number | null
          brackets_generated?: boolean | null
          calculated_courts?: number | null
          cashapp_info?: string | null
          check_in_deadline?: string | null
          created_at?: string
          deciding_set_points?: number | null
          description?: string | null
          divisions?: string[] | null
          end_date?: string
          entry_fee?: number | null
          estimated_game_duration?: number | null
          first_game_time?: string | null
          game_format_locked?: boolean | null
          id?: string
          location?: string | null
          max_teams?: number
          max_teams_per_division_skill?: Json | null
          max_teams_per_skill_level?: Json | null
          must_win_by?: number | null
          number_of_courts?: number | null
          organizer_id?: string
          other_payment_methods?: string | null
          payment_instructions?: string | null
          paypal_email?: string | null
          players_per_team?: number
          playoff_format?: Json | null
          points_per_set?: number | null
          pool_play_format?: Json | null
          pools_per_skill_level?: Json | null
          registration_deadline?: string
          sets_per_game?: number | null
          skill_levels?: string[] | null
          skill_levels_by_division?: Json | null
          start_date?: string
          status?: string
          title?: string
          tournament_format?: string | null
          updated_at?: string
          uses_phase_formats?: boolean | null
          venmo_username?: string | null
          warm_up_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      players_public: {
        Row: {
          created_at: string | null
          id: string | null
          jersey_number: number | null
          name: string | null
          position: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          jersey_number?: number | null
          name?: string | null
          position?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          jersey_number?: number | null
          name?: string | null
          position?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          role: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          role?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          role?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      teams_public: {
        Row: {
          captain_id: string | null
          check_in_status: string | null
          check_in_time: string | null
          created_at: string | null
          division: string | null
          id: string | null
          is_backup: boolean | null
          is_registered: boolean | null
          name: string | null
          payment_status: string | null
          players_count: number | null
          seed_number: number | null
          skill_level: string | null
          tournament_id: string | null
          updated_at: string | null
        }
        Insert: {
          captain_id?: string | null
          check_in_status?: string | null
          check_in_time?: string | null
          created_at?: string | null
          division?: string | null
          id?: string | null
          is_backup?: boolean | null
          is_registered?: boolean | null
          name?: string | null
          payment_status?: string | null
          players_count?: number | null
          seed_number?: number | null
          skill_level?: string | null
          tournament_id?: string | null
          updated_at?: string | null
        }
        Update: {
          captain_id?: string | null
          check_in_status?: string | null
          check_in_time?: string | null
          created_at?: string | null
          division?: string | null
          id?: string | null
          is_backup?: boolean | null
          is_registered?: boolean | null
          name?: string | null
          payment_status?: string | null
          players_count?: number | null
          seed_number?: number | null
          skill_level?: string | null
          tournament_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      log_format_change: {
        Args: {
          change_reason?: string
          new_format: Json
          old_format: Json
          tournament_id: string
        }
        Returns: undefined
      }
      log_tournament_action: {
        Args: { action: string; details?: Json; tournament_id: string }
        Returns: undefined
      }
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
