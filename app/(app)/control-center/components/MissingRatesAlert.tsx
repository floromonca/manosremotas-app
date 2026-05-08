"use client";

import React from "react";
import { MR_THEME } from "../../../../lib/theme";

type MissingRateAlert = {
    user_id: string;
    full_name: string;
    role: string;
};

type MissingRatesAlertProps = {
    missingRates: MissingRateAlert[];
    onOpenTechnician: (userId: string) => void;
};

export default function MissingRatesAlert({
    missingRates,
    onOpenTechnician,
}: MissingRatesAlertProps) {
    if (missingRates.length === 0) return null;

    return (
        <section
            style={{
                border: `1px solid ${MR_THEME.colors.warning}`,
                borderRadius: MR_THEME.radius.card,
                background: "#fffbeb",
                padding: "12px 14px",
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0, 1fr) auto",
                    gap: 10,
                    alignItems: "center",
                }}
            >
                <span
                    aria-hidden="true"
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        background: MR_THEME.colors.warning + "18",
                        color: MR_THEME.colors.warning,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        fontWeight: 900,
                    }}
                >
                    !
                </span>

                <div style={{ minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 850,
                            color: "#92400e",
                            lineHeight: 1.3,
                        }}
                    >
                        {missingRates.length} technician{missingRates.length === 1 ? "" : "s"} without hourly rate
                    </div>

                    <div
                        style={{
                            marginTop: 2,
                            fontSize: 13,
                            color: "#78350f",
                            lineHeight: 1.35,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Configure rates before payroll or job costing.
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        justifyContent: "flex-end",
                        flexWrap: "wrap",
                    }}
                >
                    {missingRates.slice(0, 2).map((tech) => (
                        <button
                            key={tech.user_id}
                            type="button"
                            onClick={() => onOpenTechnician(tech.user_id)}
                            style={{
                                border: "none",
                                background: "transparent",
                                padding: 0,
                                margin: 0,
                                color: "#92400e",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 800,
                                textDecoration: "underline",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {tech.full_name || "Unnamed technician"}
                        </button>
                    ))}

                    {missingRates.length > 2 ? (
                        <span
                            style={{
                                fontSize: 12,
                                color: "#78350f",
                                fontWeight: 800,
                                whiteSpace: "nowrap",
                            }}
                        >
                            +{missingRates.length - 2} more
                        </span>
                    ) : null}
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 760px) {
                    section > div {
                        grid-template-columns: auto minmax(0, 1fr) !important;
                    }

                    section > div > div:last-child {
                        grid-column: 1 / -1;
                        justify-content: flex-start !important;
                    }
                }
            `}</style>
        </section>
    );
}
