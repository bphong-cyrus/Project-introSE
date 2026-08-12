// SmartSpend AI - Supabase Client Configuration
// Environment: Mobile App

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Replace with your actual Supabase project URL and anon key
const SUPABASE_URL = 'https://ndtkwtsmseibznarqvsw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdGt3dHNtc2VpYnpuYXJxdnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NTE0MzEsImV4cCI6MjEwMDEyNzQzMX0.ETM2DZpUh1bIj_QsPR1NusQyFmEYgRtOqqqJxZlPQHw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          category_id: string;
          user_id: string | null;
          name: string;
          type: 'income' | 'expense';
          icon: string | null;
          color: string | null;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          parent_id: string | null;
          sort_order: number | null;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'category_id' | 'created_at' | 'updated_at'> & {
          category_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      transactions: {
        Row: {
          transaction_id: string;
          user_id: string;
          category_id: string;
          receipt_id: string | null;
          receipt_line_item_id: string | null;
          description: string;
          amount: number;
          currency_code: string;
          transaction_date: string;
          payment_method: string | null;
          source: string | null;
          created_at: string;
          updated_at: string;
          name: string | null;
          type: 'income' | 'expense';
          note: string | null;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'transaction_id' | 'created_at' | 'updated_at'> & {
          transaction_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
      budgets: {
        Row: {
          budget_id: string;
          user_id: string;
          year: number;
          month: number;
          total_budget_amount: number;
          currency_code: string;
          created_at: string;
          updated_at: string;
          expected_income_amount: number | null;
          expected_income_currency_code: string | null;
          income_frequency: string | null;
        };
        Insert: Omit<Database['public']['Tables']['budgets']['Row'], 'budget_id' | 'created_at' | 'updated_at'> & {
          budget_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>;
      };
      budget_category_allocations: {
        Row: {
          budget_category_allocation_id: string;
          budget_id: string;
          category_id: string;
          allocated_amount: number;
          spent_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['budget_category_allocations']['Row'], 'budget_category_allocation_id' | 'created_at' | 'updated_at' | 'spent_amount'> & {
          budget_category_allocation_id?: string;
          spent_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['budget_category_allocations']['Insert']>;
      };
      receipts: {
        Row: {
          receipt_id: string;
          user_id: string;
          receipt_image_id: string | null;
          merchant_name: string | null;
          purchase_date: string;
          total_amount: number;
          currency_code: string;
          payment_method: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['receipts']['Row'], 'receipt_id' | 'created_at' | 'updated_at'> & {
          receipt_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['receipts']['Insert']>;
      };
      receipt_images: {
        Row: {
          receipt_image_id: string;
          user_id: string;
          storage_url: string;
          content_type: string | null;
          file_size_bytes: number | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['receipt_images']['Row'], 'receipt_image_id' | 'created_at'> & {
          receipt_image_id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['receipt_images']['Insert']>;
      };
      receipt_line_items: {
        Row: {
          receipt_line_item_id: string;
          receipt_id: string;
          line_number: number;
          item_name: string;
          quantity: number;
          unit_price: number;
          line_total: number;
        };
        Insert: Omit<Database['public']['Tables']['receipt_line_items']['Row'], 'receipt_line_item_id'> & {
          receipt_line_item_id?: string;
        };
        Update: Partial<Database['public']['Tables']['receipt_line_items']['Insert']>;
      };
      user_profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          date_of_birth: string | null;
          job: string | null;
          initial_income: number | null;
          currency_code: string | null;
          locale: string | null;
          time_zone: string | null;
          avatar_url: string | null;
          updated_at: string;
          is_admin: boolean;
          account_status: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'updated_at' | 'is_admin' | 'account_status'> & {
          updated_at?: string;
          is_admin?: boolean;
          account_status?: string;
        };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      ocr_results: {
        Row: {
          receipt_id: string;
          ocr_engine: string;
          ocr_version: string | null;
          extracted_fields: Record<string, unknown>;
          raw_text: string | null;
          processed_at: string;
          confidence: number | null;
        };
        Insert: Database['public']['Tables']['ocr_results']['Row'];
        Update: Partial<Database['public']['Tables']['ocr_results']['Insert']>;
      };
      recommendation_runs: {
        Row: {
          recommendation_run_id: string;
          user_id: string;
          budget_id: string;
          model_name: string;
          model_version: string | null;
          input_snapshot: Record<string, unknown>;
          status: string;
          failure_reason: string | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['recommendation_runs']['Row'], 'recommendation_run_id'> & {
          recommendation_run_id?: string;
        };
        Update: Partial<Database['public']['Tables']['recommendation_runs']['Insert']>;
      };
      scan_logs: {
        Row: {
          scan_log_id: string;
          user_id: string;
          receipt_id: string | null;
          ocr_result_id: string | null;
          status: string;
          extracted_amount: number | null;
          extracted_merchant: string | null;
          suggested_category_id: string | null;
          final_category_id: string | null;
          confidence_score: number | null;
          error_code: string | null;
          error_message: string | null;
          is_reviewed: boolean;
          raw_receipt_image_url: string | null;
          raw_text: string | null;
          extracted_fields: Record<string, unknown> | null;
          model_name: string | null;
          processing_time_ms: number | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          relabeled_category_id: string | null;
          relabel_notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['scan_logs']['Row'], 'scan_log_id' | 'created_at' | 'is_reviewed' | 'raw_receipt_image_url' | 'raw_text' | 'extracted_fields' | 'model_name' | 'processing_time_ms' | 'reviewed_at' | 'reviewed_by' | 'relabeled_category_id' | 'relabel_notes'> & {
          scan_log_id?: string;
          is_reviewed?: boolean;
          raw_receipt_image_url?: string | null;
          raw_text?: string | null;
          extracted_fields?: Record<string, unknown> | null;
          model_name?: string | null;
          processing_time_ms?: number | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          relabeled_category_id?: string | null;
          relabel_notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['scan_logs']['Insert']>;
      };
      feedbacks: {
        Row: {
          feedback_id: string;
          user_id: string;
          user_email: string | null;
          category: string;
          subject: string;
          content: string;
          attachment_url: string | null;
          status: string;
          priority: string | null;
          internal_notes: string | null;
          technical_notes: string | null;
          related_module: string | null;
          dev_status: string | null;
          dev_email: string | null;
          dev_tracking_id: string | null;
          forwarded_to_dev_at: string | null;
          forwarded_to_dev_by: string | null;
          admin_response: string | null;
          responded_at: string | null;
          responded_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['feedbacks']['Row'], 'feedback_id' | 'created_at' | 'priority' | 'internal_notes' | 'technical_notes' | 'related_module' | 'dev_status' | 'dev_email' | 'dev_tracking_id' | 'forwarded_to_dev_at' | 'forwarded_to_dev_by' | 'admin_response' | 'responded_at' | 'responded_by'> & {
          feedback_id?: string;
          priority?: string | null;
          internal_notes?: string | null;
          technical_notes?: string | null;
          related_module?: string | null;
          dev_status?: string | null;
          dev_email?: string | null;
          dev_tracking_id?: string | null;
          forwarded_to_dev_at?: string | null;
          forwarded_to_dev_by?: string | null;
          admin_response?: string | null;
          responded_at?: string | null;
          responded_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['feedbacks']['Insert']>;
      };
      audit_logs: {
        Row: {
          audit_log_id: string;
          admin_id: string;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'audit_log_id' | 'created_at'> & {
          audit_log_id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
      notifications: {
        Row: {
          notification_id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Record<string, unknown> | null;
          created_at: string;
          read_at: string | null;
          campaign_id: string | null;
          is_read: boolean;
          deleted_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'notification_id' | 'created_at' | 'is_read' | 'deleted_at' | 'read_at'> & {
          notification_id?: string;
          created_at?: string;
          is_read?: boolean;
          deleted_at?: string | null;
          read_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      notification_campaigns: {
        Row: {
          campaign_id: string;
          title: string;
          body: string;
          target_audience: string;
          status: string;
          scheduled_at: string | null;
          sent_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notification_campaigns']['Row'], 'campaign_id' | 'created_at'> & {
          campaign_id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notification_campaigns']['Insert']>;
      };
      notification_campaign_targets: {
        Row: {
          campaign_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          campaign_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notification_campaign_targets']['Insert']>;
      };
      user_notification_settings: {
        Row: {
          user_id: string;
          push_enabled: boolean;
          daily_reminder_enabled: boolean;
          reminder_frequency: 'everyday' | 'fixed_date';
          reminder_time: string | null;
          reminder_date: string | null;
          expo_push_token: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_notification_settings']['Row'], 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_notification_settings']['Insert']>;
      };
      budget_warnings: {
        Row: {
          warning_id: string;
          user_id: string;
          budget_category_allocation_id: string | null;
          triggered_by_transaction_id: string | null;
          warning_type: string;
          message: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['budget_warnings']['Row'], 'warning_id' | 'created_at'> & {
          warning_id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['budget_warnings']['Insert']>;
      };
      push_tokens: {
        Row: {
          push_token_id: string;
          user_id: string;
          token: string;
          device_type: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['push_tokens']['Row'], 'push_token_id' | 'created_at' | 'updated_at'> & {
          push_token_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['push_tokens']['Insert']>;
      };
    };
    Functions: {
      get_admin_auth_users: {
        Args: Record<string, never>;
        Returns: {
          uid: string;
          display_name: string | null;
          email: string | null;
          phone: string | null;
          providers: string[];
          provider_type: string | null;
          created_at: string;
          last_sign_in_at: string | null;
        }[];
      };
      admin_update_user_profile: {
        Args: {
          target_user_id: string;
          profile_full_name: string;
          profile_date_of_birth: string | null;
          profile_job: string | null;
          profile_initial_income: number | null;
        };
        Returns: Database['public']['Tables']['user_profiles']['Row'];
      };
      admin_update_user_account_status: {
        Args: {
          target_user_id: string;
          new_status: 'active' | 'inactive';
        };
        Returns: Database['public']['Tables']['user_profiles']['Row'];
      };
      admin_create_notification_campaign: {
        Args: {
          campaign_title: string;
          campaign_body: string;
          campaign_audience: string;
          scheduled_for: string | null;
          target_user_ids: string[];
        };
        Returns: string;
      };
      admin_cancel_notification_campaign: {
        Args: {
          target_campaign_id: string;
        };
        Returns: Database['public']['Tables']['notification_campaigns']['Row'];
      };
      evaluate_user_budget_notifications: {
        Args: Record<string, never>;
        Returns: number;
      };
      ensure_user_monthly_budget: {
        Args: {
          target_year?: number | null;
          target_month?: number | null;
        };
        Returns: string;
      };
      refresh_user_budget_spending: {
        Args: {
          target_year?: number | null;
          target_month?: number | null;
        };
        Returns: string;
      };
      delete_user_transaction: {
        Args: {
          target_transaction_id: string;
        };
        Returns: boolean;
      };
    };
  };
}

export default supabase;
