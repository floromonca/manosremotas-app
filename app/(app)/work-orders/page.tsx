"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setWorkOrderAssignee } from "../../../lib/supabase/workOrders";
import { supabase } from "../../../lib/supabaseClient";
import { MR_THEME } from "../../../lib/theme";

import { useAuthState } from "../../../hooks/useAuthState";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import { useUrlWoFilter, type WOFilter } from "../../../hooks/useUrlWoFilter";
import { createInvoiceFromWorkOrder } from "../../../lib/invoices";
import { CompanyGuard } from "../../components/CompanyGuard";
import WorkOrderAuditPanel from "./components/WorkOrderAuditPanel";
import OperationalShiftBanner from "./components/OperationalShiftBanner";
import WorkOrdersToolbar from "./components/WorkOrdersToolbar";
import WorkOrdersPageHeader from "./components/WorkOrdersPageHeader";
import WorkOrdersAdminSectionTabs from "./components/WorkOrdersAdminSectionTabs";
import WorkOrdersAdminActions from "./components/WorkOrdersAdminActions";
import { useSearchParams } from "next/navigation";

import WorkOrdersList from "./components/WorkOrdersList";

import {
    allowedStatusesForRole,
    canChangeWorkOrderStatus,
    isWorkOrderDelayed,
    isWorkOrderReadyToInvoice,
} from "../../../lib/work-orders/policies";

import type { WorkOrderRole } from "../../../lib/work-orders/policies";

import {
    fetchWorkOrders,
    safeStatus,
    setWorkOrderStatus,
    insertWorkOrder,
    type WorkOrderStatus,
} from "../../../lib/supabase/workOrders";

// ✅ BLOQUEO OPERATIVO (Jornada)
import { getOpenShift } from "../../../lib/supabase/shifts";

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
type MemberRow = {
    user_id: string;
    role: string;
    full_name?: string | null;
};

function WorkOrdersPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();

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
    const [creatingWO, setCreatingWO] = useState(false);

    const [companyNameDraft, setCompanyNameDraft] = useState("");
    const [companyNameSaving, setCompanyNameSaving] = useState(false);
    const [companyNameMsg, setCompanyNameMsg] = useState<string | null>(null);



    // ✅ Guards para evitar re-suscripciones repetidas
    const woRtRef = useRef<string | null>(null);
    const auditRtRef = useRef<string | null>(null);

    const doAuth = useCallback(() => {
        router.replace("/auth");
    }, [router]);

    const { companyId, companyName, myRole, isLoadingCompany, refreshCompany } = useActiveCompany();



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

    const [adminExpandedSections, setAdminExpandedSections] = useState<
        Record<string, boolean>
    >({});

    // ✅ Crear Work Order (UI)
    const [showNewWO, setShowNewWO] = useState(false);
    const [adminActiveSection, setAdminActiveSection] = useState<
        "needs_attention" | "active_work" | "ready_to_invoice" | "history"
    >("needs_attention");
    useEffect(() => {
        if (woFilter === "unassigned") {
            setAdminActiveSection("needs_attention");
            return;
        }

        if (woFilter === "delayed") {
            setAdminActiveSection("active_work");
            return;
        }

        if (woFilter === "ready_to_invoice") {
            setAdminActiveSection("ready_to_invoice");
        }
    }, [woFilter]);

    const [newJobType, setNewJobType] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newPriority, setNewPriority] = useState("medium");
    const [newScheduledFor, setNewScheduledFor] = useState<string>("");


    const [customers, setCustomers] = useState<CustomerRow[]>([]);
    const [locations, setLocations] = useState<LocationRow[]>([]);
    const [customersLoading, setCustomersLoading] = useState(false);
    const [locationsLoading, setLocationsLoading] = useState(false);

    const [newCustomerId, setNewCustomerId] = useState<string>("");
    const [showCreateCustomer, setShowCreateCustomer] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newLocationId, setNewLocationId] = useState<string>("");
    const [showCreateLocation, setShowCreateLocation] = useState(false);
    const [newLocationName, setNewLocationName] = useState("");

    const filteredLocations = useMemo<LocationRow[]>(() => {
        if (!newCustomerId) return [];
        return locations.filter((loc: LocationRow) => loc.customer_id === newCustomerId);
    }, [locations, newCustomerId]);




    // ✅ Rol del usuario en la compañía (owner/admin/tech/viewer)
    const [workOrderRole, setWorkOrderRole] = useState<WorkOrderRole>(null);

    type MemberRow = {
        user_id: string;
        role: string;
        full_name?: string | null;
    };

    const [members, setMembers] = useState<MemberRow[]>([]);
    const techMembers = members.filter((m) => m.role === "tech");
    const [membersLoading, setMembersLoading] = useState(false);

    const isAdminOrOwner = myRole === "admin" || myRole === "owner";

    // ✅ BLOQUEO OPERATIVO: Jornada detectada aquí
    const [openShiftId, setOpenShiftId] = useState<string | null>(null);
    const [shiftLoading, setShiftLoading] = useState(false);

    const canOperate = true;

    const refreshShift = useCallback(async (cid: string) => {
        setShiftLoading(true);
        try {
            const { data, error } = await getOpenShift(cid);
            if (error) throw error;
            setOpenShiftId((data as any)?.shift_id ?? null);
        } catch (e: any) {
            setOpenShiftId(null);
        } finally {
            setShiftLoading(false);
        }
    }, []);

    const refreshMembers = useCallback(async (cid: string) => {
        setMembersLoading(true);
        try {
            const { data: membersData, error: membersError } = await supabase
                .from("company_members")
                .select("user_id, role, full_name")
                .eq("company_id", cid);

            console.log("refreshMembers membersData", { cid, membersData, membersError });

            if (membersError) throw membersError;

            const baseMembers =
                (membersData as { user_id: string; role: string; full_name: string | null }[] | null) ?? [];

            const missingNameIds = baseMembers
                .filter((m) => !m.full_name?.trim())
                .map((m) => m.user_id);

            if (missingNameIds.length === 0) {
                setMembers(baseMembers);
                return;
            }

            const { data: profilesData, error: profilesError } = await supabase
                .from("profiles")
                .select("user_id, full_name")
                .in("user_id", missingNameIds);

            console.log("refreshMembers profilesData", { profilesData, profilesError });

            const profilesMap = new Map(
                ((profilesData as { user_id: string; full_name: string | null }[] | null) ?? []).map((p) => [
                    p.user_id,
                    p.full_name,
                ])
            );

            const merged: MemberRow[] = baseMembers.map((m) => ({
                user_id: m.user_id,
                role: m.role,
                full_name: m.full_name?.trim() || profilesMap.get(m.user_id) || null,
            }));

            console.log("refreshMembers merged", merged);
            setMembers(merged);
        } catch (e: any) {
            console.log("refreshMembers ERROR:", e?.message ?? e);
            setMembers([]);
        } finally {
            setMembersLoading(false);
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
                setWorkOrderRole(null);
                return;
            }

            const { data, error } = await supabase
                .from("company_members")
                .select("role")
                .eq("company_id", cid)
                .eq("user_id", uid)
                .maybeSingle();

            if (error) throw error;

            setWorkOrderRole((data?.role as any) ?? null);
        } catch (e) {
            setWorkOrderRole(null);
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
    useEffect(() => {
        const openFromCustomer = searchParams.get("newFromCustomer");
        const customerIdParam = searchParams.get("customerId");

        if (openFromCustomer === "true") {
            setShowNewWO(true);

            if (customerIdParam) {
                setNewCustomerId(customerIdParam);
            }
        }
    }, [searchParams]);

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



        const isDelayed = (w: WorkOrder) =>
            isWorkOrderDelayed({
                status: w.status,
                createdAt: w.created_at,
                nowMs: now,
            });

        const isReadyToInvoice = (w: WorkOrder) =>
            isWorkOrderReadyToInvoice(w.status);

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

    const isTechView = myRole === "tech";
    const currentUserId = user?.id ?? null;

    const techRows = useMemo(() => {
        if (!isTechView || !currentUserId) return [];
        return rows.filter((w) => w.assigned_to === currentUserId);
    }, [rows, isTechView, currentUserId]);

    const visibleRows = isTechView ? techRows : filtered;

    const techAssignedCount = techRows.filter((w) => w.status === "new").length;
    const techInProgressCount = techRows.filter((w) => w.status === "in_progress").length;
    const techCompletedCount = techRows.filter(
        (w) => w.status === "resolved" || w.status === "closed"
    ).length;
    const nowMs = Date.now();

    const adminNeedsAttentionRows = useMemo(() => {
        if (woFilter === "unassigned") {
            return rows.filter((w) => !w.assigned_to);
        }

        return rows.filter((w) => {
            const delayed = isWorkOrderDelayed({
                status: w.status,
                createdAt: w.created_at,
                nowMs,
            });

            return w.status === "new" || !w.assigned_to || delayed;
        });
    }, [rows, nowMs, woFilter]);

    const adminActiveRows = useMemo(() => {
        if (woFilter === "delayed") {
            return rows.filter((w) =>
                isWorkOrderDelayed({
                    status: w.status,
                    createdAt: w.created_at,
                    nowMs,
                })
            );
        }

        return rows.filter((w) => w.status === "in_progress");
    }, [rows, nowMs, woFilter]);
    const adminReadyToInvoiceRows = useMemo(() => {
        return rows.filter((w) => isWorkOrderReadyToInvoice(w.status));
    }, [rows]);

    const adminHistoryRows = useMemo(() => {
        return rows.filter((w) => w.status === "closed");
    }, [rows]);

    const renderAdminSection = (
        sectionKey: string,
        title: string,
        sectionRows: WorkOrder[],
        emptyMessage: string
    ) => {
        const isExpanded = !!adminExpandedSections[sectionKey];
        const visibleRows = isExpanded ? sectionRows : sectionRows.slice(0, 5);
        const hasMore = sectionRows.length > 5;

        return (
            <section style={{ marginTop: 20 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 10,
                        flexWrap: "wrap",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 23,
                                fontWeight: 900,
                                color: "#0f172a",
                                letterSpacing: "-0.03em",
                            }}
                        >
                            {title}
                        </div>

                        <div
                            style={{
                                padding: "4px 10px",
                                borderRadius: 999,
                                border: "1px solid #e5e7eb",
                                background: "#f9fafb",
                                fontSize: 12,
                                color: "#374151",
                                fontWeight: 700,
                            }}
                        >
                            {sectionRows.length}
                        </div>
                    </div>

                    {hasMore ? (
                        <button
                            type="button"
                            onClick={() =>
                                setAdminExpandedSections((prev) => ({
                                    ...prev,
                                    [sectionKey]: !prev[sectionKey],
                                }))
                            }
                            style={{
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: "1px solid #d1d5db",
                                background: "white",
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 800,
                            }}
                        >
                            {isExpanded ? "Show fewer" : `Show all (${sectionRows.length})`}
                        </button>
                    ) : null}
                </div>

                {sectionRows.length === 0 ? (
                    <div
                        style={{
                            padding: "14px 2px",
                            color: "#6b7280",
                            fontSize: 14,
                        }}
                    >
                        {emptyMessage}
                    </div>
                ) : (
                    <WorkOrdersList
                        rows={visibleRows}
                        companyId={companyId}
                        isAdminOrOwner={isAdminOrOwner}
                        techMembers={techMembers}
                        canChangeStatus={canChangeStatus}
                        myRole={myRole}
                        allowedStatusesForRole={allowedStatusesForRole}
                        auditOpenFor={auditOpenFor}
                        auditLoadingFor={auditLoadingFor}
                        auditByWo={auditByWo}
                        onAssignTech={handleAssignTech}
                        onChangeStatus={handleChangeStatus}
                        onOpenWorkOrder={(woId) => router.push(`/work-orders/${woId}`)}
                        onToggleAudit={handleToggleAudit}
                        onOpenInvoice={(invoiceId) => router.push(`/invoices/${invoiceId}`)}
                        onCreateInvoice={async (woId) => {
                            try {
                                const invoiceId = await createInvoiceFromWorkOrder(woId);
                                router.push(`/invoices/${invoiceId}`);
                            } catch (e: any) {
                                alert("Error creando factura: " + (e?.message ?? e));
                            }
                        }}
                        AuditPanel={WorkOrderAuditPanel}
                    />
                )}
            </section>
        );
    };

    const techAssignedRows = techRows.filter((w) => w.status === "new");
    const techInProgressRows = techRows.filter((w) => w.status === "in_progress");
    const techCompletedRows = techRows.filter(
        (w) => w.status === "resolved" || w.status === "closed"
    );

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
    const canChangeStatus = (wo: WorkOrder) =>
        canChangeWorkOrderStatus({
            userId: user?.id ?? null,
            isAdminOrOwner,
            role: myRole,
            canOperate,
            assignedTo: wo.assigned_to,
        });
    const handleAssignTech = useCallback(
        async (woId: string, techId: string) => {
            const { error } = await setWorkOrderAssignee(woId, techId);

            if (error) {
                alert("No se pudo asignar: " + error.message);
                return;
            }

            if (companyId) {
                await loadOrders(companyId);
            }

            if (auditOpenFor === woId) {
                await loadAuditTimeline(woId);
            }
        },
        [companyId, auditOpenFor, loadAuditTimeline, loadOrders]
    );
    const handleChangeStatus = useCallback(
        async (woId: string, next: WorkOrderStatus) => {
            const { error } = await setWorkOrderStatus(woId, next);

            if (error) {
                alert("No se pudo cambiar status: " + error.message);
                return;
            }

            if (companyId) {
                await loadOrders(companyId);
            }

            if (auditOpenFor === woId) {
                await loadAuditTimeline(woId);
            }
        },
        [companyId, auditOpenFor, loadAuditTimeline, loadOrders]
    );
    const handleToggleAudit = useCallback(
        async (woId: string) => {
            const nextOpen = auditOpenFor === woId ? null : woId;
            setAuditOpenFor(nextOpen);

            if (nextOpen) {
                await loadAuditTimeline(woId);
            }
        },
        [auditOpenFor, loadAuditTimeline]
    );
    const renderTechSection = (title: string, sectionRows: WorkOrder[]) => (
        <section style={{ marginTop: 18 }}>
            <div
                style={{
                    marginBottom: 10,
                    fontSize: 20,
                    fontWeight: 900,
                    color: "#111827",
                    letterSpacing: "-0.02em",
                }}
            >
                {title}
            </div>

            {sectionRows.length === 0 ? (
                <div
                    style={{
                        padding: "14px 2px",
                        color: "#6b7280",
                        fontSize: 14,
                    }}
                >
                    No work orders in this section.
                </div>
            ) : (
                <WorkOrdersList
                    rows={sectionRows}
                    companyId={companyId}
                    isAdminOrOwner={isAdminOrOwner}
                    techMembers={techMembers}
                    canChangeStatus={canChangeStatus}
                    myRole={myRole}
                    allowedStatusesForRole={allowedStatusesForRole}
                    auditOpenFor={auditOpenFor}
                    auditLoadingFor={auditLoadingFor}
                    auditByWo={auditByWo}
                    onAssignTech={handleAssignTech}
                    onChangeStatus={handleChangeStatus}
                    onOpenWorkOrder={(woId) => router.push(`/work-orders/${woId}`)}
                    onToggleAudit={handleToggleAudit}
                    onOpenInvoice={(invoiceId) => router.push(`/invoices/${invoiceId}`)}
                    onCreateInvoice={async (woId) => {
                        try {
                            const invoiceId = await createInvoiceFromWorkOrder(woId);
                            router.push(`/invoices/${invoiceId}`);
                        } catch (e: any) {
                            alert("Error creando factura: " + (e?.message ?? e));
                        }
                    }}
                    AuditPanel={WorkOrderAuditPanel}
                />
            )}
        </section>
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
            <div style={{ paddingBottom: 40, maxWidth: 1180, margin: "0 auto" }}>
                {/* ✅ Header: cambia según si hay sesión */}


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

                            {(myRole === "owner" || myRole === "admin") ? (
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
                            ) : null}                        </div>

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
                        <header
                            style={{
                                marginBottom: 16,
                                padding: "22px 22px 18px",
                                borderRadius: 18,
                                border: "1px solid #e5e7eb",
                                background: "linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)",
                                boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                            }}
                        >
                            <WorkOrdersPageHeader
                                isTechView={isTechView}
                                companyName={companyName}
                            />

                        </header>

                        {!isTechView ? (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr",
                                    gap: MR_THEME.spacing.sm,
                                    width: "100%",
                                    maxWidth: "100%",
                                    marginBottom: MR_THEME.spacing.md,
                                    overflow: "hidden",
                                }}
                            >
                                <WorkOrdersAdminSectionTabs
                                    adminActiveSection={adminActiveSection}
                                    setAdminActiveSection={setAdminActiveSection}
                                    counts={{
                                        needsAttention: adminNeedsAttentionRows.length,
                                        activeWork: adminActiveRows.length,
                                        readyToInvoice: adminReadyToInvoiceRows.length,
                                        history: adminHistoryRows.length,
                                    }}
                                />

                                <WorkOrdersAdminActions
                                    showNewWO={showNewWO}
                                    onToggleNewWO={() => setShowNewWO((s) => !s)}
                                    onRefresh={() => {
                                        if (companyId) loadOrders(companyId);
                                    }}
                                />
                            </div>
                        ) : null}

                        {isAdminOrOwner && showNewWO ? (
                            <div
                                style={{
                                    marginBottom: 16,
                                    padding: 16,
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 16,
                                    background: "#ffffff",
                                    boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
                                    boxSizing: "border-box",
                                    width: "100%",
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 900,
                                        marginBottom: 14,
                                        fontSize: 16,
                                        color: "#0f172a",
                                    }}
                                >
                                    Create new work order
                                </div>

                                <div style={{ display: "grid", gap: 14 }}>
                                    <label style={{ display: "grid", gap: 6 }}>
                                        <span style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>
                                            Job type
                                        </span>
                                        <input
                                            value={newJobType}
                                            onChange={(e) => setNewJobType(e.target.value)}
                                            placeholder="Ej: Electrical troubleshooting"
                                            style={{
                                                width: "100%",
                                                boxSizing: "border-box",
                                                padding: "11px 12px",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: 10,
                                                fontSize: 14,
                                                color: "#0f172a",
                                                background: "#ffffff",
                                            }}
                                        />
                                    </label>

                                    <label style={{ display: "grid", gap: 6 }}>
                                        <span style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>
                                            Description
                                        </span>
                                        <textarea
                                            value={newDesc}
                                            onChange={(e) => setNewDesc(e.target.value)}
                                            placeholder="Describe el trabajo…"
                                            rows={3}
                                            style={{
                                                width: "100%",
                                                boxSizing: "border-box",
                                                padding: "11px 12px",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: 10,
                                                fontSize: 14,
                                                color: "#0f172a",
                                                background: "#ffffff",
                                                resize: "vertical",
                                            }}
                                        />
                                    </label>

                                    <label style={{ display: "grid", gap: 6 }}>
                                        <span style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>
                                            Priority
                                        </span>
                                        <select
                                            value={newPriority}
                                            onChange={(e) => setNewPriority(e.target.value)}
                                            style={{
                                                width: "100%",
                                                boxSizing: "border-box",
                                                padding: "11px 12px",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: 10,
                                                fontSize: 14,
                                                color: "#0f172a",
                                                background: "#ffffff",
                                            }}
                                        >
                                            <option value="low">low</option>
                                            <option value="medium">medium</option>
                                            <option value="high">high</option>
                                        </select>
                                    </label>

                                    <label style={{ display: "grid", gap: 6, minWidth: 0, width: "100%" }}>
                                        <span style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>
                                            Scheduled for
                                        </span>
                                        <input
                                            type="date"
                                            value={newScheduledFor}
                                            onChange={(e) => setNewScheduledFor(e.target.value)}
                                            style={{
                                                width: "100%",
                                                maxWidth: "100%",
                                                boxSizing: "border-box",
                                                padding: "11px 12px",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: 10,
                                                fontSize: 14,
                                                color: "#0f172a",
                                                background: "#ffffff",
                                            }}
                                        />
                                    </label>

                                    <label style={{ display: "grid", gap: 6 }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                gap: 10,
                                            }}
                                        >
                                            <span style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>
                                                Customer
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() => setShowCreateCustomer((v) => !v)}
                                                style={{
                                                    fontSize: 12,
                                                    color: "#2563eb",
                                                    background: "transparent",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    padding: 0,
                                                    fontWeight: 800,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                + Create
                                            </button>
                                        </div>

                                        <select
                                            value={newCustomerId}
                                            onChange={(e) => {
                                                const nextCustomerId = e.target.value;
                                                setNewCustomerId(nextCustomerId);
                                                setNewLocationId("");
                                            }}
                                            style={{
                                                width: "100%",
                                                boxSizing: "border-box",
                                                padding: "11px 12px",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: 10,
                                                fontSize: 14,
                                                color: "#0f172a",
                                                background: "#ffffff",
                                            }}
                                        >
                                            <option value="">
                                                {customersLoading ? "Loading customers..." : "Select customer"}
                                            </option>
                                            {customers.map((c) => (
                                                <option key={c.customer_id} value={c.customer_id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>

                                        {showCreateCustomer && (
                                            <div
                                                style={{
                                                    marginTop: 8,
                                                    padding: 10,
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: 12,
                                                    background: "#f8fafc",
                                                    display: "grid",
                                                    gap: 8,
                                                }}
                                            >
                                                <input
                                                    placeholder="Customer name"
                                                    value={newCustomerName}
                                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                                    style={{
                                                        width: "100%",
                                                        boxSizing: "border-box",
                                                        padding: "10px 12px",
                                                        border: "1px solid #cbd5e1",
                                                        borderRadius: 10,
                                                        fontSize: 14,
                                                        color: "#0f172a",
                                                        background: "#ffffff",
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (!companyId) return;
                                                        if (!newCustomerName.trim()) return;

                                                        const { data, error } = await supabase
                                                            .from("customers")
                                                            .insert({
                                                                company_id: companyId,
                                                                name: newCustomerName.trim(),
                                                            })
                                                            .select()
                                                            .single();

                                                        if (error) {
                                                            alert(error.message);
                                                            return;
                                                        }

                                                        setCustomers((prev) => [...prev, data]);
                                                        setNewCustomerId(data.customer_id);
                                                        setNewCustomerName("");
                                                        setShowCreateCustomer(false);
                                                    }}
                                                    style={{
                                                        width: "100%",
                                                        padding: "10px 12px",
                                                        borderRadius: 10,
                                                        border: "1px solid #0f172a",
                                                        background: "#0f172a",
                                                        color: "white",
                                                        fontSize: 13,
                                                        cursor: "pointer",
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    Save customer
                                                </button>
                                            </div>
                                        )}
                                    </label>

                                    <label style={{ display: "grid", gap: 6 }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                gap: 10,
                                            }}
                                        >
                                            <span style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>
                                                Location
                                            </span>

                                            {newCustomerId && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCreateLocation((v) => !v)}
                                                    style={{
                                                        fontSize: 12,
                                                        color: "#2563eb",
                                                        background: "transparent",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        padding: 0,
                                                        fontWeight: 800,
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    + Create
                                                </button>
                                            )}
                                        </div>

                                        <select
                                            value={newLocationId}
                                            onChange={(e) => setNewLocationId(e.target.value)}
                                            disabled={!newCustomerId}
                                            style={{
                                                width: "100%",
                                                boxSizing: "border-box",
                                                padding: "11px 12px",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: 10,
                                                fontSize: 14,
                                                color: newCustomerId ? "#0f172a" : "#94a3b8",
                                                background: newCustomerId ? "#ffffff" : "#f8fafc",
                                            }}
                                        >
                                            <option value="">
                                                {!newCustomerId
                                                    ? "Select customer first"
                                                    : locationsLoading
                                                        ? "Loading locations..."
                                                        : "Select location"}
                                            </option>
                                            {filteredLocations.map((loc) => (
                                                <option key={loc.location_id} value={loc.location_id}>
                                                    {loc.label?.trim()
                                                        ? `${loc.label} — ${loc.address}`
                                                        : loc.address}
                                                </option>
                                            ))}
                                        </select>

                                        {showCreateLocation && newCustomerId && (
                                            <div
                                                style={{
                                                    marginTop: 8,
                                                    padding: 10,
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: 12,
                                                    background: "#f8fafc",
                                                    display: "grid",
                                                    gap: 8,
                                                }}
                                            >
                                                <input
                                                    placeholder="Service address"
                                                    value={newLocationName}
                                                    onChange={(e) => setNewLocationName(e.target.value)}
                                                    style={{
                                                        width: "100%",
                                                        minHeight: 48,
                                                        padding: "12px 16px",
                                                        borderRadius: 12,
                                                        border: "1px solid #0f172a",
                                                        background: "#0f172a",
                                                        color: "#ffffff",
                                                        cursor: "pointer",
                                                        fontWeight: 800,
                                                        fontSize: 15,
                                                        lineHeight: 1.2,
                                                    }}
                                                />

                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (!newLocationName.trim()) return;

                                                        const { data, error } = await supabase
                                                            .from("locations")
                                                            .insert({
                                                                company_id: companyId,
                                                                customer_id: newCustomerId,
                                                                address: newLocationName.trim(),
                                                                label: null,
                                                            })
                                                            .select()
                                                            .single();

                                                        if (error) {
                                                            alert(error.message);
                                                            return;
                                                        }

                                                        setLocations((prev) => [...prev, data]);
                                                        setNewLocationId(data.location_id);
                                                        setNewLocationName("");
                                                        setShowCreateLocation(false);
                                                    }}
                                                    style={{
                                                        width: "100%",
                                                        padding: "10px 12px",
                                                        borderRadius: 10,
                                                        border: "1px solid #0f172a",
                                                        background: "#0f172a",
                                                        color: "white",
                                                        fontSize: 13,
                                                        cursor: "pointer",
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    Save location
                                                </button>
                                            </div>
                                        )}
                                    </label>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (creatingWO) return;
                                            setCreatingWO(true);

                                            try {
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

                                                setNewJobType("");
                                                setNewDesc("");
                                                setNewPriority("medium");
                                                setNewScheduledFor("");
                                                setNewCustomerId("");
                                                setNewLocationId("");
                                                setShowNewWO(false);

                                                await loadOrders(companyId);
                                            } catch (e: any) {
                                                alert("Error inesperado: " + (e?.message ?? e));
                                            } finally {
                                                setCreatingWO(false);
                                            }
                                        }}
                                        disabled={creatingWO}
                                        style={{
                                            width: "100%",
                                            minHeight: 48,
                                            padding: "12px 16px",
                                            borderRadius: 12,
                                            border: `1px solid ${MR_THEME.colors.primary}`,
                                            background: MR_THEME.colors.primary,
                                            color: "#ffffff",
                                            cursor: creatingWO ? "not-allowed" : "pointer",
                                            opacity: creatingWO ? 0.6 : 1,
                                            fontWeight: 800,
                                            fontSize: 15,
                                            lineHeight: 1.2,
                                            boxShadow: "none",
                                        }}
                                    >
                                        {creatingWO ? "Creating..." : "Create work order"}
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div style={{ marginBottom: 18 }}>
                            {/* ✅ BLOQUEO OPERATIVO: Banner (Jornada) */}
                            <OperationalShiftBanner
                                shiftLoading={shiftLoading}
                                canOperate={canOperate}
                                onRefreshShift={() => {
                                    if (companyId) refreshShift(companyId);
                                }}
                                onGoCheckIn={() => router.replace("/control-center")}
                            />
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
                        ) : isTechView ? (
                            visibleRows.length === 0 ? (
                                <div style={{ opacity: 0.6 }}>No tienes órdenes asignadas.</div>
                            ) : (
                                <>
                                    {renderTechSection("My Active Work", techInProgressRows)}
                                    {renderTechSection("My Assigned Work", techAssignedRows)}
                                    {renderTechSection("Recent Completed", techCompletedRows)}
                                </>
                            )
                        ) : rows.length === 0 ? (
                            <div style={{ opacity: 0.6 }}>No work orders to show.</div>
                        ) : adminActiveSection === "needs_attention" ? (
                            renderAdminSection(
                                "needs_attention",
                                "Needs Attention",
                                adminNeedsAttentionRows,
                                "No work orders need attention."
                            )
                        ) : adminActiveSection === "active_work" ? (
                            renderAdminSection(
                                "active_work",
                                "Active Work",
                                adminActiveRows,
                                "No active work orders."
                            )
                        ) : adminActiveSection === "ready_to_invoice" ? (
                            renderAdminSection(
                                "ready_to_invoice",
                                "Ready to Invoice",
                                adminReadyToInvoiceRows,
                                "No work orders ready to invoice."
                            )
                        ) : (
                            renderAdminSection(
                                "history",
                                "History",
                                adminHistoryRows,
                                "No closed work orders yet."
                            )
                        )}
                    </>
                )}
            </div>
        </CompanyGuard>
    );
}
export default function WorkOrdersPage() {
    return (
        <React.Suspense fallback={null}>
            <WorkOrdersPageInner />
        </React.Suspense>
    );
}