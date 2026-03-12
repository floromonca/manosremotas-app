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
    const { companyId } = useActiveCompany();

    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [taxName, setTaxName] = useState("");
    const [taxRate, setTaxRate] = useState("");
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [okMsg, setOkMsg] = useState("");

    const loadTaxes = async () => {
        if (!companyId) return;

        setLoading(true);
        setErrorMsg("");

        const { data, error } = await supabase
            .from("tax_profiles")
            .select("*")
            .eq("company_id", companyId)
            .order("tax_name");

        if (error) {
            setErrorMsg(error.message);
            setTaxes([]);
        } else {
            setTaxes((data as Tax[]) ?? []);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (!companyId) return;
        loadTaxes();
    }, [companyId]);

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

            setTaxName("");
            setTaxRate("");
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
        <div style={{ padding: 24, maxWidth: 900 }}>
            <div style={{ fontSize: 13, opacity: 0.7 }}>
                Control Center / Taxes
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 650, margin: "6px 0" }}>
                Taxes
            </h1>

            <div style={{ opacity: 0.7 }}>
                Manage tax rates used in invoices and services.
            </div>

            {errorMsg ? (
                <div
                    style={{
                        marginTop: 16,
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
                        marginTop: 16,
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

            <div
                style={{
                    marginTop: 20,
                    display: "flex",
                    justifyContent: "flex-start",
                }}
            >
                <button
                    type="button"
                    onClick={() => {
                        setShowForm((prev) => !prev);
                        setErrorMsg("");
                        setOkMsg("");
                    }}
                    style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        background: "white",
                        cursor: "pointer",
                        fontWeight: 600,
                    }}
                >
                    {showForm ? "Close" : "+ Add Tax"}
                </button>
            </div>

            {showForm && (
                <div
                    style={{
                        marginTop: 16,
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 16,
                        background: "#fafafa",
                        width: "100%",
                        maxWidth: 480,
                    }}
                >
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>New Tax</div>

                    <div style={{ display: "grid", gap: 12 }}>
                        <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontSize: 13, opacity: 0.8 }}>Tax Name</span>
                            <input
                                value={taxName}
                                onChange={(e) => setTaxName(e.target.value)}
                                style={inputStyle}
                                placeholder="e.g. HST, GST, IVA"
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontSize: 13, opacity: 0.8 }}>Rate %</span>
                            <input
                                value={taxRate}
                                onChange={(e) => setTaxRate(e.target.value)}
                                style={inputStyle}
                                placeholder="e.g. 13"
                            />
                        </label>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    padding: "8px 14px",
                                    borderRadius: 8,
                                    border: "1px solid #ddd",
                                    background: saving ? "#f5f5f5" : "white",
                                    cursor: saving ? "not-allowed" : "pointer",
                                    fontWeight: 700,
                                    minWidth: 110,
                                }}
                            >
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div
                style={{
                    marginTop: 20,
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: 20,
                    background: "#fff",
                }}
            >
                {loading ? (
                    <div style={{ opacity: 0.6 }}>Loading taxes...</div>
                ) : taxes.length === 0 ? (
                    <div style={{ opacity: 0.6 }}>No taxes configured</div>
                ) : (
                    <div style={{ display: "grid", gap: 0 }}>
                        {taxes.map((tax) => (
                            <div
                                key={tax.tax_profile_id}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "12px 0",
                                    borderBottom: "1px solid #f0f0f0",
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 700 }}>{tax.tax_name}</div>
                                    <div style={{ fontSize: 14, opacity: 0.7 }}>{tax.rate}%</div>
                                </div>

                                <div style={{ fontSize: 14, opacity: 0.8 }}>
                                    {tax.is_default ? "Default" : ""}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    height: 40,
    borderRadius: 8,
    border: "1px solid #ddd",
    padding: "0 12px",
    outline: "none",
    background: "white",
    width: "100%",
};