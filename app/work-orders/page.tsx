"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setWorkOrderAssignee } from "../../lib/supabase/workOrders";
import { supabase } from "../../lib/supabaseClient";

import { useAuthState } from "../../hooks/useAuthState";
import { useActiveCompany } from "../../hooks/useActiveCompany";
import { useUrlWoFilter, type WOFilter } from "../../hooks/useUrlWoFilter";
import { createInvoiceFromWorkOrder } from "../../lib/invoices";
import { CompanyGuard } from "../components/CompanyGuard";
import WorkOrderAuditPanel from "./components/WorkOrderAuditPanel";



import {
    fetchWorkOrders,
    safeStatus,
    setWorkOrderStatus,
    insertWorkOrder,
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
    customer_name?: string | null;
    service_address?: string | null;
    invoice_id?: string | null;
    invoiced_at?: string | null;
};

type CustomerRow = {
    customer_id: string;
    company_id?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
};

type LocationRow = {
    location_id: string;
    company_id?: string | null;
    customer_id: string;
    label?: string | null;
    address: string;
};

export default function WorkOrdersPage() {
    const router = useRouter();

    const { user, authLoading } = useAuthState();
    console.log("🔥 WorkOrdersPage rendered", {
        userId: user?.id ?? null,
        authLoading,
    });

    // ✅ Auth UI (Sign in / Sign up)
    const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
    const [authEmail, setAuthEmail] = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [authMsg, setAuthMsg] = useState<string>("");
    const [authBusy, setAuthBusy] = useState(false);
    const auditChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const auditWoIdRef = useRef<string | null>(null);

    const [companyNameDraft, setCompanyNameDraft] = useState("");
    const [companyNameSaving, setCompanyNameSaving] = useState(false);
    const [companyNameMsg, setCompanyNameMsg] = useState<string | null>(null);



    // ✅ Guards para evitar re-suscripciones repetidas
    const woRtRef = useRef<string | null>(null);
    const auditRtRef = useRef<string | null>(null);

    const doAuth = useCallback(() => {
        router.replace("/auth");
    }, [router]);

    const { companyId, companyName, isLoadingCompany, refreshCompany } = useActiveCompany();



    const { woFilter, setWoFilterAndUrl } = useUrlWoFilter();

    const [rows, setRows] = useState<WorkOrder[]>([]);
    const [loadingWO, setLoadingWO] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    type AuditItem = {
        changed_at: string | null;
        changed_at_ui: string | null;
        changed_by_name: string | null;
        message: string | null;
    };

    const [auditOpenFor, setAuditOpenFor] = useState<string | null>(null);
    const [auditLoadingFor, setAuditLoadingFor] = useState<Record<string, boolean>>(
        {},
    );
    const [auditByWo, setAuditByWo] = useState<Record<string, AuditItem[]>>({});


    // ✅ Crear Work Order (UI)
    const [showNewWO, setShowNewWO] = useState(false);
    const [newJobType, setNewJobType] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newPriority, setNewPriority] = useState("medium");
    const [newScheduledFor, setNewScheduledFor] = useState<string>("");


    const [customers, setCustomers] = useState<CustomerRow[]>([]);
    const [locations, setLocations] = useState<LocationRow[]>([]);
    const [customersLoading, setCustomersLoading] = useState(false);
    const [locationsLoading, setLocationsLoading] = useState(false);

    const [newCustomerId, setNewCustomerId] = useState<string>("");
    const [newLocationId, setNewLocationId] = useState<string>("");

    const filteredLocations = useMemo<LocationRow[]>(() => {
        if (!newCustomerId) return [];
        return locations.filter((loc: LocationRow) => loc.customer_id === newCustomerId);
    }, [locations, newCustomerId]);




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


    const loadCustomers = useCallback(async (cid: string) => {
        setCustomersLoading(true);
        try {
            const { data, error } = await supabase
                .from("customers")
                .select("customer_id, company_id, name, email, phone")
                .eq("company_id", cid)
                .order("name", { ascending: true });

            console.log("loadCustomers", { cid, data, error });

            if (error) throw error;
            setCustomers((data ?? []) as CustomerRow[]);
        } catch (e) {
            console.error("Error cargando customers:", e);
            setCustomers([]);
        } finally {
            setCustomersLoading(false);
        }
    }, []);

    const loadLocations = useCallback(async (cid: string) => {
        setLocationsLoading(true);
        try {
            const { data, error } = await supabase
                .from("locations")
                .select("location_id, company_id, customer_id, label, address")
                .eq("company_id", cid)
                .order("created_at", { ascending: false });

            console.log("loadLocations", { cid, data, error });

            if (error) throw error;
            setLocations((data ?? []) as LocationRow[]);
        } catch (e) {
            console.error("Error cargando locations:", e);
            setLocations([]);
        } finally {
            setLocationsLoading(false);
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
        await supabase.auth.signOut();
        router.replace("/auth");
    }, [router]);

    const saveCompanyName = useCallback(async () => {
        if (!companyId) return;

        if (myRole !== "owner") {
            setCompanyNameMsg("Solo el owner puede cambiar el nombre.");
            return;
        }

        const nextName = (companyNameDraft || "").trim();
        console.log("DEBUG saveCompanyName", { companyId, myRole, nextName });
        if (!nextName) {
            setCompanyNameMsg("El nombre no puede quedar vacío.");
            return;
        }

        setCompanyNameSaving(true);
        setCompanyNameMsg(null);
        try {
            const { error } = await supabase
                .from("companies")
                .update({ company_name: nextName })
                .eq("company_id", companyId);

            if (error) throw error;

            setCompanyNameMsg("Nombre actualizado ✅");
            refreshCompany();

        } catch (e: any) {
            setCompanyNameMsg(e?.message ?? String(e));
        } finally {
            setCompanyNameSaving(false);
        }
    }, [companyId, myRole, companyNameDraft]);
    const allowedStatusesForRole = (
        role: string | null,
        current: WorkOrderStatus,
    ): WorkOrderStatus[] => {
        const all: WorkOrderStatus[] = ["new", "in_progress", "resolved", "closed"];

        // owner/admin: todo permitido (la DB sigue mandando igual)
        if (role === "owner" || role === "admin") return all;

        // tech: solo avanzar (nunca retroceder)
        // new -> in_progress -> resolved -> closed
        if (role === "tech") {
            if (current === "new") return ["new", "in_progress"];
            if (current === "in_progress") return ["in_progress", "resolved"];
            if (current === "resolved") return ["resolved", "closed"];
            return ["closed"];
        }

        // viewer u otros: no cambia
        return [current];
    };

    useEffect(() => {
        setCompanyNameDraft(companyName ?? "");
    }, [companyName]);

    // ✅ Carga órdenes SOLO cuando hay user + companyId (evita ruido cuando no estás logueado)
    useEffect(() => {
        if (!user) return;
        if (!companyId) {
            return;
        }

        loadOrders(companyId);
        loadCustomers(companyId);
        loadLocations(companyId);
    }, [companyId, loadOrders, loadCustomers, loadLocations, user]);

    // ✅ Realtime: Work Orders (UN SOLO canal por companyId, con guard anti Fast Refresh)
    useEffect(() => {
        if (!user) return;
        if (!companyId) return;

        // ✅ Si ya estamos suscritos a este companyId, no re-suscribir
        if (woRtRef.current === companyId) return;
        woRtRef.current = companyId;

        const channel = supabase
            .channel(`rt:work_orders:${companyId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "work_orders",
                    filter: `company_id=eq.${companyId}`,
                },
                async (payload) => {
                    console.log("[WO RT] INSERT:", payload);
                    await loadOrders(companyId);
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "work_orders",
                    filter: `company_id=eq.${companyId}`,
                },
                async (payload) => {
                    console.log("[WO RT] UPDATE:", payload);
                    await loadOrders(companyId);
                },
            )
            .subscribe((status) => {
                console.log("[WO RT] subscribe status:", status, "companyId:", companyId);
            });

        return () => {
            supabase.removeChannel(channel);

            // ✅ libera el guard si este cleanup corresponde al companyId actual
            if (woRtRef.current === companyId) woRtRef.current = null;
        };
    }, [user?.id, companyId, loadOrders]);
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

    const loadAuditTimeline = useCallback(async (workOrderId: string) => {
        setAuditLoadingFor((s) => ({ ...s, [workOrderId]: true }));
        try {
            const { data, error } = await supabase
                .from("v_work_order_audit_timeline")
                .select("changed_at, changed_at_ui, changed_by_name, message")
                .eq("work_order_id", workOrderId)
                .order("changed_at", { ascending: false });

            if (error) {
                alert("Error audit: " + error.message);
                return;
            }

            setAuditByWo((s) => ({
                ...s,
                [workOrderId]: (data ?? []) as AuditItem[],
            }));
        } finally {
            setAuditLoadingFor((s) => ({ ...s, [workOrderId]: false }));
        }
    }, []);


    useEffect(() => {
        if (!user?.id) return;
        if (!companyId) return;
        if (!auditOpenFor) return;

        const woId = auditOpenFor;

        // ✅ si ya estamos suscritos a este woId, no recrear el canal
        if (auditWoIdRef.current === woId && auditChannelRef.current) {
            return;
        }

        // ✅ si había un canal previo, cerrarlo antes de abrir uno nuevo
        if (auditChannelRef.current) {
            supabase.removeChannel(auditChannelRef.current);
            auditChannelRef.current = null;
        }

        auditWoIdRef.current = woId;

        const channel = supabase
            .channel(`audit:${woId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "work_order_audit",
                    filter: `work_order_id=eq.${woId}`,
                },
                async (payload) => {
                    console.log("[AUDIT RT] INSERT payload:", payload);
                    await loadAuditTimeline(woId);

                    // ✅ FIX HOY: si llega audit, refrescamos orders para que el pill/status cambie en Admin
                    if (companyId) {
                        await loadOrders(companyId);
                    }
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "work_order_audit",
                    filter: `work_order_id=eq.${woId}`,
                },
                async (payload) => {
                    console.log("[AUDIT RT] UPDATE payload:", payload);
                    await loadAuditTimeline(woId);

                    // ✅ FIX HOY
                    if (companyId) {
                        await loadOrders(companyId);
                    }
                },
            )
            .subscribe((status) => {
                console.log("[AUDIT RT] subscribe status:", status, "woId:", woId);
            });

        auditChannelRef.current = channel;

        return () => {
            // ✅ cleanup seguro: solo cierro si este cleanup corresponde al canal actual
            if (auditChannelRef.current === channel) {
                supabase.removeChannel(channel);
                auditChannelRef.current = null;
                auditWoIdRef.current = null;
            }
        };
    }, [auditOpenFor, companyId, user?.id, loadAuditTimeline, loadOrders]);
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
        <CompanyGuard>
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
                            {user ? (
                                myRole === "owner" ? (
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <input
                                            value={companyNameDraft}
                                            onChange={(e) => setCompanyNameDraft(e.target.value)}
                                            style={{
                                                fontSize: 18,
                                                fontWeight: 800,
                                                padding: "6px 10px",
                                                borderRadius: 10,
                                                border: "1px solid #ddd",
                                                width: 280,
                                            }}
                                        />
                                        <button
                                            onClick={saveCompanyName}
                                            disabled={companyNameSaving}
                                            style={{
                                                padding: "8px 12px",
                                                borderRadius: 10,
                                                border: "1px solid #ddd",
                                                background: "white",
                                                cursor: "pointer",
                                                fontWeight: 900,
                                                opacity: companyNameSaving ? 0.6 : 1,
                                            }}
                                        >
                                            {companyNameSaving ? "Guardando…" : "Save"}
                                        </button>
                                    </div>
                                ) : (
                                    companyName || "—"
                                )
                            ) : (
                                "—"
                            )}
                        </div>

                        {companyNameMsg ? (
                            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                                {companyNameMsg}
                            </div>
                        ) : null}
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

                            {/* ✅ + Nueva orden (solo owner/admin) */}
                            {isAdminOrOwner ? (
                                <button
                                    onClick={() => setShowNewWO((s) => !s)}
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
                                onClick={() => companyId && loadOrders(companyId)}
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

                        {isAdminOrOwner && showNewWO ? (
                            <div
                                style={{
                                    marginBottom: 14,
                                    padding: 12,
                                    border: "1px solid #eee",
                                    borderRadius: 12,
                                    background: "white",
                                }}
                            >
                                <div style={{ fontWeight: 900, marginBottom: 10 }}>Crear nueva orden</div>

                                <div style={{ display: "grid", gap: 10 }}>
                                    <label style={{ display: "grid", gap: 6 }}>
                                        <span style={{ fontSize: 12, opacity: 0.8 }}>Job type</span>
                                        <input
                                            value={newJobType}
                                            onChange={(e) => setNewJobType(e.target.value)}
                                            placeholder="Ej: Electrical troubleshooting"
                                            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
                                        />
                                    </label>

                                    <label style={{ display: "grid", gap: 6 }}>
                                        <span style={{ fontSize: 12, opacity: 0.8 }}>Descripción</span>
                                        <textarea
                                            value={newDesc}
                                            onChange={(e) => setNewDesc(e.target.value)}
                                            placeholder="Describe el trabajo…"
                                            rows={3}
                                            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
                                        />
                                    </label>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                        <label style={{ display: "grid", gap: 6 }}>
                                            <span style={{ fontSize: 12, opacity: 0.8 }}>Priority</span>
                                            <select
                                                value={newPriority}
                                                onChange={(e) => setNewPriority(e.target.value)}
                                                style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
                                            >
                                                <option value="low">low</option>
                                                <option value="medium">medium</option>
                                                <option value="high">high</option>
                                            </select>
                                        </label>

                                        <label style={{ display: "grid", gap: 6 }}>
                                            <span style={{ fontSize: 12, opacity: 0.8 }}>Scheduled for (opcional)</span>
                                            <input
                                                type="date"
                                                value={newScheduledFor}
                                                onChange={(e) => setNewScheduledFor(e.target.value)}
                                                style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
                                            />
                                        </label>
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                        <label style={{ display: "grid", gap: 6 }}>
                                            <span style={{ fontSize: 12, opacity: 0.8 }}>Customer</span>
                                            <select
                                                value={newCustomerId}
                                                onChange={(e) => {
                                                    const nextCustomerId = e.target.value;
                                                    setNewCustomerId(nextCustomerId);
                                                    setNewLocationId("");
                                                }}
                                                style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
                                            >
                                                <option value="">
                                                    {customersLoading ? "Cargando customers..." : "Seleccione customer"}
                                                </option>
                                                {customers.map((c) => (
                                                    <option key={c.customer_id} value={c.customer_id}>
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label style={{ display: "grid", gap: 6 }}>
                                            <span style={{ fontSize: 12, opacity: 0.8 }}>Location</span>
                                            <select
                                                value={newLocationId}
                                                onChange={(e) => setNewLocationId(e.target.value)}
                                                disabled={!newCustomerId}
                                                style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
                                            >
                                                <option value="">
                                                    {!newCustomerId
                                                        ? "Primero seleccione customer"
                                                        : locationsLoading
                                                            ? "Cargando locations..."
                                                            : "Seleccione location"}
                                                </option>
                                                {filteredLocations.map((loc) => (
                                                    <option key={loc.location_id} value={loc.location_id}>
                                                        {loc.label?.trim()
                                                            ? `${loc.label} — ${loc.address}`
                                                            : loc.address}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                    {/* ✅ por ahora solo prueba visual */}
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!companyId) {
                                                alert("No hay empresa activa");
                                                return;
                                            }

                                            if (!newJobType.trim()) {
                                                alert("El Job type es obligatorio");
                                                return;
                                            }
                                            if (!newCustomerId) {
                                                alert("Debe seleccionar un customer");
                                                return;
                                            }

                                            if (!newLocationId) {
                                                alert("Debe seleccionar una location");
                                                return;
                                            }
                                            try {
                                                const customer = customers.find((c) => c.customer_id === newCustomerId);
                                                const location = locations.find((l) => l.location_id === newLocationId);

                                                const { error } = await insertWorkOrder({
                                                    company_id: companyId,
                                                    customer_id: newCustomerId || null,
                                                    location_id: newLocationId || null,
                                                    customer_name: customer?.name ?? null,
                                                    customer_phone: customer?.phone ?? null,
                                                    customer_email: customer?.email ?? null,
                                                    service_address: location?.address ?? null,
                                                    job_type: newJobType,
                                                    description: newDesc,
                                                    priority: newPriority,
                                                    scheduled_for: newScheduledFor || null,
                                                    status: "new",
                                                });

                                                if (error) {
                                                    alert("Error creando orden: " + error.message);
                                                    return;
                                                }

                                                // limpiar formulario
                                                // limpiar formulario
                                                setNewJobType("");
                                                setNewDesc("");
                                                setNewPriority("medium");
                                                setNewScheduledFor("");
                                                setNewCustomerId("");
                                                setNewLocationId("");
                                                setShowNewWO(false);

                                                // refrescar lista
                                                await loadOrders(companyId);

                                            } catch (e: any) {
                                                alert("Error inesperado: " + (e?.message ?? e));
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
                                            width: "fit-content",
                                        }}
                                    >
                                        Crear orden
                                    </button>
                                </div>
                            </div>
                        ) : null}
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
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                <div style={{ fontWeight: 700 }}>{wo.job_type}</div>

                                                {wo.invoice_id ? (
                                                    <span
                                                        style={{
                                                            display: "inline-block",
                                                            padding: "4px 8px",
                                                            borderRadius: 999,
                                                            fontSize: 12,
                                                            fontWeight: 900,
                                                            border: "1px solid #22c55e",
                                                            background: "#ecfdf5",
                                                            color: "#065f46",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                        title="Esta orden ya tiene factura"
                                                    >
                                                        Invoiced
                                                    </span>
                                                ) : null}
                                            </div>

                                            <div style={{ opacity: 0.7, marginTop: 4 }}>{wo.description}</div>
                                            {wo.customer_name ? (
                                                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                                                    <b>Customer:</b> {wo.customer_name}
                                                </div>
                                            ) : null}

                                            {wo.service_address ? (
                                                <div style={{ fontSize: 12, opacity: 0.7 }}>
                                                    <b>Location:</b> {wo.service_address}
                                                </div>
                                            ) : null}

                                            <div style={{ fontFamily: "monospace", opacity: 0.7, marginTop: 6 }}>
                                                <div><b>wo_id:</b> {wo.work_order_id}</div>
                                                <div><b>assigned_to:</b> {wo.assigned_to ?? "—"}</div>
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

                                                            // ✅ refresh historial si está abierto
                                                            if (auditOpenFor === wo.work_order_id) {
                                                                await loadAuditTimeline(wo.work_order_id);
                                                            }
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
                                                    // ✅ Si el historial está abierto para esta WO, refrescarlo sin recargar página
                                                    if (auditOpenFor === wo.work_order_id) {
                                                        await loadAuditTimeline(wo.work_order_id);
                                                    }

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
                                                {allowedStatusesForRole(myRole ?? null, wo.status).map((s: WorkOrderStatus) => (
                                                    <option key={s} value={s}>
                                                        {s}
                                                    </option>
                                                ))}
                                            </select>
                                            <div style={{ marginTop: 10 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/work-orders/${wo.work_order_id}`)}
                                                    style={{
                                                        padding: "6px 10px",
                                                        borderRadius: 10,
                                                        border: "1px solid #ddd",
                                                        background: "white",
                                                        cursor: "pointer",
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        marginRight: 8,
                                                    }}
                                                >
                                                    Abrir
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        const nextOpen =
                                                            auditOpenFor === wo.work_order_id ? null : wo.work_order_id;

                                                        setAuditOpenFor(nextOpen);

                                                        if (nextOpen) {
                                                            await loadAuditTimeline(wo.work_order_id);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: "6px 10px",
                                                        borderRadius: 10,
                                                        border: "1px solid #ddd",
                                                        background: "white",
                                                        cursor: "pointer",
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    {auditOpenFor === wo.work_order_id ? "Ocultar historial" : "Ver historial"}
                                                </button>
                                                {wo.invoice_id ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => router.push(`/invoices/${wo.invoice_id}`)}
                                                        style={{
                                                            padding: "6px 10px",
                                                            borderRadius: 10,
                                                            border: "1px solid #ddd",
                                                            background: "white",
                                                            cursor: "pointer",
                                                            fontSize: 12,
                                                            fontWeight: 800,
                                                            marginLeft: 8,
                                                        }}
                                                        title="Abrir la factura existente"
                                                    >
                                                        Abrir factura
                                                    </button>
                                                ) : isAdminOrOwner && (wo.status === "resolved" || wo.status === "closed") ? (
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                const invoiceId = await createInvoiceFromWorkOrder(wo.work_order_id);
                                                                router.push(`/invoices/${invoiceId}`);
                                                            } catch (e: any) {
                                                                alert("Error creando factura: " + (e?.message ?? e));
                                                            }
                                                        }}
                                                        style={{
                                                            padding: "6px 10px",
                                                            borderRadius: 10,
                                                            border: "1px solid #111",
                                                            background: "#111",
                                                            color: "white",
                                                            cursor: "pointer",
                                                            fontSize: 12,
                                                            fontWeight: 800,
                                                            marginLeft: 8,
                                                        }}
                                                        title="Crear factura desde esta orden"
                                                    >
                                                        Crear factura
                                                    </button>
                                                ) : null}

                                                {auditOpenFor === wo.work_order_id ? (
                                                    <WorkOrderAuditPanel
                                                        loading={!!auditLoadingFor[wo.work_order_id]}
                                                        items={auditByWo[wo.work_order_id] ?? []}
                                                    />
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </CompanyGuard>
    );
}