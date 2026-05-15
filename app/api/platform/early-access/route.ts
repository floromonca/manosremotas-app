import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const SUPER_ADMIN_EMAILS = ["floromonca@gmail.com"];

const ALLOWED_STATUSES = [
    "new",
    "contacted",
    "qualified",
    "invited",
    "rejected",
];

const SELECT_COLUMNS =
    "id, full_name, company_name, email, phone, location, business_type, message, source, status, created_at, internal_note, next_follow_up_at";

function isAllowedStatus(status: unknown): status is string {
    return typeof status === "string" && ALLOWED_STATUSES.includes(status);
}

function normalizeOptionalText(value: unknown) {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalDate(value: unknown) {
    if (value === null || value === undefined || value === "") return null;

    if (typeof value !== "string") return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return null;

    return date.toISOString();
}

async function requireSuperAdmin() {
    const supabase = await createServerSupabase();

    const {
        data: { user },
        error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
        return {
            user: null,
            error: NextResponse.json(
                { error: userErr.message || "Unauthorized" },
                { status: 401 }
            ),
        };
    }

    if (!user) {
        return {
            user: null,
            error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    const email = user.email?.toLowerCase() ?? "";
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email);

    if (!isSuperAdmin) {
        return {
            user: null,
            error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        };
    }

    return { user, error: null };
}

export async function GET() {
    try {
        const auth = await requireSuperAdmin();

        if (auth.error) {
            return auth.error;
        }

        const { data, error } = await supabaseAdmin
            .from("early_access_requests")
            .select(SELECT_COLUMNS)
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json(
                { error: error.message || "Could not load early access requests" },
                { status: 500 }
            );
        }

        return NextResponse.json({ requests: data ?? [] }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? "Unexpected error" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: Request) {
    try {
        const auth = await requireSuperAdmin();

        if (auth.error) {
            return auth.error;
        }

        const body = await req.json();
        const id = typeof body?.id === "string" ? body.id.trim() : "";

        if (!id) {
            return NextResponse.json(
                { error: "Missing early access request id" },
                { status: 400 }
            );
        }

        const updates: {
            status?: string;
            internal_note?: string | null;
            next_follow_up_at?: string | null;
        } = {};

        if ("status" in body) {
            if (!isAllowedStatus(body.status)) {
                return NextResponse.json(
                    { error: "Invalid status" },
                    { status: 400 }
                );
            }

            updates.status = body.status;
        }

        if ("internal_note" in body) {
            updates.internal_note = normalizeOptionalText(body.internal_note);
        }

        if ("next_follow_up_at" in body) {
            updates.next_follow_up_at = normalizeOptionalDate(body.next_follow_up_at);
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("early_access_requests")
            .update(updates)
            .eq("id", id)
            .select(SELECT_COLUMNS)
            .single();

        if (error) {
            return NextResponse.json(
                { error: error.message || "Could not update early access request" },
                { status: 500 }
            );
        }

        return NextResponse.json({ request: data }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? "Unexpected error" },
            { status: 500 }
        );
    }
}