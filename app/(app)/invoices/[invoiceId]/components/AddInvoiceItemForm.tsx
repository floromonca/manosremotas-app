"use client";

import type { CSSProperties } from "react";
import { MR_THEME } from "@/lib/theme";

type Props = {
    desc: string;
    qty: number;
    unitPrice: number;
    taxable: boolean;
    isDraft: boolean;
    saving: boolean;
    onChangeDesc: (value: string) => void;
    onChangeQty: (value: number) => void;
    onChangeUnitPrice: (value: number) => void;
    onChangeTaxable: (value: boolean) => void;
    onAddItem: () => void;
};

const inputStyle = (disabled: boolean): CSSProperties => ({
    width: "100%",
    height: 44,
    padding: "0 14px",
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    borderRadius: MR_THEME.radius.control,
    background: disabled ? MR_THEME.colors.cardBgSoft : MR_THEME.colors.cardBg,
    color: disabled ? MR_THEME.colors.textSecondary : MR_THEME.colors.textPrimary,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
});

const labelStyle: CSSProperties = {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: MR_THEME.colors.textMuted,
    fontWeight: 800,
};

export default function AddInvoiceItemForm({
    desc,
    qty,
    unitPrice,
    taxable,
    isDraft,
    saving,
    onChangeDesc,
    onChangeQty,
    onChangeUnitPrice,
    onChangeTaxable,
    onAddItem,
}: Props) {
    const disabled = !isDraft;

    return (
        <>
            <div
                style={{
                    display: "grid",
                    gap: 14,
                    opacity: disabled ? 0.82 : 1,
                }}
            >
                <div style={{ display: "grid", gap: 6 }}>
                    <label style={labelStyle}>Description</label>

                    <input
                        value={desc}
                        onChange={(e) => onChangeDesc(e.target.value)}
                        placeholder="e.g. Labour / Materials"
                        disabled={disabled}
                        style={inputStyle(disabled)}
                    />
                </div>

                <div className="invoiceItemFormGrid">
                    <div style={{ display: "grid", gap: 6 }}>
                        <label style={labelStyle}>Qty</label>

                        <input
                            type="number"
                            value={qty}
                            onChange={(e) => onChangeQty(Number(e.target.value))}
                            disabled={disabled}
                            style={inputStyle(disabled)}
                        />
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                        <label style={labelStyle}>Unit Price</label>

                        <input
                            type="number"
                            value={unitPrice}
                            onChange={(e) => onChangeUnitPrice(Number(e.target.value))}
                            disabled={disabled}
                            style={inputStyle(disabled)}
                        />
                    </div>

                    <label
                        style={{
                            height: 44,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 10,
                            padding: "0 12px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.borderStrong}`,
                            background: disabled ? MR_THEME.colors.cardBgSoft : MR_THEME.colors.cardBg,
                            color: MR_THEME.colors.textPrimary,
                            fontSize: 14,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            boxSizing: "border-box",
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={taxable}
                            onChange={(e) => onChangeTaxable(e.target.checked)}
                            disabled={disabled}
                        />
                        Taxable
                    </label>
                </div>

                <div className="invoiceItemFormFooter">
                    <div
                        style={{
                            fontSize: 13,
                            color: MR_THEME.colors.textSecondary,
                            lineHeight: 1.5,
                        }}
                    >
                        {disabled
                            ? "This invoice is read-only. Items cannot be added."
                            : "Add a billable line item to this invoice."}
                    </div>

                    <button
                        type="button"
                        onClick={onAddItem}
                        disabled={saving || disabled}
                        style={{
                            minHeight: 44,
                            padding: "0 16px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${disabled ? MR_THEME.colors.borderStrong : MR_THEME.colors.textPrimary}`,
                            background: disabled ? MR_THEME.colors.cardBgSoft : MR_THEME.colors.textPrimary,
                            color: disabled ? MR_THEME.colors.textSecondary : "#ffffff",
                            cursor: saving || disabled ? "not-allowed" : "pointer",
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                            opacity: saving || disabled ? 0.75 : 1,
                            boxShadow: saving || disabled ? "none" : MR_THEME.shadows.cardSoft,
                            boxSizing: "border-box",
                        }}
                    >
                        {disabled ? "Invoice read-only" : saving ? "Adding..." : "+ Add Item"}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .invoiceItemFormGrid {
                    display: grid;
                    grid-template-columns: minmax(140px, 1fr) minmax(180px, 1fr) auto;
                    gap: 12px;
                    align-items: end;
                }

                .invoiceItemFormFooter {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                @media (max-width: 720px) {
                    .invoiceItemFormGrid {
                        grid-template-columns: 1fr;
                    }

                    .invoiceItemFormFooter {
                        display: grid;
                        grid-template-columns: 1fr;
                    }

                    .invoiceItemFormFooter button {
                        width: 100%;
                    }
                }
            `}</style>
        </>
    );
}
