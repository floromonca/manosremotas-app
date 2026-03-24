"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "../../hooks/useAuthState";
import { useActiveCompany } from "../../hooks/useActiveCompany";
import { checkIn, checkOut, getOpenShift, type ShiftRow } from "../../lib/supabase/shifts";
import { fetchWorkOrders, safeStatus } from "../../lib/supabase/workOrders";


type WorkOrder = {
    work_order_id: string;
    job_type?: string | null;
    customer_name?: string | null;
    service_address?: string | null;
    status: "new" | "in_progress" | "resolved" | "closed";
    assigned_to?: string | null;
};


export default function MyDayPage() {
    const router = useRouter();
    const { user, authLoading } = useAuthState();
    const { companyId, companyName, isLoadingCompany } = useActiveCompany();

    const [loading, setLoading] = useState(true);
    const [openShift, setOpenShift] = useState<ShiftRow | null>(null);
    const [shiftBusy, setShiftBusy] = useState(false);
    const [shiftMsg, setShiftMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [mounted, setMounted] = useState(false);
    const [prettyDate, setPrettyDate] = useState("");
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [workOrdersLoading, setWorkOrdersLoading] = useState(false);


    useEffect(() => {
        setMounted(true);
        setPrettyDate(new Date().toLocaleDateString());
    }, []);

    const refreshShift = useCallback(async (cid: string) => {
        const { data, error } = await getOpenShift(cid);
        if (error) throw error;
        setOpenShift((data as ShiftRow | null) ?? null);
    }, []);

    const refreshWorkOrders = useCallback(async (cid: string) => {
        setWorkOrdersLoading(true);
        try {
            const { data, error } = await fetchWorkOrders(cid);
            if (error) throw error;

            const mapped = (data ?? []).map((r: any) => ({
                work_order_id: r.work_order_id,
                job_type: r.job_type ?? null,
                customer_name: r.customer_name ?? null,
                service_address: r.service_address ?? null,
                status: safeStatus(r.status),
                assigned_to: r.assigned_to ?? null,
            })) as WorkOrder[];

            setWorkOrders(mapped);
        } catch (e) {
            setWorkOrders([]);
        } finally {
            setWorkOrdersLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setLoading(false);
            router.replace("/auth");
            return;
        }

        if (isLoadingCompany) return;

        let cancelled = false;

        (async () => {
            setLoading(true);
            setErrorMsg("");
            setShiftMsg("");

            try {
                if (!companyId) {
                    setOpenShift(null);
                    return;
                }

                await refreshShift(companyId);
                await refreshWorkOrders(companyId);

            } catch (e: any) {
                if (!cancelled) {
                    setErrorMsg(e?.message ?? String(e));
                    setOpenShift(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [authLoading, user?.id, isLoadingCompany, companyId, refreshShift, router, user]);

    const handleCheckIn = useCallback(async () => {
        if (!companyId) return;

        setShiftBusy(true);
        setShiftMsg("");
        setErrorMsg("");

        try {
            const { data, error } = await checkIn(companyId);
            if (error) throw error;

            setOpenShift((data as ShiftRow) ?? null);
            setShiftMsg("Shift started successfully.");
        } catch (e: any) {
            setErrorMsg(e?.message ?? String(e));
        } finally {
            setShiftBusy(false);
        }
    }, [companyId]);

    const handleCheckOut = useCallback(async () => {
        if (!companyId || !openShift?.shift_id) return;

        setShiftBusy(true);
        setShiftMsg("");
        setErrorMsg("");

        try {
            const { error } = await checkOut(openShift.shift_id);
            if (error) throw error;

            setShiftMsg("Shift ended successfully.");
            await refreshShift(companyId);
        } catch (e: any) {
            setErrorMsg(e?.message ?? String(e));
        } finally {
            setShiftBusy(false);
        }
    }, [companyId, openShift?.shift_id, refreshShift]);

    const myRows = useMemo(() => {
        const uid = user?.id ?? null;
        if (!uid) return [];
        return workOrders.filter((w) => w.assigned_to === uid);
    }, [workOrders, user?.id]);

    const assignedCount = myRows.filter((w) => w.status === "new").length;
    const inProgressCount = myRows.filter((w) => w.status === "in_progress").length;
    const completedCount = myRows.filter(
        (w) => w.status === "resolved" || w.status === "closed"
    ).length;

    const currentWork =
        myRows.find((w) => w.status === "in_progress") ??
        myRows.find((w) => w.status === "new") ??
        null;
    const recentWorkRows = [...myRows]
        .sort((a, b) => {
            const rank = (status: WorkOrder["status"]) => {
                if (status === "in_progress") return 0;
                if (status === "new") return 1;
                if (status === "resolved") return 2;
                return 3;
            };

            return rank(a.status) - rank(b.status);
        })
        .slice(0, 3);

    return (
        <div style={{ padding: 24, maxWidth: 980 }}>
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
                    My Day
                </h1>

                <div style={{ color: "#6b7280", fontSize: 15 }}>
                    {companyName?.trim()
                        ? `${companyName} — your operational hub for the day`
                        : "Your operational hub for the day."}
                </div>
            </div>

            {errorMsg ? (
                <div
                    style={{
                        marginBottom: 16,
                        padding: 12,
                        border: "1px solid #fecaca",
                        background: "#fff5f5",
                        borderRadius: 10,
                        color: "#991b1b",
                        fontSize: 13,
                    }}
                >
                    <b>Error:</b> {errorMsg}
                </div>
            ) : null}

            <div
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    background: "#ffffff",
                    padding: 20,
                    marginBottom: 18,
                }}
            >
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                    Shift
                </div>

                <div style={{ fontSize: 14, color: "#4b5563", marginBottom: 14 }}>
                    {loading
                        ? "Checking shift..."
                        : !companyId
                            ? "No company selected."
                            : openShift
                                ? `Shift active — checked in at ${new Date(openShift.check_in_at).toLocaleString()}`
                                : "Shift closed — you are not checked in yet."}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {!openShift ? (
                        <button
                            type="button"
                            onClick={handleCheckIn}
                            disabled={shiftBusy || loading || !companyId}
                            style={primaryButtonStyle}
                        >
                            {shiftBusy ? "Processing..." : "Start shift"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleCheckOut}
                            disabled={shiftBusy || loading}
                            style={secondaryButtonStyle}
                        >
                            {shiftBusy ? "Processing..." : "End shift"}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => router.push("/work-orders")}
                        style={secondaryButtonStyle}
                    >
                        Go to Work Orders
                    </button>
                </div>

                {shiftMsg ? (
                    <div
                        style={{
                            marginTop: 12,
                            fontSize: 13,
                            color: "#374151",
                        }}
                    >
                        {shiftMsg}
                    </div>
                ) : null}
            </div>

            <div
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    background: "#ffffff",
                    padding: 20,
                }}
            >
                <div
                    style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        background: "#ffffff",
                        padding: 20,
                        marginBottom: 18,
                    }}
                >
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                        Current work
                    </div>

                    {!currentWork ? (
                        <div style={{ color: "#6b7280", fontSize: 14 }}>
                            No active work right now.
                        </div>
                    ) : (
                        <>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                    gap: 12,
                                    marginTop: 14,
                                }}
                            >
                                <div
                                    style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 14,
                                        padding: 16,
                                        background: "#fcfcfd",
                                    }}
                                >
                                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                        Job type
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
                                        {currentWork.job_type || "Work order"}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 14,
                                        padding: 16,
                                        background: "#fcfcfd",
                                    }}
                                >
                                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                        Customer
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
                                        {currentWork.customer_name || "—"}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 14,
                                        padding: 16,
                                        background: "#fcfcfd",
                                    }}
                                >
                                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                        Location
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
                                        {currentWork.service_address || "—"}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 14,
                                        padding: 16,
                                        background: "#fcfcfd",
                                    }}
                                >
                                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                        Status
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
                                        {currentWork.status.replaceAll("_", " ")}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: 14 }}>
                                <button
                                    type="button"
                                    onClick={() => router.push(`/work-orders/${currentWork.work_order_id}`)}
                                    style={secondaryButtonStyle}
                                >
                                    Open work order
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div
                    style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        background: "#ffffff",
                        padding: 20,
                        marginBottom: 18,
                    }}
                >
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                        Today at a glance
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: 12,
                            marginTop: 14,
                        }}
                    >
                        <div
                            style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 14,
                                padding: 16,
                                background: "#fcfcfd",
                            }}
                        >
                            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                Assigned
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: "#111827" }}>
                                {workOrdersLoading ? "…" : assignedCount}
                            </div>
                        </div>

                        <div
                            style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 14,
                                padding: 16,
                                background: "#fcfcfd",
                            }}
                        >
                            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                In progress
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: "#111827" }}>
                                {workOrdersLoading ? "…" : inProgressCount}
                            </div>
                        </div>

                        <div
                            style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 14,
                                padding: 16,
                                background: "#fcfcfd",
                            }}
                        >
                            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                Completed
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: "#111827" }}>
                                {workOrdersLoading ? "…" : completedCount}
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        background: "#ffffff",
                        padding: 20,
                    }}
                >
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                        Recent work orders
                    </div>

                    {recentWorkRows.length === 0 ? (
                        <div style={{ color: "#6b7280", fontSize: 14 }}>
                            No recent work orders.
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                            {recentWorkRows.map((wo) => (
                                <div
                                    key={wo.work_order_id}
                                    style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 14,
                                        padding: 16,
                                        background: "#fcfcfd",
                                        display: "grid",
                                        gridTemplateColumns: "1.2fr 1fr 0.8fr auto",
                                        gap: 12,
                                        alignItems: "center",
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                                            Job type
                                        </div>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
                                            {wo.job_type || "Work order"}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                                            Customer
                                        </div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                                            {wo.customer_name || "—"}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                                            Status
                                        </div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                                            {wo.status.replaceAll("_", " ")}
                                        </div>
                                    </div>

                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/work-orders/${wo.work_order_id}`)}
                                            style={secondaryButtonStyle}
                                        >
                                            Open
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>



            </div>
        </div>
    );
}

const primaryButtonStyle: React.CSSProperties = {
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
