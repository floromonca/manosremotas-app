import { MR_THEME } from "../../../../lib/theme";

type WorkOrdersAdminActionsProps = {
    showNewWO: boolean;
    onToggleNewWO: () => void;
    onRefresh: () => void;
    compactDesktop?: boolean;
    layout?: "stacked" | "inline";
};

export default function WorkOrdersAdminActions({
    showNewWO,
    onToggleNewWO,
    onRefresh,
    compactDesktop = false,
    layout = "stacked",
}: WorkOrdersAdminActionsProps) {
    const inline = layout === "inline";

    return (
        <div
            style={{
                display: inline ? "flex" : "grid",
                gap: compactDesktop ? 6 : MR_THEME.spacing.sm,
                width: inline ? "auto" : "100%",
                alignItems: inline ? "center" : undefined,
                justifyContent: inline ? "flex-end" : undefined,
                flexWrap: inline ? "wrap" : undefined,
            }}
        >
            <button
                type="button"
                onClick={onToggleNewWO}
                style={{
                    width: inline ? "auto" : "100%",
                    minHeight: compactDesktop ? 36 : 42,
                    padding: compactDesktop ? "8px 12px" : "10px 14px",
                    borderRadius: MR_THEME.radius.control,
                    border: `1px solid ${MR_THEME.colors.primary}`,
                    background: MR_THEME.colors.primary,
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 800,
                    fontSize: compactDesktop ? 13 : 14,
                    lineHeight: 1.2,
                    boxShadow: "none",
                    whiteSpace: "nowrap",
                }}
            >
                {showNewWO ? "Close form" : "New Work Order"}
            </button>

            <div
                style={{
                    display: inline ? "flex" : "grid",
                    gridTemplateColumns: inline ? undefined : "1fr",
                    gap: compactDesktop ? 6 : MR_THEME.spacing.sm,
                    width: inline ? "auto" : "100%",
                    minWidth: 0,
                }}
            >
                <button
                    type="button"
                    onClick={onRefresh}
                    style={{
                        minWidth: 0,
                        minHeight: compactDesktop ? 34 : 40,
                        padding: compactDesktop ? "8px 12px" : "10px 12px",
                        borderRadius: MR_THEME.radius.control,
                        border: `1px solid ${MR_THEME.colors.border}`,
                        background: MR_THEME.colors.cardBgSoft,
                        color: MR_THEME.colors.textSecondary,
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: compactDesktop ? 13 : 14,
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                    }}
                >
                    Refresh
                </button>
            </div>
        </div>
    );
}
