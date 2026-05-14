import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

type RequestAccessBody = {
    fullName?: unknown;
    companyName?: unknown;
    email?: unknown;
    phone?: unknown;
    location?: unknown;
    businessType?: unknown;
    message?: unknown;
};

function cleanText(value: unknown, maxLength: number) {
    return String(value ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
}

function cleanMessage(value: unknown, maxLength: number) {
    return String(value ?? "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim()
        .slice(0, maxLength);
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => null)) as RequestAccessBody | null;

        if (!body) {
            return NextResponse.json(
                { ok: false, error: "Invalid request body." },
                { status: 400 }
            );
        }

        const fullName = cleanText(body.fullName, 120);
        const companyName = cleanText(body.companyName, 160);
        const email = cleanText(body.email, 180).toLowerCase();
        const phone = cleanText(body.phone, 60);
        const location = cleanText(body.location, 160);
        const businessType = cleanText(body.businessType, 80);
        const message = cleanMessage(body.message, 1200);

        if (!fullName) {
            return NextResponse.json(
                { ok: false, error: "Full name is required." },
                { status: 400 }
            );
        }

        if (!companyName) {
            return NextResponse.json(
                { ok: false, error: "Company name is required." },
                { status: 400 }
            );
        }

        if (!email || !isValidEmail(email)) {
            return NextResponse.json(
                { ok: false, error: "A valid email address is required." },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin
            .from("early_access_requests")
            .insert({
                full_name: fullName,
                company_name: companyName,
                email,
                phone: phone || null,
                location: location || null,
                business_type: businessType || null,
                message: message || null,
                source: "public_landing",
                status: "new",
            });

        if (error) {
            console.error("early access insert error:", error);

            return NextResponse.json(
                { ok: false, error: "Could not save your request." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            message: "Request received.",
        });
    } catch (err) {
        console.error("request access route error:", err);

        return NextResponse.json(
            { ok: false, error: "Server error." },
            { status: 500 }
        );
    }
}