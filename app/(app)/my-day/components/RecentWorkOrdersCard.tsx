"use client";

import React from "react";
import { MR_THEME } from "../../../../lib/theme";

type Row = {
    work_order_id: string;
    job_type?: string | null;
    customer_name?: string | null;
    service_address?: string | null;
    status: string;
};

type Props = {
    rows: Row[];
    onOpenWorkOrder: (workOrderId: string) => void;
};

export default function RecentWorkOrdersCard({
    rows,
    onOpenWorkOrder,
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
                    marginBottom: 10,
                }}
            >
                Recent work orders
            </div>

            {rows.length === 0 ? (
                <div
                    style={{
                        padding: 12,
                        borderRadius: MR_THEME.radius.control,
                        border: `1px dashed ${MR_THEME.colors.border}`,
                        background: MR_THEME.colors.cardBgSoft,
                        color: MR_THEME.colors.textSecondary,
                        fontSize: 14,
                    }}
                >
                    No recent work orders.
                </div>
            ) : (
                <div style={{ display: "grid", gap: 10 }}>
                    {rows.map((row) => (
                        <div
                            key={row.work_order_id}
                            style={{
                                padding: 14,
                                borderRadius: MR_THEME.radius.control,
                                border: `1px solid ${MR_THEME.colors.border}`,
                                background: MR_THEME.colors.cardBgSoft,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 12,
                                flexWrap: "wrap",
                            }}
                        >
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div
                                    style={{
                                        fontWeight: 800,
                                        color: MR_THEME.colors.textPrimary,
                                        marginBottom: 4,
                                    }}
                                >
                                    {row.job_type || "Work order"}
                                </div>

                                <div
                                    style={{
                                        fontSize: 13,
                                        color: MR_THEME.colors.textSecondary,
                                        marginBottom: 2,
                                    }}
                                >
                                    {row.customer_name || "No customer"}
                                </div>

                                <div
                                    style={{
                                        fontSize: 12,
                                        color: MR_THEME.colors.textMuted,
                                    }}
                                >
                                    {row.service_address || "No address"}
                                </div>
                            </div>

                            <button
                                onClick={() => onOpenWorkOrder(row.work_order_id)}
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: MR_THEME.radius.control,
                                    border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                    background: MR_THEME.colors.cardBg,
                                    color: MR_THEME.colors.textPrimary,
                                    fontWeight: 800,
                                    cursor: "pointer",
                                }}
                            >
                                Open
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}