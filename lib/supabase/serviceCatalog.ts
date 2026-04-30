import { supabase } from "../supabaseClient";

export type ServiceCatalogItem = {
    service_catalog_item_id: string;
    company_id: string;
    name: string;
    description: string | null;
    uom: string;
    unit_price: number | null;
    taxable: boolean;
    active: boolean;
    created_at: string;
    updated_at: string;
};

// 🔹 List services
export async function fetchServiceCatalogItems(companyId: string) {
    const { data, error } = await supabase
        .from("service_catalog_items")
        .select("*")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

    if (error) throw error;

    return (data ?? []) as ServiceCatalogItem[];
}

// 🔹 Create service
export async function createServiceCatalogItem(
    companyId: string,
    input: {
        name: string;
        description?: string | null;
        uom: string;
        unit_price?: number | null;
        taxable?: boolean;
    }
) {
    const { error } = await supabase
        .from("service_catalog_items")
        .insert({
            company_id: companyId,
            name: input.name.trim(),
            description: input.description ?? null,
            uom: input.uom.trim(),
            unit_price: input.unit_price ?? null,
            taxable: input.taxable ?? true,
        });

    if (error) throw error;
}

// 🔹 Update service
export async function updateServiceCatalogItem(
    serviceId: string,
    input: {
        name: string;
        description?: string | null;
        uom: string;
        unit_price?: number | null;
        taxable?: boolean;
        active?: boolean;
    }
) {
    const { error } = await supabase
        .from("service_catalog_items")
        .update({
            name: input.name.trim(),
            description: input.description ?? null,
            uom: input.uom.trim(),
            unit_price: input.unit_price ?? null,
            taxable: input.taxable ?? true,
            active: input.active ?? true,
            updated_at: new Date().toISOString(),
        })
        .eq("service_catalog_item_id", serviceId);

    if (error) throw error;
}