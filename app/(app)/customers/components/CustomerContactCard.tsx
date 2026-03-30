type CustomerContactCardProps = {
    email: string | null;
    phone: string | null;
    billingAddress: string | null;
};

export default function CustomerContactCard({
    email,
    phone,
    billingAddress,
}: CustomerContactCardProps) {
    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                padding: 18,
                borderRadius: 16,
                background: "white",
                marginBottom: 20,
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
        >
            <div style={{ marginBottom: 14 }}>
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
                    Customer Details
                </div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#111827" }}>
                    Contact Information
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                }}
            >
                <div
                    style={{
                        padding: 14,
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        background: "#fcfcfd",
                    }}
                >
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                        Email
                    </div>
                    <div style={{ fontWeight: 700, color: "#111827" }}>
                        {email || "—"}
                    </div>
                </div>

                <div
                    style={{
                        padding: 14,
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        background: "#fcfcfd",
                    }}
                >
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                        Phone
                    </div>
                    <div style={{ fontWeight: 700, color: "#111827" }}>
                        {phone || "—"}
                    </div>
                </div>

                <div
                    style={{
                        padding: 14,
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        background: "#fcfcfd",
                        gridColumn: "1 / -1",
                    }}
                >
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                        Billing Address
                    </div>
                    <div style={{ fontWeight: 700, color: "#111827" }}>
                        {billingAddress || "—"}
                    </div>
                </div>
            </div>
        </div>
    );
}