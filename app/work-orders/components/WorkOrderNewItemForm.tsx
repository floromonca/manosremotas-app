"use client";

import React from "react";

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
}: Props) {
    return (
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
                onChange={(e) => setNewItem((s) => ({ ...s, description: e.target.value }))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, opacity: 0.85 }}>
                        {isAdmin ? "Cantidad planificada" : "Cantidad realizada (extra)"}
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
                            width: 200,
                        }}
                    />
                </div>

                {isAdmin ? (
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
                ) : null}
            </div>

            {isAdmin ? (
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                        type="checkbox"
                        checked={newItem.taxable}
                        onChange={(e) => setNewItem((s) => ({ ...s, taxable: e.target.checked }))}
                    />
                    Taxable
                </label>
            ) : (
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Como técnico: este item queda <b>pending_pricing</b> para que el admin lo apruebe.
                </div>
            )}

            {isAdmin ? (
                <div style={{ fontWeight: 900, marginTop: 4, opacity: 0.9 }}>
                    Total item: $
                    {(Number(newItem.quantity ?? 0) * Number(newItem.unit_price ?? 0)).toFixed(2)}
                </div>
            ) : null}

            <div style={{ display: "flex", gap: 10 }}>
                <button
                    type="button"
                    disabled={savingItem || roleLoading || !myRole}
                    onClick={onCreateItem}
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
                    type="button"
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
    );
}