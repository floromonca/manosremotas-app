"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { useActiveCompany } from "../../../../hooks/useActiveCompany";

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

export default function BillingSettingsPage() {
    const { companyId, companyName } = useActiveCompany();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [okMsg, setOkMsg] = useState("");
    const [settings, setSettings] = useState<BillingSettings>(DEFAULT_SETTINGS);

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
                payment_terms_days: settings.payment_terms_days,
                invoice_prefix: settings.invoice_prefix.trim() || "INV-",
                work_order_prefix: settings.work_order_prefix.trim() || "WO-",
                payment_instructions: settings.payment_instructions.trim() || null,
                invoice_footer_note: settings.invoice_footer_note.trim() || null,
            };

            const { error } = await supabase
                .from("company_settings")
                .update(payload)
                .eq("company_id", companyId);

            if (error) throw error;

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
                    maxWidth: 1040,
                    padding: "6px 0 32px 0",
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
                maxWidth: 1040,
                padding: "6px 0 32px 0",
            }}
        >
            <div style={{ marginBottom: 22 }}>
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#6b7280",
                        marginBottom: 10,
                    }}
                >
                    Settings / Billing
                </div>

                <h1
                    style={{
                        fontSize: 40,
                        lineHeight: 1.08,
                        fontWeight: 750,
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
                        alignItems: "center",
                        gap: 16,
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        background: "#ffffff",
                        padding: 16,
                    }}
                >
                    <div
                        style={{
                            fontSize: 14,
                            color: "#6b7280",
                            lineHeight: 1.5,
                        }}
                    >
                        Save your billing defaults before configuring taxes or invoice presentation.
                    </div>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            height: 42,
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