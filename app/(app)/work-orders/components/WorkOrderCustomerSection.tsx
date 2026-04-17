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

export default function WorkOrderCustomerSection({
    customerForm,
    setCustomerForm,
    saveCustomerInfo,
    savingCustomer,
    isAdmin,
}: Props) {
    const isTech = !isAdmin;

    const inputStyle: React.CSSProperties = {
        padding: isTech ? "9px 10px" : "12px 14px",
        borderRadius: 12,
        border: "1px solid #d1d5db",
        background: "#ffffff",
        fontSize: isTech ? 13 : 14,
        color: "#111827",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
    };

    const readOnlyValueStyle: React.CSSProperties = {
        ...inputStyle,
        display: "flex",
        alignItems: "center",
        background: "#f9fafb",
        fontWeight: 600,
        minHeight: isTech ? 40 : 46,
    };

    const labelStyle: React.CSSProperties = {
        display: "grid",
        gap: isTech ? 4 : 7,
    };

    const labelTextStyle: React.CSSProperties = {
        fontSize: isTech ? 12 : 13,
        fontWeight: 800,
        color: "#374151",
    };

    return (
        <div
            style={{
                marginTop: 18,
                paddingTop: isTech ? 14 : 18,
                borderTop: "1px solid #ececec",
            }}
        >
            <div style={{ marginBottom: isTech ? 10 : 14 }}>
                <div
                    style={{
                        fontSize: isTech ? 11 : 12,
                        textTransform: "uppercase",
                        letterSpacing: isTech ? 0.6 : 1,
                        color: "#6b7280",
                        fontWeight: isTech ? 700 : 800,
                        marginBottom: 6,
                    }}
                >
                    Customer Details
                </div>

                <div
                    style={{
                        fontWeight: 900,
                        fontSize: isTech ? 18 : 22,
                        color: "#111827",
                    }}
                >
                    Customer
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gap: isTech ? 10 : 14,
                    maxWidth: 760,
                    padding: isTech ? 12 : 18,
                    borderRadius: 16,
                    border: "1px solid #e5e7eb",
                    background: "#fcfcfd",
                }}
            >
                <label style={labelStyle}>
                    <span style={labelTextStyle}>Customer Name</span>

                    {isAdmin ? (
                        <input
                            value={customerForm.customer_name}
                            onChange={(e) =>
                                setCustomerForm((s) => ({
                                    ...s,
                                    customer_name: e.target.value,
                                }))
                            }
                            style={inputStyle}
                        />
                    ) : (
                        <div style={readOnlyValueStyle}>
                            {customerForm.customer_name || "—"}
                        </div>
                    )}
                </label>

                <label style={labelStyle}>
                    <span style={labelTextStyle}>Customer Email</span>

                    {isAdmin ? (
                        <input
                            value={customerForm.customer_email}
                            onChange={(e) =>
                                setCustomerForm((s) => ({
                                    ...s,
                                    customer_email: e.target.value,
                                }))
                            }
                            style={inputStyle}
                        />
                    ) : (
                        <div style={readOnlyValueStyle}>
                            {customerForm.customer_email || "—"}
                        </div>
                    )}
                </label>

                <label style={labelStyle}>
                    <span style={labelTextStyle}>Customer Phone</span>

                    {isAdmin ? (
                        <input
                            value={customerForm.customer_phone}
                            onChange={(e) =>
                                setCustomerForm((s) => ({
                                    ...s,
                                    customer_phone: e.target.value,
                                }))
                            }
                            style={inputStyle}
                        />
                    ) : (
                        <div style={readOnlyValueStyle}>
                            {customerForm.customer_phone || "—"}
                        </div>
                    )}
                </label>

                <label style={labelStyle}>
                    <span style={labelTextStyle}>Service Address</span>

                    {isAdmin ? (
                        <input
                            value={customerForm.service_address}
                            onChange={(e) =>
                                setCustomerForm((s) => ({
                                    ...s,
                                    service_address: e.target.value,
                                }))
                            }
                            style={inputStyle}
                        />
                    ) : (
                        <div style={readOnlyValueStyle}>
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