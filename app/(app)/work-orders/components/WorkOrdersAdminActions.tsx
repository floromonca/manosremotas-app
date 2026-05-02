import { useRouter } from "next/navigation";

type WorkOrdersAdminActionsProps = {
    showNewWO: boolean;
    onToggleNewWO: () => void;
    onRefresh: () => void;
};

export default function WorkOrdersAdminActions({
    showNewWO,
    onToggleNewWO,
    onRefresh,
}: WorkOrdersAdminActionsProps) {
    const router = useRouter();

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
            }}
        >
            <button
                type="button"
                onClick={onToggleNewWO}
                style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #2563eb",
                    background: "#2563eb",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                    boxShadow: "none",
                }}
            >
                {showNewWO ? "Close" : "New Work Order"}
            </button>

            <button
                type="button"
                onClick={onRefresh}
                style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#475569",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                }}
            >
                Refresh
            </button>

            <button
                type="button"
                onClick={() => router.replace("/control-center")}
                style={{
                    padding: "10px 8px",
                    border: "none",
                    background: "transparent",
                    color: "#2563eb",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                }}
            >
                Control Center
            </button>
        </div>
    );
}