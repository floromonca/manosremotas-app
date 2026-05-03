"use client";

type AuditItem = {
    changed_at: string | null;
    changed_at_ui: string | null;
    changed_by_name: string | null;
    message: string | null;
};

type Props = {
    loading: boolean;
    items: AuditItem[];
};

export default function WorkOrderAuditPanel({ loading, items }: Props) {
    return (
        <div
            style={{
                marginTop: 10,
                padding: 10,
                border: "1px solid #eee",
                borderRadius: 12,
                background: "#fafafa",
                maxWidth: 420,
            }}
        >
            {loading ? (
                <div style={{ opacity: 0.7 }}>Loading history...</div>
            ) : items.length === 0 ? (
                <div style={{ opacity: 0.7 }}>Sin eventos de auditoría.</div>
            ) : (
                <div style={{ display: "grid", gap: 8 }}>
                    {items.map((it, idx) => (
                        <div
                            key={idx}
                            style={{
                                padding: 10,
                                border: "1px solid #eee",
                                borderRadius: 10,
                                background: "white",
                            }}
                        >
                            <div style={{ fontSize: 12, opacity: 0.75 }}>
                                <b>{it.changed_by_name ?? "—"}</b> ·{" "}
                                {it.changed_at_ui ?? it.changed_at ?? "—"}
                            </div>
                            <div style={{ marginTop: 4 }}>{it.message ?? "—"}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}