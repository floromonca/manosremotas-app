"use client";

import type { WorkOrderRole } from "../../../lib/work-orders/policies";

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

    const assignedLabel = assignedMember?.full_name?.trim()
        || assignedShort
        || "Unassigned";

    return (
        <div
            style={{
                padding: 18,
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background: "white",
                display: "grid",
                gridTemplateColumns: "1.4fr 0.9fr",
                gap: 18,
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
        >
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    <div
                        style={{
                            fontWeight: 900,
                            fontSize: 20,
                            lineHeight: 1.15,
                            letterSpacing: "-0.03em",
                            color: "#111827",
                        }}
                    >
                        {wo.job_type}
                    </div>

                    {wo.invoice_id ? (
                        <span
                            style={{
                                display: "inline-block",
                                padding: "5px 10px",
                                borderRadius: 999,
                                fontSize: 12,
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

                {wo.description ? (
                    <div
                        style={{
                            fontSize: 14,
                            lineHeight: 1.55,
                            color: "#4b5563",
                            marginBottom: 12,
                            maxWidth: 760,
                        }}
                    >
                        {wo.description}
                    </div>
                ) : null}

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 10,
                    }}
                >
                    <div
                        style={{
                            padding: 12,
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                            background: "#fcfcfd",
                        }}
                    >
                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 5 }}>
                            Customer
                        </div>
                        <div style={{ fontWeight: 800, color: "#111827" }}>
                            {wo.customer_name || "—"}
                        </div>
                    </div>

                    <div
                        style={{
                            padding: 12,
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                            background: "#fcfcfd",
                        }}
                    >
                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 5 }}>
                            Location
                        </div>
                        <div style={{ fontWeight: 700, color: "#111827" }}>
                            {wo.service_address || "—"}
                        </div>
                    </div>

                    <div
                        style={{
                            padding: 12,
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                            background: "#fcfcfd",
                        }}
                    >
                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 5 }}>
                            Assigned to
                        </div>
                        <div
                            style={{
                                fontWeight: 800,
                                color: "#111827",
                                fontFamily: assignedMember?.full_name?.trim() ? undefined : assignedShort ? "monospace" : undefined,
                            }}
                        >
                            {assignedLabel}
                        </div>
                    </div>

                    <div
                        style={{
                            padding: 12,
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                            background: "#fcfcfd",
                        }}
                    >
                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 5 }}>
                            Reference
                        </div>
                        <div style={{ fontWeight: 800, color: "#111827", fontFamily: "monospace" }}>
                            {wo.work_order_id.slice(0, 8)}
                        </div>
                    </div>
                </div>

                {!wo.assigned_to && isAdminOrOwner ? (
                    <div style={{ marginTop: 14, maxWidth: 320, display: "grid", gap: 6 }}>
                        <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
                            Assign technician
                        </label>

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
                            }}
                            style={{
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: "1px solid #d1d5db",
                                fontSize: 13,
                                background: "white",
                            }}
                        >
                            <option value="">Select technician...</option>
                            {techMembers.map((m) => (
                                <option key={m.user_id} value={m.user_id}>
                                    {m.full_name?.trim() || m.user_id.slice(0, 8)}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}
            </div>

            <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
                <div
                    style={{
                        justifySelf: "end",
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
                    }}
                >
                    {prettyStatus(wo.status)}
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
                        Change status
                    </label>

                    <select
                        value={wo.status}
                        disabled={!canChangeStatus(wo)}
                        onChange={async (e) => {
                            const next = e.target.value as WorkOrderStatus;

                            if (!companyId) {
                                alert("No hay companyId activo");
                                return;
                            }

                            if (!canChangeStatus(wo)) {
                                alert(
                                    isAdminOrOwner
                                        ? "No tienes permiso para cambiar esta orden."
                                        : "Para cambiar status necesitas jornada activa y la orden asignada a ti."
                                );
                                return;
                            }

                            await onChangeStatus(wo.work_order_id, next);
                        }}
                        style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid #d1d5db",
                            background: "white",
                            fontWeight: 700,
                            cursor: canChangeStatus(wo) ? "pointer" : "not-allowed",
                            opacity: canChangeStatus(wo) ? 1 : 0.6,
                            minWidth: 180,
                        }}
                    >
                        {allowedStatusesForRole(myRole ?? null, wo.status).map((s) => (
                            <option key={s} value={s}>
                                {prettyStatus(s)}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "end", marginTop: 8 }}>
                    <button
                        type="button"
                        onClick={() => onOpenWorkOrder(wo.work_order_id)}
                        style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1px solid #d1d5db",
                            background: "white",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 800,
                        }}
                    >
                        Abrir
                    </button>

                    <button
                        type="button"
                        onClick={async () => {
                            await onToggleAudit(wo.work_order_id);
                        }}
                        style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1px solid #d1d5db",
                            background: "white",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 800,
                        }}
                    >
                        {auditOpenFor === wo.work_order_id ? "Ocultar historial" : "Ver historial"}
                    </button>

                    {wo.invoice_id ? (
                        <button
                            type="button"
                            onClick={() => onOpenInvoice(wo.invoice_id!)}
                            style={{
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: "1px solid #d1d5db",
                                background: "white",
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 800,
                            }}
                            title="Abrir la factura existente"
                        >
                            Abrir factura
                        </button>
                    ) : isAdminOrOwner && (wo.status === "resolved" || wo.status === "closed") ? (
                        <button
                            type="button"
                            onClick={async () => {
                                await onCreateInvoice(wo.work_order_id);
                            }}
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
                            title="Crear factura desde esta orden"
                        >
                            Crear factura
                        </button>
                    ) : null}
                </div>

                {auditOpenFor === wo.work_order_id ? (
                    <div style={{ marginTop: 6 }}>
                        <AuditPanel
                            loading={!!auditLoadingFor[wo.work_order_id]}
                            items={auditByWo[wo.work_order_id] ?? []}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}