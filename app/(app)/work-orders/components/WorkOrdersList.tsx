"use client";

import WorkOrderCard from "./WorkOrderCard";
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

type MemberRow = { user_id: string; role: string };

type Props = {
    rows: WorkOrder[];
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

export default function WorkOrdersList({
    rows,
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
        <div style={{ display: "grid", gap: 12 }}>
            {rows.map((wo) => (
                <WorkOrderCard
                    key={wo.work_order_id}
                    wo={wo}
                    companyId={companyId}
                    isAdminOrOwner={isAdminOrOwner}
                    techMembers={techMembers}
                    canChangeStatus={canChangeStatus}
                    myRole={myRole}
                    allowedStatusesForRole={allowedStatusesForRole}
                    auditOpenFor={auditOpenFor}
                    auditLoadingFor={auditLoadingFor}
                    auditByWo={auditByWo}
                    onAssignTech={onAssignTech}
                    onChangeStatus={onChangeStatus}
                    onOpenWorkOrder={onOpenWorkOrder}
                    onToggleAudit={onToggleAudit}
                    onOpenInvoice={onOpenInvoice}
                    onCreateInvoice={onCreateInvoice}
                    AuditPanel={AuditPanel}
                />
            ))}
        </div>
    );
}