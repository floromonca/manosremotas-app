"use client";

import AppSidebar from "../components/AppSidebar";

export default function AppShellLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const mainBg = "#F3F4F6";

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <AppSidebar />

            <main
                style={{
                    flex: 1,
                    padding: 24,
                    background: mainBg,
                }}
            >
                {children}
            </main>
        </div>
    );
}