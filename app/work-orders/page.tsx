"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setWorkOrderAssignee } from "../../lib/supabase/workOrders";
import { supabase } from "../../lib/supabaseClient";

import { useAuthState } from "../../hooks/useAuthState";
import { useActiveCompany } from "../../hooks/useActiveCompany";
import { useUrlWoFilter, type WOFilter } from "../../hooks/useUrlWoFilter";

import {
    fetchWorkOrders,
    safeStatus,
    setWorkOrderStatus,
    type WorkOrderStatus,
} from "../../lib/supabase/workOrders";


// ✅ BLOQUEO OPERATIVO (Jornada)
import { getOpenShift } from "../../lib/supabase/shifts";

type WorkOrder = {
    work_order_id: string;
    company_id?: string | null;
    job_type: string;
    description: string;
    status: "new" | "in_progress" | "resolved" | "closed";
    priority: string;
    scheduled_for: string | null;
    created_at: string;
    assigned_to?: string | null;
    created_by?: string | null;
};

export default function WorkOrdersPage() {
    const router = useRouter();

    const { user, authLoading } = useAuthState();

    // ✅ Auth UI (Sign in / Sign up)
    const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
    const [authEmail, setAuthEmail] = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [authMsg, setAuthMsg] = useState<string>("");
    const [authBusy, setAuthBusy] = useState(false);

    const doAuth = useCallback(async () => {
        setAuthMsg("");
        setAuthBusy(true);
        try {
            if (!authEmail || !authPassword) {
                setAuthMsg("Please enter email and password.");
                return;
            }

            if (authMode === "signin") {
                const { error } = await supabase.auth.signInWithPassword({
                    email: authEmail,
                    password: authPassword,
                });
                if (error) {
                    setAuthMsg(error.message);
                    return;
                }
                setAuthMsg("Signed in ✅");
                return;
            }

            const { error } = await supabase.auth.signUp({
                email: authEmail,
                password: authPassword,
            });
            if (error) {
                setAuthMsg(error.message);
                return;
            }

            setAuthMsg(
                "Account created ✅ If email confirmation is enabled, check your inbox to verify.",
            );
        } finally {
            setAuthBusy(false);
        }
    }, [authEmail, authPassword, authMode]);

    const { companyId, companyName, isLoadingCompany } = useActiveCompany();
    const { woFilter, setWoFilterAndUrl } = useUrlWoFilter();

    const [rows, setRows] = useState<WorkOrder[]>([]);
    const [loadingWO, setLoadingWO] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");


    // ✅ Rol del usuario en la compañía (owner/admin/tech/viewer)
    const [myRole, setMyRole] = useState<
        "owner" | "admin" | "tech" | "viewer" | null
    >(null);

    type MemberRow = { user_id: string; role: string };

    const [members, setMembers] = useState<MemberRow[]>([]);
    const techMembers = members.filter((m) => m.role === "tech");
    const [membersLoading, setMembersLoading] = useState(false);

    const isAdminOrOwner = myRole === "admin" || myRole === "owner";

    // ✅ BLOQUEO OPERATIVO: Jornada detectada aquí
    const [openShiftId, setOpenShiftId] = useState<string | null>(null);
    const [shiftLoading, setShiftLoading] = useState(false);

    const canOperate = !!openShiftId;

    const refreshShift = useCallback(async (cid: string) => {
        setShiftLoading(true);
        try {
            const { data, error } = await getOpenShift(cid);
            if (error) throw error;
            setOpenShiftId((data as any)?.shift_id ?? null);
        } catch (e: any) {
            // Si hay RLS o no hay shift abierto, simplemente queda null
            setOpenShiftId(null);
        } finally {
            setShiftLoading(false);
        }
    }, []);

    const loadOrders = useCallback(async (cid: string) => {
        setLoadingWO(true);
        setErrorMessage("");

        try {
            const { data, error } = await fetchWorkOrders(cid);

            if (error) {
                setErrorMessage(error.message);
                setRows([]);
                return;
            }

            const mapped = (data ?? []).map((r: any) => ({
                ...r,
                status: safeStatus(r.status),
            })) as WorkOrder[];

            setRows(mapped);
        } catch (e: any) {
            setErrorMessage(e?.message ?? "Error al cargar datos de Supabase");
            setRows([]);
        } finally {
            setLoadingWO(false);
        }
    }, []);

    const refreshMyRole = useCallback(async (cid: string) => {
        try {
            const { data: u, error: uErr } = await supabase.auth.getUser();
            if (uErr) throw uErr;

            const uid = u.user?.id;
            if (!uid) {
                setMyRole(null);
                return;
            }

            const { data, error } = await supabase
                .from("company_members")
                .select("role")
                .eq("company_id", cid)
                .eq("user_id", uid)
                .maybeSingle();

            if (error) throw error;

            setMyRole((data?.role as any) ?? null);
        } catch (e) {
            setMyRole(null);
        }
    }, []);

    const refreshMembers = useCallback(async (cid: string) => {
        setMembersLoading(true);
        try {
            const { data, error } = await supabase
                .from("company_members")
                .select("user_id, role")
                .eq("company_id", cid);

            if (error) throw error;

            setMembers((data as any) ?? []);
        } catch (e: any) {
            console.log("refreshMembers ERROR:", e?.message ?? e);
            setMembers([]);
        } finally {
            setMembersLoading(false);
        }
    }, []);
    const signOut = useCallback(async () => {
        try {
            await supabase.auth.signOut();
            localStorage.removeItem("activeCompanyId");
            router.replace("/work-orders"); // vuelve al login UI
        } catch (e: any) {
            console.log("signOut error:", e);
        }
    }, [router]);

    // ✅ Carga órdenes SOLO cuando hay user + companyId (evita ruido cuando no estás logueado)
    useEffect(() => {
        if (!user) return;
        if (!companyId) return;

        loadOrders(companyId);
    }, [companyId, loadOrders, user]);

    // ✅ Carga jornada abierta SOLO cuando hay user + companyId
    useEffect(() => {
        if (!user) return;
        if (!companyId) return;

        refreshShift(companyId);
    }, [companyId, refreshShift, user]);

    useEffect(() => {
        if (!user) return;
        if (!companyId) return;

        refreshMyRole(companyId);
    }, [companyId, refreshMyRole, user]);

    useEffect(() => {
        if (!user) return;
        if (!companyId) return;

        refreshMembers(companyId);
    }, [companyId, refreshMembers, user]);

    const filtered = useMemo(() => {
        const now = Date.now();
        const myUserId = user?.id ?? null;

        const isDelayed = (w: WorkOrder) => {
            if (w.status !== "in_progress") return false;
            const created = w.created_at ? new Date(w.created_at).getTime() : now;
            const days = (now - created) / (1000 * 60 * 60 * 24);
            return days > 3;
        };

        const isReadyToInvoice = (w: WorkOrder) =>
            w.status === "resolved" || w.status === "closed";

        switch (woFilter) {
            case "mine":
                return rows.filter((w) => myUserId && w.assigned_to === myUserId);
            case "unassigned":
                return rows.filter((w) => !w.assigned_to);
            case "delayed":
                return rows.filter(isDelayed);
            case "ready_to_invoice":
                return rows.filter(isReadyToInvoice);
            default:
                return rows;
        }
    }, [rows, user?.id, woFilter]);

    // ✅ Permiso para cambiar status (UI). La DB igual valida con RLS + triggers.
    const canChangeStatus = (wo: WorkOrder) => {
        if (!user?.id) return false;

        // Owner/Admin: permitido (sin depender del shift)
        if (isAdminOrOwner) return true;

        // Tech: solo si está asignado a él y tiene jornada activa
        if (myRole === "tech") {
            return canOperate && wo.assigned_to === user.id;
        }

        // Viewer u otros: no
        return false;
    };

    const FilterBtn = ({ f, label }: { f: WOFilter; label: string }) => (
        <button
            onClick={() => setWoFilterAndUrl(f)}
            style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                cursor: "pointer",
                background: woFilter === f ? "#111" : "#fff",
                color: woFilter === f ? "#fff" : "#111",
                fontWeight: 650,
            }}
        >
            {label}
        </button>
    );

    // ✅ Login UI embebido (visible)
    const AuthBox = (
        <div
            style={{
                maxWidth: 420,
                margin: "30px auto 0",
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 16,
                background: "white",
            }}
        >
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button
                    type="button"
                    onClick={() => {
                        setAuthMode("signin");
                        setAuthMsg("");
                    }}
                    style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: authMode === "signin" ? "2px solid #111" : "1px solid #ddd",
                        background: "white",
                        cursor: "pointer",
                        fontWeight: 700,
                    }}
                >
                    Sign in
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setAuthMode("signup");
                        setAuthMsg("");
                    }}
                    style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: authMode === "signup" ? "2px solid #111" : "1px solid #ddd",
                        background: "white",
                        cursor: "pointer",
                        fontWeight: 700,
                    }}
                >
                    Sign up
                </button>
            </div>

            <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 16 }}>
                {authMode === "signin" ? "Sign in" : "Create account"}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>Email</span>
                    <input
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="you@email.com"
                        autoComplete="email"
                        style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>Password</span>
                    <input
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        type="password"
                        autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                        style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
                    />
                </label>

                <button
                    type="button"
                    onClick={doAuth}
                    disabled={authBusy}
                    style={{
                        padding: 10,
                        borderRadius: 8,
                        border: "1px solid #111",
                        background: "#111",
                        color: "white",
                        cursor: "pointer",
                        opacity: authBusy ? 0.7 : 1,
                        fontWeight: 800,
                    }}
                >
                    {authBusy ? "Working..." : authMode === "signin" ? "Sign in" : "Sign up"}
                </button>

                {authMsg ? (
                    <div style={{ fontSize: 12, opacity: 0.9, whiteSpace: "pre-wrap" }}>
                        {authMsg}
                    </div>
                ) : null}
            </div>

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
                Tip: si Supabase tiene <b>email confirmation</b> activo, debes confirmar el
                correo para entrar.
            </div>
        </div>
    );

    return (
        <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
            {/* ✅ Header: cambia según si hay sesión */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    border: "1px solid #eee",
                    borderRadius: 12,
                    background: "white",
                    marginBottom: 18,
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>Empresa</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                        {user ? companyName || "—" : "—"}
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, opacity: 0.7 }}>Usuario</div>
                        <div style={{ fontSize: 13, fontFamily: "monospace" }}>
                            {user?.email ?? (user?.id ? user.id.slice(0, 8) : "—")}
                        </div>
                    </div>

                    {user ? (
                        <button
                            onClick={signOut}
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: "white",
                                cursor: "pointer",
                                fontWeight: 800,
                            }}
                        >
                            Sign out
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Estados de carga */}
            {authLoading ? (
                <div style={{ padding: 30, textAlign: "center", opacity: 0.75 }}>
                    Cargando…
                </div>
            ) : !user ? (
                // ✅ No logueado → Sign in / Sign up visible
                AuthBox
            ) : isLoadingCompany ? (
                <div style={{ padding: 30, textAlign: "center", opacity: 0.75 }}>
                    Cargando empresa…
                </div>
            ) : !companyId ? (
                <div
                    style={{
                        padding: 30,
                        border: "1px solid #eee",
                        borderRadius: 12,
                        background: "white",
                    }}
                >
                    <div style={{ color: "crimson", fontWeight: 800, marginBottom: 10 }}>
                        No se encontró una empresa activa para tu usuario.
                    </div>

                    <div style={{ opacity: 0.8, marginBottom: 14 }}>
                        Esto pasa cuando el usuario no tiene membresía (company_members) o cuando
                        el activeCompanyId guardado no es válido.
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                            onClick={() => {
                                localStorage.removeItem("activeCompanyId");
                                location.reload();
                            }}
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: "white",
                                cursor: "pointer",
                                fontWeight: 700,
                            }}
                        >
                            Limpiar empresa guardada
                        </button>

                        <button
                            onClick={async () => {
                                try {
                                    alert(
                                        "Aquí va el bootstrap: crear company + company_members y set activeCompanyId.",
                                    );
                                } catch (e: any) {
                                    alert(e?.message ?? "Error creando empresa");
                                }
                            }}
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid #111",
                                background: "#111",
                                color: "white",
                                cursor: "pointer",
                                fontWeight: 800,
                            }}
                        >
                            Crear mi empresa
                        </button>

                        <button
                            onClick={() => router.replace("/control-center")}
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: "white",
                                cursor: "pointer",
                                fontWeight: 700,
                            }}
                        >
                            Ir a Control Center →
                        </button>
                    </div>

                    <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
                        Debug: activeCompanyId ={" "}
                        <b>
                            {typeof window !== "undefined"
                                ? localStorage.getItem("activeCompanyId") ?? "null"
                                : "n/a"}
                        </b>
                    </div>
                </div>
            ) : (
                <>
                    <header style={{ marginBottom: 18 }}>
                        <h1 style={{ margin: 0, fontSize: 28 }}>
                            {companyName} — Work Orders
                        </h1>
                        <div style={{ opacity: 0.7, marginTop: 6 }}>
                            Mostrando: <b>{filtered.length}</b> · Total: <b>{rows.length}</b> ·
                            Filter: <b>{woFilter}</b> · myUserId:{" "}
                            <b>{user?.id ? user.id.slice(0, 8) : "null"}</b> · myRole:{" "}
                            <b>{myRole ?? "null"}</b> · canOperate: <b>{canOperate ? "true" : "false"}</b>{" "}
                            · openShiftId: <b>{openShiftId ? openShiftId.slice(0, 8) : "null"}</b>
                            · members: <b>{membersLoading ? "loading..." : members.length}</b>
                        </div>
                    </header>

                    {/* filtros */}
                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            marginBottom: 12,
                        }}
                    >
                        <FilterBtn f="all" label="Todas" />
                        <FilterBtn f="mine" label="Mis órdenes" />
                        <FilterBtn f="unassigned" label="Sin asignar" />
                        <FilterBtn f="delayed" label="Delayed" />
                        <FilterBtn f="ready_to_invoice" label="Ready to invoice" />

                        <button
                            onClick={() => companyId && loadOrders(companyId)}
                            style={{
                                marginLeft: "auto",
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
                            onClick={() => router.replace("/control-center")}
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

                    {/* ✅ BLOQUEO OPERATIVO: Banner (Jornada) */}
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
                                onClick={() => companyId && refreshShift(companyId)}
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
                                    onClick={() => router.replace("/control-center")}
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

                    {errorMessage ? (
                        <div
                            style={{
                                background: "#fff5f5",
                                border: "1px solid #f3caca",
                                color: "#a40000",
                                padding: 12,
                                borderRadius: 10,
                                marginBottom: 14,
                            }}
                        >
                            <b>Error:</b> {errorMessage}
                        </div>
                    ) : null}

                    {loadingWO ? (
                        <div style={{ opacity: 0.7 }}>Cargando órdenes…</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ opacity: 0.6 }}>No hay órdenes que mostrar.</div>
                    ) : (
                        <div
                            style={{ display: "grid", gap: 12 }}>
                            {filtered.map((wo) => (
                                <div
                                    key={wo.work_order_id}
                                    style={{
                                        padding: 14,
                                        border: "1px solid #eee",
                                        borderRadius: 12,
                                        background: "white",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 14,
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{wo.job_type}</div>

                                        <div style={{ opacity: 0.7, marginTop: 4 }}>{wo.description}</div>

                                        <div
                                            style={{
                                                opacity: 0.6,
                                                fontFamily: "monospace",
                                                marginTop: 6,
                                            }}
                                        >
                                            {wo.work_order_id.slice(0, 8)} · assigned_to:{" "}
                                            {(wo.assigned_to ?? "—").slice(0, 8)}
                                        </div>

                                        {/* ✅ Botón Asignarme (solo si está sin asignar) */}
                                        {/* ✅ Asignación v1.0: solo owner/admin puede asignar */}
                                        {!wo.assigned_to && isAdminOrOwner && (
                                            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                                                <label style={{ fontSize: 12, opacity: 0.7 }}>
                                                    Asignar a técnico
                                                </label>

                                                <select
                                                    defaultValue=""
                                                    onChange={async (e) => {
                                                        const techId = e.target.value;
                                                        if (!techId) return;

                                                        if (!companyId) {
                                                            alert("No hay empresa activa");
                                                            return;
                                                        }

                                                        const { error } = await setWorkOrderAssignee(
                                                            wo.work_order_id,
                                                            techId
                                                        );

                                                        if (error) {
                                                            alert("No se pudo asignar: " + error.message);
                                                            return;
                                                        }

                                                        await loadOrders(companyId);
                                                    }}
                                                    style={{
                                                        padding: "6px 8px",
                                                        borderRadius: 8,
                                                        border: "1px solid #ddd",
                                                        fontSize: 12,
                                                    }}
                                                >
                                                    <option value="">Seleccionar tech...</option>
                                                    {techMembers.map((m) => (
                                                        <option key={m.user_id} value={m.user_id}>
                                                            {m.user_id.slice(0, 8)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                                        {/* pill */}
                                        <div
                                            style={{
                                                alignSelf: "flex-start",
                                                padding: "4px 10px",
                                                borderRadius: 999,
                                                border: "1px solid #ddd",
                                                background: "#f7f7f7",
                                                fontSize: 12,
                                                fontWeight: 700,
                                            }}
                                        >
                                            {wo.status}
                                        </div>

                                        {/* selector */}
                                        <label style={{ fontSize: 12, opacity: 0.8 }}>Cambiar status</label>

                                        <select
                                            value={wo.status}
                                            disabled={!canChangeStatus(wo)}
                                            onChange={async (e) => {
                                                const next = e.target.value as WorkOrderStatus;

                                                if (!companyId) {
                                                    alert("No hay companyId activo");
                                                    return;
                                                }

                                                if (!canChangeStatus(wo)) {
                                                    alert(
                                                        isAdminOrOwner
                                                            ? "No tienes permiso para cambiar esta orden."
                                                            : "Para cambiar status necesitas jornada activa y la orden asignada a ti.",
                                                    );
                                                    return;
                                                }

                                                const { error } = await setWorkOrderStatus(wo.work_order_id, next);

                                                if (error) {
                                                    alert("No se pudo cambiar status: " + error.message);
                                                    return;
                                                }

                                                await loadOrders(companyId);
                                            }}
                                            style={{
                                                padding: "8px 10px",
                                                borderRadius: 10,
                                                border: "1px solid #ddd",
                                                background: "white",
                                                fontWeight: 700,
                                                cursor: canChangeStatus(wo) ? "pointer" : "not-allowed",
                                                opacity: canChangeStatus(wo) ? 1 : 0.6,
                                                minWidth: 160,
                                            }}
                                        >
                                            <option value="new">new</option>
                                            <option value="in_progress">in_progress</option>
                                            <option value="resolved">resolved</option>
                                            <option value="closed">closed</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}