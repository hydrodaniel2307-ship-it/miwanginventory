import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client for use in server actions and API routes.
// Uses service_role key to bypass RLS (all auth is handled at app level).
// Falls back to anon key with a warning if service_role key is not set.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceRoleKey) {
    return createSupabaseClient(url, serviceRoleKey);
  }

  // Fallback: anon key (insecure — only for development before service key is configured)
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[supabase/admin] SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Using anon key as fallback. Set the service_role key in .env.local " +
        "(Supabase Dashboard > Settings > API > service_role)"
    );
    return createSupabaseClient(
      url,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is required in production. " +
      "Get it from Supabase Dashboard > Settings > API > service_role key"
  );
}
