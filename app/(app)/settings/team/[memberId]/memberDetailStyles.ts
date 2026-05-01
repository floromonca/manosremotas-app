import type { CSSProperties } from "react";

export const cardStyle: CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#ffffff",
    padding: 20,
};

export const sectionTitleStyle: CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 12,
};

export const sectionTitleStyleNoMargin: CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
};

export const mutedTextStyle: CSSProperties = {
    fontSize: 13,
    color: "#6b7280",
};

export const statsGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
};

export const historyGridStyle: CSSProperties = {
    display: "grid",
    gap: 10,
};

export const runningBadgeStyle: CSSProperties = {
    padding: "4px 10px",
    borderRadius: 999,
    background: "#ecfdf3",
    border: "1px solid #bbf7d0",
    color: "#166534",
    fontSize: 12,
    fontWeight: 700,
};

export const overnightBadgeStyle: CSSProperties = {
    padding: "4px 10px",
    borderRadius: 999,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#c2410c",
    fontSize: 12,
    fontWeight: 700,
};

export const compactRunningBadgeStyle: CSSProperties = {
    padding: "2px 8px",
    borderRadius: 999,
    background: "#ecfdf3",
    border: "1px solid #bbf7d0",
    color: "#166534",
    fontSize: 11,
    fontWeight: 700,
};

export const compactClosedBadgeStyle: CSSProperties = {
    padding: "2px 8px",
    borderRadius: 999,
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    color: "#334155",
    fontSize: 11,
    fontWeight: 700,
};

export function inputStyle(disabled: boolean): CSSProperties {
    return {
        height: 40,
        borderRadius: 10,
        border: "1px solid #d1d5db",
        padding: "0 12px",
        outline: "none",
        background: disabled ? "#f9fafb" : "#ffffff",
        fontSize: 14,
        color: "#111827",
        width: "100%",
    };
}