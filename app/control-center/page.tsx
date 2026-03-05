"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "../../lib/supabaseClient";
import {
    fetchAttentionLists,
    fetchControlCenterKpis,
    type AttentionLists,
    type ControlCenterKpis,
} from "../../lib/supabase/controlCenter";
import { checkIn, checkOut, getOpenShift } from "../../lib/supabase/shifts";
import { useAuthState } from "../../hooks/useAuthState";
import { useActiveCompany } from "../../hooks/useActiveCompany";

export default function ControlCenterPage() {
    const router = useRouter();

    const { user, authLoading } = useAuthState();
    const { companyId, companyName, isLoadingCompany } = useActiveCompany();

    const [loading, setLoading] = useState(true);
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

    // ✅ Jornada
    const [shiftLoading, setShiftLoading] = useState(false);
    const [openShiftId, setOpenShiftId] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        setPrettyDate(new Date().toLocaleDateString());
    }, []);

    const refreshAll = useCallback(
        async (cid: string) => {
            // Shift abierto (si existe)
            try {
                const { data, error } = await getOpenShift(cid);
                if (error) throw error;
                setOpenShiftId((data as any)?.shift_id ?? null);
            } catch (e: any) {
                console.log("shift load warn:", e?.message ?? e);
                setOpenShiftId(null);
            }

            // KPIs + lists
            const [k, l] = await Promise.all([
                fetchControlCenterKpis(cid),
                fetchAttentionLists(cid),
            ]);

            setKpis(k);
            setLists(l);
        },
        [setKpis, setLists],
    );

    // ✅ Bootstrap Opción A: crear company para el usuario actual
    const createCompanyBootstrap = async () => {
        setErrorMsg("");
        try {
            const { data, error } = await supabase.rpc(
                "create_company_for_current_user",
                { p_company_name: "Empresa Prueba CO" },
            );
            if (error) throw error;

            const newCompanyId = (data as any) as string | null;
            if (!newCompanyId) throw new Error("RPC no devolvió company_id");

            // Guardar activeCompanyId (el hook también sanea, pero esto acelera UX)
            if (typeof window !== "undefined") {
                localStorage.setItem("activeCompanyId", newCompanyId);
            }

            // Cargar data de Control Center inmediatamente
            await refreshAll(newCompanyId);

            alert(`Company creada ✅ ${newCompanyId}`);

            // Nota: useActiveCompany se actualizará solo (porque ya existe membership)
            // Si quieres, puedes hacer router.refresh(), pero no es necesario.
        } catch (e: any) {
            console.log("❌ RPC create_company_for_current_user error:", e);
            const msg = e?.message ?? String(e);
            alert("Error creando company: " + msg);
            setErrorMsg(msg);
        }
    };

    // ✅ Boot: decide qué mostrar según auth + company
    useEffect(() => {
        if (authLoading) return;

        // Si no está logueado, fuera
        if (!user) {
            setLoading(false);
            router.replace("/auth");
            return;
        }

        // Esperamos a que el hook termine de resolver company
        if (isLoadingCompany) return;

        let cancelled = false;

        (async () => {
            setLoading(true);
            setErrorMsg("");

            try {
                if (!companyId) {
                    // No hay company: modo bootstrap
                    setKpis({
                        activeWorkOrders: 0,
                        techniciansWorking: 0,
                        delayedOrders: 0,
                        readyToInvoice: 0,
                    });
                    setLists({
                        unassigned: [],
                        inProgressOld: [],
                        completedNotInvoiced: [],
                    });
                    setOpenShiftId(null);
                    return;
                }

                await refreshAll(companyId);
            } catch (e: any) {
                if (!cancelled) setErrorMsg(e?.message ?? String(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [authLoading, user?.id, isLoadingCompany, companyId, refreshAll, router]);

    const go = (url: string) => {
        if (companyId && typeof window !== "undefined") {
            localStorage.setItem("activeCompanyId", companyId);
        }
        router.replace(url);
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 18 }}>
                {mounted && prettyDate ? (
                    <div style={{ fontSize: 13, opacity: 0.7 }}>{prettyDate}</div>
                ) : null}

                <h1 style={{ fontSize: 28, fontWeight: 650, margin: "6px 0" }}>
                    {(companyName && companyName.trim() ? companyName : "Your Business")} — Control Center
                </h1>

                <div style={{ opacity: 0.7 }}>
                    {companyId ? "Live overview of your field operations" : "No company selected."}
                </div>

                {/* ✅ Bootstrap button */}
                {!companyId ? (
                    <button
                        onClick={createCompanyBootstrap}
                        style={{
                            marginTop: 10,
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #ddd",
                            background: "white",
                            cursor: "pointer",
                            fontWeight: 800,
                        }}
                    >
                        + Crear Company (Bootstrap)
                    </button>
                ) : null}

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
                {/* Quick actions */}
                {companyId ? (
                    <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                            type="button"
                            onClick={() => go("/work-orders")}
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: "white",
                                cursor: "pointer",
                                fontWeight: 800,
                            }}
                        >
                            Work Orders
                        </button>

                        <button
                            type="button"
                            onClick={() => go("/settings/team")}
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: "white",
                                cursor: "pointer",
                                fontWeight: 800,
                            }}
                        >
                            Team
                        </button>
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
                <Card title="Active Work Orders" value={loading ? "…" : String(kpis.activeWorkOrders)} />
                <Card
                    title="Technicians Working"
                    value={loading ? "…" : String(kpis.techniciansWorking)}
                />
                <Card title="Delayed Orders" value={loading ? "…" : String(kpis.delayedOrders)} />
                <Card title="Ready to Invoice" value={loading ? "…" : String(kpis.readyToInvoice)} />
            </div>

            {/* ✅ Jornada */}
            <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                <button
                    disabled={!companyId || shiftLoading || !!openShiftId}
                    onClick={async () => {
                        if (!companyId) return;

                        setShiftLoading(true);
                        setErrorMsg("");

                        try {
                            const { data, error } = await checkIn(companyId);
                            if (error) throw error;

                            setOpenShiftId((data as any)?.shift_id ?? null);

                            // refrescar KPIs después de check-in
                            const k = await fetchControlCenterKpis(companyId);
                            setKpis(k);
                        } catch (e: any) {
                            const msg = e?.message ?? String(e);
                            console.error("CHECK-IN ERROR ❌", e);
                            alert(msg);
                            setErrorMsg(msg);
                        } finally {
                            setShiftLoading(false);
                        }
                    }}
                    style={{
                        border: "1px solid #ddd",
                        background: openShiftId ? "#f5f5f5" : "white",
                        borderRadius: 8,
                        padding: "8px 12px",
                        cursor: openShiftId ? "not-allowed" : "pointer",
                        opacity: !companyId || shiftLoading || !!openShiftId ? 0.7 : 1,
                    }}
                    title={
                        openShiftId
                            ? "Ya tienes una jornada activa. Debes hacer check-out primero."
                            : "Iniciar jornada"
                    }
                >
                    {openShiftId ? "Check-in (jornada activa)" : shiftLoading ? "Check-in..." : "Check-in"}
                </button>

                <button
                    disabled={!companyId || shiftLoading || !openShiftId}
                    onClick={async () => {
                        if (!openShiftId || !companyId) return;
                        setShiftLoading(true);
                        setErrorMsg("");
                        try {
                            const { data, error } = await checkOut(openShiftId);
                            if (error) throw error;

                            setOpenShiftId(null);

                            // refrescar KPIs después de check-out
                            const k = await fetchControlCenterKpis(companyId);
                            setKpis(k);
                        } catch (e: any) {
                            setErrorMsg(e?.message ?? String(e));
                        } finally {
                            setShiftLoading(false);
                        }
                    }}
                    style={{
                        border: "1px solid #ddd",
                        background: !openShiftId ? "#f5f5f5" : "white",
                        borderRadius: 8,
                        padding: "8px 12px",
                        cursor: "pointer",
                    }}
                >
                    Check-out
                </button>

                <div style={{ fontSize: 13, opacity: 0.7, alignSelf: "center" }}>
                    Jornada: <b>{openShiftId ? "ACTIVA ✅" : "cerrada"}</b>
                </div>
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
                            onOpen={() => go("/work-orders?filter=unassigned")}
                            items={lists.unassigned.map((x) => ({
                                title: x.job_type,
                                meta: x.work_order_id.slice(0, 8),
                            }))}
                        />

                        <ListBlock
                            title={`In progress > 3 days (${lists.inProgressOld.length})`}
                            onOpen={() => go("/work-orders?filter=delayed")}
                            items={lists.inProgressOld.map((x) => ({
                                title: x.job_type,
                                meta: x.work_order_id.slice(0, 8),
                            }))}
                        />

                        <ListBlock
                            title={`Completed, not invoiced (${lists.completedNotInvoiced.length})`}
                            onOpen={() => go("/work-orders?filter=ready_to_invoice")}
                            items={lists.completedNotInvoiced.map((x) => ({
                                title: x.job_type,
                                meta: x.work_order_id.slice(0, 8),
                            }))}
                        />
                    </div>
                )}
            </div>

            <div style={{ opacity: 0.7, fontSize: 13 }}>
                Nota: “Technicians Working” debe venir de shifts abiertos (real).
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
                            onClick={onOpen ? () => onOpen() : undefined}
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