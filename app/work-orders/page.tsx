"use client";

import React, { useEffect, useState, useCallback } from "react";

import { useAuthState } from "../../hooks/useAuthState";
import { useActiveCompany } from "../../hooks/useActiveCompany";
import { useUrlWoFilter } from "../../hooks/useUrlWoFilter";

import { fetchWorkOrders } from "../../lib/supabase/workOrders";

type WorkOrderStatus = "new" | "in_progress" | "resolved" | "closed";

type WorkOrder = {
  work_order_id: string;
  company_id?: string | null;
  job_type: string;
  description: string;
  status: WorkOrderStatus | string;
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

const safeStatus = (s: string): WorkOrderStatus =>
  s === "new" || s === "in_progress" || s === "resolved" || s === "closed"
    ? s
    : "new";

export default function WorkOrdersPage() {
  const { user, authLoading } = useAuthState();
  const { companyId, companyName, isLoadingCompany } = useActiveCompany();
  const { woFilter, setWoFilterAndUrl } = useUrlWoFilter();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loadingWO, setLoadingWO] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadOrders = useCallback(
    async (cid: string) => {
      setLoadingWO(true);
      setErrorMessage("");

      const { data, error } = await fetchWorkOrders(cid);

      if (error) {
        setErrorMessage(error.message ?? "Error al cargar datos de Supabase");
        setWorkOrders([]);
        setLoadingWO(false);
        return;
      }

      const rows = (data ?? []).map((w: any) => ({
        ...w,
        status: safeStatus(String(w.status)),
      })) as WorkOrder[];

      setWorkOrders(rows);
      setLoadingWO(false);
    },
    [],
  );

  useEffect(() => {
    if (companyId) loadOrders(companyId);
  }, [companyId, loadOrders]);

  // ---- UI helpers: filtro local (porque tu fetch aún no filtra en SQL)
  const filtered = React.useMemo(() => {
    const now = Date.now();

    if (woFilter === "mine") {
      if (!user?.id) return [];
      return workOrders.filter((w) => w.assigned_to === user.id);
    }

    if (woFilter === "unassigned") {
      return workOrders.filter((w) => !w.assigned_to);
    }

    if (woFilter === "delayed") {
      return workOrders.filter((w) => {
        if (safeStatus(String(w.status)) !== "in_progress") return false;
        const created = w.created_at ? new Date(w.created_at).getTime() : now;
        const days = (now - created) / (1000 * 60 * 60 * 24);
        return days > 3;
      });
    }

    if (woFilter === "ready_to_invoice") {
      const s = (x: WorkOrder) => safeStatus(String(x.status));
      return workOrders.filter((w) => s(w) === "resolved" || s(w) === "closed");
    }

    return workOrders;
  }, [woFilter, workOrders, user?.id]);

  if (authLoading || isLoadingCompany) {
    return (
      <div style={{ padding: 50, fontFamily: "sans-serif", textAlign: "center" }}>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div style={{ padding: 50, fontFamily: "sans-serif", color: "red" }}>
        <p>Error: No se encontró una empresa activa para tu usuario.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 30, fontFamily: "sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 30 }}>
        <h1 style={{ margin: 0, fontSize: 32 }}>{companyName || "ManosRemotas"}</h1>
        <p style={{ opacity: 0.6 }}>Panel de Órdenes de Trabajo</p>
      </header>

      {/* BOTONES DE FILTRO */}
      <div style={{ display: "flex", gap: 10, marginBottom: 30, flexWrap: "wrap" }}>
        {["all", "mine", "unassigned", "delayed", "ready_to_invoice"].map((f) => (
          <button
            key={f}
            onClick={() => setWoFilterAndUrl(f as any)}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid #ddd",
              cursor: "pointer",
              backgroundColor: woFilter === f ? "#000" : "#fff",
              color: woFilter === f ? "#fff" : "#000",
              fontWeight: "bold",
            }}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div
          style={{
            background: "#fee",
            color: "#c00",
            padding: 15,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* LISTADO */}
      {loadingWO ? (
        <p>Buscando órdenes...</p>
      ) : (
        <div style={{ display: "grid", gap: 15 }}>
          {filtered.length === 0 ? (
            <p style={{ opacity: 0.5 }}>No hay órdenes que mostrar.</p>
          ) : (
            filtered.map((wo) => (
              <div
                key={wo.work_order_id}
                style={{
                  padding: 20,
                  border: "1px solid #eee",
                  borderRadius: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fff",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: "bold", fontSize: 18 }}>{wo.job_type}</div>
                  <div style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
                    {wo.description}
                  </div>
                </div>

                <div
                  style={{
                    background: "#f0f0f0",
                    padding: "5px 12px",
                    borderRadius: 15,
                    fontSize: 12,
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  {safeStatus(String(wo.status))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}