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
                borderRadius: 18,
                background: "linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)",
                padding: 20,
                boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
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
                            color: "#64748b",
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
                            color: "#111827",
                            letterSpacing: "-0.02em",
                            marginBottom: 8,
                        }}
                    >
                        Recent activity
                    </div>

                    <div
                        style={{
                            color: "#6b7280",
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
                        borderRadius: 999,
                        border: "1px solid #dbe3ef",
                        background: "#f8fafc",
                        color: "#334155",
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
                        border: "1px dashed #dbe3ef",
                        borderRadius: 16,
                        background: "#f8fafc",
                        padding: 18,
                    }}
                >
                    <div
                        style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#111827",
                            marginBottom: 6,
                        }}
                    >
                        No recent work orders
                    </div>

                    <div
                        style={{
                            fontSize: 14,
                            color: "#6b7280",
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
                                border: "1px solid #e5e7eb",
                                borderRadius: 16,
                                padding: 16,
                                background: "#f8fafc",
                                display: "grid",
                                gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) auto auto",
                                gap: 14,
                                alignItems: "center",
                            }}
                        >
                            <div style={{ minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: 12,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                        color: "#64748b",
                                        fontWeight: 700,
                                        marginBottom: 6,
                                    }}
                                >
                                    Work order
                                </div>
                                <div
                                    style={{
                                        fontSize: 17,
                                        fontWeight: 800,
                                        color: "#111827",
                                        lineHeight: 1.3,
                                        marginBottom: 4,
                                    }}
                                >
                                    {wo.job_type || "Work order"}
                                </div>
                                <div
                                    style={{
                                        fontSize: 14,
                                        color: "#6b7280",
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Ref: {wo.work_order_id.slice(0, 8)}
                                </div>
                            </div>

                            <InfoBlock
                                label="Customer"
                                value={wo.customer_name || "—"}
                            />

                            <StatusPill status={wo.status} />

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
}: {
    label: string;
    value: string;
}) {
    return (
        <div style={{ minWidth: 0 }}>
            <div
                style={{
                    fontSize: 12,
                    color: "#64748b",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 700,
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#111827",
                    lineHeight: 1.4,
                    wordBreak: "break-word",
                }}
            >
                {value}
            </div>
        </div>
    );
}

function StatusPill({ status }: { status: WorkOrderStatus }) {
    const tone =
        status === "in_progress"
            ? {
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
                color: "#1d4ed8",
                label: "In progress",
            }
            : status === "new"
                ? {
                    border: "1px solid #dbeafe",
                    background: "#f8fbff",
                    color: "#1e40af",
                    label: "Assigned",
                }
                : status === "resolved"
                    ? {
                        border: "1px solid #fde68a",
                        background: "#fffbeb",
                        color: "#92400e",
                        label: "Resolved",
                    }
                    : {
                        border: "1px solid #bbf7d0",
                        background: "#f0fdf4",
                        color: "#166534",
                        label: "Closed",
                    };

    return (
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 12px",
                borderRadius: 999,
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
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 700,
};