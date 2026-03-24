"use client";

import React from "react";

type Props = {
    itemsCount: number;
    showForm: boolean;
    setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function WorkOrderItemsHeader({
    itemsCount,
    showForm,
    setShowForm,
}: Props) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "end",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 12,
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
                        padding: "8px 10px",
                        borderRadius: 999,
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        color: "#4b5563",
                    }}
                >
                    Total items: <b>{itemsCount}</b>
                </div>

                <button
                    type="button"
                    onClick={() => setShowForm((s) => !s)}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid #d1d5db",
                        background: "white",
                        cursor: "pointer",
                        fontWeight: 900,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                >
                    {showForm ? "Cerrar" : "+ Agregar item"}
                </button>
            </div>
        </div>
    );
}