"use client";

import { useState } from "react";
import { MR_THEME } from "@/lib/theme";
import AddInvoiceItemForm from "./AddInvoiceItemForm";
import InvoiceItemRow from "./InvoiceItemRow";

type InvoiceItemRowType = {
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
    uom?: string | null;
};

type Props = {
    items: InvoiceItemRowType[];
    currencyCode?: string | null;
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
    money: (amount: any, currencyCode?: string | null) => string;
    onUpdateItem: (invoiceItemId: string, fields: any) => Promise<void>;
    onDeleteItem: (invoiceItemId: string) => Promise<void>;
};

export default function InvoiceItemsSection({
    items,
    currencyCode,
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
    money,
    onUpdateItem,
    onDeleteItem,
}: Props) {
    const [showAddForm, setShowAddForm] = useState(false);

    return (
        <>
            <section
                style={{
                    border: `1px solid ${MR_THEME.colors.border}`,
                    borderRadius: MR_THEME.radius.card,
                    background: MR_THEME.colors.cardBg,
                    boxShadow: MR_THEME.shadows.card,
                    padding: MR_THEME.layout.cardPadding,
                }}
            >
                <div style={{ display: "grid", gap: 16 }}>
                    <div className="invoiceItemsHeader">
                        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                            <div
                                style={{
                                    fontSize: 12,
                                    textTransform: "uppercase",
                                    letterSpacing: 1.1,
                                    color: MR_THEME.colors.textMuted,
                                    fontWeight: 800,
                                }}
                            >
                                Items
                            </div>

                            <div
                                style={{
                                    fontSize: 22,
                                    lineHeight: 1.15,
                                    fontWeight: 900,
                                    color: MR_THEME.colors.textPrimary,
                                }}
                            >
                                Invoice Line Items
                            </div>

                            <div
                                style={{
                                    fontSize: 14,
                                    color: MR_THEME.colors.textSecondary,
                                    lineHeight: 1.6,
                                    maxWidth: 760,
                                }}
                            >
                                Review, add, and update the billable items included in this invoice.
                            </div>
                        </div>

                        <div className="invoiceItemsHeaderActions">
                            <div
                                style={{
                                    minWidth: 88,
                                    height: 36,
                                    padding: "0 12px",
                                    borderRadius: 999,
                                    background: MR_THEME.colors.cardBgSoft,
                                    border: `1px solid ${MR_THEME.colors.border}`,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: MR_THEME.colors.textSecondary,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {items.length} {items.length === 1 ? "item" : "items"}
                            </div>

                            {isDraft ? (
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm((value) => !value)}
                                    style={{
                                        minHeight: 36,
                                        padding: "0 14px",
                                        borderRadius: MR_THEME.radius.control,
                                        border: `1px solid ${showAddForm ? MR_THEME.colors.borderStrong : MR_THEME.colors.textPrimary}`,
                                        background: showAddForm ? MR_THEME.colors.cardBg : MR_THEME.colors.textPrimary,
                                        color: showAddForm ? MR_THEME.colors.textPrimary : "#ffffff",
                                        cursor: "pointer",
                                        fontWeight: 900,
                                        whiteSpace: "nowrap",
                                        boxShadow: showAddForm ? "none" : MR_THEME.shadows.cardSoft,
                                    }}
                                >
                                    {showAddForm ? "Hide Form" : "+ Add Item"}
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {showAddForm ? (
                        <div
                            style={{
                                padding: 16,
                                borderRadius: MR_THEME.radius.card,
                                border: `1px solid ${MR_THEME.colors.border}`,
                                background: MR_THEME.colors.cardBgSoft,
                            }}
                        >
                            <AddInvoiceItemForm
                                desc={desc}
                                qty={qty}
                                unitPrice={unitPrice}
                                taxable={taxable}
                                isDraft={isDraft}
                                saving={saving}
                                onChangeDesc={onChangeDesc}
                                onChangeQty={onChangeQty}
                                onChangeUnitPrice={onChangeUnitPrice}
                                onChangeTaxable={onChangeTaxable}
                                onAddItem={onAddItem}
                            />
                        </div>
                    ) : null}

                    {items.length === 0 ? (
                        <div
                            style={{
                                border: `1px dashed ${MR_THEME.colors.borderStrong}`,
                                borderRadius: MR_THEME.radius.card,
                                background: MR_THEME.colors.cardBgSoft,
                                padding: "18px 16px",
                                color: MR_THEME.colors.textSecondary,
                                fontSize: 14,
                                lineHeight: 1.6,
                            }}
                        >
                            No items added yet.
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: 12 }}>
                            {items.map((it) => (
                                <InvoiceItemRow
                                    key={it.invoice_item_id}
                                    item={it}
                                    currencyCode={currencyCode}
                                    isDraft={isDraft}
                                    money={money}
                                    onUpdateItem={onUpdateItem}
                                    onDeleteItem={onDeleteItem}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <style jsx>{`
                .invoiceItemsHeader {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .invoiceItemsHeaderActions {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                @media (max-width: 720px) {
                    .invoiceItemsHeader {
                        display: grid;
                        grid-template-columns: 1fr;
                    }

                    .invoiceItemsHeaderActions {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        justify-content: stretch;
                    }

                    .invoiceItemsHeaderActions > * {
                        width: 100%;
                    }
                }
            `}</style>
        </>
    );
}
