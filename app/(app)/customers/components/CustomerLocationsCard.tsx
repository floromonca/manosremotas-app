type Location = {
    location_id: string;
    label: string | null;
    address: string | null;
    created_at: string | null;
};

type CustomerLocationsCardProps = {
    locations: Location[];
    onAddLocation: () => void;
};

export default function CustomerLocationsCard({
    locations,
    onAddLocation,
}: CustomerLocationsCardProps) {
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
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "end",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 14,
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
                        Customer Locations
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 22, color: "#111827" }}>
                        Locations
                    </div>
                </div>

                <button
                    onClick={onAddLocation}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid #111827",
                        background: "#111827",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 800,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                    }}
                >
                    + Add Location
                </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
                {locations.map((l) => (
                    <div
                        key={l.location_id}
                        style={{
                            border: "1px solid #e5e7eb",
                            padding: 14,
                            borderRadius: 14,
                            background: "#fcfcfd",
                        }}
                    >
                        <div
                            style={{
                                fontWeight: 800,
                                fontSize: 16,
                                color: "#111827",
                                marginBottom: 6,
                            }}
                        >
                            {l.label || "Location"}
                        </div>

                        <div style={{ color: "#4b5563", lineHeight: 1.5 }}>
                            {l.address || "—"}
                        </div>
                    </div>
                ))}

                {locations.length === 0 ? (
                    <div
                        style={{
                            padding: 16,
                            borderRadius: 14,
                            border: "1px dashed #d1d5db",
                            background: "#fafafa",
                            color: "#6b7280",
                        }}
                    >
                        No locations yet.
                    </div>
                ) : null}
            </div>
        </div>
    );
}