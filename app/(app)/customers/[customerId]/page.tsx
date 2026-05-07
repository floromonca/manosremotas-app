"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { useActiveCompany } from "../../../../hooks/useActiveCompany";
import { MR_THEME } from "../../../../lib/theme";
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
    const [recentWorkOrders, setRecentWorkOrders] = useState<any[]>([]);
    const [hoveredRecentWO, setHoveredRecentWO] = useState<string | null>(null);

    // Billing state
    const [periodStart, setPeriodStart] = useState("");
    const [periodEnd, setPeriodEnd] = useState("");
    const [generatingPeriodInvoice, setGeneratingPeriodInvoice] = useState(false);

    const [eligibleWOs, setEligibleWOs] = useState<any[]>([]);
    const [selectedWOs, setSelectedWOs] = useState<string[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [hasPreviewedPeriod, setHasPreviewedPeriod] = useState(false);
    const [defaultTaxRate, setDefaultTaxRate] = useState(0.13);
    const formatMoney = useCallback((value: number) => {
        return new Intl.NumberFormat("en-CA", {
            style: "currency",
            currency: "CAD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(value || 0));
    }, []);



    const selectedPreviewTotals = useMemo(() => {
        const selectedRows = eligibleWOs.filter((wo) =>
            selectedWOs.includes(wo.work_order_id)
        );

        const subtotal = selectedRows.reduce(
            (acc, wo) => acc + Number(wo.subtotal ?? 0),
            0
        );

        const normalizedTaxRate =
            Number(defaultTaxRate ?? 0) > 1
                ? Number(defaultTaxRate) / 100
                : Number(defaultTaxRate ?? 0);

        const tax = subtotal * normalizedTaxRate;
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
            setRecentWorkOrders([]);
        } else {
            setCustomer(data as Customer);

            const { data: recentWOData, error: recentWOError } = await supabase
                .from("work_orders")
                .select("work_order_id, work_order_number, job_type, description, status, priority, service_address, created_at")
                .eq("company_id", companyId)
                .eq("customer_id", customerId)
                .order("created_at", { ascending: false })
                .limit(5);


            if (recentWOError) {
                console.warn("Could not load recent work orders:", recentWOError.message);
                setRecentWorkOrders([]);
            } else {
                setRecentWorkOrders(recentWOData ?? []);
            }
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
    async function handleEditCustomer() {
        if (!companyId || !customer) {
            alert("No customer selected");
            return;
        }

        const name = prompt("Customer name", customer.name ?? "");
        if (!name || !name.trim()) return;

        const email = prompt("Email", customer.email ?? "") ?? "";
        const phone = prompt("Phone", customer.phone ?? "") ?? "";
        const billingAddress = prompt("Billing address", customer.billing_address ?? "") ?? "";

        const { error } = await supabase
            .from("customers")
            .update({
                name: name.trim(),
                email: email.trim() || null,
                phone: phone.trim() || null,
                billing_address: billingAddress.trim() || null,
            })
            .eq("company_id", companyId)
            .eq("customer_id", customer.customer_id);

        if (error) {
            console.error("Error updating customer:", error);
            alert(error.message || "Error updating customer");
            return;
        }

        await loadCustomer();
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

            const response = await supabase.rpc(
                "generate_period_invoice_from_selection",
                {
                    p_company_id: companyId,
                    p_customer_id: customerId,
                    p_work_order_ids: selectedWOs,
                }
            );

            const { data, error } = response;

            if (error) {
                console.error("RPC error object", error);
                alert(
                    error.message ||
                    error.details ||
                    error.hint ||
                    JSON.stringify(error) ||
                    "Error generating invoice"
                );
                return;
            }

            const invoiceId =
                typeof data === "string"
                    ? data
                    : data?.invoice_id ?? data?.id ?? null;

            if (!invoiceId) {
                alert(
                    `Invoice was created or returned unexpectedly. Raw data: ${JSON.stringify(data)}`
                );
                return;
            }

            router.push(`/invoices/${invoiceId}`);
        } catch (error: any) {
            console.error("Error generating selected period invoice:", error);
            alert(
                error?.message ||
                error?.details ||
                error?.hint ||
                JSON.stringify(error) ||
                "Error generating invoice"
            );
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
        <div
            style={{
                padding: "28px 24px 40px",
                background: MR_THEME.colors.appBg,
                minHeight: "100%",
            }}
        >
            <div style={{ maxWidth: 1180, margin: "0 auto" }}>
                <div style={{ marginBottom: 18 }}>
                    <button
                        onClick={() => router.push("/customers")}
                        style={{
                            height: 42,
                            padding: "0 14px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.borderStrong}`,
                            background: MR_THEME.colors.cardBg,
                            cursor: "pointer",
                            fontWeight: 800,
                            color: MR_THEME.colors.textPrimary,
                            boxShadow: MR_THEME.shadows.cardSoft,
                        }}
                    >
                        ← Back to Customers
                    </button>

                </div>

                {loading ? (
                    <div
                        style={{
                            padding: 18,
                            borderRadius: 16,
                            border: "1px solid #e5e7eb",
                            background: "#ffffff",
                            color: "#6b7280",
                            marginBottom: 18,
                            boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                        }}
                    >
                        Loading customer...
                    </div>
                ) : null}

                {customer ? (
                    <div
                        style={{
                            display: "grid",
                            gap: 18,
                            marginBottom: 24,
                        }}
                    >
                        <div
                            style={{
                                padding: 18,
                                border: "1px solid #e5e7eb",
                                borderRadius: 18,
                                background: "linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)",
                                boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: 18,
                                    flexWrap: "wrap",
                                    marginBottom: 18,
                                }}
                            >
                                <div style={{ minWidth: 280, flex: 1 }}>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            textTransform: "uppercase",
                                            letterSpacing: 1.2,
                                            color: "#64748b",
                                            fontWeight: 800,
                                            marginBottom: 8,
                                        }}
                                    >
                                        Customers
                                    </div>

                                    <div
                                        style={{
                                            fontWeight: 900,
                                            fontSize: 34,
                                            color: "#0f172a",
                                            lineHeight: 1.08,
                                            letterSpacing: "-0.03em",
                                            marginBottom: 12,
                                        }}
                                    >
                                        {customer.name}
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 10,
                                        }}
                                    >
                                        <div
                                            style={{
                                                padding: "7px 12px",
                                                borderRadius: 999,
                                                border: "1px solid #dbe3ef",
                                                background: "#f8fafc",
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: "#334155",
                                            }}
                                        >
                                            Customer ID: {customer.customer_id.slice(0, 8)}
                                        </div>

                                        <div
                                            style={{
                                                padding: "7px 12px",
                                                borderRadius: 999,
                                                border: "1px solid #dbe3ef",
                                                background: "#f8fafc",
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: "#334155",
                                            }}
                                        >
                                            Locations: {locations.length}
                                        </div>

                                        {customer.email ? (
                                            <div
                                                style={{
                                                    padding: "7px 12px",
                                                    borderRadius: 999,
                                                    border: "1px solid #dbe3ef",
                                                    background: "#f8fafc",
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    color: "#334155",
                                                }}
                                            >
                                                {customer.email}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <button
                                    onClick={() =>
                                        router.push(
                                            `/work-orders?newFromCustomer=true&customerId=${customer.customer_id}`
                                        )
                                    }
                                    style={{
                                        height: 42,
                                        padding: "0 14px",
                                        borderRadius: MR_THEME.radius.control,
                                        border: `1px solid ${MR_THEME.colors.primary}`,
                                        background: MR_THEME.colors.primary,
                                        color: "#ffffff",
                                        fontWeight: 800,
                                        cursor: "pointer",
                                        boxShadow: MR_THEME.shadows.cardSoft,
                                    }}
                                >
                                    + New Work Order
                                </button>
                                <button
                                    type="button"
                                    onClick={handleEditCustomer}
                                    style={{
                                        height: 42,
                                        padding: "0 16px",
                                        borderRadius: MR_THEME.radius.control,
                                        border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                        background: MR_THEME.colors.cardBg,
                                        color: MR_THEME.colors.textPrimary,
                                        cursor: "pointer",
                                        fontWeight: 800,
                                        boxShadow: MR_THEME.shadows.cardSoft,
                                    }}
                                >
                                    Edit Customer
                                </button>
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                                    gap: 16,
                                    alignItems: "start",
                                }}
                            >
                                <CustomerContactCard
                                    email={customer.email}
                                    phone={customer.phone}
                                    billingAddress={customer.billing_address}
                                />

                                <CustomerLocationsCard
                                    locations={locations}
                                    onAddLocation={handleAddLocation}
                                />
                            </div>
                        </div>
                    </div>
                ) : null}
                <div
                    style={{
                        border: `1px solid ${MR_THEME.colors.border}`,
                        padding: 20,
                        borderRadius: MR_THEME.radius.card,
                        background: MR_THEME.colors.cardBg,
                        boxShadow: MR_THEME.shadows.card,
                        marginBottom: 20,
                    }}
                >

                    <div style={{ marginBottom: 14 }}>
                        <div
                            style={{
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: 1.2,
                                color: MR_THEME.colors.textMuted,
                                fontWeight: 800,
                                marginBottom: 6,
                            }}
                        >
                            Recent Work Orders
                        </div>
                        <div
                            style={{
                                fontWeight: 900,
                                fontSize: 24,
                                color: MR_THEME.colors.textPrimary,
                                lineHeight: 1.15,
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Latest work for this customer
                        </div>
                    </div>

                    {recentWorkOrders.length === 0 ? (
                        <div
                            style={{
                                color: MR_THEME.colors.textSecondary,
                                fontSize: 14,
                                lineHeight: 1.6,
                            }}
                        >
                            No work orders found for this customer yet.
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gap: 10,
                            }}
                        >
                            {recentWorkOrders.map((wo) => {
                                const createdLabel = wo.created_at
                                    ? new Date(wo.created_at).toLocaleDateString("en-CA", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                    })
                                    : "—";

                                const statusLabel =
                                    wo.status === "completed"
                                        ? "Completed"
                                        : wo.status === "in_progress"
                                            ? "In Progress"
                                            : wo.status === "open"
                                                ? "Open"
                                                : wo.status === "cancelled"
                                                    ? "Cancelled"
                                                    : wo.status || "Unknown";

                                const statusStyles =
                                    wo.status === "completed"
                                        ? {
                                            background: "#ecfdf3",
                                            color: "#027a48",
                                            border: "1px solid #abefc6",
                                        }
                                        : wo.status === "in_progress"
                                            ? {
                                                background: "#eff8ff",
                                                color: "#175cd3",
                                                border: "1px solid #b2ddff",
                                            }
                                            : wo.status === "open"
                                                ? {
                                                    background: "#f9f5ff",
                                                    color: "#7a3ea0",
                                                    border: "1px solid #e9d7fe",
                                                }
                                                : wo.status === "cancelled"
                                                    ? {
                                                        background: "#fef3f2",
                                                        color: "#b42318",
                                                        border: "1px solid #fecdca",
                                                    }
                                                    : {
                                                        background: "#f8fafc",
                                                        color: "#475467",
                                                        border: "1px solid #e5e7eb",
                                                    };

                                const workOrderTitle =
                                    wo.job_type?.trim() ||
                                    wo.description?.trim() ||
                                    wo.work_order_number ||
                                    "Work Order";

                                const workOrderMeta = [
                                    wo.work_order_number,
                                    wo.service_address,
                                ].filter(Boolean).join(" · ");

                                return (

                                    <div
                                        key={wo.work_order_id}
                                        className="recentWorkOrderRow"
                                        onClick={() => router.push(`/work-orders/${wo.work_order_id}`)}
                                        onMouseEnter={() => setHoveredRecentWO(wo.work_order_id)}
                                        onMouseLeave={() => setHoveredRecentWO(null)}
                                        style={{
                                            border:
                                                hoveredRecentWO === wo.work_order_id
                                                    ? `1px solid ${MR_THEME.colors.borderStrong}`
                                                    : `1px solid ${MR_THEME.colors.border}`,
                                            borderRadius: MR_THEME.radius.card,
                                            padding: 16,
                                            background: MR_THEME.colors.cardBg,
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            gap: 16,
                                            flexWrap: "wrap",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                            boxShadow:
                                                hoveredRecentWO === wo.work_order_id
                                                    ? MR_THEME.shadows.card
                                                    : MR_THEME.shadows.cardSoft,
                                            transform:
                                                hoveredRecentWO === wo.work_order_id
                                                    ? "translateY(-1px)"
                                                    : "translateY(0)",
                                        }}
                                    >
                                        <div
                                            className="recentWorkOrderMain"
                                            style={{
                                                minWidth: 0,
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 6,
                                                flex: 1,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontWeight: 900,
                                                    fontSize: 15,
                                                    color: MR_THEME.colors.textPrimary,
                                                    letterSpacing: "-0.01em",
                                                }}
                                            >
                                                {workOrderTitle}

                                            </div>

                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    color: MR_THEME.colors.textSecondary,
                                                    lineHeight: 1.5,
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {workOrderMeta || "No service address"}

                                            </div>
                                        </div>

                                        <div
                                            className="recentWorkOrderActions"
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                marginLeft: "auto",
                                                flexWrap: "wrap",
                                                justifyContent: "flex-end",
                                            }}
                                        >
                                            <div
                                                className="recentWorkOrderMeta"
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "flex-end",
                                                    gap: 8,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        ...statusStyles,
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        padding: "4px 10px",
                                                        borderRadius: 999,
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {statusLabel}
                                                </span>

                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: MR_THEME.colors.textMuted,
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {createdLabel}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="recentWorkOrderButton"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/work-orders/${wo.work_order_id}`);
                                                }}
                                                style={{
                                                    height: 40,
                                                    padding: "0 14px",
                                                    borderRadius: MR_THEME.radius.control,
                                                    border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                                    background: MR_THEME.colors.cardBg,
                                                    fontWeight: 800,
                                                    color: MR_THEME.colors.textPrimary,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Open
                                            </button>
                                        </div>
                                    </div>

                                );
                            })}
                        </div>
                    )}
                </div>
                <div
                    style={{
                        border: `1px solid ${MR_THEME.colors.border}`,
                        padding: 20,
                        borderRadius: MR_THEME.radius.card,
                        background: MR_THEME.colors.cardBg,
                        boxShadow: MR_THEME.shadows.card,
                    }}

                >
                    <div style={{ marginBottom: 14 }}>
                        <div
                            style={{
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: 1.2,
                                color: MR_THEME.colors.textMuted,
                                fontWeight: 800,
                                marginBottom: 6,
                            }}
                        >
                            Period Billing
                        </div>
                        <div
                            style={{
                                fontWeight: 900,
                                fontSize: 24,
                                color: MR_THEME.colors.textPrimary,
                                lineHeight: 1.15,
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Create Consolidated Invoice
                        </div>
                    </div>

                    <p
                        style={{
                            marginTop: 0,
                            marginBottom: 18,
                            color: MR_THEME.colors.textSecondary,
                            fontSize: 14,
                            lineHeight: 1.6,
                            maxWidth: 780,
                        }}
                    >
                        Create one invoice for this customer by combining multiple completed work orders within a selected billing period.
                    </p>

                    <div
                        style={{
                            display: "grid",
                            gap: 16,
                        }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                                gap: 16,
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
                                        color: MR_THEME.colors.textPrimary,
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
                                        height: 44,
                                        padding: "0 14px",
                                        border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                        borderRadius: MR_THEME.radius.control,
                                        background: MR_THEME.colors.cardBg,
                                        color: MR_THEME.colors.textPrimary,
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
                                        color: MR_THEME.colors.textPrimary,
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
                                        height: 44,
                                        padding: "0 14px",
                                        border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                        borderRadius: MR_THEME.radius.control,
                                        background: MR_THEME.colors.cardBg,
                                        color: MR_THEME.colors.textPrimary,
                                        fontSize: 14,
                                        boxSizing: "border-box",
                                    }}

                                />
                            </div>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                            }}
                        >
                            <button
                                type="button"
                                onClick={handlePreviewWorkOrders}
                                disabled={loadingPreview || !periodStart || !periodEnd}
                                style={{
                                    minWidth: 220,
                                    height: 44,
                                    padding: "0 18px",
                                    borderRadius: MR_THEME.radius.control,
                                    border: `1px solid ${loadingPreview || !periodStart || !periodEnd
                                        ? MR_THEME.colors.borderStrong
                                        : MR_THEME.colors.borderStrong
                                        }`,
                                    background:
                                        loadingPreview || !periodStart || !periodEnd
                                            ? MR_THEME.colors.cardBgSoft
                                            : MR_THEME.colors.cardBg,
                                    color:
                                        loadingPreview || !periodStart || !periodEnd
                                            ? MR_THEME.colors.textMuted
                                            : MR_THEME.colors.textPrimary,
                                    cursor:
                                        loadingPreview || !periodStart || !periodEnd
                                            ? "not-allowed"
                                            : "pointer",
                                    fontWeight: 800,
                                    boxShadow: MR_THEME.shadows.cardSoft,
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
                                borderRadius: MR_THEME.radius.control,
                                border: `1px dashed ${MR_THEME.colors.borderStrong}`,
                                background: MR_THEME.colors.cardBgSoft,
                                color: MR_THEME.colors.textSecondary,
                            }}

                        >
                            No eligible work orders found for this period.
                        </div>
                    ) : null}

                    {eligibleWOs.length > 0 && (
                        <div
                            style={{
                                marginTop: 22,
                                borderTop: `1px solid ${MR_THEME.colors.border}`,
                                paddingTop: 18,
                            }}
                        >
                            <div style={{ marginBottom: 12 }}>
                                <div
                                    style={{
                                        fontSize: 12,
                                        textTransform: "uppercase",
                                        letterSpacing: 1,
                                        color: MR_THEME.colors.textMuted,
                                        fontWeight: 800,
                                        marginBottom: 6,
                                    }}
                                >
                                    Period Billing Preview
                                </div>
                                <div style={{ fontWeight: 900, fontSize: 18, color: MR_THEME.colors.textPrimary }}>
                                    Eligible Work Orders
                                </div>
                            </div>

                            <div style={{ display: "grid", gap: 10 }}>
                                {eligibleWOs.map((wo) => {
                                    const checked = selectedWOs.includes(wo.work_order_id);

                                    const workOrderTitle =
                                        wo.job_type?.trim() ||
                                        wo.description?.trim() ||
                                        wo.work_order_number ||
                                        "Work Order";

                                    const workOrderMeta = [
                                        wo.work_order_number,
                                        wo.service_address,
                                    ].filter(Boolean).join(" · ");

                                    return (
                                        <div
                                            key={wo.work_order_id}
                                            onClick={() => {
                                                if (checked) {
                                                    setSelectedWOs(selectedWOs.filter((id) => id !== wo.work_order_id));
                                                } else {
                                                    setSelectedWOs([...selectedWOs, wo.work_order_id]);
                                                }
                                            }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: 12,
                                                border: checked
                                                    ? `1px solid ${MR_THEME.colors.primary}`
                                                    : `1px solid ${MR_THEME.colors.border}`,
                                                borderRadius: MR_THEME.radius.control,
                                                padding: 14,
                                                background: checked ? MR_THEME.colors.primarySoft : MR_THEME.colors.cardBg,
                                                cursor: "pointer",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onClick={(e) => e.stopPropagation()}
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

                                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                    <div
                                                        style={{
                                                            fontWeight: 800,
                                                            fontSize: 14,
                                                            color: MR_THEME.colors.textPrimary,
                                                            letterSpacing: "-0.01em",
                                                        }}
                                                    >
                                                        {workOrderTitle}
                                                    </div>

                                                    <div
                                                        style={{
                                                            fontSize: 13,
                                                            color: MR_THEME.colors.textSecondary,
                                                        }}
                                                    >
                                                        {workOrderMeta || "No service address"}

                                                    </div>

                                                    <div
                                                        style={{
                                                            fontSize: 12,
                                                            color: MR_THEME.colors.textMuted,
                                                        }}
                                                    >
                                                        {wo.created_at
                                                            ? new Date(wo.created_at).toLocaleDateString("en-CA", {
                                                                year: "numeric",
                                                                month: "short",
                                                                day: "numeric",
                                                            })
                                                            : ""}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ textAlign: "right" }}>
                                                <div style={{
                                                    fontSize: 12, color: MR_THEME.colors.textMuted
                                                    , marginBottom: 4
                                                }}>
                                                    Subtotal
                                                </div>
                                                <div style={{
                                                    fontWeight: 900, color: MR_THEME.colors.textPrimary
                                                }}>
                                                    {Number(wo.subtotal ?? 0).toLocaleString("en-CA", {
                                                        style: "currency",
                                                        currency: "CAD",
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </div>
                                            </div>
                                        </div>
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
                                        borderRadius: MR_THEME.radius.control,
                                        border: `1px solid ${MR_THEME.colors.border}`,
                                        background: MR_THEME.colors.cardBgSoft,
                                    }}
                                >
                                    <div style={{
                                        fontSize: 12, color: MR_THEME.colors.textSecondary
                                        , fontWeight: 700, marginBottom: 6
                                    }}>
                                        Subtotal
                                    </div>
                                    <div style={{
                                        fontWeight: 900, fontSize: 18, color: MR_THEME.colors.textPrimary
                                    }}>
                                        {formatMoney(selectedPreviewTotals.subtotal)}
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
                                        {formatMoney(selectedPreviewTotals.tax)}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        padding: 14,
                                        borderRadius: MR_THEME.radius.control,
                                        border: `1px solid ${MR_THEME.colors.primary}`,
                                        background: MR_THEME.colors.primary,
                                        color: "#ffffff",
                                    }}

                                >
                                    <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 700, marginBottom: 6 }}>
                                        Total
                                    </div>

                                    <div style={{ fontWeight: 900, fontSize: 18 }}>
                                        {formatMoney(selectedPreviewTotals.total)}
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
                                        borderRadius: MR_THEME.radius.control,
                                        border:
                                            generatingPeriodInvoice || selectedWOs.length === 0
                                                ? `1px solid ${MR_THEME.colors.borderStrong}`
                                                : `1px solid ${MR_THEME.colors.primary}`,
                                        background:
                                            generatingPeriodInvoice || selectedWOs.length === 0
                                                ? MR_THEME.colors.cardBgSoft
                                                : MR_THEME.colors.primary,
                                        color:
                                            generatingPeriodInvoice || selectedWOs.length === 0
                                                ? MR_THEME.colors.textMuted
                                                : "#ffffff",
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
                                                : MR_THEME.shadows.cardSoft,
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

                <style jsx>{`
                    @media (max-width: 720px) {
                        .recentWorkOrderRow {
                            display: grid !important;
                            grid-template-columns: 1fr !important;
                            gap: 12px !important;
                        }

                        .recentWorkOrderActions {
                            width: 100%;
                            margin-left: 0 !important;
                            justify-content: space-between !important;
                            align-items: center !important;
                        }

                        .recentWorkOrderMeta {
                            align-items: flex-start !important;
                        }

                        .recentWorkOrderButton {
                            min-width: 112px;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}

