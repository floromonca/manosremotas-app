"use client";

import React from "react";
import { MR_THEME } from "../../../../lib/theme";

type QuickActionsCardProps = {
    onCreateWorkOrder: () => void;
    onAddCustomer: () => void;
    onOpenInvoices: () => void;
    onAddTechnician: () => void;
};

export default function QuickActionsCard({
    onCreateWorkOrder,
    onAddCustomer,
    onOpenInvoices,
    onAddTechnician,
}: QuickActionsCardProps) {
    const actions = [
        {
            label: "Create Work Order",
            marker: "+",
            color: MR_THEME.colors.primary,
            onClick: onCreateWorkOrder,
        },
        {
            label: "Add Customer",
            marker: "C",
            color: MR_THEME.colors.info,
            onClick: onAddCustomer,
        },
        {
            label: "Go to Invoices",
            marker: "$",
            color: MR_THEME.colors.success,
            onClick: onOpenInvoices,
        },
        {
            label: "Add Technician",
            marker: "T",
            color: MR_THEME.colors.primaryHover,
            onClick: onAddTechnician,
        },
    ];

    return (
        <div
            style={{
                background: MR_THEME.colors.cardBg,
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                padding: 16,
                boxShadow: MR_THEME.shadows.cardSoft,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 14,
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 800,
                        color: MR_THEME.colors.textPrimary,
                    }}
                >
                    Quick Actions
                </h2>

                <span
                    aria-hidden="true"
                    style={{
                        color: MR_THEME.colors.textSecondary,
                        fontSize: 22,
                        lineHeight: 1,
                    }}
                >
                    ›
                </span>
            </div>

            <div style={{ display: "grid", gap: 2 }}>
                {actions.map((action, index) => (
                    <button
                        key={action.label}
                        type="button"
                        onClick={action.onClick}
                        style={{
                            width: "100%",
                            border: "none",
                            borderTop: index === 0 ? "none" : `1px solid ${MR_THEME.colors.border}`,
                            background: "transparent",
                            padding: "12px 0",
                            display: "grid",
                            gridTemplateColumns: "auto minmax(0, 1fr) auto",
                            gap: 10,
                            alignItems: "center",
                            cursor: "pointer",
                            textAlign: "left",
                        }}
                    >
                        <span
                            style={{
                                width: 26,
                                height: 26,
                                borderRadius: 999,
                                background: `${action.color}18`,
                                color: action.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 13,
                                fontWeight: 900,
                            }}
                        >
                            {action.marker}
                        </span>

                        <span
                            style={{
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                color: MR_THEME.colors.textPrimary,
                                fontSize: 13,
                                fontWeight: 800,
                            }}
                        >
                            {action.label}
                        </span>

                        <span
                            aria-hidden="true"
                            style={{
                                color: MR_THEME.colors.textSecondary,
                                fontSize: 18,
                                lineHeight: 1,
                            }}
                        >
                            ›
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
