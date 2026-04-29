"use client";

import React from "react";
import { MR_THEME } from "../../../../lib/theme";
import type { ShiftRow } from "../../../../lib/supabase/shifts";

type OperationalShiftCardProps = {
    openShift: ShiftRow | null;
    shiftBusy: boolean;
    onCheckIn: () => void;
    onCheckOut: () => void;
};

export default function OperationalShiftCard({
    openShift,
    shiftBusy,
    onCheckIn,
    onCheckOut,
}: OperationalShiftCardProps) {
    return (
        <div
            style={{
                background: MR_THEME.colors.cardBg,
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                padding: 22,
                boxShadow: MR_THEME.shadows.cardSoft,
                display: "flex",
                flexDirection: "column",
                gap: 18,
            }}
        >
            <div>
                <h2
                    style={{
                        margin: 0,
                        fontSize: 20,
                        fontWeight: 700,
                        color: MR_THEME.colors.textPrimary,
                    }}
                >
                    Operational Shift
                </h2>

                <p
                    style={{
                        margin: "6px 0 0 0",
                        fontSize: 14,
                        color: MR_THEME.colors.textSecondary,
                        lineHeight: 1.5,
                    }}
                >
                    Track your current shift status directly from Control Center.
                </p>
            </div>

            <div
                style={{
                    display: "inline-flex",
                    alignSelf: "flex-start",
                    padding: "7px 12px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 700,
                    background: openShift
                        ? MR_THEME.colors.success + "22"
                        : MR_THEME.colors.border,
                    color: openShift
                        ? MR_THEME.colors.success
                        : MR_THEME.colors.textSecondary,
                }}
            >
                {openShift ? "On Shift" : "Off Shift"}
            </div>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    color: MR_THEME.colors.textSecondary,
                    fontSize: 14,
                    lineHeight: 1.6,
                }}
            >
                {openShift ? (
                    <>
                        <div>
                            <strong>Started:</strong>{" "}
                            {new Date(openShift.check_in_at).toLocaleString()}
                        </div>

                        {openShift.note ? (
                            <div>
                                <strong>Note:</strong> {openShift.note}
                            </div>
                        ) : null}
                    </>
                ) : (
                    <div>
                        No active shift right now. Start your shift when you begin supervising or operating work.
                    </div>
                )}
            </div>

            <div
                style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                }}
            >
                {openShift ? (
                    <button
                        onClick={onCheckOut}
                        disabled={shiftBusy}
                        style={{
                            padding: "10px 14px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.danger}`,
                            background: MR_THEME.colors.danger,
                            color: "#ffffff",
                            cursor: shiftBusy ? "not-allowed" : "pointer",
                            fontWeight: 700,
                            opacity: shiftBusy ? 0.7 : 1,
                        }}
                    >
                        {shiftBusy ? "Checking out..." : "Check Out"}
                    </button>
                ) : (
                    <button
                        onClick={onCheckIn}
                        disabled={shiftBusy}
                        style={{
                            padding: "10px 14px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.primary}`,
                            background: MR_THEME.colors.primary,
                            color: "#ffffff",
                            cursor: shiftBusy ? "not-allowed" : "pointer",
                            fontWeight: 700,
                            opacity: shiftBusy ? 0.7 : 1,
                        }}
                    >
                        {shiftBusy ? "Checking in..." : "Check In"}
                    </button>
                )}
            </div>
        </div>
    );
}