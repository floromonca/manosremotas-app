import {
    FeatureKey,
    PlanKey,
    PLANS,
} from "./plans";

export function getPlanConfig(
    plan: PlanKey
) {
    return PLANS[plan];
}

export function hasPlanFeature(
    plan: PlanKey,
    feature: FeatureKey
) {
    return PLANS[
        plan
    ].features.includes(feature);
}

export function getPlanPhotoLimit(
    plan: PlanKey
) {
    return PLANS[
        plan
    ].maxPhotosPerWorkOrder;
}

export function getPlanStorageLimit(
    plan: PlanKey
) {
    return PLANS[
        plan
    ].storageGb;
}

export function getPlanUserLimit(
    plan: PlanKey
) {
    return PLANS[
        plan
    ].usersIncluded;
}