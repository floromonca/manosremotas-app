"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useAuthState } from "../../../hooks/useAuthState";
import { useActiveCompany } from "../../../hooks/useActiveCompany";

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

                // 1) Validar rol
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

                // 2) Cargar company
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
        <div style={{ padding: 24, maxWidth: 980 }}>
            <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, opacity: 0.7 }}>Control Center / Company</div>
                <h1 style={{ fontSize: 28, fontWeight: 650, margin: "6px 0" }}>
                    {companyName && companyName.trim() ? companyName : "Company"} — Company Settings
                </h1>
                <div style={{ opacity: 0.7 }}>
                    Manage your business identity and regional settings.
                </div>
            </div>

            {errorMsg ? (
                <div
                    style={{
                        marginBottom: 16,
                        padding: 10,
                        border: "1px solid #f3caca",
                        background: "#fff5f5",
                        borderRadius: 8,
                        color: "#a40000",
                        fontSize: 13,
                    }}
                >
                    <b>Error:</b> {errorMsg}
                </div>
            ) : null}

            {okMsg ? (
                <div
                    style={{
                        marginBottom: 16,
                        padding: 10,
                        border: "1px solid #cfe8cf",
                        background: "#f3fff3",
                        borderRadius: 8,
                        color: "#0b6b0b",
                        fontSize: 13,
                    }}
                >
                    {okMsg}
                </div>
            ) : null}

            {loading ? (
                <div style={{ opacity: 0.7 }}>Loading company settings...</div>
            ) : role && !["owner", "admin"].includes(role) ? (
                <div style={{ opacity: 0.7 }}>Access denied.</div>
            ) : (
                <div style={{ display: "grid", gap: 18 }}>
                    <SectionCard title="Company Information">
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
                    </SectionCard>

                    <SectionCard title="Address">
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
                        <Field label="City" value={form.city} onChange={(v) => setField("city", v)} />
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
                    </SectionCard>

                    <SectionCard title="Regional Settings">
                        {/* Currency */}
                        <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Currency</span>

                            <select
                                value={form.currency_code}
                                onChange={(e) => setField("currency_code", e.target.value)}
                                style={{
                                    padding: "10px 12px",
                                    borderRadius: 8,
                                    border: "1px solid #ddd",
                                    background: "white",
                                    fontSize: 14,
                                }}
                            >
                                <option value="CAD">Canadian Dollar (CAD)</option>
                                <option value="USD">US Dollar (USD)</option>
                                <option value="COP">Colombian Peso (COP)</option>
                            </select>

                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                                Default currency used for invoices.
                            </span>
                        </label>

                        {/* Timezone */}
                        <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Timezone</span>

                            <select
                                value={form.timezone}
                                onChange={(e) => setField("timezone", e.target.value)}
                                style={{
                                    padding: "10px 12px",
                                    borderRadius: 8,
                                    border: "1px solid #ddd",
                                    background: "white",
                                    fontSize: 14,
                                }}
                            >
                                <option value="America/Toronto">Toronto (Canada Eastern Time)</option>
                                <option value="America/New_York">New York (US Eastern Time)</option>
                                <option value="America/Bogota">Bogotá (Colombia Time)</option>
                            </select>

                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                                Used for invoices, work orders, and reports.
                            </span>
                        </label>

                        {/* Payment Terms */}
                        <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Payment Terms (days)</span>

                            <input
                                type="number"
                                min={0}
                                step={1}
                                value={form.payment_terms_days}
                                onChange={(e) => setField("payment_terms_days", e.target.value)}
                                style={{
                                    height: 40,
                                    borderRadius: 8,
                                    border: "1px solid #ddd",
                                    padding: "0 12px",
                                    outline: "none",
                                    background: "white",
                                }}
                            />

                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                                Default number of days used to calculate invoice due date.
                            </span>
                        </label>
                    </SectionCard>

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                padding: "10px 16px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: saving ? "#f5f5f5" : "white",
                                cursor: saving ? "not-allowed" : "pointer",
                                fontWeight: 800,
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
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div
            style={{
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                background: "#fff",
                padding: 16,
            }}
        >
            <div style={{ fontSize: 18, fontWeight: 650, marginBottom: 14 }}>{title}</div>
            <div style={{ display: "grid", gap: 12 }}>{children}</div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    height: 40,
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    padding: "0 12px",
                    outline: "none",
                    background: "white",
                }}
            />
        </label>
    );
}