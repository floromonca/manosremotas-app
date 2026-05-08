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
            className="controlCenterHeader"
            style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 16,
                alignItems: "start",
            }}
        >
            <div style={{ minWidth: 0 }}>
                <div>
                    <div
                        style={{
                            fontSize: 13,
                            fontWeight: 800,
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
                            fontSize: 34,
                            lineHeight: 1.1,
                            fontWeight: 900,
                            color: MR_THEME.colors.textPrimary,
                            letterSpacing: 0,
                        }}
                    >
                        Control Center
                    </h1>

                    <p
                        style={{
                            margin: "8px 0 0",
                            color: MR_THEME.colors.textSecondary,
                            fontSize: 15,
                            lineHeight: 1.5,
                            maxWidth: 720,
                        }}
                    >
                        Your command center. See what needs attention, then jump straight into action.
                    </p>
                </div>
            </div>

            <div
                className="controlCenterHeaderActions"
                style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    justifyContent: "flex-end",
                    flexWrap: "wrap",
                }}
            >
                <button
                    type="button"
                    onClick={onOpenWorkOrders}
                    style={{
                        minHeight: 40,
                        padding: "10px 14px",
                        borderRadius: MR_THEME.radius.control,
                        border: `1px solid ${MR_THEME.colors.primary}`,
                        background: MR_THEME.colors.primary,
                        color: "#ffffff",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 800,
                        boxShadow: "0 1px 2px rgba(37, 99, 235, 0.18)",
                        whiteSpace: "nowrap",
                    }}
                >
                    Work Orders
                </button>

                <button
                    type="button"
                    onClick={onOpenInvoices}
                    style={{
                        minHeight: 40,
                        padding: "10px 14px",
                        borderRadius: MR_THEME.radius.control,
                        border: `1px solid ${MR_THEME.colors.border}`,
                        background: MR_THEME.colors.cardBg,
                        color: MR_THEME.colors.primaryHover,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 800,
                        boxShadow: MR_THEME.shadows.card,
                        whiteSpace: "nowrap",
                    }}
                >
                    Invoices
                </button>
            </div>

            <style jsx>{`
                @media (max-width: 760px) {
                    .controlCenterHeader {
                        grid-template-columns: 1fr !important;
                    }

                    .controlCenterHeaderActions {
                        display: none !important;
                    }
                }
            `}</style>
        </section>
    );
}
