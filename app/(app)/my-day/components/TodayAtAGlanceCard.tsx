"use client";

import React from "react";
import { MR_THEME } from "../../../../lib/theme";

type Props = {
    compactDesktop?: boolean;
    loading: boolean;
    assignedCount: number;
    inProgressCount: number;
    completedCount: number;
};

export default function TodayAtAGlanceCard({
    compactDesktop = false,
    loading,
    assignedCount,
    inProgressCount,
    completedCount,
}: Props) {
    return (
        <div
            style={{
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                background: MR_THEME.colors.cardBg,
                padding: compactDesktop ? 16 : MR_THEME.layout.cardPadding,
                boxShadow: MR_THEME.shadows.card,
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: MR_THEME.colors.textMuted,
                    fontWeight: 800,
                    marginBottom: compactDesktop ? 8 : 10,
                }}
            >
                Today at a glance
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: compactDesktop ? 10 : 12,
                }}
            >
                <StatCard
                    label="Assigned"
                    value={loading ? "..." : String(assignedCount)}
                    tone="neutral"
                    compactDesktop={compactDesktop}
                />

                <StatCard
                    label="In progress"
                    value={loading ? "..." : String(inProgressCount)}
                    tone="active"
                    compactDesktop={compactDesktop}
                />

                <StatCard
                    label="Completed"
                    value={loading ? "..." : String(completedCount)}
                    tone="success"
                    compactDesktop={compactDesktop}
                />
            </div>
        </div>
    );
}

function StatCard({
    compactDesktop,
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: "neutral" | "active" | "success";
    compactDesktop?: boolean;
}) {
    const styles =
        tone === "active"
            ? {
                border: `1px solid ${MR_THEME.colors.primarySoft}`,
                background: MR_THEME.colors.cardBgSoft,
                valueColor: MR_THEME.colors.primaryHover,
            }
            : tone === "success"
                ? {
                    border: "1px solid #bbf7d0",
                    background: "#f0fdf4",
                    valueColor: MR_THEME.colors.success,
                }
                : {
                    border: `1px solid ${MR_THEME.colors.border}`,
                    background: MR_THEME.colors.cardBgSoft,
                    valueColor: MR_THEME.colors.textPrimary,
                };

    return (
        <div
            style={{
                border: styles.border,
                borderRadius: MR_THEME.radius.control,
                padding: compactDesktop ? 12 : 14,
                background: styles.background,
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    color: MR_THEME.colors.textSecondary,
                    marginBottom: compactDesktop ? 4 : 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 800,
                }}
            >
                {label}
            </div>

            <div
                style={{
                    fontSize: compactDesktop ? 24 : 28,
                    fontWeight: 900,
                    color: styles.valueColor,
                    lineHeight: 1,
                }}
            >
                {value}
            </div>
        </div>
    );
}
