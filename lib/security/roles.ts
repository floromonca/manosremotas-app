export type CompanyRole =
  | "owner"
  | "admin"
  | "office_staff"
  | "accountant"
  | "tech"
  | "viewer";

export const INVOICE_MANAGER_ROLES: CompanyRole[] = [
  "owner",
  "admin",
  "office_staff",
  "accountant",
];

export const COMPANY_ADMIN_ROLES: CompanyRole[] = ["owner", "admin"];

export function roleIn(
  role: string | null | undefined,
  allowedRoles: readonly string[]
) {
  return !!role && allowedRoles.includes(role);
}

export function canManageInvoices(role: string | null | undefined) {
  return roleIn(role, INVOICE_MANAGER_ROLES);
}

export function canAdminCompany(role: string | null | undefined) {
  return roleIn(role, COMPANY_ADMIN_ROLES);
}

export function canManagePayroll(role: string | null | undefined) {
  return roleIn(role, COMPANY_ADMIN_ROLES);
}
