"use client";

import type { CSSProperties } from "react";
import {
    cardStyle,
    mutedTextStyle,
    statsGridStyle,
} from "../memberDetailStyles";
import { humanRole } from "../memberDetailUtils";

type MemberRole = "owner" | "admin" | "tech" | "viewer";

type MemberProfile = {
    full_name: string | null;
    email: string | null;
    role: MemberRole;
};

type MemberBasicInfoCardProps = {
    loading: boolean;
    isEditingBasicInfo: boolean;
    memberProfile: MemberProfile | null;
    displayName: string;
    memberEmail: string;
    companyName: string | null;
    fullNameInput: string;
    roleInput: MemberRole;
    savingBasicInfo: boolean;
    onDeactivateMember: () => void;
    onStartEdit: () => void;
    onFullNameChange: (value: string) => void;
    onRoleChange: (value: MemberRole) => void;
    onSaveBasicInfo: () => void;
    onCancelEdit: () => void;
};

export default function MemberBasicInfoCard({
    loading,
    isEditingBasicInfo,
    memberProfile,
    displayName,
    memberEmail,
    companyName,
    fullNameInput,
    roleInput,
    savingBasicInfo,
    onDeactivateMember,
    onStartEdit,
    onFullNameChange,
    onRoleChange,
    onSaveBasicInfo,
    onCancelEdit,
}: MemberBasicInfoCardProps) {
    return (
        <section style={cardStyle}>
            <div style={headerActionsStyle}>
                {!loading && !isEditingBasicInfo ? (
                    <div style={actionGroupStyle}>
                        {memberProfile?.role !== "owner" ? (
                            <button
                                type="button"
                                onClick={onDeactivateMember}
                                style={dangerButtonStyle}
                            >
                                Deactivate member
                            </button>
                        ) : null}

                        <button
                            type="button"
                            onClick={onStartEdit}
                            style={secondaryButtonStyle}
                        >
                            Edit
                        </button>
                    </div>
                ) : null}
            </div>

            {loading ? (
                <div style={mutedTextStyle}>Loading member profile...</div>
            ) : isEditingBasicInfo ? (
                <div style={editGridStyle}>
                    <div style={formGridStyle}>
                        <label style={labelStyle}>
                            Full name
                            <input
                                value={fullNameInput}
                                onChange={(e) => onFullNameChange(e.target.value)}
                                placeholder="Enter full name"
                                style={inputStyle}
                            />
                        </label>

                        <label style={labelStyle}>
                            Role
                            <select
                                value={roleInput}
                                onChange={(e) =>
                                    onRoleChange(e.target.value as MemberRole)
                                }
                                style={inputStyle}
                            >
                                <option value="owner">owner</option>
                                <option value="admin">admin</option>
                                <option value="tech">tech</option>
                                <option value="viewer">viewer</option>
                            </select>
                        </label>
                    </div>

                    <div style={statsGridStyle}>
                        <InfoCard label="Email" value={memberEmail} />
                        <InfoCard label="Company" value={companyName || "—"} />
                    </div>

                    <div style={buttonRowStyle}>
                        <button
                            type="button"
                            onClick={onSaveBasicInfo}
                            disabled={savingBasicInfo}
                            style={{
                                ...primaryButtonStyle,
                                cursor: savingBasicInfo ? "default" : "pointer",
                                opacity: savingBasicInfo ? 0.7 : 1,
                            }}
                        >
                            {savingBasicInfo ? "Saving..." : "Save"}
                        </button>

                        <button
                            type="button"
                            onClick={onCancelEdit}
                            disabled={savingBasicInfo}
                            style={{
                                ...secondaryButtonLargeStyle,
                                cursor: savingBasicInfo ? "default" : "pointer",
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div style={statsGridStyle}>
                    <InfoCard label="Full name" value={displayName} />
                    <InfoCard label="Email" value={memberEmail} />
                    <InfoCard
                        label="Role"
                        value={humanRole(memberProfile?.role)}
                    />
                    <InfoCard label="Company" value={companyName || "—"} />
                </div>
            )}
        </section>
    );
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div style={infoCardStyle}>
            <div style={infoLabelStyle}>{label}</div>
            <div style={infoValueStyle}>{value}</div>
        </div>
    );
}

const headerActionsStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
};

const actionGroupStyle: CSSProperties = {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
};

const dangerButtonStyle: CSSProperties = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#991b1b",
    cursor: "pointer",
    fontWeight: 700,
};

const secondaryButtonStyle: CSSProperties = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 600,
};

const editGridStyle: CSSProperties = {
    display: "grid",
    gap: 16,
};

const formGridStyle: CSSProperties = {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "minmax(0, 1fr) 220px",
};

const labelStyle: CSSProperties = {
    display: "grid",
    gap: 6,
    fontSize: 13,
    color: "#374151",
    fontWeight: 600,
};

const inputStyle: CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    outline: "none",
    fontSize: 14,
    background: "#fff",
};

const buttonRowStyle: CSSProperties = {
    display: "flex",
    gap: 10,
};

const primaryButtonStyle: CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    fontWeight: 700,
};

const secondaryButtonLargeStyle: CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    fontWeight: 600,
};

const infoCardStyle: CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 16,
    background: "#fff",
};

const infoLabelStyle: CSSProperties = {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: 600,
};

const infoValueStyle: CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.2,
};
