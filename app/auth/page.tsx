"use client";

import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");

  const submit = async () => {
    setMsg("");

    if (!email || !password) {
      setMsg("Falta email o password.");
      return;
    }

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/work-orders");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Nota: si tienes email confirmation ON, el usuario debe confirmar.
        // Si está OFF, entra directo.
        setMsg("Usuario creado ✅ Ahora intenta Sign in.");
        setMode("signin");
      }
    } catch (e: any) {
      setMsg(e?.message ?? String(e));
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 750, marginBottom: 8 }}>
        ManosRemotas — Auth
      </h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => setMode("signin")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: mode === "signin" ? "#111" : "white",
            color: mode === "signin" ? "white" : "#111",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Sign in
        </button>

        <button
          onClick={() => setMode("signup")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: mode === "signup" ? "#111" : "white",
            color: mode === "signup" ? "white" : "#111",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Sign up
        </button>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        />

        <button
          onClick={submit}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          {mode === "signin" ? "Entrar" : "Crear usuario"}
        </button>
      </div>

      {msg ? (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            border: "1px solid #eee",
            borderRadius: 10,
            background: "#fafafa",
            fontSize: 13,
          }}
        >
          {msg}
        </div>
      ) : null}

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>
        Tip: después de Sign in te mando a <b>/work-orders</b>.
      </div>
    </div>
  );
}