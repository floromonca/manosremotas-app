"use client";

import type { CSSProperties } from "react";
import {
    cardStyle,
    mutedTextStyle,
    sectionTitleStyle,
    statsGridStyle,
} from "../memberDetailStyles";

type MemberWorkSummaryCardProps = {
    loading: boolean;
    hasOpenShift: boolean;
    workedTodayLabel: string;
    workedWeekLabel: string;
};

export default function MemberWorkSummaryCard({
    loading,
    hasOpenShift,
    workedTodayLabel,
    workedWeekLabel,
}: MemberWorkSummaryCardProps) {
    return (
        <section style={cardStyle}>
            <div style={sectionTitleStyle}>Work summary</div>

            {loading ? (
                <div style={mutedTextStyle}>Loading work summary...</div>
            ) : (
                <div style={statsGridStyle}>
                    <InfoCard label="Active shift" value={hasOpenShift ? "Yes" : "No"} />
                    <InfoCard label="Worked today" value={workedTodayLabel} />
                    <InfoCard label="Worked this week" value={workedWeekLabel} />
                    <InfoCard
                        label="Current status"
                        value={hasOpenShift ? "Checked in" : "Off shift"}
                    />
                </div>
            )}
        </section>
    );
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div style={infoCardStyle}>
            <div style={infoLabelStyle}>{label}</div>
            <div style={infoValueStyle}>{value}</div>
        </div>
    );
}

const infoCardStyle: CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 16,
    background: "#fff",
};

const infoLabelStyle: CSSProperties = {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: 600,
};

const infoValueStyle: CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.2,
};
