import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hasPlanFeature } from "@/lib/features/entitlements";
import type { PlanKey } from "@/lib/features/plans";
import { renderWorkReportHtml } from "@/lib/work-reports";

type MembershipRow = {
    company_id: string;
    role: string;
};

function canManageWorkReports(role: string | null | undefined) {
    return role === "owner" || role === "admin";
}

export async function GET(
    req: Request,
    context: { params: Promise<{ workOrderId: string }> }
) {
    try {
        const { workOrderId } = await context.params;

        if (!workOrderId) {
            return new NextResponse("workOrderId requerido", { status: 400 });
        }

        const url = new URL(req.url);
        const mode = url.searchParams.get("mode") ?? "preview";
        const showActions = mode === "preview";
        const origin = url.origin;

        const supabase = await createServerSupabase();

        const {
            data: { user },
            error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) {
            console.error("work report auth.getUser error:", userErr);
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
            console.error("work report company_members error:", membershipsErr);
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
            console.error("work report work_orders error:", workOrderError);
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
            console.error("work report companies error:", companyError);
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
            console.error("work report record error:", reportError);
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
            console.error("work report items error:", itemsError);
            return new NextResponse("Error consultando servicios", { status: 500 });
        }

        const { data: photos, error: photosError } = await supabaseAdmin
            .from("work_order_photos")
            .select("photo_id, category, file_url, created_at")
            .eq("company_id", workOrderCompanyId)
            .eq("work_order_id", workOrderId)
            .order("created_at", { ascending: true });

        if (photosError) {
            console.error("work report photos error:", photosError);
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
                console.error("work report technician profile error:", technicianError);
            } else {
                technician = technicianProfile;
            }
        }

        const baseHtml = renderWorkReportHtml({
            company,
            workOrder,
            report,
            items: items ?? [],
            photos: photos ?? [],
            technician,
        });

        const backToWorkOrderUrl = `${origin}/work-orders/${encodeURIComponent(workOrderId)}`;

        const actionBarHtml = `
    <div class="mr-topbar no-print">
        <div class="mr-topbar-left">
            <strong>Professional Work Report Preview</strong>
        </div>

        <div class="mr-topbar-actions">
            <button
                type="button"
                class="mr-topbar-button"
                onclick="window.print()"
            >
                Print / Save PDF
            </button>

            <a
                class="mr-topbar-button"
                href="${backToWorkOrderUrl}"
                onclick="event.preventDefault(); event.stopPropagation(); window.location.href='${backToWorkOrderUrl}'; return false;"
            >
                Back to Work Order
            </a>
        </div>
    </div>
`;

        const injectedStyles = `
            <style>
                .mr-topbar {
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                    background: #ffffff;
                    border-bottom: 1px solid #e5e7eb;
                    padding: 12px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    box-sizing: border-box;
                }

                .mr-topbar-left {
                    font-size: 14px;
                    color: #111827;
                }

                .mr-topbar-actions {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .mr-topbar-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    border: 1px solid #d1d5db;
    background: #ffffff;
    color: #111827;
    padding: 0 14px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    text-decoration: none;
    white-space: nowrap;
    font-family: inherit;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    position: relative;
    z-index: 1002;
}

.mr-topbar-button:hover {
    background: #f9fafb;
}

@media (max-width: 640px) {
    .mr-topbar {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        top: auto;
        z-index: 9999;
        align-items: stretch;
        padding: 10px 12px;
        background: #ffffff;
        border-top: 1px solid #e5e7eb;
        border-bottom: none;
        flex-direction: column;
    }

    .mr-topbar-left {
        font-size: 12px;
        line-height: 1.2;
    }

    .mr-topbar-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        width: 100%;
    }

    .mr-topbar-button {
        min-height: 42px;
        padding: 0 10px;
        font-size: 12px;
        width: 100%;
    }

    body {
        padding-bottom: 92px;
    }
}                @media print {
                    .no-print {
                        display: none !important;
                    }
                }
            </style>
        `;

        let finalHtml = baseHtml;

        if (showActions) {
            finalHtml = finalHtml.replace(/<\/head>/i, `${injectedStyles}</head>`);
            finalHtml = finalHtml.replace(/<body([^>]*)>/i, `<body$1>${actionBarHtml}`);
        }

        return new NextResponse(finalHtml, {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store, private",
            },
        });
    } catch (err) {
        console.error("work report html route error:", err);
        return new NextResponse("Error interno", { status: 500 });
    }
}