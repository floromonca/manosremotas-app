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
                <b>Operación:</b>{" "}
                {shiftLoading ? (
                    <span style={{ opacity: 0.75 }}>validando jornada…</span>
                ) : canOperate ? (
                    <span>Jornada activa ✅ Puedes operar órdenes.</span>
                ) : (
                    <span>
                        Jornada cerrada ⚠️ Para cambiar estados, comentar o facturar debes hacer{" "}
                        <b>Check-in</b> en <b>Control Center</b>.
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
                    Refresh jornada
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
                        Ir a Check-in →
                    </button>
                ) : null}
            </div>
        </div>
    );
}