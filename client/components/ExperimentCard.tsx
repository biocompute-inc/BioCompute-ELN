import { T, mono, serif } from "../theme";
import { Avatar } from "./Avatar";
import { Tag } from "./Tag";
import { StatusPip } from "./StatusPip";

interface ExperimentCardProps {
    exp: { id: string; title: string; status: string; tag: string; collaborators: string[]; blocks: number; updated: string; labels?: string[]; preview?: string; };
    onClick: (exp: { id: string }) => void;
    index: number;
    viewMode?: "grid" | "list";
    onStatusChange?: (id: string, status: string) => void;
    onLabelsChange?: (id: string, labels: string[]) => void;
}

export function ExperimentCard({ exp, onClick, index, viewMode = "grid", onStatusChange, onLabelsChange }: ExperimentCardProps) {
    const labels = exp.labels && exp.labels.length > 0 ? exp.labels : [exp.tag];

    return (
        <div onClick={() => onClick(exp)}
            role="button"
            tabIndex={0}
            aria-label={`Open experiment ${exp.title}`}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick(exp);
                }
            }}
            style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4,
                padding: "18px 20px", cursor: "pointer", transition: "all 0.15s",
                animation: `fadeUp 0.3s ease ${index * 0.05}s both`,
                display: "flex",
                flexDirection: viewMode === "list" ? "row" : "column",
                alignItems: viewMode === "list" ? "center" : undefined,
                gap: viewMode === "list" ? 16 : 0,
            }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = T.text;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)";
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
            }}>

            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Card header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {labels.slice(0, 3).map((label, idx) => (
                            <Tag key={`${label}-${idx}`} label={label} color={T.text} />
                        ))}
                    </div>
                    <StatusPip status={exp.status} />
                </div>

                {/* Title */}
                <div style={{ ...serif, fontSize: 16, fontWeight: 300, color: T.text, letterSpacing: -0.2, lineHeight: 1.35, marginBottom: 12 }}>
                    {exp.title}
                </div>

                {viewMode === "list" && (
                    <div style={{ ...mono, fontSize: 10, color: T.textLight, marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {exp.preview || "No preview available"}
                    </div>
                )}

                {/* Footer */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: -4 }}>
                        {exp.collaborators.map((c: string, ci: number) => (
                            <div key={ci} style={{ marginLeft: ci > 0 ? -6 : 0 }}>
                                <Avatar initials={c} size={22} />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ ...mono, fontSize: 10, color: T.textLight }}>{exp.blocks} blocks</span>
                        <span style={{ ...mono, fontSize: 10, color: T.textLight }}>{exp.updated}</span>
                    </div>
                </div>
            </div>

            {(onStatusChange || onLabelsChange) && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: viewMode === "list" ? 10 : 0 }}
                >
                    {onStatusChange && (
                        <select
                            value={exp.status}
                            onChange={(e) => onStatusChange(exp.id, e.target.value)}
                            aria-label="Change experiment status"
                            style={{ ...mono, fontSize: 10, border: `1px solid ${T.border}`, borderRadius: 4, padding: "5px 6px", color: T.text, background: T.surface }}
                        >
                            <option value="active">Active</option>
                            <option value="review">Review</option>
                            <option value="complete">Complete</option>
                        </select>
                    )}
                    {onLabelsChange && (
                        <input
                            value={labels.join(", ")}
                            onChange={(e) => onLabelsChange(exp.id, e.target.value.split(",").map(v => v.trim()).filter(Boolean).slice(0, 4))}
                            placeholder="labels"
                            aria-label="Edit labels"
                            style={{ ...mono, fontSize: 10, border: `1px solid ${T.border}`, borderRadius: 4, padding: "5px 6px", color: T.text, background: T.surface, minWidth: 110 }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
