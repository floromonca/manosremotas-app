"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";
import { useAuthState } from "../../../../../hooks/useAuthState";
import { useActiveCompany } from "../../../../../hooks/useActiveCompany";

type PayrollRow = {
    user_id: string;
    full_name: string | null;
    role: string | null;
    closed_hours: number | null;
    running_hours: number | null;
    visible_hours: number | null;
    hourly_rate: number | null;
    currency_code: string | null;
    estimated_pay_closed: number | null;
    estimated_pay_visible: number | null;
};

function formatHours(value: number | null | undefined) {
    return `${Number(value ?? 0).toFixed(1)} h`;
}

function formatMoney(
    value: number | null | undefined,
    currencyCode: string | null | undefined
) {
    const amount = Number(value ?? 0);
    const currency = currencyCode?.trim() || "CAD";

    try {
        return new Intl.NumberFormat("en-CA", {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

function humanRole(role: string | null | undefined) {
    if (!role) return "—";
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    if (role === "tech") return "Technician";
    if (role === "viewer") return "Viewer";
    return role;
}

function formatShortDateRange(start: Date, end: Date) {
    const startText = start.toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
    });

    const endText = end.toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
    });

    return `${startText} – ${endText}`;
}

function SectionTitle({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div>
            <div
                style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: 6,
                }}
            >
                {title}
            </div>
            <div
                style={{
                    fontSize: 14,
                    color: "#6b7280",
                    lineHeight: 1.5,
                }}
            >
                {description}
            </div>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                minWidth: 140,
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                background: "#fff",
                padding: "12px 14px",
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#6b7280",
                    marginBottom: 6,
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#111827",
                }}
            >
                {value}
            </div>
        </div>
    );
}

export default function TeamPayrollPage() {
    const router = useRouter();
    const { user, authLoading } = useAuthState();
    const { companyId, companyName, myRole, isLoadingCompany } =
        useActiveCompany();

    const [rows, setRows] = useState<PayrollRow[]>([]);
    const [loadingPayroll, setLoadingPayroll] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [periodLabel, setPeriodLabel] = useState("Current week");

    function downloadCsv() {
        if (!rows.length) return;

        const headers = [
            "Member",
            "Role",
            "Closed hours",
            "Running hours",
            "Visible hours",
            "Hourly rate",
            "Estimated pay",
        ];

        const csvRows = rows.map((row) => {
            const currencyCode = row.currency_code?.trim() || "CAD";

            return [
                row.full_name?.trim() || "Unnamed member",
                humanRole(row.role),
                Number(row.closed_hours ?? 0).toFixed(2),
                Number(row.running_hours ?? 0).toFixed(2),
                Number(row.visible_hours ?? 0).toFixed(2),
                row.hourly_rate != null
                    ? formatMoney(row.hourly_rate, currencyCode)
                    : "Rate not set",
                row.hourly_rate != null
                    ? formatMoney(row.estimated_pay_visible, currencyCode)
                    : "Rate not set",
            ];
        });

        const csvContent = [headers, ...csvRows]
            .map((row) =>
                row
                    .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                    .join(",")
            )
            .join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        const today = new Date();
        const fileDate = today.toISOString().slice(0, 10);

        link.setAttribute("download", `team-payroll-${fileDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }

    useEffect(() => {
        if (authLoading || isLoadingCompany) return;

        if (!user) {
            router.replace("/auth");
            return;
        }

        if (!companyId) return;

        if (myRole !== "owner" && myRole !== "admin") {
            router.replace("/work-orders");
        }
    }, [authLoading, isLoadingCompany, user, companyId, myRole, router]);

    useEffect(() => {
        if (authLoading || isLoadingCompany) return;
        if (!user || !companyId) return;
        if (myRole !== "owner" && myRole !== "admin") return;

        let cancelled = false;

        async function loadPayroll() {
            setLoadingPayroll(true);
            setErrorMsg("");

            try {
                const now = new Date();
                const day = now.getDay();
                const diffToMonday = day === 0 ? -6 : 1 - day;

                const startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                startDate.setDate(now.getDate() + diffToMonday);

                const endDate = new Date(now);
                endDate.setHours(0, 0, 0, 0);

                const startDateStr = startDate.toISOString().slice(0, 10);
                const endDateStr = now.toISOString().slice(0, 10);

                const { data, error } = await supabase.rpc(
                    "get_team_payroll_summary",
                    {
                        p_company_id: companyId,
                        p_start_date: startDateStr,
                        p_end_date: endDateStr,
                    }
                );

                if (error) throw error;

                if (!cancelled) {
                    setRows((data as PayrollRow[]) ?? []);
                    setPeriodLabel(
                        `Week of ${formatShortDateRange(startDate, endDate)}`
                    );
                }
            } catch (e: any) {
                if (!cancelled) {
                    setErrorMsg(
                        e?.message ?? "Could not load payroll summary."
                    );
                    setRows([]);
                }
            } finally {
                if (!cancelled) {
                    setLoadingPayroll(false);
                }
            }
        }

        loadPayroll();

        return () => {
            cancelled = true;
        };
    }, [authLoading, isLoadingCompany, user, companyId, myRole]);

    const totals = useMemo(() => {
        return rows.reduce(
            (acc, row) => {
                acc.closed_hours += Number(row.closed_hours ?? 0);
                acc.running_hours += Number(row.running_hours ?? 0);
                acc.visible_hours += Number(row.visible_hours ?? 0);
                acc.estimated_pay_visible += Number(
                    row.estimated_pay_visible ?? 0
                );
                return acc;
            },
            {
                closed_hours: 0,
                running_hours: 0,
                visible_hours: 0,
                estimated_pay_visible: 0,
            }
        );
    }, [rows]);

    const sortedRows = useMemo(() => {
        return [...rows].sort(
            (a, b) =>
                Number(b.estimated_pay_visible ?? 0) -
                Number(a.estimated_pay_visible ?? 0)
        );
    }, [rows]);

    return (
        <div style={{ padding: 24, maxWidth: 1180 }}>
            <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
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
                                fontSize: 32,
                                fontWeight: 700,
                                margin: "0 0 8px 0",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Payroll Summary
                        </h1>

                        <div style={{ color: "#6b7280", fontSize: 15 }}>
                            Weekly payroll visibility for your team in{" "}
                            {companyName || "your company"}.
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.push("/settings/team")}
                        style={{
                            height: 42,
                            padding: "0 14px",
                            borderRadius: 10,
                            border: "1px solid #d1d5db",
                            background: "#ffffff",
                            color: "#111827",
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: 14,
                        }}
                    >
                        Back to Team
                    </button>
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

            <section style={cardStyle}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        flexWrap: "wrap",
                        marginBottom: 18,
                    }}
                >
                    <div>
                        <SectionTitle
                            title="Team payroll"
                            description="Current week summary for all team members."
                        />

                        <div
                            style={{
                                marginTop: 8,
                                fontSize: 13,
                                color: "#6b7280",
                                fontWeight: 600,
                            }}
                        >
                            {periodLabel}
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "stretch",
                            gap: 10,
                            flexWrap: "wrap",
                        }}
                    >
                        {!loadingPayroll ? (
                            <>
                                <MiniStat
                                    label="Visible hours"
                                    value={formatHours(totals.visible_hours)}
                                />
                                <MiniStat
                                    label="Estimated payroll"
                                    value={formatMoney(
                                        totals.estimated_pay_visible,
                                        "CAD"
                                    )}
                                />
                            </>
                        ) : null}

                        <button
                            type="button"
                            onClick={downloadCsv}
                            disabled={!rows.length || loadingPayroll}
                            style={{
                                height: 54,
                                padding: "0 18px",
                                borderRadius: 12,
                                border: "1px solid #d1d5db",
                                background:
                                    !rows.length || loadingPayroll
                                        ? "#f9fafb"
                                        : "#ffffff",
                                color: "#111827",
                                cursor:
                                    !rows.length || loadingPayroll
                                        ? "not-allowed"
                                        : "pointer",
                                fontWeight: 700,
                                fontSize: 14,
                                opacity:
                                    !rows.length || loadingPayroll ? 0.65 : 1,
                            }}
                        >
                            Export CSV
                        </button>
                    </div>
                </div>

                {loadingPayroll ? (
                    <div style={emptyStateStyle}>Loading payroll...</div>
                ) : rows.length === 0 ? (
                    <div style={emptyStateStyle}>
                        No payroll data found for the current week.
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
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                            }}
                        >
                            <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                    <th style={thStyle}>Member</th>
                                    <th style={thStyle}>Role</th>
                                    <th style={thStyleRight}>Closed hours</th>
                                    <th style={thStyleRight}>Running hours</th>
                                    <th style={thStyleRight}>Visible hours</th>
                                    <th style={thStyleRight}>Hourly rate</th>
                                    <th style={thStyleRight}>Estimated pay</th>
                                </tr>
                            </thead>

                            <tbody>
                                {sortedRows.map((row, index) => {
                                    const currencyCode =
                                        row.currency_code?.trim() || "CAD";
                                    const memberName =
                                        row.full_name?.trim() ||
                                        "Unnamed member";
                                    const rateNotSet = row.hourly_rate == null;

                                    return (
                                        <tr
                                            key={row.user_id}
                                            style={{
                                                background:
                                                    index % 2 === 0
                                                        ? "#fff"
                                                        : "#fafafa",
                                            }}
                                        >
                                            <td style={tdStyle}>
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/settings/team/${row.user_id}`)}
                                                    style={{
                                                        border: "none",
                                                        background: "transparent",
                                                        padding: 0,
                                                        margin: 0,
                                                        color: "#111827",
                                                        cursor: "pointer",
                                                        fontSize: 14,
                                                        fontWeight: 700,
                                                        textDecoration: "underline",
                                                    }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.color = "#2563eb")}
                                                    onMouseLeave={(e) => (e.currentTarget.style.color = "#111827")}
                                                >
                                                    {memberName}
                                                </button>
                                            </td>

                                            <td style={tdStyle}>
                                                <span style={roleBadgeStyle}>
                                                    {humanRole(row.role)}
                                                </span>
                                            </td>

                                            <td style={tdStyleNumeric}>
                                                {formatHours(row.closed_hours)}
                                            </td>

                                            <td style={tdStyleNumeric}>
                                                {formatHours(row.running_hours)}
                                            </td>

                                            <td style={tdStyleNumeric}>
                                                {formatHours(row.visible_hours)}
                                            </td>

                                            <td style={tdStyleNumeric}>
                                                {rateNotSet ? (
                                                    <span
                                                        style={
                                                            warningBadgeStyle
                                                        }
                                                    >
                                                        Rate not set
                                                    </span>
                                                ) : (
                                                    formatMoney(
                                                        row.hourly_rate,
                                                        currencyCode
                                                    )
                                                )}
                                            </td>

                                            <td
                                                style={{
                                                    ...tdStyleNumeric,
                                                    fontWeight: 700,
                                                    color: rateNotSet ? "#111827" : "#065f46",
                                                }}
                                            >
                                                {rateNotSet ? (
                                                    <span
                                                        style={
                                                            warningBadgeStyle
                                                        }
                                                    >
                                                        Rate not set
                                                    </span>
                                                ) : (
                                                    formatMoney(
                                                        row.estimated_pay_visible,
                                                        currencyCode
                                                    )
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
        </div>
    );
}

const cardStyle: CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#fff",
    padding: 18,
};

const emptyStateStyle: CSSProperties = {
    padding: "24px 8px",
    fontSize: 14,
    color: "#6b7280",
};

const thStyle: CSSProperties = {
    padding: "14px 14px",
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    textAlign: "left",
    borderBottom: "1px solid #e5e7eb",
};

const thStyleRight: CSSProperties = {
    ...thStyle,
    textAlign: "right",
};

const tdStyle: CSSProperties = {
    padding: "14px",
    fontSize: 14,
    color: "#111827",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "middle",
};

const tdStyleNumeric: CSSProperties = {
    ...tdStyle,
    textAlign: "right",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

const roleBadgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 10px",
    borderRadius: 999,
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
    color: "#374151",
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
};

const warningBadgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 10px",
    borderRadius: 999,
    background: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#92400e",
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
};