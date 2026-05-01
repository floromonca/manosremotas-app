"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type CSSProperties,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";
import { useAuthState } from "../../../../../hooks/useAuthState";
import { useActiveCompany } from "../../../../../hooks/useActiveCompany";
import MemberHeader from "./components/MemberHeader";
import MemberBasicInfoCard from "./components/MemberBasicInfoCard";
import MemberWorkSummaryCard from "./components/MemberWorkSummaryCard";
import MemberAttendanceCard from "./components/MemberAttendanceCard";
import MemberHoursPayCard from "./components/MemberHoursPayCard";
import MemberHoursStats from "./components/MemberHoursStats";
import MemberPayRateCard from "./components/MemberPayRateCard";
import MemberShiftHistoryCard from "./components/MemberShiftHistoryCard";

import {
    getLastShiftForUser,
    getOpenShiftForUser,
    getTodayShiftSummaryForUser,
    getWeekShiftSummaryForUser,
    formatDurationHHMMSS,
    type ShiftRow,
    type ShiftSummary,
} from "../../../../../lib/supabase/shifts";
import {
    formatDateTime,
    formatShortDate,
    formatDateInput,
    formatTime,
    formatHours,
    formatMoney,
    humanRole,
    isOvernightShift,
} from "./memberDetailUtils";
import {
    cardStyle,
    sectionTitleStyle,
    sectionTitleStyleNoMargin,
    mutedTextStyle,
    statsGridStyle,
    historyGridStyle,
    runningBadgeStyle,
    overnightBadgeStyle,
    compactRunningBadgeStyle,
    compactClosedBadgeStyle,
    inputStyle,
} from "./memberDetailStyles";

type MemberProfileRow = {
    full_name: string | null;
    email: string | null;
    role: "owner" | "admin" | "tech" | "viewer";
};

type MemberHoursSummaryRow = {
    total_shifts: number | null;
    closed_hours: number | null;
    running_hours: number | null;
    display_hours: number | null;
    hourly_rate: number | null;
    currency_code: string | null;
    estimated_pay_closed: number | null;
    estimated_pay_display: number | null;
};

type MemberShiftDetailRow = {
    shift_id: string;
    check_in_at: string | null;
    check_out_at: string | null;
    closed_hours: number | null;
    running_hours: number | null;
    display_hours: number | null;
    hourly_rate: number | null;
    currency_code: string | null;
    estimated_pay_display: number | null;
    note: string | null;
};

type MemberPayRateRow = {
    company_id: string;
    user_id: string;
    hourly_rate: number | null;
    currency_code: string | null;
    effective_from: string | null;
    effective_to: string | null;
    created_at: string | null;
};



export default function TeamMemberDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, authLoading } = useAuthState();
    const { companyId, companyName, myRole, isLoadingCompany } =
        useActiveCompany();

    const memberId = (params as { memberId?: string })?.memberId ?? "";

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
    const [fullNameInput, setFullNameInput] = useState("");
    const [roleInput, setRoleInput] = useState<
        "owner" | "admin" | "tech" | "viewer"
    >("tech");
    const [savingBasicInfo, setSavingBasicInfo] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    const [memberProfile, setMemberProfile] = useState<MemberProfileRow | null>(
        null
    );
    const [memberEmail, setMemberEmail] = useState<string>("—");
    const [openShift, setOpenShift] = useState<ShiftRow | null>(null);
    const [lastShift, setLastShift] = useState<ShiftRow | null>(null);
    const [todaySummary, setTodaySummary] = useState<ShiftSummary | null>(null);
    const [weekSummary, setWeekSummary] = useState<ShiftSummary | null>(null);

    const [hoursSummary, setHoursSummary] =
        useState<MemberHoursSummaryRow | null>(null);
    const [shiftHistory, setShiftHistory] = useState<MemberShiftDetailRow[]>([]);
    const [loadingHoursPay, setLoadingHoursPay] = useState(true);

    const [activePayRate, setActivePayRate] = useState<MemberPayRateRow | null>(
        null
    );
    const [loadingPayRate, setLoadingPayRate] = useState(true);
    const [payRateInput, setPayRateInput] = useState("");
    const [currencyInput, setCurrencyInput] = useState("CAD");
    const [effectiveFromInput, setEffectiveFromInput] = useState(
        new Date().toISOString().slice(0, 10)
    );
    const [savingPayRate, setSavingPayRate] = useState(false);

    const canEditPayRate = myRole === "owner" || myRole === "admin";

    const refreshData = useCallback(async (cid: string, uid: string) => {
        const [
            memberRes,
            openShiftRes,
            lastShiftRes,
            todayShiftSummary,
            weekShiftSummary,
        ] = await Promise.all([
            supabase
                .from("company_members")
                .select("full_name, email, role")
                .eq("company_id", cid)
                .eq("user_id", uid)
                .maybeSingle(),
            getOpenShiftForUser(cid, uid),
            getLastShiftForUser(cid, uid),
            getTodayShiftSummaryForUser(cid, uid),
            getWeekShiftSummaryForUser(cid, uid),
        ]);

        if (memberRes.error) throw memberRes.error;
        if (openShiftRes.error) throw openShiftRes.error;
        if (lastShiftRes.error) throw lastShiftRes.error;

        const profileRow = (memberRes.data as MemberProfileRow | null) ?? null;
        let fallbackEmail: string | null = null;

        if (!profileRow?.email) {
            const { data: profileEmailRow, error: profileEmailErr } = await supabase
                .from("profiles")
                .select("email")
                .eq("company_id", cid)
                .eq("user_id", uid)
                .maybeSingle();

            if (profileEmailErr) {
                console.warn("Could not load fallback email from profiles:", profileEmailErr.message);
            } else {
                fallbackEmail = profileEmailRow?.email ?? null;
            }
        }

        setMemberProfile(profileRow);
        setFullNameInput(profileRow?.full_name ?? "");
        setRoleInput(
            (profileRow?.role ?? "tech") as "owner" | "admin" | "tech" | "viewer"
        );

        setOpenShift((openShiftRes.data as ShiftRow | null) ?? null);
        setLastShift((lastShiftRes.data as ShiftRow | null) ?? null);
        setTodaySummary(todayShiftSummary);
        setWeekSummary(weekShiftSummary);

        const resolvedEmail =
            profileRow?.email ||
            fallbackEmail ||
            "—";

        setMemberEmail(resolvedEmail);
    }, []);

    const refreshHoursPay = useCallback(async (cid: string, uid: string) => {
        setLoadingHoursPay(true);

        try {
            const startDate = "2000-01-01";
            const endDate = new Date().toISOString().slice(0, 10);

            const [summaryRes, detailsRes] = await Promise.all([
                supabase.rpc("get_member_hours_summary", {
                    p_company_id: cid,
                    p_user_id: uid,
                    p_start_date: startDate,
                    p_end_date: endDate,
                }),
                supabase.rpc("get_member_shift_details", {
                    p_company_id: cid,
                    p_user_id: uid,
                    p_start_date: startDate,
                    p_end_date: endDate,
                }),
            ]);

            if (summaryRes.error) throw summaryRes.error;
            if (detailsRes.error) throw detailsRes.error;

            const summaryRow = Array.isArray(summaryRes.data)
                ? ((summaryRes.data[0] as MemberHoursSummaryRow | undefined) ??
                    null)
                : ((summaryRes.data as MemberHoursSummaryRow | null) ?? null);

            const detailRows = Array.isArray(detailsRes.data)
                ? (detailsRes.data as MemberShiftDetailRow[])
                : [];

            setHoursSummary(summaryRow);
            setShiftHistory(detailRows);
        } finally {
            setLoadingHoursPay(false);
        }
    }, []);

    const refreshPayRate = useCallback(async (cid: string, uid: string) => {
        setLoadingPayRate(true);

        try {
            const { data, error } = await supabase
                .from("member_pay_rates")
                .select(
                    "company_id, user_id, hourly_rate, currency_code, effective_from, effective_to, created_at"
                )
                .eq("company_id", cid)
                .eq("user_id", uid)
                .is("effective_to", null)
                .order("effective_from", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            const row = (data as MemberPayRateRow | null) ?? null;

            setActivePayRate(row);
            setPayRateInput(
                row?.hourly_rate != null ? String(row.hourly_rate) : ""
            );
            setCurrencyInput(row?.currency_code?.trim() || "CAD");
            setEffectiveFromInput(
                formatDateInput(row?.effective_from) !== "—"
                    ? formatDateInput(row?.effective_from)
                    : new Date().toISOString().slice(0, 10)
            );
        } finally {
            setLoadingPayRate(false);
        }
    }, []);

    const saveBasicInfo = useCallback(async () => {
        if (!companyId || !memberId) return;

        setSavingBasicInfo(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const nextFullName = fullNameInput.trim();

            const { data, error } = await supabase
                .from("company_members")
                .update({
                    full_name: nextFullName || null,
                    role: roleInput,
                })
                .eq("company_id", companyId)
                .eq("user_id", memberId)
                .select("user_id, company_id, full_name, role");

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error("Member update did not affect any row.");
            }

            await refreshData(companyId, memberId);
            setIsEditingBasicInfo(false);
            setSuccessMsg("Member updated successfully.");
        } catch (e: any) {
            setErrorMsg(e?.message ?? "Could not update member.");
        } finally {
            setSavingBasicInfo(false);
        }
    }, [companyId, memberId, fullNameInput, roleInput, refreshData]);

    const deactivateMember = useCallback(async () => {
        if (!companyId || !memberId) return;

        const confirmed = window.confirm(
            "Deactivate this member? They will be removed from active team views, but historical records will be kept."
        );

        if (!confirmed) return;

        setErrorMsg("");
        setSuccessMsg("");

        try {
            const { data: openShift, error: openShiftError } = await supabase
                .from("shifts")
                .select("shift_id")
                .eq("company_id", companyId)
                .eq("user_id", memberId)
                .is("check_out_at", null)
                .maybeSingle();

            if (openShiftError) throw openShiftError;

            if (openShift) {
                setErrorMsg(
                    "Cannot deactivate a member with an open shift. Ask them to check out first."
                );
                return;
            }

            const { error } = await supabase
                .from("company_members")
                .update({ active: false })
                .eq("company_id", companyId)
                .eq("user_id", memberId);

            if (error) throw error;

            setSuccessMsg("Member deactivated successfully.");
            router.push("/settings/team");
        } catch (e: any) {
            setErrorMsg(e?.message ?? "Could not deactivate member.");
        }
    }, [companyId, memberId, router]);

    const savePayRate = useCallback(async () => {
        if (!companyId || !memberId || !canEditPayRate) return;

        setSavingPayRate(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const parsedHourlyRate = Number(payRateInput);

            if (!Number.isFinite(parsedHourlyRate) || parsedHourlyRate <= 0) {
                throw new Error("Enter a valid hourly rate greater than 0.");
            }

            const nextCurrency = currencyInput.trim().toUpperCase();
            if (!nextCurrency || nextCurrency.length !== 3) {
                throw new Error("Currency must be a 3-letter code like CAD.");
            }

            if (!effectiveFromInput) {
                throw new Error("Effective from date is required.");
            }

            if (activePayRate) {
                const previousEndDate = new Date(`${effectiveFromInput}T00:00:00`);
                previousEndDate.setDate(previousEndDate.getDate() - 1);
                const previousEndDateStr = previousEndDate.toISOString().slice(0, 10);

                const { error: closePreviousError } = await supabase
                    .from("member_pay_rates")
                    .update({
                        effective_to: previousEndDateStr,
                    })
                    .eq("company_id", companyId)
                    .eq("user_id", memberId)
                    .is("effective_to", null);

                if (closePreviousError) throw closePreviousError;
            }

            const { error: insertError } = await supabase
                .from("member_pay_rates")
                .insert({
                    company_id: companyId,
                    user_id: memberId,
                    hourly_rate: parsedHourlyRate,
                    currency_code: nextCurrency,
                    effective_from: effectiveFromInput,
                    effective_to: null,
                });

            if (insertError) throw insertError;

            await Promise.all([
                refreshPayRate(companyId, memberId),
                refreshHoursPay(companyId, memberId),
            ]);

            setSuccessMsg("Pay rate saved successfully.");
        } catch (e: any) {
            setErrorMsg(e?.message ?? "Could not save pay rate.");
        } finally {
            setSavingPayRate(false);
        }
    }, [
        companyId,
        memberId,
        canEditPayRate,
        payRateInput,
        currencyInput,
        effectiveFromInput,
        activePayRate,
        refreshPayRate,
        refreshHoursPay,
    ]);

    useEffect(() => {
        if (authLoading || isLoadingCompany) return;

        if (!user || !companyId || !memberId) {
            setLoading(false);
            setLoadingHoursPay(false);
            setLoadingPayRate(false);
            return;
        }

        if (myRole !== "owner" && myRole !== "admin") {
            setErrorMsg("You do not have access to this page.");
            setLoading(false);
            setLoadingHoursPay(false);
            setLoadingPayRate(false);
            return;
        }

        let cancelled = false;

        (async () => {
            setLoading(true);
            setErrorMsg("");

            try {
                await Promise.all([
                    refreshData(companyId, memberId),
                    refreshHoursPay(companyId, memberId),
                    refreshPayRate(companyId, memberId),
                ]);
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
        isLoadingCompany,
        user,
        companyId,
        memberId,
        myRole,
        refreshData,
        refreshHoursPay,
        refreshPayRate,
    ]);

    const workedTodayLabel = useMemo(() => {
        return formatDurationHHMMSS(todaySummary?.totalSeconds ?? 0);
    }, [todaySummary]);

    const workedWeekLabel = useMemo(() => {
        return formatDurationHHMMSS(weekSummary?.totalSeconds ?? 0);
    }, [weekSummary]);

    const lastCheckOutLabel = useMemo(() => {
        if (openShift && !openShift.check_out_at) return "Open shift";

        const value = todaySummary?.lastCheckOut ?? lastShift?.check_out_at ?? null;
        return formatDateTime(value);
    }, [openShift, todaySummary, lastShift]);

    const displayName = memberProfile?.full_name?.trim() || "Team member";

    const currencyCode =
        activePayRate?.currency_code?.trim() ||
        hoursSummary?.currency_code?.trim() ||
        "CAD";

    return (
        <div style={{ padding: 24, maxWidth: 980 }}>
            <MemberHeader
                displayName={displayName}
                companyName={companyName}
            />

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

            {successMsg ? (
                <div
                    style={{
                        marginBottom: 16,
                        padding: 12,
                        border: "1px solid #bbf7d0",
                        background: "#f0fdf4",
                        borderRadius: 10,
                        color: "#166534",
                        fontSize: 13,
                    }}
                >
                    {successMsg}
                </div>
            ) : null}

            <div style={{ display: "grid", gap: 18 }}>
                <MemberBasicInfoCard
                    loading={loading}
                    isEditingBasicInfo={isEditingBasicInfo}
                    memberProfile={memberProfile}
                    displayName={displayName}
                    memberEmail={memberEmail}
                    companyName={companyName}
                    fullNameInput={fullNameInput}
                    roleInput={roleInput}
                    savingBasicInfo={savingBasicInfo}
                    onDeactivateMember={deactivateMember}
                    onStartEdit={() => {
                        setSuccessMsg("");
                        setIsEditingBasicInfo(true);
                        setFullNameInput(memberProfile?.full_name ?? "");
                        setRoleInput((memberProfile?.role ?? "tech") as "owner" | "admin" | "tech" | "viewer");
                    }}
                    onFullNameChange={setFullNameInput}
                    onRoleChange={setRoleInput}
                    onSaveBasicInfo={saveBasicInfo}
                    onCancelEdit={() => {
                        setIsEditingBasicInfo(false);
                        setFullNameInput(memberProfile?.full_name ?? "");
                        setRoleInput((memberProfile?.role ?? "tech") as "owner" | "admin" | "tech" | "viewer");
                        setSuccessMsg("");
                    }}
                />

                <MemberWorkSummaryCard
                    loading={loading}
                    hasOpenShift={Boolean(openShift)}
                    workedTodayLabel={workedTodayLabel}
                    workedWeekLabel={workedWeekLabel}
                />

                <MemberAttendanceCard
                    loading={loading}
                    lastCheckInLabel={formatDateTime(
                        todaySummary?.lastCheckIn ??
                        lastShift?.check_in_at ??
                        null
                    )}
                    lastCheckOutLabel={lastCheckOutLabel}
                    shiftsTodayCount={todaySummary?.shiftCount ?? 0}
                    shiftsWeekCount={weekSummary?.shiftCount ?? 0}
                />
                <MemberHoursPayCard loadingHoursPay={loadingHoursPay}>
                    <div style={{ display: "grid", gap: 16 }}>
                        <MemberHoursStats
                            hoursSummary={hoursSummary}
                            currencyCode={currencyCode}
                        />

                        <MemberPayRateCard
                            loadingPayRate={loadingPayRate}
                            activePayRate={activePayRate}
                            payRateInput={payRateInput}
                            currencyInput={currencyInput}
                            effectiveFromInput={effectiveFromInput}
                            canEditPayRate={canEditPayRate}
                            savingPayRate={savingPayRate}
                            onPayRateInputChange={setPayRateInput}
                            onCurrencyInputChange={setCurrencyInput}
                            onEffectiveFromInputChange={setEffectiveFromInput}
                            onSavePayRate={savePayRate}
                        />

                    </div>
                </MemberHoursPayCard>

                <MemberShiftHistoryCard
                    loading={loadingHoursPay}
                    shiftHistory={shiftHistory}
                    currencyCode={currencyCode}
                />
            </div>
        </div>
    );
}


