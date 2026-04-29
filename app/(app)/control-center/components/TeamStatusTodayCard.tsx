"use client";

import React from "react";
import { MR_THEME } from "../../../../lib/theme";
import type { TeamStatusTodayRow } from "../../../../lib/supabase/controlCenter";

type TeamStatusTodayCardProps = {
    rows: TeamStatusTodayRow[];
    loading: boolean;
};

export default function TeamStatusTodayCard({
    rows,
    loading,
}: TeamStatusTodayCardProps) {
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
            <h2
                style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    color: MR_THEME.colors.textPrimary,
                    marginBottom: 10,
                }}
            >
                Team Status Today
            </h2>

            {loading ? (
                <div style={{ color: MR_THEME.colors.textSecondary }}>
                    Loading team status...
                </div>
            ) : rows.length === 0 ? (
                <div style={{ color: MR_THEME.colors.textSecondary }}>
                    No technicians found.
                </div>
            ) : (
                <div style={{ display: "grid", gap: 10 }}>
                    {rows.map((r) => (
                        <div
                            key={r.user_id}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: `1px solid ${MR_THEME.colors.border}`,
                                background: MR_THEME.colors.cardBgSoft,
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontWeight: 600,
                                        color: MR_THEME.colors.textPrimary,
                                    }}
                                >
                                    {r.full_name || "Unnamed"}
                                </div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: MR_THEME.colors.textSecondary,
                                    }}
                                >
                                    {r.role}
                                </div>
                            </div>

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
                                }}
                            >
                                {r.is_on_shift ? "On Shift" : "Off Shift"}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}