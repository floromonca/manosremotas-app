"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { safeStatus, type WorkOrderStatus } from "../../../lib/supabase/workOrders";

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

    const [wo, setWo] = useState<WorkOrder | null>(null);
    type WorkOrderItem = {
        item_id: string;
        description: string;
        quantity: number;
        unit_price: number;
        taxable: boolean;
    };

    const [items, setItems] = useState<WorkOrderItem[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [savingItem, setSavingItem] = useState(false);

    const [newItem, setNewItem] = useState({
        description: "",
        quantity: 1,
        unit_price: 0,
        taxable: true,
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
                    .select("item_id, description, quantity, unit_price, taxable")
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
                                            disabled={savingItem}
                                            onClick={async () => {
                                                setErr("");

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

                                                    const { error } = await supabase.from("work_order_items").insert({
                                                        company_id: wo.company_id,
                                                        work_order_id: workOrderId,
                                                        item_type: "service",
                                                        description: desc,
                                                        quantity: Number(newItem.quantity ?? 1),
                                                        unit_price: Number(newItem.unit_price ?? 0),
                                                        taxable: Boolean(newItem.taxable ?? true),
                                                    });

                                                    if (error) throw error; // ✅ aquí va a caer el mensaje de RLS exacto

                                                    // ✅ Recargar items después de guardar
                                                    const { data: itemRows, error: itemErr } = await supabase
                                                        .from("work_order_items")
                                                        .select("item_id, description, quantity, unit_price, taxable")
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
                                            {savingItem ? "Guardando..." : "Guardar"}
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
                                                <th style={{ padding: "8px 6px" }}>Qty</th>
                                                <th style={{ padding: "8px 6px" }}>Unit</th>
                                                <th style={{ padding: "8px 6px" }}>Taxable</th>
                                                <th style={{ padding: "8px 6px" }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((it) => {
                                                const qty = Number(it.quantity ?? 0);
                                                const unit = Number(it.unit_price ?? 0);
                                                const lineTotal = qty * unit;

                                                return (
                                                    <tr key={it.item_id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                                                        <td style={{ padding: "8px 6px" }}>{it.description}</td>
                                                        <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>
                                                            {qty}
                                                        </td>
                                                        <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>
                                                            ${unit.toFixed(2)}
                                                        </td>
                                                        <td style={{ padding: "8px 6px" }}>{it.taxable ? "✅" : "—"}</td>
                                                        <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>
                                                            ${lineTotal.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    <div style={{ marginTop: 10, textAlign: "right", fontWeight: 900 }}>
                                        Total: $
                                        {items
                                            .reduce((acc, it) => {
                                                const qty = Number(it.quantity ?? 0);
                                                const unit = Number(it.unit_price ?? 0);
                                                return acc + qty * unit;
                                            }, 0)
                                            .toFixed(2)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}