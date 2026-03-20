export type WorkOrderStatus = "new" | "in_progress" | "resolved" | "closed";
export type WorkOrderRole = "owner" | "admin" | "tech" | "viewer" | null;

export function allowedStatusesForRole(
    role: WorkOrderRole,
    current: WorkOrderStatus
): WorkOrderStatus[] {
    const all: WorkOrderStatus[] = ["new", "in_progress", "resolved", "closed"];

    if (role === "owner" || role === "admin") return all;

    if (role === "tech") {
        if (current === "new") return ["new", "in_progress"];
        if (current === "in_progress") return ["in_progress", "resolved"];
        if (current === "resolved") return ["resolved", "closed"];
        return ["closed"];
    }

    return [current];
}

export function canChangeWorkOrderStatus(params: {
    userId: string | null;
    isAdminOrOwner: boolean;
    role: WorkOrderRole;
    canOperate: boolean;
    assignedTo: string | null | undefined;
}): boolean {
    const { userId, isAdminOrOwner, role, canOperate, assignedTo } = params;

    if (!userId) return false;

    if (isAdminOrOwner) return true;

    if (role === "tech") {
        return canOperate && assignedTo === userId;
    }

    return false;
}

export function isWorkOrderDelayed(params: {
    status: WorkOrderStatus;
    createdAt: string | null;
    nowMs?: number;
}): boolean {
    const { status, createdAt, nowMs = Date.now() } = params;

    if (status !== "in_progress") return false;

    const created = createdAt ? new Date(createdAt).getTime() : nowMs;
    const days = (nowMs - created) / (1000 * 60 * 60 * 24);

    return days > 3;
}

export function isWorkOrderReadyToInvoice(status: WorkOrderStatus): boolean {
    return status === "resolved" || status === "closed";
}