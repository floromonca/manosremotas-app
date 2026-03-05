"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import { useAuthState } from "../../../hooks/useAuthState";
import { useRouter } from "next/navigation";



type MemberRow = {
    company_id: string;
    user_id: string;
    role: string;
    created_at?: string;
    profiles?: { full_name?: string | null; email?: string | null } | null;
};

type InviteRow = {
    invite_id: string;
    company_id: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    accepted_at: string | null;
};

export default function TeamPage() {
    const { user, authLoading } = useAuthState();
    const { companyId, myRole } = useActiveCompany();

    const [members, setMembers] = useState<MemberRow[]>([]);
    const [invites, setInvites] = useState<InviteRow[]>([]);
    const [loading, setLoading] = useState(false);

    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("tech");
    const [err, setErr] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);
    // ...dentro del componente:
    const router = useRouter();

    const refresh = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);
        setErr(null);
        setOk(null);

        try {
            // 1) Members (SIN join)
            const { data: memRows, error: memErr } = await supabase
                .from("company_members")
                .select("company_id, user_id, role, created_at")
                .eq("company_id", companyId)
                .order("created_at", { ascending: true });

            if (memErr) throw memErr;

            const membersOnly = (memRows ?? []) as any[];

            // 2) Profiles (otra query) y hacemos merge
            const ids = membersOnly.map((m) => m.user_id).filter(Boolean);

            let profilesMap = new Map<string, any>();

            if (ids.length > 0) {
                const { data: profRows, error: profErr } = await supabase
                    .from("profiles")
                    .select("user_id, full_name")
                    .in("user_id", ids);

                if (profErr) throw profErr;

                profilesMap = new Map((profRows ?? []).map((p: any) => [p.user_id, p]));
            }

            const merged = membersOnly.map((m) => ({
                ...m,
                profiles: profilesMap.get(m.user_id) ?? null,
            }));

            setMembers(merged as MemberRow[]);

            // 3) Invites
            const { data: inv, error: invErr } = await supabase
                .from("company_invites")
                .select("invite_id, company_id, email, role, status, created_at, accepted_at")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false });

            if (invErr) throw invErr;
            setInvites((inv ?? []) as any as InviteRow[]);
        } catch (e: any) {
            setErr(e?.message ?? "Error cargando Team");
        } finally {
            setLoading(false);
        }
    }, [companyId]);
    useEffect(() => {
        if (authLoading) return;
        if (!user) return;
        if (!companyId) return;
        refresh();
    }, [authLoading, user, companyId, refresh]);

    const pendingInvites = useMemo(
        () => invites.filter((i) => i.status === "pending"),
        [invites]
    );

    const createInvite = useCallback(async () => {
        if (!companyId) return;

        setErr(null);
        setOk(null);

        const email = inviteEmail.trim().toLowerCase();
        if (!email || !email.includes("@")) {
            setErr("Email inválido");
            return;
        }

        try {
            const { error } = await supabase.from("company_invites").insert({
                company_id: companyId,
                email,
                role: inviteRole,
                status: "pending",
            });

            if (error) throw error;

            setInviteEmail("");
            setInviteRole("tech");
            setOk("Invite creado (pending). El técnico debe registrarse con ese email.");
            await refresh();
        } catch (e: any) {
            setErr(e?.message ?? "No se pudo crear invite");
        }
    }, [companyId, inviteEmail, inviteRole, refresh]);

    // ✅ Loading auth
    if (authLoading) {
        return (
            <div style={{ padding: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900 }}>Team</h2>
                <p>Cargando sesión...</p>
            </div>
        );
    }

    // ✅ Not logged in
    if (!user) {
        return (
            <div style={{ padding: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900 }}>Team</h2>
                <p>Debes iniciar sesión.</p>
            </div>
        );
    }

    // ✅ Guard de permisos (solo owner/admin)
    if (myRole !== "owner" && myRole !== "admin") {
        return (
            <div style={{ padding: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900 }}>Team</h2>
                <p>No tienes permisos para ver esta sección.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ marginBottom: 12 }}>
                <button
                    type="button"
                    onClick={() => router.replace("/control-center")}
                    style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "white",
                        cursor: "pointer",
                        fontWeight: 800,
                    }}
                >
                    ← Volver a Control Center
                </button>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                }}
            >
                <h2 style={{ fontSize: 22, fontWeight: 900 }}>Team</h2>
                <button
                    type="button"
                    onClick={refresh}
                    style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "white",
                        cursor: "pointer",
                        fontWeight: 800,
                    }}
                >
                    {loading ? "Cargando..." : "Refresh"}
                </button>
            </div>

            {!companyId ? (
                <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
                    <b>No hay empresa activa.</b>
                    <div style={{ marginTop: 6, color: "#666" }}>Selecciona una empresa (companyId).</div>
                </div>
            ) : null}

            {err ? (
                <div
                    style={{
                        marginTop: 12,
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid #f3c2c2",
                        background: "#fff5f5",
                    }}
                >
                    <b>Error:</b> {err}
                </div>
            ) : null}

            {ok ? (
                <div
                    style={{
                        marginTop: 12,
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid #bfe6bf",
                        background: "#f3fff3",
                    }}
                >
                    {ok}
                </div>
            ) : null}

            {/* Members */}
            <div style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Members</h3>
                    <div style={{ color: "#666", fontSize: 12 }}>{members.length} total</div>
                </div>

                <div style={{ marginTop: 10, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ textAlign: "left" }}>
                                <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Name</th>
                                <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Role</th>
                                <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Created</th>
                            </tr>
                        </thead>

                        <tbody>
                            {members.map((m) => (
                                <tr key={m.user_id}>
                                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                                        {(m as any)?.profiles?.full_name
                                            ?? (m.user_id ? m.user_id.slice(0, 8) : "—")}
                                    </td>

                                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3", fontWeight: 800 }}>
                                        {m.role}
                                    </td>

                                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3", color: "#666" }}>
                                        {m.created_at ? new Date(m.created_at).toLocaleString() : "—"}
                                    </td>
                                </tr>
                            ))}

                            {members.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ padding: 10, color: "#666" }}>
                                        No hay miembros.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>                </div>
            </div>

            {/* Invite */}
            <div style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Invite new member</h3>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 160px 140px", gap: 10 }}>
                    <input
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="email@domain.com"
                        style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                    />

                    <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}
                    >
                        <option value="tech">tech</option>
                        <option value="admin">admin</option>
                    </select>

                    <button
                        type="button"
                        onClick={createInvite}
                        style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid #111",
                            background: "#111",
                            color: "white",
                            cursor: "pointer",
                            fontWeight: 900,
                        }}
                    >
                        Invite
                    </button>
                </div>

                <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
                    MVP: el técnico debe registrarse con ese mismo email para que el sistema lo vincule.
                </div>
            </div>

            {/* Pending invites */}
            <div style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Pending invites</h3>
                    <div style={{ color: "#666", fontSize: 12 }}>{pendingInvites.length} pending</div>
                </div>

                <div style={{ marginTop: 10, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ textAlign: "left" }}>
                                <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Email</th>
                                <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Role</th>
                                <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Status</th>
                                <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingInvites.map((i) => (
                                <tr key={i.invite_id}>
                                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>{i.email}</td>
                                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>{i.role}</td>
                                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3", fontWeight: 800 }}>
                                        {i.status}
                                    </td>
                                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3", color: "#666" }}>
                                        {new Date(i.created_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))}

                            {pendingInvites.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: 10, color: "#666" }}>
                                        No hay invites pendientes.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}