import { mono } from "../theme";

export function Tag({ label, color, solid = false }: { label: string, color: string, solid?: boolean }) {
    if (solid) {
        return (
            <span style={{
                ...mono, fontSize: 10, padding: "3px 8px", borderRadius: 3, 
                background: color, color: "#fff"
            }}>
                {label}
            </span>
        );
    }
    return (
        <span style={{
            ...mono, fontSize: 9.5, padding: "2px 7px", borderRadius: 2, 
            background: color + "14", color, border: `1px solid ${color}40`
        }}>
            {label}
        </span>
    );
}
