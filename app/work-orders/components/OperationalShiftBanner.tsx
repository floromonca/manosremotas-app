"use client";

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
                padding: 10,
                borderRadius: 10,
                border: "1px solid #eee",
                background: canOperate ? "#f0fff4" : "#fff7ed",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
            }}
        >
            <div>
                <b>Shift:</b>{" "}
                {shiftLoading ? (
                    <span style={{ opacity: 0.75 }}>Checking shift…</span>
                ) : canOperate ? (
                    <span>Shift active ✅ You can work on assigned orders.</span>
                ) : (
                    <span>
                        Shift closed ⚠️ To change status or continue operating, complete your{" "}
                        <b>check-in</b>.
                    </span>
                )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
                <button
                    onClick={onRefreshShift}
                    style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "white",
                        cursor: "pointer",
                        fontWeight: 700,
                    }}
                >
                    Refresh shift
                </button>

                {!canOperate ? (
                    <button
                        onClick={onGoCheckIn}
                        style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "1px solid #111",
                            background: "#111",
                            color: "white",
                            cursor: "pointer",
                            fontWeight: 800,
                        }}
                    >
                        Go to check-in →
                    </button>
                ) : null}
            </div>
        </div>
    );
}