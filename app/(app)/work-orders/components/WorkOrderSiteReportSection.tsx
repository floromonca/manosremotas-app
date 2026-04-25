"use client";

import { MR_THEME } from "../../../../lib/theme";

type Props = {
    report: string | null | undefined;
    draft: string;
    saving: boolean;
    isTech: boolean;
    canEdit: boolean;
    onChangeDraft: (value: string) => void;
    onSave: () => void;
    lastSavedAt: number | null;
};

export default function WorkOrderSiteReportSection({
    report,
    draft,
    saving,
    isTech,
    canEdit,
    lastSavedAt,
    onChangeDraft,
    onSave,
}: Props) {
    const isUnchanged = draft === (report ?? "");

    return (
        <section
            style={{
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                background: MR_THEME.colors.cardBg,
                padding: MR_THEME.layout.cardPadding,
                boxShadow: MR_THEME.shadows.card,
            }}
        >
            <div style={{ display: "grid", gap: 10 }}>
                <div>
                    <div
                        style={{
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: MR_THEME.colors.textMuted,
                            fontWeight: 800,
                            marginBottom: 6,
                        }}
                    >
                        Site Report
                    </div>

                    <div
                        style={{
                            fontSize: 14,
                            color: MR_THEME.colors.textSecondary,
                            lineHeight: 1.5,
                        }}
                    >
                        Describe what happened on site, blockers, customer notes, or important observations.
                    </div>
                </div>

                {isTech ? (
                    <>
                        <textarea
                            value={draft}
                            onChange={(e) => onChangeDraft(e.target.value)}
                            rows={4}
                            disabled={!canEdit || saving}
                            placeholder="Example: Arrived on site but could not complete the work. Breaker panel is locked. Customer needs to provide access. See BEFORE photo."
                            style={{
                                width: "100%",
                                padding: 12,
                                borderRadius: MR_THEME.radius.control,
                                border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                background: canEdit ? MR_THEME.colors.cardBg : MR_THEME.colors.cardBgSoft,
                                color: MR_THEME.colors.textPrimary,
                                fontSize: 14,
                                lineHeight: 1.5,
                                resize: "vertical",
                                minHeight: 110,
                            }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: MR_THEME.colors.textMuted,
                                    fontWeight: 700,
                                }}
                            >
                                {lastSavedAt && !saving ? "Saved ✓" : ""}
                            </div>

                            <button
                                type="button"
                                onClick={onSave}
                                disabled={!canEdit || saving || isUnchanged}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: MR_THEME.radius.control,
                                    border: `1px solid ${!canEdit || saving || isUnchanged
                                            ? MR_THEME.colors.borderStrong
                                            : MR_THEME.colors.primary
                                        }`,
                                    background:
                                        !canEdit || saving || isUnchanged
                                            ? MR_THEME.colors.cardBgSoft
                                            : MR_THEME.colors.primary,
                                    color:
                                        !canEdit || saving || isUnchanged
                                            ? MR_THEME.colors.textMuted
                                            : "#ffffff",
                                    fontWeight: 900,
                                    cursor: !canEdit || saving || isUnchanged ? "not-allowed" : "pointer",
                                    opacity: 1,
                                }}
                            >
                                {saving ? "Saving..." : "Save report"}
                            </button>
                        </div>
                    </>
                ) : (
                    <div
                        style={{
                            padding: 12,
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.border}`,
                            background: MR_THEME.colors.cardBgSoft,
                            color: report?.trim()
                                ? MR_THEME.colors.textPrimary
                                : MR_THEME.colors.textSecondary,
                            fontSize: 14,
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {report?.trim() || "No site report yet."}
                    </div>
                )}
            </div>
        </section >
    );
}