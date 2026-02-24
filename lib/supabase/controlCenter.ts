// lib/supabase/controlCenter.ts
import { supabase } from "../supabaseClient";

export type ControlCenterKpis = {
  activeWorkOrders: number;
  techniciansWorking: number;
  delayedOrders: number;
  readyToInvoice: number;
};

export type AttentionLists = {
  unassigned: { work_order_id: string; job_type: string; created_at: string }[];
  inProgressOld: { work_order_id: string; job_type: string; created_at: string }[];
  completedNotInvoiced: { work_order_id: string; job_type: string; created_at: string }[];
};

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ✅ Paso 7: KPI REAL de técnicos trabajando (shifts abiertos)
async function countTechniciansWorkingFromShifts(companyId: string) {
  const { count, error } = await supabase
    .from("shifts")
    .select("shift_id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("check_out_at", null);

  if (error) throw error;
  return count ?? 0;
}

// ✅ KPIs principales (MVP)
export async function fetchControlCenterKpis(
  companyId: string,
): Promise<ControlCenterKpis> {
  // 1) Active WOs: new + in_progress (count exact)
  const { count: activeCount, error: e1 } = await supabase
    .from("work_orders")
    .select("work_order_id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("status", ["new", "in_progress"]);

  if (e1) throw e1;

  // ✅ 2) Technicians working (REAL): shifts abiertos
  const techniciansWorking = await countTechniciansWorkingFromShifts(companyId);

  // 3) Delayed orders (MVP): in_progress y created_at > 3 días
  const { count: delayedCount, error: e3 } = await supabase
    .from("work_orders")
    .select("work_order_id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "in_progress")
    .lt("created_at", daysAgoIso(3));

  if (e3) throw e3;

  // 4) Ready to invoice (MVP): resolved SIN invoice
  const { data: resolvedWos, error: e4 } = await supabase
    .from("work_orders")
    .select("work_order_id")
    .eq("company_id", companyId)
    .eq("status", "resolved")
    .limit(500);

  if (e4) throw e4;

  const resolvedIds = (resolvedWos ?? []).map((r: any) => r.work_order_id);

  let readyToInvoice = 0;
  if (resolvedIds.length > 0) {
    const { data: invRows, error: e5 } = await supabase
      .from("invoices")
      .select("work_order_id")
      .eq("company_id", companyId)
      .in("work_order_id", resolvedIds);

    if (e5) throw e5;

    const invoiced = new Set(
      (invRows ?? []).map((r: any) => r.work_order_id).filter(Boolean),
    );
    readyToInvoice = resolvedIds.filter((id) => !invoiced.has(id)).length;
  }

  return {
    activeWorkOrders: activeCount ?? 0,
    techniciansWorking,
    delayedOrders: delayedCount ?? 0,
    readyToInvoice,
  };
}

// ✅ Listas cortas para “Attention Today”
export async function fetchAttentionLists(
  companyId: string,
): Promise<AttentionLists> {
  const unassignedQ = supabase
    .from("work_orders")
    .select("work_order_id, job_type, created_at")
    .eq("company_id", companyId)
    .is("assigned_to", null)
    .in("status", ["new", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(10);

  const inProgressOldQ = supabase
    .from("work_orders")
    .select("work_order_id, job_type, created_at")
    .eq("company_id", companyId)
    .eq("status", "in_progress")
    .lt("created_at", daysAgoIso(3))
    .order("created_at", { ascending: true })
    .limit(10);

  // resolved sin invoice (igual criterio KPI)
  const { data: resolvedWos, error: e0 } = await supabase
    .from("work_orders")
    .select("work_order_id, job_type, created_at")
    .eq("company_id", companyId)
    .eq("status", "resolved")
    .order("created_at", { ascending: false })
    .limit(50);

  if (e0) throw e0;

  const resolvedIds = (resolvedWos ?? []).map((r: any) => r.work_order_id);
  let completedNotInvoiced: any[] = [];

  if (resolvedIds.length > 0) {
    const { data: invRows, error: eInv } = await supabase
      .from("invoices")
      .select("work_order_id")
      .eq("company_id", companyId)
      .in("work_order_id", resolvedIds);

    if (eInv) throw eInv;

    const invoiced = new Set(
      (invRows ?? []).map((r: any) => r.work_order_id).filter(Boolean),
    );

    completedNotInvoiced = (resolvedWos ?? [])
      .filter((r: any) => !invoiced.has(r.work_order_id))
      .slice(0, 10);
  }

  const [
    { data: unassigned, error: e1 },
    { data: inProgressOld, error: e2 },
  ] = await Promise.all([unassignedQ, inProgressOldQ]);

  if (e1) throw e1;
  if (e2) throw e2;

  return {
    unassigned: (unassigned ?? []) as any[],
    inProgressOld: (inProgressOld ?? []) as any[],
    completedNotInvoiced: completedNotInvoiced as any[],
  };
}