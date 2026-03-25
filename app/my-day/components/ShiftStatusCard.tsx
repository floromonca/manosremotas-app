"use client";

import React from "react";
import type { ShiftRow } from "../../../lib/supabase/shifts";

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
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background: "#ffffff",
                padding: 20,
                marginBottom: 18,
            }}
        >
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                Shift
            </div>

            <div style={{ fontSize: 14, color: "#4b5563", marginBottom: openShift ? 10 : 14 }}>
                {loading
                    ? "Checking shift..."
                    : !companyId
                        ? "No company selected."
                        : openShift
                            ? `Shift active — checked in at ${new Date(openShift.check_in_at).toLocaleString()}`
                            : "Shift closed — you are not checked in yet."}
            </div>

            {!loading && companyId ? (
                <div
                    style={{
                        marginBottom: 14,
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: openShift ? "1px solid #bbf7d0" : "1px solid #fde68a",
                        background: openShift ? "#f0fdf4" : "#fffbeb",
                        color: openShift ? "#166534" : "#92400e",
                        fontSize: 14,
                        fontWeight: 600,
                    }}
                >
                    {operationalMessage}
                </div>
            ) : null}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 220px))",
                    gap: 12,
                    marginBottom: 14,
                }}
            >
                {openShift ? (
                    <div
                        style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 14,
                            padding: 14,
                            background: "#f9fafb",
                        }}
                    >
                        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                            Current shift
                        </div>
                        <div
                            style={{
                                fontSize: 22,
                                fontWeight: 800,
                                color: "#111827",
                                letterSpacing: "0.04em",
                                fontVariantNumeric: "tabular-nums",
                            }}
                        >
                            {shiftElapsed}
                        </div>
                    </div>
                ) : null}

                <div
                    style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 14,
                        background: "#f9fafb",
                    }}
                >
                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                        Worked today
                    </div>
                    <div
                        style={{
                            fontSize: 22,
                            fontWeight: 800,
                            color: "#111827",
                            letterSpacing: "0.04em",
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {shiftSummaryLoading ? "..." : workedTodayLabel}
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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