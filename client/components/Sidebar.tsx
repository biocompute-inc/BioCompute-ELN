"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FlaskConical,
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  History,
  Clock3,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { T, mono } from "../theme";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import {
  RECENTLY_OPENED_CHANGED_EVENT,
  RecentlyOpenedExperiment,
  readRecentlyOpenedExperiments,
} from "../lib/recent-opened";

const SIDEBAR_LAYOUT_KEY = "biocompute:sidebar-layout";
const MIN_WIDTH = 170;
const MAX_WIDTH = 360;

function readSidebarLayout() {
  if (typeof window === "undefined") return { collapsed: false, width: 220 };
  try {
    const raw = sessionStorage.getItem(SIDEBAR_LAYOUT_KEY);
    if (!raw) return { collapsed: false, width: 220 };
    const parsed = JSON.parse(raw) as { collapsed?: boolean; width?: number };
    return {
      collapsed: typeof parsed.collapsed === "boolean" ? parsed.collapsed : false,
      width: typeof parsed.width === "number" && Number.isFinite(parsed.width)
        ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parsed.width))
        : 220,
    };
  } catch {
    return { collapsed: false, width: 220 };
  }
}

interface SidebarProps {
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export function Sidebar({ isDarkMode = false, onToggleDarkMode }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => readSidebarLayout().collapsed);
  const [sidebarWidth, setSidebarWidth] = useState(() => readSidebarLayout().width);
  const [recentlyOpened, setRecentlyOpened] = useState<RecentlyOpenedExperiment[]>([]);
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const navItems = [
    { id: "dashboard", icon: FlaskConical, label: "Experiments", path: "/" },
    { id: "templates", icon: LayoutTemplate, label: "Templates", path: "/templates" },
    { id: "shared", icon: Share2, label: "Shared with me", path: "/shared" },
  ];

  useEffect(() => {
    sessionStorage.setItem(SIDEBAR_LAYOUT_KEY, JSON.stringify({ collapsed: isCollapsed, width: sidebarWidth }));
  }, [isCollapsed, sidebarWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncRecent = () => {
      setRecentlyOpened(readRecentlyOpenedExperiments(user?.id));
    };

    syncRecent();
    window.addEventListener(RECENTLY_OPENED_CHANGED_EVENT, syncRecent);

    return () => {
      window.removeEventListener(RECENTLY_OPENED_CHANGED_EVENT, syncRecent);
    };
  }, [user?.id]);

  useEffect(() => {
    const syncResponsive = () => {
      if (window.innerWidth < 960) {
        setIsCollapsed(true);
      }
    };
    syncResponsive();
    window.addEventListener("resize", syncResponsive);
    return () => window.removeEventListener("resize", syncResponsive);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizeStateRef.current || isCollapsed) return;
      const delta = e.clientX - resizeStateRef.current.startX;
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStateRef.current.startWidth + delta));
      setSidebarWidth(next);
    };
    const onMouseUp = () => {
      resizeStateRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isCollapsed]);

  const beginResize = (e: React.MouseEvent) => {
    if (isCollapsed) return;
    e.preventDefault();
    resizeStateRef.current = { startX: e.clientX, startWidth: sidebarWidth };
  };

  const activeWidth = isCollapsed ? 64 : sidebarWidth;

  return (
    <div style={{ width: activeWidth, background: T.sidebar, display: "flex", flexDirection: "column", flexShrink: 0, borderRight: `1px solid ${T.borderDk}`, height: "100vh", position: "relative", transition: "width 0.16s" }}>
      {/* Logo */}
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: isCollapsed ? "0 8px" : "0 18px", borderBottom: `1px solid ${T.borderDk}`, gap: 10 }}>
        <div style={{ width: 28, height: 28, background: T.blue, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: "#fff" }}>B</span>
        </div>
        {!isCollapsed && <div>
          <div style={{ ...mono, fontSize: 12, fontWeight: 600, color: T.textInv, letterSpacing: -0.3 }}>BioCompute</div>
          <div style={{ ...mono, fontSize: 8, color: "#a0a098", letterSpacing: 0.6, textTransform: "uppercase" }}>Lab</div>
        </div>}
        {!isCollapsed && <span style={{ ...mono, fontSize: 8, color: "#555552", marginLeft: "auto", padding: "2px 5px", border: "1px solid #333330", borderRadius: 2 }}>beta</span>}
        <button
          onClick={() => setIsCollapsed(v => !v)}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            marginLeft: "auto",
            width: 28,
            height: 28,
            borderRadius: 6,
            border: `1px solid ${T.borderDk}`,
            background: "transparent",
            color: T.textInv,
            cursor: "pointer",
            fontSize: 11,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.blue; e.currentTarget.style.color = T.blue; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.borderDk; e.currentTarget.style.color = T.textInv; }}
        >
          {isCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map(item => {
          const active = pathname === item.path || (item.path === "/" && pathname.startsWith("/canvas"));
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => router.push(item.path)} aria-label={item.label}
              style={{
                display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 3,
                background: active ? "rgba(245,244,240,0.1)" : "transparent",
                border: active ? `1px solid rgba(245,244,240,0.08)` : "1px solid transparent",
                cursor: "pointer", ...mono, fontSize: 11.5,
                color: active ? T.textInv : "#A2A29A", textAlign: "left", width: "100%", transition: "all 0.12s"
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#E9E9E2"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#A2A29A"; }}>
              <span style={{ width: 14, display: "flex", justifyContent: "center" }}><Icon size={13} /></span>
              {!isCollapsed && item.label}
            </button>
          );
        })}

        {!isCollapsed && <div style={{ height: 1, background: T.borderDk, margin: "10px 0" }} />}
        {!isCollapsed && (
          <div style={{ ...mono, fontSize: 9, color: "#8B8B84", letterSpacing: 0.8, textTransform: "uppercase", padding: "0 10px", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <History size={11} />
            Recent
          </div>
        )}
        {!isCollapsed && recentlyOpened.map(exp => (
          <button key={exp.id} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 3,
            background: "transparent", border: "1px solid transparent", cursor: "pointer", ...mono, fontSize: 10.5,
            color: "#B3B3AB", textAlign: "left", width: "100%", overflow: "hidden"
          }}
            onClick={() => router.push(`/canvas/${encodeURIComponent(exp.id)}`)}
            onMouseEnter={e => e.currentTarget.style.color = "#F0EFE7"}
            onMouseLeave={e => e.currentTarget.style.color = "#B3B3AB"}>
            <span style={{ width: 12, display: "flex", justifyContent: "center", color: "#8D8D86" }}><Clock3 size={11} /></span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.title}</span>
          </button>
        ))}
        {!isCollapsed && recentlyOpened.length === 0 && (
          <div style={{ ...mono, fontSize: 10, color: "#8B8B84", padding: "2px 10px" }}>
            No recent experiments yet
          </div>
        )}
      </nav>

      {/* Footer controls + user */}
      <div style={{ padding: isCollapsed ? "10px 8px" : "12px 14px", borderTop: `1px solid ${T.borderDk}`, display: "flex", flexDirection: "column", gap: 10 }}>
        {!isCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={onToggleDarkMode}
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
              style={{
                background: "none",
                border: `1px solid ${T.borderDk}`,
                borderRadius: 6,
                cursor: "pointer",
                color: T.textInv,
                fontSize: 11,
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.blue; e.currentTarget.style.color = T.blue; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.borderDk; e.currentTarget.style.color = T.textInv; }}
            >
              {isDarkMode ? <Sun size={12} /> : <Moon size={12} />}
              {isDarkMode ? "Light" : "Dark"}
            </button>
            <button
              onClick={async () => { await logout(); router.push("/login"); }}
              aria-label="Logout"
              style={{
                background: "none",
                border: `1px solid ${T.borderDk}`,
                borderRadius: 6,
                cursor: "pointer",
                color: "#b3b3ab",
                fontSize: 11,
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ff4444"; e.currentTarget.style.color = "#ff4444"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.borderDk; e.currentTarget.style.color = "#b3b3ab"; }}
            >
              <LogOut size={12} />
              Logout
            </button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: isCollapsed ? "center" : "flex-start", gap: 10 }}>
          <Avatar initials={user?.initials || "U"} size={28} color={T.textInv} />
          {!isCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...mono, fontSize: 11, color: T.textInv, whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.35 }}>
                {user?.name || "Guest"}
              </div>
              <div style={{ ...mono, fontSize: 9.5, color: "#8A8A83", whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.3 }}>{user?.institution || ""}</div>
            </div>
          )}
        </div>
      </div>

      <div
        onMouseDown={beginResize}
        title="Resize sidebar"
        style={{
          position: "absolute",
          top: 0,
          right: -2,
          width: 5,
          height: "100%",
          cursor: isCollapsed ? "default" : "col-resize",
          background: "transparent",
        }}
      />
    </div>
  );
}
