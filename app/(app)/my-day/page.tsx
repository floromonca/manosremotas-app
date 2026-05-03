"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthState } from "../../../hooks/useAuthState";
import { useActiveCompany } from "../../../hooks/useActiveCompany";

import { fetchWorkOrders, safeStatus } from "../../../lib/supabase/workOrders";
import { MR_THEME } from "../../../lib/theme";
import ShiftStatusCard from "./components/ShiftStatusCard";
import CurrentWorkCard from "./components/CurrentWorkCard";
import TodayAtAGlanceCard from "./components/TodayAtAGlanceCard";
import RecentWorkOrdersCard from "./components/RecentWorkOrdersCard";

import {
    checkIn,
    checkOut,
    formatDurationHHMMSS,
    getOpenShift,
    getTodayShiftSummary,
    type ShiftRow,
    type ShiftSummary,
} from "../../../lib/supabase/shifts";

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
    const searchParams = useSearchParams();
    const returnTo = searchParams.get("returnTo");
    const { user, authLoading } = useAuthState();
    const { companyId, companyName, isLoadingCompany } = useActiveCompany();

    const [loading, setLoading] = useState(true);
    const [openShift, setOpenShift] = useState<ShiftRow | null>(null);

    const [shiftBusy, setShiftBusy] = useState(false);
    const [shiftMsg, setShiftMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [mounted, setMounted] = useState(false);
    const [prettyDate, setPrettyDate] = useState("");
    const [shiftElapsed, setShiftElapsed] = useState("00:00:00");
    const [todayShiftSummary, setTodayShiftSummary] = useState<ShiftSummary | null>(null);
    const [shiftSummaryLoading, setShiftSummaryLoading] = useState(false);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [workOrdersLoading, setWorkOrdersLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
        setPrettyDate(new Date().toLocaleDateString());
    }, []);

    useEffect(() => {
        if (!openShift?.check_in_at) {
            setShiftElapsed("00:00:00");
            return;
        }

        const updateElapsed = () => {
            const start = new Date(openShift.check_in_at).getTime();
            const now = Date.now();
            const diffMs = Math.max(0, now - start);

            const totalSeconds = Math.floor(diffMs / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const hh = String(hours).padStart(2, "0");
            const mm = String(minutes).padStart(2, "0");
            const ss = String(seconds).padStart(2, "0");

            setShiftElapsed(`${hh}:${mm}:${ss}`);
        };

        updateElapsed();
        const interval = window.setInterval(updateElapsed, 1000);

        return () => window.clearInterval(interval);
    }, [openShift?.check_in_at]);

    const refreshShift = useCallback(async (cid: string) => {
        const { data, error } = await getOpenShift(cid);
        if (error) throw error;
        setOpenShift((data as ShiftRow | null) ?? null);
    }, []);

    const refreshTodayShiftSummary = useCallback(async (cid: string) => {
        setShiftSummaryLoading(true);
        try {
            const summary = await getTodayShiftSummary(cid);
            setTodayShiftSummary(summary);
        } finally {
            setShiftSummaryLoading(false);
        }
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
                await refreshTodayShiftSummary(companyId);
                await refreshWorkOrders(companyId);
            } catch (e: any) {
                if (!cancelled) {
                    setErrorMsg(e?.message ?? String(e));
                }
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
        refreshShift,
        refreshTodayShiftSummary,
        refreshWorkOrders,
        router,
        user,
    ]);

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
            await refreshTodayShiftSummary(companyId);

            if (returnTo) {
                router.replace(returnTo);
            }
        } catch (e: any) {
            setErrorMsg(e?.message ?? String(e));
        } finally {
            setShiftBusy(false);
        }
    }, [companyId, refreshTodayShiftSummary, returnTo, router]);

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
            await refreshTodayShiftSummary(companyId);
        } catch (e: any) {
            setErrorMsg(e?.message ?? String(e));
        } finally {
            setShiftBusy(false);
        }
    }, [companyId, openShift?.shift_id, refreshShift, refreshTodayShiftSummary]);

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

    const workedTodayLabel = useMemo(() => {
        if (!todayShiftSummary) return "00:00:00";
        return formatDurationHHMMSS(todayShiftSummary.totalSeconds);
    }, [todayShiftSummary]);

    const operationalMessage = openShift
        ? "You are checked in and ready to operate."
        : "Shift is closed. You can review your work, but actions are disabled until you start your shift.";

    const currentWork =
        myRows.find((w) => w.status === "in_progress") ??
        myRows.find((w) => w.status === "new") ??
        null;

    const currentWorkMessage = currentWork
        ? openShift
            ? "You can continue this work order now."
            : "Start your shift to operate this work order."
        : "No active work right now.";

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
        <div
            style={{
                width: "100%",
                maxWidth: 1180,
                margin: "0 auto",
                padding: "8px 16px 32px 16px",
            }}
        >
            <div
                style={{
                    marginBottom: 14,
                    paddingBottom: 14,
                    borderBottom: `1px solid ${MR_THEME.colors.border}`,
                }}
            >
                {mounted && prettyDate ? (
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: MR_THEME.colors.textSecondary,
                            marginBottom: 8,
                        }}
                    >
                        {prettyDate}
                    </div>
                ) : null}

                <h1
                    style={{
                        fontSize: 34,
                        lineHeight: 1.05,
                        fontWeight: 900,
                        letterSpacing: "-0.03em",
                        color: MR_THEME.colors.textPrimary,
                        margin: 0,
                    }}
                >
                    My Day
                </h1>

                <div
                    style={{
                        marginTop: 8,
                        fontSize: 15,
                        color: MR_THEME.colors.textSecondary,
                        lineHeight: 1.5,
                        maxWidth: 760,
                    }}
                >
                    {companyName?.trim()
                        ? `${companyName} — your operational hub for the day`
                        : "Your operational hub for the day."}
                </div>
            </div>

            {errorMsg ? (
                <div
                    style={{
                        marginBottom: 16,
                        padding: "12px 14px",
                        border: "1px solid #fecaca",
                        background: "#fff5f5",
                        borderRadius: MR_THEME.radius.control,
                        color: MR_THEME.colors.danger,
                        fontSize: 14,
                        fontWeight: 700,
                    }}
                >
                    <strong>Error:</strong> {errorMsg}
                </div>
            ) : null}

            <div style={{ display: "grid", gap: 18 }}>
                <ShiftStatusCard
                    loading={loading}
                    companyId={companyId}
                    openShift={openShift}
                    operationalMessage={operationalMessage}
                    shiftElapsed={shiftElapsed}
                    shiftSummaryLoading={shiftSummaryLoading}
                    workedTodayLabel={workedTodayLabel}
                    shiftBusy={shiftBusy}
                    shiftMsg={shiftMsg}
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                    onViewWorkOrders={() => router.push("/work-orders")}
                />

                <CurrentWorkCard
                    currentWork={currentWork}
                    currentWorkMessage={currentWorkMessage}
                    openShift={!!openShift}
                    shiftBusy={shiftBusy}
                    loading={loading}
                    companyId={companyId}
                    onResumeWork={(workOrderId) => router.push(`/work-orders/${workOrderId}`)}
                    onStartShift={handleCheckIn}
                />

                <TodayAtAGlanceCard
                    loading={workOrdersLoading}
                    assignedCount={assignedCount}
                    inProgressCount={inProgressCount}
                    completedCount={completedCount}
                />

                <RecentWorkOrdersCard
                    rows={recentWorkRows}
                    onOpenWorkOrder={(workOrderId) => router.push(`/work-orders/${workOrderId}`)}
                />
            </div>
        </div>
    );
}