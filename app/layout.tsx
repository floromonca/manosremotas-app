import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppSidebar from "./components/AppSidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ManosRemotas",
  description: "Field Service Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mainBg = "#F3F4F6";

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ margin: 0 }}
      >
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
      </body>
    </html>
  );
}