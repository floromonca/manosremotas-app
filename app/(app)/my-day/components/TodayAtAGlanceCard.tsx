"use client";

import React from "react";

type TodayAtAGlanceCardProps = {
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
}: TodayAtAGlanceCardProps) {
    const totalOpen = assignedCount + inProgressCount;

    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                background: "linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)",
                padding: 20,
                marginBottom: 18,
                boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                    marginBottom: 14,
                }}
            >
                <div style={{ minWidth: 260, flex: 1 }}>
                    <div
                        style={{
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: "#64748b",
                            fontWeight: 800,
                            marginBottom: 8,
                        }}
                    >
                        Today at a glance
                    </div>

                    <div
                        style={{
                            fontSize: 26,
                            fontWeight: 800,
                            lineHeight: 1.1,
                            color: "#111827",
                            letterSpacing: "-0.02em",
                            marginBottom: 8,
                        }}
                    >
                        {loading ? "Loading today’s activity" : "Daily operational snapshot"}
                    </div>

                    <div
                        style={{
                            color: "#6b7280",
                            fontSize: 14,
                            lineHeight: 1.6,
                            maxWidth: 760,
                        }}
                    >
                        {loading
                            ? "Refreshing your assigned, active, and completed work orders."
                            : totalOpen > 0
                                ? `You currently have ${totalOpen} active work item${totalOpen === 1 ? "" : "s"} across assigned and in-progress work.`
                                : "No assigned or active work orders right now. Your day is clear at the moment."}
                    </div>
                </div>

                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid #dbe3ef",
                        background: "#f8fafc",
                        color: "#334155",
                        fontSize: 13,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                    }}
                >
                    {loading
                        ? "Refreshing"
                        : `${assignedCount + inProgressCount + completedCount} total`}
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                }}
            >
                <StatCard
                    label="Assigned"
                    value={loading ? "…" : String(assignedCount)}
                    tone="assigned"
                />

                <StatCard
                    label="In progress"
                    value={loading ? "…" : String(inProgressCount)}
                    tone="in_progress"
                />

                <StatCard
                    label="Completed"
                    value={loading ? "…" : String(completedCount)}
                    tone="completed"
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
    tone: "assigned" | "in_progress" | "completed";
}) {
    const toneStyles =
        tone === "assigned"
            ? {
                border: "1px solid #dbeafe",
                background: "#f8fbff",
                labelColor: "#64748b",
                valueColor: "#1e3a8a",
            }
            : tone === "in_progress"
                ? {
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                    labelColor: "#475569",
                    valueColor: "#1d4ed8",
                }
                : {
                    border: "1px solid #bbf7d0",
                    background: "#f0fdf4",
                    labelColor: "#4b5563",
                    valueColor: "#166534",
                };

    return (
        <div
            style={{
                border: toneStyles.border,
                borderRadius: 16,
                padding: 16,
                background: toneStyles.background,
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    color: toneStyles.labelColor,
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 700,
                }}
            >
                {label}
            </div>

            <div
                style={{
                    fontSize: 30,
                    fontWeight: 900,
                    color: toneStyles.valueColor,
                    lineHeight: 1,
                    marginBottom: 8,
                    fontVariantNumeric: "tabular-nums",
                }}
            >
                {value}
            </div>

            <div
                style={{
                    fontSize: 13,
                    color: "#64748b",
                    lineHeight: 1.5,
                }}
            >
                {tone === "assigned"
                    ? "Ready to start"
                    : tone === "in_progress"
                        ? "Needs active attention"
                        : "Finished today"}
            </div>
        </div>
    );
}