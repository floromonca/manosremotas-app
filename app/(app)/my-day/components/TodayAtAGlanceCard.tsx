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
    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background: "#ffffff",
                padding: 20,
                marginBottom: 18,
            }}
        >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                Today at a glance
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                    marginTop: 14,
                }}
            >
                <StatCard
                    label="Assigned"
                    value={loading ? "…" : String(assignedCount)}
                />

                <StatCard
                    label="In progress"
                    value={loading ? "…" : String(inProgressCount)}
                />

                <StatCard
                    label="Completed"
                    value={loading ? "…" : String(completedCount)}
                />
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 16,
                background: "#fcfcfd",
            }}
        >
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                {label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#111827" }}>
                {value}
            </div>
        </div>
    );
}