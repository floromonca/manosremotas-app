"use client";

import { CompanyGuard } from "../../components/CompanyGuard";

export default function ControlCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CompanyGuard>{children}</CompanyGuard>;
}