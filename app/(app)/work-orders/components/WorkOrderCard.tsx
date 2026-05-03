"use client";

import { useMemo, useState, type CSSProperties, type ComponentType } from "react";
import { MR_THEME } from "../../../../lib/theme";
import type { WorkOrderRole } from "../../../../lib/work-orders/policies";

type AuditItem = {
    changed_at: string | null;
    changed_at_ui: string | null;
    changed_by_name: string | null;
    message: string | null;
};

type WorkOrderStatus = "new" | "in_progress" | "resolved" | "closed" | "cancelled";

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
    AuditPanel: ComponentType<{ loading: boolean; items: AuditItem[] }>;
};

function prettyStatus(status: WorkOrderStatus) {
    return status.replaceAll("_", " ");
}

function statusStyles(status: WorkOrderStatus): CSSProperties {
    if (status === "closed") {
        return {
            background: MR_THEME.colors.cardBgSoft,
            border: `1px solid ${MR_THEME.colors.borderStrong}`,
            color: MR_THEME.colors.textSecondary,
        };
    }

    if (status === "resolved") {
        return {
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: MR_THEME.colors.success,
        };
    }

    if (status === "in_progress") {
        return {
            background: MR_THEME.colors.primarySoft,
            border: `1px solid ${MR_THEME.colors.primarySurface}`,
            color: MR_THEME.colors.primaryHover,
        };
    }

    return {
        background: "#fff7ed",
        border: "1px solid #fed7aa",
        color: "#9a3412",
    };
}

function priorityStyles(priority: string): CSSProperties {
    const normalized = (priority || "").toLowerCase();

    if (normalized === "high") {
        return {
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            color: "#be123c",
        };
    }

    if (normalized === "medium") {
        return {
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
        };
    }

    return {
        background: MR_THEME.colors.cardBgSoft,
        border: `1px solid ${MR_THEME.colors.border}`,
        color: MR_THEME.colors.textSecondary,
    };
}

function formatScheduledDate(value: string | null) {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

const chipBaseStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: MR_THEME.radius.pill,
    fontSize: 12,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
};

const secondaryButtonStyle: CSSProperties = {
    padding: "8px 10px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    background: MR_THEME.colors.cardBg,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    color: MR_THEME.colors.textPrimary,
};

export default function WorkOrderCard({
    wo,
    companyId,
    isAdminOrOwner,
    techMembers,
    auditOpenFor,
    auditLoadingFor,
    auditByWo,
    onAssignTech,
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
        wo.description && wo.description.length > 150
            ? `${wo.description.slice(0, 150).trim()}...`
            : wo.description;

    const scheduledLabel = useMemo(
        () => formatScheduledDate(wo.scheduled_for),
        [wo.scheduled_for]
    );

    const [showAssignPicker, setShowAssignPicker] = useState(false);

    const statusStyle = statusStyles(wo.status);
    const priorityStyle = priorityStyles(wo.priority || "");

    return (
        <div
            style={{
                padding: 16,
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                background: MR_THEME.colors.cardBg,
                boxShadow: MR_THEME.shadows.card,
                display: "grid",
                gap: 14,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 14,
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
                            marginBottom: 6,
                        }}
                    >
                        <div
                            style={{
                                fontWeight: 900,
                                fontSize: 17,
                                lineHeight: 1.2,
                                color: MR_THEME.colors.textPrimary,
                                letterSpacing: "-0.02em",
                            }}
                        >
                            {wo.job_type}
                        </div>

                        {wo.invoice_id ? (
                            <span
                                style={{
                                    ...chipBaseStyle,
                                    padding: "4px 8px",
                                    fontSize: 11,
                                    fontWeight: 900,
                                    border: "1px solid #bbf7d0",
                                    background: "#f0fdf4",
                                    color: MR_THEME.colors.success,
                                }}
                                title="This work order already has an invoice"
                            >
                                Invoiced
                            </span>
                        ) : null}
                    </div>

                    <div
                        style={{
                            fontSize: 14,
                            color: MR_THEME.colors.textSecondary,
                            lineHeight: 1.45,
                        }}
                    >
                        <span style={{ fontWeight: 800, color: MR_THEME.colors.textPrimary }}>
                            {wo.customer_name || "—"}
                        </span>
                        <span style={{ color: MR_THEME.colors.textMuted, margin: "0 6px" }}>•</span>
                        <span>{wo.service_address || "—"}</span>
                    </div>
                </div>

                <div
                    style={{
                        ...chipBaseStyle,
                        padding: "7px 12px",
                        fontWeight: 900,
                        textTransform: "capitalize",
                        ...statusStyle,
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
                <span style={{ ...chipBaseStyle, ...priorityStyle }}>
                    <span style={{ opacity: 0.8 }}>Priority</span>
                    <b style={{ textTransform: "capitalize" }}>{wo.priority || "—"}</b>
                </span>

                <span
                    style={{
                        ...chipBaseStyle,
                        background: wo.assigned_to ? MR_THEME.colors.cardBgSoft : "#fff7ed",
                        border: wo.assigned_to
                            ? `1px solid ${MR_THEME.colors.border}`
                            : "1px solid #fed7aa",
                        color: wo.assigned_to ? MR_THEME.colors.textSecondary : "#9a3412",
                        fontWeight: wo.assigned_to ? 600 : 800,
                    }}
                >
                    <span style={{ opacity: 0.8 }}>Assigned</span>
                    <b>{assignedLabel}</b>
                </span>

                {scheduledLabel ? (
                    <span
                        style={{
                            ...chipBaseStyle,
                            background: MR_THEME.colors.cardBgSoft,
                            border: `1px solid ${MR_THEME.colors.border}`,
                            color: MR_THEME.colors.textSecondary,
                        }}
                    >
                        <span style={{ opacity: 0.8 }}>Scheduled</span>
                        <b>{scheduledLabel}</b>
                    </span>
                ) : null}
            </div>

            {shortDescription ? (
                <div
                    style={{
                        padding: "10px 12px",
                        borderRadius: MR_THEME.radius.control,
                        background: MR_THEME.colors.cardBgSoft,
                        border: `1px solid ${MR_THEME.colors.border}`,
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: MR_THEME.colors.textSecondary,
                    }}
                >
                    {shortDescription}
                </div>
            ) : null}

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    paddingTop: 2,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                    }}
                >
                    <span
                        style={{
                            fontSize: 11,
                            color: MR_THEME.colors.textMuted,
                            fontFamily:
                                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            letterSpacing: "0.01em",
                        }}
                        title={wo.work_order_id}
                    >
                        Ref {wo.work_order_id.slice(0, 8)}
                    </span>

                    {!wo.assigned_to && isAdminOrOwner ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setShowAssignPicker((v) => !v)}
                                style={{
                                    padding: "7px 10px",
                                    borderRadius: MR_THEME.radius.pill,
                                    border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                    background: showAssignPicker
                                        ? MR_THEME.colors.primarySoft
                                        : MR_THEME.colors.cardBg,
                                    color: MR_THEME.colors.primaryHover,
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
                                            alert("No active company");
                                            return;
                                        }
                                        await onAssignTech(wo.work_order_id, techId);
                                        setShowAssignPicker(false);
                                    }}
                                    style={{
                                        padding: "7px 10px",
                                        borderRadius: MR_THEME.radius.pill,
                                        border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                        fontSize: 12,
                                        background: MR_THEME.colors.cardBg,
                                        color: MR_THEME.colors.textPrimary,
                                        maxWidth: 220,
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
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                    }}
                >
                    {isAdminOrOwner ? (
                        <button
                            type="button"
                            onClick={async () => {
                                await onToggleAudit(wo.work_order_id);
                            }}
                            style={secondaryButtonStyle}
                        >
                            {auditOpenFor === wo.work_order_id ? "Hide history" : "History"}
                        </button>
                    ) : null}

                    {isAdminOrOwner && wo.invoice_id ? (
                        <button
                            type="button"
                            onClick={() => onOpenInvoice(wo.invoice_id!)}
                            style={secondaryButtonStyle}
                            title="Open existing invoice"
                        >
                            Invoice
                        </button>
                    ) : null}

                    {isAdminOrOwner &&
                        !wo.invoice_id &&
                        (wo.status === "resolved" || wo.status === "closed") ? (
                        <button
                            type="button"
                            onClick={async () => {
                                await onCreateInvoice(wo.work_order_id);
                            }}
                            style={secondaryButtonStyle}
                            title="Create invoice from this work order"
                        >
                            Create invoice
                        </button>
                    ) : null}

                    <button
                        type="button"
                        onClick={() => onOpenWorkOrder(wo.work_order_id)}
                        style={{
                            padding: "9px 13px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.primaryHover}`,
                            background: MR_THEME.colors.primaryHover,
                            color: "white",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 900,
                            boxShadow: "0 1px 2px rgba(29,78,216,0.18)",
                        }}
                    >
                        Open
                    </button>
                </div>
            </div>

            {auditOpenFor === wo.work_order_id ? (
                <div style={{ marginTop: 2 }}>
                    <AuditPanel
                        loading={!!auditLoadingFor[wo.work_order_id]}
                        items={auditByWo[wo.work_order_id] ?? []}
                    />
                </div>
            ) : null}
        </div>
    );
}