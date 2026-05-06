"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MR_THEME } from "@/lib/theme";
import { useActiveCompany } from "../../../../hooks/useActiveCompany";
import {
    createServiceCatalogItem,
    fetchServiceCatalogItems,
    type ServiceCatalogItem,
    updateServiceCatalogItem,
} from "../../../../lib/supabase/serviceCatalog";

type ServiceFormState = {
    name: string;
    description: string;
    uom: string;
    unit_price: string;
    taxable: boolean;
    active: boolean;
};
type CsvPreviewStatus = "ready" | "duplicate" | "conflict" | "error";

type CsvPreviewRow = {
    rowNumber: number;
    service_name: string;
    unit: string;
    unit_price: string;
    taxable: string;
    description: string;
    status: CsvPreviewStatus;
    message: string;
};
const emptyForm: ServiceFormState = {
    name: "",
    description: "",
    uom: "each",
    unit_price: "",
    taxable: true,
    active: true,
};

export default function ServicesSettingsPage() {
    const { companyId } = useActiveCompany();

    const [items, setItems] = useState<ServiceCatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [editingItem, setEditingItem] = useState<ServiceCatalogItem | null>(null);
    const [form, setForm] = useState<ServiceFormState>(emptyForm);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importStep, setImportStep] = useState<"instructions" | "upload">("instructions");
    const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
    const [csvText, setCsvText] = useState<string>("");
    const [csvRows, setCsvRows] = useState<string[][]>([]);
    const [csvErrors, setCsvErrors] = useState<string[]>([]);
    const [csvPreviewRows, setCsvPreviewRows] = useState<CsvPreviewRow[]>([]);

    const loadItems = useCallback(async () => {
        if (!companyId) {
            setItems([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const data = await fetchServiceCatalogItems(companyId);
            setItems(data);
        } catch (e: any) {
            console.error("Error loading services:", e);
            alert(e?.message || "Could not load services.");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        void loadItems();
    }, [loadItems]);

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) return items;

        return items.filter((item) => {
            return (
                item.name.toLowerCase().includes(q) ||
                item.uom.toLowerCase().includes(q) ||
                (item.description || "").toLowerCase().includes(q)
            );
        });
    }, [items, search]);

    function startCreate() {
        setEditingItem(null);
        setForm(emptyForm);
    }

    function startEdit(item: ServiceCatalogItem) {
        setEditingItem(item);
        setForm({
            name: item.name,
            description: item.description || "",
            uom: item.uom,
            unit_price: item.unit_price === null ? "" : String(item.unit_price),
            taxable: item.taxable,
            active: item.active,
        });
    }
    function handleDownloadTemplate() {
        const csv = [
            "service_name,unit,unit_price,taxable,description",
            '"Drywall repair",each,120,yes,"Small drywall repair"',
            '"Painting",hour,65,yes,"Interior painting labor"',
            '"Inspection",each,,no,"Initial site inspection"',
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "services_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }


    async function handleSave() {
        if (!companyId) {
            alert("No active company selected.");
            return;
        }

        const name = form.name.trim();
        const uom = form.uom.trim();

        if (!name) {
            alert("Service name is required.");
            return;
        }

        if (!uom) {
            alert("Unit is required.");
            return;
        }

        const price =
            form.unit_price.trim() === "" ? null : Number(form.unit_price.trim());

        if (price !== null && (Number.isNaN(price) || price < 0)) {
            alert("Price must be empty or a valid non-negative number.");
            return;
        }

        setSaving(true);

        try {
            if (editingItem) {
                await updateServiceCatalogItem(editingItem.service_catalog_item_id, {
                    name,
                    description: form.description.trim() || null,
                    uom,
                    unit_price: price,
                    taxable: form.taxable,
                    active: form.active,
                });
            } else {
                await createServiceCatalogItem(companyId, {
                    name,
                    description: form.description.trim() || null,
                    uom,
                    unit_price: price,
                    taxable: form.taxable,
                });
            }

            setEditingItem(null);
            setForm(emptyForm);
            await loadItems();
        } catch (e: any) {
            console.error("Error saving service:", e);
            alert(e?.message || "Could not save service.");
        } finally {
            setSaving(false);
        }
    }
    async function handleImportServices() {
        if (!companyId) {
            alert("No active company selected.");
            return;
        }

        const blockingRows = csvPreviewRows.filter(
            (row) => row.status === "conflict" || row.status === "error"
        );

        if (blockingRows.length > 0) {
            alert("Please fix conflicts or errors before importing.");
            return;
        }

        const rowsToImport = csvPreviewRows.filter((row) => row.status === "ready");

        if (rowsToImport.length === 0) {
            alert("No ready services to import.");
            return;
        }

        const confirmed = window.confirm(
            `Import ${rowsToImport.length} services? Duplicate rows will be skipped.`
        );

        if (!confirmed) return;

        setSaving(true);

        try {
            await Promise.all(
                rowsToImport.map((row) =>
                    createServiceCatalogItem(companyId, {
                        name: row.service_name.trim(),
                        description: row.description.trim() || null,
                        uom: row.unit.trim(),
                        unit_price:
                            row.unit_price.trim() === "" ? null : Number(row.unit_price.trim()),
                        taxable: row.taxable.toLowerCase() === "yes",
                    })
                )
            );

            alert(`${rowsToImport.length} services imported successfully.`);

            setShowImportModal(false);
            setImportStep("instructions");
            setSelectedCsvFile(null);
            setCsvText("");
            setCsvRows([]);
            setCsvErrors([]);
            setCsvPreviewRows([]);

            await loadItems();
        } catch (e: any) {
            console.error("Error importing services:", e);
            alert(e?.message || "Could not import services.");
        } finally {
            setSaving(false);
        }
    }
    async function handleToggleActive(item: ServiceCatalogItem) {
        const nextActive = !item.active;

        const confirmed = window.confirm(
            nextActive
                ? `Reactivate "${item.name}"?`
                : `Deactivate "${item.name}"? It will no longer appear as an active catalog option.`
        );

        if (!confirmed) return;

        try {
            await updateServiceCatalogItem(item.service_catalog_item_id, {
                name: item.name,
                description: item.description,
                uom: item.uom,
                unit_price: item.unit_price,
                taxable: item.taxable,
                active: nextActive,
            });

            await loadItems();
        } catch (e: any) {
            console.error("Error updating service status:", e);
            alert(e?.message || "Could not update service status.");
        }
    }

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <section style={cardStyle}>
                <div className="headerRow">
                    <div>
                        <div style={eyebrowStyle}>Settings</div>

                        <h1
                            style={{
                                ...MR_THEME.typography.pageTitle,
                                margin: 0,
                                color: MR_THEME.colors.textPrimary,
                            }}
                        >
                            Services / Price Book
                        </h1>

                        <p
                            style={{
                                margin: "8px 0 0",
                                color: MR_THEME.colors.textSecondary,
                                fontSize: 14,
                                lineHeight: 1.55,
                                maxWidth: 680,
                            }}
                        >
                            Create reusable services to speed up work orders and keep pricing
                            consistent.
                        </p>
                    </div>

                    <div className="actionsRow">
                        <button type="button" onClick={startCreate} style={primaryButtonStyle}>
                            + Add Service
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setSelectedCsvFile(null);
                                setCsvText("");
                                setCsvRows([]);
                                setCsvErrors([]);
                                setCsvPreviewRows([]);
                                setImportStep("instructions");
                                setShowImportModal(true);
                            }}
                            style={secondaryButtonStyle}
                        >
                            Import CSV
                        </button>
                    </div>
                </div>
            </section>

            <section style={cardStyle}>
                <div style={{ display: "grid", gap: 14 }}>
                    <div className="formGrid">
                        <Field label="Service Name">
                            <input
                                value={form.name}
                                onChange={(e) =>
                                    setForm((current) => ({ ...current, name: e.target.value }))
                                }
                                placeholder="Demo Carpet"
                                style={inputStyle}
                            />
                        </Field>

                        <Field label="Unit">
                            <input
                                value={form.uom}
                                onChange={(e) =>
                                    setForm((current) => ({ ...current, uom: e.target.value }))
                                }
                                placeholder="each, hour, sqft"
                                style={inputStyle}
                            />
                        </Field>

                        <Field label="Price optional">
                            <input
                                value={form.unit_price}
                                onChange={(e) =>
                                    setForm((current) => ({
                                        ...current,
                                        unit_price: e.target.value,
                                    }))
                                }
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                style={inputStyle}
                            />
                        </Field>

                        <Field label="Taxable">
                            <select
                                value={form.taxable ? "yes" : "no"}
                                onChange={(e) =>
                                    setForm((current) => ({
                                        ...current,
                                        taxable: e.target.value === "yes",
                                    }))
                                }
                                style={inputStyle}
                            >
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </Field>

                        {editingItem ? (
                            <Field label="Status">
                                <select
                                    value={form.active ? "active" : "inactive"}
                                    onChange={(e) =>
                                        setForm((current) => ({
                                            ...current,
                                            active: e.target.value === "active",
                                        }))
                                    }
                                    style={inputStyle}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </Field>
                        ) : null}
                    </div>

                    <Field label="Description optional">
                        <textarea
                            value={form.description}
                            onChange={(e) =>
                                setForm((current) => ({
                                    ...current,
                                    description: e.target.value,
                                }))
                            }
                            placeholder="Optional notes for internal use."
                            style={{
                                ...inputStyle,
                                height: 88,
                                paddingTop: 12,
                                resize: "vertical",
                                fontFamily: "inherit",
                            }}
                        />
                    </Field>

                    <div className="actionsRow">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                ...primaryButtonStyle,
                                opacity: saving ? 0.65 : 1,
                                cursor: saving ? "not-allowed" : "pointer",
                            }}
                        >
                            {saving
                                ? "Saving..."
                                : editingItem
                                    ? "Save Changes"
                                    : "Create Service"}
                        </button>

                        {editingItem ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingItem(null);
                                    setForm(emptyForm);
                                }}
                                style={secondaryButtonStyle}
                            >
                                Cancel
                            </button>
                        ) : null}
                    </div>
                </div>
            </section>

            <section style={cardStyle}>
                <div style={{ display: "grid", gap: 14 }}>
                    <div className="headerRow">
                        <div>
                            <h2
                                style={{
                                    ...MR_THEME.typography.sectionTitle,
                                    margin: 0,
                                    color: MR_THEME.colors.textPrimary,
                                }}
                            >
                                Service Catalog
                            </h2>

                            <p
                                style={{
                                    margin: "6px 0 0",
                                    fontSize: 13,
                                    color: MR_THEME.colors.textSecondary,
                                }}
                            >
                                {items.length} service{items.length === 1 ? "" : "s"} configured
                            </p>
                        </div>

                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search services..."
                            style={{
                                ...inputStyle,
                                maxWidth: 320,
                            }}
                        />
                    </div>

                    {loading ? (
                        <StateMessage message="Loading services..." />
                    ) : filteredItems.length === 0 ? (
                        <StateMessage message="No services found. Create your first service to speed up work orders." />
                    ) : (
                        <>
                            <div className="desktopTable">
                                <table
                                    style={{
                                        width: "100%",
                                        borderCollapse: "separate",
                                        borderSpacing: 0,
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            <HeaderCell>Service Name</HeaderCell>
                                            <HeaderCell>Unit</HeaderCell>
                                            <HeaderCell align="right">Price</HeaderCell>
                                            <HeaderCell>Taxable</HeaderCell>
                                            <HeaderCell>Status</HeaderCell>
                                            <HeaderCell align="right">Actions</HeaderCell>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredItems.map((item) => (
                                            <tr key={item.service_catalog_item_id}>
                                                <BodyCell>
                                                    <div
                                                        style={{
                                                            fontWeight: 800,
                                                            color: MR_THEME.colors.textPrimary,
                                                        }}
                                                    >
                                                        {item.name}
                                                    </div>
                                                    {item.description ? (
                                                        <div
                                                            style={{
                                                                marginTop: 4,
                                                                fontSize: 12,
                                                                color: MR_THEME.colors.textSecondary,
                                                            }}
                                                        >
                                                            {item.description}
                                                        </div>
                                                    ) : null}
                                                </BodyCell>
                                                <BodyCell>{item.uom}</BodyCell>
                                                <BodyCell align="right">
                                                    {formatPrice(item.unit_price)}
                                                </BodyCell>
                                                <BodyCell>{item.taxable ? "Yes" : "No"}</BodyCell>
                                                <BodyCell>
                                                    <StatusBadge active={item.active} />
                                                </BodyCell>
                                                <BodyCell align="right">
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "flex-end",
                                                            gap: 8,
                                                        }}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(item)}
                                                            style={smallButtonStyle}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleActive(item)}
                                                            style={smallButtonStyle}
                                                        >
                                                            {item.active ? "Deactivate" : "Activate"}
                                                        </button>
                                                    </div>
                                                </BodyCell>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mobileCards">
                                {filteredItems.map((item) => (
                                    <article
                                        key={item.service_catalog_item_id}
                                        style={{
                                            border: `1px solid ${MR_THEME.colors.border}`,
                                            borderRadius: MR_THEME.radius.card,
                                            padding: 14,
                                            background: MR_THEME.colors.cardBgSoft,
                                            display: "grid",
                                            gap: 12,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                gap: 10,
                                                alignItems: "flex-start",
                                            }}
                                        >
                                            <div style={{ minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontWeight: 900,
                                                        color: MR_THEME.colors.textPrimary,
                                                    }}
                                                >
                                                    {item.name}
                                                </div>
                                                {item.description ? (
                                                    <div
                                                        style={{
                                                            marginTop: 4,
                                                            fontSize: 13,
                                                            color: MR_THEME.colors.textSecondary,
                                                            lineHeight: 1.4,
                                                        }}
                                                    >
                                                        {item.description}
                                                    </div>
                                                ) : null}
                                            </div>

                                            <StatusBadge active={item.active} />
                                        </div>

                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "1fr 1fr",
                                                gap: 10,
                                            }}
                                        >
                                            <MiniInfo label="Unit" value={item.uom} />
                                            <MiniInfo label="Price" value={formatPrice(item.unit_price)} />
                                            <MiniInfo label="Taxable" value={item.taxable ? "Yes" : "No"} />
                                            <MiniInfo label="Status" value={item.active ? "Active" : "Inactive"} />
                                        </div>

                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "1fr 1fr",
                                                gap: 10,
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => startEdit(item)}
                                                style={smallButtonStyle}
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleToggleActive(item)}
                                                style={smallButtonStyle}
                                            >
                                                {item.active ? "Deactivate" : "Activate"}
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </section>
            {showImportModal ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="import-csv-title"
                    style={modalOverlayStyle}
                >
                    <div style={modalCardStyle}>
                        <div style={eyebrowStyle}>Import CSV</div>

                        <h2
                            id="import-csv-title"
                            style={{
                                margin: 0,
                                color: MR_THEME.colors.textPrimary,
                                fontSize: 22,
                                fontWeight: 900,
                            }}
                        >
                            Import services from CSV
                        </h2>
                        {importStep === "instructions" ? (
                            <div>
                                <p
                                    style={{
                                        margin: "8px 0 0",
                                        color: MR_THEME.colors.textSecondary,
                                        fontSize: 14,
                                        lineHeight: 1.55,
                                    }}
                                >
                                    Prepare your file using this required format.
                                </p>

                                <div
                                    style={{
                                        marginTop: 16,
                                        padding: 14,
                                        borderRadius: MR_THEME.radius.card,
                                        border: `1px solid ${MR_THEME.colors.border}`,
                                        background: MR_THEME.colors.cardBgSoft,
                                    }}
                                >
                                    <div style={labelStyle}>Columns</div>

                                    <code
                                        style={{
                                            display: "block",
                                            marginTop: 8,
                                            color: MR_THEME.colors.textPrimary,
                                            fontSize: 13,
                                            whiteSpace: "normal",
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        service_name,unit,unit_price,taxable,description
                                    </code>

                                    <ul
                                        style={{
                                            margin: "12px 0 0",
                                            paddingLeft: 18,
                                            color: MR_THEME.colors.textSecondary,
                                            fontSize: 14,
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        <li>service_name is required.</li>
                                        <li>unit is required.</li>
                                        <li>unit_price is optional.</li>
                                        <li>taxable accepts yes or no.</li>
                                        <li>description is optional.</li>
                                    </ul>
                                </div>

                                <div
                                    style={{
                                        marginTop: 18,
                                        display: "flex",
                                        gap: 10,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={handleDownloadTemplate}
                                        style={primaryButtonStyle}
                                    >
                                        Download template
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setImportStep("upload")}
                                        style={secondaryButtonStyle}
                                    >
                                        Continue to upload
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowImportModal(false);
                                            setImportStep("instructions");
                                            setSelectedCsvFile(null);
                                            setCsvText("");
                                            setCsvRows([]);
                                            setCsvErrors([]);
                                            setCsvPreviewRows([]);
                                        }}
                                        style={secondaryButtonStyle}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginTop: 16 }}>
                                <p
                                    style={{
                                        margin: "8px 0 0",
                                        color: MR_THEME.colors.textSecondary,
                                        fontSize: 14,
                                        lineHeight: 1.55,
                                    }}
                                >
                                    Select your CSV file. In the next step we will show a preview
                                    before importing.
                                </p>

                                <div
                                    style={{
                                        marginTop: 16,
                                        padding: 18,
                                        border: `1px dashed ${MR_THEME.colors.borderStrong}`,
                                        borderRadius: MR_THEME.radius.card,
                                        textAlign: "center",
                                        color: MR_THEME.colors.textSecondary,
                                        fontSize: 14,
                                    }}
                                >
                                    <label
                                        style={{
                                            display: "grid",
                                            gap: 10,
                                            cursor: "pointer",
                                        }}
                                    >
                                        <input
                                            type="file"
                                            accept=".csv,text/csv"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] ?? null;
                                                setSelectedCsvFile(file);

                                                if (file) {
                                                    const reader = new FileReader();

                                                    reader.onload = (event) => {
                                                        const text = event.target?.result as string;
                                                        setCsvText(text);
                                                        // Parse CSV (simple, soporta comillas básicas)
                                                        const rows = text
                                                            .split(/\r?\n/)
                                                            .filter((line) => line.trim().length > 0)
                                                            .map((line) => {
                                                                // separa por comas respetando comillas
                                                                const result: string[] = [];
                                                                let current = "";
                                                                let inQuotes = false;

                                                                for (let i = 0; i < line.length; i++) {
                                                                    const char = line[i];

                                                                    if (char === '"') {
                                                                        inQuotes = !inQuotes;
                                                                    } else if (char === "," && !inQuotes) {
                                                                        result.push(current);
                                                                        current = "";
                                                                    } else {
                                                                        current += char;
                                                                    }
                                                                }

                                                                result.push(current);
                                                                return result.map((cell) => cell.replace(/^"|"$/g, "").trim());
                                                            });

                                                        setCsvRows(rows);
                                                        const expectedHeaders = ["service_name", "unit", "unit_price", "taxable", "description"];
                                                        const header = rows[0] || [];
                                                        const errors: string[] = [];

                                                        if (header.length === 0) {
                                                            errors.push("CSV file is empty.");
                                                        } else {
                                                            const normalizedHeader = header.map((h) => h.toLowerCase());

                                                            expectedHeaders.forEach((col) => {
                                                                if (!normalizedHeader.includes(col)) {
                                                                    errors.push(`Missing column: ${col}`);
                                                                }
                                                            });
                                                        }

                                                        setCsvErrors(errors);
                                                        // Build preview rows with status
                                                        const dataRows = rows.slice(1);

                                                        const preview: CsvPreviewRow[] = [];

                                                        const seen = new Map<string, string>(); // key: service_name+unit → price
                                                        const existing = new Set(
                                                            items.map((item) => `${item.name.toLowerCase()}__${item.uom.toLowerCase()}`)
                                                        );

                                                        dataRows.forEach((r, index) => {
                                                            const service_name = r[0] || "";
                                                            const unit = r[1] || "";
                                                            const unit_price = r[2] || "";
                                                            const taxable = r[3] || "";
                                                            const description = r[4] || "";

                                                            let status: CsvPreviewStatus = "ready";
                                                            let message = "";

                                                            // Basic validation
                                                            if (!service_name || !unit) {
                                                                status = "error";
                                                                message = "Missing service_name or unit";
                                                            }

                                                            if (taxable && !["yes", "no"].includes(taxable.toLowerCase())) {
                                                                status = "error";
                                                                message = "Invalid taxable value";
                                                            }

                                                            if (unit_price && isNaN(Number(unit_price))) {
                                                                status = "error";
                                                                message = "unit_price must be numeric";
                                                            }

                                                            const key = `${service_name.toLowerCase()}__${unit.toLowerCase()}`;

                                                            if (status === "ready") {
                                                                if (existing.has(key)) {
                                                                    status = "duplicate";
                                                                    message = "Already exists in catalog";
                                                                } else if (seen.has(key)) {
                                                                    const existingPrice = seen.get(key);

                                                                    if (existingPrice === unit_price) {
                                                                        status = "duplicate";
                                                                        message = "Duplicate row";
                                                                    } else {
                                                                        status = "conflict";
                                                                        message = `Conflicting price: existing ${existingPrice}, new ${unit_price}`;
                                                                    }
                                                                } else {
                                                                    seen.set(key, unit_price);
                                                                }
                                                            }

                                                            preview.push({
                                                                rowNumber: index + 2,
                                                                service_name,
                                                                unit,
                                                                unit_price,
                                                                taxable,
                                                                description,
                                                                status,
                                                                message,
                                                            });
                                                        });

                                                        setCsvPreviewRows(preview);
                                                    };

                                                    reader.readAsText(file);
                                                }
                                            }}
                                            style={{ display: "none" }}
                                        />

                                        <span style={{ fontWeight: 900, color: MR_THEME.colors.textPrimary }}>
                                            Choose CSV file
                                        </span>

                                        <span>
                                            {selectedCsvFile ? selectedCsvFile.name : "No file selected yet."}
                                        </span>
                                    </label>
                                    {csvRows.length > 0 ? (
                                        <div
                                            style={{
                                                marginTop: 14,
                                                textAlign: "left",
                                                fontSize: 13,
                                                color: MR_THEME.colors.textSecondary,
                                            }}
                                        >
                                            Preview ready: {Math.max(csvRows.length - 1, 0)} services found.
                                        </div>
                                    ) : null}
                                    {csvRows.length > 0 ? (
                                        <div
                                            style={{
                                                marginTop: 12,
                                                maxHeight: 200,
                                                overflow: "auto",
                                                border: `1px solid ${MR_THEME.colors.border}`,
                                                borderRadius: MR_THEME.radius.card,
                                                background: MR_THEME.colors.cardBg,
                                            }}
                                        >
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                                <thead>
                                                    <tr style={{ background: MR_THEME.colors.cardBgSoft }}>
                                                        {["service_name", "unit", "unit_price", "taxable", "description", "status"].map(
                                                            (col, idx) => (
                                                                <th
                                                                    key={idx}
                                                                    style={{
                                                                        textAlign: "left",
                                                                        padding: "8px 10px",
                                                                        borderBottom: `1px solid ${MR_THEME.colors.border}`,
                                                                        fontWeight: 900,
                                                                        color: MR_THEME.colors.textPrimary,
                                                                    }}
                                                                >
                                                                    {col}
                                                                </th>
                                                            )
                                                        )}
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {csvPreviewRows.map((row, i) => (
                                                        <tr key={i}>
                                                            <td style={cellStyle}>{row.service_name || "—"}</td>
                                                            <td style={cellStyle}>{row.unit || "—"}</td>
                                                            <td style={cellStyle}>{row.unit_price || "—"}</td>
                                                            <td style={cellStyle}>{row.taxable || "—"}</td>
                                                            <td style={cellStyle}>{row.description || "—"}</td>

                                                            <td
                                                                style={{
                                                                    ...cellStyle,
                                                                    fontWeight: 900,
                                                                    color:
                                                                        row.status === "ready"
                                                                            ? MR_THEME.colors.success
                                                                            : row.status === "duplicate"
                                                                                ? MR_THEME.colors.warning
                                                                                : MR_THEME.colors.danger,
                                                                }}
                                                            >
                                                                {row.status.charAt(0).toUpperCase() + row.status.slice(1)}

                                                                {row.message ? (
                                                                    <div
                                                                        style={{
                                                                            marginTop: 2,
                                                                            fontSize: 11,
                                                                            fontWeight: 700,
                                                                            color: MR_THEME.colors.textSecondary,
                                                                        }}
                                                                    >
                                                                        {row.message}
                                                                    </div>
                                                                ) : null}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : null}

                                    {csvErrors.length > 0 ? (
                                        <div>
                                            {csvErrors.map((err, i) => (
                                                <div key={i}>• {err}</div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>

                                <div
                                    style={{
                                        marginTop: 18,
                                        display: "flex",
                                        gap: 10,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={handleImportServices}
                                        disabled={
                                            saving ||
                                            csvPreviewRows.length === 0 ||
                                            csvPreviewRows.every((row) => row.status !== "ready") ||
                                            csvPreviewRows.some((row) => row.status === "conflict" || row.status === "error")
                                        }
                                        style={{
                                            ...primaryButtonStyle,
                                            opacity:
                                                saving ||
                                                    csvPreviewRows.length === 0 ||
                                                    csvPreviewRows.every((row) => row.status !== "ready") ||
                                                    csvPreviewRows.some((row) => row.status === "conflict" || row.status === "error")
                                                    ? 0.55
                                                    : 1,
                                            cursor:
                                                saving ||
                                                    csvPreviewRows.length === 0 ||
                                                    csvPreviewRows.every((row) => row.status !== "ready") ||
                                                    csvPreviewRows.some((row) => row.status === "conflict" || row.status === "error")
                                                    ? "not-allowed"
                                                    : "pointer",
                                        }}
                                    >
                                        {csvPreviewRows.every((row) => row.status !== "ready")
                                            ? "Nothing to import"
                                            : saving
                                                ? "Importing..."
                                                : "Import services"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setImportStep("instructions")}
                                        style={secondaryButtonStyle}
                                    >
                                        Back
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowImportModal(false);
                                            setImportStep("instructions");
                                            setSelectedCsvFile(null);
                                            setCsvText("");
                                            setCsvRows([]);
                                            setCsvErrors([]);
                                            setCsvPreviewRows([]);
                                        }}
                                        style={secondaryButtonStyle}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

            <style jsx>{`
                .headerRow {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .actionsRow {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    flex-wrap: wrap;
                }

                .formGrid {
                    display: grid;
                    grid-template-columns: minmax(220px, 1.4fr) repeat(4, minmax(120px, 0.7fr));
                    gap: 12px;
                    align-items: end;
                }

                .mobileCards {
                    display: none;
                }

                @media (max-width: 980px) {
                    .formGrid {
                        grid-template-columns: 1fr 1fr;
                    }
                }

                @media (max-width: 760px) {
                    .formGrid {
                        grid-template-columns: 1fr;
                    }

                    .actionsRow,
                    .actionsRow button,
                    .headerRow input {
                        width: 100%;
                    }

                    .desktopTable {
                        display: none;
                    }

                    .mobileCards {
                        display: grid;
                        gap: 12px;
                    }
                }
            `}</style>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label style={{ display: "grid", gap: 6 }}>
            <span style={labelStyle}>{label}</span>
            {children}
        </label>
    );
}

function HeaderCell({
    children,
    align = "left",
}: {
    children: React.ReactNode;
    align?: "left" | "right";
}) {
    return (
        <th
            style={{
                textAlign: align,
                padding: "12px 10px",
                borderBottom: `1px solid ${MR_THEME.colors.border}`,
                color: MR_THEME.colors.textMuted,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                fontWeight: 900,
            }}
        >
            {children}
        </th>
    );
}

function BodyCell({
    children,
    align = "left",
}: {
    children: React.ReactNode;
    align?: "left" | "right";
}) {
    return (
        <td
            style={{
                textAlign: align,
                padding: "12px 10px",
                borderBottom: `1px solid ${MR_THEME.colors.border}`,
                color: MR_THEME.colors.textSecondary,
                fontSize: 14,
                verticalAlign: "middle",
            }}
        >
            {children}
        </td>
    );
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                height: 26,
                padding: "0 10px",
                borderRadius: 999,
                background: active
                    ? MR_THEME.colors.success + "18"
                    : MR_THEME.colors.border,
                color: active
                    ? MR_THEME.colors.success
                    : MR_THEME.colors.textSecondary,
                fontSize: 12,
                fontWeight: 900,
                whiteSpace: "nowrap",
            }}
        >
            {active ? "Active" : "Inactive"}
        </span>
    );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                padding: "8px 10px",
                borderRadius: MR_THEME.radius.control,
                border: `1px solid ${MR_THEME.colors.border}`,
                background: MR_THEME.colors.cardBg,
            }}
        >
            <div style={labelStyle}>{label}</div>
            <div
                style={{
                    marginTop: 4,
                    color: MR_THEME.colors.textPrimary,
                    fontWeight: 800,
                    fontSize: 13,
                }}
            >
                {value}
            </div>
        </div>
    );
}

function StateMessage({ message }: { message: string }) {
    return (
        <div
            style={{
                padding: 18,
                borderRadius: MR_THEME.radius.card,
                border: `1px solid ${MR_THEME.colors.border}`,
                background: MR_THEME.colors.cardBgSoft,
                color: MR_THEME.colors.textSecondary,
                fontSize: 14,
            }}
        >
            {message}
        </div>
    );
}

function formatPrice(value: number | null) {
    if (value === null) return "—";

    return new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value));
}

const cardStyle: React.CSSProperties = {
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: MR_THEME.radius.card,
    background: MR_THEME.colors.cardBg,
    boxShadow: MR_THEME.shadows.cardSoft,
    padding: MR_THEME.layout.cardPadding,
};

const eyebrowStyle: React.CSSProperties = {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: MR_THEME.colors.primary,
    fontWeight: 900,
    marginBottom: 8,
};

const labelStyle: React.CSSProperties = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: MR_THEME.colors.textMuted,
    fontWeight: 900,
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 42,
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    padding: "0 12px",
    fontSize: 14,
    boxSizing: "border-box",
};

const primaryButtonStyle: React.CSSProperties = {
    height: 42,
    padding: "0 14px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.primary}`,
    background: MR_THEME.colors.primary,
    color: "#ffffff",
    fontWeight: 900,
    cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
    height: 42,
    padding: "0 14px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    fontWeight: 900,
    cursor: "pointer",
};

const disabledButtonStyle: React.CSSProperties = {
    ...secondaryButtonStyle,
    opacity: 0.55,
    cursor: "not-allowed",
};

const smallButtonStyle: React.CSSProperties = {
    minHeight: 34,
    padding: "0 10px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
};
const cellStyle: React.CSSProperties = {
    padding: "6px 10px",
    borderBottom: `1px solid ${MR_THEME.colors.border}`,
    color: MR_THEME.colors.textSecondary,
};
const modalOverlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
};

const modalCardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 560,
    borderRadius: MR_THEME.radius.card,
    border: `1px solid ${MR_THEME.colors.border}`,
    background: MR_THEME.colors.cardBg,
    boxShadow: MR_THEME.shadows.card,
    padding: 22,
};