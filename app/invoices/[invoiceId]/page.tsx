"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { supabase } from "../../../lib/supabaseClient";
import InvoicePaymentsSection from "./components/InvoicePaymentsSection";
import IncludedWorkOrdersSection from "./components/IncludedWorkOrdersSection";
import RecordPaymentModal from "./components/RecordPaymentModal";

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

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

type InvoiceRow = {
    invoice_id: string;
    invoice_number: string | null;
    status: string | null;
    customer_name: string | null;
    customer_phone?: string | null;
    customer_email?: string | null;
    billing_address?: string | null;
    invoice_date?: string | null;
    due_date?: string | null;
    currency_code: string | null;
    subtotal: number | null;
    tax_total: number | null;
    total: number | null;
    balance_due: number | null;
    deposit_required?: number | null;
    created_at: string | null;
    company_id?: string | null;
};

type InvoiceItemRow = {
    invoice_item_id: string;
    description: string | null;
    qty: number | null;
    unit_price: number | null;
    tax_rate: number | null;
    line_subtotal: number | null;
    line_tax: number | null;
    line_total: number | null;
    created_at: string | null;
    synced_from_wo?: boolean | null;
};

type InvoicePaymentRow = {
    payment_id: string;
    amount: number | null;
    payment_method: string | null;
    payment_date: string | null;
    notes: string | null;
    created_at: string | null;
};

type IncludedWorkOrderRow = {
    work_order_id: string;
    work_order_number: string | null;
    description: string | null;
    created_at: string | null;
};

function money(amount: any, currencyCode?: string | null) {
    const x = Number(amount ?? 0);
    const value = Number.isFinite(x) ? x : 0;

    const currency = (currencyCode ?? "CAD").toUpperCase();
    const decimals = currency === "COP" ? 0 : 2;
    const locale = currency === "COP" ? "es-CO" : "en-CA";

    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}

function normalizeStatus(status: string | null | undefined) {
    return String(status ?? "").trim().toLowerCase();
}

function statusBadgeStyle(status: string | null | undefined): React.CSSProperties {
    const s = normalizeStatus(status);

    if (s === "draft") {
        return {
            background: "#e5e7eb",
            color: "#374151",
            border: "1px solid #d1d5db",
        };
    }

    if (s === "sent") {
        return {
            background: "#dbeafe",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
        };
    }

    if (s === "partially_paid") {
        return {
            background: "#fef3c7",
            color: "#b45309",
            border: "1px solid #fde68a",
        };
    }

    if (s === "paid") {
        return {
            background: "#dcfce7",
            color: "#166534",
            border: "1px solid #bbf7d0",
        };
    }

    if (s === "overdue") {
        return {
            background: "#fee2e2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
        };
    }

    return {
        background: "#f3f4f6",
        color: "#111827",
        border: "1px solid #e5e7eb",
    };
}

function prettyStatus(status: string | null | undefined) {
    const s = normalizeStatus(status);
    if (!s) return "—";
    return s.replaceAll("_", " ").toUpperCase();
}

export default function InvoicePage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const invoiceId = (params as any)?.invoiceId as string;
    const fromWorkOrder = searchParams.get("fromWorkOrder");

    const [inv, setInv] = useState<InvoiceRow | null>(null);
    const [items, setItems] = useState<InvoiceItemRow[]>([]);
    const [payments, setPayments] = useState<InvoicePaymentRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const [billingEmail, setBillingEmail] = useState("");
    const [savingBillingEmail, setSavingBillingEmail] = useState(false);

    const [desc, setDesc] = useState("");
    const [qty, setQty] = useState<number>(1);
    const [unitPrice, setUnitPrice] = useState<number>(0);
    const [taxable, setTaxable] = useState(true);
    const [saving, setSaving] = useState(false);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [paymentDate, setPaymentDate] = useState(todayIso());
    const [paymentNotes, setPaymentNotes] = useState("");
    const [savingPayment, setSavingPayment] = useState(false);

    const [sendingInvoice, setSendingInvoice] = useState(false);
    const [includedWorkOrders, setIncludedWorkOrders] = useState<IncludedWorkOrderRow[]>([]);



    const loadAll = useCallback(async () => {
        if (!invoiceId) return;

        setLoading(true);
        setErr("");

        try {
            const { data: invData, error: invErr } = await supabase
                .from("invoices")
                .select(
                    "invoice_id, company_id, invoice_number, status, customer_name, customer_phone, customer_email, billing_address, invoice_date, due_date, currency_code, subtotal, tax_total, total, balance_due, deposit_required, created_at"
                )
                .eq("invoice_id", invoiceId)
                .single();

            if (invErr) throw invErr;

            const { data: itemData, error: itemErr } = await supabase
                .from("invoice_items")
                .select(
                    "invoice_item_id, description, qty, unit_price, tax_rate, line_subtotal, line_tax, line_total, synced_from_wo, created_at"
                )
                .eq("invoice_id", invoiceId)
                .order("created_at", { ascending: true });

            if (itemErr) throw itemErr;

            const { data: paymentData, error: paymentErr } = await supabase
                .from("invoice_payments")
                .select("payment_id, amount, payment_method, payment_date, notes, created_at")
                .eq("invoice_id", invoiceId)
                .order("payment_date", { ascending: true })
                .order("created_at", { ascending: true });

            if (paymentErr) throw paymentErr;

            const { data: iwoData, error: iwoErr } = await supabase
                .from("invoice_work_orders")
                .select(`
        work_order_id,
        work_orders (
            work_order_id,
            work_order_number,
            description,
            created_at
        )
    `)
                .eq("invoice_id", invoiceId);

            if (iwoErr) throw iwoErr;

            const nextInv = (invData as any) ?? null;

            const normalizedIncludedWOs: IncludedWorkOrderRow[] = ((iwoData as any[]) ?? []).map((row: any) => {
                const wo = Array.isArray(row.work_orders) ? row.work_orders[0] : row.work_orders;

                return {
                    work_order_id: wo?.work_order_id ?? row.work_order_id,
                    work_order_number: wo?.work_order_number ?? null,
                    description: wo?.description ?? null,
                    created_at: wo?.created_at ?? null,
                };
            });

            setInv(nextInv);
            setBillingEmail(String(nextInv?.customer_email ?? ""));
            setItems((itemData as any) ?? []);
            setPayments((paymentData as any) ?? []);
            setIncludedWorkOrders(normalizedIncludedWOs);

        } catch (e: any) {
            setErr(e?.message ?? "Error cargando invoice");
            setInv(null);
            setItems([]);
            setPayments([]);
            setIncludedWorkOrders([]);
        } finally {
            setLoading(false);
        }
    }, [invoiceId]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    useEffect(() => {
        if (!invoiceId) return;

        const ch = supabase
            .channel(`invoice:${invoiceId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "invoice_items",
                    filter: `invoice_id=eq.${invoiceId}`,
                },
                async () => {
                    await loadAll();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "invoices",
                    filter: `invoice_id=eq.${invoiceId}`,
                },
                async () => {
                    await loadAll();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "invoice_payments",
                    filter: `invoice_id=eq.${invoiceId}`,
                },
                async () => {
                    await loadAll();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(ch);
        };
    }, [invoiceId, loadAll]);

    const invoiceStatus = normalizeStatus(inv?.status);

    const isDraft = useMemo(() => {
        return invoiceStatus === "draft";
    }, [invoiceStatus]);
    const canResend = useMemo(() => {
        return invoiceStatus === "sent" || invoiceStatus === "partial" || invoiceStatus === "partially_paid";
    }, [invoiceStatus]);

    const totals = useMemo(() => {
        const rows = (items as any[]) ?? [];

        const subtotalFromLines = rows.reduce((acc, it) => acc + Number(it.line_subtotal ?? 0), 0);
        const taxFromLines = rows.reduce((acc, it) => acc + Number(it.line_tax ?? 0), 0);
        const totalFromLines = rows.reduce((acc, it) => acc + Number(it.line_total ?? 0), 0);

        const subtotal = Number(inv?.subtotal ?? subtotalFromLines);
        const tax = Number(inv?.tax_total ?? taxFromLines);
        const total = Number(inv?.total ?? (totalFromLines || subtotal + tax));

        const depositRequired = Number(inv?.deposit_required ?? 0);

        const balance =
            inv?.balance_due != null
                ? Number(inv.balance_due)
                : Math.max(0, total - depositRequired);

        return { subtotal, tax, total, balance };
    }, [inv, items]);

    const depositRequired = Number(inv?.deposit_required ?? 0);

    const paymentsTotal = useMemo(() => {
        return payments.reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
    }, [payments]);

    const currentBalance = Number(inv?.balance_due ?? totals.balance ?? 0);
    const canRecordPayment = !!inv?.invoice_id && currentBalance > 0;

    const resetPaymentForm = useCallback(() => {
        setPaymentAmount(0);
        setPaymentMethod("cash");
        setPaymentDate(todayIso());
        setPaymentNotes("");
    }, []);

    const openPaymentModal = useCallback(() => {
        if (!canRecordPayment) return;
        resetPaymentForm();
        setShowPaymentModal(true);
    }, [canRecordPayment, resetPaymentForm]);

    const closePaymentModal = useCallback(() => {
        setShowPaymentModal(false);
        setSendingInvoice(false);
        resetPaymentForm();
    }, [resetPaymentForm]);

    const addItem = useCallback(async () => {
        if (!invoiceId) return;

        const status = normalizeStatus(inv?.status);
        if (status !== "draft") {
            alert("Esta invoice no está en draft. No se pueden agregar items.");
            return;
        }

        if (!desc.trim()) {
            alert("Descripción requerida");
            return;
        }

        setSaving(true);
        try {
            const companyId = inv?.company_id as string | undefined;

            if (!inv?.company_id || !companyId) {
                throw new Error("Invoice sin company_id (no puedo agregar items)");
            }

            const taxRate = taxable ? await getDefaultTaxRate(companyId) : 0;

            const { error } = await supabase.from("invoice_items").insert({
                company_id: companyId,
                invoice_id: invoiceId,
                description: desc,
                qty: qty ?? 1,
                unit_price: unitPrice ?? 0,
                tax_rate: taxRate,
            });

            if (error) throw error;

            setDesc("");
            setQty(1);
            setUnitPrice(0);
            setTaxable(true);

            await loadAll();
        } catch (e: any) {
            alert("No se pudo agregar item: " + (e?.message ?? e));
        } finally {
            setSaving(false);
        }
    }, [invoiceId, desc, qty, unitPrice, taxable, inv, loadAll]);

    const sendInvoice = useCallback(async () => {
        if (!invoiceId) return;

        if (!inv?.invoice_id) {
            alert("Invoice no disponible");
            return;
        }

        const status = normalizeStatus(inv.status);

        if (!["draft", "sent", "partial", "partially_paid"].includes(status)) {
            alert("Esta invoice no se puede enviar.");
            return;
        }

        setSendingInvoice(true);

        try {
            const res = await fetch(`/api/invoices/${invoiceId}/send`, {
                method: "POST",
            });

            let payload: any = null;
            try {
                payload = await res.json();
            } catch {
                payload = null;
            }

            if (!res.ok) {
                throw new Error(payload?.error || payload?.message || "No se pudo enviar la invoice");
            }

            alert("Invoice email sent");
            await loadAll();
            router.refresh();
        } catch (e: any) {
            alert(e?.message ?? "Error enviando invoice");
        } finally {
            setSendingInvoice(false);
        }
    }, [invoiceId, inv, loadAll, router]);
    const saveBillingEmail = useCallback(async () => {
        if (!inv?.invoice_id) {
            alert("Invoice no disponible");
            return;
        }

        const nextEmail = billingEmail.trim();

        if (!nextEmail) {
            alert("Billing email is required");
            return;
        }

        setSavingBillingEmail(true);

        try {
            const { error } = await supabase
                .from("invoices")
                .update({
                    customer_email: nextEmail,
                })
                .eq("invoice_id", inv.invoice_id);

            if (error) {
                alert("No se pudo guardar billing email: " + error.message);
                return;
            }

            await loadAll();
            router.refresh();
            alert("Billing email updated");
        } finally {
            setSavingBillingEmail(false);
        }
    }, [inv, billingEmail, loadAll, router]);
    const savePayment = useCallback(async () => {
        if (!inv?.invoice_id || !inv?.company_id) return;

        const amount = Number(paymentAmount);

        if (!Number.isFinite(amount) || amount <= 0) {
            alert("Invalid payment amount");
            return;
        }

        if (!paymentDate) {
            alert("Payment date is required");
            return;
        }

        if (currentBalance <= 0) {
            alert("This invoice is already fully paid.");
            return;
        }

        if (amount > currentBalance) {
            alert(`Payment cannot exceed current balance (${money(currentBalance, inv.currency_code)}).`);
            return;
        }

        setSavingPayment(true);
        try {
            const { error } = await supabase.from("invoice_payments").insert({
                invoice_id: inv.invoice_id,
                company_id: inv.company_id,
                amount,
                payment_method: paymentMethod,
                payment_date: paymentDate,
                notes: paymentNotes.trim() || null,
            });

            if (error) {
                alert("Error saving payment: " + error.message);
                return;
            }

            closePaymentModal();
            await loadAll();
            router.refresh();
        } finally {
            setSavingPayment(false);
        }
    }, [
        inv,
        paymentAmount,
        paymentMethod,
        paymentDate,
        paymentNotes,
        currentBalance,
        closePaymentModal,
        loadAll,
        router,
    ]);

    return (
        <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                    <h1 style={{ margin: 0 }}>Invoice</h1>
                    <div style={{ opacity: 0.7, fontFamily: "monospace" }}>{invoiceId}</div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {inv ? (
                        <a
                            href={
                                fromWorkOrder
                                    ? `/api/invoices/${invoiceId}/html?mode=preview&fromWorkOrder=${encodeURIComponent(fromWorkOrder)}`
                                    : `/api/invoices/${invoiceId}/html?mode=preview`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid #2563eb",
                                background: "#2563eb",
                                color: "white",
                                textDecoration: "none",
                                cursor: "pointer",
                                fontWeight: 900,
                                height: "fit-content",
                                display: "inline-flex",
                                alignItems: "center",
                            }}
                            title="Abrir vista HTML de la factura"
                        >
                            View HTML
                        </a>
                    ) : null}

                    {inv ? (
                        <a
                            href={`/api/invoices/${invoiceId}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid #0f172a",
                                background: "#0f172a",
                                color: "white",
                                textDecoration: "none",
                                cursor: "pointer",
                                fontWeight: 900,
                                height: "fit-content",
                                display: "inline-flex",
                                alignItems: "center",
                            }}
                            title="Abrir PDF de la factura"
                        >
                            Download PDF
                        </a>
                    ) : null}

                    <button
                        onClick={sendInvoice}
                        disabled={!inv || (!isDraft && !canResend) || sendingInvoice}
                        title={
                            !inv
                                ? "Invoice no disponible"
                                : !isDraft && !canResend
                                    ? "Esta factura no se puede enviar"
                                    : canResend
                                        ? "Resend invoice"
                                        : "Send invoice"
                        }
                        style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #7c3aed",
                            background: !inv || (!isDraft && !canResend) ? "#c4b5fd" : "#7c3aed",
                            color: "white",
                            cursor: !inv || (!isDraft && !canResend) || sendingInvoice ? "not-allowed" : "pointer",
                            fontWeight: 900,
                            opacity: !inv || (!isDraft && !canResend) || sendingInvoice ? 0.85 : 1,
                        }}
                    >
                        {sendingInvoice ? "Sending..." : canResend ? "Resend Invoice" : "Send Invoice"}
                    </button>

                    {canRecordPayment ? (
                        <button
                            onClick={openPaymentModal}
                            title="Record a payment"
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid #16a34a",
                                background: "#16a34a",
                                color: "white",
                                cursor: "pointer",
                                fontWeight: 900,
                                height: "fit-content",
                            }}
                        >
                            Record Payment
                        </button>
                    ) : null}

                    <button
                        onClick={() => {
                            if (fromWorkOrder) {
                                router.push(`/work-orders/${fromWorkOrder}`);
                                return;
                            }
                            router.back();
                        }}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #ddd",
                            background: "white",
                            cursor: "pointer",
                            fontWeight: 800,
                            height: "fit-content",
                        }}
                    >
                        {fromWorkOrder ? "← Back to Work Order" : "← Back"}
                    </button>
                </div>
            </div>

            {loading ? <div style={{ marginTop: 16 }}>Cargando…</div> : null}

            {err ? (
                <div
                    style={{
                        marginTop: 16,
                        padding: 12,
                        borderRadius: 10,
                        border: "1px solid #f3caca",
                        background: "#fff5f5",
                        color: "#a40000",
                        fontWeight: 700,
                    }}
                >
                    {err}
                </div>
            ) : null}

            {inv ? (
                <div
                    style={{
                        marginTop: 16,
                        padding: 14,
                        borderRadius: 12,
                        border: "1px solid #eee",
                        background: "white",
                    }}
                >
                    <div style={{ display: "grid", gap: 8 }}>
                        <div>
                            <b>Invoice #:</b> {inv.invoice_number ?? "—"}
                        </div>

                        {inv.invoice_date ? (
                            <div>
                                <b>Invoice Date:</b> {inv.invoice_date}
                            </div>
                        ) : null}

                        {inv.due_date ? (
                            <div>
                                <b>Due Date:</b> {inv.due_date}
                            </div>
                        ) : null}

                        <div>
                            <b>Customer:</b> {inv.customer_name ?? "—"}
                        </div>

                        {inv.customer_phone ? (
                            <div>
                                <b>Tel:</b> {inv.customer_phone}
                            </div>
                        ) : null}

                        <div style={{ display: "grid", gap: 6 }}>
                            <b>Billing Email:</b>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                <input
                                    type="email"
                                    value={billingEmail}
                                    onChange={(e) => setBillingEmail(e.target.value)}
                                    placeholder="customer@example.com"
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: 8,
                                        border: "1px solid #ddd",
                                        minWidth: 280,
                                        flex: "1 1 320px",
                                    }}
                                />

                                <button
                                    type="button"
                                    onClick={saveBillingEmail}
                                    disabled={savingBillingEmail || !inv?.invoice_id}
                                    style={{
                                        padding: "10px 14px",
                                        borderRadius: 10,
                                        border: "1px solid #111",
                                        background: "#111",
                                        color: "white",
                                        cursor: savingBillingEmail ? "not-allowed" : "pointer",
                                        fontWeight: 800,
                                        opacity: savingBillingEmail ? 0.7 : 1,
                                    }}
                                >
                                    {savingBillingEmail ? "Saving..." : "Save Billing Email"}
                                </button>
                            </div>
                        </div>

                        {inv.billing_address ? (
                            <div>
                                <b>Address:</b> {inv.billing_address}
                            </div>
                        ) : null}

                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <b>Status:</b>
                            <span
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: 900,
                                    letterSpacing: 0.3,
                                    ...statusBadgeStyle(inv.status),
                                }}
                            >
                                {prettyStatus(inv.status)}
                            </span>
                        </div>

                        <div>
                            <b>Currency:</b> {inv.currency_code ?? "—"}
                        </div>

                        {!isDraft ? (
                            <div
                                style={{
                                    marginTop: 10,
                                    padding: 10,
                                    borderRadius: 10,
                                    background: "#fff7e6",
                                    border: "1px solid #ffe1a8",
                                    fontWeight: 700,
                                }}
                            >
                                This invoice is in <b>{prettyStatus(inv.status)}</b> status. It is currently read-only.
                            </div>
                        ) : null}

                        <hr style={{ margin: "10px 0", border: "none", borderTop: "1px solid #eee" }} />
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, 1fr)",
                                gap: 12,
                                marginBottom: 14,
                            }}
                        >
                            <div
                                style={{
                                    background: "#f8fafc",
                                    border: "1px solid #eee",
                                    borderRadius: 10,
                                    padding: 12,
                                }}
                            >
                                <div style={{ fontSize: 11, opacity: 0.7 }}>TOTAL</div>
                                <div style={{ fontSize: 18, fontWeight: 900 }}>
                                    {money(inv.total ?? totals.total, inv.currency_code)}
                                </div>
                            </div>

                            <div
                                style={{
                                    background: "#f0fdf4",
                                    border: "1px solid #bbf7d0",
                                    borderRadius: 10,
                                    padding: 12,
                                }}
                            >
                                <div style={{ fontSize: 11, opacity: 0.7 }}>PAID</div>
                                <div style={{ fontSize: 18, fontWeight: 900 }}>
                                    {money(paymentsTotal, inv.currency_code)}
                                </div>
                            </div>

                            <div
                                style={{
                                    background: "#fff7ed",
                                    border: "1px solid #fed7aa",
                                    borderRadius: 10,
                                    padding: 12,
                                }}
                            >
                                <div style={{ fontSize: 11, opacity: 0.7 }}>BALANCE</div>
                                <div style={{ fontSize: 18, fontWeight: 900 }}>
                                    {money(inv.balance_due ?? totals.balance, inv.currency_code)}
                                </div>
                            </div>
                        </div>
                        <div>
                            <b>Subtotal:</b> {money(inv.subtotal ?? totals.subtotal, inv.currency_code)}
                        </div>

                        <div>
                            <b>Tax:</b> {money(inv.tax_total ?? totals.tax, inv.currency_code)}
                        </div>

                        <div>
                            <b>Total:</b> {money(inv.total ?? totals.total, inv.currency_code)}
                        </div>

                        {depositRequired > 0 ? (
                            <div>
                                <b>Deposit Required:</b> {money(depositRequired, inv.currency_code)}
                            </div>
                        ) : null}

                        {payments.length > 0 ? (
                            <div>
                                <b>Payments Received:</b> {money(paymentsTotal, inv.currency_code)}
                            </div>
                        ) : null}

                        <div>
                            <b>Balance Due:</b> {money(inv.balance_due ?? totals.balance, inv.currency_code)}
                        </div>
                        {(inv.total ?? totals.total) > 0 ? (
                            <div style={{ marginTop: 14 }}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 6,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: "#555",
                                    }}
                                >
                                    <span>Payment Progress</span>
                                    <span>
                                        {Math.min(
                                            100,
                                            Math.round(
                                                (paymentsTotal / Math.max(Number(inv.total ?? totals.total), 1)) * 100
                                            )
                                        )}
                                        %
                                    </span>
                                </div>

                                <div
                                    style={{
                                        width: "100%",
                                        height: 10,
                                        background: "#e5e7eb",
                                        borderRadius: 999,
                                        overflow: "hidden",
                                    }}
                                >
                                    <div
                                        style={{
                                            height: "100%",
                                            width: `${Math.min(
                                                100,
                                                (paymentsTotal / Math.max(Number(inv.total ?? totals.total), 1)) * 100
                                            )}%`,
                                            background:
                                                (inv.balance_due ?? totals.balance) <= 0 ? "#10b981" : "#2563eb",
                                            transition: "width 0.25s ease",
                                        }}
                                    />
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <InvoicePaymentsSection
                payments={payments}
                currencyCode={inv?.currency_code}
                money={money}
            />
            <IncludedWorkOrdersSection
                workOrders={includedWorkOrders}
                onOpenWorkOrder={(workOrderId) => router.push(`/work-orders/${workOrderId}`)}
            />
            <div
                style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 12,
                    border: "1px solid #eee",
                    background: "white",
                }}
            >
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Items</div>

                <div style={{ display: "grid", gap: 10, marginBottom: 12, opacity: isDraft ? 1 : 0.75 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, opacity: 0.8 }}>Descripción</span>
                        <input
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Ej: Mano de obra / Material"
                            disabled={!isDraft}
                            style={{
                                padding: 10,
                                border: "1px solid #ddd",
                                borderRadius: 8,
                                background: !isDraft ? "#f6f6f6" : "white",
                            }}
                        />
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontSize: 12, opacity: 0.8 }}>Qty</span>
                            <input
                                type="number"
                                value={qty}
                                onChange={(e) => setQty(Number(e.target.value))}
                                disabled={!isDraft}
                                style={{
                                    padding: 10,
                                    border: "1px solid #ddd",
                                    borderRadius: 8,
                                    background: !isDraft ? "#f6f6f6" : "white",
                                }}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontSize: 12, opacity: 0.8 }}>Unit price</span>
                            <input
                                type="number"
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(Number(e.target.value))}
                                disabled={!isDraft}
                                style={{
                                    padding: 10,
                                    border: "1px solid #ddd",
                                    borderRadius: 8,
                                    background: !isDraft ? "#f6f6f6" : "white",
                                }}
                            />
                        </label>

                        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24 }}>
                            <input
                                type="checkbox"
                                checked={taxable}
                                onChange={(e) => setTaxable(e.target.checked)}
                                disabled={!isDraft}
                            />
                            <span style={{ fontSize: 13 }}>Taxable</span>
                        </label>
                    </div>

                    <button
                        type="button"
                        onClick={addItem}
                        disabled={saving || !isDraft}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #111",
                            background: isDraft ? "#111" : "#999",
                            color: "white",
                            cursor: saving || !isDraft ? "not-allowed" : "pointer",
                            fontWeight: 900,
                            width: "fit-content",
                            opacity: saving || !isDraft ? 0.7 : 1,
                        }}
                    >
                        {!isDraft ? "Invoice read-only" : saving ? "Agregando..." : "+ Add item"}
                    </button>
                </div>

                {items.length === 0 ? (
                    <div style={{ opacity: 0.7 }}>No hay items aún.</div>
                ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                        {items.map((it: any) => {
                            const qtyN = Number(it.qty ?? 0);
                            const unitN = Number(it.unit_price ?? 0);
                            const taxN = Number(it.tax_rate ?? 0);

                            const fallbackSub = qtyN * unitN;
                            const fallbackTax = fallbackSub * taxN;
                            const fallbackTotal = fallbackSub + fallbackTax;

                            const isManual = it.synced_from_wo !== true;
                            const canEdit = isDraft && isManual;

                            const updateItem = async (fields: any) => {
                                if (!canEdit) return;

                                const { error } = await supabase
                                    .from("invoice_items")
                                    .update(fields)
                                    .eq("invoice_item_id", it.invoice_item_id);

                                if (error) {
                                    alert("Error actualizando item: " + error.message);
                                    return;
                                }

                                await loadAll();
                            };

                            const deleteItem = async () => {
                                if (!canEdit) return;

                                const ok = confirm("¿Eliminar este item?");
                                if (!ok) return;

                                const { error } = await supabase
                                    .from("invoice_items")
                                    .delete()
                                    .eq("invoice_item_id", it.invoice_item_id);

                                if (error) {
                                    alert("Error eliminando item: " + error.message);
                                    return;
                                }

                                await loadAll();
                            };

                            return (
                                <div
                                    key={it.invoice_item_id}
                                    style={{
                                        padding: 12,
                                        border: "1px solid #eee",
                                        borderRadius: 10,
                                        background: "#fafafa",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 12,
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        {canEdit ? (
                                            <input
                                                defaultValue={it.description ?? ""}
                                                onBlur={(e) => updateItem({ description: e.target.value })}
                                                style={{
                                                    fontWeight: 800,
                                                    padding: "6px 8px",
                                                    borderRadius: 8,
                                                    border: "1px solid #ddd",
                                                    width: "100%",
                                                    marginBottom: 6,
                                                }}
                                            />
                                        ) : (
                                            <div style={{ fontWeight: 800 }}>{it.description ?? "Item"}</div>
                                        )}

                                        {canEdit ? (
                                            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                                <div style={{ fontSize: 12, opacity: 0.8 }}>qty:</div>
                                                <input
                                                    type="number"
                                                    defaultValue={qtyN}
                                                    onBlur={(e) => updateItem({ qty: Number(e.target.value) })}
                                                    style={{
                                                        width: 90,
                                                        padding: "6px 8px",
                                                        borderRadius: 8,
                                                        border: "1px solid #ddd",
                                                    }}
                                                />
                                                <div style={{ fontSize: 12, opacity: 0.8 }}>unit:</div>
                                                <input
                                                    type="number"
                                                    defaultValue={unitN}
                                                    onBlur={(e) => updateItem({ unit_price: Number(e.target.value) })}
                                                    style={{
                                                        width: 110,
                                                        padding: "6px 8px",
                                                        borderRadius: 8,
                                                        border: "1px solid #ddd",
                                                    }}
                                                />
                                                <div style={{ fontSize: 12, opacity: 0.8 }}>tax_rate: {taxN}</div>

                                                <button
                                                    type="button"
                                                    onClick={deleteItem}
                                                    style={{
                                                        marginLeft: "auto",
                                                        padding: "6px 10px",
                                                        borderRadius: 8,
                                                        border: "1px solid #ff4d4f",
                                                        background: "#ff4d4f",
                                                        color: "white",
                                                        cursor: "pointer",
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ opacity: 0.75, fontSize: 12 }}>
                                                qty: {qtyN} · unit: {unitN} · tax_rate: {taxN}
                                                {!isManual ? " · synced" : ""}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ textAlign: "right", fontFamily: "monospace", minWidth: 170 }}>
                                        <div>sub: {money(it.line_subtotal ?? fallbackSub, inv?.currency_code)}</div>
                                        <div>tax: {money(it.line_tax ?? fallbackTax, inv?.currency_code)}</div>
                                        <div>
                                            <b>total: {money(it.line_total ?? fallbackTotal, inv?.currency_code)}</b>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <RecordPaymentModal
                open={showPaymentModal}
                savingPayment={savingPayment}
                currentBalance={currentBalance}
                currencyCode={inv?.currency_code}
                paymentAmount={paymentAmount}
                paymentMethod={paymentMethod}
                paymentDate={paymentDate}
                paymentNotes={paymentNotes}
                money={money}
                onChangeAmount={setPaymentAmount}
                onChangeMethod={setPaymentMethod}
                onChangeDate={setPaymentDate}
                onChangeNotes={setPaymentNotes}
                onCancel={closePaymentModal}
                onSave={savePayment}
            />
        </div>
    );
}