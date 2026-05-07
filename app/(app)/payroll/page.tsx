"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import { useAuthState } from "../../../hooks/useAuthState";
import { MR_THEME } from "@/lib/theme";

type PayrollRpcRow = {
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

type TimeEntryRow = {
    user_id: string;
    check_in_at: string;
    check_out_at: string | null;
    work_order_id?: string | null;
};

type PayrollRow = PayrollRpcRow & {
    work_order_hours: number;
    unassigned_hours: number;
    work_order_count: number;
};

type PeriodPreset = "this_week" | "last_week" | "this_month" | "custom";

function padDatePart(value: number) {
    return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function startOfLocalDay(date: Date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

function getPresetRange(preset: PeriodPreset) {
    const now = new Date();
    const today = startOfLocalDay(now);
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    if (preset === "this_month") {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
            startDate: toDateInputValue(start),
            endDate: toDateInputValue(today),
        };
    }

    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    if (preset === "last_week") {
        const start = new Date(monday);
        start.setDate(monday.getDate() - 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return {
            startDate: toDateInputValue(start),
            endDate: toDateInputValue(end),
        };
    }

    return {
        startDate: toDateInputValue(monday),
        endDate: toDateInputValue(today),
    };
}

function getRangeBounds(startDate: string, endDate: string) {
    const start = startOfLocalDay(new Date(`${startDate}T00:00:00`));
    const endExclusive = startOfLocalDay(new Date(`${endDate}T00:00:00`));
    endExclusive.setDate(endExclusive.getDate() + 1);

    return {
        start,
        endExclusive,
        startIso: start.toISOString(),
        endIso: endExclusive.toISOString(),
    };
}

function boundedHours(row: TimeEntryRow, start: Date, endExclusive: Date, now = new Date()) {
    const checkIn = new Date(row.check_in_at).getTime();
    const checkOut = row.check_out_at ? new Date(row.check_out_at).getTime() : now.getTime();

    if (Number.isNaN(checkIn) || Number.isNaN(checkOut) || checkOut <= checkIn) return 0;

    const boundedStart = Math.max(checkIn, start.getTime());
    const boundedEnd = Math.min(checkOut, endExclusive.getTime());

    if (boundedEnd <= boundedStart) return 0;

    return (boundedEnd - boundedStart) / 3600000;
}

function formatHours(value: number | null | undefined) {
    return `${Number(value ?? 0).toFixed(1)} h`;
}

function formatMoney(value: number | null | undefined, currencyCode: string | null | undefined) {
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
    if (!role) return "-";
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    if (role === "tech") return "Technician";
    if (role === "viewer") return "Viewer";
    return role;
}

function rangeLabel(startDate: string, endDate: string) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const formatter = new Intl.DateTimeFormat("en-CA", {
        month: "short",
        day: "numeric",
        year: start.getFullYear() === end.getFullYear() ? undefined : "numeric",
    });

    return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function statusFor(row: PayrollRow) {
    if (Number(row.running_hours ?? 0) > 0) return "On shift";
    if (row.hourly_rate == null) return "Missing rate";
    if (Number(row.visible_hours ?? 0) <= 0) return "No hours";
    return "Ready";
}

export default function PayrollPage() {
    const router = useRouter();
    const { user, authLoading } = useAuthState();
    const { companyId, companyName, myRole, isLoadingCompany } = useActiveCompany();
    const isAdmin = myRole === "owner" || myRole === "admin";

    const initialRange = useMemo(() => getPresetRange("this_week"), []);
    const [preset, setPreset] = useState<PeriodPreset>("this_week");
    const [startDate, setStartDate] = useState(initialRange.startDate);
    const [endDate, setEndDate] = useState(initialRange.endDate);
    const [rows, setRows] = useState<PayrollRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    const applyPreset = (nextPreset: PeriodPreset) => {
        setPreset(nextPreset);
        if (nextPreset === "custom") return;
        const nextRange = getPresetRange(nextPreset);
        setStartDate(nextRange.startDate);
        setEndDate(nextRange.endDate);
    };

    useEffect(() => {
        if (authLoading || isLoadingCompany) return;
        if (!user) router.replace("/auth");
    }, [authLoading, isLoadingCompany, router, user]);

    const loadPayroll = useCallback(async () => {
        if (!companyId || !user) return;
        if (!startDate || !endDate) return;

        const startTime = new Date(`${startDate}T00:00:00`).getTime();
        const endTime = new Date(`${endDate}T00:00:00`).getTime();

        if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime < startTime) {
            setErrorMsg("Choose a valid payroll date range.");
            setRows([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorMsg("");

        try {
            const bounds = getRangeBounds(startDate, endDate);
            let payrollRows: PayrollRpcRow[] = [];

            if (isAdmin) {
                const { data, error } = await supabase.rpc("get_team_payroll_summary", {
                    p_company_id: companyId,
                    p_start_date: startDate,
                    p_end_date: endDate,
                });

                if (error) throw error;
                payrollRows = (data as PayrollRpcRow[]) ?? [];
            } else {
                const [{ data: member, error: memberError }, { data: shifts, error: shiftsError }] =
                    await Promise.all([
                        supabase
                            .from("company_members")
                            .select("user_id, full_name, role")
                            .eq("company_id", companyId)
                            .eq("user_id", user.id)
                            .maybeSingle(),
                        supabase
                            .from("shifts")
                            .select("user_id, check_in_at, check_out_at")
                            .eq("company_id", companyId)
                            .eq("user_id", user.id)
                            .lt("check_in_at", bounds.endIso)
                            .or(`check_out_at.is.null,check_out_at.gt.${bounds.startIso}`),
                    ]);

                if (memberError) throw memberError;
                if (shiftsError) throw shiftsError;

                const shiftRows = ((shifts ?? []) as TimeEntryRow[]);
                const closedHours = shiftRows
                    .filter((row) => row.check_out_at)
                    .reduce((sum, row) => sum + boundedHours(row, bounds.start, bounds.endExclusive), 0);
                const runningHours = shiftRows
                    .filter((row) => !row.check_out_at)
                    .reduce((sum, row) => sum + boundedHours(row, bounds.start, bounds.endExclusive), 0);

                payrollRows = [
                    {
                        user_id: user.id,
                        full_name: (member as any)?.full_name ?? user.email ?? "My hours",
                        role: (member as any)?.role ?? myRole ?? "tech",
                        closed_hours: Math.round(closedHours * 100) / 100,
                        running_hours: Math.round(runningHours * 100) / 100,
                        visible_hours: Math.round((closedHours + runningHours) * 100) / 100,
                        hourly_rate: null,
                        currency_code: "CAD",
                        estimated_pay_closed: null,
                        estimated_pay_visible: null,
                    },
                ];
            }

            const userIds = payrollRows.map((row) => row.user_id).filter(Boolean);
            let workOrderEntries: TimeEntryRow[] = [];

            if (userIds.length > 0) {
                let query = supabase
                    .from("work_order_check_ins")
                    .select("user_id, work_order_id, check_in_at, check_out_at")
                    .eq("company_id", companyId)
                    .lt("check_in_at", bounds.endIso)
                    .or(`check_out_at.is.null,check_out_at.gt.${bounds.startIso}`);

                if (isAdmin) {
                    query = query.in("user_id", userIds);
                } else {
                    query = query.eq("user_id", user.id);
                }

                const { data: workOrderData, error: workOrderError } = await query;
                if (workOrderError) throw workOrderError;
                workOrderEntries = (workOrderData ?? []) as TimeEntryRow[];
            }

            const workHoursByUser = new Map<string, { hours: number; workOrders: Set<string> }>();

            workOrderEntries.forEach((entry) => {
                const current = workHoursByUser.get(entry.user_id) ?? {
                    hours: 0,
                    workOrders: new Set<string>(),
                };

                current.hours += boundedHours(entry, bounds.start, bounds.endExclusive);
                if (entry.work_order_id) current.workOrders.add(entry.work_order_id);
                workHoursByUser.set(entry.user_id, current);
            });

            const nextRows = payrollRows.map((row) => {
                const work = workHoursByUser.get(row.user_id);
                const workOrderHours = Math.round((work?.hours ?? 0) * 100) / 100;
                const visibleHours = Number(row.visible_hours ?? 0);

                return {
                    ...row,
                    work_order_hours: workOrderHours,
                    unassigned_hours: Math.max(0, Math.round((visibleHours - workOrderHours) * 100) / 100),
                    work_order_count: work?.workOrders.size ?? 0,
                };
            });

            setRows(nextRows);
        } catch (e: any) {
            setErrorMsg(e?.message ?? "Could not load payroll.");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [companyId, endDate, isAdmin, myRole, startDate, user]);

    useEffect(() => {
        if (authLoading || isLoadingCompany) return;
        if (!user || !companyId) return;
        loadPayroll();
    }, [authLoading, companyId, isLoadingCompany, loadPayroll, user]);

    const sortedRows = useMemo(() => {
        return [...rows].sort((a, b) => Number(b.visible_hours ?? 0) - Number(a.visible_hours ?? 0));
    }, [rows]);

    const totals = useMemo(() => {
        return rows.reduce(
            (acc, row) => {
                acc.closed += Number(row.closed_hours ?? 0);
                acc.running += Number(row.running_hours ?? 0);
                acc.shift += Number(row.visible_hours ?? 0);
                acc.workOrders += Number(row.work_order_hours ?? 0);
                acc.unassigned += Number(row.unassigned_hours ?? 0);
                acc.pay += row.hourly_rate == null ? 0 : Number(row.estimated_pay_visible ?? 0);
                if (row.hourly_rate == null) acc.missingRates += 1;
                if (Number(row.running_hours ?? 0) > 0) acc.onShift += 1;
                return acc;
            },
            {
                closed: 0,
                running: 0,
                shift: 0,
                workOrders: 0,
                unassigned: 0,
                pay: 0,
                missingRates: 0,
                onShift: 0,
            }
        );
    }, [rows]);

    function downloadCsv() {
        if (!rows.length) return;

        const headers = isAdmin
            ? [
                  "Employee",
                  "Role",
                  "Closed shift hours",
                  "Running shift hours",
                  "Total shift hours",
                  "Work order hours",
                  "Unassigned hours",
                  "Hourly rate",
                  "Estimated pay",
                  "Status",
              ]
            : [
                  "Employee",
                  "Role",
                  "Closed shift hours",
                  "Running shift hours",
                  "Total shift hours",
                  "Work order hours",
                  "Unassigned hours",
                  "Status",
              ];

        const csvRows = sortedRows.map((row) => {
            const base = [
                row.full_name?.trim() || "Unnamed member",
                humanRole(row.role),
                Number(row.closed_hours ?? 0).toFixed(2),
                Number(row.running_hours ?? 0).toFixed(2),
                Number(row.visible_hours ?? 0).toFixed(2),
                Number(row.work_order_hours ?? 0).toFixed(2),
                Number(row.unassigned_hours ?? 0).toFixed(2),
            ];

            if (!isAdmin) return [...base, statusFor(row)];

            return [
                ...base,
                row.hourly_rate != null ? formatMoney(row.hourly_rate, row.currency_code) : "Rate not set",
                row.hourly_rate != null ? formatMoney(row.estimated_pay_visible, row.currency_code) : "Rate not set",
                statusFor(row),
            ];
        });

        const csvContent = [headers, ...csvRows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `payroll-${startDate}-to-${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    if (authLoading || isLoadingCompany) {
        return <PageState title="Payroll" message="Loading payroll access..." />;
    }

    if (!user) {
        return <PageState title="Payroll" message="You must sign in to access payroll." />;
    }

    return (
        <div style={pageStyle}>
            <header style={headerStyle}>
                <div>
                    <div style={eyebrowStyle}>Operations / Payroll</div>
                    <h1 style={titleStyle}>{isAdmin ? "Payroll" : "My Time"}</h1>
                    <p style={subtitleStyle}>
                        {isAdmin
                            ? `Review shift hours, work order time, and estimated pay for ${companyName || "your company"}.`
                            : "Review your shift hours and work order time for the selected period."}
                    </p>
                </div>

                <button type="button" onClick={loadPayroll} style={secondaryButtonStyle}>
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </header>

            {errorMsg ? (
                <div style={errorStyle}>
                    <strong>Error:</strong> {errorMsg}
                </div>
            ) : null}

            <section style={toolbarStyle}>
                <div style={segmentedStyle}>
                    {[
                        ["this_week", "This week"],
                        ["last_week", "Last week"],
                        ["this_month", "This month"],
                        ["custom", "Custom"],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => applyPreset(value as PeriodPreset)}
                            style={{
                                ...segmentButtonStyle,
                                ...(preset === value ? segmentButtonActiveStyle : null),
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div style={dateControlsStyle}>
                    <label style={dateLabelStyle}>
                        Start
                        <input
                            type="date"
                            value={startDate}
                            onChange={(event) => {
                                setPreset("custom");
                                setStartDate(event.target.value);
                            }}
                            style={dateInputStyle}
                        />
                    </label>

                    <label style={dateLabelStyle}>
                        End
                        <input
                            type="date"
                            value={endDate}
                            onChange={(event) => {
                                setPreset("custom");
                                setEndDate(event.target.value);
                            }}
                            style={dateInputStyle}
                        />
                    </label>
                </div>
            </section>

            <section style={statsGridStyle}>
                <StatCard label="Period" value={rangeLabel(startDate, endDate)} />
                <StatCard label="Shift hours" value={formatHours(totals.shift)} />
                <StatCard label="Work order hours" value={formatHours(totals.workOrders)} />
                <StatCard label="Unassigned hours" value={formatHours(totals.unassigned)} />
                {isAdmin ? <StatCard label="Estimated payroll" value={formatMoney(totals.pay, "CAD")} /> : null}
                <StatCard label="On shift now" value={String(totals.onShift)} />
                {isAdmin ? <StatCard label="Missing rates" value={String(totals.missingRates)} /> : null}
            </section>

            <section style={cardStyle}>
                <div style={sectionHeaderStyle}>
                    <div>
                        <h2 style={sectionTitleStyle}>{isAdmin ? "Team Payroll" : "My Payroll Time"}</h2>
                        <p style={sectionTextStyle}>
                            Payroll is based on My Day shift check-ins. Work order time is shown separately for productivity review.
                        </p>
                    </div>

                    <button type="button" onClick={downloadCsv} disabled={!rows.length || loading} style={secondaryButtonStyle}>
                        Export CSV
                    </button>
                </div>

                {loading ? (
                    <div style={emptyStateStyle}>Loading payroll...</div>
                ) : sortedRows.length === 0 ? (
                    <div style={emptyStateStyle}>No payroll time found for this period.</div>
                ) : (
                    <div style={tableWrapStyle}>
                        <table style={tableStyle}>
                            <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                    <th style={thStyle}>Employee</th>
                                    <th style={thStyle}>Role</th>
                                    <th style={thStyleRight}>Shift Hours</th>
                                    <th style={thStyleRight}>Running</th>
                                    <th style={thStyleRight}>Work Orders</th>
                                    <th style={thStyleRight}>Unassigned</th>
                                    {isAdmin ? <th style={thStyleRight}>Rate</th> : null}
                                    {isAdmin ? <th style={thStyleRight}>Estimated Pay</th> : null}
                                    <th style={thStyle}>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {sortedRows.map((row, index) => {
                                    const status = statusFor(row);
                                    const memberName = row.full_name?.trim() || "Unnamed member";
                                    const canOpenMember = isAdmin;

                                    return (
                                        <tr key={row.user_id} style={{ background: index % 2 === 0 ? "#fff" : "#fafafa" }}>
                                            <td style={tdStyle}>
                                                {canOpenMember ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => router.push(`/settings/team/${row.user_id}`)}
                                                        style={linkButtonStyle}
                                                    >
                                                        {memberName}
                                                    </button>
                                                ) : (
                                                    <strong>{memberName}</strong>
                                                )}
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={roleBadgeStyle}>{humanRole(row.role)}</span>
                                            </td>
                                            <td style={tdStyleNumeric}>{formatHours(row.visible_hours)}</td>
                                            <td style={tdStyleNumeric}>{formatHours(row.running_hours)}</td>
                                            <td style={tdStyleNumeric}>
                                                {formatHours(row.work_order_hours)}
                                                <div style={microTextStyle}>
                                                    {row.work_order_count} WO
                                                </div>
                                            </td>
                                            <td style={tdStyleNumeric}>{formatHours(row.unassigned_hours)}</td>
                                            {isAdmin ? (
                                                <td style={tdStyleNumeric}>
                                                    {row.hourly_rate == null ? (
                                                        <span style={warningBadgeStyle}>Rate not set</span>
                                                    ) : (
                                                        formatMoney(row.hourly_rate, row.currency_code)
                                                    )}
                                                </td>
                                            ) : null}
                                            {isAdmin ? (
                                                <td style={{ ...tdStyleNumeric, fontWeight: 800, color: row.hourly_rate == null ? "#92400e" : "#065f46" }}>
                                                    {row.hourly_rate == null ? (
                                                        <span style={warningBadgeStyle}>Rate not set</span>
                                                    ) : (
                                                        formatMoney(row.estimated_pay_visible, row.currency_code)
                                                    )}
                                                </td>
                                            ) : null}
                                            <td style={tdStyle}>
                                                <span style={statusBadgeStyle(status)}>{status}</span>
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

function PageState({ title, message }: { title: string; message: string }) {
    return (
        <div style={pageStyle}>
            <section style={cardStyle}>
                <h1 style={{ ...titleStyle, fontSize: 32 }}>{title}</h1>
                <p style={sectionTextStyle}>{message}</p>
            </section>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div style={statCardStyle}>
            <div style={statLabelStyle}>{label}</div>
            <div style={statValueStyle}>{value}</div>
        </div>
    );
}

const pageStyle: CSSProperties = {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto",
    padding: "8px 0 40px 0",
};

const headerStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    paddingBottom: 18,
    borderBottom: `1px solid ${MR_THEME.colors.border}`,
    marginBottom: 18,
};

const eyebrowStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: MR_THEME.colors.textSecondary,
    marginBottom: 10,
};

const titleStyle: CSSProperties = {
    fontSize: 40,
    lineHeight: 1.05,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: MR_THEME.colors.textPrimary,
    margin: 0,
};

const subtitleStyle: CSSProperties = {
    margin: "10px 0 0 0",
    fontSize: 16,
    lineHeight: 1.6,
    color: MR_THEME.colors.textSecondary,
    maxWidth: 780,
};

const toolbarStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 18,
};

const segmentedStyle: CSSProperties = {
    display: "inline-flex",
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    borderRadius: MR_THEME.radius.control,
    background: "#ffffff",
    padding: 4,
    gap: 4,
};

const segmentButtonStyle: CSSProperties = {
    minHeight: 36,
    padding: "0 12px",
    border: "1px solid transparent",
    borderRadius: 8,
    background: "transparent",
    color: MR_THEME.colors.textSecondary,
    fontWeight: 800,
    cursor: "pointer",
};

const segmentButtonActiveStyle: CSSProperties = {
    background: MR_THEME.colors.primary,
    borderColor: MR_THEME.colors.primaryHover,
    color: "#ffffff",
};

const dateControlsStyle: CSSProperties = {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
};

const dateLabelStyle: CSSProperties = {
    display: "grid",
    gap: 6,
    fontSize: 12,
    fontWeight: 800,
    color: MR_THEME.colors.textSecondary,
};

const dateInputStyle: CSSProperties = {
    height: 40,
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    padding: "0 10px",
    color: MR_THEME.colors.textPrimary,
    background: "#ffffff",
    fontWeight: 700,
};

const statsGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 18,
};

const statCardStyle: CSSProperties = {
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: MR_THEME.radius.card,
    background: MR_THEME.colors.cardBg,
    padding: 16,
    boxShadow: MR_THEME.shadows.cardSoft,
};

const statLabelStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    color: MR_THEME.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 8,
};

const statValueStyle: CSSProperties = {
    fontSize: 24,
    lineHeight: 1.1,
    fontWeight: 900,
    color: MR_THEME.colors.textPrimary,
};

const cardStyle: CSSProperties = {
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: MR_THEME.radius.card,
    background: MR_THEME.colors.cardBg,
    padding: 20,
    boxShadow: MR_THEME.shadows.cardSoft,
};

const sectionHeaderStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 18,
};

const sectionTitleStyle: CSSProperties = {
    margin: 0,
    fontSize: 22,
    fontWeight: 900,
    color: MR_THEME.colors.textPrimary,
};

const sectionTextStyle: CSSProperties = {
    margin: "6px 0 0 0",
    fontSize: 14,
    lineHeight: 1.5,
    color: MR_THEME.colors.textSecondary,
};

const secondaryButtonStyle: CSSProperties = {
    height: 42,
    padding: "0 16px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 14,
};

const errorStyle: CSSProperties = {
    marginBottom: 16,
    padding: 12,
    border: "1px solid #fecaca",
    background: "#fff5f5",
    borderRadius: MR_THEME.radius.control,
    color: "#991b1b",
    fontSize: 13,
};

const emptyStateStyle: CSSProperties = {
    padding: "24px 8px",
    fontSize: 14,
    color: MR_THEME.colors.textSecondary,
};

const tableWrapStyle: CSSProperties = {
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: MR_THEME.radius.control,
    overflowX: "auto",
    background: "#ffffff",
};

const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 980,
};

const thStyle: CSSProperties = {
    padding: "14px 14px",
    fontSize: 12,
    fontWeight: 900,
    color: MR_THEME.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    textAlign: "left",
    borderBottom: `1px solid ${MR_THEME.colors.border}`,
};

const thStyleRight: CSSProperties = {
    ...thStyle,
    textAlign: "right",
};

const tdStyle: CSSProperties = {
    padding: "14px",
    fontSize: 14,
    color: MR_THEME.colors.textPrimary,
    borderBottom: `1px solid ${MR_THEME.colors.border}`,
    verticalAlign: "middle",
};

const tdStyleNumeric: CSSProperties = {
    ...tdStyle,
    textAlign: "right",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

const linkButtonStyle: CSSProperties = {
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    color: MR_THEME.colors.textPrimary,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 800,
    textDecoration: "underline",
};

const roleBadgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 10px",
    borderRadius: 999,
    background: "#f3f4f6",
    border: `1px solid ${MR_THEME.colors.border}`,
    color: "#374151",
    fontSize: 12,
    fontWeight: 800,
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
    fontWeight: 800,
    lineHeight: 1,
};

const microTextStyle: CSSProperties = {
    marginTop: 3,
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 11,
    color: MR_THEME.colors.textSecondary,
};

function statusBadgeStyle(status: string): CSSProperties {
    if (status === "On shift") {
        return {
            ...warningBadgeStyle,
            background: "#eff6ff",
            borderColor: "#bfdbfe",
            color: "#1d4ed8",
        };
    }

    if (status === "Missing rate") return warningBadgeStyle;

    if (status === "Ready") {
        return {
            ...warningBadgeStyle,
            background: "#ecfdf5",
            borderColor: "#bbf7d0",
            color: "#047857",
        };
    }

    return {
        ...warningBadgeStyle,
        background: "#f3f4f6",
        borderColor: "#e5e7eb",
        color: "#374151",
    };
}
