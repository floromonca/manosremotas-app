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
                padding: 20,
                boxShadow: MR_THEME.shadows.cardSoft,
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: MR_THEME.colors.primary,
                            marginBottom: 4,
                            lineHeight: 1.2,
                        }}
                    >
                        {companyName || MR_THEME.brand.name}
                    </div>

                    <h1
                        style={{
                            margin: 0,
                            fontSize: 30,
                            lineHeight: 1.05,
                            fontWeight: 850,
                            color: MR_THEME.colors.textPrimary,
                            letterSpacing: "-0.04em",
                        }}
                    >
                        Control Center
                    </h1>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 10,
                    }}
                >
                    <button
                        onClick={onOpenWorkOrders}
                        style={{
                            padding: "11px 12px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.primary}`,
                            background: MR_THEME.colors.primary,
                            color: "#ffffff",
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 800,
                            boxShadow: "0 1px 2px rgba(37, 99, 235, 0.18)",
                        }}
                    >
                        Work Orders
                    </button>

                    <button
                        onClick={onOpenInvoices}
                        style={{
                            padding: "11px 12px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.primarySoft}`,
                            background: MR_THEME.colors.primarySoft,
                            color: MR_THEME.colors.primaryHover,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 800,
                        }}
                    >
                        Invoices
                    </button>
                </div>
            </div>
        </section>
    );
}