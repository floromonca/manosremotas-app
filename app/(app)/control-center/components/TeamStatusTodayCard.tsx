"use client";

import React, { useMemo, useState } from "react";
import { MR_THEME } from "../../../../lib/theme";
import type { TeamStatusTodayRow } from "../../../../lib/supabase/controlCenter";

type TeamStatusTodayCardProps = {
    rows: TeamStatusTodayRow[];
    loading: boolean;
    onCloseShift?: (
        shiftId: string,
        technicianName: string,
        elapsedLabel: string
    ) => Promise<void>;
};

const INITIAL_VISIBLE_ROWS = 6;

export default function TeamStatusTodayCard({
    rows,
    loading,
    onCloseShift,
}: TeamStatusTodayCardProps) {
    const [showAll, setShowAll] = useState(false);

    const sortedRows = useMemo(() => {
        return [...rows].sort((a, b) => {
            const aPriority = getRowPriority(a);
            const bPriority = getRowPriority(b);

            if (aPriority !== bPriority) return aPriority - bPriority;

            return (a.full_name || "").localeCompare(b.full_name || "");
        });
    }, [rows]);

    const visibleRows = showAll
        ? sortedRows
        : sortedRows.slice(0, INITIAL_VISIBLE_ROWS);

    const onShiftCount = rows.filter((r) => r.is_on_shift).length;
    const staleCount = rows.filter((r) => isStaleShift(r.check_in_at)).length;
    const offShiftCount = rows.length - onShiftCount;
    const hasMoreRows = sortedRows.length > INITIAL_VISIBLE_ROWS;

    return (
        <div
            style={{
                background: MR_THEME.colors.cardBg,
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                padding: 22,
                boxShadow: MR_THEME.shadows.cardSoft,
            }}
        >
            <div style={{ marginBottom: 14 }}>
                <h2
                    style={{
                        margin: 0,
                        fontSize: 20,
                        fontWeight: 800,
                        color: MR_THEME.colors.textPrimary,
                    }}
                >
                    Team Status Today
                </h2>

                <p
                    style={{
                        margin: "6px 0 0",
                        fontSize: 13,
                        color: MR_THEME.colors.textSecondary,
                        lineHeight: 1.45,
                    }}
                >
                    See who is currently on shift and identify shifts that may need attention.
                </p>
            </div>

            {loading ? (
                <div style={{ color: MR_THEME.colors.textSecondary }}>
                    Loading team status...
                </div>
            ) : rows.length === 0 ? (
                <div style={{ color: MR_THEME.colors.textSecondary }}>
                    No technicians found.
                </div>
            ) : (
                <div style={{ display: "grid", gap: 12 }}>
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            alignItems: "center",
                        }}
                    >
                        <SummaryPill label="On shift" value={onShiftCount} tone="success" />
                        <SummaryPill label="Off shift" value={offShiftCount} tone="neutral" />
                        <SummaryPill label="Stale" value={staleCount} tone="warning" />
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                        {visibleRows.map((r) => {
                            const elapsed = formatElapsed(r.check_in_at);
                            const stale = isStaleShift(r.check_in_at);

                            return (
                                <div
                                    key={r.user_id}
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "minmax(0, 1fr) auto",
                                        gap: 14,
                                        alignItems: "center",
                                        padding: "12px 14px",
                                        borderRadius: MR_THEME.radius.control,
                                        border: stale
                                            ? `1px solid ${MR_THEME.colors.warning}`
                                            : `1px solid ${MR_THEME.colors.border}`,
                                        background: stale
                                            ? MR_THEME.colors.warning + "10"
                                            : MR_THEME.colors.cardBgSoft,
                                    }}
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontWeight: 800,
                                                color: MR_THEME.colors.textPrimary,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {r.full_name || "Unnamed"}
                                        </div>

                                        <div
                                            style={{
                                                marginTop: 6,
                                                display: "flex",
                                                gap: 8,
                                                flexWrap: "wrap",
                                                alignItems: "center",
                                                fontSize: 12,
                                                color: MR_THEME.colors.textSecondary,
                                            }}
                                        >
                                            <span style={{ fontWeight: 700 }}>{r.role}</span>

                                            {r.is_on_shift && r.check_in_at ? (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        Started at{" "}
                                                        <strong
                                                            style={{
                                                                color: MR_THEME.colors.textPrimary,
                                                            }}
                                                        >
                                                            {formatTime(r.check_in_at)}
                                                        </strong>
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        In shift{" "}
                                                        <strong
                                                            style={{
                                                                color: stale
                                                                    ? MR_THEME.colors.warning
                                                                    : MR_THEME.colors.textPrimary,
                                                                background: stale
                                                                    ? MR_THEME.colors.warning + "15"
                                                                    : "transparent",
                                                                padding: stale ? "2px 6px" : 0,
                                                                borderRadius: 999,
                                                            }}
                                                        >
                                                            {elapsed}
                                                        </strong>
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>•</span>
                                                    <span>No active shift</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            alignItems: "center",
                                        }}
                                    >
                                        {isStaleShift(r.check_in_at) && r.shift_id && onCloseShift ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onCloseShift(
                                                        r.shift_id!,
                                                        r.full_name || "Technician",
                                                        formatElapsed(r.check_in_at)
                                                    );
                                                }}
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 800,
                                                    padding: "6px 10px",
                                                    borderRadius: 999,
                                                    border: `1px solid ${MR_THEME.colors.warning}`,
                                                    background: MR_THEME.colors.warning + "15",
                                                    color: MR_THEME.colors.warning,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Close shift
                                            </button>
                                        ) : null}

                                        <div
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 800,
                                                padding: "6px 10px",
                                                borderRadius: 999,
                                                background: r.is_on_shift
                                                    ? MR_THEME.colors.success + "22"
                                                    : MR_THEME.colors.border,
                                                color: r.is_on_shift
                                                    ? MR_THEME.colors.success
                                                    : MR_THEME.colors.textSecondary,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {r.is_on_shift ? "On Shift" : "Off Shift"}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {hasMoreRows ? (
                        <button
                            type="button"
                            onClick={() => setShowAll((current) => !current)}
                            style={{
                                justifySelf: "start",
                                border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                background: MR_THEME.colors.cardBg,
                                color: MR_THEME.colors.textPrimary,
                                borderRadius: MR_THEME.radius.control,
                                padding: "8px 12px",
                                fontSize: 13,
                                fontWeight: 800,
                                cursor: "pointer",
                            }}
                        >
                            {showAll
                                ? "Show fewer"
                                : `Show all ${sortedRows.length} technicians`}
                        </button>
                    ) : null}
                </div>
            )}

            <style jsx>{`
                @media (max-width: 720px) {
                    div[style*="grid-template-columns"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}

function SummaryPill({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: "success" | "warning" | "neutral";
}) {
    const color =
        tone === "success"
            ? MR_THEME.colors.success
            : tone === "warning"
                ? MR_THEME.colors.warning
                : MR_THEME.colors.textSecondary;

    return (
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${MR_THEME.colors.border}`,
                background: color + "12",
                color,
                fontSize: 12,
                fontWeight: 800,
            }}
        >
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function getRowPriority(row: TeamStatusTodayRow) {
    if (isStaleShift(row.check_in_at)) return 1;
    if (row.is_on_shift) return 2;
    return 3;
}

function isStaleShift(value: string | null) {
    if (!value) return false;

    const start = new Date(value);
    if (Number.isNaN(start.getTime())) return false;

    const diffMs = Date.now() - start.getTime();
    const hours = Math.floor(diffMs / 3600000);

    return hours >= 18;
}

function formatTime(value: string | null) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString("en-CA", {
        hour: "numeric",
        minute: "2-digit",
    });
}

function formatElapsed(value: string | null) {
    if (!value) return "—";

    const start = new Date(value);
    if (Number.isNaN(start.getTime())) return "—";

    const diffMs = Date.now() - start.getTime();
    if (diffMs <= 0) return "0m";

    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours >= 18) return `${hours}h (stale)`;
    if (hours >= 12) return `${hours}h ${minutes}m`;

    return hours <= 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
}