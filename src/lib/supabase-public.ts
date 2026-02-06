import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cria um cliente Supabase público para páginas que não precisam de autenticação.
 * Retorna uma nova instância a cada chamada para evitar estado compartilhado
 * e o erro "AbortError: signal is aborted without reason" do auth-js locks.
 */
export function createPublicClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
