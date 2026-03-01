"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { safeStatus, type WorkOrderStatus } from "../../../lib/supabase/workOrders";
import { useAuthState } from "../../../hooks/useAuthState";
import { useActiveCompany } from "../../../hooks/useActiveCompany";




type WorkOrder = {
    work_order_id: string;
    company_id: string | null;
    job_type: string;
    description: string;
    status: WorkOrderStatus;
    priority: string;
    scheduled_for: string | null;
    created_at: string;
    assigned_to: string | null;
};

export default function WorkOrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const workOrderId = (params as any)?.workOrderId as string;
    const { user, authLoading } = useAuthState();
    const myUserId = user?.id ?? null;

    const { companyId: activeCompanyId, isLoadingCompany } = useActiveCompany();

    // temporal mientras cargamos rol:
    const [myRole, setMyRole] = useState<string | null>(null);
    const isAdmin = myRole === "owner" || myRole === "admin";

    console.log("DEBUG myRole:", myRole, "isAdmin:", isAdmin);

    useEffect(() => {
        if (!activeCompanyId) return;
        if (!myUserId) return;

        (async () => {
            const { data, error } = await supabase
                .from("company_members")
                .select("role")
                .eq("company_id", activeCompanyId)
                .eq("user_id", myUserId)
                .maybeSingle();

            if (error) {
                console.log("DEBUG role load error:", error);
                setMyRole(null);
                return;
            }

            setMyRole((data as any)?.role ?? null);
        })();
    }, [activeCompanyId, myUserId]);

    const [wo, setWo] = useState<WorkOrder | null>(null);
    type WorkOrderItem = {
        item_id: string;
        description: string | null;
        pricing_status?: string | null;
        pending_pricing?: boolean | null;

        // legacy
        quantity: number | null;

        // mini biblia
        qty_planned: number | null;
        qty_done: number | null;

        // pricing
        unit_price: number | null;
        taxable: boolean | null;
    };
    const [items, setItems] = useState<WorkOrderItem[]>([]);

    const [priceDraft, setPriceDraft] = useState<Record<string, number>>({});
    const [savingPrice, setSavingPrice] = useState<Record<string, boolean>>({});
    const updateQtyDone = useCallback(
        async (itemId: string, newQtyDone: number | null) => {
            const { error } = await supabase
                .from("work_order_items")
                .update({ qty_done: newQtyDone })
                .eq("item_id", itemId);

            if (error) {
                alert(`No se pudo guardar qty_done: ${error.message}`);
                return;
            }

            const { data: itemRows, error: loadErr } = await supabase
                .from("work_order_items")
                .select(
                    "item_id, description, quantity, qty_planned, qty_done, tech_note, unit_price, taxable, pricing_status",
                )
                .eq("work_order_id", workOrderId)
                .order("created_at", { ascending: true });

            if (loadErr) {
                alert(`No se pudieron recargar items: ${loadErr.message}`);
                return;
            }

            setItems(itemRows ?? []);
        },
        [workOrderId],
    );

    const priceItem = useCallback(
        async (itemId: string) => {
            const newPrice = Number(priceDraft[itemId] ?? 0);

            setSavingPrice((s) => ({ ...s, [itemId]: true }));
            try {
                const { error } = await supabase
                    .from("work_order_items")
                    .update({
                        unit_price: newPrice,
                        taxable: true, // por ahora lo dejamos true
                        pending_pricing: false,
                        pricing_status: "priced",
                    })
                    .eq("item_id", itemId);

                if (error) {
                    alert(`No se pudo pricear: ${error.message}`);
                    return;
                }

                // recargar items
                const { data: itemRows, error: itemErr } = await supabase
                    .from("work_order_items")
                    .select(
                        "item_id, description, quantity, qty_planned, qty_done, tech_note, unit_price, taxable, pricing_status",
                    )
                    .eq("work_order_id", workOrderId)
                    .order("created_at", { ascending: true });

                if (itemErr) {
                    alert(`No se pudieron recargar items: ${itemErr.message}`);
                    return;
                }

                setItems(itemRows ?? []);
            } finally {
                setSavingPrice((s) => ({ ...s, [itemId]: false }));
            }
        },
        [priceDraft, workOrderId],
    );
    const [showForm, setShowForm] = useState(false);
    const [savingItem, setSavingItem] = useState(false);

    const [newItem, setNewItem] = useState({
        description: "",
        quantity: 1,
        unit_price: 0,      // solo admin lo usa
        taxable: true,      // solo admin lo decide
    });
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    useEffect(() => {
        if (!workOrderId) return;

        (async () => {
            setLoading(true);
            setErr("");
            try {
                const { data, error } = await supabase
                    .from("work_orders")
                    .select(
                        "work_order_id, company_id, job_type, description, status, priority, scheduled_for, created_at, assigned_to",
                    )
                    .eq("work_order_id", workOrderId)
                    .single();

                if (error) throw error;

                const mapped = {
                    ...(data as any),
                    status: safeStatus((data as any)?.status),
                } as WorkOrder;

                setWo(mapped);

                const { data: itemRows, error: itemErr } = await supabase
                    .from("work_order_items")
                    .select("item_id, description, quantity, qty_planned, qty_done, tech_note, unit_price, taxable, pricing_status")
                    .eq("work_order_id", workOrderId)
                    .order("created_at", { ascending: true });

                if (itemErr) throw itemErr;

                setItems(itemRows ?? []);
            } catch (e: any) {
                setErr(e?.message ?? "Error cargando Work Order");
                setWo(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [workOrderId]);

    return (
        <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>

                <button
                    onClick={() => setShowForm((s) => !s)}
                    style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        background: "white",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                    }}
                >
                    {showForm ? "Cancelar" : "+ Agregar item"}
                </button>
                <div>
                    <h1 style={{ margin: 0 }}>Work Order</h1>
                    <div style={{ opacity: 0.7, fontFamily: "monospace" }}>
                        {workOrderId}
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

            {wo ? (
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
                        <div style={{ fontSize: 18, fontWeight: 900 }}>{wo.job_type}</div>
                        <div style={{ opacity: 0.8 }}>{wo.description}</div>

                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                            <div>
                                <b>Status:</b> {wo.status}
                            </div>
                            <div>
                                <b>Priority:</b> {wo.priority}
                            </div>
                            <div>
                                <b>Assigned to:</b>{" "}
                                <span style={{ fontFamily: "monospace" }}>
                                    {(wo.assigned_to ?? "—").slice(0, 8)}
                                </span>
                            </div>
                        </div>

                        {/* Items */}
                        {/* Items */}
                        <div
                            style={{
                                marginTop: 14,
                                paddingTop: 12,
                                borderTop: "1px solid #eee",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 12,
                                    flexWrap: "wrap",
                                }}
                            >
                                <div style={{ fontWeight: 900, fontSize: 16 }}>Items</div>

                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ opacity: 0.7, fontSize: 13 }}>
                                        Total items: <b>{items.length}</b>
                                    </div>

                                    <button
                                        onClick={() => setShowForm((s) => !s)}
                                        style={{
                                            padding: "10px 12px",
                                            borderRadius: 10,
                                            border: "1px solid #ddd",
                                            background: "white",
                                            cursor: "pointer",
                                            fontWeight: 900,
                                        }}
                                    >
                                        {showForm ? "Cerrar" : "+ Agregar item"}
                                    </button>
                                </div>
                            </div>

                            {/* Formulario */}
                            {showForm ? (
                                <div
                                    style={{
                                        marginTop: 12,
                                        padding: 12,
                                        border: "1px solid #eee",
                                        borderRadius: 12,
                                        background: "#fafafa",
                                        display: "grid",
                                        gap: 10,
                                        maxWidth: 620,
                                    }}
                                >
                                    <div style={{ fontWeight: 900 }}>Nuevo item</div>

                                    <input
                                        placeholder="Descripción (ej: Piso laminado 20m2)"
                                        value={newItem.description}
                                        onChange={(e) =>
                                            setNewItem((s) => ({ ...s, description: e.target.value }))
                                        }
                                        style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                                    />

                                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                        <div style={{ display: "grid", gap: 6 }}>
                                            <div style={{ fontWeight: 800, fontSize: 13, opacity: 0.85 }}>
                                                Cantidad
                                            </div>
                                            <input
                                                placeholder="Ej: 10"
                                                type="number"
                                                value={newItem.quantity}
                                                onChange={(e) =>
                                                    setNewItem((s) => ({ ...s, quantity: Number(e.target.value) }))
                                                }
                                                style={{
                                                    padding: 10,
                                                    borderRadius: 10,
                                                    border: "1px solid #ddd",
                                                    width: 160,
                                                }}
                                            />
                                        </div>

                                        <div style={{ display: "grid", gap: 6 }}>
                                            <div style={{ fontWeight: 800, fontSize: 13, opacity: 0.85 }}>
                                                Precio unitario
                                            </div>
                                            <input
                                                placeholder="Ej: 8.00"
                                                type="number"
                                                value={newItem.unit_price}
                                                onChange={(e) =>
                                                    setNewItem((s) => ({ ...s, unit_price: Number(e.target.value) }))
                                                }
                                                style={{
                                                    padding: 10,
                                                    borderRadius: 10,
                                                    border: "1px solid #ddd",
                                                    width: 200,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <input
                                            type="checkbox"
                                            checked={newItem.taxable}
                                            onChange={(e) =>
                                                setNewItem((s) => ({ ...s, taxable: e.target.checked }))
                                            }
                                        />
                                        Taxable
                                    </label>
                                    <div style={{ fontWeight: 900, marginTop: 4, opacity: 0.9 }}>
                                        Total item: $
                                        {(Number(newItem.quantity ?? 0) * Number(newItem.unit_price ?? 0)).toFixed(2)}
                                    </div>

                                    <div style={{ display: "flex", gap: 10 }}>
                                        <button
                                            disabled={savingItem || !myRole}
                                            onClick={async () => {
                                                setErr("");
                                                if (!myRole) {
                                                    setErr("Cargando rol… intenta de nuevo en 1 segundo.");
                                                    return;
                                                }

                                                const desc = String(newItem.description ?? "").trim();
                                                if (!desc) {
                                                    setErr("Descripción requerida");
                                                    return;
                                                }

                                                try {
                                                    setSavingItem(true);
                                                    setErr(""); // ✅ limpia error anterior

                                                    if (!wo?.company_id) {
                                                        throw new Error("WO sin company_id (no puedo crear items)");
                                                    }

                                                    const base = {
                                                        company_id: wo.company_id,
                                                        work_order_id: workOrderId,
                                                        item_type: "service",
                                                        description: desc,
                                                    };

                                                    // Admin → planned (qty_planned + priced)
                                                    const payload = isAdmin
                                                        ? {
                                                            ...base,
                                                            qty_planned: Number(newItem.quantity ?? 1),
                                                            qty_done: null,
                                                            unit_price: Number(newItem.unit_price ?? 0),
                                                            taxable: Boolean(newItem.taxable ?? true),
                                                            pending_pricing: false,
                                                        }
                                                        : {
                                                            // Tech → extra (qty_done + pending_pricing)
                                                            ...base,
                                                            qty_planned: null,
                                                            qty_done: Number(newItem.quantity ?? 1),
                                                            unit_price: 0,
                                                            taxable: true,
                                                            pending_pricing: true,
                                                        };

                                                    const { error } = await supabase.from("work_order_items").insert(payload);

                                                    if (error) throw error; // ✅ aquí va a caer el mensaje de RLS exacto

                                                    // ✅ Recargar items después de guardar
                                                    const { data: itemRows, error: itemErr } = await supabase
                                                        .from("work_order_items")
                                                        .select("item_id, description, quantity, qty_planned, qty_done, tech_note, unit_price, taxable, pricing_status")
                                                        .eq("work_order_id", workOrderId)
                                                        .order("created_at", { ascending: true });

                                                    if (itemErr) throw itemErr;

                                                    setItems(itemRows ?? []);

                                                    // ✅ Reset form
                                                    setNewItem({ description: "", quantity: 1, unit_price: 0, taxable: true });
                                                    setShowForm(false);
                                                } catch (e: any) {
                                                    // ✅ Este es el mensaje que necesito para darte el SQL exacto de policies
                                                    setErr(e?.message ?? "Error creando item");
                                                } finally {
                                                    setSavingItem(false);
                                                }
                                            }}
                                            style={{
                                                padding: "10px 12px",
                                                borderRadius: 10,
                                                border: "1px solid #111",
                                                background: "#111",
                                                color: "white",
                                                cursor: savingItem ? "not-allowed" : "pointer",
                                                fontWeight: 900,
                                                opacity: savingItem ? 0.6 : 1,
                                            }}
                                        >
                                            {savingItem ? "Guardando..." : isAdmin ? "Guardar planned" : "Guardar extra"}
                                        </button>

                                        <button
                                            onClick={() => setShowForm(false)}
                                            style={{
                                                padding: "10px 12px",
                                                borderRadius: 10,
                                                border: "1px solid #ddd",
                                                background: "white",
                                                cursor: "pointer",
                                                fontWeight: 800,
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : null}

                            {/* Lista / tabla */}
                            {items.length === 0 ? (
                                <div style={{ marginTop: 10, opacity: 0.7 }}>
                                    No hay items todavía.
                                </div>
                            ) : (
                                <div style={{ marginTop: 10, overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                                                <th style={{ padding: "8px 6px" }}>Descripción</th>
                                                <th style={{ padding: "8px 6px" }}>Plan</th>
                                                <th style={{ padding: "8px 6px" }}>Done</th>
                                                {isAdmin ? <th style={{ padding: "8px 6px" }}>Valor</th> : null}
                                                <th style={{ padding: "8px 6px" }}>Taxable</th>
                                                {isAdmin ? <th style={{ padding: "8px 6px" }}>Total</th> : null}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((it) => {
                                                const qtyPlanned = Number(it.qty_planned ?? it.quantity ?? 0);
                                                const qtyDone = it.qty_done === null || it.qty_done === undefined ? null : Number(it.qty_done);
                                                const qtyToPrice = Number((qtyDone ?? qtyPlanned) ?? 0);

                                                const unit = Number(it.unit_price ?? 0);
                                                const lineTotal = qtyToPrice * unit;

                                                return (
                                                    <tr key={it.item_id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                                                        <td style={{ padding: "8px 6px" }}>
                                                            {it.description}
                                                        </td>

                                                        {/* PLAN */}
                                                        <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>
                                                            {qtyPlanned}
                                                        </td>

                                                        {/* DONE */}
                                                        <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>
                                                            {isAdmin ? (
                                                                <span>{qtyDone ?? ""}</span>
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    value={qtyDone ?? ""}
                                                                    placeholder="0"
                                                                    style={{ width: 80, padding: "6px 8px" }}
                                                                    onChange={(e) => {
                                                                        const v = e.target.value;
                                                                        const n = v === "" ? null : Number(v);
                                                                        updateQtyDone(it.item_id, n);
                                                                    }}
                                                                />
                                                            )}
                                                        </td>

                                                        {/* VALOR */}
                                                        {isAdmin ? (
                                                            <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>
                                                                {isAdmin && it.pricing_status === "pending_pricing" ? (
                                                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                                        <input
                                                                            type="number"
                                                                            value={priceDraft[it.item_id] ?? ""}
                                                                            placeholder="Precio"
                                                                            style={{ width: 90, padding: "6px 8px" }}
                                                                            onChange={(e) =>
                                                                                setPriceDraft((s) => ({
                                                                                    ...s,
                                                                                    [it.item_id]: e.target.value === "" ? 0 : Number(e.target.value),
                                                                                }))
                                                                            }
                                                                        />
                                                                        <button
                                                                            disabled={savingPrice[it.item_id] || Number(priceDraft[it.item_id] ?? 0) <= 0}
                                                                            onClick={() => {
                                                                                const v = Number(priceDraft[it.item_id] ?? 0);
                                                                                if (!Number.isFinite(v) || v <= 0) {
                                                                                    alert("Debes colocar un precio mayor a 0 antes de Set $");
                                                                                    return;
                                                                                }
                                                                                priceItem(it.item_id);
                                                                            }}
                                                                            style={{
                                                                                padding: "6px 10px",
                                                                                borderRadius: 8,
                                                                                border: "1px solid #111",
                                                                                background: "#111",
                                                                                color: "white",
                                                                                cursor: savingPrice[it.item_id] ? "not-allowed" : "pointer",
                                                                                fontWeight: 800,
                                                                                opacity: savingPrice[it.item_id] ? 0.6 : 1,
                                                                            }}
                                                                        >
                                                                            {savingPrice[it.item_id] ? "..." : "Set $"}
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>${unit.toFixed(2)}</>
                                                                )}
                                                            </td>
                                                        ) : null}
                                                        {/* TAXABLE */}
                                                        <td style={{ padding: "8px 6px" }}>
                                                            {it.taxable ? "✅" : "—"}
                                                        </td>

                                                        {/* TOTAL */}
                                                        {isAdmin ? (
                                                            <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>
                                                                ${lineTotal.toFixed(2)}
                                                            </td>
                                                        ) : null}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {isAdmin ? (
                                        <div style={{ marginTop: 10, textAlign: "right", fontWeight: 900 }}>
                                            Total: $
                                            {items
                                                .reduce((acc, it) => {
                                                    const qtyPlanned = Number(it.qty_planned ?? it.quantity ?? 0);
                                                    const qtyDone =
                                                        it.qty_done === null || it.qty_done === undefined ? null : Number(it.qty_done);
                                                    const qtyToPrice = Number((qtyDone ?? qtyPlanned) ?? 0);

                                                    const unit = Number(it.unit_price ?? 0);
                                                    return acc + qtyToPrice * unit;
                                                }, 0)
                                                .toFixed(2)}
                                        </div>
                                    ) : null}                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}