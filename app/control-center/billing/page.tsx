"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useActiveCompany } from "../../../hooks/useActiveCompany";

type BillingSettings = {
    payment_terms_days: number;
    invoice_prefix: string;
    work_order_prefix: string;
    payment_instructions: string;
    invoice_footer_note: string;
};

export default function BillingSettingsPage() {
    const { companyId } = useActiveCompany();

    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<BillingSettings>({
        payment_terms_days: 30,
        invoice_prefix: "INV-",
        work_order_prefix: "WO-",
        payment_instructions: "",
        invoice_footer_note: "",
    });
    function FieldBlock({
        label,
        children,
    }: {
        label: string;
        children: React.ReactNode;
    }) {
        return (
            <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                {children}
            </label>
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

    const textareaStyle: React.CSSProperties = {
        minHeight: 96,
        borderRadius: 8,
        border: "1px solid #ddd",
        padding: "10px 12px",
        outline: "none",
        background: "white",
        width: "100%",
        resize: "vertical",
    };
    useEffect(() => {
        if (!companyId) return;

        const loadSettings = async () => {
            setLoading(true);

            const { data, error } = await supabase
                .from("company_settings")
                .select("*")
                .eq("company_id", companyId)
                .single();

            if (!error && data) {
                setSettings({
                    payment_terms_days: data.payment_terms_days ?? 30,
                    invoice_prefix: data.invoice_prefix ?? "INV-",
                    work_order_prefix: data.work_order_prefix ?? "WO-",
                    payment_instructions: data.payment_instructions ?? "",
                    invoice_footer_note: data.invoice_footer_note ?? "",
                });
            }

            setLoading(false);
        };

        loadSettings();
    }, [companyId]);

    if (loading) {
        return (
            <div style={{ padding: 24 }}>
                Loading billing settings...
            </div>
        );
    }

    return (
        <div style={{ padding: 24, maxWidth: 900 }}>
            <div style={{ fontSize: 13, opacity: 0.7 }}>
                Control Center / Billing
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 650, margin: "6px 0" }}>
                Billing Settings
            </h1>

            <div style={{ opacity: 0.7, marginBottom: 20 }}>
                Configure invoice numbering and payment terms.
            </div>

            <div
                style={{
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: 20,
                    display: "grid",
                    gap: 16,
                    background: "#fff",
                }}
            >
                <FieldBlock label="Invoice Prefix">
                    <input
                        value={settings.invoice_prefix}
                        onChange={(e) =>
                            setSettings({ ...settings, invoice_prefix: e.target.value })
                        }
                        style={inputStyle}
                    />
                </FieldBlock>

                <FieldBlock label="Work Order Prefix">
                    <input
                        value={settings.work_order_prefix}
                        onChange={(e) =>
                            setSettings({ ...settings, work_order_prefix: e.target.value })
                        }
                        style={inputStyle}
                    />
                </FieldBlock>

                <FieldBlock label="Payment Terms (days)">
                    <input
                        type="number"
                        value={settings.payment_terms_days}
                        onChange={(e) =>
                            setSettings({
                                ...settings,
                                payment_terms_days: Number(e.target.value),
                            })
                        }
                        style={inputStyle}
                    />
                </FieldBlock>

                <FieldBlock label="Payment Instructions">
                    <textarea
                        value={settings.payment_instructions}
                        onChange={(e) =>
                            setSettings({
                                ...settings,
                                payment_instructions: e.target.value,
                            })
                        }
                        style={textareaStyle}
                    />
                </FieldBlock>

                <FieldBlock label="Invoice Footer Note">
                    <textarea
                        value={settings.invoice_footer_note}
                        onChange={(e) =>
                            setSettings({
                                ...settings,
                                invoice_footer_note: e.target.value,
                            })
                        }
                        style={textareaStyle}
                    />
                </FieldBlock>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button
                        onClick={async () => {
                            if (!companyId) return;

                            const { error } = await supabase
                                .from("company_settings")
                                .update(settings)
                                .eq("company_id", companyId);

                            if (error) {
                                alert(error.message);
                            } else {
                                alert("Billing settings saved");
                            }
                        }}
                        style={{
                            padding: "10px 16px",
                            borderRadius: 8,
                            border: "1px solid #ddd",
                            background: "white",
                            cursor: "pointer",
                            fontWeight: 700,
                            minWidth: 140,
                        }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}