// lib/invoices.ts
import { supabase } from "./supabaseClient";

// Fallbacks (si no hay tax_profile default o no se puede leer por RLS)
const FALLBACK_TAX_RATE_CA = 0.13; // Canadá (ON HST)
const FALLBACK_TAX_RATE_CO = 0.19; // Colombia (IVA)

// Genera invoice_number con timestamp + random para evitar choques
function makeInvoiceNumber() {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14); // YYYYMMDDHHMMSS
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase(); // 4 chars
  return `INV-${ts}-${rnd}`;
}

export async function getDefaultTaxRate(companyId: string): Promise<number> {
  // Fuente oficial: public.companies.tax_rate_default
  const { data, error } = await supabase
    .from("companies")
    .select("tax_rate_default")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.log("⚠️ No pude leer companies.tax_rate_default (RLS?):", error.message);
    // fallback CA
    return FALLBACK_TAX_RATE_CA;
  }

  const rate = Number((data as any)?.tax_rate_default ?? FALLBACK_TAX_RATE_CA);
  if (Number.isFinite(rate) && rate >= 0 && rate <= 1) return rate;

  return FALLBACK_TAX_RATE_CA;
}

/**
 * createInvoiceFromWorkOrder
 *
 * Comportamiento:
 * - Si la WO ya tiene invoice_id -> reutiliza esa invoice (NO duplica).
 * - Si no tiene, busca invoice existente por (company_id, work_order_id).
 * - Si no existe, crea invoice. Si hay UNIQUE(company_id, work_order_id) y choca por 23505, re-lee la existente.
 * - Luego hace "sync" de items WO -> invoice_items (solo priced), borrando solo los items synced_from_wo previos.
 * - Finalmente marca WO.invoice_id + WO.invoiced_at (link bidireccional).
 */
export async function createInvoiceFromWorkOrder(workOrderId: string) {
  if (!workOrderId) throw new Error("workOrderId requerido");

  const withExtraTag = (it: any) => {
    const base = (it?.description ?? "").trim() || "Item";
    const isExtra = it?.qty_planned === null || it?.qty_planned === undefined;
    return isExtra ? `${base} (Extra)` : base;
  };


  // 1) Leer WO (incluye invoice_id para guard)
  const { data: wo, error: woErr } = await supabase
    .from("work_orders")
    .select("work_order_id, company_id, job_type, customer_name, customer_phone, customer_email, service_address, invoice_id, invoiced_at")
    .eq("work_order_id", workOrderId)
    .single();

  if (woErr) throw woErr;
  if (!wo) throw new Error("Work order no encontrada");
  if (!wo.company_id) throw new Error("WO sin company_id");

  // 1.0) Guard principal: si la WO ya está linkeada, reutilizamos
  let invoiceId: string | null = (wo as any)?.invoice_id ?? null;

  // 1.1) Leer company settings (moneda)
  const { data: cs, error: csErr } = await supabase
    .from("company_settings")
    .select("currency_code, payment_terms_days")
    .eq("company_id", wo.company_id)
    .maybeSingle();

  if (csErr) throw csErr;

  const currencyCode =
    (cs as any)?.currency_code && String((cs as any).currency_code).trim()
      ? String((cs as any).currency_code).trim().toUpperCase()
      : "CAD";

  const paymentTerms = Number((cs as any)?.payment_terms_days ?? 14);

  const invoiceDate = new Date();

  const dueDate = new Date(
    invoiceDate.getTime() + paymentTerms * 24 * 60 * 60 * 1000
  );

  // 1.2) Si WO no tiene invoice_id, buscamos invoice existente por (company_id, work_order_id)
  if (!invoiceId) {


    const { data: existing, error: exErr } = await supabase
      .from("invoices")
      .select("invoice_id")
      .eq("company_id", wo.company_id)
      .eq("work_order_id", wo.work_order_id)
      .limit(1);

    if (exErr) throw exErr;

    if (existing && existing.length > 0 && existing[0]?.invoice_id) {
      invoiceId = existing[0].invoice_id as string;
    }
  }

  // 1.3) Leer tax rate default (sin INSERT)
  const defaultTaxRate = await getDefaultTaxRate(wo.company_id);
  console.log("🧾 defaultTaxRate resolved:", defaultTaxRate);

  // 2) Crear invoice (solo si no existe)
  if (!invoiceId) {
    const invoiceNumber = makeInvoiceNumber();

    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .insert({
        company_id: wo.company_id,
        work_order_id: wo.work_order_id,
        invoice_number: invoiceNumber,
        currency_code: currencyCode,

        customer_name:
          ((wo as any).customer_name && String((wo as any).customer_name).trim()) ||
          ((wo as any).job_type && String((wo as any).job_type).trim()) ||
          "Cliente",

        customer_phone:
          ((wo as any).customer_phone && String((wo as any).customer_phone).trim()) || null,

        customer_email:
          ((wo as any).customer_email && String((wo as any).customer_email).trim()) || null,

        billing_address:
          ((wo as any).service_address && String((wo as any).service_address).trim()) || null,

        invoice_date: invoiceDate.toISOString().slice(0, 10),

        due_date: dueDate.toISOString().slice(0, 10),

        status: "draft",
      })
      .select("invoice_id")
      .single();

    if (invErr) {
      // ✅ Si hay UNIQUE(company_id, work_order_id), esto puede pasar por doble click
      const code = (invErr as any)?.code;
      if (code === "23505") {
        const { data: ex2, error: ex2Err } = await supabase
          .from("invoices")
          .select("invoice_id")
          .eq("company_id", wo.company_id)
          .eq("work_order_id", wo.work_order_id)
          .limit(1);

        if (ex2Err) throw ex2Err;
        if (!ex2?.[0]?.invoice_id) throw invErr;

        invoiceId = ex2[0].invoice_id as string;
      } else {
        throw invErr;
      }
    } else {
      if (!inv?.invoice_id) throw new Error("No se pudo crear invoice_id");
      invoiceId = inv.invoice_id as string;
    }
  }

  if (!invoiceId) throw new Error("invoiceId no resuelto (estado inválido)");

  // 3) Leer items de la WO
  const { data: items, error: itemsErr } = await supabase
    .from("work_order_items")
    .select("description, quantity, qty_planned, qty_done, unit_price, taxable, pending_pricing, pricing_status")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: true });

  if (itemsErr) throw itemsErr;

  // 4) Copiar items → invoice_items (solo priced)
  if (items && items.length > 0) {
    // ✅ Sync seguro: solo borrar lo que fue copiado desde WO (no toca manual/extras/tech)
    const { error: delErr } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", invoiceId)
      .eq("synced_from_wo", true);

    if (delErr) throw delErr;

    const payload = items
      // 1) No facturar pendientes de precio
      .filter((it: any) => {
        const isPending = it?.pending_pricing === true || it?.pricing_status === "pending_pricing";
        return !isPending; // solo facturar priced
      })
      // 2) Mapear con qty_to_invoice
      .map((it: any) => {
        const taxable = it?.taxable ?? true;
        const qtyToInvoice = it?.qty_done ?? it?.qty_planned ?? it?.quantity ?? 1;

        return {
          company_id: wo.company_id,
          invoice_id: invoiceId,
          description: withExtraTag(it),
          qty: qtyToInvoice,
          unit_price: it?.unit_price ?? 0,
          tax_rate: taxable ? defaultTaxRate : 0,
          synced_from_wo: true,
        };
      });

    console.log("🧾 Copy items payload (tax_rate check):", payload);

    // Si no hay priced items (todo estaba pending), no insertamos nada (pero la invoice puede existir)
    if (payload.length > 0) {
      const { error: copyErr } = await supabase.from("invoice_items").insert(payload);
      if (copyErr) throw copyErr;
    }
  }

  // 5) Marcar la WO como facturada (link bidireccional)
  const { error: markErr } = await supabase
    .from("work_orders")
    .update({
      invoice_id: invoiceId,
      invoiced_at: new Date().toISOString(),
    })
    .eq("work_order_id", workOrderId);

  if (markErr) throw markErr;

  return invoiceId as string;
}
type InvoiceHtmlItem = {
  invoice_item_id?: string;
  description?: string | null;
  qty?: number | null;
  unit_price?: number | null;
  tax_rate?: number | null;
  line_subtotal?: number | null;
  line_tax?: number | null;
  line_total?: number | null;
  created_at?: string | null;
};

type InvoiceHtmlData = {
  invoice?: {
    invoice_id?: string;
    company_id?: string;
    work_order_id?: string | null;
    invoice_number?: string | null;
    status?: string | null;
    currency_code?: string | null;
    issue_date?: string | null;
    due_date?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    customer_email?: string | null;
    billing_address?: string | null;
    tax_profile_id?: string | null;
    tax_name?: string | null;
    tax_rate?: number | null;
    subtotal?: number | null;
    tax_total?: number | null;
    total?: number | null;
    balance_due?: number | null;
    notes?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  company?: {
    company_id?: string;
    company_name?: string | null;
    legal_name?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    tax_registration?: string | null;
    logo_url?: string | null;
    invoice_footer?: string | null;
  };
  items?: InvoiceHtmlItem[];
};

function moneyHtml(value: number | null | undefined, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

function percentHtml(value: number | null | undefined) {
  return `${(Number(value ?? 0) * 100).toFixed(2)}%`;
}

function escHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function joinCompanyAddress(company?: InvoiceHtmlData["company"]) {
  const line3 = [company?.city, company?.province].filter(Boolean).join(", ");
  const line4 = [company?.postal_code, company?.country].filter(Boolean).join(" ");

  return [
    company?.address_line1,
    company?.address_line2,
    line3 || null,
    line4 || null,
  ]
    .filter(Boolean)
    .join("<br/>");
}

export function renderInvoiceHtml(data: InvoiceHtmlData): string {
  const invoice = data.invoice ?? {};
  const company = data.company ?? {};
  const items = data.items ?? [];
  const currency = invoice.currency_code || "CAD";

  const companyDisplayName = company.legal_name || company.company_name || "Company";
  const companyAddress = joinCompanyAddress(company);

  const rows = items.length
    ? items
      .map((item) => {
        return `
            <tr>
              <td class="desc">${escHtml(item.description || "")}</td>
              <td class="num">${Number(item.qty ?? 0)}</td>
              <td class="num">${moneyHtml(item.unit_price, currency)}</td>
              <td class="num">${percentHtml(item.tax_rate)}</td>
              <td class="num">${moneyHtml(item.line_total, currency)}</td>
            </tr>
          `;
      })
      .join("")
    : `
      <tr>
        <td colspan="5" class="empty">No invoice items</td>
      </tr>
    `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${escHtml(invoice.invoice_number || "")}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2937;
      margin: 0;
      padding: 32px;
      background: #ffffff;
      font-size: 14px;
      line-height: 1.45;
    }
    .page {
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      margin-bottom: 32px;
    }
    .logo {
      max-width: 160px;
      max-height: 80px;
      object-fit: contain;
      margin-bottom: 12px;
    }
    .company h1 {
      margin: 0 0 8px;
      font-size: 26px;
      color: #111827;
    }
    .invoice-box {
      min-width: 260px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 16px;
      background: #f9fafb;
    }
    .invoice-box h2 {
      margin: 0 0 12px;
      font-size: 24px;
      color: #111827;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }
    .meta-label {
      color: #6b7280;
      font-weight: 600;
    }
    .section-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }
    .card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 16px;
      background: #ffffff;
    }
    .card h3 {
      margin: 0 0 12px;
      font-size: 14px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #6b7280;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    thead th {
      text-align: left;
      background: #f3f4f6;
      color: #374151;
      font-size: 13px;
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tbody td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .desc { width: 42%; }
    .num { text-align: right; white-space: nowrap; }
    .empty {
      text-align: center;
      color: #6b7280;
      padding: 20px;
    }
    .totals {
      margin-left: auto;
      width: 320px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
    }
    .totals-row:last-child {
      border-bottom: 0;
    }
    .totals-row.total {
      background: #f3f4f6;
      font-size: 16px;
      font-weight: 700;
      color: #111827;
    }
    .notes, .footer {
      margin-top: 24px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 16px;
    }
    .muted {
      color: #6b7280;
    }
    .status {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      background: #e5e7eb;
      color: #374151;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="company">
        ${company.logo_url
      ? `<img class="logo" src="${escHtml(company.logo_url)}" alt="Company logo" />`
      : ""
    }
        <h1>${escHtml(companyDisplayName)}</h1>
        <div>${companyAddress || '<span class="muted">No company address</span>'}</div>
        <div>${escHtml(company.phone || "")}</div>
        <div>${escHtml(company.email || "")}</div>
        <div>${escHtml(company.website || "")}</div>
        ${company.tax_registration
      ? `<div><strong>Tax Registration:</strong> ${escHtml(company.tax_registration)}</div>`
      : ""
    }
      </div>

      <div class="invoice-box">
        <h2>Invoice</h2>
        <div class="meta-row">
          <span class="meta-label">Number</span>
          <span>${escHtml(invoice.invoice_number || "-")}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Status</span>
          <span class="status">${escHtml(invoice.status || "draft")}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Issue Date</span>
          <span>${escHtml(invoice.issue_date || "-")}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Due Date</span>
          <span>${escHtml(invoice.due_date || "-")}</span>
        </div>
      </div>
    </div>

    <div class="section-grid">
      <div class="card">
        <h3>Bill To</h3>
        <div><strong>${escHtml(invoice.customer_name || "-")}</strong></div>
        <div>${escHtml(invoice.customer_email || "")}</div>
        <div>${escHtml(invoice.customer_phone || "")}</div>
        <div>${escHtml(invoice.billing_address || "")}</div>
      </div>

      <div class="card">
        <h3>Tax Summary</h3>
        <div><strong>Tax Name:</strong> ${escHtml(invoice.tax_name || "Line-based tax")}</div>
        <div><strong>Invoice Tax Rate:</strong> ${percentHtml(invoice.tax_rate)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="num">Qty</th>
          <th class="num">Unit Price</th>
          <th class="num">Tax</th>
          <th class="num">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${moneyHtml(invoice.subtotal, currency)}</span>
      </div>
      <div class="totals-row">
        <span>Tax</span>
        <span>${moneyHtml(invoice.tax_total, currency)}</span>
      </div>
      <div class="totals-row total">
        <span>Total</span>
        <span>${moneyHtml(invoice.total, currency)}</span>
      </div>
      <div class="totals-row">
        <span>Balance Due</span>
        <span>${moneyHtml(invoice.balance_due, currency)}</span>
      </div>
    </div>

    ${invoice.notes
      ? `
      <div class="notes">
        <strong>Notes</strong>
        <div style="margin-top:8px;">${escHtml(invoice.notes).replaceAll("\n", "<br/>")}</div>
      </div>
    `
      : ""
    }

    ${company.invoice_footer
      ? `
      <div class="footer">
        <div>${escHtml(company.invoice_footer).replaceAll("\n", "<br/>")}</div>
      </div>
    `
      : ""
    }
  </div>
</body>
</html>
`;
}