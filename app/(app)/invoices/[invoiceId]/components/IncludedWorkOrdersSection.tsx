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

export default function IncludedWorkOrdersSection({
    workOrders,
    onOpenWorkOrder,
}: Props) {
    if (workOrders.length === 0) return null;

    return (
        <div
            style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 12,
                border: "1px solid #eee",
                background: "white",
            }}
        >
            <div style={{ fontWeight: 900, marginBottom: 10 }}>
                Included Work Orders
            </div>

            <div style={{ display: "grid", gap: 10 }}>
                {workOrders.map((wo) => (
                    <div
                        key={wo.work_order_id}
                        style={{
                            padding: 12,
                            border: "1px solid #eee",
                            borderRadius: 10,
                            background: "#fafafa",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "center",
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 800 }}>
                                {wo.work_order_number ?? "Work Order"}
                            </div>

                            {wo.description ? (
                                <div style={{ fontSize: 13, opacity: 0.8 }}>
                                    {wo.description}
                                </div>
                            ) : null}

                            {wo.created_at ? (
                                <div style={{ fontSize: 12, opacity: 0.65 }}>
                                    {new Date(wo.created_at).toLocaleString()}
                                </div>
                            ) : null}
                        </div>

                        <button
                            type="button"
                            onClick={() => onOpenWorkOrder(wo.work_order_id)}
                            style={{
                                padding: "8px 12px",
                                borderRadius: 8,
                                border: "1px solid #ddd",
                                background: "white",
                                cursor: "pointer",
                                fontWeight: 700,
                            }}
                        >
                            Open WO
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}