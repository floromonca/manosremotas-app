"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import {
    fetchAttentionLists,
    fetchControlCenterKpis,
    type AttentionLists,
    type ControlCenterKpis,
    fetchTeamStatusToday,
    type TeamStatusTodayRow,
} from "../../../lib/supabase/controlCenter";
import { useAuthState } from "../../../hooks/useAuthState";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import { checkIn, checkOut, getOpenShift, type ShiftRow } from "../../../lib/supabase/shifts";
import ListBlock from "./components/ListBlock";
import ControlCenterHeader from "./components/ControlCenterHeader";
import ControlCenterKpisSection from "./components/ControlCenterKpis";
import MissingRatesAlert from "./components/MissingRatesAlert";
import AttentionTodayCard from "./components/AttentionTodayCard";
import OperationalShiftCard from "./components/OperationalShiftCard";
import TeamStatusTodayCard from "./components/TeamStatusTodayCard";

type MissingRateAlert = {
    user_id: string;
    full_name: string;
    role: string;
};

export default function ControlCenterPage() {
    const router = useRouter();

    const { user, authLoading } = useAuthState();
    const { companyId, companyName, myRole, isLoadingCompany } = useActiveCompany();

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [revenueMonth, setRevenueMonth] = useState(0);
    const [missingRates, setMissingRates] = useState<MissingRateAlert[]>([]);
    const [loadingAlerts, setLoadingAlerts] = useState(true);

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
    const [teamStatus, setTeamStatus] = useState<TeamStatusTodayRow[]>([]);
    const [teamStatusLoading, setTeamStatusLoading] = useState(false);
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
    useEffect(() => {
        if (!companyId) return;

        async function loadAlerts() {
            setLoadingAlerts(true);

            const { data, error } = await supabase.rpc(
                "get_team_alerts_missing_pay_rates",
                {
                    p_company_id: companyId,
                }
            );

            if (!error && data) {
                setMissingRates(data);
            }

            setLoadingAlerts(false);
        }

        loadAlerts();
    }, [companyId]);

    const refreshAll = useCallback(async (cid: string) => {
        const [k, l] = await Promise.all([
            fetchControlCenterKpis(cid),
            fetchAttentionLists(cid),
        ]);

        setKpis(k);
        setLists(l);
        setTeamStatusLoading(true);
        try {
            const teamRows = await fetchTeamStatusToday(cid);
            setTeamStatus(teamRows);
        } catch (e) {
            console.error("Team status error:", e);
            setTeamStatus([]);
        } finally {
            setTeamStatusLoading(false);
        }
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonthFirstDay = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const { data: revenueData, error: revenueErr } = await supabase
            .from("invoices")
            .select("total, status")
            .eq("company_id", cid)
            .gte("issue_date", firstDay.toISOString().slice(0, 10))
            .lt("issue_date", nextMonthFirstDay.toISOString().slice(0, 10))
            .in("status", ["sent", "partially_paid", "paid", "overdue"]);

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
    const handleCloseTeamShift = useCallback(
        async (shiftId: string, technicianName: string, elapsedLabel: string) => {
            if (!companyId) return;

            const confirmed = window.confirm(
                `This shift for ${technicianName} has been open for ${elapsedLabel}. Close it now?`
            );

            if (!confirmed) return;

            setTeamStatusLoading(true);

            try {
                const { data, error } = await supabase
                    .from("shifts")
                    .update({ check_out_at: new Date().toISOString() })
                    .eq("company_id", companyId)
                    .eq("shift_id", shiftId)
                    .is("check_out_at", null)
                    .select("shift_id, user_id, check_in_at, check_out_at")
                    .maybeSingle();

                if (error) throw error;

                if (!data) {
                    console.warn("No shift was closed. Possible RLS or no matching open shift.", {
                        shiftId,
                        companyId,
                    });
                    alert("No shift was closed. This may be blocked by permissions or the shift is no longer open.");
                    return;
                }

                console.log("Closed shift:", data);
                await refreshAll(companyId);

                setTeamStatus((prev) =>
                    prev.map((t) =>
                        t.shift_id === shiftId
                            ? {
                                ...t,
                                is_on_shift: false,
                                check_out_at: new Date().toISOString(),
                            }
                            : t
                    )
                );
            } catch (e: any) {
                console.error("Close team shift error:", e);
                alert(e?.message || "Could not close shift.");
            } finally {
                setTeamStatusLoading(false);
            }
        },
        [companyId, refreshAll]
    );
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
                    maxWidth: 1180,
                    margin: "0 auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 28,
                }}
            >
                <ControlCenterHeader
                    companyName={companyName}
                    onOpenWorkOrders={() => go("/work-orders")}
                    onOpenInvoices={() => go("/invoices")}
                />

                <ControlCenterKpisSection
                    loading={loading}
                    kpis={kpis}
                    revenueMonthLabel={revenueMonthLabel}
                    onOpenWorkOrders={() => go("/work-orders")}
                    onOpenInvoices={() => go("/invoices")}
                />
                {!loadingAlerts ? (
                    <MissingRatesAlert
                        missingRates={missingRates}
                        onOpenTechnician={(userId) => go(`/settings/team/${userId}`)}
                    />
                ) : null}
                <TeamStatusTodayCard
                    rows={teamStatus}
                    loading={teamStatusLoading}
                    onCloseShift={handleCloseTeamShift}
                />
                <section className="controlCenterBottomGrid">

                    <AttentionTodayCard
                        lists={lists}
                        onOpenWorkOrders={() => go("/work-orders")}
                        onOpenInvoices={() => go("/invoices")}
                    />

                    <OperationalShiftCard
                        openShift={openShift}
                        shiftBusy={shiftBusy}
                        onCheckIn={handleCheckIn}
                        onCheckOut={handleCheckOut}
                    />
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
                <style jsx>{`
    .controlCenterBottomGrid {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(320px, 1fr);
        gap: 24px;
        align-items: start;
    }

    @media (max-width: 1100px) {
        .controlCenterBottomGrid {
            grid-template-columns: 1fr;
        }
    }
`}</style>
            </div>
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