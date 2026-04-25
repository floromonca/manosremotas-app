export const MR_THEME = {
    brand: {
        name: "ManosRemotas",
        tagline: "Field Service Operations Software",
    },

    colors: {
        primary: "#2563eb",
        primaryHover: "#1d4ed8",
        primarySoft: "#dbeafe",
        primarySurface: "#e0ecff",

        appBg: "#f8fafc",
        cardBg: "#ffffff",
        cardBgSoft: "#f1f5f9",

        border: "#e2e8f0",
        borderStrong: "#cbd5e1",

        textPrimary: "#0f172a",
        textSecondary: "#475569",
        textMuted: "#94a3b8",

        success: "#16a34a",
        warning: "#f59e0b",
        danger: "#dc2626",
        info: "#0ea5e9",
    },

    typography: {
        fontFamily: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,

        pageTitle: {
            fontSize: 24,
            fontWeight: 800,
            lineHeight: 1.2,
        },

        sectionTitle: {
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.3,
        },

        cardTitle: {
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.35,
        },

        body: {
            fontSize: 14,
            fontWeight: 400,
            lineHeight: 1.5,
        },

        small: {
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.4,
        },
    },

    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        xxl: 32,
    },

    radius: {
        control: 10,
        card: 14,
        modal: 18,
        pill: 999,
    },

    shadows: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04)",
        cardSoft: "0 4px 12px rgba(16, 24, 40, 0.06)",
        dropdown: "0 8px 24px rgba(16, 24, 40, 0.10)",
    },

    layout: {
        pageMaxWidth: 1180,
        pagePadding: "28px 24px 40px",
        sectionGap: 16,
        cardPadding: 16,
        compactCardPadding: 10,
    },

    components: {
        button: {
            height: 40,
            paddingX: 14,
            fontSize: 14,
            fontWeight: 700,
        },

        input: {
            height: 40,
            paddingX: 12,
            fontSize: 14,
        },

        badge: {
            height: 24,
            paddingX: 10,
            fontSize: 12,
            fontWeight: 700,
        },
    },
} as const;

export type MRTheme = typeof MR_THEME;