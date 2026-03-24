"use client";

import React from "react";
import type { WorkOrderStatus } from "../../../lib/supabase/workOrders";

type WorkOrderSummary = {
    job_type: string;
    description: string;
    customer_name?: string | null;
    service_address?: string | null;
    status: WorkOrderStatus;
    priority: string;
    assigned_to: string | null;
};

type Props = {
    wo: WorkOrderSummary;
    googleMapsUrl: string | null;
    invoiceIsLocked: boolean;
    invoiceStatus: string | null;
    prettyInvoiceStatus: (status: string | null | undefined) => string;
};

function niceLabel(value: string | null | undefined) {
    const raw = String(value ?? "").trim();
    if (!raw) return "—";
    return raw.replaceAll("_", " ");
}

export default function WorkOrderSummarySection({
    wo,
    googleMapsUrl,
    invoiceIsLocked,
    invoiceStatus,
    prettyInvoiceStatus,
}: Props) {
    return (
        <div
            style={{
                padding: 20,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    gap: 16,
                    flexWrap: "wrap",
                }}
            >
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                        style={{
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            color: "#6b7280",
                            fontWeight: 800,
                            marginBottom: 8,
                        }}
                    >
                        Work Order Summary
                    </div>

                    <div
                        style={{
                            fontSize: 30,
                            lineHeight: 1.05,
                            fontWeight: 900,
                            letterSpacing: "-0.03em",
                            color: "#111827",
                            marginBottom: 10,
                        }}
                    >
                        {wo.job_type}
                    </div>

                    <div
                        style={{
                            fontSize: 15,
                            lineHeight: 1.6,
                            color: "#4b5563",
                            maxWidth: 760,
                        }}
                    >
                        {wo.description}
                    </div>
                </div>

                {googleMapsUrl ? (
                    <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            display: "inline-block",
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: "1px solid #d1d5db",
                            textDecoration: "none",
                            color: "#111827",
                            fontWeight: 800,
                            background: "white",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Abrir en Google Maps
                    </a>
                ) : null}
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 12,
                    marginTop: 18,
                }}
            >
                <div
                    style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                        Customer
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>
                        {wo.customer_name || "—"}
                    </div>
                </div>

                <div
                    style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                        Address
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                        {wo.service_address || "—"}
                    </div>
                </div>

                <div
                    style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                        Status
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", textTransform: "capitalize" }}>
                        {niceLabel(wo.status)}
                    </div>
                </div>

                <div
                    style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                        Priority
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", textTransform: "capitalize" }}>
                        {niceLabel(wo.priority)}
                    </div>
                </div>

                <div
                    style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                        Assigned to
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", fontFamily: "monospace" }}>
                        {(wo.assigned_to ?? "—").slice(0, 8)}
                    </div>
                </div>
            </div>

            {invoiceIsLocked ? (
                <div
                    style={{
                        marginTop: 16,
                        padding: 14,
                        borderRadius: 12,
                        background: "#fff7e6",
                        border: "1px solid #fde2a7",
                        color: "#7c4a03",
                        lineHeight: 1.5,
                    }}
                >
                    Esta Work Order tiene una invoice en estado <b>{prettyInvoiceStatus(invoiceStatus)}</b>. Puedes seguir
                    trabajando la WO, pero ya no se hará Sync automático ni manual sobre esa invoice.
                </div>
            ) : null}
        </div>
    );
}