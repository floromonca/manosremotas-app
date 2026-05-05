"use client";

import React from "react";
import { MR_THEME } from "../../../../lib/theme";

type KpiCardProps = {
    title: string;
    value: string;
    onClick?: () => void;
    accentColor?: string;
};

export default function KpiCard({
    title,
    value,
    onClick,
    accentColor,
}: KpiCardProps) {
    const clickable = !!onClick;

    return (
        <div
            onClick={onClick}
            style={{
                padding: "14px 14px 12px",
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: 14,
                background: MR_THEME.colors.cardBg,
                cursor: clickable ? "pointer" : "default",
                transition: "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
                boxShadow: MR_THEME.shadows.cardSoft,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                minHeight: 84,
                position: "relative",
                overflow: "hidden",
            }}
            onMouseEnter={(e) => {
                if (!clickable) return;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = MR_THEME.shadows.card;
                e.currentTarget.style.borderColor = MR_THEME.colors.borderStrong;
            }}
            onMouseLeave={(e) => {
                if (!clickable) return;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = MR_THEME.shadows.cardSoft;
                e.currentTarget.style.borderColor = MR_THEME.colors.border;
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: accentColor || MR_THEME.colors.border,
                }}
            />

            <div
                style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: MR_THEME.colors.textSecondary,
                    lineHeight: 1.25,
                    paddingTop: 2,
                }}
            >
                {title}
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    gap: 8,
                }}
            >
                <div
                    style={{
                        fontSize: 30,
                        lineHeight: 1,
                        fontWeight: 800,
                        color: MR_THEME.colors.textPrimary,
                        letterSpacing: "-0.03em",
                    }}
                >
                    {value}
                </div>

                {clickable ? (
                    <div
                        style={{
                            fontSize: 12,
                            color: MR_THEME.colors.textSecondary,
                            fontWeight: 800,
                            lineHeight: 1,
                            paddingBottom: 3,
                        }}
                    >
                        →
                    </div>
                ) : null}
            </div>
        </div>
    );
}