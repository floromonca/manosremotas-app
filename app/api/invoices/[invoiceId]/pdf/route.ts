import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";
import { createServerSupabase } from "../../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { renderInvoiceHtml } from "../../../../../lib/invoices";
import { canManageInvoices } from "../../../../../lib/security/roles";

export const runtime = "nodejs";

type MembershipRow = {
    company_id: string;
    role: string;
};

export async function GET(
    _req: Request,
    context: { params: Promise<{ invoiceId: string }> }
) {
    let browser: any = null;

    try {
        const { invoiceId } = await context.params;

        if (!invoiceId) {
            return new NextResponse("invoiceId requerido", { status: 400 });
        }

        const supabase = await createServerSupabase();

        const {
            data: { user },
            error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) {
            return new NextResponse("No autorizado", { status: 401 });
        }

        const { data: memberships, error: membershipsErr } = await supabase
            .from("company_members")
            .select("company_id, role")
            .eq("user_id", user.id);

        if (membershipsErr) {
            console.error("company_members error:", membershipsErr);
            return new NextResponse("Error validando acceso", { status: 500 });
        }

        const membershipList = (memberships ?? []) as MembershipRow[];

        if (membershipList.length === 0) {
            return new NextResponse("Usuario sin empresa vinculada", { status: 403 });
        }

        const { data, error } = await supabaseAdmin.rpc("get_invoice_full", {
            p_invoice_id: invoiceId,
        });

        if (error) {
            console.error("get_invoice_full error:", error);
            return new NextResponse("Error consultando invoice", { status: 500 });
        }

        if (!data?.invoice) {
            return new NextResponse("Invoice no encontrada", { status: 404 });
        }

        const invoiceCompanyId = (data as any)?.invoice?.company_id ?? null;
        const currentMembership = membershipList.find(
            (m) => m.company_id === invoiceCompanyId
        );

        if (!invoiceCompanyId || !currentMembership || !canManageInvoices(currentMembership.role)) {
            return new NextResponse("Acceso denegado a esta factura", { status: 403 });
        }

        const { data: settings, error: settingsError } = await supabaseAdmin
            .from("company_settings")
            .select("show_customer_email_on_invoice, show_customer_phone_on_invoice, payment_instructions, invoice_footer_note")
            .eq("company_id", invoiceCompanyId)
            .maybeSingle();

        if (settingsError) {
            console.error("company_settings error:", settingsError);
            return new NextResponse("Error consultando preferencias de invoice", { status: 500 });
        }

        const renderData = {
            ...(data as any),
            company: {
                ...((data as any).company ?? {}),
                payment_instructions: settings?.payment_instructions ?? null,
                invoice_footer:
                    settings?.invoice_footer_note ??
                    (data as any).company?.invoice_footer ??
                    null,
            },
        };

        const html = renderInvoiceHtml(renderData, {
            showCustomerEmail: settings?.show_customer_email_on_invoice ?? true,
            showCustomerPhone: settings?.show_customer_phone_on_invoice ?? true,
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


        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: "networkidle",
            timeout: 20000,
        });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "10mm",
                right: "10mm",
                bottom: "10mm",
                left: "10mm",
            },
        });

        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="invoice-${invoiceId}.pdf"`,
                "Cache-Control": "no-store, private",
            },
        });
    } catch (err) {
        console.error("invoice pdf route error:", err);
        return new NextResponse("Error generando PDF", { status: 500 });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
