"use client";

import Link from "next/link";
import { FlaskConical, LayoutTemplate, MessageSquare, Share2 } from "lucide-react";
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

export default function LandingPage() {
    return (
        <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
            <header style={{ height: 66, borderBottom: `1px solid ${T.border}`, background: T.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 4, background: T.sidebar, color: T.textInv, display: "flex", alignItems: "center", justifyContent: "center", ...mono, fontSize: 11, fontWeight: 700 }}>N</div>
                    <span style={{ ...mono, fontSize: 13, letterSpacing: 1.2 }}>notebook</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <Link href="/login" style={{ ...mono, fontSize: 11, color: T.textMid, textDecoration: "none", border: `1px solid ${T.border}`, borderRadius: 4, padding: "7px 12px" }}>Log in</Link>
                    <Link href="/register" style={{ ...mono, fontSize: 11, color: "#fff", textDecoration: "none", border: `1px solid ${T.blue}`, background: T.blue, borderRadius: 4, padding: "7px 12px" }}>Get early access</Link>
                </div>
            </header>

            <main style={{ maxWidth: 1120, margin: "0 auto", padding: "42px 24px 56px" }}>
                <section style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 20, alignItems: "stretch" }}>
                    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "26px 24px" }}>
                        <div style={{ ...mono, fontSize: 10, letterSpacing: 1.2, color: T.textLight, marginBottom: 12 }}>MVP · BENCH SCIENTIST FLOW</div>
                        <h1 style={{ margin: 0, ...mono, fontSize: 32, lineHeight: 1.2, letterSpacing: -0.6 }}>Electronic lab notes built for real bench workflows</h1>
                        <p style={{ ...mono, fontSize: 12, color: T.textMid, lineHeight: 1.8, marginTop: 14, maxWidth: 560 }}>
                            Plan, capture, and review experiments in a visual canvas with reusable templates, live metadata,
                            and link-based collaboration.
                        </p>
                        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                            <Link href="/register" style={{ ...mono, fontSize: 11, color: "#fff", textDecoration: "none", border: `1px solid ${T.blue}`, background: T.blue, borderRadius: 4, padding: "8px 14px" }}>
                                Get early access
                            </Link>
                            <Link href="/login" style={{ ...mono, fontSize: 11, color: T.textMid, textDecoration: "none", border: `1px solid ${T.border}`, borderRadius: 4, padding: "8px 14px" }}>
                                Open dashboard
                            </Link>
                        </div>
                    </div>

                    <div style={{ background: "linear-gradient(180deg, #1b1b1b 0%, #101010 100%)", borderRadius: 10, border: "1px solid #222", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ ...mono, fontSize: 10, color: "#a8a8a8", letterSpacing: 1.2 }}>DEMO PREVIEW</div>
                        <div style={{ flex: 1, borderRadius: 8, border: "1px solid #2b2b2b", background: "radial-gradient(circle at 20% 20%, rgba(119,165,255,0.22), transparent 46%), radial-gradient(circle at 75% 72%, rgba(83,190,130,0.2), transparent 44%), #111", minHeight: 220, display: "grid", placeItems: "center" }}>
                            <span style={{ ...mono, fontSize: 11, color: "#d6d6d6" }}>Demo GIF Placeholder</span>
                        </div>
                    </div>
                </section>

                <section style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                    {featureCards.map(item => {
                        const Icon = item.icon;
                        return (
                            <article key={item.title} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "14px 14px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                    <Icon size={14} color={T.blue} />
                                    <span style={{ ...mono, fontSize: 11, color: T.text }}>{item.title}</span>
                                </div>
                                <p style={{ ...mono, margin: 0, fontSize: 10.5, color: T.textMid, lineHeight: 1.6 }}>{item.desc}</p>
                            </article>
                        );
                    })}
                </section>
            </main>
        </div>
    );
}
