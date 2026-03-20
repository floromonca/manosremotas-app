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