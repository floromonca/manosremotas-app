"use client";

import type { CSSProperties } from "react";
import {
    cardStyle,
    mutedTextStyle,
    sectionTitleStyleNoMargin,
    compactRunningBadgeStyle,
    compactClosedBadgeStyle,
} from "../memberDetailStyles";
import {
    formatShortDate,
    formatTime,
    formatHours,
    formatMoney,
} from "../memberDetailUtils";

type ShiftRow = {
    shift_id: string;
    check_in_at: string | null;
    check_out_at: string | null;
    display_hours: number | null;
    hourly_rate: number | null;
    estimated_pay_display: number | null;
    currency_code: string | null;
};

type Props = {
    loading: boolean;
    shiftHistory: ShiftRow[];
    currencyCode: string;
};

export default function MemberShiftHistoryCard({
    loading,
    shiftHistory,
    currencyCode,
}: Props) {
    return (
        <section style={cardStyle}>
            <div style={headerStyle}>
                <div style={sectionTitleStyleNoMargin}>Shift history</div>
                <div style={countStyle}>
                    {loading
                        ? "Loading history..."
                        : `${shiftHistory.length} shift${
                              shiftHistory.length === 1 ? "" : "s"
                          }`}
                </div>
            </div>

            {loading ? (
                <div style={mutedTextStyle}>Loading shift history...</div>
            ) : shiftHistory.length === 0 ? (
                <div style={mutedTextStyle}>
                    No shift history found for this member.
                </div>
            ) : (
                <div style={tableContainerStyle}>
                    <div style={tableHeaderStyle}>
                        {[
                            "Date",
                            "Check-in",
                            "Check-out",
                            "Hours",
                            "Rate",
                            "Pay",
                            "Status",
                        ].map((label) => (
                            <div key={label} style={headerCellStyle}>
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
                                    ...rowStyle,
                                    borderBottom:
                                        index ===
                                        Math.min(shiftHistory.length, 5) - 1
                                            ? "none"
                                            : "1px solid #e5e7eb",
                                    background:
                                        index % 2 === 0 ? "#fff" : "#fafafa",
                                }}
                            >
                                <Cell strong>
                                    {formatShortDate(shift.check_in_at)}
                                </Cell>

                                <Cell>
                                    {formatTime(shift.check_in_at)}
                                </Cell>

                                <Cell>
                                    {running
                                        ? "Running"
                                        : formatTime(shift.check_out_at)}
                                </Cell>

                                <Cell mono right>
                                    {formatHours(shift.display_hours)}
                                </Cell>

                                <Cell mono right>
                                    {shift.hourly_rate != null
                                        ? formatMoney(
                                              shift.hourly_rate,
                                              shift.currency_code || currencyCode
                                          )
                                        : "—"}
                                </Cell>

                                <Cell mono right strong>
                                    {payValue}
                                </Cell>

                                <div style={statusCellStyle}>
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
    );
}

/* ---------- small UI helpers ---------- */

function Cell({
    children,
    strong,
    mono,
    right,
}: {
    children: any;
    strong?: boolean;
    mono?: boolean;
    right?: boolean;
}) {
    return (
        <div
            style={{
                padding: "12px",
                fontSize: 14,
                color: "#111827",
                fontWeight: strong ? 600 : 400,
                textAlign: right ? "right" : "left",
                fontFamily: mono
                    ? "ui-monospace, SFMono-Regular, Menlo, monospace"
                    : "inherit",
            }}
        >
            {children}
        </div>
    );
}

/* ---------- styles ---------- */

const headerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
};

const countStyle: CSSProperties = {
    fontSize: 13,
    color: "#6b7280",
};

const tableContainerStyle: CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    overflow: "hidden",
    background: "#fff",
};

const tableHeaderStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns:
        "1.35fr 1fr 1fr 0.9fr 0.9fr 1fr 0.9fr",
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
};

const headerCellStyle: CSSProperties = {
    padding: "11px 12px",
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
};

const rowStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns:
        "1.2fr 1fr 1fr 0.8fr 0.8fr 0.9fr 0.8fr",
};

const statusCellStyle: CSSProperties = {
    padding: "12px",
    display: "flex",
    alignItems: "center",
};
