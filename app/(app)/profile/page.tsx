"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuthState } from "../../../hooks/useAuthState";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import {
    getLastShift,
    getOpenShift,
    getTodayShiftSummary,
    getWeekShiftSummary,
    formatDurationHHMMSS,
    type ShiftRow,
    type ShiftSummary,
} from "../../../lib/supabase/shifts";

type MembershipProfileRow = {
    full_name: string | null;
    role: "owner" | "admin" | "tech" | "viewer";
};
type HoursSummaryRow = {
    total_shifts: number;
    closed_hours: number;
    running_hours: number;
    display_hours: number;
    hourly_rate: number;
    currency_code: string;
    estimated_pay_closed: number;
    estimated_pay_display: number;
};

type ShiftDetailRow = {
    shift_id: string;
    check_in_at: string;
    check_out_at: string | null;
    closed_hours: number;
    running_hours: number;
    display_hours: number;
    hourly_rate: number;
    currency_code: string;
    estimated_pay_closed: number;
    estimated_pay_display: number;
    note: string | null;
};
function formatDateTime(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString();
}

function humanRole(role: string | null | undefined) {
    if (!role) return "—";
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    if (role === "tech") return "Technician";
    if (role === "viewer") return "Viewer";
    return role;
}

export default function ProfilePage() {
    const { user, authLoading } = useAuthState();
    const { companyId, companyName, myRole, isLoadingCompany } = useActiveCompany();
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [memberProfile, setMemberProfile] = useState<MembershipProfileRow | null>(null);
    const [weekHoursSummary, setWeekHoursSummary] = useState<HoursSummaryRow | null>(null);
    const [shiftDetails, setShiftDetails] = useState<ShiftDetailRow[]>([]);

    const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
    const [fullNameInput, setFullNameInput] = useState("");
    const [savingBasicInfo, setSavingBasicInfo] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [openShift, setOpenShift] = useState<ShiftRow | null>(null);
    const [lastShift, setLastShift] = useState<ShiftRow | null>(null);
    const [todaySummary, setTodaySummary] = useState<ShiftSummary | null>(null);
    const [weekSummary, setWeekSummary] = useState<ShiftSummary | null>(null);

    const refreshProfileData = useCallback(async (cid: string, uid: string) => {
        const now = new Date();

        const weekStart = new Date(now);
        const day = weekStart.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        weekStart.setDate(weekStart.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const startDate = weekStart.toISOString().slice(0, 10);
        const endDate = weekEnd.toISOString().slice(0, 10);

        const [
            memberRes,
            openShiftRes,
            lastShiftRes,
            todayShiftSummary,
            weekShiftSummary,
            weekHoursSummaryRes,
            shiftDetailsRes,
        ] = await Promise.all([
            supabase
                .from("company_members")
                .select("full_name, role")
                .eq("company_id", cid)
                .eq("user_id", uid)
                .maybeSingle(),
            getOpenShift(cid),
            getLastShift(cid),
            getTodayShiftSummary(cid),
            getWeekShiftSummary(cid),
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
        if (memberRes.error) throw memberRes.error;
        if (openShiftRes.error) throw openShiftRes.error;
        if (lastShiftRes.error) throw lastShiftRes.error;
        if (weekHoursSummaryRes.error) throw weekHoursSummaryRes.error;
        if (shiftDetailsRes.error) throw shiftDetailsRes.error;

        const profileRow = (memberRes.data as MembershipProfileRow | null) ?? null;

        setMemberProfile(profileRow);
        setFullNameInput(profileRow?.full_name ?? "");
        setOpenShift((openShiftRes.data as ShiftRow | null) ?? null);
        setLastShift((lastShiftRes.data as ShiftRow | null) ?? null);
        setTodaySummary(todayShiftSummary);
        setWeekHoursSummary(
            ((weekHoursSummaryRes.data as HoursSummaryRow[] | null)?.[0] ?? null)
        );

        setShiftDetails((shiftDetailsRes.data as ShiftDetailRow[] | null) ?? []);
        setWeekSummary(weekShiftSummary);
    }, []);

    const saveBasicInfo = useCallback(async () => {
        if (!companyId || !user?.id) return;

        setSavingBasicInfo(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const nextFullName = fullNameInput.trim();
            const { data, error } = await supabase
                .from("company_members")
                .update({
                    full_name: nextFullName || null,
                })
                .eq("company_id", companyId)
                .eq("user_id", user.id)
                .select("user_id, company_id, full_name");

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error("Profile update did not affect any row. Check RLS or membership match.");
            }

            await refreshProfileData(companyId, user.id);
            setIsEditingBasicInfo(false);
            setSuccessMsg("Profile updated successfully.");
        } catch (e: any) {
            setErrorMsg(e?.message ?? "Could not update profile.");
        } finally {
            setSavingBasicInfo(false);
        }
    }, [companyId, user?.id, fullNameInput, refreshProfileData]);

    useEffect(() => {
        if (authLoading || isLoadingCompany) return;

        if (!user || !companyId) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        (async () => {
            setLoading(true);
            setErrorMsg("");

            try {
                await refreshProfileData(companyId, user.id);
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
    }, [authLoading, isLoadingCompany, user?.id, companyId, refreshProfileData, user]);

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

    const profileName =
        memberProfile?.full_name?.trim() ||
        user?.email?.split("@")[0] ||
        "Team member";

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 1180,
                margin: "0 auto",
                padding: "8px 0 32px 0",
            }}
        >
            <div
                style={{
                    marginBottom: 22,
                    paddingBottom: 16,
                    borderBottom: "1px solid #e5e7eb",
                }}
            >
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#6b7280",
                        marginBottom: 10,
                    }}
                >
                    My account
                </div>

                <h1
                    style={{
                        fontSize: 40,
                        lineHeight: 1.05,
                        fontWeight: 800,
                        letterSpacing: "-0.03em",
                        color: "#111827",
                        margin: 0,
                    }}
                >
                    Profile
                </h1>

                <div
                    style={{
                        marginTop: 10,
                        fontSize: 16,
                        color: "#6b7280",
                        lineHeight: 1.6,
                        maxWidth: 760,
                    }}
                >
                    Your personal and work summary in ManosRemotas.
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
            <div
                style={{
                    display: "grid",
                    gap: 18,
                }}
            >
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
                        <div style={sectionTitleStyle}>Basic information</div>

                        {!loading && !isEditingBasicInfo ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSuccessMsg("");
                                    setIsEditingBasicInfo(true);
                                    setFullNameInput(memberProfile?.full_name ?? "");
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
                        ) : null}
                    </div>

                    {loading ? (
                        <div style={mutedTextStyle}>Loading profile...</div>
                    ) : isEditingBasicInfo ? (
                        <div style={{ display: "grid", gap: 16 }}>
                            <div style={{ maxWidth: 420 }}>
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
                                        onChange={(e) => setFullNameInput(e.target.value)}
                                        placeholder="Enter your full name"
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
                            </div>

                            <div style={statsGridStyle}>
                                <InfoCard label="Email" value={user?.email ?? "—"} />
                                <InfoCard label="Role" value={humanRole(memberProfile?.role ?? myRole)} />
                                <InfoCard label="Company" value={companyName || "—"} />
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
                                        cursor: savingBasicInfo ? "default" : "pointer",
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
                                        setFullNameInput(memberProfile?.full_name ?? "");
                                        setSuccessMsg("");
                                    }}
                                    disabled={savingBasicInfo}
                                    style={{
                                        padding: "10px 14px",
                                        borderRadius: 10,
                                        border: "1px solid #d1d5db",
                                        background: "#fff",
                                        cursor: savingBasicInfo ? "default" : "pointer",
                                        fontWeight: 600,
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={statsGridStyle}>
                            <InfoCard label="Full name" value={profileName} />
                            <InfoCard label="Email" value={user?.email ?? "—"} />
                            <InfoCard label="Role" value={humanRole(memberProfile?.role ?? myRole)} />
                            <InfoCard label="Company" value={companyName || "—"} />
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
                <section style={{ display: "grid", gap: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                        Hours & Pay
                    </h2>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: 12,
                        }}
                    >
                        <InfoCard
                            label="Closed hours this week"
                            value={
                                weekHoursSummary
                                    ? `${weekHoursSummary.closed_hours.toFixed(2)} h`
                                    : "—"
                            }
                        />

                        <InfoCard
                            label="Running hours"
                            value={
                                weekHoursSummary
                                    ? `${weekHoursSummary.running_hours.toFixed(2)} h`
                                    : "—"
                            }
                        />

                        <InfoCard
                            label="Visible hours"
                            value={
                                weekHoursSummary
                                    ? `${weekHoursSummary.display_hours.toFixed(2)} h`
                                    : "—"
                            }
                        />

                        <InfoCard
                            label="Hourly rate"
                            value={
                                weekHoursSummary
                                    ? `${weekHoursSummary.currency_code} ${weekHoursSummary.hourly_rate.toFixed(2)}`
                                    : "—"
                            }
                        />

                        <InfoCard
                            label="Estimated pay (closed)"
                            value={
                                weekHoursSummary
                                    ? `${weekHoursSummary.currency_code} ${weekHoursSummary.estimated_pay_closed.toFixed(2)}`
                                    : "—"
                            }
                        />

                        <InfoCard
                            label="Estimated pay (visible)"
                            value={
                                weekHoursSummary
                                    ? `${weekHoursSummary.currency_code} ${weekHoursSummary.estimated_pay_display.toFixed(2)}`
                                    : "—"
                            }
                        />
                    </div>
                </section>
                <section style={{ display: "grid", gap: 12 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                        Shift history
                    </h2>

                    {shiftDetails.length === 0 ? (
                        <div style={{ color: "#6b7280", fontSize: 14 }}>
                            No shifts in this period.
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                                <thead>
                                    <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                        <th style={{ padding: "8px 6px" }}>Date</th>
                                        <th style={{ padding: "8px 6px" }}>Check-in</th>
                                        <th style={{ padding: "8px 6px" }}>Check-out</th>
                                        <th style={{ padding: "8px 6px" }}>Hours</th>
                                        <th style={{ padding: "8px 6px" }}>Estimated pay</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {shiftDetails.map((s) => {
                                        const checkIn = new Date(s.check_in_at);
                                        const checkOut = s.check_out_at ? new Date(s.check_out_at) : null;
                                        const isRunning = !s.check_out_at;
                                        const isOvernight =
                                            !!checkOut &&
                                            checkIn.toDateString() !== checkOut.toDateString();

                                        const hasRate = s.hourly_rate > 0;

                                        return (
                                            <tr key={s.shift_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                                <td style={{ padding: "10px 6px", verticalAlign: "top" }}>
                                                    <div style={{ fontWeight: 600, color: "#111827" }}>
                                                        {checkIn.toLocaleDateString()}
                                                    </div>
                                                    {isOvernight ? (
                                                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                                                            Overnight shift
                                                        </div>
                                                    ) : null}
                                                </td>

                                                <td style={{ padding: "10px 6px", verticalAlign: "top" }}>
                                                    <div style={{ color: "#111827" }}>
                                                        {checkIn.toLocaleDateString([], {
                                                            month: "short",
                                                            day: "numeric",
                                                        })}{" "}
                                                        {checkIn.toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </div>
                                                </td>

                                                <td style={{ padding: "10px 6px", verticalAlign: "top" }}>
                                                    {isRunning ? (
                                                        <span
                                                            style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                padding: "4px 8px",
                                                                borderRadius: 999,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                background: "#eff6ff",
                                                                color: "#1d4ed8",
                                                                border: "1px solid #bfdbfe",
                                                            }}
                                                        >
                                                            Running
                                                        </span>
                                                    ) : (
                                                        <div style={{ color: "#111827" }}>
                                                            {checkOut!.toLocaleDateString([], {
                                                                month: "short",
                                                                day: "numeric",
                                                            })}{" "}
                                                            {checkOut!.toLocaleTimeString([], {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </div>
                                                    )}
                                                </td>

                                                <td style={{ padding: "10px 6px", fontWeight: 600, verticalAlign: "top" }}>
                                                    {s.display_hours.toFixed(2)} h
                                                </td>

                                                <td style={{ padding: "10px 6px", fontWeight: 600, verticalAlign: "top" }}>
                                                    {hasRate ? (
                                                        `${s.currency_code} ${s.estimated_pay_display.toFixed(2)}`
                                                    ) : (
                                                        <span style={{ color: "#6b7280", fontWeight: 500 }}>
                                                            Rate not set
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
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
                                value={formatDateTime(todaySummary?.lastCheckIn ?? lastShift?.check_in_at ?? null)}
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
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 16,
                            flexWrap: "wrap",
                        }}
                    >
                        <div style={{ minWidth: 260, flex: 1 }}>
                            <div
                                style={{
                                    fontSize: 12,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    color: "#64748b",
                                    fontWeight: 800,
                                    marginBottom: 8,
                                }}
                            >
                                Account
                            </div>

                            <div
                                style={{
                                    fontSize: 22,
                                    fontWeight: 800,
                                    lineHeight: 1.1,
                                    color: "#111827",
                                    letterSpacing: "-0.02em",
                                    marginBottom: 8,
                                }}
                            >
                                Preferences and tools
                            </div>

                            <div
                                style={{
                                    color: "#6b7280",
                                    fontSize: 14,
                                    lineHeight: 1.6,
                                    maxWidth: 760,
                                }}
                            >
                                Preferences and account tools will be available here in a future phase.
                            </div>
                        </div>

                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "8px 12px",
                                borderRadius: 999,
                                border: "1px solid #dbe3ef",
                                background: "#f8fafc",
                                color: "#334155",
                                fontSize: 13,
                                fontWeight: 800,
                                whiteSpace: "nowrap",
                            }}
                        >
                            Coming soon
                        </div>
                    </div>
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
                background: "#fcfcfd",
            }}
        >
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                {label}
            </div>
            <div
                style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#111827",
                    wordBreak: "break-word",
                }}
            >
                {value}
            </div>
        </div>
    );
}

const cardStyle: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#ffffff",
    padding: 20,
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 14,
};

const mutedTextStyle: React.CSSProperties = {
    fontSize: 14,
    color: "#6b7280",
};

const statsGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
};