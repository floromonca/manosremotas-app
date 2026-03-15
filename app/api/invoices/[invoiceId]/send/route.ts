import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

const resend = new Resend(process.env.RESEND_API_KEY);

function escHtml(value: string | null | undefined) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export async function POST(
    _req: Request,
    context: { params: Promise<{ invoiceId: string }> }
) {
    try {
        const { invoiceId } = await context.params;

        if (!invoiceId) {
            return NextResponse.json(
                { ok: false, error: "invoiceId required" },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin.rpc("get_invoice_full", {
            p_invoice_id: invoiceId,
        });

        if (error) {
            console.error("get_invoice_full error:", error);
            return NextResponse.json(
                { ok: false, error: "Invoice lookup failed" },
                { status: 500 }
            );
        }

        if (!data?.invoice) {
            return NextResponse.json(
                { ok: false, error: "Invoice not found" },
                { status: 404 }
            );
        }

        const invoice = data.invoice;
        const company = data.company ?? {};

        const currentStatus = String(invoice.status ?? "").toLowerCase();

        if (!["draft", "sent", "partial", "partially_paid"].includes(currentStatus)) {
            return NextResponse.json(
                { ok: false, error: "This invoice cannot be sent." },
                { status: 400 }
            );
        }

        const customerEmail = String(invoice.customer_email ?? "").trim();
        if (!customerEmail) {
            return NextResponse.json(
                { ok: false, error: "Customer email missing" },
                { status: 400 }
            );
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        if (!appUrl) {
            return NextResponse.json(
                { ok: false, error: "NEXT_PUBLIC_APP_URL missing" },
                { status: 500 }
            );
        }

        const invoiceHtmlUrl = `${appUrl}/api/invoices/${invoiceId}/html?mode=preview`;
        const invoicePdfUrl = `${appUrl}/api/invoices/${invoiceId}/pdf`;

        const companyName =
            company.legal_name ||
            company.company_name ||
            "ManosRemotas";

        const customerName = invoice.customer_name || "Customer";
        const invoiceNumber = invoice.invoice_number || invoiceId;
        const currency = invoice.currency_code || "CAD";
        const invoiceDate = invoice.invoice_date || invoice.issue_date || "-";
        const dueDate = invoice.due_date || "-";

        const total = Number(invoice.total ?? 0);
        const balanceDue = Number(invoice.balance_due ?? total);
        const statusLabel = String(invoice.status ?? "draft")
            .replaceAll("_", " ")
            .toUpperCase();

        const money = (value: number) =>
            new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-CA", {
                style: "currency",
                currency,
                minimumFractionDigits: currency === "COP" ? 0 : 2,
                maximumFractionDigits: currency === "COP" ? 0 : 2,
            }).format(value);

        const emailHtml = `
  <div style="margin:0; padding:24px; background:#f4f7fb; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
    <div style="max-width:680px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
      
      <div style="padding:24px 28px; background:linear-gradient(180deg, #fcfcfd 0%, #f8fafc 100%); border-bottom:1px solid #e5e7eb;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
          <div>
            <div style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#667085; font-weight:700; margin-bottom:8px;">
              ${escHtml(companyName)}
            </div>
            <h1 style="margin:0; font-size:28px; line-height:1.1; color:#111827;">
              Invoice / Factura ${escHtml(invoiceNumber)}
            </h1>
          </div>

          <div style="padding:6px 12px; border-radius:999px; background:#eef2ff; color:#4338ca; font-size:12px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; border:1px solid #c7d2fe; white-space:nowrap;">
            ${escHtml(statusLabel)}
          </div>
        </div>

        <p style="margin:18px 0 0; font-size:15px; line-height:1.6; color:#344054;">
          Hello ${escHtml(customerName)},<br/>
          Please find your invoice details below.
        </p>

        <p style="margin:12px 0 0; font-size:15px; line-height:1.6; color:#344054;">
          Hola ${escHtml(customerName)},<br/>
          A continuación encontrarás los detalles de tu factura.
        </p>
      </div>

      <div style="padding:24px 28px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
          <div style="border:1px solid #e5e7eb; border-radius:12px; padding:16px; background:#ffffff;">
            <div style="font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#667085; font-weight:800; margin-bottom:10px;">
              Invoice Details / Detalles de la Factura
            </div>
            <div style="margin-bottom:6px;"><strong>Invoice Number / Número:</strong> ${escHtml(invoiceNumber)}</div>
            <div style="margin-bottom:6px;"><strong>Issue Date / Fecha de emisión:</strong> ${escHtml(invoiceDate)}</div>
            <div><strong>Due Date / Fecha de vencimiento:</strong> ${escHtml(dueDate)}</div>
          </div>

          <div style="border:1px solid #e5e7eb; border-radius:12px; padding:16px; background:#ffffff;">
            <div style="font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#667085; font-weight:800; margin-bottom:10px;">
              Summary / Resumen
            </div>
            <div style="margin-bottom:6px;"><strong>Company / Empresa:</strong> ${escHtml(companyName)}</div>
            <div style="margin-bottom:6px;"><strong>Total:</strong> ${money(total)}</div>
            <div><strong>Balance Due / Saldo pendiente:</strong> ${money(balanceDue)}</div>
          </div>
        </div>

        <div style="border:1px solid #e5e7eb; border-radius:14px; padding:18px; background:#f9fafb; margin-bottom:22px;">
          <div style="font-size:13px; color:#475467; margin-bottom:12px; line-height:1.6;">
            You can review the invoice online or download the PDF using the buttons below.<br/>
            Puedes revisar la factura en línea o descargar el PDF usando los botones de abajo.
          </div>

          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <a
              href="${invoiceHtmlUrl}"
              style="display:inline-block; padding:12px 18px; background:#2563eb; color:#ffffff; text-decoration:none; border-radius:10px; font-weight:800; font-size:14px;"
            >
              View Invoice / Ver Factura
            </a>

            <a
              href="${invoicePdfUrl}"
              style="display:inline-block; padding:12px 18px; background:#111827; color:#ffffff; text-decoration:none; border-radius:10px; font-weight:800; font-size:14px;"
            >
              Download PDF / Descargar PDF
            </a>
          </div>
        </div>

        <div style="font-size:14px; line-height:1.7; color:#475467;">
          Thank you for your business.<br/>
          Gracias por su confianza.
        </div>

        <div style="margin-top:20px; padding-top:16px; border-top:1px solid #e5e7eb; font-size:13px; color:#667085;">
          <div style="font-weight:700; color:#111827; margin-bottom:4px;">${escHtml(companyName)}</div>
          ${company.email ? `<div>${escHtml(company.email)}</div>` : ""}
          ${company.phone ? `<div>${escHtml(company.phone)}</div>` : ""}
        </div>
      </div>
    </div>
  </div>
`;

        const { error: sendError, data: sendData } = await resend.emails.send({
            from: "ManosRemotas <onboarding@resend.dev>",
            to: [customerEmail],
            subject:
                currentStatus === "draft"
                    ? `Invoice / Factura ${invoiceNumber} – ${money(total)} from ${companyName}`
                    : `Invoice / Factura ${invoiceNumber} (Resent) – ${money(total)} from ${companyName}`,
            html: emailHtml,
        });

        if (sendError) {
            console.error("resend send error:", sendError);
            return NextResponse.json(
                {
                    ok: false,
                    error: sendError.message || "Email send failed",
                },
                { status: 500 }
            );
        }

        const nextStatus = currentStatus === "draft" ? "sent" : invoice.status;

        const { error: updateError } = await supabaseAdmin
            .from("invoices")
            .update({
                status: nextStatus,
                updated_at: new Date().toISOString(),
            })
            .eq("invoice_id", invoiceId);

        if (updateError) {
            console.error("invoice status update error:", updateError);
            return NextResponse.json(
                {
                    ok: false,
                    error: "Email sent but invoice status update failed",
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            message: "Invoice email sent",
            resendId: sendData?.id ?? null,
            status: nextStatus,
        });
    } catch (err) {
        console.error("send invoice route error:", err);
        return NextResponse.json(
            { ok: false, error: "Server error" },
            { status: 500 }
        );
    }
}