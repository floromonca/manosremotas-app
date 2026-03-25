"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuthState } from "../../hooks/useAuthState";
import { useActiveCompany } from "../../hooks/useActiveCompany";
import {
    getLastShift,
    getOpenShift,
    getTodayShiftSummary,
    getWeekShiftSummary,
    formatDurationHHMMSS,
    type ShiftRow,
    type ShiftSummary,
} from "../../lib/supabase/shifts";

type MembershipProfileRow = {
    full_name: string | null;
    role: "owner" | "admin" | "tech" | "viewer";
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
    const [openShift, setOpenShift] = useState<ShiftRow | null>(null);
    const [lastShift, setLastShift] = useState<ShiftRow | null>(null);
    const [todaySummary, setTodaySummary] = useState<ShiftSummary | null>(null);
    const [weekSummary, setWeekSummary] = useState<ShiftSummary | null>(null);

    const refreshProfileData = useCallback(async (cid: string, uid: string) => {
        const [
            memberRes,
            openShiftRes,
            lastShiftRes,
            todayShiftSummary,
            weekShiftSummary,
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
        ]);

        if (memberRes.error) throw memberRes.error;
        if (openShiftRes.error) throw openShiftRes.error;
        if (lastShiftRes.error) throw lastShiftRes.error;

        setMemberProfile((memberRes.data as MembershipProfileRow | null) ?? null);
        setOpenShift((openShiftRes.data as ShiftRow | null) ?? null);
        setLastShift((lastShiftRes.data as ShiftRow | null) ?? null);
        setTodaySummary(todayShiftSummary);
        setWeekSummary(weekShiftSummary);
    }, []);

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
        <div style={{ padding: 24, maxWidth: 980 }}>
            <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                    My account
                </div>

                <h1
                    style={{
                        fontSize: 32,
                        fontWeight: 700,
                        margin: "0 0 8px 0",
                        letterSpacing: "-0.02em",
                    }}
                >
                    Profile
                </h1>

                <div style={{ color: "#6b7280", fontSize: 15 }}>
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

            <div
                style={{
                    display: "grid",
                    gap: 18,
                }}
            >
                <section style={cardStyle}>
                    <div style={sectionTitleStyle}>Basic information</div>

                    {loading ? (
                        <div style={mutedTextStyle}>Loading profile...</div>
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
                    <div style={sectionTitleStyle}>Account</div>
                    <div style={mutedTextStyle}>
                        Preferences and account tools will be available here in a future phase.
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