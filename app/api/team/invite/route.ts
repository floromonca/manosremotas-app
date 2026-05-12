import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerSupabase } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const resend = new Resend(process.env.RESEND_API_KEY);

type MembershipRow = {
    company_id: string;
    role: string;
};

function escHtml(value: string | null | undefined) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function cleanEmailName(value: string) {
    return value.replace(/[<>"]/g, "").trim();
}

function formatInviteSender(companyName: string, fromEmail: string) {
    const displayName =
        cleanEmailName(companyName + " via ManosRemotas") || "ManosRemotas";

    return displayName + " <" + fromEmail + ">";
}

function canManageTeam(role: string | null | undefined) {
    return role === "owner" || role === "admin";
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);

        const companyId = String(body?.companyId ?? "").trim();
        const email = String(body?.email ?? "").trim().toLowerCase();
        const role = String(body?.role ?? "tech").trim().toLowerCase();

        if (!companyId) {
            return NextResponse.json(
                { ok: false, error: "Company ID is required." },
                { status: 400 }
            );
        }

        if (!email || !isValidEmail(email)) {
            return NextResponse.json(
                { ok: false, error: "A valid email address is required." },
                { status: 400 }
            );
        }

        if (role !== "tech" && role !== "admin") {
            return NextResponse.json(
                { ok: false, error: "Invalid role for invite." },
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

        const { data: memberships, error: membershipsErr } = await supabase
            .from("company_members")
            .select("company_id, role")
            .eq("user_id", user.id);

        if (membershipsErr) {
            console.error("company_members lookup error:", membershipsErr);

            return NextResponse.json(
                { ok: false, error: "Access validation failed." },
                { status: 500 }
            );
        }

        const membershipList = (memberships ?? []) as MembershipRow[];

        const currentMembership =
            membershipList.find((m) => m.company_id === companyId) ?? null;

        if (!currentMembership) {
            return NextResponse.json(
                { ok: false, error: "Access denied for this company." },
                { status: 403 }
            );
        }

        if (!canManageTeam(currentMembership.role)) {
            return NextResponse.json(
                { ok: false, error: "You do not have permission to invite members." },
                { status: 403 }
            );
        }

        const { data: company, error: companyErr } = await supabaseAdmin
            .from("companies")
            .select("company_id, company_name, legal_name, email, phone")
            .eq("company_id", companyId)
            .maybeSingle();

        if (companyErr) {
            console.error("company lookup error:", companyErr);

            return NextResponse.json(
                { ok: false, error: "Company lookup failed." },
                { status: 500 }
            );
        }

        if (!company) {
            return NextResponse.json(
                { ok: false, error: "Company not found." },
                { status: 404 }
            );
        }

        const companyName =
            String((company as any).legal_name ?? "").trim() ||
            String((company as any).company_name ?? "").trim() ||
            "ManosRemotas";

        const resendFrom = process.env.RESEND_FROM_EMAIL;

        if (!resendFrom) {
            return NextResponse.json(
                { ok: false, error: "RESEND_FROM_EMAIL missing." },
                { status: 500 }
            );
        }

        if (resendFrom.includes("@resend.dev")) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Resend is using the test sender onboarding@resend.dev. Verify manosremotas.com in Resend and set RESEND_FROM_EMAIL before sending invitations.",
                },
                { status: 500 }
            );
        }

        if (!isValidEmail(resendFrom)) {
            return NextResponse.json(
                { ok: false, error: "RESEND_FROM_EMAIL is not valid." },
                { status: 500 }
            );
        }

        const appUrl =
            process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

        if (!appUrl) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL is not configured.",
                },
                { status: 500 }
            );
        }

        const { data: existingInvite, error: existingInviteErr } =
            await supabaseAdmin
                .from("company_invites")
                .select("invite_id, status")
                .eq("company_id", companyId)
                .eq("email", email)
                .eq("status", "pending")
                .maybeSingle();

        if (existingInviteErr) {
            console.error("existing invite lookup error:", existingInviteErr);

            return NextResponse.json(
                { ok: false, error: "Invite lookup failed." },
                { status: 500 }
            );
        }

        let inviteId = existingInvite?.invite_id ?? null;

        if (!inviteId) {
            const { data: insertedInvite, error: insertInviteErr } =
                await supabaseAdmin
                    .from("company_invites")
                    .insert({
                        company_id: companyId,
                        email,
                        role,
                        status: "pending",
                    })
                    .select("invite_id")
                    .single();

            if (insertInviteErr) {
                console.error("invite insert error:", insertInviteErr);

                return NextResponse.json(
                    { ok: false, error: "Could not create invite." },
                    { status: 500 }
                );
            }

            inviteId = insertedInvite?.invite_id ?? null;
        }

        const signupUrl = `${appUrl}/auth?mode=signup&email=${encodeURIComponent(email)}`;

        const emailHtml = `
      <div style="margin:0; padding:24px; background:#f4f7fb; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
        <div style="max-width:680px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
          <div style="padding:24px 28px; background:linear-gradient(180deg, #fcfcfd 0%, #f8fafc 100%); border-bottom:1px solid #e5e7eb;">
            <div style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#667085; font-weight:700; margin-bottom:8px;">
              ${escHtml(companyName)}
            </div>

            <h1 style="margin:0; font-size:28px; line-height:1.1; color:#111827;">
              You have been invited to ManosRemotas
            </h1>

            <p style="margin:18px 0 0; font-size:15px; line-height:1.6; color:#344054;">
              Hello,<br/>
              ${escHtml(companyName)} invited you to join their team in ManosRemotas as <strong>${escHtml(role)}</strong>.
            </p>
          </div>

          <div style="padding:24px 28px;">
            <div style="border:1px solid #e5e7eb; border-radius:14px; padding:18px; background:#f9fafb; margin-bottom:22px;">
              <div style="font-size:13px; color:#475467; margin-bottom:12px; line-height:1.6;">
                Use the button below to create your account. Please register using this same email address:
              </div>

              <div style="font-size:15px; color:#111827; font-weight:700; margin-bottom:16px;">
                ${escHtml(email)}
              </div>

              <a
                href="${signupUrl}"
                style="display:inline-block; padding:12px 18px; background:#2563eb; color:#ffffff; text-decoration:none; border-radius:10px; font-weight:800; font-size:14px;"
              >
                Accept invitation
              </a>
            </div>

            <div style="font-size:14px; line-height:1.7; color:#475467;">
              If the button does not work, copy and paste this link into your browser:<br/>
              <span style="word-break:break-all; color:#2563eb;">${escHtml(signupUrl)}</span>
            </div>

            <div style="margin-top:20px; padding-top:16px; border-top:1px solid #e5e7eb; font-size:13px; color:#667085;">
              <div style="font-weight:700; color:#111827; margin-bottom:4px;">ManosRemotas</div>
              <div>Field service operations software</div>
            </div>
          </div>
        </div>
      </div>
    `;

        const replyTo =
            (company as any).email && isValidEmail(String((company as any).email).trim())
                ? String((company as any).email).trim()
                : undefined;

        const { error: sendError, data: sendData } = await resend.emails.send({
            from: formatInviteSender(companyName, resendFrom),
            to: [email],
            replyTo,
            subject: `${companyName} invited you to ManosRemotas`,
            html: emailHtml,
        });

        if (sendError) {
            console.error("resend invite send error:", sendError);

            return NextResponse.json(
                {
                    ok: false,
                    error: sendError.message || "Invite email send failed.",
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            message: "Invite created and email sent.",
            inviteId,
            resendId: sendData?.id ?? null,
        });
    } catch (err) {
        console.error("team invite route error:", err);

        return NextResponse.json(
            { ok: false, error: "Server error." },
            { status: 500 }
        );
    }
}