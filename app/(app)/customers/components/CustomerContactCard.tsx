import { MR_THEME } from "../../../../lib/theme";

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
                border: `1px solid ${MR_THEME.colors.border}`,
                padding: 16,
                borderRadius: MR_THEME.radius.card,
                background: MR_THEME.colors.cardBg,
                boxShadow: MR_THEME.shadows.card,
            }}
        >
            <div style={{ marginBottom: 14 }}>
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
                    Customer Details
                </div>

                <div
                    style={{
                        fontWeight: 900,
                        fontSize: 20,
                        color: MR_THEME.colors.textPrimary,
                    }}
                >
                    Contact Information
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 10,
                }}
            >
                <ContactInfoBlock label="Email" value={email || "—"} />
                <ContactInfoBlock label="Phone" value={phone || "—"} />

                <ContactInfoBlock
                    label="Billing Address"
                    value={billingAddress || "—"}
                    fullWidth
                />
            </div>
        </div>
    );
}

function ContactInfoBlock({
    label,
    value,
    fullWidth = false,
}: {
    label: string;
    value: string;
    fullWidth?: boolean;
}) {
    return (
        <div
            style={{
                padding: 12,
                borderRadius: MR_THEME.radius.control,
                border: `1px solid ${MR_THEME.colors.border}`,
                background: MR_THEME.colors.cardBgSoft,
                gridColumn: fullWidth ? "1 / -1" : undefined,
                minWidth: 0,
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    color: MR_THEME.colors.textMuted,
                    fontWeight: 800,
                    marginBottom: 6,
                }}
            >
                {label}
            </div>

            <div
                style={{
                    fontWeight: 800,
                    color: MR_THEME.colors.textPrimary,
                    wordBreak: "break-word",
                    lineHeight: 1.45,
                }}
            >
                {value}
            </div>
        </div>
    );
}
