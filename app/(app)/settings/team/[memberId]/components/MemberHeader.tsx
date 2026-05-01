"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

type MemberHeaderProps = {
    displayName: string;
    companyName: string | null;
};

export default function MemberHeader({
    displayName,
    companyName,
}: MemberHeaderProps) {
    const router = useRouter();

    return (
        <>
            <button
                onClick={() => router.push("/settings/team")}
                style={backButtonStyle}
            >
                ← Back to Team
            </button>

            <div style={containerStyle}>
                <div style={breadcrumbStyle}>Settings / Team</div>

                <h1 style={titleStyle}>{displayName}</h1>

                <div style={descriptionStyle}>
                    Administrative view of this team member in{" "}
                    {companyName || "your company"}.
                </div>
            </div>
        </>
    );
}

const backButtonStyle: CSSProperties = {
    marginBottom: 18,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 600,
};

const containerStyle: CSSProperties = {
    marginBottom: 22,
};

const breadcrumbStyle: CSSProperties = {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 6,
};

const titleStyle: CSSProperties = {
    fontSize: 32,
    fontWeight: 700,
    margin: "0 0 8px 0",
    letterSpacing: "-0.02em",
};

const descriptionStyle: CSSProperties = {
    color: "#6b7280",
    fontSize: 15,
};
