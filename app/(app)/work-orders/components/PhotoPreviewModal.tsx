"use client";

import React from "react";
import Image from "next/image";
import { MR_THEME } from "../../../../lib/theme";

type WorkOrderPhoto = {
    photo_id: string;
    category?: string | null;
    file_url: string;
};

type Props = {
    selectedPhoto: WorkOrderPhoto | null;
    selectedPhotoGroup: WorkOrderPhoto[];
    selectedPhotoIndex: number;
    onClose: () => void;
    onPrevious: () => void;
    onNext: () => void;
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
    onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
    onTouchEnd: () => void;
};

export default function PhotoPreviewModal({
    selectedPhoto,
    selectedPhotoGroup,
    selectedPhotoIndex,
    onClose,
    onPrevious,
    onNext,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
}: Props) {
    if (!selectedPhoto) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.82)",
                zIndex: 2000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "100%",
                    maxWidth: 760,
                    maxHeight: "92vh",
                    borderRadius: 16,
                    overflow: "hidden",
                    background: MR_THEME.colors.cardBg,
                    border: `1px solid ${MR_THEME.colors.border}`,
                    boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "12px 14px",
                        borderBottom: `1px solid ${MR_THEME.colors.border}`,
                        background: MR_THEME.colors.cardBgSoft,
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 800,
                                letterSpacing: 0.4,
                                textTransform: "uppercase",
                                color: MR_THEME.colors.textMuted,
                                marginBottom: 4,
                            }}
                        >
                            Photo Evidence
                        </div>
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 800,
                                color: MR_THEME.colors.textPrimary,
                            }}
                        >
                            {selectedPhoto.category
                                ? `${selectedPhoto.category.charAt(0).toUpperCase()}${selectedPhoto.category.slice(1)}`
                                : "Photo"}
                            {selectedPhotoGroup.length > 0 && selectedPhotoIndex >= 0
                                ? ` • ${selectedPhotoIndex + 1} of ${selectedPhotoGroup.length}`
                                : ""}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            border: `1px solid ${MR_THEME.colors.border}`,
                            background: "#fff",
                            color: MR_THEME.colors.textPrimary,
                            borderRadius: 999,
                            padding: "8px 12px",
                            fontSize: 13,
                            fontWeight: 800,
                            cursor: "pointer",
                        }}
                    >
                        Close
                    </button>
                </div>

                <div
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    style={{
                        position: "relative",
                        background: "#0f172a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "70vh",
                        padding: 12,
                        touchAction: "pan-y",
                        userSelect: "none",
                    }}
                >
                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            height: "100%",
                            maxWidth: "100%",
                            maxHeight: "68vh",
                        }}
                    >
                        <Image
                            src={selectedPhoto.file_url}
                            alt="Photo preview"
                            fill
                            unoptimized
                            style={{
                                objectFit: "contain",
                                borderRadius: 14,
                                border: "1px solid rgba(255,255,255,0.08)",
                                background: "transparent",
                            }}
                        />
                    </div>

                    {selectedPhotoGroup.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={onPrevious}
                                style={{
                                    position: "absolute",
                                    left: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    width: 42,
                                    height: 42,
                                    borderRadius: "50%",
                                    border: "none",
                                    background: "rgba(255,255,255,0.92)",
                                    color: "#0f172a",
                                    fontSize: 22,
                                    fontWeight: 900,
                                    cursor: "pointer",
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
                                }}
                            >
                                ‹
                            </button>

                            <button
                                type="button"
                                onClick={onNext}
                                style={{
                                    position: "absolute",
                                    right: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    width: 42,
                                    height: 42,
                                    borderRadius: "50%",
                                    border: "none",
                                    background: "rgba(255,255,255,0.92)",
                                    color: "#0f172a",
                                    fontSize: 22,
                                    fontWeight: 900,
                                    cursor: "pointer",
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
                                }}
                            >
                                ›
                            </button>
                        </>
                    )}
                </div>

                {selectedPhotoGroup.length > 1 && (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                            padding: "12px 14px",
                            borderTop: `1px solid ${MR_THEME.colors.border}`,
                            background: "#fff",
                        }}
                    >
                        <button
                            type="button"
                            onClick={onPrevious}
                            style={{
                                flex: 1,
                                border: `1px solid ${MR_THEME.colors.border}`,
                                background: "#fff",
                                color: MR_THEME.colors.textPrimary,
                                borderRadius: 999,
                                padding: "10px 12px",
                                fontSize: 13,
                                fontWeight: 800,
                                cursor: "pointer",
                            }}
                        >
                            Previous
                        </button>

                        <button
                            type="button"
                            onClick={onNext}
                            style={{
                                flex: 1,
                                border: "none",
                                background: MR_THEME.colors.primary,
                                color: "#fff",
                                borderRadius: 999,
                                padding: "10px 12px",
                                fontSize: 13,
                                fontWeight: 800,
                                cursor: "pointer",
                            }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}