const fs = require('fs');

const cleanCode = \"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { T } from "../theme";

export function ProtectedLayout({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Basic redirect for protected routes
        /*
        if (!user && !["/login", "/register", "/forgot-password"].includes(pathname)) {
            router.push("/login");
        }
        */
    }, [user, router, pathname]);

    /*
    if (!user && !["/login", "/register", "/forgot-password"].includes(pathname)) {
        return <div style={{ width: "100vw", height: "100vh", background: T.bg }} />; // Loading state
    }
    */

    // If on auth pages, don't show layout
    if (["/login", "/register", "/forgot-password"].includes(pathname)) {
        return <>{children}</>;
    }

    return (
        <div style={{ width: "100vw", height: "100vh", overflow: "hidden", display: "flex", background: T.sidebar }}>
            <Sidebar />
            <div style={{ flex: 1, display: "flex", overflow: "hidden", background: T.bg }}>
                {children}
            </div>
        </div>
    );
}\;

fs.writeFileSync('components/ProtectedLayout.tsx', cleanCode);
