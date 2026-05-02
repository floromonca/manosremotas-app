"use client";

import type { WOFilter } from "../../../../hooks/useUrlWoFilter";
import { MR_THEME } from "../../../../lib/theme";

type AdminSection =
    | "needs_attention"
    | "active_work"
    | "ready_to_invoice"
    | "history";

type Props = {
    woFilter: WOFilter;
    setWoFilterAndUrl: (f: WOFilter) => void;
    isAdminOrOwner: boolean;
    showNewWO: boolean;
    onToggleNewWO: () => void;
    onRefresh: () => void;
    onGoControlCenter: () => void;

    adminActiveSection?: AdminSection;
    setAdminActiveSection?: (section: AdminSection) => void;
    adminSectionCounts?: Partial<Record<AdminSection, number>>;
};

function FilterBtn({
    active,
    label,
    count,
    onClick,
}: {
    active: boolean;
    label: string;
    count?: number;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                flex: "0 0 auto",
                whiteSpace: "nowrap",
                padding: "9px 12px",
                borderRadius: MR_THEME.radius.pill,
                border: `1px solid ${active ? MR_THEME.colors.primary : MR_THEME.colors.border
                    }`,
                cursor: "pointer",
                background: active ? MR_THEME.colors.primarySoft : MR_THEME.colors.cardBg,
                color: active ? MR_THEME.colors.primary : MR_THEME.colors.textSecondary,
                fontWeight: active ? 800 : 650,
                fontSize: 13,
                boxShadow: active ? MR_THEME.shadows.cardSoft : "none",
            }}
        >
            {label}
            {typeof count === "number" ? (
                <span
                    style={{
                        marginLeft: 6,
                        color: active ? MR_THEME.colors.primary : MR_THEME.colors.textMuted,
                        fontWeight: 800,
                    }}
                >
                    {count}
                </span>
            ) : null}
        </button>
    );
}

export default function WorkOrdersToolbar({
    woFilter,
    setWoFilterAndUrl,
    isAdminOrOwner,
    showNewWO,
    onToggleNewWO,
    onRefresh,
    onGoControlCenter,
    adminActiveSection,
    setAdminActiveSection,
    adminSectionCounts,
}: Props) {
    const hasAdminSections = Boolean(adminActiveSection && setAdminActiveSection);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 14,
                width: "100%",
                minWidth: 0,
            }}
        >
            <div
                style={{
                    width: "100%",
                    overflowX: "auto",
                    overflowY: "hidden",
                    WebkitOverflowScrolling: "touch",
                    paddingBottom: 4,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        minWidth: "max-content",
                    }}
                >
                    {hasAdminSections ? (
                        <>
                            <FilterBtn
                                active={adminActiveSection === "needs_attention"}
                                label="Needs Attention"
                                count={adminSectionCounts?.needs_attention}
                                onClick={() => setAdminActiveSection?.("needs_attention")}
                            />
                            <FilterBtn
                                active={adminActiveSection === "active_work"}
                                label="Active Work"
                                count={adminSectionCounts?.active_work}
                                onClick={() => setAdminActiveSection?.("active_work")}
                            />
                            <FilterBtn
                                active={adminActiveSection === "ready_to_invoice"}
                                label="Ready to Invoice"
                                count={adminSectionCounts?.ready_to_invoice}
                                onClick={() => setAdminActiveSection?.("ready_to_invoice")}
                            />
                            <FilterBtn
                                active={adminActiveSection === "history"}
                                label="History"
                                count={adminSectionCounts?.history}
                                onClick={() => setAdminActiveSection?.("history")}
                            />
                        </>
                    ) : (
                        <>
                            <FilterBtn
                                active={woFilter === "all"}
                                label="All"
                                onClick={() => setWoFilterAndUrl("all")}
                            />
                            <FilterBtn
                                active={woFilter === "mine"}
                                label="My Orders"
                                onClick={() => setWoFilterAndUrl("mine")}
                            />
                            <FilterBtn
                                active={woFilter === "unassigned"}
                                label="Unassigned"
                                onClick={() => setWoFilterAndUrl("unassigned")}
                            />
                            <FilterBtn
                                active={woFilter === "delayed"}
                                label="Delayed"
                                onClick={() => setWoFilterAndUrl("delayed")}
                            />
                            <FilterBtn
                                active={woFilter === "ready_to_invoice"}
                                label="Ready to Invoice"
                                onClick={() => setWoFilterAndUrl("ready_to_invoice")}
                            />
                        </>
                    )}
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    width: "100%",
                    minWidth: 0,
                }}
            >
                {isAdminOrOwner ? (
                    <button
                        type="button"
                        onClick={onToggleNewWO}
                        style={{
                            width: "100%",
                            padding: "11px 14px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.primary}`,
                            background: MR_THEME.colors.primary,
                            color: "white",
                            cursor: "pointer",
                            fontWeight: 750,
                            fontSize: 14,
                            boxShadow: "none",
                        }}
                    >
                        {showNewWO ? "Close New Work Order" : "New Work Order"}
                    </button>
                ) : null}

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: isAdminOrOwner ? "1fr 1fr" : "1fr",
                        gap: 10,
                        width: "100%",
                        minWidth: 0,
                    }}
                >
                    <button
                        type="button"
                        onClick={onRefresh}
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.border}`,
                            background: MR_THEME.colors.cardBgSoft,
                            color: MR_THEME.colors.textSecondary,
                            cursor: "pointer",
                            fontWeight: 650,
                            fontSize: 14,
                        }}
                    >
                        Refresh
                    </button>

                    {isAdminOrOwner ? (
                        <button
                            type="button"
                            onClick={onGoControlCenter}
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: MR_THEME.radius.control,
                                border: `1px solid ${MR_THEME.colors.border}`,
                                background: MR_THEME.colors.cardBg,
                                color: MR_THEME.colors.primary,
                                cursor: "pointer",
                                fontWeight: 650,
                                fontSize: 14,
                            }}
                        >
                            Control Center
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}