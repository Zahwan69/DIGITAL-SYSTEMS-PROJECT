import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser client for Client Components. Uses cookie-based session storage so it
 * stays in sync with middleware and server (plain createClient() uses
 * localStorage, which middleware never sees — logins appear to "fail").
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
