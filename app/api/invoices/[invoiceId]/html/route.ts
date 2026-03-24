import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { renderInvoiceHtml } from "../../../../../lib/invoices";

export async function GET(
  req: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await context.params;

    if (!invoiceId) {
      return new NextResponse("invoiceId requerido", { status: 400 });
    }

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "pdf";
    const showActions = mode === "preview";
    const origin = url.origin;
    const fromWorkOrder = url.searchParams.get("fromWorkOrder");

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

    console.log("=== get_invoice_full data ===");
    console.dir(data, { depth: null });

    console.log("=== invoice_work_orders ===");
    console.dir(data?.invoice_work_orders, { depth: null });

    console.log("=== items ===");
    console.dir(data?.items, { depth: null });

    const baseHtml = renderInvoiceHtml(data);

    const actionBarHtml = `
  <div class="mr-topbar no-print">
    <div class="mr-topbar-left">
      <strong>Invoice Preview</strong>
    </div>
    <div class="mr-topbar-actions">
      <button type="button" id="mr-send-btn" onclick="sendInvoice()">Send Invoice</button>

      <a href="${origin}/api/invoices/${invoiceId}/pdf" target="_blank" rel="noopener">
        <button type="button">Download PDF</button>
      </a>

      <a href="${origin}/invoices/${invoiceId}${fromWorkOrder ? `?fromWorkOrder=${encodeURIComponent(fromWorkOrder)}` : ""}">
        <button type="button">Back to Invoice</button>
      </a>

      ${fromWorkOrder
        ? `
      <a href="${origin}/work-orders/${encodeURIComponent(fromWorkOrder)}">
        <button type="button">Back to Work Order</button>
      </a>
      `
        : ""
      }
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

        .mr-topbar-actions a {
          text-decoration: none;
        }

        .mr-topbar-actions button {
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #111827;
          padding: 10px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
        }

        .mr-topbar-actions button:hover {
          background: #f9fafb;
        }

        .mr-topbar-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .mr-toast {
          position: fixed;
          top: 72px;
          right: 20px;
          z-index: 1100;
          background: #111827;
          color: #ffffff;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 14px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          max-width: 320px;
        }

        .mr-toast.error {
          background: #991b1b;
        }

        @media print {
          .no-print {
            display: none !important;
          }
        }
      </style>
    `;

    const injectedScript = `
      <script>
        function mrShowToast(message, isError) {
          const existing = document.getElementById("mr-toast");
          if (existing) existing.remove();

          const toast = document.createElement("div");
          toast.id = "mr-toast";
          toast.className = "mr-toast" + (isError ? " error" : "");
          toast.textContent = message;
          document.body.appendChild(toast);

          setTimeout(() => {
            toast.remove();
          }, 3500);
        }

        async function sendInvoice() {
          const sendBtn = document.getElementById("mr-send-btn");
          if (!sendBtn) return;

          const originalText = sendBtn.textContent;
          sendBtn.disabled = true;
          sendBtn.textContent = "Sending...";

          try {
            const res = await fetch("${origin}/api/invoices/${invoiceId}/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              credentials: "include"
            });

            let payload = null;
            try {
              payload = await res.json();
            } catch (_) {}

            if (!res.ok) {
              throw new Error(payload?.error || "Failed to send invoice");
            }

            mrShowToast("Invoice sent successfully", false);
          } catch (err) {
            const message = err instanceof Error ? err.message : "Error sending invoice";
            mrShowToast(message, true);
          } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = originalText;
          }
        }
      </script>
    `;

    let finalHtml = baseHtml;

    if (showActions) {
      const hasHtmlTag = /<html[\\s>]/i.test(baseHtml);
      const hasHeadTag = /<head[\\s>]/i.test(baseHtml);
      const hasBodyTag = /<body[\\s>]/i.test(baseHtml);

      if (hasHtmlTag) {
        finalHtml = baseHtml;

        if (hasHeadTag) {
          finalHtml = finalHtml.replace(/<\/head>/i, `${injectedStyles}</head>`);
        } else {
          finalHtml = finalHtml.replace(/<html[^>]*>/i, (match) => {
            return `${match}<head>${injectedStyles}</head>`;
          });
        }

        if (hasBodyTag) {
          finalHtml = finalHtml.replace(/<body([^>]*)>/i, `<body$1>${actionBarHtml}`);
        } else {
          finalHtml = finalHtml.replace(/<\/html>/i, `<body>${actionBarHtml}${injectedScript}</body></html>`);
        }

        if (/<\/body>/i.test(finalHtml)) {
          finalHtml = finalHtml.replace(/<\/body>/i, `${injectedScript}</body>`);
        }
      } else {
        finalHtml = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              ${injectedStyles}
            </head>
            <body>
              ${actionBarHtml}
              ${baseHtml}
              ${injectedScript}
            </body>
          </html>
        `;
      }
    }

    return new NextResponse(finalHtml, {
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