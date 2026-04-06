import type { Metadata } from "next";
import { FONTS, T } from "../theme";
import { AuthProvider } from "../context/AuthContext";
import { ProtectedLayout } from "../components/ProtectedLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "BioCompute ELN",
  description: "Electronic Lab Notebook",
  icons: {
    icon: "/faviconfinal.png",
    shortcut: "/faviconfinal.png",
    apple: "/faviconfinal.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: FONTS }} />
      </head>
      <body style={{ margin: 0, padding: 0, overflow: "hidden", background: T.bg }}>
        <AuthProvider>
          <style dangerouslySetInnerHTML={{
            __html: `
            * { box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; }
            textarea, input { font-family: 'Inter', sans-serif; }
            ::-webkit-scrollbar { width: 5px; height: 5px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
            @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
          ` }} />
          <ProtectedLayout>
            {children}
          </ProtectedLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
