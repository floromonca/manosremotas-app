// lib/supabase/workOrders.ts
import { supabase } from "../supabaseClient";

export type WorkOrderStatus = "new" | "in_progress" | "resolved" | "closed";

export const safeStatus = (s: string): WorkOrderStatus =>
  s === "new" || s === "in_progress" || s === "resolved" || s === "closed"
    ? s
    : "new";

export type WorkOrderRow = {
  work_order_id: string;
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
};

// 1) Listado
export async function fetchWorkOrders(companyId: string) {
  return await supabase
    .from("work_orders")
    .select(
      "work_order_id, company_id, job_type, description, status, priority, scheduled_for, created_at, assigned_to, created_by, customer_id, location_id, customer_name, customer_phone, customer_email, service_address",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(100);
}

// 2) Crear WO
export async function insertWorkOrder(payload: Record<string, any>) {
  return await supabase
    .from("work_orders")
    .insert([payload])
    .select(
      "work_order_id, company_id, job_type, description, status, priority, scheduled_for, created_at, assigned_to, created_by, customer_id, location_id, customer_name, customer_phone, customer_email, service_address",
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