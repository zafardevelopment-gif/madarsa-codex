import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use service role key so all DB operations bypass RLS
  const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createSupabaseClient<Database>(url, key);
}
