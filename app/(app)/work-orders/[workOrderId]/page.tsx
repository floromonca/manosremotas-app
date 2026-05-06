"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import {
    safeStatus,
    setWorkOrderStatus,
    type WorkOrderStatus,
} from "../../../../lib/supabase/workOrders";
import { useAuthState } from "../../../../hooks/useAuthState";
import { useActiveCompany } from "../../../../hooks/useActiveCompany";
import { createInvoiceFromWorkOrder } from "../../../../lib/invoices";
import WorkOrderCustomerSection from "../components/WorkOrderCustomerSection";
import WorkOrderSummarySection from "../components/WorkOrderSummarySection";
import WorkOrderItemsHeader from "../components/WorkOrderItemsHeader";
import WorkOrderNewItemForm from "../components/WorkOrderNewItemForm";
import WorkOrderItemsTable from "../components/WorkOrderItemsTable";
import { MR_THEME } from "../../../../lib/theme";
import {
    allowedStatusesForRole,
    canChangeWorkOrderStatus,
} from "../../../../lib/work-orders/policies";
import WorkOrderDetailHeader from "../components/WorkOrderDetailHeader";
import WorkOrderPhotosSection from "../components/WorkOrderPhotosSection";
import WorkOrderSiteReportSection from "../components/WorkOrderSiteReportSection";
import PhotoPreviewModal from "../components/PhotoPreviewModal";
import WorkOrderCheckInsSection from "../components/WorkOrderCheckInsSection";
import WorkOrderCheckInBar from "../components/WorkOrderCheckInBar";
import { useWorkOrderPhotos } from "../hooks/useWorkOrderPhotos";

type WorkOrder = {
    work_order_id: string;
    company_id: string | null;
    job_type: string;
    description: string;
    status: WorkOrderStatus;
    priority: string;
    scheduled_for: string | null;
    created_at: string;
    assigned_to: string | null;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    service_address?: string | null;
    customer_id?: string | null;
    location_id?: string | null;
    invoice_id?: string | null;
    site_report?: string | null;
};

type WorkOrderItem = {
    item_id: string;
    description: string | null;

    quantity: number | null;

    qty_planned: number | null;
    qty_done: number | null;

    unit_price: number | null;
    taxable: boolean | null;

    pending_pricing?: boolean | null;
    pricing_status?: string | null;
    tech_note?: string | null;
    uom: string | null;
};

type WorkOrderCheckIn = {
    check_in_id: string;
    check_in_at: string;
    check_out_at?: string | null;
    geofence_status?: string | null;
    policy_applied?: string | null;
    distance_to_site_m?: number | null;
    location_verified?: boolean | null;
    user_id?: string | null;
};


function normalizeInvoiceStatus(status: string | null | undefined) {
    return String(status ?? "").trim().toLowerCase();
}

function prettyInvoiceStatus(status: string | null | undefined) {
    const s = normalizeInvoiceStatus(status);
    if (!s) return "—";
    return s.replaceAll("_", " ").toUpperCase();
}

function invoiceBadgeStyle(status: string | null | undefined): React.CSSProperties {
    const s = normalizeInvoiceStatus(status);

    if (s === "draft") {
        return {
            background: "#e5e7eb",
            color: "#374151",
            border: "1px solid #d1d5db",
        };
    }

    if (s === "sent") {
        return {
            background: "#dbeafe",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
        };
    }

    if (s === "partially_paid") {
        return {
            background: "#fef3c7",
            color: "#b45309",
            border: "1px solid #fde68a",
        };
    }

    if (s === "paid") {
        return {
            background: "#dcfce7",
            color: "#166534",
            border: "1px solid #bbf7d0",
        };
    }

    if (s === "overdue") {
        return {
            background: "#fee2e2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
        };
    }

    return {
        background: "#f3f4f6",
        color: "#111827",
        border: "1px solid #e5e7eb",
    };
}

export default function WorkOrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const workOrderId = typeof params?.workOrderId === "string" ? params.workOrderId : "";

    const { user } = useAuthState();
    const myUserId = user?.id ?? null;

    const { companyId: activeCompanyId } = useActiveCompany();

    const [roleLoading, setRoleLoading] = useState(false);
    const [myRole, setMyRole] = useState<"owner" | "admin" | "tech" | "viewer" | null>(null);
    const [canOperate, setCanOperate] = useState(false);
    const [shiftLoading, setShiftLoading] = useState(false);
    const isAdmin = myRole === "owner" || myRole === "admin";
    const [wo, setWo] = useState<WorkOrder | null>(null);
    const [checkIns, setCheckIns] = useState<WorkOrderCheckIn[]>([]);
    const {
        photos,
        setPhotos,
        activePhotoTab,
        setActivePhotoTab,
        selectedPhotoId,
        setSelectedPhotoId,
        selectedPhoto,
        selectedPhotoGroup,
        selectedPhotoIndex,
        uploadingPhoto,
        photoError,
        setPhotoError,
        loadPhotos,
        handlePhotoUpload,
        handleDeletePhoto,
        closePhotoPreview,
        showPreviousPhoto,
        showNextPhoto,
        handlePhotoTouchStart,
        handlePhotoTouchMove,
        handlePhotoTouchEnd,
    } = useWorkOrderPhotos({
        workOrderId,
        activeCompanyId,
        userId: user?.id ?? null,
    });

    const woRef = useRef<WorkOrder | null>(null);
    const [assignedTechName, setAssignedTechName] = useState<string | null>(null);
    const [techMembers, setTechMembers] = useState<
        { user_id: string; full_name: string | null }[]
    >([]);

    useEffect(() => {
        if (!selectedPhoto) return;

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                e.preventDefault();
                closePhotoPreview();
                return;
            }

            if (e.key === "ArrowLeft") {
                e.preventDefault();
                showPreviousPhoto();
                return;
            }

            if (e.key === "ArrowRight") {
                e.preventDefault();
                showNextPhoto();
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedPhoto, selectedPhotoIndex, selectedPhotoGroup.length, showPreviousPhoto, showNextPhoto, closePhotoPreview]);


    useEffect(() => {
        woRef.current = wo;
    }, [wo]);

    const [items, setItems] = useState<WorkOrderItem[]>([]);
    const [siteReportDraft, setSiteReportDraft] = useState("");
    const [savingSiteReport, setSavingSiteReport] = useState(false);
    const [siteReportSavedAt, setSiteReportSavedAt] = useState<number | null>(null);
    const anyPendingPricing = items.some(
        (it) => it.pending_pricing === true || it.pricing_status === "pending_pricing"
    );
    const [invoiceStatus, setInvoiceStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [savingItem, setSavingItem] = useState(false);
    const [syncingInvoice, setSyncingInvoice] = useState(false);
    const [savingCustomer, setSavingCustomer] = useState(false);
    const [customerForm, setCustomerForm] = useState({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        service_address: "",
    });
    const [priceDraft, setPriceDraft] = useState<Record<string, number>>({});
    const [savingPrice, setSavingPrice] = useState<Record<string, boolean>>({});
    const [newItem, setNewItem] = useState({
        description: "",
        quantity: 1,
        unit_price: 0,
        taxable: true,
        catalog_item_id: null as string | null,
        uom: null as string | null,
    });
    const invoiceStatusNormalized = useMemo(
        () => normalizeInvoiceStatus(invoiceStatus),
        [invoiceStatus]
    );
    const hasInvoice = !!wo?.invoice_id;
    const invoiceIsDraft = hasInvoice && invoiceStatusNormalized === "draft";
    const invoiceIsLocked = hasInvoice && invoiceStatusNormalized !== "" && invoiceStatusNormalized !== "draft";
    const loadRole = useCallback(async () => {
        if (!activeCompanyId || !myUserId) return;
        setRoleLoading(true);
        try {
            const { data, error } = await supabase
                .from("company_members")
                .select("role")
                .eq("company_id", activeCompanyId)
                .eq("user_id", myUserId)
                .maybeSingle();

            if (error) {
                console.log("DEBUG role load error:", error);
                setMyRole(null);
                return;
            }
            setMyRole(data?.role ?? null);
        } finally {
            setRoleLoading(false);
        }
    }, [activeCompanyId, myUserId]);
    const loadTechMembers = useCallback(async () => {
        if (!activeCompanyId) return;

        const { data, error } = await supabase
            .from("company_members")
            .select("user_id, full_name, role")
            .eq("company_id", activeCompanyId)
            .in("role", ["tech", "admin", "owner"]);

        if (error) {
            console.log("Error loading tech members:", error);
            return;
        }

        setTechMembers(data ?? []);
    }, [activeCompanyId]);

    useEffect(() => {
        loadTechMembers();
    }, [loadTechMembers]);
    const loadOperateState = useCallback(async () => {
        if (!activeCompanyId || !myUserId) {
            setCanOperate(false);
            return;
        }

        setShiftLoading(true);
        try {
            const { data, error } = await supabase
                .from("shifts")
                .select("shift_id")
                .eq("company_id", activeCompanyId)
                .eq("user_id", myUserId)
                .is("check_out_at", null)
                .maybeSingle();

            if (error) {
                console.log("DEBUG loadOperateState error:", error);
                setCanOperate(false);
                return;
            }

            setCanOperate(!!data?.shift_id);
        } finally {
            setShiftLoading(false);
        }
    }, [activeCompanyId, myUserId]);

    const loadInvoiceStatus = useCallback(async (invoiceId: string | null | undefined) => {
        if (!invoiceId) {
            setInvoiceStatus(null);
            return;
        }

        const { data, error } = await supabase
            .from("invoices")
            .select("status")
            .eq("invoice_id", invoiceId)
            .maybeSingle();

        if (error) {
            console.log("⚠️ No pude leer invoice status:", error.message);
            setInvoiceStatus(null);
            return;
        }

        setInvoiceStatus(data?.status ?? null);
    }, []);

    const loadItemsForWorkOrder = useCallback(async () => {
        if (!workOrderId) return [] as WorkOrderItem[];

        const { data, error } = await supabase
            .from("work_order_items")
            .select(
                "item_id, description, quantity, qty_planned, qty_done, tech_note, unit_price, uom, taxable, pending_pricing, pricing_status"
            )
            .eq("work_order_id", workOrderId)
            .order("created_at", { ascending: true });

        if (error) throw error;

        return (data ?? []) as WorkOrderItem[];
    }, [workOrderId]);

    const loadCheckIns = useCallback(async () => {
        if (!workOrderId) return [];

        const { data, error } = await supabase
            .from("work_order_check_ins")
            .select(
                "check_in_id, check_in_at, check_out_at, geofence_status, policy_applied, distance_to_site_m, location_verified, user_id"
            )
            .eq("work_order_id", workOrderId)
            .order("check_in_at", { ascending: false });

        if (error) throw error;

        return (data ?? []) as WorkOrderCheckIn[];
    }, [workOrderId]);

    const syncDraftInvoiceIfNeeded = useCallback(async () => {
        const currentInvoiceId = woRef.current?.invoice_id;

        if (!currentInvoiceId) return;

        const { data: invRow, error: invErr } = await supabase
            .from("invoices")
            .select("status")
            .eq("invoice_id", currentInvoiceId)
            .maybeSingle();

        if (invErr) {
            console.log("⚠️ No pude validar invoice antes de auto-sync:", invErr.message);
            return;
        }

        const currentInvoiceStatus = normalizeInvoiceStatus(invRow?.status);

        if (currentInvoiceStatus !== "draft") {
            console.log("ℹ️ Auto-sync omitido: invoice no está en draft.");
            return;
        }

        try {
            await createInvoiceFromWorkOrder(workOrderId);
            await loadInvoiceStatus(currentInvoiceId);
        } catch (syncErr: unknown) {
            console.log(
                "⚠️ Auto-sync invoice falló:",
                syncErr instanceof Error ? syncErr.message : syncErr
            );
        }
    }, [workOrderId, loadInvoiceStatus]);

    const onSyncInvoice = useCallback(async () => {
        if (!workOrderId) return;
        if (syncingInvoice) return;

        if (anyPendingPricing) {
            alert("There are items in pending pricing. Approve them before syncing the invoice.");
            return;
        }

        const billableTotal = items.reduce((acc, it) => {
            const qtyDone = Number(it.qty_done ?? 0);
            const qtyPlanned = Number(it.qty_planned ?? 0);
            const qty = qtyDone > 0 ? qtyDone : qtyPlanned;
            const price = Number(it.unit_price ?? 0);
            return acc + qty * price;
        }, 0);

        if (billableTotal <= 0) {
            alert("This work order has no billable amount yet. Add approved items or priced extras before generating an invoice.");
            return;
        }

        const hasZeroPriceItems = items.some((it) => Number(it.unit_price ?? 0) === 0);

        if (hasZeroPriceItems) {
            const confirmed = window.confirm(
                "This work order contains one or more items with a unit price of $0. Are you sure you want to generate the invoice?"
            );

            if (!confirmed) return;
        }

        if (hasInvoice && !invoiceIsDraft) {
            alert(`The linked invoice is in ${prettyInvoiceStatus(invoiceStatus)} status and can no longer be synced.`);
            return;
        }

        setSyncingInvoice(true);
        try {
            const invoiceId = await createInvoiceFromWorkOrder(workOrderId);
            await loadInvoiceStatus(invoiceId);
            router.push(`/invoices/${invoiceId}`);
        } catch (e: unknown) {
            console.log("❌ Sync Invoice failed:", e instanceof Error ? e.message : e);
            alert(`Sync Invoice failed: ${e instanceof Error ? e.message : e}`);
        } finally {
            setSyncingInvoice(false);
        }
    }, [
        workOrderId,
        anyPendingPricing,
        items,
        syncingInvoice,
        router,
        hasInvoice,
        invoiceIsDraft,
        invoiceStatus,
        prettyInvoiceStatus,
        loadInvoiceStatus,
    ]);

    const loadWorkOrder = useCallback(async () => {
        if (!workOrderId) return;

        setLoading(true);
        setErr("");

        try {
            const { data, error } = await supabase
                .from("work_orders")
                .select(
                    "work_order_id, company_id, customer_id, location_id, job_type, description, site_report, status, priority, scheduled_for, created_at, assigned_to, customer_name, customer_email, customer_phone, service_address, invoice_id"
                )
                .eq("work_order_id", workOrderId)
                .single();

            if (error) throw error;

            const mapped = {
                ...data,
                status: safeStatus(data?.status),
            } as WorkOrder;

            setWo(mapped);
            setSiteReportDraft(mapped.site_report ?? "");

            console.log("DEBUG assigned tech input", {
                assigned_to: mapped.assigned_to,
                company_id: mapped.company_id,
            });

            if (mapped.assigned_to && mapped.company_id) {
                const { data: memberRow, error: memberErr } = await supabase
                    .from("company_members")
                    .select("full_name")
                    .eq("company_id", mapped.company_id)
                    .eq("user_id", mapped.assigned_to)
                    .maybeSingle();

                console.log("DEBUG member lookup", {
                    memberRow,
                    memberErr,
                });

                if (!memberErr) {
                    const fullName = memberRow?.full_name?.trim?.() || null;
                    setAssignedTechName(fullName || mapped.assigned_to.slice(0, 8));
                } else {
                    setAssignedTechName(mapped.assigned_to.slice(0, 8));
                }
            } else {
                setAssignedTechName(null);
            }
            setCustomerForm({
                customer_name: mapped.customer_name ?? "",
                customer_email: mapped.customer_email ?? "",
                customer_phone: mapped.customer_phone ?? "",
                service_address: mapped.service_address ?? "",
            });

            await loadInvoiceStatus(mapped.invoice_id);

            const itemRows = await loadItemsForWorkOrder();
            setItems(itemRows);

            const checkInRows = await loadCheckIns();
            setCheckIns(checkInRows);
            const photoRows = await loadPhotos();
            setPhotos(photoRows);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Error loading work order");
            setWo(null);
            setItems([]);
            setCheckIns([]);
            setPhotos([]);
            setInvoiceStatus(null);
            setAssignedTechName(null);
        } finally {
            setLoading(false);
        }
    }, [workOrderId, loadInvoiceStatus, loadItemsForWorkOrder, loadCheckIns, loadPhotos, setPhotos]);

    useEffect(() => {
        loadRole();
    }, [loadRole]);
    useEffect(() => {
        loadOperateState();
    }, [loadOperateState]);

    useEffect(() => {
        const refreshOperateState = () => {
            loadOperateState();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                loadOperateState();
            }
        };

        window.addEventListener("focus", refreshOperateState);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("focus", refreshOperateState);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [loadOperateState]);

    useEffect(() => {
        loadWorkOrder();
    }, [loadWorkOrder]);

    const googleMapsUrl = useMemo(() => {
        const addr = wo?.service_address?.trim();
        if (!addr) return null;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    }, [wo?.service_address]);
    const saveSiteReport = useCallback(async () => {
        if (!workOrderId || !wo?.company_id) return;

        if (myRole !== "tech") {
            alert("Only the assigned technician can update the site report.");
            return;
        }

        setSavingSiteReport(true);

        try {
            const { error } = await supabase
                .from("work_orders")
                .update({
                    site_report: siteReportDraft.trim() || null,
                })
                .eq("work_order_id", workOrderId)
                .eq("company_id", wo.company_id);

            if (error) {
                alert("Could not save site report: " + error.message);
                return;
            }

            await loadWorkOrder();
            setSiteReportSavedAt(Date.now());
        } finally {
            setSavingSiteReport(false);
        }
    }, [workOrderId, wo?.company_id, myRole, siteReportDraft, loadWorkOrder]);
    const refreshItemsOnly = useCallback(async () => {
        if (!workOrderId) return;

        try {
            const itemRows = await loadItemsForWorkOrder();
            setItems(itemRows);

            if (woRef.current?.invoice_id) {
                await loadInvoiceStatus(woRef.current.invoice_id);
            }
        } catch (e: unknown) {
            alert(`No se pudieron recargar items: ${e instanceof Error ? e.message : e}`);
        }
    }, [workOrderId, loadItemsForWorkOrder, loadInvoiceStatus]);

    const updateQtyDone = useCallback(
        async (itemId: string, newQtyDone: number | null) => {
            const current = items.find((x) => x.item_id === itemId);

            const hasPlanned =
                current?.qty_planned !== null && current?.qty_planned !== undefined;

            const plan = hasPlanned ? Number(current?.qty_planned ?? 0) : null;

            if (!isAdmin && hasPlanned) {
                const n = newQtyDone === null ? 0 : Number(newQtyDone);

                if (Number.isFinite(n) && plan !== null && n > plan) {
                    alert(
                        `Este item es Planned (Plan=${plan}). Si hiciste más, crea un Extra para el excedente.`
                    );
                    return;
                }
            }

            const { error } = await supabase
                .from("work_order_items")
                .update({ qty_done: newQtyDone })
                .eq("item_id", itemId);

            if (error) {
                alert(`No se pudo guardar qty_done: ${error.message}`);
                return;
            }

            await refreshItemsOnly();

            await syncDraftInvoiceIfNeeded();
        },
        [items, isAdmin, refreshItemsOnly, syncDraftInvoiceIfNeeded]
    );
    const updateTechNote = useCallback(
        async (itemId: string, note: string) => {
            const { error } = await supabase
                .from("work_order_items")
                .update({ tech_note: note })
                .eq("item_id", itemId);

            if (error) {
                alert(`Could not save tech note: ${error.message}`);
                return;
            }

            await refreshItemsOnly();
        },
        [refreshItemsOnly]
    );
    const priceItem = useCallback(
        async (itemId: string) => {
            const newPrice = Number(priceDraft[itemId] ?? 0);

            setSavingPrice((s) => ({ ...s, [itemId]: true }));
            try {
                const { error } = await supabase
                    .from("work_order_items")
                    .update({
                        unit_price: newPrice,
                        taxable: true,
                        pending_pricing: false,
                        pricing_status: "priced",
                    })
                    .eq("item_id", itemId);

                if (error) {
                    alert(`No se pudo pricear: ${error.message}`);
                    return;
                }

                await syncDraftInvoiceIfNeeded();

                await refreshItemsOnly();

            } finally {
                setSavingPrice((s) => ({ ...s, [itemId]: false }));
            }
        },
        [priceDraft, refreshItemsOnly, syncDraftInvoiceIfNeeded]
    );

    const handleChangeStatus = useCallback(
        async (next: WorkOrderStatus) => {
            if (!wo) return;

            const canChange = canChangeWorkOrderStatus({
                userId: myUserId,
                isAdminOrOwner: isAdmin,
                role: myRole,
                canOperate: true,
                assignedTo: wo.assigned_to,
            });

            if (!canChange) {
                alert(
                    isAdmin
                        ? "No tienes permiso para cambiar esta Work Order."
                        : "Para cambiar status necesitas que la orden esté asignada a ti y cumplir las reglas operativas."
                );
                return;
            }

            const { error } = await setWorkOrderStatus(wo.work_order_id, next);

            if (error) {
                alert(`No se pudo cambiar status: ${error.message}`);
                return;
            }

            await loadWorkOrder();
        },
        [wo, myUserId, isAdmin, myRole, loadWorkOrder]
    );
    const handleAssignTech = useCallback(
        async (techId: string) => {
            if (!wo?.work_order_id) return;

            const { error } = await supabase
                .from("work_orders")
                .update({ assigned_to: techId })
                .eq("work_order_id", wo.work_order_id);

            if (error) {
                alert(`No se pudo asignar técnico: ${error.message}`);
                return;
            }

            await loadWorkOrder();
        },
        [wo?.work_order_id, loadWorkOrder]
    );
    const saveCustomerInfo = useCallback(async () => {
        if (!workOrderId) return;

        setSavingCustomer(true);
        try {
            const payload = {
                customer_name: customerForm.customer_name.trim() || null,
                customer_email: customerForm.customer_email.trim() || null,
                customer_phone: customerForm.customer_phone.trim() || null,
                service_address: customerForm.service_address.trim() || null,
            };

            const { error } = await supabase
                .from("work_orders")
                .update(payload)
                .eq("work_order_id", workOrderId);

            if (error) {
                alert("No se pudo guardar customer info: " + error.message);
                return;
            }

            await loadWorkOrder();
            alert("Customer info updated.");
        } finally {
            setSavingCustomer(false);
        }
    }, [workOrderId, customerForm, loadWorkOrder]);

    const totals = useMemo(() => {
        const sum = items.reduce((acc, it) => {
            const qtyPlannedRaw =
                it.qty_planned === null || it.qty_planned === undefined ? null : Number(it.qty_planned);

            const qtyDoneRaw =
                it.qty_done === null || it.qty_done === undefined ? null : Number(it.qty_done);

            const qtyToPrice =
                qtyPlannedRaw !== null
                    ? Number((qtyDoneRaw ?? qtyPlannedRaw) ?? 0)
                    : Number(qtyDoneRaw ?? 0);

            const unit = Number(it.unit_price ?? 0);
            return acc + qtyToPrice * unit;
        }, 0);

        return { sum };
    }, [items]);

    const onCreateItem = useCallback(async () => {
        setErr("");

        if (roleLoading) {
            setErr("Loading role... please try again in 1 second.");
            return;
        }

        if (!myRole) {
            setErr("No pude determinar tu rol (owner/admin/tech). Reintenta.");
            return;
        }

        const desc = String(newItem.description ?? "").trim();
        if (!desc) {
            setErr("Descripción requerida");
            return;
        }

        if (!wo?.company_id) {
            setErr("WO sin company_id (no puedo crear items)");
            return;
        }

        const qty = Number(newItem.quantity ?? 1);
        if (!Number.isFinite(qty) || qty <= 0) {
            setErr("La cantidad debe ser mayor a 0.");
            return;
        }

        setSavingItem(true);
        try {
            const base = {
                company_id: wo.company_id,
                work_order_id: workOrderId,
                item_type: "service",
                description: desc,
                catalog_item_id: newItem.catalog_item_id ?? null,
                uom: newItem.uom ?? null,
            };

            const payload = isAdmin
                ? {
                    ...base,
                    qty_planned: qty,
                    qty_done: null,
                    unit_price: Number(newItem.unit_price ?? 0),
                    taxable: Boolean(newItem.taxable ?? true),
                    pending_pricing: false,
                    pricing_status: "priced",
                }
                : {
                    ...base,
                    qty_planned: null,
                    qty_done: qty,
                    unit_price: 0,
                    taxable: true,
                    pending_pricing: true,
                    pricing_status: "pending_pricing",
                };

            const { error } = await supabase.from("work_order_items").insert(payload);
            if (error) throw error;

            await syncDraftInvoiceIfNeeded();

            await refreshItemsOnly();

            setNewItem({
                description: "",
                quantity: 1,
                unit_price: 0,
                taxable: true,
                catalog_item_id: null,
                uom: null,
            });
            setShowForm(false);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Error creando item");
        } finally {
            setSavingItem(false);
        }
    }, [roleLoading, myRole, newItem, wo, isAdmin, workOrderId, refreshItemsOnly, syncDraftInvoiceIfNeeded]);


    return (
        <div
            style={{
                background: MR_THEME.colors.appBg,
                minHeight: "100vh",
                width: "100%",
            }}
        >
            <div
                style={{
                    padding: "28px clamp(14px, 4vw, 24px) 40px",
                    maxWidth: 1180,
                    width: "100%",
                    margin: "0 auto",
                    boxSizing: "border-box",
                }}
            >
                <WorkOrderDetailHeader
                    workOrderId={workOrderId}
                    title={wo?.job_type ?? "Work Order"}
                    myRole={myRole}
                    invoiceId={wo?.invoice_id}
                    invoiceStatus={invoiceStatus}
                    isAdmin={isAdmin}
                    syncingInvoice={syncingInvoice}
                    anyPendingPricing={anyPendingPricing}
                    hasInvoice={hasInvoice}
                    invoiceIsDraft={invoiceIsDraft}
                    prettyInvoiceStatus={prettyInvoiceStatus}
                    invoiceBadgeStyle={invoiceBadgeStyle}
                    onOpenInvoice={() => {
                        if (wo?.invoice_id) {
                            router.push(`/invoices/${wo.invoice_id}?fromWorkOrder=${workOrderId}`);
                        }
                    }}
                    onSyncInvoice={onSyncInvoice}
                    onBack={() => router.push("/work-orders")}
                    showForm={showForm}
                    onToggleForm={() => setShowForm((s) => !s)}
                />

                {loading ? <div style={{ marginTop: 10 }}>Loading...</div> : null}

                {err ? (
                    <div
                        style={{
                            marginTop: 6,
                            padding: 12,
                            borderRadius: 10,
                            border: "1px solid #f3caca",
                            background: "#fff5f5",
                            color: "#a40000",
                            fontWeight: 700,
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {err}
                    </div>
                ) : null}

                {wo ? (
                    <div
                        style={{
                            marginTop: 14,
                        }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gap: 10,
                            }}
                        >
                            <WorkOrderCheckInBar
                                wo={wo}
                                checkIns={checkIns}
                                myUserId={myUserId}
                                onCheckInRecorded={async () => {
                                    const rows = await loadCheckIns();
                                    setCheckIns(rows);
                                }}
                            />
                            <WorkOrderSummarySection
                                wo={wo}
                                checkIns={checkIns}
                                googleMapsUrl={googleMapsUrl}
                                invoiceIsLocked={invoiceIsLocked}
                                invoiceStatus={invoiceStatus}
                                prettyInvoiceStatus={prettyInvoiceStatus}
                                myRole={myRole}
                                isAdmin={isAdmin}
                                myUserId={myUserId}
                                techMembers={techMembers}
                                onChangeStatus={handleChangeStatus}
                                onAssignTech={handleAssignTech}
                                onCheckInRecorded={async () => {
                                    const rows = await loadCheckIns();
                                    setCheckIns(rows);
                                }}
                                allowedStatuses={allowedStatusesForRole(myRole, wo.status)}
                                canChangeStatus={canChangeWorkOrderStatus({
                                    userId: myUserId,
                                    isAdminOrOwner: isAdmin,
                                    role: myRole,
                                    canOperate,
                                    assignedTo: wo.assigned_to,
                                })}
                                statusChangeReason={
                                    isAdmin
                                        ? null
                                        : !canOperate
                                            ? "no_shift"
                                            : null
                                }
                                assignedTechName={assignedTechName}
                            />
                            {isAdmin ? (
                                <WorkOrderCustomerSection
                                    customerForm={customerForm}
                                    customerId={wo?.customer_id ?? null}
                                    isAdmin={isAdmin}
                                />
                            ) : null}
                            <div
                                style={{
                                    paddingTop: 4,
                                }}
                            >
                                <WorkOrderItemsHeader
                                    itemsCount={items.length}
                                    showForm={showForm}
                                    setShowForm={setShowForm}
                                    invoiceIsLocked={invoiceIsLocked}
                                />

                                {showForm ? (
                                    <WorkOrderNewItemForm
                                        isAdmin={isAdmin}
                                        newItem={newItem}
                                        setNewItem={setNewItem}
                                        savingItem={savingItem}
                                        roleLoading={roleLoading}
                                        myRole={myRole}
                                        onCreateItem={onCreateItem}
                                        setShowForm={setShowForm}
                                        invoiceIsLocked={invoiceIsLocked}
                                        hasInvoice={hasInvoice}
                                        invoiceStatus={invoiceStatus}
                                    />
                                ) : null}

                                <WorkOrderItemsTable
                                    items={items}
                                    isAdmin={isAdmin}
                                    priceDraft={priceDraft}
                                    setPriceDraft={setPriceDraft}
                                    savingPrice={savingPrice}
                                    updateQtyDone={updateQtyDone}
                                    updateTechNote={updateTechNote}
                                    priceItem={priceItem}
                                    invoiceIsLocked={invoiceIsLocked}
                                    hasInvoice={hasInvoice}
                                    invoiceStatus={invoiceStatus}
                                />
                            </div>
                            <WorkOrderPhotosSection
                                photos={photos}
                                activePhotoTab={activePhotoTab}
                                setActivePhotoTab={setActivePhotoTab}
                                onUploadPhoto={handlePhotoUpload}
                                onDeletePhoto={handleDeletePhoto}
                                onOpenPhoto={setSelectedPhotoId}
                            />
                            {photoError ? (
                                <div
                                    style={{
                                        marginTop: -4,
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        border: "1px solid #fecaca",
                                        background: "#fff1f2",
                                        color: "#b91c1c",
                                        fontSize: 13,
                                        fontWeight: 700,
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {photoError}
                                </div>
                            ) : null}
                            <WorkOrderSiteReportSection
                                report={wo.site_report}
                                draft={siteReportDraft}
                                saving={savingSiteReport}
                                isTech={myRole === "tech"}
                                canEdit={
                                    myRole === "tech" &&
                                    canChangeWorkOrderStatus({
                                        userId: myUserId,
                                        isAdminOrOwner: isAdmin,
                                        role: myRole,
                                        canOperate,
                                        assignedTo: wo.assigned_to,
                                    })
                                }
                                lastSavedAt={siteReportSavedAt}
                                onChangeDraft={setSiteReportDraft}
                                onSave={saveSiteReport}
                            />


                            <WorkOrderCheckInsSection checkIns={checkIns} />

                        </div>
                    </div>
                ) : null
                }

                <PhotoPreviewModal
                    selectedPhoto={selectedPhoto}
                    selectedPhotoGroup={selectedPhotoGroup}
                    selectedPhotoIndex={selectedPhotoIndex}
                    onClose={closePhotoPreview}
                    onPrevious={showPreviousPhoto}
                    onNext={showNextPhoto}
                    onTouchStart={handlePhotoTouchStart}
                    onTouchMove={handlePhotoTouchMove}
                    onTouchEnd={handlePhotoTouchEnd}
                />
            </div>
        </div>
    );
}