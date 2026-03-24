"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useActiveCompany } from "../../../hooks/useActiveCompany";

type Customer = {
    customer_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    billing_address: string | null;
};

type Location = {
    location_id: string;
    label: string | null;
    address: string | null;
    created_at: string | null;
};

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { companyId } = useActiveCompany();
    const customerId = (params as any)?.customerId as string;

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(false);

    // Billing state
    const [periodStart, setPeriodStart] = useState("");
    const [periodEnd, setPeriodEnd] = useState("");
    const [generatingPeriodInvoice, setGeneratingPeriodInvoice] = useState(false);

    const [eligibleWOs, setEligibleWOs] = useState<any[]>([]);
    const [selectedWOs, setSelectedWOs] = useState<string[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(false);

    const selectedPreviewTotals = useMemo(() => {
        const selectedRows = eligibleWOs.filter((wo) =>
            selectedWOs.includes(wo.work_order_id)
        );

        const subtotal = selectedRows.reduce(
            (acc, wo) => acc + Number(wo.subtotal ?? 0),
            0
        );

        const taxRate = 0.13;
        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        return { subtotal, tax, total };
    }, [eligibleWOs, selectedWOs]);



    async function loadCustomer() {
        if (!customerId) return;

        setLoading(true);

        const { data, error } = await supabase
            .from("customers")
            .select("customer_id, name, email, phone, billing_address")
            .eq("customer_id", customerId)
            .single();

        if (error) {
            console.error(error);
            alert(error.message);
            setCustomer(null);
        } else {
            setCustomer(data as Customer);
        }

        setLoading(false);
    }

    async function loadLocations() {
        if (!customerId) return;

        const { data, error } = await supabase
            .from("locations")
            .select("location_id, label, address, created_at")
            .eq("customer_id", customerId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error(error);
            alert(error.message);
            setLocations([]);
        } else {
            setLocations(data || []);
        }
    }

    async function handleAddLocation() {
        if (!companyId) {
            alert("No active company selected");
            return;
        }

        const label = prompt("Location label (Home, Office, etc)");
        if (!label || !label.trim()) return;

        const address = prompt("Address");
        if (!address || !address.trim()) return;

        const { error } = await supabase.from("locations").insert({
            company_id: companyId,
            customer_id: customerId,
            location_type: "other",
            label: label.trim(),
            address: address.trim(),
        });

        if (error) {
            console.error("Error creating location:", error);
            alert(error.message || "Error creating location");
            return;
        }

        await loadLocations();
    }
    async function handlePreviewWorkOrders() {
        if (!companyId) {
            alert("No active company selected");
            return;
        }

        if (!customerId) {
            alert("Customer not found");
            return;
        }

        if (!periodStart || !periodEnd) {
            alert("Please select start date and end date");
            return;
        }

        if (periodStart > periodEnd) {
            alert("Start date cannot be after end date");
            return;
        }

        try {
            setLoadingPreview(true);

            const { data, error } = await supabase.rpc(
                "get_eligible_work_orders_for_period",
                {
                    p_company_id: companyId,
                    p_customer_id: customerId,
                    p_period_start: periodStart,
                    p_period_end: periodEnd,
                }
            );

            if (error) {
                throw error;
            }

            setEligibleWOs(data || []);
            setSelectedWOs([]);
        } catch (err: any) {
            console.error("Error loading eligible work orders:", err);
            alert(err?.message || "Error loading work orders");
        } finally {
            setLoadingPreview(false);
        }
    }

    async function handleGeneratePeriodInvoice() {
        if (!companyId) {
            alert("No active company selected");
            return;
        }

        if (!customerId) {
            alert("Customer not found");
            return;
        }

        if (selectedWOs.length === 0) {
            alert("Please select at least one work order");
            return;
        }

        try {
            setGeneratingPeriodInvoice(true);

            const { data, error } = await supabase.rpc(
                "generate_period_invoice_from_selection",
                {
                    p_company_id: companyId,
                    p_customer_id: customerId,
                    p_work_order_ids: selectedWOs,
                }
            );

            if (error) {
                throw error;
            }

            const invoiceId =
                typeof data === "string"
                    ? data
                    : data?.invoice_id ?? data?.id ?? null;

            if (!invoiceId) {
                alert("Invoice was created, but no invoice id was returned.");
                return;
            }

            router.push(`/invoices/${invoiceId}`);
        } catch (error: any) {
            console.error("Error generating selected period invoice:", error);
            alert(error?.message || "Error generating invoice");
        } finally {
            setGeneratingPeriodInvoice(false);
        }
    }
    useEffect(() => {
        loadCustomer();
        loadLocations();
    }, [customerId]);

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
            <button
                onClick={() => router.push("/customers")}
                style={{
                    marginBottom: 18,
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                    background: "white",
                    cursor: "pointer",
                    fontWeight: 800,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
            >
                ← Back to Customers
            </button>

            {loading ? (
                <div
                    style={{
                        padding: 18,
                        borderRadius: 14,
                        border: "1px solid #e5e7eb",
                        background: "white",
                        color: "#6b7280",
                        marginBottom: 18,
                    }}
                >
                    Loading customer...
                </div>
            ) : null}

            {customer ? (
                <>
                    <div
                        style={{
                            marginBottom: 20,
                            padding: "18px 20px",
                            borderRadius: 16,
                            border: "1px solid #e5e7eb",
                            background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: 1,
                                color: "#6b7280",
                                fontWeight: 800,
                                marginBottom: 6,
                            }}
                        >
                            Customer
                        </div>

                        <h1
                            style={{
                                margin: 0,
                                fontSize: 30,
                                lineHeight: 1.1,
                                fontWeight: 900,
                                letterSpacing: "-0.03em",
                                color: "#111827",
                            }}
                        >
                            {customer.name}
                        </h1>

                        <div
                            style={{
                                marginTop: 10,
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                                alignItems: "center",
                            }}
                        >
                            <span
                                style={{
                                    padding: "6px 10px",
                                    borderRadius: 999,
                                    background: "#f9fafb",
                                    border: "1px solid #e5e7eb",
                                    fontSize: 13,
                                    color: "#374151",
                                }}
                            >
                                Customer ID: <b>{customer.customer_id.slice(0, 8)}</b>
                            </span>

                            <span
                                style={{
                                    padding: "6px 10px",
                                    borderRadius: 999,
                                    background: "#f9fafb",
                                    border: "1px solid #e5e7eb",
                                    fontSize: 13,
                                    color: "#374151",
                                }}
                            >
                                Locations: <b>{locations.length}</b>
                            </span>
                        </div>
                    </div>

                    <div
                        style={{
                            border: "1px solid #e5e7eb",
                            padding: 18,
                            borderRadius: 16,
                            background: "white",
                            marginBottom: 20,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        }}
                    >
                        <div style={{ marginBottom: 14 }}>
                            <div
                                style={{
                                    fontSize: 12,
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                    color: "#6b7280",
                                    fontWeight: 800,
                                    marginBottom: 6,
                                }}
                            >
                                Customer Details
                            </div>
                            <div style={{ fontWeight: 900, fontSize: 22, color: "#111827" }}>
                                Contact Information
                            </div>
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: 12,
                            }}
                        >
                            <div
                                style={{
                                    padding: 14,
                                    borderRadius: 12,
                                    border: "1px solid #e5e7eb",
                                    background: "#fcfcfd",
                                }}
                            >
                                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                                    Email
                                </div>
                                <div style={{ fontWeight: 700, color: "#111827" }}>
                                    {customer.email || "—"}
                                </div>
                            </div>

                            <div
                                style={{
                                    padding: 14,
                                    borderRadius: 12,
                                    border: "1px solid #e5e7eb",
                                    background: "#fcfcfd",
                                }}
                            >
                                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                                    Phone
                                </div>
                                <div style={{ fontWeight: 700, color: "#111827" }}>
                                    {customer.phone || "—"}
                                </div>
                            </div>

                            <div
                                style={{
                                    padding: 14,
                                    borderRadius: 12,
                                    border: "1px solid #e5e7eb",
                                    background: "#fcfcfd",
                                    gridColumn: "1 / -1",
                                }}
                            >
                                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                                    Billing Address
                                </div>
                                <div style={{ fontWeight: 700, color: "#111827" }}>
                                    {customer.billing_address || "—"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            border: "1px solid #e5e7eb",
                            padding: 18,
                            borderRadius: 16,
                            background: "white",
                            marginBottom: 20,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "end",
                                gap: 12,
                                flexWrap: "wrap",
                                marginBottom: 14,
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        textTransform: "uppercase",
                                        letterSpacing: 1,
                                        color: "#6b7280",
                                        fontWeight: 800,
                                        marginBottom: 6,
                                    }}
                                >
                                    Customer Locations
                                </div>
                                <div style={{ fontWeight: 900, fontSize: 22, color: "#111827" }}>
                                    Locations
                                </div>
                            </div>

                            <button
                                onClick={handleAddLocation}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 12,
                                    border: "1px solid #111827",
                                    background: "#111827",
                                    color: "white",
                                    cursor: "pointer",
                                    fontWeight: 800,
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                                }}
                            >
                                + Add Location
                            </button>
                        </div>

                        <div style={{ display: "grid", gap: 12 }}>
                            {locations.map((l) => (
                                <div
                                    key={l.location_id}
                                    style={{
                                        border: "1px solid #e5e7eb",
                                        padding: 14,
                                        borderRadius: 14,
                                        background: "#fcfcfd",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 800,
                                            fontSize: 16,
                                            color: "#111827",
                                            marginBottom: 6,
                                        }}
                                    >
                                        {l.label || "Location"}
                                    </div>

                                    <div style={{ color: "#4b5563", lineHeight: 1.5 }}>
                                        {l.address || "—"}
                                    </div>
                                </div>
                            ))}

                            {locations.length === 0 ? (
                                <div
                                    style={{
                                        padding: 16,
                                        borderRadius: 14,
                                        border: "1px dashed #d1d5db",
                                        background: "#fafafa",
                                        color: "#6b7280",
                                    }}
                                >
                                    No locations yet.
                                </div>
                            ) : null}
                        </div>
                    </div>
                </>
            ) : null}

            <div
                style={{
                    border: "1px solid #e5e7eb",
                    padding: 18,
                    borderRadius: 16,
                    background: "white",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
            >
                <div style={{ marginBottom: 14 }}>
                    <div
                        style={{
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            color: "#6b7280",
                            fontWeight: 800,
                            marginBottom: 6,
                        }}
                    >
                        Customer Billing
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 22, color: "#111827" }}>
                        Billing
                    </div>
                </div>

                <p
                    style={{
                        marginTop: 0,
                        marginBottom: 18,
                        color: "#6b7280",
                        fontSize: 14,
                        lineHeight: 1.6,
                        maxWidth: 760,
                    }}
                >
                    Generate a consolidated invoice for this customer using multiple work orders within a selected date range.
                </p>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 16,
                        alignItems: "end",
                    }}
                >
                    <div>
                        <label
                            htmlFor="periodStart"
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontSize: 13,
                                fontWeight: 800,
                                color: "#374151",
                            }}
                        >
                            Start date
                        </label>
                        <input
                            id="periodStart"
                            type="date"
                            value={periodStart}
                            onChange={(e) => setPeriodStart(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "12px 14px",
                                border: "1px solid #d1d5db",
                                borderRadius: 12,
                                background: "#fff",
                                fontSize: 14,
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="periodEnd"
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontSize: 13,
                                fontWeight: 800,
                                color: "#374151",
                            }}
                        >
                            End date
                        </label>
                        <input
                            id="periodEnd"
                            type="date"
                            value={periodEnd}
                            onChange={(e) => setPeriodEnd(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "12px 14px",
                                border: "1px solid #d1d5db",
                                borderRadius: 12,
                                background: "#fff",
                                fontSize: 14,
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    <div>
                        <button
                            type="button"
                            onClick={handlePreviewWorkOrders}
                            disabled={loadingPreview || !periodStart || !periodEnd}
                            style={{
                                width: "100%",
                                padding: "12px 16px",
                                borderRadius: 12,
                                border: "1px solid #d1d5db",
                                background:
                                    loadingPreview || !periodStart || !periodEnd ? "#e5e7eb" : "#ffffff",
                                color:
                                    loadingPreview || !periodStart || !periodEnd ? "#6b7280" : "#111827",
                                cursor:
                                    loadingPreview || !periodStart || !periodEnd
                                        ? "not-allowed"
                                        : "pointer",
                                fontWeight: 800,
                                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                            }}
                        >
                            {loadingPreview ? "Loading..." : "Preview Work Orders"}
                        </button>
                    </div>

                    <div>
                        <button
                            onClick={handleGeneratePeriodInvoice}
                            disabled={
                                generatingPeriodInvoice ||
                                !periodStart ||
                                !periodEnd ||
                                selectedWOs.length === 0
                            }
                            style={{
                                width: "100%",
                                padding: "12px 16px",
                                borderRadius: 12,
                                border: "1px solid #111827",
                                background:
                                    generatingPeriodInvoice ||
                                        !periodStart ||
                                        !periodEnd ||
                                        selectedWOs.length === 0
                                        ? "#9ca3af"
                                        : "#111827",
                                color: "white",
                                cursor:
                                    generatingPeriodInvoice ||
                                        !periodStart ||
                                        !periodEnd ||
                                        selectedWOs.length === 0
                                        ? "not-allowed"
                                        : "pointer",
                                fontWeight: 800,
                                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                            }}
                        >
                            {generatingPeriodInvoice
                                ? "Generating..."
                                : "Generate Period Invoice"}
                        </button>
                    </div>
                </div>

                {eligibleWOs.length > 0 && (
                    <div
                        style={{
                            marginTop: 22,
                            borderTop: "1px solid #ececec",
                            paddingTop: 18,
                        }}
                    >
                        <div style={{ marginBottom: 12 }}>
                            <div
                                style={{
                                    fontSize: 12,
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                    color: "#6b7280",
                                    fontWeight: 800,
                                    marginBottom: 6,
                                }}
                            >
                                Period Billing Preview
                            </div>
                            <div style={{ fontWeight: 900, fontSize: 18, color: "#111827" }}>
                                Eligible Work Orders
                            </div>
                        </div>

                        <div style={{ display: "grid", gap: 10 }}>
                            {eligibleWOs.map((wo) => {
                                const checked = selectedWOs.includes(wo.work_order_id);

                                return (
                                    <label
                                        key={wo.work_order_id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 12,
                                            border: "1px solid #e5e7eb",
                                            borderRadius: 14,
                                            padding: 14,
                                            background: checked ? "#f9fafb" : "#fff",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedWOs([...selectedWOs, wo.work_order_id]);
                                                    } else {
                                                        setSelectedWOs(
                                                            selectedWOs.filter((id) => id !== wo.work_order_id)
                                                        );
                                                    }
                                                }}
                                            />

                                            <div>
                                                <div style={{ fontWeight: 800, color: "#111827" }}>
                                                    {wo.job_type || "Work Order"}
                                                </div>
                                                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                                                    Ref: <span style={{ fontFamily: "monospace" }}>{String(wo.work_order_id).slice(0, 8)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                                                Subtotal
                                            </div>
                                            <div style={{ fontWeight: 900, color: "#111827" }}>
                                                ${Number(wo.subtotal ?? 0).toFixed(2)}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>

                        <div
                            style={{
                                marginTop: 16,
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                gap: 12,
                            }}
                        >
                            <div
                                style={{
                                    padding: 14,
                                    borderRadius: 12,
                                    border: "1px solid #e5e7eb",
                                    background: "#fcfcfd",
                                }}
                            >
                                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                                    Subtotal
                                </div>
                                <div style={{ fontWeight: 900, fontSize: 18, color: "#111827" }}>
                                    ${selectedPreviewTotals.subtotal.toFixed(2)}
                                </div>
                            </div>

                            <div
                                style={{
                                    padding: 14,
                                    borderRadius: 12,
                                    border: "1px solid #e5e7eb",
                                    background: "#fcfcfd",
                                }}
                            >
                                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                                    Tax
                                </div>
                                <div style={{ fontWeight: 900, fontSize: 18, color: "#111827" }}>
                                    ${selectedPreviewTotals.tax.toFixed(2)}
                                </div>
                            </div>

                            <div
                                style={{
                                    padding: 14,
                                    borderRadius: 12,
                                    border: "1px solid #d1d5db",
                                    background: "#111827",
                                    color: "white",
                                }}
                            >
                                <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 700, marginBottom: 6 }}>
                                    Total
                                </div>
                                <div style={{ fontWeight: 900, fontSize: 18 }}>
                                    ${selectedPreviewTotals.total.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
