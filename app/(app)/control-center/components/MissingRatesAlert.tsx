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
                padding: 18,
                marginBottom: 20,
            }}
        >
            <div
                style={{
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: "#92400e",
                }}
            >
                ⚠ {missingRates.length} technicians without hourly rate
            </div>

            <div
                style={{
                    fontSize: 14,
                    color: "#78350f",
                    marginBottom: 10,
                }}
            >
                These technicians do not have an hourly rate configured.
            </div>

            <ul style={{ margin: 0, paddingLeft: 18 }}>
                {missingRates.slice(0, 5).map((tech) => (
                    <li key={tech.user_id} style={{ marginBottom: 6 }}>
                        <button
                            type="button"
                            onClick={() => onOpenTechnician(tech.user_id)}
                            style={{
                                border: "none",
                                background: "transparent",
                                padding: 0,
                                margin: 0,
                                color: "#92400e",
                                cursor: "pointer",
                                fontSize: 14,
                                fontWeight: 600,
                                textDecoration: "underline",
                            }}
                        >
                            {tech.full_name || "Unnamed technician"}
                        </button>
                    </li>
                ))}
            </ul>

            {missingRates.length > 5 ? (
                <div
                    style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: "#78350f",
                        fontWeight: 600,
                    }}
                >
                    + {missingRates.length - 5} more technicians
                </div>
            ) : null}
        </section>
    );
}