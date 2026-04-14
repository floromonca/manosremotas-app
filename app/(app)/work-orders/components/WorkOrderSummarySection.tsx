"use client";

import React, { useState } from "react";
import type { WorkOrderStatus } from "../../../../lib/supabase/workOrders";
import { supabase } from "../../../../lib/supabaseClient";

type WorkOrderSummary = {
    work_order_id: string;
    company_id: string | null;
    job_type: string;
    description: string;
    customer_name?: string | null;
    service_address?: string | null;
    status: WorkOrderStatus;
    priority: string;
    assigned_to: string | null;
};

type Props = {
    wo: WorkOrderSummary;
    checkIns: any[];
    googleMapsUrl: string | null;
    invoiceIsLocked: boolean;
    invoiceStatus: string | null;
    prettyInvoiceStatus: (status: string | null | undefined) => string;
    myRole: string | null;
    isAdmin: boolean;
    myUserId: string | null;
    onChangeStatus: (next: WorkOrderStatus) => Promise<void>;
    onCheckInRecorded: () => Promise<void>;
    allowedStatuses: WorkOrderStatus[];
    canChangeStatus: boolean;
    statusChangeReason: "no_shift" | null;
    assignedTechName: string | null;
};


function niceLabel(value: string | null | undefined) {
    const raw = String(value ?? "").trim();
    if (!raw) return "—";
    return raw.replaceAll("_", " ");
}

export default function WorkOrderSummarySection({
    wo,
    checkIns = [],
    googleMapsUrl,
    invoiceIsLocked,
    invoiceStatus,
    prettyInvoiceStatus,
    myRole,
    isAdmin,
    myUserId,
    onChangeStatus,
    onCheckInRecorded,
    allowedStatuses,
    canChangeStatus,
    statusChangeReason,
    assignedTechName,
}: Props) {

    const canCheckIn =
        !!myUserId &&
        !!wo.assigned_to &&
        myUserId === wo.assigned_to;

    const [checkingIn, setCheckingIn] = useState(false);
    const [checkInMessage, setCheckInMessage] = useState<string | null>(null);
    const latestCheckIn =
        Array.isArray(checkIns) && checkIns.length > 0 ? checkIns[0] : null;

    const hasCheckedIn = latestCheckIn != null;

    function formatCheckInLabel(value: string | null | undefined) {
        const raw = String(value ?? "").trim();
        if (!raw) return "—";
        return raw
            .replaceAll("_", " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    const handleCheckIn = async () => {
        setCheckInMessage(null);
        setCheckingIn(true);

        if (!navigator.geolocation) {
            setCheckInMessage("Geolocation is not supported by your browser.");
            setCheckingIn(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;

                if (!wo.company_id) {
                    setCheckInMessage("Missing company for this work order.");
                    setCheckingIn(false);
                    return;
                }

                const { data, error } = await supabase.rpc("check_in_to_work_order", {
                    p_company_id: wo.company_id,
                    p_work_order_id: wo.work_order_id,
                    p_check_in_lat: lat,
                    p_check_in_lng: lng,
                    p_check_in_accuracy_m: Math.round(accuracy),
                });

                if (error) {
                    setCheckInMessage(error.message || "Check-in failed.");
                    console.log("Geolocation error:", error);
                    setCheckingIn(false);
                    return;
                }

                const result = Array.isArray(data) ? data[0] : null;

                if (result?.allowed) {
                    if (wo.status === "new") {
                        const { error: statusError } = await supabase
                            .from("work_orders")
                            .update({ status: "in_progress" })
                            .eq("work_order_id", wo.work_order_id);

                        if (statusError) {
                            console.log("Auto status update failed:", statusError);
                        }
                    }

                    await onCheckInRecorded();

                    if (result?.geofence_status === "location_unverified") {
                        setCheckInMessage("Check-in recorded. Site location could not be verified.");
                    } else if (result?.distance_to_site_m != null) {
                        setCheckInMessage(`Check-in successful. Distance to site: ${result.distance_to_site_m} m.`);
                    } else {
                        setCheckInMessage("Check-in successful.");
                    }
                }
                else {
                    if (result?.reason_code === "outside_geofence") {
                        setCheckInMessage("You are outside the authorized work zone for this assignment.");
                    } else if (result?.reason_code === "gps_required") {
                        setCheckInMessage("Location access is required to check in for this assignment.");
                    } else {
                        setCheckInMessage(result?.reason_code || "Check-in failed.");
                    }
                }

                setCheckingIn(false);
            },
            (error) => {
                setCheckInMessage("Unable to retrieve your location.");
                console.log("Check-in RPC error:", error);
                setCheckingIn(false);
            }
        );
    };

    return (
        <div
            style={{
                padding: 14,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    gap: 16,
                    flexWrap: "wrap",
                }}
            >
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                        style={{
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            color: "#6b7280",
                            fontWeight: 800,
                            marginBottom: 8,
                        }}
                    >
                        Work Order Summary
                    </div>

                    <div
                        style={{
                            fontSize: 30,
                            lineHeight: 1.05,
                            fontWeight: 900,
                            letterSpacing: "-0.03em",
                            color: "#111827",
                            marginBottom: 10,
                        }}
                    >
                        {wo.job_type}
                    </div>

                    <div
                        style={{
                            fontSize: 15,
                            lineHeight: 1.6,
                            color: "#4b5563",
                            maxWidth: 760,
                        }}
                    >
                        {wo.description}
                    </div>
                </div>

                {googleMapsUrl ? (
                    <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            display: "inline-block",
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: "1px solid #d1d5db",
                            textDecoration: "none",
                            color: "#111827",
                            fontWeight: 800,
                            background: "white",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Abrir en Google Maps
                    </a>
                ) : null}
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: 10,
                    marginTop: 16,
                }}
            >
                <div
                    style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                        Customer
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>
                        {wo.customer_name || "—"}
                    </div>
                </div>

                <div
                    style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                        Address
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                        {wo.service_address || "—"}
                    </div>
                </div>

                <div
                    style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                        Status
                    </div>

                    <select
                        value={wo.status}
                        disabled={!canChangeStatus}
                        onChange={async (e) => {
                            const next = e.target.value as WorkOrderStatus;
                            await onChangeStatus(next);
                        }}
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid #d1d5db",
                            background: "white",
                            fontSize: 14,
                            fontWeight: 800,
                            color: "#111827",
                            cursor: canChangeStatus ? "pointer" : "not-allowed",
                            opacity: canChangeStatus ? 1 : 0.65,
                            textTransform: "capitalize",
                        }}
                    >
                        {allowedStatuses.map((status) => (
                            <option key={status} value={status}>
                                {niceLabel(status)}
                            </option>
                        ))}
                    </select>

                    {!canChangeStatus ? (
                        <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>
                            {statusChangeReason === "no_shift"
                                ? "Start your shift from My Day or Control Center to update status."
                                : isAdmin
                                    ? "You cannot change the status of this work order right now."
                                    : "This work order is not currently available for status changes."}
                        </div>
                    ) : null}
                </div>
                <div
                    style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                        Priority
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", textTransform: "capitalize" }}>
                        {niceLabel(wo.priority)}
                    </div>
                </div>

                <div
                    style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
                        Assigned to
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>
                        {assignedTechName || "—"}
                    </div>
                </div>
            </div>

            {canCheckIn ? (
                <div
                    style={{
                        marginTop: 14,
                        padding: 12,
                        borderRadius: 12,
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            color: "#6b7280",
                            fontWeight: 800,
                            marginBottom: 6,
                        }}
                    >
                        On-site Check-in
                    </div>

                    <div
                        style={{
                            fontSize: 13,
                            color: "#4b5563",
                            marginBottom: 10,
                            lineHeight: 1.45,
                        }}
                    >
                        We use your location only to validate check-in for this work order.
                    </div>

                    {hasCheckedIn ? (
                        <div
                            style={{
                                padding: 10,
                                borderRadius: 10,
                                background: "#ffffff",
                                border: "1px solid #e5e7eb",
                                fontSize: 13,
                                lineHeight: 1.45,
                                color: "#374151",
                            }}
                        >
                            <div style={{ fontWeight: 800, color: "#111827", marginBottom: 4 }}>
                                Checked in at{" "}
                                {latestCheckIn?.check_in_at
                                    ? new Date(latestCheckIn.check_in_at).toLocaleString("en-CA", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                        hour: "numeric",
                                        minute: "2-digit",
                                    })
                                    : "—"}
                            </div>

                            <div style={{ marginTop: 4 }}>
                                Status: {formatCheckInLabel(latestCheckIn?.geofence_status)}
                            </div>

                            <div style={{ marginTop: 4 }}>
                                Distance: {latestCheckIn?.distance_to_site_m != null ? `${latestCheckIn.distance_to_site_m} m` : "—"}
                            </div>
                        </div>
                    ) : (
                        <>
                            <button
                                style={{
                                    padding: "10px 16px",
                                    borderRadius: 10,
                                    border: "1px solid #d1d5db",
                                    background: "#111827",
                                    color: "white",
                                    fontWeight: 800,
                                    cursor: checkingIn ? "not-allowed" : "pointer",
                                    opacity: checkingIn ? 0.7 : 1,
                                }}
                                onClick={handleCheckIn}
                                disabled={checkingIn}
                            >
                                {checkingIn ? "Checking in..." : "Check in"}
                            </button>

                            {checkInMessage ? (
                                <div
                                    style={{
                                        marginTop: 12,
                                        padding: 10,
                                        borderRadius: 10,
                                        background: "#ffffff",
                                        border: "1px solid #e5e7eb",
                                        fontSize: 14,
                                        lineHeight: 1.5,
                                        color: "#374151",
                                    }}
                                >
                                    {checkInMessage}
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            ) : null}

            {invoiceIsLocked ? (
                <div
                    style={{
                        marginTop: 16,
                        padding: 14,
                        borderRadius: 12,
                        background: "#fff7e6",
                        border: "1px solid #fde2a7",
                        color: "#7c4a03",
                        lineHeight: 1.5,
                    }}
                >
                    This Work Order has an invoice in <b>{prettyInvoiceStatus(invoiceStatus)}</b> status. You can continue
                    working on the WO, but automatic or manual invoice sync is no longer available.
                </div>
            ) : null}
        </div>
    );
}