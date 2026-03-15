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

  // 1.1) Leer defaults desde companies
  const { data: companyRow, error: companyErr } = await supabase
    .from("companies")
    .select("currency_code, payment_terms_days")
    .eq("company_id", wo.company_id)
    .maybeSingle();

  if (companyErr) throw companyErr;

  const currencyCode =
    (companyRow as any)?.currency_code &&
      String((companyRow as any).currency_code).trim()
      ? String((companyRow as any).currency_code).trim().toUpperCase()
      : "CAD";

  const paymentTermsRaw = Number((companyRow as any)?.payment_terms_days ?? 30);
  const paymentTerms =
    Number.isInteger(paymentTermsRaw) && paymentTermsRaw >= 0
      ? paymentTermsRaw
      : 30;

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
    const { error: delErr } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", invoiceId)
      .eq("synced_from_wo", true);

    if (delErr) throw delErr;

    const payload = items
      .filter((it: any) => {
        const isPending =
          it?.pending_pricing === true || it?.pricing_status === "pending_pricing";
        return !isPending;
      })
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

type InvoiceHtmlPayment = {
  payment_id?: string;
  amount?: number | null;
  payment_method?: string | null;
  payment_date?: string | null;
  notes?: string | null;
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
    invoice_date?: string | null;
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
    deposit_required?: number | null;
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
  payments?: InvoiceHtmlPayment[];
};

function moneyHtml(value: number | null | undefined, currency = "CAD") {
  return new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "COP" ? 0 : 2,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
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
  const cityProvince = [company?.city, company?.province].filter(Boolean).join(", ");
  const postalCountry = [company?.postal_code, company?.country].filter(Boolean).join(" ");

  return [
    company?.address_line1,
    company?.address_line2,
    cityProvince || null,
    postalCountry || null,
  ]
    .filter(Boolean)
    .join("<br/>");
}

function dateHtml(value: string | null | undefined) {
  if (!value) return "—";
  return escHtml(value);
}

function statusMeta(status: string | null | undefined) {
  const s = String(status ?? "").trim().toLowerCase();

  if (s === "draft") {
    return {
      label: "DRAFT",
      bg: "#eef2f7",
      color: "#475467",
      border: "#d0d5dd",
    };
  }

  if (s === "sent") {
    return {
      label: "SENT",
      bg: "#e8f1ff",
      color: "#175cd3",
      border: "#bfd4ff",
    };
  }

  if (s === "partially_paid") {
    return {
      label: "PARTIALLY PAID",
      bg: "#fff4e5",
      color: "#b54708",
      border: "#f7d6a8",
    };
  }

  if (s === "paid") {
    return {
      label: "PAID",
      bg: "#e7f8ec",
      color: "#067647",
      border: "#b7e4c7",
    };
  }

  if (s === "overdue") {
    return {
      label: "OVERDUE",
      bg: "#feeceb",
      color: "#d92d20",
      border: "#f5c2c7",
    };
  }

  return {
    label: String(status ?? "—").toUpperCase(),
    bg: "#f2f4f7",
    color: "#344054",
    border: "#d0d5dd",
  };
}

export function renderInvoiceHtml(data: InvoiceHtmlData): string {
  const invoice = data.invoice ?? {};
  const company = data.company ?? {};
  const items = data.items ?? [];
  const payments = data.payments ?? [];
  const currency = invoice.currency_code || "CAD";

  const companyDisplayName = company.legal_name || company.company_name || "Company";
  const companyAddress = joinCompanyAddress(company);
  const invoiceDate = invoice.invoice_date || invoice.issue_date || null;

  const status = statusMeta(invoice.status);

  const subtotal = Number(invoice.subtotal ?? 0);
  const taxTotal = Number(invoice.tax_total ?? 0);
  const total = Number(invoice.total ?? 0);
  const balanceDue = Number(invoice.balance_due ?? total);
  const depositRequired = Number(invoice.deposit_required ?? 0);

  const paymentsReceived =
    payments.length > 0
      ? payments.reduce((acc, p) => acc + Number(p.amount ?? 0), 0)
      : Math.max(0, total - balanceDue);

  const rows = items.length
    ? items
      .map((item, index) => {
        return `
            <tr>
              <td class="col-index">${index + 1}</td>
              <td class="desc">${escHtml(item.description || "")}</td>
              <td class="num">${Number(item.qty ?? 0)}</td>
              <td class="num">${moneyHtml(item.unit_price, currency)}</td>
              <td class="num">${percentHtml(item.tax_rate)}</td>
              <td class="num strong">${moneyHtml(item.line_total, currency)}</td>
            </tr>
          `;
      })
      .join("")
    : `
      <tr>
        <td colspan="6" class="empty">No invoice items</td>
      </tr>
    `;

  const paymentRows = payments.length
    ? payments
      .map((payment) => {
        return `
            <tr>
              <td>${dateHtml(payment.payment_date)}</td>
              <td>${escHtml(payment.payment_method || "Payment")}</td>
              <td>${escHtml(payment.notes || "")}</td>
              <td class="num">${moneyHtml(payment.amount, currency)}</td>
            </tr>
          `;
      })
      .join("")
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${escHtml(invoice.invoice_number || "")}</title>
  <style>
    :root {
      --text: #101828;
      --muted: #667085;
      --line: #e4e7ec;
      --soft: #f8fafc;
      --soft-2: #f2f4f7;
      --heading: #0f172a;
      --accent: #111827;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: var(--text);
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.45;
      font-size: 13.5px;
    }

    body {
      padding: 28px;
    }

    .page {
      max-width: 960px;
      margin: 0 auto;
    }

    .topbar {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 28px;
      align-items: start;
      margin-bottom: 28px;
    }

    .brand-wrap {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .logo {
      max-width: 190px;
      max-height: 88px;
      object-fit: contain;
      display: block;
    }

    .brand-name {
      font-size: 24px;
      font-weight: 800;
      color: var(--heading);
      margin: 0;
      letter-spacing: -0.02em;
    }

    .brand-meta {
      color: var(--muted);
      font-size: 13px;
    }

    .brand-meta div {
      margin-top: 2px;
    }

    .invoice-panel {
      border: 1px solid var(--line);
      border-radius: 16px;
      background: linear-gradient(180deg, #fcfcfd 0%, #f9fafb 100%);
      padding: 20px 20px 16px;
    }

    .invoice-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 12px;
      margin-bottom: 14px;
    }

    .invoice-title {
      margin: 0;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--heading);
    }

    .status-pill {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      background: ${status.bg};
      color: ${status.color};
      border: 1px solid ${status.border};
      white-space: nowrap;
    }

    .invoice-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 18px;
    }

    .meta-item {
      display: grid;
      gap: 2px;
    }

    .meta-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      font-weight: 700;
    }

    .meta-value {
      color: var(--text);
      font-weight: 700;
      word-break: break-word;
    }

    .section-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 0.9fr;
      gap: 18px;
      margin-bottom: 24px;
    }

    .card {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 16px;
      background: #ffffff;
      min-height: 148px;
    }

    .card h3 {
      margin: 0 0 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      font-weight: 800;
    }

    .card strong {
      color: var(--heading);
    }

    .block-line {
      margin-top: 4px;
    }

    .muted {
      color: var(--muted);
    }

    .items-card,
    .payments-section,
    .notes,
    .footer-box {
      border: 1px solid var(--line);
      border-radius: 14px;
      background: #ffffff;
      overflow: hidden;
    }

    .items-header,
    .payments-header,
    .notes-header,
    .footer-header {
      padding: 14px 18px;
      border-bottom: 1px solid var(--line);
      background: #fcfcfd;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      font-weight: 800;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead th {
      text-align: left;
      background: var(--soft-2);
      color: #475467;
      font-size: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      font-weight: 800;
    }

    tbody td {
      padding: 13px 14px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
      color: var(--text);
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }

    .col-index {
      width: 44px;
      text-align: center;
      color: var(--muted);
    }

    .desc {
      width: 42%;
    }

    .num {
      text-align: right;
      white-space: nowrap;
    }

    .strong {
      font-weight: 800;
      color: var(--heading);
    }

    .empty {
      text-align: center;
      color: var(--muted);
      padding: 24px;
    }

    .summary-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 18px;
      margin-bottom: 24px;
    }

    .totals {
      width: 380px;
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
      background: #ffffff;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--line);
    }

    .totals-row:last-child {
      border-bottom: 0;
    }

    .totals-row .label {
      color: #344054;
      font-weight: 600;
    }

    .totals-row .value {
      font-weight: 700;
      color: var(--heading);
      white-space: nowrap;
    }

    .totals-row.total {
      background: #f9fafb;
    }

    .totals-row.total .label,
    .totals-row.total .value {
      font-size: 16px;
      font-weight: 800;
    }

    .totals-row.balance {
      background: #eef4ff;
    }

    .totals-row.balance .label,
    .totals-row.balance .value {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
    }

    .payments-body,
    .notes-body,
    .footer-body {
      padding: 16px 18px;
    }

    .small-table thead th,
    .small-table tbody td {
      padding: 10px 12px;
      font-size: 12px;
    }

    .note-text,
    .footer-text {
      color: #344054;
      line-height: 1.6;
      white-space: normal;
    }

    .footer-stack {
      display: grid;
      gap: 8px;
    }

    .thank-you {
      margin-top: 8px;
      font-weight: 700;
      color: var(--heading);
    }

    .page-break-avoid {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    @page {
      size: auto;
      margin: 18mm;
    }

    @media print {
      body {
        padding: 0;
      }

      .page {
        max-width: none;
      }

      .topbar,
      .section-grid,
      .summary-wrap,
      .payments-section,
      .notes,
      .footer-box,
      .items-card {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }

    @media (max-width: 900px) {
      .topbar,
      .section-grid {
        grid-template-columns: 1fr;
      }

      .summary-wrap {
        justify-content: stretch;
      }

      .totals {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="topbar page-break-avoid">
      <div class="brand-wrap">
        ${company.logo_url
      ? `<img class="logo" src="${escHtml(company.logo_url)}" alt="Company logo" />`
      : ""
    }
        <h1 class="brand-name">${escHtml(companyDisplayName)}</h1>
        <div class="brand-meta">
          ${companyAddress ? `<div>${companyAddress}</div>` : `<div class="muted">No company address</div>`}
          ${company.phone ? `<div>${escHtml(company.phone)}</div>` : ""}
          ${company.email ? `<div>${escHtml(company.email)}</div>` : ""}
          ${company.website ? `<div>${escHtml(company.website)}</div>` : ""}
          ${company.tax_registration
      ? `<div><strong>Tax Registration:</strong> ${escHtml(company.tax_registration)}</div>`
      : ""
    }
        </div>
      </div>

      <div class="invoice-panel">
        <div class="invoice-panel-header">
          <h2 class="invoice-title">Invoice</h2>
          <span class="status-pill">${escHtml(status.label)}</span>
        </div>

        <div class="invoice-meta-grid">
          <div class="meta-item">
            <div class="meta-label">Invoice Number</div>
            <div class="meta-value">${escHtml(invoice.invoice_number || "—")}</div>
          </div>

          <div class="meta-item">
            <div class="meta-label">Currency</div>
            <div class="meta-value">${escHtml(currency)}</div>
          </div>

          <div class="meta-item">
            <div class="meta-label">Issue Date</div>
            <div class="meta-value">${dateHtml(invoiceDate)}</div>
          </div>

          <div class="meta-item">
            <div class="meta-label">Due Date</div>
            <div class="meta-value">${dateHtml(invoice.due_date)}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section-grid page-break-avoid">
      <div class="card">
        <h3>From</h3>
        <div><strong>${escHtml(companyDisplayName)}</strong></div>
        ${companyAddress ? `<div class="block-line">${companyAddress}</div>` : `<div class="block-line muted">No company address</div>`}
        ${company.email ? `<div class="block-line">${escHtml(company.email)}</div>` : ""}
        ${company.phone ? `<div class="block-line">${escHtml(company.phone)}</div>` : ""}
      </div>

      <div class="card">
        <h3>Bill To</h3>
        <div><strong>${escHtml(invoice.customer_name || "—")}</strong></div>
        ${invoice.customer_email ? `<div class="block-line">${escHtml(invoice.customer_email)}</div>` : ""}
        ${invoice.customer_phone ? `<div class="block-line">${escHtml(invoice.customer_phone)}</div>` : ""}
        ${invoice.billing_address ? `<div class="block-line">${escHtml(invoice.billing_address)}</div>` : ""}
      </div>

      <div class="card">
        <h3>Summary</h3>
        <div class="block-line"><strong>Tax Name:</strong> ${escHtml(invoice.tax_name || "Line-based tax")}</div>
        <div class="block-line"><strong>Invoice Tax Rate:</strong> ${percentHtml(invoice.tax_rate)}</div>
        ${invoice.work_order_id ? `<div class="block-line"><strong>Work Order:</strong> ${escHtml(invoice.work_order_id)}</div>` : ""}
      </div>
    </div>

    <div class="items-card">
      <div class="items-header">Invoice Items</div>
      <table>
        <thead>
          <tr>
            <th class="col-index">#</th>
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
    </div>

    <div class="summary-wrap page-break-avoid">
      <div class="totals">
        <div class="totals-row">
          <span class="label">Subtotal</span>
          <span class="value">${moneyHtml(subtotal, currency)}</span>
        </div>

        <div class="totals-row">
          <span class="label">Tax</span>
          <span class="value">${moneyHtml(taxTotal, currency)}</span>
        </div>

        ${depositRequired > 0
      ? `
        <div class="totals-row">
          <span class="label">Deposit Required</span>
          <span class="value">${moneyHtml(depositRequired, currency)}</span>
        </div>
        `
      : ""
    }

        ${paymentsReceived > 0
      ? `
        <div class="totals-row">
          <span class="label">Payments Received</span>
          <span class="value">${moneyHtml(paymentsReceived, currency)}</span>
        </div>
        `
      : ""
    }

        <div class="totals-row total">
          <span class="label">Total</span>
          <span class="value">${moneyHtml(total, currency)}</span>
        </div>

        <div class="totals-row balance">
          <span class="label">Balance Due</span>
          <span class="value">${moneyHtml(balanceDue, currency)}</span>
        </div>
      </div>
    </div>

    ${payments.length > 0
      ? `
      <div class="payments-section page-break-avoid">
        <div class="payments-header">Payments</div>
        <div class="payments-body" style="padding:0;">
          <table class="small-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th>Notes</th>
                <th class="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${paymentRows}
            </tbody>
          </table>
        </div>
      </div>
    `
      : ""
    }

    ${invoice.notes
      ? `
      <div class="notes page-break-avoid">
        <div class="notes-header">Notes</div>
        <div class="notes-body">
          <div class="note-text">${escHtml(invoice.notes).replaceAll("\n", "<br/>")}</div>
        </div>
      </div>
    `
      : ""
    }

    <div class="footer-box page-break-avoid">
      <div class="footer-header">Additional Information</div>
      <div class="footer-body">
        <div class="footer-stack">
          ${company.invoice_footer
      ? `<div class="footer-text">${escHtml(company.invoice_footer).replaceAll("\n", "<br/>")}</div>`
      : `<div class="footer-text">Thank you for your business.</div>`
    }
          <div class="thank-you">We appreciate the opportunity to serve you.</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;
}