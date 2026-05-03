"use client";

import React from "react";
import Image from "next/image";
import { MR_THEME } from "../../../../lib/theme";

type PhotoCategory = "before" | "during" | "after";

type WorkOrderPhoto = {
    photo_id: string;
    category: PhotoCategory;
    file_url: string;
    created_at?: string | null;
    uploaded_by?: string | null;
};

type Props = {
    photos: WorkOrderPhoto[];
    activePhotoTab: PhotoCategory;
    setActivePhotoTab: (tab: PhotoCategory) => void;
    onUploadPhoto: (file: File | null, category: PhotoCategory) => void;
    onDeletePhoto: (photo: WorkOrderPhoto) => void;
    onOpenPhoto: (photoId: string) => void;
};

const PHOTO_TABS: PhotoCategory[] = ["before", "during", "after"];

function getCategoryPhotos(photos: WorkOrderPhoto[], category: PhotoCategory) {
    return photos.filter((p) => p.category === category);
}

function formatCategory(category: PhotoCategory) {
    return category.charAt(0).toUpperCase() + category.slice(1);
}

function AddPhotoButton({
    disabled,
    category,
    onUploadPhoto,
}: {
    disabled: boolean;
    category: PhotoCategory;
    onUploadPhoto: (file: File | null, category: PhotoCategory) => void;
}) {
    const categoryLabel = formatCategory(category);

    return (
        <label
            onMouseEnter={(e) => {
                if (disabled) return;
                e.currentTarget.style.background = MR_THEME.colors.primary;
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.border = `1px solid ${MR_THEME.colors.primary}`;
            }}
            onMouseLeave={(e) => {
                if (disabled) return;
                e.currentTarget.style.background = MR_THEME.colors.primarySoft;
                e.currentTarget.style.color = MR_THEME.colors.primaryHover;
                e.currentTarget.style.border = `1px dashed ${MR_THEME.colors.primary}`;
            }}
            style={{
                padding: "14px 16px",
                minHeight: 52,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: MR_THEME.radius.control,
                border: disabled
                    ? `1px solid ${MR_THEME.colors.border}`
                    : `1px dashed ${MR_THEME.colors.primary}`,
                background: disabled
                    ? MR_THEME.colors.cardBgSoft
                    : MR_THEME.colors.primarySoft,
                color: disabled
                    ? MR_THEME.colors.textMuted
                    : MR_THEME.colors.primaryHover,
                fontWeight: 900,
                fontSize: 14,
                lineHeight: 1.25,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.75 : 1,
                width: "100%",
                boxSizing: "border-box",
                textAlign: "center",
                transition: "all 0.15s ease",
            }}
        >
            + Add {categoryLabel} photo
            <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={disabled}
                style={{ display: "none" }}
                onChange={(e) => onUploadPhoto(e.target.files?.[0] ?? null, category)}
            />
        </label>
    );
}

function PhotoGrid({
    photos,
    onDeletePhoto,
    onOpenPhoto,
}: {
    photos: WorkOrderPhoto[];
    onDeletePhoto: (photo: WorkOrderPhoto) => void;
    onOpenPhoto: (photoId: string) => void;
}) {
    if (photos.length === 0) return null;

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
                marginTop: 12,
            }}
        >
            {photos.map((photo) => (
                <div
                    key={photo.photo_id}
                    style={{
                        position: "relative",
                        borderRadius: MR_THEME.radius.control,
                        overflow: "hidden",
                        boxShadow: MR_THEME.shadows.cardSoft,
                        background: MR_THEME.colors.cardBg,
                    }}
                >
                    <button
                        type="button"
                        onClick={() => onOpenPhoto(photo.photo_id)}
                        style={{
                            position: "relative",
                            width: "100%",
                            height: 128,
                            borderRadius: MR_THEME.radius.control,
                            overflow: "hidden",
                            border: `1px solid ${MR_THEME.colors.border}`,
                            background: MR_THEME.colors.cardBgSoft,
                            cursor: "pointer",
                            padding: 0,
                            display: "block",
                        }}
                    >
                        <Image
                            src={photo.file_url}
                            alt="Work order photo evidence"
                            fill
                            unoptimized
                            style={{
                                objectFit: "cover",
                            }}
                        />
                    </button>

                    <button
                        type="button"
                        aria-label="Delete photo"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeletePhoto(photo);
                        }}
                        style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            width: 28,
                            height: 28,
                            borderRadius: 999,
                            border: "none",
                            background: "rgba(15, 23, 42, 0.75)",
                            color: "#ffffff",
                            fontSize: 16,
                            fontWeight: 900,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                            boxShadow: "0 6px 14px rgba(15, 23, 42, 0.18)",
                        }}
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}

export default function WorkOrderPhotosSection({
    photos,
    activePhotoTab,
    setActivePhotoTab,
    onUploadPhoto,
    onDeletePhoto,
    onOpenPhoto,
}: Props) {
    const totalPhotos = photos.length;
    const limitReached = totalPhotos >= 6;

    const beforeCount = getCategoryPhotos(photos, "before").length;
    const duringCount = getCategoryPhotos(photos, "during").length;
    const afterCount = getCategoryPhotos(photos, "after").length;

    const activePhotos = getCategoryPhotos(photos, activePhotoTab);
    const activeLabel = formatCategory(activePhotoTab);

    const missingBeforeOrAfter = beforeCount === 0 || afterCount === 0;

    const tabCounts: Record<PhotoCategory, number> = {
        before: beforeCount,
        during: duringCount,
        after: afterCount,
    };

    return (
        <section
            style={{
                padding: MR_THEME.layout.cardPadding,
                borderRadius: MR_THEME.radius.card,
                border: `1px solid ${MR_THEME.colors.border}`,
                background: MR_THEME.colors.cardBg,
                boxShadow: MR_THEME.shadows.card,
            }}
        >
            <div style={{ display: "grid", gap: 14 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
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
                                marginBottom: 4,
                            }}
                        >
                            Photo Evidence
                        </div>

                        <div
                            style={{
                                fontSize: 14,
                                color: MR_THEME.colors.textSecondary,
                                lineHeight: 1.45,
                            }}
                        >
                            Add before, progress, and after photos from the job.
                        </div>
                    </div>

                    <div
                        style={{
                            flexShrink: 0,
                            fontSize: 13,
                            fontWeight: 900,
                            color: limitReached ? MR_THEME.colors.danger : MR_THEME.colors.textSecondary,
                            background: limitReached ? "#fee2e2" : MR_THEME.colors.cardBgSoft,
                            border: limitReached
                                ? "1px solid #fecaca"
                                : `1px solid ${MR_THEME.colors.border}`,
                            borderRadius: 999,
                            padding: "7px 11px",
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {totalPhotos} / 6 photos
                    </div>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 8,
                    }}
                >
                    {PHOTO_TABS.map((tab) => {
                        const isActive = activePhotoTab === tab;
                        const count = tabCounts[tab];

                        return (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActivePhotoTab(tab)}
                                style={{
                                    padding: "10px 10px",
                                    borderRadius: MR_THEME.radius.pill,
                                    border: isActive
                                        ? `2px solid ${MR_THEME.colors.primary}`
                                        : `1px solid ${MR_THEME.colors.border}`,
                                    background: isActive ? MR_THEME.colors.primarySoft : MR_THEME.colors.cardBg,
                                    color: isActive ? MR_THEME.colors.primary : MR_THEME.colors.textSecondary,
                                    fontSize: 14,
                                    fontWeight: isActive ? 900 : 800,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                    boxShadow: isActive ? MR_THEME.shadows.cardSoft : "none",
                                    transition: "all 0.15s ease",
                                    minWidth: 0,
                                }}
                            >
                                <span
                                    style={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {formatCategory(tab)}
                                </span>

                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        minWidth: 22,
                                        height: 22,
                                        padding: "0 7px",
                                        borderRadius: MR_THEME.radius.pill,
                                        background: isActive ? MR_THEME.colors.primary : MR_THEME.colors.cardBgSoft,
                                        color: isActive ? "#ffffff" : MR_THEME.colors.textSecondary,
                                        fontSize: 12,
                                        fontWeight: 900,
                                        lineHeight: 1,
                                        flexShrink: 0,
                                    }}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {limitReached ? (
                    <div
                        style={{
                            padding: "10px 12px",
                            borderRadius: MR_THEME.radius.control,
                            background: "#fee2e2",
                            border: "1px solid #fecaca",
                            color: "#b91c1c",
                            fontSize: 13,
                            fontWeight: 800,
                            lineHeight: 1.4,
                        }}
                    >
                        Photo limit reached.
                    </div>
                ) : missingBeforeOrAfter ? (
                    <div
                        style={{
                            padding: "10px 12px",
                            borderRadius: MR_THEME.radius.control,
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            color: "#9a3412",
                            fontSize: 13,
                            fontWeight: 800,
                            lineHeight: 1.4,
                        }}
                    >
                        Add at least 1 Before photo and 1 After photo.
                    </div>
                ) : null}

                <div
                    style={{
                        padding: 12,
                        borderRadius: MR_THEME.radius.control,
                        border: `1px solid ${MR_THEME.colors.border}`,
                        background: MR_THEME.colors.cardBgSoft,
                    }}
                >
                    <AddPhotoButton
                        disabled={limitReached}
                        category={activePhotoTab}
                        onUploadPhoto={onUploadPhoto}
                    />

                    {activePhotos.length === 0 ? (
                        <div
                            style={{
                                marginTop: 12,
                                padding: "14px 12px",
                                borderRadius: MR_THEME.radius.control,
                                border: `1px solid ${MR_THEME.colors.border}`,
                                background: MR_THEME.colors.cardBg,
                                color: MR_THEME.colors.textSecondary,
                                fontSize: 14,
                                fontWeight: 700,
                                lineHeight: 1.4,
                                textAlign: "center",
                            }}
                        >
                            No {activeLabel.toLowerCase()} photos yet.
                        </div>
                    ) : (
                        <PhotoGrid
                            photos={activePhotos}
                            onDeletePhoto={onDeletePhoto}
                            onOpenPhoto={onOpenPhoto}
                        />
                    )}
                </div>

                <div
                    style={{
                        fontSize: 12,
                        color: MR_THEME.colors.textMuted,
                        fontWeight: 700,
                        lineHeight: 1.35,
                    }}
                >
                 Before and After photos are required.
                </div>
            </div>
        </section>
    );
}