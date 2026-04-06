"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, ClipboardList, FileText, Image as ImageIcon, NotebookPen, Plus } from "lucide-react";
import { Topbar } from "../components/Topbar";
import { ExperimentCard } from "../components/ExperimentCard";
import { NewExperimentModal } from "../components/NewExperimentModal";
import {
  EXPERIMENTS,
  ExperimentTemplate,
  SESSION_CANVASES_KEY,
  SESSION_EXPERIMENTS_KEY,
  TEMPLATES_CHANGED_EVENT,
  getScopedSessionKey,
  readTemplateBlocksMap,
  readTemplatesFromSession,
} from "../data/mock";
import { T, mono } from "../theme";
import { emitToast } from "../lib/ui-events";
import { useAuth } from "../context/AuthContext";

type ExperimentRow = {
  id: string;
  title: string;
  tag: string;
  labels?: string[];
  preview?: string;
  status: string;
  updated: string;
  blocks: number;
  collaborators: string[];
  templateId?: string | null;
};

type TemplateIconKey = "note" | "protocol" | "result" | "image" | "template";

type CanvasStore = Record<string, { blocks: unknown[] }>;
const EXPERIMENTS_CHANGED_EVENT = "biocompute:experiments-changed";
const DASHBOARD_TABS_KEY = "biocompute:experiment-tabs";
const DASHBOARD_ONBOARDING_KEY = "biocompute:onboarding-dashboard-v1";

function cloneTemplateBlocks(templateId: string | null): unknown[] {
  if (!templateId) return [];
  const src = readTemplateBlocksMap()[templateId] || [];
  return src.map(block => ({ ...block, data: { ...block.data } }));
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function nowLabel() {
  return new Date().toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderTemplateIcon(icon: string, color: string) {
  const iconProps = { size: 16, color, strokeWidth: 2 };
  const key = icon as TemplateIconKey;
  if (key === "protocol") return <ClipboardList {...iconProps} />;
  if (key === "result") return <BarChart3 {...iconProps} />;
  if (key === "image") return <ImageIcon {...iconProps} />;
  if (key === "template") return <FileText {...iconProps} />;
  return <NotebookPen {...iconProps} />;
}

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const experimentsCacheRef = useRef<{ key: string; raw: string | null; snapshot: ExperimentRow[] | null }>({
    key: "",
    raw: null,
    snapshot: null,
  });
  const experimentsSessionKey = useMemo(
    () => getScopedSessionKey(SESSION_EXPERIMENTS_KEY, user?.id),
    [user?.id]
  );
  const canvasesSessionKey = useMemo(
    () => getScopedSessionKey(SESSION_CANVASES_KEY, user?.id),
    [user?.id]
  );
  const readExperimentsFromSession = useCallback(() => {
    if (typeof window === "undefined") return EXPERIMENTS as ExperimentRow[];

    const currentRaw = sessionStorage.getItem(experimentsSessionKey);
    const cache = experimentsCacheRef.current;
    if (cache.key === experimentsSessionKey && cache.raw === currentRaw && cache.snapshot) {
      return cache.snapshot;
    }

    const storedExperiments = safeParse<ExperimentRow[]>(currentRaw, []);
    if (storedExperiments.length > 0) {
      experimentsCacheRef.current = {
        key: experimentsSessionKey,
        raw: currentRaw,
        snapshot: storedExperiments,
      };
      return storedExperiments;
    }

    const nextExperiments = EXPERIMENTS.map(exp => ({ ...exp }));
    const nextRaw = JSON.stringify(nextExperiments);
    sessionStorage.setItem(experimentsSessionKey, nextRaw);

    const canvases = safeParse<CanvasStore>(sessionStorage.getItem(canvasesSessionKey), {});
    let didUpdateCanvases = false;
    nextExperiments.forEach(exp => {
      if (!canvases[exp.id]) {
        canvases[exp.id] = { blocks: cloneTemplateBlocks("tpl-note") };
        didUpdateCanvases = true;
      }
    });
    if (didUpdateCanvases) {
      sessionStorage.setItem(canvasesSessionKey, JSON.stringify(canvases));
    }

    experimentsCacheRef.current = {
      key: experimentsSessionKey,
      raw: nextRaw,
      snapshot: nextExperiments,
    };
    return nextExperiments;
  }, [canvasesSessionKey, experimentsSessionKey]);
  const writeExperimentsToSession = useCallback((next: ExperimentRow[]) => {
    if (typeof window === "undefined") return;
    const raw = JSON.stringify(next);
    sessionStorage.setItem(experimentsSessionKey, raw);
    experimentsCacheRef.current = {
      key: experimentsSessionKey,
      raw,
      snapshot: next,
    };
    window.dispatchEvent(new Event(EXPERIMENTS_CHANGED_EVENT));
  }, [experimentsSessionKey]);
  const experiments = useSyncExternalStore<ExperimentRow[]>(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => { };
      const handler = () => onStoreChange();
      window.addEventListener(EXPERIMENTS_CHANGED_EVENT, handler);
      return () => window.removeEventListener(EXPERIMENTS_CHANGED_EVENT, handler);
    },
    readExperimentsFromSession,
    () => EXPERIMENTS as ExperimentRow[]
  );
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return safeParse<string[]>(sessionStorage.getItem(DASHBOARD_TABS_KEY), []);
  });
  const [showCommandSearch, setShowCommandSearch] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortBy, setSortBy] = useState<"updated" | "title" | "blocks">("updated");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilters, setStatusFilters] = useState<string[]>(["active", "review", "complete"]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [templates, setTemplates] = useState<ExperimentTemplate[]>(() => readTemplatesFromSession());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(1200);

  const filters = ["all", "active", "review", "complete"];

  useEffect(() => {
    sessionStorage.setItem(DASHBOARD_TABS_KEY, JSON.stringify(openTabs));
  }, [openTabs]);

  useEffect(() => {
    const refreshTemplates = () => setTemplates(readTemplatesFromSession());
    refreshTemplates();
    window.addEventListener(TEMPLATES_CHANGED_EVENT, refreshTemplates);
    return () => window.removeEventListener(TEMPLATES_CHANGED_EVENT, refreshTemplates);
  }, []);

  useEffect(() => {
    const seen = sessionStorage.getItem(DASHBOARD_ONBOARDING_KEY);
    if (!seen) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const existingIds = useMemo(() => new Set(experiments.map(exp => exp.id)), [experiments]);
  const visibleTabs = useMemo(() => openTabs.filter(id => existingIds.has(id)), [existingIds, openTabs]);
  const effectiveActiveTab = activeTab !== "all" && existingIds.has(activeTab) ? activeTab : "all";

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandSearch(v => !v);
      }
      if (e.key === "Escape") {
        setShowCommandSearch(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const shown = useMemo(
    () => {
      let rows = filter === "all" ? experiments : experiments.filter(e => e.status === filter);
      if (effectiveActiveTab !== "all") {
        rows = rows.filter(e => e.id === effectiveActiveTab);
      }

      rows = rows.filter(e => statusFilters.includes(e.status));

      if (selectedLabels.length > 0) {
        rows = rows.filter(e => {
          const labels: string[] = (e.labels && e.labels.length > 0 ? e.labels : [e.tag]);
          const lowered = labels.map((v: string) => v.toLowerCase());
          return selectedLabels.every(lbl => lowered.includes(lbl.toLowerCase()));
        });
      }

      const q = searchTerm.trim().toLowerCase();
      if (q) {
        rows = rows.filter(e =>
          e.title.toLowerCase().includes(q) ||
          e.tag.toLowerCase().includes(q) ||
          e.status.toLowerCase().includes(q) ||
          (e.preview || "").toLowerCase().includes(q)
        );
      }

      rows = [...rows].sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "blocks") return b.blocks - a.blocks;
        return b.updated.localeCompare(a.updated);
      });

      return rows;
    },
    [effectiveActiveTab, experiments, filter, searchTerm, selectedLabels, sortBy, statusFilters]
  );

  const allLabels = useMemo(() => {
    const values = new Set<string>();
    experiments.forEach(exp => {
      const labels: string[] = exp.labels && exp.labels.length > 0 ? exp.labels : [exp.tag];
      labels.forEach((label: string) => values.add(label));
    });
    return Array.from(values).sort();
  }, [experiments]);

  const tabExperiments = useMemo(
    () => visibleTabs.map(id => experiments.find(exp => exp.id === id)).filter(Boolean) as ExperimentRow[],
    [experiments, visibleTabs]
  );

  const breadcrumb = useMemo(() => {
    const chunks = ["Home", "Experiments"];
    if (filter !== "all") chunks.push(filter[0].toUpperCase() + filter.slice(1));
    if (effectiveActiveTab !== "all") {
      const exp = experiments.find(item => item.id === effectiveActiveTab);
      if (exp) chunks.push(exp.title);
    }
    return chunks;
  }, [effectiveActiveTab, experiments, filter]);

  const commandItems = useMemo(() => {
    const staticCommands = [
      { id: "cmd-new", label: "Create New Experiment", action: () => { setShowNew(true); setShowCommandSearch(false); } },
      { id: "cmd-filter-all", label: "Filter: All", action: () => { setFilter("all"); setShowCommandSearch(false); } },
      { id: "cmd-filter-active", label: "Filter: Active", action: () => { setFilter("active"); setShowCommandSearch(false); } },
      { id: "cmd-filter-review", label: "Filter: Review", action: () => { setFilter("review"); setShowCommandSearch(false); } },
      { id: "cmd-filter-complete", label: "Filter: Complete", action: () => { setFilter("complete"); setShowCommandSearch(false); } },
      { id: "cmd-go-templates", label: "Go to Templates", action: () => { setShowCommandSearch(false); router.push("/templates"); } },
      { id: "cmd-go-shared", label: "Go to Shared With Me", action: () => { setShowCommandSearch(false); router.push("/shared"); } },
    ];

    const experimentCommands = experiments.map(exp => ({
      id: `exp-${exp.id}`,
      label: `Open Experiment: ${exp.title}`,
      action: () => {
        if (!openTabs.includes(exp.id)) setOpenTabs(prev => [exp.id, ...prev].slice(0, 6));
        setShowCommandSearch(false);
        router.push(`/canvas/${exp.id}`);
      },
    }));

    const q = commandQuery.trim().toLowerCase();
    return [...staticCommands, ...experimentCommands].filter(item =>
      item.label.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [commandQuery, experiments, openTabs, router]);

  const handleOpen = (exp: { id: string }) => {
    setOpenTabs(prev => [exp.id, ...prev.filter(id => id !== exp.id && existingIds.has(id))].slice(0, 6));
    router.push(`/canvas/${exp.id}`);
  };

  const handleCreate = (title: string, mode: string, templateId: string | null) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const resolvedTemplateId = mode === "template" ? (templateId || templates[0]?.id || null) : null;
    const initialBlocks = mode === "template" ? cloneTemplateBlocks(resolvedTemplateId) : [];

    const newExp = {
      id: `exp-${Date.now()}`,
      title: cleanTitle,
      tag: "New",
      status: "active",
      updated: nowLabel(),
      blocks: initialBlocks.length,
      collaborators: ["SR"],
      templateId: resolvedTemplateId,
      labels: ["New"],
      preview: "New experiment created from dashboard",
    };

    const currentCanvases = safeParse<CanvasStore>(sessionStorage.getItem(canvasesSessionKey), {});
    currentCanvases[newExp.id] = { blocks: initialBlocks };
    sessionStorage.setItem(canvasesSessionKey, JSON.stringify(currentCanvases));

    writeExperimentsToSession([newExp, ...experiments]);
    setOpenTabs(prev => [newExp.id, ...prev.filter(id => id !== newExp.id && existingIds.has(id))].slice(0, 6));
    setShowNew(false);
    emitToast({ message: `Created experiment: ${cleanTitle}`, kind: "success" });
    router.push(`/canvas/${newExp.id}`);
  };

  const removeTab = (id: string) => {
    setOpenTabs(prev => prev.filter(tabId => tabId !== id));
    if (effectiveActiveTab === id) setActiveTab("all");
  };

  const handleStatusChange = (id: string, status: string) => {
    const next = experiments.map(exp =>
      exp.id === id
        ? { ...exp, status, updated: nowLabel() }
        : exp
    );
    writeExperimentsToSession(next);
    emitToast({ message: `Status updated to ${status}`, kind: "info" });
  };

  const handleLabelsChange = (id: string, labels: string[]) => {
    const next = experiments.map(exp =>
      exp.id === id
        ? { ...exp, labels, tag: labels[0] || exp.tag, updated: nowLabel() }
        : exp
    );
    writeExperimentsToSession(next);
    emitToast({ message: "Labels updated", kind: "info" });
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilters(prev => prev.includes(status)
      ? prev.filter(v => v !== status)
      : [...prev, status]
    );
  };

  const toggleLabelFilter = (label: string) => {
    setSelectedLabels(prev => prev.includes(label)
      ? prev.filter(v => v !== label)
      : [...prev, label]
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Topbar
        title="Experiments"
        leftContent={
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {breadcrumb.map((item, idx) => (
              <div key={`${item}-${idx}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ ...mono, fontSize: 10, color: idx === breadcrumb.length - 1 ? T.text : T.textLight }}>{item}</span>
                {idx < breadcrumb.length - 1 && <span style={{ ...mono, fontSize: 10, color: T.textLight }}>/</span>}
              </div>
            ))}
          </div>
        }
        rightContent={
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-start", minWidth: 0, marginLeft: "auto" }}>
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search experiments..."
              aria-label="Search experiments"
              style={{
                ...mono,
                fontSize: 10.5,
                width: viewportWidth < 960 ? 140 : 220,
                padding: "6px 10px",
                border: `1px solid ${T.border}`,
                borderRadius: 4,
                color: T.text,
                background: T.surface,
                outline: "none",
                marginRight: viewportWidth < 1320 ? 0 : 10,
                minWidth: 120,
                flex: "1 1 200px",
                maxWidth: 280,
              }}
            />
            <button onClick={() => setShowFilterPanel(v => !v)} aria-label="Toggle filters panel" style={{
              ...mono, fontSize: 10.5, padding: "6px 10px", marginRight: viewportWidth < 1320 ? 0 : 10,
              border: `1px solid ${showFilterPanel ? T.blue : T.border}`, borderRadius: 4,
              background: showFilterPanel ? "rgba(122,169,255,0.22)" : T.surface, color: showFilterPanel ? T.text : T.textLight,
              cursor: "pointer"
            }}>
              Filters
            </button>
            {viewportWidth >= 1040 && (
              <div style={{ display: "flex", gap: 4, marginRight: viewportWidth < 1320 ? 0 : 10 }}>
                {[
                  { id: "grid", label: "Grid" },
                  { id: "list", label: "List" },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setViewMode(opt.id as "grid" | "list")} aria-label={`Switch to ${opt.label} view`} style={{
                    ...mono, fontSize: 10.5, padding: "6px 10px",
                    border: `1px solid ${viewMode === opt.id ? T.blue : T.border}`,
                    borderRadius: 4,
                    background: viewMode === opt.id ? "rgba(122,169,255,0.22)" : T.surface,
                    color: viewMode === opt.id ? T.text : T.textLight,
                    cursor: "pointer"
                  }}>{opt.label}</button>
                ))}
              </div>
            )}
            {viewportWidth >= 1180 && (
              <div style={{ display: "flex", gap: 2, marginRight: viewportWidth < 1320 ? 0 : 16 }}>
                {filters.map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    ...mono, fontSize: 10.5, padding: "5px 12px",
                    border: `1px solid ${filter === f ? T.blue : "transparent"}`, borderRadius: 20,
                    background: filter === f ? "rgba(122,169,255,0.22)" : "transparent",
                    color: filter === f ? T.text : T.textLight, cursor: "pointer", textTransform: "capitalize"
                  }}>
                    {f}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowNew(true)} style={{
              ...mono, fontSize: 11, padding: "7px 16px",
              background: T.blue, color: "#ffffff", border: `1px solid ${T.blue}`, borderRadius: 3, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0
            }}>
              <Plus size={14} /> New experiment
            </button>
          </div>
        }
      />

      {showFilterPanel && (
        <div style={{ borderBottom: `1px solid ${T.border}`, background: T.surface, padding: "10px 18px", display: "grid", gridTemplateColumns: "auto auto auto 1fr", gap: 18, alignItems: "start" }}>
          <div>
            <div style={{ ...mono, fontSize: 9, color: T.textLight, marginBottom: 6 }}>Sort</div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as "updated" | "title" | "blocks")} style={{ ...mono, fontSize: 10.5, border: `1px solid ${T.border}`, borderRadius: 4, padding: "6px 8px", color: T.text }}>
              <option value="updated">Updated</option>
              <option value="title">Title</option>
              <option value="blocks">Block Count</option>
            </select>
          </div>
          <div>
            <div style={{ ...mono, fontSize: 9, color: T.textLight, marginBottom: 6 }}>Status</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["active", "review", "complete"].map(s => (
                <button key={s} onClick={() => toggleStatusFilter(s)} style={{ ...mono, fontSize: 10, padding: "5px 8px", borderRadius: 4, border: `1px solid ${statusFilters.includes(s) ? T.blue : T.border}`, background: statusFilters.includes(s) ? "rgba(122,169,255,0.22)" : T.surface, color: statusFilters.includes(s) ? T.text : T.textMid, cursor: "pointer", textTransform: "capitalize" }}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ ...mono, fontSize: 9, color: T.textLight, marginBottom: 6 }}>Labels</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 360 }}>
              {allLabels.map(label => (
                <button key={label} onClick={() => toggleLabelFilter(label)} style={{ ...mono, fontSize: 9.5, padding: "4px 7px", borderRadius: 12, border: `1px solid ${selectedLabels.includes(label) ? T.blue : T.border}`, background: selectedLabels.includes(label) ? "rgba(122,169,255,0.22)" : T.surface, color: selectedLabels.includes(label) ? T.text : T.textMid, cursor: "pointer" }}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
            <button onClick={() => { setStatusFilters(["active", "review", "complete"]); setSelectedLabels([]); setSortBy("updated"); }} style={{ ...mono, fontSize: 10, border: `1px solid ${T.border}`, borderRadius: 4, padding: "6px 10px", background: T.surface, color: T.textMid, cursor: "pointer" }}>Reset Filters</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "28px", background: T.bg }}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 960 ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Total experiments", value: experiments.length, color: T.text },
            { label: "Active", value: experiments.filter(e => e.status === "active").length, color: "#2D9D5C" },
            { label: "In review", value: experiments.filter(e => e.status === "review").length, color: T.amber },
            { label: "Complete", value: experiments.filter(e => e.status === "complete").length, color: T.textLight },
          ].map(stat => (
            <div key={stat.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: "14px 18px" }}>
              <div style={{ ...mono, fontSize: 22, fontWeight: 500, color: stat.color, letterSpacing: -0.5 }}>{stat.value}</div>
              <div style={{ ...mono, fontSize: 10, color: T.textLight, marginTop: 3 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Experiment cards */}
        <div style={{ display: "grid", gridTemplateColumns: viewMode === "grid" ? (viewportWidth < 980 ? "1fr" : "repeat(2,1fr)") : "1fr", gap: 14 }}>
          {shown.map((exp, i) => (
            <ExperimentCard
              key={exp.id}
              exp={exp}
              onClick={handleOpen}
              index={i}
              viewMode={viewMode}
              onStatusChange={handleStatusChange}
              onLabelsChange={handleLabelsChange}
            />
          ))}

          {/* New experiment ghost card */}
          <div onClick={() => setShowNew(true)}
            style={{
              border: `1.5px dashed ${T.border}`, borderRadius: 4, padding: "18px 20px",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 8, minHeight: 120, transition: "border-color 0.15s"
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = T.text}
            onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
            <div style={{ fontSize: 20, color: T.textLight }}>+</div>
            <div style={{ ...mono, fontSize: 11, color: T.textLight }}>New experiment</div>
          </div>
        </div>

        {shown.length === 0 && (
          <div style={{ marginTop: 16, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "28px 20px", background: T.surface, textAlign: "center" }}>
            <div style={{ ...mono, fontSize: 12, color: T.text, marginBottom: 8 }}>No experiments match your filters.</div>
            <div style={{ ...mono, fontSize: 10, color: T.textLight, marginBottom: 12 }}>Try clearing filters or create a new experiment.</div>
            <button onClick={() => { setFilter("all"); setStatusFilters(["active", "review", "complete"]); setSelectedLabels([]); setSearchTerm(""); }} style={{ ...mono, fontSize: 10.5, border: `1px solid ${T.border}`, borderRadius: 4, background: T.surface, color: T.textMid, padding: "6px 10px", cursor: "pointer" }}>
              Reset filters
            </button>
          </div>
        )}

        {/* Template shelf */}
        <div style={{ marginTop: 32 }}>
          <div style={{ ...mono, fontSize: 10, color: T.textLight, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 14 }}>Quick-start templates</div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {templates.map(tmpl => (
              <div key={tmpl.id}
                style={{
                  flexShrink: 0, width: 160, background: T.surface, border: `1px solid ${T.border}`,
                  borderRadius: 4, padding: "14px 16px", cursor: "pointer", transition: "all 0.14s"
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = tmpl.color; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}>
                <div style={{ marginBottom: 7, display: "flex", alignItems: "center" }}>{renderTemplateIcon(tmpl.icon, tmpl.color)}</div>
                <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: T.text, marginBottom: 4 }}>{tmpl.name}</div>
                <div style={{ ...mono, fontSize: 9.5, color: T.textLight }}>{tmpl.blocks} blocks</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showNew && <NewExperimentModal onClose={() => setShowNew(false)} onCreate={handleCreate} templates={templates} />}

      {showCommandSearch && (
        <div
          onClick={() => setShowCommandSearch(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 92,
            zIndex: 300,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "min(760px, calc(100vw - 40px))",
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
          >
            <input
              autoFocus
              value={commandQuery}
              onChange={e => setCommandQuery(e.target.value)}
              placeholder="Search commands and experiments..."
              style={{
                ...mono,
                width: "100%",
                border: "none",
                borderBottom: `1px solid ${T.border}`,
                padding: "12px 14px",
                fontSize: 12,
                color: T.text,
                outline: "none",
              }}
            />
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {commandItems.length === 0 ? (
                <div style={{ ...mono, padding: "12px 14px", fontSize: 11, color: T.textLight }}>
                  No command matches.
                </div>
              ) : (
                commandItems.map(item => (
                  <button
                    key={item.id}
                    onClick={item.action}
                    aria-label={item.label}
                    style={{
                      ...mono,
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      borderBottom: `1px solid ${T.border}`,
                      background: T.surface,
                      padding: "10px 14px",
                      fontSize: 11,
                      color: T.text,
                      cursor: "pointer",
                    }}
                  >
                    {item.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showOnboarding && (
        <div onClick={() => { setShowOnboarding(false); sessionStorage.setItem(DASHBOARD_ONBOARDING_KEY, "done"); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(560px, calc(100vw - 32px))", background: T.surface, borderRadius: 8, border: `1px solid ${T.border}`, boxShadow: "0 24px 52px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ ...mono, fontSize: 9, color: T.textLight, letterSpacing: 1.2 }}>ONBOARDING TOUR</div>
              <div style={{ ...mono, fontSize: 12, color: T.text, marginTop: 6 }}>
                {[
                  "Create or open experiments from the dashboard.",
                  "Use command palette (Ctrl/Cmd+K) for fast actions.",
                  "Inside canvas, add blocks, connect them, and save templates.",
                ][onboardingStep]}
              </div>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ ...mono, fontSize: 9, color: T.textLight }}>Step {onboardingStep + 1} / 3</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setOnboardingStep(v => Math.max(0, v - 1))} disabled={onboardingStep === 0} style={{ ...mono, fontSize: 10, border: `1px solid ${T.border}`, borderRadius: 4, background: T.surface, color: T.textMid, padding: "6px 10px", cursor: onboardingStep === 0 ? "not-allowed" : "pointer" }}>Back</button>
                {onboardingStep < 2 ? (
                  <button onClick={() => setOnboardingStep(v => Math.min(2, v + 1))} style={{ ...mono, fontSize: 10, border: `1px solid ${T.text}`, borderRadius: 4, background: T.text, color: "#fff", padding: "6px 10px", cursor: "pointer" }}>Next</button>
                ) : (
                  <button onClick={() => { setShowOnboarding(false); sessionStorage.setItem(DASHBOARD_ONBOARDING_KEY, "done"); emitToast({ message: "Onboarding completed", kind: "success" }); }} style={{ ...mono, fontSize: 10, border: `1px solid ${T.text}`, borderRadius: 4, background: T.text, color: "#fff", padding: "6px 10px", cursor: "pointer" }}>Done</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
