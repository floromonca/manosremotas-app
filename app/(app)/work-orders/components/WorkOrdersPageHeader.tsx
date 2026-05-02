type WorkOrdersPageHeaderProps = {
    isTechView: boolean;
    companyName: string | null;
};

export default function WorkOrdersPageHeader({
    isTechView,
    companyName,
}: WorkOrdersPageHeaderProps) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 14,
            }}
        >
            <div style={{ minWidth: 0 }}>
                <div
                    style={{
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 1.2,
                        color: "#64748b",
                        fontWeight: 900,
                        marginBottom: 8,
                    }}
                >
                    {isTechView ? "My Day" : "Operations"}
                </div>

                <h1
                    style={{
                        margin: 0,
                        fontSize: 30,
                        lineHeight: 1.08,
                        fontWeight: 900,
                        letterSpacing: "-0.04em",
                        color: "#0f172a",
                    }}
                >
                    {isTechView ? "My Work Orders" : "Work Orders"}
                </h1>

                <div
                    style={{
                        marginTop: 8,
                        fontSize: 14,
                        color: "#64748b",
                        lineHeight: 1.45,
                    }}
                >
                    {isTechView
                        ? "Your assigned and active work for today."
                        : `${companyName ?? "Company"} · Field service operations overview`}
                </div>
            </div>
        </div>
    );
}