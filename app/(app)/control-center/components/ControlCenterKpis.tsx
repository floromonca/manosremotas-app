"use client";

import React, { useState } from "react";
import { MR_THEME } from "../../../../lib/theme";
import KpiCard from "./KpiCard";

type ControlCenterKpisProps = {
    loading: boolean;
    compactDesktop?: boolean;
    kpis: {
        activeWorkOrders: number;
        techniciansWorking: number;
        delayedOrders: number;
        readyToInvoice: number;
        invoiceCountThisMonth?: number;
        paymentsReceivedThisMonth?: number;
    };
    revenueMonthLabel: string;
    unassignedWorkOrders?: number;
    onOpenWorkOrders: () => void;
    onOpenInvoices: () => void;
    onOpenUnassignedWorkOrders?: () => void;
    onOpenActiveWorkOrders?: () => void;
    onOpenTechniciansWorking?: () => void;
    onOpenDelayedOrders?: () => void;
    onOpenReadyToInvoice?: () => void;
};

export default function ControlCenterKpis({
    loading,
    compactDesktop = false,
    kpis,
    revenueMonthLabel,
    unassignedWorkOrders = 0,
    onOpenWorkOrders,
    onOpenInvoices,
    onOpenUnassignedWorkOrders,
    onOpenActiveWorkOrders,
    onOpenTechniciansWorking,
    onOpenDelayedOrders,
    onOpenReadyToInvoice,
}: ControlCenterKpisProps) {
    const [mobileFocus, setMobileFocus] = useState<"work" | "billing">("work");
    const cards = [
        {
            group: "work",
            title: "Unassigned Work Orders",
            value: loading ? "…" : String(unassignedWorkOrders),
            accentColor: MR_THEME.colors.danger,
            statusText: "Need attention",
            icon: <ClipboardAlertIcon />,
            onClick: onOpenUnassignedWorkOrders || onOpenWorkOrders,
        },
        {
            group: "work",
            title: "Active Work Orders",
            value: loading ? "…" : String(kpis.activeWorkOrders),
            accentColor: MR_THEME.colors.primary,
            statusText: "In progress",
            icon: <ClockIcon />,
            onClick: onOpenActiveWorkOrders || onOpenWorkOrders,
        },
        {
            group: "work",
            title: "Technicians Working",
            value: loading ? "…" : String(kpis.techniciansWorking),
            accentColor: MR_THEME.colors.success,
            statusText: "On shift now",
            icon: <UserIcon />,
            onClick: onOpenTechniciansWorking || onOpenWorkOrders,
        },
        {
            group: "work",
            title: "Delayed Orders",
            value: loading ? "…" : String(kpis.delayedOrders),
            accentColor: MR_THEME.colors.warning,
            statusText: "Need review",
            icon: <WarningIcon />,
            onClick: onOpenDelayedOrders || onOpenWorkOrders,
        },
        {
            group: "work",
            title: "Ready to Invoice",
            value: loading ? "…" : String(kpis.readyToInvoice),
            accentColor: MR_THEME.colors.info,
            statusText: "Ready for billing",
            icon: <InvoiceIcon />,
            onClick: onOpenReadyToInvoice || onOpenInvoices,
        },
        {
            group: "billing",
            title: "Invoices",
            value: loading ? "…" : String(kpis.invoiceCountThisMonth ?? 0),
            accentColor: MR_THEME.colors.primaryHover,
            statusText: "This month",
            icon: <InvoiceIcon />,
            onClick: onOpenInvoices,
        },
        {
            group: "billing",
            title: "Payments Received",
            value: loading
                ? "…"
                : `$${Number(kpis.paymentsReceivedThisMonth ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                })}`,
            accentColor: MR_THEME.colors.success,
            statusText: "This month",
            icon: <DollarIcon />,
            onClick: onOpenInvoices,
        },
        {
            group: "billing",
            title: "Revenue This Month",
            value: loading ? "…" : revenueMonthLabel,
            accentColor: MR_THEME.colors.primary,
            statusText: "Issued this month",
            icon: <TrendingIcon />,
            onClick: onOpenInvoices,
        },
    ] as const;

    return (
        <section>
            <div className="mobileKpiTabs">
                <button
                    type="button"
                    onClick={() => setMobileFocus("work")}
                    className={mobileFocus === "work" ? "active" : ""}
                >
                    Work Orders
                </button>
                <button
                    type="button"
                    onClick={() => setMobileFocus("billing")}
                    className={mobileFocus === "billing" ? "active" : ""}
                >
                    Invoices
                </button>
            </div>

            <div
                className={`controlCenterKpiGrid mobileFocus-${mobileFocus}`}
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: compactDesktop ? 12 : 16,
                }}
            >
                {cards.map((card) => (
                    <div key={card.title} className={`kpiGroup-${card.group}`}>
                        <KpiCard
                            title={card.title}
                            value={card.value}
                            accentColor={card.accentColor}
                            statusText={card.statusText}
                            icon={card.icon}
                            onClick={card.onClick}
                            compactDesktop={compactDesktop}
                        />
                    </div>
                ))}
            </div>

            <style jsx>{`
                .controlCenterKpiGrid {
                    align-items: stretch;
                }

                .mobileKpiTabs {
                    display: none;
                }

                @media (max-width: 1180px) {
                    .controlCenterKpiGrid {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    }
                }

                @media (max-width: 680px) {
                    .mobileKpiTabs {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 8px;
                        margin-bottom: 14px;
                    }

                    .mobileKpiTabs button {
                        min-height: 44px;
                        border-radius: ${MR_THEME.radius.control}px;
                        border: 1px solid ${MR_THEME.colors.border};
                        background: ${MR_THEME.colors.cardBg};
                        color: ${MR_THEME.colors.primary};
                        cursor: pointer;
                        font-size: 15px;
                        font-weight: 850;
                        box-shadow: ${MR_THEME.shadows.card};
                    }

                    .mobileKpiTabs button.active {
                        border-color: ${MR_THEME.colors.primary};
                        background: ${MR_THEME.colors.primary};
                        color: #ffffff;
                        box-shadow: ${MR_THEME.shadows.cardSoft};
                    }

                    .controlCenterKpiGrid {
                        grid-template-columns: 1fr !important;
                    }

                    .mobileFocus-work .kpiGroup-billing,
                    .mobileFocus-billing .kpiGroup-work {
                        display: none;
                    }
                }
            `}</style>
        </section>
    );
}

function IconShell({ children }: { children: React.ReactNode }) {
    return (
        <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{
                display: "block",
            }}
        >
            {children}
        </svg>
    );
}

function ClipboardAlertIcon() {
    return (
        <IconShell>
            <path d="M9 4h6" />
            <path d="M9 4a3 3 0 0 0 6 0" />
            <path d="M7 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1" />
            <path d="M12 9v5" />
            <path d="M12 17h.01" />
        </IconShell>
    );
}

function ClockIcon() {
    return (
        <IconShell>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v5l3 2" />
        </IconShell>
    );
}

function UserIcon() {
    return (
        <IconShell>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" />
        </IconShell>
    );
}

function WarningIcon() {
    return (
        <IconShell>
            <path d="M12 3 22 20H2L12 3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </IconShell>
    );
}

function InvoiceIcon() {
    return (
        <IconShell>
            <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
            <path d="M14 3v5h5" />
            <path d="M8 13h8" />
            <path d="M8 17h5" />
        </IconShell>
    );
}

function DollarIcon() {
    return (
        <IconShell>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 7v10" />
            <path d="M15 9.5A3 3 0 0 0 12 8c-1.7 0-3 .8-3 2s1.3 2 3 2 3 .8 3 2-1.3 2-3 2a3.4 3.4 0 0 1-3-1.5" />
        </IconShell>
    );
}

function TrendingIcon() {
    return (
        <IconShell>
            <path d="M4 17h16" />
            <path d="M6 14l4-4 3 3 5-6" />
            <path d="M15 7h3v3" />
        </IconShell>
    );
}
