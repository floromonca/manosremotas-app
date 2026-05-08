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

const COMPACT_VISIBLE_ROWS = 5;
type TeamStatusFilter = "all" | "on_shift" | "off_shift" | "stale";

export default function TeamStatusTodayCard({
    rows,
    loading,
    onCloseShift,
}: TeamStatusTodayCardProps) {
    const [showAll, setShowAll] = useState(false);
    const [activeFilter, setActiveFilter] = useState<TeamStatusFilter>("all");

    const sortedRows = useMemo(() => {
        return [...rows].sort((a, b) => {
            const aPriority = getRowPriority(a);
            const bPriority = getRowPriority(b);

            if (aPriority !== bPriority) return aPriority - bPriority;

            return (a.full_name || "").localeCompare(b.full_name || "");
        });
    }, [rows]);

    const filteredRows = useMemo(() => {
        if (activeFilter === "on_shift") return sortedRows.filter((r) => r.is_on_shift);
        if (activeFilter === "off_shift") return sortedRows.filter((r) => !r.is_on_shift);
        if (activeFilter === "stale") return sortedRows.filter((r) => isStaleShift(r.check_in_at));
        return sortedRows;
    }, [activeFilter, sortedRows]);

    const visibleRows = showAll
        ? filteredRows
        : filteredRows.slice(0, COMPACT_VISIBLE_ROWS);

    const onShiftCount = rows.filter((r) => r.is_on_shift).length;
    const staleCount = rows.filter((r) => isStaleShift(r.check_in_at)).length;
    const offShiftCount = rows.length - onShiftCount;
    const hasMoreRows = filteredRows.length > COMPACT_VISIBLE_ROWS;

    return (
        <div
            style={{
                background: MR_THEME.colors.cardBg,
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                padding: 16,
                boxShadow: MR_THEME.shadows.cardSoft,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 14,
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 800,
                        color: MR_THEME.colors.textPrimary,
                    }}
                >
                    Team Status Today
                </h2>

                {hasMoreRows ? (
                    <button
                        type="button"
                        onClick={() => {
                            setActiveFilter("all");
                            setShowAll((current) => !current);
                        }}
                        style={{
                            border: "none",
                            background: "transparent",
                            color: MR_THEME.colors.primary,
                            fontSize: 13,
                            fontWeight: 800,
                            cursor: "pointer",
                            padding: 0,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {showAll ? "Show less" : "View full team →"}
                    </button>
                ) : null}
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
                        <SummaryPill
                            label="On shift"
                            value={onShiftCount}
                            tone="success"
                            active={activeFilter === "on_shift"}
                            onClick={() => {
                                setActiveFilter((current) => {
                                    const next = current === "on_shift" ? "all" : "on_shift";
                                    setShowAll(next !== "all");
                                    return next;
                                });
                            }}
                        />
                        <SummaryPill
                            label="Off shift"
                            value={offShiftCount}
                            tone="neutral"
                            active={activeFilter === "off_shift"}
                            onClick={() => {
                                setActiveFilter((current) => {
                                    const next = current === "off_shift" ? "all" : "off_shift";
                                    setShowAll(next !== "all");
                                    return next;
                                });
                            }}
                        />
                        <SummaryPill
                            label="Stale"
                            value={staleCount}
                            tone="warning"
                            active={activeFilter === "stale"}
                            onClick={() => {
                                setActiveFilter((current) => {
                                    const next = current === "stale" ? "all" : "stale";
                                    setShowAll(next !== "all");
                                    return next;
                                });
                            }}
                        />
                    </div>

                    {activeFilter !== "all" ? (
                        <button
                            type="button"
                            onClick={() => {
                                setActiveFilter("all");
                                setShowAll(true);
                            }}
                            style={{
                                justifySelf: "start",
                                border: "none",
                                background: "transparent",
                                color: MR_THEME.colors.primary,
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 800,
                                padding: 0,
                            }}
                        >
                            Show all technicians
                        </button>
                    ) : null}

                    <div
                        className={`teamStatusRows ${showAll || activeFilter !== "all" ? "teamStatusRowsOpen" : ""}`}
                        style={{ display: "grid", gap: 8 }}
                    >
                        {visibleRows.length === 0 ? (
                            <div
                                style={{
                                    padding: "10px 0",
                                    color: MR_THEME.colors.textSecondary,
                                    fontSize: 13,
                                }}
                            >
                                No technicians in this group.
                            </div>
                        ) : null}

                        {visibleRows.map((r) => {
                            const elapsed = formatElapsed(r.check_in_at);
                            const stale = isStaleShift(r.check_in_at);

                            return (
                                <div
                                    key={r.user_id}
                                    className="teamStatusRow"
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "auto minmax(0, 1fr) auto",
                                        gap: 10,
                                        alignItems: "center",
                                        padding: "7px 0",
                                        borderBottom: `1px solid ${MR_THEME.colors.border}`,
                                        background: "transparent",
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: 999,
                                            background: r.is_on_shift
                                                ? MR_THEME.colors.success
                                                : MR_THEME.colors.primary,
                                            opacity: r.is_on_shift ? 1 : 0.85,
                                        }}
                                    />

                                    <div style={{ minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: 13,
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
                                            className="teamStatusMeta"
                                            style={{
                                                marginTop: 3,
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
                                                    <span>
                                                        Since {formatTime(r.check_in_at)}
                                                    </span>
                                                    <span>
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
                                                    <span>No active shift</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div
                                        className="teamStatusActions"
                                        style={{
                                            display: "flex",
                                            gap: 6,
                                            alignItems: "center",
                                            justifyContent: "flex-end",
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
                                                    fontWeight: 700,
                                                    opacity: 0.8,
                                                    padding: 0,
                                                    border: "none",
                                                    background: "transparent",
                                                    color: MR_THEME.colors.warning,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Close
                                            </button>
                                        ) : null}

                                        <div
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                padding: "4px 8px",
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
                </div>
            )}

            <style jsx>{`
                @media (max-width: 720px) {
                    .teamStatusRows {
                        display: none !important;
                    }

                    .teamStatusRowsOpen {
                        display: grid !important;
                        gap: 4px !important;
                    }

                    .teamStatusRow {
                        grid-template-columns: auto minmax(0, 1fr) !important;
                        gap: 8px !important;
                        padding: 9px 0 !important;
                    }

                    .teamStatusRow:nth-of-type(n + 4) {
                        display: none !important;
                    }

                    .teamStatusMeta {
                        gap: 5px !important;
                    }

                    .teamStatusActions {
                        grid-column: 2;
                        justify-content: flex-start !important;
                        gap: 8px !important;
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
    active,
    onClick,
}: {
    label: string;
    value: number;
    tone: "success" | "warning" | "neutral";
    active?: boolean;
    onClick?: () => void;
}) {
    const color =
        tone === "success"
            ? MR_THEME.colors.success
            : tone === "warning"
                ? MR_THEME.colors.warning
                : MR_THEME.colors.textSecondary;

    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${active ? color : MR_THEME.colors.border}`,
                background: active ? color + "20" : color + "12",
                color,
                fontSize: 12,
                fontWeight: 800,
                cursor: onClick ? "pointer" : "default",
                boxShadow: active ? MR_THEME.shadows.card : "none",
            }}
        >
            <span>{label}</span>
            <strong>{value}</strong>
        </button>
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
