"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

async function getDefaultTaxRate(companyId: string) {
    // Fallback MVP (ON HST). Luego lo hacemos por país si hace falta.
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

type InvoiceRow = {
    invoice_id: string;
    invoice_number: string | null;
    status: string | null;
    customer_name: string | null;
    currency_code: string | null;
    subtotal: number | null;
    tax_total: number | null;
    total: number | null;
    balance_due: number | null;
    created_at: string | null;
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
};
function money(amount: any, currencyCode?: string | null) {
    const x = Number(amount ?? 0);
    const value = Number.isFinite(x) ? x : 0;

    const currency = (currencyCode ?? "CAD").toUpperCase();

    // COP casi siempre va sin decimales
    const decimals = currency === "COP" ? 0 : 2;

    const locale = currency === "COP" ? "es-CO" : "en-CA";

    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}

export default function InvoicePage() {
    const router = useRouter();
    const params = useParams();
    const invoiceId = (params as any)?.invoiceId as string;

    const [inv, setInv] = useState<InvoiceRow | null>(null);
    const [items, setItems] = useState<InvoiceItemRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    // form simple para agregar item
    const [desc, setDesc] = useState("");
    const [qty, setQty] = useState<number>(1);
    const [unitPrice, setUnitPrice] = useState<number>(0);
    const [taxable, setTaxable] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadAll = useCallback(async () => {
        if (!invoiceId) return;

        setLoading(true);
        setErr("");
        try {
            const { data: invData, error: invErr } = await supabase
                .from("invoices")
                .select(
                    "invoice_id, company_id, invoice_number, status, customer_name, currency_code, subtotal, tax_total, total, balance_due, created_at",
                )
                .eq("invoice_id", invoiceId)
                .single();

            if (invErr) throw invErr;

            const { data: itemData, error: itemErr } = await supabase
                .from("invoice_items")
                .select(
                    "invoice_item_id, description, qty, unit_price, tax_rate, line_subtotal, line_tax, line_total, created_at",
                )
                .eq("invoice_id", invoiceId)
                .order("created_at", { ascending: true });

            if (itemErr) throw itemErr;

            setInv((invData as any) ?? null);
            console.log("DEBUG invData.company_id =", (invData as any)?.company_id);
            setItems((itemData as any) ?? []);
        } catch (e: any) {
            setErr(e?.message ?? "Error cargando invoice");
            setInv(null);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [invoiceId]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    // realtime: si cambian items o invoice (por trigger), refrescar
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
                },
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
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(ch);
        };
    }, [invoiceId, loadAll]);

    const totals = useMemo(() => {
        // Fuente de verdad: DB (invoices.*). Si todavía no ha cargado, hacemos fallback
        // SOLO a columnas calculadas (line_*), sin recalcular con qty*unit_price.
        const rows = (items as any[]) ?? [];

        const subtotalFromLines = rows.reduce((acc, it) => acc + Number(it.line_subtotal ?? 0), 0);
        const taxFromLines = rows.reduce((acc, it) => acc + Number(it.line_tax ?? 0), 0);
        const totalFromLines = rows.reduce((acc, it) => acc + Number(it.line_total ?? 0), 0);

        const subtotal = Number(inv?.subtotal ?? subtotalFromLines);
        const tax = Number(inv?.tax_total ?? taxFromLines);

        // Preferir inv.total; si no, usamos el total de líneas; si no, subtotal+tax.
        const total = Number(inv?.total ?? (totalFromLines || (subtotal + tax)));

        const balance = Number(inv?.balance_due ?? total);

        return { subtotal, tax, total, balance };
    }, [inv, items]); const addItem = useCallback(async () => {
        if (!invoiceId) return;
        if (!desc.trim()) {
            alert("Descripción requerida");
            return;
        }

        setSaving(true);
        try {
            // usamos tax_rate de la invoice si taxable, si no 0
            // si tu invoice_items necesita company_id, lo tomamos de la invoice
            const companyId = (inv as any)?.company_id as string | undefined;

            if (!(inv as any)?.company_id) {
                throw new Error("Invoice sin company_id (no puedo agregar items)");
            }

            if (!companyId) throw new Error("Invoice sin company_id (no puedo agregar items)");

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

            // loadAll lo hace realtime, pero igual refrescamos por seguridad
            await loadAll();
        } catch (e: any) {
            alert("No se pudo agregar item: " + (e?.message ?? e));
        } finally {
            setSaving(false);
        }
    }, [invoiceId, desc, qty, unitPrice, taxable, inv, loadAll]);

    return (
        <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                    <h1 style={{ margin: 0 }}>Invoice</h1>
                    <div style={{ opacity: 0.7, fontFamily: "monospace" }}>
                        {invoiceId}
                    </div>
                </div>

                <button
                    onClick={() => router.back()}
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
                    ← Volver
                </button>
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
                    <div style={{ display: "grid", gap: 6 }}>
                        <div>
                            <b>Invoice #:</b> {inv.invoice_number ?? "—"}
                        </div>
                        <div>
                            <b>Cliente:</b> {inv.customer_name ?? "—"}
                        </div>
                        <div>
                            <b>Status:</b> {inv.status ?? "—"}
                        </div>
                        <div>
                            <b>Moneda:</b> {inv.currency_code ?? "—"}
                        </div>

                        <hr
                            style={{
                                margin: "10px 0",
                                border: "none",
                                borderTop: "1px solid #eee",
                            }}
                        />

                        <div>
                            <b>Subtotal:</b> {money(inv?.subtotal ?? totals.subtotal, inv?.currency_code)}
                        </div>
                        <div>
                            <b>Tax:</b> {money(inv?.tax_total ?? totals.tax, inv?.currency_code)}
                        </div>
                        <div>
                            <b>Total:</b> {money(inv?.total ?? totals.total, inv?.currency_code)}
                        </div>
                        <div>
                            <b>Balance due:</b> {money(inv?.balance_due ?? totals.balance, inv?.currency_code)}
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Items */}
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

                {/* Add item */}
                <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, opacity: 0.8 }}>Descripción</span>
                        <input
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Ej: Mano de obra / Material"
                            style={{
                                padding: 10,
                                border: "1px solid #ddd",
                                borderRadius: 8,
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
                                style={{
                                    padding: 10,
                                    border: "1px solid #ddd",
                                    borderRadius: 8,
                                }}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontSize: 12, opacity: 0.8 }}>Unit price</span>
                            <input
                                type="number"
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(Number(e.target.value))}
                                style={{
                                    padding: 10,
                                    border: "1px solid #ddd",
                                    borderRadius: 8,
                                }}
                            />
                        </label>

                        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24 }}>
                            <input
                                type="checkbox"
                                checked={taxable}
                                onChange={(e) => setTaxable(e.target.checked)}
                            />
                            <span style={{ fontSize: 13 }}>Taxable</span>
                        </label>
                    </div>

                    <button
                        type="button"
                        onClick={addItem}
                        disabled={saving}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #111",
                            background: "#111",
                            color: "white",
                            cursor: "pointer",
                            fontWeight: 900,
                            width: "fit-content",
                            opacity: saving ? 0.7 : 1,
                        }}
                    >
                        {saving ? "Agregando..." : "+ Add item"}
                    </button>
                </div>

                {/* List items */}
                {items.length === 0 ? (
                    <div style={{ opacity: 0.7 }}>No hay items aún.</div>
                ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                        {items.map((it) => (
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
                                <div>
                                    <div style={{ fontWeight: 800 }}>{it.description ?? "Item"}</div>
                                    <div style={{ opacity: 0.75, fontSize: 12 }}>
                                        qty: {it.qty ?? 0} · unit: {it.unit_price ?? 0} · tax_rate:{" "}
                                        {it.tax_rate ?? 0}
                                    </div>
                                </div>
                                <div style={{ textAlign: "right", fontFamily: "monospace" }}>
                                    <div>sub: {money(it.line_subtotal ?? (Number(it.qty ?? 0) * Number(it.unit_price ?? 0)), inv?.currency_code)}</div>
                                    <div>tax: {money(it.line_tax ?? (Number(it.qty ?? 0) * Number(it.unit_price ?? 0) * Number(it.tax_rate ?? 0)), inv?.currency_code)}</div>
                                    <div>
                                        <b>total: {money(it.line_total ?? (
                                            (Number(it.qty ?? 0) * Number(it.unit_price ?? 0)) +
                                            (Number(it.qty ?? 0) * Number(it.unit_price ?? 0) * Number(it.tax_rate ?? 0))
                                        ), inv?.currency_code)
                                        }</b>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}