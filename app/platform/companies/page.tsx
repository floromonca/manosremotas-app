"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useAuthState } from "../../../hooks/useAuthState";
import { useActiveCompany } from "../../../hooks/useActiveCompany";

type CompanyRow = {
    company_id: string;
    company_name: string | null;
    created_by: string | null;
    created_at: string | null;
};

const SUPER_ADMIN_EMAILS = [
    "floromonca@gmail.com",
];

export default function PlatformCompaniesPage() {
    const router = useRouter();
    const { user, authLoading } = useAuthState();
    const { refreshCompany } = useActiveCompany();

    const [loading, setLoading] = useState(true);
    const [enteringId, setEnteringId] = useState<string | null>(null);
    const [rows, setRows] = useState<CompanyRow[]>([]);
    const [errorMsg, setErrorMsg] = useState("");

    const isSuperAdmin = !!user?.email && SUPER_ADMIN_EMAILS.includes(user.email);
    async function enterCompany(companyId: string) {
        try {
            setEnteringId(companyId);

            const res = await fetch("/api/platform/enter-company", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ companyId }),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error || "Failed to enter company");
            }

            localStorage.setItem("activeCompanyId", companyId);
            localStorage.setItem("platformMode", "true");
            refreshCompany();
            router.push("/work-orders");
        } catch (err: any) {
            console.error("Error entering company:", {
                message: err?.message ?? null,
                details: err?.details ?? null,
                hint: err?.hint ?? null,
                code: err?.code ?? null,
                raw: err,
            });
        } finally {
            setEnteringId(null);
        }
    }
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.replace("/auth");
            return;
        }

        if (!isSuperAdmin) {
            router.replace("/work-orders");
            return;
        }

        async function load() {
            try {
                setLoading(true);

                const res = await fetch("/api/platform/companies");

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err?.error || "Failed to load companies");
                }

                const json = await res.json();

                setRows(json.companies ?? []);
            } catch (e: any) {
                setErrorMsg(e?.message ?? "Error loading companies");
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [user, authLoading, isSuperAdmin]);



    if (authLoading || loading) {
        return (
            <div style={{ padding: 24 }}>
                <div style={{ fontSize: 14, color: "#475569" }}>Loading companies...</div>
            </div>
        );
    }

    if (!isSuperAdmin) return null;

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 1180,
                margin: "0 auto",
                padding: "28px 24px 40px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    marginBottom: 22,
                    flexWrap: "wrap",
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "#64748b",
                            marginBottom: 10,
                        }}
                    >
                        Platform
                    </div>

                    <h1
                        style={{
                            fontSize: 42,
                            lineHeight: 1.05,
                            fontWeight: 900,
                            color: "#0f172a",
                            margin: 0,
                            marginBottom: 10,
                        }}
                    >
                        Companies
                    </h1>

                    <div
                        style={{
                            fontSize: 16,
                            color: "#64748b",
                            maxWidth: 760,
                        }}
                    >
                        View all registered companies and enter one to operate or support it.
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => router.push("/control-center")}
                    style={{
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#0f172a",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 800,
                        boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                    }}
                >
                    Go to app →
                </button>
            </div>

            {errorMsg ? (
                <div
                    style={{
                        marginBottom: 16,
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid #fecaca",
                        background: "#fef2f2",
                        color: "#991b1b",
                        fontSize: 14,
                    }}
                >
                    {errorMsg}
                </div>
            ) : null}

            <div
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 18,
                    background: "#ffffff",
                    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(260px, 1.4fr) minmax(220px, 1fr) minmax(220px, 1fr) 120px",
                        gap: 0,
                        padding: "14px 18px",
                        background: "#f8fafc",
                        borderBottom: "1px solid #e5e7eb",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#475569",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                    }}
                >
                    <div>Company</div>
                    <div>Created by</div>
                    <div>Created at</div>
                    <div>Action</div>
                </div>

                {rows.length === 0 ? (
                    <div
                        style={{
                            padding: 18,
                            fontSize: 14,
                            color: "#64748b",
                        }}
                    >
                        No companies found.
                    </div>
                ) : (
                    rows.map((row, index) => (
                        <div
                            key={row.company_id}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(260px, 1.4fr) minmax(220px, 1fr) minmax(220px, 1fr) 120px",
                                gap: 0,
                                padding: "16px 18px",
                                borderBottom: index === rows.length - 1 ? "none" : "1px solid #eef2f7",
                                alignItems: "center",
                                background: "#ffffff",
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: 16,
                                        fontWeight: 800,
                                        color: "#0f172a",
                                        marginBottom: 4,
                                    }}
                                >
                                    {row.company_name?.trim() ? row.company_name : "Unnamed company"}
                                </div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: "#94a3b8",
                                        fontFamily: "monospace",
                                    }}
                                >
                                    {row.company_id}
                                </div>
                            </div>

                            <div
                                style={{
                                    fontSize: 14,
                                    color: "#334155",
                                    fontFamily: "monospace",
                                }}
                            >
                                {row.created_by ?? "—"}
                            </div>

                            <div
                                style={{
                                    fontSize: 14,
                                    color: "#334155",
                                }}
                            >
                                {row.created_at
                                    ? new Date(row.created_at).toLocaleString()
                                    : "—"}
                            </div>

                            <div>
                                <button
                                    type="button"
                                    onClick={() => enterCompany(row.company_id)}
                                    disabled={enteringId === row.company_id}
                                    style={{
                                        padding: "10px 14px",
                                        borderRadius: 12,
                                        border: "1px solid #2563eb",
                                        background: enteringId === row.company_id ? "#dbeafe" : "#2563eb",
                                        color: "white",
                                        cursor: "pointer",
                                        fontWeight: 800,
                                        minWidth: 88,
                                    }}
                                >
                                    {enteringId === row.company_id ? "Entering..." : "Enter"}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}