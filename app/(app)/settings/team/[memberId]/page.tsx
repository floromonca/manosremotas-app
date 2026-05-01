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
            <button
                onClick={() => router.push("/settings/team")}
                style={{
                    marginBottom: 18,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                }}
            >
                ← Back to Team
            </button>

            <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                    Settings / Team
                </div>

                <h1
                    style={{
                        fontSize: 32,
                        fontWeight: 700,
                        margin: "0 0 8px 0",
                        letterSpacing: "-0.02em",
                    }}
                >
                    {displayName}
                </h1>

                <div style={{ color: "#6b7280", fontSize: 15 }}>
                    Administrative view of this team member in{" "}
                    {companyName || "your company"}.
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
                <section style={cardStyle}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            marginBottom: 12,
                        }}
                    >
                        {!loading && !isEditingBasicInfo ? (
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                {memberProfile?.role !== "owner" ? (
                                    <button
                                        type="button"
                                        onClick={deactivateMember}
                                        style={{
                                            padding: "8px 12px",
                                            borderRadius: 8,
                                            border: "1px solid #fecaca",
                                            background: "#fff5f5",
                                            color: "#991b1b",
                                            cursor: "pointer",
                                            fontWeight: 700,
                                        }}
                                    >
                                        Deactivate member
                                    </button>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSuccessMsg("");
                                        setIsEditingBasicInfo(true);
                                        setFullNameInput(memberProfile?.full_name ?? "");
                                        setRoleInput(
                                            (memberProfile?.role ?? "tech") as
                                            | "owner"
                                            | "admin"
                                            | "tech"
                                            | "viewer"
                                        );
                                    }}
                                    style={{
                                        padding: "8px 12px",
                                        borderRadius: 8,
                                        border: "1px solid #d1d5db",
                                        background: "#fff",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                    }}
                                >
                                    Edit
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {loading ? (
                        <div style={mutedTextStyle}>Loading member profile...</div>
                    ) : isEditingBasicInfo ? (
                        <div style={{ display: "grid", gap: 16 }}>
                            <div
                                style={{
                                    display: "grid",
                                    gap: 12,
                                    gridTemplateColumns:
                                        "minmax(0, 1fr) 220px",
                                }}
                            >
                                <label
                                    style={{
                                        display: "grid",
                                        gap: 6,
                                        fontSize: 13,
                                        color: "#374151",
                                        fontWeight: 600,
                                    }}
                                >
                                    Full name
                                    <input
                                        value={fullNameInput}
                                        onChange={(e) =>
                                            setFullNameInput(e.target.value)
                                        }
                                        placeholder="Enter full name"
                                        style={{
                                            padding: "10px 12px",
                                            borderRadius: 10,
                                            border: "1px solid #d1d5db",
                                            outline: "none",
                                            fontSize: 14,
                                            background: "#fff",
                                        }}
                                    />
                                </label>

                                <label
                                    style={{
                                        display: "grid",
                                        gap: 6,
                                        fontSize: 13,
                                        color: "#374151",
                                        fontWeight: 600,
                                    }}
                                >
                                    Role
                                    <select
                                        value={roleInput}
                                        onChange={(e) =>
                                            setRoleInput(
                                                e.target.value as
                                                | "owner"
                                                | "admin"
                                                | "tech"
                                                | "viewer"
                                            )
                                        }
                                        style={{
                                            padding: "10px 12px",
                                            borderRadius: 10,
                                            border: "1px solid #d1d5db",
                                            outline: "none",
                                            fontSize: 14,
                                            background: "#fff",
                                        }}
                                    >
                                        <option value="owner">owner</option>
                                        <option value="admin">admin</option>
                                        <option value="tech">tech</option>
                                        <option value="viewer">viewer</option>
                                    </select>
                                </label>
                            </div>

                            <div style={statsGridStyle}>
                                <InfoCard label="Email" value={memberEmail} />
                                <InfoCard
                                    label="Company"
                                    value={companyName || "—"}
                                />
                            </div>

                            <div style={{ display: "flex", gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={saveBasicInfo}
                                    disabled={savingBasicInfo}
                                    style={{
                                        padding: "10px 14px",
                                        borderRadius: 10,
                                        border: "1px solid #111827",
                                        background: "#111827",
                                        color: "#fff",
                                        cursor: savingBasicInfo
                                            ? "default"
                                            : "pointer",
                                        fontWeight: 700,
                                        opacity: savingBasicInfo ? 0.7 : 1,
                                    }}
                                >
                                    {savingBasicInfo ? "Saving..." : "Save"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditingBasicInfo(false);
                                        setFullNameInput(
                                            memberProfile?.full_name ?? ""
                                        );
                                        setRoleInput(
                                            (memberProfile?.role ?? "tech") as
                                            | "owner"
                                            | "admin"
                                            | "tech"
                                            | "viewer"
                                        );
                                        setSuccessMsg("");
                                    }}
                                    disabled={savingBasicInfo}
                                    style={{
                                        padding: "10px 14px",
                                        borderRadius: 10,
                                        border: "1px solid #d1d5db",
                                        background: "#fff",
                                        cursor: savingBasicInfo
                                            ? "default"
                                            : "pointer",
                                        fontWeight: 600,
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={statsGridStyle}>
                            <InfoCard label="Full name" value={displayName} />
                            <InfoCard label="Email" value={memberEmail} />
                            <InfoCard
                                label="Role"
                                value={humanRole(memberProfile?.role)}
                            />
                            <InfoCard
                                label="Company"
                                value={companyName || "—"}
                            />
                        </div>
                    )}
                </section>

                <section style={cardStyle}>
                    <div style={sectionTitleStyle}>Work summary</div>

                    {loading ? (
                        <div style={mutedTextStyle}>Loading work summary...</div>
                    ) : (
                        <div style={statsGridStyle}>
                            <InfoCard
                                label="Active shift"
                                value={openShift ? "Yes" : "No"}
                            />
                            <InfoCard
                                label="Worked today"
                                value={workedTodayLabel}
                            />
                            <InfoCard
                                label="Worked this week"
                                value={workedWeekLabel}
                            />
                            <InfoCard
                                label="Current status"
                                value={openShift ? "Checked in" : "Off shift"}
                            />
                        </div>
                    )}
                </section>

                <section style={cardStyle}>
                    <div style={sectionTitleStyle}>Attendance</div>

                    {loading ? (
                        <div style={mutedTextStyle}>Loading attendance...</div>
                    ) : (
                        <div style={statsGridStyle}>
                            <InfoCard
                                label="Last check-in"
                                value={formatDateTime(
                                    todaySummary?.lastCheckIn ??
                                    lastShift?.check_in_at ??
                                    null
                                )}
                            />
                            <InfoCard
                                label="Last check-out"
                                value={lastCheckOutLabel}
                            />
                            <InfoCard
                                label="Shifts today"
                                value={String(todaySummary?.shiftCount ?? 0)}
                            />
                            <InfoCard
                                label="Shifts this week"
                                value={String(weekSummary?.shiftCount ?? 0)}
                            />
                        </div>
                    )}
                </section>

                <section style={cardStyle}>
                    <div style={sectionTitleStyle}>Hours & Pay</div>

                    {loadingHoursPay ? (
                        <div style={mutedTextStyle}>Loading hours and pay...</div>
                    ) : (
                        <div style={{ display: "grid", gap: 16 }}>
                            <div style={statsGridStyle}>
                                <InfoCard
                                    label="Closed hours"
                                    value={formatHours(hoursSummary?.closed_hours)}
                                />
                                <InfoCard
                                    label="Running hours"
                                    value={formatHours(hoursSummary?.running_hours)}
                                />
                                <InfoCard
                                    label="Visible hours"
                                    value={formatHours(hoursSummary?.display_hours)}
                                />
                                <InfoCard
                                    label="Hourly rate"
                                    value={
                                        hoursSummary?.hourly_rate != null
                                            ? formatMoney(
                                                hoursSummary.hourly_rate,
                                                currencyCode
                                            )
                                            : "Rate not set"
                                    }
                                />
                                <InfoCard
                                    label="Estimated pay (closed)"
                                    value={
                                        hoursSummary?.hourly_rate != null
                                            ? formatMoney(
                                                hoursSummary?.estimated_pay_closed,
                                                currencyCode
                                            )
                                            : "Rate not set"
                                    }
                                />
                                <InfoCard
                                    label="Estimated pay (visible)"
                                    value={
                                        hoursSummary?.hourly_rate != null
                                            ? formatMoney(
                                                hoursSummary?.estimated_pay_display,
                                                currencyCode
                                            )
                                            : "Rate not set"
                                    }
                                />
                            </div>

                            <div
                                style={{
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 14,
                                    padding: 16,
                                    background: "#fcfcfd",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: 12,
                                        flexWrap: "wrap",
                                        marginBottom: 14,
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontSize: 15,
                                                fontWeight: 700,
                                                color: "#111827",
                                                marginBottom: 4,
                                            }}
                                        >
                                            Pay rate
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                color: "#6b7280",
                                            }}
                                        >
                                            Configure the hourly rate used for
                                            payroll calculations.
                                        </div>
                                    </div>

                                    {loadingPayRate ? (
                                        <div style={mutedTextStyle}>
                                            Loading pay rate...
                                        </div>
                                    ) : activePayRate ? (
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "#374151",
                                                background: "#fff",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: 999,
                                                padding: "6px 10px",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Active:{" "}
                                            {formatMoney(
                                                activePayRate.hourly_rate,
                                                activePayRate.currency_code
                                            )}{" "}
                                            since{" "}
                                            {formatDateInput(
                                                activePayRate.effective_from
                                            )}
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "#92400e",
                                                background: "#fffbeb",
                                                border: "1px solid #fde68a",
                                                borderRadius: 999,
                                                padding: "6px 10px",
                                                fontWeight: 600,
                                            }}
                                        >
                                            No active pay rate
                                        </div>
                                    )}
                                </div>

                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "repeat(3, minmax(0, 1fr))",
                                        gap: 12,
                                    }}
                                >
                                    <label
                                        style={{
                                            display: "grid",
                                            gap: 6,
                                            fontSize: 13,
                                            color: "#374151",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Hourly rate
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={payRateInput}
                                            onChange={(e) =>
                                                setPayRateInput(e.target.value)
                                            }
                                            disabled={
                                                !canEditPayRate || savingPayRate
                                            }
                                            placeholder="28.00"
                                            style={inputStyle(
                                                !canEditPayRate || savingPayRate
                                            )}
                                        />
                                    </label>

                                    <label
                                        style={{
                                            display: "grid",
                                            gap: 6,
                                            fontSize: 13,
                                            color: "#374151",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Currency
                                        <input
                                            value={currencyInput}
                                            onChange={(e) =>
                                                setCurrencyInput(
                                                    e.target.value.toUpperCase()
                                                )
                                            }
                                            disabled={
                                                !canEditPayRate || savingPayRate
                                            }
                                            maxLength={3}
                                            placeholder="CAD"
                                            style={inputStyle(
                                                !canEditPayRate || savingPayRate
                                            )}
                                        />
                                    </label>

                                    <label
                                        style={{
                                            display: "grid",
                                            gap: 6,
                                            fontSize: 13,
                                            color: "#374151",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Effective from
                                        <input
                                            type="date"
                                            value={effectiveFromInput}
                                            onChange={(e) =>
                                                setEffectiveFromInput(
                                                    e.target.value
                                                )
                                            }
                                            disabled={
                                                !canEditPayRate || savingPayRate
                                            }
                                            style={inputStyle(
                                                !canEditPayRate || savingPayRate
                                            )}
                                        />
                                    </label>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: 12,
                                        flexWrap: "wrap",
                                        marginTop: 14,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: "#6b7280",
                                        }}
                                    >
                                        {canEditPayRate
                                            ? "Saving a new rate preserves payroll history by creating a new effective record."
                                            : "Only owners and admins can edit pay rates."}
                                    </div>

                                    {canEditPayRate ? (
                                        <button
                                            type="button"
                                            onClick={savePayRate}
                                            disabled={savingPayRate}
                                            style={{
                                                padding: "10px 14px",
                                                borderRadius: 10,
                                                border: "1px solid #111827",
                                                background: "#111827",
                                                color: "#fff",
                                                cursor: savingPayRate
                                                    ? "default"
                                                    : "pointer",
                                                fontWeight: 700,
                                                opacity: savingPayRate
                                                    ? 0.7
                                                    : 1,
                                            }}
                                        >
                                            {savingPayRate
                                                ? "Saving..."
                                                : "Save rate"}
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                <section style={cardStyle}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            marginBottom: 14,
                            flexWrap: "wrap",
                        }}
                    >
                        <div style={sectionTitleStyleNoMargin}>Shift history</div>
                        <div style={{ fontSize: 13, color: "#6b7280" }}>
                            {loadingHoursPay
                                ? "Loading history..."
                                : `${shiftHistory.length} shift${shiftHistory.length === 1 ? "" : "s"
                                }`}
                        </div>
                    </div>

                    {loadingHoursPay ? (
                        <div style={mutedTextStyle}>Loading shift history...</div>
                    ) : shiftHistory.length === 0 ? (
                        <div style={mutedTextStyle}>
                            No shift history found for this member.
                        </div>
                    ) : (
                        <div
                            style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 14,
                                overflow: "hidden",
                                background: "#fff",
                            }}
                        >
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "1.35fr 1fr 1fr 0.9fr 0.9fr 1fr 0.9fr",
                                    gap: 0,
                                    background: "#f8fafc",
                                    borderBottom: "1px solid #e5e7eb",
                                }}
                            >
                                {[
                                    "Date",
                                    "Check-in",
                                    "Check-out",
                                    "Hours",
                                    "Rate",
                                    "Pay",
                                    "Status",
                                ].map((label) => (
                                    <div
                                        key={label}
                                        style={{
                                            padding: "11px 12px",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.03em",
                                        }}
                                    >
                                        {label}
                                    </div>
                                ))}
                            </div>

                            {shiftHistory.slice(0, 5).map((shift, index) => {
                                const running = !shift.check_out_at;
                                const payValue =
                                    shift.hourly_rate != null
                                        ? formatMoney(
                                            shift.estimated_pay_display,
                                            shift.currency_code || currencyCode
                                        )
                                        : "Rate not set";

                                return (
                                    <div
                                        key={shift.shift_id}
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "1.2fr 1fr 1fr 0.8fr 0.8fr 0.9fr 0.8fr",
                                            gap: 0,
                                            borderBottom:
                                                index === Math.min(shiftHistory.length, 5) - 1
                                                    ? "none"
                                                    : "1px solid #e5e7eb",
                                            background: index % 2 === 0 ? "#fff" : "#fafafa",
                                            cursor: "default",
                                        }}
                                    >
                                        <div
                                            style={{
                                                padding: "12px",
                                                fontSize: 14,
                                                fontWeight: 600,
                                                color: "#111827",
                                            }}
                                        >
                                            {formatShortDate(shift.check_in_at)}
                                        </div>

                                        <div
                                            style={{
                                                padding: "12px",
                                                fontSize: 14,
                                                color: "#111827",
                                            }}
                                        >
                                            {formatTime(shift.check_in_at)}
                                        </div>

                                        <div
                                            style={{
                                                padding: "12px",
                                                fontSize: 14,
                                                color: "#111827",
                                            }}
                                        >
                                            {running ? "Running" : formatTime(shift.check_out_at)}
                                        </div>

                                        <div
                                            style={{
                                                padding: "12px",
                                                fontSize: 14,
                                                color: "#111827",
                                                textAlign: "right",
                                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                            }}
                                        >
                                            {formatHours(shift.display_hours)}
                                        </div>

                                        <div
                                            style={{
                                                padding: "12px",
                                                fontSize: 14,
                                                color: "#111827",
                                                textAlign: "right",
                                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                            }}
                                        >
                                            {shift.hourly_rate != null
                                                ? formatMoney(
                                                    shift.hourly_rate,
                                                    shift.currency_code || currencyCode
                                                )
                                                : "—"}
                                        </div>

                                        <div
                                            style={{
                                                padding: "12px",
                                                fontSize: 14,
                                                fontWeight: 600,
                                                color: "#111827",
                                                textAlign: "right",
                                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                            }}
                                        >
                                            {payValue}
                                        </div>

                                        <div
                                            style={{
                                                padding: "12px",
                                                display: "flex",
                                                alignItems: "center",
                                            }}
                                        >
                                            <span
                                                style={
                                                    running
                                                        ? compactRunningBadgeStyle
                                                        : compactClosedBadgeStyle
                                                }
                                            >
                                                {running ? "Running" : "Closed"}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 16,
                background: "#fff",
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginBottom: 8,
                    fontWeight: 600,
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#111827",
                    lineHeight: 1.2,
                }}
            >
                {value}
            </div>
        </div>
    );
}

function InfoCardSmall({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                background: "#fff",
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    color: "#6b7280",
                    marginBottom: 6,
                    fontWeight: 700,
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#111827",
                    lineHeight: 1.2,
                }}
            >
                {value}
            </div>
        </div>
    );
}

