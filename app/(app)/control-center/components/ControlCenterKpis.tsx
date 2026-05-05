"use client";

import React from "react";
import { MR_THEME } from "../../../../lib/theme";
import KpiCard from "./KpiCard";

type ControlCenterKpisProps = {
    loading: boolean;
    kpis: {
        activeWorkOrders: number;
        techniciansWorking: number;
        delayedOrders: number;
        readyToInvoice: number;
    };
    revenueMonthLabel: string;
    onOpenWorkOrders: () => void;
    onOpenInvoices: () => void;
};

export default function ControlCenterKpis({
    loading,
    kpis,
    revenueMonthLabel,
    onOpenWorkOrders,
    onOpenInvoices,
}: ControlCenterKpisProps) {
    return (
        <section
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
            }}
        >
            <KpiCard
                title="Active Work Orders"
                value={loading ? "…" : String(kpis.activeWorkOrders)}
                accentColor={MR_THEME.colors.primary}
                onClick={onOpenWorkOrders}
            />

            <KpiCard
                title="Technicians Working"
                value={loading ? "…" : String(kpis.techniciansWorking)}
                accentColor={MR_THEME.colors.success}
            />

            <KpiCard
                title="Delayed Orders"
                value={loading ? "…" : String(kpis.delayedOrders)}
                accentColor={MR_THEME.colors.warning}
                onClick={onOpenWorkOrders}
            />

            <KpiCard
                title="Ready to Invoice"
                value={loading ? "…" : String(kpis.readyToInvoice)}
                accentColor={MR_THEME.colors.info}
                onClick={onOpenInvoices}
            />

            <div style={{ gridColumn: "1 / -1" }}>
                <KpiCard
                    title="Revenue This Month"
                    value={loading ? "…" : revenueMonthLabel}
                    accentColor="#7c3aed"
                    onClick={onOpenInvoices}
                />
            </div>
        </section>
    );
}