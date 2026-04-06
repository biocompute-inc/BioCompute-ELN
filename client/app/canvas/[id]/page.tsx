"use client";

import { useState, useRef, useCallback, useEffect, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    BookmarkPlus,
    Calculator,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    CircleDashed,
    ChartColumnIncreasing,
    Clock3,
    ClipboardList,
    Code2,
    Eye,
    EyeOff,
    FileText,
    Image as ImageIcon,
    Link2,
    ListChecks,
    Lock,
    LockOpen,
    NotebookPen,
    Scan,
    Save,
    Share2,
    Table2,
    Undo2,
    Redo2,
} from "lucide-react";
import { T } from "../../../theme";
import {
    SESSION_CANVASES_KEY,
    SESSION_EXPERIMENTS_KEY,
    SESSION_TEMPLATE_BLOCKS_KEY,
    SESSION_TEMPLATES_KEY,
    TEMPLATES_CHANGED_EVENT,
    getScopedSessionKey,
    readTemplateBlocksMap,
} from "../../../data/mock";
import { emitToast } from "../../../lib/ui-events";
import { useAuth } from "../../../context/AuthContext";

type SharePermission = "read" | "comment";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
    bg: T.bg,
    surface: T.surface,
    panel: T.surface,
    panelBorder: T.border,
    rail: T.surface,
    accent: T.blue,
    accentDim: T.blueL,
    accentGlow: "rgba(29, 58, 107, 0.08)",
    amber: T.amber,
    red: T.red,
    green: T.green,
    text: T.text,
    textMid: T.textMid,
    textDim: T.textLight,
    border: T.border,
    borderMid: "#E8E6DF",
    selection: T.blueL,
    selectionBorder: T.blue,
};

function statusMeta(status: string) {
    if (status === "review") {
        return { label: "In review", color: C.amber, Icon: Clock3 };
    }
    if (status === "complete") {
        return { label: "Complete", color: C.textMid, Icon: CheckCircle2 };
    }
    return { label: "Active", color: C.green, Icon: CircleDashed };
}

const FONT_MONO = `'Inter', sans-serif`;
const FONT_SANS = `'Inter', sans-serif`;
const FONT_LABEL = `'Inter', sans-serif`;

// ─── Types ──────────────────────────────────────────────────────────────────
export type BlockData = {
    id: string;
    type: string;
    x: number;
    y: number;
    w: number;
    h?: number;
    data: Record<string, any>;
    locked?: boolean;
    collapsed?: boolean;
    hidden?: boolean;
    theme?: "default" | "blue" | "green" | "amber" | "rose";
};

type BlockConnection = {
    id: string;
    fromId: string;
    toId: string;
    color?: string;
};

type ExperimentMeta = {
    id: string;
    title: string;
    status: string;
    updated: string;
    objective?: string;
    owner?: string;
    tags?: string[];
};

const BLOCK_THEMES: Array<{ id: BlockData["theme"]; label: string; border: string; bg: string }> = [
    { id: "default", label: "Default", border: C.panelBorder, bg: C.panel },
    { id: "blue", label: "Blue", border: "#4f83cc", bg: "#edf4ff" },
    { id: "green", label: "Green", border: "#4f9d69", bg: "#edf8f0" },
    { id: "amber", label: "Amber", border: "#c98a2b", bg: "#fff6e8" },
    { id: "rose", label: "Rose", border: "#cc6f8c", bg: "#fff0f5" },
];

function resolveBlockTheme(theme: BlockData["theme"]) {
    return BLOCK_THEMES.find(entry => entry.id === theme) || BLOCK_THEMES[0];
}

// ─── Mock data ──────────────────────────────────────────────────────────────
const MOCK_BLOCKS: BlockData[] = [
    { id: "b1", type: "note", x: 80, y: 80, w: 280, data: { title: "Hypothesis", text: "Primary hypothesis: increased glucose uptake correlates with faster membrane permeability at 37°C baseline." } },
    { id: "b2", type: "protocol", x: 420, y: 80, w: 320, data: { title: "Experiment Setup", steps: [{ id: "s1", text: "Prepare reagents" }, { id: "s2", text: "Set incubation conditions" }] } },
    { id: "b4", type: "image", x: 80, y: 320, w: 340, data: { label: "Image", title: "Spectrogram A", src: "" } },
    { id: "b5", type: "measurement", x: 440, y: 260, w: 340, data: { title: "Extraction Metrics", rows: [{ id: "m1", key: "Temp", value: "37", unit: "°C" }, { id: "m2", key: "Centrifuge", value: "12000", unit: "rpm" }] } },
    { id: "b7", type: "observation", x: 80, y: 500, w: 380, data: { title: "Initial Findings", text: "Control group showed no significant variance. Outliers removed via 3σ clipping before final pass." } },
];

const EXPERIMENT = { id: "exp-01", title: "Membrane Permeability Study", status: "active", updated: "2 min ago" };

const BLOCK_TYPES = [
    { type: "note", label: "Note" },
    { type: "protocol", label: "Protocol" },
    { type: "observation", label: "Observation" },
    { type: "measurement", label: "Measurement" },
    { type: "image", label: "Image / Gel" },
    { type: "datatable", label: "Data Table" },
    { type: "tag", label: "Tags" },
];

const ALLOWED_BLOCK_TYPES = new Set(["note", "protocol", "observation", "measurement", "image", "datatable", "tag"]);

const TEXT_SNIPPETS = [
    {
        id: "objective",
        label: "Objective",
        value: "Objective:\n- Define clear experiment objective\n- Record expected outcome\n",
    },
    {
        id: "materials",
        label: "Materials",
        value: "Materials:\n- Reagent:\n- Equipment:\n- Conditions:\n",
    },
    {
        id: "observation",
        label: "Observation",
        value: "Observation:\n- Time:\n- Condition:\n- Notes:\n",
    },
    {
        id: "result",
        label: "Result Summary",
        value: "Result:\n- Primary metric:\n- Secondary metric:\n- Interpretation:\n",
    },
];

const GRID_SIZE = 8;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "OPTION", "BUTTON"]);

type StoredExperiment = {
    id: string;
    title: string;
    status?: string;
    updated?: string;
    blocks?: number;
};

type StoredCanvas = {
    blocks: BlockData[];
    connections?: BlockConnection[];
};

type StoredCanvasById = Record<string, StoredCanvas>;

type TableSource = {
    id: string;
    title: string;
    columns: string[];
    rows: string[][];
};

function safeParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function nowLabel() {
    return new Date().toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function cloneStarterBlocks(): BlockData[] {
    return (readTemplateBlocksMap()["tpl-note"] || []).map(block => ({
        ...block,
        data: { ...block.data },
    })) as BlockData[];
}

function isEditableTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || EDITABLE_TAGS.has(target.tagName);
}

function renderBlockTypeIcon(type: string, color: string, size = 14) {
    const props = { color, size, strokeWidth: 2 };
    if (type === "protocol") return <ClipboardList {...props} />;
    if (type === "observation") return <NotebookPen {...props} />;
    if (type === "measurement") return <BarChart3 {...props} />;
    if (type === "tag") return <FileText {...props} />;
    if (type === "datatable") return <Table2 {...props} />;
    if (type === "image") return <ImageIcon {...props} />;
    return <NotebookPen {...props} />;
}

function getMinWidthForType(type: string) {
    if (type === "measurement") return 300;
    if (type === "datatable") return 340;
    if (type === "image") return 200;
    if (type === "protocol") return 280;
    if (type === "observation") return 300;
    if (type === "tag") return 260;
    return 220;
}

function pickTemplateIconFromBlockType(type: string): "note" | "protocol" | "result" | "image" | "template" {
    if (type === "protocol") return "protocol";
    if (type === "image") return "image";
    return "note";
}

function getEstimatedBlockHeight(type: string) {
    if (type === "measurement") return 220;
    if (type === "datatable") return 280;
    if (type === "protocol") return 240;
    if (type === "observation") return 220;
    if (type === "tag") return 180;
    if (type === "image") return 220;
    return 190;
}

function getBlockHeight(block: BlockData) {
    if (block.collapsed) return 48;
    return block.h ?? getEstimatedBlockHeight(block.type);
}

function cloneBlocksState(input: BlockData[]) {
    return input.map(block => ({
        ...block,
        data: JSON.parse(JSON.stringify(block.data || {})),
    }));
}

function normalizeBlockType(type: string) {
    if (type === "table") return "datatable";
    if (type === "tags") return "tag";
    if (ALLOWED_BLOCK_TYPES.has(type)) return type;
    return "note";
}

function normalizeLegacyBlockData(type: string, data: Record<string, any>) {
    if (type === "note") {
        return {
            title: String(data.title || data.label || ""),
            text: String(data.text || data.content || data.html || data.code || ""),
        };
    }
    if (type === "protocol") {
        return {
            title: String(data.title || ""),
            steps: Array.isArray(data.steps) ? data.steps : [{ id: "s1", text: "" }],
        };
    }
    if (type === "observation") {
        return {
            title: String(data.title || ""),
            text: String(data.text || data.content || ""),
        };
    }
    if (type === "measurement") {
        const rows = Array.isArray(data.rows) ? data.rows : [];
        return {
            title: String(data.title || "Measurements"),
            rows: rows.length > 0 ? rows : [{ id: "m1", key: "", value: "", unit: "" }],
        };
    }
    if (type === "image") {
        return {
            title: String(data.title || ""),
            label: String(data.label || "Image"),
            src: String(data.src || ""),
            cropX: Number.isFinite(data.cropX) ? Number(data.cropX) : 10,
            cropY: Number.isFinite(data.cropY) ? Number(data.cropY) : 10,
            cropW: Number.isFinite(data.cropW) ? Number(data.cropW) : 70,
            cropH: Number.isFinite(data.cropH) ? Number(data.cropH) : 70,
            annotations: Array.isArray(data.annotations) ? data.annotations : [],
            nextAnnotation: String(data.nextAnnotation || ""),
        };
    }
    if (type === "datatable") {
        return {
            title: String(data.title || "Data Table"),
            columns: Array.isArray(data.columns) && data.columns.length > 0 ? data.columns : ["A", "B", "C"],
            rows: Array.isArray(data.rows) && data.rows.length > 0 ? data.rows : [["", "", ""]],
        };
    }
    return {
        title: String(data.title || "Tags"),
        tags: Array.isArray(data.tags) ? data.tags : [],
        draft: String(data.draft || ""),
    };
}

function normalizeBlocks(input: BlockData[]) {
    return input.map((block) => {
        const nextType = normalizeBlockType(String(block.type || "note"));
        return {
            ...block,
            type: nextType,
            data: normalizeLegacyBlockData(nextType, block.data || {}),
        };
    });
}

function readExperimentMeta(canvasId: string, experimentsSessionKey: string): ExperimentMeta {
    if (typeof window === "undefined") return { ...EXPERIMENT };
    const experiments = safeParse<Array<Record<string, unknown>>>(sessionStorage.getItem(experimentsSessionKey), []);
    const current = experiments.find(exp => String(exp.id) === canvasId);
    if (!current) return { ...EXPERIMENT };
    return {
        id: String(current.id || canvasId),
        title: String(current.title || "Untitled"),
        status: String(current.status || "active"),
        updated: String(current.updated || "Not saved"),
        objective: typeof current.objective === "string" ? current.objective : "",
        owner: typeof current.owner === "string" ? current.owner : "",
        tags: Array.isArray(current.tags) ? current.tags.map(v => String(v)) : [],
    };
}

// ─── Block components ────────────────────────────────────────────────────────
function NoteBlock({ data, onChange }: { data: BlockData["data"]; onChange: (d: any) => void }) {
    const [showSnippets, setShowSnippets] = useState(false);

    const insertSnippet = (value: string) => {
        const current = String(data.text || "");
        const nextText = current.endsWith("/") ? `${current.slice(0, -1)}${value}` : `${current}${current ? "\n" : ""}${value}`;
        onChange({ text: nextText });
        setShowSnippets(false);
    };

    return (
        <div style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Note</div>
            <input
                value={data.title || ""}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="Block Title..."
                style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}
            />
            <textarea
                value={data.text || ""}
                onChange={e => {
                    const next = e.target.value;
                    onChange({ text: next });
                    if (next.endsWith("/")) setShowSnippets(true);
                }}
                onKeyDown={e => {
                    if (e.key === "/") setShowSnippets(true);
                    if (e.key === "Escape") setShowSnippets(false);
                }}
                placeholder="Start typing your note…"
                style={{
                    width: "100%", background: "none", border: "none", outline: "none", resize: "none",
                    fontFamily: FONT_SANS, fontSize: 12, color: C.text, lineHeight: 1.65,
                    minHeight: 72,
                }}
            />
            {showSnippets && (
                <div style={{ marginTop: 8, border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, overflow: "hidden" }}>
                    <div style={{ fontFamily: FONT_LABEL, fontSize: 8.5, color: C.textDim, letterSpacing: 1.2, padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>
                        SLASH SNIPPETS
                    </div>
                    {TEXT_SNIPPETS.map(snippet => (
                        <button
                            key={snippet.id}
                            className="tool-btn"
                            onClick={() => insertSnippet(snippet.value)}
                            style={{ width: "100%", textAlign: "left", padding: "7px 8px", borderBottom: `1px solid ${C.border}` }}
                        >
                            <span style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.accent, marginRight: 8 }}>/</span>
                            <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: C.textMid }}>{snippet.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function ProtocolBlock({ data, onChange }: { data: BlockData["data"]; onChange: (d: any) => void }) {
    const steps = data.steps || [{ id: "s1", text: "" }];
    return (
        <div style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Protocol Steps</div>
            <input
                value={data.title || ""}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="Protocol Title..."
                style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {steps.map((step: any, i: number) => (
                    <div key={step.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.textMid, paddingTop: 6 }}>{i + 1}.</div>
                        <textarea
                            value={step.text}
                            onChange={e => {
                                const newSteps = [...steps];
                                newSteps[i] = { ...step, text: e.target.value };
                                onChange({ steps: newSteps });
                            }}
                            placeholder="Step description..."
                            style={{
                                flex: 1, background: C.rail, border: `1px solid ${C.border}`, outline: "none", resize: "none",
                                fontFamily: FONT_SANS, fontSize: 12, color: C.text, padding: "6px 8px", borderRadius: 4, minHeight: 36
                            }}
                        />
                        <button className="tool-btn" onClick={() => onChange({ steps: steps.filter((_: any, idx: number) => idx !== i) })} style={{ color: C.red, paddingTop: 6, fontSize: 14 }}>×</button>
                    </div>
                ))}
            </div>
            <button
                className="tool-btn"
                onClick={() => {
                    const nextStep = `s${steps.length + 1}`;
                    onChange({ steps: [...steps, { id: nextStep, text: "" }] });
                }}
                style={{ marginTop: 10, padding: "6px 8px", background: "none", border: `1px dashed ${C.borderMid}`, color: C.accent, fontSize: 10, borderRadius: 4, width: "100%", fontFamily: FONT_LABEL }}>
                + ADD STEP
            </button>
        </div>
    );
}

function ObservationBlock({ data, onChange }: { data: BlockData["data"]; onChange: (d: any) => void }) {
    return (
        <div style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Observation</div>
            <input
                value={data.title || ""}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="Observation title..."
                style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}
            />
            <textarea
                value={data.text || ""}
                onChange={e => onChange({ text: e.target.value })}
                placeholder="What did you observe?"
                style={{
                    width: "100%", background: "none", border: "none", outline: "none", resize: "none",
                    fontFamily: FONT_SANS, fontSize: 12, color: C.text, lineHeight: 1.65, minHeight: 110, border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 10px"
                }}
            />
        </div>
    );
}

function MeasurementBlock({ data, onChange }: { data: BlockData["data"]; onChange: (d: any) => void }) {
    const rows = data.rows || [{ id: "m1", key: "", value: "", unit: "" }];
    return (
        <div style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Measurement</div>
            <input
                value={data.title || ""}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="Measurement set title..."
                style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rows.map((row: any, i: number) => (
                    <div key={row.id || i} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) 64px 20px", gap: 6, alignItems: "center" }}>
                        <input value={row.key || ""} onChange={e => {
                            const next = [...rows];
                            next[i] = { ...row, key: e.target.value };
                            onChange({ rows: next });
                        }} placeholder="Metric" style={{ width: "100%", minWidth: 0, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontSize: 11, fontFamily: FONT_SANS, outline: "none" }} />
                        <input value={row.value || ""} onChange={e => {
                            const next = [...rows];
                            next[i] = { ...row, value: e.target.value };
                            onChange({ rows: next });
                        }} placeholder="Value" style={{ width: "100%", minWidth: 0, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontSize: 11, fontFamily: FONT_SANS, outline: "none" }} />
                        <input value={row.unit || ""} onChange={e => {
                            const next = [...rows];
                            next[i] = { ...row, unit: e.target.value };
                            onChange({ rows: next });
                        }} placeholder="Unit" style={{ width: "100%", minWidth: 0, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontSize: 11, fontFamily: FONT_SANS, outline: "none" }} />
                        <button className="tool-btn" onClick={() => onChange({ rows: rows.filter((_: any, idx: number) => idx !== i) })} style={{ color: C.red, fontSize: 14 }}>×</button>
                    </div>
                ))}
            </div>
            <button className="tool-btn" onClick={() => onChange({ rows: [...rows, { id: `m-${Date.now()}`, key: "", value: "", unit: "" }] })} style={{ marginTop: 10, padding: "6px 8px", background: "none", border: `1px dashed ${C.borderMid}`, color: C.accent, fontSize: 10, borderRadius: 4, width: "100%", fontFamily: FONT_LABEL }}>
                + ADD MEASUREMENT
            </button>
        </div>
    );
}

function TagsBlock({ data, onChange }: { data: BlockData["data"]; onChange: (d: any) => void }) {
    const tags = Array.isArray(data.tags) ? data.tags : [];
    return (
        <div style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Tags</div>
            <input
                value={data.title || ""}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="Tag group title..."
                style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {tags.map((tag: string, idx: number) => (
                    <button
                        key={`${tag}-${idx}`}
                        className="tool-btn"
                        onClick={() => onChange({ tags: tags.filter((_: string, i: number) => i !== idx) })}
                        style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "3px 8px", fontFamily: FONT_LABEL, fontSize: 9, color: C.textMid }}
                        title="Remove tag"
                    >
                        {tag} ×
                    </button>
                ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
                <input
                    value={data.draft || ""}
                    onChange={e => onChange({ draft: e.target.value })}
                    onKeyDown={e => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        const next = String(data.draft || "").trim();
                        if (!next) return;
                        onChange({ tags: [...tags, next], draft: "" });
                    }}
                    placeholder="Type a tag and press Enter"
                    style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, outline: "none" }}
                />
                <button
                    className="tool-btn"
                    onClick={() => {
                        const next = String(data.draft || "").trim();
                        if (!next) return;
                        onChange({ tags: [...tags, next], draft: "" });
                    }}
                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 10px", fontFamily: FONT_LABEL, fontSize: 9, color: C.textMid }}
                >
                    ADD
                </button>
            </div>
        </div>
    );
}

function ImageBlock({ data, onChange }: { data: BlockData["data"]; onChange: (d: any) => void }) {
    const annotations = Array.isArray(data.annotations) ? data.annotations : [];
    const cropX = Number.isFinite(data.cropX) ? Number(data.cropX) : 10;
    const cropY = Number.isFinite(data.cropY) ? Number(data.cropY) : 10;
    const cropW = Number.isFinite(data.cropW) ? Number(data.cropW) : 70;
    const cropH = Number.isFinite(data.cropH) ? Number(data.cropH) : 70;

    return (
        <div style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>{data.label || "Image"}</div>
            <input
                value={data.title || ""}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="Image Title..."
                style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}
            />
            <input
                value={data.src || ""}
                onChange={e => onChange({ src: e.target.value })}
                placeholder="Image URL..."
                style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, borderRadius: 4, outline: "none", fontFamily: FONT_SANS, fontSize: 11, color: C.text, marginBottom: 8, padding: "6px 8px" }}
            />

            <div style={{ height: 120, background: C.rail, borderRadius: 4, border: `1px dashed ${C.borderMid}`, position: "relative", overflow: "hidden", marginBottom: 8 }}>
                {data.src ? (
                    <img src={data.src} alt={data.title || "image"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Scan size={12} color={C.textDim} strokeWidth={2} /></div>
                        <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim }}>Drop image</div>
                    </div>
                )}

                <div
                    style={{
                        position: "absolute",
                        left: `${cropX}%`,
                        top: `${cropY}%`,
                        width: `${cropW}%`,
                        height: `${cropH}%`,
                        border: `1px solid ${C.accent}`,
                        background: `${C.accent}18`,
                        pointerEvents: "none",
                    }}
                />

                {annotations.map((note: string, idx: number) => (
                    <div
                        key={`an-${idx}`}
                        title={note}
                        style={{
                            position: "absolute",
                            right: 6,
                            top: 6 + idx * 16,
                            background: "rgba(255,255,255,0.85)",
                            border: `1px solid ${C.border}`,
                            borderRadius: 10,
                            padding: "1px 6px",
                            fontFamily: FONT_LABEL,
                            fontSize: 8,
                            color: C.textMid,
                            maxWidth: 120,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {note}
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                <label style={{ fontFamily: FONT_LABEL, fontSize: 8, color: C.textDim, letterSpacing: 1 }}>
                    X
                    <input type="range" min={0} max={90} value={cropX} onChange={e => onChange({ cropX: Number(e.target.value) })} style={{ width: "100%" }} />
                </label>
                <label style={{ fontFamily: FONT_LABEL, fontSize: 8, color: C.textDim, letterSpacing: 1 }}>
                    Y
                    <input type="range" min={0} max={90} value={cropY} onChange={e => onChange({ cropY: Number(e.target.value) })} style={{ width: "100%" }} />
                </label>
                <label style={{ fontFamily: FONT_LABEL, fontSize: 8, color: C.textDim, letterSpacing: 1 }}>
                    W
                    <input type="range" min={10} max={100} value={cropW} onChange={e => onChange({ cropW: Number(e.target.value) })} style={{ width: "100%" }} />
                </label>
                <label style={{ fontFamily: FONT_LABEL, fontSize: 8, color: C.textDim, letterSpacing: 1 }}>
                    H
                    <input type="range" min={10} max={100} value={cropH} onChange={e => onChange({ cropH: Number(e.target.value) })} style={{ width: "100%" }} />
                </label>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
                <input
                    value={data.nextAnnotation || ""}
                    onChange={e => onChange({ nextAnnotation: e.target.value })}
                    placeholder="Add annotation..."
                    style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 8px", fontFamily: FONT_SANS, fontSize: 11, outline: "none" }}
                />
                <button
                    className="tool-btn"
                    onClick={() => {
                        const text = String(data.nextAnnotation || "").trim();
                        if (!text) return;
                        onChange({ annotations: [...annotations, text], nextAnnotation: "" });
                    }}
                    style={{ padding: "5px 8px", borderRadius: 4, border: `1px dashed ${C.borderMid}`, color: C.accent, fontFamily: FONT_LABEL, fontSize: 9 }}
                >
                    + NOTE
                </button>
            </div>
        </div>
    );
}

function CodeBlock({ data, onChange }: { data: BlockData["data"]; onChange: (d: any) => void }) {
    const language = data.language || "javascript";
    const code = data.code || "";
    const output = data.output || "";

    const runCode = () => {
        if (language !== "javascript") {
            onChange({ output: "Execution preview is available for JavaScript only." });
            return;
        }

        try {
            const runner = new Function(`"use strict";\n${code}`);
            const result = runner();
            onChange({ output: String(result ?? "Done") });
        } catch (error) {
            onChange({ output: error instanceof Error ? error.message : "Script error" });
        }
    };

    return (
        <div style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Code / Script</div>
            <input
                value={data.title || ""}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="Code Block Title..."
                style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <select value={language} onChange={e => onChange({ language: e.target.value })} style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text }}>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="bash">Bash</option>
                </select>
                <button className="tool-btn" onClick={runCode} style={{ padding: "6px 10px", borderRadius: 4, border: `1px solid ${C.accent}55`, background: C.accentDim, color: C.accent, fontFamily: FONT_LABEL, fontSize: 9, letterSpacing: 1 }}>RUN</button>
            </div>
            <textarea
                value={code}
                onChange={e => onChange({ code: e.target.value })}
                placeholder="Write your script..."
                style={{ width: "100%", minHeight: 110, background: "#0f172a", color: "#e2e8f0", border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 10px", outline: "none", resize: "vertical", fontFamily: FONT_MONO, fontSize: 11, marginBottom: 8 }}
            />
            <div style={{ borderRadius: 4, border: `1px solid ${C.border}`, background: C.rail, padding: "8px 10px", fontFamily: FONT_MONO, fontSize: 11, color: C.textMid, minHeight: 32 }}>
                {output || "No output"}
            </div>
        </div>
    );
}

function TimelineBlock({ data, onChange }: { data: BlockData["data"]; onChange: (d: any) => void }) {
    const items = Array.isArray(data.items) ? data.items : [];
    return (
        <div style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Timeline</div>
            <input
                value={data.title || ""}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="Timeline Title..."
                style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                {items.map((item: any, idx: number) => (
                    <div key={item.id || idx} style={{ display: "grid", gridTemplateColumns: "72px 1fr 20px", gap: 6, alignItems: "center" }}>
                        <input value={item.date || ""} onChange={e => {
                            const next = [...items];
                            next[idx] = { ...item, date: e.target.value };
                            onChange({ items: next });
                        }} placeholder="Date" style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 6px", fontFamily: FONT_LABEL, fontSize: 9, outline: "none" }} />
                        <input value={item.text || ""} onChange={e => {
                            const next = [...items];
                            next[idx] = { ...item, text: e.target.value };
                            onChange({ items: next });
                        }} placeholder="Event" style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 8px", fontFamily: FONT_SANS, fontSize: 11, outline: "none" }} />
                        <button className="tool-btn" onClick={() => onChange({ items: items.filter((_: any, i: number) => i !== idx) })} style={{ color: C.red, fontSize: 14 }}>×</button>
                    </div>
                ))}
            </div>
            <button className="tool-btn" onClick={() => onChange({ items: [...items, { id: `t${items.length + 1}`, date: "", text: "" }] })} style={{ padding: "6px 8px", borderRadius: 4, border: `1px dashed ${C.borderMid}`, color: C.accent, fontFamily: FONT_LABEL, fontSize: 9, letterSpacing: 1 }}>
                + EVENT
            </button>
        </div>
    );
}

function ChecklistBlock({ data, onChange }: { data: BlockData["data"]; onChange: (d: any) => void }) {
    const items = Array.isArray(data.items) ? data.items : [];
    const doneCount = items.filter((item: any) => !!item.done).length;
    const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;

    return (
        <div style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Checklist</div>
            <input
                value={data.title || ""}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="Checklist Title..."
                style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}
            />
            <div style={{ height: 6, borderRadius: 4, background: C.border, marginBottom: 8, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: C.accent }} />
            </div>
            <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, marginBottom: 8 }}>{doneCount}/{items.length} DONE</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {items.map((item: any, idx: number) => (
                    <div key={item.id || idx} style={{ display: "grid", gridTemplateColumns: "18px 1fr 20px", gap: 6, alignItems: "center" }}>
                        <input type="checkbox" checked={!!item.done} onChange={e => {
                            const next = [...items];
                            next[idx] = { ...item, done: e.target.checked };
                            onChange({ items: next });
                        }} />
                        <input value={item.text || ""} onChange={e => {
                            const next = [...items];
                            next[idx] = { ...item, text: e.target.value };
                            onChange({ items: next });
                        }} placeholder="Checklist item..." style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 8px", fontFamily: FONT_SANS, fontSize: 11, outline: "none" }} />
                        <button className="tool-btn" onClick={() => onChange({ items: items.filter((_: any, i: number) => i !== idx) })} style={{ color: C.red, fontSize: 14 }}>×</button>
                    </div>
                ))}
            </div>
            <button className="tool-btn" onClick={() => onChange({ items: [...items, { id: `c${items.length + 1}`, text: "", done: false }] })} style={{ padding: "6px 8px", borderRadius: 4, border: `1px dashed ${C.borderMid}`, color: C.accent, fontFamily: FONT_LABEL, fontSize: 9, letterSpacing: 1 }}>
                + ITEM
            </button>
        </div>
    );
}

function RichTextBlock({ data, onChange }: { data: BlockData["data"]; onChange: (d: any) => void }) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showSnippets, setShowSnippets] = useState(false);

    const insertSnippet = (value: string) => {
        if (editorRef.current) {
            editorRef.current.focus();
            document.execCommand("insertText", false, value);
            onChange({ html: editorRef.current.innerHTML || "" });
        }
        setShowSnippets(false);
    };

    const runCmd = (cmd: string) => {
        document.execCommand(cmd);
        onChange({ html: editorRef.current?.innerHTML || "" });
    };

    return (
        <div style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Rich Text</div>
            <input
                value={data.title || ""}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="Section Title..."
                style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}
            />
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {[
                    ["B", "bold", "Bold"],
                    ["I", "italic", "Italic"],
                    ["U", "underline", "Underline"],
                    ["•", "insertUnorderedList", "Bullet List"],
                ].map(([label, cmd, title]) => (
                    <button
                        key={cmd}
                        className="tool-btn"
                        title={title}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            runCmd(cmd);
                        }}
                        style={{
                            minWidth: 24,
                            height: 24,
                            borderRadius: 4,
                            border: `1px solid ${C.borderMid}`,
                            color: C.textMid,
                            fontFamily: FONT_LABEL,
                            fontSize: 10,
                            background: C.surface,
                        }}
                    >
                        {label}
                    </button>
                ))}
                <button
                    className="tool-btn"
                    title="Slash snippets"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setShowSnippets(v => !v);
                    }}
                    style={{
                        minWidth: 34,
                        height: 24,
                        borderRadius: 4,
                        border: `1px solid ${C.borderMid}`,
                        color: C.accent,
                        fontFamily: FONT_LABEL,
                        fontSize: 9,
                        background: C.surface,
                    }}
                >
                    /+
                </button>
            </div>
            {showSnippets && (
                <div style={{ marginBottom: 8, border: `1px solid ${C.border}`, borderRadius: 4, background: C.surface, overflow: "hidden" }}>
                    {TEXT_SNIPPETS.map(snippet => (
                        <button
                            key={snippet.id}
                            className="tool-btn"
                            onClick={() => insertSnippet(snippet.value)}
                            style={{ width: "100%", textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}
                        >
                            <span style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.accent, marginRight: 8 }}>/</span>
                            <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: C.textMid }}>{snippet.label}</span>
                        </button>
                    ))}
                </div>
            )}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => onChange({ html: e.currentTarget.innerHTML })}
                onKeyDown={(e) => {
                    if (e.key === "/") {
                        e.preventDefault();
                        setShowSnippets(true);
                    }
                    if (e.key === "Escape") setShowSnippets(false);
                }}
                dangerouslySetInnerHTML={{ __html: data.html || "<p>Start writing rich text...</p>" }}
                style={{
                    minHeight: 120,
                    maxHeight: 280,
                    overflowY: "auto",
                    background: C.rail,
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    padding: "8px 10px",
                    outline: "none",
                    fontFamily: FONT_SANS,
                    fontSize: 12,
                    color: C.text,
                    lineHeight: 1.6,
                }}
            />
        </div>
    );
}

function DataTableBlock({ data, onChange }: { data: BlockData["data"]; onChange: (d: any) => void }) {
    const columns: string[] = Array.isArray(data.columns) && data.columns.length > 0 ? data.columns : ["A", "B", "C"];
    const rows: string[][] = Array.isArray(data.rows) && data.rows.length > 0 ? data.rows : [["", "", ""], ["", "", ""]];

    const updateColumn = (idx: number, value: string) => {
        const next = [...columns];
        next[idx] = value;
        onChange({ columns: next });
    };

    const updateCell = (r: number, c: number, value: string) => {
        const next = rows.map(row => [...row]);
        while (next[r].length < columns.length) next[r].push("");
        next[r][c] = value;
        onChange({ rows: next });
    };

    const addColumn = () => {
        const nextColumns = [...columns, `Col ${columns.length + 1}`];
        const nextRows = rows.map(row => [...row, ""]);
        onChange({ columns: nextColumns, rows: nextRows });
    };

    const addRow = () => {
        onChange({ rows: [...rows, Array(columns.length).fill("")] });
    };

    const deleteColumn = () => {
        if (columns.length <= 1) return;
        const nextColumns = columns.slice(0, -1);
        const nextRows = rows.map(row => row.slice(0, nextColumns.length));
        onChange({ columns: nextColumns, rows: nextRows });
    };

    const deleteRow = () => {
        if (rows.length <= 1) return;
        onChange({ rows: rows.slice(0, -1) });
    };

    return (
        <div style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Inline Data Table</div>
            <input
                value={data.title || ""}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="Table Title..."
                style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}
            />

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", background: C.rail }}>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, minmax(90px, 1fr))`, borderBottom: `1px solid ${C.border}` }}>
                    {columns.map((col, cIdx) => (
                        <input
                            key={`h-${cIdx}`}
                            value={col}
                            onChange={e => updateColumn(cIdx, e.target.value)}
                            style={{ border: "none", borderRight: cIdx < columns.length - 1 ? `1px solid ${C.border}` : "none", background: C.surface, padding: "7px 8px", fontFamily: FONT_LABEL, fontSize: 9, letterSpacing: 1, color: C.textMid, outline: "none" }}
                        />
                    ))}
                </div>
                <div style={{ maxHeight: 124, overflow: "auto" }}>
                    {rows.map((row, rIdx) => (
                        <div key={`r-${rIdx}`} style={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, minmax(90px, 1fr))`, borderBottom: rIdx < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>
                            {columns.map((_, cIdx) => (
                                <input
                                    key={`c-${rIdx}-${cIdx}`}
                                    value={row[cIdx] || ""}
                                    onChange={e => updateCell(rIdx, cIdx, e.target.value)}
                                    style={{ border: "none", borderRight: cIdx < columns.length - 1 ? `1px solid ${C.border}` : "none", background: "transparent", padding: "7px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text, outline: "none" }}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                <button className="tool-btn" onClick={addRow} style={{ padding: "5px 8px", borderRadius: 4, border: `1px dashed ${C.borderMid}`, color: C.accent, fontFamily: FONT_LABEL, fontSize: 9, letterSpacing: 1 }}>
                    + ROW
                </button>
                <button className="tool-btn" onClick={deleteRow} disabled={rows.length <= 1} style={{ padding: "5px 8px", borderRadius: 4, border: `1px dashed ${C.borderMid}`, color: rows.length <= 1 ? C.textDim : C.red, fontFamily: FONT_LABEL, fontSize: 9, letterSpacing: 1 }}>
                    - ROW
                </button>
                <button className="tool-btn" onClick={addColumn} style={{ padding: "5px 8px", borderRadius: 4, border: `1px dashed ${C.borderMid}`, color: C.accent, fontFamily: FONT_LABEL, fontSize: 9, letterSpacing: 1 }}>
                    + COLUMN
                </button>
                <button className="tool-btn" onClick={deleteColumn} disabled={columns.length <= 1} style={{ padding: "5px 8px", borderRadius: 4, border: `1px dashed ${C.borderMid}`, color: columns.length <= 1 ? C.textDim : C.red, fontFamily: FONT_LABEL, fontSize: 9, letterSpacing: 1 }}>
                    - COLUMN
                </button>
            </div>
        </div>
    );
}

function parseNum(value: string) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : NaN;
}

function ChartBlock({ data, onChange, tables }: { data: BlockData["data"]; onChange: (d: any) => void; tables: TableSource[] }) {
    const sourceMode = data.sourceMode === "manual" ? "manual" : "linked";
    const source = tables.find(t => t.id === data.sourceTableId);
    const cols = source?.columns || [];
    const yIndex = cols.findIndex(c => c === data.yColumn);
    const xIndex = cols.findIndex(c => c === data.xColumn);

    const linkedPoints = (source?.rows || [])
        .map(row => ({
            x: xIndex >= 0 ? (row[xIndex] || "") : "",
            y: yIndex >= 0 ? parseNum(row[yIndex] || "") : NaN,
        }))
        .filter(p => Number.isFinite(p.y));

    const manualLabels = String(data.manualLabels || "A,B,C").split(",").map((v: string) => v.trim()).filter(Boolean);
    const manualValues = String(data.manualValues || "10,20,15").split(",").map((v: string) => parseNum(v.trim()));
    const manualPoints = manualValues
        .map((y, idx) => ({ x: manualLabels[idx] || `P${idx + 1}`, y }))
        .filter(point => Number.isFinite(point.y));

    const points = sourceMode === "manual" ? manualPoints : linkedPoints;
    const maxY = Math.max(1, ...points.map(p => p.y));

    return (
        <div style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Linked Chart</div>
            <input
                value={data.title || ""}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="Chart Title..."
                style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                <select value={sourceMode} onChange={e => onChange({ sourceMode: e.target.value })} style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text }}>
                    <option value="linked">Linked</option>
                    <option value="manual">Manual</option>
                </select>
                <select value={data.sourceTableId || ""} onChange={e => onChange({ sourceTableId: e.target.value })} style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text }}>
                    <option value="">Select table</option>
                    {tables.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <select value={data.chartType || "bar"} onChange={e => onChange({ chartType: e.target.value })} style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text }}>
                    <option value="bar">Bar</option>
                    <option value="line">Line</option>
                </select>
                <select value={data.xColumn || ""} onChange={e => onChange({ xColumn: e.target.value })} style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text }}>
                    <option value="">X column</option>
                    {cols.map(col => <option key={`x-${col}`} value={col}>{col}</option>)}
                </select>
                <select value={data.yColumn || ""} onChange={e => onChange({ yColumn: e.target.value })} style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text }}>
                    <option value="">Y column</option>
                    {cols.map(col => <option key={`y-${col}`} value={col}>{col}</option>)}
                </select>
            </div>

            {sourceMode === "manual" && (
                <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
                    <input
                        value={String(data.manualLabels || "A,B,C")}
                        onChange={e => onChange({ manualLabels: e.target.value })}
                        placeholder="Labels: A,B,C"
                        style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text, background: C.surface, outline: "none" }}
                    />
                    <input
                        value={String(data.manualValues || "10,20,15")}
                        onChange={e => onChange({ manualValues: e.target.value })}
                        placeholder="Values: 10,20,15"
                        style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text, background: C.surface, outline: "none" }}
                    />
                </div>
            )}

            <div style={{ height: 120, borderRadius: 6, border: `1px solid ${C.border}`, background: C.rail, padding: 8, display: "flex", alignItems: "flex-end", gap: 6 }}>
                {points.length === 0 ? (
                    <span style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 1 }}>NO NUMERIC DATA</span>
                ) : data.chartType === "line" ? (
                    <svg width="100%" height="100%" viewBox="0 0 260 100" preserveAspectRatio="none" style={{ display: "block" }}>
                        <polyline
                            fill="none"
                            stroke={C.accent}
                            strokeWidth="2"
                            points={points.map((p, i) => `${(i / Math.max(1, points.length - 1)) * 250 + 5},${95 - (p.y / maxY) * 85}`).join(" ")}
                        />
                    </svg>
                ) : (
                    points.map((p, i) => (
                        <div key={`bar-${i}`} title={`${p.x}: ${p.y}`} style={{ flex: 1, minWidth: 8, height: `${(p.y / maxY) * 100}%`, background: C.accentDim, border: `1px solid ${C.accent}55`, borderRadius: "3px 3px 0 0" }} />
                    ))
                )}
            </div>
        </div>
    );
}

function CalculationBlock({ data, onChange, tables }: { data: BlockData["data"]; onChange: (d: any) => void; tables: TableSource[] }) {
    const calcMode = data.calcMode === "manual" ? "manual" : "linked";
    const source = tables.find(t => t.id === data.sourceTableId);
    const cols = source?.columns || [];
    const columnIndex = cols.findIndex(c => c === data.column);
    const values = (source?.rows || [])
        .map(row => columnIndex >= 0 ? parseNum(row[columnIndex] || "") : NaN)
        .filter(v => Number.isFinite(v));

    const op = data.operation || "sum";
    const linkedResult = op === "count"
        ? values.length
        : values.length === 0
            ? 0
            : op === "avg"
                ? values.reduce((a, b) => a + b, 0) / values.length
                : op === "min"
                    ? Math.min(...values)
                    : op === "max"
                        ? Math.max(...values)
                        : values.reduce((a, b) => a + b, 0);

    const manualResult = Number.isFinite(Number(data.manualResult)) ? Number(data.manualResult) : 0;
    const result = calcMode === "manual" ? manualResult : linkedResult;

    return (
        <div style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Calculation</div>
            <input
                value={data.title || ""}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="Calculation Title..."
                style={{ width: "100%", background: "none", border: "none", outline: "none", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
                <select value={calcMode} onChange={e => onChange({ calcMode: e.target.value })} style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text }}>
                    <option value="linked">Linked</option>
                    <option value="manual">Manual</option>
                </select>
                <select value={data.sourceTableId || ""} onChange={e => onChange({ sourceTableId: e.target.value })} style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text }}>
                    <option value="">Table</option>
                    {tables.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <select value={data.column || ""} onChange={e => onChange({ column: e.target.value })} style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text }}>
                    <option value="">Column</option>
                    {cols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
                <select value={op} onChange={e => onChange({ operation: e.target.value })} style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text }}>
                    <option value="sum">SUM</option>
                    <option value="avg">AVG</option>
                    <option value="min">MIN</option>
                    <option value="max">MAX</option>
                    <option value="count">COUNT</option>
                </select>
            </div>

            {calcMode === "manual" && (
                <input
                    value={String(data.manualResult ?? "")}
                    onChange={e => onChange({ manualResult: e.target.value })}
                    placeholder="Manual result"
                    style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text, background: C.surface, outline: "none", marginBottom: 10 }}
                />
            )}
            <div style={{ borderRadius: 6, border: `1px solid ${C.border}`, background: C.rail, padding: "12px 10px" }}>
                <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 1, marginBottom: 4 }}>RESULT</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: C.text }}>{Number(result).toFixed(2)}</div>
            </div>
        </div>
    );
}

function SectionBlock({ data }: { data: BlockData["data"] }) {
    return (
        <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ height: 1, width: 20, background: C.borderMid }} />
            <div style={{ fontFamily: FONT_LABEL, fontSize: 10, color: C.textMid, letterSpacing: 2, textTransform: "uppercase", whiteSpace: "nowrap" }}>{data.label || "Section"}</div>
            <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
    );
}

// ─── Canvas Block Shell ──────────────────────────────────────────────────────
function CanvasBlock({
    block, isSelected, onClick, onChange, onDragStart, onResizeStart, onToggleLock, onToggleCollapse,
}: {
    block: BlockData; isSelected: boolean; onClick: (e: React.MouseEvent) => void;
    onChange: (id: string, u: Partial<BlockData>) => void;
    onDragStart: (id: string, e: React.MouseEvent) => void;
    onResizeStart: (id: string, e: React.MouseEvent) => void;
    onToggleLock: (id: string) => void;
    onToggleCollapse: (id: string) => void;
}) {
    const themeStyle = resolveBlockTheme(block.theme);
    const [isHovered, setIsHovered] = useState(false);
    const showChrome = isSelected || isHovered;

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={e => {
                onClick(e);
                if (e.shiftKey) return;
                if (block.locked || isEditableTarget(e.target)) return;
                onDragStart(block.id, e);
            }}
            style={{
                position: "absolute", left: block.x, top: block.y, width: block.w,
                background: themeStyle.bg,
                border: `1px solid ${isSelected ? C.selectionBorder : themeStyle.border}`,
                borderRadius: 6,
                boxShadow: isSelected ? `0 0 0 1px ${C.accentDim}, 0 6px 24px rgba(0,0,0,0.15)` : "0 2px 8px rgba(0,0,0,0.06)",
                cursor: "default",
                transition: "box-shadow 0.15s, border-color 0.15s",
                userSelect: "none",
                minWidth: 120,
                opacity: block.locked ? 0.92 : 1,
            }}
        >
            {/* Selection indicator stripe */}
            {isSelected && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: C.accent, borderRadius: "6px 6px 0 0" }} />
            )}

            {/* Lock toggle */}
            <button
                title={block.locked ? "Unpin block" : "Pin block"}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    onToggleLock(block.id);
                }}
                style={{
                    position: "absolute",
                    top: -24,
                    right: 28,
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    border: `1px solid ${block.locked ? C.accent : C.borderMid}`,
                    background: block.locked ? C.accentDim : C.surface,
                    color: block.locked ? C.accent : C.textDim,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    zIndex: isSelected ? 14 : 4,
                    opacity: showChrome ? 1 : 0,
                    pointerEvents: showChrome ? "auto" : "none",
                    transition: "opacity 0.12s",
                }}
            >
                {block.locked ? <Lock size={11} strokeWidth={2} /> : <LockOpen size={11} strokeWidth={2} />}
            </button>

            {/* Drag handle */}
            <div style={{
                position: "absolute", top: 8, right: 8,
                display: "grid", gridTemplateColumns: "repeat(2, 4px)", gap: 2,
                opacity: isSelected ? 0.5 : 0, transition: "opacity 0.15s", cursor: block.locked ? "not-allowed" : "grab",
            }}>
                {[...Array(6)].map((_, i) => <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: C.textMid }} />)}
            </div>

            {block.locked && (
                <div style={{ position: "absolute", top: -20, right: 52, fontFamily: FONT_LABEL, fontSize: 8, color: C.accent, letterSpacing: 1, zIndex: 9, opacity: showChrome ? 1 : 0, transition: "opacity 0.12s" }}>
                    PINNED
                </div>
            )}

            <button
                title={block.collapsed ? "Expand block" : "Collapse block"}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    onToggleCollapse(block.id);
                }}
                style={{
                    position: "absolute",
                    top: -24,
                    right: 4,
                    minWidth: 20,
                    height: 20,
                    borderRadius: 4,
                    border: `1px solid ${C.borderMid}`,
                    background: C.surface,
                    color: C.textMid,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    zIndex: isSelected ? 14 : 4,
                    fontFamily: FONT_LABEL,
                    fontSize: 10,
                    opacity: showChrome ? 1 : 0,
                    pointerEvents: showChrome ? "auto" : "none",
                    transition: "opacity 0.12s",
                }}
            >
                {block.collapsed ? "+" : "-"}
            </button>

            {block.collapsed ? (
                <div style={{ padding: "14px 16px", minHeight: 48, display: "flex", alignItems: "center" }}>
                    <span style={{ fontFamily: FONT_LABEL, fontSize: 10, color: C.textMid, letterSpacing: 1 }}>
                        {String(block.data?.title || block.data?.label || block.type).toUpperCase()}
                    </span>
                </div>
            ) : (
                <>
                    {block.type === "note" && <NoteBlock data={block.data} onChange={d => onChange(block.id, { data: { ...block.data, ...d } })} />}
                    {block.type === "protocol" && <ProtocolBlock data={block.data} onChange={d => onChange(block.id, { data: { ...block.data, ...d } })} />}
                    {block.type === "observation" && <ObservationBlock data={block.data} onChange={d => onChange(block.id, { data: { ...block.data, ...d } })} />}
                    {block.type === "measurement" && <MeasurementBlock data={block.data} onChange={d => onChange(block.id, { data: { ...block.data, ...d } })} />}
                    {block.type === "datatable" && <DataTableBlock data={block.data} onChange={d => onChange(block.id, { data: { ...block.data, ...d } })} />}
                    {block.type === "image" && <ImageBlock data={block.data} onChange={d => onChange(block.id, { data: { ...block.data, ...d } })} />}
                    {block.type === "tag" && <TagsBlock data={block.data} onChange={d => onChange(block.id, { data: { ...block.data, ...d } })} />}
                </>
            )}

            {isSelected && !block.locked && !block.collapsed && (
                <button
                    title="Resize block"
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        onResizeStart(block.id, e);
                    }}
                    style={{
                        position: "absolute",
                        right: -6,
                        bottom: -6,
                        width: 14,
                        height: 14,
                        borderRadius: 4,
                        border: `1px solid ${C.selectionBorder}`,
                        background: C.surface,
                        cursor: "nwse-resize",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                    }}
                >
                    <span style={{ width: 6, height: 6, borderRight: `1px solid ${C.selectionBorder}`, borderBottom: `1px solid ${C.selectionBorder}` }} />
                </button>
            )}
        </div>
    );
}

// ─── Main editor ─────────────────────────────────────────────────────────────
export default function CanvasEditor({ params }: { params: Promise<{ id: string }> }) {
    const { id: canvasId } = use(params);
    const router = useRouter();
    const { user, token } = useAuth();
    const experimentsSessionKey = useMemo(
        () => getScopedSessionKey(SESSION_EXPERIMENTS_KEY, user?.id),
        [user?.id]
    );
    const canvasesSessionKey = useMemo(
        () => getScopedSessionKey(SESSION_CANVASES_KEY, user?.id),
        [user?.id]
    );
    const [blocks, setBlocks] = useState<BlockData[]>(MOCK_BLOCKS);
    const [connections, setConnections] = useState<BlockConnection[]>([]);
    const [experimentMeta, setExperimentMeta] = useState<ExperimentMeta>({ ...EXPERIMENT });
    const [isHydrated, setIsHydrated] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 40, y: 40 });
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [isPanning, setIsPanning] = useState(false);
    const [isDraggingBlock, setIsDraggingBlock] = useState(false);
    const [isResizingBlock, setIsResizingBlock] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [activeTool, setActiveTool] = useState<"select" | "pan">("select");
    const [showPalette, setShowPalette] = useState(false);
    const [showLibrary, setShowLibrary] = useState(true);
    const [resizePreview, setResizePreview] = useState<{ id: string; width: number } | null>(null);
    const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
    const [historyInfo, setHistoryInfo] = useState({ canUndo: false, canRedo: false });
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [showSavedModal, setShowSavedModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [sharePermission, setSharePermission] = useState<SharePermission>("comment");
    const [latestShareLink, setLatestShareLink] = useState("");
    const [templateName, setTemplateName] = useState("");
    const [templateDesc, setTemplateDesc] = useState("");
    const [saveSelectionOnly, setSaveSelectionOnly] = useState(false);
    const panStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
    const dragRef = useRef<{ ids: string[]; startX: number; startY: number; origins: Record<string, { x: number; y: number }> } | null>(null);
    const resizeRef = useRef<{ id: string; startX: number; initialWidth: number; minWidth: number } | null>(null);
    const selectionStartRef = useRef<{ additive: boolean } | null>(null);
    const blocksRef = useRef<BlockData[]>(blocks);
    const historyRef = useRef<BlockData[][]>([cloneBlocksState(blocks)]);
    const historyIndexRef = useRef(0);
    const isApplyingHistoryRef = useRef(false);
    const didTransformRef = useRef(false);
    const blockCounterRef = useRef(
        MOCK_BLOCKS.reduce((max, block) => {
            const n = Number.parseInt(block.id.replace(/^\D+/, ""), 10);
            return Number.isNaN(n) ? max : Math.max(max, n);
        }, 0)
    );
    const canvasRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<number>(0);
    const wheelFrameRef = useRef<number>(0);
    const wheelDeltaRef = useRef({ dx: 0, dy: 0 });
    const viewportRef = useRef({ zoom: 1, panX: 40, panY: 40 });

    useEffect(() => {
        if (typeof window === "undefined") return;

        const canvasById = safeParse<StoredCanvasById>(sessionStorage.getItem(canvasesSessionKey), {});
        const current = canvasById[canvasId];

        if (current?.blocks?.length) {
            setBlocks(normalizeBlocks(current.blocks));
            setConnections(current.connections || []);
        } else {
            const starter = normalizeBlocks(cloneStarterBlocks());
            canvasById[canvasId] = { blocks: starter, connections: [] };
            sessionStorage.setItem(canvasesSessionKey, JSON.stringify(canvasById));
            setBlocks(starter);
            setConnections([]);
        }

        setExperimentMeta(readExperimentMeta(canvasId, experimentsSessionKey));
        setIsHydrated(true);
    }, [canvasId, canvasesSessionKey, experimentsSessionKey]);

    const persistCanvasState = useCallback((manual = false) => {
        if (!isHydrated) return false;
        setAutosaveState("saving");
        const savedAt = manual ? nowLabel() : null;
        const canvasById = safeParse<StoredCanvasById>(sessionStorage.getItem(canvasesSessionKey), {});
        canvasById[canvasId] = { blocks, connections };

        try {
            sessionStorage.setItem(canvasesSessionKey, JSON.stringify(canvasById));

            const experiments = safeParse<StoredExperiment[]>(sessionStorage.getItem(experimentsSessionKey), []);
            const nextExperiments = experiments.map(exp =>
                exp.id === canvasId
                    ? { ...exp, blocks: blocks.length, ...(savedAt ? { updated: savedAt } : {}) }
                    : exp
            );
            sessionStorage.setItem(experimentsSessionKey, JSON.stringify(nextExperiments));
            setAutosaveState("saved");
            if (manual) {
                setExperimentMeta(prev => ({ ...prev, updated: savedAt || prev.updated }));
                setShowSavedModal(true);
            }
            return true;
        } catch {
            setAutosaveState("error");
            return false;
        }
    }, [blocks, canvasId, canvasesSessionKey, connections, experimentsSessionKey, isHydrated]);

    useEffect(() => {
        if (!isHydrated) return;
        persistCanvasState(false);
    }, [isHydrated, persistCanvasState]);

    useEffect(() => {
        if (autosaveState !== "saved") return;
        const timer = window.setTimeout(() => setAutosaveState("idle"), 1400);
        return () => window.clearTimeout(timer);
    }, [autosaveState]);

    useEffect(() => {
        blocksRef.current = blocks;
    }, [blocks]);

    useEffect(() => {
        historyRef.current = [cloneBlocksState(blocksRef.current)];
        historyIndexRef.current = 0;
    }, [canvasId]);

    useEffect(() => {
        const maxId = blocks.reduce((max, block) => {
            const n = Number.parseInt(block.id.replace(/^\D+/, ""), 10);
            return Number.isNaN(n) ? max : Math.max(max, n);
        }, 0);
        blockCounterRef.current = Math.max(blockCounterRef.current, maxId);
    }, [blocks]);

    useEffect(() => {
        viewportRef.current = { zoom, panX: pan.x, panY: pan.y };
    }, [zoom, pan.x, pan.y]);

    const pushHistory = useCallback((nextBlocks: BlockData[]) => {
        if (isApplyingHistoryRef.current) return;

        const snapshot = cloneBlocksState(nextBlocks);
        const stackHead = historyRef.current.slice(0, historyIndexRef.current + 1);
        stackHead.push(snapshot);

        if (stackHead.length > 50) {
            stackHead.shift();
        } else {
            historyIndexRef.current += 1;
        }

        historyRef.current = stackHead;
        historyIndexRef.current = Math.min(historyIndexRef.current, historyRef.current.length - 1);
        setHistoryInfo({
            canUndo: historyIndexRef.current > 0,
            canRedo: historyIndexRef.current < historyRef.current.length - 1,
        });
    }, []);

    const applyHistoryAt = useCallback((index: number) => {
        if (index < 0 || index >= historyRef.current.length) return;
        isApplyingHistoryRef.current = true;
        historyIndexRef.current = index;
        setBlocks(cloneBlocksState(historyRef.current[index]));
        setSelectedIds([]);
        setTimeout(() => {
            isApplyingHistoryRef.current = false;
        }, 0);
        setHistoryInfo({
            canUndo: historyIndexRef.current > 0,
            canRedo: historyIndexRef.current < historyRef.current.length - 1,
        });
    }, []);

    const undo = useCallback(() => {
        applyHistoryAt(historyIndexRef.current - 1);
    }, [applyHistoryAt]);

    const redo = useCallback(() => {
        applyHistoryAt(historyIndexRef.current + 1);
    }, [applyHistoryAt]);

    const commitBlocks = useCallback((updater: (prev: BlockData[]) => BlockData[]) => {
        setBlocks(prev => {
            const next = updater(prev);
            pushHistory(next);
            return next;
        });
    }, [pushHistory]);

    const updateBlock = useCallback((id: string, u: Partial<BlockData>) =>
        commitBlocks(p => p.map(b => b.id === id ? { ...b, ...u } : b)), [commitBlocks]);

    const toggleLockForId = useCallback((id: string) => {
        commitBlocks(prev => prev.map(block =>
            block.id === id ? { ...block, locked: !block.locked } : block
        ));
    }, [commitBlocks]);

    const toggleCollapseForId = useCallback((id: string) => {
        commitBlocks(prev => prev.map(block =>
            block.id === id
                ? { ...block, collapsed: !block.collapsed, h: block.h ?? getEstimatedBlockHeight(block.type) }
                : block
        ));
    }, [commitBlocks]);

    const toggleCollapseOnSelection = useCallback(() => {
        if (selectedIds.length === 0) return;
        commitBlocks(prev => {
            const targets = prev.filter(b => selectedIds.includes(b.id));
            if (targets.length === 0) return prev;
            const shouldCollapse = targets.some(b => !b.collapsed);
            return prev.map(b => selectedIds.includes(b.id)
                ? { ...b, collapsed: shouldCollapse, h: b.h ?? getEstimatedBlockHeight(b.type) }
                : b);
        });
    }, [commitBlocks, selectedIds]);

    const onWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const isPinchZoom = e.ctrlKey || e.metaKey;

        if (isPinchZoom) {
            const rect = canvas.getBoundingClientRect();
            const cursorX = e.clientX - rect.left;
            const cursorY = e.clientY - rect.top;
            const { zoom: currentZoom, panX, panY } = viewportRef.current;

            const deltaY = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
            const zoomFactor = Math.exp(-deltaY * 0.0018);
            const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom * zoomFactor));
            if (nextZoom === currentZoom) return;

            const worldX = (cursorX - panX) / currentZoom;
            const worldY = (cursorY - panY) / currentZoom;

            setZoom(nextZoom);
            setPan({
                x: cursorX - worldX * nextZoom,
                y: cursorY - worldY * nextZoom,
            });
            return;
        }

        const dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX;
        const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        wheelDeltaRef.current.dx += dx;
        wheelDeltaRef.current.dy += dy;

        if (wheelFrameRef.current) return;
        wheelFrameRef.current = requestAnimationFrame(() => {
            const { dx: sumX, dy: sumY } = wheelDeltaRef.current;
            wheelDeltaRef.current = { dx: 0, dy: 0 };
            wheelFrameRef.current = 0;
            setPan(prev => ({
                x: prev.x - sumX,
                y: prev.y - sumY,
            }));
        });
    }, []);

    useEffect(() => {
        const el = canvasRef.current;
        if (el) el.addEventListener("wheel", onWheel, { passive: false });
        return () => el?.removeEventListener("wheel", onWheel);
    }, [onWheel]);

    useEffect(() => {
        return () => {
            if (wheelFrameRef.current) {
                cancelAnimationFrame(wheelFrameRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;

        const updateSize = () => {
            setViewportSize({ width: el.clientWidth || 1, height: el.clientHeight || 1 });
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(el);

        return () => observer.disconnect();
    }, []);

    const minimap = useMemo(() => {
        if (blocks.length === 0) return null;

        const minX = Math.min(...blocks.map(b => b.x));
        const minY = Math.min(...blocks.map(b => b.y));
        const maxX = Math.max(...blocks.map(b => b.x + b.w));
        const maxY = Math.max(...blocks.map(b => b.y + getBlockHeight(b)));
        const worldWidth = Math.max(1, maxX - minX);
        const worldHeight = Math.max(1, maxY - minY);

        const mapWidth = 160;
        const mapHeight = 108;
        const scale = Math.min(mapWidth / worldWidth, mapHeight / worldHeight);
        const contentW = worldWidth * scale;
        const contentH = worldHeight * scale;
        const offsetX = (mapWidth - contentW) / 2;
        const offsetY = (mapHeight - contentH) / 2;

        const visibleWorldX = -pan.x / zoom;
        const visibleWorldY = -pan.y / zoom;
        const visibleWorldW = viewportSize.width / zoom;
        const visibleWorldH = viewportSize.height / zoom;

        const rawX = offsetX + (visibleWorldX - minX) * scale;
        const rawY = offsetY + (visibleWorldY - minY) * scale;
        const rawW = visibleWorldW * scale;
        const rawH = visibleWorldH * scale;
        const clampedW = Math.min(mapWidth, Math.max(8, rawW));
        const clampedH = Math.min(mapHeight, Math.max(8, rawH));
        const clampedX = Math.min(mapWidth - clampedW, Math.max(0, rawX));
        const clampedY = Math.min(mapHeight - clampedH, Math.max(0, rawY));

        return {
            minX,
            minY,
            scale,
            mapWidth,
            mapHeight,
            offsetX,
            offsetY,
            visibleRect: {
                x: clampedX,
                y: clampedY,
                w: clampedW,
                h: clampedH,
            },
        };
    }, [blocks, pan.x, pan.y, viewportSize.height, viewportSize.width, zoom]);

    const jumpFromMinimap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!minimap) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;

        const centeredX = localX - minimap.offsetX;
        const centeredY = localY - minimap.offsetY;
        const worldX = minimap.minX + centeredX / minimap.scale;
        const worldY = minimap.minY + centeredY / minimap.scale;

        setPan({
            x: viewportSize.width / 2 - worldX * zoom,
            y: viewportSize.height / 2 - worldY * zoom,
        });
    }, [minimap, viewportSize.height, viewportSize.width, zoom]);

    const toCanvasPoint = useCallback((clientX: number, clientY: number) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: clientX, y: clientY };
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    }, []);

    // Pan + block drag
    const onMouseDown = (e: React.MouseEvent) => {
        const onCanvas = e.target === canvasRef.current || (e.target instanceof Element && e.target.classList.contains("cvs-bg"));
        if (!onCanvas) return;

        setShowPalette(false);
        if (e.button === 1 || (e.button === 0 && (isSpacePressed || activeTool === "pan"))) {
            e.preventDefault();
            setIsPanning(true);
            panStartRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
            return;
        }

        if (e.button === 0) {
            if (!e.shiftKey) {
                setSelectedIds([]);
            }
            const point = toCanvasPoint(e.clientX, e.clientY);
            setIsSelecting(true);
            selectionStartRef.current = { additive: e.shiftKey };
            setSelectionBox({ startX: point.x, startY: point.y, currentX: point.x, currentY: point.y });
        }
    };

    const startBlockDrag = (id: string, e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        const block = blocks.find(b => b.id === id);
        if (!block || block.locked) return;

        const dragIds = selectedIds.includes(id) && selectedIds.length > 0 ? selectedIds : [id];
        if (!selectedIds.includes(id)) {
            setSelectedIds([id]);
        }

        const movableIds = dragIds.filter(candidateId => {
            const candidate = blocks.find(b => b.id === candidateId);
            return !!candidate && !candidate.locked;
        });
        if (movableIds.length === 0) return;

        const origins: Record<string, { x: number; y: number }> = {};
        blocks.forEach(b => {
            if (movableIds.includes(b.id)) {
                origins[b.id] = { x: b.x, y: b.y };
            }
        });

        setIsDraggingBlock(true);
        dragRef.current = { ids: movableIds, startX: e.clientX, startY: e.clientY, origins };
    };

    const startBlockResize = (id: string, e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const block = blocks.find(b => b.id === id);
        if (!block || block.locked) return;

        setIsResizingBlock(true);
        setResizePreview({ id, width: Math.round(block.w) });
        resizeRef.current = {
            id,
            startX: e.clientX,
            initialWidth: block.w,
            minWidth: getMinWidthForType(block.type),
        };
    };

    const handlePointerMove = useCallback((clientX: number, clientY: number) => {
        if (isPanning && panStartRef.current) {
            const dx = clientX - panStartRef.current.mx;
            const dy = clientY - panStartRef.current.my;
            setPan({ x: panStartRef.current.px + dx, y: panStartRef.current.py + dy });
        }
        if (isDraggingBlock && dragRef.current) {
            const dx = (clientX - dragRef.current.startX) / zoom;
            const dy = (clientY - dragRef.current.startY) / zoom;
            didTransformRef.current = true;
            cancelAnimationFrame(frameRef.current);
            frameRef.current = requestAnimationFrame(() =>
                setBlocks(p => p.map(b => {
                    if (!dragRef.current || !dragRef.current.ids.includes(b.id)) return b;
                    const origin = dragRef.current.origins[b.id];
                    if (!origin) return b;
                    const rawX = origin.x + dx;
                    const rawY = origin.y + dy;
                    const newX = snapToGrid ? Math.round(rawX / GRID_SIZE) * GRID_SIZE : rawX;
                    const newY = snapToGrid ? Math.round(rawY / GRID_SIZE) * GRID_SIZE : rawY;
                    return { ...b, x: newX, y: newY };
                }))
            );
        }
        if (isResizingBlock && resizeRef.current) {
            didTransformRef.current = true;
            const dx = (clientX - resizeRef.current.startX) / zoom;
            const rawWidth = resizeRef.current.initialWidth + dx;
            const widthValue = snapToGrid ? Math.round(rawWidth / GRID_SIZE) * GRID_SIZE : rawWidth;
            const nextWidth = Math.max(resizeRef.current.minWidth, widthValue);
            const resizeId = resizeRef.current.id;

            cancelAnimationFrame(frameRef.current);
            frameRef.current = requestAnimationFrame(() =>
                setBlocks(p => p.map(b => b.id === resizeId ? { ...b, w: nextWidth } : b))
            );
            setResizePreview({ id: resizeId, width: Math.round(nextWidth) });
        }
        if (isSelecting && selectionStartRef.current) {
            const point = toCanvasPoint(clientX, clientY);
            setSelectionBox(prev => prev ? { ...prev, currentX: point.x, currentY: point.y } : null);
        }
    }, [isDraggingBlock, isPanning, isResizingBlock, isSelecting, snapToGrid, toCanvasPoint, zoom]);

    const stopInteractions = useCallback(() => {
        if (isSelecting && selectionBox && canvasRef.current) {
            const minX = Math.min(selectionBox.startX, selectionBox.currentX);
            const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
            const minY = Math.min(selectionBox.startY, selectionBox.currentY);
            const maxY = Math.max(selectionBox.startY, selectionBox.currentY);

            const matched = blocksRef.current
                .filter(block => {
                    const x = pan.x + block.x * zoom;
                    const y = pan.y + block.y * zoom;
                    const w = block.w * zoom;
                    const h = getBlockHeight(block) * zoom;
                    return x < maxX && x + w > minX && y < maxY && y + h > minY;
                })
                .map(block => block.id);

            if (selectionStartRef.current?.additive) {
                const next = new Set(selectedIds);
                matched.forEach(id => next.add(id));
                setSelectedIds(Array.from(next));
            } else {
                setSelectedIds(matched);
            }
        }

        if (didTransformRef.current) {
            pushHistory(blocksRef.current);
            didTransformRef.current = false;
        }

        setIsPanning(false);
        setIsDraggingBlock(false);
        setIsResizingBlock(false);
        setIsSelecting(false);
        dragRef.current = null;
        resizeRef.current = null;
        selectionStartRef.current = null;
        setResizePreview(null);
        setSelectionBox(null);
        cancelAnimationFrame(frameRef.current);
    }, [isSelecting, pan.x, pan.y, pushHistory, selectedIds, selectionBox, zoom]);

    const onMouseMove = (e: React.MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onMouseUp = () => stopInteractions();

    useEffect(() => {
        if (!isPanning && !isDraggingBlock && !isResizingBlock && !isSelecting) return;

        const onWindowMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
        const onWindowUp = () => stopInteractions();

        window.addEventListener("mousemove", onWindowMove);
        window.addEventListener("mouseup", onWindowUp);

        return () => {
            window.removeEventListener("mousemove", onWindowMove);
            window.removeEventListener("mouseup", onWindowUp);
        };
    }, [handlePointerMove, isDraggingBlock, isPanning, isResizingBlock, isSelecting, stopInteractions]);

    const addBlock = (type: string) => {
        if (!ALLOWED_BLOCK_TYPES.has(type)) return;
        blockCounterRef.current += 1;
        const id = `b${blockCounterRef.current}`;
        const newBlock: BlockData = {
            id, type,
            x: snapToGrid ? Math.round((-pan.x / zoom + 120) / GRID_SIZE) * GRID_SIZE : (-pan.x / zoom + 120),
            y: snapToGrid ? Math.round((-pan.y / zoom + 120) / GRID_SIZE) * GRID_SIZE : (-pan.y / zoom + 120),
            w: type === "protocol" ? 340 : type === "measurement" ? 320 : type === "datatable" ? 420 : type === "observation" ? 340 : type === "tag" ? 280 : 300,
            data: type === "note" ? { title: "", text: "" }
                : type === "protocol" ? { title: "", steps: [{ id: "s1", text: "" }] }
                    : type === "observation" ? { title: "", text: "" }
                        : type === "measurement" ? { title: "Measurements", rows: [{ id: "m1", key: "", value: "", unit: "" }] }
                            : type === "datatable" ? { title: "Data Table", columns: ["A", "B", "C"], rows: [["", "", ""], ["", "", ""]] }
                                : type === "image" ? { title: "", label: "Image", src: "", cropX: 10, cropY: 10, cropW: 70, cropH: 70, annotations: [], nextAnnotation: "" }
                                    : { title: "Tags", tags: [], draft: "" },
        };
        commitBlocks(p => [...p, newBlock]);
        setSelectedIds([id]);
        setShowPalette(false);
    };

    const saveAsTemplate = useCallback(() => {
        const source = saveSelectionOnly && selectedIds.length > 0
            ? blocksRef.current.filter(block => selectedIds.includes(block.id))
            : blocksRef.current;
        if (source.length === 0) return;

        const normalizedName = templateName.trim();
        if (!normalizedName) return;

        const minX = Math.min(...source.map(block => block.x));
        const minY = Math.min(...source.map(block => block.y));
        const id = `tpl-user-${Date.now()}`;

        const templateBlocks = source.map((block, idx) => ({
            ...block,
            id: `b${idx + 1}`,
            x: Math.round(block.x - minX + 120),
            y: Math.round(block.y - minY + 120),
            data: JSON.parse(JSON.stringify(block.data || {})),
        }));

        const customTemplates = safeParse<Array<{
            id: string;
            name: string;
            icon: string;
            color: string;
            desc: string;
            blocks: number;
            preview?: string;
            createdAt?: string;
        }>>(sessionStorage.getItem(SESSION_TEMPLATES_KEY), []);

        const customTemplateBlocks = safeParse<Record<string, BlockData[]>>(
            sessionStorage.getItem(SESSION_TEMPLATE_BLOCKS_KEY),
            {}
        );

        const firstType = templateBlocks[0]?.type || "note";
        customTemplates.unshift({
            id,
            name: normalizedName,
            icon: pickTemplateIconFromBlockType(firstType),
            color: C.accent,
            desc: templateDesc.trim() || "Custom template from canvas",
            blocks: templateBlocks.length,
            preview: `Saved ${templateBlocks.length} block template`,
            createdAt: new Date().toISOString(),
        });
        customTemplateBlocks[id] = templateBlocks;

        sessionStorage.setItem(SESSION_TEMPLATES_KEY, JSON.stringify(customTemplates));
        sessionStorage.setItem(SESSION_TEMPLATE_BLOCKS_KEY, JSON.stringify(customTemplateBlocks));
        window.dispatchEvent(new Event(TEMPLATES_CHANGED_EVENT));
        emitToast({ message: `Template saved: ${normalizedName}`, kind: "success" });

        setTemplateName("");
        setTemplateDesc("");
        setShowSaveTemplate(false);
    }, [saveSelectionOnly, selectedIds, templateDesc, templateName]);

    const selectAllBlocks = useCallback(() => {
        setSelectedIds(blocksRef.current.map(b => b.id));
    }, []);

    const duplicateSelected = useCallback(() => {
        if (selectedIds.length === 0) return;

        const source = blocksRef.current.filter(b => selectedIds.includes(b.id));
        if (source.length === 0) return;

        const createdIds: string[] = [];
        commitBlocks(prev => {
            const clones = source.map(block => {
                blockCounterRef.current += 1;
                const cloneId = `b${blockCounterRef.current}`;
                createdIds.push(cloneId);

                const rawX = block.x + 24;
                const rawY = block.y + 24;

                return {
                    ...block,
                    id: cloneId,
                    x: snapToGrid ? Math.round(rawX / GRID_SIZE) * GRID_SIZE : rawX,
                    y: snapToGrid ? Math.round(rawY / GRID_SIZE) * GRID_SIZE : rawY,
                    data: JSON.parse(JSON.stringify(block.data || {})),
                };
            });
            return [...prev, ...clones];
        });

        setSelectedIds(createdIds);
    }, [commitBlocks, selectedIds, snapToGrid]);

    const toggleLockOnSelection = useCallback(() => {
        if (selectedIds.length === 0) return;
        commitBlocks(prev => {
            const target = prev.filter(b => selectedIds.includes(b.id));
            if (target.length === 0) return prev;
            const shouldLock = target.some(b => !b.locked);
            return prev.map(b => selectedIds.includes(b.id) ? { ...b, locked: shouldLock } : b);
        });
    }, [commitBlocks, selectedIds]);

    const deleteSelected = useCallback(() => {
        if (selectedIds.length === 0) return;
        commitBlocks(p => p.filter(b => !selectedIds.includes(b.id)));
        setConnections(prev => prev.filter(conn => !selectedIds.includes(conn.fromId) && !selectedIds.includes(conn.toId)));
        setSelectedIds([]);
    }, [commitBlocks, selectedIds]);

    const setThemeOnSelection = useCallback((theme: NonNullable<BlockData["theme"]>) => {
        if (selectedIds.length === 0) return;
        commitBlocks(prev => prev.map(block => selectedIds.includes(block.id) ? { ...block, theme } : block));
    }, [commitBlocks, selectedIds]);

    const toggleVisibility = useCallback((id: string) => {
        commitBlocks(prev => prev.map(block => block.id === id ? { ...block, hidden: !block.hidden } : block));
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(v => v !== id));
        }
    }, [commitBlocks, selectedIds]);

    const moveLayer = useCallback((id: string, direction: "up" | "down") => {
        commitBlocks(prev => {
            const idx = prev.findIndex(block => block.id === id);
            if (idx < 0) return prev;
            const targetIdx = direction === "up" ? Math.min(prev.length - 1, idx + 1) : Math.max(0, idx - 1);
            if (targetIdx === idx) return prev;
            const next = [...prev];
            const [item] = next.splice(idx, 1);
            next.splice(targetIdx, 0, item);
            return next;
        });
    }, [commitBlocks]);

    const connectSelection = useCallback(() => {
        if (selectedIds.length !== 2) return;
        const [fromId, toId] = selectedIds;
        if (fromId === toId) return;
        const existing = connections.find(conn =>
            (conn.fromId === fromId && conn.toId === toId) ||
            (conn.fromId === toId && conn.toId === fromId)
        );
        if (existing) return;
        setConnections(prev => [...prev, { id: `ln-${Date.now()}`, fromId, toId, color: C.accent }]);
    }, [connections, selectedIds]);

    const clearConnectionsForSelection = useCallback(() => {
        if (selectedIds.length === 0) return;
        setConnections(prev => prev.filter(conn => !selectedIds.includes(conn.fromId) && !selectedIds.includes(conn.toId)));
    }, [selectedIds]);

    const saveExperimentMetadata = useCallback(() => {
        const savedAt = nowLabel();
        const experiments = safeParse<Array<Record<string, unknown>>>(sessionStorage.getItem(experimentsSessionKey), []);
        const next = experiments.map(exp =>
            String(exp.id) === canvasId
                ? {
                    ...exp,
                    title: experimentMeta.title,
                    status: experimentMeta.status,
                    objective: experimentMeta.objective || "",
                    owner: experimentMeta.owner || "",
                    tags: experimentMeta.tags || [],
                    updated: savedAt,
                }
                : exp
        );
        sessionStorage.setItem(experimentsSessionKey, JSON.stringify(next));
        setExperimentMeta(prev => ({ ...prev, updated: savedAt }));
        emitToast({ message: "Experiment metadata saved", kind: "success" });
    }, [canvasId, experimentMeta, experimentsSessionKey]);

    const saveCanvasNow = useCallback(() => {
        const ok = persistCanvasState(true);
        if (ok) {
            emitToast({ message: "Canvas saved", kind: "success" });
        }
    }, [persistCanvasState]);

    const generateShareLink = useCallback(async () => {
        if (!token) {
            emitToast({ message: "Please log in to generate a share link", kind: "error" });
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/share/publish`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    project_id: canvasId,
                    title: experimentMeta.title || "Untitled Experiment",
                    permission_level: sharePermission,
                    blocks: blocks.map(block => ({ ...block, data: { ...block.data } })),
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || `Share publish failed (${response.status})`);
            }

            const payload = await response.json() as { token: string; share_url_path?: string };
            const link = payload.share_url_path
                ? `${window.location.origin}${payload.share_url_path}`
                : `${window.location.origin}/view/${encodeURIComponent(payload.token)}`;

            setLatestShareLink(link);
            emitToast({ message: "Share link created", kind: "success" });
        } catch {
            emitToast({ message: "Could not generate share link", kind: "error" });
        }
    }, [blocks, canvasId, experimentMeta.title, sharePermission, token]);

    const copyShareLink = useCallback(async () => {
        if (!latestShareLink) return;
        try {
            await navigator.clipboard.writeText(latestShareLink);
            emitToast({ message: "Share link copied", kind: "success" });
        } catch {
            emitToast({ message: "Could not copy link", kind: "error" });
        }
    }, [latestShareLink]);

    const zoomTo = useCallback((v: number) => setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v))), []);
    const resetView = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || blocks.length === 0) {
            setZoom(1);
            setPan({ x: 40, y: 40 });
            return;
        }

        const visibleBlocks = blocks.filter(block => !block.hidden);
        const src = visibleBlocks.length > 0 ? visibleBlocks : blocks;
        const minX = Math.min(...src.map(block => block.x));
        const minY = Math.min(...src.map(block => block.y));
        const maxX = Math.max(...src.map(block => block.x + block.w));
        const maxY = Math.max(...src.map(block => block.y + getBlockHeight(block)));

        const centerX = minX + (maxX - minX) / 2;
        const centerY = minY + (maxY - minY) / 2;

        setZoom(1);
        setPan({
            x: canvas.clientWidth / 2 - centerX,
            y: canvas.clientHeight / 2 - centerY,
        });
    }, [blocks]);

    const declutterBlocks = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || blocksRef.current.length === 0) return;

        const gutter = 56;
        const sectionGap = 88;
        const startX = Math.max(80, Math.round(-pan.x / zoom + 80));
        const startY = Math.max(80, Math.round(-pan.y / zoom + 80));
        const workspaceW = Math.max(680, Math.round(canvas.clientWidth / zoom) - 160);
        const workspaceH = Math.max(520, Math.round(canvas.clientHeight / zoom) - 140);

        const typeOrder = [
            "note",
            "protocol",
            "observation",
            "measurement",
            "datatable",
            "image",
            "tag",
        ];
        const typeRank = new Map(typeOrder.map((type, idx) => [type, idx]));

        commitBlocks(prev => {
            let cursorX = startX;
            let cursorY = startY;
            let currentRowHeight = 0;
            const byType = new Map<string, BlockData[]>();
            prev.forEach(block => {
                const key = block.type || "misc";
                if (!byType.has(key)) byType.set(key, []);
                byType.get(key)?.push(block);
            });

            const orderedTypes = Array.from(byType.keys()).sort((a, b) => {
                const rankA = typeRank.has(a) ? (typeRank.get(a) as number) : 999;
                const rankB = typeRank.has(b) ? (typeRank.get(b) as number) : 999;
                if (rankA !== rankB) return rankA - rankB;
                return a.localeCompare(b);
            });

            const placements = new Map<string, { x: number; y: number }>();

            orderedTypes.forEach((type) => {
                const group = byType.get(type) || [];
                if (group.length === 0) return;

                // Lay out each type group in local coordinates first.
                const local = new Map<string, { x: number; y: number }>();
                const maxColumnHeight = Math.max(320, Math.round(workspaceH * 0.72));

                let columnX = 0;
                let columnY = 0;
                let columnW = 0;
                let groupW = 0;
                let groupH = 0;

                group.forEach(block => {
                    const width = block.w;
                    const height = getBlockHeight(block);

                    if (columnY > 0 && columnY + height > maxColumnHeight) {
                        columnX += columnW + gutter;
                        columnY = 0;
                        columnW = 0;
                    }

                    local.set(block.id, { x: columnX, y: columnY });

                    columnY += height + gutter;
                    columnW = Math.max(columnW, width);
                    groupW = Math.max(groupW, columnX + columnW);
                    groupH = Math.max(groupH, columnY - gutter);
                });

                // Wrap type sections so declutter uses both horizontal and vertical workspace.
                if (cursorX > startX && cursorX + groupW > startX + workspaceW) {
                    cursorX = startX;
                    cursorY += currentRowHeight + sectionGap;
                    currentRowHeight = 0;
                }

                local.forEach((point, blockId) => {
                    placements.set(blockId, {
                        x: snapToGrid ? Math.round((cursorX + point.x) / GRID_SIZE) * GRID_SIZE : cursorX + point.x,
                        y: snapToGrid ? Math.round((cursorY + point.y) / GRID_SIZE) * GRID_SIZE : cursorY + point.y,
                    });
                });

                cursorX += groupW + sectionGap;
                currentRowHeight = Math.max(currentRowHeight, groupH);
            });

            return prev.map(block => {
                const placed = placements.get(block.id);
                if (!placed) return block;
                return { ...block, x: placed.x, y: placed.y };
            });
        });
        emitToast({ message: "Canvas decluttered in 2D by type", kind: "success" });
    }, [commitBlocks, pan.x, pan.y, snapToGrid, zoom]);

    const fitToScreen = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (blocks.length === 0) {
            resetView();
            return;
        }

        const minX = Math.min(...blocks.map(b => b.x));
        const minY = Math.min(...blocks.map(b => b.y));
        const maxX = Math.max(...blocks.map(b => b.x + b.w));
        const maxY = Math.max(...blocks.map(b => b.y + getBlockHeight(b)));

        const worldWidth = Math.max(1, maxX - minX);
        const worldHeight = Math.max(1, maxY - minY);
        const viewWidth = canvas.clientWidth;
        const viewHeight = canvas.clientHeight;

        const padding = 80;
        const fitZoom = Math.min(
            (viewWidth - padding * 2) / worldWidth,
            (viewHeight - padding * 2) / worldHeight,
        );
        const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fitZoom));

        const centerX = minX + worldWidth / 2;
        const centerY = minY + worldHeight / 2;

        setZoom(nextZoom);
        setPan({
            x: viewWidth / 2 - centerX * nextZoom,
            y: viewHeight / 2 - centerY * nextZoom,
        });
    }, [blocks, resetView]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (isEditableTarget(e.target)) return;

            if (e.code === "Space") {
                e.preventDefault();
                setIsSpacePressed(true);
            }

            const mod = e.ctrlKey || e.metaKey;

            if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
                e.preventDefault();
                deleteSelected();
                return;
            }

            if (mod && e.key.toLowerCase() === "z") {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                return;
            }

            if (mod && e.key.toLowerCase() === "y") {
                e.preventDefault();
                redo();
                return;
            }

            if (mod && e.key.toLowerCase() === "f") {
                e.preventDefault();
                fitToScreen();
                return;
            }

            if (mod && e.key.toLowerCase() === "a") {
                e.preventDefault();
                selectAllBlocks();
                return;
            }

            if (mod && e.key.toLowerCase() === "d") {
                e.preventDefault();
                duplicateSelected();
                return;
            }

            if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
                e.preventDefault();
                setShowShortcuts(v => !v);
                return;
            }

            if (e.key.toLowerCase() === "g") {
                e.preventDefault();
                setSnapToGrid(v => !v);
                return;
            }

            if (e.key.toLowerCase() === "l") {
                e.preventDefault();
                toggleLockOnSelection();
                return;
            }

            if (e.key.toLowerCase() === "c") {
                e.preventDefault();
                toggleCollapseOnSelection();
                return;
            }

            if (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "b") {
                e.preventDefault();
                setShowPalette(v => !v);
                return;
            }

            if (e.key === "Escape") {
                if (showShortcuts) {
                    setShowShortcuts(false);
                    return;
                }
                setSelectedIds([]);
                setShowPalette(false);
                stopInteractions();
                return;
            }
            if (!mod) return;

            if (e.key === "0") {
                e.preventDefault();
                resetView();
                return;
            }

            if (e.key === "=" || e.key === "+") {
                e.preventDefault();
                zoomTo(zoom + 0.1);
                return;
            }

            if (e.key === "-") {
                e.preventDefault();
                zoomTo(zoom - 0.1);
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                setIsSpacePressed(false);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, [deleteSelected, duplicateSelected, fitToScreen, redo, resetView, selectAllBlocks, selectedIds.length, showShortcuts, stopInteractions, toggleCollapseOnSelection, toggleLockOnSelection, undo, zoom, zoomTo]);

    const selectedBlock = selectedIds.length === 1 ? blocks.find(b => b.id === selectedIds[0]) : undefined;
    const canUndo = historyInfo.canUndo;
    const canRedo = historyInfo.canRedo;
    const status = statusMeta(experimentMeta.status || "active");

    return (
        <>
            <style>{`
        * { box-sizing: border-box; }
        textarea { caret-color: ${C.accent}; }
        input, textarea, select { color: ${C.text}; }
        input::placeholder, textarea::placeholder { color: ${C.textDim}; }
        textarea::placeholder { color: ${C.textDim}; }
        input:hover, textarea:hover, select:hover { border-color: ${C.accent}66 !important; }
        input:focus, textarea:focus, select:focus {
          border-color: ${C.accent} !important;
          box-shadow: 0 0 0 1px ${C.accent}33;
          background: ${C.surface} !important;
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.borderMid}; border-radius: 2px; }
        .tool-btn { background: none; border: none; cursor: pointer; transition: all 0.12s; }
        .tool-btn:hover { background: ${C.borderMid} !important; }
        .tool-btn:active { opacity: 0.7; transform: scale(0.96); }
                .top-action-btn:hover {
                    background: ${C.accentDim} !important;
                    border-color: ${C.accent} !important;
                    color: ${C.text} !important;
                }
        .palette-item { background: none; border: 1px solid ${C.border}; cursor: pointer; transition: all 0.15s; }
        .palette-item:hover { border-color: ${C.borderMid}; background: ${C.panel} !important; }
        .add-btn:hover { background: ${C.accent} !important; color: #fff !important; }
      `}</style>

            <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden", background: C.bg, fontFamily: FONT_SANS }}>

                {/* ── Top bar ─────────────────────────────────────────────── */}
                <div style={{
                    height: 44, display: "flex", alignItems: "center", gap: 0,
                    background: C.surface, borderBottom: `1px solid ${C.border}`,
                    flexShrink: 0, zIndex: 100,
                }}>
                    {/* Back */}
                    <button className="tool-btn" onClick={() => router.push("/")}
                        style={{ height: 44, padding: "0 16px", fontFamily: FONT_LABEL, fontSize: 10, color: C.textMid, borderRight: `1px solid ${C.border}`, borderRadius: 0, letterSpacing: 1 }}>
                        ← BACK
                    </button>

                    {/* Title */}
                    <div style={{ padding: "0 20px", borderRight: `1px solid ${C.border}`, height: 44, display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ display: "flex", alignItems: "center", color: status.color }}><status.Icon size={12} /></span>
                        <span style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: C.text, letterSpacing: -0.3 }}>{experimentMeta.title}</span>
                    </div>

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Block count */}
                    <div style={{ padding: "0 16px", borderLeft: `1px solid ${C.border}`, height: 44, display: "flex", alignItems: "center" }}>
                        <span style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 1 }}>{blocks.length} BLOCKS</span>
                    </div>

                    {/* Zoom controls */}
                    <div style={{ padding: "0 12px", borderLeft: `1px solid ${C.border}`, height: 44, display: "flex", alignItems: "center", gap: 4 }}>
                        {[
                            { label: "−", action: () => zoomTo(zoom - 0.1) },
                            { label: `${Math.round(zoom * 100)}%`, action: null },
                            { label: "+", action: () => zoomTo(zoom + 0.1) },
                            { label: "FIT", action: fitToScreen },
                            { label: "1:1", action: resetView },
                        ].map(({ label, action }, i) => action
                            ? <button key={i} className="tool-btn" onClick={action} style={{ width: 34, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, fontFamily: FONT_LABEL, fontSize: 10, color: C.textMid }} title={i === 3 ? "Fit to screen" : i === 4 ? "Reset view" : undefined}>{label}</button>
                            : <span key={i} style={{ fontFamily: FONT_LABEL, fontSize: 10, color: C.textDim, minWidth: 36, textAlign: "center" }}>{label}</span>
                        )}
                    </div>

                    {/* Actions */}
                    <div style={{ padding: "0 12px", borderLeft: `1px solid ${C.border}`, height: 44, display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                            className="tool-btn"
                            onClick={() => setShowLibrary(v => !v)}
                            style={{ height: 28, padding: "0 10px", borderRadius: 4, fontFamily: FONT_LABEL, fontSize: 9, color: showLibrary ? C.accent : C.textMid, border: `1px solid ${showLibrary ? C.accent : C.border}` }}
                            title="Toggle block library"
                        >
                            LIBRARY
                        </button>
                        <button
                            className="tool-btn top-action-btn"
                            onClick={saveCanvasNow}
                            style={{ height: 28, width: 30, borderRadius: 4, color: C.accent, border: `1px solid ${C.accent}66`, background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="Save canvas now"
                        >
                            <Save size={14} />
                        </button>
                        <button
                            className="tool-btn top-action-btn"
                            onClick={() => setShowSaveTemplate(true)}
                            style={{ height: 28, width: 30, borderRadius: 4, color: C.text, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="Save current canvas as reusable template"
                        >
                            <BookmarkPlus size={14} />
                        </button>
                        <button
                            className="tool-btn"
                            onClick={declutterBlocks}
                            style={{ height: 28, padding: "0 10px", borderRadius: 4, fontFamily: FONT_LABEL, fontSize: 9, color: C.textMid, border: `1px solid ${C.border}` }}
                            title="Auto-space blocks to declutter canvas"
                        >
                            DECLUTTER
                        </button>
                        <button className="tool-btn top-action-btn" onClick={undo} disabled={!canUndo}
                            style={{ height: 28, width: 30, borderRadius: 4, color: canUndo ? C.text : C.textDim, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="Undo"
                        >
                            <Undo2 size={14} />
                        </button>
                        <button className="tool-btn top-action-btn" onClick={redo} disabled={!canRedo}
                            style={{ height: 28, width: 30, borderRadius: 4, color: canRedo ? C.text : C.textDim, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="Redo"
                        >
                            <Redo2 size={14} />
                        </button>
                        {selectedIds.length > 0 && (
                            <button className="tool-btn" onClick={deleteSelected}
                                style={{ height: 28, padding: "0 12px", borderRadius: 4, fontFamily: FONT_LABEL, fontSize: 9, color: C.red, letterSpacing: 1, border: `1px solid ${C.red}22` }}>
                                DELETE
                            </button>
                        )}
                        {selectedIds.length === 2 && (
                            <button className="tool-btn" onClick={connectSelection}
                                style={{ height: 28, padding: "0 10px", borderRadius: 4, fontFamily: FONT_LABEL, fontSize: 9, color: C.accent, letterSpacing: 1, border: `1px solid ${C.accent}44`, display: "flex", alignItems: "center", gap: 6 }}>
                                <Link2 size={11} /> CONNECT
                            </button>
                        )}
                        <button
                            className="tool-btn top-action-btn"
                            onClick={() => {
                                setShowShareModal(true);
                                setLatestShareLink("");
                            }}
                            title="Share"
                            style={{ height: 28, width: 30, borderRadius: 4, background: C.accentDim, border: `1px solid ${C.accent}55`, color: C.accent, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Share2 size={14} />
                        </button>
                    </div>
                </div>

                {/* ── Body ────────────────────────────────────────────────── */}
                <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

                    {/* Left tool rail */}
                    <div style={{
                        width: 44, background: C.surface, borderRight: `1px solid ${C.border}`,
                        display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10, gap: 4, flexShrink: 0,
                    }}>
                        {[
                            { id: "select", icon: "↖", title: "Select" },
                            { id: "pan", icon: "✥", title: "Pan" },
                        ].map(({ id, icon, title }) => (
                            <button
                                key={id}
                                className="tool-btn"
                                title={title}
                                onClick={() => setActiveTool(id as "select" | "pan")}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 4,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontFamily: FONT_LABEL,
                                    fontSize: 14,
                                    color: activeTool === id ? C.accent : C.textMid,
                                    border: `1px solid ${activeTool === id ? C.accent : "transparent"}`,
                                    background: activeTool === id ? C.accentDim : "transparent",
                                }}>
                                {icon}
                            </button>
                        ))}
                        <button
                            className="tool-btn"
                            onClick={() => setShowLibrary(v => !v)}
                            title="Block Library"
                            style={{ width: 32, height: 32, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_LABEL, fontSize: 10, color: showLibrary ? C.accent : C.textMid }}
                        >
                            LB
                        </button>
                        <div style={{ flex: 1 }} />
                        {/* minimap moved to canvas corner */}
                        <div style={{ width: 1, height: 1, marginBottom: 10 }} />
                    </div>

                    {showLibrary && (
                        <div style={{ width: 196, borderRight: `1px solid ${C.border}`, background: C.surface, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
                            <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
                                <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 1.4 }}>BLOCK LIBRARY</div>
                            </div>
                            <div style={{ padding: 10, display: "grid", gap: 6, overflowY: "auto" }}>
                                {BLOCK_TYPES.map(({ type, label }) => (
                                    <button
                                        key={`library-${type}`}
                                        onClick={() => addBlock(type)}
                                        style={{
                                            border: `1px solid ${C.border}`,
                                            background: C.panel,
                                            borderRadius: 6,
                                            padding: "8px 10px",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                        }}
                                    >
                                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{renderBlockTypeIcon(type, C.accent, 14)}</span>
                                        <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: C.textMid }}>{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Canvas */}
                    <div
                        ref={canvasRef}
                        className="cvs-bg"
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                        style={{
                            flex: 1, position: "relative", overflow: "hidden",
                            cursor: isPanning ? "grabbing" : isDraggingBlock ? "grabbing" : (isSpacePressed || activeTool === "pan") ? "grab" : "default",
                            backgroundImage: `
                linear-gradient(${C.border} 1px, transparent 1px),
                linear-gradient(90deg, ${C.border} 1px, transparent 1px),
                linear-gradient(${C.bg} 1px, transparent 1px),
                linear-gradient(90deg, ${C.bg} 1px, transparent 1px)
              `,
                            backgroundSize: `${80 * zoom}px ${80 * zoom}px, ${80 * zoom}px ${80 * zoom}px, ${16 * zoom}px ${16 * zoom}px, ${16 * zoom}px ${16 * zoom}px`,
                            backgroundPosition: `${pan.x}px ${pan.y}px, ${pan.x}px ${pan.y}px, ${pan.x}px ${pan.y}px, ${pan.x}px ${pan.y}px`,
                            backgroundColor: C.bg,
                        }}
                    >
                        {/* Blocks layer */}
                        <div style={{ position: "absolute", transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", width: 0, height: 0 }}>
                            {blocks.filter(block => !block.hidden).map(b => (
                                <CanvasBlock key={b.id} block={b} isSelected={selectedIds.includes(b.id)}
                                    onClick={(e) => {
                                        if (activeTool === "pan") return;
                                        if (e.shiftKey) {
                                            setSelectedIds(prev => prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id]);
                                            return;
                                        }
                                        setSelectedIds([b.id]);
                                    }}
                                    onChange={updateBlock}
                                    onDragStart={startBlockDrag}
                                    onResizeStart={startBlockResize}
                                    onToggleLock={toggleLockForId}
                                    onToggleCollapse={toggleCollapseForId}
                                />
                            ))}
                        </div>

                        <svg
                            width="100%"
                            height="100%"
                            style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 35 }}
                        >
                            <defs>
                                <marker id="arrow-head" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                                    <path d="M0,0 L8,4 L0,8 z" fill={C.accent} />
                                </marker>
                            </defs>
                            {connections.map(conn => {
                                const from = blocks.find(block => block.id === conn.fromId && !block.hidden);
                                const to = blocks.find(block => block.id === conn.toId && !block.hidden);
                                if (!from || !to) return null;

                                const x1 = pan.x + (from.x + from.w / 2) * zoom;
                                const y1 = pan.y + (from.y + getBlockHeight(from) / 2) * zoom;
                                const x2 = pan.x + (to.x + to.w / 2) * zoom;
                                const y2 = pan.y + (to.y + getBlockHeight(to) / 2) * zoom;
                                const mx = (x1 + x2) / 2;
                                const path = `M ${x1} ${y1} Q ${mx} ${Math.min(y1, y2) - 28} ${x2} ${y2}`;

                                return (
                                    <path
                                        key={conn.id}
                                        d={path}
                                        fill="none"
                                        stroke={conn.color || C.accent}
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                        markerEnd="url(#arrow-head)"
                                    />
                                );
                            })}
                        </svg>

                        {selectionBox && (
                            <div
                                style={{
                                    position: "absolute",
                                    left: Math.min(selectionBox.startX, selectionBox.currentX),
                                    top: Math.min(selectionBox.startY, selectionBox.currentY),
                                    width: Math.abs(selectionBox.currentX - selectionBox.startX),
                                    height: Math.abs(selectionBox.currentY - selectionBox.startY),
                                    background: `${C.accent}1A`,
                                    border: `1px solid ${C.accent}`,
                                    pointerEvents: "none",
                                    zIndex: 55,
                                }}
                            />
                        )}

                        {resizePreview && (
                            <div style={{
                                position: "absolute",
                                right: 16,
                                bottom: 58,
                                background: C.surface,
                                border: `1px solid ${C.borderMid}`,
                                borderRadius: 4,
                                padding: "4px 8px",
                                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                                fontFamily: FONT_LABEL,
                                fontSize: 9,
                                letterSpacing: 1,
                                color: C.textMid,
                                zIndex: 60,
                            }}>
                                W {resizePreview.width}px
                            </div>
                        )}

                        {/* Add block button — bottom center */}
                        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 50 }}>
                            {showPalette && (
                                <div style={{
                                    position: "absolute", bottom: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)",
                                    background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 8,
                                    padding: 8, display: "flex", gap: 4, boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                                }}>
                                    {BLOCK_TYPES.map(({ type, label }) => (
                                        <button key={type} className="palette-item" onClick={() => addBlock(type)}
                                            style={{ width: 72, height: 68, borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: C.textMid }}>
                                            <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{renderBlockTypeIcon(type, C.accent, 16)}</span>
                                            <span style={{ fontFamily: FONT_LABEL, fontSize: 9, letterSpacing: 1 }}>{label.toUpperCase()}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button
                                className="add-btn"
                                onClick={() => setShowPalette(v => !v)}
                                style={{
                                    height: 36, padding: "0 20px", borderRadius: 18, border: `1px solid ${C.borderMid}`,
                                    background: C.panel, color: C.textMid, cursor: "pointer", fontFamily: FONT_LABEL,
                                    fontSize: 10, letterSpacing: 1.5, display: "flex", alignItems: "center", gap: 8,
                                    transition: "all 0.15s", boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                }}>
                                <span style={{ fontSize: 16, fontWeight: 300, lineHeight: 1, marginTop: -1 }}>+</span>
                                ADD BLOCK
                            </button>
                        </div>

                        {/* Zoom badge */}
                        {zoom !== 1 && (
                            <div style={{ position: "absolute", bottom: 24, right: 16, fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 1 }}>
                                {Math.round(zoom * 100)}%
                            </div>
                        )}

                        {minimap && (
                            <div
                                title="Minimap"
                                onMouseDown={jumpFromMinimap}
                                style={{
                                    position: "absolute",
                                    right: 16,
                                    bottom: 56,
                                    width: minimap.mapWidth,
                                    height: minimap.mapHeight,
                                    borderRadius: 8,
                                    border: `1px solid ${C.borderMid}`,
                                    background: "rgba(255,255,255,0.88)",
                                    boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    zIndex: 70,
                                }}
                            >
                                {blocks.map(block => (
                                    <div
                                        key={`mini-${block.id}`}
                                        style={{
                                            position: "absolute",
                                            left: minimap.offsetX + (block.x - minimap.minX) * minimap.scale,
                                            top: minimap.offsetY + (block.y - minimap.minY) * minimap.scale,
                                            width: Math.max(2, block.w * minimap.scale),
                                            height: Math.max(2, getBlockHeight(block) * minimap.scale),
                                            border: `1px solid ${selectedIds.includes(block.id) ? C.accent : `${C.borderMid}`}`,
                                            background: selectedIds.includes(block.id) ? `${C.accent}30` : `${C.border}66`,
                                            borderRadius: 2,
                                        }}
                                    />
                                ))}
                                <div
                                    style={{
                                        position: "absolute",
                                        left: minimap.visibleRect.x,
                                        top: minimap.visibleRect.y,
                                        width: minimap.visibleRect.w,
                                        height: minimap.visibleRect.h,
                                        border: `1px solid ${C.accent}`,
                                        background: `${C.accent}14`,
                                        pointerEvents: "none",
                                    }}
                                />
                            </div>
                        )}

                        {showShortcuts && (
                            <div
                                style={{
                                    position: "absolute",
                                    right: 16,
                                    top: 16,
                                    width: 280,
                                    borderRadius: 10,
                                    border: "1px solid #2a2a2a",
                                    background: "rgba(0,0,0,0.96)",
                                    boxShadow: "0 16px 34px rgba(0,0,0,0.14)",
                                    padding: 12,
                                    zIndex: 80,
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span style={{ fontFamily: FONT_LABEL, fontSize: 10, color: "#f5f5f5", letterSpacing: 1.4 }}>SHORTCUTS</span>
                                    <button
                                        className="tool-btn"
                                        onClick={() => setShowShortcuts(false)}
                                        style={{ width: 22, height: 22, borderRadius: 4, color: "#f5f5f5", fontFamily: FONT_LABEL, fontSize: 12 }}
                                        title="Close"
                                    >
                                        ×
                                    </button>
                                </div>
                                {[
                                    ["?", "Toggle this panel"],
                                    ["N / B", "Open add-block menu"],
                                    ["Touchpad Scroll", "Pan canvas"],
                                    ["Pinch / Ctrl+Scroll", "Zoom at cursor"],
                                    ["G", "Toggle grid snapping"],
                                    ["Select tool + Drag empty space", "Marquee selection"],
                                    ["Pan tool + Drag empty space", "Pan canvas"],
                                    ["Ctrl/Cmd + A", "Select all blocks"],
                                    ["Shift + Click", "Add/remove selection"],
                                    ["Ctrl/Cmd + D", "Duplicate selection"],
                                    ["Delete / Backspace", "Delete selection"],
                                    ["L", "Lock or unlock selection"],
                                    ["C", "Collapse or expand selection"],
                                    ["Space + Drag", "Pan canvas"],
                                    ["Ctrl/Cmd + F", "Fit to screen"],
                                    ["Ctrl/Cmd + 0", "Reset zoom to 100%"],
                                    ["Ctrl/Cmd + +/-", "Zoom in or out"],
                                    ["Ctrl/Cmd + Z", "Undo"],
                                    ["Ctrl/Cmd + Shift + Z / Y", "Redo"],
                                    ["Escape", "Clear selection / close panel"],
                                ].map(([key, action]) => (
                                    <div key={key} style={{ display: "grid", gridTemplateColumns: "112px 1fr", gap: 8, alignItems: "center", padding: "3px 0" }}>
                                        <span style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.accent, letterSpacing: 1 }}>{key}</span>
                                        <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: "#d4d4d4" }}>{action}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right properties panel */}
                    <div style={{ width: 220, background: C.surface, borderLeft: `1px solid ${C.border}`, flexShrink: 0, display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
                            <span style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.text, letterSpacing: 2 }}>PROPERTIES</span>
                        </div>

                        {selectedBlock ? (
                            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                                {/* Type badge */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.accent, letterSpacing: 1, background: C.accentDim, padding: "3px 8px", borderRadius: 3 }}>
                                        {selectedBlock.type.toUpperCase()}
                                    </span>
                                    <span style={{ fontFamily: FONT_LABEL, fontSize: 8, color: C.textMid }}>{selectedBlock.id}</span>
                                </div>

                                <div>
                                    <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textMid, letterSpacing: 1, marginBottom: 6 }}>CONTENT</div>
                                    <input
                                        value={String(selectedBlock.data.title || selectedBlock.data.label || "")}
                                        onChange={e => updateBlock(selectedBlock.id, { data: { ...selectedBlock.data, title: e.target.value } })}
                                        placeholder="Block title"
                                        style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", fontFamily: FONT_SANS, fontSize: 11, color: C.text, outline: "none" }}
                                    />
                                </div>

                                {/* Position */}
                                <div>
                                    <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textMid, letterSpacing: 1, marginBottom: 8 }}>POSITION</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                        <label style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px" }}>
                                            <div style={{ fontFamily: FONT_LABEL, fontSize: 8, color: C.textMid, marginBottom: 2 }}>X</div>
                                            <input
                                                type="number"
                                                value={Math.round(selectedBlock.x)}
                                                onChange={e => updateBlock(selectedBlock.id, { x: Number(e.target.value) || 0 })}
                                                style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.text, background: "none", border: "none", outline: "none", width: "100%" }}
                                            />
                                        </label>
                                        <label style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px" }}>
                                            <div style={{ fontFamily: FONT_LABEL, fontSize: 8, color: C.textMid, marginBottom: 2 }}>Y</div>
                                            <input
                                                type="number"
                                                value={Math.round(selectedBlock.y)}
                                                onChange={e => updateBlock(selectedBlock.id, { y: Number(e.target.value) || 0 })}
                                                style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.text, background: "none", border: "none", outline: "none", width: "100%" }}
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Width */}
                                <div>
                                    <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textMid, letterSpacing: 1, marginBottom: 8 }}>DIMENSIONS</div>
                                    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px" }}>
                                        <div style={{ fontFamily: FONT_LABEL, fontSize: 8, color: C.textMid, marginBottom: 2 }}>W</div>
                                        <input
                                            type="number" value={selectedBlock.w}
                                            onChange={e => updateBlock(selectedBlock.id, { w: +e.target.value })}
                                            disabled={!!selectedBlock.locked || !!selectedBlock.collapsed}
                                            style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.text, background: "none", border: "none", outline: "none", width: "100%" }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textMid, letterSpacing: 1, marginBottom: 8 }}>THEME</div>
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                        {BLOCK_THEMES.map(theme => (
                                            <button
                                                key={theme.id}
                                                onClick={() => setThemeOnSelection(theme.id || "default")}
                                                style={{
                                                    minWidth: 26,
                                                    height: 24,
                                                    borderRadius: 4,
                                                    border: `1px solid ${selectedBlock.theme === theme.id ? C.accent : theme.border}`,
                                                    background: theme.bg,
                                                    cursor: "pointer",
                                                    fontFamily: FONT_LABEL,
                                                    fontSize: 8,
                                                    color: C.textMid,
                                                    padding: "0 6px",
                                                }}
                                                title={theme.label}
                                            >
                                                {theme.label[0]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => toggleCollapseForId(selectedBlock.id)}
                                    style={{ height: 30, borderRadius: 4, border: `1px solid ${C.border}`, background: selectedBlock.collapsed ? C.accentDim : C.panel, color: selectedBlock.collapsed ? C.accent : C.textMid, fontFamily: FONT_LABEL, fontSize: 9, letterSpacing: 1, cursor: "pointer" }}>
                                    {selectedBlock.collapsed ? "EXPAND" : "COLLAPSE"}
                                </button>

                                {/* Lock */}
                                <button
                                    onClick={() => updateBlock(selectedBlock.id, { locked: !selectedBlock.locked })}
                                    style={{ height: 30, borderRadius: 4, border: `1px solid ${C.border}`, background: selectedBlock.locked ? C.accentDim : C.panel, color: selectedBlock.locked ? C.accent : C.textMid, fontFamily: FONT_LABEL, fontSize: 9, letterSpacing: 1, cursor: "pointer" }}>
                                    {selectedBlock.locked ? "PINNED" : "PIN BLOCK"}
                                </button>
                            </div>
                        ) : (
                            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                                <span style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textMid, letterSpacing: 1 }}>EXPERIMENT METADATA</span>
                                <input
                                    value={experimentMeta.title}
                                    onChange={e => setExperimentMeta(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Experiment title"
                                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "7px 8px", fontFamily: FONT_SANS, fontSize: 11, outline: "none", color: C.text, background: C.surface }}
                                />
                                <input
                                    value={experimentMeta.owner || ""}
                                    onChange={e => setExperimentMeta(prev => ({ ...prev, owner: e.target.value }))}
                                    placeholder="Owner initials"
                                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "7px 8px", fontFamily: FONT_SANS, fontSize: 11, outline: "none", color: C.text, background: C.surface }}
                                />
                                <select
                                    value={experimentMeta.status}
                                    onChange={e => setExperimentMeta(prev => ({ ...prev, status: e.target.value }))}
                                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "7px 8px", fontFamily: FONT_SANS, fontSize: 11, outline: "none", color: C.text, background: C.surface }}
                                >
                                    <option value="active">Active</option>
                                    <option value="review">Review</option>
                                    <option value="complete">Complete</option>
                                </select>
                                <textarea
                                    value={experimentMeta.objective || ""}
                                    onChange={e => setExperimentMeta(prev => ({ ...prev, objective: e.target.value }))}
                                    placeholder="Objective / summary"
                                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "7px 8px", fontFamily: FONT_SANS, fontSize: 11, outline: "none", minHeight: 68, resize: "vertical", color: C.text, background: C.surface }}
                                />
                                <input
                                    value={(experimentMeta.tags || []).join(", ")}
                                    onChange={e => setExperimentMeta(prev => ({ ...prev, tags: e.target.value.split(",").map(v => v.trim()).filter(Boolean) }))}
                                    placeholder="Tags (comma separated)"
                                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "7px 8px", fontFamily: FONT_SANS, fontSize: 11, outline: "none", color: C.text, background: C.surface }}
                                />
                                <button
                                    onClick={saveExperimentMetadata}
                                    style={{ height: 30, borderRadius: 4, border: `1px solid ${C.accent}66`, background: C.accentDim, color: C.accent, fontFamily: FONT_LABEL, fontSize: 9, letterSpacing: 1, cursor: "pointer" }}
                                >
                                    SAVE METADATA
                                </button>
                            </div>
                        )}

                        {/* Layers panel */}
                        <div style={{ borderTop: `1px solid ${C.border}`, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
                                <span style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textMid, letterSpacing: 2 }}>LAYERS</span>
                            </div>
                            <div style={{ overflow: "auto", flex: 1 }}>
                                {[...blocks].reverse().map(b => (
                                    <div key={b.id} onClick={() => setSelectedIds([b.id])}
                                        style={{
                                            padding: "7px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                                            background: selectedIds.includes(b.id) ? C.accentGlow : "transparent",
                                            borderLeft: `2px solid ${selectedIds.includes(b.id) ? C.accent : "transparent"}`,
                                            transition: "all 0.1s",
                                        }}>
                                        <span style={{ fontFamily: FONT_LABEL, fontSize: 10, color: C.accent, minWidth: 20 }}>
                                            <span style={{ display: "flex", alignItems: "center" }}>{renderBlockTypeIcon(b.type, C.accent, 12)}</span>
                                        </span>
                                        <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: selectedIds.includes(b.id) ? C.text : C.textMid, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {b.data.label || b.data.text?.slice(0, 22) || b.data.value || b.type}
                                        </span>
                                        <button
                                            className="tool-btn"
                                            title={b.hidden ? "Show layer" : "Hide layer"}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleVisibility(b.id);
                                            }}
                                            style={{ width: 18, height: 18, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMid }}
                                        >
                                            {b.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
                                        </button>
                                        <button
                                            className="tool-btn"
                                            title="Move up"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                moveLayer(b.id, "up");
                                            }}
                                            style={{ width: 16, height: 16, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim }}
                                        >
                                            <ChevronUp size={11} />
                                        </button>
                                        <button
                                            className="tool-btn"
                                            title="Move down"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                moveLayer(b.id, "down");
                                            }}
                                            style={{ width: 16, height: 16, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim }}
                                        >
                                            <ChevronDown size={11} />
                                        </button>
                                        <button
                                            className="tool-btn"
                                            title={b.locked ? "Unlock layer" : "Lock layer"}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleLockForId(b.id);
                                            }}
                                            style={{ width: 18, height: 18, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: b.locked ? C.accent : C.textDim }}
                                        >
                                            {b.locked ? <Lock size={11} /> : <LockOpen size={11} />}
                                        </button>
                                        {b.locked && (
                                            <span style={{ fontFamily: FONT_LABEL, fontSize: 8, color: C.accent, letterSpacing: 1 }}>
                                                PIN
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {showSaveTemplate && (
                    <div
                        onClick={() => setShowSaveTemplate(false)}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.38)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 220,
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{ width: 520, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: "0 24px 56px rgba(0,0,0,0.24)", overflow: "hidden" }}
                        >
                            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
                                <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 1.4, marginBottom: 6 }}>SAVE AS TEMPLATE</div>
                                <div style={{ fontFamily: FONT_SANS, fontSize: 13, color: C.text }}>Create a reusable template from this canvas.</div>
                            </div>
                            <div style={{ padding: 16, display: "grid", gap: 10 }}>
                                <input
                                    value={templateName}
                                    onChange={e => setTemplateName(e.target.value)}
                                    placeholder="Template name"
                                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 10px", fontFamily: FONT_SANS, fontSize: 12, outline: "none" }}
                                />
                                <textarea
                                    value={templateDesc}
                                    onChange={e => setTemplateDesc(e.target.value)}
                                    placeholder="Template description"
                                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 10px", fontFamily: FONT_SANS, fontSize: 12, minHeight: 74, resize: "vertical", outline: "none" }}
                                />
                                <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT_SANS, fontSize: 11, color: C.textMid }}>
                                    <input
                                        type="checkbox"
                                        checked={saveSelectionOnly}
                                        onChange={e => setSaveSelectionOnly(e.target.checked)}
                                        disabled={selectedIds.length === 0}
                                    />
                                    Save only selected blocks ({selectedIds.length || 0})
                                </label>
                            </div>
                            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                <button className="tool-btn" onClick={() => setShowSaveTemplate(false)} style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "7px 10px", fontFamily: FONT_LABEL, fontSize: 9, color: C.textMid }}>CANCEL</button>
                                <button className="tool-btn" onClick={saveAsTemplate} style={{ border: `1px solid ${C.accent}66`, borderRadius: 4, padding: "7px 12px", fontFamily: FONT_LABEL, fontSize: 9, color: C.accent, background: C.accentDim }}>SAVE TEMPLATE</button>
                            </div>
                        </div>
                    </div>
                )}

                {showSavedModal && (
                    <div
                        onClick={() => setShowSavedModal(false)}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.28)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 230,
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: 360,
                                background: C.surface,
                                border: `1px solid ${C.border}`,
                                borderRadius: 8,
                                boxShadow: "0 18px 42px rgba(0,0,0,0.2)",
                                padding: "18px 20px",
                                textAlign: "center",
                            }}
                        >
                            <div style={{ fontFamily: FONT_LABEL, fontSize: 10, color: C.accent, letterSpacing: 1.2, marginBottom: 8 }}>SAVED</div>
                            <div style={{ fontFamily: FONT_SANS, fontSize: 13, color: C.text, marginBottom: 14 }}>Your experiment canvas has been saved.</div>
                            <button
                                className="tool-btn"
                                onClick={() => setShowSavedModal(false)}
                                style={{ border: `1px solid ${C.accent}66`, borderRadius: 4, padding: "7px 12px", fontFamily: FONT_LABEL, fontSize: 9, color: C.accent, background: C.accentDim }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )}

                {showShareModal && (
                    <div
                        onClick={() => setShowShareModal(false)}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.32)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 235,
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: 460,
                                background: C.surface,
                                border: `1px solid ${C.border}`,
                                borderRadius: 8,
                                boxShadow: "0 20px 46px rgba(0,0,0,0.2)",
                                overflow: "hidden",
                            }}
                        >
                            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
                                <div style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 1.2, marginBottom: 6 }}>SHARE EXPERIMENT</div>
                                <div style={{ fontFamily: FONT_SANS, fontSize: 13, color: C.text }}>Generate a public link for collaborators.</div>
                            </div>

                            <div style={{ padding: 16, display: "grid", gap: 10 }}>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                        className="tool-btn"
                                        onClick={() => setSharePermission("read")}
                                        style={{
                                            border: `1px solid ${sharePermission === "read" ? C.accent : C.border}`,
                                            borderRadius: 4,
                                            padding: "7px 10px",
                                            fontFamily: FONT_LABEL,
                                            fontSize: 9,
                                            letterSpacing: 1,
                                            color: sharePermission === "read" ? C.accent : C.textMid,
                                            background: sharePermission === "read" ? C.accentDim : C.surface,
                                        }}
                                    >
                                        READ-ONLY
                                    </button>
                                    <button
                                        className="tool-btn"
                                        onClick={() => setSharePermission("comment")}
                                        style={{
                                            border: `1px solid ${sharePermission === "comment" ? C.accent : C.border}`,
                                            borderRadius: 4,
                                            padding: "7px 10px",
                                            fontFamily: FONT_LABEL,
                                            fontSize: 9,
                                            letterSpacing: 1,
                                            color: sharePermission === "comment" ? C.accent : C.textMid,
                                            background: sharePermission === "comment" ? C.accentDim : C.surface,
                                        }}
                                    >
                                        READ + COMMENT
                                    </button>
                                </div>

                                <button
                                    className="tool-btn"
                                    onClick={generateShareLink}
                                    style={{
                                        border: `1px solid ${C.accent}66`,
                                        borderRadius: 4,
                                        padding: "8px 10px",
                                        fontFamily: FONT_LABEL,
                                        fontSize: 9,
                                        letterSpacing: 1,
                                        color: C.accent,
                                        background: C.accentDim,
                                    }}
                                >
                                    GENERATE LINK
                                </button>

                                {latestShareLink && (
                                    <>
                                        <input
                                            readOnly
                                            value={latestShareLink}
                                            style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 10px", fontFamily: FONT_SANS, fontSize: 11, color: C.text, background: C.surface }}
                                        />
                                        <button
                                            className="tool-btn"
                                            onClick={copyShareLink}
                                            style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 10px", fontFamily: FONT_LABEL, fontSize: 9, color: C.textMid }}
                                        >
                                            COPY LINK
                                        </button>
                                    </>
                                )}
                            </div>

                            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end" }}>
                                <button
                                    className="tool-btn"
                                    onClick={() => setShowShareModal(false)}
                                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "7px 10px", fontFamily: FONT_LABEL, fontSize: 9, color: C.textMid }}
                                >
                                    CLOSE
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Bottom status bar ─────────────────────────────────── */}
                <div style={{
                    height: 26, background: C.surface, borderTop: `1px solid ${C.border}`,
                    display: "flex", alignItems: "center", padding: "0 14px", gap: 20, flexShrink: 0,
                }}>
                    {[
                        ["canvas", "infinite"],
                        ["grid", snapToGrid ? "snap 8px" : "free"],
                        ["updated", experimentMeta.updated || "Not saved"],
                        ["autosave", autosaveState === "saving" ? "saving..." : autosaveState === "saved" ? "saved" : autosaveState === "error" ? "error" : "idle"],
                    ].map(([k, v]) => (
                        <span key={k} style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 1 }}>
                            {k.toUpperCase()} <span style={{ color: C.textMid }}>{v}</span>
                        </span>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button
                        onClick={() => setSnapToGrid(v => !v)}
                        style={{
                            background: snapToGrid ? C.accentDim : C.panel,
                            border: `1px solid ${snapToGrid ? C.accent : C.borderMid}`,
                            borderRadius: 4,
                            height: 20,
                            padding: "0 8px",
                            cursor: "pointer",
                            fontFamily: FONT_LABEL,
                            fontSize: 9,
                            letterSpacing: 1,
                            color: snapToGrid ? C.accent : C.textMid,
                        }}
                        title="Toggle grid snapping"
                    >
                        SNAP {snapToGrid ? "ON" : "OFF"}
                    </button>
                    <button
                        onClick={() => setShowShortcuts(v => !v)}
                        style={{
                            background: showShortcuts ? C.accentDim : C.panel,
                            border: `1px solid ${showShortcuts ? C.accent : C.borderMid}`,
                            borderRadius: 4,
                            height: 20,
                            padding: "0 8px",
                            cursor: "pointer",
                            fontFamily: FONT_LABEL,
                            fontSize: 9,
                            letterSpacing: 1,
                            color: showShortcuts ? C.accent : C.textMid,
                        }}
                        title="Toggle keyboard shortcuts"
                    >
                        SHORTCUTS ?
                    </button>
                    <span style={{ fontFamily: FONT_LABEL, fontSize: 9, color: C.textDim, letterSpacing: 1 }}>
                        {blocks.length} OBJECTS · {selectedIds.length} SELECTED · {Math.round(zoom * 100)}%
                    </span>
                </div>
            </div>
        </>
    );
}