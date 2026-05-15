"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "../../../hooks/useAuthState";
import { useActiveCompany } from "../../../hooks/useActiveCompany";

type CompanyRow = {
    company_id: string;
    company_name: string | null;
    created_by: string | null;
    created_at: string | null;
};

const SUPER_ADMIN_EMAILS = ["floromonca@gmail.com"];

function formatDate(value: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function shortId(value: string | null | undefined) {
    if (!value) return "—";

    if (value.length <= 12) return value;

    return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export default function PlatformCompaniesPage() {
    const router = useRouter();
    const { user, authLoading } = useAuthState();
    const { refreshCompany } = useActiveCompany();

    const [loading, setLoading] = useState(true);
    const [enteringId, setEnteringId] = useState<string | null>(null);
    const [rows, setRows] = useState<CompanyRow[]>([]);
    const [errorMsg, setErrorMsg] = useState("");

    const isSuperAdmin = !!user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());

    const totalCompanies = useMemo(() => rows.length, [rows]);

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

    async function loadCompanies() {
        try {
            setLoading(true);
            setErrorMsg("");

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

        loadCompanies();
    }, [user, authLoading, isSuperAdmin, router]);

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
            <style>{`
                @media (max-width: 760px) {
                    .platform-shell {
                        padding: 22px 14px 34px !important;
                    }

                    .platform-title {
                        font-size: 34px !important;
                        letter-spacing: 0.03em !important;
                    }

                    .platform-subtitle {
                        font-size: 15px !important;
                        line-height: 1.55 !important;
                    }

                    .platform-actions {
                        width: 100% !important;
                    }

                    .platform-actions button {
                        flex: 1 1 100% !important;
                        justify-content: center !important;
                    }

                    .platform-desktop-table {
                        display: none !important;
                    }

                    .platform-mobile-list {
                        display: grid !important;
                    }

                    .platform-summary-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>

            <div className="platform-shell">
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
                            className="platform-title"
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
                            className="platform-subtitle"
                            style={{
                                fontSize: 16,
                                color: "#64748b",
                                maxWidth: 760,
                            }}
                        >
                            View registered companies, enter one for support, or review new early access leads.
                        </div>
                    </div>

                    <div
                        className="platform-actions"
                        style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => router.push("/platform/early-access")}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "9px 12px",
                                borderRadius: 10,
                                border: "1px solid #2563eb",
                                background: "#2563eb",
                                color: "#ffffff",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 900,
                                boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                            }}
                        >
                            Early Access Leads →
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push("/control-center")}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
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
                </div>

                <div
                    className="platform-summary-grid"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 220px)",
                        gap: 12,
                        marginBottom: 18,
                    }}
                >
                    <div
                        style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 16,
                            background: "#ffffff",
                            padding: "14px 16px",
                            boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 12,
                                color: "#64748b",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                marginBottom: 6,
                            }}
                        >
                            Total companies
                        </div>
                        <div
                            style={{
                                fontSize: 26,
                                fontWeight: 900,
                                color: "#0f172a",
                            }}
                        >
                            {totalCompanies}
                        </div>
                    </div>
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
                    className="platform-desktop-table"
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
                                    gridTemplateColumns:
                                        "minmax(260px, 1.4fr) minmax(220px, 1fr) minmax(220px, 1fr) 120px",
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
                                        title={row.company_id}
                                        style={{
                                            fontSize: 12,
                                            color: "#94a3b8",
                                            fontFamily: "monospace",
                                        }}
                                    >
                                        {shortId(row.company_id)}
                                    </div>
                                </div>

                                <div
                                    title={row.created_by ?? ""}
                                    style={{
                                        fontSize: 14,
                                        color: "#334155",
                                        fontFamily: "monospace",
                                        overflowWrap: "anywhere",
                                    }}
                                >
                                    {shortId(row.created_by)}
                                </div>

                                <div
                                    style={{
                                        fontSize: 14,
                                        color: "#334155",
                                    }}
                                >
                                    {formatDate(row.created_at)}
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
                                            background:
                                                enteringId === row.company_id ? "#dbeafe" : "#2563eb",
                                            color:
                                                enteringId === row.company_id ? "#1d4ed8" : "#ffffff",
                                            cursor:
                                                enteringId === row.company_id ? "not-allowed" : "pointer",
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

                <div
                    className="platform-mobile-list"
                    style={{
                        display: "none",
                        gap: 12,
                    }}
                >
                    {rows.length === 0 ? (
                        <div
                            style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 16,
                                background: "#ffffff",
                                padding: 16,
                                fontSize: 14,
                                color: "#64748b",
                            }}
                        >
                            No companies found.
                        </div>
                    ) : (
                        rows.map((row) => (
                            <div
                                key={row.company_id}
                                style={{
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 18,
                                    background: "#ffffff",
                                    padding: 16,
                                    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        gap: 12,
                                        marginBottom: 12,
                                    }}
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: 17,
                                                fontWeight: 900,
                                                color: "#0f172a",
                                                marginBottom: 5,
                                            }}
                                        >
                                            {row.company_name?.trim() ? row.company_name : "Unnamed company"}
                                        </div>

                                        <div
                                            title={row.company_id}
                                            style={{
                                                fontSize: 12,
                                                color: "#94a3b8",
                                                fontFamily: "monospace",
                                            }}
                                        >
                                            ID: {shortId(row.company_id)}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: "grid",
                                        gap: 8,
                                        marginBottom: 14,
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 800,
                                                color: "#64748b",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.06em",
                                                marginBottom: 3,
                                            }}
                                        >
                                            Created
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                color: "#334155",
                                                fontWeight: 700,
                                            }}
                                        >
                                            {formatDate(row.created_at)}
                                        </div>
                                    </div>

                                    <div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 800,
                                                color: "#64748b",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.06em",
                                                marginBottom: 3,
                                            }}
                                        >
                                            Created by
                                        </div>
                                        <div
                                            title={row.created_by ?? ""}
                                            style={{
                                                fontSize: 13,
                                                color: "#334155",
                                                fontWeight: 700,
                                                fontFamily: "monospace",
                                            }}
                                        >
                                            {shortId(row.created_by)}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => enterCompany(row.company_id)}
                                    disabled={enteringId === row.company_id}
                                    style={{
                                        width: "100%",
                                        minHeight: 42,
                                        borderRadius: 12,
                                        border: "1px solid #2563eb",
                                        background: enteringId === row.company_id ? "#dbeafe" : "#2563eb",
                                        color: enteringId === row.company_id ? "#1d4ed8" : "#ffffff",
                                        cursor: enteringId === row.company_id ? "not-allowed" : "pointer",
                                        fontSize: 14,
                                        fontWeight: 900,
                                    }}
                                >
                                    {enteringId === row.company_id ? "Entering..." : "Enter company"}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}