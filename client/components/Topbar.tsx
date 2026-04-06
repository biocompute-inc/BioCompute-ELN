"use client";

import { ReactNode } from "react";
import { T, serif } from "../theme";

interface TopbarProps {
  title?: ReactNode;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
}

export function Topbar({ title, leftContent, rightContent }: TopbarProps) {
  return (
    <div style={{
      minHeight: 52,
      borderBottom: `1px solid ${T.border}`,
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      padding: "0 28px",
      gap: 16,
      flexShrink: 0,
      background: T.surface,
      width: "100%"
    }}>
      {leftContent && (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {leftContent}
          <div style={{ width: 1, height: 20, background: T.border }} />
        </div>
      )}

      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        {typeof title === "string" ? (
          <div style={{ ...serif, fontSize: 18, fontWeight: 300, color: T.text, letterSpacing: -0.3 }}>
            {title}
          </div>
        ) : (
          title
        )}
      </div>

      {rightContent && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", padding: "8px 0", marginLeft: "auto", maxWidth: "100%", minWidth: 0 }}>
          {rightContent}
        </div>
      )}
    </div>
  );
}
