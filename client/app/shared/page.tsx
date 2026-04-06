"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { T, mono } from "../../theme";
import { Topbar } from "../../components/Topbar";
import { useAuth } from "../../context/AuthContext";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

type ShareComment = {
    id: string;
    author: string;
    text: string;
    created_at: string;
    resolved: boolean;
};

type ShareMineItem = {
    token: string;
    project_id: string;
    title: string;
    permission_level: "read" | "comment";
    created_at: string;
    unresolved_comments: number;
    comments: ShareComment[];
};

export default function SharedPage() {
    const { token } = useAuth();
    const [records, setRecords] = useState<ShareMineItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadRecords = async () => {
        if (!token) {
            setRecords([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/share/mine`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to load shares");
            }

            const payload = await response.json() as ShareMineItem[];
            setRecords(payload);
        } catch {
            setRecords([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRecords();
    }, [token]);

    const unresolvedCount = records.reduce((sum, record) => sum + record.unresolved_comments, 0);

    const resolveComment = async (shareToken: string, commentId: string) => {
        if (!token) return;
        await fetch(`${API_BASE}/share/${encodeURIComponent(shareToken)}/comments/${commentId}/resolve`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        await loadRecords();
    };

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <Topbar title="Shared with me" />
            <div style={{ flex: 1, overflowY: "auto", padding: 20, background: T.bg }}>
                <div style={{ ...mono, fontSize: 11, color: T.textMid, marginBottom: 12 }}>
                    Active share links: {records.length} · Unresolved comments: {unresolvedCount}
                </div>

                {isLoading && (
                    <div style={{ ...mono, fontSize: 11, color: T.textLight, marginBottom: 12 }}>
                        Loading shared links...
                    </div>
                )}

                <div style={{ display: "grid", gap: 10 }}>
                    {records.length === 0 && (
                        <div style={{ ...mono, fontSize: 11, color: T.textLight, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "20px 14px", background: T.surface }}>
                            No share links yet. Open any experiment and use Share to create one.
                        </div>
                    )}

                    {records.map(record => (
                        <div key={record.token} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                                <div>
                                    <div style={{ ...mono, fontSize: 11, color: T.text }}>{record.title}</div>
                                    <div style={{ ...mono, fontSize: 9.5, color: T.textLight, marginTop: 3 }}>
                                        Permission: {record.permission_level === "comment" ? "Read + Comment" : "Read-only"} · Created: {record.created_at}
                                    </div>
                                </div>
                                <Link href={`/view/${encodeURIComponent(record.token)}`} target="_blank" style={{ ...mono, fontSize: 10, color: "#fff", textDecoration: "none", background: T.blue, border: `1px solid ${T.blue}`, borderRadius: 4, padding: "7px 10px", height: "fit-content" }}>
                                    Open Link
                                </Link>
                            </div>

                            <div style={{ display: "grid", gap: 6 }}>
                                {record.comments.length === 0 && (
                                    <div style={{ ...mono, fontSize: 9.5, color: T.textLight }}>No comments yet.</div>
                                )}
                                {record.comments.map(comment => (
                                    <div key={comment.id} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 9px", opacity: comment.resolved ? 0.62 : 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                            <span style={{ ...mono, fontSize: 9.5, color: T.text }}>{comment.author}</span>
                                            <span style={{ ...mono, fontSize: 8.5, color: T.textLight }}>{comment.created_at}</span>
                                        </div>
                                        <div style={{ ...mono, fontSize: 9.5, color: T.textMid, marginBottom: 6 }}>{comment.text}</div>
                                        {!comment.resolved && (
                                            <button
                                                onClick={() => resolveComment(record.token, comment.id)}
                                                style={{ ...mono, fontSize: 8.5, border: `1px solid ${T.border}`, borderRadius: 4, padding: "4px 7px", background: T.surface, color: T.textMid, cursor: "pointer" }}
                                            >
                                                Resolve
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
