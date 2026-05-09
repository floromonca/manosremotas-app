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
    compactDesktop?: boolean;
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
    compactDesktop = false,
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
                padding: compactDesktop ? 16 : MR_THEME.layout.cardPadding,
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
                    marginBottom: compactDesktop ? 5 : 8,
                }}
            >
                Current Work
            </div>

            <div
                style={{
                    fontSize: compactDesktop ? 21 : 24,
                    fontWeight: 900,
                    color: MR_THEME.colors.textPrimary,
                    marginBottom: compactDesktop ? 5 : 8,
                }}
            >
                {currentWork ? "Active work order" : "No active work"}
            </div>

            <div
                style={{
                    fontSize: compactDesktop ? 13 : 14,
                    color: MR_THEME.colors.textSecondary,
                    marginBottom: compactDesktop ? 10 : 16,
                    lineHeight: 1.5,
                }}
            >
                {currentWorkMessage}
            </div>

            {currentWork ? (
                <div
                    style={{
                        padding: compactDesktop ? 12 : 14,
                        borderRadius: MR_THEME.radius.control,
                        border: `1px solid ${MR_THEME.colors.border}`,
                        background: MR_THEME.colors.cardBgSoft,
                        marginBottom: compactDesktop ? 10 : 14,
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

            <div style={{ display: "flex", gap: compactDesktop ? 8 : 10, flexWrap: "wrap" }}>
                {currentWork ? (
                    <button
                        onClick={() => onResumeWork(currentWork.work_order_id)}
                        style={{
                            ...primaryButton,
                            padding: compactDesktop ? "8px 12px" : primaryButton.padding,
                        }}
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
                            padding: compactDesktop ? "8px 12px" : secondaryButton.padding,
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
