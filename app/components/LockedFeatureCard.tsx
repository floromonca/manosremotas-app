import Link from "next/link";
import { MR_THEME } from "@/lib/theme";

type LockedFeatureCardProps = {
    eyebrow?: string;
    title: string;
    description: string;
    planLabel?: string;
    ctaLabel?: string;
    ctaHref?: string;
};

export default function LockedFeatureCard({
    eyebrow = "Plan feature",
    title,
    description,
    planLabel = "Upgrade required",
    ctaLabel = "View current plan",
    ctaHref = "/settings/billing",
}: LockedFeatureCardProps) {
    return (
        <section
            style={{
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: 22,
                background: "#ffffff",
                padding: 22,
                boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
                display: "grid",
                gap: 16,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 14,
                    flexWrap: "wrap",
                }}
            >
                <div style={{ maxWidth: 680 }}>
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 850,
                            color: MR_THEME.colors.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                        }}
                    >
                        {eyebrow}
                    </div>

                    <h2
                        style={{
                            margin: "6px 0 8px",
                            fontSize: 22,
                            fontWeight: 900,
                            letterSpacing: "-0.035em",
                            color: MR_THEME.colors.textPrimary,
                        }}
                    >
                        {title}
                    </h2>

                    <p
                        style={{
                            margin: 0,
                            fontSize: 14,
                            lineHeight: 1.55,
                            color: MR_THEME.colors.textSecondary,
                        }}
                    >
                        {description}
                    </p>
                </div>

                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 34,
                        padding: "0 12px",
                        borderRadius: 999,
                        background: MR_THEME.colors.primarySoft,
                        color: MR_THEME.colors.primary,
                        fontSize: 12,
                        fontWeight: 850,
                        whiteSpace: "nowrap",
                    }}
                >
                    {planLabel}
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "center",
                }}
            >
                <Link
                    href={ctaHref}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 40,
                        padding: "0 14px",
                        borderRadius: 12,
                        background: MR_THEME.colors.primary,
                        color: "#ffffff",
                        fontSize: 13,
                        fontWeight: 850,
                        textDecoration: "none",
                        boxShadow: "0 8px 18px rgba(37, 99, 235, 0.18)",
                    }}
                >
                    {ctaLabel}
                </Link>

                <span
                    style={{
                        color: MR_THEME.colors.textMuted,
                        fontSize: 13,
                        lineHeight: 1.4,
                    }}
                >
                    This feature is controlled by your company plan.
                </span>
            </div>
        </section>
    );
}