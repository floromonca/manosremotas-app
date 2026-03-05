import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ✅ SOLO DEV: exponer supabase para pruebas desde consola
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    (window as any).supabase = supabase;
}