"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { T, mono } from "../../../theme";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

type SharedBlockPreview = {
    id?: string;
    type?: string;
    data?: {
        title?: string;
        label?: string;
        text?: string;
    };
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
    permission_level: "read" | "comment";
    created_at: string;
    blocks: SharedBlockPreview[];
    comments: SharedComment[];
};

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

    if (typeof window === "undefined") {
        return (
            <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: T.bg }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "20px 22px" }}>
                    <div style={{ ...mono, fontSize: 12, color: T.text }}>Loading shared link...</div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: T.bg }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "20px 22px" }}>
                    <div style={{ ...mono, fontSize: 12, color: T.text }}>Loading shared link...</div>
                </div>
            </div>
        );
    }

    if (error || !record) {
        return (
            <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: T.bg }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "20px 22px" }}>
                    <div style={{ ...mono, fontSize: 12, color: T.text }}>{error || "Invalid or expired share link."}</div>
                </div>
            </div>
        );
    }

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
            await fetchRecord();
        } catch {
            setError("Could not submit comment.");
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
            <header style={{ height: 56, borderBottom: `1px solid ${T.border}`, background: T.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
                <span style={{ ...mono, fontSize: 12 }}>Shared Experiment</span>
                <span style={{ ...mono, fontSize: 10, color: T.textLight }}>
                    {record.permission_level === "comment" ? "Read + Comment" : "Read-only"}
                </span>
            </header>

            <main style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, padding: 12 }}>
                <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
                    <h1 style={{ ...mono, fontSize: 16, margin: "0 0 10px" }}>{record.title}</h1>
                    <div style={{ ...mono, fontSize: 10, color: T.textLight, marginBottom: 10 }}>Shared at {record.created_at}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                        {record.blocks.map((block, idx: number) => {
                            const preview = block as SharedBlockPreview;
                            return (
                                <article key={`${preview.id || idx}`} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 10px" }}>
                                    <div style={{ ...mono, fontSize: 9, color: T.textLight, marginBottom: 4 }}>{String(preview.type || "block").toUpperCase()}</div>
                                    <div style={{ ...mono, fontSize: 11, color: T.text }}>
                                        {String(preview.data?.title || preview.data?.label || preview.data?.text || "Block content")}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <aside style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ ...mono, fontSize: 10, color: T.textLight, letterSpacing: 1 }}>COMMENTS</div>
                    <div style={{ display: "grid", gap: 8, maxHeight: "52vh", overflowY: "auto" }}>
                        {record.comments.length === 0 && (
                            <div style={{ ...mono, fontSize: 10, color: T.textLight }}>No comments yet.</div>
                        )}
                        {record.comments.map(comment => (
                            <div key={comment.id} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 9px", opacity: comment.resolved ? 0.6 : 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <span style={{ ...mono, fontSize: 10, color: T.text }}>{comment.author}</span>
                                    <span style={{ ...mono, fontSize: 8.5, color: T.textLight }}>{comment.created_at}</span>
                                </div>
                                <div style={{ ...mono, fontSize: 10, color: T.textMid, lineHeight: 1.5 }}>{comment.text}</div>
                            </div>
                        ))}
                    </div>

                    {record.permission_level === "comment" && (
                        <div style={{ display: "grid", gap: 8, marginTop: "auto" }}>
                            <input
                                value={author}
                                onChange={e => setAuthor(e.target.value)}
                                placeholder="Your name"
                                style={{ ...mono, fontSize: 10.5, border: `1px solid ${T.border}`, borderRadius: 4, padding: "8px 9px", outline: "none", color: T.text }}
                            />
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="Add a comment"
                                style={{ ...mono, fontSize: 10.5, border: `1px solid ${T.border}`, borderRadius: 4, padding: "8px 9px", outline: "none", color: T.text, minHeight: 88, resize: "vertical" }}
                            />
                            <button
                                onClick={addComment}
                                style={{ ...mono, fontSize: 10, border: `1px solid ${T.blue}`, borderRadius: 4, background: T.blue, color: "#fff", padding: "8px 10px", cursor: "pointer" }}
                            >
                                Submit Comment
                            </button>
                        </div>
                    )}
                </aside>
            </main>
        </div>
    );
}
