"use client";

import React from "react";
import type { ShiftRow } from "../../../../lib/supabase/shifts";
import { MR_THEME } from "../../../../lib/theme";

type ShiftStatusCardProps = {
    loading: boolean;
    companyId: string | null;
    openShift: ShiftRow | null;
    operationalMessage: string;
    shiftElapsed: string;
    shiftSummaryLoading: boolean;
    workedTodayLabel: string;
    shiftBusy: boolean;
    shiftMsg: string;
    onCheckIn: () => void;
    onCheckOut: () => void;
    onViewWorkOrders: () => void;
};

export default function ShiftStatusCard({
    loading,
    companyId,
    openShift,
    operationalMessage,
    shiftElapsed,
    shiftSummaryLoading,
    workedTodayLabel,
    shiftBusy,
    shiftMsg,
    onCheckIn,
    onCheckOut,
    onViewWorkOrders,
}: ShiftStatusCardProps) {
    return (
        <div
            style={{
                border: `1px solid ${MR_THEME.border}`,
                borderRadius: MR_THEME.radiusCard,
                background: MR_THEME.cardBg,
                padding: 20,
                marginBottom: 18,
                boxShadow: MR_THEME.shadowCard,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                    marginBottom: 14,
                }}
            >
                <div style={{ minWidth: 280, flex: 1 }}>
                    <div
                        style={{
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: MR_THEME.textMuted,
                            fontWeight: 800,
                            marginBottom: 8,
                        }}
                    >
                        Shift
                    </div>

                    <div
                        style={{
                            fontSize: 28,
                            fontWeight: 800,
                            lineHeight: 1.05,
                            color: MR_THEME.textPrimary,
                            letterSpacing: "-0.02em",
                            marginBottom: 8,
                        }}
                    >
                        {loading
                            ? "Checking shift"
                            : !companyId
                                ? "No company selected"
                                : openShift
                                    ? "Shift is active"
                                    : "Shift is closed"}
                    </div>

                    <div
                        style={{
                            fontSize: 14,
                            color: MR_THEME.textSecondary,
                            lineHeight: 1.6,
                            maxWidth: 760,
                        }}
                    >
                        {loading
                            ? "Checking current shift status."
                            : !companyId
                                ? "Select an active company to manage your shift."
                                : openShift
                                    ? `Checked in at ${new Date(openShift.check_in_at).toLocaleString()}. You are ready to operate from My Day and Work Orders.`
                                    : "You can review your day here, but work actions stay disabled until you start your shift."}
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                    }}
                >
                    {!openShift ? (
                        <button
                            type="button"
                            onClick={onCheckIn}
                            disabled={shiftBusy || loading || !companyId}
                            style={primaryButtonStyle}
                        >
                            {shiftBusy ? "Processing..." : "Start shift"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onCheckOut}
                            disabled={shiftBusy || loading}
                            style={secondaryButtonStyle}
                        >
                            {shiftBusy ? "Processing..." : "End shift"}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onViewWorkOrders}
                        style={secondaryButtonStyle}
                    >
                        View work orders
                    </button>
                </div>
            </div>

            {!loading && companyId && openShift ? (
                <div
                    style={{
                        marginBottom: 14,
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1px solid #bbf7d0",
                        background: "#f0fdf4",
                        color: "#166534",
                        fontSize: 14,
                        fontWeight: 700,
                    }}
                >
                    {operationalMessage}
                </div>
            ) : null}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 12,
                }}
            >
                {openShift ? (
                    <MetricCard
                        label="Current shift"
                        value={shiftElapsed}
                        tone="neutral"
                    />
                ) : null}

                <MetricCard
                    label="Worked today"
                    value={shiftSummaryLoading ? "..." : workedTodayLabel}
                    tone={openShift ? "active" : "neutral"}
                />
            </div>

            {shiftMsg ? (
                <div
                    style={{
                        marginTop: 12,
                        fontSize: 13,
                        color: "#374151",
                    }}
                >
                    {shiftMsg}
                </div>
            ) : null}
        </div>
    );
}

function MetricCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: "neutral" | "active";
}) {
    const styles =
        tone === "active"
            ? {
                border: "1px solid #dbeafe",
                background: "#f8fbff",
                labelColor: "#64748b",
                valueColor: "#1e40af",
            }
            : {
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                labelColor: "#64748b",
                valueColor: "#111827",
            };

    return (
        <div
            style={{
                border: styles.border,
                borderRadius: 14,
                padding: 16,
                background: styles.background,
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    color: styles.labelColor,
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 700,
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: 32,
                    fontWeight: 900,
                    color: styles.valueColor,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "0.02em",
                }}
            >
                {value}
            </div>
        </div>
    );
}

const primaryButtonStyle: React.CSSProperties = {
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