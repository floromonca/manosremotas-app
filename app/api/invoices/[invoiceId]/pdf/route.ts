import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { renderInvoiceHtml } from "../../../../../lib/invoices";

export async function GET(
    _req: Request,
    context: { params: Promise<{ invoiceId: string }> }
) {
    let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

    try {
        const { invoiceId } = await context.params;

        if (!invoiceId) {
            return new NextResponse("invoiceId requerido", { status: 400 });
        }

        const { data, error } = await supabaseAdmin.rpc("get_invoice_full", {
            p_invoice_id: invoiceId,
        });

        if (error) {
            console.error("get_invoice_full error:", error);
            return new NextResponse("Error consultando invoice", { status: 500 });
        }

        if (!data) {
            return new NextResponse("Invoice no encontrada", { status: 404 });
        }

        const html = renderInvoiceHtml(data);

        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: "networkidle" });

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

        const pdfBytes = new Uint8Array(pdfBuffer);

        return new NextResponse(pdfBytes, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="invoice-${invoiceId}.pdf"`,
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