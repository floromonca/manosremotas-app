"use client";

import React from "react";

type WorkOrderItem = {
    item_id: string;
    description: string | null;
    quantity: number | null;
    qty_planned: number | null;
    qty_done: number | null;
    unit_price: number | null;
    taxable: boolean | null;
    pending_pricing?: boolean | null;
    pricing_status?: string | null;
    tech_note?: string | null;
};

type Props = {
    items: WorkOrderItem[];
    isAdmin: boolean;
    priceDraft: Record<string, number>;
    setPriceDraft: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    savingPrice: Record<string, boolean>;
    updateQtyDone: (itemId: string, newQtyDone: number | null) => void | Promise<void>;
    priceItem: (itemId: string) => void | Promise<void>;
};

function money(value: number) {
    return `$${value.toFixed(2)}`;
}

export default function WorkOrderItemsTable({
    items,
    isAdmin,
    priceDraft,
    setPriceDraft,
    savingPrice,
    updateQtyDone,
    priceItem,
}: Props) {
    if (items.length === 0) {
        return (
            <div
                style={{
                    marginTop: 10,
                    padding: 18,
                    borderRadius: 14,
                    border: "1px dashed #d1d5db",
                    background: "#fafafa",
                    color: "#6b7280",
                }}
            >
                No hay items todavía.
            </div>
        );
    }

    const grandTotal = items.reduce((acc, it) => {
        const hasPlanned = it.qty_planned !== null && it.qty_planned !== undefined;
        const qtyPlanned = hasPlanned ? Number(it.qty_planned ?? 0) : null;
        const qtyDone = it.qty_done === null || it.qty_done === undefined ? null : Number(it.qty_done);
        const qtyToPrice = Number((qtyDone ?? qtyPlanned ?? 0) ?? 0);
        const unit = Number(it.unit_price ?? 0);
        return acc + qtyToPrice * unit;
    }, 0);

    return (
        <div
            style={{
                marginTop: 10,
                overflowX: "auto",
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
            }}
        >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr
                        style={{
                            textAlign: "left",
                            borderBottom: "1px solid #e5e7eb",
                            background: "#f9fafb",
                        }}
                    >
                        <th style={{ padding: "14px 12px", fontSize: 13, color: "#374151" }}>Descripción</th>
                        <th style={{ padding: "14px 12px", fontSize: 13, color: "#374151" }}>Tipo</th>
                        <th style={{ padding: "14px 12px", fontSize: 13, color: "#374151" }}>Estado</th>
                        <th style={{ padding: "14px 12px", fontSize: 13, color: "#374151" }}>Plan</th>
                        <th style={{ padding: "14px 12px", fontSize: 13, color: "#374151" }}>Done</th>
                        {isAdmin ? <th style={{ padding: "14px 12px", fontSize: 13, color: "#374151" }}>Valor</th> : null}
                        <th style={{ padding: "14px 12px", fontSize: 13, color: "#374151" }}>Taxable</th>
                        {isAdmin ? <th style={{ padding: "14px 12px", fontSize: 13, color: "#374151" }}>Total</th> : null}
                    </tr>
                </thead>

                <tbody>
                    {items.map((it) => {
                        const hasPlanned = it.qty_planned !== null && it.qty_planned !== undefined;
                        const qtyPlanned = hasPlanned ? Number(it.qty_planned ?? 0) : null;
                        const qtyDone = it.qty_done === null || it.qty_done === undefined ? null : Number(it.qty_done);
                        const qtyToPrice = Number((qtyDone ?? qtyPlanned ?? 0) ?? 0);
                        const unit = Number(it.unit_price ?? 0);
                        const lineTotal = qtyToPrice * unit;
                        const isPendingPricing =
                            it.pricing_status === "pending_pricing" || it.pending_pricing === true;
                        const tipo = hasPlanned ? "Planned" : "Extra";

                        return (
                            <tr key={it.item_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "14px 12px", color: "#111827", fontWeight: 700 }}>
                                    {it.description ?? "—"}
                                </td>

                                <td style={{ padding: "14px 12px" }}>
                                    <span
                                        style={{
                                            display: "inline-block",
                                            padding: "5px 10px",
                                            borderRadius: 999,
                                            fontSize: 12,
                                            fontWeight: 900,
                                            border: "1px solid #d1d5db",
                                            background: tipo === "Extra" ? "#eff6ff" : "#fafafa",
                                            color: "#111827",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {tipo}
                                    </span>
                                </td>

                                <td style={{ padding: "14px 12px" }}>
                                    <span
                                        style={{
                                            display: "inline-block",
                                            padding: "5px 10px",
                                            borderRadius: 999,
                                            fontSize: 12,
                                            fontWeight: 900,
                                            border: "1px solid",
                                            borderColor: isPendingPricing ? "#f5c542" : "#22c55e",
                                            background: isPendingPricing ? "#fff7e6" : "#ecfdf5",
                                            color: isPendingPricing ? "#8a5a00" : "#065f46",
                                            whiteSpace: "nowrap",
                                        }}
                                        title={
                                            isPendingPricing
                                                ? "Este item necesita aprobación de precio"
                                                : "Precio aprobado"
                                        }
                                    >
                                        {isPendingPricing ? "Pending pricing" : "Approved"}
                                    </span>
                                </td>

                                <td style={{ padding: "14px 12px", fontFamily: "monospace", color: "#374151" }}>
                                    {hasPlanned ? qtyPlanned : "—"}
                                </td>

                                <td style={{ padding: "14px 12px", fontFamily: "monospace", color: "#374151" }}>
                                    {isAdmin ? (
                                        <span>{qtyDone ?? 0}</span>
                                    ) : (
                                        <input
                                            type="number"
                                            value={qtyDone ?? ""}
                                            placeholder="0"
                                            style={{
                                                width: 96,
                                                padding: "8px 10px",
                                                borderRadius: 10,
                                                border: "1px solid #d1d5db",
                                            }}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                const n = v === "" ? null : Number(v);
                                                updateQtyDone(it.item_id, n);
                                            }}
                                        />
                                    )}
                                </td>

                                {isAdmin ? (
                                    <td style={{ padding: "14px 12px", fontFamily: "monospace", color: "#111827" }}>
                                        {isPendingPricing ? (
                                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                                <input
                                                    type="number"
                                                    value={priceDraft[it.item_id] ?? ""}
                                                    placeholder="Precio"
                                                    style={{
                                                        width: 110,
                                                        padding: "8px 10px",
                                                        borderRadius: 10,
                                                        border: "1px solid #d1d5db",
                                                    }}
                                                    onChange={(e) =>
                                                        setPriceDraft((s) => ({
                                                            ...s,
                                                            [it.item_id]:
                                                                e.target.value === "" ? 0 : Number(e.target.value),
                                                        }))
                                                    }
                                                />
                                                <button
                                                    type="button"
                                                    disabled={
                                                        savingPrice[it.item_id] ||
                                                        Number(priceDraft[it.item_id] ?? 0) <= 0
                                                    }
                                                    onClick={() => {
                                                        const v = Number(priceDraft[it.item_id] ?? 0);
                                                        if (!Number.isFinite(v) || v <= 0) {
                                                            alert("Debes colocar un precio mayor a 0 antes de Set $");
                                                            return;
                                                        }
                                                        priceItem(it.item_id);
                                                    }}
                                                    style={{
                                                        padding: "8px 12px",
                                                        borderRadius: 10,
                                                        border: "1px solid #111827",
                                                        background: "#111827",
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
                                            <span style={{ fontWeight: 700 }}>{money(unit)}</span>
                                        )}
                                    </td>
                                ) : null}

                                <td style={{ padding: "14px 12px", fontSize: 18 }}>
                                    {it.taxable ? "✅" : "—"}
                                </td>

                                {isAdmin ? (
                                    <td style={{ padding: "14px 12px", fontFamily: "monospace", fontWeight: 800, color: "#111827" }}>
                                        {money(lineTotal)}
                                    </td>
                                ) : null}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {isAdmin ? (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "end",
                        padding: "16px 18px",
                        background: "#fafafa",
                        borderTop: "1px solid #e5e7eb",
                    }}
                >
                    <div
                        style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            background: "#111827",
                            color: "white",
                            fontWeight: 900,
                            fontSize: 16,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                        }}
                    >
                        Total: {money(grandTotal)}
                    </div>
                </div>
            ) : null}
        </div>
    );
}