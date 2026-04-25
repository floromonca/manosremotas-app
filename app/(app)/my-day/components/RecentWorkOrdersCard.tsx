"use client";

import React from "react";
import { MR_THEME } from "../../../../lib/theme";

type WorkOrderStatus = "new" | "in_progress" | "resolved" | "closed";

type RecentWorkOrderRow = {
    work_order_id: string;
    job_type?: string | null;
    customer_name?: string | null;
    status: WorkOrderStatus;
};

type RecentWorkOrdersCardProps = {
    rows: RecentWorkOrderRow[];
    onOpenWorkOrder: (workOrderId: string) => void;
};

export default function RecentWorkOrdersCard({
    rows,
    onOpenWorkOrder,
}: RecentWorkOrdersCardProps) {
    return (
        <div
            style={{
                border: `1px solid ${MR_THEME.border}`,
                borderRadius: MR_THEME.radiusCard,
                background: MR_THEME.cardBg,
                padding: 20,
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
                <div style={{ minWidth: 260, flex: 1 }}>
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
                        Recent work orders
                    </div>

                    <div
                        style={{
                            fontSize: 26,
                            fontWeight: 800,
                            lineHeight: 1.1,
                            color: MR_THEME.textPrimary,
                            letterSpacing: "-0.02em",
                            marginBottom: 8,
                        }}
                    >
                        Recent activity
                    </div>

                    <div
                        style={{
                            color: MR_THEME.textSecondary,
                            fontSize: 14,
                            lineHeight: 1.6,
                            maxWidth: 760,
                        }}
                    >
                        {rows.length === 0
                            ? "You do not have recent work orders yet. Completed or assigned work will appear here for quick access."
                            : "Review your most recent work orders and jump back into the ones that need attention."}
                    </div>
                </div>

                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: MR_THEME.radiusPill,
                        border: `1px solid ${MR_THEME.border}`,
                        background: MR_THEME.cardBgSoft,
                        color: MR_THEME.textSecondary,
                        fontSize: 13,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                    }}
                >
                    {rows.length} recent
                </div>
            </div>

            {rows.length === 0 ? (
                <div
                    style={{
                        border: `1px dashed ${MR_THEME.border}`,
                        borderRadius: MR_THEME.radiusCard,
                        background: MR_THEME.cardBgSoft,
                        padding: 18,
                    }}
                >
                    <div
                        style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: MR_THEME.textPrimary,
                            marginBottom: 6,
                        }}
                    >
                        No recent work orders
                    </div>

                    <div
                        style={{
                            fontSize: 14,
                            color: MR_THEME.textSecondary,
                            lineHeight: 1.6,
                        }}
                    >
                        Your latest assigned, in-progress, resolved, or closed work orders will appear here.
                    </div>
                </div>
            ) : (
                <div style={{ display: "grid", gap: 12 }}>
                    {rows.map((wo) => (
                        <div
                            key={wo.work_order_id}
                            style={{
                                border: `1px solid ${MR_THEME.border}`,
                                borderRadius: MR_THEME.radiusCard,
                                padding: 16,
                                background: MR_THEME.cardBgSoft,
                                display: "grid",
                                gap: 12,
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: 12,
                                    flexWrap: "wrap",
                                }}
                            >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div
                                        style={{
                                            fontSize: 20,
                                            fontWeight: 800,
                                            color: MR_THEME.textPrimary,
                                            lineHeight: 1.2,
                                            marginBottom: 4,
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        {wo.job_type || "Work order"}
                                    </div>

                                    <div
                                        style={{
                                            fontSize: 14,
                                            color: MR_THEME.textSecondary,
                                            lineHeight: 1.5,
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        {wo.customer_name || "No customer name"}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        gap: 8,
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        justifyContent: "flex-end",
                                        marginTop: 2,
                                    }}
                                >
                                    <StatusPill status={wo.status} />

                                    <button
                                        type="button"
                                        onClick={() => onOpenWorkOrder(wo.work_order_id)}
                                        style={secondaryButtonStyle}
                                    >
                                        Open
                                    </button>
                                </div>
                            </div>

                            <div
                                style={{
                                    fontSize: 13,
                                    color: MR_THEME.textSecondary,
                                    lineHeight: 1.5,
                                }}
                            >
                                Ref: {wo.work_order_id.slice(0, 8)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusPill({ status }: { status: WorkOrderStatus }) {
    const tone =
        status === "in_progress"
            ? {
                border: `1px solid ${MR_THEME.primary}`,
                background: MR_THEME.primarySoft,
                color: MR_THEME.primaryHover,
                label: "In progress",
            }
            : status === "new"
                ? {
                    border: `1px solid ${MR_THEME.primary}`,
                    background: MR_THEME.primarySoft,
                    color: MR_THEME.primaryHover,
                    label: "Assigned",
                }
                : status === "resolved"
                    ? {
                        border: `1px solid ${MR_THEME.success}`,
                        background: "#f0fdf4",
                        color: "#166534",
                        label: "Resolved",
                    }
                    : {
                        border: `1px solid ${MR_THEME.borderStrong}`,
                        background: MR_THEME.cardBg,
                        color: MR_THEME.textSecondary,
                        label: "Closed",
                    };

    return (
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 14px",
                borderRadius: MR_THEME.radiusPill,
                border: tone.border,
                background: tone.background,
                color: tone.color,
                fontSize: 13,
                fontWeight: 800,
                whiteSpace: "nowrap",
            }}
        >
            {tone.label}
        </div>
    );
}

const secondaryButtonStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: MR_THEME.radiusControl,
    border: `1px solid ${MR_THEME.borderStrong}`,
    background: MR_THEME.cardBg,
    color: MR_THEME.textPrimary,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
};