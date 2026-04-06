"use client";

import { T } from "../theme";

interface AvatarProps {
    initials: string;
    size?: number;
    color?: string;
}

export function Avatar({ initials, size = 22, color = T.text }: AvatarProps) {
    return (
        <div style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: color + "18",
            border: `1px solid ${color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Inter', sans-serif",
            fontSize: size * 0.36,
            fontWeight: 600,
            color,
            flexShrink: 0
        }}>
            {initials}
        </div>
    );
}
