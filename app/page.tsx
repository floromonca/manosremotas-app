import Link from "next/link";

const problemCards = [
  {
    icon: "search",
    title: "The “Where is it?” Trap",
    text: "Photos, job notes, addresses, customer requests, and technician updates get buried in messy chat histories.",
  },
  {
    icon: "receipt",
    title: "The Billing Gap",
    text: "Materials, extra hours, and completed work can be forgotten before the invoice is created.",
  },
  {
    icon: "eye",
    title: "The Blind Spot",
    text: "Owners and admins do not always know which jobs need attention, which are ready to invoice, or which ones are costing too much time.",
  },
];

const workflowSteps = [
  {
    icon: "clipboard",
    title: "Office",
    text: "Create the customer, build the work order, add services, and assign the job to your technician.",
  },
  {
    icon: "phone",
    title: "Field",
    text: "Technicians see assigned work, track progress, add notes, and capture before-and-after evidence.",
  },
  {
    icon: "receipt",
    title: "Billing",
    text: "Turn completed work into clear invoices with itemized details, taxes, PDF generation, email delivery, and payment tracking.",
  },
  {
    icon: "chart",
    title: "Growth",
    text: "See what needs attention, what is ready to invoice, and where your operation can become more profitable.",
  },
];

const features = [
  {
    icon: "phone",
    title: "Field-Ready Mobile Experience",
    detail: "A simple mobile workflow technicians can actually use on real job sites.",
  },
  {
    icon: "camera",
    title: "Photo Evidence Vault",
    detail: "Protect your business with before, during, and after photos attached to the right work order.",
  },
  {
    icon: "receipt",
    title: "Smart Invoicing",
    detail: "Create clear invoices from completed work with taxes, PDF generation, email delivery, and payment tracking.",
  },
  {
    icon: "list",
    title: "Service Catalog",
    detail: "Standardize common services, units, and pricing so work orders and invoices are faster to prepare.",
  },
  {
    icon: "layout",
    title: "Admin Control Center",
    detail: "See active work, delayed jobs, technicians working, and jobs ready to invoice from one operational view.",
  },
  {
    icon: "users",
    title: "Customer History",
    detail: "Keep customer details, service activity, work orders, photos, and billing history connected.",
  },
];

const industries = [
  "HVAC & Refrigeration",
  "Electrical Contractors",
  "Plumbing & Mechanical",
  "IT Field Services & CCTV",
  "Renovation & Handyman Teams",
  "Property Maintenance",
  "Cleaning and Facility Services",
  "General Field Service Teams",
];

const trustPoints = [
  "Private workspace for each company",
  "Role-based access for admins and technicians",
  "Mobile-first experience for field workers",
  "Connected job history, evidence, invoices, and payments",
  "Designed for small teams with 1–20 employees",
  "Built for real service operations, not generic task management",
];

export default function Home() {
  return (
    <main className="mr-public-page">
      <style>{`
                .mr-public-page {
                    min-height: 100vh;
                    background: #ffffff;
                    color: #0f172a;
                    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }

                .mr-header {
                    position: sticky;
                    top: 0;
                    z-index: 50;
                    background: rgba(255, 255, 255, 0.94);
                    border-bottom: 1px solid #e2e8f0;
                    backdrop-filter: blur(14px);
                }

                .mr-header-inner {
                    max-width: 1120px;
                    margin: 0 auto;
                    padding: 14px 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                }

                .mr-brand {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    text-decoration: none;
                    color: #0f172a;
                    min-width: 0;
                }

                .mr-brand-mark {
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    background: #2563eb;
                    color: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 13px;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
                    flex: 0 0 auto;
                }

                .mr-brand-name {
                    font-size: 20px;
                    font-weight: 900;
                    letter-spacing: -0.03em;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .mr-nav {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    flex: 0 0 auto;
                }

                .mr-signin {
                    color: #475569;
                    text-decoration: none;
                    font-weight: 700;
                    font-size: 14px;
                }

                .mr-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 42px;
                    padding: 0 20px;
                    border-radius: 10px;
                    text-decoration: none;
                    font-size: 14px;
                    font-weight: 800;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    box-sizing: border-box;
                }

                .mr-button-primary {
                    background: #2563eb;
                    color: #ffffff;
                    border: 1px solid #2563eb;
                    box-shadow: 0 10px 20px rgba(37, 99, 235, 0.15);
                }

                .mr-button-primary:hover {
                    background: #1d4ed8;
                    transform: translateY(-1px);
                }

                .mr-button-secondary {
                    background: #ffffff;
                    color: #0f172a;
                    border: 1px solid #cbd5e1;
                }

           .mr-hero {
    padding: 62px 24px 60px;
    background:
        radial-gradient(circle at top right, rgba(219, 234, 254, 0.85), transparent 34%),
        linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.mr-hero-layout {
    display: grid;
    grid-template-columns: minmax(0, 0.78fr) minmax(520px, 1.22fr);
    align-items: center;
    gap: 52px;
}

.mr-hero-content {
    text-align: left;
}

.mr-hero-visual {
    position: relative;
}

.mr-hero-image-frame {
    overflow: hidden;
    border: 1px solid #dbeafe;
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 30px 76px rgba(15, 23, 42, 0.14);
}

.mr-hero-image {
    display: block;
    width: 100%;
    height: auto;
    min-height: 0;
    object-fit: contain;
    object-position: center;
}

                .mr-container {
                    max-width: 1120px;
                    margin: 0 auto;
                }

                .mr-eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 14px;
                    background: #eff6ff;
                    border: 1px solid #dbeafe;
                    color: #2563eb;
                    border-radius: 999px;
                    font-size: 13px;
                    font-weight: 800;
                    margin-bottom: 24px;
                }

                .mr-eyebrow-dot {
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 999px;
                    box-shadow: 0 0 0 5px rgba(16, 185, 129, 0.1);
                }

         .mr-hero-title {
    margin: 0 0 20px;
    max-width: 560px;
    font-size: clamp(42px, 5vw, 60px);
                    font-weight: 950;
                    line-height: 1.05;
                    letter-spacing: -0.055em;
                    color: #0f172a;
                }

              .mr-hero-copy {
    margin: 0 0 28px;
    max-width: 600px;
                    font-size: 19px;
                    color: #475569;
                    line-height: 1.6;
                }

               .mr-hero-actions {
    display: flex;
    justify-content: flex-start;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .mr-hero-note {
                    margin-top: 14px;
                    color: #64748b;
                    font-size: 14px;
                    font-weight: 650;
                }

              .mr-section {
    padding: 72px 24px;
}

                .mr-section-soft {
                    background: #f8fafc;
                }

                .mr-section-heading {
                    max-width: 760px;
                    margin: 0 auto;
                    text-align: center;
                }

                .mr-section-title {
                    margin: 0;
                    font-size: clamp(30px, 3.5vw, 42px);
                    font-weight: 950;
                    line-height: 1.12;
                    letter-spacing: -0.045em;
                    color: #0f172a;
                }

                .mr-section-copy {
                    margin: 14px auto 0;
                    max-width: 740px;
                    color: #475569;
                    font-size: 16px;
                    line-height: 1.7;
                }

              .mr-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 22px;
    margin-top: 38px;
}

                .mr-card {
                    padding: 28px;
                    border-radius: 20px;
                    border: 1px solid #e2e8f0;
                    background: #ffffff;
                    transition: border-color 0.2s ease, transform 0.2s ease;
                }

                .mr-card:hover {
                    border-color: #cbd5e1;
                    transform: translateY(-2px);
                }

                .mr-card-icon {
                    position: relative;
                    display: inline-flex;
                    width: 36px;
                    height: 36px;
                    margin-bottom: 14px;
                    border-radius: 12px;
                    border: 1px solid #dbeafe;
                    background: #eff6ff;
                    color: #2563eb;
                    flex: 0 0 auto;
                }

                .mr-card-icon::before,
                .mr-card-icon::after {
                    content: "";
                    position: absolute;
                    box-sizing: border-box;
                }

                .mr-icon-warning {
                    background: #fff1f2;
                    border-color: #fecdd3;
                    color: #dc2626;
                }

                .mr-icon-success {
                    background: #ecfdf5;
                    border-color: #bbf7d0;
                    color: #16a34a;
                }

                .mr-workflow-card .mr-card-icon {
                    background: rgba(147, 197, 253, 0.12);
                    border-color: rgba(147, 197, 253, 0.28);
                    color: #93c5fd;
                }

                .mr-icon-search::before {
                    width: 14px;
                    height: 14px;
                    left: 9px;
                    top: 9px;
                    border: 2px solid currentColor;
                    border-radius: 999px;
                }

                .mr-icon-search::after {
                    width: 9px;
                    height: 2px;
                    left: 21px;
                    top: 23px;
                    background: currentColor;
                    border-radius: 999px;
                    transform: rotate(45deg);
                }

                .mr-icon-receipt::before {
                    width: 16px;
                    height: 20px;
                    left: 10px;
                    top: 8px;
                    border: 2px solid currentColor;
                    border-radius: 5px;
                }

                .mr-icon-receipt::after {
                    width: 9px;
                    height: 2px;
                    left: 14px;
                    top: 14px;
                    background: currentColor;
                    border-radius: 999px;
                    box-shadow: 0 6px 0 currentColor, 0 11px 0 currentColor;
                }

                .mr-icon-eye::before {
                    width: 20px;
                    height: 13px;
                    left: 8px;
                    top: 12px;
                    border: 2px solid currentColor;
                    border-radius: 999px;
                }

                .mr-icon-eye::after {
                    width: 6px;
                    height: 6px;
                    left: 15px;
                    top: 16px;
                    background: currentColor;
                    border-radius: 999px;
                }

                .mr-icon-clipboard::before {
                    width: 16px;
                    height: 19px;
                    left: 10px;
                    top: 10px;
                    border: 2px solid currentColor;
                    border-radius: 5px;
                }

                .mr-icon-clipboard::after {
                    width: 9px;
                    height: 2px;
                    left: 14px;
                    top: 7px;
                    background: currentColor;
                    border-radius: 999px;
                    box-shadow: 0 10px 0 currentColor, 0 15px 0 currentColor;
                }

                .mr-icon-phone::before {
                    width: 15px;
                    height: 22px;
                    left: 10px;
                    top: 7px;
                    border: 2px solid currentColor;
                    border-radius: 7px;
                }

                .mr-icon-phone::after {
                    width: 4px;
                    height: 4px;
                    left: 16px;
                    top: 23px;
                    background: currentColor;
                    border-radius: 999px;
                }

                .mr-icon-chart::before {
                    width: 18px;
                    height: 16px;
                    left: 9px;
                    top: 12px;
                    border-left: 2px solid currentColor;
                    border-bottom: 2px solid currentColor;
                    border-radius: 0 0 0 3px;
                }

                .mr-icon-chart::after {
                    width: 15px;
                    height: 10px;
                    left: 13px;
                    top: 12px;
                    border-left: 2px solid currentColor;
                    border-top: 2px solid currentColor;
                    transform: skewY(-32deg);
                    transform-origin: left bottom;
                }

                .mr-icon-camera::before {
                    width: 20px;
                    height: 16px;
                    left: 8px;
                    top: 13px;
                    border: 2px solid currentColor;
                    border-radius: 5px;
                }

                .mr-icon-camera::after {
                    width: 8px;
                    height: 8px;
                    left: 14px;
                    top: 17px;
                    border: 2px solid currentColor;
                    border-radius: 999px;
                    box-shadow: -7px -6px 0 -2px currentColor;
                }

                .mr-icon-list::before {
                    width: 16px;
                    height: 2px;
                    left: 12px;
                    top: 11px;
                    background: currentColor;
                    border-radius: 999px;
                    box-shadow: 0 7px 0 currentColor, 0 14px 0 currentColor;
                }

                .mr-icon-list::after {
                    width: 4px;
                    height: 4px;
                    left: 7px;
                    top: 10px;
                    background: currentColor;
                    border-radius: 999px;
                    box-shadow: 0 7px 0 currentColor, 0 14px 0 currentColor;
                }

                .mr-icon-layout::before {
                    width: 7px;
                    height: 7px;
                    left: 9px;
                    top: 9px;
                    background: currentColor;
                    border-radius: 2px;
                    box-shadow: 11px 0 0 currentColor, 0 11px 0 currentColor, 11px 11px 0 currentColor;
                }

                .mr-icon-users::before {
                    width: 8px;
                    height: 8px;
                    left: 10px;
                    top: 9px;
                    border: 2px solid currentColor;
                    border-radius: 999px;
                    box-shadow: 11px 4px 0 -1px currentColor;
                }

                .mr-icon-users::after {
                    width: 19px;
                    height: 10px;
                    left: 8px;
                    top: 21px;
                    border: 2px solid currentColor;
                    border-bottom: 0;
                    border-radius: 999px 999px 0 0;
                }

                .mr-icon-check::before {
                    width: 15px;
                    height: 8px;
                    left: 12px;
                    top: 14px;
                    border-left: 2px solid currentColor;
                    border-bottom: 2px solid currentColor;
                    transform: rotate(-45deg);
                }

                .mr-card-kicker {
                    color: #2563eb;
                    font-weight: 950;
                    font-size: 13px;
                    margin-bottom: 10px;
                }

                .mr-card-title {
                    margin: 0;
                    font-size: 19px;
                    line-height: 1.25;
                    font-weight: 900;
                    color: #0f172a;
                }

                .mr-card-text {
                    margin: 12px 0 0;
                    color: #475569;
                    font-size: 15px;
                    line-height: 1.62;
                }

                .mr-workflow {
                    background: #0f172a;
                    color: #ffffff;
                }

                .mr-workflow .mr-section-title {
                    color: #ffffff;
                }

                .mr-workflow .mr-section-copy {
                    color: #cbd5e1;
                }

                .mr-workflow-card {
                    background: rgba(255, 255, 255, 0.07);
                    border-color: rgba(255, 255, 255, 0.14);
                }

                .mr-workflow-card:hover {
                    border-color: rgba(255, 255, 255, 0.26);
                }

                .mr-workflow-card .mr-card-title {
                    color: #ffffff;
                }

                .mr-workflow-card .mr-card-text {
                    color: #cbd5e1;
                }

                .mr-workflow-card .mr-card-kicker {
                    color: #93c5fd;
                }
.mr-workflow-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
}
                .mr-role-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 22px;
                    margin-top: 48px;
                }

                .mr-role-card {
                    border-radius: 24px;
                    padding: 30px;
                    border: 1px solid #e2e8f0;
                    background: #ffffff;
                }

                .mr-role-card-dark {
                    background: #0f172a;
                    color: #ffffff;
                    border-color: #0f172a;
                }

                .mr-role-card h3 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 950;
                    letter-spacing: -0.04em;
                }

                .mr-role-list {
                    margin: 20px 0 0;
                    padding: 0;
                    list-style: none;
                    display: grid;
                    gap: 10px;
                }

                .mr-role-list li {
                    color: inherit;
                    opacity: 0.9;
                    font-size: 15px;
                    line-height: 1.45;
                }

                .mr-industry-tags {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 10px;
                    margin-top: 34px;
                }

                .mr-tag {
                    padding: 9px 16px;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 999px;
                    font-size: 14px;
                    font-weight: 750;
                    color: #475569;
                }

                .mr-trust-grid {
                    margin-top: 38px;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 14px;
                }

                .mr-trust-point {
                    position: relative;
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    border-radius: 16px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    padding: 16px;
                    color: #334155;
                    font-size: 14px;
                    font-weight: 800;
                }

                .mr-trust-point::before {
                    content: "";
                    width: 18px;
                    height: 18px;
                    margin-top: 1px;
                    border-radius: 999px;
                    background: #ecfdf5;
                    border: 1px solid #bbf7d0;
                    flex: 0 0 auto;
                    box-shadow: inset 0 0 0 4px #ffffff;
                }

                .mr-trust-point::after {
                    content: "";
                    position: absolute;
                    left: 22px;
                    top: 21px;
                    width: 8px;
                    height: 4px;
                    border-left: 2px solid #16a34a;
                    border-bottom: 2px solid #16a34a;
                    transform: rotate(-45deg);
                }

                .mr-final-cta {
                    padding: 92px 24px;
                    background: #2563eb;
                    color: #ffffff;
                    text-align: center;
                }

                .mr-final-cta h2 {
                    margin: 0;
                    font-size: clamp(34px, 4vw, 48px);
                    font-weight: 950;
                    line-height: 1.08;
                    letter-spacing: -0.055em;
                }

                .mr-final-cta p {
                    margin: 16px auto 0;
                    max-width: 680px;
                    color: #dbeafe;
                    font-size: 17px;
                    line-height: 1.65;
                }

                .mr-final-cta .mr-button {
                    margin-top: 30px;
                    background: #ffffff;
                    color: #1d4ed8;
                    border: 1px solid #ffffff;
                }

                .mr-footer {
                    padding: 44px 24px;
                    text-align: center;
                    border-top: 1px solid #f1f5f9;
                    color: #94a3b8;
                    font-size: 14px;
                    background: #ffffff;
                }

                .mr-footer strong {
                    color: #0f172a;
                }

               @media (max-width: 760px) {
    .mr-header-inner {
        padding: 7px 14px;
    }

    .mr-brand-mark {
        width: 30px;
        height: 30px;
        border-radius: 9px;
        font-size: 11px;
    }

    .mr-brand-name {
        font-size: 15px;
    }

    .mr-signin {
        display: none;
    }

   .mr-button {
    min-height: 34px;
    padding: 0 10px;
    font-size: 12px;
    border-radius: 9px;
}

  .mr-hero {
    padding: 36px 16px 30px;
}

.mr-hero-layout {
    display: block;
}

.mr-hero-content {
    text-align: center;
}

.mr-hero-visual {
    margin-top: 28px;
}

.mr-hero-image-frame {
    border-radius: 20px;
}

.mr-hero-title {
    margin-left: auto;
    margin-right: auto;
}

.mr-hero-copy {
    margin-left: auto;
    margin-right: auto;
}

    .mr-eyebrow {
        font-size: 12px;
        padding: 6px 11px;
        margin-bottom: 16px;
    }

    .mr-hero-title {
        font-size: 34px;
        line-height: 1.06;
        letter-spacing: -0.045em;
        margin-bottom: 18px;
    }

    .mr-hero-copy {
        font-size: 15px;
        line-height: 1.5;
        margin-bottom: 22px;
    }

    .mr-hero-actions {
        gap: 10px;
    }

    .mr-hero-actions .mr-button {
        flex: 1 1 100%;
    }

    .mr-hero-note {
        margin-top: 14px;
        font-size: 13px;
        line-height: 1.4;
    }

    .mr-section {
        padding: 36px 16px;
    }

    .mr-hero + .mr-section {
        padding-top: 30px;
    }

    .mr-section-title {
        font-size: 25px;
        line-height: 1.12;
        letter-spacing: -0.035em;
    }

    .mr-section-copy {
        margin-top: 10px;
        font-size: 14px;
        line-height: 1.5;
    }

    .mr-card-grid {
        margin-top: 26px;
        gap: 14px;
    }

    .mr-card {
        padding: 17px;
        border-radius: 16px;
    }

    .mr-card-title {
        font-size: 17px;
        line-height: 1.22;
    }

    .mr-card-text {
        margin-top: 8px;
        font-size: 13px;
        line-height: 1.48;
    }

    .mr-card-kicker {
        margin-bottom: 8px;
        font-size: 12px;
    }

    .mr-role-grid {
        grid-template-columns: 1fr;
        gap: 14px;
        margin-top: 26px;
    }

    .mr-role-card {
        padding: 20px;
        border-radius: 18px;
    }

    .mr-role-card h3 {
        font-size: 21px;
    }

    .mr-role-list {
        margin-top: 16px;
        gap: 8px;
    }

    .mr-role-list li {
        font-size: 14px;
        line-height: 1.4;
    }

    .mr-industry-tags {
        margin-top: 26px;
        gap: 9px;
    }

    .mr-tag {
        padding: 8px 13px;
        font-size: 13px;
    }

    .mr-trust-grid {
        margin-top: 24px;
        gap: 10px;
    }

    .mr-trust-point {
        padding: 13px;
        font-size: 13px;
        line-height: 1.4;
    }

    .mr-final-cta {
        padding: 54px 16px;
    }

    .mr-final-cta p {
        font-size: 15px;
        line-height: 1.5;
    }

    .mr-footer {
        padding: 34px 16px;
    }
            .mr-workflow {
        padding-top: 46px;
        padding-bottom: 46px;
    }

    .mr-workflow .mr-card-grid {
        margin-top: 28px;
        gap: 14px;
    }

    .mr-workflow-card {
        padding: 18px;
        border-radius: 17px;
    }

    .mr-workflow-card .mr-card-title {
        font-size: 18px;
    }

    .mr-workflow-card .mr-card-text {
        font-size: 13px;
        line-height: 1.5;
    }
            .mr-header {
        position: sticky;
        top: 0;
    }

    .mr-section {
        scroll-margin-top: 68px;
    }

    .mr-final-cta {
        scroll-margin-top: 68px;
    }
            .mr-section-soft .mr-card-grid {
        margin-top: 24px;
        gap: 12px;
    }

    .mr-section-soft .mr-card {
        padding: 16px;
        border-radius: 15px;
    }

    .mr-section-soft .mr-card-title {
        font-size: 16px;
        line-height: 1.22;
    }

    .mr-section-soft .mr-card-text {
        margin-top: 7px;
        font-size: 13px;
        line-height: 1.44;
    }
        .mr-workflow-grid {
    grid-template-columns: 1fr;
}
    .mr-hero-image-frame {
    min-height: 0;
    border-radius: 20px;
}

.mr-hero-image {
    min-height: 0;
    height: auto;
    object-fit: contain;
    transform: none;
}
}
            `}</style>

      <header className="mr-header">
        <div className="mr-header-inner">
          <Link href="/" className="mr-brand">
            <span className="mr-brand-mark">MR</span>
            <span className="mr-brand-name">ManosRemotas</span>
          </Link>

          <nav className="mr-nav" aria-label="Main navigation">
            <Link href="/auth" className="mr-signin">
              Sign in
            </Link>
            <a href="/request-access" className="mr-button mr-button-primary">
              Request Early Access
            </a>
          </nav>
        </div>
      </header>

      <section className="mr-hero">
        <div className="mr-container">
          <div className="mr-hero-layout">
            <div className="mr-hero-content">
              <div className="mr-eyebrow">
                <span className="mr-eyebrow-dot" />
                Built for service teams in Ontario & North America
              </div>

              <h1 className="mr-hero-title">
                Stop losing profit to paperwork.
              </h1>

              <p className="mr-hero-copy">
                ManosRemotas helps service contractors organize jobs, technicians,
                photos, invoices, and payments in one clear, mobile-ready workflow.
              </p>

              <div className="mr-hero-actions">
                <a href="/request-access" className="mr-button mr-button-primary">
                  Request Early Access
                </a>
                <Link href="/auth" className="mr-button mr-button-secondary">
                  Sign in
                </Link>
              </div>

              <div className="mr-hero-note">
                Built for contractors who want less admin work, clearer billing, and better control.
              </div>
            </div>

            <div className="mr-hero-visual" aria-hidden="true">
              <div className="mr-hero-image-frame">
                <img
                  className="mr-hero-image"
                  src="/landing/manosremotas-hero-workflow.png"
                  alt=""
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mr-section">
        <div className="mr-container">
          <div className="mr-section-heading">
            <h2 className="mr-section-title">
              Your business is growing, but your tools are holding you back.
            </h2>
            <p className="mr-section-copy">
              When job details are scattered across WhatsApp, paper notes,
              spreadsheets, photos, and phone calls, your team loses time —
              and your business can lose money.
            </p>
          </div>

          <div className="mr-card-grid">
            {problemCards.map((card) => (
              <article key={card.title} className="mr-card">
                <span
                  className={`mr-card-icon mr-icon-warning mr-icon-${card.icon}`}
                  aria-hidden="true"
                />
                <h3 className="mr-card-title">{card.title}</h3>
                <p className="mr-card-text">{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mr-section mr-workflow">
        <div className="mr-container">
          <div className="mr-section-heading">
            <h2 className="mr-section-title">One workflow. Total control.</h2>
            <p className="mr-section-copy">
              Everything from first call to final payment — connected in one operating workflow.
            </p>
          </div>

          <div className="mr-card-grid mr-workflow-grid">
            {workflowSteps.map((step, index) => (
              <article key={step.title} className="mr-card mr-workflow-card">
                <span
                  className={`mr-card-icon mr-icon-${step.icon}`}
                  aria-hidden="true"
                />
                <div className="mr-card-kicker">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="mr-card-title">{step.title}</h3>
                <p className="mr-card-text">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mr-section">
        <div className="mr-container">
          <div className="mr-section-heading">
            <h2 className="mr-section-title">
              Designed for both the office and the field.
            </h2>
          </div>

          <div className="mr-role-grid">
            <article className="mr-role-card mr-role-card-dark">
              <h3>For owners and admins</h3>
              <ul className="mr-role-list">
                <li>✓ See what needs attention</li>
                <li>✓ Assign work faster</li>
                <li>✓ Track job progress</li>
                <li>✓ Know what is ready to invoice</li>
                <li>✓ Reduce missed billing details</li>
              </ul>
            </article>

            <article className="mr-role-card">
              <h3>For technicians</h3>
              <ul className="mr-role-list">
                <li>✓ Start the day from My Day</li>
                <li>✓ See assigned work clearly</li>
                <li>✓ Track progress on each job</li>
                <li>✓ Upload photo evidence</li>
                <li>✓ Keep work simple from the phone</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="mr-section mr-section-soft">
        <div className="mr-container">
          <div className="mr-section-heading">
            <h2 className="mr-section-title">
              Features built for the field.
            </h2>
            <p className="mr-section-copy">
              Practical tools for daily field operations, billing clarity, and customer history.
            </p>
          </div>

          <div className="mr-card-grid">
            {features.map((feature) => (
              <article key={feature.title} className="mr-card">
                <span
                  className={`mr-card-icon mr-icon-${feature.icon}`}
                  aria-hidden="true"
                />
                <h3 className="mr-card-title">{feature.title}</h3>
                <p className="mr-card-text">{feature.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mr-section">
        <div className="mr-container">
          <div className="mr-section-heading">
            <h2 className="mr-section-title">
              Designed for the trades that keep homes and businesses running.
            </h2>
            <p className="mr-section-copy">
              ManosRemotas is built for small service teams that need practical
              field operations software without unnecessary complexity.
            </p>
          </div>

          <div className="mr-industry-tags">
            {industries.map((industry) => (
              <span key={industry} className="mr-tag">
                {industry}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mr-section mr-section-soft">
        <div className="mr-container">
          <div className="mr-section-heading">
            <h2 className="mr-section-title">Control without complexity.</h2>
            <p className="mr-section-copy">
              ManosRemotas gives each company a private workspace with
              role-based access, mobile-first technician tools, connected
              work orders, evidence, invoices, and payments.
            </p>
          </div>

          <div className="mr-trust-grid">
            {trustPoints.map((point) => (
              <div key={point} className="mr-trust-point">
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="request-access" className="mr-final-cta">
        <div className="mr-container">
          <h2>Ready to take control of your field operations?</h2>
          <p>
            Request early access to ManosRemotas and start building a cleaner
            way to manage jobs, technicians, evidence, invoices, and payments.
          </p>

          <a href="/request-access" className="mr-button">
            Request Early Access
          </a>
        </div>
      </section>

      <footer className="mr-footer">
        <div className="mr-container">
          <strong>ManosRemotas</strong>
          <p>Field service operations software for small service teams.</p>
          <p>© 2026 ManosRemotas. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
