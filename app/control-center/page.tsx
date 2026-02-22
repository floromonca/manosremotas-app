"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  fetchAttentionLists,
  fetchControlCenterKpis,
  type AttentionLists,
  type ControlCenterKpis,
} from "../../lib/supabase/controlCenter";
import { useRouter } from "next/navigation";

export default function ControlCenterPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("Your Business");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [kpis, setKpis] = useState<ControlCenterKpis>({
    activeWorkOrders: 0,
    techniciansWorking: 0,
    delayedOrders: 0,
    readyToInvoice: 0,
  });

  const [lists, setLists] = useState<AttentionLists>({
    unassigned: [],
    inProgressOld: [],
    completedNotInvoiced: [],
  });

  // ✅ evita hydration mismatch: solo renderizamos fecha después del mount
  const [mounted, setMounted] = useState(false);
  const [prettyDate, setPrettyDate] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setPrettyDate(new Date().toLocaleDateString());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      setLoading(true);
      setErrorMsg("");

      // 0) Session
      const {
        data: { session },
        error: sessErr,
      } = await supabase.auth.getSession();

      if (sessErr) {
        if (!cancelled) setErrorMsg(sessErr.message);
        if (!cancelled) setLoading(false);
        return;
      }

      if (!session) {
        if (!cancelled) {
          setCompanyId(null);
          setLoading(false);
        }
        return;
      }

      // 1) CompanyId (prefer saved)
      const saved = localStorage.getItem("activeCompanyId");
      let cid: string | null = saved && saved.trim() ? saved : null;

      // 2) If no saved, get first company membership
      if (!cid) {
        const { data: u, error: uErr } = await supabase.auth.getUser();
        if (uErr) {
          if (!cancelled) setErrorMsg(uErr.message);
          if (!cancelled) setLoading(false);
          return;
        }

        const uid = u.user?.id;
        if (!uid) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data: cm, error: cmErr } = await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", uid)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (cmErr) {
          if (!cancelled) setErrorMsg(cmErr.message);
          if (!cancelled) setLoading(false);
          return;
        }

        cid = (cm as any)?.company_id ?? null;

        if (cid) localStorage.setItem("activeCompanyId", cid);
      }

      // 3) Safety check
      if (!cid) {
        if (!cancelled) {
          setCompanyId(null);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setCompanyId(cid);

      // 4) Load company name
      const { data: cRow, error: cErr } = await supabase
        .from("companies")
        .select("company_name")
        .eq("company_id", cid)
        .single();

      if (!cancelled) {
        if (cErr) setCompanyName("Your Business");
        else setCompanyName((cRow as any)?.company_name ?? "Your Business");
      }

      // 5) Load KPIs + lists
      try {
        const [k, l] = await Promise.all([
          fetchControlCenterKpis(cid),
          fetchAttentionLists(cid),
        ]);

        if (!cancelled) {
          setKpis(k);
          setLists(l);
        }
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        {/* ✅ fecha solo cuando mounted=true para evitar hydration mismatch */}
        {mounted && prettyDate ? (
          <div style={{ fontSize: 13, opacity: 0.7 }}>{prettyDate}</div>
        ) : null}

        <h1 style={{ fontSize: 28, fontWeight: 650, margin: "6px 0" }}>
          {companyName} — Control Center
        </h1>

        <div style={{ opacity: 0.7 }}>
          {companyId
            ? "Live overview of your field operations"
            : "Please sign in on / to see your data"}
        </div>

        {errorMsg ? (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              border: "1px solid #f3caca",
              background: "#fff5f5",
              borderRadius: 8,
              color: "#a40000",
              fontSize: 13,
            }}
          >
            <b>Error:</b> {errorMsg}
          </div>
        ) : null}
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <Card
          title="Active Work Orders"
          value={loading ? "…" : String(kpis.activeWorkOrders)}
        />
        <Card
          title="Technicians Working"
          value={loading ? "…" : String(kpis.techniciansWorking)}
        />
        <Card
          title="Delayed Orders"
          value={loading ? "…" : String(kpis.delayedOrders)}
        />
        <Card
          title="Ready to Invoice"
          value={loading ? "…" : String(kpis.readyToInvoice)}
        />
      </div>

      {/* Attention Today */}
      <div style={{ marginBottom: 26 }}>
        <h2 style={{ marginBottom: 10 }}>Attention Today</h2>

        {loading ? (
          <div style={{ opacity: 0.7 }}>Loading…</div>
        ) : !companyId ? (
          <div style={{ opacity: 0.7 }}>No company selected.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <ListBlock
              title={`Unassigned (${lists.unassigned.length})`}
              onOpen={() => router.push("/?filter=unassigned")}
              items={lists.unassigned.map((x) => ({
                title: x.job_type,
                meta: x.work_order_id.slice(0, 8),
              }))}
            />

            <ListBlock
              title={`In progress > 3 days (${lists.inProgressOld.length})`}
              onOpen={() => router.push("/?filter=delayed")}
              items={lists.inProgressOld.map((x) => ({
                title: x.job_type,
                meta: x.work_order_id.slice(0, 8),
              }))}
            />

            <ListBlock
              title={`Completed, not invoiced (${lists.completedNotInvoiced.length})`}
              onOpen={() => router.push("/?filter=ready_to_invoice")}
              items={lists.completedNotInvoiced.map((x) => ({
                title: x.job_type,
                meta: x.work_order_id.slice(0, 8),
              }))}
            />
          </div>
        )}
      </div>

      <div style={{ opacity: 0.7, fontSize: 13 }}>
        Nota: “Technicians Working” por ahora es un proxy (órdenes in_progress
        asignadas). Cuando metamos “Jornada + Timer”, será 100% real.
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #e5e5e5",
        borderRadius: 10,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.6 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 650, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function ListBlock({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: { title: string; meta?: string }[];
  onOpen?: () => void;
}) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 10,
        padding: 12,
        background: "#fafafa",
      }}
    >
      <div
        style={{
          fontWeight: 650,
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span>{title}</span>

        {onOpen ? (
          <button
            onClick={onOpen}
            style={{
              border: "1px solid #ddd",
              background: "white",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            View →
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div style={{ opacity: 0.7, fontSize: 13 }}>Nothing here ✅</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((it, idx) => (
            <div
              key={idx}
              onClick={onOpen}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                padding: "8px 10px",
                background: "white",
                border: "1px solid #eee",
                borderRadius: 8,
                cursor: onOpen ? "pointer" : "default",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (onOpen) e.currentTarget.style.background = "#f4f4f4";
              }}
              onMouseLeave={(e) => {
                if (onOpen) e.currentTarget.style.background = "white";
              }}
            >
              <div>{it.title}</div>
              <div style={{ opacity: 0.6, fontFamily: "monospace" }}>
                {it.meta ?? ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}