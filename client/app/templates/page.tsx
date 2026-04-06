"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, ClipboardList, FileText, Image as ImageIcon, NotebookPen } from "lucide-react";
import { T, serif, mono } from "../../theme";
import { Topbar } from "../../components/Topbar";
import {
    ExperimentTemplate,
    TEMPLATES_CHANGED_EVENT,
    readTemplateBlocksMap,
    readTemplatesFromSession,
} from "../../data/mock";

type TemplateIconKey = "note" | "protocol" | "result" | "image" | "template";

function renderTemplateIcon(icon: string, color: string, size = 18) {
    const iconProps = { size, color, strokeWidth: 2 };
    const key = icon as TemplateIconKey;
    if (key === "protocol") return <ClipboardList {...iconProps} />;
    if (key === "result") return <BarChart3 {...iconProps} />;
    if (key === "image") return <ImageIcon {...iconProps} />;
    if (key === "template") return <FileText {...iconProps} />;
    return <NotebookPen {...iconProps} />;
}

export default function TemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<ExperimentTemplate[]>(() => readTemplatesFromSession());
    const [activeId, setActiveId] = useState<string>(templates[0]?.id || "");
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState<string>("all");

    const classifyTemplate = (template: ExperimentTemplate) => {
        const text = `${template.name} ${template.desc}`.toLowerCase();
        if (text.includes("pcr")) return "pcr";
        if (text.includes("western")) return "western";
        if (text.includes("crispr")) return "crispr";
        if (text.includes("culture")) return "culture";
        if (text.includes("cloning")) return "cloning";
        return "general";
    };

    useEffect(() => {
        const sync = () => {
            const next = readTemplatesFromSession();
            setTemplates(next);
            if (!next.find(t => t.id === activeId)) {
                setActiveId(next[0]?.id || "");
            }
        };
        sync();
        window.addEventListener(TEMPLATES_CHANGED_EVENT, sync);
        return () => window.removeEventListener(TEMPLATES_CHANGED_EVENT, sync);
    }, [activeId]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const byCategory = category === "all"
            ? templates
            : templates.filter(template => classifyTemplate(template) === category);

        if (!q) return byCategory;
        return byCategory.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.desc.toLowerCase().includes(q)
        );
    }, [category, query, templates]);

    const activeTemplate = filtered.find(t => t.id === activeId) || filtered[0] || null;
    const previewBlocks = activeTemplate ? (readTemplateBlocksMap()[activeTemplate.id] || []) : [];

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <Topbar title="Templates" />

            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, background: T.surface, display: "flex", alignItems: "center", gap: 10 }}>
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search templates..."
                    style={{ ...mono, fontSize: 10.5, width: 240, padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, outline: "none", background: T.surface }}
                />
                <div style={{ ...mono, fontSize: 10, color: T.textLight }}>{templates.length} total templates</div>
            </div>

            <div style={{ padding: "10px 20px", borderBottom: `1px solid ${T.border}`, background: T.surface, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["all", "pcr", "western", "crispr", "culture", "cloning"].map(item => (
                    <button
                        key={item}
                        onClick={() => setCategory(item)}
                        style={{
                            ...mono,
                            fontSize: 10,
                            padding: "5px 9px",
                            borderRadius: 14,
                            border: `1px solid ${category === item ? T.blue : T.border}`,
                            background: category === item ? "rgba(122,169,255,0.22)" : T.surface,
                            color: category === item ? T.text : T.textMid,
                            cursor: "pointer",
                            textTransform: "uppercase",
                        }}
                    >
                        {item}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "340px 1fr", gap: 0 }}>
                <div style={{ borderRight: `1px solid ${T.border}`, background: T.bg, overflowY: "auto", padding: 14 }}>
                    <div style={{ ...mono, fontSize: 9, color: T.textLight, marginBottom: 10, letterSpacing: 1.2, textTransform: "uppercase" }}>Template Gallery</div>
                    <div style={{ display: "grid", gap: 10 }}>
                        {filtered.map(template => (
                            <button
                                key={template.id}
                                onClick={() => setActiveId(template.id)}
                                style={{
                                    textAlign: "left",
                                    width: "100%",
                                    border: `1px solid ${activeTemplate?.id === template.id ? template.color : T.border}`,
                                    background: activeTemplate?.id === template.id ? `${template.color}14` : T.surface,
                                    borderRadius: 6,
                                    padding: "12px 12px",
                                    cursor: "pointer",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        {renderTemplateIcon(template.icon, template.color, 16)}
                                        <span style={{ ...mono, fontSize: 10.5, color: T.text, fontWeight: 600 }}>{template.name}</span>
                                    </span>
                                    <span style={{ ...mono, fontSize: 8.5, color: T.textLight }}>{template.source === "custom" ? "Custom" : "Base"}</span>
                                </div>
                                <div style={{ ...mono, fontSize: 9.5, color: T.textMid, lineHeight: 1.5 }}>{template.desc}</div>
                                <div style={{ ...mono, fontSize: 9, color: T.textLight, marginTop: 8 }}>{template.blocks} blocks</div>
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <div style={{ ...mono, fontSize: 10, color: T.textLight, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "16px 12px", textAlign: "center" }}>
                                No templates match this search.
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ background: T.surface, overflowY: "auto", padding: 20 }}>
                    {!activeTemplate ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, height: "100%" }}>
                            <div style={{ ...serif, fontSize: 22, color: T.text }}>No Template Selected</div>
                            <div style={{ ...mono, fontSize: 11, color: T.textLight }}>Choose one from the gallery to preview its content.</div>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                        {renderTemplateIcon(activeTemplate.icon, activeTemplate.color, 20)}
                                        <span style={{ ...serif, fontSize: 24, color: T.text }}>{activeTemplate.name}</span>
                                    </div>
                                    <div style={{ ...mono, fontSize: 10.5, color: T.textMid }}>{activeTemplate.desc}</div>
                                </div>
                                <button
                                    onClick={() => router.push("/")}
                                    style={{ ...mono, fontSize: 10.5, border: `1px solid ${T.text}`, borderRadius: 4, background: T.text, color: "#fff", padding: "7px 12px", cursor: "pointer" }}
                                >
                                    Use In New Experiment
                                </button>
                            </div>

                            <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
                                <div style={{ ...mono, fontSize: 9, color: T.textLight, background: T.bg, borderBottom: `1px solid ${T.border}`, padding: "8px 10px", letterSpacing: 1.1, textTransform: "uppercase" }}>Template Preview</div>
                                <div style={{ padding: 12, display: "grid", gap: 8, background: "#f7f6f2" }}>
                                    {previewBlocks.map(block => (
                                        <div key={block.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 12px" }}>
                                            <div style={{ ...mono, fontSize: 8.5, color: T.textLight, marginBottom: 4, letterSpacing: 1 }}>{String(block.type).toUpperCase()}</div>
                                            <div style={{ ...mono, fontSize: 10.5, color: T.text, marginBottom: 2 }}>{String(block.data?.title || block.data?.label || "Untitled")}</div>
                                            <div style={{ ...mono, fontSize: 9.5, color: T.textMid }}>
                                                {String(block.data?.text || block.data?.templateName || "Preview of block content")}
                                            </div>
                                        </div>
                                    ))}
                                    {previewBlocks.length === 0 && (
                                        <div style={{ ...mono, fontSize: 10, color: T.textLight, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "14px 12px", textAlign: "center", background: T.surface }}>
                                            This template currently has no blocks.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
