"use client";

import { useState } from "react";


import type { WorkOrderRole } from "../../../../lib/work-orders/policies";

type AuditItem = {
    changed_at: string | null;
    changed_at_ui: string | null;
    changed_by_name: string | null;
    message: string | null;
};

type WorkOrderStatus = "new" | "in_progress" | "resolved" | "closed";

type WorkOrder = {
    work_order_id: string;
    company_id?: string | null;
    job_type: string;
    description: string;
    status: WorkOrderStatus;
    priority: string;
    scheduled_for: string | null;
    created_at: string;
    assigned_to?: string | null;
    created_by?: string | null;
    customer_name?: string | null;
    service_address?: string | null;
    invoice_id?: string | null;
    invoiced_at?: string | null;
};

type MemberRow = {
    user_id: string;
    role: string;
    full_name?: string | null;
};

type Props = {
    wo: WorkOrder;
    companyId: string | null;
    isAdminOrOwner: boolean;
    techMembers: MemberRow[];
    canChangeStatus: (wo: WorkOrder) => boolean;
    myRole: WorkOrderRole;
    allowedStatusesForRole: (
        role: WorkOrderRole,
        current: WorkOrderStatus
    ) => WorkOrderStatus[];
    auditOpenFor: string | null;
    auditLoadingFor: Record<string, boolean>;
    auditByWo: Record<string, AuditItem[]>;
    onAssignTech: (woId: string, techId: string) => Promise<void>;
    onChangeStatus: (woId: string, next: WorkOrderStatus) => Promise<void>;
    onOpenWorkOrder: (woId: string) => void;
    onToggleAudit: (woId: string) => Promise<void>;
    onOpenInvoice: (invoiceId: string) => void;
    onCreateInvoice: (woId: string) => Promise<void>;
    AuditPanel: React.ComponentType<{ loading: boolean; items: AuditItem[] }>;
};

function prettyStatus(status: WorkOrderStatus) {
    return status.replaceAll("_", " ");
}

export default function WorkOrderCard({
    wo,
    companyId,
    isAdminOrOwner,
    techMembers,
    canChangeStatus,
    myRole,
    allowedStatusesForRole,
    auditOpenFor,
    auditLoadingFor,
    auditByWo,
    onAssignTech,
    onChangeStatus,
    onOpenWorkOrder,
    onToggleAudit,
    onOpenInvoice,
    onCreateInvoice,
    AuditPanel,
}: Props) {
    const assignedShort = wo.assigned_to ? wo.assigned_to.slice(0, 8) : null;
    const assignedMember = techMembers.find((m) => m.user_id === wo.assigned_to);

    const assignedLabel =
        assignedMember?.full_name?.trim() || assignedShort || "Unassigned";

    const shortDescription =
        wo.description && wo.description.length > 140
            ? `${wo.description.slice(0, 140).trim()}...`
            : wo.description;

    const [showAssignPicker, setShowAssignPicker] = useState(false);

    return (
        <div
            style={{
                padding: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                background: "white",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                display: "grid",
                gap: 10,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                    flexWrap: "wrap",
                }}
            >
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                            marginBottom: 4,
                        }}
                    >
                        <div
                            style={{
                                fontWeight: 900,
                                fontSize: 16,
                                lineHeight: 1.2,
                                color: "#111827",
                            }}
                        >
                            {wo.job_type}
                        </div>

                        {wo.invoice_id ? (
                            <span
                                style={{
                                    display: "inline-block",
                                    padding: "4px 8px",
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 900,
                                    border: "1px solid #22c55e",
                                    background: "#ecfdf5",
                                    color: "#065f46",
                                    whiteSpace: "nowrap",
                                }}
                                title="Esta orden ya tiene factura"
                            >
                                Invoiced
                            </span>
                        ) : null}
                    </div>

                    <div
                        style={{
                            fontSize: 14,
                            color: "#4b5563",
                            lineHeight: 1.45,
                        }}
                    >
                        <b>{wo.customer_name || "—"}</b>
                        {" · "}
                        {wo.service_address || "—"}
                    </div>
                </div>

                <div
                    style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background:
                            wo.status === "closed"
                                ? "#f3f4f6"
                                : wo.status === "resolved"
                                    ? "#ecfdf5"
                                    : wo.status === "in_progress"
                                        ? "#eff6ff"
                                        : "#fff7ed",
                        border:
                            wo.status === "closed"
                                ? "1px solid #d1d5db"
                                : wo.status === "resolved"
                                    ? "1px solid #86efac"
                                    : wo.status === "in_progress"
                                        ? "1px solid #93c5fd"
                                        : "1px solid #fdba74",
                        color:
                            wo.status === "closed"
                                ? "#374151"
                                : wo.status === "resolved"
                                    ? "#166534"
                                    : wo.status === "in_progress"
                                        ? "#1d4ed8"
                                        : "#9a3412",
                        fontSize: 12,
                        fontWeight: 900,
                        textTransform: "capitalize",
                        whiteSpace: "nowrap",
                    }}
                >
                    {prettyStatus(wo.status)}
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                }}
            >
                <span
                    style={{
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        fontSize: 12,
                        color: "#374151",
                    }}
                >
                    Priority: <b>{wo.priority || "—"}</b>
                </span>

                <span
                    style={{
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: wo.assigned_to ? "#f9fafb" : "#fff7ed",
                        border: wo.assigned_to ? "1px solid #e5e7eb" : "1px solid #fdba74",
                        fontSize: 12,
                        color: wo.assigned_to ? "#374151" : "#9a3412",
                        fontWeight: wo.assigned_to ? 400 : 800,
                    }}
                >
                    Assigned: <b>{assignedLabel}</b>
                </span>

                {!wo.assigned_to && isAdminOrOwner ? (
                    <>
                        <button
                            type="button"
                            onClick={() => setShowAssignPicker((v) => !v)}
                            style={{
                                padding: "5px 10px",
                                borderRadius: 999,
                                border: "1px solid #f59e0b",
                                background: showAssignPicker ? "#fff7ed" : "#ffffff",
                                color: "#92400e",
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 800,
                            }}
                        >
                            {showAssignPicker ? "Cancel" : "Assign"}
                        </button>

                        {showAssignPicker ? (
                            <select
                                defaultValue=""
                                onChange={async (e) => {
                                    const techId = e.target.value;
                                    if (!techId) return;
                                    if (!companyId) {
                                        alert("No hay empresa activa");
                                        return;
                                    }
                                    await onAssignTech(wo.work_order_id, techId);
                                    setShowAssignPicker(false);
                                }}
                                style={{
                                    padding: "6px 10px",
                                    borderRadius: 999,
                                    border: "1px solid #d1d5db",
                                    fontSize: 12,
                                    background: "white",
                                    maxWidth: 180,
                                }}
                            >
                                <option value="">Select tech...</option>
                                {techMembers.map((m) => (
                                    <option key={m.user_id} value={m.user_id}>
                                        {m.full_name?.trim() || m.user_id.slice(0, 8)}
                                    </option>
                                ))}
                            </select>
                        ) : null}
                    </>
                ) : null}

                <span
                    style={{
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        fontSize: 12,
                        color: "#374151",
                        fontFamily: "monospace",
                    }}
                >
                    Ref: {wo.work_order_id.slice(0, 8)}
                </span>
            </div>
            {shortDescription ? (
                <div
                    style={{
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: "#6b7280",
                    }}
                >
                    {shortDescription}
                </div>
            ) : null}


            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                }}
            >
                <button
                    type="button"
                    onClick={() => onOpenWorkOrder(wo.work_order_id)}
                    style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid #111827",
                        background: "#111827",
                        color: "white",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 800,
                    }}
                >
                    Open
                </button>

                {isAdminOrOwner ? (
                    <>
                        <button
                            type="button"
                            onClick={async () => {
                                await onToggleAudit(wo.work_order_id);
                            }}
                            style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid #d1d5db",
                                background: "white",
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 800,
                            }}
                        >
                            {auditOpenFor === wo.work_order_id ? "Hide history" : "History"}
                        </button>

                        {wo.invoice_id ? (
                            <button
                                type="button"
                                onClick={() => onOpenInvoice(wo.invoice_id!)}
                                style={{
                                    padding: "8px 10px",
                                    borderRadius: 10,
                                    border: "1px solid #d1d5db",
                                    background: "white",
                                    cursor: "pointer",
                                    fontSize: 12,
                                    fontWeight: 800,
                                }}
                                title="Abrir la factura existente"
                            >
                                Invoice
                            </button>
                        ) : (wo.status === "resolved" || wo.status === "closed") ? (
                            <button
                                type="button"
                                onClick={async () => {
                                    await onCreateInvoice(wo.work_order_id);
                                }}
                                style={{
                                    padding: "8px 10px",
                                    borderRadius: 10,
                                    border: "1px solid #d1d5db",
                                    background: "white",
                                    cursor: "pointer",
                                    fontSize: 12,
                                    fontWeight: 800,
                                }}
                                title="Crear factura desde esta orden"
                            >
                                Create invoice
                            </button>
                        ) : null}
                    </>
                ) : null}
            </div>

            {auditOpenFor === wo.work_order_id ? (
                <div style={{ marginTop: 4 }}>
                    <AuditPanel
                        loading={!!auditLoadingFor[wo.work_order_id]}
                        items={auditByWo[wo.work_order_id] ?? []}
                    />
                </div>
            ) : null}
        </div>
    );
}