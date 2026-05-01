export function formatDateTime(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString();
}

export function formatShortDate(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-CA", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });
}

export function formatDateInput(value: string | null | undefined) {
    if (!value) return "—";
    return String(value).slice(0, 10);
}

export function formatTime(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatHours(value: number | null | undefined) {
    const amount = Number(value ?? 0);
    return `${amount.toFixed(2)} h`;
}

export function formatMoney(
    value: number | null | undefined,
    currencyCode: string | null | undefined
) {
    const amount = Number(value ?? 0);
    const currency = currencyCode?.trim() || "CAD";

    try {
        return new Intl.NumberFormat("en-CA", {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

export function humanRole(role: string | null | undefined) {
    if (!role) return "—";
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    if (role === "tech") return "Technician";
    if (role === "viewer") return "Viewer";
    return role;
}

export function isOvernightShift(checkInAt: string | null, checkOutAt: string | null) {
    if (!checkInAt || !checkOutAt) return false;

    const checkIn = new Date(checkInAt);
    const checkOut = new Date(checkOutAt);

    return checkIn.toDateString() !== checkOut.toDateString();
}
