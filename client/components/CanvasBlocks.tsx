"use client";

import { useRef, useEffect } from "react";
import { T, mono } from "../theme";
import { BLOCK_COLORS, BTYPE_META } from "../data/mock";

// Defining loosely but enough to appease TypeScript's strict rules
export interface BlockData {
    id?: string;
    title?: string;
    content?: string;
    steps?: { id: number | string; text: string; done: boolean }[];
    cols?: string[];
    rows?: string[][];
    filename?: string;
    size?: string;
    type?: string;
    x?: number;
    y?: number;
    w?: number;
    [key: string]: unknown;
}

interface BlockProps {
    block: BlockData;
    onChange: (u: Partial<BlockData>) => void;
}

function BlockNote({ block, onChange }: BlockProps) {
    const content = (block.content as string) || "";
    return <textarea value={content} onChange={e => onChange({ content: e.target.value })}
        placeholder="Write your note" rows={Math.max(3, content.split("\n").length + 1)}
        style={{ width: "100%", padding: "10px 12px", border: "none", outline: "none", background: "transparent", ...mono, fontSize: 12, lineHeight: 1.75, color: T.text, resize: "none", display: "block" }} />;
}

function BlockProtocol({ block, onChange }: BlockProps) {
    const steps = (block.steps as { id: number | string, text: string, done: boolean }[]) || [{ id: 1, text: "", done: false }];
    const upd = (id: number | string, p: { text?: string; done?: boolean }) => onChange({ steps: steps.map((s) => s.id === id ? { ...s, ...p } : s) });
    const add = () => onChange({ steps: [...steps, { id: Date.now(), text: "", done: false }] });
    const del = (id: number | string) => onChange({ steps: steps.filter((s) => s.id !== id) });

    return (
        <div style={{ padding: "8px 12px" }}>
            {steps.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 14, height: 14, border: `1px solid ${T.border}`, borderRadius: 2, background: s.done ? T.text : "transparent", cursor: "pointer", marginTop: 4 }}
                        onClick={() => upd(s.id, { done: !s.done })} />
                    <textarea value={s.text} onChange={e => upd(s.id, { text: e.target.value })}
                        placeholder={`Step ${i + 1}`} rows={1}
                        style={{ flex: 1, border: "none", outline: "none", background: "transparent", ...mono, fontSize: 11.5, lineHeight: 1.6, color: s.done ? T.textLight : T.text, textDecoration: s.done ? "line-through" : "none", resize: "none" }} />
                    <button onClick={() => del(s.id)} style={{ background: "none", border: "none", color: T.textLight, cursor: "pointer", fontSize: 10, padding: 4 }}></button>
                </div>
            ))}
            <button onClick={add} style={{ ...mono, fontSize: 10, color: T.textMid, background: "none", border: `1px dashed ${T.border}`, padding: "4px 8px", borderRadius: 2, cursor: "pointer", width: "100%", marginTop: 4 }}>+ add step</button>
        </div>
    );
}

function BlockData({ block }: BlockProps) {
    const cols = (block.cols as string[]) || ["Sample", "Value", "Notes"];
    const rows = (block.rows as any[]) || [["Ctrl-1", "0.05", "baseline"], ["Exp-A", "1.24", "peak"]];

    return (
        <div style={{ padding: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: 11, textAlign: "left" }}>
                <thead>
                    <tr>{cols.map((c, i) => <th key={i} style={{ padding: "6px 8px", borderBottom: `1px solid ${T.border}`, color: T.textMid, fontWeight: "normal" }}>{c}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => {
                        const cells = Array.isArray(r) ? r : (typeof r === 'object' && r !== null ? [r.key || r.name || "", r.value || r.val || "", r.unit || r.notes || ""] : [String(r)]);
                        return (
                            <tr key={i}>{cells.map((c, j) => <td key={j} style={{ padding: "6px 8px", borderBottom: `1px solid ${T.border}`, color: T.text }}>{c}</td>)}</tr>
                        );
                    })}
                </tbody>
            </table>
            <div style={{ ...mono, fontSize: 10, color: T.textLight, marginTop: 8, textAlign: "right" }}>* Read-only view (connect DB to edit)</div>
        </div>
    );
}

function BlockFile({ block }: BlockProps) {
    const filename = (block.filename as string) || "sequence_v2.fasta";
    const size = (block.size as string) || "1.2 MB";
    return (
        <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 40, border: `1px solid ${T.border}`, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", background: T.border, color: T.textMid, ...mono, fontSize: 10 }}>FA</div>
            <div>
                <div style={{ ...mono, fontSize: 12, color: T.text, marginBottom: 2 }}>{filename}</div>
                <div style={{ ...mono, fontSize: 10, color: T.textLight }}>{size}</div>
            </div>
        </div>
    );
}

const RENDERERS: Record<string, React.FC<BlockProps>> = {
    text: BlockNote,
    note: BlockNote,
    protocol: BlockProtocol,
    data: BlockData,
    measurement: BlockData,
    file: BlockFile,
    observation: BlockNote,
    tag: BlockNote
};

export function CanvasBlock({ block, isSelected, onClick, onChange, onFocus, zoom = 1 }: { block: BlockData, isSelected: boolean, onClick: () => void, onChange: (id: string, u: Partial<BlockData>) => void, onFocus?: () => void, zoom?: number }) {
    const onMD = (e: React.MouseEvent) => {
        if (["TEXTAREA", "INPUT", "BUTTON"].includes((e.target as HTMLElement).tagName)) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const initX = block.x || 0;
        const initY = block.y || 0;

        const onMM = (me: MouseEvent) => {
            const dx = (me.clientX - startX) / zoom;
            const dy = (me.clientY - startY) / zoom;
            onChange(block.id || "", { x: Math.max(0, initX + dx), y: Math.max(0, initY + dy) });
        };

        const onMU = () => {
            window.removeEventListener("mousemove", onMM);
            window.removeEventListener("mouseup", onMU);
        };

        window.addEventListener("mousemove", onMM);
        window.addEventListener("mouseup", onMU);
        onClick(); // Select it on mouse down!
    };

    const Cmp = RENDERERS[block.type || ""] || BlockNote;
    const meta = BTYPE_META[block.type as keyof typeof BTYPE_META] || BTYPE_META.text || { icon: "", label: "Unknown" };
    const colors = BLOCK_COLORS[block.type as keyof typeof BLOCK_COLORS] || BLOCK_COLORS.text || { bg: "#FAFAF8", text: T.text, border: "#FAFAF8" };

    return (
        <div onClick={onClick} onFocus={onFocus}
            style={{
                background: T.surface,
                border: `1px solid ${isSelected ? (colors.border || T.border) : T.border}`,
                borderRadius: 4,
                boxShadow: isSelected ? `0 0 0 1px ${colors.border || T.border}, 0 4px 12px rgba(0,0,0,0.05)` : "0 1px 3px rgba(0,0,0,0.02)",
                transition: "box-shadow 0.15s, border-color 0.15s",
                overflow: "hidden"
            }}>

            {/* Header */}
            <div title="Drag to move block"
                onMouseDown={onMD}
                style={{
                    background: colors.bg,
                    borderBottom: `1px solid ${isSelected ? (colors.border || T.border) : T.border}`,
                    padding: "6px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "grab"
                }}>
                <div style={{ ...mono, fontSize: 10, color: colors.text, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5 }}>{meta.icon}</div>
                <div style={{ ...mono, fontSize: 10.5, color: T.text, flex: 1 }}>{block.title || meta.label}</div>
            </div>

            {/* Body */}
            <div>
                <Cmp block={block} onChange={(u: Partial<BlockData>) => onChange(block.id || "", u)} />
            </div>
        </div>
    );
}

export function BlockPalette({ onSelect }: { onSelect: (type: string) => void }) {
    const types = ["text", "protocol", "measurement", "observation"];
    return (
        <div style={{ display: "flex", gap: 8, background: T.surface, padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
            {types.map(t => {
                const colors = BLOCK_COLORS[t as keyof typeof BLOCK_COLORS] || BLOCK_COLORS.text;
                const meta = BTYPE_META[t as keyof typeof BTYPE_META] || BTYPE_META.text;
                return (
                    <button title={`Add ${t} block`} key={t} onClick={() => onSelect(t)}
                        style={{
                            ...mono, fontSize: 11, background: colors.bg, color: colors.text, border: `1px solid ${colors.border || T.border}`,
                            padding: "6px 12px", borderRadius: 3, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "transform 0.1s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "none"}
                    >
                        <span>{meta.icon}</span> <span>{meta.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
