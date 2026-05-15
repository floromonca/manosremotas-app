"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "../../../hooks/useAuthState";

type EarlyAccessStatus = "new" | "contacted" | "qualified" | "invited" | "rejected";

type EarlyAccessRequest = {
    id: string;
    full_name: string | null;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    business_type: string | null;
    message: string | null;
    source: string | null;
    status: EarlyAccessStatus | string | null;
    created_at: string | null;
    internal_note: string | null;
    next_follow_up_at: string | null;
};

const SUPER_ADMIN_EMAILS = ["floromonca@gmail.com"];

const STATUS_OPTIONS: EarlyAccessStatus[] = [
    "new",
    "contacted",
    "qualified",
    "invited",
    "rejected",
];

const STATUS_LABELS: Record<EarlyAccessStatus, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    invited: "Invited",
    rejected: "Rejected",
};

const STATUS_STYLES: Record<EarlyAccessStatus, { background: string; color: string; border: string }> = {
    new: {
        background: "#eff6ff",
        color: "#1d4ed8",
        border: "#bfdbfe",
    },
    contacted: {
        background: "#fefce8",
        color: "#854d0e",
        border: "#fde68a",
    },
    qualified: {
        background: "#ecfdf5",
        color: "#047857",
        border: "#bbf7d0",
    },
    invited: {
        background: "#f0fdf4",
        color: "#15803d",
        border: "#bbf7d0",
    },
    rejected: {
        background: "#fef2f2",
        color: "#b91c1c",
        border: "#fecaca",
    },
};

function normalizeStatus(status: string | null): EarlyAccessStatus {
    if (
        status === "new" ||
        status === "contacted" ||
        status === "qualified" ||
        status === "invited" ||
        status === "rejected"
    ) {
        return status;
    }

    return "new";
}

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

function formatBusinessType(value: string | null) {
    if (!value) return "—";

    return value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function toDateTimeLocalValue(value: string | null) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const localDate = new Date(date.getTime() - offsetMs);

    return localDate.toISOString().slice(0, 16);
}

function StatusBadge({ status }: { status: EarlyAccessStatus }) {
    const styles = STATUS_STYLES[status];

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "5px 9px",
                borderRadius: 999,
                border: `1px solid ${styles.border}`,
                background: styles.background,
                color: styles.color,
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: "nowrap",
            }}
        >
            {STATUS_LABELS[status]}
        </span>
    );
}

function FollowUpBlock({
    row,
    isExpanded,
    hasFollowUpInfo,
    savingNoteId,
    onToggle,
    onUpdateLocalRow,
    onSaveFollowUp,
}: {
    row: EarlyAccessRequest;
    isExpanded: boolean;
    hasFollowUpInfo: boolean;
    savingNoteId: string | null;
    onToggle: () => void;
    onUpdateLocalRow: (id: string, patch: Partial<EarlyAccessRequest>) => void;
    onSaveFollowUp: (row: EarlyAccessRequest) => void;
}) {
    return (
        <div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: isExpanded ? 10 : 0,
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#475569",
                            marginBottom: 4,
                        }}
                    >
                        Follow-up
                    </div>

                    <div
                        style={{
                            fontSize: 13,
                            color: hasFollowUpInfo ? "#0f172a" : "#94a3b8",
                            fontWeight: hasFollowUpInfo ? 700 : 500,
                            lineHeight: 1.35,
                        }}
                    >
                        {row.next_follow_up_at
                            ? formatDate(row.next_follow_up_at)
                            : row.internal_note
                                ? "Note saved"
                                : "No note yet"}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onToggle}
                    style={{
                        minHeight: 34,
                        padding: "7px 10px",
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#0f172a",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                    }}
                >
                    {isExpanded ? "Close" : hasFollowUpInfo ? "View note" : "Add note"}
                </button>
            </div>

            {isExpanded ? (
                <div
                    style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 14,
                        background: "#f8fafc",
                        padding: 10,
                    }}
                >
                    <label
                        style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#475569",
                            marginBottom: 6,
                        }}
                    >
                        Next follow-up
                    </label>

                    <input
                        type="datetime-local"
                        value={toDateTimeLocalValue(row.next_follow_up_at)}
                        onChange={(event) =>
                            onUpdateLocalRow(row.id, {
                                next_follow_up_at: event.target.value || null,
                            })
                        }
                        style={{
                            width: "100%",
                            minHeight: 36,
                            borderRadius: 10,
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            color: "#0f172a",
                            fontSize: 13,
                            fontWeight: 700,
                            padding: "7px 8px",
                            marginBottom: 8,
                        }}
                    />

                    <textarea
                        value={row.internal_note ?? ""}
                        onChange={(event) =>
                            onUpdateLocalRow(row.id, {
                                internal_note: event.target.value,
                            })
                        }
                        placeholder="Add private follow-up notes..."
                        rows={3}
                        style={{
                            width: "100%",
                            resize: "vertical",
                            minHeight: 76,
                            borderRadius: 10,
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            color: "#0f172a",
                            fontSize: 13,
                            lineHeight: 1.4,
                            padding: "9px 10px",
                            marginBottom: 8,
                        }}
                    />

                    <button
                        type="button"
                        disabled={savingNoteId === row.id}
                        onClick={() => onSaveFollowUp(row)}
                        style={{
                            width: "100%",
                            minHeight: 36,
                            borderRadius: 10,
                            border: "1px solid #2563eb",
                            background: savingNoteId === row.id ? "#dbeafe" : "#2563eb",
                            color: savingNoteId === row.id ? "#1d4ed8" : "#ffffff",
                            cursor: savingNoteId === row.id ? "not-allowed" : "pointer",
                            fontSize: 13,
                            fontWeight: 900,
                        }}
                    >
                        {savingNoteId === row.id ? "Saving..." : "Save note"}
                    </button>
                </div>
            ) : null}
        </div>
    );
}

export default function PlatformEarlyAccessPage() {
    const router = useRouter();
    const { user, authLoading } = useAuthState();

    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
    const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
    const [rows, setRows] = useState<EarlyAccessRequest[]>([]);
    const [errorMsg, setErrorMsg] = useState("");

    const isSuperAdmin = !!user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());

    const counts = useMemo(() => {
        return rows.reduce(
            (acc, row) => {
                const status = normalizeStatus(row.status);
                acc.total += 1;
                acc[status] += 1;
                return acc;
            },
            {
                total: 0,
                new: 0,
                contacted: 0,
                qualified: 0,
                invited: 0,
                rejected: 0,
            }
        );
    }, [rows]);

    async function loadRequests() {
        try {
            setLoading(true);
            setErrorMsg("");

            const res = await fetch("/api/platform/early-access");

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err?.error || "Failed to load early access requests");
            }

            const json = await res.json();
            setRows(json.requests ?? []);
        } catch (e: any) {
            setErrorMsg(e?.message ?? "Error loading early access requests");
        } finally {
            setLoading(false);
        }
    }

    function updateLocalRow(id: string, patch: Partial<EarlyAccessRequest>) {
        setRows((current) =>
            current.map((row) => (row.id === id ? { ...row, ...patch } : row))
        );
    }

    async function updateStatus(id: string, status: EarlyAccessStatus) {
        try {
            setSavingId(id);
            setErrorMsg("");

            const res = await fetch("/api/platform/early-access", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id, status }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err?.error || "Failed to update status");
            }

            const json = await res.json();
            const updated = json.request as EarlyAccessRequest;

            updateLocalRow(updated.id, updated);
        } catch (e: any) {
            setErrorMsg(e?.message ?? "Error updating status");
        } finally {
            setSavingId(null);
        }
    }

    async function saveFollowUp(row: EarlyAccessRequest) {
        try {
            setSavingNoteId(row.id);
            setErrorMsg("");

            const res = await fetch("/api/platform/early-access", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: row.id,
                    internal_note: row.internal_note ?? "",
                    next_follow_up_at: row.next_follow_up_at ?? null,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err?.error || "Failed to save follow-up note");
            }

            const json = await res.json();
            const updated = json.request as EarlyAccessRequest;

            updateLocalRow(updated.id, updated);
        } catch (e: any) {
            setErrorMsg(e?.message ?? "Error saving follow-up note");
        } finally {
            setSavingNoteId(null);
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

        loadRequests();
    }, [user, authLoading, isSuperAdmin, router]);

    if (authLoading || loading) {
        return (
            <div style={{ padding: 24 }}>
                <div style={{ fontSize: 14, color: "#475569" }}>
                    Loading early access requests...
                </div>
            </div>
        );
    }

    if (!isSuperAdmin) return null;

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 1320,
                margin: "0 auto",
                padding: "28px 24px 40px",
            }}
        >
            <style>{`
                @media (max-width: 900px) {
                    .early-access-shell {
                        padding: 22px 14px 34px !important;
                    }

                    .early-access-title {
                        font-size: 34px !important;
                        letter-spacing: 0.03em !important;
                    }

                    .early-access-subtitle {
                        font-size: 15px !important;
                        line-height: 1.55 !important;
                    }

                    .early-access-actions {
                        width: 100% !important;
                    }

                    .early-access-actions button {
                        flex: 1 1 100% !important;
                        justify-content: center !important;
                    }

                    .early-access-counts {
                        grid-template-columns: 1fr 1fr !important;
                    }

                    .early-access-desktop-table {
                        display: none !important;
                    }

                    .early-access-mobile-list {
                        display: grid !important;
                    }
                }

               @media (max-width: 520px) {
    .early-access-shell {
        padding-top: 34px !important;
    }

    .early-access-counts {
        grid-template-columns: 1fr 1fr !important;
    }
}
            `}</style>

            <div className="early-access-shell">
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
                            className="early-access-title"
                            style={{
                                fontSize: 42,
                                lineHeight: 1.05,
                                fontWeight: 900,
                                color: "#0f172a",
                                margin: 0,
                                marginBottom: 10,
                            }}
                        >
                            Early Access Leads
                        </h1>

                        <div
                            className="early-access-subtitle"
                            style={{
                                fontSize: 16,
                                color: "#64748b",
                                maxWidth: 780,
                            }}
                        >
                            Review public landing requests, document follow-ups, and move each lead through the access pipeline.
                        </div>
                    </div>

                    <div
                        className="early-access-actions"
                        style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                        }}
                    >
                        <button
                            type="button"
                            onClick={loadRequests}
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
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push("/platform/companies")}
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
                            Companies →
                        </button>
                    </div>
                </div>

                <div
                    className="early-access-counts"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                        gap: 12,
                        marginBottom: 18,
                    }}
                >
                    {[
                        ["Total", counts.total],
                        ["New", counts.new],
                        ["Contacted", counts.contacted],
                        ["Qualified", counts.qualified],
                        ["Invited", counts.invited],
                        ["Rejected", counts.rejected],
                    ].map(([label, value]) => (
                        <div
                            key={label}
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
                                {label}
                            </div>
                            <div
                                style={{
                                    fontSize: 26,
                                    fontWeight: 900,
                                    color: "#0f172a",
                                }}
                            >
                                {value}
                            </div>
                        </div>
                    ))}
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
                    className="early-access-desktop-table"
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
                            gridTemplateColumns:
                                "minmax(220px, 1fr) minmax(180px, 0.8fr) minmax(190px, 0.9fr) minmax(220px, 1fr) minmax(280px, 1.2fr) minmax(150px, 0.7fr)",
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
                        <div>Lead</div>
                        <div>Business</div>
                        <div>Contact</div>
                        <div>Message</div>
                        <div>Follow-up</div>
                        <div>Status</div>
                    </div>

                    {rows.length === 0 ? (
                        <div
                            style={{
                                padding: 18,
                                fontSize: 14,
                                color: "#64748b",
                            }}
                        >
                            No early access requests found.
                        </div>
                    ) : (
                        rows.map((row, index) => {
                            const status = normalizeStatus(row.status);
                            const isExpanded = expandedLeadId === row.id;
                            const hasFollowUpInfo = !!row.internal_note || !!row.next_follow_up_at;

                            return (
                                <div
                                    key={row.id}
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "minmax(220px, 1fr) minmax(180px, 0.8fr) minmax(190px, 0.9fr) minmax(220px, 1fr) minmax(280px, 1.2fr) minmax(150px, 0.7fr)",
                                        gap: 0,
                                        padding: "16px 18px",
                                        borderBottom:
                                            index === rows.length - 1 ? "none" : "1px solid #eef2f7",
                                        alignItems: "flex-start",
                                        background: "#ffffff",
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontSize: 15,
                                                fontWeight: 900,
                                                color: "#0f172a",
                                                marginBottom: 4,
                                            }}
                                        >
                                            {row.full_name || "Unnamed lead"}
                                        </div>

                                        <div
                                            style={{
                                                fontSize: 13,
                                                color: "#475569",
                                                marginBottom: 6,
                                            }}
                                        >
                                            {row.company_name || "No company"}
                                        </div>

                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "#94a3b8",
                                            }}
                                        >
                                            {formatDate(row.created_at)}
                                        </div>
                                    </div>

                                    <div>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 800,
                                                color: "#0f172a",
                                                marginBottom: 4,
                                            }}
                                        >
                                            {formatBusinessType(row.business_type)}
                                        </div>

                                        <div
                                            style={{
                                                fontSize: 13,
                                                color: "#64748b",
                                                marginBottom: 4,
                                            }}
                                        >
                                            {row.location || "—"}
                                        </div>

                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "#94a3b8",
                                            }}
                                        >
                                            {row.source || "—"}
                                        </div>
                                    </div>

                                    <div>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                color: "#0f172a",
                                                fontWeight: 700,
                                                marginBottom: 4,
                                                overflowWrap: "anywhere",
                                            }}
                                        >
                                            {row.email || "—"}
                                        </div>

                                        <div
                                            style={{
                                                fontSize: 13,
                                                color: "#64748b",
                                            }}
                                        >
                                            {row.phone || "—"}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            fontSize: 13,
                                            color: "#475569",
                                            lineHeight: 1.45,
                                            whiteSpace: "pre-wrap",
                                        }}
                                    >
                                        {row.message || "—"}
                                    </div>

                                    <FollowUpBlock
                                        row={row}
                                        isExpanded={isExpanded}
                                        hasFollowUpInfo={hasFollowUpInfo}
                                        savingNoteId={savingNoteId}
                                        onToggle={() =>
                                            setExpandedLeadId((current) =>
                                                current === row.id ? null : row.id
                                            )
                                        }
                                        onUpdateLocalRow={updateLocalRow}
                                        onSaveFollowUp={saveFollowUp}
                                    />

                                    <div>
                                        <div style={{ marginBottom: 10 }}>
                                            <StatusBadge status={status} />
                                        </div>

                                        <select
                                            value={status}
                                            disabled={savingId === row.id}
                                            onChange={(event) =>
                                                updateStatus(row.id, event.target.value as EarlyAccessStatus)
                                            }
                                            style={{
                                                width: "100%",
                                                minHeight: 36,
                                                borderRadius: 10,
                                                border: "1px solid #cbd5e1",
                                                background: savingId === row.id ? "#f8fafc" : "#ffffff",
                                                color: "#0f172a",
                                                fontSize: 13,
                                                fontWeight: 700,
                                                padding: "7px 8px",
                                                cursor: savingId === row.id ? "not-allowed" : "pointer",
                                            }}
                                        >
                                            {STATUS_OPTIONS.map((option) => (
                                                <option key={option} value={option}>
                                                    {STATUS_LABELS[option]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div
                    className="early-access-mobile-list"
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
                            No early access requests found.
                        </div>
                    ) : (
                        rows.map((row) => {
                            const status = normalizeStatus(row.status);
                            const isExpanded = expandedLeadId === row.id;
                            const hasFollowUpInfo = !!row.internal_note || !!row.next_follow_up_at;

                            return (
                                <div
                                    key={row.id}
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
                                                {row.full_name || "Unnamed lead"}
                                            </div>

                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    color: "#475569",
                                                    fontWeight: 700,
                                                    marginBottom: 5,
                                                }}
                                            >
                                                {row.company_name || "No company"}
                                            </div>

                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    color: "#94a3b8",
                                                }}
                                            >
                                                {formatDate(row.created_at)}
                                            </div>
                                        </div>

                                        <StatusBadge status={status} />
                                    </div>

                                    <div
                                        style={{
                                            display: "grid",
                                            gap: 12,
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
                                                Business
                                            </div>

                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    color: "#334155",
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {formatBusinessType(row.business_type)} · {row.location || "—"}
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
                                                Contact
                                            </div>

                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    color: "#0f172a",
                                                    fontWeight: 800,
                                                    overflowWrap: "anywhere",
                                                }}
                                            >
                                                {row.email || "—"}
                                            </div>

                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    color: "#64748b",
                                                    marginTop: 3,
                                                }}
                                            >
                                                {row.phone || "—"}
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
                                                Message
                                            </div>

                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    color: "#475569",
                                                    lineHeight: 1.45,
                                                    whiteSpace: "pre-wrap",
                                                }}
                                            >
                                                {row.message || "—"}
                                            </div>
                                        </div>

                                        <FollowUpBlock
                                            row={row}
                                            isExpanded={isExpanded}
                                            hasFollowUpInfo={hasFollowUpInfo}
                                            savingNoteId={savingNoteId}
                                            onToggle={() =>
                                                setExpandedLeadId((current) =>
                                                    current === row.id ? null : row.id
                                                )
                                            }
                                            onUpdateLocalRow={updateLocalRow}
                                            onSaveFollowUp={saveFollowUp}
                                        />

                                        <div>
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 800,
                                                    color: "#64748b",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.06em",
                                                    marginBottom: 6,
                                                }}
                                            >
                                                Status
                                            </div>

                                            <select
                                                value={status}
                                                disabled={savingId === row.id}
                                                onChange={(event) =>
                                                    updateStatus(row.id, event.target.value as EarlyAccessStatus)
                                                }
                                                style={{
                                                    width: "100%",
                                                    minHeight: 42,
                                                    borderRadius: 12,
                                                    border: "1px solid #cbd5e1",
                                                    background: savingId === row.id ? "#f8fafc" : "#ffffff",
                                                    color: "#0f172a",
                                                    fontSize: 14,
                                                    fontWeight: 800,
                                                    padding: "8px 10px",
                                                    cursor: savingId === row.id ? "not-allowed" : "pointer",
                                                }}
                                            >
                                                {STATUS_OPTIONS.map((option) => (
                                                    <option key={option} value={option}>
                                                        {STATUS_LABELS[option]}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}