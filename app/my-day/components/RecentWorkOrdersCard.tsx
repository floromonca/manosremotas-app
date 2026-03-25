"use client";

import React from "react";

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
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background: "#ffffff",
                padding: 20,
            }}
        >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                Recent work orders
            </div>

            {rows.length === 0 ? (
                <div style={{ color: "#6b7280", fontSize: 14 }}>
                    No recent work orders.
                </div>
            ) : (
                <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                    {rows.map((wo) => (
                        <div
                            key={wo.work_order_id}
                            style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 14,
                                padding: 16,
                                background: "#fcfcfd",
                                display: "grid",
                                gridTemplateColumns: "1.2fr 1fr 0.8fr auto",
                                gap: 12,
                                alignItems: "center",
                            }}
                        >
                            <InfoBlock
                                label="Job type"
                                value={wo.job_type || "Work order"}
                                strong
                            />

                            <InfoBlock
                                label="Customer"
                                value={wo.customer_name || "—"}
                            />

                            <InfoBlock
                                label="Status"
                                value={wo.status.replaceAll("_", " ")}
                            />

                            <div>
                                <button
                                    type="button"
                                    onClick={() => onOpenWorkOrder(wo.work_order_id)}
                                    style={secondaryButtonStyle}
                                >
                                    Open
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function InfoBlock({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                {label}
            </div>
            <div
                style={{
                    fontSize: 16,
                    fontWeight: strong ? 800 : 700,
                    color: "#111827",
                }}
            >
                {value}
            </div>
        </div>
    );
}

const secondaryButtonStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600,
};