import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy client initialization to avoid build-time errors
let _supabaseClient: SupabaseClient | null = null;
let _supabaseServer: SupabaseClient | null = null;

/**
 * Get client-side Supabase client (uses anon key, RLS enforced)
 * Safe for browser use - respects Row Level Security
 */
export function getSupabaseClient(): SupabaseClient {
  if (!_supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase client environment variables');
    }

    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabaseClient;
}

/**
 * Get server-side Supabase client (uses service role key, bypasses RLS)
 * Only use in API routes - has full admin privileges
 */
export function getSupabaseServer(): SupabaseClient {
  if (!_supabaseServer) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase server environment variables');
    }

    _supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseServer;
}

// Note: Use getSupabaseClient() and getSupabaseServer() functions instead of direct exports
// to avoid build-time initialization errors

// Type exports for database tables
export type Database = {
  menus: {
    id: string;
    created_at: string;
    week_of: string;
    status: 'draft' | 'approved' | 'archived';
    staple_recommendations: string | null;
    total_prep_time_minutes: number | null;
    time_warning: boolean;
  };
  menu_items: {
    id: string;
    menu_id: string;
    item_type: 'main' | 'side' | 'breakfast' | 'drink';
    pairing_group: 'A' | 'B' | 'independent' | null;
    name_en: string;
    name_es: string;
    cuisine: string | null;
    description: string | null;
    prep_time_minutes: number | null;
    servings: number;
    user_servings_override: number | null;
    sort_order: number;
  };
  recipes: {
    id: string;
    menu_item_id: string;
    full_recipe_es: string;
    ingredients_json: Record<string, unknown>; // JSONB type
    yield_statement: string | null;
    equipment: string[] | null;
    generated_at: string;
  };
  chat_messages: {
    id: string;
    menu_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
  };
};
