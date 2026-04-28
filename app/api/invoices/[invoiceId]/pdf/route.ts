import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";
import { createServerSupabase } from "../../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { renderInvoiceHtml } from "../../../../../lib/invoices";

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

        const allowedCompanyIds = membershipList.map((m) => m.company_id);

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

        if (!invoiceCompanyId || !allowedCompanyIds.includes(invoiceCompanyId)) {
            return new NextResponse("Acceso denegado a esta factura", { status: 403 });
        }

        const html = renderInvoiceHtml(data);

        // ✅ USAR CHROMIUM SERVERLESS
        browser = await playwright.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        });

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