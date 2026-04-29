"use client";

import React, { useState } from "react";
import { MR_THEME } from "../../../../lib/theme";

type ListBlockItem = {
    title: string;
    meta?: string;
};

type ListBlockProps = {
    title: string;
    helper?: string;
    items: ListBlockItem[];
    onOpen?: () => void;
};

export default function ListBlock({
    title,
    helper,
    items,
    onOpen,
}: ListBlockProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            style={{
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                background: MR_THEME.colors.cardBgSoft,
                overflow: "hidden",
            }}
        >
            <div
                onClick={() => setExpanded((v) => !v)}
                style={{
                    width: "100%",
                    padding: 16,
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        flexWrap: "wrap",
                    }}
                >
                    <div style={{ minWidth: 220 }}>
                        <div
                            style={{
                                fontWeight: 700,
                                fontSize: 20,
                                color: MR_THEME.colors.textPrimary,
                                lineHeight: 1.2,
                            }}
                        >
                            {title}
                        </div>

                        {helper ? (
                            <div
                                style={{
                                    marginTop: 6,
                                    fontSize: 13,
                                    color: MR_THEME.colors.textSecondary,
                                    lineHeight: 1.5,
                                }}
                            >
                                {helper}
                            </div>
                        ) : null}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginLeft: "auto",
                        }}
                    >
                        {onOpen ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpen();
                                }}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: MR_THEME.radius.control,
                                    border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                    background: MR_THEME.colors.cardBg,
                                    color: MR_THEME.colors.textPrimary,
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                View →
                            </button>
                        ) : null}

                        <div
                            style={{
                                fontSize: 18,
                                color: MR_THEME.colors.textSecondary,
                                fontWeight: 700,
                                lineHeight: 1,
                                padding: "6px 4px",
                                minWidth: 18,
                                textAlign: "center",
                            }}
                        >
                            {expanded ? "−" : "+"}
                        </div>
                    </div>
                </div>
            </div>

            {expanded ? (
                <div style={{ padding: "0 16px 16px 16px" }}>
                    {items.length === 0 ? (
                        <div
                            style={{
                                padding: "14px 16px",
                                borderRadius: MR_THEME.radius.control,
                                background: MR_THEME.colors.cardBg,
                                border: `1px dashed ${MR_THEME.colors.borderStrong}`,
                                color: MR_THEME.colors.textSecondary,
                                fontSize: 13,
                            }}
                        >
                            Nothing here right now.
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                            {items.map((it, idx) => (
                                <div
                                    key={idx}
                                    onClick={onOpen ? () => onOpen() : undefined}
                                    style={{
                                        padding: "14px 16px",
                                        background: MR_THEME.colors.cardBg,
                                        border: `1px solid ${MR_THEME.colors.border}`,
                                        borderRadius: MR_THEME.radius.control,
                                        cursor: onOpen ? "pointer" : "default",
                                        transition:
                                            "background 0.15s ease, border-color 0.15s ease, transform 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!onOpen) return;
                                        e.currentTarget.style.background = MR_THEME.colors.appBg;
                                        e.currentTarget.style.borderColor = MR_THEME.colors.borderStrong;
                                        e.currentTarget.style.transform = "translateY(-1px)";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!onOpen) return;
                                        e.currentTarget.style.background = MR_THEME.colors.cardBg;
                                        e.currentTarget.style.borderColor = MR_THEME.colors.border;
                                        e.currentTarget.style.transform = "translateY(0)";
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            fontSize: 15,
                                            color: MR_THEME.colors.textPrimary,
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        {it.title}
                                    </div>

                                    {it.meta ? (
                                        <div
                                            style={{
                                                marginTop: 8,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                padding: "4px 8px",
                                                borderRadius: 999,
                                                background: MR_THEME.colors.cardBgSoft,
                                                color: MR_THEME.colors.textSecondary,
                                                fontFamily: "monospace",
                                                fontSize: 12,
                                                fontWeight: 600,
                                            }}
                                        >
                                            WO {it.meta}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}