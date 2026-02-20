"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { createInvoiceFromWorkOrder } from "../lib/invoices";

type WorkOrderStatus = "new" | "in_progress" | "resolved" | "closed";

type WorkOrder = {
  work_order_id: string;
  company_id?: string | null;
  job_type: string;
  description: string;
  status: WorkOrderStatus;
  priority: string;
  scheduled_for: string | null;
  created_at: string;
  assigned_to?: string | null;
  created_by?: string | null;
  provider_id?: string | null;
  customer_id?: string | null;
};

type CompanyMember = {
  user_id: string;
  role: string | null;
  full_name: string | null;
};

type WOFilter = "all" | "mine" | "unassigned";

const safeStatus = (s: string): WorkOrderStatus =>
  s === "new" || s === "in_progress" || s === "resolved" || s === "closed"
    ? s
    : "new";

export default function Home() {
  // Auth
  const [email, setEmail] = useState("flormonc@gmail.com");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [msgLog, setMsgLog] = useState<string[]>([]);
  // ✅ Invoice UI message
  const [invoiceMsg, setInvoiceMsg] = useState<string>("");

  // ✅ Crear invoice desde una Work Order
  const handleCreateInvoice = useCallback(async (workOrderId: string) => {
    try {
      setInvoiceMsg("Creando invoice...");
      const invoiceId = await createInvoiceFromWorkOrder(workOrderId);
      setInvoiceMsg(`Invoice creada ✅ ID: ${invoiceId}`);
    } catch (e: any) {
      setInvoiceMsg(`No se pudo crear invoice: ${e?.message ?? String(e)}`);
    }
  }, []);
  const pushMsg = useCallback((m: string) => {
    setMsg(m);
    setMsgLog((prev) => [m, ...prev].slice(0, 12));
  }, []);

  // Multi-company
  const [myCompanies, setMyCompanies] = useState<
    { company_id: string; company_name: string; role: string | null }[]
  >([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  // Company (tenant)
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Timeline test (debug)
  const [timelineTest, setTimelineTest] = useState<any[]>([]);

  // Work Order form
  const [jobType, setJobType] = useState("Electrical - Fix outlet / breaker");
  const [description, setDescription] = useState(
    "Cliente reporta falso contacto en sala.",
  );
  const [priority, setPriority] = useState("normal");
  const [scheduledFor, setScheduledFor] = useState("");

  // Work Orders list
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loadingWO, setLoadingWO] = useState(false);
  const [refreshBtnLoading, setRefreshBtnLoading] = useState(false);

  // Selected work order
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(
    null,
  );

  // Snapshot (para que el panel no se caiga con refresh/realtime)
  const [selectedWorkOrderSnapshot, setSelectedWorkOrderSnapshot] =
    useState<WorkOrder | null>(null);

  // ✅ REF: evita stale closures y evita recrear realtime por clicks
  const selectedWorkOrderIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    selectedWorkOrderIdRef.current = selectedWorkOrderId;
  }, [selectedWorkOrderId]);

  // Comments
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  // Timeline
  type TimelineItem = {
    type: "comment" | "audit";
    created_at: string;
    message: string;
    author: string;
    comment_id?: string; // ✅ solo aplica para comentarios
  };

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  // Members / Roles
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);

  const [assignDraft, setAssignDraft] = useState<Record<string, string>>({});
  const [assignSaving, setAssignSaving] = useState<Record<string, boolean>>({});

  const [woFilter, setWoFilter] = useState<WOFilter>("all");

  // ✅ UI helpers
  const statusLabel = (s?: string) => {
    switch (s) {
      case "new":
        return "Nuevo";
      case "in_progress":
        return "En proceso";
      case "resolved":
        return "Resuelto";
      case "closed":
        return "Cerrado";
      default:
        return s ?? "-";
    }
  };

  const statusBadgeStyle = (s?: string) => {
    const base: React.CSSProperties = {
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 12,
      border: "1px solid #ddd",
      background: "#f7f7f7",
    };

    if (s === "in_progress")
      return { ...base, background: "#eef6ff", border: "1px solid #cfe6ff" };
    if (s === "resolved")
      return { ...base, background: "#f0fff4", border: "1px solid #cfead6" };
    if (s === "closed")
      return { ...base, background: "#f6f6f6", border: "1px solid #e0e0e0" };
    return base;
  };

  const techMembers = useMemo(
    () => members.filter((m) => m.role === "tech"),
    [members],
  );

  const isAdmin = useMemo(
    () => myRole === "owner" || myRole === "admin",
    [myRole],
  );

  const canEditThisWO = useCallback(
    (w: WorkOrder) => {
      if (isAdmin) return true;
      if (myRole === "tech") return w.assigned_to === myUserId;
      return false;
    },
    [isAdmin, myRole, myUserId],
  );

  const filteredWorkOrders = useMemo(() => {
    if (woFilter === "mine")
      return workOrders.filter((w) => w.assigned_to === myUserId);
    if (woFilter === "unassigned")
      return workOrders.filter((w) => !w.assigned_to);
    return workOrders;
  }, [woFilter, workOrders, myUserId]);

  // ✅ Siempre intenta buscar en la lista; si no está, usa snapshot
  const selectedWorkOrder = useMemo(() => {
    if (!selectedWorkOrderId) return null;
    return (
      workOrders.find((w) => w.work_order_id === selectedWorkOrderId) ??
      selectedWorkOrderSnapshot ??
      null
    );
  }, [selectedWorkOrderId, workOrders, selectedWorkOrderSnapshot]);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      map.set(
        m.user_id,
        (m.full_name && m.full_name.trim()) || m.user_id.slice(0, 8),
      );
    }
    return map;
  }, [members]);

  const resolveMyRole = useCallback(
    async (memberRows?: CompanyMember[]) => {
      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr || !u.user) return;

      setMyUserId(u.user.id);

      const rows = memberRows ?? members;
      const me = rows.find((m) => m.user_id === u.user!.id);
      setMyRole(me?.role ?? null);
    },
    [members],
  );

  const refreshMyCompanies = useCallback(async () => {
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u.user) return;

    const { data, error } = await supabase
      .from("company_members")
      .select(
        `
        company_id,
        role,
        companies:company_id (
          company_name
        )
      `,
      )
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.log("❌ Error loading companies:", error);
      pushMsg(`Error cargando companies: ${error.message}`);
      return;
    }

    const rows =
      (data ?? []).map((r: any) => ({
        company_id: r.company_id,
        role: r.role,
        company_name: r.companies?.company_name ?? "Unnamed",
      })) ?? [];

    setMyCompanies(rows);

    const saved = localStorage.getItem("activeCompanyId");
    const exists = rows.find((c) => c.company_id === saved);
    const initialCompany = exists?.company_id ?? rows[0]?.company_id ?? null;

    setActiveCompanyId(initialCompany);
  }, [pushMsg]);

  const ensureCompany = useCallback(async () => {
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u.user) {
      pushMsg("No hay usuario autenticado.");
      return null;
    }

    const { data, error } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error) {
      pushMsg(`Error obteniendo company: ${error.message}`);
      return null;
    }

    setCompanyId(data.company_id);
    return data.company_id as string;
  }, [pushMsg]);

  // ✅ Timeline (audit + comments)
  const refreshTimeline = useCallback(
    async (workOrderId: string, opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;

      if (!silent) {
        setLoadingComments(true);
        pushMsg("Cargando historial...");
      }

      const { data: auditData, error: auditError } = await supabase
        .from("v_work_order_audit_timeline")
        .select("changed_at, changed_at_ui, changed_by_name, message")
        .eq("work_order_id", workOrderId);

      if (auditError) {
        if (!silent) {
          setLoadingComments(false);
          pushMsg(`Error audit: ${auditError.message}`);
        }
        return;
      }

      const { data: commentData, error: commentError } = await supabase
        .from("work_order_comments")
        .select("comment_id, comment, created_at, user_id")

        .eq("work_order_id", workOrderId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (commentError) {
        setLoadingComments(false);
        pushMsg(`Error comments: ${commentError.message}`);
        return;
      }
      type CommentRow = {
        comment_id: string;
        comment: string;
        created_at: string;
        user_id: string | null;
      };

      const commentRows = (commentData ?? []) as CommentRow[];

      const commentItems: TimelineItem[] = commentRows.map((c) => ({
        type: "comment",
        comment_id: c.comment_id, // ✅ AQUÍ (para poder borrar)
        created_at: c.created_at,
        message: c.comment,
        author:
          (c.user_id && memberNameById.get(c.user_id)) ??
          (c.user_id ? c.user_id.slice(0, 8) : "Usuario"),
      }));

      const auditItems: TimelineItem[] = (auditData ?? []).map((a) => ({
        type: "audit",
        created_at: a.changed_at,
        message: a.message,
        author: a.changed_by_name ?? "Usuario",
      }));

      const merged = [...auditItems, ...commentItems].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setTimeline(merged);

      if (!silent) {
        setLoadingComments(false);
        pushMsg("Historial cargado ✅");
      }
    },
    [memberNameById, pushMsg],
  );

  const refreshMembers = useCallback(
    async (cid?: string) => {
      const company = cid ?? companyId;
      if (!company) return;

      const { data, error } = await supabase
        .from("company_members")
        .select("user_id, role, full_name")
        .eq("company_id", company)
        .order("created_at", { ascending: true });

      if (error) {
        pushMsg(`Error cargando miembros: ${error.message}`);
        return;
      }

      const rows = (data ?? []) as CompanyMember[];
      setMembers(rows);
      await resolveMyRole(rows);
    },
    [companyId, resolveMyRole, pushMsg],
  );

  // ✅ refresh solo para carga inicial / refresh manual
  const refreshWorkOrders = useCallback(
    async (cid?: string, silent = false) => {
      if (!silent) {
        setLoadingWO(true);
        pushMsg("Cargando work orders...");
      }

      try {
        const company = cid ?? companyId;

        if (!company) {
          if (!silent) pushMsg("No hay companyId todavía (haz Sign in).");
          return;
        }

        const { data, error } = await supabase
          .from("work_orders")
          .select(
            "work_order_id, company_id, job_type, description, status, priority, scheduled_for, created_at, assigned_to, created_by",
          )
          .eq("company_id", company)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          if (!silent) pushMsg(`Error: ${error.message}`);
          return;
        }

        const rows = (data ?? []).map((row: any) => ({
          ...row,
          status: safeStatus(row.status),
        })) as WorkOrder[];

        setWorkOrders((prev) => {
          const prevKey = prev
            .map((w) => `${w.work_order_id}|${w.status}|${w.assigned_to ?? ""}`)
            .join(",");
          const nextKey = rows
            .map((w) => `${w.work_order_id}|${w.status}|${w.assigned_to ?? ""}`)
            .join(",");
          return prevKey === nextKey ? prev : rows;
        });
      } finally {
        if (!silent) setLoadingWO(false);
      }
    },
    [companyId, pushMsg],
  );

  // ✅ Realtime reducer (SIN refresh masivo)
  const handleRealtimeUpdate = useCallback((payload: any) => {
    setWorkOrders((prev) => {
      const newRow = payload.new as any;
      const oldRow = payload.old as any;

      if (payload.eventType === "INSERT" && newRow) {
        const created: WorkOrder = {
          ...newRow,
          status: safeStatus(newRow.status),
        };
        if (prev.some((w) => w.work_order_id === created.work_order_id))
          return prev;
        return [created, ...prev].slice(0, 25);
      }

      if (payload.eventType === "UPDATE" && newRow) {
        const updated: WorkOrder = {
          ...newRow,
          status: safeStatus(newRow.status),
        };
        return prev.map((w) =>
          w.work_order_id === updated.work_order_id ? { ...w, ...updated } : w,
        );
      }

      if (payload.eventType === "DELETE" && oldRow) {
        return prev.filter((w) => w.work_order_id !== oldRow.work_order_id);
      }

      return prev;
    });
  }, []);

  const manualRefresh = useCallback(async () => {
    setRefreshBtnLoading(true);
    try {
      const cid = companyId ?? (await ensureCompany());
      if (!cid) return;

      await refreshMembers(cid);
      await refreshWorkOrders(cid, false);
      pushMsg("Refrescado ✅");
    } finally {
      setRefreshBtnLoading(false);
    }
  }, [companyId, ensureCompany, refreshMembers, refreshWorkOrders, pushMsg]);

  const signIn = async () => {
    pushMsg("Ingresando...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      pushMsg(`Error login: ${error.message}`);
      return;
    }

    pushMsg("Login OK ✅");
    await refreshMyCompanies();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setWorkOrders([]);
    setSelectedWorkOrderId(null);
    setSelectedWorkOrderSnapshot(null);
    setTimeline([]);
    setCommentText("");
    pushMsg("Sesión cerrada");
  };

  const createWorkOrder = async () => {
    if (!companyId) return pushMsg("No hay companyId. Haz Sign in de nuevo.");

    pushMsg("Creando work order...");

    const payload = {
      company_id: companyId,
      job_type: jobType,
      description,
      status: "new" as WorkOrderStatus,
      priority,
      scheduled_for: scheduledFor.trim() ? scheduledFor : null,
      assigned_to: assigneeId,
    };

    const { data, error } = await supabase
      .from("work_orders")
      .insert([payload])
      .select(
        "work_order_id, company_id, job_type, description, status, priority, scheduled_for, created_at, assigned_to, created_by",
      )
      .single();

    if (error) return pushMsg(`Error: ${error.message}`);
    if (!data) return pushMsg("Error: No se recibió data.");

    const created: WorkOrder = {
      ...data,
      status: safeStatus((data as any).status),
    };

    setWorkOrders((prev) => [created, ...prev].slice(0, 100));
    pushMsg("Work order creada ✅");

    setSelectedWorkOrderId(created.work_order_id);
    setSelectedWorkOrderSnapshot(created);
    setTimeline([]);
    setCommentText("");
    await refreshTimeline(created.work_order_id);
  };

  const saveAssignment = useCallback(
    async (workOrderId: string) => {
      if (!isAdmin) {
        pushMsg("No tienes permisos para asignar.");
        return;
      }

      const newAssignee = assignDraft[workOrderId] ?? "";
      const assigned_to = newAssignee === "" ? null : newAssignee;

      try {
        setAssignSaving((s) => ({ ...s, [workOrderId]: true }));

        const { error } = await supabase
          .from("work_orders")
          .update({ assigned_to })
          .eq("work_order_id", workOrderId);

        if (error) {
          pushMsg(`No se pudo asignar: ${error.message}`);
          return;
        }

        pushMsg("Asignación actualizada ✅");

        setAssignDraft((d) => {
          const copy = { ...d };
          delete copy[workOrderId];
          return copy;
        });

        if (selectedWorkOrderIdRef.current === workOrderId) {
          await refreshTimeline(workOrderId, { silent: true });
        }
      } finally {
        setAssignSaving((s) => ({ ...s, [workOrderId]: false }));
      }
    },
    [assignDraft, isAdmin, pushMsg, refreshTimeline],
  );

  const updateStatus = useCallback(
    async (id: string, status: WorkOrderStatus) => {
      pushMsg(`Actualizando estado: ${status}...`);

      const { error } = await supabase
        .from("work_orders")
        .update({ status })
        .eq("work_order_id", id);

      if (error) {
        console.log("❌ updateStatus error:", error);
        pushMsg(`❌ No dejó cambiar status: ${error.message}`);
        return;
      }

      setWorkOrders((prev) =>
        prev.map((w) => (w.work_order_id === id ? { ...w, status } : w)),
      );

      pushMsg("Estado actualizado ✅");

      if (selectedWorkOrderIdRef.current === id) {
        await refreshTimeline(id, { silent: true });
      }
    },
    [pushMsg, refreshTimeline],
  );

  const deleteComment = async (commentId: string) => {
    if (!confirm("¿Seguro que quieres borrar este comentario?")) return;

    const { error } = await supabase
      .from("work_order_comments")
      .delete()
      .eq("comment_id", commentId);

    if (error) {
      console.log("❌ deleteComment error:", error);
      pushMsg(`❌ No se pudo borrar: ${error.message}`);
      return;
    }

    pushMsg("Comentario borrado ✅");

    if (selectedWorkOrderIdRef.current) {
      await refreshTimeline(selectedWorkOrderIdRef.current, { silent: true });
    }
  };

  const selectWorkOrder = useCallback(
    async (workOrderId: string) => {
      pushMsg(`Seleccionada WO: ${workOrderId.slice(0, 8)}...`);

      setSelectedWorkOrderId(workOrderId);

      const wo =
        workOrders.find((w) => w.work_order_id === workOrderId) ?? null;
      setSelectedWorkOrderSnapshot(wo);

      setCommentText("");
      setTimeline([]);

      await refreshTimeline(workOrderId);
    },
    [pushMsg, refreshTimeline, workOrders],
  );

  const addComment = async () => {
    const wid = selectedWorkOrderIdRef.current;
    if (!wid) return pushMsg("Selecciona una work order primero.");
    if (!commentText.trim()) return pushMsg("Escribe un comentario.");

    pushMsg("Guardando comentario...");

    const payload = {
      work_order_id: wid,
      comment: commentText.trim(),
    };

    const { data, error } = await supabase
      .from("work_order_comments")
      .insert([payload])
      .select("comment_id")
      .single();

    if (error) return pushMsg(`Error: ${error.message}`);
    if (!data) return pushMsg("Error: No se recibió data.");

    setCommentText("");
    pushMsg("Comentario agregado ✅");

    await refreshTimeline(wid, { silent: true });
  };

  // ✅ Realtime work_orders (robusto + reintenta hasta que haya session)
  useEffect(() => {
    if (!companyId) return;

    let channel: any = null;
    let timer: any = null;
    let cancelled = false;

    const setupRealtime = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Si aún no hay sesión, reintenta en 300ms
      if (!session) {
        console.log("⏳ Waiting for session to start realtime...");
        if (!cancelled) timer = setTimeout(setupRealtime, 300);
        return;
      }

      if (cancelled) return;

      channel = supabase
        .channel(`work_orders:${companyId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "work_orders",
            filter: `company_id=eq.${companyId}`,
          },
          (payload) => {
            console.log("🔥 RT work_orders:", payload.eventType);
            handleRealtimeUpdate(payload);

            if (
              payload.eventType === "UPDATE" &&
              payload.new?.work_order_id &&
              selectedWorkOrderIdRef.current === payload.new.work_order_id
            ) {
              refreshTimeline(payload.new.work_order_id, { silent: true });
            }
          },
        )
        .subscribe((status) => {
          console.log("✅ Realtime status (work_orders):", status);
        });
    };

    setupRealtime();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [companyId, handleRealtimeUpdate, refreshTimeline]);

  // ✅ Realtime: cuando una WO se asigna a este TECH (soluciona “primera vez no aparece”)
  useEffect(() => {
    if (!companyId || !myUserId) return;

    let channel: any;

    const start = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.log("⛔ No session yet, assigned realtime not starting");
        return;
      }

      channel = supabase
        .channel(`work_orders_assigned:${companyId}:${myUserId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "work_orders",
            // OJO: este filtro hace que al TECH le llegue cuando assigned_to = miUserId
            filter: `assigned_to=eq.${myUserId}`,
          },
          async (payload: any) => {
            const newRow = payload?.new as Partial<WorkOrder> | null;
            const oldRow = payload?.old as Partial<WorkOrder> | null;

            // (Opcional) seguridad multi-company
            const rowCompanyId = (newRow?.company_id ?? oldRow?.company_id) as
              | string
              | null
              | undefined;
            if (rowCompanyId && rowCompanyId !== companyId) return;

            console.log("🎯 RT assigned_to_me:", payload.eventType);

            // ✅ Actualiza tu state local
            handleRealtimeUpdate(payload);

            // ✅ IMPORTANTÍSIMO: si era la primera vez y no estaba en la lista (por LIMIT 25 / RLS / etc)
            // hacemos un refresh silencioso para que aparezca sin que el tech tenga que “Refresh manual”.
            await refreshWorkOrders(companyId, true);
          },
        )
        .subscribe((status: any) => {
          console.log("Assigned channel status:", status);
        });
    };

    start();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [companyId, myUserId, handleRealtimeUpdate, refreshWorkOrders]);

  // ✅ Cambio de company: SOLO depende de activeCompanyId (CRÍTICO)
  useEffect(() => {
    if (!activeCompanyId) return;

    setSelectedWorkOrderId(null);
    setSelectedWorkOrderSnapshot(null);
    setTimeline([]);
    setCommentText("");

    localStorage.setItem("activeCompanyId", activeCompanyId);
    setCompanyId(activeCompanyId);

    refreshMembers(activeCompanyId);
    refreshWorkOrders(activeCompanyId, false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  // ========================= UI =========================
  return (
    <main
      style={{ maxWidth: 980, margin: "40px auto", fontFamily: "system-ui" }}
    >
      <h1>ManosRemotas – Work Orders MVP</h1>

      <section
        style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}
      >
        <h2>Auth</h2>

        <label>Email</label>
        <input
          style={{ width: "100%" }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Password</label>
        <input
          style={{ width: "100%" }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div
          style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}
        >
          <button onClick={signIn}>Sign in</button>
          <button onClick={signOut}>Sign out</button>
          <button onClick={manualRefresh} disabled={refreshBtnLoading}>
            {refreshBtnLoading ? "Refrescando..." : "Refresh (manual)"}
          </button>
        </div>

        {myCompanies.length > 1 && (
          <div style={{ marginTop: 10 }}>
            <label>Company activa</label>
            <select
              style={{ width: "100%" }}
              value={activeCompanyId ?? ""}
              onChange={(e) => setActiveCompanyId(e.target.value)}
            >
              {myCompanies.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.company_name} ({c.role})
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          Members cargados: {members.length} · Techs: {techMembers.length}
        </div>

        <button
          style={{ marginTop: 10 }}
          onClick={async () => {
            pushMsg("Probando timeline (RLS)...");
            const workOrderId = "090764c0-1315-4545-86dd-a5ab6342cd44";

            const { data, error } = await supabase
              .from("v_work_order_audit_timeline")
              .select("changed_at_ui, changed_by_name, message, company_id")
              .eq("work_order_id", workOrderId)
              .order("changed_at", { ascending: false });

            if (error) {
              pushMsg(`❌ Timeline error: ${error.message}`);
              return;
            }

            setTimelineTest(data ?? []);
            pushMsg(`✅ Timeline OK: ${data?.length ?? 0} eventos`);
          }}
        >
          Probar Timeline (RLS)
        </button>

        {timelineTest.length > 0 && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              border: "1px solid #eee",
              borderRadius: 8,
            }}
          >
            <b>Timeline (preview)</b>
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              {timelineTest.map((t, idx) => (
                <div key={idx} style={{ fontSize: 13 }}>
                  <span style={{ opacity: 0.7 }}>{t.changed_at_ui}</span> ·{" "}
                  <b>{t.changed_by_name}</b> · {t.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        {/* Crear Work Order */}
        {isAdmin ? (
          <section
            style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}
          >
            <h2>Crear Work Order</h2>

            <label>Job type</label>
            <input
              style={{ width: "100%" }}
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
            />

            <label>Description</label>
            <textarea
              style={{ width: "100%" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <label>Priority</label>
            <select
              style={{ width: "100%" }}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">low</option>
              <option value="normal">normal</option>
              <option value="high">high</option>
              <option value="urgent">urgent</option>
            </select>

            <label>Asignar a (opcional)</label>
            <select
              style={{ width: "100%" }}
              value={assigneeId ?? ""}
              onChange={(e) =>
                setAssigneeId(e.target.value ? e.target.value : null)
              }
            >
              <option value="">(sin asignar)</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name ?? m.user_id.slice(0, 8)} ({m.role})
                </option>
              ))}
            </select>

            <label>Scheduled for (opcional)</label>
            <input
              style={{ width: "100%" }}
              placeholder="2026-02-10T21:30"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />

            <button style={{ marginTop: 10 }} onClick={createWorkOrder}>
              Create Work Order
            </button>
          </section>
        ) : (
          <section
            style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}
          >
            <h2>Crear Work Order</h2>
            <p style={{ marginTop: 8 }}>
              No tienes permisos para crear órdenes. (Rol: {myRole ?? "—"})
            </p>
          </section>
        )}

        {/* Historial / Comentarios */}
        <section
          style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}
        >
          <h2>Comentarios / Historial</h2>

          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
            Debug selectedWorkOrderId: <b>{selectedWorkOrderId ?? "null"}</b> ·
            selectedWorkOrder:{" "}
            <b>{selectedWorkOrder?.work_order_id ?? "null"}</b>
          </div>

          {!selectedWorkOrder ? (
            <p style={{ marginTop: 6 }}>
              Selecciona una Work Order del listado para ver / agregar
              comentarios.
            </p>
          ) : (
            <>
              <div
                style={{
                  padding: 10,
                  border: "1px solid #eee",
                  borderRadius: 8,
                }}
              >
                <b>{selectedWorkOrder.job_type}</b>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 6,
                  }}
                >
                  <small>
                    <b>Status:</b> {statusLabel(selectedWorkOrder.status)}
                  </small>
                  <small>
                    <b>Priority:</b> {selectedWorkOrder.priority ?? "-"}
                  </small>
                </div>
              </div>

              <label style={{ marginTop: 10, display: "block" }}>
                Nuevo comentario
              </label>
              <textarea
                style={{ width: "100%" }}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Ej: Llegué al sitio, revisé el panel, encontré..."
              />

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                <button onClick={addComment}>Add comment</button>
                <button
                  onClick={() =>
                    refreshTimeline(selectedWorkOrderId!, { silent: false })
                  }
                  disabled={loadingComments}
                >
                  {loadingComments ? "Loading..." : "Refresh historial"}
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                <h3 style={{ margin: "10px 0" }}>
                  Historial (cambios + comentarios)
                </h3>
                {/* DEBUG temporal */}
                <div style={{ fontSize: 12, opacity: 0.7 }}></div>
                {loadingComments ? (
                  <p>Cargando...</p>
                ) : timeline.length === 0 ? (
                  <p>No hay historial todavía.</p>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {timeline.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 10,
                          border: "1px solid #eee",
                          borderRadius: 8,
                          background:
                            item.type === "audit" ? "#fafafa" : "white",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>
                              <b>{item.author}</b> ·{" "}
                              {item.created_at
                                ? new Date(item.created_at).toLocaleString()
                                : ""}
                              {item.type === "audit"
                                ? " · cambio"
                                : " · comentario"}
                            </div>

                            <div style={{ marginTop: 6 }}>
                              {item.type === "audit" ? (
                                <b>{item.message}</b>
                              ) : (
                                item.message
                              )}
                            </div>
                            {/* DEBUG TEMPORAL */}
                          </div>

                          {/* 🗑️ SOLO admin/owner y SOLO comentario */}
                          {isAdmin &&
                            item.type !== "audit" &&
                            item.comment_id && (
                              <button
                                onClick={() => deleteComment(item.comment_id!)}
                                title="Borrar comentario"
                                style={{
                                  border: "1px solid #ddd",
                                  background: "white",
                                  borderRadius: 8,
                                  padding: "6px 8px",
                                  cursor: "pointer",
                                }}
                              >
                                🗑️
                              </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Listado */}
      <section
        style={{
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 8,
          marginTop: 16,
        }}
      >
        <h2>Listado</h2>

        <div
          style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
        >
          <button
            onClick={() => setWoFilter("all")}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: woFilter === "all" ? "#111" : "#fff",
              color: woFilter === "all" ? "#fff" : "#111",
            }}
          >
            Todas
          </button>

          <button
            onClick={() => setWoFilter("mine")}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: woFilter === "mine" ? "#111" : "#fff",
              color: woFilter === "mine" ? "#fff" : "#111",
            }}
          >
            Mis órdenes
          </button>

          {isAdmin && (
            <button
              onClick={() => setWoFilter("unassigned")}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: woFilter === "unassigned" ? "#111" : "#fff",
                color: woFilter === "unassigned" ? "#fff" : "#111",
              }}
            >
              Sin asignar
            </button>
          )}

          <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>
            Mostrando: {filteredWorkOrders.length}
          </div>
        </div>

        {filteredWorkOrders.length === 0 ? (
          <p>No hay work orders todavía.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filteredWorkOrders.map((w) => {
              const isSelected = w.work_order_id === selectedWorkOrderId;

              return (
                <div
                  key={w.work_order_id}
                  onClick={() => selectWorkOrder(w.work_order_id)}
                  style={{
                    padding: 12,
                    border: isSelected ? "2px solid #111" : "1px solid #eee",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <b>{w.job_type}</b>
                    <span style={statusBadgeStyle(w.status)}>
                      {statusLabel(w.status)}
                    </span>
                  </div>

                  {isAdmin && (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 12, opacity: 0.8 }}>
                        Asignar a:
                      </span>

                      <select
                        onClick={(e) => e.stopPropagation()}
                        value={
                          assignDraft[w.work_order_id] ?? w.assigned_to ?? ""
                        }
                        onChange={(e) =>
                          setAssignDraft((prev) => ({
                            ...prev,
                            [w.work_order_id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">(sin asignar)</option>
                        {techMembers.map((t) => (
                          <option key={t.user_id} value={t.user_id}>
                            {(t.full_name && t.full_name.trim()) ||
                              t.user_id.slice(0, 8)}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveAssignment(w.work_order_id);
                        }}
                        disabled={!!assignSaving[w.work_order_id]}
                      >
                        {assignSaving[w.work_order_id]
                          ? "Procesando..."
                          : w.assigned_to
                            ? "Reasignar"
                            : "Asignar"}
                      </button>

                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        Actual:{" "}
                        {w.assigned_to
                          ? (memberNameById.get(w.assigned_to) ??
                            w.assigned_to.slice(0, 8))
                          : "—"}
                      </span>
                    </div>
                  )}

                  {w.description ? (
                    <p style={{ marginTop: 6 }}>{w.description}</p>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      marginTop: 6,
                    }}
                  >
                    <small>
                      <b>Priority:</b> {w.priority ?? "-"}
                    </small>
                    <small>
                      <b>Scheduled:</b>{" "}
                      {w.scheduled_for
                        ? new Date(w.scheduled_for).toLocaleString()
                        : "-"}
                    </small>
                    <small>
                      <b>Created:</b>{" "}
                      {w.created_at
                        ? new Date(w.created_at).toLocaleString()
                        : "-"}
                    </small>
                    <small>
                      <b>Asignado a:</b>{" "}
                      {w.assigned_to
                        ? (memberNameById.get(w.assigned_to) ??
                          w.assigned_to.slice(0, 8))
                        : "⚠️ Sin asignar"}
                    </small>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {canEditThisWO(w) ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(w.work_order_id, "new");
                          }}
                        >
                          Nuevo
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(w.work_order_id, "in_progress");
                          }}
                        >
                          En proceso
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(w.work_order_id, "resolved");
                          }}
                        >
                          Resuelto
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(w.work_order_id, "closed");
                          }}
                        >
                          Cerrado
                        </button>
                      </>
                    ) : (
                      <small style={{ opacity: 0.7, alignSelf: "center" }}>
                        Sin permisos para cambiar estado
                      </small>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectWorkOrder(w.work_order_id);
                      }}
                    >
                      {isSelected ? "Viendo historial ✅" : "Ver historial"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateInvoice(w.work_order_id);
                      }}
                    >
                      Crear invoice
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p style={{ marginTop: 14 }}>
        <b>Status:</b> {loadingWO ? "Cargando work orders..." : msg}
      </p>
      {invoiceMsg ? (
        <p style={{ marginTop: 8 }}>
          <b>Invoice:</b> {invoiceMsg}
        </p>
      ) : null}
      <div style={{ marginTop: 10, fontSize: 12 }}>
        <b>Log:</b>
        <div style={{ display: "grid", gap: 4, marginTop: 6 }}>
          {msgLog.map((m, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #eee",
                padding: 6,
                borderRadius: 6,
                background: "#fafafa",
              }}
            >
              {m}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
