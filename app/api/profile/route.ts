import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabase/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function PATCH(req: NextRequest) {
    try {
        const supabase = await createServerSupabase();

        const {
            data: { user },
            error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const companyId = typeof body?.companyId === "string" ? body.companyId.trim() : "";
        const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";

        if (!companyId) {
            return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
        }

        if (!fullName) {
            return NextResponse.json({ error: "Full name is required" }, { status: 400 });
        }

        if (fullName.length > 120) {
            return NextResponse.json({ error: "Full name is too long" }, { status: 400 });
        }

        const { data: membership, error: membershipErr } = await supabaseAdmin
            .from("company_members")
            .select("company_id, user_id")
            .eq("company_id", companyId)
            .eq("user_id", user.id)
            .eq("active", true)
            .maybeSingle();

        if (membershipErr) {
            return NextResponse.json(
                { error: membershipErr.message || "Could not verify membership" },
                { status: 500 }
            );
        }

        if (!membership) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { data: updatedMember, error: updateErr } = await supabaseAdmin
            .from("company_members")
            .update({ full_name: fullName })
            .eq("company_id", companyId)
            .eq("user_id", user.id)
            .select("user_id, company_id, full_name")
            .maybeSingle();

        if (updateErr) {
            return NextResponse.json(
                { error: updateErr.message || "Could not update profile" },
                { status: 500 }
            );
        }

        if (!updatedMember) {
            return NextResponse.json({ error: "Profile update did not affect any row." }, { status: 500 });
        }

        const profilePayload = {
            user_id: user.id,
            company_id: companyId,
            full_name: fullName,
        };

        const { data: updatedProfile, error: profileUpdateErr } = await supabaseAdmin
            .from("profiles")
            .update({ full_name: fullName })
            .eq("user_id", user.id)
            .eq("company_id", companyId)
            .select("user_id")
            .maybeSingle();

        if (profileUpdateErr) {
            return NextResponse.json(
                { error: profileUpdateErr.message || "Could not sync profile" },
                { status: 500 }
            );
        }

        if (!updatedProfile) {
            const { error: profileInsertErr } = await supabaseAdmin
                .from("profiles")
                .insert(profilePayload);

            if (profileInsertErr) {
                return NextResponse.json(
                    { error: profileInsertErr.message || "Could not create profile" },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({ ok: true, profile: updatedMember }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? "Unexpected error" },
            { status: 500 }
        );
    }
}
