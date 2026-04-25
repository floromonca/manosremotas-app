"use client";

import React from "react";

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
                        color: "#6b7280",
                        fontWeight: 800,
                        marginBottom: 6,
                    }}
                >
                    Work Order Items
                </div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#111827" }}>Items</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div
                    style={{
                        padding: "6px 9px",
                        borderRadius: 999,
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        color: "#4b5563",
                    }}
                >
                    <b>{itemsCount}</b> items
                </div>

                <button
                    type="button"
                    disabled={invoiceIsLocked}
                    onClick={() => {
                        if (invoiceIsLocked) return;
                        setShowForm((s) => !s);
                    }}
                    style={{
                        padding: "8px 12px",
                        borderRadius: 12,
                        border: "1px solid #d1d5db",
                        background: "white",
                        cursor: invoiceIsLocked ? "not-allowed" : "pointer",
                        fontWeight: 900,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        opacity: invoiceIsLocked ? 0.6 : 1,
                    }}
                >
                    {showForm ? "Close" : "+ Add item"}
                </button>
            </div>
        </div>
    );
}