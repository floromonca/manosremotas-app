"use client";

import type { CSSProperties } from "react";
import { statsGridStyle } from "../memberDetailStyles";
import { formatHours, formatMoney } from "../memberDetailUtils";

type MemberHoursSummary = {
    closed_hours: number | null;
    running_hours: number | null;
    display_hours: number | null;
    hourly_rate: number | null;
    estimated_pay_closed: number | null;
    estimated_pay_display: number | null;
};

type MemberHoursStatsProps = {
    hoursSummary: MemberHoursSummary | null;
    currencyCode: string;
};

export default function MemberHoursStats({
    hoursSummary,
    currencyCode,
}: MemberHoursStatsProps) {
    return (
        <div style={statsGridStyle}>
            <InfoCard
                label="Closed hours"
                value={formatHours(hoursSummary?.closed_hours)}
            />
            <InfoCard
                label="Running hours"
                value={formatHours(hoursSummary?.running_hours)}
            />
            <InfoCard
                label="Visible hours"
                value={formatHours(hoursSummary?.display_hours)}
            />
            <InfoCard
                label="Hourly rate"
                value={
                    hoursSummary?.hourly_rate != null
                        ? formatMoney(hoursSummary.hourly_rate, currencyCode)
                        : "Rate not set"
                }
            />
            <InfoCard
                label="Estimated pay (closed)"
                value={
                    hoursSummary?.hourly_rate != null
                        ? formatMoney(
                              hoursSummary?.estimated_pay_closed,
                              currencyCode
                          )
                        : "Rate not set"
                }
            />
            <InfoCard
                label="Estimated pay (visible)"
                value={
                    hoursSummary?.hourly_rate != null
                        ? formatMoney(
                              hoursSummary?.estimated_pay_display,
                              currencyCode
                          )
                        : "Rate not set"
                }
            />
        </div>
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
