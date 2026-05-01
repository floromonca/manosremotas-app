"use client";

import type { CSSProperties } from "react";
import { mutedTextStyle, inputStyle } from "../memberDetailStyles";
import { formatDateInput, formatMoney } from "../memberDetailUtils";

type MemberPayRate = {
    hourly_rate: number | null;
    currency_code: string | null;
    effective_from: string | null;
};

type MemberPayRateCardProps = {
    loadingPayRate: boolean;
    activePayRate: MemberPayRate | null;
    payRateInput: string;
    currencyInput: string;
    effectiveFromInput: string;
    canEditPayRate: boolean;
    savingPayRate: boolean;
    onPayRateInputChange: (value: string) => void;
    onCurrencyInputChange: (value: string) => void;
    onEffectiveFromInputChange: (value: string) => void;
    onSavePayRate: () => void;
};

export default function MemberPayRateCard({
    loadingPayRate,
    activePayRate,
    payRateInput,
    currencyInput,
    effectiveFromInput,
    canEditPayRate,
    savingPayRate,
    onPayRateInputChange,
    onCurrencyInputChange,
    onEffectiveFromInputChange,
    onSavePayRate,
}: MemberPayRateCardProps) {
    const inputsDisabled = !canEditPayRate || savingPayRate;

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <div>
                    <div style={titleStyle}>Pay rate</div>
                    <div style={descriptionStyle}>
                        Configure the hourly rate used for payroll calculations.
                    </div>
                </div>

                {loadingPayRate ? (
                    <div style={mutedTextStyle}>Loading pay rate...</div>
                ) : activePayRate ? (
                    <div style={activeBadgeStyle}>
                        Active:{" "}
                        {formatMoney(
                            activePayRate.hourly_rate,
                            activePayRate.currency_code
                        )}{" "}
                        since {formatDateInput(activePayRate.effective_from)}
                    </div>
                ) : (
                    <div style={warningBadgeStyle}>No active pay rate</div>
                )}
            </div>

            <div style={formGridStyle}>
                <label style={labelStyle}>
                    Hourly rate
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payRateInput}
                        onChange={(e) => onPayRateInputChange(e.target.value)}
                        disabled={inputsDisabled}
                        placeholder="28.00"
                        style={inputStyle(inputsDisabled)}
                    />
                </label>

                <label style={labelStyle}>
                    Currency
                    <input
                        value={currencyInput}
                        onChange={(e) =>
                            onCurrencyInputChange(e.target.value.toUpperCase())
                        }
                        disabled={inputsDisabled}
                        maxLength={3}
                        placeholder="CAD"
                        style={inputStyle(inputsDisabled)}
                    />
                </label>

                <label style={labelStyle}>
                    Effective from
                    <input
                        type="date"
                        value={effectiveFromInput}
                        onChange={(e) =>
                            onEffectiveFromInputChange(e.target.value)
                        }
                        disabled={inputsDisabled}
                        style={inputStyle(inputsDisabled)}
                    />
                </label>
            </div>

            <div style={footerStyle}>
                <div style={helperTextStyle}>
                    {canEditPayRate
                        ? "Saving a new rate preserves payroll history by creating a new effective record."
                        : "Only owners and admins can edit pay rates."}
                </div>

                {canEditPayRate ? (
                    <button
                        type="button"
                        onClick={onSavePayRate}
                        disabled={savingPayRate}
                        style={{
                            ...saveButtonStyle,
                            cursor: savingPayRate ? "default" : "pointer",
                            opacity: savingPayRate ? 0.7 : 1,
                        }}
                    >
                        {savingPayRate ? "Saving..." : "Save rate"}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

const containerStyle: CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 16,
    background: "#fcfcfd",
};

const headerStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
};

const titleStyle: CSSProperties = {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 4,
};

const descriptionStyle: CSSProperties = {
    fontSize: 13,
    color: "#6b7280",
};

const activeBadgeStyle: CSSProperties = {
    fontSize: 12,
    color: "#374151",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    padding: "6px 10px",
    fontWeight: 600,
};

const warningBadgeStyle: CSSProperties = {
    fontSize: 12,
    color: "#92400e",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 999,
    padding: "6px 10px",
    fontWeight: 600,
};

const formGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
};

const labelStyle: CSSProperties = {
    display: "grid",
    gap: 6,
    fontSize: 13,
    color: "#374151",
    fontWeight: 600,
};

const footerStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 14,
};

const helperTextStyle: CSSProperties = {
    fontSize: 12,
    color: "#6b7280",
};

const saveButtonStyle: CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    fontWeight: 700,
};
