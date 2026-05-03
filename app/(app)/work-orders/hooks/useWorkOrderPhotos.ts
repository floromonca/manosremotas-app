import { useCallback, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

export type WorkOrderPhotoCategory = "before" | "during" | "after";

export type WorkOrderPhoto = {
    photo_id: string;
    category: WorkOrderPhotoCategory;
    file_url: string;
    created_at?: string | null;
    uploaded_by?: string | null;
};

type UseWorkOrderPhotosParams = {
    workOrderId: string;
    activeCompanyId: string | null;
    userId: string | null;
};

export function useWorkOrderPhotos({
    workOrderId,
    activeCompanyId,
    userId,
}: UseWorkOrderPhotosParams) {
    const [photos, setPhotos] = useState<WorkOrderPhoto[]>([]);
    const [activePhotoTab, setActivePhotoTab] = useState<WorkOrderPhotoCategory>("before");
    const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchEndX, setTouchEndX] = useState<number | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);

    const selectedPhoto = useMemo(
        () => (selectedPhotoId ? photos.find((p) => p.photo_id === selectedPhotoId) ?? null : null),
        [photos, selectedPhotoId]
    );

    const selectedPhotoGroup = useMemo(
        () =>
            selectedPhoto
                ? photos.filter((p) => p.category === selectedPhoto.category)
                : [],
        [photos, selectedPhoto]
    );

    const selectedPhotoIndex = useMemo(
        () =>
            selectedPhoto
                ? selectedPhotoGroup.findIndex((p) => p.photo_id === selectedPhoto.photo_id)
                : -1,
        [selectedPhoto, selectedPhotoGroup]
    );

    const closePhotoPreview = useCallback(() => {
        setSelectedPhotoId(null);
    }, []);

    const showPreviousPhoto = useCallback(() => {
        if (!selectedPhoto || selectedPhotoGroup.length <= 1) return;

        const prevIndex =
            selectedPhotoIndex <= 0 ? selectedPhotoGroup.length - 1 : selectedPhotoIndex - 1;

        setSelectedPhotoId(selectedPhotoGroup[prevIndex].photo_id);
    }, [selectedPhoto, selectedPhotoGroup, selectedPhotoIndex]);

    const showNextPhoto = useCallback(() => {
        if (!selectedPhoto || selectedPhotoGroup.length <= 1) return;

        const nextIndex =
            selectedPhotoIndex >= selectedPhotoGroup.length - 1 ? 0 : selectedPhotoIndex + 1;

        setSelectedPhotoId(selectedPhotoGroup[nextIndex].photo_id);
    }, [selectedPhoto, selectedPhotoGroup, selectedPhotoIndex]);

    const handlePhotoTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        setTouchEndX(null);
        setTouchStartX(e.targetTouches[0]?.clientX ?? null);
    }, []);

    const handlePhotoTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        setTouchEndX(e.targetTouches[0]?.clientX ?? null);
    }, []);

    const handlePhotoTouchEnd = useCallback(() => {
        if (touchStartX === null || touchEndX === null) return;

        const distance = touchStartX - touchEndX;
        const minSwipeDistance = 50;

        if (Math.abs(distance) < minSwipeDistance) {
            setTouchStartX(null);
            setTouchEndX(null);
            return;
        }

        if (distance > 0) {
            showNextPhoto();
        } else {
            showPreviousPhoto();
        }

        setTouchStartX(null);
        setTouchEndX(null);
    }, [touchStartX, touchEndX, showNextPhoto, showPreviousPhoto]);

    const loadPhotos = useCallback(async () => {
        if (!workOrderId) return [] as WorkOrderPhoto[];

        const { data, error } = await supabase
            .from("work_order_photos")
            .select("photo_id, category, file_url, created_at, uploaded_by")
            .eq("work_order_id", workOrderId)
            .order("created_at", { ascending: true });

        if (error) throw error;
        return (data ?? []) as WorkOrderPhoto[];
    }, [workOrderId]);

    const refreshPhotos = useCallback(async () => {
        const photoRows = await loadPhotos();
        setPhotos(photoRows);
        return photoRows;
    }, [loadPhotos]);

    const handlePhotoUpload = useCallback(
        async (file: File | null, category: WorkOrderPhotoCategory) => {
            try {
                if (!file || !workOrderId || !activeCompanyId || !userId) return;

                const { count, error: countError } = await supabase
                    .from("work_order_photos")
                    .select("*", { count: "exact", head: true })
                    .eq("company_id", activeCompanyId)
                    .eq("work_order_id", workOrderId);

                if (countError) throw countError;

                if ((count ?? 0) >= 6) {
                    setPhotoError("Maximum 6 photos per work order.");
                    return;
                }

                setUploadingPhoto(true);
                setPhotoError(null);

                const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
                const safeRandomId =
                    typeof window !== "undefined" &&
                        window.crypto &&
                        typeof window.crypto.randomUUID === "function"
                        ? window.crypto.randomUUID()
                        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

                const fileName = `${safeRandomId}.${ext}`;
                const filePath = `${activeCompanyId}/${workOrderId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from("work-order-photos")
                    .upload(filePath, file, {
                        upsert: false,
                    });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from("work-order-photos")
                    .getPublicUrl(filePath);

                const publicUrl = publicUrlData.publicUrl;

                const { error: insertError } = await supabase
                    .from("work_order_photos")
                    .insert({
                        company_id: activeCompanyId,
                        work_order_id: workOrderId,
                        uploaded_by: userId,
                        category,
                        file_url: publicUrl,
                    });

                if (insertError) throw insertError;

                await refreshPhotos();
            } catch (err: unknown) {
                console.error("PHOTO UPLOAD FAILED", err);
                setPhotoError(err instanceof Error ? err.message : "Could not upload photo.");
            } finally {
                setUploadingPhoto(false);
            }
        },
        [workOrderId, activeCompanyId, userId, refreshPhotos]
    );

    const handleDeletePhoto = useCallback(
        async (photo: WorkOrderPhoto) => {
            try {
                if (!photo?.photo_id || !activeCompanyId || !workOrderId) return;

                setPhotoError(null);

                const fileUrl = String(photo.file_url ?? "");
                const marker = "/storage/v1/object/public/work-order-photos/";
                const markerIndex = fileUrl.indexOf(marker);

                if (markerIndex >= 0) {
                    const filePath = fileUrl.slice(markerIndex + marker.length);

                    const { error: storageError } = await supabase.storage
                        .from("work-order-photos")
                        .remove([filePath]);

                    if (storageError) throw storageError;
                }

                const { error: deleteError } = await supabase
                    .from("work_order_photos")
                    .delete()
                    .eq("company_id", activeCompanyId)
                    .eq("work_order_id", workOrderId)
                    .eq("photo_id", photo.photo_id);

                if (deleteError) throw deleteError;

                await refreshPhotos();
            } catch (err: unknown) {
                console.error("PHOTO DELETE FAILED", err);
                setPhotoError(err instanceof Error ? err.message : "Could not delete photo.");
            }
        },
        [activeCompanyId, workOrderId, refreshPhotos]
    );

    return {
        photos,
        setPhotos,
        activePhotoTab,
        setActivePhotoTab,
        selectedPhotoId,
        setSelectedPhotoId,
        selectedPhoto,
        selectedPhotoGroup,
        selectedPhotoIndex,
        uploadingPhoto,
        photoError,
        setPhotoError,
        loadPhotos,
        refreshPhotos,
        handlePhotoUpload,
        handleDeletePhoto,
        closePhotoPreview,
        showPreviousPhoto,
        showNextPhoto,
        handlePhotoTouchStart,
        handlePhotoTouchMove,
        handlePhotoTouchEnd,
    };
}