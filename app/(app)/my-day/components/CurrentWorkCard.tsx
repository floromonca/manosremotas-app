"use client";

import React from "react";
import { MR_THEME } from "../../../../lib/theme";

type WorkOrder = {
    work_order_id: string;
    job_type?: string | null;
    customer_name?: string | null;
    service_address?: string | null;
    status: string;
};

type Props = {
    currentWork: WorkOrder | null;
    currentWorkMessage: string;
    openShift: boolean;
    shiftBusy: boolean;
    loading: boolean;
    companyId: string | null;
    onResumeWork: (workOrderId: string) => void;
    onStartShift: () => void;
};

export default function CurrentWorkCard({
    currentWork,
    currentWorkMessage,
    openShift,
    shiftBusy,
    loading,
    companyId,
    onResumeWork,
    onStartShift,
}: Props) {
    return (
        <div
            style={{
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                background: MR_THEME.colors.cardBg,
                padding: MR_THEME.layout.cardPadding,
                boxShadow: MR_THEME.shadows.card,
            }}
        >
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
                Current Work
            </div>

            <div
                style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color: MR_THEME.colors.textPrimary,
                    marginBottom: 8,
                }}
            >
                {currentWork ? "Active work order" : "No active work"}
            </div>

            <div
                style={{
                    fontSize: 14,
                    color: MR_THEME.colors.textSecondary,
                    marginBottom: 16,
                    lineHeight: 1.5,
                }}
            >
                {currentWorkMessage}
            </div>

            {currentWork ? (
                <div
                    style={{
                        padding: 14,
                        borderRadius: MR_THEME.radius.control,
                        border: `1px solid ${MR_THEME.colors.border}`,
                        background: MR_THEME.colors.cardBgSoft,
                        marginBottom: 14,
                    }}
                >
                    <div
                        style={{
                            fontWeight: 800,
                            color: MR_THEME.colors.textPrimary,
                            marginBottom: 6,
                        }}
                    >
                        {currentWork.job_type || "Work order"}
                    </div>

                    <div
                        style={{
                            fontSize: 13,
                            color: MR_THEME.colors.textSecondary,
                            marginBottom: 4,
                        }}
                    >
                        {currentWork.customer_name || "No customer"}
                    </div>

                    <div
                        style={{
                            fontSize: 13,
                            color: MR_THEME.colors.textMuted,
                        }}
                    >
                        {currentWork.service_address || "No address"}
                    </div>
                </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {currentWork ? (
                    <button
                        onClick={() => onResumeWork(currentWork.work_order_id)}
                        style={primaryButton}
                    >
                        Open work order
                    </button>
                ) : null}

                {!openShift && (
                    <button
                        onClick={onStartShift}
                        disabled={shiftBusy || loading || !companyId}
                        style={{
                            ...secondaryButton,
                            opacity: shiftBusy || loading || !companyId ? 0.7 : 1,
                            cursor:
                                shiftBusy || loading || !companyId
                                    ? "not-allowed"
                                    : "pointer",
                        }}
                    >
                        Start shift
                    </button>
                )}
            </div>
        </div>
    );
}

const primaryButton: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.primary}`,
    background: MR_THEME.colors.primary,
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    fontWeight: 800,
    cursor: "pointer",
};