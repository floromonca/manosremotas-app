export type WorkReportCompany = {
    company_name?: string | null;
    company_email?: string | null;
    company_phone?: string | null;
    company_website?: string | null;
    logo_url?: string | null;
    address_line_1?: string | null;
    address_line_2?: string | null;
    city?: string | null;
    state_province?: string | null;
    postal_code?: string | null;
    country_code?: string | null;
};

export type WorkReportWorkOrder = {
    work_order_id: string;
    work_order_number?: string | null;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    service_address?: string | null;
    description?: string | null;
    job_type?: string | null;
    status?: string | null;
    priority?: string | null;
    scheduled_for?: string | null;
    created_at?: string | null;
    assigned_to?: string | null;
};

export type WorkReportItem = {
    item_id: string;
    description?: string | null;
    qty_planned?: number | null;
    qty_done?: number | null;
    quantity?: number | null;
    uom?: string | null;
    tech_note?: string | null;
};

export type WorkReportPhoto = {
    photo_id: string;
    category: string;
    file_url: string;
    created_at?: string | null;
};

export type WorkReportRecord = {
    work_order_report_id?: string | null;
    report_number?: string | null;
    status?: string | null;
    work_completed_summary?: string | null;
    recommendations?: string | null;
    customer_facing_note?: string | null;
    completion_statement?: string | null;
    generated_summary?: string | null;
    generated_at?: string | null;
};

export type WorkReportTechnician = {
    full_name?: string | null;
};

export type WorkReportHtmlData = {
    company?: WorkReportCompany | null;
    workOrder: WorkReportWorkOrder;
    report?: WorkReportRecord | null;
    items?: WorkReportItem[];
    photos?: WorkReportPhoto[];
    technician?: WorkReportTechnician | null;
};

function escHtml(value: string | null | undefined) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(value: string | null | undefined) {
    if (!value) return "—";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return escHtml(value);

    return d.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
}

function formatPhone(phone: string | null | undefined) {
    const raw = String(phone ?? "").trim();
    const digits = raw.replace(/\D/g, "");

    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    if (digits.length === 11 && digits.startsWith("1")) {
        return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    return raw;
}

function formatCountryName(country: string | null | undefined) {
    const raw = String(country ?? "").trim();
    const normalized = raw.toLowerCase();

    if (normalized === "ca" || normalized === "canada") return "Canada";
    if (
        normalized === "us" ||
        normalized === "usa" ||
        normalized === "united states" ||
        normalized === "united states of america"
    ) {
        return "United States";
    }

    return raw;
}

function joinCompanyAddress(company?: WorkReportCompany | null) {
    const city = String(company?.city ?? "").trim();
    const province = String(company?.state_province ?? "").trim();
    const postalCode = String(company?.postal_code ?? "").trim();

    const cityProvince = [city, province].filter(Boolean).join(", ");
    const localityLine = [cityProvince, postalCode].filter(Boolean).join(" ");
    const country = formatCountryName(company?.country_code);

    return [
        company?.address_line_1 ? escHtml(company.address_line_1) : null,
        company?.address_line_2 ? escHtml(company.address_line_2) : null,
        localityLine ? escHtml(localityLine) : null,
        country ? escHtml(country) : null,
    ]
        .filter(Boolean)
        .join("<br/>");
}

function displayWorkOrderNumber(workOrder: WorkReportWorkOrder) {
    const number = String(workOrder.work_order_number ?? "").trim();

    if (number) return number;

    return `WO-${workOrder.work_order_id.slice(0, 8)}`;
}

function completedQty(item: WorkReportItem) {
    return Number(item.qty_done ?? item.qty_planned ?? item.quantity ?? 0);
}

function buildAutomaticWorkCompletedSummary(
    items: WorkReportItem[],
) {
    if (!items.length) {
        return "The requested work was reviewed and documented as part of this service visit.";
    }

    const completedItems = items
        .map((item) => String(item.description ?? "").trim())
        .filter(Boolean)
        .slice(0, 4);

    if (!completedItems.length) {
        return "The assigned technician completed the requested work and documented the service visit with field notes and photo evidence.";
    }

    return `The assigned technician completed the requested work, including ${completedItems.join(", ")}. The services performed are summarized below for customer review.`;
}

function normalizePhotoCategory(category: string | null | undefined) {
    const normalized = String(category ?? "").trim().toLowerCase();

    if (normalized === "before") return "before";
    if (normalized === "during") return "during";
    if (normalized === "after") return "after";

    return "additional";
}

function groupPhotos(photos: WorkReportPhoto[]) {
    const sorted = [...photos].sort((a, b) => {
        const aTime = new Date(a.created_at ?? "").getTime();
        const bTime = new Date(b.created_at ?? "").getTime();

        if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
        if (Number.isNaN(aTime)) return 1;
        if (Number.isNaN(bTime)) return -1;

        return aTime - bTime;
    });

    return {
        before: sorted.filter((photo) => normalizePhotoCategory(photo.category) === "before"),
        during: sorted.filter((photo) => normalizePhotoCategory(photo.category) === "during"),
        after: sorted.filter((photo) => normalizePhotoCategory(photo.category) === "after"),
        additional: sorted.filter((photo) => normalizePhotoCategory(photo.category) === "additional"),
    };
}
function photoKey(photo: WorkReportPhoto) {
    return photo.photo_id || photo.file_url;
}

function buildSmartPhotoGroups(groups: ReturnType<typeof groupPhotos>) {
    const mainBefore = groups.before.slice(0, 2);
    const mainDuring = groups.during.slice(0, 2);
    const mainAfter = groups.after.slice(-2);

    const mainKeys = new Set(
        [...mainBefore, ...mainDuring, ...mainAfter].map(photoKey)
    );

    const additional = [
        ...groups.before,
        ...groups.during,
        ...groups.after,
        ...groups.additional,
    ].filter((photo) => !mainKeys.has(photoKey(photo)));

    return {
        before: mainBefore,
        during: mainDuring,
        after: mainAfter,
        additional,
    };
}
function renderPhotoCard(photo: WorkReportPhoto, label: string) {
    return `
        <div class="photo-card">
            <div class="photo-label">${escHtml(label)}</div>
            <img src="${escHtml(photo.file_url)}" alt="${escHtml(label)} photo evidence" />
        </div>
    `;
}

function renderMainPhotoSection(title: string, photos: WorkReportPhoto[]) {
    if (!photos.length) {
        return `
            <div class="photo-group">
                <h3>${escHtml(title)}</h3>
                <div class="empty-photo">No ${escHtml(title.toLowerCase())} photos uploaded.</div>
            </div>
        `;
    }

    return `
        <div class="photo-group">
            <h3>${escHtml(title)}</h3>
            <div class="photo-grid">
                ${photos.map((photo, index) => renderPhotoCard(photo, `${title} ${index + 1}`)).join("")}
            </div>
        </div>
    `;
}

export function renderWorkReportHtml(data: WorkReportHtmlData): string {
    const company = data.company ?? {};
    const workOrder = data.workOrder;
    const report = data.report ?? {};
    const items = data.items ?? [];
    const photos = data.photos ?? [];
    const technician = data.technician ?? {};

    const companyName = company.company_name || "Company";
    const companyAddress = joinCompanyAddress(company);
    const workOrderNumber = displayWorkOrderNumber(workOrder);
    const technicianName = technician.full_name || "Assigned technician";

    const workCompletedSummary =
        String(report.work_completed_summary ?? "").trim() ||
        buildAutomaticWorkCompletedSummary(items);

    const recommendations =
        String(report.recommendations ?? "").trim() ||
        "No additional issues were reported at the time of service.";

    const completionStatement =
        String(report.completion_statement ?? "").trim() ||
        "This report summarizes the work completed and the supporting visual evidence collected during the service visit.";

    const photoGroups = buildSmartPhotoGroups(groupPhotos(photos));

    const serviceRows = items.length
        ? items
            .map((item) => {
                const qty = completedQty(item);
                const uom = String(item.uom ?? "").trim();
                return `
    <tr>
        <td>
            <div class="service-name">${escHtml(item.description || "Service item")}</div>
        </td>
        <td class="num">${qty}${uom ? ` ${escHtml(uom)}` : ""}</td>
    </tr>
`;
            })
            .join("")
        : `
            <tr>
                <td colspan="2" class="empty-row">No service items were added to this work order.</td>
            </tr>
        `;

    const customerPhone = formatPhone(workOrder.customer_phone);
    const companyPhone = formatPhone(company.company_phone);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Work Completion Report ${escHtml(workOrderNumber)}</title>
<style>
:root {
    --text: #101828;
    --muted: #667085;
    --line: #e4e7ec;
    --soft: #f9fafb;
    --brand: #2563eb;
    --brand-soft: #eff6ff;
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    background: #f2f4f7;
    color: var(--text);
    font-family: Inter, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
}

.page {
    width: 8.5in;
    margin: 24px auto;
    padding: 34px 38px;
    background: #ffffff;
    border-radius: 18px;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
    break-after: page;
    page-break-after: always;
}

.page:last-child {
    break-after: auto;
    page-break-after: auto;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    padding-bottom: 22px;
    border-bottom: 1px solid var(--line);
}

.brand {
    display: flex;
    align-items: center;
    gap: 14px;
}

.logo {
    width: 54px;
    height: 54px;
    border-radius: 16px;
    object-fit: contain;
    border: 1px solid var(--line);
    background: #ffffff;
}

.company-name {
    font-size: 18px;
    font-weight: 800;
}

.company-meta {
    margin-top: 4px;
    color: var(--muted);
    font-size: 12px;
}

.report-title {
    text-align: right;
}

.report-title h1 {
    margin: 0;
    font-size: 26px;
    letter-spacing: -0.02em;
    word-spacing: 0.08em;
    white-space: nowrap;
}

.report-title .subtitle {
    margin-top: 4px;
    color: var(--brand);
    font-weight: 800;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.section {
    margin-top: 24px;
}

.section h2 {
    margin: 0 0 12px;
    font-size: 15px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #344054;
}

.card-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}

.card {
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 16px;
    background: var(--soft);
}

.label {
    color: var(--muted);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.value {
    margin-top: 4px;
    font-weight: 700;
}

.text-block {
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 16px;
    background: #ffffff;
    color: #344054;
}

.services-table {
    width: 100%;
    border-collapse: collapse;
    overflow: hidden;
    border-radius: 14px;
    border: 1px solid var(--line);
}

.services-table th {
    text-align: left;
    background: #f9fafb;
    color: #475467;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 11px 12px;
    border-bottom: 1px solid var(--line);
}

.services-table td {
    padding: 13px 12px;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
}

.services-table tr:last-child td {
    border-bottom: none;
}

.num {
    text-align: right;
    white-space: nowrap;
    font-weight: 700;
}

.service-name {
    font-weight: 700;
}

.empty-row,
.empty-photo {
    color: var(--muted);
    padding: 14px;
    border: 1px dashed #d0d5dd;
    border-radius: 14px;
    background: #ffffff;
}

.photo-group {
    margin-top: 22px;
}

.photo-group h3 {
    margin: 0 0 10px;
    font-size: 15px;
}

.photo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}

.photo-card {
    border: 1px solid var(--line);
    border-radius: 18px;
    overflow: hidden;
    background: #ffffff;
}

.photo-label {
    padding: 10px 12px;
    font-size: 11px;
    font-weight: 800;
    color: #344054;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: #f9fafb;
    border-bottom: 1px solid var(--line);
}

.photo-card img {
    width: 100%;
    height: 155px;
    display: block;
    object-fit: cover;
}

.footer-note {
    margin-top: 30px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-size: 12px;
}

@media print {
    @page {
        size: Letter;
        margin: 0;
    }

    body {
        background: #ffffff;
        margin: 0;
    }

    .page {
        width: 8.5in;
        height: 11in;
        margin: 0 auto;
        padding: 30px 38px;
        border-radius: 0;
        box-shadow: none;
        overflow: hidden;
    }

    .section {
        margin-top: 18px;
    }

    .photo-group {
        margin-top: 10px;
    }

    .photo-grid {
        gap: 10px;
    }

    .photo-card img {
        height: 118px;
    }

    .photo-label {
        padding: 5px 10px;
    }
}
</style>
</head>
<body>

<section class="page">
    <div class="header">
        <div class="brand">
            ${company.logo_url ? `<img class="logo" src="${escHtml(company.logo_url)}" alt="${escHtml(companyName)} logo" />` : ""}
            <div>
                <div class="company-name">${escHtml(companyName)}</div>
                <div class="company-meta">
                    ${companyAddress ? `${companyAddress}<br/>` : ""}
                    ${companyPhone ? `${escHtml(companyPhone)}<br/>` : ""}
                    ${company.company_email ? `${escHtml(company.company_email)}<br/>` : ""}
                    ${company.company_website ? escHtml(company.company_website) : ""}
                </div>
            </div>
        </div>

        <div class="report-title">
          <h1><span>Work Completion</span> <span>Report</span></h1>
            <div class="subtitle">Generated by ManosRemotas</div>
            <div class="company-meta">
                ${escHtml(workOrderNumber)}<br/>
                ${formatDate(report.generated_at || workOrder.created_at)}
            </div>
        </div>
    </div>

    <div class="section">
        <div class="card-grid">
            <div class="card">
                <div class="label">Customer / Site</div>
                <div class="value">${escHtml(workOrder.customer_name || "Customer")}</div>
                <div class="company-meta">
                    ${workOrder.service_address ? `${escHtml(workOrder.service_address)}<br/>` : ""}
                    ${workOrder.customer_email ? `${escHtml(workOrder.customer_email)}<br/>` : ""}
                    ${customerPhone ? escHtml(customerPhone) : ""}
                </div>
            </div>

            <div class="card">
                <div class="label">Completed By</div>
                <div class="value">${escHtml(technicianName)}</div>
                <div class="company-meta">Technician</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Work Requested</h2>
        <div class="text-block">${escHtml(workOrder.description || "No work description was provided.")}</div>
    </div>

    <div class="section">
        <h2>Work Completed</h2>
        <div class="text-block">${escHtml(workCompletedSummary)}</div>
    </div>

    <div class="section">
        <h2>Services Performed</h2>
        <table class="services-table">
            <thead>
                <tr>
                    <th>Service</th>
                    <th class="num">Qty Completed</th>
                </tr>
            </thead>
            <tbody>
                ${serviceRows}
            </tbody>
        </table>
    </div>
</section>

<section class="page">
    <div class="header">
        <div>
            <div class="label">Photo Evidence</div>
            <h1 style="margin: 4px 0 0; font-size: 26px;">Before / During / After</h1>
        </div>
        <div class="company-meta">${escHtml(workOrderNumber)}</div>
    </div>

    ${renderMainPhotoSection("Before", photoGroups.before)}
    ${renderMainPhotoSection("During", photoGroups.during)}
    ${renderMainPhotoSection("After", photoGroups.after)}
</section>

<section class="page">
    <div class="header">
        <div>
            <div class="label">Additional Evidence</div>
            <h1 style="margin: 4px 0 0; font-size: 26px;">Recommendations & Completion</h1>
        </div>
        <div class="company-meta">${escHtml(workOrderNumber)}</div>
    </div>

    <div class="section">
        <h2>Additional Evidence</h2>
        ${photoGroups.additional.length
            ? `<div class="photo-grid">${photoGroups.additional.map((photo, index) => renderPhotoCard(photo, `Additional ${index + 1}`)).join("")}</div>`
            : `<div class="empty-photo">No additional evidence photos uploaded.</div>`
        }
    </div>

    <div class="section">
        <h2>Recommendations / Issues Found</h2>
        <div class="text-block">${escHtml(recommendations)}</div>
    </div>

    ${report.customer_facing_note
            ? `
                <div class="section">
                    <h2>Customer-Facing Note</h2>
                    <div class="text-block">${escHtml(report.customer_facing_note)}</div>
                </div>
            `
            : ""
        }

    <div class="section">
        <h2>Completion Statement</h2>
        <div class="text-block">${escHtml(completionStatement)}</div>
    </div>

    <div class="footer-note">
        Show your work. Get paid with confidence.
    </div>
</section>

</body>
</html>
`;
}