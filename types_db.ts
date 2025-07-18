export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          stripe_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_refunds: {
        Row: {
          id: number
          user_id: string
          month_key: string
          refund_amount: number
          stripe_refund_id: string | null
          status: string | null
          created_at: string
          processed_at: string | null
          notes: string | null
        }
        Insert: {
          id?: number
          user_id: string
          month_key: string
          refund_amount: number
          stripe_refund_id?: string | null
          status?: string | null
          created_at?: string
          processed_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          month_key?: string
          refund_amount?: number
          stripe_refund_id?: string | null
          status?: string | null
          created_at?: string
          processed_at?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_refunds_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          entry_price: number
          entry_timestamp: string
          exit_price: number | null
          exit_timestamp: string | null
          id: number
          macd: number | null
          pnl: number | null
          quantity: number | null
          reason: string | null
          risk: number | null
          rsi: number | null
          type: string
          source: string | null
          status: string | null
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entry_price: number
          entry_timestamp: string
          exit_price?: number | null
          exit_timestamp?: string | null
          id?: number
          macd?: number | null
          pnl?: number | null
          quantity?: number | null
          reason?: string | null
          risk?: number | null
          rsi?: number | null
          side: string
          source?: string | null
          status?: string | null
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entry_price?: number
          entry_timestamp?: string
          exit_price?: number | null
          exit_timestamp?: string | null
          id?: number
          macd?: number | null
          pnl?: number | null
          quantity?: number | null
          reason?: string | null
          risk?: number | null
          rsi?: number | null
          side?: string
          source?: string | null
          status?: string | null
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prices: {
        Row: {
          active: boolean | null
          currency: string | null
          description: string | null
          id: string
          interval: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count: number | null
          metadata: Json | null
          product_id: string | null
          trial_period_days: number | null
          type: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount: number | null
        }
        Insert: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
        Update: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id?: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          description: string | null
          id: string
          image: string | null
          metadata: Json | null
          name: string | null
        }
        Insert: {
          active?: boolean | null
          description?: string | null
          id: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Update: {
          active?: boolean | null
          description?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          clicks: number | null
          code: string
          conversions: number | null
          created_at: string
          id: number
          is_active: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clicks?: number | null
          code: string
          conversions?: number | null
          created_at?: string
          id?: number
          is_active?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clicks?: number | null
          code?: string
          conversions?: number | null
          created_at?: string
          id?: number
          is_active?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: number
          paid_at: string | null
          referral_id: number
          reward_type: string
          status: string | null
          stripe_transfer_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: number
          paid_at?: string | null
          referral_id: number
          reward_type: string
          status?: string | null
          stripe_transfer_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: number
          paid_at?: string | null
          referral_id?: number
          reward_type?: string
          status?: string | null
          stripe_transfer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: number
          referee_id: string
          referral_code: string
          referrer_id: string
          reward_amount: number | null
          reward_currency: string | null
          rewarded_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: number
          referee_id: string
          referral_code: string
          referrer_id: string
          reward_amount?: number | null
          reward_currency?: string | null
          rewarded_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: number
          referee_id?: string
          referral_code?: string
          referrer_id?: string
          reward_amount?: number | null
          reward_currency?: string | null
          rewarded_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          id: string
          symbol: string
          type: string
          entry_price: number
          exit_price: number | null
          exit_timestamp: string | null
          pnl_percentage: number | null
          status: string
          created_at: string
          exchange: string
          signal_source: string
          strategy_name: string
          timeframe: string | null
          rsi_value: number | null
          smoothing_ma_value: number | null
          long_term_ma_value: number | null
          divergence_type: string | null
          exit_reason: string | null
          alert_message: string | null
          technical_metadata: Json | null
        }
        Insert: {
          id?: string
          symbol: string
          type: string
          entry_price: number
          exit_price?: number | null
          exit_timestamp?: string | null
          pnl_percentage?: number | null
          status?: string
          created_at?: string
          exchange?: string
          signal_source?: string
          strategy_name?: string
          timeframe?: string | null
          rsi_value?: number | null
          smoothing_ma_value?: number | null
          long_term_ma_value?: number | null
          divergence_type?: string | null
          exit_reason?: string | null
          alert_message?: string | null
          technical_metadata?: Json | null
        }
        Update: {
          id?: string
          symbol?: string
          type?: string
          entry_price?: number
          exit_price?: number | null
          exit_timestamp?: string | null
          pnl_percentage?: number | null
          status?: string
          created_at?: string
          exchange?: string
          signal_source?: string
          strategy_name?: string
          timeframe?: string | null
          rsi_value?: number | null
          smoothing_ma_value?: number | null
          long_term_ma_value?: number | null
          divergence_type?: string | null
          exit_reason?: string | null
          alert_message?: string | null
          technical_metadata?: Json | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created: string
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          id: string
          metadata: Json | null
          price_id: string | null
          quantity: number | null
          role: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          trial_end: string | null
          trial_start: string | null
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          role?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          role?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_price_id_fkey"
            columns: ["price_id"]
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      whitelist_requests: {
        Row: {
          id: string
          user_id: string
          bybit_uid: string
          user_email: string
          user_name: string | null
          status: string
          created_at: string
          approved_at: string | null
          rejected_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          bybit_uid: string
          user_email: string
          user_name?: string | null
          status?: string
          created_at?: string
          approved_at?: string | null
          rejected_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          bybit_uid?: string
          user_email?: string
          user_name?: string | null
          status?: string
          created_at?: string
          approved_at?: string | null
          rejected_at?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whitelist_requests_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          billing_address: Json | null
          full_name: string | null
          id: string
          payment_method: Json | null
          referral_code: string | null
          referred_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          billing_address?: Json | null
          full_name?: string | null
          id: string
          payment_method?: Json | null
          referral_code?: string | null
          referred_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          billing_address?: Json | null
          full_name?: string | null
          id?: string
          payment_method?: Json | null
          referral_code?: string | null
          referred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      pricing_plan_interval: "day" | "week" | "month" | "year"
      pricing_type: "one_time" | "recurring"
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
        | "paused"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database["public"]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][PublicEnumNameOrOptions]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
