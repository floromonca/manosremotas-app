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
                borderBottom: `1px solid ${MR_THEME.colors.border}`,
                padding: "10px 0",
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 10,
                    alignItems: "center",
                }}
            >
                <button
                    type="button"
                    onClick={onOpen}
                    disabled={!onOpen}
                    style={{
                        minWidth: 0,
                        padding: 0,
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: onOpen ? "pointer" : "default",
                    }}
                >
                    <div
                        style={{
                            fontWeight: 850,
                            fontSize: 15,
                            color: MR_THEME.colors.textPrimary,
                            lineHeight: 1.25,
                        }}
                    >
                        {title}
                    </div>

                    {helper ? (
                        <div
                            style={{
                                marginTop: 3,
                                fontSize: 12,
                                color: MR_THEME.colors.textSecondary,
                                lineHeight: 1.35,
                            }}
                        >
                            {helper}
                        </div>
                    ) : null}
                </button>

                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    style={{
                        padding: 0,
                        border: "none",
                        background: "transparent",
                        color: MR_THEME.colors.textSecondary,
                        fontWeight: 700,
                        opacity: 0.75,
                        cursor: "pointer",
                        fontSize: 12,
                        whiteSpace: "nowrap",
                    }}
                >
                    {expanded ? "Hide" : "View →"}
                </button>
            </div>

            {expanded ? (
                <div style={{ marginTop: 8 }}>
                    {items.length === 0 ? (
                        <div
                            style={{
                                padding: "8px 0",
                                color: MR_THEME.colors.textSecondary,
                                fontSize: 12,
                            }}
                        >
                            Nothing here right now.
                        </div>
                    ) : (
                        <div style={{ display: "grid" }}>
                            {items.map((it, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={onOpen}
                                    disabled={!onOpen}
                                    style={{
                                        width: "100%",
                                        textAlign: "left",
                                        padding: "8px 0",
                                        background: "transparent",
                                        border: "none",
                                        borderTop:
                                            idx === 0
                                                ? `1px solid ${MR_THEME.colors.border}`
                                                : "none",
                                        cursor: onOpen ? "pointer" : "default",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            gap: 10,
                                            alignItems: "center",
                                        }}
                                    >
                                        <span
                                            style={{
                                                minWidth: 0,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                                fontWeight: 750,
                                                fontSize: 13,
                                                color: MR_THEME.colors.textPrimary,
                                            }}
                                        >
                                            {it.title}
                                        </span>

                                        {it.meta ? (
                                            <span
                                                style={{
                                                    flexShrink: 0,
                                                    color: MR_THEME.colors.textMuted,
                                                    fontFamily: "monospace",
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                WO {it.meta}
                                            </span>
                                        ) : null}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}