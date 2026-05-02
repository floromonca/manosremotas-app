"use client";

import { useRouter } from "next/navigation";
import { MR_THEME } from "../../../../lib/theme";

type WorkOrdersAdminActionsProps = {
    showNewWO: boolean;
    onToggleNewWO: () => void;
    onRefresh: () => void;
};

export default function WorkOrdersAdminActions({
    showNewWO,
    onToggleNewWO,
    onRefresh,
}: WorkOrdersAdminActionsProps) {
    const router = useRouter();

    return (
        <div
            style={{
                display: "grid",
                gap: MR_THEME.spacing.sm,
                width: "100%",
            }}
        >
            <button
                type="button"
                onClick={onToggleNewWO}
                style={{
                    width: "100%",
                    minHeight: 42,
                    padding: "10px 14px",
                    borderRadius: MR_THEME.radius.control,
                    border: `1px solid ${MR_THEME.colors.primary}`,
                    background: MR_THEME.colors.primary,
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 800,
                    fontSize: 14,
                    lineHeight: 1.2,
                    boxShadow: "none",
                }}
            >
                {showNewWO ? "Close form" : "New Work Order"}
            </button>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: MR_THEME.spacing.sm,
                    width: "100%",
                    minWidth: 0,
                }}
            >
                <button
                    type="button"
                    onClick={onRefresh}
                    style={{
                        minWidth: 0,
                        minHeight: 40,
                        padding: "10px 12px",
                        borderRadius: MR_THEME.radius.control,
                        border: `1px solid ${MR_THEME.colors.border}`,
                        background: MR_THEME.colors.cardBgSoft,
                        color: MR_THEME.colors.textSecondary,
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 14,
                        lineHeight: 1.2,
                    }}
                >
                    Refresh
                </button>

                <button
                    type="button"
                    onClick={() => router.replace("/control-center")}
                    style={{
                        minWidth: 0,
                        minHeight: 40,
                        padding: "10px 12px",
                        borderRadius: MR_THEME.radius.control,
                        border: `1px solid ${MR_THEME.colors.border}`,
                        background: MR_THEME.colors.cardBg,
                        color: MR_THEME.colors.primary,
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 14,
                        lineHeight: 1.2,
                    }}
                >
                    Control
                </button>
            </div>
        </div>
    );
}