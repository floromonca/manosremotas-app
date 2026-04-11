"use client";

import React, { useState } from "react";

type PreferencesForm = {
    require_work_order_notes: boolean;
    show_customer_email_on_invoice: boolean;
    show_customer_phone_on_invoice: boolean;
    auto_open_pdf_after_generate: boolean;
    compact_invoice_view: boolean;
    enable_internal_reference_field: boolean;
};

const DEFAULT_PREFERENCES: PreferencesForm = {
    require_work_order_notes: false,
    show_customer_email_on_invoice: true,
    show_customer_phone_on_invoice: true,
    auto_open_pdf_after_generate: false,
    compact_invoice_view: false,
    enable_internal_reference_field: true,
};

export default function SettingsPreferencesPage() {
    const [form, setForm] = useState<PreferencesForm>(DEFAULT_PREFERENCES);
    const [okMsg, setOkMsg] = useState("");

    const setField = (key: keyof PreferencesForm, value: boolean) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setOkMsg("");
    };

    const handleSave = () => {
        setOkMsg("Preferences layout saved locally for now. Next step is connecting these options to company settings.");
    };

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
                    Settings / Preferences
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
                    Preferences
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
                    Configure operational defaults and interface behavior for your workspace.
                </div>
            </div>

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
                    title="Work Orders"
                    description="Preferences that affect execution flow and technician capture."
                >
                    <ToggleRow
                        title="Require internal notes on work orders"
                        description="Prompts the team to keep written internal context when closing or updating work."
                        checked={form.require_work_order_notes}
                        onChange={(value) => setField("require_work_order_notes", value)}
                    />

                    <ToggleRow
                        title="Enable internal reference field"
                        description="Keeps an internal-only reference field available for operational tracking."
                        checked={form.enable_internal_reference_field}
                        onChange={(value) => setField("enable_internal_reference_field", value)}
                    />
                </SectionCard>

                <SectionCard
                    title="Invoices"
                    description="Preferences that affect invoice presentation and customer-facing details."
                >
                    <ToggleRow
                        title="Show customer email on invoice"
                        description="Displays the customer email when available in the invoice view and output."
                        checked={form.show_customer_email_on_invoice}
                        onChange={(value) => setField("show_customer_email_on_invoice", value)}
                    />

                    <ToggleRow
                        title="Show customer phone on invoice"
                        description="Displays the customer phone number when available in the invoice view and output."
                        checked={form.show_customer_phone_on_invoice}
                        onChange={(value) => setField("show_customer_phone_on_invoice", value)}
                    />

                    <ToggleRow
                        title="Use compact invoice view"
                        description="Reduces visual spacing in invoice screens for denser operational review."
                        checked={form.compact_invoice_view}
                        onChange={(value) => setField("compact_invoice_view", value)}
                    />
                </SectionCard>

                <SectionCard
                    title="System Behavior"
                    description="Workspace-level interface preferences for daily operation."
                >
                    <ToggleRow
                        title="Open PDF automatically after generation"
                        description="Opens the generated invoice PDF immediately after creation when available."
                        checked={form.auto_open_pdf_after_generate}
                        onChange={(value) => setField("auto_open_pdf_after_generate", value)}
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
                            Save preferences
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
                            Apply workspace preferences
                        </div>

                        <div
                            style={{
                                fontSize: 14,
                                color: "#6b7280",
                                lineHeight: 1.6,
                                maxWidth: 720,
                            }}
                        >
                            Save operational and interface preferences for work orders, invoices, and system behavior. The next step for this module is persisting these options at company level.
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
                            Workspace defaults
                        </div>

                        <button
                            type="button"
                            onClick={handleSave}
                            style={{
                                height: 44,
                                padding: "0 18px",
                                borderRadius: 10,
                                border: "1px solid #d1d5db",
                                background: "#111827",
                                color: "#ffffff",
                                cursor: "pointer",
                                fontWeight: 700,
                                fontSize: 14,
                                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                            }}
                        >
                            Save Changes
                        </button>
                    </div>
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

            <div style={{ display: "grid", gap: 12 }}>{children}</div>
        </section>
    );
}

function ToggleRow({
    title,
    description,
    checked,
    onChange,
}: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                background: "#ffffff",
                padding: "16px 18px",
            }}
        >
            <div style={{ minWidth: 0 }}>
                <div
                    style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#111827",
                        marginBottom: 4,
                    }}
                >
                    {title}
                </div>

                <div
                    style={{
                        fontSize: 14,
                        color: "#6b7280",
                        lineHeight: 1.5,
                        maxWidth: 720,
                    }}
                >
                    {description}
                </div>
            </div>

            <label
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    flexShrink: 0,
                    cursor: "pointer",
                    userSelect: "none",
                }}
            >
                <span
                    style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: checked ? "#111827" : "#6b7280",
                    }}
                >
                    {checked ? "On" : "Off"}
                </span>

                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    style={{
                        width: 18,
                        height: 18,
                        cursor: "pointer",
                    }}
                />
            </label>
        </div>
    );
}