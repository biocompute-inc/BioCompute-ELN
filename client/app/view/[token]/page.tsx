"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { T, mono } from "../../../theme";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

type SharedBlockPreview = {
    id?: string;
    type?: string;
    data?: SharedBlockData;
};

type SharedBlockData = {
    title?: string;
    label?: string;
    text?: string;
    tags?: string[];
    src?: string;
    annotations?: string[];
    columns?: string[];
    rows?: Array<string[] | Record<string, unknown>>;
    steps?: Array<{ id?: string; text?: string } | string>;
};

type SharedComment = {
    id: string;
    author: string;
    text: string;
    created_at: string;
    resolved: boolean;
};

type SharedRecordResponse = {
    token: string;
    project_id: string;
    title: string;
    shared_by?: string | null;
    permission_level: "read" | "comment";
    created_at: string;
    blocks: SharedBlockPreview[];
    comments: SharedComment[];
};

const REPORT_ACCENT = T.amber;
const REPORT_HIGHLIGHT = T.amberL;
const BLOCK_TITLE_FONT_SIZE = 20;
const BLOCK_CONTENT_FONT_SIZE = BLOCK_TITLE_FONT_SIZE - 4;
const BLOCK_META_FONT_SIZE = 12;

const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
        return dateString;
    }
};

const protocolStepFromLine = (line: string) => line.replace(/^(\d+[.)\s-]+|[-*•]\s*)/, "").trim();

const protocolStepsFromText = (value: string) => {
    return value
        .split(/\r?\n/)
        .map(protocolStepFromLine)
        .filter(Boolean);
};

const asText = (value: unknown) => (typeof value === "string" ? value : "");

const asStringList = (value: unknown) => {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => asText(entry).trim())
        .filter(Boolean);
};

const asDataTableRows = (value: unknown, columns: string[]) => {
    if (!Array.isArray(value)) return [] as string[][];

    return value.map((row) => {
        if (Array.isArray(row)) {
            return row.map((cell) => String(cell ?? ""));
        }

        if (row && typeof row === "object") {
            const record = row as Record<string, unknown>;
            if (columns.length > 0) {
                return columns.map((col) => String(record[col] ?? ""));
            }
            return Object.values(record).map((cell) => String(cell ?? ""));
        }

        return [String(row ?? "")];
    });
};

const asMeasurementRows = (value: unknown) => {
    if (!Array.isArray(value)) return [] as Array<{ key: string; value: string; unit: string }>;

    return value
        .map((row) => {
            if (!row || typeof row !== "object" || Array.isArray(row)) return null;
            const record = row as Record<string, unknown>;
            return {
                key: asText(record.key),
                value: asText(record.value),
                unit: asText(record.unit),
            };
        })
        .filter((row): row is { key: string; value: string; unit: string } => {
            return !!row && !!(row.key || row.value || row.unit);
        });
};

function SharedBlockBody({ preview, headingText }: { preview: SharedBlockPreview; headingText: string }) {
    const data = preview.data || {};
    const blockType = asText(preview.type).toLowerCase();
    const text = asText(data.text).trim();

    if (blockType === "datatable" || blockType === "table") {
        const columns = asStringList(data.columns);
        const rows = asDataTableRows(data.rows, columns);
        const inferredColumnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
        const tableColumns = columns.length > 0
            ? columns
            : Array.from({ length: inferredColumnCount }, (_, idx) => `Col ${idx + 1}`);

        if (tableColumns.length === 0 || rows.length === 0) {
            return <div style={{ ...mono, fontSize: BLOCK_CONTENT_FONT_SIZE - 2, color: T.textLight }}>No table data available.</div>;
        }

        return (
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", background: T.surface }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: BLOCK_CONTENT_FONT_SIZE - 1, minWidth: Math.max(360, tableColumns.length * 120) }}>
                        <thead>
                            <tr>
                                {tableColumns.map((column, idx) => (
                                    <th
                                        key={`col-${idx}`}
                                        style={{
                                            textAlign: "left",
                                            padding: "8px 10px",
                                            background: REPORT_HIGHLIGHT,
                                            borderBottom: `1px solid ${T.border}`,
                                            color: T.text,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {column || `Col ${idx + 1}`}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rowIdx) => (
                                <tr key={`row-${rowIdx}`}>
                                    {tableColumns.map((_, colIdx) => (
                                        <td
                                            key={`cell-${rowIdx}-${colIdx}`}
                                            style={{
                                                padding: "7px 10px",
                                                borderBottom: rowIdx < rows.length - 1 ? `1px solid ${T.border}` : "none",
                                                color: T.text,
                                            }}
                                        >
                                            {row[colIdx] || "-"}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (blockType === "tag" || blockType === "tags") {
        const directTags = asStringList(data.tags);
        const parsedTags = directTags.length > 0
            ? directTags
            : text.split(",").map((tag) => tag.trim()).filter(Boolean);

        if (parsedTags.length === 0) {
            return <div style={{ ...mono, fontSize: BLOCK_CONTENT_FONT_SIZE - 2, color: T.textLight }}>No tags attached.</div>;
        }

        return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {parsedTags.map((tag, idx) => (
                    <span
                        key={`tag-${idx}-${tag}`}
                        style={{
                            ...mono,
                            fontSize: BLOCK_CONTENT_FONT_SIZE - 1,
                            color: T.text,
                            border: `1px solid ${REPORT_ACCENT}`,
                            background: REPORT_HIGHLIGHT,
                            borderRadius: 999,
                            padding: "4px 10px",
                        }}
                    >
                        {tag}
                    </span>
                ))}
            </div>
        );
    }

    if (blockType === "image") {
        const src = asText(data.src).trim();
        const annotations = asStringList(data.annotations);

        return (
            <div style={{ display: "grid", gap: 10 }}>
                <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", background: T.bg, minHeight: 200 }}>
                    {src ? (
                        <Image
                            src={src}
                            alt={asText(data.title) || "Shared image"}
                            width={1200}
                            height={800}
                            unoptimized
                            style={{ width: "100%", height: 240, objectFit: "contain", display: "block", background: T.bg }}
                        />
                    ) : (
                        <div style={{ ...mono, fontSize: 11, color: T.textLight, minHeight: 200, display: "grid", placeItems: "center" }}>
                            No image source provided.
                        </div>
                    )}
                </div>
                {annotations.length > 0 && (
                    <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ ...mono, fontSize: BLOCK_META_FONT_SIZE, color: T.textLight, letterSpacing: 0.8, textTransform: "uppercase" }}>Annotations</div>
                        {annotations.map((note, idx) => (
                            <div key={`img-note-${idx}`} style={{ ...mono, fontSize: BLOCK_CONTENT_FONT_SIZE - 1, color: T.text, borderLeft: `2px solid ${REPORT_ACCENT}`, paddingLeft: 8 }}>
                                {note}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (blockType === "protocol") {
        const rawSteps = Array.isArray(data.steps) ? data.steps : [];
        const fromArray = rawSteps
            .map((step) => (typeof step === "string" ? step : asText(step?.text)))
            .map((step) => protocolStepFromLine(step))
            .filter(Boolean);
        const steps = fromArray.length > 0 ? fromArray : protocolStepsFromText(text);

        if (steps.length > 0) {
            return (
                <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: 10 }}>
                    {steps.map((step, idx) => (
                        <li key={`step-${idx}`} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <div style={{ ...mono, fontSize: BLOCK_META_FONT_SIZE, color: T.text, border: `1px solid ${REPORT_ACCENT}`, background: REPORT_HIGHLIGHT, borderRadius: 999, minWidth: 26, height: 26, display: "grid", placeItems: "center", fontWeight: 700 }}>
                                {idx + 1}
                            </div>
                            <div style={{ ...mono, fontSize: BLOCK_CONTENT_FONT_SIZE, color: T.text, lineHeight: 1.6, paddingTop: 2 }}>
                                {step}
                            </div>
                        </li>
                    ))}
                </ol>
            );
        }
    }

    if (blockType === "measurement") {
        const rows = asMeasurementRows(data.rows);
        if (rows.length > 0) {
            return (
                <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr", ...mono, fontSize: BLOCK_CONTENT_FONT_SIZE - 2, color: T.text, background: REPORT_HIGHLIGHT, borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ padding: "7px 9px" }}>Metric</div>
                        <div style={{ padding: "7px 9px" }}>Value</div>
                        <div style={{ padding: "7px 9px" }}>Unit</div>
                    </div>
                    {rows.map((row, idx) => (
                        <div key={`measure-${idx}`} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr", ...mono, fontSize: BLOCK_CONTENT_FONT_SIZE - 1, color: T.text, borderBottom: idx < rows.length - 1 ? `1px solid ${T.border}` : "none" }}>
                            <div style={{ padding: "7px 9px" }}>{row.key || "-"}</div>
                            <div style={{ padding: "7px 9px" }}>{row.value || "-"}</div>
                            <div style={{ padding: "7px 9px" }}>{row.unit || "-"}</div>
                        </div>
                    ))}
                </div>
            );
        }
    }

    if (text && text !== headingText) {
        return (
            <div style={{ ...mono, fontSize: BLOCK_CONTENT_FONT_SIZE, color: T.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {text}
            </div>
        );
    }

    return <div style={{ ...mono, fontSize: BLOCK_CONTENT_FONT_SIZE - 2, color: T.textLight }}>No preview data for this block type.</div>;
}

export default function SharedViewPage() {
    const params = useParams<{ token?: string }>();
    const token = useMemo(() => {
        const raw = params?.token;
        if (!raw) return "";
        try {
            return decodeURIComponent(raw);
        } catch {
            return raw;
        }
    }, [params?.token]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [record, setRecord] = useState<SharedRecordResponse | null>(null);
    const [author, setAuthor] = useState("");
    const [text, setText] = useState("");

    const fetchRecord = useMemo(() => async () => {
        if (!token) {
            setError("Invalid or expired share link.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/share/${encodeURIComponent(token)}`);
            if (!response.ok) {
                const message = response.status === 404 ? "Invalid or expired share link." : "Could not load shared experiment.";
                throw new Error(message);
            }
            const payload = await response.json() as SharedRecordResponse;
            setRecord(payload);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Could not load shared experiment.";
            setError(message);
            setRecord(null);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchRecord();
    }, [fetchRecord]);

    const addComment = async () => {
        const cleanAuthor = author.trim();
        const cleanText = text.trim();
        if (!cleanAuthor || !cleanText) return;

        try {
            const response = await fetch(`${API_BASE}/share/${encodeURIComponent(token)}/comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    author: cleanAuthor,
                    text: cleanText,
                }),
            });

            if (!response.ok) {
                throw new Error("Could not submit comment.");
            }

            setText("");
            setAuthor("");
            await fetchRecord();
        } catch {
            setError("Could not submit comment.");
        }
    };

    if (typeof window === "undefined") {
        return (
            <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: T.bg }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "32px 40px", boxShadow: `0 2px 8px rgba(0,0,0,0.08)` }}>
                    <div style={{ ...mono, fontSize: 13, color: T.text, letterSpacing: 0.3 }}>LOADING DOCUMENT...</div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: T.bg }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "32px 40px", boxShadow: `0 2px 8px rgba(0,0,0,0.08)` }}>
                    <div style={{ ...mono, fontSize: 13, color: T.text, letterSpacing: 0.3 }}>LOADING DOCUMENT...</div>
                </div>
            </div>
        );
    }

    if (error || !record) {
        return (
            <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: T.bg, padding: 24 }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "32px 40px", boxShadow: `0 2px 8px rgba(0,0,0,0.08)`, maxWidth: 400 }}>
                    <div style={{ ...mono, fontSize: 12, color: T.text, lineHeight: 1.6 }}>{error || "Invalid or expired share link."}</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", background: T.bg }}>
            {/* Top Navigation Bar */}
            <header style={{ minHeight: 84, borderBottom: `2px solid ${T.border}`, background: T.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div>
                    <div style={{ ...mono, fontSize: 11, color: T.textLight, letterSpacing: 1.2, marginBottom: 8 }}>SHARED LABORATORY REPORT</div>
                    <div style={{ ...mono, fontSize: 18, fontWeight: 700, color: T.text, background: REPORT_HIGHLIGHT, border: `1px solid ${REPORT_ACCENT}`, borderRadius: 6, padding: "6px 10px", display: "inline-block", lineHeight: 1.2 }}>
                        {record.title}
                    </div>
                    <div style={{ ...mono, fontSize: 10, color: T.textLight, marginTop: 4 }}>
                        Shared by {record.shared_by?.trim() ? record.shared_by : "Unknown Researcher"}
                    </div>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ ...mono, fontSize: 10, color: T.textLight, letterSpacing: 0.5 }}>Access Level</div>
                        <div style={{ ...mono, fontSize: 12, color: REPORT_ACCENT, fontWeight: 600 }}>
                            {record.permission_level === "comment" ? "READ + COMMENT" : "READ-ONLY"}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Document Container */}
            <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px", display: "grid", gridTemplateColumns: "1fr 360px", gap: 32 }}>
                {/* Report Content */}
                <article style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 40, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", position: "relative" }}>
                    {/* Document Header */}
                    <div style={{ paddingBottom: 32, borderBottom: `2px solid ${T.border}`, marginBottom: 32 }}>
                        <h1 style={{ ...mono, fontSize: 28, fontWeight: 700, color: T.text, margin: "0 0 16px", lineHeight: 1.2, background: REPORT_HIGHLIGHT, border: `1px solid ${REPORT_ACCENT}`, borderRadius: 8, display: "inline-block", padding: "8px 14px" }}>
                            {record.title}
                        </h1>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
                            <div>
                                <div style={{ ...mono, fontSize: 10, color: T.textLight, letterSpacing: 0.5, marginBottom: 6 }}>DOCUMENT ID</div>
                                <div style={{ ...mono, fontSize: 12, color: T.text }}>{record.project_id}</div>
                            </div>
                            <div>
                                <div style={{ ...mono, fontSize: 10, color: T.textLight, letterSpacing: 0.5, marginBottom: 6 }}>SHARED BY</div>
                                <div style={{ ...mono, fontSize: 12, color: T.text }}>{record.shared_by?.trim() ? record.shared_by : "Unknown Researcher"}</div>
                            </div>
                            <div>
                                <div style={{ ...mono, fontSize: 10, color: T.textLight, letterSpacing: 0.5, marginBottom: 6 }}>CREATED</div>
                                <div style={{ ...mono, fontSize: 12, color: T.text }}>{formatDate(record.created_at)}</div>
                            </div>
                            <div>
                                <div style={{ ...mono, fontSize: 10, color: T.textLight, letterSpacing: 0.5, marginBottom: 6 }}>PERMISSION</div>
                                <div style={{ ...mono, fontSize: 12, color: T.text }}>
                                    {record.permission_level === "comment" ? "Collaborative" : "Read-Only"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Sections */}
                    <div style={{ display: "grid", gap: 32 }}>
                        {record.blocks.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px 20px", color: T.textLight }}>
                                <div style={{ ...mono, fontSize: 12, letterSpacing: 0.3 }}>No content sections available.</div>
                            </div>
                        ) : (
                            record.blocks.map((block, idx: number) => {
                                const preview = block as SharedBlockPreview;
                                const sectionNum = idx + 1;
                                const blockType = String(preview.type || "Block").toUpperCase();
                                const blockTitle = String(preview.data?.title || preview.data?.label || preview.data?.text || "Block content");
                                return (
                                    <section key={`${preview.id || idx}`} style={{ borderLeft: `4px solid ${REPORT_ACCENT}`, paddingLeft: 20, paddingBottom: 8 }}>
                                        <div style={{ ...mono, fontSize: BLOCK_META_FONT_SIZE, color: T.textLight, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                                            {blockType} · Section {sectionNum}
                                        </div>
                                        <h3 style={{ ...mono, fontSize: BLOCK_TITLE_FONT_SIZE, fontWeight: 700, color: T.text, margin: "0 0 8px", lineHeight: 1.35, background: REPORT_HIGHLIGHT, border: `1px solid ${REPORT_ACCENT}`, borderRadius: 6, display: "inline-block", padding: "6px 10px" }}>
                                            {blockTitle}
                                        </h3>
                                        <div style={{ marginTop: 8 }}>
                                            <SharedBlockBody preview={preview} headingText={blockTitle} />
                                        </div>
                                    </section>
                                );
                            })
                        )}
                    </div>
                </article>

                {/* Sidebar - Comments Section */}
                <aside style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ marginBottom: 8, paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ ...mono, fontSize: 11, color: T.textLight, letterSpacing: 1, fontWeight: 600 }}>COMMENTS</div>
                        <div style={{ ...mono, fontSize: 10, color: T.textLight, marginTop: 4 }}>{record.comments.length} comment{record.comments.length !== 1 ? "s" : ""} · Discussion Mode</div>
                    </div>

                    {/* Comments List */}
                    <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
                        {record.comments.length === 0 ? (
                            <div style={{ ...mono, fontSize: 11, color: T.textLight, fontStyle: "italic", padding: "16px 0", textAlign: "center" }}>
                                No comments yet. Be the first to review.
                            </div>
                        ) : (
                            record.comments.map(comment => (
                                <div
                                    key={comment.id}
                                    style={{
                                        border: `1px solid ${T.border}`,
                                        borderRadius: 8,
                                        padding: 12,
                                        background: comment.resolved ? "rgba(0,0,0,0.02)" : T.surface,
                                        opacity: comment.resolved ? 0.7 : 1,
                                        transition: "all 0.2s",
                                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                                        borderLeft: `3px solid ${comment.resolved ? T.textLight : REPORT_ACCENT}`,
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 10 }}>
                                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: REPORT_HIGHLIGHT, border: `1px solid ${REPORT_ACCENT}`, color: T.text, ...mono, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                {(comment.author || "U").trim().charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: T.text }}>{comment.author}</div>
                                                <div style={{ ...mono, fontSize: 9, color: T.textLight }}>{formatDate(comment.created_at)}</div>
                                            </div>
                                        </div>
                                        {comment.resolved && (
                                            <span style={{ ...mono, fontSize: 9, color: T.textLight, border: `1px solid ${T.border}`, borderRadius: 999, padding: "2px 6px" }}>
                                                Resolved
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ ...mono, fontSize: 11, color: T.textMid, lineHeight: 1.5 }}>{comment.text}</div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Comment Form */}
                    {record.permission_level === "comment" && (
                        <div style={{ display: "grid", gap: 10, paddingTop: 14, borderTop: `1px solid ${T.border}`, background: "rgba(255,255,255,0.7)", borderRadius: 8 }}>
                            <div style={{ ...mono, fontSize: 10, color: T.textLight, letterSpacing: 0.6, textTransform: "uppercase", padding: "0 2px" }}>
                                Add comment
                            </div>
                            <input
                                value={author}
                                onChange={e => setAuthor(e.target.value)}
                                placeholder="Your Name"
                                style={{
                                    ...mono,
                                    fontSize: 11,
                                    border: `1px solid ${T.border}`,
                                    borderRadius: 6,
                                    padding: "10px 12px",
                                    outline: "none",
                                    color: T.text,
                                    background: T.surface,
                                    transition: "border-color 0.2s",
                                }}
                                onFocus={e => (e.target.style.borderColor = REPORT_ACCENT)}
                                onBlur={e => (e.target.style.borderColor = T.border)}
                            />
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="Add your comment..."
                                style={{
                                    ...mono,
                                    fontSize: 11,
                                    border: `1px solid ${T.border}`,
                                    borderRadius: 6,
                                    padding: "10px 12px",
                                    outline: "none",
                                    color: T.text,
                                    background: T.surface,
                                    minHeight: 80,
                                    resize: "vertical",
                                    fontFamily: "inherit",
                                    transition: "border-color 0.2s",
                                }}
                                onFocus={e => (e.target.style.borderColor = REPORT_ACCENT)}
                                onBlur={e => (e.target.style.borderColor = T.border)}
                            />
                            <button
                                onClick={addComment}
                                disabled={!author.trim() || !text.trim()}
                                style={{
                                    ...mono,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    border: "none",
                                    borderRadius: 6,
                                    background: author.trim() && text.trim() ? T.sidebar : T.textLight,
                                    color: "#fff",
                                    padding: "10px 12px",
                                    cursor: author.trim() && text.trim() ? "pointer" : "not-allowed",
                                    transition: "all 0.2s",
                                    letterSpacing: 0.5,
                                }}
                                onMouseEnter={e => {
                                    if (author.trim() && text.trim()) {
                                        e.currentTarget.style.opacity = "0.9";
                                    }
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.opacity = "1";
                                }}
                            >
                                SUBMIT COMMENT
                            </button>
                        </div>
                    )}
                </aside>
            </main>
        </div>
    );
}