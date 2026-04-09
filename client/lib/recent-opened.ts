import { getScopedSessionKey } from "../data/mock";

export const RECENTLY_OPENED_KEY = "biocompute:recently-opened";
export const RECENTLY_OPENED_CHANGED_EVENT = "biocompute:recently-opened-changed";
const MAX_RECENTLY_OPENED = 6;

export type RecentlyOpenedExperiment = {
    id: string;
    title: string;
    openedAt: string;
};

function safeParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function normalize(items: RecentlyOpenedExperiment[]) {
    return items.filter(item => {
        return (
            item &&
            typeof item.id === "string" &&
            item.id.trim().length > 0 &&
            typeof item.title === "string" &&
            item.title.trim().length > 0 &&
            typeof item.openedAt === "string"
        );
    });
}

function storageKey(userId?: string | null) {
    return getScopedSessionKey(RECENTLY_OPENED_KEY, userId);
}

export function readRecentlyOpenedExperiments(userId?: string | null): RecentlyOpenedExperiment[] {
    if (typeof window === "undefined") return [];
    const key = storageKey(userId);
    const parsed = safeParse<RecentlyOpenedExperiment[]>(sessionStorage.getItem(key), []);
    return normalize(parsed).slice(0, MAX_RECENTLY_OPENED);
}

export function recordRecentlyOpenedExperiment(
    experiment: { id: string; title: string },
    userId?: string | null
) {
    if (typeof window === "undefined") return;

    const cleanId = String(experiment.id || "").trim();
    const cleanTitle = String(experiment.title || "").trim() || "Untitled Experiment";
    if (!cleanId) return;

    const current = readRecentlyOpenedExperiments(userId);
    const next: RecentlyOpenedExperiment[] = [
        {
            id: cleanId,
            title: cleanTitle,
            openedAt: new Date().toISOString(),
        },
        ...current.filter(item => item.id !== cleanId),
    ].slice(0, MAX_RECENTLY_OPENED);

    sessionStorage.setItem(storageKey(userId), JSON.stringify(next));
    window.dispatchEvent(new Event(RECENTLY_OPENED_CHANGED_EVENT));
}
