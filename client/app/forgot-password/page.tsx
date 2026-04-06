"use client";

import { useState } from "react";
import Link from "next/link";
import { T, mono, serif } from "../../theme";
import { useAuth } from "../../context/AuthContext";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestPasswordReset } = useAuth();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to request password reset.";
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

        <h1 style={{ ...serif, fontSize: 24, fontWeight: 300, color: T.text, margin: "0 0 8px 0" }}>Reset password</h1>

        {submitted ? (
          <div>
            <p style={{ ...mono, fontSize: 11, color: T.textLight, marginBottom: 30, lineHeight: 1.5 }}>
              If an account exists for {email}, you will receive a password reset link shortly.
            </p>
            <Link href="/login" style={{
              display: "block",
              textAlign: "center",
              ...mono,
              fontSize: 11,
              padding: "12px",
              background: T.text,
              color: T.surface,
              textDecoration: "none",
              borderRadius: 4,
            }}>
              Return to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ ...mono, fontSize: 11, color: T.textLight, marginBottom: 14 }}>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
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
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>

            {error && (
              <p style={{ ...mono, fontSize: 10, color: "#B00020", margin: "4px 0 0" }}>
                {error}
              </p>
            )}

            <div style={{ ...mono, fontSize: 11, color: T.textLight, textAlign: "center", marginTop: 24 }}>
              Remember your password? <Link href="/login" style={{ color: T.text, textDecoration: "none" }}>Sign in</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
