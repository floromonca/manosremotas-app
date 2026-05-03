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
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                background: MR_THEME.colors.cardBg,
                padding: MR_THEME.layout.cardPadding,
                marginBottom: 18,
                boxShadow: MR_THEME.shadows.card,
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr)",
                    gap: 16,
                    marginBottom: 14,
                }}
            >
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                        style={{
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: MR_THEME.colors.textMuted,
                            fontWeight: 800,
                            marginBottom: 8,
                        }}
                    >
                        Shift
                    </div>

                    <div
                        style={{
                            fontSize: 28,
                            fontWeight: 900,
                            lineHeight: 1.05,
                            color: MR_THEME.colors.textPrimary,
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
                            color: MR_THEME.colors.textSecondary,
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
                            style={{
                                ...primaryButtonStyle,
                                opacity: shiftBusy || loading || !companyId ? 0.7 : 1,
                                cursor: shiftBusy || loading || !companyId ? "not-allowed" : "pointer",
                            }}
                        >
                            {shiftBusy ? "Processing..." : "Start shift"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onCheckOut}
                            disabled={shiftBusy || loading}
                            style={{
                                ...secondaryButtonStyle,
                                border: `1.5px solid ${MR_THEME.colors.danger}`,
                                background: "#ffffff",
                                color: MR_THEME.colors.danger,
                                opacity: shiftBusy || loading ? 0.7 : 1,
                                cursor: shiftBusy || loading ? "not-allowed" : "pointer",
                            }}
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
                        borderRadius: MR_THEME.radius.control,
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
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
                        color: MR_THEME.colors.textSecondary,
                        fontWeight: 700,
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
                border: `1px solid ${MR_THEME.colors.primarySoft}`,
                background: MR_THEME.colors.cardBgSoft,
                labelColor: MR_THEME.colors.textSecondary,
                valueColor: MR_THEME.colors.primaryHover,
            }
            : {
                border: `1px solid ${MR_THEME.colors.border}`,
                background: MR_THEME.colors.cardBgSoft,
                labelColor: MR_THEME.colors.textSecondary,
                valueColor: MR_THEME.colors.textPrimary,
            };

    return (
        <div
            style={{
                border: styles.border,
                borderRadius: MR_THEME.radius.control,
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
                    fontWeight: 800,
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
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.primary}`,
    background: MR_THEME.colors.primary,
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
};

const secondaryButtonStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    cursor: "pointer",
    fontWeight: 800,
};