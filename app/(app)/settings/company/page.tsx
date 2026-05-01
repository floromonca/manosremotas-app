"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MR_THEME } from "@/lib/theme";
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
    const { companyId, companyName, myRole, isLoadingCompany, refreshCompany } = useActiveCompany();

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

        if (myRole !== "owner" && myRole !== "admin") {
            router.replace("/work-orders");
            return;
        }

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

                const row =
                    (data as Partial<CompanyForm> & { payment_terms_days?: number | null } | null) ??
                    {};

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
    }, [authLoading, user?.id, isLoadingCompany, companyId, myRole, router, user]);

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

            refreshCompany();
            router.refresh();
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
        <>
            <style jsx global>{`
                .mr-company-page {
                    width: 100%;
                    max-width: 1180px;
                    margin: 0 auto;
                    padding: 8px 0 32px;
                }

                .mr-company-header {
                    margin-bottom: 22px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid ${MR_THEME.colors.border};
                }

                .mr-company-title {
                    font-size: 40px;
                    line-height: 1.05;
                    font-weight: 800;
                    letter-spacing: -0.03em;
                    color: ${MR_THEME.colors.textPrimary};
                    margin: 0;
                }

                .mr-company-description {
                    margin-top: 10px;
                    font-size: 16px;
                    color: ${MR_THEME.colors.textSecondary};
                    line-height: 1.6;
                    max-width: 760px;
                }

                .mr-company-form-stack {
                    display: grid;
                    gap: 20px;
                }

                .mr-company-field-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 16px;
                }

                .mr-company-save-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 18px;
                    flex-wrap: wrap;
                    border: 1px solid ${MR_THEME.colors.border};
                    border-radius: ${MR_THEME.radius.card}px;
                    background: linear-gradient(180deg, ${MR_THEME.colors.cardBg} 0%, #fcfcfd 100%);
                    padding: 18px;
                    box-shadow: ${MR_THEME.shadows.cardSoft};
                }

                .mr-company-save-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                @media (max-width: 640px) {
                    .mr-company-page {
                        padding: 0 0 28px;
                    }

                    .mr-company-header {
                        margin-bottom: 18px;
                        padding-bottom: 14px;
                    }

                    .mr-company-title {
                        font-size: 32px;
                    }

                    .mr-company-description {
                        font-size: 15px;
                    }

                    .mr-company-field-grid {
                        grid-template-columns: 1fr;
                    }

                    .mr-company-save-card {
                        padding: 16px;
                    }

                    .mr-company-save-actions {
                        width: 100%;
                    }

                    .mr-company-save-actions button {
                        width: 100%;
                    }
                }
            `}</style>

            <div className="mr-company-page">
                <div className="mr-company-header">
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: MR_THEME.colors.textSecondary,
                            marginBottom: 10,
                        }}
                    >
                        Settings / Company
                    </div>

                    <h1 className="mr-company-title">
                        {companyName && companyName.trim() ? companyName : "Company"}
                    </h1>

                    <div className="mr-company-description">
                        Manage your business identity, address, currency, timezone, and default payment terms.
                    </div>
                </div>

                {errorMsg ? (
                    <AlertMessage tone="error">
                        <strong>Error:</strong> {errorMsg}
                    </AlertMessage>
                ) : null}

                {okMsg ? <AlertMessage tone="success">{okMsg}</AlertMessage> : null}

                {loading ? (
                    <LoadingCard>Loading company settings...</LoadingCard>
                ) : role && !["owner", "admin"].includes(role) ? (
                    <LoadingCard>Access denied.</LoadingCard>
                ) : (
                    <div className="mr-company-form-stack">
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

                        <div className="mr-company-save-card">
                            <div style={{ minWidth: 240, flex: 1 }}>
                                <div
                                    style={{
                                        fontSize: 12,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.08em",
                                        color: MR_THEME.colors.textSecondary,
                                        fontWeight: 800,
                                        marginBottom: 8,
                                    }}
                                >
                                    Save company settings
                                </div>

                                <div
                                    style={{
                                        fontSize: 20,
                                        fontWeight: 800,
                                        lineHeight: 1.15,
                                        color: MR_THEME.colors.textPrimary,
                                        letterSpacing: "-0.02em",
                                        marginBottom: 8,
                                    }}
                                >
                                    Apply your company defaults
                                </div>

                                <div
                                    style={{
                                        fontSize: 14,
                                        color: MR_THEME.colors.textSecondary,
                                        lineHeight: 1.6,
                                        maxWidth: 720,
                                    }}
                                >
                                    Save your company information, regional defaults, and payment terms before moving to Billing, Taxes, or Preferences.
                                </div>
                            </div>

                            <div className="mr-company-save-actions">
                                <div
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: "8px 12px",
                                        borderRadius: 999,
                                        border: `1px solid ${MR_THEME.colors.border}`,
                                        background: MR_THEME.colors.cardBgSoft,
                                        color: MR_THEME.colors.textSecondary,
                                        fontSize: 13,
                                        fontWeight: 800,
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Company defaults
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving}
                                    style={{
                                        height: 44,
                                        padding: "0 18px",
                                        borderRadius: MR_THEME.radius.control,
                                        border: `1px solid ${saving ? MR_THEME.colors.border : MR_THEME.colors.primary}`,
                                        background: saving ? MR_THEME.colors.cardBgSoft : MR_THEME.colors.primary,
                                        color: saving ? MR_THEME.colors.textSecondary : "#ffffff",
                                        cursor: saving ? "not-allowed" : "pointer",
                                        fontWeight: 800,
                                        fontSize: 14,
                                        boxShadow: saving ? "none" : MR_THEME.shadows.cardSoft,
                                    }}
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function AlertMessage({
    tone,
    children,
}: {
    tone: "error" | "success";
    children: React.ReactNode;
}) {
    const isError = tone === "error";

    return (
        <div
            style={{
                marginBottom: 18,
                padding: "12px 14px",
                border: `1px solid ${isError ? "#fecaca" : "#bbf7d0"}`,
                background: isError ? "#fff5f5" : "#f0fdf4",
                borderRadius: MR_THEME.radius.control,
                color: isError ? "#991b1b" : "#166534",
                fontSize: 14,
            }}
        >
            {children}
        </div>
    );
}

function LoadingCard({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                background: MR_THEME.colors.cardBg,
                padding: 20,
                color: MR_THEME.colors.textSecondary,
                boxShadow: MR_THEME.shadows.cardSoft,
            }}
        >
            {children}
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
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                background: MR_THEME.colors.cardBg,
                padding: 22,
                boxShadow: MR_THEME.shadows.cardSoft,
            }}
        >
            <div style={{ marginBottom: 18 }}>
                <div
                    style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: MR_THEME.colors.textPrimary,
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
                            color: MR_THEME.colors.textSecondary,
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
    return <div className="mr-company-field-grid">{children}</div>;
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
        <label style={{ display: "grid", gap: 8, minWidth: 0 }}>
            <span
                style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: MR_THEME.colors.textSecondary,
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
                    width: "100%",
                    minWidth: 0,
                    height: 44,
                    borderRadius: MR_THEME.radius.control,
                    border: `1px solid ${MR_THEME.colors.borderStrong}`,
                    padding: "0 14px",
                    outline: "none",
                    background: MR_THEME.colors.cardBg,
                    fontSize: 14,
                    color: MR_THEME.colors.textPrimary,
                    boxSizing: "border-box",
                }}
            />

            {helper ? (
                <span
                    style={{
                        fontSize: 12,
                        color: MR_THEME.colors.textSecondary,
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
        <label style={{ display: "grid", gap: 8, minWidth: 0 }}>
            <span
                style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: MR_THEME.colors.textSecondary,
                }}
            >
                {label}
            </span>

            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    width: "100%",
                    minWidth: 0,
                    height: 44,
                    borderRadius: MR_THEME.radius.control,
                    border: `1px solid ${MR_THEME.colors.borderStrong}`,
                    padding: "0 14px",
                    outline: "none",
                    background: MR_THEME.colors.cardBg,
                    fontSize: 14,
                    color: MR_THEME.colors.textPrimary,
                    boxSizing: "border-box",
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
                        color: MR_THEME.colors.textSecondary,
                        lineHeight: 1.45,
                    }}
                >
                    {helper}
                </span>
            ) : null}
        </label>
    );
}