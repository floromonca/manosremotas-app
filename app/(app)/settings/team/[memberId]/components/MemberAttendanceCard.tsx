"use client";

import type { CSSProperties } from "react";
import {
    cardStyle,
    mutedTextStyle,
    sectionTitleStyle,
    statsGridStyle,
} from "../memberDetailStyles";

type MemberAttendanceCardProps = {
    loading: boolean;
    lastCheckInLabel: string;
    lastCheckOutLabel: string;
    shiftsTodayCount: number;
    shiftsWeekCount: number;
};

export default function MemberAttendanceCard({
    loading,
    lastCheckInLabel,
    lastCheckOutLabel,
    shiftsTodayCount,
    shiftsWeekCount,
}: MemberAttendanceCardProps) {
    return (
        <section style={cardStyle}>
            <div style={sectionTitleStyle}>Attendance</div>

            {loading ? (
                <div style={mutedTextStyle}>Loading attendance...</div>
            ) : (
                <div style={statsGridStyle}>
                    <InfoCard label="Last check-in" value={lastCheckInLabel} />
                    <InfoCard label="Last check-out" value={lastCheckOutLabel} />
                    <InfoCard label="Shifts today" value={String(shiftsTodayCount)} />
                    <InfoCard label="Shifts this week" value={String(shiftsWeekCount)} />
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
