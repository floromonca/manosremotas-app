// lib/invoices.ts
import { supabase } from "./supabaseClient";

// Fallbacks (si no hay tax_profile default o no se puede leer por RLS)
const FALLBACK_TAX_RATE_CA = 0.13; // Canadá (ON HST)
const FALLBACK_TAX_RATE_CO = 0.19; // Colombia (IVA)

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
    .select(
      "work_order_id, work_order_number, company_id, job_type, customer_name, customer_phone, customer_email, service_address, invoice_id, invoiced_at",
    )
    .eq("work_order_id", workOrderId)
    .single();

  if (woErr) throw woErr;
  if (!wo) throw new Error("Work order no encontrada");
  if (!(wo as any).company_id) throw new Error("WO sin company_id");

  const companyId = String((wo as any).company_id);

  // 1.0) Guard principal: si la WO ya está linkeada, reutilizamos
  let invoiceId: string | null = (wo as any)?.invoice_id ?? null;

  // 1.1) Leer defaults desde companies
  const { data: companyRow, error: companyErr } = await supabase
    .from("companies")
    .select("currency_code, payment_terms_days")
    .eq("company_id", companyId)
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
    invoiceDate.getTime() + paymentTerms * 24 * 60 * 60 * 1000,
  );

  // 1.2) Si WO no tiene invoice_id, buscamos invoice existente por (company_id, work_order_id)
  if (!invoiceId) {
    const { data: existing, error: exErr } = await supabase
      .from("invoices")
      .select("invoice_id")
      .eq("company_id", companyId)
      .eq("work_order_id", (wo as any).work_order_id)
      .limit(1);

    if (exErr) throw exErr;

    if (existing && existing.length > 0 && existing[0]?.invoice_id) {
      invoiceId = existing[0].invoice_id as string;
    }
  }

  // 1.3) Leer tax rate default (sin INSERT)
  const defaultTaxRate = await getDefaultTaxRate(companyId);
  console.log("🧾 defaultTaxRate resolved:", defaultTaxRate);

  // 2) Crear invoice (solo si no existe)
  if (!invoiceId) {
    const { data: allocatedNumber, error: allocErr } = await supabase.rpc(
      "allocate_next_invoice_number",
      {
        p_company_id: companyId,
      },
    );

    if (allocErr) throw allocErr;

    const invoiceNumber =
      typeof allocatedNumber === "string" && allocatedNumber.trim()
        ? allocatedNumber.trim()
        : null;

    if (!invoiceNumber) {
      throw new Error("No se pudo asignar invoice_number");
    }

    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .insert({
        company_id: companyId,
        work_order_id: (wo as any).work_order_id,
        invoice_number: invoiceNumber,
        currency_code: currencyCode,

        customer_name:
          (((wo as any).customer_name &&
            String((wo as any).customer_name).trim()) ||
            ((wo as any).job_type && String((wo as any).job_type).trim()) ||
            "Cliente"),

        customer_phone:
          (((wo as any).customer_phone &&
            String((wo as any).customer_phone).trim()) ||
            null),

        customer_email:
          (((wo as any).customer_email &&
            String((wo as any).customer_email).trim()) ||
            null),

        billing_address:
          (((wo as any).service_address &&
            String((wo as any).service_address).trim()) ||
            null),

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
          .eq("company_id", companyId)
          .eq("work_order_id", (wo as any).work_order_id)
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
    .select(
      "description, quantity, qty_planned, qty_done, unit_price, taxable, pending_pricing, pricing_status",
    )
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
          it?.pending_pricing === true ||
          it?.pricing_status === "pending_pricing";
        return !isPending;
      })
      .map((it: any) => {
        const taxable = it?.taxable ?? true;
        const qtyToInvoice =
          it?.qty_done ?? it?.qty_planned ?? it?.quantity ?? 1;

        return {
          company_id: companyId,
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
      const { error: copyErr } = await supabase
        .from("invoice_items")
        .insert(payload);
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
    work_order_number?: string | null;
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

function escHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function joinCompanyAddress(company?: InvoiceHtmlData["company"]) {
  const cityProvince = [company?.city, company?.province]
    .filter(Boolean)
    .join(", ");

  const postalCountry = [company?.postal_code, company?.country]
    .filter(Boolean)
    .join(" ");

  return [
    company?.address_line1,
    company?.address_line2,
    cityProvince || null,
    postalCountry || null,
  ]
    .filter(Boolean)
    .join("<br/>");
}

function dateHtml(date: string | null | undefined) {
  if (!date) return "—";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return escHtml(date);

  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

function displayWorkOrder(invoice: InvoiceHtmlData["invoice"]) {
  const workOrderNumber =
    typeof invoice?.work_order_number === "string" &&
      invoice.work_order_number.trim()
      ? invoice.work_order_number.trim()
      : null;

  if (workOrderNumber) return workOrderNumber;

  const workOrderId =
    typeof invoice?.work_order_id === "string" && invoice.work_order_id.trim()
      ? invoice.work_order_id.trim()
      : null;

  if (!workOrderId) return null;

  return workOrderId.slice(0, 8);
}

export function renderInvoiceHtml(data: InvoiceHtmlData): string {
  const invoice = data.invoice ?? {};
  const company = data.company ?? {};
  const items = data.items ?? [];
  const payments = data.payments ?? [];
  const currency = invoice.currency_code || "CAD";

  const companyDisplayName =
    company.legal_name || company.company_name || "Company";
  const companyAddress = joinCompanyAddress(company);
  const invoiceDate = invoice.invoice_date || invoice.issue_date || null;
  const workOrderDisplay = displayWorkOrder(invoice);

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
      .map((item) => {
        return `
          <tr>
            <td class="desc">${escHtml(item.description || "")}</td>
            <td class="num">${Number(item.qty ?? 0)}</td>
            <td class="num">${moneyHtml(item.unit_price, currency)}</td>
            <td class="num strong">${moneyHtml(item.line_total, currency)}</td>
          </tr>
        `;
      })
      .join("")
    : `
      <tr>
        <td colspan="4" class="empty">No invoice items</td>
      </tr>
    `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice ${escHtml(invoice.invoice_number || "")}</title>

<style>
:root{
  --text:#101828;
  --muted:#667085;
  --line:#e4e7ec;
  --soft:#f8fafc;
  --heading:#0f172a;
}

*{
  box-sizing:border-box;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}

html,body{
  margin:0;
  padding:0;
  font-family:Arial,Helvetica,sans-serif;
  color:var(--text);
  font-size:12.5px;
  line-height:1.35;
  background:#ffffff;
}

body{
  padding:14px;
}

.page{
  max-width:860px;
  margin:auto;
}

/* HEADER */

.topbar{
  display:grid;
  grid-template-columns:1.2fr 0.8fr;
  gap:14px;
  margin-bottom:10px;
}

.logo{
  max-width:140px;
  max-height:70px;
  object-fit:contain;
  margin-bottom:6px;
}

.brand-name{
  font-size:21px;
  font-weight:900;
  color:var(--heading);
  margin:0 0 4px 0;
  letter-spacing:-0.02em;
}

.brand-meta{
  color:var(--muted);
  font-size:11.5px;
}

.brand-meta div{
  margin-top:1px;
}

/* INVOICE PANEL */

.invoice-panel{
  border:1px solid var(--line);
  border-radius:12px;
  padding:14px 16px;
  background:#fafafa;
}

.invoice-title{
  font-size:28px;
  font-weight:800;
  margin:0;
  letter-spacing:-0.02em;
  color:var(--heading);
}

.status-pill{
  display:inline-block;
  margin-top:5px;
  padding:4px 9px;
  border-radius:999px;
  font-size:10px;
  font-weight:800;
  background:#eef4ff;
  color:#1d4ed8;
  border:1px solid #c7d7ff;
}

.meta-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px 14px;
  margin-top:10px;
}

.meta-label{
  font-size:10px;
  text-transform:uppercase;
  letter-spacing:.06em;
  color:var(--muted);
  font-weight:700;
}

.meta-value{
  font-weight:700;
  word-break:break-word;
}

/* INFO CARDS */

.section-grid{
  display:grid;
  grid-template-columns:1fr 1fr 1fr;
  gap:10px;
  margin-bottom:12px;
}

.card{
  border:1px solid var(--line);
  border-radius:12px;
  padding:10px;
  min-height:76px;
}

.card h3{
  margin:0 0 8px;
  font-size:10px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:var(--muted);
}

.card div{
  margin-top:2px;
}

/* ITEMS TABLE */

.items-card{
  border:1px solid var(--line);
  border-radius:12px;
  overflow:hidden;
}

.items-header{
  padding:8px 12px;
  background:#fafafa;
  border-bottom:1px solid var(--line);
  font-size:10px;
  font-weight:800;
  letter-spacing:.08em;
  color:var(--muted);
}

table{
  width:100%;
  border-collapse:collapse;
}

thead{
  display:table-header-group;
}

thead th{
  background:#f2f4f7;
  padding:8px 10px;
  text-align:left;
  font-size:11px;
  font-weight:800;
  border-bottom:1px solid var(--line);
}

tbody td{
  padding:8px 10px;
  border-bottom:1px solid var(--line);
  vertical-align:top;
}

tbody tr:last-child td{
  border-bottom:0;
}

.desc{
  width:50%;
}

.num{
  text-align:right;
  white-space:nowrap;
}

.strong{
  font-weight:800;
}

/* TOTALS */

.summary{
  display:flex;
  justify-content:flex-end;
  margin-top:10px;
}

.totals{
  width:300px;
  border:1px solid var(--line);
  border-radius:12px;
  overflow:hidden;
}

.totals-row{
  display:flex;
  justify-content:space-between;
  gap:12px;
  padding:9px 12px;
  border-bottom:1px solid var(--line);
}

.totals-row:last-child{
  border-bottom:0;
}

.totals-row.total{
  font-size:16px;
  font-weight:800;
  background:#f8fafc;
}

.totals-row.balance{
  font-size:17px;
  font-weight:900;
  background:#eef4ff;
  color:#1d4ed8;
}

/* NOTES */

.notes{
  margin-top:14px;
  border:1px solid var(--line);
  border-radius:12px;
  page-break-inside:avoid;
}

.notes-header{
  padding:10px 14px;
  border-bottom:1px solid var(--line);
  background:#fafafa;
  font-size:10px;
  text-transform:uppercase;
  letter-spacing:.08em;
  font-weight:800;
  color:var(--muted);
}

.notes-body{
  padding:14px;
  color:#344054;
}

/* FOOTER */

.footer{
  margin-top:12px;
  color:#667085;
  font-size:10px;
  text-align:center;
}

/* TABLE SAFETY */

tr{
  page-break-inside:avoid;
}

/* PRINT OPTIMIZATION */

@media print{

  html, body{
    font-size:11px;
    line-height:1.25;
  }

  body{
    padding:0;
  }

  .page{
    max-width:none;
  }

  .topbar,
  .section-grid,
  .summary,
  .notes{
    page-break-inside:avoid;
  }

  .logo{
    max-width:115px;
    max-height:56px;
  }

  .brand-name{
    font-size:20px;
  }

  .invoice-title{
    font-size:24px;
  }

  .topbar{
    gap:12px;
    margin-bottom:10px;
  }

  .section-grid{
    gap:8px;
    margin-bottom:10px;
  }

  .card{
    min-height:70px;
    padding:8px;
  }

  thead th,
  tbody td{
    padding:7px 8px;
  }

  .summary{
    margin-top:8px;
  }

  .totals{
    width:290px;
  }

}
  .footer{
    margin-top:6px;
    font-size:10px;
  }
}

/* MUY IMPORTANTE:
   dejamos márgenes al motor PDF (Playwright),
   no duplicamos con @page margin aquí. */

@media (max-width: 900px){
  .topbar,
  .section-grid{
    grid-template-columns:1fr;
  }

  .summary{
    justify-content:stretch;
  }

  .totals{
    width:100%;
  }
}
</style>
</head>

<body>
<div class="page">

  <div class="topbar">
    <div>
      ${company.logo_url ? `<img class="logo" src="${escHtml(company.logo_url)}" alt="Company logo" />` : ""}
      <h1 class="brand-name">${escHtml(companyDisplayName)}</h1>

      <div class="brand-meta">
        ${companyAddress ? `<div>${companyAddress}</div>` : ""}
        ${company.phone ? `<div>${escHtml(company.phone)}</div>` : ""}
        ${company.email ? `<div>${escHtml(company.email)}</div>` : ""}
        ${company.website ? `<div>${escHtml(company.website)}</div>` : ""}
        ${company.tax_registration ? `<div><strong>Tax Registration:</strong> ${escHtml(company.tax_registration)}</div>` : ""}
      </div>
    </div>

    <div class="invoice-panel">
      <h2 class="invoice-title">Invoice</h2>
      <span class="status-pill">${escHtml(status.label)}</span>

      <div class="meta-grid">
        <div>
          <div class="meta-label">Invoice Number</div>
          <div class="meta-value">${escHtml(invoice.invoice_number || "—")}</div>
        </div>

        <div>
          <div class="meta-label">Currency</div>
          <div class="meta-value">${escHtml(currency)}</div>
        </div>

        <div>
          <div class="meta-label">Issue Date</div>
          <div class="meta-value">${dateHtml(invoiceDate)}</div>
        </div>

        <div>
          <div class="meta-label">Due Date</div>
          <div class="meta-value">${dateHtml(invoice.due_date)}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section-grid">
    <div class="card">
      <h3>Bill To</h3>
      <strong>${escHtml(invoice.customer_name || "—")}</strong>
      ${invoice.customer_email ? `<div>${escHtml(invoice.customer_email)}</div>` : ""}
      ${invoice.customer_phone ? `<div>${escHtml(invoice.customer_phone)}</div>` : ""}
    </div>

    <div class="card">
      <h3>Service Address</h3>
      ${invoice.billing_address ? escHtml(invoice.billing_address) : "—"}
    </div>

    <div class="card">
      <h3>Service Details</h3>
      ${workOrderDisplay ? `<div><strong>Work Order:</strong> ${escHtml(workOrderDisplay)}</div>` : ""}
      ${invoice.tax_name ? `<div><strong>Tax:</strong> ${escHtml(invoice.tax_name)}</div>` : ""}
    </div>
  </div>

  <div class="items-card">
    <div class="items-header">Invoice Items</div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="num">Qty</th>
          <th class="num">Unit Price</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>

  <div class="summary">
    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${moneyHtml(subtotal, currency)}</span>
      </div>

      <div class="totals-row">
        <span>Tax</span>
        <span>${moneyHtml(taxTotal, currency)}</span>
      </div>

      ${depositRequired > 0 ? `
      <div class="totals-row">
        <span>Deposit Required</span>
        <span>${moneyHtml(depositRequired, currency)}</span>
      </div>
      ` : ""}

      ${paymentsReceived > 0 ? `
      <div class="totals-row">
        <span>Payments Received</span>
        <span>${moneyHtml(paymentsReceived, currency)}</span>
      </div>
      ` : ""}

      <div class="totals-row total">
        <span>Total</span>
        <span>${moneyHtml(total, currency)}</span>
      </div>

      <div class="totals-row balance">
        <span>Balance Due</span>
        <span>${moneyHtml(balanceDue, currency)}</span>
      </div>
    </div>
  </div>

  ${invoice.notes ? `
  <div class="notes">
    <div class="notes-header">Notes</div>
    <div class="notes-body">
      ${escHtml(invoice.notes).replaceAll("\\n", "<br/>")}
    </div>
  </div>
  ` : ""}

  <div class="footer">
    ${company.invoice_footer
      ? escHtml(company.invoice_footer).replaceAll("\\n", "<br/>")
      : "Thank you for your business."
    }
  </div>

</div>
</body>
</html>
`;
}