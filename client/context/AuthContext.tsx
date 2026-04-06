"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

interface User {
    id: string;
    email: string;
    name: string;
    initials: string;
    institution: string;
    location: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (payload: { email: string; password: string; fullName?: string }) => Promise<void>;
    requestPasswordReset: (email: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_KEY = "biocompute:auth-token";
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

type ApiUser = {
    id: string;
    email: string;
    full_name?: string | null;
};

function deriveInitials(label: string) {
    const clean = label.trim();
    if (!clean) return "U";
    const words = clean.split(/\s+/).slice(0, 2);
    return words.map((word) => word[0]?.toUpperCase() || "").join("") || "U";
}

function mapApiUser(apiUser: ApiUser): User {
    const name = apiUser.full_name?.trim() || apiUser.email;
    return {
        id: apiUser.id,
        email: apiUser.email,
        name,
        initials: deriveInitials(name),
        institution: "BioCompute",
        location: "",
    };
}

async function parseErrorMessage(response: Response): Promise<string> {
    const fallback = `Request failed (${response.status})`;
    const text = await response.text();
    if (!text) return fallback;
    try {
        const parsed = JSON.parse(text) as { detail?: string | { message?: string } };
        if (typeof parsed.detail === "string") return parsed.detail;
        if (parsed.detail && typeof parsed.detail === "object" && typeof parsed.detail.message === "string") {
            return parsed.detail.message;
        }
        return fallback;
    } catch {
        return text;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem(TOKEN_KEY);
    });
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMe = useCallback(async (activeToken: string) => {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                Authorization: `Bearer ${activeToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(await parseErrorMessage(response));
        }

        const payload = (await response.json()) as ApiUser;
        setUser(mapApiUser(payload));
    }, []);

    useEffect(() => {
        let cancelled = false;

        const hydrate = async () => {
            if (!token) {
                if (!cancelled) {
                    setUser(null);
                    setIsLoading(false);
                }
                return;
            }

            try {
                await fetchMe(token);
            } catch {
                if (!cancelled) {
                    localStorage.removeItem(TOKEN_KEY);
                    setToken(null);
                    setUser(null);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        hydrate();

        return () => {
            cancelled = true;
        };
    }, [fetchMe, token]);

    const login = useCallback(async (email: string, password: string) => {
        const form = new URLSearchParams();
        form.set("username", email);
        form.set("password", password);

        const response = await fetch(`${API_BASE}/auth/jwt/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: form,
        });

        if (!response.ok) {
            throw new Error(await parseErrorMessage(response));
        }

        const payload = (await response.json()) as { access_token: string };
        localStorage.setItem(TOKEN_KEY, payload.access_token);
        setToken(payload.access_token);
        await fetchMe(payload.access_token);
    }, [fetchMe]);

    const register = useCallback(async (payload: { email: string; password: string; fullName?: string }) => {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: payload.email,
                password: payload.password,
                full_name: payload.fullName || null,
            }),
        });

        if (!response.ok) {
            throw new Error(await parseErrorMessage(response));
        }

        await login(payload.email, payload.password);
    }, [login]);

    const requestPasswordReset = useCallback(async (email: string) => {
        const response = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            throw new Error(await parseErrorMessage(response));
        }
    }, []);

    const logout = useCallback(async () => {
        const activeToken = token;
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);

        if (!activeToken) return;

        await fetch(`${API_BASE}/auth/jwt/logout`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${activeToken}`,
            },
        });
    }, [token]);

    const value = useMemo(() => ({
        user,
        token,
        isLoading,
        login,
        register,
        requestPasswordReset,
        logout,
    }), [isLoading, login, logout, register, requestPasswordReset, token, user]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
