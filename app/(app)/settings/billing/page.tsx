"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { useActiveCompany } from "../../../../hooks/useActiveCompany";
import { getPlanConfig } from "@/lib/features/entitlements";

type BillingSettings = {
    payment_terms_days: number;
    invoice_prefix: string;
    work_order_prefix: string;
    payment_instructions: string;
    invoice_footer_note: string;
};

const DEFAULT_SETTINGS: BillingSettings = {
    payment_terms_days: 30,
    invoice_prefix: "INV-",
    work_order_prefix: "WO-",
    payment_instructions: "",
    invoice_footer_note: "",
};

const normalizeLegacyPrefix = (value: string, fallback: string) => {
    const normalized = (value.trim() || fallback).replace(/[-\s]+$/g, "");
    return normalized || fallback.replace(/[-\s]+$/g, "");
};

export default function BillingSettingsPage() {
    const { companyId, companyName, companyPlan } = useActiveCompany();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [okMsg, setOkMsg] = useState("");
    const [settings, setSettings] = useState<BillingSettings>(DEFAULT_SETTINGS);
    const currentPlan = getPlanConfig(companyPlan);

    useEffect(() => {
        if (!companyId) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const loadSettings = async () => {
            setLoading(true);
            setErrorMsg("");
            setOkMsg("");

            try {
                const { data, error } = await supabase
                    .from("company_settings")
                    .select(
                        `
                        payment_terms_days,
                        invoice_prefix,
                        work_order_prefix,
                        payment_instructions,
                        invoice_footer_note
                        `,
                    )
                    .eq("company_id", companyId)
                    .maybeSingle();

                if (error) throw error;

                if (!cancelled) {
                    setSettings({
                        payment_terms_days: data?.payment_terms_days ?? 30,
                        invoice_prefix: data?.invoice_prefix ?? "INV-",
                        work_order_prefix: data?.work_order_prefix ?? "WO-",
                        payment_instructions: data?.payment_instructions ?? "",
                        invoice_footer_note: data?.invoice_footer_note ?? "",
                    });
                }
            } catch (e: any) {
                if (!cancelled) {
                    setErrorMsg(e?.message ?? String(e));
                    setSettings(DEFAULT_SETTINGS);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadSettings();

        return () => {
            cancelled = true;
        };
    }, [companyId]);

    const handleSave = async () => {
        if (!companyId) {
            setErrorMsg("No company selected.");
            return;
        }

        if (!Number.isInteger(settings.payment_terms_days) || settings.payment_terms_days < 0) {
            setErrorMsg("Payment Terms must be a whole number greater than or equal to 0.");
            return;
        }

        setSaving(true);
        setErrorMsg("");
        setOkMsg("");

        try {
            const payload = {
                company_id: companyId,
                payment_terms_days: settings.payment_terms_days,
                invoice_prefix: settings.invoice_prefix.trim() || "INV-",
                work_order_prefix: settings.work_order_prefix.trim() || "WO-",
                payment_instructions: settings.payment_instructions.trim() || null,
                invoice_footer_note: settings.invoice_footer_note.trim() || null,
            };

            const { error } = await supabase
                .from("company_settings")
                .upsert(payload, { onConflict: "company_id" });

            if (error) throw error;

            const { error: companyError } = await supabase
                .from("companies")
                .update({
                    payment_terms_days: settings.payment_terms_days,
                    invoice_prefix: normalizeLegacyPrefix(settings.invoice_prefix, "INV-"),
                    work_order_prefix: normalizeLegacyPrefix(settings.work_order_prefix, "WO-"),
                })
                .eq("company_id", companyId);

            if (companyError) throw companyError;

            setSettings((prev) => ({
                ...prev,
                invoice_prefix: prev.invoice_prefix.trim() || "INV-",
                work_order_prefix: prev.work_order_prefix.trim() || "WO-",
                payment_instructions: prev.payment_instructions.trim(),
                invoice_footer_note: prev.invoice_footer_note.trim(),
            }));

            setOkMsg("Billing settings saved successfully.");
        } catch (e: any) {
            setErrorMsg(e?.message ?? String(e));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div
                style={{
                    width: "100%",
                    maxWidth: 1180,
                    margin: "0 auto",
                    padding: "8px 0 32px 0",
                }}
            >
                <div
                    style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        background: "#fff",
                        padding: 20,
                        color: "#6b7280",
                    }}
                >
                    Loading billing settings...
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 1180,
                margin: "0 auto",
                padding: "8px 0 32px 0",
            }}
        >
            <div
                style={{
                    marginBottom: 22,
                    paddingBottom: 16,
                    borderBottom: "1px solid #e5e7eb",
                }}
            >
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#6b7280",
                        marginBottom: 10,
                    }}
                >
                    Settings / Billing
                </div>

                <h1
                    style={{
                        fontSize: 40,
                        lineHeight: 1.05,
                        fontWeight: 800,
                        letterSpacing: "-0.03em",
                        color: "#111827",
                        margin: 0,
                    }}
                >
                    Billing
                </h1>

                <div
                    style={{
                        marginTop: 10,
                        fontSize: 16,
                        color: "#6b7280",
                        lineHeight: 1.6,
                        maxWidth: 760,
                    }}
                >
                    Configure invoice defaults, numbering behavior, payment terms, and billing notes
                    for {companyName?.trim() ? companyName : "your company"}.
                </div>
            </div>

            {errorMsg ? (
                <div
                    style={{
                        marginBottom: 18,
                        padding: "12px 14px",
                        border: "1px solid #fecaca",
                        background: "#fff5f5",
                        borderRadius: 12,
                        color: "#991b1b",
                        fontSize: 14,
                    }}
                >
                    <strong>Error:</strong> {errorMsg}
                </div>
            ) : null}

            {okMsg ? (
                <div
                    style={{
                        marginBottom: 18,
                        padding: "12px 14px",
                        border: "1px solid #bbf7d0",
                        background: "#f0fdf4",
                        borderRadius: 12,
                        color: "#166534",
                        fontSize: 14,
                    }}
                >
                    {okMsg}
                </div>
            ) : null}

            <div style={{ display: "grid", gap: 20 }}>
                <SectionCard
                    title="Current Plan"
                    description="Subscription plan and included limits for this company."
                >
                    <div
                        style={{
                            display: "grid",
                            gap: 12,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 24,
                                fontWeight: 800,
                                color: "#111827",
                            }}
                        >
                            {currentPlan.name}
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                                gap: 12,
                            }}
                        >
                            <PlanLimit label="Users included" value={currentPlan.usersIncluded} />
                            <PlanLimit label="Photos per Work Order" value={currentPlan.maxPhotosPerWorkOrder} />
                            <PlanLimit label="Storage included" value={`${currentPlan.storageGb} GB`} />
                            <PlanLimit label="Monthly price" value={`$${currentPlan.monthlyPrice} USD`} />
                        </div>
                    </div>
                </SectionCard>
                <SectionCard
                    title="Plan Features"
                    description="See what is included in each plan and which operational tools can be unlocked as the company grows."
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                            gap: 14,
                        }}
                    >
                        {[
                            {
                                key: "starter",
                                name: "Starter Trial",
                                price: "$0 USD / month",
                                badge: "Current foundation",
                                features: [
                                    "Work Orders",
                                    "Customers",
                                    "My Day",
                                    "Team basics",
                                    "Invoicing during trial",
                                    "3 photos per Work Order",
                                    "1 GB storage included",
                                ],
                            },
                            {
                                key: "pro",
                                name: "Pro",
                                price: "$49 USD / month",
                                badge: "For growing teams",
                                features: [
                                    "Everything in Starter",
                                    "Service Catalog",
                                    "CSV service import",
                                    "Reusable service pricing",
                                    "6 photos per Work Order",
                                    "5 GB storage included",
                                ],
                            },
                            {
                                key: "business",
                                name: "Business",
                                price: "$129 USD / month",
                                badge: "Best for operations",
                                features: [
                                    "Everything in Pro",
                                    "Professional Work Reports™",
                                    "PDF work completion reports",
                                    "Payroll visibility",
                                    "20 photos per Work Order",
                                    "15 GB storage included",
                                    "Advanced operational reporting",
                                ],
                            },
                        ].map((plan) => {
                            const isCurrent = plan.key === currentPlan.key;

                            return (
                                <article
                                    key={plan.key}
                                    style={{
                                        border: isCurrent
                                            ? "1px solid #2563eb"
                                            : "1px solid #e5e7eb",
                                        borderRadius: 16,
                                        background: isCurrent
                                            ? "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)"
                                            : "#ffffff",
                                        padding: 16,
                                        boxShadow: isCurrent
                                            ? "0 10px 24px rgba(37, 99, 235, 0.12)"
                                            : "0 1px 2px rgba(16,24,40,0.04)",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            gap: 10,
                                            marginBottom: 10,
                                        }}
                                    >
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: 18,
                                                    fontWeight: 900,
                                                    color: "#111827",
                                                    letterSpacing: "-0.02em",
                                                }}
                                            >
                                                {plan.name}
                                            </div>

                                            <div
                                                style={{
                                                    marginTop: 4,
                                                    fontSize: 14,
                                                    fontWeight: 800,
                                                    color: "#2563eb",
                                                }}
                                            >
                                                {plan.price}
                                            </div>
                                        </div>

                                        <span
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                minHeight: 28,
                                                padding: "0 10px",
                                                borderRadius: 999,
                                                background: isCurrent ? "#2563eb" : "#eff6ff",
                                                color: isCurrent ? "#ffffff" : "#2563eb",
                                                fontSize: 11,
                                                fontWeight: 850,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {isCurrent ? "Current plan" : plan.badge}
                                        </span>
                                    </div>

                                    <ul
                                        style={{
                                            margin: 0,
                                            padding: 0,
                                            listStyle: "none",
                                            display: "grid",
                                            gap: 8,
                                        }}
                                    >
                                        {plan.features.map((feature) => (
                                            <li
                                                key={feature}
                                                style={{
                                                    display: "flex",
                                                    gap: 8,
                                                    alignItems: "flex-start",
                                                    color: "#475569",
                                                    fontSize: 13,
                                                    lineHeight: 1.45,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        color: "#16a34a",
                                                        fontWeight: 900,
                                                    }}
                                                >
                                                    ✓
                                                </span>
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            );
                        })}
                    </div>

                    <div
                        style={{
                            marginTop: 14,
                            padding: "14px",
                            borderRadius: 14,
                            background: "#f8fafc",
                            border: "1px solid #e5e7eb",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 14,
                            flexWrap: "wrap",
                        }}
                    >
                        <div
                            style={{
                                color: "#475569",
                                fontSize: 13,
                                lineHeight: 1.5,
                                maxWidth: 720,
                            }}
                        >
                            <strong style={{ color: "#111827" }}>Need to upgrade?</strong>{" "}
                            Plan changes are managed by ManosRemotas support during this pilot stage.
                            Contact support when a company is ready to unlock Pro or Business features.
                        </div>

                        <a
                            href="mailto:flormonc@gmail.com?subject=ManosRemotas%20plan%20upgrade%20request"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: 40,
                                padding: "0 14px",
                                borderRadius: 12,
                                background: "#2563eb",
                                color: "#ffffff",
                                fontSize: 13,
                                fontWeight: 850,
                                textDecoration: "none",
                                whiteSpace: "nowrap",
                                boxShadow: "0 8px 18px rgba(37, 99, 235, 0.18)",
                            }}
                        >
                            Request plan upgrade
                        </a>
                    </div>
                </SectionCard>
                <SectionCard
                    title="Numbering & Defaults"
                    description="Core defaults used when creating invoices and work orders."
                >
                    <TwoColumnGrid>
                        <Field
                            label="Invoice Prefix"
                            value={settings.invoice_prefix}
                            onChange={(value) =>
                                setSettings((prev) => ({ ...prev, invoice_prefix: value }))
                            }
                            helper="Prefix used when generating invoice numbers."
                        />

                        <Field
                            label="Work Order Prefix"
                            value={settings.work_order_prefix}
                            onChange={(value) =>
                                setSettings((prev) => ({ ...prev, work_order_prefix: value }))
                            }
                            helper="Prefix used when generating work order numbers."
                        />

                        <Field
                            label="Payment Terms (days)"
                            type="number"
                            min={0}
                            step={1}
                            value={String(settings.payment_terms_days)}
                            onChange={(value) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    payment_terms_days: Number(value || 0),
                                }))
                            }
                            helper="Default number of days used to calculate invoice due date."
                        />
                    </TwoColumnGrid>
                </SectionCard>

                <SectionCard
                    title="Payment Instructions"
                    description="Message shown to customers with payment guidance or bank details."
                >
                    <TextAreaField
                        label="Payment Instructions"
                        value={settings.payment_instructions}
                        onChange={(value) =>
                            setSettings((prev) => ({
                                ...prev,
                                payment_instructions: value,
                            }))
                        }
                        helper="Example: e-transfer details, bank transfer information, or payment contact instructions."
                    />
                </SectionCard>

                <SectionCard
                    title="Invoice Footer"
                    description="Default note shown near the bottom of invoices."
                >
                    <TextAreaField
                        label="Invoice Footer Note"
                        value={settings.invoice_footer_note}
                        onChange={(value) =>
                            setSettings((prev) => ({
                                ...prev,
                                invoice_footer_note: value,
                            }))
                        }
                        helper="Example: thank-you note, legal reminder, or service terms summary."
                    />
                </SectionCard>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 18,
                        flexWrap: "wrap",
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        background: "linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)",
                        padding: 18,
                        boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                    }}
                >
                    <div style={{ minWidth: 260, flex: 1 }}>
                        <div
                            style={{
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                color: "#64748b",
                                fontWeight: 800,
                                marginBottom: 8,
                            }}
                        >
                            Save billing settings
                        </div>

                        <div
                            style={{
                                fontSize: 20,
                                fontWeight: 800,
                                lineHeight: 1.15,
                                color: "#111827",
                                letterSpacing: "-0.02em",
                                marginBottom: 8,
                            }}
                        >
                            Apply your billing defaults
                        </div>

                        <div
                            style={{
                                fontSize: 14,
                                color: "#6b7280",
                                lineHeight: 1.6,
                                maxWidth: 720,
                            }}
                        >
                            Save your numbering rules, payment terms, instructions, and invoice footer before configuring taxes or invoice presentation.
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                        }}
                    >
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "8px 12px",
                                borderRadius: 999,
                                border: "1px solid #dbe3ef",
                                background: "#f8fafc",
                                color: "#334155",
                                fontSize: 13,
                                fontWeight: 800,
                                whiteSpace: "nowrap",
                            }}
                        >
                            Billing defaults
                        </div>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                height: 44,
                                padding: "0 18px",
                                borderRadius: 10,
                                border: "1px solid #d1d5db",
                                background: saving ? "#f3f4f6" : "#111827",
                                color: saving ? "#6b7280" : "#ffffff",
                                cursor: saving ? "not-allowed" : "pointer",
                                fontWeight: 700,
                                fontSize: 14,
                                boxShadow: saving ? "none" : "0 1px 2px rgba(0,0,0,0.06)",
                            }}
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
function PlanLimit({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: "12px 14px",
                background: "#f9fafb",
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 6,
                }}
            >
                {label}
            </div>

            <div
                style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#111827",
                }}
            >
                {value}
            </div>
        </div>
    );
}
function SectionCard({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background: "#ffffff",
                padding: 22,
                boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
            }}
        >
            <div style={{ marginBottom: 18 }}>
                <div
                    style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#111827",
                        marginBottom: description ? 6 : 0,
                        letterSpacing: "-0.02em",
                    }}
                >
                    {title}
                </div>

                {description ? (
                    <div
                        style={{
                            fontSize: 14,
                            color: "#6b7280",
                            lineHeight: 1.55,
                        }}
                    >
                        {description}
                    </div>
                ) : null}
            </div>

            {children}
        </section>
    );
}

function TwoColumnGrid({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 16,
            }}
        >
            {children}
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    helper,
    type = "text",
    min,
    step,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    helper?: string;
    type?: string;
    min?: number;
    step?: number;
}) {
    return (
        <label style={{ display: "grid", gap: 8 }}>
            <span
                style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#374151",
                }}
            >
                {label}
            </span>

            <input
                type={type}
                min={min}
                step={step}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    height: 44,
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    padding: "0 14px",
                    outline: "none",
                    background: "#ffffff",
                    fontSize: 14,
                    color: "#111827",
                }}
            />

            {helper ? (
                <span
                    style={{
                        fontSize: 12,
                        color: "#6b7280",
                        lineHeight: 1.45,
                    }}
                >
                    {helper}
                </span>
            ) : null}
        </label>
    );
}

function TextAreaField({
    label,
    value,
    onChange,
    helper,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    helper?: string;
}) {
    return (
        <label style={{ display: "grid", gap: 8 }}>
            <span
                style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#374151",
                }}
            >
                {label}
            </span>

            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    minHeight: 120,
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    padding: "12px 14px",
                    outline: "none",
                    background: "#ffffff",
                    fontSize: 14,
                    color: "#111827",
                    lineHeight: 1.5,
                    resize: "vertical",
                    width: "100%",
                }}
            />

            {helper ? (
                <span
                    style={{
                        fontSize: 12,
                        color: "#6b7280",
                        lineHeight: 1.45,
                    }}
                >
                    {helper}
                </span>
            ) : null}
        </label>
    );
}
