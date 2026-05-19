"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthState } from "@/hooks/useAuthState";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { hasPlanFeature } from "@/lib/features/entitlements";
import { MR_THEME } from "@/lib/theme";

type WorkOrderRow = {
    work_order_id: string;
    company_id: string;
    work_order_number: string | null;
    customer_name: string | null;
    service_address: string | null;
    status: string | null;
    description: string | null;
};

type WorkOrderReportRow = {
    work_order_report_id: string;
    company_id: string;
    work_order_id: string;
    report_number: string | null;
    status: string | null;
    work_completed_summary: string | null;
    recommendations: string | null;
    customer_facing_note: string | null;
    completion_statement: string | null;
};

type ReportDraft = {
    work_completed_summary: string;
    recommendations: string;
    customer_facing_note: string;
    completion_statement: string;
};

const emptyDraft: ReportDraft = {
    work_completed_summary: "",
    recommendations: "",
    customer_facing_note: "",
    completion_statement: "",
};

function displayWorkOrderNumber(workOrder: WorkOrderRow | null) {
    if (!workOrder) return "Work Order";

    const number = String(workOrder.work_order_number ?? "").trim();
    if (number) return number;

    return `WO-${workOrder.work_order_id.slice(0, 8)}`;
}

export default function EditWorkReportPage() {
    const router = useRouter();
    const params = useParams();
    const workOrderId =
        typeof params?.workOrderId === "string" ? params.workOrderId : "";

    const { user, authLoading } = useAuthState();

    const {
        companyId: activeCompanyId,
        companyPlan,
        myRole,
        isLoadingCompany,
    } = useActiveCompany();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    const [workOrder, setWorkOrder] = useState<WorkOrderRow | null>(null);
    const [report, setReport] = useState<WorkOrderReportRow | null>(null);
    const [draft, setDraft] = useState<ReportDraft>(emptyDraft);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const isAdmin = myRole === "owner" || myRole === "admin";
    const canUseWorkReport = hasPlanFeature(companyPlan, "work_report");

    const reportPreviewHref = useMemo(() => {
        if (!workOrderId) return "#";
        return `/api/work-orders/${encodeURIComponent(workOrderId)}/report/html?mode=preview`;
    }, [workOrderId]);

    const backHref = useMemo(() => {
        if (!workOrderId) return "/work-orders";
        return `/work-orders/${encodeURIComponent(workOrderId)}`;
    }, [workOrderId]);
    const draftStorageKey = useMemo(() => {
        if (!activeCompanyId || !workOrderId) return null;

        return `mr-work-report-draft:${activeCompanyId}:${workOrderId}`;
    }, [activeCompanyId, workOrderId]);

    const loadData = useCallback(async () => {
        if (!workOrderId || !activeCompanyId) return;

        setLoading(true);
        setError(null);
        setSavedMessage(null);

        try {
            const { data: woData, error: woError } = await supabase
                .from("work_orders")
                .select(
                    "work_order_id, company_id, work_order_number, customer_name, service_address, status, description"
                )
                .eq("work_order_id", workOrderId)
                .eq("company_id", activeCompanyId)
                .maybeSingle();

            if (woError) throw woError;

            if (!woData) {
                setWorkOrder(null);
                setReport(null);
                setDraft(emptyDraft);
                setError("Work Order not found.");
                return;
            }

            const mappedWorkOrder = woData as WorkOrderRow;
            setWorkOrder(mappedWorkOrder);

            const { data: reportData, error: reportError } = await supabase
                .from("work_order_reports")
                .select(
                    "work_order_report_id, company_id, work_order_id, report_number, status, work_completed_summary, recommendations, customer_facing_note, completion_statement"
                )
                .eq("company_id", activeCompanyId)
                .eq("work_order_id", workOrderId)
                .maybeSingle();

            if (reportError) throw reportError;

            const mappedReport = (reportData ?? null) as WorkOrderReportRow | null;
            setReport(mappedReport);

            const serverDraft = {
                work_completed_summary:
                    mappedReport?.work_completed_summary ?? "",
                recommendations: mappedReport?.recommendations ?? "",
                customer_facing_note: mappedReport?.customer_facing_note ?? "",
                completion_statement: mappedReport?.completion_statement ?? "",
            };

            let nextDraft = serverDraft;
            let restoredLocalDraft = false;

            if (draftStorageKey && typeof window !== "undefined") {
                const savedLocalDraft = window.localStorage.getItem(draftStorageKey);

                if (savedLocalDraft) {
                    try {
                        const parsed = JSON.parse(savedLocalDraft) as Partial<ReportDraft>;

                        nextDraft = {
                            ...serverDraft,
                            work_completed_summary:
                                parsed.work_completed_summary ??
                                serverDraft.work_completed_summary,
                            recommendations:
                                parsed.recommendations ??
                                serverDraft.recommendations,
                            customer_facing_note:
                                parsed.customer_facing_note ??
                                serverDraft.customer_facing_note,
                            completion_statement:
                                parsed.completion_statement ??
                                serverDraft.completion_statement,
                        };

                        restoredLocalDraft = true;
                    } catch {
                        window.localStorage.removeItem(draftStorageKey);
                    }
                }
            }

            setDraft(nextDraft);
            setHasUnsavedChanges(restoredLocalDraft);
        } catch (err: any) {
            console.error("load work report edit error:", err);
            setError(err?.message ?? "Error loading Work Report.");
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId, draftStorageKey, workOrderId]);

    useEffect(() => {
        if (authLoading || isLoadingCompany) return;

        if (!user) {
            router.replace("/auth");
            return;
        }

        if (!activeCompanyId) {
            setLoading(false);
            setError("No active company selected.");
            return;
        }

        if (!isAdmin) {
            setLoading(false);
            setError("Only owner/admin can edit Professional Work Reports.");
            return;
        }

        if (!canUseWorkReport) {
            setLoading(false);
            setError("Professional Work Reports require the Business plan.");
            return;
        }

        loadData();
    }, [
        activeCompanyId,
        authLoading,
        canUseWorkReport,
        isAdmin,
        isLoadingCompany,
        loadData,
        router,
        user,
    ]);
    useEffect(() => {
        if (!hasUnsavedChanges) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    function updateDraft(field: keyof ReportDraft, value: string) {
        setDraft((current) => {
            const nextDraft = {
                ...current,
                [field]: value,
            };

            if (draftStorageKey && typeof window !== "undefined") {
                window.localStorage.setItem(
                    draftStorageKey,
                    JSON.stringify(nextDraft)
                );
            }

            return nextDraft;
        });

        setSavedMessage(null);
        setHasUnsavedChanges(true);
    }
    async function persistDraft() {
        if (!user?.id || !activeCompanyId || !workOrderId || !workOrder) {
            throw new Error("Missing required data to save Work Report.");
        }

        const payload = {
            company_id: activeCompanyId,
            work_order_id: workOrderId,
            status: "draft",
            work_completed_summary:
                draft.work_completed_summary.trim() || null,
            recommendations: draft.recommendations.trim() || null,
            customer_facing_note:
                draft.customer_facing_note.trim() || null,
            completion_statement:
                draft.completion_statement.trim() || null,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        };

        if (report?.work_order_report_id) {
            const { data, error: updateError } = await supabase
                .from("work_order_reports")
                .update(payload)
                .eq("work_order_report_id", report.work_order_report_id)
                .eq("company_id", activeCompanyId)
                .select(
                    "work_order_report_id, company_id, work_order_id, report_number, status, work_completed_summary, recommendations, customer_facing_note, completion_statement"
                )
                .maybeSingle();

            if (updateError) throw updateError;

            setReport((data ?? null) as WorkOrderReportRow | null);

            if (draftStorageKey && typeof window !== "undefined") {
                window.localStorage.removeItem(draftStorageKey);
            }

            setHasUnsavedChanges(false);
            return;
        }

        const { data, error: insertError } = await supabase
            .from("work_order_reports")
            .insert({
                ...payload,
                created_by: user.id,
            })
            .select(
                "work_order_report_id, company_id, work_order_id, report_number, status, work_completed_summary, recommendations, customer_facing_note, completion_statement"
            )
            .maybeSingle();

        if (insertError) throw insertError;

        setReport((data ?? null) as WorkOrderReportRow | null);

        if (draftStorageKey && typeof window !== "undefined") {
            window.localStorage.removeItem(draftStorageKey);
        }

        setHasUnsavedChanges(false);
    }
    async function saveDraft() {
        setSaving(true);
        setError(null);
        setSavedMessage(null);

        try {
            await persistDraft();
            setSavedMessage("Draft saved.");
        } catch (err: any) {
            console.error("save work report draft error:", err);
            setError(err?.message ?? "Error saving Work Report draft.");
        } finally {
            setSaving(false);
        }
    }

    async function saveAndPreview() {
        setSaving(true);
        setError(null);
        setSavedMessage(null);

        try {
            await persistDraft();
            router.push(reportPreviewHref);
        } catch (err: any) {
            console.error("save and preview work report error:", err);
            setError(err?.message ?? "Error saving Work Report before preview.");
            setSaving(false);
        }
    }
    function goBackToWorkOrder() {
        if (hasUnsavedChanges) {
            const confirmed = window.confirm(
                "You have unsaved changes. If you leave now, your changes will be lost. Do you want to leave without saving?"
            );

            if (!confirmed) return;
        }

        router.push(backHref);
    }
    return (
        <main
            style={{
                minHeight: "100vh",
                background: MR_THEME.colors.appBg,
                padding: "22px 16px 40px",
            }}
        >
            <div
                style={{
                    maxWidth: 980,
                    margin: "0 auto",
                    display: "grid",
                    gap: 18,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 14,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                    }}
                >
                    <div>
                        <button
                            type="button"
                            onClick={goBackToWorkOrder}
                            style={{
                                border: "none",
                                background: "transparent",
                                color: MR_THEME.colors.textSecondary,
                                fontSize: 13,
                                fontWeight: 800,
                                textDecoration: "none",
                                cursor: "pointer",
                                padding: 0,
                            }}
                        >
                            ← Back to Work Order
                        </button>

                        <div
                            style={{
                                marginTop: 12,
                                fontSize: 12,
                                fontWeight: 850,
                                color: MR_THEME.colors.textMuted,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                            }}
                        >
                            Professional Work Report
                        </div>

                        <h1
                            style={{
                                margin: "4px 0 0",
                                color: MR_THEME.colors.textPrimary,
                                fontSize: 28,
                                letterSpacing: "-0.04em",
                            }}
                        >
                            Edit Work Completion Report
                        </h1>

                        <p
                            style={{
                                margin: "6px 0 0",
                                color: MR_THEME.colors.textSecondary,
                                fontSize: 14,
                                lineHeight: 1.5,
                                maxWidth: 680,
                            }}
                        >
                            Prepare the customer-facing version of the report.
                            Technician notes remain internal to the Work Order.
                        </p>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                        }}
                    >
                        <button
                            type="button"
                            onClick={saveAndPreview}
                            disabled={saving || loading || !!error || !workOrder}
                            style={{
                                minHeight: 40,
                                padding: "0 14px",
                                borderRadius: 12,
                                border: `1px solid ${MR_THEME.colors.border}`,
                                background: "#ffffff",
                                color: MR_THEME.colors.textPrimary,
                                fontSize: 13,
                                fontWeight: 850,
                                cursor:
                                    saving || loading || !!error || !workOrder
                                        ? "not-allowed"
                                        : "pointer",
                                opacity:
                                    saving || loading || !!error || !workOrder
                                        ? 0.65
                                        : 1,
                            }}
                        >
                            Save & Preview
                        </button>

                        <button
                            type="button"
                            onClick={saveDraft}
                            disabled={saving || loading || !!error || !workOrder}
                            style={{
                                minHeight: 40,
                                padding: "0 14px",
                                borderRadius: 12,
                                border: "none",
                                background: MR_THEME.colors.primary,
                                color: "#ffffff",
                                fontSize: 13,
                                fontWeight: 850,
                                cursor:
                                    saving || loading || !!error || !workOrder
                                        ? "not-allowed"
                                        : "pointer",
                                opacity:
                                    saving || loading || !!error || !workOrder
                                        ? 0.65
                                        : 1,
                            }}
                        >
                            {saving ? "Saving..." : "Save Draft"}
                        </button>
                    </div>
                </div>

                {workOrder ? (
                    <section
                        style={{
                            border: `1px solid ${MR_THEME.colors.border}`,
                            background: "#ffffff",
                            borderRadius: 18,
                            padding: 16,
                            display: "grid",
                            gap: 8,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 850,
                                color: MR_THEME.colors.textMuted,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                            }}
                        >
                            {displayWorkOrderNumber(workOrder)}
                        </div>

                        <div
                            style={{
                                fontSize: 17,
                                fontWeight: 850,
                                color: MR_THEME.colors.textPrimary,
                            }}
                        >
                            {workOrder.customer_name || "Customer"}
                        </div>

                        <div
                            style={{
                                color: MR_THEME.colors.textSecondary,
                                fontSize: 13,
                            }}
                        >
                            {workOrder.service_address || "No service address"}
                        </div>
                    </section>
                ) : null}

                {loading ? (
                    <section
                        style={{
                            border: `1px solid ${MR_THEME.colors.border}`,
                            background: "#ffffff",
                            borderRadius: 18,
                            padding: 18,
                            color: MR_THEME.colors.textSecondary,
                            fontSize: 14,
                        }}
                    >
                        Loading Work Report...
                    </section>
                ) : null}

                {error ? (
                    <section
                        style={{
                            border: "1px solid #fecaca",
                            background: "#fff1f2",
                            color: "#991b1b",
                            borderRadius: 18,
                            padding: 16,
                            fontSize: 14,
                            fontWeight: 750,
                        }}
                    >
                        {error}
                    </section>
                ) : null}

                {savedMessage ? (
                    <section
                        style={{
                            border: "1px solid #bbf7d0",
                            background: "#f0fdf4",
                            color: "#166534",
                            borderRadius: 18,
                            padding: 14,
                            fontSize: 14,
                            fontWeight: 800,
                        }}
                    >
                        {savedMessage}
                    </section>
                ) : null}

                {!loading && !error && workOrder ? (
                    <section
                        style={{
                            border: `1px solid ${MR_THEME.colors.border}`,
                            background: "#ffffff",
                            borderRadius: 22,
                            padding: 18,
                            display: "grid",
                            gap: 16,
                            boxShadow: "0 14px 32px rgba(15, 23, 42, 0.05)",
                        }}
                    >
                        <label style={{ display: "grid", gap: 7 }}>
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 850,
                                    color: MR_THEME.colors.textPrimary,
                                }}
                            >
                                Work completed summary
                            </span>
                            <textarea
                                value={draft.work_completed_summary}
                                onChange={(e) =>
                                    updateDraft(
                                        "work_completed_summary",
                                        e.target.value
                                    )
                                }
                                placeholder="Example: The assigned technician completed the requested repairs and documented the work with photo evidence."
                                rows={5}
                                style={textareaStyle}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 7 }}>
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 850,
                                    color: MR_THEME.colors.textPrimary,
                                }}
                            >
                                Recommendations / issues found
                            </span>
                            <textarea
                                value={draft.recommendations}
                                onChange={(e) =>
                                    updateDraft("recommendations", e.target.value)
                                }
                                placeholder="Example: No additional issues were reported at the time of service."
                                rows={5}
                                style={textareaStyle}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 7 }}>
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 850,
                                    color: MR_THEME.colors.textPrimary,
                                }}
                            >
                                Customer-facing note
                            </span>
                            <textarea
                                value={draft.customer_facing_note}
                                onChange={(e) =>
                                    updateDraft(
                                        "customer_facing_note",
                                        e.target.value
                                    )
                                }
                                placeholder="Optional note visible to the customer."
                                rows={4}
                                style={textareaStyle}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 7 }}>
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 850,
                                    color: MR_THEME.colors.textPrimary,
                                }}
                            >
                                Completion statement
                            </span>
                            <textarea
                                value={draft.completion_statement}
                                onChange={(e) =>
                                    updateDraft(
                                        "completion_statement",
                                        e.target.value
                                    )
                                }
                                placeholder="Example: This report summarizes the work completed and the supporting visual evidence collected during the service visit."
                                rows={4}
                                style={textareaStyle}
                            />
                        </label>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 10,
                                flexWrap: "wrap",
                                paddingTop: 4,
                            }}
                        >
                            <button
                                type="button"
                                onClick={goBackToWorkOrder}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minHeight: 40,
                                    padding: "0 14px",
                                    borderRadius: 12,
                                    border: `1px solid ${MR_THEME.colors.border}`,
                                    background: "#ffffff",
                                    color: MR_THEME.colors.textPrimary,
                                    fontSize: 13,
                                    fontWeight: 850,
                                    cursor: "pointer",
                                }}
                            >
                                Back to Work Order
                            </button>

                            <button
                                type="button"
                                onClick={saveAndPreview}
                                disabled={saving}
                                style={{
                                    minHeight: 40,
                                    padding: "0 14px",
                                    borderRadius: 12,
                                    border: `1px solid ${MR_THEME.colors.border}`,
                                    background: "#ffffff",
                                    color: MR_THEME.colors.textPrimary,
                                    fontSize: 13,
                                    fontWeight: 850,
                                    cursor: saving ? "not-allowed" : "pointer",
                                    opacity: saving ? 0.65 : 1,
                                }}
                            >
                                Save & Preview
                            </button>

                            <button
                                type="button"
                                onClick={saveDraft}
                                disabled={saving}
                                style={{
                                    minHeight: 40,
                                    padding: "0 14px",
                                    borderRadius: 12,
                                    border: "none",
                                    background: MR_THEME.colors.primary,
                                    color: "#ffffff",
                                    fontSize: 13,
                                    fontWeight: 850,
                                    cursor: saving ? "not-allowed" : "pointer",
                                    opacity: saving ? 0.65 : 1,
                                }}
                            >
                                {saving ? "Saving..." : "Save Draft"}
                            </button>
                        </div>
                    </section>
                ) : null}
            </div>
        </main>
    );
}
const textareaStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 120,
    resize: "vertical",
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: 14,
    padding: "12px 13px",
    fontSize: 14,
    lineHeight: 1.5,
    color: MR_THEME.colors.textPrimary,
    background: "#ffffff",
    outline: "none",
};