"use client";

import { MR_THEME } from "@/lib/theme";

type Props = {
    shiftLoading: boolean;
    canOperate: boolean;
    onRefreshShift: () => void;
    onGoCheckIn: () => void;
};

export default function OperationalShiftBanner({
    shiftLoading,
    canOperate,
    onRefreshShift,
    onGoCheckIn,
}: Props) {
    return (
        <div
            style={{
                marginBottom: 18,
                padding: "12px 14px",
                borderRadius: MR_THEME.radius.card,
                border: `1px solid ${canOperate ? "#bbf7d0" : "#fed7aa"}`,
                background: canOperate ? "#ecfdf5" : "#fff7ed",
                color: canOperate ? "#14532d" : "#9a3412",
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.45,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                boxShadow: MR_THEME.shadows.cardSoft,
            }}
        >
            <div>
                <b style={{ color: canOperate ? "#052e16" : "#7c2d12" }}>Shift:</b>{" "}
                {shiftLoading ? (
                    <span style={{ color: MR_THEME.colors.textSecondary }}>Checking shift…</span>
                ) : canOperate ? (
                    <span>Shift active ✅ You can work on assigned orders.</span>
                ) : (
                    <span>
                        Shift closed ⚠️ To change status or continue operating, complete your{" "}
                        <b>check-in</b>.
                    </span>
                )}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                    onClick={onRefreshShift}
                    style={{
                        padding: "8px 12px",
                        borderRadius: MR_THEME.radius.control,
                        border: `1px solid ${canOperate ? "#86efac" : "#fdba74"}`,
                        background: MR_THEME.colors.cardBg,
                        color: canOperate ? "#166534" : "#9a3412",
                        cursor: "pointer",
                        fontWeight: 800,
                        boxShadow: MR_THEME.shadows.cardSoft,
                    }}
                >
                    Refresh shift
                </button>

                {!canOperate ? (
                    <button
                        onClick={onGoCheckIn}
                        style={{
                            padding: "8px 12px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.textPrimary}`,
                            background: MR_THEME.colors.textPrimary,
                            color: MR_THEME.colors.cardBg,
                            cursor: "pointer",
                            fontWeight: 800,
                            boxShadow: MR_THEME.shadows.cardSoft,
                        }}
                    >
                        Go to check-in →
                    </button>
                ) : null}
            </div>
        </div>
    );
}