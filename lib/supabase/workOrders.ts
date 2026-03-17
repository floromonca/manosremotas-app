// lib/supabase/workOrders.ts
import { supabase } from "../supabaseClient";

export type WorkOrderStatus = "new" | "in_progress" | "resolved" | "closed";

export const safeStatus = (s: string): WorkOrderStatus =>
  s === "new" || s === "in_progress" || s === "resolved" || s === "closed"
    ? s
    : "new";

export type WorkOrderRow = {
  work_order_id: string;
  work_order_number?: string | null;
  company_id?: string | null;
  job_type: string;
  description: string;
  status: string;
  priority: string;
  scheduled_for: string | null;
  created_at: string;
  assigned_to?: string | null;
  created_by?: string | null;
  customer_id?: string | null;
  location_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  service_address?: string | null;
  invoice_id?: string | null;
  invoiced_at?: string | null;
};

// 1) Listado
export async function fetchWorkOrders(companyId: string) {
  return await supabase
    .from("work_orders")
    .select(
      "work_order_id, work_order_number, company_id, job_type, description, status, priority, scheduled_for, created_at, assigned_to, created_by, customer_id, location_id, customer_name, customer_phone, customer_email, service_address, invoice_id, invoiced_at",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(100);
}

// 2) Crear WO
export async function insertWorkOrder(payload: Record<string, any>) {
  const companyId =
    typeof payload?.company_id === "string" && payload.company_id.trim()
      ? payload.company_id.trim()
      : null;

  if (!companyId) {
    throw new Error("company_id es requerido para crear la work order");
  }

  const { data: allocatedNumber, error: allocErr } = await supabase.rpc(
    "allocate_next_work_order_number",
    {
      p_company_id: companyId,
    },
  );

  if (allocErr) throw allocErr;

  const workOrderNumber =
    typeof allocatedNumber === "string" && allocatedNumber.trim()
      ? allocatedNumber.trim()
      : null;

  if (!workOrderNumber) {
    throw new Error("No se pudo asignar work_order_number");
  }

  return await supabase
    .from("work_orders")
    .insert([
      {
        ...payload,
        company_id: companyId,
        work_order_number: workOrderNumber,
      },
    ])
    .select(
      "work_order_id, work_order_number, company_id, job_type, description, status, priority, scheduled_for, created_at, assigned_to, created_by, customer_id, location_id, customer_name, customer_phone, customer_email, service_address, invoice_id, invoiced_at",
    )
    .single();
}

// 3) Status
export async function setWorkOrderStatus(
  workOrderId: string,
  status: WorkOrderStatus,
) {
  return await supabase
    .from("work_orders")
    .update({ status })
    .eq("work_order_id", workOrderId);
}

// 4) Asignación
export async function setWorkOrderAssignee(
  workOrderId: string,
  assigned_to: string | null,
) {
  return await supabase
    .from("work_orders")
    .update({ assigned_to })
    .eq("work_order_id", workOrderId);
}

export const __debug_exports = {
  fetchWorkOrders,
  insertWorkOrder,
  setWorkOrderStatus,
  setWorkOrderAssignee,
};