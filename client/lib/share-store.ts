export const SHARE_LINKS_KEY = "biocompute:share-links";

export type SharePermission = "read" | "comment";

export type SharedComment = {
    id: string;
    author: string;
    text: string;
    createdAt: string;
    resolved?: boolean;
};

export type SharedRecord = {
    token: string;
    experimentId: string;
    title: string;
    permission: SharePermission;
    createdAt: string;
    blocks: unknown[];
    comments: SharedComment[];
};

function safeParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function readLocal(key: string) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeLocal(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

function readSession(key: string) {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

function removeSession(key: string) {
    try {
        sessionStorage.removeItem(key);
    } catch {
        // noop
    }
}

function normalizeToken(token: string) {
    const trimmed = token.trim().replace(/^\/+|\/+$/g, "");
    try {
        return decodeURIComponent(trimmed);
    } catch {
        return trimmed;
    }
}

function inferExperimentId(token: string) {
    const normalized = normalizeToken(token);
    const chunks = normalized.split("-");
    if (chunks.length < 3) return null;
    return chunks.slice(0, -2).join("-") || null;
}

function readStorageValue() {
    if (typeof window === "undefined") return null;

    const localRaw = readLocal(SHARE_LINKS_KEY);
    if (localRaw) return localRaw;

    // Backward compatibility: migrate legacy session-scoped share links.
    const sessionRaw = readSession(SHARE_LINKS_KEY);
    if (sessionRaw) {
        writeLocal(SHARE_LINKS_KEY, sessionRaw);
        removeSession(SHARE_LINKS_KEY);
        return sessionRaw;
    }

    return null;
}

export function readSharedRecords(): SharedRecord[] {
    if (typeof window === "undefined") return [];
    return safeParse<SharedRecord[]>(readStorageValue(), []);
}

export function writeSharedRecords(next: SharedRecord[]) {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify(next);
    // Primary store for cross-tab and persisted links.
    const wroteLocal = writeLocal(SHARE_LINKS_KEY, payload);
    // Keep a session fallback when localStorage is unavailable.
    if (!wroteLocal) {
        try {
            sessionStorage.setItem(SHARE_LINKS_KEY, payload);
        } catch {
            // noop
        }
    }
}

export function upsertSharedRecord(record: SharedRecord) {
    const all = readSharedRecords();
    const idx = all.findIndex(item => item.token === record.token);
    if (idx >= 0) {
        all[idx] = record;
    } else {
        all.unshift(record);
    }
    writeSharedRecords(all);
}

export function getSharedRecord(token: string): SharedRecord | null {
    const all = readSharedRecords();
    const normalized = normalizeToken(token);

    const exact = all.find(item => normalizeToken(item.token) === normalized);
    if (exact) return exact;

    // Fallback: if token format is `${experimentId}-${time}-${rand}` and exact lookup fails,
    // return the latest shared record for the inferred experiment ID.
    const inferredExperimentId = inferExperimentId(normalized);
    if (!inferredExperimentId) return null;

    const candidates = all
        .filter(item => item.experimentId === inferredExperimentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return candidates[0] || null;
}

export function updateSharedRecord(token: string, updater: (record: SharedRecord) => SharedRecord): SharedRecord | null {
    const all = readSharedRecords();
    const idx = all.findIndex(item => item.token === token);
    if (idx < 0) return null;
    all[idx] = updater(all[idx]);
    writeSharedRecords(all);
    return all[idx];
}
