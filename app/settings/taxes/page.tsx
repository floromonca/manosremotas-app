"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useActiveCompany } from "../../../hooks/useActiveCompany";

type Tax = {
    tax_profile_id: string;
    company_id: string;
    tax_name: string;
    rate: number;
    is_default: boolean;
};

export default function TaxesPage() {
    const { companyId, companyName } = useActiveCompany();

    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [taxName, setTaxName] = useState("");
    const [taxRate, setTaxRate] = useState("");
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [okMsg, setOkMsg] = useState("");

    const loadTaxes = async () => {
        if (!companyId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorMsg("");

        try {
            const { data, error } = await supabase
                .from("tax_profiles")
                .select("tax_profile_id, company_id, tax_name, rate, is_default")
                .eq("company_id", companyId)
                .order("tax_name");

            if (error) throw error;

            setTaxes((data as Tax[]) ?? []);
        } catch (e: any) {
            setErrorMsg(e?.message ?? String(e));
            setTaxes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!companyId) return;
        loadTaxes();
    }, [companyId]);

    const resetForm = () => {
        setTaxName("");
        setTaxRate("");
    };

    const handleSave = async () => {
        if (!companyId) {
            setErrorMsg("No company selected.");
            return;
        }

        const cleanName = taxName.trim();
        const parsedRate = Number(taxRate);

        if (!cleanName) {
            setErrorMsg("Tax Name is required.");
            return;
        }

        if (Number.isNaN(parsedRate)) {
            setErrorMsg("Rate must be a valid number.");
            return;
        }

        if (parsedRate < 0) {
            setErrorMsg("Rate cannot be negative.");
            return;
        }

        setSaving(true);
        setErrorMsg("");
        setOkMsg("");

        try {
            const isFirstTax = taxes.length === 0;

            const { error } = await supabase.from("tax_profiles").insert({
                company_id: companyId,
                tax_name: cleanName,
                rate: parsedRate,
                is_default: isFirstTax,
            });

            if (error) throw error;

            resetForm();
            setShowForm(false);
            setOkMsg("Tax created successfully.");

            await loadTaxes();
        } catch (e: any) {
            setErrorMsg(e?.message ?? String(e));
        } finally {
            setSaving(false);
        }
    };

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
                    Settings / Taxes
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
                    Taxes
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
                    Manage the tax profiles used in invoices and services for{" "}
                    {companyName?.trim() ? companyName : "your company"}.
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
                    title="Tax Profiles"
                    description="Create and manage the tax rates available for billing. The first tax created is marked as the default."
                    action={
                        <button
                            type="button"
                            onClick={() => {
                                setShowForm((prev) => !prev);
                                setErrorMsg("");
                                setOkMsg("");
                            }}
                            style={{
                                height: 40,
                                padding: "0 14px",
                                borderRadius: 10,
                                border: "1px solid #d1d5db",
                                background: showForm ? "#f9fafb" : "#111827",
                                color: showForm ? "#111827" : "#ffffff",
                                cursor: "pointer",
                                fontWeight: 700,
                                fontSize: 14,
                            }}
                        >
                            {showForm ? "Close" : "Add Tax"}
                        </button>
                    }
                >
                    {showForm ? (
                        <div
                            style={{
                                marginBottom: 18,
                                border: "1px solid #e5e7eb",
                                borderRadius: 14,
                                background: "#f9fafb",
                                padding: 18,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 18,
                                    fontWeight: 700,
                                    color: "#111827",
                                    marginBottom: 6,
                                }}
                            >
                                New Tax
                            </div>

                            <div
                                style={{
                                    fontSize: 14,
                                    color: "#6b7280",
                                    lineHeight: 1.5,
                                    marginBottom: 16,
                                }}
                            >
                                Add a tax profile such as HST, GST, PST, or IVA.
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                    gap: 16,
                                }}
                            >
                                <Field
                                    label="Tax Name"
                                    value={taxName}
                                    onChange={setTaxName}
                                    placeholder="e.g. HST, GST, IVA"
                                />

                                <Field
                                    label="Rate %"
                                    value={taxRate}
                                    onChange={setTaxRate}
                                    placeholder="e.g. 13"
                                />
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    marginTop: 16,
                                }}
                            >
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
                                    }}
                                >
                                    {saving ? "Saving..." : "Save Tax"}
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {loading ? (
                        <EmptyStateBox message="Loading tax profiles..." />
                    ) : taxes.length === 0 ? (
                        <EmptyStateBox message="No taxes configured yet." />
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gap: 12,
                            }}
                        >
                            {taxes.map((tax) => (
                                <div
                                    key={tax.tax_profile_id}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
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
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                flexWrap: "wrap",
                                                marginBottom: 4,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: 16,
                                                    fontWeight: 700,
                                                    color: "#111827",
                                                }}
                                            >
                                                {tax.tax_name}
                                            </div>

                                            {tax.is_default ? (
                                                <span
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        padding: "4px 8px",
                                                        borderRadius: 999,
                                                        background: "#ecfdf3",
                                                        border: "1px solid #bbf7d0",
                                                        color: "#166534",
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    Default
                                                </span>
                                            ) : null}
                                        </div>

                                        <div
                                            style={{
                                                fontSize: 14,
                                                color: "#6b7280",
                                                lineHeight: 1.45,
                                            }}
                                        >
                                            Tax rate available for invoices and service items.
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            flexShrink: 0,
                                            fontSize: 24,
                                            fontWeight: 800,
                                            color: "#111827",
                                            letterSpacing: "-0.02em",
                                        }}
                                    >
                                        {tax.rate}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            </div>
        </div>
    );
}

function SectionCard({
    title,
    description,
    action,
    children,
}: {
    title: string;
    description?: string;
    action?: React.ReactNode;
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
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    marginBottom: 18,
                }}
            >
                <div>
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
                                maxWidth: 720,
                            }}
                        >
                            {description}
                        </div>
                    ) : null}
                </div>

                {action ? <div>{action}</div> : null}
            </div>

            {children}
        </section>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
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
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    height: 44,
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    padding: "0 14px",
                    outline: "none",
                    background: "#ffffff",
                    fontSize: 14,
                    color: "#111827",
                    width: "100%",
                }}
            />
        </label>
    );
}

function EmptyStateBox({ message }: { message: string }) {
    return (
        <div
            style={{
                border: "1px dashed #d1d5db",
                borderRadius: 14,
                background: "#fafafa",
                padding: 24,
                color: "#6b7280",
                fontSize: 14,
            }}
        >
            {message}
        </div>
    );
}