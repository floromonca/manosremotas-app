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

type MemberRow = { user_id: string; role: string };

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
    return (
        <div
            style={{
                padding: 14,
                border: "1px solid #eee",
                borderRadius: 12,
                background: "white",
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
            }}
        >
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700 }}>{wo.job_type}</div>

                    {wo.invoice_id ? (
                        <span
                            style={{
                                display: "inline-block",
                                padding: "4px 8px",
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

                <div style={{ opacity: 0.7, marginTop: 4 }}>{wo.description}</div>

                {wo.customer_name ? (
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                        <b>Customer:</b> {wo.customer_name}
                    </div>
                ) : null}

                {wo.service_address ? (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                        <b>Location:</b> {wo.service_address}
                    </div>
                ) : null}

                <div style={{ fontFamily: "monospace", opacity: 0.7, marginTop: 6 }}>
                    <div>
                        <b>wo_id:</b> {wo.work_order_id}
                    </div>
                    <div>
                        <b>assigned_to:</b> {wo.assigned_to ?? "—"}
                    </div>
                </div>

                {!wo.assigned_to && isAdminOrOwner && (
                    <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                        <label style={{ fontSize: 12, opacity: 0.7 }}>Asignar a técnico</label>

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
                                padding: "6px 8px",
                                borderRadius: 8,
                                border: "1px solid #ddd",
                                fontSize: 12,
                            }}
                        >
                            <option value="">Seleccionar tech...</option>
                            {techMembers.map((m) => (
                                <option key={m.user_id} value={m.user_id}>
                                    {m.user_id.slice(0, 8)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                <div
                    style={{
                        alignSelf: "flex-start",
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid #ddd",
                        background: "#f7f7f7",
                        fontSize: 12,
                        fontWeight: 700,
                    }}
                >
                    {wo.status}
                </div>

                <label style={{ fontSize: 12, opacity: 0.8 }}>Cambiar status</label>

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
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "white",
                        fontWeight: 700,
                        cursor: canChangeStatus(wo) ? "pointer" : "not-allowed",
                        opacity: canChangeStatus(wo) ? 1 : 0.6,
                        minWidth: 160,
                    }}
                >
                    {allowedStatusesForRole(myRole ?? null, wo.status).map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>

                <div style={{ marginTop: 10 }}>
                    <button
                        type="button"
                        onClick={() => onOpenWorkOrder(wo.work_order_id)}
                        style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid #ddd",
                            background: "white",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                            marginRight: 8,
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
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid #ddd",
                            background: "white",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                        }}
                    >
                        {auditOpenFor === wo.work_order_id ? "Ocultar historial" : "Ver historial"}
                    </button>

                    {wo.invoice_id ? (
                        <button
                            type="button"
                            onClick={() => onOpenInvoice(wo.invoice_id!)}
                            style={{
                                padding: "6px 10px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: "white",
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 800,
                                marginLeft: 8,
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
                                padding: "6px 10px",
                                borderRadius: 10,
                                border: "1px solid #111",
                                background: "#111",
                                color: "white",
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 800,
                                marginLeft: 8,
                            }}
                            title="Crear factura desde esta orden"
                        >
                            Crear factura
                        </button>
                    ) : null}

                    {auditOpenFor === wo.work_order_id ? (
                        <AuditPanel
                            loading={!!auditLoadingFor[wo.work_order_id]}
                            items={auditByWo[wo.work_order_id] ?? []}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}