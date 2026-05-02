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
};

export default function WorkOrdersAdminSectionTabs({
    adminActiveSection,
    setAdminActiveSection,
    counts,
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
                gap: 8,
                overflowX: "auto",
                paddingTop: 2,
                paddingBottom: 6,
                marginBottom: 4,
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
                            padding: "10px 14px",
                            borderRadius: MR_THEME.radius.pill,
                            border: active
                                ? `1px solid ${MR_THEME.colors.textPrimary}`
                                : `1px solid ${MR_THEME.colors.borderStrong}`,
                            background: active
                                ? MR_THEME.colors.textPrimary
                                : MR_THEME.colors.cardBg,
                            color: active
                                ? MR_THEME.colors.cardBg
                                : MR_THEME.colors.textPrimary,
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: 13,
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