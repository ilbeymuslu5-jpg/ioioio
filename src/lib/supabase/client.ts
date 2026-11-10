import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Tarayıcı (Client Component) tarafı Supabase istemcisi. */
export function createClient() {
  assertSupabaseConfigured();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
