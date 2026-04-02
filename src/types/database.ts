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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cash_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_cash_cents: number | null
          expected_cash_cents: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_float_cents: number
          store_id: string
          variance_cents: number | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_cash_cents?: number | null
          expected_cash_cents?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_float_cents: number
          store_id: string
          variance_cents?: number | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_cash_cents?: number | null
          expected_cash_cents?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_float_cents?: number
          store_id?: string
          variance_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          discount_cents: number
          gst_cents: number
          id: string
          line_total_cents: number
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          store_id: string
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          discount_cents?: number
          gst_cents: number
          id?: string
          line_total_cents: number
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          store_id: string
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          discount_cents?: number
          gst_cents?: number
          id?: string
          line_total_cents?: number
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          store_id?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cash_tendered_cents: number | null
          channel: string
          created_at: string
          customer_email: string | null
          discount_cents: number
          gst_cents: number
          id: string
          lookup_token: string | null
          notes: string | null
          payment_method: string | null
          promo_id: string | null
          staff_id: string | null
          status: string
          store_id: string
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_session_id: string | null
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          cash_tendered_cents?: number | null
          channel: string
          created_at?: string
          customer_email?: string | null
          discount_cents?: number
          gst_cents: number
          id?: string
          lookup_token?: string | null
          notes?: string | null
          payment_method?: string | null
          promo_id?: string | null
          staff_id?: string | null
          status: string
          store_id: string
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          subtotal_cents: number
          total_cents: number
          updated_at?: string
        }
        Update: {
          cash_tendered_cents?: number | null
          channel?: string
          created_at?: string
          customer_email?: string | null
          discount_cents?: number
          gst_cents?: number
          id?: string
          lookup_token?: string | null
          notes?: string | null
          payment_method?: string | null
          promo_id?: string | null
          staff_id?: string | null
          status?: string
          store_id?: string
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price_cents: number
          reorder_threshold: number
          sku: string | null
          slug: string | null
          stock_quantity: number
          store_id: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price_cents: number
          reorder_threshold?: number
          sku?: string | null
          slug?: string | null
          stock_quantity?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price_cents?: number
          reorder_threshold?: number
          sku?: string | null
          slug?: string | null
          stock_quantity?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_cents: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_cents?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_cents?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          ip: string
          window_start: string
        }
        Insert: {
          count?: number
          ip: string
          window_start: string
        }
        Update: {
          count?: number
          ip?: string
          window_start?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          auth_user_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          pin_attempts: number
          pin_hash: string | null
          pin_locked_until: string | null
          role: string
          store_id: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          pin_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          role: string
          store_id: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          pin_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          role?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_auth_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_auth_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_auth_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string
          store_id: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string
          store_id: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string
          store_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      xero_connections: {
        Row: {
          account_code_cash: string | null
          account_code_eftpos: string | null
          account_code_online: string | null
          connected_at: string
          id: string
          status: string
          store_id: string
          tenant_id: string
          tenant_name: string | null
          updated_at: string
          vault_secret_id: string
          xero_contact_id: string | null
        }
        Insert: {
          account_code_cash?: string | null
          account_code_eftpos?: string | null
          account_code_online?: string | null
          connected_at?: string
          id?: string
          status?: string
          store_id: string
          tenant_id: string
          tenant_name?: string | null
          updated_at?: string
          vault_secret_id: string
          xero_contact_id?: string | null
        }
        Update: {
          account_code_cash?: string | null
          account_code_eftpos?: string | null
          account_code_online?: string | null
          connected_at?: string
          id?: string
          status?: string
          store_id?: string
          tenant_id?: string
          tenant_name?: string | null
          updated_at?: string
          vault_secret_id?: string
          xero_contact_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xero_connections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      xero_sync_log: {
        Row: {
          attempt_count: number
          created_at: string
          error_message: string | null
          id: string
          period_from: string | null
          period_to: string | null
          status: string
          store_id: string
          sync_date: string
          sync_type: string
          total_cents: number | null
          xero_invoice_id: string | null
          xero_invoice_number: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          id?: string
          period_from?: string | null
          period_to?: string | null
          status: string
          store_id: string
          sync_date: string
          sync_type: string
          total_cents?: number | null
          xero_invoice_id?: string | null
          xero_invoice_number?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          id?: string
          period_from?: string | null
          period_to?: string | null
          status?: string
          store_id?: string
          sync_date?: string
          sync_type?: string
          total_cents?: number | null
          xero_invoice_id?: string | null
          xero_invoice_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xero_sync_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: { p_ip: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      complete_online_sale: {
        Args: {
          p_customer_email?: string
          p_items?: Json
          p_order_id: string
          p_store_id: string
          p_stripe_payment_intent_id: string
          p_stripe_session_id: string
        }
        Returns: undefined
      }
      complete_pos_sale: {
        Args: {
          p_cash_tendered_cents?: number
          p_discount_cents: number
          p_gst_cents: number
          p_items?: Json
          p_notes?: string
          p_payment_method: string
          p_staff_id: string
          p_store_id: string
          p_subtotal_cents: number
          p_total_cents: number
        }
        Returns: Json
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      delete_xero_tokens: { Args: { p_store_id: string }; Returns: undefined }
      get_xero_tokens: {
        Args: { p_store_id: string }
        Returns: {
          access_token: string
          expires_at: string
          refresh_token: string
        }[]
      }
      increment_promo_uses: { Args: { p_promo_id: string }; Returns: undefined }
      restore_stock: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: undefined
      }
      upsert_xero_token: {
        Args: { p_store_id: string; p_token_json: string }
        Returns: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
