import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { renderInvoiceHtml } from "../../../../../lib/invoices";

export async function GET(
    _req: Request,
    context: { params: Promise<{ invoiceId: string }> }
) {
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

        return new NextResponse(html, {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
            },
        });
    } catch (err) {
        console.error("invoice html route error:", err);
        return new NextResponse("Error interno", { status: 500 });
    }
}