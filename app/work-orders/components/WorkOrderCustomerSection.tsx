"use client";

import React from "react";

type CustomerForm = {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    service_address: string;
};

type Props = {
    customerForm: CustomerForm;
    setCustomerForm: React.Dispatch<React.SetStateAction<CustomerForm>>;
    saveCustomerInfo: () => void | Promise<void>;
    savingCustomer: boolean;
    isAdmin: boolean;
};

const inputStyle: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    fontSize: 14,
    color: "#111827",
    outline: "none",
};

export default function WorkOrderCustomerSection({
    customerForm,
    setCustomerForm,
    saveCustomerInfo,
    savingCustomer,
    isAdmin,
}: Props) {


    return (
        <div
            style={{
                marginTop: 18,
                paddingTop: 18,
                borderTop: "1px solid #ececec",
            }}
        >
            <div style={{ marginBottom: 14 }}>
                <div
                    style={{
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        color: "#6b7280",
                        fontWeight: 800,
                        marginBottom: 6,
                    }}
                >
                    Customer Details
                </div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#111827" }}>Customer</div>
            </div>

            <div
                style={{
                    display: "grid",
                    gap: 14,
                    maxWidth: 760,
                    padding: 18,
                    borderRadius: 16,
                    border: "1px solid #e5e7eb",
                    background: "#fcfcfd",
                }}
            >
                <label style={{ display: "grid", gap: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#374151" }}>Customer Name</span>

                    {isAdmin ? (
                        <input
                            value={customerForm.customer_name}
                            onChange={(e) =>
                                setCustomerForm((s) => ({ ...s, customer_name: e.target.value }))
                            }
                            style={inputStyle}
                        />
                    ) : (
                        <div
                            style={{
                                ...inputStyle,
                                display: "flex",
                                alignItems: "center",
                                background: "#f9fafb",
                            }}
                        >
                            {customerForm.customer_name || "—"}
                        </div>
                    )}
                </label>
                <label style={{ display: "grid", gap: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#374151" }}>Customer Email</span>

                    {isAdmin ? (
                        <input
                            value={customerForm.customer_email}
                            onChange={(e) =>
                                setCustomerForm((s) => ({ ...s, customer_email: e.target.value }))
                            }
                            style={inputStyle}
                        />
                    ) : (
                        <div
                            style={{
                                ...inputStyle,
                                display: "flex",
                                alignItems: "center",
                                background: "#f9fafb",
                            }}
                        >
                            {customerForm.customer_email || "—"}
                        </div>
                    )}
                </label>

                <label style={{ display: "grid", gap: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#374151" }}>Customer Phone</span>

                    {isAdmin ? (
                        <input
                            value={customerForm.customer_phone}
                            onChange={(e) =>
                                setCustomerForm((s) => ({ ...s, customer_phone: e.target.value }))
                            }
                            style={inputStyle}
                        />
                    ) : (
                        <div
                            style={{
                                ...inputStyle,
                                display: "flex",
                                alignItems: "center",
                                background: "#f9fafb",
                            }}
                        >
                            {customerForm.customer_phone || "—"}
                        </div>
                    )}
                </label>

                <label style={{ display: "grid", gap: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#374151" }}>Service Address</span>

                    {isAdmin ? (
                        <input
                            value={customerForm.service_address}
                            onChange={(e) =>
                                setCustomerForm((s) => ({ ...s, service_address: e.target.value }))
                            }
                            style={inputStyle}
                        />
                    ) : (
                        <div
                            style={{
                                ...inputStyle,
                                display: "flex",
                                alignItems: "center",
                                background: "#f9fafb",
                            }}
                        >
                            {customerForm.service_address || "—"}
                        </div>
                    )}
                </label>

                {isAdmin ? (
                    <div style={{ paddingTop: 4 }}>
                        <button
                            type="button"
                            onClick={saveCustomerInfo}
                            disabled={savingCustomer}
                            style={{
                                padding: "12px 16px",
                                borderRadius: 12,
                                border: "1px solid #111827",
                                background: "#111827",
                                color: "white",
                                cursor: savingCustomer ? "not-allowed" : "pointer",
                                fontWeight: 900,
                                fontSize: 14,
                                opacity: savingCustomer ? 0.7 : 1,
                                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                            }}
                        >
                            {savingCustomer ? "Saving..." : "Save Customer Info"}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}