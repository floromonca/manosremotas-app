"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useAuthState } from "../../../hooks/useAuthState";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import { MR_THEME } from "../../../lib/theme";
import {
    getOpenShift,
    getTodayShiftSummary,
    getWeekShiftSummary,
    formatDurationHHMMSS,
    type ShiftRow,
    type ShiftSummary,
} from "../../../lib/supabase/shifts";

type MembershipProfileRow = {
    full_name: string | null;
    role: "owner" | "admin" | "tech" | "viewer";
};

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return String(error);
}

function humanRole(role: string | null | undefined) {
    if (!role) return "—";
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    if (role === "tech") return "Technician";
    if (role === "viewer") return "Viewer";
    return role;
}

export default function ProfilePage() {
    const router = useRouter();
    const { user, authLoading } = useAuthState();
    const { companyId, companyName, myRole, isLoadingCompany } = useActiveCompany();

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [memberProfile, setMemberProfile] = useState<MembershipProfileRow | null>(null);
    const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
    const [fullNameInput, setFullNameInput] = useState("");
    const [savingBasicInfo, setSavingBasicInfo] = useState(false);
    const [sendingPasswordEmail, setSendingPasswordEmail] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    const [openShift, setOpenShift] = useState<ShiftRow | null>(null);
    const [todaySummary, setTodaySummary] = useState<ShiftSummary | null>(null);
    const [weekSummary, setWeekSummary] = useState<ShiftSummary | null>(null);

    const refreshProfileData = useCallback(async (cid: string, uid: string) => {
        const [
            memberRes,
            openShiftRes,
            todayShiftSummary,
            weekShiftSummary,
        ] = await Promise.all([
            supabase
                .from("company_members")
                .select("full_name, role")
                .eq("company_id", cid)
                .eq("user_id", uid)
                .maybeSingle(),
            getOpenShift(cid),
            getTodayShiftSummary(cid),
            getWeekShiftSummary(cid),
        ]);

        if (memberRes.error) throw memberRes.error;
        if (openShiftRes.error) throw openShiftRes.error;

        const profileRow = (memberRes.data as MembershipProfileRow | null) ?? null;

        setMemberProfile(profileRow);
        setFullNameInput(profileRow?.full_name ?? "");
        setOpenShift((openShiftRes.data as ShiftRow | null) ?? null);
        setTodaySummary(todayShiftSummary);
        setWeekSummary(weekShiftSummary);
    }, []);

    const saveBasicInfo = useCallback(async () => {
        if (!companyId || !user?.id) return;

        setSavingBasicInfo(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const nextFullName = fullNameInput.trim();

            const { data, error } = await supabase
                .from("company_members")
                .update({
                    full_name: nextFullName || null,
                })
                .eq("company_id", companyId)
                .eq("user_id", user.id)
                .select("user_id, company_id, full_name");

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error("Profile update did not affect any row. Check RLS or membership match.");
            }

            await refreshProfileData(companyId, user.id);
            setIsEditingBasicInfo(false);
            setSuccessMsg("Profile updated successfully.");
        } catch (error) {
            setErrorMsg(getErrorMessage(error));
        } finally {
            setSavingBasicInfo(false);
        }
    }, [companyId, user?.id, fullNameInput, refreshProfileData]);

    const sendPasswordResetEmail = useCallback(async () => {
        if (!user?.email) return;

        setSendingPasswordEmail(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });

            if (error) throw error;

            setSuccessMsg("Password reset email sent.");
        } catch (error) {
            setErrorMsg(getErrorMessage(error));
        } finally {
            setSendingPasswordEmail(false);
        }
    }, [user?.email]);

    const signOut = useCallback(async () => {
        setSigningOut(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            router.replace("/auth");
        } catch (error) {
            setErrorMsg(getErrorMessage(error));
            setSigningOut(false);
        }
    }, [router]);

    useEffect(() => {
        if (authLoading || isLoadingCompany) return;

        if (!user || !companyId) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        (async () => {
            setLoading(true);
            setErrorMsg("");

            try {
                await refreshProfileData(companyId, user.id);
            } catch (error) {
                if (!cancelled) {
                    setErrorMsg(getErrorMessage(error));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [authLoading, isLoadingCompany, user?.id, companyId, refreshProfileData, user]);

    const workedTodayLabel = useMemo(() => {
        return formatDurationHHMMSS(todaySummary?.totalSeconds ?? 0);
    }, [todaySummary]);

    const workedWeekLabel = useMemo(() => {
        return formatDurationHHMMSS(weekSummary?.totalSeconds ?? 0);
    }, [weekSummary]);

    const profileName =
        memberProfile?.full_name?.trim() ||
        user?.email?.split("@")[0] ||
        "Team member";

    return (
        <div style={pageStyle}>
            <header style={pageHeaderStyle}>
                <div style={eyebrowStyle}>My account</div>
                <h1 style={pageTitleStyle}>Profile</h1>
                <p style={pageDescriptionStyle}>
                    Manage your account information and current work status.
                </p>
            </header>

            {errorMsg ? (
                <div style={errorBannerStyle}>
                    <b>Error:</b> {errorMsg}
                </div>
            ) : null}

            {successMsg ? (
                <div style={successBannerStyle}>
                    {successMsg}
                </div>
            ) : null}

            <div style={contentGridStyle}>
                <section style={cardStyle}>
                    <div style={cardHeaderStyle}>
                        <div>
                            <div style={sectionTitleStyle}>Account overview</div>
                            <div style={sectionHintStyle}>Your basic profile information.</div>
                        </div>

                        {!loading && !isEditingBasicInfo ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSuccessMsg("");
                                    setErrorMsg("");
                                    setIsEditingBasicInfo(true);
                                    setFullNameInput(memberProfile?.full_name ?? "");
                                }}
                                style={secondaryButtonStyle}
                            >
                                Edit profile
                            </button>
                        ) : null}
                    </div>

                    {loading ? (
                        <div style={mutedTextStyle}>Loading profile...</div>
                    ) : isEditingBasicInfo ? (
                        <div style={editFormStyle}>
                            <label style={fieldLabelStyle}>
                                Full name
                                <input
                                    value={fullNameInput}
                                    onChange={(event) => setFullNameInput(event.target.value)}
                                    placeholder="Enter your full name"
                                    style={inputStyle}
                                />
                            </label>

                            <div style={formActionsStyle}>
                                <button
                                    type="button"
                                    onClick={saveBasicInfo}
                                    disabled={savingBasicInfo}
                                    style={{
                                        ...primaryButtonStyle,
                                        opacity: savingBasicInfo ? 0.7 : 1,
                                        cursor: savingBasicInfo ? "default" : "pointer",
                                    }}
                                >
                                    {savingBasicInfo ? "Saving..." : "Save"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditingBasicInfo(false);
                                        setFullNameInput(memberProfile?.full_name ?? "");
                                        setSuccessMsg("");
                                        setErrorMsg("");
                                    }}
                                    disabled={savingBasicInfo}
                                    style={secondaryButtonStyle}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <ProfileOverview
                            profileName={profileName}
                            email={user?.email ?? "—"}
                            role={humanRole(memberProfile?.role ?? myRole)}
                            companyName={companyName || "—"}
                        />
                    )}
                </section>

                <section style={cardStyle}>
                    <div style={sectionTitleStyle}>Work status</div>
                    <div style={sectionHintStyle}>Your current shift and recent work time.</div>

                    {loading ? (
                        <div style={{ ...mutedTextStyle, marginTop: 14 }}>
                            Loading work status...
                        </div>
                    ) : (
                        <div style={statusListStyle}>
                            <ProfileRow label="Active shift" value={openShift ? "Yes" : "No"} />
                            <ProfileRow label="Worked today" value={workedTodayLabel} />
                            <ProfileRow label="Worked this week" value={workedWeekLabel} />
                            <ProfileRow
                                label="Current status"
                                value={openShift ? "Checked in" : "Off shift"}
                            />
                        </div>
                    )}
                </section>

                <section style={cardStyle}>
                    <div style={sectionTitleStyle}>Account actions</div>
                    <div style={sectionHintStyle}>Security and session options.</div>

                    <div style={actionsListStyle}>
                        <button
                            type="button"
                            onClick={() => {
                                setSuccessMsg("");
                                setErrorMsg("");
                                setIsEditingBasicInfo(true);
                                setFullNameInput(memberProfile?.full_name ?? "");
                            }}
                            style={actionButtonStyle}
                        >
                            Edit profile
                        </button>

                        <button
                            type="button"
                            onClick={sendPasswordResetEmail}
                            disabled={sendingPasswordEmail || !user?.email}
                            style={{
                                ...actionButtonStyle,
                                opacity: sendingPasswordEmail ? 0.7 : 1,
                                cursor: sendingPasswordEmail ? "default" : "pointer",
                            }}
                        >
                            {sendingPasswordEmail ? "Sending..." : "Change password"}
                        </button>

                        <button
                            type="button"
                            onClick={signOut}
                            disabled={signingOut}
                            style={{
                                ...dangerButtonStyle,
                                opacity: signingOut ? 0.7 : 1,
                                cursor: signingOut ? "default" : "pointer",
                            }}
                        >
                            {signingOut ? "Signing out..." : "Sign out"}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}

function ProfileOverview({
    profileName,
    email,
    role,
    companyName,
}: {
    profileName: string;
    email: string;
    role: string;
    companyName: string;
}) {
    return (
        <div style={profileOverviewStyle}>
            <div style={avatarStyle}>
                {profileName.slice(0, 1).toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={profileNameStyle}>{profileName}</div>
                <div style={profileEmailStyle}>{email}</div>

                <div style={profileMetaStyle}>
                    <ProfileRow label="Role" value={role} />
                    <ProfileRow label="Company" value={companyName} />
                </div>
            </div>
        </div>
    );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={profileRowStyle}>
            <span style={profileRowLabelStyle}>{label}</span>
            <span style={profileRowValueStyle}>{value}</span>
        </div>
    );
}

const pageStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 860,
    margin: "0 auto",
    padding: "8px 0 32px",
};

const pageHeaderStyle: React.CSSProperties = {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: `1px solid ${MR_THEME.colors.border}`,
};

const eyebrowStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: MR_THEME.colors.textSecondary,
    marginBottom: 8,
};

const pageTitleStyle: React.CSSProperties = {
    fontSize: 34,
    lineHeight: 1.05,
    fontWeight: 900,
    letterSpacing: "-0.04em",
    color: MR_THEME.colors.textPrimary,
    margin: 0,
};

const pageDescriptionStyle: React.CSSProperties = {
    margin: "10px 0 0",
    fontSize: 15,
    color: MR_THEME.colors.textSecondary,
    lineHeight: 1.6,
    maxWidth: 620,
};

const contentGridStyle: React.CSSProperties = {
    display: "grid",
    gap: 14,
};

const cardStyle: React.CSSProperties = {
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: MR_THEME.radius.card,
    background: MR_THEME.colors.cardBg,
    padding: MR_THEME.layout.cardPadding,
    boxShadow: MR_THEME.shadows.cardSoft,
};

const cardHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 900,
    marginBottom: 4,
    color: MR_THEME.colors.textPrimary,
    letterSpacing: "-0.03em",
};

const sectionHintStyle: React.CSSProperties = {
    fontSize: 13,
    color: MR_THEME.colors.textSecondary,
    lineHeight: 1.5,
};

const mutedTextStyle: React.CSSProperties = {
    fontSize: 14,
    color: MR_THEME.colors.textSecondary,
};

const profileOverviewStyle: React.CSSProperties = {
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
};

const avatarStyle: React.CSSProperties = {
    width: 64,
    height: 64,
    borderRadius: 20,
    background: MR_THEME.colors.primarySoft,
    color: MR_THEME.colors.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
    fontWeight: 900,
    flexShrink: 0,
};

const profileNameStyle: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 900,
    color: MR_THEME.colors.textPrimary,
    marginBottom: 4,
    lineHeight: 1.15,
    letterSpacing: "-0.03em",
};

const profileEmailStyle: React.CSSProperties = {
    fontSize: 14,
    color: MR_THEME.colors.textSecondary,
    marginBottom: 14,
    wordBreak: "break-word",
};

const profileMetaStyle: React.CSSProperties = {
    display: "grid",
    gap: 0,
};

const profileRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "11px 0",
    borderBottom: `1px solid ${MR_THEME.colors.border}`,
};

const profileRowLabelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    color: MR_THEME.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
};

const profileRowValueStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 800,
    color: MR_THEME.colors.textPrimary,
    textAlign: "right",
    wordBreak: "break-word",
};

const statusListStyle: React.CSSProperties = {
    display: "grid",
    gap: 0,
    marginTop: 12,
};

const actionsListStyle: React.CSSProperties = {
    display: "grid",
    gap: 10,
    marginTop: 14,
};

const editFormStyle: React.CSSProperties = {
    display: "grid",
    gap: 16,
};

const fieldLabelStyle: React.CSSProperties = {
    display: "grid",
    gap: 6,
    fontSize: 13,
    color: MR_THEME.colors.textPrimary,
    fontWeight: 800,
    maxWidth: 460,
};

const inputStyle: React.CSSProperties = {
    padding: "11px 12px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    outline: "none",
    fontSize: 14,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
};

const formActionsStyle: React.CSSProperties = {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.primary}`,
    background: MR_THEME.colors.primary,
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
};

const secondaryButtonStyle: React.CSSProperties = {
    padding: "9px 12px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    cursor: "pointer",
    fontWeight: 800,
};

const actionButtonStyle: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    padding: "12px 14px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.border}`,
    background: MR_THEME.colors.cardBgSoft,
    color: MR_THEME.colors.textPrimary,
    cursor: "pointer",
    fontWeight: 800,
};

const dangerButtonStyle: React.CSSProperties = {
    ...actionButtonStyle,
    color: MR_THEME.colors.danger,
    background: "#fff7f7",
    border: `1px solid ${MR_THEME.colors.border}`,
};

const errorBannerStyle: React.CSSProperties = {
    marginBottom: 16,
    padding: 12,
    border: "1px solid #fecaca",
    background: "#fff5f5",
    borderRadius: MR_THEME.radius.control,
    color: "#991b1b",
    fontSize: 13,
};

const successBannerStyle: React.CSSProperties = {
    marginBottom: 16,
    padding: 12,
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    borderRadius: MR_THEME.radius.control,
    color: "#166534",
    fontSize: 13,
};