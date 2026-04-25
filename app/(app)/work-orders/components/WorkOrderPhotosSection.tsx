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

function AddPhotoButton({
    disabled,
    category,
    onUploadPhoto,
}: {
    disabled: boolean;
    category: PhotoCategory;
    onUploadPhoto: (file: File | null, category: PhotoCategory) => void;
}) {
    return (
        <label
            onMouseEnter={(e) => {
                if (disabled) return;
                e.currentTarget.style.background = MR_THEME.colors.primary;
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.border = `1px solid ${MR_THEME.colors.primary}`;
            }}
            onMouseLeave={(e) => {
                if (disabled) return;
                e.currentTarget.style.background = MR_THEME.colors.primarySoft;
                e.currentTarget.style.color = MR_THEME.colors.primaryHover;
                e.currentTarget.style.border = `1px dashed ${MR_THEME.colors.primary}`;
            }}
            style={{
                padding: `${MR_THEME.spacing.lg}px ${MR_THEME.spacing.md}px`,
                minHeight: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: MR_THEME.radius.control,
                border: `1px dashed ${MR_THEME.colors.primary}`,
                background: MR_THEME.colors.primarySoft,
                fontWeight: 900,
                fontSize: 13,
                lineHeight: 1.2,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                width: "100%",
                boxSizing: "border-box",
                textAlign: "center",
                color: MR_THEME.colors.primaryHover,
                transition: "all 0.15s ease",
            }}
        >
            + Add {category.toUpperCase()} photo
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
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
                marginTop: 6,
            }}
        >
            {photos.map((photo) => (
                <div
                    key={photo.photo_id}
                    style={{
                        position: "relative",
                        borderRadius: 12,
                        overflow: "hidden",
                        boxShadow: MR_THEME.shadows.cardSoft,
                    }}
                >
                    <div
                        onClick={() => onOpenPhoto(photo.photo_id)}
                        style={{
                            position: "relative",
                            width: "100%",
                            height: 120,
                            borderRadius: 12,
                            overflow: "hidden",
                            border: `1px solid ${MR_THEME.colors.border}`,
                            background: MR_THEME.colors.cardBg,
                            cursor: "pointer",
                        }}
                    >
                        <Image
                            src={photo.file_url}
                            alt="Photo evidence"
                            fill
                            unoptimized
                            style={{
                                objectFit: "cover",
                            }}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeletePhoto(photo);
                        }}
                        style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            border: "none",
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
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
    const afterCount = getCategoryPhotos(photos, "after").length;
    const activePhotos = getCategoryPhotos(photos, activePhotoTab);

    return (
        <div
            style={{
                marginTop: 0,
                padding: 10,
                borderRadius: MR_THEME.radius.card,
                border: `1px solid ${MR_THEME.colors.border}`,
                background: MR_THEME.colors.cardBg,
                boxShadow: MR_THEME.shadows.card,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 10,
                    flexWrap: "wrap",
                }}
            >
                <div
                    style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                        color: MR_THEME.colors.textSecondary,
                        fontWeight: 700,
                    }}
                >
                    Photo Evidence
                </div>

                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: limitReached ? MR_THEME.colors.danger : MR_THEME.colors.textSecondary,
                        background: limitReached ? "#fee2e2" : MR_THEME.colors.cardBgSoft,
                        border: limitReached
                            ? "1px solid #fecaca"
                            : `1px solid ${MR_THEME.colors.border}`,
                        borderRadius: 999,
                        padding: "4px 8px",
                        lineHeight: 1.2,
                    }}
                >
                    {totalPhotos} / 6 photos
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 8,
                }}
            >
                {PHOTO_TABS.map((tab) => {
                    const isActive = activePhotoTab === tab;
                    const count = getCategoryPhotos(photos, tab).length;

                    return (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActivePhotoTab(tab)}
                            style={{
                                padding: "8px 12px",
                                borderRadius: MR_THEME.radius.pill,
                                border: isActive
                                    ? `2px solid ${MR_THEME.colors.primary}`
                                    : `1px solid ${MR_THEME.colors.border}`,
                                background: isActive ? MR_THEME.colors.primarySoft : MR_THEME.colors.cardBg,
                                color: isActive ? MR_THEME.colors.primary : MR_THEME.colors.textSecondary,
                                fontSize: 12,
                                fontWeight: isActive ? 900 : 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                boxShadow: isActive ? MR_THEME.shadows.cardSoft : "none",
                                transform: isActive ? "scale(1.05)" : "scale(1)",
                                transition: "all 0.15s ease",
                            }}
                        >
                            <span style={{ textTransform: "capitalize" }}>{tab}</span>
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minWidth: 20,
                                    height: 20,
                                    padding: "0 6px",
                                    borderRadius: MR_THEME.radius.pill,
                                    background: isActive ? MR_THEME.colors.primary : MR_THEME.colors.cardBgSoft,
                                    color: isActive ? "#ffffff" : MR_THEME.colors.textSecondary,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    lineHeight: 1,
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
                        marginBottom: 10,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#b91c1c",
                        background: "#fee2e2",
                        border: "1px solid #fecaca",
                        borderRadius: 8,
                        padding: "6px 10px",
                        display: "inline-block",
                    }}
                >
                    Photo limit reached for this work order.
                </div>
            ) : null}

            {(beforeCount === 0 || afterCount === 0) && (
                <div
                    style={{
                        marginBottom: 8,
                        padding: "6px 8px",
                        borderRadius: 8,
                        background: "#fff7ed",
                        border: "1px solid #fed7aa",
                        color: "#9a3412",
                        fontSize: 11,
                        fontWeight: 700,
                    }}
                >
                    You must add at least 1 before and 1 after photo.
                </div>
            )}

            <div style={{ display: "grid", gap: 12 }}>
                <div
                    style={{
                        padding: "12px 12px",
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

                    <PhotoGrid
                        photos={activePhotos}
                        onDeletePhoto={onDeletePhoto}
                        onOpenPhoto={onOpenPhoto}
                    />
                </div>

                <div
                    style={{
                        ...MR_THEME.typography.small,
                        color: MR_THEME.colors.textMuted,
                        lineHeight: 1.3,
                        wordBreak: "break-word",
                    }}
                >
                    Max 6 photos. Add at least 1 before and 1 after.
                </div>
            </div>
        </div>
    );
}