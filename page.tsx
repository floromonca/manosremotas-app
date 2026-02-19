"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [email, setEmail] = useState("flormonc@gmail.com");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const [woTitle, setWoTitle] = useState("Cambiar toma y revisar breaker");
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  const signIn = async () => {
    setMsg("Ingresando...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(`Error: ${error.message}`);
    setMsg("Login OK ✅");
    await refreshWorkOrders();
  };

  const refreshWorkOrders = async () => {
    setMsg("Cargando work orders...");
    const { data, error } = await supabase
      .from("work_orders")
      .select("work_order_id,title,status,created_at")
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) return setMsg(`Error: ${error.message}`);
    setWorkOrders(data ?? []);
    setMsg("Work orders cargadas ✅");
  };

  const createWorkOrder = async () => {
    setMsg("Creando work order...");
    const { data, error } = await supabase
      .from("work_orders")
      .insert([{ title: woTitle, status: "new" }])
      .select("work_order_id,title,status,created_at")
      .single();

    if (error) return setMsg(`Error: ${error.message}`);
    setWorkOrders((prev) => [data, ...prev]);
    setMsg("Work order creada ✅");
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) await refreshWorkOrders();
    })();
  }, []);

  return (
    <main style={{ maxWidth: 700, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>ManosRemotas – Work Orders MVP</h1>

      <section style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2>Auth</h2>
        <label>Email</label>
        <input style={{ width: "100%" }} value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input style={{ width: "100%" }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button onClick={signIn}>Sign in</button>
          <button onClick={refreshWorkOrders}>Refresh</button>
        </div>
      </section>

      <section style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8, marginTop: 16 }}>
        <h2>Crear Work Order</h2>
        <label>Title</label>
        <input style={{ width: "100%" }} value={woTitle} onChange={(e) => setWoTitle(e.target.value)} />
        <button style={{ marginTop: 10 }} onClick={createWorkOrder}>
          Create Work Order
        </button>
      </section>

      <section style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8, marginTop: 16 }}>
        <h2>Listado</h2>
        {workOrders.length === 0 ? (
          <p>No hay work orders todavía.</p>
        ) : (
          <ul>
            {workOrders.map((w) => (
              <li key={w.work_order_id}>
                <b>{w.title}</b> — {w.status} — {new Date(w.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p style={{ marginTop: 14 }}>
        <b>Status:</b> {msg}
      </p>
    </main>
  );
}
