"use client";

import { MR_THEME } from "../../../../../lib/theme";

type Props = {
    open: boolean;
    savingPayment: boolean;
    currentBalance: number;
    currencyCode?: string | null;
    paymentAmount: number;
    paymentMethod: string;
    paymentDate: string;
    paymentNotes: string;
    money: (amount: any, currencyCode?: string | null) => string;
    onChangeAmount: (value: number) => void;
    onChangeMethod: (value: string) => void;
    onChangeDate: (value: string) => void;
    onChangeNotes: (value: string) => void;
    onCancel: () => void;
    onSave: () => void;
};

export default function RecordPaymentModal({
    open,
    savingPayment,
    currentBalance,
    currencyCode,
    paymentAmount,
    paymentMethod,
    paymentDate,
    paymentNotes,
    money,
    onChangeAmount,
    onChangeMethod,
    onChangeDate,
    onChangeNotes,
    onCancel,
    onSave,
}: Props) {
    if (!open) return null;

    const safeCurrentBalance = Number(currentBalance || 0);
    const safePaymentAmount = Number(paymentAmount || 0);
    const remainingBalance = Math.max(safeCurrentBalance - safePaymentAmount, 0);

    const amountIsInvalid = safePaymentAmount <= 0;
    const amountExceedsBalance = safePaymentAmount > safeCurrentBalance;
    const saveDisabled = savingPayment || amountIsInvalid || amountExceedsBalance;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: 16,
            }}
        >
            <div
                style={{
                    background: MR_THEME.colors.cardBg,
                    padding: 24,
                    borderRadius: MR_THEME.radius.card,
                    width: 440,
                    maxWidth: "100%",
                    display: "grid",
                    gap: 14,
                    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.22)",
                    border: `1px solid ${MR_THEME.colors.border}`,
                }}
            >
                <div>
                    <h3
                        style={{
                            margin: 0,
                            fontSize: 22,
                            fontWeight: 900,
                            color: MR_THEME.colors.textPrimary,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        Record Payment
                    </h3>
                    <div
                        style={{
                            marginTop: 4,
                            fontSize: 13,
                            color: MR_THEME.colors.textSecondary,
                            lineHeight: 1.4,
                        }}
                    >
                        Register a payment and update the invoice balance.
                    </div>
                </div>

                <div
                    style={{
                        fontSize: 13,
                        padding: 12,
                        borderRadius: MR_THEME.radius.control,
                        background: MR_THEME.colors.cardBgSoft,
                        border: `1px solid ${MR_THEME.colors.border}`,
                        color: MR_THEME.colors.textSecondary,
                    }}
                >
                    Current balance:{" "}
                    <b style={{ color: MR_THEME.colors.textPrimary }}>
                        {money(currentBalance, currencyCode)}
                    </b>
                </div>

                <div
                    style={{
                        fontSize: 13,
                        padding: 12,
                        borderRadius: MR_THEME.radius.control,
                        background: amountExceedsBalance ? "#fef2f2" : "#f0fdf4",
                        border: amountExceedsBalance
                            ? "1px solid #fecaca"
                            : "1px solid #bbf7d0",
                        color: amountExceedsBalance ? "#991b1b" : "#166534",
                        fontWeight: 800,
                        lineHeight: 1.4,
                    }}
                >
                    {amountExceedsBalance
                        ? "Payment amount cannot be greater than the current balance."
                        : `Remaining balance after payment: ${money(remainingBalance, currencyCode)}`}
                </div>

                <label style={{ display: "grid", gap: 6 }}>
                    <span style={labelStyle}>Amount</span>
                    <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={paymentAmount === 0 ? "" : paymentAmount}
                        onChange={(e) => {
                            let value = e.target.value;

                            if (value === "") {
                                onChangeAmount(0);
                                return;
                            }

                            value = value.replace(/^0+(?=\d)/, "");
                            const num = Number(value);

                            if (isNaN(num)) return;

                            onChangeAmount(num);
                        }}
                        style={inputStyle}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span style={labelStyle}>Method</span>
                    <select
                        value={paymentMethod}
                        onChange={(e) => onChangeMethod(e.target.value)}
                        style={inputStyle}
                    >
                        <option value="cash">Cash</option>
                        <option value="e-transfer">E-Transfer</option>
                        <option value="card">Card</option>
                        <option value="check">Check</option>
                    </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span style={labelStyle}>Payment date</span>
                    <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => onChangeDate(e.target.value)}
                        style={inputStyle}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span style={labelStyle}>Notes</span>
                    <textarea
                        value={paymentNotes}
                        onChange={(e) => onChangeNotes(e.target.value)}
                        rows={3}
                        placeholder="Optional notes"
                        style={{
                            ...inputStyle,
                            resize: "vertical",
                            minHeight: 86,
                        }}
                    />
                </label>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        paddingTop: 4,
                    }}
                >
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={savingPayment}
                        style={{
                            padding: "10px 14px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.borderStrong}`,
                            background: MR_THEME.colors.cardBg,
                            color: MR_THEME.colors.textPrimary,
                            fontWeight: 800,
                            cursor: savingPayment ? "not-allowed" : "pointer",
                            opacity: savingPayment ? 0.7 : 1,
                        }}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saveDisabled}
                        style={{
                            padding: "10px 14px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.success}`,
                            background: MR_THEME.colors.success,
                            color: "white",
                            fontWeight: 900,
                            cursor: saveDisabled ? "not-allowed" : "pointer",
                            opacity: saveDisabled ? 0.7 : 1,
                        }}
                    >
                        {savingPayment ? "Saving..." : "Save Payment"}
                    </button>
                </div>
            </div>
        </div>
    );
}

const labelStyle = {
    fontSize: 12,
    fontWeight: 800,
    color: MR_THEME.colors.textSecondary,
};

const inputStyle = {
    padding: 10,
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    fontSize: 14,
};