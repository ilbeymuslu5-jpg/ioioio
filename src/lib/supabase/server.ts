import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { assertSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Server Component / Server Action / Route Handler tarafı Supabase istemcisi. */
export async function createClient() {
  assertSupabaseConfigured();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component içinden çağrıldığında çerez yazılamaz;
          // oturum yenilemeyi middleware üstlendiği için güvenle yok sayılır.
        }
      },
    },
  });
}
