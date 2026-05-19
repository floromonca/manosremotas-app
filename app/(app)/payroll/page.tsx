"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import { useAuthState } from "../../../hooks/useAuthState";
import { MR_THEME } from "@/lib/theme";
import { canManagePayroll } from "@/lib/security/roles";
import { hasPlanFeature } from "@/lib/features/entitlements";
import LockedFeatureCard from "@/app/components/LockedFeatureCard";

import {
    buildPayrollV1Row,
    type PayrollScheduleInput,
    type PayrollShiftInput,
    type PayrollV1Flag,
    type PayrollV1Row,
    type PayrollV1Status,
} from "@/lib/payroll/calculations";
import styles from "./payroll.module.css";

type ShiftRow = PayrollShiftInput & {
    user_id: string;
};

type ScheduleRow = PayrollScheduleInput & {
    user_id: string;
};

type MemberRow = {
    user_id: string;
    full_name: string | null;
    role: string | null;
};

type PayRateRow = {
    user_id: string;
    hourly_rate: number | null;
    currency_code: string | null;
    effective_from: string | null;
    created_at: string | null;
};

type PeriodPreset = "this_week" | "last_week" | "this_month" | "custom";

type PayrollFlag = {
    label: string;
    tone: "info" | "warning" | "danger" | "neutral";
};

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

function payrollFlagsFor(row: PayrollV1Row): PayrollFlag[] {
    return row.flags.map((flag) => ({
        label: flag,
        tone: payrollFlagTone(flag),
    }));
}

function payrollFlagTone(flag: PayrollV1Flag): PayrollFlag["tone"] {
    if (flag === "Open shift") return "info";
    if (flag === "Missing rate" || flag === "Missing schedule") return "warning";
    if (flag === "Over scheduled hours" || flag === "Under scheduled hours") return "warning";
    return "neutral";
}

export default function PayrollPage() {
    const router = useRouter();
    const { user, authLoading } = useAuthState();
    const { companyId, companyName, companyPlan, myRole, isLoadingCompany } = useActiveCompany();
    const canAccessPayroll =
        canManagePayroll(myRole) &&
        hasPlanFeature(companyPlan, "payroll");

    const initialRange = useMemo(() => getPresetRange("this_week"), []);
    const [preset, setPreset] = useState<PeriodPreset>("this_week");
    const [startDate, setStartDate] = useState(initialRange.startDate);
    const [endDate, setEndDate] = useState(initialRange.endDate);
    const [rows, setRows] = useState<PayrollV1Row[]>([]);
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

        if (!user) {
            router.replace("/auth");
        }
    }, [authLoading, isLoadingCompany, router, user]);

    const loadPayroll = useCallback(async () => {
        if (!companyId || !user) return;
        if (!canAccessPayroll) return;
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

            const [
                { data: members, error: membersError },
                { data: shifts, error: shiftsError },
                { data: rates, error: ratesError },
                { data: schedules, error: schedulesError },
            ] =
                await Promise.all([
                    supabase
                        .from("company_members")
                        .select("user_id, full_name, role")
                        .eq("company_id", companyId)
                        .eq("active", true),
                    supabase
                        .from("shifts")
                        .select("user_id, check_in_at, check_out_at")
                        .eq("company_id", companyId)
                        .lt("check_in_at", bounds.endIso)
                        .or(`check_out_at.is.null,check_out_at.gt.${bounds.startIso}`),
                    supabase
                        .from("member_pay_rates")
                        .select("user_id, hourly_rate, currency_code, effective_from, created_at")
                        .eq("company_id", companyId)
                        .lte("effective_from", endDate)
                        .or(`effective_to.is.null,effective_to.gte.${startDate}`),
                    supabase
                        .from("member_work_schedules")
                        .select("user_id, day_of_week, is_working_day, start_time, end_time, unpaid_break_minutes")
                        .eq("company_id", companyId),
                ]);

            if (membersError) throw membersError;
            if (shiftsError) throw shiftsError;
            if (ratesError) throw ratesError;
            if (schedulesError) throw schedulesError;

            const shiftsByUser = new Map<string, ShiftRow[]>();
            ((shifts ?? []) as ShiftRow[]).forEach((shift) => {
                shiftsByUser.set(shift.user_id, [...(shiftsByUser.get(shift.user_id) ?? []), shift]);
            });

            const schedulesByUser = new Map<string, PayrollScheduleInput[]>();
            ((schedules ?? []) as ScheduleRow[]).forEach((schedule) => {
                schedulesByUser.set(schedule.user_id, [
                    ...(schedulesByUser.get(schedule.user_id) ?? []),
                    {
                        day_of_week: schedule.day_of_week,
                        is_working_day: schedule.is_working_day,
                        start_time: schedule.start_time,
                        end_time: schedule.end_time,
                        unpaid_break_minutes: schedule.unpaid_break_minutes,
                    },
                ]);
            });

            const rateByUser = new Map<string, PayRateRow>();
            ((rates ?? []) as PayRateRow[]).forEach((rate) => {
                const current = rateByUser.get(rate.user_id);
                const currentDate = current?.effective_from ?? current?.created_at ?? "";
                const nextDate = rate.effective_from ?? rate.created_at ?? "";

                if (!current || nextDate >= currentDate) {
                    rateByUser.set(rate.user_id, rate);
                }
            });

            const nextRows = ((members ?? []) as MemberRow[]).map((member) => {
                const payRate = rateByUser.get(member.user_id);
                const hourlyRate =
                    payRate?.hourly_rate != null ? Number(payRate.hourly_rate) : null;

                return buildPayrollV1Row({
                    user_id: member.user_id,
                    full_name: member.full_name,
                    role: member.role,
                    scheduleRows: schedulesByUser.get(member.user_id) ?? [],
                    shifts: shiftsByUser.get(member.user_id) ?? [],
                    rate: {
                        hourly_rate: hourlyRate,
                        currency_code: payRate?.currency_code ?? "CAD",
                    },
                    startDate,
                    endDate,
                });
            });

            setRows(nextRows);
        } catch (e: any) {
            setErrorMsg(e?.message ?? "Could not load payroll.");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [canAccessPayroll, companyId, endDate, startDate, user]);

    useEffect(() => {
        if (authLoading || isLoadingCompany) return;
        if (!user || !companyId) return;
        if (!canAccessPayroll) return;
        loadPayroll();
    }, [authLoading, canAccessPayroll, companyId, isLoadingCompany, loadPayroll, user]);

    const sortedRows = useMemo(() => {
        return [...rows].sort((a, b) => Number(b.worked_hours ?? 0) - Number(a.worked_hours ?? 0));
    }, [rows]);

    const totals = useMemo(() => {
        return rows.reduce(
            (acc, row) => {
                acc.scheduled += Number(row.scheduled_hours ?? 0);
                acc.worked += Number(row.worked_hours ?? 0);
                acc.difference += Number(row.difference_hours ?? 0);
                acc.pay += row.estimated_pay == null ? 0 : Number(row.estimated_pay ?? 0);
                if (row.flags.includes("Missing rate")) acc.missingRates += 1;
                if (row.flags.includes("Open shift")) acc.openShifts += 1;
                if (row.status === "Needs Review" || row.status === "Missing Rate" || row.status === "Missing Schedule") {
                    acc.needsReview += 1;
                }
                return acc;
            },
            {
                scheduled: 0,
                worked: 0,
                difference: 0,
                pay: 0,
                missingRates: 0,
                openShifts: 0,
                needsReview: 0,
            }
        );
    }, [rows]);

    function downloadCsv() {
        if (!rows.length) return;

        const headers = [
            "Employee",
            "Role",
            "Scheduled Hours",
            "Worked Hours",
            "Difference Hours",
            "Hourly Rate",
            "Currency",
            "Estimated Pay",
            "Flags",
            "Status",
        ];

        const csvRows = sortedRows.map((row) => {
            return [
                row.full_name?.trim() || "Unnamed member",
                humanRole(row.role),
                Number(row.scheduled_hours ?? 0).toFixed(2),
                Number(row.worked_hours ?? 0).toFixed(2),
                Number(row.difference_hours ?? 0).toFixed(2),
                row.hourly_rate != null ? Number(row.hourly_rate).toFixed(2) : "Rate not set",
                row.currency_code,
                row.estimated_pay != null ? formatMoney(row.estimated_pay, row.currency_code) : "Rate not set",
                payrollFlagsFor(row).map((flag) => flag.label).join("; "),
                row.status,
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

    if (!canAccessPayroll) {
        return (
            <div style={pageStyle}>
                <LockedFeatureCard
                    eyebrow="Payroll"
                    title="Track labor cost and payroll with confidence."
                    description="Payroll is available on the Business plan. Upgrade to review worked hours, scheduled hours, pay rates, estimated labor cost, and payroll exceptions in one place."
                    planLabel="Available on Business"
                    ctaLabel="View current plan"
                    ctaHref="/settings/billing"
                />
            </div>
        );
    }

    return (
        <div style={pageStyle}>
            <header style={headerStyle}>
                <div>
                    <div style={eyebrowStyle}>Operations / Payroll</div>
                    <h1 style={titleStyle}>Payroll</h1>
                    <p style={subtitleStyle}>
                        {`Review scheduled hours, worked hours, and estimated pay for ${companyName || "your company"}.`}
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

            <div style={periodTextStyle}>
                <strong>Period:</strong> {rangeLabel(startDate, endDate)}
            </div>

            <section style={statsGridStyle}>
                <StatCard label="Estimated payroll" value={formatMoney(totals.pay, "CAD")} detail="Based on worked hours" />
                <StatCard label="Worked hours" value={formatHours(totals.worked)} detail={`Scheduled: ${formatHours(totals.scheduled)}`} />
                <StatCard label="Needs review" value={String(totals.needsReview)} detail={`${totals.missingRates} missing rates`} />
                <StatCard label="Open shifts" value={String(totals.openShifts)} detail="May affect totals" />
            </section>

            <section style={cardStyle}>
                <div style={sectionHeaderStyle}>
                    <div>
                        <h2 style={sectionTitleStyle}>Team Payroll</h2>
                        <p style={sectionTextStyle}>
                            Review scheduled hours, worked shift hours, estimated pay, and items that need attention.
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
                    <div className={styles.desktopTable} style={tableWrapStyle}>
                        <table style={tableStyle}>
                            <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                    <th style={thStyle}>Employee</th>
                                    <th style={thStyle}>Role</th>
                                    <th style={thStyleRight}>Scheduled</th>
                                    <th style={thStyleRight}>Worked</th>
                                    <th style={thStyleRight}>Over / Under</th>
                                    <th style={thStyleRight}>Rate</th>
                                    <th style={thStyleRight}>Estimated Pay</th>
                                    <th style={thStyle}>Flags</th>
                                    <th style={thStyle}>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {sortedRows.map((row, index) => {
                                    const status = row.status;
                                    const memberName = row.full_name?.trim() || "Unnamed member";
                                    const flags = payrollFlagsFor(row);

                                    return (
                                        <tr key={row.user_id} style={{ background: index % 2 === 0 ? "#fff" : "#fafafa" }}>
                                            <td style={tdStyle}>
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/payroll/members/${row.user_id}`)}
                                                    style={linkButtonStyle}
                                                >
                                                    {memberName}
                                                </button>
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={roleBadgeStyle}>{humanRole(row.role)}</span>
                                            </td>
                                            <td style={tdStyleNumeric}>{formatHours(row.scheduled_hours)}</td>
                                            <td style={tdStyleNumeric}>{formatHours(row.worked_hours)}</td>
                                            <td style={tdStyleNumeric}>{formatHours(row.difference_hours)}</td>
                                            <td style={tdStyleNumeric}>
                                                {row.hourly_rate == null ? (
                                                    <span style={warningBadgeStyle}>Rate not set</span>
                                                ) : (
                                                    formatMoney(row.hourly_rate, row.currency_code)
                                                )}
                                            </td>
                                            <td style={{ ...tdStyleNumeric, fontWeight: 800, color: row.estimated_pay == null ? "#92400e" : "#065f46" }}>
                                                {row.estimated_pay == null ? (
                                                    <span style={warningBadgeStyle}>Rate not set</span>
                                                ) : (
                                                    formatMoney(row.estimated_pay, row.currency_code)
                                                )}
                                            </td>
                                            <td style={tdStyle}>
                                                {flags.length > 0 ? (
                                                    <div style={flagListStyle}>
                                                        {flags.map((flag) => (
                                                            <span key={flag.label} style={flagBadgeStyle(flag.tone)}>
                                                                {flag.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={microTextStyle}>-</span>
                                                )}
                                            </td>
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

                {!loading && sortedRows.length > 0 ? (
                    <div className={styles.mobileCards} style={mobileCardsStyle}>
                        {sortedRows.map((row) => {
                            const status = row.status;
                            const memberName = row.full_name?.trim() || "Unnamed member";
                            const flags = payrollFlagsFor(row);

                            return (
                                <article key={`${row.user_id}-mobile`} style={mobileCardStyle}>
                                    <div style={mobileCardHeaderStyle}>
                                        <div style={{ minWidth: 0 }}>
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/payroll/members/${row.user_id}`)}
                                                style={{
                                                    ...mobileNameButtonStyle,
                                                    cursor: "pointer",
                                                    textDecoration: "underline",
                                                }}
                                            >
                                                {memberName}
                                            </button>
                                            <div style={mobileSubheadStyle}>{humanRole(row.role)}</div>
                                        </div>

                                        <span style={statusBadgeStyle(status)}>{status}</span>
                                    </div>

                                    <div style={mobileMetricGridStyle}>
                                        <MobileMetric label="Scheduled Hours" value={formatHours(row.scheduled_hours)} />
                                        <MobileMetric label="Worked Hours" value={formatHours(row.worked_hours)} />
                                        <MobileMetric label="Over / Under" value={formatHours(row.difference_hours)} />
                                        <MobileMetric
                                            label="Rate"
                                            value={row.hourly_rate == null ? "Not set" : formatMoney(row.hourly_rate, row.currency_code)}
                                        />
                                        <MobileMetric
                                            label="Estimated Pay"
                                            value={row.estimated_pay == null ? "Not set" : formatMoney(row.estimated_pay, row.currency_code)}
                                            emphasis
                                        />
                                    </div>

                                    {flags.length > 0 ? (
                                        <div style={mobileFlagsStyle}>
                                            {flags.map((flag) => (
                                                <span key={flag.label} style={flagBadgeStyle(flag.tone)}>
                                                    {flag.label}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                </article>
                            );
                        })}
                    </div>
                ) : null}
            </section>
        </div>
    );
}

function MobileMetric({
    label,
    value,
    hint,
    emphasis,
}: {
    label: string;
    value: string;
    hint?: string;
    emphasis?: boolean;
}) {
    return (
        <div style={mobileMetricStyle}>
            <div style={mobileMetricLabelStyle}>{label}</div>
            <div
                style={{
                    ...mobileMetricValueStyle,
                    color: emphasis ? "#065f46" : MR_THEME.colors.textPrimary,
                }}
            >
                {value}
            </div>
            {hint ? <div style={microTextStyle}>{hint}</div> : null}
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

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
    return (
        <div style={statCardStyle}>
            <div style={statLabelStyle}>{label}</div>
            <div style={statValueStyle}>{value}</div>
            {detail ? <div style={statDetailStyle}>{detail}</div> : null}
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
    border: `1px solid ${MR_THEME.colors.primaryHover}`,
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

const periodTextStyle: CSSProperties = {
    margin: "-6px 0 14px 0",
    fontSize: 14,
    lineHeight: 1.4,
    color: MR_THEME.colors.textSecondary,
};

const statsGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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

const statDetailStyle: CSSProperties = {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 1.35,
    color: MR_THEME.colors.textSecondary,
    fontWeight: 700,
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

const mobileCardsStyle: CSSProperties = {
    display: "none",
};

const mobileCardStyle: CSSProperties = {
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: MR_THEME.radius.control,
    background: "#ffffff",
    padding: 14,
    display: "grid",
    gap: 12,
};

const mobileCardHeaderStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
};

const mobileNameButtonStyle: CSSProperties = {
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    color: MR_THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: 900,
    textAlign: "left",
    overflowWrap: "anywhere",
};

const mobileSubheadStyle: CSSProperties = {
    marginTop: 4,
    fontSize: 12,
    fontWeight: 800,
    color: MR_THEME.colors.textSecondary,
};

const mobileMetricGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
};

const mobileMetricStyle: CSSProperties = {
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: 10,
    background: "#f8fafc",
    padding: 10,
    minWidth: 0,
};

const mobileMetricLabelStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 900,
    color: MR_THEME.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 6,
};

const mobileMetricValueStyle: CSSProperties = {
    fontSize: 18,
    lineHeight: 1.15,
    fontWeight: 900,
    color: MR_THEME.colors.textPrimary,
    overflowWrap: "anywhere",
};

const flagListStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
};

const mobileFlagsStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 2,
};

function flagBadgeStyle(tone: PayrollFlag["tone"]): CSSProperties {
    const colorMap = {
        info: {
            background: "#eff6ff",
            border: "#bfdbfe",
            color: "#1d4ed8",
        },
        warning: {
            background: "#fffbeb",
            border: "#fde68a",
            color: "#92400e",
        },
        danger: {
            background: "#fef2f2",
            border: "#fecaca",
            color: "#991b1b",
        },
        neutral: {
            background: "#f3f4f6",
            border: "#e5e7eb",
            color: "#374151",
        },
    }[tone];

    return {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5px 9px",
        borderRadius: 999,
        background: colorMap.background,
        border: `1px solid ${colorMap.border}`,
        color: colorMap.color,
        fontSize: 11,
        fontWeight: 900,
        lineHeight: 1,
        whiteSpace: "nowrap",
    };
}

function statusBadgeStyle(status: PayrollV1Status): CSSProperties {
    if (status === "Open Shift") {
        return {
            ...warningBadgeStyle,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1d4ed8",
        };
    }

    if (status === "Missing Rate" || status === "Missing Schedule" || status === "Needs Review") return warningBadgeStyle;

    if (status === "Ready") {
        return {
            ...warningBadgeStyle,
            background: "#ecfdf5",
            border: "1px solid #bbf7d0",
            color: "#047857",
        };
    }

    return {
        ...warningBadgeStyle,
        background: "#f3f4f6",
        border: "1px solid #e5e7eb",
        color: "#374151",
    };
}
