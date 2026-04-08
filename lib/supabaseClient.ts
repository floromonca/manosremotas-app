import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// DEV only: expose supabase in browser console for debugging
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    (window as any).supabase = supabase;
}