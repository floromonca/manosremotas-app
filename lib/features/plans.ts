export type PlanKey =
    | "starter"
    | "pro"
    | "business";

export type FeatureKey =
    | "work_orders"
    | "my_day"
    | "customers"
    | "team"
    | "control_center"
    | "photo_evidence_basic"
    | "invoicing"
    | "service_catalog"
    | "photo_evidence_advanced"
    | "work_report"
    | "payroll"
    | "reports";

type PlanConfig = {
    key: PlanKey;
    name: string;
    monthlyPrice: number;
    usersIncluded: number;
    storageGb: number;
    maxPhotosPerWorkOrder: number;
    features: FeatureKey[];
};

export const PLANS: Record<PlanKey, PlanConfig> = {
    starter: {
        key: "starter",
        name: "Starter Trial",
        monthlyPrice: 0,
        usersIncluded: 2,
        storageGb: 1,
        maxPhotosPerWorkOrder: 3,
        features: [
            "work_orders",
            "my_day",
            "customers",
            "team",
            "control_center",
            "photo_evidence_basic",
            "invoicing", // temporal durante trial
        ],
    },

    pro: {
        key: "pro",
        name: "Pro",
        monthlyPrice: 49,
        usersIncluded: 5,
        storageGb: 5,
        maxPhotosPerWorkOrder: 6,
        features: [
            "work_orders",
            "my_day",
            "customers",
            "team",
            "control_center",
            "photo_evidence_basic",
            "invoicing",
            "service_catalog",
        ],
    },

    business: {
        key: "business",
        name: "Business",
        monthlyPrice: 129,
        usersIncluded: 15,
        storageGb: 15,
        maxPhotosPerWorkOrder: 20,
        features: [
            "work_orders",
            "my_day",
            "customers",
            "team",
            "control_center",
            "photo_evidence_basic",
            "invoicing",
            "service_catalog",
            "photo_evidence_advanced",
            "work_report",
            "payroll",
            "reports",
        ],
    },
};