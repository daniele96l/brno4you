import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  // eslint-disable-next-line no-var
  var __vernoSupabase: SupabaseClient | undefined;
}

function serverSecret() {
  const secret = process.env.VERNO4U_SERVER_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing VERNO4U_SERVER_SECRET");
  return secret;
}

/** Anon client + SECURITY DEFINER RPCs (tables stay locked by RLS). */
export function getSupabase(): SupabaseClient {
  if (global.__vernoSupabase) return global.__vernoSupabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / anon key");
  }

  global.__vernoSupabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return global.__vernoSupabase;
}

export async function rpc<T = unknown>(
  fn: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await getSupabase().rpc(fn, {
    p_secret: serverSecret(),
    ...args,
  });
  if (error) throw new Error(error.message);
  return data as T;
}
