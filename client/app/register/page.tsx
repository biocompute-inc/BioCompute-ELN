"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T, mono, serif } from "../../theme";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { register } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        fullName: name.trim(),
      });
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create account.";
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

        <h1 style={{ ...serif, fontSize: 24, fontWeight: 300, color: T.text, margin: "0 0 8px 0" }}>Create account</h1>
        <p style={{ ...mono, fontSize: 11, color: T.textLight, marginBottom: 30 }}>Get started with your free account.</p>

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ ...mono, fontSize: 10, color: T.textMid, display: "block", marginBottom: 6 }}>Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            <label style={{ ...mono, fontSize: 10, color: T.textMid, display: "block", marginBottom: 6 }}>Password</label>
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
            {isSubmitting ? "Creating..." : "Create Account"}
          </button>

          {error && (
            <p style={{ ...mono, fontSize: 10, color: "#B00020", margin: "4px 0 0" }}>
              {error}
            </p>
          )}
        </form>

        <div style={{ ...mono, fontSize: 11, color: T.textLight, textAlign: "center", marginTop: 24 }}>
          Already have an account? <Link href="/login" style={{ color: T.text, textDecoration: "none" }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
