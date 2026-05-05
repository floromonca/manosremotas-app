"use client";

import React, { useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { MR_THEME } from "../../../../lib/theme";
import { getOpenShiftForUser } from "@/lib/supabase/shifts";

type WorkOrderCheckInBarProps = {
    wo: {
        work_order_id: string;
        company_id: string | null;
        status: string;
        assigned_to: string | null;
    };
    checkIns: any[];
    myUserId: string | null;
    onCheckInRecorded: () => Promise<void>;
};

export default function WorkOrderCheckInBar({
    wo,
    checkIns = [],
    myUserId,
    onCheckInRecorded,
}: WorkOrderCheckInBarProps) {
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkInMessage, setCheckInMessage] = useState<string | null>(null);

    const canCheckIn = !!myUserId && !!wo.assigned_to && myUserId === wo.assigned_to;
    const latestCheckIn =
        Array.isArray(checkIns) && checkIns.length > 0 ? checkIns[0] : null;

    const hasAnyCheckIn = latestCheckIn != null;
    const hasCheckedOut = latestCheckIn?.check_out_at != null;

    function formatCheckInLabel(value: string | null | undefined) {
        const raw = String(value ?? "").trim();
        if (!raw) return "—";
        return raw.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }

    const handleCheckIn = async () => {
        setCheckInMessage(null);
        setCheckingIn(true);

        if (!wo.company_id || !myUserId) {
            setCheckInMessage("Missing company or user for shift validation.");
            setCheckingIn(false);
            return;
        }

        const openShift = await getOpenShiftForUser(wo.company_id, myUserId);

        if (!openShift) {
            setCheckInMessage("You must start your shift in My Day before checking in.");
            setCheckingIn(false);
            return;
        }

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
                } else {
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
                console.log("Check-in geolocation error:", error);
                setCheckingIn(false);
            }
        );
    };

    const handleCheckOut = async () => {
        if (!latestCheckIn?.check_in_id) {
            setCheckInMessage("No active check-in found.");
            return;
        }

        setCheckingIn(true);
        setCheckInMessage(null);

        const { error } = await supabase
            .from("work_order_check_ins")
            .update({ check_out_at: new Date().toISOString() })
            .eq("check_in_id", latestCheckIn.check_in_id);

        if (error) {
            setCheckInMessage(error.message || "Check-out failed.");
            setCheckingIn(false);
            return;
        }

        await onCheckInRecorded();

        setCheckInMessage("Check-out successful.");
        setCheckingIn(false);
    };

    if (!canCheckIn) return null;

    return (
        <div
            style={{
                padding: "8px 10px",
                borderRadius: MR_THEME.radius.control,
                background: hasAnyCheckIn ? "#ecfdf5" : MR_THEME.colors.primarySurface,
                border: `1px solid ${hasAnyCheckIn ? "#bbf7d0" : MR_THEME.colors.primary}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
            }}
        >
            <div style={{ minWidth: 0 }}>
                <div
                    style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        color: hasAnyCheckIn ? MR_THEME.colors.success : MR_THEME.colors.primary,
                        fontWeight: 900,
                        marginBottom: 3,
                    }}
                >
                    {hasAnyCheckIn ? "Checked in" : "On-site check-in"}
                </div>

                <div
                    style={{
                        fontSize: 12,
                        color: MR_THEME.colors.textPrimary,
                        fontWeight: 800,
                        lineHeight: 1.3,
                    }}
                >
                    {hasAnyCheckIn
                        ? latestCheckIn?.check_in_at
                            ? new Date(latestCheckIn.check_in_at).toLocaleString("en-CA", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                            })
                            : "Checked in"
                        : "Start work on site"}
                </div>

                <div
                    style={{
                        marginTop: 2,
                        fontSize: 11,
                        color: MR_THEME.colors.textSecondary,
                        lineHeight: 1.3,
                    }}
                >
                    {hasAnyCheckIn
                        ? `Status: ${formatCheckInLabel(latestCheckIn?.geofence_status)}`
                        : "Location is used only for this work order."}
                </div>
            </div>

            {hasAnyCheckIn && !hasCheckedOut ? (
                <button
                    type="button"
                    onClick={handleCheckOut}
                    disabled={checkingIn}
                    style={{
                        padding: "8px 12px",
                        borderRadius: MR_THEME.radius.control,
                        border: `1px solid ${MR_THEME.colors.primary}`,
                        background: MR_THEME.colors.primary,
                        color: "white",
                        fontWeight: 900,
                        fontSize: 12,
                        cursor: checkingIn ? "not-allowed" : "pointer",
                        opacity: checkingIn ? 0.7 : 1,
                        whiteSpace: "nowrap",
                    }}
                >
                    {checkingIn ? "..." : "Check Out"}
                </button>
            ) : !hasAnyCheckIn ? (
                <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                    style={{
                        padding: "8px 12px",
                        borderRadius: MR_THEME.radius.control,
                        border: `1px solid ${MR_THEME.colors.primary}`,
                        background: MR_THEME.colors.primary,
                        color: "white",
                        fontWeight: 900,
                        fontSize: 12,
                        cursor: checkingIn ? "not-allowed" : "pointer",
                        opacity: checkingIn ? 0.7 : 1,
                        whiteSpace: "nowrap",
                    }}
                >
                    {checkingIn ? "..." : "Check In"}
                </button>
            ) : (
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: MR_THEME.colors.success,
                        whiteSpace: "nowrap",
                    }}
                >
                    Completed
                </div>
            )}

            {checkInMessage ? (
                <div
                    style={{
                        width: "100%",
                        paddingTop: 8,
                        marginTop: 2,
                        borderTop: `1px solid ${MR_THEME.colors.border}`,
                        fontSize: 12,
                        color: MR_THEME.colors.textSecondary,
                        lineHeight: 1.4,
                    }}
                >
                    {checkInMessage}
                </div>
            ) : null}
        </div>
    );
}