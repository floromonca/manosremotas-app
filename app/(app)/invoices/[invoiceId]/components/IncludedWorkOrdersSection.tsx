"use client";

type IncludedWorkOrderRow = {
    work_order_id: string;
    work_order_number: string | null;
    description: string | null;
    created_at: string | null;
};

type Props = {
    workOrders: IncludedWorkOrderRow[];
    onOpenWorkOrder: (workOrderId: string) => void;
};

function formatCreatedAt(value: string | null) {
    if (!value) return "Date not available";

    return new Date(value).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default function IncludedWorkOrdersSection({
    workOrders,
    onOpenWorkOrder,
}: Props) {
    if (workOrders.length === 0) return null;

    return (
        <section
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 20,
                background: "#ffffff",
                boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                padding: 20,
            }}
        >
            <div style={{ display: "grid", gap: 16 }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        flexWrap: "wrap",
                    }}
                >
                    <div style={{ display: "grid", gap: 6 }}>
                        <div
                            style={{
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: 1.1,
                                color: "#6b7280",
                                fontWeight: 800,
                            }}
                        >
                            Included Work Orders
                        </div>

                        <div
                            style={{
                                fontSize: 22,
                                lineHeight: 1.15,
                                fontWeight: 900,
                                color: "#111827",
                            }}
                        >
                            Linked Work Orders
                        </div>

                        <div
                            style={{
                                fontSize: 14,
                                color: "#6b7280",
                                lineHeight: 1.6,
                            }}
                        >
                            Review the work orders included in this invoice.
                        </div>
                    </div>

                    <div
                        style={{
                            minWidth: 88,
                            height: 36,
                            padding: "0 12px",
                            borderRadius: 999,
                            background: "#f3f4f6",
                            border: "1px solid #e5e7eb",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 800,
                            color: "#374151",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {workOrders.length} {workOrders.length === 1 ? "WO" : "WOs"}
                    </div>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                    {workOrders.map((wo) => (
                        <div
                            key={wo.work_order_id}
                            style={{
                                padding: 16,
                                border: "1px solid #e5e7eb",
                                borderRadius: 16,
                                background: "#fcfcfd",
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 16,
                                alignItems: "flex-start",
                                flexWrap: "wrap",
                            }}
                        >
                            <div style={{ display: "grid", gap: 6, minWidth: 220, flex: 1 }}>
                                <div
                                    style={{
                                        fontWeight: 900,
                                        fontSize: 16,
                                        color: "#111827",
                                    }}
                                >
                                    {wo.work_order_number ?? "Work Order"}
                                </div>

                                {wo.description ? (
                                    <div
                                        style={{
                                            fontSize: 14,
                                            color: "#4b5563",
                                            lineHeight: 1.6,
                                            maxWidth: 760,
                                        }}
                                    >
                                        {wo.description}
                                    </div>
                                ) : null}

                                <div
                                    style={{
                                        fontSize: 12,
                                        color: "#6b7280",
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Created: {formatCreatedAt(wo.created_at)}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => onOpenWorkOrder(wo.work_order_id)}
                                style={{
                                    height: 42,
                                    padding: "0 14px",
                                    borderRadius: 12,
                                    border: "1px solid #d1d5db",
                                    background: "#ffffff",
                                    cursor: "pointer",
                                    fontWeight: 800,
                                    color: "#111827",
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                                }}
                            >
                                Open WO
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}