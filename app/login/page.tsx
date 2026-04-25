"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email ou mot de passe incorrect");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative", overflow: "hidden" }}>
      {/* Grid background */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(127,119,221,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(127,119,221,0.07) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      {/* Orbs */}
      <div style={{ position: "absolute", width: 300, height: 300, background: "#7F77DD", borderRadius: "50%", filter: "blur(80px)", opacity: 0.12, top: -80, right: -60 }} />
      <div style={{ position: "absolute", width: 200, height: 200, background: "#1D9E75", borderRadius: "50%", filter: "blur(60px)", opacity: 0.1, bottom: -40, left: -40 }} />

      <div style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(127,119,221,0.3)", borderRadius: 20, padding: "2.5rem 2rem", width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#7F77DD", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect x="3" y="3" width="9" height="9" rx="2" fill="white" opacity="0.9"/>
              <rect x="14" y="3" width="9" height="9" rx="2" fill="white" opacity="0.6"/>
              <rect x="3" y="14" width="9" height="9" rx="2" fill="white" opacity="0.6"/>
              <rect x="14" y="14" width="9" height="9" rx="2" fill="white" opacity="0.35"/>
            </svg>
          </div>
          <p style={{ fontSize: 22, fontWeight: 500, color: "white", margin: "0 0 4px" }}>EcomOS</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 1rem" }}>Internal Dashboard</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(29,158,117,0.15)", border: "0.5px solid rgba(29,158,117,0.4)", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#5DCAA5" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5DCAA5" }} />
            Système opérationnel
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Adresse email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ecomos.biz"
              required
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "rgba(255,255,255,0.85)", fontSize: 14, outline: "none", fontFamily: "inherit" }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "rgba(255,255,255,0.85)", fontSize: 14, outline: "none", fontFamily: "inherit" }}
            />
          </div>

          {error && (
            <div style={{ background: "rgba(220,38,38,0.1)", border: "0.5px solid rgba(220,38,38,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f87171", marginBottom: "1rem", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", background: loading ? "#534AB7" : "#7F77DD", border: "none", borderRadius: 10, padding: 12, color: "white", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {loading ? "Connexion..." : "Se connecter →"}
          </button>
        </form>

        {/* Stores */}
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.8rem" }}>
            <div style={{ flex: 1, height: 0.5, background: "rgba(255,255,255,0.1)" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>3 boutiques connectées</span>
            <div style={{ flex: 1, height: 0.5, background: "rgba(255,255,255,0.1)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {["LEKIDI", "DEGASTYLE", "GYMFORCE"].map(s => (
              <div key={s} style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 8px", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{s}</div>
            ))}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: "1.2rem" }}>Accès réservé — équipe EcomOS</p>
      </div>
    </div>
  );
}