"use client";

import type { WOFilter } from "../../../../hooks/useUrlWoFilter";

type Props = {
    woFilter: WOFilter;
    setWoFilterAndUrl: (f: WOFilter) => void;
    isAdminOrOwner: boolean;
    showNewWO: boolean;
    onToggleNewWO: () => void;
    onRefresh: () => void;
    onGoControlCenter: () => void;
};

function FilterBtn({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                cursor: "pointer",
                background: active ? "#111" : "#fff",
                color: active ? "#fff" : "#111",
                fontWeight: 650,
            }}
        >
            {label}
        </button>
    );
}

export default function WorkOrdersToolbar({
    woFilter,
    setWoFilterAndUrl,
    isAdminOrOwner,
    showNewWO,
    onToggleNewWO,
    onRefresh,
    onGoControlCenter,
}: Props) {
    return (
        <div
            style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 12,
            }}
        >
            <FilterBtn
                active={woFilter === "all"}
                label="Todas"
                onClick={() => setWoFilterAndUrl("all")}
            />
            <FilterBtn
                active={woFilter === "mine"}
                label="Mis órdenes"
                onClick={() => setWoFilterAndUrl("mine")}
            />
            <FilterBtn
                active={woFilter === "unassigned"}
                label="Sin asignar"
                onClick={() => setWoFilterAndUrl("unassigned")}
            />
            <FilterBtn
                active={woFilter === "delayed"}
                label="Delayed"
                onClick={() => setWoFilterAndUrl("delayed")}
            />
            <FilterBtn
                active={woFilter === "ready_to_invoice"}
                label="Ready to invoice"
                onClick={() => setWoFilterAndUrl("ready_to_invoice")}
            />

            {isAdminOrOwner ? (
                <button
                    onClick={onToggleNewWO}
                    style={{
                        marginLeft: "auto",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #111",
                        cursor: "pointer",
                        background: "#111",
                        color: "white",
                        fontWeight: 800,
                    }}
                >
                    {showNewWO ? "Cerrar" : "+ Nueva orden"}
                </button>
            ) : (
                <div style={{ marginLeft: "auto" }} />
            )}

            <button
                onClick={onRefresh}
                style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    cursor: "pointer",
                    background: "#fff",
                    fontWeight: 650,
                }}
            >
                Refresh
            </button>

            <button
                onClick={onGoControlCenter}
                style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    cursor: "pointer",
                    background: "#fff",
                    fontWeight: 650,
                }}
            >
                Control Center →
            </button>
        </div>
    );
}