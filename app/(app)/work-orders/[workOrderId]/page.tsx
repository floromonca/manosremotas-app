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
    invoice_id?: string | null;
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
    const workOrderId = (params as any)?.workOrderId as string;

    const { user } = useAuthState();
    const myUserId = user?.id ?? null;

    const { companyId: activeCompanyId } = useActiveCompany();

    const [roleLoading, setRoleLoading] = useState(false);
    const [myRole, setMyRole] = useState<string | null>(null);
    const [canOperate, setCanOperate] = useState(false);
    const [shiftLoading, setShiftLoading] = useState(false);

    const isAdmin = myRole === "owner" || myRole === "admin";
    const isTech = myRole === "tech";

    const [wo, setWo] = useState<WorkOrder | null>(null);
    const [checkIns, setCheckIns] = useState<any[]>([]);
    const [photos, setPhotos] = useState<any[]>([]);
    const woRef = useRef<WorkOrder | null>(null);
    const [assignedTechName, setAssignedTechName] = useState<string | null>(null);
    const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);

    useEffect(() => {
        woRef.current = wo;
    }, [wo]);

    const [items, setItems] = useState<WorkOrderItem[]>([]);
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
            setMyRole((data as any)?.role ?? null);
        } finally {
            setRoleLoading(false);
        }
    }, [activeCompanyId, myUserId]);
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

        setInvoiceStatus((data as any)?.status ?? null);
    }, []);

    const loadItemsForWorkOrder = useCallback(async () => {
        if (!workOrderId) return [] as WorkOrderItem[];

        const { data, error } = await supabase
            .from("work_order_items")
            .select(
                "item_id, description, quantity, qty_planned, qty_done, tech_note, unit_price, taxable, pending_pricing, pricing_status"
            )
            .eq("work_order_id", workOrderId)
            .order("created_at", { ascending: true });

        if (error) throw error;

        return ((data as any) ?? []) as WorkOrderItem[];
    }, [workOrderId]);

    const loadCheckIns = useCallback(async () => {
        if (!workOrderId) return [];

        const { data, error } = await supabase
            .from("work_order_check_ins")
            .select(
                "check_in_id, check_in_at, geofence_status, policy_applied, distance_to_site_m, location_verified, user_id"
            )
            .eq("work_order_id", workOrderId)
            .order("check_in_at", { ascending: false });

        if (error) throw error;

        return (data ?? []) as any[];
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

        const currentInvoiceStatus = normalizeInvoiceStatus((invRow as any)?.status);

        if (currentInvoiceStatus !== "draft") {
            console.log("ℹ️ Auto-sync omitido: invoice no está en draft.");
            return;
        }

        try {
            await createInvoiceFromWorkOrder(workOrderId);
            await loadInvoiceStatus(currentInvoiceId);
        } catch (syncErr: any) {
            console.log("⚠️ Auto-sync invoice falló:", syncErr?.message ?? syncErr);
        }
    }, [workOrderId, loadInvoiceStatus]);

    const onSyncInvoice = useCallback(async () => {
        if (!workOrderId) return;
        if (syncingInvoice) return;

        if (anyPendingPricing) {
            alert("Hay items en Pending pricing. Apruébalos primero antes de Sync.");
            return;
        }

        if (hasInvoice && !invoiceIsDraft) {
            alert(`La invoice asociada está en estado ${prettyInvoiceStatus(invoiceStatus)} y ya no permite Sync.`);
            return;
        }

        setSyncingInvoice(true);
        try {
            const invoiceId = await createInvoiceFromWorkOrder(workOrderId);
            await loadInvoiceStatus(invoiceId);
            router.push(`/invoices/${invoiceId}`);
        } catch (e: any) {
            console.log("❌ Sync Invoice failed:", e?.message ?? e);
            alert(`Sync Invoice failed: ${e?.message ?? e}`);
        } finally {
            setSyncingInvoice(false);
        }
    }, [
        workOrderId,
        anyPendingPricing,
        syncingInvoice,
        router,
        hasInvoice,
        invoiceIsDraft,
        invoiceStatus,
        loadInvoiceStatus,
    ]);
    const loadPhotos = useCallback(async () => {
        if (!workOrderId) return [];

        const { data, error } = await supabase
            .from("work_order_photos")
            .select("photo_id, category, file_url, created_at, uploaded_by")
            .eq("work_order_id", workOrderId)
            .order("created_at", { ascending: true });

        if (error) throw error;
        return data ?? [];
    }, [workOrderId]);

    const loadWorkOrder = useCallback(async () => {
        if (!workOrderId) return;

        setLoading(true);
        setErr("");

        try {
            const { data, error } = await supabase
                .from("work_orders")
                .select(
                    "work_order_id, company_id, job_type, description, status, priority, scheduled_for, created_at, assigned_to, customer_name, customer_email, customer_phone, service_address, invoice_id"
                )
                .eq("work_order_id", workOrderId)
                .single();

            if (error) throw error;

            const mapped = {
                ...(data as any),
                status: safeStatus((data as any)?.status),
            } as WorkOrder;

            setWo(mapped);

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
                    const fullName = (memberRow as any)?.full_name?.trim?.() || null;
                    setAssignedTechName(fullName || mapped.assigned_to.slice(0, 8));
                } else {
                    setAssignedTechName(mapped.assigned_to.slice(0, 8));
                }
            } else {
                setAssignedTechName(null);
            }
            setCustomerForm({
                customer_name: (mapped as any)?.customer_name ?? "",
                customer_email: (mapped as any)?.customer_email ?? "",
                customer_phone: (mapped as any)?.customer_phone ?? "",
                service_address: (mapped as any)?.service_address ?? "",
            });

            await loadInvoiceStatus(mapped.invoice_id);

            const itemRows = await loadItemsForWorkOrder();
            setItems(itemRows);

            const checkInRows = await loadCheckIns();
            setCheckIns(checkInRows);
            const photoRows = await loadPhotos();
            setPhotos(photoRows);
        } catch (e: any) {
            setErr(e?.message ?? "Error cargando Work Order");
            setWo(null);
            setItems([]);
            setCheckIns([]);
            setPhotos([]);
            setInvoiceStatus(null);
            setAssignedTechName(null);
        } finally {
            setLoading(false);
        }
    }, [workOrderId, loadInvoiceStatus, loadItemsForWorkOrder, loadCheckIns]);

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

    const refreshItemsOnly = useCallback(async () => {
        if (!workOrderId) return;

        try {
            const itemRows = await loadItemsForWorkOrder();
            setItems(itemRows);

            if (woRef.current?.invoice_id) {
                await loadInvoiceStatus(woRef.current.invoice_id);
            }
        } catch (e: any) {
            alert(`No se pudieron recargar items: ${e?.message ?? e}`);
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
                role: myRole as any,
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
            setErr("Cargando rol… intenta de nuevo en 1 segundo.");
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

            setNewItem({ description: "", quantity: 1, unit_price: 0, taxable: true });
            setShowForm(false);
        } catch (e: any) {
            setErr(e?.message ?? "Error creando item");
        } finally {
            setSavingItem(false);
        }
    }, [roleLoading, myRole, newItem, wo, isAdmin, refreshItemsOnly, syncDraftInvoiceIfNeeded]);

    async function handlePhotoUpload(
        file: File | null,
        category: "before" | "during" | "after"
    ) {
        try {
            console.log("PHOTO UPLOAD START", {
                fileName: file?.name,
                category,
                workOrderId,
                activeCompanyId,
                userId: user?.id,
            });

            if (!file || !workOrderId || !activeCompanyId || !user?.id) return;
            const { count, error: countError } = await supabase
                .from("work_order_photos")
                .select("*", { count: "exact", head: true })
                .eq("company_id", activeCompanyId)
                .eq("work_order_id", workOrderId);

            if (countError) {
                console.error("PHOTO COUNT ERROR", countError);
                throw countError;
            }

            if ((count ?? 0) >= 6) {
                setPhotoError("Maximum 6 photos per work order.");
                return;
            }

            setUploadingPhoto(true);
            setPhotoError(null);

            const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
            const fileName = `${crypto.randomUUID()}.${ext}`;
            const filePath = `${activeCompanyId}/${workOrderId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("work-order-photos")
                .upload(filePath, file, {
                    upsert: false,
                });

            if (uploadError) {
                console.error("UPLOAD ERROR", uploadError);
                throw uploadError;
            }

            const { data: publicUrlData } = supabase.storage
                .from("work-order-photos")
                .getPublicUrl(filePath);

            const publicUrl = publicUrlData.publicUrl;

            const { error: insertError } = await supabase
                .from("work_order_photos")
                .insert({
                    company_id: activeCompanyId,
                    work_order_id: workOrderId,
                    uploaded_by: user.id,
                    category,
                    file_url: publicUrl,
                });

            if (insertError) {
                console.error("INSERT ERROR", insertError);
                throw insertError;
            }

            const photoRows = await loadPhotos();
            setPhotos(photoRows);

            console.log("PHOTO UPLOAD SUCCESS", {
                category,
                filePath,
                publicUrl,
            });

        } catch (err: any) {
            console.error("PHOTO UPLOAD FAILED", err);
            setPhotoError(err?.message ?? "Could not upload photo.");
        } finally {
            setUploadingPhoto(false);
        }
    }
    async function handleDeletePhoto(photo: any) {
        try {
            if (!photo?.photo_id || !activeCompanyId || !workOrderId) return;

            setPhotoError(null);

            const fileUrl: string = String(photo.file_url ?? "");
            const marker = "/storage/v1/object/public/work-order-photos/";
            const markerIndex = fileUrl.indexOf(marker);

            if (markerIndex >= 0) {
                const filePath = fileUrl.slice(markerIndex + marker.length);

                const { error: storageError } = await supabase.storage
                    .from("work-order-photos")
                    .remove([filePath]);

                if (storageError) {
                    console.error("PHOTO STORAGE DELETE ERROR", storageError);
                    throw storageError;
                }
            }

            const { error: deleteError } = await supabase
                .from("work_order_photos")
                .delete()
                .eq("company_id", activeCompanyId)
                .eq("work_order_id", workOrderId)
                .eq("photo_id", photo.photo_id);

            if (deleteError) {
                console.error("PHOTO DB DELETE ERROR", deleteError);
                throw deleteError;
            }

            const photoRows = await loadPhotos();
            setPhotos(photoRows);
        } catch (err: any) {
            console.error("PHOTO DELETE FAILED", err);
            setPhotoError(err?.message ?? "Could not delete photo.");
        }
    }

    return (
        <div
            style={{
                padding: "16px 12px 24px",
                maxWidth: 1180,
                width: "100%",
                margin: "0 auto",
                boxSizing: "border-box",
                background: MR_THEME.appBg,
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

            {loading ? <div style={{ marginTop: 16 }}>Cargando…</div> : null}

            {err ? (
                <div
                    style={{
                        marginTop: 16,
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
                        marginTop: 16,
                        padding: "12px 10px",
                        borderRadius: 12,
                        border: "1px solid #eee",
                        background: "white",
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gap: 14,
                        }}
                    >
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
                            onChangeStatus={handleChangeStatus}
                            onCheckInRecorded={async () => {
                                const rows = await loadCheckIns();
                                setCheckIns(rows);
                            }}
                            allowedStatuses={allowedStatusesForRole(myRole as any, wo.status)}
                            canChangeStatus={canChangeWorkOrderStatus({
                                userId: myUserId,
                                isAdminOrOwner: isAdmin,
                                role: myRole as any,
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

                        <WorkOrderCustomerSection
                            customerForm={customerForm}
                            setCustomerForm={setCustomerForm}
                            saveCustomerInfo={saveCustomerInfo}
                            savingCustomer={savingCustomer}
                            isAdmin={isAdmin}
                        />

                        <div
                            style={{
                                marginTop: 0,
                                padding: 14,
                                borderRadius: MR_THEME.radiusCard,
                                border: `1px solid ${MR_THEME.border}`,
                                background: MR_THEME.cardBg,
                                boxShadow: MR_THEME.shadowCard,
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 10,
                                    marginBottom: 10,
                                    flexWrap: "wrap",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 11,
                                        textTransform: "uppercase",
                                        letterSpacing: 0.6,
                                        color: MR_THEME.textSecondary,
                                        fontWeight: 700,
                                    }}
                                >
                                    Photo Evidence
                                </div>

                                <div
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 800,
                                        color: photos.length >= 6 ? MR_THEME.danger : MR_THEME.textSecondary,
                                        background: photos.length >= 6 ? "#fee2e2" : MR_THEME.cardBgSoft,
                                        border: photos.length >= 6 ? "1px solid #fecaca" : `1px solid ${MR_THEME.border}`,
                                        borderRadius: 999,
                                        padding: "4px 8px",
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {photos.length} / 6 photos
                                </div>


                            </div>
                            {photos.length >= 6 ? (
                                <div
                                    style={{
                                        marginBottom: 10,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: "#b91c1c",
                                        background: "#fee2e2",
                                        border: "1px solid #fecaca",
                                        borderRadius: 8,
                                        padding: "6px 10px",
                                        display: "inline-block",
                                    }}
                                >
                                    Photo limit reached for this work order.
                                </div>
                            ) : null}

                            {(
                                photos.filter((p) => p.category === "before").length === 0 ||
                                photos.filter((p) => p.category === "after").length === 0
                            ) && (
                                    <div
                                        style={{
                                            marginBottom: 10,
                                            padding: "8px 10px",
                                            borderRadius: 8,
                                            background: "#fff7ed",
                                            border: "1px solid #fed7aa",
                                            color: "#9a3412",
                                            fontSize: 12,
                                            fontWeight: 700,
                                        }}
                                    >
                                        Please add at least 1 before and 1 after photo.
                                    </div>
                                )}
                            <div style={{ display: "grid", gap: 12 }}>
                                <div
                                    style={{
                                        padding: "12px 12px",
                                        borderRadius: MR_THEME.radiusControl,
                                        border: `1px solid ${MR_THEME.border}`,
                                        background: MR_THEME.cardBgSoft,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 900,
                                            color: "#111827",
                                            marginBottom: 6,
                                            lineHeight: 1.35,
                                        }}
                                    >
                                        Before
                                    </div>

                                    <label
                                        style={{
                                            padding: "18px 12px",
                                            minHeight: 56,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: MR_THEME.radiusControl,
                                            border: `1px dashed ${MR_THEME.borderStrong}`,
                                            background: MR_THEME.cardBg,
                                            fontWeight: 900,
                                            fontSize: 13,
                                            lineHeight: 1.2,
                                            cursor: photos.length >= 6 ? "not-allowed" : "pointer",
                                            opacity: photos.length >= 6 ? 0.5 : 1,
                                            width: "100%",
                                            boxSizing: "border-box",
                                            textAlign: "center",
                                            color: MR_THEME.primary,
                                        }}
                                    >
                                        + Add photo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            disabled={photos.length >= 6}
                                            style={{ display: "none" }}
                                            onChange={(e) =>
                                                handlePhotoUpload(e.target.files?.[0] ?? null, "before")
                                            }
                                        />
                                    </label>

                                    {photos.filter((p) => p.category === "before").length > 0 && (
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                                gap: 8,
                                                marginTop: 10,
                                            }}
                                        >
                                            {photos
                                                .filter((p) => p.category === "before")
                                                .map((photo) => (
                                                    <div
                                                        key={photo.photo_id}
                                                        style={{
                                                            position: "relative",
                                                        }}
                                                    >
                                                        <img
                                                            src={photo.file_url}
                                                            alt="Before evidence"
                                                            onClick={() => setSelectedPhotoUrl(photo.file_url)}
                                                            style={{
                                                                width: "100%",
                                                                height: 96,
                                                                objectFit: "cover",
                                                                borderRadius: 10,
                                                                border: "1px solid #e5e7eb",
                                                                background: "#f8fafc",
                                                                cursor: "pointer",
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeletePhoto(photo);
                                                            }}
                                                            style={{
                                                                position: "absolute",
                                                                top: 6,
                                                                right: 6,
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: "50%",
                                                                border: "none",
                                                                background: "rgba(0,0,0,0.6)",
                                                                color: "#fff",
                                                                fontSize: 14,
                                                                fontWeight: 800,
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                            }}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    )}
                                </div>

                                <div
                                    style={{
                                        padding: "12px 12px",
                                        borderRadius: MR_THEME.radiusControl,
                                        border: `1px solid ${MR_THEME.border}`,
                                        background: MR_THEME.cardBgSoft,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 800,
                                            color: "#111827",
                                            marginBottom: 6,
                                            lineHeight: 1.35,
                                        }}
                                    >
                                        During
                                    </div>

                                    <label
                                        style={{
                                            padding: "18px 12px",
                                            minHeight: 56,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: MR_THEME.radiusControl,
                                            border: `1px dashed ${MR_THEME.borderStrong}`,
                                            background: MR_THEME.cardBg,
                                            fontWeight: 900,
                                            fontSize: 13,
                                            lineHeight: 1.2,
                                            cursor: photos.length >= 6 ? "not-allowed" : "pointer",
                                            opacity: photos.length >= 6 ? 0.5 : 1,
                                            width: "100%",
                                            boxSizing: "border-box",
                                            textAlign: "center",
                                            color: MR_THEME.primary,
                                        }}
                                    >
                                        + Add photo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            disabled={photos.length >= 6}
                                            style={{ display: "none" }}
                                            onChange={(e) =>
                                                handlePhotoUpload(e.target.files?.[0] ?? null, "during")
                                            }
                                        />
                                    </label>

                                    {photos.filter((p) => p.category === "during").length > 0 && (
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                                gap: 8,
                                                marginTop: 10,
                                            }}
                                        >
                                            {photos
                                                .filter((p) => p.category === "during")
                                                .map((photo) => (
                                                    <div
                                                        key={photo.photo_id}
                                                        style={{
                                                            position: "relative",
                                                        }}
                                                    >
                                                        <img
                                                            src={photo.file_url}
                                                            alt="During evidence"
                                                            onClick={() => setSelectedPhotoUrl(photo.file_url)}
                                                            style={{
                                                                width: "100%",
                                                                height: 96,
                                                                objectFit: "cover",
                                                                borderRadius: 10,
                                                                border: "1px solid #e5e7eb",
                                                                background: "#f8fafc",
                                                                cursor: "pointer",
                                                            }}
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeletePhoto(photo);
                                                            }}
                                                            style={{
                                                                position: "absolute",
                                                                top: 6,
                                                                right: 6,
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: "50%",
                                                                border: "none",
                                                                background: "rgba(0,0,0,0.6)",
                                                                color: "#fff",
                                                                fontSize: 14,
                                                                fontWeight: 800,
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                            }}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>

                                <div
                                    style={{
                                        padding: "12px 12px",
                                        borderRadius: MR_THEME.radiusControl,
                                        border: `1px solid ${MR_THEME.border}`,
                                        background: MR_THEME.cardBgSoft,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 800,
                                            color: "#111827",
                                            marginBottom: 6,
                                            lineHeight: 1.35,
                                        }}
                                    >
                                        After
                                    </div>
                                    <label
                                        style={{
                                            padding: "18px 12px",
                                            minHeight: 56,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: MR_THEME.radiusControl,
                                            border: `1px dashed ${MR_THEME.borderStrong}`,
                                            background: MR_THEME.cardBg,
                                            fontWeight: 900,
                                            fontSize: 13,
                                            lineHeight: 1.2,
                                            cursor: photos.length >= 6 ? "not-allowed" : "pointer",
                                            opacity: photos.length >= 6 ? 0.5 : 1,
                                            width: "100%",
                                            boxSizing: "border-box",
                                            textAlign: "center",
                                            color: MR_THEME.primary,
                                        }}
                                    >
                                        + Add photo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            disabled={photos.length >= 6}
                                            style={{ display: "none" }}
                                            onChange={(e) =>
                                                handlePhotoUpload(e.target.files?.[0] ?? null, "after")
                                            }
                                        />
                                    </label>

                                    {photos.filter((p) => p.category === "after").length > 0 && (
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                                gap: 8,
                                                marginTop: 10,
                                            }}
                                        >
                                            {photos
                                                .filter((p) => p.category === "after")
                                                .map((photo) => (
                                                    <div
                                                        key={photo.photo_id}
                                                        style={{
                                                            position: "relative",
                                                        }}
                                                    >
                                                        <img
                                                            src={photo.file_url}
                                                            alt="After evidence"
                                                            onClick={() => setSelectedPhotoUrl(photo.file_url)}
                                                            style={{
                                                                width: "100%",
                                                                height: 96,
                                                                objectFit: "cover",
                                                                borderRadius: 10,
                                                                border: "1px solid #e5e7eb",
                                                                background: "#f8fafc",
                                                                cursor: "pointer",
                                                            }}
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeletePhoto(photo);
                                                            }}
                                                            style={{
                                                                position: "absolute",
                                                                top: 6,
                                                                right: 6,
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: "50%",
                                                                border: "none",
                                                                background: "rgba(0,0,0,0.6)",
                                                                color: "#fff",
                                                                fontSize: 14,
                                                                fontWeight: 800,
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                            }}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>

                                <div
                                    style={{
                                        fontSize: 12,
                                        color: "#6b7280",
                                        lineHeight: 1.4,
                                        wordBreak: "break-word",
                                    }}
                                >
                                    Up to 6 photos per work order. Recommended: at least 1 before and 1 after.
                                </div>
                            </div>
                        </div>

                        <div
                            style={{
                                marginTop: 0,
                                padding: "10px 10px",
                                borderRadius: 12,
                                border: "1px solid #e5e7eb",
                                background: "#ffffff",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.6,
                                    color: "#6b7280",
                                    fontWeight: 700,
                                    marginBottom: 10,
                                }}
                            >
                                Check-in History
                            </div>

                            {checkIns.length === 0 ? (
                                <div style={{ fontSize: 14, color: "#6b7280" }}>
                                    No check-ins recorded yet.
                                </div>
                            ) : (
                                <div style={{ display: "grid", gap: 8 }}>
                                    {checkIns.map((checkIn) => (
                                        <div
                                            key={checkIn.check_in_id}
                                            style={{
                                                padding: "8px 9px",
                                                borderRadius: 10,
                                                border: "1px solid #e5e7eb",
                                                background: "#f9fafb",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 800,
                                                    color: "#111827",
                                                    marginBottom: 4,
                                                    lineHeight: 1.35,
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {new Date(checkIn.check_in_at).toLocaleString()}
                                            </div>

                                            <div
                                                style={{
                                                    marginTop: 2,
                                                    fontSize: 12,
                                                    lineHeight: 1.35,
                                                    color: "#374151",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                Status: {String(checkIn.geofence_status ?? "—").replaceAll("_", " ")}
                                            </div>

                                            <div
                                                style={{
                                                    marginTop: 2,
                                                    fontSize: 12,
                                                    lineHeight: 1.35,
                                                    color: "#374151",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                Policy: {String(checkIn.policy_applied ?? "—").replaceAll("_", " ")}
                                            </div>

                                            <div
                                                style={{
                                                    marginTop: 2,
                                                    fontSize: 12,
                                                    lineHeight: 1.35,
                                                    color: "#374151",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                Distance: {checkIn.distance_to_site_m != null ? `${checkIn.distance_to_site_m} m` : "—"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div
                            style={{
                                paddingTop: 10,
                                borderTop: "1px solid #eee",
                            }}
                        >
                            <WorkOrderItemsHeader
                                itemsCount={items.length}
                                showForm={showForm}
                                setShowForm={setShowForm}
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
                                />
                            ) : null}

                            <WorkOrderItemsTable
                                items={items}
                                isAdmin={isAdmin}
                                priceDraft={priceDraft}
                                setPriceDraft={setPriceDraft}
                                savingPrice={savingPrice}
                                updateQtyDone={updateQtyDone}
                                priceItem={priceItem}
                            />
                        </div>
                    </div>
                </div>
            ) : null}

            {selectedPhotoUrl && (
                <div
                    onClick={() => setSelectedPhotoUrl(null)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(15, 23, 42, 0.78)",
                        zIndex: 2000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 20,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: "relative",
                            maxWidth: "92vw",
                            maxHeight: "92vh",
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setSelectedPhotoUrl(null)}
                            style={{
                                position: "absolute",
                                top: -14,
                                right: -14,
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                border: "1px solid #d1d5db",
                                background: "white",
                                cursor: "pointer",
                                fontSize: 18,
                                fontWeight: 800,
                                lineHeight: 1,
                            }}
                        >
                            ×
                        </button>

                        <img
                            src={selectedPhotoUrl}
                            alt="Photo preview"
                            style={{
                                display: "block",
                                maxWidth: "92vw",
                                maxHeight: "92vh",
                                borderRadius: 14,
                                border: "1px solid rgba(255,255,255,0.15)",
                                background: "#fff",
                                boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
