"use client";

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
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(0,0,0,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
        >
            <div
                style={{
                    background: "white",
                    padding: 24,
                    borderRadius: 12,
                    width: 420,
                    maxWidth: "92vw",
                    display: "grid",
                    gap: 14,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                }}
            >
                <h3 style={{ margin: 0 }}>Record Payment</h3>

                <div
                    style={{
                        fontSize: 13,
                        opacity: 0.8,
                        padding: 10,
                        borderRadius: 8,
                        background: "#f8fafc",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    Current balance: <b>{money(currentBalance, currencyCode)}</b>
                </div>
                <div
                    style={{
                        fontSize: 13,
                        padding: 10,
                        borderRadius: 8,
                        background: amountExceedsBalance ? "#fef2f2" : "#f0fdf4",
                        border: amountExceedsBalance ? "1px solid #fecaca" : "1px solid #bbf7d0",
                        color: amountExceedsBalance ? "#991b1b" : "#166534",
                        fontWeight: 700,
                    }}
                >
                    {amountExceedsBalance
                        ? "Payment amount cannot be greater than the current balance."
                        : `Remaining balance after payment: ${money(remainingBalance, currencyCode)}`}
                </div>
                <label style={{ display: "grid", gap: 6 }}>
                    <span>Amount</span>
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
                        style={{
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #ddd",
                        }}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Method</span>
                    <select
                        value={paymentMethod}
                        onChange={(e) => onChangeMethod(e.target.value)}
                        style={{
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #ddd",
                        }}
                    >
                        <option value="cash">Cash</option>
                        <option value="e-transfer">E-Transfer</option>
                        <option value="card">Card</option>
                        <option value="check">Check</option>
                    </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Payment date</span>
                    <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => onChangeDate(e.target.value)}
                        style={{
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #ddd",
                        }}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Notes</span>
                    <textarea
                        value={paymentNotes}
                        onChange={(e) => onChangeNotes(e.target.value)}
                        rows={3}
                        placeholder="Optional notes"
                        style={{
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #ddd",
                            resize: "vertical",
                        }}
                    />
                </label>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <button
                        onClick={onCancel}
                        disabled={savingPayment}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            border: "1px solid #ddd",
                            background: "white",
                            cursor: savingPayment ? "not-allowed" : "pointer",
                        }}
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onSave}
                        disabled={saveDisabled}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            border: "none",
                            background: "#16a34a",
                            color: "white",
                            fontWeight: 700,
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