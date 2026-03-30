type CustomerHeaderCardProps = {
    customerName: string;
    customerId: string;
    locationsCount: number;
};

export default function CustomerHeaderCard({
    customerName,
    customerId,
    locationsCount,
}: CustomerHeaderCardProps) {
    return (
        <div
            style={{
                marginBottom: 20,
                padding: "18px 20px",
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
        >
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
                Customer
            </div>

            <h1
                style={{
                    margin: 0,
                    fontSize: 30,
                    lineHeight: 1.1,
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    color: "#111827",
                }}
            >
                {customerName}
            </h1>

            <div
                style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "center",
                }}
            >
                <span
                    style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        color: "#374151",
                    }}
                >
                    Customer ID: <b>{customerId.slice(0, 8)}</b>
                </span>

                <span
                    style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        color: "#374151",
                    }}
                >
                    Locations: <b>{locationsCount}</b>
                </span>
            </div>
        </div>
    );
}