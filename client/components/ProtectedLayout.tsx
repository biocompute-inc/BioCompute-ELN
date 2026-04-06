"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { T } from "../theme";
import { ToastPayload, UI_TOAST_EVENT } from "../lib/ui-events";

const THEME_KEY = "biocompute:theme";

export function ProtectedLayout({ children }: { children: ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        return sessionStorage.getItem(THEME_KEY) === "dark";
    });
    const [toasts, setToasts] = useState<Array<{ id: string; message: string; kind: string }>>([]);

    const isPublicRoute = ["/login", "/register", "/forgot-password", "/landing"].includes(pathname)
        || pathname.startsWith("/view/");

    useEffect(() => {
        if (isLoading) return;

        if (!user && !isPublicRoute) {
            router.replace("/landing");
            return;
        }

        if (user && ["/login", "/register", "/forgot-password", "/landing"].includes(pathname)) {
            router.replace("/");
        }
    }, [isLoading, user, router, pathname, isPublicRoute]);

    useEffect(() => {
        document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
        sessionStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light");
    }, [isDarkMode]);

    useEffect(() => {
        const onToast = (event: Event) => {
            const custom = event as CustomEvent<ToastPayload>;
            const message = custom.detail?.message;
            if (!message) return;
            const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const kind = custom.detail.kind || "info";
            setToasts(prev => [...prev, { id, message, kind }].slice(-4));
            window.setTimeout(() => {
                setToasts(prev => prev.filter(item => item.id !== id));
            }, 2600);
        };

        window.addEventListener(UI_TOAST_EVENT, onToast as EventListener);
        return () => window.removeEventListener(UI_TOAST_EVENT, onToast as EventListener);
    }, []);

    if (isLoading) {
        return <div style={{ width: "100vw", height: "100vh", background: T.bg }} />;
    }

    if (!user && !isPublicRoute) {
        return <div style={{ width: "100vw", height: "100vh", background: T.bg }} />;
    }

    // If on auth pages, don't show layout
    if (isPublicRoute) {
        return <>{children}</>;
    }

    return (
        <div style={{ width: "100vw", height: "100vh", overflow: "hidden", display: "flex", background: T.sidebar }}>
            <Sidebar isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(v => !v)} />
            <div style={{ flex: 1, display: "flex", overflow: "hidden", background: T.bg }}>
                {children}
            </div>
            <div style={{ position: "fixed", right: 14, bottom: 14, display: "flex", flexDirection: "column", gap: 8, zIndex: 500 }} aria-live="polite" aria-atomic="true">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className="bc-toast-enter"
                        style={{
                            minWidth: 220,
                            maxWidth: 320,
                            borderRadius: 6,
                            border: `1px solid ${T.border}`,
                            background: T.surface,
                            color: T.text,
                            fontSize: 11,
                            padding: "9px 10px",
                            boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
                        }}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </div>
    );
}
