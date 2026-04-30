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
                style={{
                    width: "100%",
                    padding: 16,
                    background: "transparent",
                }}
            >
                <div className="listBlockHeader">
                    <div style={{ minWidth: 0, width: "100%" }}>
                        <div
                            style={{
                                fontWeight: 900,
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

                    <div className="listBlockActions">
                        {onOpen ? (
                            <button
                                type="button"
                                onClick={onOpen}
                                style={secondaryButtonStyle}
                            >
                                View all
                            </button>
                        ) : null}

                        <button
                            type="button"
                            onClick={() => setExpanded((v) => !v)}
                            style={{
                                ...secondaryButtonStyle,
                                background: expanded
                                    ? MR_THEME.colors.primarySoft
                                    : MR_THEME.colors.cardBg,
                                color: expanded
                                    ? MR_THEME.colors.primaryHover
                                    : MR_THEME.colors.textPrimary,
                            }}
                        >
                            {expanded ? "Hide details" : "Show details"}
                        </button>
                    </div>
                </div>
            </div>

            {expanded ? (
                <div style={{ padding: "0 16px 16px" }}>
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
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={onOpen}
                                    disabled={!onOpen}
                                    style={{
                                        width: "100%",
                                        textAlign: "left",
                                        padding: "14px 16px",
                                        background: MR_THEME.colors.cardBg,
                                        border: `1px solid ${MR_THEME.colors.border}`,
                                        borderRadius: MR_THEME.radius.control,
                                        cursor: onOpen ? "pointer" : "default",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 800,
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
                                                fontWeight: 700,
                                            }}
                                        >
                                            WO {it.meta}
                                        </div>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}

            <style jsx>{`
   .listBlockHeader {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

   .listBlockActions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}

    @media (max-width: 720px) {
        .listBlockHeader {
            flex-direction: column;
            align-items: stretch;
        }

        .listBlockActions {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
            margin-top: 10px;
        }

        .listBlockActions button {
            width: 100%;
        }
    }
`}</style>
        </div>
    );
}

const secondaryButtonStyle: React.CSSProperties = {
    padding: "12px 16px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.border}`,
    background: MR_THEME.colors.cardBgSoft,
    color: MR_THEME.colors.textPrimary,
    cursor: "pointer",
    fontWeight: 800,
    whiteSpace: "nowrap",
};