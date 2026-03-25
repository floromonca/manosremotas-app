"use client";

import React from "react";

type WorkOrderStatus = "new" | "in_progress" | "resolved" | "closed";

type CurrentWorkRow = {
    work_order_id: string;
    job_type?: string | null;
    customer_name?: string | null;
    service_address?: string | null;
    status: WorkOrderStatus;
};

type CurrentWorkCardProps = {
    currentWork: CurrentWorkRow | null;
    currentWorkMessage: string;
    openShift: boolean;
    shiftBusy: boolean;
    loading: boolean;
    companyId: string | null;
    onResumeWork: (workOrderId: string) => void;
    onStartShift: () => void;
};

export default function CurrentWorkCard({
    currentWork,
    currentWorkMessage,
    openShift,
    shiftBusy,
    loading,
    companyId,
    onResumeWork,
    onStartShift,
}: CurrentWorkCardProps) {
    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background: "#ffffff",
                padding: 20,
                marginBottom: 18,
            }}
        >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                Current work
            </div>

            <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 12 }}>
                {currentWorkMessage}
            </div>

            {!currentWork ? (
                <div style={{ color: "#6b7280", fontSize: 14 }}>
                    No active work right now.
                </div>
            ) : (
                <>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: 12,
                            marginTop: 14,
                        }}
                    >
                        <InfoCard
                            label="Job type"
                            value={currentWork.job_type || "Work order"}
                        />

                        <InfoCard
                            label="Customer"
                            value={currentWork.customer_name || "—"}
                        />

                        <InfoCard
                            label="Location"
                            value={currentWork.service_address || "—"}
                        />

                        <InfoCard
                            label="Status"
                            value={currentWork.status.replaceAll("_", " ")}
                        />
                    </div>

                    <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {openShift ? (
                            <button
                                type="button"
                                onClick={() => onResumeWork(currentWork.work_order_id)}
                                style={secondaryButtonStyle}
                            >
                                Resume work
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onStartShift}
                                disabled={shiftBusy || loading || !companyId}
                                style={primaryButtonStyle}
                            >
                                {shiftBusy ? "Processing..." : "Start shift"}
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 16,
                background: "#fcfcfd",
            }}
        >
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                {label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
                {value}
            </div>
        </div>
    );
}

const primaryButtonStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600,
};