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
                flexDirection: "column",
                gap: 10,
                width: "100%",
            }}
        >
            <button
                type="button"
                onClick={onToggleNewWO}
                style={{
                    width: "100%",
                    padding: "11px 14px",
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

            <div
                style={{
                    display: "flex",
                    gap: 10,
                    width: "100%",
                }}
            >
                <button
                    type="button"
                    onClick={onRefresh}
                    style={{
                        flex: 1,
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
                        flex: 1,
                        padding: "10px 8px",
                        border: "1px solid transparent",
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
        </div>
    );
}