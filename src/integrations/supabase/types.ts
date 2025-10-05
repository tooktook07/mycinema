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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      movies: {
        Row: {
          actors: string | null
          created_at: string | null
          director: string | null
          genres: string[] | null
          id: string
          imdb_id: string
          keywords: string[] | null
          original_language: string | null
          plot: string | null
          popularity: number | null
          poster: string | null
          rating: number | null
          runtime: string | null
          sound: string | null
          status: string | null
          tagline: string | null
          title: string
          updated_at: string | null
          vote_count: number | null
          writing: string | null
          year: number
        }
        Insert: {
          actors?: string | null
          created_at?: string | null
          director?: string | null
          genres?: string[] | null
          id?: string
          imdb_id: string
          keywords?: string[] | null
          original_language?: string | null
          plot?: string | null
          popularity?: number | null
          poster?: string | null
          rating?: number | null
          runtime?: string | null
          sound?: string | null
          status?: string | null
          tagline?: string | null
          title: string
          updated_at?: string | null
          vote_count?: number | null
          writing?: string | null
          year: number
        }
        Update: {
          actors?: string | null
          created_at?: string | null
          director?: string | null
          genres?: string[] | null
          id?: string
          imdb_id?: string
          keywords?: string[] | null
          original_language?: string | null
          plot?: string | null
          popularity?: number | null
          poster?: string | null
          rating?: number | null
          runtime?: string | null
          sound?: string | null
          status?: string | null
          tagline?: string | null
          title?: string
          updated_at?: string | null
          vote_count?: number | null
          writing?: string | null
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sync_history: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          failed: number | null
          filters: Json | null
          id: string
          imported: number | null
          logs: string[] | null
          removed: number | null
          skipped: number | null
          status: string | null
          sync_mode: boolean
          total_found: number | null
          updated: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed?: number | null
          filters?: Json | null
          id?: string
          imported?: number | null
          logs?: string[] | null
          removed?: number | null
          skipped?: number | null
          status?: string | null
          sync_mode?: boolean
          total_found?: number | null
          updated?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed?: number | null
          filters?: Json | null
          id?: string
          imported?: number | null
          logs?: string[] | null
          removed?: number | null
          skipped?: number | null
          status?: string | null
          sync_mode?: boolean
          total_found?: number | null
          updated?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      tv_shows: {
        Row: {
          created_at: string | null
          end_year: number | null
          episodes: number | null
          genres: string[] | null
          id: string
          imdb_id: string
          plot: string | null
          poster: string | null
          rating: number | null
          season_dates: Json | null
          seasons: number | null
          start_year: number
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_year?: number | null
          episodes?: number | null
          genres?: string[] | null
          id?: string
          imdb_id: string
          plot?: string | null
          poster?: string | null
          rating?: number | null
          season_dates?: Json | null
          seasons?: number | null
          start_year: number
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_year?: number | null
          episodes?: number | null
          genres?: string[] | null
          id?: string
          imdb_id?: string
          plot?: string | null
          poster?: string | null
          rating?: number | null
          season_dates?: Json | null
          seasons?: number | null
          start_year?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_ratings: {
        Row: {
          created_at: string | null
          id: string
          in_watchlist: boolean | null
          media_id: string | null
          media_type: string
          sentiment_rating: number | null
          tv_show_id: string | null
          updated_at: string | null
          user_id: string
          user_rating: number | null
          watched: boolean | null
          watched_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          in_watchlist?: boolean | null
          media_id?: string | null
          media_type?: string
          sentiment_rating?: number | null
          tv_show_id?: string | null
          updated_at?: string | null
          user_id?: string
          user_rating?: number | null
          watched?: boolean | null
          watched_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          in_watchlist?: boolean | null
          media_id?: string | null
          media_type?: string
          sentiment_rating?: number | null
          tv_show_id?: string | null
          updated_at?: string | null
          user_id?: string
          user_rating?: number | null
          watched?: boolean | null
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_movie_data_movie_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_movie_data_tv_show_id_fkey"
            columns: ["tv_show_id"]
            isOneToOne: false
            referencedRelation: "tv_shows"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
