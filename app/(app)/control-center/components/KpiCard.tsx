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
                padding: 20,
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                background: MR_THEME.colors.cardBg,
                cursor: clickable ? "pointer" : "default",
                transition: "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
                boxShadow: MR_THEME.shadows.cardSoft,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 118,
                position: "relative",
                overflow: "hidden",
            }}
            onMouseEnter={(e) => {
                if (!clickable) return;
                e.currentTarget.style.transform = "translateY(-2px)";
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
                    height: 4,
                    background: accentColor || MR_THEME.colors.border,
                }}
            />

            <div
                style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: MR_THEME.colors.textSecondary,
                    lineHeight: 1.4,
                    paddingTop: 2,
                }}
            >
                {title}
            </div>

            <div
                style={{
                    fontSize: 38,
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
                        marginTop: "auto",
                        fontSize: 13,
                        color: MR_THEME.colors.textPrimary,
                        fontWeight: 700,
                    }}
                >
                    View →
                </div>
            ) : (
                <div style={{ marginTop: "auto", height: 18 }} />
            )}
        </div>
    );
}