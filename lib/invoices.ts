import { supabase } from "./supabaseClient";

// MVP Canadá: HST ON
const DEFAULT_TAX_RATE = 0.13;

// Genera invoice_number con timestamp + random para evitar choques
function makeInvoiceNumber() {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14); // YYYYMMDDHHMMSS
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase(); // 4 chars
  return `INV-${ts}-${rnd}`;
}

export async function createInvoiceFromWorkOrder(workOrderId: string) {
  if (!workOrderId) throw new Error("workOrderId requerido");

  // 1) Leer WO
  const { data: wo, error: woErr } = await supabase
    .from("work_orders")
    .select("work_order_id, company_id, job_type")
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

  // 2) Crear invoice
  const invoiceNumber = makeInvoiceNumber();

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .insert({
      company_id: wo.company_id,
      work_order_id: wo.work_order_id,
      invoice_number: invoiceNumber,
      customer_name: (wo.job_type && wo.job_type.trim()) || "Cliente",
      status: "draft",
      // currency_code default 'CAD'
    })
    .select("invoice_id")
    .single();

  if (invErr) throw invErr;
  if (!inv?.invoice_id) throw new Error("No se pudo crear invoice_id");

  // 3) Leer items de la WO
  const { data: items, error: itemsErr } = await supabase
    .from("work_order_items")
    .select("description, quantity, unit_price, taxable")
    .eq("work_order_id", workOrderId);

  if (itemsErr) throw itemsErr;

  // 4) Copiar items → invoice_items (con tax_rate default)
  if (items && items.length > 0) {
    const payload = items.map((it) => {
      const taxable = it.taxable ?? true;

      return {
        company_id: wo.company_id,
        invoice_id: inv.invoice_id,
        description: it.description ?? "Item",
        qty: it.quantity ?? 1,               // ✅ invoice_items usa qty
        unit_price: it.unit_price ?? 0,
        tax_rate: taxable ? DEFAULT_TAX_RATE : 0, // ✅ tax_rate por defecto
      };
    });

    const { error: copyErr } = await supabase
      .from("invoice_items")
      .insert(payload);

    if (copyErr) throw copyErr;
  }

  return inv.invoice_id as string;
}