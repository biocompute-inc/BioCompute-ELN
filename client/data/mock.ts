import { T } from "../theme";

export const SESSION_EXPERIMENTS_KEY = "biocompute.experiments";
export const SESSION_CANVASES_KEY = "biocompute.canvasById";
export const SESSION_TEMPLATES_KEY = "biocompute.templates";
export const SESSION_TEMPLATE_BLOCKS_KEY = "biocompute.templateBlocks";
export const TEMPLATES_CHANGED_EVENT = "biocompute:templates-changed";

export function getScopedSessionKey(baseKey: string, userId?: string | null) {
    if (!userId) return `${baseKey}:guest`;
    return `${baseKey}:${userId}`;
}

type BlockColor = { fg: string; bg: string; bar: string };
type BlockMeta = { label: string; icon: string };

export const BLOCK_COLORS: Record<string, BlockColor> = {
    text: { fg: T.text, bg: "#FAFAF8", bar: T.text },
    protocol: { fg: T.green, bg: T.greenL, bar: T.green },
    observation: { fg: T.blue, bg: T.blueL, bar: T.blue },
    measurement: { fg: T.purple, bg: T.purpleL, bar: T.purple },
    image: { fg: T.amber, bg: T.amberL, bar: T.amber },
    table: { fg: "#1A3A4A", bg: "#EAF2F5", bar: "#1A3A4A" },
    tag: { fg: "#444", bg: "#F0F0EE", bar: "#888" },
};

export const BTYPE_META: Record<string, BlockMeta> = {
    text: { label: "Note", icon: "¶" },
    protocol: { label: "Protocol", icon: "›" },
    observation: { label: "Observation", icon: "◎" },
    measurement: { label: "Measurement", icon: "#" },
    image: { label: "Image/Gel", icon: "⬚" },
    table: { label: "Data Table", icon: "⊞" },
    tag: { label: "Tags", icon: "◈" },
};

export const EXPERIMENTS = [
    { id: "exp-1", title: "PCR Optimization — Round 3", tag: "PCR", status: "active", updated: "Today, 11:42 AM", blocks: 5, collaborators: ["SR", "MT"] },
    { id: "exp-2", title: "Western Blot — p53 Antibody Titration", tag: "Western", status: "review", updated: "Yesterday", blocks: 8, collaborators: ["SR"] },
    { id: "exp-3", title: "CRISPR Screen — BRCA1 Guide RNA Library", tag: "CRISPR", status: "complete", updated: "Mar 12", blocks: 12, collaborators: ["SR", "AB", "MT"] },
    { id: "exp-4", title: "Cell Culture — HEK293T Passage 24", tag: "Culture", status: "active", updated: "Today, 09:15 AM", blocks: 3, collaborators: ["SR"] },
];

export type ExperimentTemplate = {
    id: string;
    name: string;
    icon: string;
    color: string;
    desc: string;
    blocks: number;
    preview?: string;
    source?: "base" | "custom";
    createdAt?: string;
};

export const TEMPLATES: ExperimentTemplate[] = [
    { id: "tpl-note", name: "Note Starter", icon: "note", color: "#2A5C6B", desc: "Example note-first canvas with a hypothesis block", blocks: 1 },
    { id: "tpl-protocol", name: "Protocol Starter", icon: "protocol", color: T.green, desc: "Example protocol with pre-filled steps", blocks: 1 },
    { id: "tpl-result", name: "Result Starter", icon: "result", color: T.blue, desc: "Example result block with summary and metrics", blocks: 1 },
    { id: "tpl-image", name: "Image Starter", icon: "image", color: T.amber, desc: "Example image documentation block", blocks: 1 },
    { id: "tpl-template", name: "Template Reference", icon: "template", color: T.purple, desc: "Example reusable SOP/template reference", blocks: 1 },
];

export type CanvasTemplateBlock = {
    id: string;
    type: "note" | "protocol" | "result" | "image" | "template";
    x: number;
    y: number;
    w: number;
    data: Record<string, unknown>;
    locked?: boolean;
};

export const TEMPLATE_BLOCKS: Record<string, CanvasTemplateBlock[]> = {
    "tpl-note": [
        {
            id: "b1",
            type: "note",
            x: 120,
            y: 120,
            w: 320,
            data: {
                title: "Hypothesis",
                text: "Example: Increased incubation time is expected to improve signal clarity.",
            },
        },
    ],
    "tpl-protocol": [
        {
            id: "b1",
            type: "protocol",
            x: 120,
            y: 120,
            w: 360,
            data: {
                title: "Protocol Draft",
                steps: [
                    { id: "s1", text: "Prepare samples and label tubes." },
                    { id: "s2", text: "Run incubation for 30 minutes." },
                    { id: "s3", text: "Capture measurements and record observations." },
                ],
            },
        },
    ],
    "tpl-result": [
        {
            id: "b1",
            type: "result",
            x: 120,
            y: 120,
            w: 400,
            data: {
                title: "Initial Results",
                text: "Example: trial B outperformed baseline under the same temperature range.",
                metrics: [
                    { key: "p-value", value: "0.021" },
                    { key: "confidence", value: "95%" },
                ],
            },
        },
    ],
    "tpl-image": [
        {
            id: "b1",
            type: "image",
            x: 120,
            y: 120,
            w: 360,
            data: {
                label: "Image",
                title: "Microscopy Snapshot",
                src: "",
            },
        },
    ],
    "tpl-template": [
        {
            id: "b1",
            type: "template",
            x: 120,
            y: 120,
            w: 360,
            data: {
                title: "SOP Reference",
                templateName: "Cell Culture SOP v2",
                fields: [{ name: "Cell line" }, { name: "Media" }, { name: "Incubation time" }],
            },
        },
    ],
};

function safeParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export function readTemplatesFromSession(): ExperimentTemplate[] {
    if (typeof window === "undefined") return TEMPLATES;

    const custom = safeParse<ExperimentTemplate[]>(sessionStorage.getItem(SESSION_TEMPLATES_KEY), []);
    const normalized = custom.map(item => ({ ...item, source: "custom" as const }));
    return [...normalized, ...TEMPLATES.map(item => ({ ...item, source: "base" as const }))];
}

export function readTemplateBlocksMap(): Record<string, CanvasTemplateBlock[]> {
    if (typeof window === "undefined") return TEMPLATE_BLOCKS;
    const custom = safeParse<Record<string, CanvasTemplateBlock[]>>(sessionStorage.getItem(SESSION_TEMPLATE_BLOCKS_KEY), {});
    return { ...TEMPLATE_BLOCKS, ...custom };
}

export function writeCustomTemplatesToSession(
    customTemplates: ExperimentTemplate[],
    customTemplateBlocks: Record<string, CanvasTemplateBlock[]>
) {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(SESSION_TEMPLATES_KEY, JSON.stringify(customTemplates));
    sessionStorage.setItem(SESSION_TEMPLATE_BLOCKS_KEY, JSON.stringify(customTemplateBlocks));
    window.dispatchEvent(new Event(TEMPLATES_CHANGED_EVENT));
}

export const CANVAS_BLOCKS = [
    { id: "b1", type: "text", x: 48, y: 60, w: 310, content: "PCR Optimization — Round 3\n\nTrying lower annealing temp (58→54°C) after yesterday's faint bands. Also reducing extension time to 30s." },
    { id: "b2", type: "protocol", x: 400, y: 48, w: 300, steps: [{ id: 1, text: "Prepare master mix (25µL total)", done: true }, { id: 2, text: "Add 1µL template DNA (12.4 ng/µL)", done: true }, { id: 3, text: "Run gradient PCR: 52–58°C annealing", done: false }, { id: 4, text: "Run 1.5% agarose gel, 120V 25min", done: false }] },
    { id: "b3", type: "measurement", x: 48, y: 290, w: 260, rows: [{ id: 1, key: "Template DNA", value: "12.4", unit: "ng/µL" }, { id: 2, key: "Primer F", value: "10", unit: "µM" }, { id: 3, key: "Primer R", value: "10", unit: "µM" }, { id: 4, key: "MgCl₂", value: "2.5", unit: "mM" }] },
    { id: "b4", type: "observation", x: 358, y: 290, w: 300, certainty: "high", content: "54°C lane shows strong single band ~800bp. 52°C has non-specific bands ~400bp. Will proceed with 54°C." },
    { id: "b5", type: "tag", x: 706, y: 48, w: 180, tags: ["PCR", "primer-optimization", "round-3", "agarose-gel"] },
];