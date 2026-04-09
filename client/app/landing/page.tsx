"use client";

import Link from "next/link";
import { FlaskConical, LayoutTemplate, MessageSquare, Share2, ArrowRight, Check } from "lucide-react";
import { T, mono } from "../../theme";

const featureCards = [
    {
        title: "Create Experiments",
        desc: "Start blank or bootstrap from a prepared structure in seconds.",
        icon: FlaskConical,
    },
    {
        title: "Template Workflows",
        desc: "Category-driven templates for PCR, Western, CRISPR, culture, and cloning.",
        icon: LayoutTemplate,
    },
    {
        title: "Share & Review",
        desc: "Generate read-only or comment links for collaborators and PIs.",
        icon: Share2,
    },
    {
        title: "Threaded Comments",
        desc: "Capture timestamped feedback and resolve review threads.",
        icon: MessageSquare,
    },
];

const benefits = [
    "Real-time collaboration with team members",
    "Audit trails and compliance-ready logging",
    "Integrate with your existing lab software",
];

const LANDING_ACCENT = T.amber;
const LANDING_ACCENT_SOFT = T.amberL;
const LANDING_PRIMARY = T.sidebar;
const LANDING_PRIMARY_TEXT = T.textInv;

export default function LandingPage() {
    return (
        <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
            {/* Header */}
            <header style={{ height: 72, borderBottom: `1px solid ${T.border}`, background: T.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: LANDING_PRIMARY, color: LANDING_PRIMARY_TEXT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700 }}>B</div>
                    <div>
                        <div style={{ ...mono, fontSize: 13, fontWeight: 600, letterSpacing: -0.3 }}>BioCompute</div>
                        <div style={{ ...mono, fontSize: 9, color: T.textLight, letterSpacing: 0.8, textTransform: "uppercase" }}>ELN Platform</div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Link href="/login" style={{ ...mono, fontSize: 11, color: T.textMid, textDecoration: "none", padding: "8px 16px", transition: "color 0.3s ease", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.color = LANDING_ACCENT} onMouseLeave={(e) => e.currentTarget.style.color = T.textMid}>
                        Log in
                    </Link>
                    <Link href="/register" style={{ ...mono, fontSize: 11, color: LANDING_PRIMARY_TEXT, textDecoration: "none", background: LANDING_PRIMARY, borderRadius: 6, padding: "9px 18px", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "all 0.3s ease", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>
                        Get early access <ArrowRight size={13} />
                    </Link>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                <section style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 32px", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 48, alignItems: "center" }}>
                    <div>
                        <div style={{ ...mono, fontSize: 11, letterSpacing: 1.2, color: LANDING_ACCENT, marginBottom: 16, fontWeight: 600, textTransform: "uppercase" }}>The future of lab documentation</div>

                        <h1 style={{ margin: 0, fontSize: 56, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.2, marginBottom: 20, color: T.text }}>
                            Electronic lab notes built for real bench workflows
                        </h1>

                        <p style={{ ...mono, fontSize: 15, color: T.textMid, lineHeight: 1.8, marginBottom: 32, maxWidth: 520 }}>
                            Plan, capture, and review experiments in a visual canvas with reusable templates, live metadata, and seamless collaboration. Built by scientists, for scientists.
                        </p>

                        <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
                            <Link href="/register" style={{ ...mono, fontSize: 12, color: LANDING_PRIMARY_TEXT, textDecoration: "none", background: LANDING_PRIMARY, borderRadius: 8, padding: "12px 24px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8, transition: "all 0.3s ease", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>
                                Start free trial <ArrowRight size={14} />
                            </Link>
                            <Link href="/login" style={{ ...mono, fontSize: 12, color: T.text, textDecoration: "none", border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "12px 24px", fontWeight: 500, transition: "all 0.3s ease", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = LANDING_ACCENT; e.currentTarget.style.color = LANDING_ACCENT; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text; }}>
                                Watch demo
                            </Link>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                            {benefits.map((benefit) => (
                                <div key={benefit} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: LANDING_PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                                        <Check size={12} color="#fff" />
                                    </div>
                                    <span style={{ ...mono, fontSize: 12, color: T.textMid, lineHeight: 1.4 }}>{benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hero Visual */}
                    <div style={{ position: "relative" }}>
                        <div style={{ borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden", background: `linear-gradient(145deg, ${LANDING_ACCENT_SOFT} 0%, ${T.surface} 44%, ${T.bg} 100%)` }}>
                            <div style={{ aspectRatio: "1 / 1.1", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                                <div style={{ textAlign: "center" }}>
                                    <div style={{ ...mono, fontSize: 12, color: LANDING_ACCENT, fontWeight: 600, marginBottom: 8 }}>Canvas Preview</div>
                                    <p style={{ ...mono, fontSize: 11, color: T.textLight, margin: 0 }}>Interactive experiment interface</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 32px" }}>
                    <div style={{ textAlign: "center", marginBottom: 48 }}>
                        <div style={{ ...mono, fontSize: 11, letterSpacing: 1.2, color: LANDING_ACCENT, marginBottom: 12, fontWeight: 600, textTransform: "uppercase" }}>Powerful features</div>
                        <h2 style={{ ...mono, fontSize: 36, fontWeight: 700, margin: 0, marginBottom: 16, letterSpacing: -0.8, color: T.text }}>Everything you need</h2>
                        <p style={{ ...mono, fontSize: 14, color: T.textMid, maxWidth: 500, margin: "0 auto" }}>Comprehensive tools designed to streamline your lab workflow and collaboration</p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
                        {featureCards.map((item) => {
                            const Icon = item.icon;
                            return (
                                <article
                                    key={item.title}
                                    style={{
                                        background: T.surface,
                                        border: `1px solid ${T.border}`,
                                        borderRadius: 12,
                                        padding: "28px 24px",
                                        transition: "all 0.3s ease",
                                        cursor: "pointer",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = LANDING_ACCENT;
                                        e.currentTarget.style.transform = "translateY(-4px)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = T.border;
                                        e.currentTarget.style.transform = "translateY(0)";
                                    }}
                                >
                                    <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 8, background: LANDING_ACCENT_SOFT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <Icon size={18} color={LANDING_ACCENT} strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: T.text, display: "block" }}>{item.title}</span>
                                        </div>
                                    </div>
                                    <p style={{ ...mono, margin: 0, fontSize: 13, color: T.textMid, lineHeight: 1.6 }}>{item.desc}</p>
                                </article>
                            );
                        })}
                    </div>
                </section>

                {/* CTA Section */}
                <section style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 32px" }}>
                    <div style={{ background: `linear-gradient(155deg, ${T.surface} 0%, ${LANDING_ACCENT_SOFT} 100%)`, border: `1px solid ${T.border}`, borderRadius: 16, padding: "60px 40px", textAlign: "center" }}>
                        <h2 style={{ ...mono, fontSize: 32, fontWeight: 700, margin: 0, marginBottom: 16, letterSpacing: -0.6, color: T.text }}>Ready to transform your lab?</h2>
                        <p style={{ ...mono, fontSize: 14, color: T.textMid, maxWidth: 520, margin: "0 auto 32px auto" }}>Join early users and experience the future of electronic lab notebooks today</p>
                        <Link href="/register" style={{ ...mono, fontSize: 12, color: LANDING_PRIMARY_TEXT, textDecoration: "none", background: LANDING_PRIMARY, borderRadius: 8, padding: "12px 28px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8, transition: "all 0.3s ease", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>
                            Get early access <ArrowRight size={14} />
                        </Link>
                    </div>
                </section>

                {/* Footer */}
                <footer style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px", borderTop: `1px solid ${T.border}`, textAlign: "center" }}>
                    <p style={{ ...mono, fontSize: 11, color: T.textLight, margin: 0 }}>© 2026 BioCompute Inc. Built for bench scientists, by bench scientists.</p>
                </footer>
            </main>
        </div>
    );
}
