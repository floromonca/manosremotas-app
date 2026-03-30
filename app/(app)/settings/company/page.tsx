"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { useAuthState } from "../../../../hooks/useAuthState";
import { useActiveCompany } from "../../../../hooks/useActiveCompany";

type CompanyForm = {
    company_name: string;
    company_email: string;
    company_phone: string;
    company_website: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    state_province: string;
    postal_code: string;
    country_code: string;
    currency_code: string;
    timezone: string;
    payment_terms_days: string;
};

const EMPTY_FORM: CompanyForm = {
    company_name: "",
    company_email: "",
    company_phone: "",
    company_website: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state_province: "",
    postal_code: "",
    country_code: "",
    currency_code: "",
    timezone: "",
    payment_terms_days: "30",
};

export default function ControlCenterCompanyPage() {
    const router = useRouter();

    const { user, authLoading } = useAuthState();
    const { companyId, companyName, isLoadingCompany } = useActiveCompany();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [okMsg, setOkMsg] = useState("");
    const [role, setRole] = useState<string | null>(null);
    const [form, setForm] = useState<CompanyForm>(EMPTY_FORM);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.replace("/auth");
            return;
        }

        if (isLoadingCompany) return;

        let cancelled = false;

        (async () => {
            setLoading(true);
            setErrorMsg("");
            setOkMsg("");

            try {
                if (!companyId) {
                    setErrorMsg("No company selected.");
                    setForm(EMPTY_FORM);
                    return;
                }

                const { data: member, error: memberErr } = await supabase
                    .from("company_members")
                    .select("role")
                    .eq("company_id", companyId)
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (memberErr) throw memberErr;

                const currentRole = (member as any)?.role ?? null;
                setRole(currentRole);

                if (!currentRole || !["owner", "admin"].includes(currentRole)) {
                    setErrorMsg("Access denied. Only owner/admin can edit company settings.");
                    return;
                }

                const { data, error } = await supabase
                    .from("companies")
                    .select(
                        `
            company_name,
            company_email,
            company_phone,
            company_website,
            address_line_1,
            address_line_2,
            city,
            state_province,
            postal_code,
            country_code,
            currency_code,
            timezone,
            payment_terms_days
          `,
                    )
                    .eq("company_id", companyId)
                    .maybeSingle();

                if (error) throw error;

                const row = (data as Partial<CompanyForm> & { payment_terms_days?: number | null } | null) ?? {};

                if (!cancelled) {
                    setForm({
                        company_name: row.company_name ?? "",
                        company_email: row.company_email ?? "",
                        company_phone: row.company_phone ?? "",
                        company_website: row.company_website ?? "",
                        address_line_1: row.address_line_1 ?? "",
                        address_line_2: row.address_line_2 ?? "",
                        city: row.city ?? "",
                        state_province: row.state_province ?? "",
                        postal_code: row.postal_code ?? "",
                        country_code: row.country_code ?? "",
                        currency_code: row.currency_code ?? "CAD",
                        timezone: row.timezone ?? "America/Toronto",
                        payment_terms_days: String(row.payment_terms_days ?? 30),
                    });
                }
            } catch (e: any) {
                if (!cancelled) setErrorMsg(e?.message ?? String(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [authLoading, user?.id, isLoadingCompany, companyId, router, user]);

    const setField = (key: keyof CompanyForm, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!companyId) {
            setErrorMsg("No company selected.");
            return;
        }

        if (!role || !["owner", "admin"].includes(role)) {
            setErrorMsg("Access denied.");
            return;
        }

        if (!form.company_name.trim()) {
            setErrorMsg("Company Name is required.");
            return;
        }

        if (!form.country_code.trim()) {
            setErrorMsg("Country is required.");
            return;
        }

        if (!form.currency_code.trim()) {
            setErrorMsg("Currency is required.");
            return;
        }

        if (!form.timezone.trim()) {
            setErrorMsg("Timezone is required.");
            return;
        }

        const paymentTermsDays = Number(form.payment_terms_days);

        if (!Number.isInteger(paymentTermsDays) || paymentTermsDays < 0) {
            setErrorMsg("Payment Terms must be a whole number greater than or equal to 0.");
            return;
        }

        setSaving(true);
        setErrorMsg("");
        setOkMsg("");

        try {
            const payload = {
                company_name: form.company_name.trim(),
                company_email: form.company_email.trim() || null,
                company_phone: form.company_phone.trim() || null,
                company_website: form.company_website.trim() || null,
                address_line_1: form.address_line_1.trim() || null,
                address_line_2: form.address_line_2.trim() || null,
                city: form.city.trim() || null,
                state_province: form.state_province.trim() || null,
                postal_code: form.postal_code.trim() || null,
                country_code: form.country_code.trim(),
                currency_code: form.currency_code.trim(),
                timezone: form.timezone.trim(),
                payment_terms_days: paymentTermsDays,
            };

            const { error } = await supabase
                .from("companies")
                .update(payload)
                .eq("company_id", companyId);

            if (error) throw error;

            setOkMsg("Changes saved successfully.");
            setForm((prev) => ({
                ...prev,
                payment_terms_days: String(paymentTermsDays),
            }));
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
                    Settings / Company
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
                    {companyName && companyName.trim() ? companyName : "Company"}
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
                    Manage your business identity, address, currency, timezone, and default payment terms.
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

            {loading ? (
                <div
                    style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        background: "#fff",
                        padding: 20,
                        color: "#6b7280",
                    }}
                >
                    Loading company settings...
                </div>
            ) : role && !["owner", "admin"].includes(role) ? (
                <div
                    style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        background: "#fff",
                        padding: 20,
                        color: "#6b7280",
                    }}
                >
                    Access denied.
                </div>
            ) : (
                <div style={{ display: "grid", gap: 20 }}>
                    <SectionCard
                        title="Company Information"
                        description="Basic business identity and public contact details."
                    >
                        <TwoColumnGrid>
                            <Field
                                label="Company Name"
                                value={form.company_name}
                                onChange={(v) => setField("company_name", v)}
                            />
                            <Field
                                label="Email"
                                value={form.company_email}
                                onChange={(v) => setField("company_email", v)}
                            />
                            <Field
                                label="Phone"
                                value={form.company_phone}
                                onChange={(v) => setField("company_phone", v)}
                            />
                            <Field
                                label="Website"
                                value={form.company_website}
                                onChange={(v) => setField("company_website", v)}
                            />
                        </TwoColumnGrid>
                    </SectionCard>

                    <SectionCard
                        title="Address"
                        description="Company location used for documents, identity, and regional defaults."
                    >
                        <TwoColumnGrid>
                            <Field
                                label="Address Line 1"
                                value={form.address_line_1}
                                onChange={(v) => setField("address_line_1", v)}
                            />
                            <Field
                                label="Address Line 2"
                                value={form.address_line_2}
                                onChange={(v) => setField("address_line_2", v)}
                            />
                            <Field
                                label="City"
                                value={form.city}
                                onChange={(v) => setField("city", v)}
                            />
                            <Field
                                label="State / Province"
                                value={form.state_province}
                                onChange={(v) => setField("state_province", v)}
                            />
                            <Field
                                label="Postal Code"
                                value={form.postal_code}
                                onChange={(v) => setField("postal_code", v)}
                            />
                            <Field
                                label="Country"
                                value={form.country_code}
                                onChange={(v) => setField("country_code", v)}
                            />
                        </TwoColumnGrid>
                    </SectionCard>

                    <SectionCard
                        title="Regional Settings"
                        description="Defaults used for invoices, work orders, and company-level behavior."
                    >
                        <TwoColumnGrid>
                            <SelectField
                                label="Currency"
                                helper="Default currency used for invoices."
                                value={form.currency_code}
                                onChange={(v) => setField("currency_code", v)}
                                options={[
                                    { value: "CAD", label: "Canadian Dollar (CAD)" },
                                    { value: "USD", label: "US Dollar (USD)" },
                                    { value: "COP", label: "Colombian Peso (COP)" },
                                ]}
                            />

                            <SelectField
                                label="Timezone"
                                helper="Used for invoices, work orders, and reports."
                                value={form.timezone}
                                onChange={(v) => setField("timezone", v)}
                                options={[
                                    { value: "America/Toronto", label: "Toronto (Canada Eastern Time)" },
                                    { value: "America/New_York", label: "New York (US Eastern Time)" },
                                    { value: "America/Bogota", label: "Bogotá (Colombia Time)" },
                                ]}
                            />

                            <Field
                                label="Payment Terms (days)"
                                type="number"
                                min={0}
                                step={1}
                                value={form.payment_terms_days}
                                onChange={(v) => setField("payment_terms_days", v)}
                                helper="Default number of days used to calculate invoice due date."
                            />
                        </TwoColumnGrid>
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
                            Save your company defaults before moving to Billing, Taxes, or Preferences.
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
            )}
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

function SelectField({
    label,
    value,
    onChange,
    helper,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    helper?: string;
    options: { value: string; label: string }[];
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

            <select
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
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>

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