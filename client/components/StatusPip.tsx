import { T, mono } from "../theme";
import { CheckCircle2, CircleDashed, Clock3, LucideIcon } from "lucide-react";

export function StatusPip({ status }: { status: string }) {
    const map: Record<string, { color: string, label: string, icon: LucideIcon }> = {
        active: { color: "#2D9D5C", label: "Active", icon: CircleDashed },
        review: { color: T.amber, label: "In review", icon: Clock3 },
        complete: { color: "#4E5A67", label: "Complete", icon: CheckCircle2 }
    };
    const s = map[status] || map.active;
    const Icon = s.icon;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ display: "flex", alignItems: "center", color: s.color }}><Icon size={12} /></span>
            <span style={{ ...mono, fontSize: 10, color: s.color }}>{s.label}</span>
        </div>
    );
}