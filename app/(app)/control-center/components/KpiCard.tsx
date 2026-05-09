"use client";

import React from "react";
import { MR_THEME } from "../../../../lib/theme";

type KpiCardProps = {
    title: string;
    value: string;
    onClick?: () => void;
    accentColor?: string;
    statusText?: string;
    icon?: React.ReactNode;
    compactDesktop?: boolean;
};

export default function KpiCard({
    title,
    value,
    onClick,
    accentColor,
    statusText,
    icon,
    compactDesktop = false,
}: KpiCardProps) {
    const clickable = !!onClick;
    const accent = accentColor || MR_THEME.colors.borderStrong;
    const CardElement = clickable ? "button" : "div";

    return (
        <>
            <CardElement
                className={`kpiCard${compactDesktop ? " compactDesktop" : ""}`}
                type={clickable ? "button" : undefined}
                onClick={onClick}
                aria-label={clickable ? `Open ${title}` : undefined}
                style={{
                    border: `1px solid ${MR_THEME.colors.border}`,
                    borderRadius: MR_THEME.radius.card,
                    background: MR_THEME.colors.cardBg,
                    cursor: clickable ? "pointer" : "default",
                    transition: "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
                    boxShadow: MR_THEME.shadows.cardSoft,
                    position: "relative",
                    overflow: "hidden",
                    appearance: "none",
                }}
                onMouseEnter={(e) => {
                    if (!clickable) return;
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = MR_THEME.shadows.dropdown;
                    e.currentTarget.style.borderColor = accent;
                }}
                onMouseLeave={(e) => {
                    if (!clickable) return;
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = MR_THEME.shadows.cardSoft;
                    e.currentTarget.style.borderColor = MR_THEME.colors.border;
                }}
            >
                <div className="kpiIconWrap" style={{ background: `${accent}18`, color: accent }}>
                    {icon || "•"}
                </div>

                <div className="kpiContent">
                    <div className="kpiTitle">{title}</div>

                    {statusText ? (
                        <div className="kpiStatus" style={{ color: accent }}>
                            {statusText}
                        </div>
                    ) : null}
                </div>

                <div className="kpiValue">{value}</div>

                {clickable ? (
                    <div className="kpiChevron" aria-hidden="true">
                        ›
                    </div>
                ) : null}
            </CardElement>

            <style jsx>{`
                .kpiCard {
                    width: 100%;
                    min-width: 0;
                    min-height: 156px;
                    padding: 18px;
                    text-align: left;
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) auto;
                    grid-template-rows: auto 1fr auto;
                    gap: 14px 12px;
                }

                .kpiIconWrap {
                    width: 44px;
                    height: 44px;
                    border-radius: ${MR_THEME.radius.modal}px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 22px;
                    font-weight: 900;
                }

                .kpiContent {
                    grid-column: 1 / -1;
                    align-self: end;
                    display: grid;
                    gap: 14px;
                }

                .kpiTitle {
                    font-size: 16px;
                    font-weight: 850;
                    color: ${MR_THEME.colors.textPrimary};
                    line-height: 1.35;
                }

                .kpiStatus {
                    font-size: 13px;
                    font-weight: 800;
                    line-height: 1.3;
                }

                .kpiValue {
                    grid-column: 1 / -1;
                    font-size: 36px;
                    line-height: 0.95;
                    font-weight: 900;
                    color: ${MR_THEME.colors.textPrimary};
                    letter-spacing: 0;
                }

                .kpiChevron {
                    grid-column: 2;
                    grid-row: 1;
                    color: ${MR_THEME.colors.textSecondary};
                    font-size: 24px;
                    font-weight: 500;
                    line-height: 1;
                    padding-top: 8px;
                }

                @media (min-width: 681px) {
                    .kpiCard.compactDesktop {
                        min-height: 128px;
                        padding: 14px;
                        gap: 9px 10px;
                    }

                    .kpiCard.compactDesktop .kpiIconWrap {
                        width: 38px;
                        height: 38px;
                        border-radius: ${MR_THEME.radius.control}px;
                        font-size: 19px;
                    }

                    .kpiCard.compactDesktop .kpiContent {
                        gap: 8px;
                    }

                    .kpiCard.compactDesktop .kpiTitle {
                        font-size: 14px;
                        line-height: 1.25;
                    }

                    .kpiCard.compactDesktop .kpiStatus {
                        font-size: 12px;
                    }

                    .kpiCard.compactDesktop .kpiValue {
                        font-size: 30px;
                    }

                    .kpiCard.compactDesktop .kpiChevron {
                        padding-top: 5px;
                        font-size: 22px;
                    }
                }

                @media (max-width: 680px) {
                    .kpiCard {
                        min-height: 76px;
                        padding: 12px;
                        grid-template-columns: auto minmax(0, 1fr) auto auto;
                        grid-template-rows: auto;
                        align-items: center;
                        gap: 10px;
                    }

                    .kpiIconWrap {
                        width: 38px;
                        height: 38px;
                        border-radius: ${MR_THEME.radius.control}px;
                    }

                    .kpiContent {
                        grid-column: auto;
                        align-self: center;
                        gap: 3px;
                        min-width: 0;
                    }

                    .kpiTitle {
                        font-size: 14px;
                        line-height: 1.25;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .kpiStatus {
                        font-size: 12px;
                    }

                    .kpiValue {
                        grid-column: auto;
                        font-size: 28px;
                        line-height: 1;
                        white-space: nowrap;
                    }

                    .kpiChevron {
                        grid-column: auto;
                        grid-row: auto;
                        padding-top: 0;
                        font-size: 22px;
                    }
                }
            `}</style>
        </>
    );
}
