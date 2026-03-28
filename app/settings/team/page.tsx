"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import { useAuthState } from "../../../hooks/useAuthState";
import {
    getOpenShiftForUser,
    getTodayShiftSummaryForUser,
    getWeekShiftSummaryForUser,
    formatDurationHHMMSS,
} from "../../../lib/supabase/shifts";
import { useRouter } from "next/navigation";


type MemberRow = {
    company_id: string;
    user_id: string;
    role: string;
    full_name?: string | null;
    created_at?: string;
};

type InviteRow = {
    invite_id: string;
    company_id: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    accepted_at: string | null;
};

function getMemberDisplayName(member: MemberRow) {
    const fullName = member.full_name;

    if (typeof fullName === "string" && fullName.trim()) {
        return fullName.trim();
    }

    return "Pending profile setup";
}


export default function TeamPage() {
    const { user, authLoading } = useAuthState();
    const { companyId, companyName, myRole } = useActiveCompany();
    const router = useRouter();

    const [members, setMembers] = useState<MemberRow[]>([]);
    const [memberStats, setMemberStats] = useState<
        Array<{
            user_id: string;
            shift_status: "on_shift" | "off_shift";
            worked_today_label: string;
            worked_week_label: string;
        }>
    >([]);
    const [invites, setInvites] = useState<InviteRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAllMembers, setShowAllMembers] = useState(false);

    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("tech");
    const [err, setErr] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);
    const [memberSearch, setMemberSearch] = useState("");



    const refresh = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);
        setErr(null);
        setOk(null);

        try {
            const { data: memRows, error: memErr } = await supabase
                .from("company_members")
                .select("company_id, user_id, role, full_name, created_at")
                .eq("company_id", companyId)
                .order("created_at", { ascending: true });

            if (memErr) throw memErr;

            const membersOnly = (memRows ?? []) as MemberRow[];

            setMembers(membersOnly);

            const stats = await Promise.all(
                membersOnly.map(async (member) => {
                    try {
                        const [openShiftRes, todaySummary, weekSummary] = await Promise.all([
                            getOpenShiftForUser(companyId, member.user_id),
                            getTodayShiftSummaryForUser(companyId, member.user_id),
                            getWeekShiftSummaryForUser(companyId, member.user_id),
                        ]);

                        return {
                            user_id: member.user_id,
                            shift_status: openShiftRes.data ? "on_shift" as const : "off_shift" as const,
                            worked_today_label: formatDurationHHMMSS(todaySummary.totalSeconds),
                            worked_week_label: formatDurationHHMMSS(weekSummary.totalSeconds),
                        };
                    } catch {
                        return {
                            user_id: member.user_id,
                            shift_status: "off_shift" as const,
                            worked_today_label: "00:00:00",
                            worked_week_label: "00:00:00",
                        };
                    }
                })
            );

            setMemberStats(stats);

            const { data: inv, error: invErr } = await supabase
                .from("company_invites")
                .select("invite_id, company_id, email, role, status, created_at, accepted_at")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false });

            if (invErr) throw invErr;

            setInvites((inv ?? []) as InviteRow[]);
        } catch (e: any) {
            setErr(e?.message ?? "Error loading team data.");
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) return;
        if (!companyId) return;
        refresh();
    }, [authLoading, user, companyId, refresh]);

    const pendingInvites = useMemo(
        () => invites.filter((i) => i.status === "pending"),
        [invites]
    );

    const teamOverview = useMemo(() => {
        const totalMembers = members.length;
        const onShiftNow = memberStats.filter((m) => m.shift_status === "on_shift").length;
        const offShiftNow = Math.max(0, totalMembers - onShiftNow);
        const pendingInviteCount = pendingInvites.length;

        return {
            totalMembers,
            onShiftNow,
            offShiftNow,
            pendingInviteCount,
        };
    }, [members, memberStats, pendingInvites]);

    const normalizedMemberSearch = memberSearch.trim().toLowerCase();

    const filteredMembers = members.filter((m) =>
        getMemberDisplayName(m).toLowerCase().includes(normalizedMemberSearch)
    );

    const visibleMembers = showAllMembers ? filteredMembers : filteredMembers.slice(0, 10);
    const hasMoreThanTenMembers = filteredMembers.length > 10;

    const createInvite = useCallback(async () => {
        if (!companyId) return;

        setErr(null);
        setOk(null);

        const email = inviteEmail.trim().toLowerCase();

        if (!email || !email.includes("@")) {
            setErr("Please enter a valid email address.");
            return;
        }

        try {
            const { error } = await supabase.from("company_invites").insert({
                company_id: companyId,
                email,
                role: inviteRole,
                status: "pending",
            });

            if (error) throw error;

            setInviteEmail("");
            setInviteRole("tech");
            setOk("Invite created successfully. The technician must register with the same email.");
            await refresh();
        } catch (e: any) {
            setErr(e?.message ?? "Could not create invite.");
        }
    }, [companyId, inviteEmail, inviteRole, refresh]);

    if (authLoading) {
        return (
            <PageShell>
                <SimpleStateCard title="Team" message="Loading session..." />
            </PageShell>
        );
    }

    if (!user) {
        return (
            <PageShell>
                <SimpleStateCard title="Team" message="You must sign in to access this section." />
            </PageShell>
        );
    }

    if (myRole !== "owner" && myRole !== "admin") {
        return (
            <PageShell>
                <SimpleStateCard title="Team" message="You do not have permission to access this section." />
            </PageShell>
        );
    }

    return (
        <PageShell>
            <div style={{ marginBottom: 22 }}>
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#6b7280",
                        marginBottom: 10,
                    }}
                >
                    Settings / Team
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        flexWrap: "wrap",
                    }}
                >
                    <div>
                        <h1
                            style={{
                                fontSize: 40,
                                lineHeight: 1.08,
                                fontWeight: 750,
                                letterSpacing: "-0.03em",
                                color: "#111827",
                                margin: 0,
                            }}
                        >
                            Team
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
                            Manage members and pending invites for{" "}
                            {companyName?.trim() ? companyName : "your company"}.
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={refresh}
                        style={{
                            height: 42,
                            padding: "0 16px",
                            borderRadius: 10,
                            border: "1px solid #d1d5db",
                            background: "#ffffff",
                            color: "#111827",
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: 14,
                        }}
                    >
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
            </div>

            {!companyId ? (
                <AlertBox tone="error">
                    <strong>No active company selected.</strong> Select a company before managing team
                    members.
                </AlertBox>
            ) : null}

            {err ? (
                <AlertBox tone="error">
                    <strong>Error:</strong> {err}
                </AlertBox>
            ) : null}

            {ok ? <AlertBox tone="success">{ok}</AlertBox> : null}

            <div style={{ display: "grid", gap: 20 }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                        gap: 16,
                    }}
                >
                    <StatCard label="Total members" value={teamOverview.totalMembers} />
                    <StatCard label="On shift now" value={teamOverview.onShiftNow} />
                    <StatCard label="Off shift" value={teamOverview.offShiftNow} />
                    <StatCard label="Pending invites" value={teamOverview.pendingInviteCount} />
                </div>


                <SectionCard
                    title="Members"
                    description="Active members linked to this company and their current role."
                    rightMeta={`${members.length} total`}
                >
                    <div style={{ marginBottom: 12 }}>
                        <Field
                            label="Search members"
                            value={memberSearch}
                            onChange={setMemberSearch}
                            placeholder="Search by name"
                        />
                    </div>
                    <DataTable
                        columns={["Name", "Role", "Shift", "Worked today", "Worked week", "Action"]}
                        emptyMessage={loading ? "Loading members..." : "No members found."}
                        rows={visibleMembers.map((m) => {
                            const stats = memberStats.find((s) => s.user_id === m.user_id);

                            return [
                                getMemberDisplayName(m),
                                <RoleBadge key={`${m.user_id}-role`} role={m.role} />,
                                stats?.shift_status === "on_shift" ? "On shift" : "Off shift",
                                stats?.worked_today_label ?? "00:00:00",
                                stats?.worked_week_label ?? "00:00:00",
                                <button
                                    key={`${m.user_id}-view`}
                                    onClick={() => router.push(`/settings/team/${m.user_id}`)}
                                    style={{
                                        padding: "6px 10px",
                                        borderRadius: 8,
                                        border: "1px solid #d1d5db",
                                        background: "#fff",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                    }}
                                >
                                    View
                                </button>,
                            ];
                        })}
                    />

                    {hasMoreThanTenMembers && (
                        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                            <button
                                onClick={() => setShowAllMembers((prev) => !prev)}
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: 10,
                                    border: "1px solid #d1d5db",
                                    background: "#fff",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                }}
                            >
                                {showAllMembers ? "Show fewer" : `Show all (${filteredMembers.length})`}
                            </button>
                        </div>
                    )}
                </SectionCard>

                <SectionCard
                    title="Invite New Member"
                    description="Create a pending invite for a new technician or admin."
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) 160px 140px",
                            gap: 12,
                            alignItems: "end",
                        }}
                    >
                        <Field
                            label="Email"
                            value={inviteEmail}
                            onChange={setInviteEmail}
                            placeholder="email@domain.com"
                        />

                        <SelectField
                            label="Role"
                            value={inviteRole}
                            onChange={setInviteRole}
                            options={[
                                { value: "tech", label: "tech" },
                                { value: "admin", label: "admin" },
                            ]}
                        />


                        <div style={{ display: "grid", gap: 8 }}>
                            <div style={{ height: 18 }} />
                            <button
                                type="button"
                                onClick={createInvite}
                                style={{
                                    height: 44,
                                    borderRadius: 10,
                                    border: "1px solid #111827",
                                    background: "#111827",
                                    color: "#ffffff",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    fontSize: 14,
                                }}
                            >
                                Invite
                            </button>
                        </div>
                    </div>

                    <div
                        style={{
                            marginTop: 12,
                            fontSize: 13,
                            color: "#6b7280",
                            lineHeight: 1.5,
                        }}
                    >
                        The invited technician must register with the same email so the system can link
                        the account correctly.
                    </div>
                </SectionCard>

                <SectionCard
                    title="Pending Invites"
                    description="Invitations that have been created but not yet accepted."
                    rightMeta={`${pendingInvites.length} pending`}
                >
                    <DataTable
                        columns={["Email", "Role", "Status", "Created"]}
                        emptyMessage={loading ? "Loading invites..." : "No pending invites."}
                        rows={pendingInvites.map((invite) => [
                            invite.email,
                            <RoleBadge key={`${invite.invite_id}-role`} role={invite.role} />,
                            invite.status,
                            invite.created_at ? formatDateTime(invite.created_at) : "—",
                        ])}
                    />
                </SectionCard>
            </div>
        </PageShell>
    );
}

function StatCard({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                background: "#fff",
                padding: 16,
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    color: "#6b7280",
                    fontWeight: 600,
                    marginBottom: 8,
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#111827",
                    lineHeight: 1,
                }}
            >
                {value}
            </div>
        </div>
    );
}

function PageShell({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                width: "100%",
                maxWidth: 1040,
                padding: "6px 0 32px 0",
            }}
        >
            {children}
        </div>
    );
}

function SimpleStateCard({
    title,
    message,
}: {
    title: string;
    message: string;
}) {
    return (
        <div>
            <div
                style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#6b7280",
                    marginBottom: 10,
                }}
            >
                Settings / Team
            </div>

            <h1
                style={{
                    fontSize: 40,
                    lineHeight: 1.08,
                    fontWeight: 750,
                    letterSpacing: "-0.03em",
                    color: "#111827",
                    margin: 0,
                }}
            >
                {title}
            </h1>

            <div
                style={{
                    marginTop: 18,
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    background: "#ffffff",
                    padding: 20,
                    color: "#6b7280",
                }}
            >
                {message}
            </div>
        </div>
    );
}

function AlertBox({
    tone,
    children,
}: {
    tone: "error" | "success";
    children: React.ReactNode;
}) {
    const isError = tone === "error";

    return (
        <div
            style={{
                marginBottom: 18,
                padding: "12px 14px",
                border: isError ? "1px solid #fecaca" : "1px solid #bbf7d0",
                background: isError ? "#fff5f5" : "#f0fdf4",
                borderRadius: 12,
                color: isError ? "#991b1b" : "#166534",
                fontSize: 14,
            }}
        >
            {children}
        </div>
    );
}

function SectionCard({
    title,
    description,
    rightMeta,
    children,
}: {
    title: string;
    description?: string;
    rightMeta?: string;
    children: React.ReactNode;
}) {
    return (
        <section
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background: "#ffffff",
                padding: 22,
                boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    marginBottom: 18,
                    flexWrap: "wrap",
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: "#111827",
                            marginBottom: description ? 6 : 0,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {title}
                    </div>

                    {description ? (
                        <div
                            style={{
                                fontSize: 14,
                                color: "#6b7280",
                                lineHeight: 1.55,
                                maxWidth: 720,
                            }}
                        >
                            {description}
                        </div>
                    ) : null}
                </div>

                {rightMeta ? (
                    <div
                        style={{
                            fontSize: 13,
                            color: "#6b7280",
                            fontWeight: 600,
                        }}
                    >
                        {rightMeta}
                    </div>
                ) : null}
            </div>

            {children}
        </section>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <label style={{ display: "grid", gap: 8 }}>
            <span
                style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#374151",
                }}
            >
                {label}
            </span>

            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    height: 44,
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    padding: "0 14px",
                    outline: "none",
                    background: "#ffffff",
                    fontSize: 14,
                    color: "#111827",
                    width: "100%",
                }}
            />
        </label>
    );
}

function SelectField({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <label style={{ display: "grid", gap: 8 }}>
            <span
                style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#374151",
                }}
            >
                {label}
            </span>

            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    height: 44,
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    padding: "0 14px",
                    outline: "none",
                    background: "#ffffff",
                    fontSize: 14,
                    color: "#111827",
                    width: "100%",
                }}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function DataTable({
    columns,
    rows,
    emptyMessage,
}: {
    columns: string[];
    rows: React.ReactNode[][];
    emptyMessage: string;
}) {
    return (
        <div
            style={{
                overflowX: "auto",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                background: "#ffffff",
            }}
        >
            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse",
                }}
            >
                <thead>
                    <tr style={{ textAlign: "left", background: "#f9fafb" }}>
                        {columns.map((column) => (
                            <th
                                key={column}
                                style={{
                                    padding: "14px 16px",
                                    borderBottom: "1px solid #e5e7eb",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "#374151",
                                }}
                            >
                                {column}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                style={{
                                    padding: "18px 16px",
                                    color: "#6b7280",
                                    fontSize: 14,
                                }}
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                    <td
                                        key={cellIndex}
                                        style={{
                                            padding: "14px 16px",
                                            borderBottom:
                                                rowIndex === rows.length - 1
                                                    ? "none"
                                                    : "1px solid #f1f5f9",
                                            color: "#111827",
                                            fontSize: 14,
                                            verticalAlign: "middle",
                                        }}
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

function RoleBadge({ role }: { role: string }) {
    const normalized = role?.toLowerCase?.() ?? role;

    const styles =
        normalized === "owner"
            ? {
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
            }
            : normalized === "admin"
                ? {
                    background: "#f5f3ff",
                    border: "1px solid #ddd6fe",
                    color: "#6d28d9",
                }
                : {
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    color: "#374151",
                };

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "lowercase",
                ...styles,
            }}
        >
            {role}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const normalized = status?.toLowerCase?.() ?? status;

    const styles =
        normalized === "pending"
            ? {
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#c2410c",
            }
            : normalized === "accepted"
                ? {
                    background: "#ecfdf3",
                    border: "1px solid #bbf7d0",
                    color: "#166534",
                }
                : {
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    color: "#374151",
                };

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "lowercase",
                ...styles,
            }}
        >
            {status}
        </span>
    );
}

function formatDateTime(value: string) {
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}