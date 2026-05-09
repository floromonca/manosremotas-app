import { MR_THEME } from "../../../../lib/theme";

type AdminSection =
    | "needs_attention"
    | "active_work"
    | "ready_to_invoice"
    | "history";

type WorkOrdersAdminSectionTabsProps = {
    adminActiveSection: AdminSection;
    setAdminActiveSection: (section: AdminSection) => void;
    counts: {
        needsAttention: number;
        activeWork: number;
        readyToInvoice: number;
        history: number;
    };
    compactDesktop?: boolean;
};

export default function WorkOrdersAdminSectionTabs({
    adminActiveSection,
    setAdminActiveSection,
    counts,
    compactDesktop = false,
}: WorkOrdersAdminSectionTabsProps) {
    const tabs: Array<{
        key: AdminSection;
        label: string;
        count: number;
    }> = [
            {
                key: "needs_attention",
                label: "Needs Attention",
                count: counts.needsAttention,
            },
            {
                key: "active_work",
                label: "Active Work",
                count: counts.activeWork,
            },
            {
                key: "ready_to_invoice",
                label: "Ready to Invoice",
                count: counts.readyToInvoice,
            },
            {
                key: "history",
                label: "History",
                count: counts.history,
            },
        ];

    return (
        <div
            style={{
                display: "flex",
                gap: compactDesktop ? 7 : 8,
                overflowX: "auto",
                paddingTop: compactDesktop ? 0 : 2,
                paddingBottom: compactDesktop ? 4 : 6,
                marginBottom: compactDesktop ? 2 : 4,
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
            }}
        >
            {tabs.map((tab) => {
                const active = adminActiveSection === tab.key;

                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setAdminActiveSection(tab.key)}
                        style={{
                            padding: compactDesktop ? "8px 12px" : "10px 14px",
                            borderRadius: MR_THEME.radius.pill,
                            border: active
                                ? `1px solid ${MR_THEME.colors.primary}`
                                : `1px solid ${MR_THEME.colors.borderStrong}`,
                            background: active
                                ? MR_THEME.colors.primary
                                : MR_THEME.colors.cardBg,
                            color: active
                                ? "white"
                                : MR_THEME.colors.textSecondary,
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: compactDesktop ? 12 : 13,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                        }}
                    >
                        {tab.label} ({tab.count})
                    </button>
                );
            })}
        </div>
    );
}
