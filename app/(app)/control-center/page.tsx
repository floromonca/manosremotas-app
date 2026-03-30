"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import {
    fetchAttentionLists,
    fetchControlCenterKpis,
    type AttentionLists,
    type ControlCenterKpis,
} from "../../../lib/supabase/controlCenter";
import { useAuthState } from "../../../hooks/useAuthState";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import { checkIn, checkOut, getOpenShift, type ShiftRow } from "../../../lib/supabase/shifts";

export default function ControlCenterPage() {
    const router = useRouter();

    const { user, authLoading } = useAuthState();
    const { companyId, companyName, myRole, isLoadingCompany } = useActiveCompany();

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [revenueMonth, setRevenueMonth] = useState(0);

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

    const [mounted, setMounted] = useState(false);
    const [prettyDate, setPrettyDate] = useState("");
    const [openShift, setOpenShift] = useState<ShiftRow | null>(null);
    const [shiftLoading, setShiftLoading] = useState(false);
    const [shiftBusy, setShiftBusy] = useState(false);
    const [shiftMsg, setShiftMsg] = useState("");

    useEffect(() => {
        setMounted(true);
        setPrettyDate(new Date().toLocaleDateString());
    }, []);

    const refreshAll = useCallback(async (cid: string) => {
        const [k, l] = await Promise.all([
            fetchControlCenterKpis(cid),
            fetchAttentionLists(cid),
        ]);

        setKpis(k);
        setLists(l);

        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

        const { data: revenueData, error: revenueErr } = await supabase
            .from("invoices")
            .select("total")
            .eq("company_id", cid)
            .gte("issue_date", firstDay.toISOString().slice(0, 10));

        if (revenueErr) {
            console.error("Revenue month error:", revenueErr);
            setRevenueMonth(0);
            return;
        }

        const total = (revenueData ?? []).reduce(
            (sum, row) => sum + Number(row.total || 0),
            0
        );

        setRevenueMonth(total);
    }, []);
    const refreshShift = useCallback(async (cid: string) => {
        setShiftLoading(true);
        try {
            const { data, error } = await getOpenShift(cid);
            if (error) throw error;
            setOpenShift((data as ShiftRow | null) ?? null);
        } catch (e: any) {
            console.error("Shift refresh error:", e);
            setOpenShift(null);
        } finally {
            setShiftLoading(false);
        }
    }, []);
    const createCompanyBootstrap = async () => {
        setErrorMsg("");

        try {
            const { data, error } = await supabase.rpc(
                "create_company_for_current_user",
                { p_company_name: "Empresa Prueba CO" }
            );

            if (error) throw error;

            const newCompanyId = data as string | null;
            if (!newCompanyId) throw new Error("RPC no devolvió company_id");

            if (typeof window !== "undefined") {
                localStorage.setItem("activeCompanyId", newCompanyId);
            }

            await refreshAll(newCompanyId);

            alert(`Company creada ✅ ${newCompanyId}`);
        } catch (e: any) {
            console.log("❌ RPC create_company_for_current_user error:", e);
            const msg = e?.message ?? String(e);
            alert("Error creando company: " + msg);
            setErrorMsg(msg);
        }
    };
    const handleCheckIn = useCallback(async () => {
        if (!companyId) return;

        setShiftBusy(true);
        setShiftMsg("");

        try {
            const { data, error } = await checkIn(companyId);
            if (error) throw error;

            setOpenShift((data as ShiftRow) ?? null);
            setShiftMsg("Check-in registrado correctamente.");
            await refreshAll(companyId);
        } catch (e: any) {
            const msg = e?.message ?? String(e);
            setShiftMsg(msg);
        } finally {
            setShiftBusy(false);
        }
    }, [companyId, refreshAll]);

    const handleCheckOut = useCallback(async () => {
        if (!openShift?.shift_id || !companyId) return;

        setShiftBusy(true);
        setShiftMsg("");

        try {
            const { error } = await checkOut(openShift.shift_id);
            if (error) throw error;

            setShiftMsg("Check-out registrado correctamente.");
            await refreshShift(companyId);
            await refreshAll(companyId);
        } catch (e: any) {
            const msg = e?.message ?? String(e);
            setShiftMsg(msg);
        } finally {
            setShiftBusy(false);
        }
    }, [openShift?.shift_id, companyId, refreshShift, refreshAll]);
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setLoading(false);
            router.replace("/auth");
            return;
        }

        if (isLoadingCompany) return;

        if (myRole !== "owner" && myRole !== "admin") {
            setLoading(false);
            router.replace("/work-orders");
            return;
        }

        let cancelled = false;

        (async () => {
            setLoading(true);
            setErrorMsg("");

            try {
                if (!companyId) {
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

                    setRevenueMonth(0);
                    return;
                }

                await Promise.all([
                    refreshAll(companyId),
                    refreshShift(companyId),
                ]);
            } catch (e: any) {
                if (!cancelled) setErrorMsg(e?.message ?? String(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        authLoading,
        user?.id,
        isLoadingCompany,
        companyId,
        myRole,
        refreshAll,
        refreshShift,
        router,
    ]);

    const go = (url: string) => {
        if (companyId && typeof window !== "undefined") {
            localStorage.setItem("activeCompanyId", companyId);
        }
        router.push(url);
    };

    const revenueMonthLabel = loading
        ? "…"
        : `$${revenueMonth.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })}`;

    return (
        <div style={{ padding: 24, maxWidth: 1400 }}>
            <div style={{ marginBottom: 22 }}>
                {mounted && prettyDate ? (
                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                        {prettyDate}
                    </div>
                ) : null}

                <h1
                    style={{
                        fontSize: 32,
                        fontWeight: 700,
                        margin: "0 0 8px 0",
                        letterSpacing: "-0.02em",
                    }}
                >
                    {(companyName && companyName.trim()
                        ? companyName
                        : "Your Business")}{" "}
                    — Control Center
                </h1>

                <div style={{ color: "#6b7280", fontSize: 15 }}>
                    {companyId
                        ? "Live overview of your field operations."
                        : "No company selected."}
                </div>

                {!companyId ? (
                    <button onClick={createCompanyBootstrap} style={primaryButtonStyle}>
                        + Crear Company (Bootstrap)
                    </button>
                ) : null}

                {errorMsg ? (
                    <div
                        style={{
                            marginTop: 14,
                            padding: 12,
                            border: "1px solid #f3caca",
                            background: "#fff5f5",
                            borderRadius: 10,
                            color: "#a40000",
                            fontSize: 13,
                        }}
                    >
                        <b>Error:</b> {errorMsg}
                    </div>
                ) : null}

                {companyId ? (
                    <div
                        style={{
                            marginTop: 16,
                            marginBottom: 8,
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => go("/work-orders")}
                            style={secondaryButtonStyle}
                        >
                            Work Orders
                        </button>

                        <button
                            type="button"
                            onClick={() => go("/settings/team")}
                            style={secondaryButtonStyle}
                        >
                            Team
                        </button>
                    </div>
                ) : null}
                {companyId ? (
                    <div
                        style={{
                            marginTop: 16,
                            marginBottom: 20,
                            padding: 16,
                            border: "1px solid #e5e7eb",
                            borderRadius: 12,
                            background: "#ffffff",
                            maxWidth: 560,
                        }}
                    >
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                            Operational Shift
                        </div>

                        <div style={{ fontSize: 14, color: "#4b5563", marginBottom: 12 }}>
                            {shiftLoading
                                ? "Verificando jornada..."
                                : openShift
                                    ? `Jornada abierta desde ${new Date(openShift.check_in_at).toLocaleString()}`
                                    : "No tienes jornada abierta."}
                        </div>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {!openShift ? (
                                <button
                                    type="button"
                                    onClick={handleCheckIn}
                                    disabled={shiftBusy || shiftLoading}
                                    style={primaryButtonStyle}
                                >
                                    {shiftBusy ? "Procesando..." : "Check-in"}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleCheckOut}
                                    disabled={shiftBusy || shiftLoading}
                                    style={secondaryButtonStyle}
                                >
                                    {shiftBusy ? "Procesando..." : "Check-out"}
                                </button>
                            )}
                        </div>

                        {shiftMsg ? (
                            <div
                                style={{
                                    marginTop: 12,
                                    fontSize: 13,
                                    color: shiftMsg.toLowerCase().includes("error") ? "#a40000" : "#374151",
                                }}
                            >
                                {shiftMsg}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 16,
                    marginBottom: 28,
                }}
            >
                <KpiCard
                    title="Active Work Orders"
                    value={loading ? "…" : String(kpis.activeWorkOrders)}
                    accentColor="#3b82f6"
                    onClick={companyId ? () => go("/work-orders?filter=active") : undefined}
                />

                <KpiCard
                    title="Technicians Working"
                    value={loading ? "…" : String(kpis.techniciansWorking)}
                    accentColor="#10b981"
                />

                <KpiCard
                    title="Delayed Orders"
                    value={loading ? "…" : String(kpis.delayedOrders)}
                    accentColor={kpis.delayedOrders > 0 ? "#ef4444" : undefined}
                    onClick={companyId ? () => go("/work-orders?filter=delayed") : undefined}
                />

                <KpiCard
                    title="Ready to Invoice"
                    value={loading ? "…" : String(kpis.readyToInvoice)}
                    accentColor={kpis.readyToInvoice > 0 ? "#f59e0b" : undefined}
                    onClick={
                        companyId ? () => go("/work-orders?filter=ready_to_invoice") : undefined
                    }
                />

                <KpiCard
                    title="Completed, Not Invoiced"
                    value={loading ? "…" : String(lists.completedNotInvoiced.length)}
                    accentColor={lists.completedNotInvoiced.length > 0 ? "#fbbf24" : undefined}
                    onClick={
                        companyId ? () => go("/work-orders?filter=ready_to_invoice") : undefined
                    }
                />

                <KpiCard
                    title="Revenue This Month"
                    value={revenueMonthLabel}
                    accentColor="#14b8a6"
                />
            </div>

            <section style={{ marginBottom: 28 }}>
                <div style={{ marginBottom: 12 }}>
                    <h2
                        style={{
                            fontSize: 20,
                            fontWeight: 700,
                            margin: 0,
                            letterSpacing: "-0.01em",
                        }}
                    >
                        Attention Today
                    </h2>

                    <div style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
                        Review exceptions and jump into filtered work orders.
                    </div>
                </div>

                {loading ? (
                    <div style={{ color: "#6b7280" }}>Loading…</div>
                ) : !companyId ? (
                    <div style={{ color: "#6b7280" }}>No company selected.</div>
                ) : (
                    <div style={{ display: "grid", gap: 14 }}>
                        <ListBlock
                            title={`Unassigned (${lists.unassigned.length})`}
                            helper="Work orders without technician assignment."
                            onOpen={() => go("/work-orders?filter=unassigned")}
                            items={lists.unassigned.map((x) => ({
                                title: x.job_type,
                                meta: x.work_order_id.slice(0, 8),
                            }))}
                        />

                        <ListBlock
                            title={`In progress > 3 days (${lists.inProgressOld.length})`}
                            helper="Open work orders that may need attention."
                            onOpen={() => go("/work-orders?filter=delayed")}
                            items={lists.inProgressOld.map((x) => ({
                                title: x.job_type,
                                meta: x.work_order_id.slice(0, 8),
                            }))}
                        />

                        <ListBlock
                            title={`Completed, not invoiced (${lists.completedNotInvoiced.length})`}
                            helper="Finished work waiting for invoice action."
                            onOpen={() => go("/work-orders?filter=ready_to_invoice")}
                            items={lists.completedNotInvoiced.map((x) => ({
                                title: x.job_type,
                                meta: x.work_order_id.slice(0, 8),
                            }))}
                        />
                    </div>
                )}
            </section>

            <div style={{ color: "#6b7280", fontSize: 13 }}>
                Control Center is for supervision and navigation. Operational actions
                should happen in Work Orders.
            </div>
        </div>
    );
}

function KpiCard({
    title,
    value,
    onClick,
    accentColor,
}: {
    title: string;
    value: string;
    onClick?: () => void;
    accentColor?: string;
}) {
    const clickable = !!onClick;

    return (
        <div
            onClick={onClick}
            style={{
                padding: 18,
                border: "1px solid #e5e7eb",
                borderLeft: accentColor ? `4px solid ${accentColor}` : "1px solid #e5e7eb",
                borderRadius: 12,
                background: "#fff",
                cursor: clickable ? "pointer" : "default",
                transition: "all 0.15s ease",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
            onMouseEnter={(e) => {
                if (!clickable) return;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.06)";
            }}
            onMouseLeave={(e) => {
                if (!clickable) return;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.03)";
            }}
        >
            <div style={{ fontSize: 14, color: "#6b7280", minHeight: 18 }}>
                {title}
            </div>

            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>{value}</div>

            {clickable ? (
                <div
                    style={{
                        marginTop: 10,
                        fontSize: 13,
                        color: "#111827",
                        fontWeight: 600,
                    }}
                >
                    View →
                </div>
            ) : null}
        </div>
    );
}

function ListBlock({
    title,
    helper,
    items,
    onOpen,
}: {
    title: string;
    helper?: string;
    items: { title: string; meta?: string }[];
    onOpen?: () => void;
}) {
    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                background: "#fafafa",
            }}
        >
            <div
                style={{
                    marginBottom: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                }}
            >
                <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{title}</div>
                    {helper ? (
                        <div style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>
                            {helper}
                        </div>
                    ) : null}
                </div>

                {onOpen ? (
                    <button onClick={onOpen} style={secondaryButtonStyle}>
                        View →
                    </button>
                ) : null}
            </div>

            {items.length === 0 ? (
                <div
                    style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "#fff",
                        border: "1px solid #eee",
                        color: "#6b7280",
                        fontSize: 13,
                    }}
                >
                    Nothing here ✅
                </div>
            ) : (
                <div style={{ display: "grid", gap: 8 }}>
                    {items.map((it, idx) => (
                        <div
                            key={idx}
                            onClick={onOpen ? () => onOpen() : undefined}
                            style={{
                                padding: "10px 12px",
                                background: "#fff",
                                border: "1px solid #eee",
                                borderRadius: 10,
                                cursor: onOpen ? "pointer" : "default",
                                transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                                if (onOpen) e.currentTarget.style.background = "#f4f4f5";
                            }}
                            onMouseLeave={(e) => {
                                if (onOpen) e.currentTarget.style.background = "#fff";
                            }}
                        >
                            <div style={{ fontWeight: 500 }}>{it.title}</div>

                            {it.meta ? (
                                <div
                                    style={{
                                        marginTop: 6,
                                        fontFamily: "monospace",
                                        fontSize: 12,
                                        display: "inline-block",
                                        padding: "2px 6px",
                                        borderRadius: 6,
                                        background: "#f3f4f6",
                                        color: "#374151",
                                    }}
                                >
                                    WO #{it.meta}
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const primaryButtonStyle: React.CSSProperties = {
    marginTop: 12,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600,
};