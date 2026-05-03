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
    const cleanReport = report?.trim() ?? "";
    const isUnchanged = draft === (report ?? "");
    const isDisabled = !canEdit || saving || isUnchanged;

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
            <div style={{ display: "grid", gap: 14 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                    }}
                >
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
                                lineHeight: 1.55,
                            }}
                        >
                            Add notes about what was done, issues on site, or customer comments.
                        </div>
                    </div>

                    {lastSavedAt && !saving ? (
                        <div
                            style={{
                                flexShrink: 0,
                                padding: "6px 10px",
                                borderRadius: 999,
                                background: MR_THEME.colors.cardBgSoft,
                                border: `1px solid ${MR_THEME.colors.border}`,
                                color: MR_THEME.colors.textSecondary,
                                fontSize: 12,
                                fontWeight: 800,
                            }}
                        >
                            Saved
                        </div>
                    ) : null}
                </div>

                {isTech ? (
                    <div style={{ display: "grid", gap: 10 }}>
                        <textarea
                            value={draft}
                            onChange={(e) => onChangeDraft(e.target.value)}
                            rows={4}
                            disabled={!canEdit || saving}
                            placeholder="Describe what was done, issues, or customer feedback..."
                            style={{
                                width: "100%",
                                padding: "14px 14px",
                                borderRadius: MR_THEME.radius.control,
                                border: `1px solid ${MR_THEME.colors.border}`,
                                background: canEdit ? MR_THEME.colors.cardBg : MR_THEME.colors.cardBgSoft,
                                color: MR_THEME.colors.textPrimary,
                                fontSize: 15,
                                lineHeight: 1.55,
                                resize: "vertical",
                                minHeight: 120,
                                outline: "none",
                                boxSizing: "border-box",
                            }}
                        />

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 12,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 12,
                                    color: MR_THEME.colors.textMuted,
                                    fontWeight: 700,
                                }}
                            >
                                {!canEdit
                                    ? "Start your shift and open the assigned work order to add notes."
                                    : isUnchanged
                                        ? "No changes yet."
                                        : "You have unsaved changes."}
                            </div>

                            <button
                                type="button"
                                onClick={onSave}
                                disabled={isDisabled}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: MR_THEME.radius.control,
                                    border: `1px solid ${isDisabled ? MR_THEME.colors.borderStrong : MR_THEME.colors.primary}`,
                                    background: isDisabled ? MR_THEME.colors.cardBgSoft : MR_THEME.colors.primary,
                                    color: isDisabled ? MR_THEME.colors.textMuted : "#ffffff",
                                    fontWeight: 900,
                                    cursor: isDisabled ? "not-allowed" : "pointer",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {saving ? "Saving..." : "Save report"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div
                        style={{
                            padding: "14px 14px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.border}`,
                            background: cleanReport ? MR_THEME.colors.cardBg : MR_THEME.colors.cardBgSoft,
                            color: cleanReport ? MR_THEME.colors.textPrimary : MR_THEME.colors.textSecondary,
                            fontSize: 15,
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {cleanReport || "No report yet. Add details from the job."}
                    </div>
                )}
            </div>
        </section>
    );
}