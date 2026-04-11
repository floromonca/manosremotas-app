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
    const statusLabel = currentWork
        ? currentWork.status.replaceAll("_", " ")
        : null;

    const isInProgress = currentWork?.status === "in_progress";
    const isAssigned = currentWork?.status === "new";

    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                background: "linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)",
                padding: 20,
                marginBottom: 18,
                boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                    marginBottom: 14,
                }}
            >
                <div style={{ minWidth: 260, flex: 1 }}>
                    <div
                        style={{
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: "#64748b",
                            fontWeight: 800,
                            marginBottom: 8,
                        }}
                    >
                        Current work
                    </div>

                    <div
                        style={{
                            fontSize: 26,
                            fontWeight: 800,
                            lineHeight: 1.1,
                            color: "#111827",
                            letterSpacing: "-0.02em",
                            marginBottom: 8,
                        }}
                    >
                        {currentWork
                            ? currentWork.job_type || "Work order"
                            : "No active work"}
                    </div>

                    <div
                        style={{
                            color: "#6b7280",
                            fontSize: 14,
                            lineHeight: 1.6,
                            maxWidth: 760,
                        }}
                    >
                        {currentWorkMessage}
                    </div>
                </div>

                {currentWork ? (
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "8px 12px",
                            borderRadius: 999,
                            border: isInProgress
                                ? "1px solid #bfdbfe"
                                : isAssigned
                                    ? "1px solid #dbeafe"
                                    : "1px solid #e5e7eb",
                            background: isInProgress
                                ? "#eff6ff"
                                : isAssigned
                                    ? "#f8fbff"
                                    : "#f9fafb",
                            color: isInProgress
                                ? "#1d4ed8"
                                : isAssigned
                                    ? "#1e40af"
                                    : "#374151",
                            fontSize: 13,
                            fontWeight: 800,
                            textTransform: "capitalize",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {statusLabel}
                    </div>
                ) : (
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "8px 12px",
                            borderRadius: 999,
                            border: "1px solid #e5e7eb",
                            background: "#f8fafc",
                            color: "#475569",
                            fontSize: 13,
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                        }}
                    >
                        Awaiting work
                    </div>
                )}
            </div>

            {!currentWork ? (
                <div
                    style={{
                        border: "1px dashed #dbe3ef",
                        borderRadius: 16,
                        background: "#f8fafc",
                        padding: 18,
                    }}
                >
                    <div
                        style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#111827",
                            marginBottom: 6,
                        }}
                    >
                        Nothing in progress right now
                    </div>

                    <div
                        style={{
                            fontSize: 14,
                            color: "#6b7280",
                            lineHeight: 1.6,
                            marginBottom: 14,
                        }}
                    >
                        {openShift
                            ? "You are ready to take your next assigned work order."
                            : "Start your shift to begin operating assigned work orders."}
                    </div>

                    {!openShift ? (
                        <button
                            type="button"
                            onClick={onStartShift}
                            disabled={shiftBusy || loading || !companyId}
                            style={primaryButtonStyle}
                        >
                            {shiftBusy ? "Processing..." : "Start shift"}
                        </button>
                    ) : null}
                </div>
            ) : (
                <>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                            gap: 12,
                            marginTop: 2,
                        }}
                    >
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
                            value={statusLabel || "—"}
                        />

                        <InfoCard
                            label="Work order"
                            value={currentWork.work_order_id.slice(0, 8)}
                        />
                    </div>

                    <div
                        style={{
                            marginTop: 14,
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                        }}
                    >
                        {openShift ? (
                            <button
                                type="button"
                                onClick={() => onResumeWork(currentWork.work_order_id)}
                                style={primaryButtonStyle}
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
                background: "#f8fafc",
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    color: "#64748b",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 700,
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#111827",
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                }}
            >
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