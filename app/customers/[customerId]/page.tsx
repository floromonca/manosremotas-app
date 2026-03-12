"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useActiveCompany } from "../../../hooks/useActiveCompany";

type Customer = {
    customer_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    billing_address: string | null;
};

type Location = {
    location_id: string;
    label: string | null;
    address: string | null;
    created_at: string | null;
};

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { companyId } = useActiveCompany();
    const customerId = (params as any)?.customerId as string;

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(false);

    async function loadCustomer() {
        if (!customerId) return;

        setLoading(true);

        const { data, error } = await supabase
            .from("customers")
            .select("customer_id, name, email, phone, billing_address")
            .eq("customer_id", customerId)
            .single();

        if (error) {
            console.error(error);
            alert(error.message);
            setCustomer(null);
        } else {
            setCustomer(data as any);
        }

        setLoading(false);
    }

    async function loadLocations() {
        if (!customerId) return;

        const { data, error } = await supabase
            .from("locations")
            .select("location_id, label, address, created_at")
            .eq("customer_id", customerId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error(error);
            alert(error.message);
            setLocations([]);
        } else {
            setLocations(data || []);
        }
    }

    async function handleAddLocation() {
        if (!companyId) {
            alert("No active company selected");
            return;
        }

        const label = prompt("Location label (Home, Office, etc)");
        if (!label || !label.trim()) return;

        const address = prompt("Address");
        if (!address || !address.trim()) return;

        const { error } = await supabase.from("locations").insert({
            company_id: companyId,
            customer_id: customerId,
            location_type: "other",
            label: label.trim(),
            address: address.trim(),
        });

        if (error) {
            console.error("Error creating location:", error);
            alert(error.message || "Error creating location");
            return;
        }

        await loadLocations();
    }

    useEffect(() => {
        loadCustomer();
        loadLocations();
    }, [customerId]);

    return (
        <div style={{ padding: 24 }}>
            <button
                onClick={() => router.push("/customers")}
                style={{
                    marginBottom: 20,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    background: "#fff",
                    cursor: "pointer",
                }}
            >
                ← Back
            </button>

            {loading && <p>Loading...</p>}

            {customer ? (
                <div
                    style={{
                        border: "1px solid #eee",
                        padding: 16,
                        borderRadius: 12,
                        background: "white",
                        marginBottom: 24,
                    }}
                >
                    <h2>{customer.name}</h2>

                    {customer.email && <div>Email: {customer.email}</div>}
                    {customer.phone && <div>Phone: {customer.phone}</div>}
                    {customer.billing_address && (
                        <div>Billing address: {customer.billing_address}</div>
                    )}
                </div>
            ) : null}

            <div
                style={{
                    border: "1px solid #eee",
                    padding: 16,
                    borderRadius: 12,
                    background: "white",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                    }}
                >
                    <h3 style={{ margin: 0 }}>Locations</h3>

                    <button
                        onClick={handleAddLocation}
                        style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid #111",
                            background: "#111",
                            color: "white",
                            cursor: "pointer",
                        }}
                    >
                        + Add Location
                    </button>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                    {locations.map((l) => (
                        <div
                            key={l.location_id}
                            style={{
                                border: "1px solid #eee",
                                padding: 12,
                                borderRadius: 10,
                            }}
                        >
                            <div style={{ fontWeight: 700 }}>
                                {l.label || "Location"}
                            </div>

                            {l.address && (
                                <div style={{ opacity: 0.8 }}>{l.address}</div>
                            )}
                        </div>
                    ))}

                    {locations.length === 0 ? (
                        <div style={{ opacity: 0.7 }}>
                            No locations yet.
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}