"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T, mono, serif } from "../../theme";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: T.bg
    }}>
      <div style={{
        width: 400,
        background: T.surface,
        borderRadius: 6,
        border: `1px solid ${T.border}`,
        boxShadow: "0 24px 64px rgba(0,0,0,0.08)",
        padding: "40px 32px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 30 }}>
          <div style={{ width: 22, height: 22, background: T.sidebar, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: T.textInv }}>ℕ</span>
          </div>
          <span style={{ ...serif, fontSize: 18, fontWeight: 300, color: T.text, letterSpacing: -0.2 }}>notebook</span>
        </div>

        <h1 style={{ ...serif, fontSize: 24, fontWeight: 300, color: T.text, margin: "0 0 8px 0" }}>Welcome back</h1>
        <p style={{ ...mono, fontSize: 11, color: T.textLight, marginBottom: 30 }}>Enter your details to sign in.</p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ ...mono, fontSize: 10, color: T.textMid, display: "block", marginBottom: 6 }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${T.border}`,
                borderRadius: 4,
                background: "transparent",
                color: T.text,
                fontSize: 12,
                outline: "none"
              }}
              onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.style.borderColor = T.text}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => e.target.style.borderColor = T.border}
            />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ ...mono, fontSize: 10, color: T.textMid }}>Password</label>
              <Link href="/forgot-password" style={{ ...mono, fontSize: 10, color: T.textLight, textDecoration: "none" }}>Forgot password?</Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${T.border}`,
                borderRadius: 4,
                background: "transparent",
                color: T.text,
                fontSize: 12,
                outline: "none"
              }}
              onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.style.borderColor = T.text}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => e.target.style.borderColor = T.border}
            />
          </div>

          <button type="submit" style={{
            ...mono,
            fontSize: 11,
            padding: "12px",
            background: T.text,
            color: T.surface,
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            marginTop: 10
          }} disabled={isSubmitting}>
            {isSubmitting ? "Signing In..." : "Sign In"}
          </button>

          {error && (
            <p style={{ ...mono, fontSize: 10, color: "#B00020", margin: "4px 0 0" }}>
              {error}
            </p>
          )}
        </form>

        <div style={{ ...mono, fontSize: 11, color: T.textLight, textAlign: "center", marginTop: 24 }}>
          Don&apos;t have an account? <Link href="/register" style={{ color: T.text, textDecoration: "none" }}>Register</Link>
        </div>
      </div>
    </div>
  );
}
