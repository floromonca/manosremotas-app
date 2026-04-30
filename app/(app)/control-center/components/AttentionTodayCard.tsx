"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MR_THEME } from "../../../../lib/theme";
import ListBlock from "./ListBlock";

type AttentionLists = {
    unassigned: { job_type: string; work_order_id: string }[];
    inProgressOld: { job_type: string; work_order_id: string }[];
    completedNotInvoiced: { job_type: string; work_order_id: string }[];
};

type AttentionTodayCardProps = {
    lists: AttentionLists;
    onOpenWorkOrders: () => void;
    onOpenInvoices: () => void;
};

export default function AttentionTodayCard({ lists }: AttentionTodayCardProps) {
    const router = useRouter();

    return (
        <div
            style={{
                background: MR_THEME.colors.cardBg,
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                padding: MR_THEME.layout.cardPadding,
                boxShadow: MR_THEME.shadows.cardSoft,
            }}
        >
            <div style={{ marginBottom: MR_THEME.spacing.lg }}>
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        color: MR_THEME.colors.primary,
                        marginBottom: 6,
                    }}
                >
                    Operations
                </div>

                <h2
                    style={{
                        margin: 0,
                        fontSize: 20,
                        fontWeight: 800,
                        color: MR_THEME.colors.textPrimary,
                    }}
                >
                    Attention Today
                </h2>

                <p
                    style={{
                        margin: "6px 0 0 0",
                        fontSize: 14,
                        color: MR_THEME.colors.textSecondary,
                        lineHeight: 1.5,
                    }}
                >
                    Priority items that may require action from office or operations.
                </p>
            </div>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: MR_THEME.spacing.lg,
                }}
            >
                <ListBlock
                    title={`Unassigned (${lists.unassigned.length})`}
                    helper="Work orders without technician assignment."
                    onOpen={() => router.push("/work-orders?filter=unassigned")}
                    items={lists.unassigned.slice(0, 4).map((x) => ({
                        title: x.job_type,
                        meta: x.work_order_id.slice(0, 8),
                    }))}
                />

                <ListBlock
                    title={`In Progress Too Long (${lists.inProgressOld.length})`}
                    helper="Open work orders that may need attention."
                    onOpen={() => router.push("/work-orders?filter=delayed")}
                    items={lists.inProgressOld.slice(0, 4).map((x) => ({
                        title: x.job_type,
                        meta: x.work_order_id.slice(0, 8),
                    }))}
                />

                <ListBlock
                    title={`Completed, Not Invoiced (${lists.completedNotInvoiced.length})`}
                    helper="Finished work waiting for invoice action."
                    onOpen={() => router.push("/invoices?filter=ready")}
                    items={lists.completedNotInvoiced.slice(0, 4).map((x) => ({
                        title: x.job_type,
                        meta: x.work_order_id.slice(0, 8),
                    }))}
                />
            </div>
        </div>
    );
}