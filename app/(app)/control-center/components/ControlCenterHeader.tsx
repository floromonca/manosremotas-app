"use client";

import React from "react";
import { MR_THEME } from "../../../../lib/theme";

type ControlCenterHeaderProps = {
    companyName?: string | null;
    onOpenWorkOrders: () => void;
    onOpenInvoices: () => void;
};

export default function ControlCenterHeader({
    companyName,
    onOpenWorkOrders,
    onOpenInvoices,
}: ControlCenterHeaderProps) {
    return (
        <section
            style={{
                background: MR_THEME.colors.cardBg,
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                padding: MR_THEME.layout.cardPadding,
                boxShadow: MR_THEME.shadows.cardSoft,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 20,
                    flexWrap: "wrap",
                }}
            >
                <div style={{ minWidth: 280, flex: 1 }}>
                    <div
                        style={{
                            fontSize: 16,
                            fontWeight: 700,
                            letterSpacing: "-0.01em",
                            color: MR_THEME.colors.primary,
                            marginBottom: 8,
                            lineHeight: 1.2,
                        }}
                    >
                        {companyName || MR_THEME.brand.name}
                    </div>

                    <h1
                        style={{
                            margin: 0,
                            fontSize: 32,
                            lineHeight: 1.1,
                            fontWeight: 800,
                            color: MR_THEME.colors.textPrimary,
                        }}
                    >
                        Control Center
                    </h1>

                    <p
                        style={{
                            margin: "10px 0 0 0",
                            fontSize: 15,
                            lineHeight: 1.6,
                            color: MR_THEME.colors.textSecondary,
                            maxWidth: 760,
                        }}
                    >
                        Daily visibility across work orders, field activity, invoicing, and team operations.
                    </p>
                </div>

                <div
                    style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                    }}
                >
                    <button
                        onClick={onOpenWorkOrders}
                        style={{
                            padding: "10px 14px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.primary}`,
                            background: MR_THEME.colors.primary,
                            color: "#ffffff",
                            cursor: "pointer",
                            fontWeight: 700,
                            boxShadow: "0 1px 2px rgba(37, 99, 235, 0.18)",
                        }}
                    >
                        Open Work Orders
                    </button>

                    <button
                        onClick={onOpenInvoices}
                        style={{
                            padding: "10px 14px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.primarySoft}`,
                            background: MR_THEME.colors.primarySoft,
                            color: MR_THEME.colors.primaryHover,
                            cursor: "pointer",
                            fontWeight: 700,
                        }}
                    >
                        Open Invoices
                    </button>
                </div>
            </div>
        </section>
    );
}