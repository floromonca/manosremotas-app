"use client";

import React from "react";
import { MR_THEME } from "@/lib/theme";

type Props = {
    itemsCount: number;
    showForm: boolean;
    setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
    invoiceIsLocked: boolean;
};

export default function WorkOrderItemsHeader({
    itemsCount,
    showForm,
    setShowForm,
    invoiceIsLocked,
}: Props) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "end",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 8,
            }}
        >
            <div>
                <div
                    style={{
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        color: MR_THEME.colors.textSecondary,
                        fontWeight: 800,
                        marginBottom: 6,
                    }}
                >
                    Work Order Items
                </div>
                <div
                    style={{
                        fontWeight: 900,
                        fontSize: 22,
                        color: MR_THEME.colors.textPrimary,
                    }}
                >
                    Items
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div
                    style={{
                        padding: "6px 9px",
                        borderRadius: MR_THEME.radius.pill,
                        background: MR_THEME.colors.cardBgSoft,
                        border: `1px solid ${MR_THEME.colors.border}`,
                        fontSize: 13,
                        color: MR_THEME.colors.textSecondary,
                    }}
                >
                    <b style={{ color: MR_THEME.colors.textPrimary }}>{itemsCount}</b> items
                </div>

                <button
                    type="button"
                    disabled={invoiceIsLocked}
                    onClick={() => {
                        if (invoiceIsLocked) return;
                        setShowForm((s) => !s);
                    }}
                    title={
                        invoiceIsLocked
                            ? "This invoice is locked. Items cannot be changed."
                            : undefined
                    }
                    style={{
                        padding: "8px 12px",
                        borderRadius: MR_THEME.radius.control,
                        border: invoiceIsLocked
                            ? `1px solid ${MR_THEME.colors.borderStrong}`
                            : `1px solid ${MR_THEME.colors.primary}`,
                        background: invoiceIsLocked
                            ? MR_THEME.colors.cardBgSoft
                            : MR_THEME.colors.primary,
                        color: invoiceIsLocked
                            ? MR_THEME.colors.textSecondary
                            : "#ffffff",
                        cursor: invoiceIsLocked ? "not-allowed" : "pointer",
                        fontWeight: 900,
                        boxShadow: invoiceIsLocked ? "none" : MR_THEME.shadows.cardSoft,
                    }}
                >
                    {showForm ? "Close" : "+ Add item"}
                </button>
            </div>
        </div>
    );
}