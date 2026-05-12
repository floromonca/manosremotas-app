import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

function cleanText(value: unknown) {
    return String(value ?? "").trim();
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);

        const companyId = cleanText(body?.companyId);
        const fullName = cleanText(body?.fullName);
        const language = cleanText(body?.language) || "en";

        if (!companyId) {
            return NextResponse.json(
                { ok: false, error: "Company ID is required." },
                { status: 400 }
            );
        }

        if (!fullName) {
            return NextResponse.json(
                { ok: false, error: "Full name is required." },
                { status: 400 }
            );
        }

        const supabase = await createServerSupabase();

        const {
            data: { user },
            error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) {
            console.error("auth.getUser error:", userErr);

            return NextResponse.json(
                { ok: false, error: "Unauthorized." },
                { status: 401 }
            );
        }

        if (!user) {
            return NextResponse.json(
                { ok: false, error: "Unauthorized." },
                { status: 401 }
            );
        }

        const { data: membership, error: membershipErr } = await supabaseAdmin
            .from("company_members")
            .select("company_id, user_id, role")
            .eq("company_id", companyId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (membershipErr) {
            console.error("membership lookup error:", membershipErr);

            return NextResponse.json(
                { ok: false, error: "Membership lookup failed." },
                { status: 500 }
            );
        }

        if (!membership) {
            return NextResponse.json(
                { ok: false, error: "User is not a member of this company." },
                { status: 403 }
            );
        }

        const profilePayload = {
            user_id: user.id,
            company_id: companyId,
            full_name: fullName,
            language,
        };

        const { error: profileErr } = await supabaseAdmin
            .from("profiles")
            .upsert(profilePayload, {
                onConflict: "user_id",
            });

        if (profileErr) {
            console.error("profile upsert error:", profileErr);

            return NextResponse.json(
                { ok: false, error: "Could not save profile." },
                { status: 500 }
            );
        }

        const { data: updatedMember, error: memberErr } = await supabaseAdmin
            .from("company_members")
            .update({
                full_name: fullName,
            })
            .eq("company_id", companyId)
            .eq("user_id", user.id)
            .select("user_id, company_id, full_name")
            .maybeSingle();

        if (memberErr) {
            console.error("company member update error:", memberErr);

            return NextResponse.json(
                { ok: false, error: "Could not update team member name." },
                { status: 500 }
            );
        }

        if (!updatedMember) {
            return NextResponse.json(
                { ok: false, error: "Team member name was not updated." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            profile: {
                user_id: user.id,
                company_id: companyId,
                full_name: fullName,
                language,
            },
            member: updatedMember,
        });
    } catch (err) {
        console.error("complete profile route error:", err);

        return NextResponse.json(
            { ok: false, error: "Server error." },
            { status: 500 }
        );
    }
}