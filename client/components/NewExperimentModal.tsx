"use client";

import { useState } from "react";
import { BarChart3, ClipboardList, FileText, Image as ImageIcon, NotebookPen } from "lucide-react";
import { T, mono } from "../theme";

interface Template {
    id: string;
    name: string;
    icon: string;
    color: string;
    desc: string;
    blocks: number;
}

type TemplateIconKey = "note" | "protocol" | "result" | "image" | "template";

function renderTemplateIcon(icon: string, color: string) {
    const iconProps = { size: 14, color, strokeWidth: 2 };
    const key = icon as TemplateIconKey;
    if (key === "protocol") return <ClipboardList {...iconProps} />;
    if (key === "result") return <BarChart3 {...iconProps} />;
    if (key === "image") return <ImageIcon {...iconProps} />;
    if (key === "template") return <FileText {...iconProps} />;
    return <NotebookPen {...iconProps} />;
}

interface NewExperimentModalProps {
    onClose: () => void;
    onCreate: (title: string, mode: string, picked: string | null) => void;
    templates: Template[];
}

export function NewExperimentModal({ onClose, onCreate, templates }: NewExperimentModalProps) {
    const [title, setTitle] = useState("");
    const [mode, setMode] = useState("blank"); // blank | template
    const [picked, setPicked] = useState<string | null>(null);
    const canCreate = title.trim() && (mode === "blank" || Boolean(picked));

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ width: 560, background: T.surface, borderRadius: 6, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ ...mono, fontSize: 10, color: T.textLight, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>New experiment</div>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Experiment title" autoFocus
                        style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 300, color: T.text, letterSpacing: -0.3 }} />
                    <div style={{ ...mono, fontSize: 10, color: T.textLight, marginTop: 6 }}>
                        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </div>
                </div>

                {/* Mode tabs */}
                <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>
                    {[["blank", "Start blank"], ["template", "From template"]].map(([m, l]) => (
                        <button key={m} onClick={() => setMode(m)} style={{
                            flex: 1, padding: "10px 0", background: mode === m ? T.bg : "transparent",
                            border: "none", borderBottom: mode === m ? `2px solid ${T.text}` : "2px solid transparent",
                            ...mono, fontSize: 11, color: mode === m ? T.text : T.textLight, cursor: "pointer", marginBottom: -1
                        }}>{l}</button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ padding: "16px 24px 20px", maxHeight: 300, overflowY: "auto" }}>
                    {mode === "blank" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ ...mono, fontSize: 10, color: T.textLight, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Canvas starts empty</div>
                            <div style={{ border: `1.5px dashed ${T.border}`, borderRadius: 4, padding: "28px 0", textAlign: "center", background: T.bg }}>
                                <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.2 }}></div>
                                <div style={{ ...mono, fontSize: 11, color: T.textLight }}>Blank dot-grid canvas</div>
                                <div style={{ ...mono, fontSize: 10, color: T.textLight, marginTop: 3 }}>Add any block type freely</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {templates.map(tmpl => (
                                <button key={tmpl.id} onClick={() => setPicked(tmpl.id)}
                                    style={{
                                        padding: "12px 14px", border: `1.5px solid ${picked === tmpl.id ? tmpl.color : T.border}`,
                                        borderRadius: 4, background: picked === tmpl.id ? tmpl.color + "0e" : T.surface,
                                        cursor: "pointer", textAlign: "left", transition: "all 0.12s"
                                    }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                                        <span style={{ display: "flex", alignItems: "center" }}>{renderTemplateIcon(tmpl.icon, tmpl.color)}</span>
                                        <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: picked === tmpl.id ? tmpl.color : T.text }}>{tmpl.name}</span>
                                    </div>
                                    <div style={{ ...mono, fontSize: 9.5, color: T.textMid, lineHeight: 1.5 }}>{tmpl.desc}</div>
                                    <div style={{ ...mono, fontSize: 9, color: T.textLight, marginTop: 6 }}>{tmpl.blocks} blocks pre-filled</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: "12px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button onClick={onClose} style={{ ...mono, fontSize: 11, padding: "8px 16px", border: `1px solid ${T.border}`, borderRadius: 3, background: "transparent", color: T.textMid, cursor: "pointer" }}>Cancel</button>
                    <button onClick={() => { if (canCreate) onCreate(title, mode, picked); }} disabled={!canCreate}
                        style={{
                            ...mono, fontSize: 11, padding: "8px 18px", border: "none", borderRadius: 3,
                            background: canCreate ? T.text : T.border, color: "#fff", cursor: canCreate ? "pointer" : "default"
                        }}>
                        Create experiment
                    </button>
                </div>
            </div>
        </div>
    );
}
