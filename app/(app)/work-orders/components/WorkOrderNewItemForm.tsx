"use client";

import React from "react";
import { MR_THEME } from "@/lib/theme";

type NewItemDraft = {
    description: string;
    quantity: number;
    unit_price: number;
    taxable: boolean;
};

type Props = {
    isAdmin: boolean;
    newItem: NewItemDraft;
    setNewItem: React.Dispatch<React.SetStateAction<NewItemDraft>>;
    savingItem: boolean;
    roleLoading: boolean;
    myRole: string | null;
    onCreateItem: () => void | Promise<void>;
    setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
    invoiceIsLocked: boolean;
    hasInvoice: boolean;
    invoiceStatus: string | null;
};

export default function WorkOrderNewItemForm({
    isAdmin,
    newItem,
    setNewItem,
    savingItem,
    roleLoading,
    myRole,
    onCreateItem,
    setShowForm,
    invoiceIsLocked,
}: Props) {
    const [descError, setDescError] = React.useState(false);
    const [priceError, setPriceError] = React.useState(false);
    const [unitPriceInput, setUnitPriceInput] = React.useState("");

    return (
        <div
            style={{
                padding: 12,
                border: "1px dashed #cbd5e1",
                borderRadius: 14,
                background: "#f8fafc",
                display: "grid",
                gap: 12,
                maxWidth: 620,
                boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
            }}
        >
            <div
                style={{
                    fontWeight: 900,
                    fontSize: 15,
                    color: "#111827",
                }}
            >
                New item
            </div>

            {invoiceIsLocked ? (
                <div
                    style={{
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

            <input
                className="mr-form-input"
                placeholder="Description (e.g. Laminate flooring 20 m²)"
                value={newItem.description}
                onChange={(e) => {
                    setNewItem((s) => ({ ...s, description: e.target.value }));
                    if (descError) setDescError(false);
                }}
                style={{
                    padding: 12,
                    borderRadius: 10,
                    border: descError ? "1px solid #dc2626" : "1px solid #d1d5db",
                    background: "#ffffff",
                    outline: "none",
                    fontSize: 15,
                    color: MR_THEME.colors.textPrimary,
                }}
            />

            {descError && (
                <div
                    style={{
                        color: "#dc2626",
                        fontSize: 12,
                        fontWeight: 700,
                        marginTop: -4,
                    }}
                >
                    Item description is required.
                </div>
            )}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 6 }}>
                    <div
                        style={{
                            fontWeight: 800,
                            fontSize: 13,
                            color: "#374151",
                        }}
                    >
                        {isAdmin ? "Planned quantity" : "Completed quantity (extra)"}
                    </div>

                    <input
                        className="mr-form-input"
                        placeholder="E.g. 10"
                        type="number"
                        value={newItem.quantity === 0 ? "" : newItem.quantity}
                        onChange={(e) => {
                            let value = e.target.value;

                            if (value === "") {
                                setNewItem((s) => ({ ...s, quantity: 0 }));
                                return;
                            }

                            value = value.replace(/^0+(?=\d)/, "");
                            const num = Number(value);
                            if (isNaN(num)) return;

                            setNewItem((s) => ({ ...s, quantity: num }));
                        }}
                        style={{
                            padding: 12,
                            borderRadius: 10,
                            border: "1px solid #d1d5db",
                            width: 230,
                            background: "#ffffff",
                            outline: "none",
                            fontSize: 15,
                            color: MR_THEME.colors.textPrimary,
                            fontWeight: 600,
                        }}
                    />
                </div>

                {isAdmin ? (
                    <div style={{ display: "grid", gap: 6 }}>
                        <div
                            style={{
                                fontWeight: 800,
                                fontSize: 13,
                                color: "#374151",
                            }}
                        >
                            Unit price
                        </div>

                        <input
                            className="mr-form-input"
                            placeholder="E.g. 8.00"
                            type="number"
                            value={unitPriceInput}
                            onChange={(e) => {
                                let value = e.target.value;

                                if (value === "") {
                                    setUnitPriceInput("");
                                    setNewItem((s) => ({ ...s, unit_price: 0 }));
                                    if (priceError) setPriceError(false);
                                    return;
                                }

                                value = value.replace(/^0+(?=\d)/, "");
                                const num = Number(value);
                                if (isNaN(num)) return;

                                setUnitPriceInput(value);
                                setNewItem((s) => ({ ...s, unit_price: num }));

                                if (priceError) setPriceError(false);
                            }}
                            style={{
                                padding: 12,
                                borderRadius: 10,
                                border: "1px solid #d1d5db",
                                width: 230,
                                background: "#ffffff",
                                outline: "none",
                                fontSize: 15,
                                color: MR_THEME.colors.textPrimary,
                            }}
                        />
                        {priceError && (
                            <div
                                style={{
                                    color: "#dc2626",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    marginTop: -2,
                                }}
                            >
                                Enter a unit price. Use 0 only if this item is free.
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {isAdmin ? (
                <label
                    style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        fontSize: 14,
                        color: "#111827",
                        fontWeight: 600,
                    }}
                >
                    <input
                        type="checkbox"
                        checked={newItem.taxable}
                        onChange={(e) => setNewItem((s) => ({ ...s, taxable: e.target.checked }))}
                    />
                    Taxable
                </label>
            ) : (
                <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                    As a technician, this item will be saved as <b>pending_pricing</b> until an
                    admin reviews and approves it.
                </div>
            )}

            {isAdmin ? (
                <div
                    style={{
                        fontWeight: 900,
                        marginTop: 2,
                        color: "#111827",
                        fontSize: 16,
                    }}
                >
                    Item total: $
                    {(Number(newItem.quantity ?? 0) * Number(newItem.unit_price ?? 0)).toFixed(2)}
                </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                    type="button"
                    disabled={savingItem || roleLoading || !myRole || invoiceIsLocked}
                    onClick={() => {
                        if (invoiceIsLocked) {
                            alert("This work order is already invoiced and billing items are read-only.");
                            return;
                        }

                        if (!newItem.description.trim()) {
                            setDescError(true);
                            return;
                        }
                        if (isAdmin && unitPriceInput.trim() === "") {
                            setPriceError(true);
                            return;
                        }
                        setDescError(false);
                        setPriceError(false);
                        onCreateItem();
                    }}
                    style={{
                        padding: "12px 16px",
                        borderRadius: 12,
                        border: "1px solid #111827",
                        background: "#111827",
                        color: "white",
                        cursor: savingItem || roleLoading || !myRole || invoiceIsLocked ? "not-allowed" : "pointer",
                        fontWeight: 900,
                        fontSize: 15,
                        opacity: savingItem || roleLoading || !myRole || invoiceIsLocked ? 0.6 : 1,
                        boxShadow: "0 1px 2px rgba(16,24,40,0.08)",
                    }}
                >
                    {savingItem ? "Saving..." : isAdmin ? "Save planned item" : "Save extra item"}
                </button>

                <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{
                        padding: "12px 16px",
                        borderRadius: 12,
                        border: "1px solid #d1d5db",
                        background: "#ffffff",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: 15,
                        color: "#111827",
                    }}
                >
                    Cancel
                </button>
            </div>

            {/* 🔥 FIX GLOBAL PLACEHOLDER (Safari / iPhone) */}
            <style jsx global>{`
                .mr-form-input::placeholder {
                    color: ${MR_THEME.colors.textSecondary};
                    opacity: 1;
                }
            `}</style>
        </div>
    );
}