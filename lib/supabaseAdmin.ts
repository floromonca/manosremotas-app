import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
}

if (!supabaseServiceRoleKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
}

export const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);