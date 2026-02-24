import { supabase } from "./supabaseClient";

type TaxProfileRow = {
  tax_profile_id: string;
  company_id: string;
  tax_name: string;
  rate: number;
  is_default: boolean;
};

// Fallbacks (si no hay tax_profile default o no se puede leer por RLS)
const FALLBACK_TAX_RATE_CA = 0.13; // Canadá (ON HST)
const FALLBACK_TAX_RATE_CO = 0.19; // Colombia (IVA)

// Genera invoice_number con timestamp + random para evitar choques
function makeInvoiceNumber() {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14); // YYYYMMDDHHMMSS
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase(); // 4 chars
  return `INV-${ts}-${rnd}`;
}

async function getDefaultTaxRate(companyId: string) {
  // Intentar leer el default (NO insertar nada para evitar RLS)
  const { data, error } = await supabase
    .from("tax_profiles")
    .select("tax_profile_id, company_id, tax_name, rate, is_default")
    .eq("company_id", companyId)
    .eq("is_default", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.log("⚠️ No pude leer tax_profiles (RLS?):", error.message);
    return FALLBACK_TAX_RATE_CA; // MVP
  }

  const rate = Number((data as TaxProfileRow | null)?.rate ?? NaN);
  if (!Number.isFinite(rate)) return FALLBACK_TAX_RATE_CA;

  return rate;
}

export async function createInvoiceFromWorkOrder(workOrderId: string) {
  if (!workOrderId) throw new Error("workOrderId requerido");

  // 1) Leer WO
  const { data: wo, error: woErr } = await supabase
    .from("work_orders")
    .select("work_order_id, company_id, job_type, customer_name")
    .eq("work_order_id", workOrderId)
    .single();

  if (woErr) throw woErr;
  if (!wo) throw new Error("Work order no encontrada");
  if (!wo.company_id) throw new Error("WO sin company_id");

  // 1.1) Si ya existe invoice para esta WO, reúsala (evita duplicados)
  const { data: existing, error: exErr } = await supabase
    .from("invoices")
    .select("invoice_id")
    .eq("company_id", wo.company_id)
    .eq("work_order_id", wo.work_order_id)
    .limit(1);

  if (exErr) throw exErr;
  if (existing && existing.length > 0 && existing[0]?.invoice_id) {
    return existing[0].invoice_id as string;
  }

  // 1.2) Leer tax rate default (sin INSERT)
  const defaultTaxRate = await getDefaultTaxRate(wo.company_id);
  console.log("🧾 defaultTaxRate resolved:", defaultTaxRate);

  // 2) Crear invoice
  const invoiceNumber = makeInvoiceNumber();

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .insert({
      company_id: wo.company_id,
      work_order_id: wo.work_order_id,
      invoice_number: invoiceNumber,
      customer_name:
        (wo.customer_name && String(wo.customer_name).trim()) ||
        (wo.job_type && String(wo.job_type).trim()) ||
        "Cliente",
      status: "draft",
    })
    .select("invoice_id")
    .single();

  if (invErr) throw invErr;
  if (!inv?.invoice_id) throw new Error("No se pudo crear invoice_id");

  // ✅ 2.1) Marcar la WO como facturada (Modelo A+ bidireccional)
  // Requiere que existan columnas work_orders.invoice_id y work_orders.invoiced_at
  const { error: markErr } = await supabase
    .from("work_orders")
    .update({
      invoice_id: inv.invoice_id,
      invoiced_at: new Date().toISOString(),
    })
    .eq("work_order_id", workOrderId);

  if (markErr) throw markErr;

  // 3) Leer items de la WO
  const { data: items, error: itemsErr } = await supabase
    .from("work_order_items")
    .select("description, quantity, unit_price, taxable")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: true });

  if (itemsErr) throw itemsErr;

  // 4) Copiar items → invoice_items
  if (items && items.length > 0) {
    const payload = items.map((it: any) => {
      const taxable = it.taxable ?? true;
      return {
        company_id: wo.company_id,
        invoice_id: inv.invoice_id,
        description: it.description ?? "Item",
        qty: it.quantity ?? 1,
        unit_price: it.unit_price ?? 0,
        tax_rate: taxable ? defaultTaxRate : 0,
      };
    });

    console.log("🧾 Copy items payload (tax_rate check):", payload);

    const { error: copyErr } = await supabase
      .from("invoice_items")
      .insert(payload);

    if (copyErr) throw copyErr;
  }

  return inv.invoice_id as string;
}