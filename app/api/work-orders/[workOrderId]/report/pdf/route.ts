import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hasPlanFeature } from "@/lib/features/entitlements";
import type { PlanKey } from "@/lib/features/plans";
import { renderWorkReportHtml } from "@/lib/work-reports";

export const runtime = "nodejs";

type MembershipRow = {
    company_id: string;
    role: string;
};

function canManageWorkReports(role: string | null | undefined) {
    return role === "owner" || role === "admin";
}

function sanitizeFilePart(value: string | null | undefined) {
    return String(value ?? "")
        .trim()
        .replace(/[\\/:*?"<>|#%{}]/g, "")
        .replace(/\s+/g, " ")
        .slice(0, 80);
}

function buildWorkReportPdfFileName(input: {
    workOrderNumber?: string | null;
    customerName?: string | null;
}) {
    const wo = sanitizeFilePart(input.workOrderNumber || "Work Order");
    const customer = sanitizeFilePart(input.customerName || "Customer");

    return `Work Completion Report ${wo} - ${customer}.pdf`;
}

export async function GET(
    req: Request,
    context: { params: Promise<{ workOrderId: string }> }
) {
    let browser: any = null;

    try {
        const { workOrderId } = await context.params;

        if (!workOrderId) {
            return new NextResponse("workOrderId requerido", { status: 400 });
        }

        const supabase = await createServerSupabase();

        const {
            data: { user },
            error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) {
            console.error("work report pdf auth.getUser error:", userErr);
            return new NextResponse("No autorizado", { status: 401 });
        }

        if (!user) {
            return new NextResponse("No autorizado", { status: 401 });
        }

        const { data: memberships, error: membershipsErr } = await supabase
            .from("company_members")
            .select("company_id, role")
            .eq("user_id", user.id);

        if (membershipsErr) {
            console.error("work report pdf company_members error:", membershipsErr);
            return new NextResponse("Error validando acceso", { status: 500 });
        }

        const membershipList = (memberships ?? []) as MembershipRow[];

        if (membershipList.length === 0) {
            return new NextResponse("Usuario sin empresa vinculada", { status: 403 });
        }

        const { data: workOrder, error: workOrderError } = await supabaseAdmin
            .from("work_orders")
            .select(
                "work_order_id, company_id, work_order_number, customer_name, customer_email, customer_phone, service_address, description, job_type, status, priority, scheduled_for, created_at, assigned_to"
            )
            .eq("work_order_id", workOrderId)
            .maybeSingle();

        if (workOrderError) {
            console.error("work report pdf work_orders error:", workOrderError);
            return new NextResponse("Error consultando Work Order", { status: 500 });
        }

        if (!workOrder) {
            return new NextResponse("Work Order no encontrada", { status: 404 });
        }

        const workOrderCompanyId = workOrder.company_id ?? null;

        if (!workOrderCompanyId) {
            return new NextResponse("Work Order sin empresa vinculada", { status: 400 });
        }

        const currentMembership = membershipList.find(
            (membership) => membership.company_id === workOrderCompanyId
        );

        if (!currentMembership || !canManageWorkReports(currentMembership.role)) {
            return new NextResponse("Acceso denegado a este reporte", { status: 403 });
        }

        const { data: company, error: companyError } = await supabaseAdmin
            .from("companies")
            .select(
                "company_id, company_name, company_email, company_phone, company_website, logo_url, address_line_1, address_line_2, city, state_province, postal_code, country_code, plan_key"
            )
            .eq("company_id", workOrderCompanyId)
            .maybeSingle();

        if (companyError) {
            console.error("work report pdf companies error:", companyError);
            return new NextResponse("Error consultando compañía", { status: 500 });
        }

        const companyPlan = ((company as any)?.plan_key ?? "starter") as PlanKey;

        if (!hasPlanFeature(companyPlan, "work_report")) {
            return new NextResponse("Professional Work Reports requiere plan Business", {
                status: 403,
            });
        }

        const { data: report, error: reportError } = await supabaseAdmin
            .from("work_order_reports")
            .select(
                "work_order_report_id, report_number, status, work_completed_summary, recommendations, customer_facing_note, completion_statement, generated_summary, generated_at"
            )
            .eq("company_id", workOrderCompanyId)
            .eq("work_order_id", workOrderId)
            .maybeSingle();

        if (reportError) {
            console.error("work report pdf record error:", reportError);
            return new NextResponse("Error consultando Work Report", { status: 500 });
        }

        const { data: items, error: itemsError } = await supabaseAdmin
            .from("work_order_items")
            .select(
                "item_id, description, qty_planned, qty_done, quantity, uom, tech_note"
            )
            .eq("company_id", workOrderCompanyId)
            .eq("work_order_id", workOrderId)
            .order("created_at", { ascending: true });

        if (itemsError) {
            console.error("work report pdf items error:", itemsError);
            return new NextResponse("Error consultando servicios", { status: 500 });
        }

        const { data: photos, error: photosError } = await supabaseAdmin
            .from("work_order_photos")
            .select("photo_id, category, file_url, created_at")
            .eq("company_id", workOrderCompanyId)
            .eq("work_order_id", workOrderId)
            .order("created_at", { ascending: true });

        if (photosError) {
            console.error("work report pdf photos error:", photosError);
            return new NextResponse("Error consultando fotos", { status: 500 });
        }

        let technician: { full_name?: string | null } | null = null;

        if (workOrder.assigned_to) {
            const { data: technicianProfile, error: technicianError } =
                await supabaseAdmin
                    .from("profiles")
                    .select("full_name")
                    .eq("user_id", workOrder.assigned_to)
                    .maybeSingle();

            if (technicianError) {
                console.error("work report pdf technician profile error:", technicianError);
            } else {
                technician = technicianProfile;
            }
        }

        const html = renderWorkReportHtml({
            company,
            workOrder,
            report,
            items: items ?? [],
            photos: photos ?? [],
            technician,
        });

        const isLocalDev = process.env.NODE_ENV !== "production";

        browser = await playwright.launch(
            isLocalDev
                ? {
                    channel: "chrome",
                    headless: true,
                }
                : {
                    args: chromium.args,
                    executablePath: await chromium.executablePath(),
                    headless: true,
                }
        );

        const page = await browser.newPage({
            viewport: {
                width: 816,
                height: 1056,
            },
        });

        await page.setContent(html, {
            waitUntil: "networkidle",
            timeout: 20000,
        });

        const pdfBuffer = await page.pdf({
            format: "Letter",
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: "0",
                right: "0",
                bottom: "0",
                left: "0",
            },
        });

        const pdfFileName = buildWorkReportPdfFileName({
            workOrderNumber: workOrder.work_order_number,
            customerName: workOrder.customer_name,
        });

        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${pdfFileName}"; filename*=UTF-8''${encodeURIComponent(pdfFileName)}`,
                "Cache-Control": "no-store, private",
            },
        });
    } catch (err) {
        console.error("work report pdf route error:", err);
        return new NextResponse("Error generando PDF", { status: 500 });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}