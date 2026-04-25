import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const SUPER_ADMIN_EMAILS = ["floromonca@gmail.com"];

export async function GET() {
    try {
        const supabase = await createServerSupabase();

        const {
            data: { user },
            error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) {
            return NextResponse.json(
                { error: userErr.message || "Unauthorized" },
                { status: 401 }
            );
        }

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const email = user.email?.toLowerCase() ?? "";
        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email);

        if (!isSuperAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { data, error } = await supabaseAdmin
            .from("companies")
            .select("company_id, company_name, created_by, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json(
                { error: error.message || "Could not load companies" },
                { status: 500 }
            );
        }

        return NextResponse.json({ companies: data ?? [] }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? "Unexpected error" },
            { status: 500 }
        );
    }
}