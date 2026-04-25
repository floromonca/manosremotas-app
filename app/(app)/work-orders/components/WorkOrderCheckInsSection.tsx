"use client";

import React from "react";
import { MR_THEME } from "@/lib/theme";

type CheckIn = {
    check_in_id: string;
    check_in_at: string;
    check_out_at?: string | null;
    geofence_status?: string | null;
    policy_applied?: string | null;
    distance_to_site_m?: number | null;
    location_verified?: boolean | null;
    user_id?: string | null;
};

type Props = {
    checkIns: CheckIn[];
};

export default function WorkOrderCheckInsSection({ checkIns }: Props) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div
            style={{
                marginTop: 0,
                marginBottom: MR_THEME.spacing.md,
                padding: MR_THEME.layout.compactCardPadding,
                borderRadius: MR_THEME.radius.card,
                border: `1px solid ${MR_THEME.colors.border}`,
                background: MR_THEME.colors.cardBg,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: MR_THEME.spacing.sm,
                    marginBottom: isOpen ? MR_THEME.spacing.sm : 0,
                }}
            >
                <div
                    style={{
                        ...MR_THEME.typography.small,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        color: MR_THEME.colors.textSecondary,
                        fontWeight: 800,
                    }}
                >
                    Check-in History
                </div>

                <button
                    type="button"
                    onClick={() => setIsOpen((v) => !v)}
                    style={{
                        border: "none",
                        background: "transparent",
                        fontSize: 12,
                        fontWeight: 800,
                        color: MR_THEME.colors.primary,
                        cursor: "pointer",
                    }}
                >
                    {isOpen ? "Hide" : `Show (${checkIns.length})`}
                </button>
            </div>

            {isOpen ? (
                checkIns.length === 0 ? (
                    <div
                        style={{
                            ...MR_THEME.typography.body,
                            color: MR_THEME.colors.textSecondary,
                        }}
                    >
                        No check-ins recorded yet.
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: MR_THEME.spacing.sm }}>
                        {checkIns.map((checkIn) => (
                            <div
                                key={checkIn.check_in_id}
                                style={{
                                    padding: MR_THEME.layout.compactCardPadding,
                                    borderRadius: MR_THEME.radius.control,
                                    border: `1px solid ${MR_THEME.colors.border}`,
                                    background: MR_THEME.colors.cardBgSoft,
                                }}
                            >
                                <div
                                    style={{
                                        ...MR_THEME.typography.small,
                                        fontWeight: 800,
                                        color: MR_THEME.colors.textPrimary,
                                        marginBottom: MR_THEME.spacing.xs,
                                        wordBreak: "break-word",
                                    }}
                                >
                                    Checked in: {new Date(checkIn.check_in_at).toLocaleString()}
                                </div>

                                <div
                                    style={{
                                        ...MR_THEME.typography.small,
                                        fontWeight: 800,
                                        color: checkIn.check_out_at
                                            ? MR_THEME.colors.success
                                            : MR_THEME.colors.textSecondary,
                                        wordBreak: "break-word",
                                    }}
                                >
                                    Checked out:{" "}
                                    {checkIn.check_out_at
                                        ? new Date(checkIn.check_out_at).toLocaleString()
                                        : "Active visit"}
                                </div>

                                <div
                                    style={{
                                        ...MR_THEME.typography.small,
                                        color: MR_THEME.colors.textSecondary,
                                    }}
                                >
                                    Status: {String(checkIn.geofence_status ?? "—").replaceAll("_", " ")}
                                </div>

                                <div
                                    style={{
                                        ...MR_THEME.typography.small,
                                        color: MR_THEME.colors.textSecondary,
                                    }}
                                >
                                    Policy: {String(checkIn.policy_applied ?? "—").replaceAll("_", " ")}
                                </div>

                                <div
                                    style={{
                                        ...MR_THEME.typography.small,
                                        color: MR_THEME.colors.textSecondary,
                                    }}
                                >
                                    Distance:{" "}
                                    {checkIn.distance_to_site_m != null
                                        ? `${checkIn.distance_to_site_m} m`
                                        : "—"}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : null}
        </div>
    );
}