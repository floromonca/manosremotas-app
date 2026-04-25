"use client";

import React from "react";
import { MR_THEME } from "../../../../lib/theme";

type Props = {
    loading: boolean;
    assignedCount: number;
    inProgressCount: number;
    completedCount: number;
};

export default function TodayAtAGlanceCard({
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
                padding: MR_THEME.layout.cardPadding,
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
                    marginBottom: 10,
                }}
            >
                Today at a glance
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 12,
                }}
            >
                <StatCard
                    label="Assigned"
                    value={loading ? "..." : String(assignedCount)}
                    tone="neutral"
                />

                <StatCard
                    label="In progress"
                    value={loading ? "..." : String(inProgressCount)}
                    tone="active"
                />

                <StatCard
                    label="Completed"
                    value={loading ? "..." : String(completedCount)}
                    tone="success"
                />
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: "neutral" | "active" | "success";
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
                padding: 14,
                background: styles.background,
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    color: MR_THEME.colors.textSecondary,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 800,
                }}
            >
                {label}
            </div>

            <div
                style={{
                    fontSize: 28,
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