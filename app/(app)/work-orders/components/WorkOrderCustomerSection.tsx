"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MR_THEME } from "@/lib/theme";

type CustomerForm = {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    service_address: string;
};

type Props = {
    customerForm: CustomerForm;
    customerId?: string | null;
    isAdmin: boolean;
};

export default function WorkOrderCustomerSection({
    customerForm,
    customerId,
    isAdmin,
}: Props) {
    const router = useRouter();
    const isTech = !isAdmin;
    const [showCustomerDetails, setShowCustomerDetails] = useState(!isTech);

    const inputStyle: React.CSSProperties = {
        padding: isTech ? "9px 10px" : "12px 14px",
        borderRadius: MR_THEME.radius.control,
        border: `1px solid ${MR_THEME.colors.borderStrong}`,
        background: MR_THEME.colors.cardBg,
        fontSize: isTech ? 13 : 14,
        color: MR_THEME.colors.textPrimary,
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
    };

    const readOnlyValueStyle: React.CSSProperties = {
        ...inputStyle,
        display: "flex",
        alignItems: "center",
        background: MR_THEME.colors.cardBgSoft,
        fontWeight: 700,
        minHeight: isTech ? 40 : 46,
    };

    const labelStyle: React.CSSProperties = {
        display: "grid",
        gap: isTech ? 4 : 7,
    };

    const labelTextStyle: React.CSSProperties = {
        fontSize: isTech ? 12 : 13,
        fontWeight: 800,
        color: MR_THEME.colors.textSecondary,
    };

    return (
        <div
            style={{
                marginTop: 18,
                paddingTop: isTech ? 14 : 18,
                borderTop: `1px solid ${MR_THEME.colors.border}`,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: showCustomerDetails ? (isTech ? 10 : 14) : 0,
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: isTech ? 11 : 12,
                            textTransform: "uppercase",
                            letterSpacing: isTech ? 0.6 : 1,
                            color: MR_THEME.colors.textSecondary,
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
                            color: MR_THEME.colors.textPrimary,
                        }}
                    >
                        Customer
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setShowCustomerDetails((v) => !v)}
                    style={{
                        border: "none",
                        background: "transparent",
                        color: MR_THEME.colors.primary,
                        padding: 0,
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                    }}
                >
                    {showCustomerDetails ? "Hide" : "Show"}
                    <span style={{ fontSize: 12, lineHeight: 1 }}>
                        {showCustomerDetails ? "▴" : "▾"}
                    </span>
                </button>
            </div>

            {showCustomerDetails ? (
                <div
                    style={{
                        display: "grid",
                        gap: isTech ? 10 : 14,
                        maxWidth: 760,
                        padding: isTech ? 12 : 18,
                        borderRadius: MR_THEME.radius.card,
                        border: `1px solid ${MR_THEME.colors.border}`,
                        background: MR_THEME.colors.cardBg,
                        boxShadow: MR_THEME.shadows.cardSoft,
                    }}
                >
                    <label style={labelStyle}>
                        <span style={labelTextStyle}>Customer Name</span>
                        <div style={readOnlyValueStyle}>
                            {customerForm.customer_name || "—"}
                        </div>
                    </label>

                    <label style={labelStyle}>
                        <span style={labelTextStyle}>Customer Email</span>
                        <div style={readOnlyValueStyle}>
                            {customerForm.customer_email || "—"}
                        </div>
                    </label>

                    <label style={labelStyle}>
                        <span style={labelTextStyle}>Customer Phone</span>
                        <div style={readOnlyValueStyle}>
                            {customerForm.customer_phone || "—"}
                        </div>
                    </label>

                    <label style={labelStyle}>
                        <span style={labelTextStyle}>Service Address</span>
                        <div style={readOnlyValueStyle}>
                            {customerForm.service_address || "—"}
                        </div>
                    </label>

                    {isAdmin ? (
                        <div style={{ paddingTop: 4 }}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!customerId) {
                                        alert("This work order is not linked to a customer record.");
                                        return;
                                    }

                                    router.push(`/customers/${customerId}`);
                                }}
                                style={{
                                    padding: "12px 16px",
                                    borderRadius: MR_THEME.radius.control,
                                    border: `1px solid ${MR_THEME.colors.primary}`,
                                    background: MR_THEME.colors.primary,
                                    color: "#ffffff",
                                    cursor: "pointer",
                                    fontWeight: 900,
                                    fontSize: 14,
                                    boxShadow: MR_THEME.shadows.cardSoft,
                                }}
                            >
                                Edit Customer
                            </button>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}