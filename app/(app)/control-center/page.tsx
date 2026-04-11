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
        <div
            style={{
                minHeight: "100vh",
                background: "#f8fafc",
                padding: 24,
            }}
        >
            <div
                style={{
                    maxWidth: 1280,
                    margin: "0 auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 28,
                }}
            >
                <section
                    style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 18,
                        padding: 24,
                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 20,
                            flexWrap: "wrap",
                        }}
                    >
                        <div style={{ minWidth: 280, flex: 1 }}>
                            <div
                                style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    letterSpacing: "-0.01em",
                                    color: "#2563eb",
                                    marginBottom: 8,
                                    lineHeight: 1.2,
                                }}
                            >
                                {companyName || "ManosRemotas"}
                            </div>

                            <h1
                                style={{
                                    margin: 0,
                                    fontSize: 32,
                                    lineHeight: 1.1,
                                    fontWeight: 800,
                                    color: "#0f172a",
                                }}
                            >
                                Control Center
                            </h1>

                            <p
                                style={{
                                    margin: "10px 0 0 0",
                                    fontSize: 15,
                                    lineHeight: 1.6,
                                    color: "#475569",
                                    maxWidth: 760,
                                }}
                            >
                                Daily visibility across work orders, field activity,
                                invoicing, and team operations.
                            </p>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                                alignItems: "center",
                            }}
                        >
                            <button
                                onClick={() => go("/work-orders")}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 10,
                                    border: "1px solid #2563eb",
                                    background: "#2563eb",
                                    color: "#ffffff",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    boxShadow: "0 1px 2px rgba(37, 99, 235, 0.18)",
                                }}
                            >
                                Open Work Orders
                            </button>

                            <button
                                onClick={() => go("/invoices")}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 10,
                                    border: "1px solid #dbeafe",
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                }}
                            >
                                Open Invoices
                            </button>
                        </div>
                    </div>
                </section>

                <section
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 16,
                    }}
                >
                    <KpiCard
                        title="Active Work Orders"
                        value={loading ? "…" : String(kpis.activeWorkOrders)}
                        accentColor="#2563eb"
                        onClick={() => go("/work-orders")}
                    />
                    <KpiCard
                        title="Technicians Working"
                        value={loading ? "…" : String(kpis.techniciansWorking)}
                        accentColor="#16a34a"
                    />
                    <KpiCard
                        title="Delayed Orders"
                        value={loading ? "…" : String(kpis.delayedOrders)}
                        accentColor="#f59e0b"
                        onClick={() => go("/work-orders")}
                    />
                    <KpiCard
                        title="Ready to Invoice"
                        value={loading ? "…" : String(kpis.readyToInvoice)}
                        accentColor="#0ea5e9"
                        onClick={() => go("/invoices")}
                    />
                    <KpiCard
                        title="Revenue This Month"
                        value={loading ? "…" : revenueMonthLabel}
                        accentColor="#7c3aed"
                        onClick={() => go("/invoices")}
                    />
                </section>

                <section
                    style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 1fr)",
                        gap: 24,
                        alignItems: "start",
                    }}
                >
                    <div
                        style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: 18,
                            padding: 22,
                            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                        }}
                    >
                        <div style={{ marginBottom: 18 }}>
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: 20,
                                    fontWeight: 700,
                                    color: "#0f172a",
                                }}
                            >
                                Attention Today
                            </h2>
                            <p
                                style={{
                                    margin: "6px 0 0 0",
                                    fontSize: 14,
                                    color: "#64748b",
                                    lineHeight: 1.5,
                                }}
                            >
                                Priority items that may require action from office or
                                operations.
                            </p>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                            <ListBlock
                                title={`Unassigned (${lists.unassigned.length})`}
                                helper="Work orders without technician assignment."
                                onOpen={() => go("/work-orders")}
                                items={lists.unassigned.slice(0, 4).map((x) => ({
                                    title: x.job_type,
                                    meta: x.work_order_id.slice(0, 8),
                                }))}
                            />

                            <ListBlock
                                title={`In Progress Too Long (${lists.inProgressOld.length})`}
                                helper="Open work orders that may need attention."
                                onOpen={() => go("/work-orders")}
                                items={lists.inProgressOld.slice(0, 4).map((x) => ({
                                    title: x.job_type,
                                    meta: x.work_order_id.slice(0, 8),
                                }))}
                            />

                            <ListBlock
                                title={`Completed, Not Invoiced (${lists.completedNotInvoiced.length})`}
                                helper="Finished work waiting for invoice action."
                                onOpen={() => go("/invoices")}
                                items={lists.completedNotInvoiced.slice(0, 4).map((x) => ({
                                    title: x.job_type,
                                    meta: x.work_order_id.slice(0, 8),
                                }))}
                            />
                        </div>
                    </div>

                    <div
                        style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: 18,
                            padding: 22,
                            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 18,
                        }}
                    >
                        <div>
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: 20,
                                    fontWeight: 700,
                                    color: "#0f172a",
                                }}
                            >
                                Operational Shift
                            </h2>
                            <p
                                style={{
                                    margin: "6px 0 0 0",
                                    fontSize: 14,
                                    color: "#64748b",
                                    lineHeight: 1.5,
                                }}
                            >
                                Track your current shift status directly from Control
                                Center.
                            </p>
                        </div>

                        <div
                            style={{
                                display: "inline-flex",
                                alignSelf: "flex-start",
                                padding: "7px 12px",
                                borderRadius: 999,
                                fontSize: 13,
                                fontWeight: 700,
                                background: openShift ? "#dcfce7" : "#e2e8f0",
                                color: openShift ? "#166534" : "#475569",
                            }}
                        >
                            {openShift ? "On Shift" : "Off Shift"}
                        </div>

                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                                color: "#334155",
                                fontSize: 14,
                                lineHeight: 1.6,
                            }}
                        >
                            {openShift ? (
                                <>
                                    <div>
                                        <strong>Started:</strong>{" "}
                                        {new Date(openShift.check_in_at).toLocaleString()}
                                    </div>
                                    {openShift.note ? (
                                        <div>
                                            <strong>Note:</strong> {openShift.note}
                                        </div>
                                    ) : null}
                                </>
                            ) : (
                                <div>
                                    No active shift right now. Start your shift when
                                    you begin supervising or operating work.
                                </div>
                            )}
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                            }}
                        >
                            {openShift ? (
                                <button
                                    onClick={handleCheckOut}
                                    disabled={shiftBusy}
                                    style={{
                                        padding: "10px 14px",
                                        borderRadius: 10,
                                        border: "1px solid #dc2626",
                                        background: "#dc2626",
                                        color: "#ffffff",
                                        cursor: shiftBusy ? "not-allowed" : "pointer",
                                        fontWeight: 700,
                                        opacity: shiftBusy ? 0.7 : 1,
                                    }}
                                >
                                    {shiftBusy ? "Checking out..." : "Check Out"}
                                </button>
                            ) : (
                                <button
                                    onClick={handleCheckIn}
                                    disabled={shiftBusy}
                                    style={{
                                        padding: "10px 14px",
                                        borderRadius: 10,
                                        border: "1px solid #2563eb",
                                        background: "#2563eb",
                                        color: "#ffffff",
                                        cursor: shiftBusy ? "not-allowed" : "pointer",
                                        fontWeight: 700,
                                        opacity: shiftBusy ? 0.7 : 1,
                                    }}
                                >
                                    {shiftBusy ? "Checking in..." : "Check In"}
                                </button>
                            )}

                            <button
                                onClick={() => go("/my-day")}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 10,
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    color: "#0f172a",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                }}
                            >
                                Open My Day
                            </button>
                        </div>
                    </div>
                </section>

                <div
                    style={{
                        fontSize: 13,
                        color: "#64748b",
                        padding: "0 4px",
                    }}
                >
                    ManosRemotas gives you a live view of work orders, team activity,
                    and invoicing in one place.
                </div>
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
                padding: 20,
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                background: "#ffffff",
                cursor: clickable ? "pointer" : "default",
                transition: "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 118,
                position: "relative",
                overflow: "hidden",
            }}
            onMouseEnter={(e) => {
                if (!clickable) return;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 24px rgba(15, 23, 42, 0.08)";
                e.currentTarget.style.borderColor = "#cbd5e1";
            }}
            onMouseLeave={(e) => {
                if (!clickable) return;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
                e.currentTarget.style.borderColor = "#e2e8f0";
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: accentColor || "#e2e8f0",
                }}
            />

            <div
                style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#64748b",
                    lineHeight: 1.4,
                    paddingTop: 2,
                }}
            >
                {title}
            </div>

            <div
                style={{
                    fontSize: 38,
                    lineHeight: 1,
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                }}
            >
                {value}
            </div>

            {clickable ? (
                <div
                    style={{
                        marginTop: "auto",
                        fontSize: 13,
                        color: "#0f172a",
                        fontWeight: 700,
                    }}
                >
                    View →
                </div>
            ) : (
                <div style={{ marginTop: "auto", height: 18 }} />
            )}
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
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            style={{
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                background: "#f8fafc",
                overflow: "hidden",
            }}
        >
            <div
                onClick={() => setExpanded((v) => !v)}
                style={{
                    width: "100%",
                    padding: 16,
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        flexWrap: "wrap",
                    }}
                >
                    <div style={{ minWidth: 220 }}>
                        <div
                            style={{
                                fontWeight: 700,
                                fontSize: 20,
                                color: "#0f172a",
                                lineHeight: 1.2,
                            }}
                        >
                            {title}
                        </div>

                        {helper ? (
                            <div
                                style={{
                                    marginTop: 6,
                                    fontSize: 13,
                                    color: "#64748b",
                                    lineHeight: 1.5,
                                }}
                            >
                                {helper}
                            </div>
                        ) : null}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginLeft: "auto",
                        }}
                    >
                        {onOpen ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpen();
                                }}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 10,
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    color: "#0f172a",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                View →
                            </button>
                        ) : null}

                        <div
                            style={{
                                fontSize: 18,
                                color: "#64748b",
                                fontWeight: 700,
                                lineHeight: 1,
                                padding: "6px 4px",
                                minWidth: 18,
                                textAlign: "center",
                            }}
                        >
                            {expanded ? "−" : "+"}
                        </div>
                    </div>
                </div>
            </div>

            {expanded ? (
                <div style={{ padding: "0 16px 16px 16px" }}>
                    {items.length === 0 ? (
                        <div
                            style={{
                                padding: "14px 16px",
                                borderRadius: 12,
                                background: "#ffffff",
                                border: "1px dashed #cbd5e1",
                                color: "#64748b",
                                fontSize: 13,
                            }}
                        >
                            Nothing here right now.
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                            {items.map((it, idx) => (
                                <div
                                    key={idx}
                                    onClick={onOpen ? () => onOpen() : undefined}
                                    style={{
                                        padding: "14px 16px",
                                        background: "#ffffff",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: 12,
                                        cursor: onOpen ? "pointer" : "default",
                                        transition:
                                            "background 0.15s ease, border-color 0.15s ease, transform 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!onOpen) return;
                                        e.currentTarget.style.background = "#f8fafc";
                                        e.currentTarget.style.borderColor = "#cbd5e1";
                                        e.currentTarget.style.transform = "translateY(-1px)";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!onOpen) return;
                                        e.currentTarget.style.background = "#ffffff";
                                        e.currentTarget.style.borderColor = "#e2e8f0";
                                        e.currentTarget.style.transform = "translateY(0)";
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            fontSize: 15,
                                            color: "#0f172a",
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        {it.title}
                                    </div>

                                    {it.meta ? (
                                        <div
                                            style={{
                                                marginTop: 8,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                padding: "4px 8px",
                                                borderRadius: 999,
                                                background: "#f1f5f9",
                                                color: "#475569",
                                                fontFamily: "monospace",
                                                fontSize: 12,
                                                fontWeight: 600,
                                            }}
                                        >
                                            WO {it.meta}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}
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