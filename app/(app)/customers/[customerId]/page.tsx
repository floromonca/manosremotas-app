"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { useActiveCompany } from "../../../../hooks/useActiveCompany";
import CustomerHeaderCard from "../components/CustomerHeaderCard";
import CustomerContactCard from "../components/CustomerContactCard";
import CustomerLocationsCard from "../components/CustomerLocationsCard";

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

async function getDefaultTaxRate(companyId: string) {
    const FALLBACK_TAX_RATE = 0.13;

    const { data, error } = await supabase
        .from("tax_profiles")
        .select("rate")
        .eq("company_id", companyId)
        .eq("is_default", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.log("⚠️ No pude leer tax_profiles (RLS?):", error.message);
        return FALLBACK_TAX_RATE;
    }

    const rate = Number((data as any)?.rate ?? NaN);
    if (!Number.isFinite(rate)) return FALLBACK_TAX_RATE;

    return rate;
}

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
    const [hasPreviewedPeriod, setHasPreviewedPeriod] = useState(false);
    const [defaultTaxRate, setDefaultTaxRate] = useState(0.13);


    const selectedPreviewTotals = useMemo(() => {
        const selectedRows = eligibleWOs.filter((wo) =>
            selectedWOs.includes(wo.work_order_id)
        );

        const subtotal = selectedRows.reduce(
            (acc, wo) => acc + Number(wo.subtotal ?? 0),
            0
        );

        const tax = subtotal * defaultTaxRate;
        const total = subtotal + tax;

        return { subtotal, tax, total };
    }, [eligibleWOs, selectedWOs, defaultTaxRate]);



    async function loadCustomer() {
        if (!companyId || !customerId) {
            setCustomer(null);
            return;
        }

        setLoading(true);

        const { data, error } = await supabase
            .from("customers")
            .select("customer_id, name, email, phone, billing_address")
            .eq("company_id", companyId)
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
        if (!companyId || !customerId) {
            setLocations([]);
            return;
        }

        const { data, error } = await supabase
            .from("locations")
            .select("location_id, label, address, created_at")
            .eq("company_id", companyId)
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
        if (!companyId || !customerId) {
            alert("Missing company or customer.");
            return;
        }

        if (!periodStart || !periodEnd) {
            alert("Please select start and end dates.");
            return;
        }

        if (periodEnd < periodStart) {
            alert("End date cannot be before start date.");
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

            if (error) throw error;

            const rows = Array.isArray(data) ? data : [];
            setEligibleWOs(rows);
            setSelectedWOs(rows.map((row: any) => row.work_order_id));
            setHasPreviewedPeriod(true);
        } catch (error: any) {
            console.error("Error previewing work orders:", error);
            alert(error?.message || "Error loading eligible work orders");
            setEligibleWOs([]);
            setSelectedWOs([]);
            setHasPreviewedPeriod(false);
        } finally {
            setLoadingPreview(false);
        }
    }

    async function handleGeneratePeriodInvoice() {
        if (!companyId || !customerId) {
            alert("Missing company or customer.");
            return;
        }

        if (!periodStart || !periodEnd) {
            alert("Please select start and end dates.");
            return;
        }

        if (selectedWOs.length === 0) {
            alert("Select at least one work order.");
            return;
        }

        try {
            setGeneratingPeriodInvoice(true);

            const { data, error } = await supabase.rpc(
                "generate_period_invoice_from_selection",
                {
                    p_company_id: companyId,
                    p_customer_id: customerId,
                    p_period_start: periodStart,
                    p_period_end: periodEnd,
                    p_work_order_ids: selectedWOs,
                }
            );

            if (error) throw error;

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
        if (!companyId) {
            setDefaultTaxRate(0.13);
            return;
        }

        let alive = true;

        (async () => {
            const rate = await getDefaultTaxRate(companyId);
            if (alive) setDefaultTaxRate(rate);
        })();

        return () => {
            alive = false;
        };
    }, [companyId]);

    useEffect(() => {
        loadCustomer();
        loadLocations();
    }, [companyId, customerId]);

    useEffect(() => {
        setHasPreviewedPeriod(false);
        setEligibleWOs([]);
        setSelectedWOs([]);
    }, [periodStart, periodEnd]);
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
                    <CustomerHeaderCard
                        customerName={customer.name}
                        customerId={customer.customer_id}
                        locationsCount={locations.length}
                    />

                    <CustomerContactCard
                        email={customer.email}
                        phone={customer.phone}
                        billingAddress={customer.billing_address}
                    />

                    <CustomerLocationsCard
                        locations={locations}
                        onAddLocation={handleAddLocation}
                    />
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


                </div>

                {hasPreviewedPeriod && !loadingPreview && eligibleWOs.length === 0 ? (
                    <div
                        style={{
                            marginTop: 22,
                            padding: 16,
                            borderRadius: 14,
                            border: "1px dashed #d1d5db",
                            background: "#fafafa",
                            color: "#6b7280",
                        }}
                    >
                        No eligible work orders found for this period.
                    </div>
                ) : null}

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
                        <div
                            style={{
                                marginTop: 12,
                                display: "flex",
                                justifyContent: "flex-end",
                            }}
                        >
                            <button
                                onClick={handleGeneratePeriodInvoice}
                                disabled={generatingPeriodInvoice || selectedWOs.length === 0}
                                style={{
                                    height: 44,
                                    padding: "0 18px",
                                    borderRadius: 12,
                                    border:
                                        generatingPeriodInvoice || selectedWOs.length === 0
                                            ? "1px solid #d1d5db"
                                            : "1px solid #111827",
                                    background:
                                        generatingPeriodInvoice || selectedWOs.length === 0
                                            ? "#f9fafb"
                                            : "#111827",
                                    color:
                                        generatingPeriodInvoice || selectedWOs.length === 0
                                            ? "#9ca3af"
                                            : "white",
                                    cursor:
                                        generatingPeriodInvoice || selectedWOs.length === 0
                                            ? "not-allowed"
                                            : "pointer",
                                    fontWeight: 800,
                                    fontSize: 14,
                                    whiteSpace: "nowrap",
                                    boxShadow:
                                        generatingPeriodInvoice || selectedWOs.length === 0
                                            ? "none"
                                            : "0 1px 2px rgba(0,0,0,0.06)",
                                }}
                            >
                                {generatingPeriodInvoice
                                    ? "Generating..."
                                    : "Generate Period Invoice"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
