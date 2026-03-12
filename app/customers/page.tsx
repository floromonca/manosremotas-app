"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { useActiveCompany } from "../../hooks/useActiveCompany";

type Customer = {
    customer_id: string;
    name: string;
    email: string | null;
    phone: string | null;
};

export default function CustomersPage() {
    const { companyId } = useActiveCompany();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    async function loadCustomers() {
        setLoading(true);

        const { data, error } = await supabase
            .from("customers")
            .select("customer_id, name, email, phone")
            .order("name", { ascending: true });

        if (error) {
            console.error("Error loading customers:", error);
            alert(error.message);
            setCustomers([]);
        } else {
            setCustomers(data || []);
        }

        setLoading(false);
    }

    async function handleNewCustomer() {
        if (!companyId) {
            alert("No active company selected");
            return;
        }

        const name = prompt("Customer name");
        if (!name || !name.trim()) return;

        const email = prompt("Email (optional)") || null;
        const phone = prompt("Phone (optional)") || null;

        const { error } = await supabase.from("customers").insert({
            company_id: companyId,
            customer_type: "person",
            name: name.trim(),
            email: email?.trim() || null,
            phone: phone?.trim() || null,
        });

        if (error) {
            console.error("Error creating customer:", error);
            alert(error.message || "Error creating customer");
            return;
        }

        await loadCustomers();
    }

    useEffect(() => {
        loadCustomers();
    }, []);

    return (
        <div style={{ padding: 24 }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 20,
                }}
            >
                <h1 style={{ margin: 0 }}>Customers</h1>

                <button
                    onClick={handleNewCustomer}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #111",
                        background: "#111",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 700,
                    }}
                >
                    + New Customer
                </button>
            </div>

            {loading ? <p>Loading...</p> : null}

            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {customers.map((c) => (
                    <div
                        key={c.customer_id}
                        style={{
                            border: "1px solid #eee",
                            padding: 16,
                            borderRadius: 12,
                            background: "white",
                        }}
                    >
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{c.name}</div>

                        {c.email ? <div style={{ marginTop: 6 }}>Email: {c.email}</div> : null}
                        {c.phone ? <div>Phone: {c.phone}</div> : null}

                        <div style={{ marginTop: 12 }}>
                            <Link href={`/customers/${c.customer_id}`}>Open customer</Link>
                        </div>
                    </div>
                ))}

                {!loading && customers.length === 0 ? (
                    <div
                        style={{
                            border: "1px solid #eee",
                            padding: 16,
                            borderRadius: 12,
                            background: "white",
                            opacity: 0.8,
                        }}
                    >
                        No customers yet.
                    </div>
                ) : null}
            </div>
        </div>
    );
}