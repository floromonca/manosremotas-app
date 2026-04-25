import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const SUPER_ADMIN_EMAILS = ["floromonca@gmail.com"];

export async function POST(req: NextRequest) {
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

        const body = await req.json();
        const companyId = body?.companyId as string | undefined;

        if (!companyId) {
            return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
        }

        const { data: existingMember, error: existingErr } = await supabaseAdmin
            .from("company_members")
            .select("company_id, user_id")
            .eq("company_id", companyId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (existingErr) {
            return NextResponse.json(
                { error: existingErr.message || "Could not verify membership" },
                { status: 500 }
            );
        }

        if (!existingMember) {
            const { error: insertErr } = await supabaseAdmin
                .from("company_members")
                .insert({
                    company_id: companyId,
                    user_id: user.id,
                    role: "owner",
                    full_name: user.email ?? "Super Admin",
                    active: true,
                });

            if (insertErr) {
                return NextResponse.json(
                    { error: insertErr.message || "Could not create membership" },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? "Unexpected error" },
            { status: 500 }
        );
    }
}