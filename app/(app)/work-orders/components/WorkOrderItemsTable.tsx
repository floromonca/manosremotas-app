"use client";

import React from "react";
import { MR_THEME } from "@/lib/theme";

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
    updateTechNote: (itemId: string, note: string) => void | Promise<void>;
    priceItem: (itemId: string) => void | Promise<void>;
    invoiceIsLocked: boolean;
    hasInvoice: boolean;
    invoiceStatus: string | null;
};

function money(value: number) {
    return new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
}

export default function WorkOrderItemsTable({
    items,
    isAdmin,
    priceDraft,
    setPriceDraft,
    savingPrice,
    updateQtyDone,
    updateTechNote,
    priceItem,
    invoiceIsLocked,
    hasInvoice,
    invoiceStatus,
}: Props) {
    const [openNoteItemId, setOpenNoteItemId] = React.useState<string | null>(null);
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    if (items.length === 0) {
        return (
            <div style={{
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
        const qtyToPrice = Number(qtyDone ?? qtyPlanned ?? 0);
        const unit = Number(it.unit_price ?? 0);
        return acc + qtyToPrice * unit;
    }, 0);

    if (isMobile) {
        return (
            <div style={{ display: "grid", gap: 12 }}>
                {items.map((it) => {
                    const hasPlanned =
                        it.qty_planned !== null && it.qty_planned !== undefined;

                    const qtyPlanned = hasPlanned ? Number(it.qty_planned ?? 0) : null;
                    const qtyDone =
                        it.qty_done === null || it.qty_done === undefined
                            ? null
                            : Number(it.qty_done);

                    const isPendingPricing =
                        it.pricing_status === "pending_pricing" ||
                        it.pending_pricing === true;

                    const tipo = hasPlanned ? "Planned" : "Extra";

                    return (
                        <div
                            key={it.item_id}
                            style={{
                                padding: MR_THEME.layout.compactCardPadding,
                                borderRadius: MR_THEME.radius.card,
                                border: `1px solid ${MR_THEME.colors.border}`,
                                background: MR_THEME.colors.cardBg,
                                display: "grid",
                                gap: MR_THEME.spacing.sm,
                            }}
                        >
                            {/* Header */}
                            <div
                                style={{
                                    ...MR_THEME.typography.cardTitle,
                                    color: MR_THEME.colors.textPrimary,
                                }}
                            >
                                {it.description ?? "—"}
                            </div>

                            {/* Type + Status */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <span
                                    style={{
                                        padding: "4px 8px",
                                        borderRadius: 999,
                                        fontSize: 11,
                                        fontWeight: 800,
                                        border: "1px solid #d1d5db",
                                        background: tipo === "Extra" ? "#eff6ff" : "#fafafa",
                                    }}
                                >
                                    {tipo}
                                </span>

                                <span
                                    style={{
                                        padding: "4px 8px",
                                        borderRadius: 999,
                                        fontSize: 11,
                                        fontWeight: 800,
                                        border: "1px solid",
                                        borderColor: isPendingPricing ? "#f5c542" : "#22c55e",
                                        background: isPendingPricing ? "#fff7e6" : "#ecfdf5",
                                    }}
                                >
                                    {isPendingPricing ? "Pending pricing" : "Approved"}
                                </span>
                            </div>

                            {/* Quantities */}
                            <div style={{ display: "flex", gap: 12 }}>
                                <div style={{ fontSize: 12 }}>
                                    <strong>Planned:</strong>{" "}
                                    {hasPlanned ? qtyPlanned : "—"}
                                </div>

                                <div style={{ fontSize: 12 }}>
                                    <strong>Done:</strong>{" "}
                                    {isAdmin ? (
                                        qtyDone ?? 0
                                    ) : (
                                        <input
                                            type="number"
                                            value={qtyDone ?? ""}
                                            placeholder="0"
                                            style={{
                                                width: 70,
                                                padding: "4px 6px",
                                                borderRadius: 6,
                                                border: "1px solid #d1d5db",
                                            }}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                const n = v === "" ? null : Number(v);
                                                updateQtyDone(it.item_id, n);
                                            }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Tech note */}
                            {openNoteItemId === it.item_id ? (
                                <textarea
                                    defaultValue={it.tech_note ?? ""}
                                    placeholder="Tech note..."
                                    onBlur={(e) => {
                                        updateTechNote(it.item_id, e.target.value);
                                        setOpenNoteItemId(null);
                                    }}
                                    style={{
                                        width: "100%",
                                        minHeight: 44,
                                        padding: "8px 10px",
                                        borderRadius: 10,
                                        border: "1px solid #d1d5db",
                                        fontSize: 12,
                                    }}
                                />
                            ) : (
                                <>
                                    {it.tech_note ? (
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: MR_THEME.colors.textSecondary,
                                                background: MR_THEME.colors.cardBgSoft,
                                                border: `1px solid ${MR_THEME.colors.border}`,
                                                borderRadius: MR_THEME.radius.control,
                                                padding: "6px 8px",
                                            }}
                                        >
                                            {it.tech_note}
                                        </div>
                                    ) : null}

                                    <button
                                        type="button"
                                        onClick={() => setOpenNoteItemId(it.item_id)}
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            padding: 0,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: MR_THEME.colors.primary,
                                            cursor: "pointer",
                                            alignSelf: "flex-start",
                                            marginTop: 2,
                                        }}
                                    >
                                        {it.tech_note ? "Edit note" : "+ Add note"}
                                    </button>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

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
            {invoiceIsLocked ? (
                <div
                    style={{
                        marginBottom: 12,
                        padding: 10,
                        borderRadius: 10,
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#991b1b",
                        fontSize: 13,
                        fontWeight: 700,
                        lineHeight: 1.45,
                    }}
                >
                    This work order is already invoiced and billing items are read-only.
                </div>
            ) : null}

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr
                        style={{
                            textAlign: "left",
                            borderBottom: "1px solid #e5e7eb",
                            background: "#f9fafb",
                        }}
                    >
                        <th style={{ padding: "10px 8px", fontSize: 12, color: "#374151" }}>Description</th>
                        <th style={{ padding: "10px 8px", fontSize: 12, color: "#374151" }}>Type</th>
                        <th style={{ padding: "10px 8px", fontSize: 12, color: "#374151" }}>Status</th>
                        <th style={{ padding: "10px 8px", fontSize: 12, color: "#374151" }}>Planned</th>
                        <th style={{ padding: "10px 8px", fontSize: 12, color: "#374151" }}>Completed</th>
                        {isAdmin ? (
                            <th
                                style={{
                                    padding: "10px 8px",
                                    fontSize: 12,
                                    color: "#374151",
                                    textAlign: "right",
                                    paddingRight: 20,
                                }}
                            >
                                Value
                            </th>
                        ) : null}
                        <th style={{ padding: "10px 8px", fontSize: 12, color: "#374151" }}>Taxable</th>
                        {isAdmin ? (
                            <th
                                style={{
                                    padding: "10px 8px",
                                    fontSize: 12,
                                    color: "#374151",
                                    textAlign: "right",
                                    paddingRight: 20,
                                }}
                            >
                                Total
                            </th>
                        ) : null}
                    </tr>
                </thead>

                <tbody>
                    {items.map((it) => {
                        const hasPlanned = it.qty_planned !== null && it.qty_planned !== undefined;
                        const qtyPlanned = hasPlanned ? Number(it.qty_planned ?? 0) : null;
                        const qtyDone = it.qty_done === null || it.qty_done === undefined ? null : Number(it.qty_done);
                        const qtyToPrice = Number(qtyDone ?? qtyPlanned ?? 0);
                        const unit = Number(it.unit_price ?? 0);
                        const lineTotal = qtyToPrice * unit;
                        const isPendingPricing =
                            it.pricing_status === "pending_pricing" || it.pending_pricing === true;
                        const tipo = hasPlanned ? "Planned" : "Extra";

                        return (
                            <React.Fragment key={it.item_id}>
                                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                                    <td style={{ padding: "10px 8px", color: "#111827", fontWeight: 700 }}>
                                        {it.description ?? "—"}
                                    </td>

                                    <td style={{ padding: "14px 12px" }}>
                                        <span
                                            style={{
                                                display: "inline-block",
                                                padding: "4px 8px",
                                                borderRadius: 999,
                                                fontSize: 11,
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
                                                padding: "4px 8px",
                                                borderRadius: 999,
                                                fontSize: 11,
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

                                    <td style={{ padding: "10px 8px", fontFamily: "monospace", color: "#374151" }}>
                                        {hasPlanned ? qtyPlanned : "—"}
                                    </td>

                                    <td style={{ padding: "10px 8px", fontFamily: "monospace", color: "#374151" }}>
                                        {isAdmin ? (
                                            <span>{qtyDone ?? 0}</span>
                                        ) : (
                                            <input
                                                type="number"
                                                disabled={invoiceIsLocked}
                                                value={qtyDone ?? ""}
                                                placeholder="0"
                                                style={{
                                                    width: 70,
                                                    padding: "6px 8px",
                                                    borderRadius: 8,
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
                                        <td
                                            style={{
                                                padding: "10px 8px",
                                                fontFamily: "monospace",
                                                color: "#111827",
                                                textAlign: "right",
                                                paddingRight: 20,
                                            }}
                                        >
                                            {isPendingPricing ? (
                                                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                                    <input
                                                        type="number"
                                                        disabled={invoiceIsLocked}
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
                                                            invoiceIsLocked ||
                                                            savingPrice[it.item_id] ||
                                                            Number(priceDraft[it.item_id] ?? 0) <= 0
                                                        }
                                                        onClick={() => {
                                                            if (invoiceIsLocked) {
                                                                alert("This work order is already invoiced and billing items are read-only.");
                                                                return;
                                                            }
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

                                    <td style={{ padding: "10px 8px", fontSize: 18 }}>
                                        {it.taxable ? "✅" : "—"}
                                    </td>

                                    {isAdmin ? (
                                        <td
                                            style={{
                                                padding: "10px 8px",
                                                textAlign: "right",
                                                paddingRight: 20,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {money(lineTotal)}
                                        </td>
                                    ) : null}
                                </tr>

                                <tr>
                                    <td
                                        colSpan={isAdmin ? 8 : 6}
                                        style={{
                                            padding: "0 8px 12px",
                                            borderBottom: "1px solid #f3f4f6",
                                            background: "#ffffff",
                                        }}
                                    >
                                        {openNoteItemId === it.item_id ? (
                                            <textarea
                                                disabled={invoiceIsLocked}
                                                defaultValue={it.tech_note ?? ""}
                                                placeholder="Tech note: describe what happened, what was done, or what is pending..."
                                                onBlur={(e) => {
                                                    updateTechNote(it.item_id, e.target.value);
                                                    setOpenNoteItemId(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                        e.preventDefault();
                                                        const val = (e.target as HTMLTextAreaElement).value;
                                                        updateTechNote(it.item_id, val);
                                                        setOpenNoteItemId(null);
                                                    }
                                                }}
                                                style={{
                                                    width: "100%",
                                                    minHeight: 44,
                                                    padding: "8px 10px",
                                                    borderRadius: 10,
                                                    border: "1px solid #d1d5db",
                                                    fontSize: 12,
                                                    lineHeight: 1.4,
                                                    resize: "vertical",
                                                    boxSizing: "border-box",
                                                }}
                                            />
                                        ) : (
                                            <div style={{ display: "grid", gap: 6 }}>
                                                {it.tech_note ? (
                                                    <div
                                                        style={{
                                                            fontSize: 11,
                                                            color: MR_THEME.colors.textSecondary,
                                                            lineHeight: 1.35,
                                                            background: MR_THEME.colors.cardBgSoft,
                                                            border: `1px solid ${MR_THEME.colors.border}`,
                                                            borderRadius: MR_THEME.radius.control,
                                                            padding: "6px 8px",
                                                        }}
                                                    >
                                                        {it.tech_note}
                                                    </div>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    disabled={invoiceIsLocked}
                                                    onClick={() => setOpenNoteItemId(it.item_id)}
                                                    style={{
                                                        background: "transparent",
                                                        border: "none",
                                                        padding: 0,
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        color: MR_THEME.colors.primary,
                                                        cursor: invoiceIsLocked ? "not-allowed" : "pointer",
                                                        opacity: invoiceIsLocked ? 0.6 : 1,
                                                        alignSelf: "flex-start",
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {it.tech_note ? "Edit note" : "+ Add note"}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody >
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