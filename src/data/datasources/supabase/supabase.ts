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
          parent_category_id: string | null;
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
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['budget_category_allocations']['Row'], 'budget_category_allocation_id' | 'created_at' | 'updated_at'> & {
          budget_category_allocation_id?: string;
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
      user_profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          date_of_birth: string | null;
          job: string | null;
          initial_income: number | null;
          currency_code: string;
          locale: string | null;
          time_zone: string | null;
          avatar_url: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
    };
  };
}

export default supabase;
