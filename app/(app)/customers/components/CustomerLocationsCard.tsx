import { MR_THEME } from "../../../../lib/theme";

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
                border: `1px solid ${MR_THEME.colors.border}`,
                padding: 16,
                borderRadius: MR_THEME.radius.card,
                background: MR_THEME.colors.cardBg,
                boxShadow: MR_THEME.shadows.card,
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
                            color: MR_THEME.colors.textMuted,
                            fontWeight: 800,
                            marginBottom: 6,
                        }}
                    >
                        Customer Locations
                    </div>

                    <div
                        style={{
                            fontWeight: 900,
                            fontSize: 20,
                            color: MR_THEME.colors.textPrimary,
                        }}
                    >
                        Locations
                    </div>
                </div>

                <button
                    onClick={onAddLocation}
                    style={{
                        height: 42,
                        padding: "0 14px",
                        borderRadius: MR_THEME.radius.control,
                        border: `1px solid ${MR_THEME.colors.primary}`,
                        background: MR_THEME.colors.primary,
                        color: "#ffffff",
                        cursor: "pointer",
                        fontWeight: 800,
                        boxShadow: MR_THEME.shadows.cardSoft,
                    }}
                >
                    + Add Location
                </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
                {locations.map((location) => (
                    <div
                        key={location.location_id}
                        style={{
                            border: `1px solid ${MR_THEME.colors.border}`,
                            padding: 12,
                            borderRadius: MR_THEME.radius.control,
                            background: MR_THEME.colors.cardBgSoft,
                        }}
                    >
                        <div
                            style={{
                                fontWeight: 900,
                                fontSize: 15,
                                color: MR_THEME.colors.textPrimary,
                                marginBottom: 6,
                            }}
                        >
                            {location.label || "Location"}
                        </div>

                        <div
                            style={{
                                color: MR_THEME.colors.textSecondary,
                                lineHeight: 1.5,
                                wordBreak: "break-word",
                            }}
                        >
                            {location.address || "—"}
                        </div>
                    </div>
                ))}

                {locations.length === 0 ? (
                    <div
                        style={{
                            padding: 16,
                            borderRadius: MR_THEME.radius.control,
                            border: `1px dashed ${MR_THEME.colors.borderStrong}`,
                            background: MR_THEME.colors.cardBgSoft,
                            color: MR_THEME.colors.textSecondary,
                        }}
                    >
                        No locations yet.
                    </div>
                ) : null}
            </div>
        </div>
    );
}
