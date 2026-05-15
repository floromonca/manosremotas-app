"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";
type Lang = "en" | "es";

type RequestAccessFormProps = {
    lang: Lang;
};

const requestAccessContent = {
    en: {
        back: "← Back to home",
        eyebrow: "Early Access",
        title: "Request early access to ManosRemotas",
        lead:
            "Tell us a little about your company. We are opening access first for field service teams, contractors, and trade businesses that want a cleaner way to manage work orders, technicians, evidence, and invoicing.",
        benefits: [
            "Built for small field service teams",
            "Focused on work orders, mobile execution, and billing",
            "Designed for contractors in North America",
        ],
        formTitle: "Join the early access list",
        formCopy:
            "Share your information and we will contact you as soon as early access becomes available for your business.",
        fullName: "Full name",
        fullNamePlaceholder: "Your name",
        companyName: "Company name",
        companyNamePlaceholder: "Your company",
        email: "Work email",
        emailPlaceholder: "you@company.com",
        phone: "Phone number",
        optional: "Optional",
        phonePlaceholder: "+1 555 000 0000",
        location: "Country / Province",
        locationPlaceholder: "Ontario, Canada",
        businessType: "Business type",
        selectOne: "Select one",
        businessTypes: {
            electrical: "Electrical",
            renovation: "Renovation / handyman",
            hvac: "HVAC",
            plumbing: "Plumbing",
            propertyMaintenance: "Property maintenance",
            other: "Other field service business",
        },
        message: "Message",
        messagePlaceholder: "Tell us what you want to manage better...",
        submit: "Request Early Access",
        submitting: "Sending request...",
        success:
            "Thank you. Your request has been received. We will contact you soon.",
        fallbackError: "We could not send your request. Please try again.",
        networkError: "Network error. Please check your connection and try again.",
    },
    es: {
        back: "← Volver al inicio",
        eyebrow: "Acceso anticipado",
        title: "Solicita acceso anticipado a ManosRemotas",
        lead:
            "Cuéntanos un poco sobre tu empresa. Estamos abriendo acceso primero para equipos de servicio en campo, contratistas y negocios de oficios que quieren una forma más clara de manejar órdenes de trabajo, técnicos, evidencia y facturación.",
        benefits: [
            "Creado para pequeños equipos de servicio en campo",
            "Enfocado en órdenes de trabajo, ejecución móvil y facturación",
            "Diseñado para contratistas en Norteamérica",
        ],
        formTitle: "Únete a la lista de acceso anticipado",
        formCopy:
            "Comparte tu información y te contactaremos tan pronto el acceso anticipado esté disponible para tu negocio.",
        fullName: "Nombre completo",
        fullNamePlaceholder: "Tu nombre",
        companyName: "Nombre de la empresa",
        companyNamePlaceholder: "Tu empresa",
        email: "Correo de trabajo",
        emailPlaceholder: "tu@empresa.com",
        phone: "Número de teléfono",
        optional: "Opcional",
        phonePlaceholder: "+1 555 000 0000",
        location: "País / Provincia",
        locationPlaceholder: "Ontario, Canadá",
        businessType: "Tipo de negocio",
        selectOne: "Selecciona una opción",
        businessTypes: {
            electrical: "Electricidad",
            renovation: "Renovación / handyman",
            hvac: "HVAC",
            plumbing: "Plomería",
            propertyMaintenance: "Mantenimiento de propiedades",
            other: "Otro negocio de servicio en campo",
        },
        message: "Mensaje",
        messagePlaceholder: "Cuéntanos qué quieres manejar mejor...",
        submit: "Solicitar acceso anticipado",
        submitting: "Enviando solicitud...",
        success:
            "Gracias. Hemos recibido tu solicitud. Te contactaremos pronto.",
        fallbackError: "No pudimos enviar tu solicitud. Inténtalo nuevamente.",
        networkError:
            "Error de conexión. Revisa tu internet e inténtalo nuevamente.",
    },
} as const;

export default function RequestAccessForm({ lang }: RequestAccessFormProps) {
    const content = requestAccessContent[lang];
    const homeHref = lang === "es" ? "/?lang=es" : "/";

    const [submitState, setSubmitState] = useState<SubmitState>("idle");
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submitState === "submitting") return;

        setSubmitState("submitting");
        setErrorMessage("");

        const form = event.currentTarget;
        const formData = new FormData(form);

        const payload = {
            fullName: String(formData.get("fullName") ?? ""),
            companyName: String(formData.get("companyName") ?? ""),
            email: String(formData.get("email") ?? ""),
            phone: String(formData.get("phone") ?? ""),
            location: String(formData.get("location") ?? ""),
            businessType: String(formData.get("businessType") ?? ""),
            message: String(formData.get("message") ?? ""),
            website: String(formData.get("website") ?? ""),
        };

        try {
            const response = await fetch("/api/request-access", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.ok) {
                setSubmitState("error");
                setErrorMessage(data?.error || content.fallbackError);
                return;
            }

            form.reset();
            setSubmitState("success");
        } catch (error) {
            console.error("request access submit error:", error);
            setSubmitState("error");
            setErrorMessage(content.networkError);
        }
    }

    return (
        <main className="mr-request-page">
            <section className="mr-request-shell">
                <div className="mr-request-card">
                    <div className="mr-request-copy">
                        <div className="mr-request-brand" aria-label="ManosRemotas">
                            <span className="mr-request-brand-logo-wrap">
                                <img
                                    src="/brand/manosremotas-mark.png"
                                    alt=""
                                    className="mr-request-brand-logo"
                                />
                            </span>
                            <span>ManosRemotas</span>
                        </div>

                        <Link href={homeHref} className="mr-back-link">
                            {content.back}
                        </Link>
                        <div className="mr-eyebrow">{content.eyebrow}</div>
                        <h1>{content.title}</h1>

                        <p className="mr-lead">{content.lead}</p>

                        <div className="mr-benefits">
                            {content.benefits.map((benefit) => (
                                <div key={benefit}>
                                    <span />
                                    {benefit}
                                </div>
                            ))}
                        </div>
                    </div>

                    <form className="mr-request-form" onSubmit={handleSubmit}>
                        <input
                            className="mr-honeypot"
                            name="website"
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden="true"
                        />

                        <div className="mr-form-header">
                            <h2>{content.formTitle}</h2>
                            <p>{content.formCopy}</p>
                        </div>

                        <label>
                            {content.fullName}
                            <input
                                name="fullName"
                                type="text"
                                placeholder={content.fullNamePlaceholder}
                                required
                                disabled={submitState === "submitting"}
                            />
                        </label>

                        <label>
                            {content.companyName}
                            <input
                                name="companyName"
                                type="text"
                                placeholder={content.companyNamePlaceholder}
                                required
                                disabled={submitState === "submitting"}
                            />
                        </label>

                        <label>
                            {content.email}
                            <input
                                name="email"
                                type="email"
                                placeholder={content.emailPlaceholder}
                                required
                                disabled={submitState === "submitting"}
                            />
                        </label>

                        <label>
                            {content.phone} <span>{content.optional}</span>
                            <input
                                name="phone"
                                type="tel"
                                placeholder={content.phonePlaceholder}
                                disabled={submitState === "submitting"}
                            />
                        </label>

                        <label>
                            {content.location}
                            <input
                                name="location"
                                type="text"
                                placeholder={content.locationPlaceholder}
                                disabled={submitState === "submitting"}
                            />
                        </label>

                        <label>
                            {content.businessType}
                            <select
                                name="businessType"
                                defaultValue=""
                                disabled={submitState === "submitting"}
                            >
                                <option value="" disabled>
                                    {content.selectOne}
                                </option>
                                <option value="electrical">
                                    {content.businessTypes.electrical}
                                </option>
                                <option value="renovation">
                                    {content.businessTypes.renovation}
                                </option>
                                <option value="hvac">{content.businessTypes.hvac}</option>
                                <option value="plumbing">
                                    {content.businessTypes.plumbing}
                                </option>
                                <option value="property-maintenance">
                                    {content.businessTypes.propertyMaintenance}
                                </option>
                                <option value="other">{content.businessTypes.other}</option>
                            </select>
                        </label>

                        <label>
                            {content.message} <span>{content.optional}</span>
                            <textarea
                                name="message"
                                rows={4}
                                placeholder={content.messagePlaceholder}
                                disabled={submitState === "submitting"}
                            />
                        </label>

                        <button type="submit" disabled={submitState === "submitting"}>
                            {submitState === "submitting" ? content.submitting : content.submit}
                        </button>

                        {submitState === "success" ? (
                            <div className="mr-form-note mr-form-note-success">
                                {content.success}
                            </div>
                        ) : null}

                        {submitState === "error" ? (
                            <div className="mr-form-note mr-form-note-error">
                                {errorMessage}
                            </div>
                        ) : null}
                    </form>
                </div>
            </section>

            <style jsx>{`
                .mr-request-page {
                    min-height: 100vh;
                    background:
                        radial-gradient(circle at top left, rgba(37, 99, 235, 0.14), transparent 34%),
                        linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%);
                    color: #0f172a;
                    padding: 32px 20px;
                    font-family:
                        Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
                        "Segoe UI", sans-serif;
                }

                .mr-request-shell {
                    width: 100%;
                    max-width: 1120px;
                    margin: 0 auto;
                    min-height: calc(100vh - 64px);
                    display: flex;
                    align-items: center;
                }

                .mr-request-card {
                    width: 100%;
                    display: grid;
                    grid-template-columns: minmax(0, 0.95fr) minmax(360px, 1.05fr);
                    gap: 28px;
                    align-items: stretch;
                }

                .mr-request-copy,
                .mr-request-form {
                    background: rgba(255, 255, 255, 0.86);
                    border: 1px solid #dbe5f2;
                    border-radius: 28px;
                    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.1);
                }

                .mr-request-copy {
                    padding: 40px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
.mr-request-brand {
    width: 100%;
    display: grid;
    justify-items: center;
    gap: 10px;
    color: #0f172a;
    text-decoration: none;
    font-size: 22px;
    font-weight: 950;
    letter-spacing: -0.04em;
    margin-bottom: 22px;
    text-align: center;
}

.mr-request-brand-logo-wrap {
    width: 72px;
    height: 72px;
    border-radius: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #ffffff;
    border: 1px solid #dbeafe;
    box-shadow: 0 18px 42px rgba(37, 99, 235, 0.18);
    flex: 0 0 auto;
}

.mr-request-brand-logo {
    width: 64px;
    height: 64px;
    object-fit: contain;
    display: block;
}
   .mr-back-link {
    width: fit-content;
    justify-self: center;
    color: #64748b;
    text-decoration: none;
    font-size: 14px;
    font-weight: 800;
    margin-bottom: 18px;
}

                .mr-back-link:hover {
                    text-decoration: underline;
                }

                .mr-eyebrow {
                    width: fit-content;
                    border: 1px solid #bfdbfe;
                    background: #eff6ff;
                    color: #1d4ed8;
                    border-radius: 999px;
                    padding: 8px 12px;
                    font-size: 12px;
                    font-weight: 900;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    margin-bottom: 18px;
                }

                h1 {
                    margin: 0;
                    font-size: clamp(36px, 5vw, 58px);
                    line-height: 0.98;
                    letter-spacing: -0.055em;
                }

                .mr-lead {
                    margin: 22px 0 0;
                    color: #475569;
                    font-size: 18px;
                    line-height: 1.7;
                    max-width: 620px;
                }

                .mr-benefits {
                    display: grid;
                    gap: 14px;
                    margin-top: 32px;
                }

                .mr-benefits div {
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                    color: #334155;
                    font-size: 15px;
                    font-weight: 750;
                    line-height: 1.5;
                }

                .mr-benefits span {
                    width: 20px;
                    height: 20px;
                    border-radius: 999px;
                    background: #ecfdf5;
                    border: 1px solid #bbf7d0;
                    flex: 0 0 auto;
                    position: relative;
                    margin-top: 1px;
                }

                .mr-benefits span::after {
                    content: "";
                    position: absolute;
                    left: 6px;
                    top: 5px;
                    width: 7px;
                    height: 4px;
                    border-left: 2px solid #16a34a;
                    border-bottom: 2px solid #16a34a;
                    transform: rotate(-45deg);
                }
.mr-honeypot {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
}
                .mr-request-form {
                    padding: 30px;
                    display: grid;
                    gap: 16px;
                }

                .mr-form-header {
                    margin-bottom: 4px;
                }

                .mr-form-header h2 {
                    margin: 0;
                    font-size: 24px;
                    letter-spacing: -0.03em;
                }

                .mr-form-header p {
                    margin: 8px 0 0;
                    color: #64748b;
                    font-size: 14px;
                    line-height: 1.6;
                }

                label {
                    display: grid;
                    gap: 7px;
                    color: #0f172a;
                    font-size: 13px;
                    font-weight: 900;
                }

                label span {
                    color: #94a3b8;
                    font-weight: 750;
                }

                input,
                select,
                textarea {
                    width: 100%;
                    border: 1px solid #cbd5e1;
                    background: #ffffff;
                    color: #0f172a;
                    border-radius: 14px;
                    padding: 13px 14px;
                    font: inherit;
                    font-size: 15px;
                    outline: none;
                    transition:
                        border-color 0.15s ease,
                        box-shadow 0.15s ease;
                }

                textarea {
                    resize: vertical;
                }

                input:focus,
                select:focus,
                textarea:focus {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
                }

                input:disabled,
                select:disabled,
                textarea:disabled {
                    background: #f8fafc;
                    color: #94a3b8;
                    cursor: not-allowed;
                }

                button {
                    border: 0;
                    border-radius: 16px;
                    background: #2563eb;
                    color: #ffffff;
                    padding: 15px 18px;
                    font-size: 15px;
                    font-weight: 950;
                    cursor: pointer;
                    box-shadow: 0 16px 34px rgba(37, 99, 235, 0.25);
                }

                button:hover {
                    background: #1d4ed8;
                }

                button:disabled {
                    background: #93c5fd;
                    cursor: not-allowed;
                    box-shadow: none;
                }

                .mr-form-note {
                    border-radius: 14px;
                    padding: 12px 14px;
                    font-size: 14px;
                    font-weight: 800;
                    line-height: 1.5;
                }

                .mr-form-note-success {
                    border: 1px solid #bbf7d0;
                    background: #ecfdf5;
                    color: #166534;
                }

                .mr-form-note-error {
                    border: 1px solid #fecdd3;
                    background: #fff1f2;
                    color: #991b1b;
                }

                @media (max-width: 900px) {
                    .mr-request-page {
                        padding: 18px;
                    }

                    .mr-request-shell {
                        min-height: auto;
                    }

                    .mr-request-card {
                        grid-template-columns: 1fr;
                    }

                    .mr-request-copy,
                    .mr-request-form {
                        border-radius: 24px;
                    }

                    .mr-request-copy {
                        padding: 28px;
                    }

                    .mr-request-form {
                        padding: 24px;
                    }

                    .mr-back-link {
                        margin-bottom: 26px;
                    }
                }

                @media (max-width: 520px) {
                    .mr-request-page {
                        padding: 12px;
                    }

                    .mr-request-copy,
                    .mr-request-form {
                        padding: 22px;
                        border-radius: 22px;
                    }

                    h1 {
                        font-size: 36px;
                    }

                    .mr-lead {
                        font-size: 16px;
                    }
                }
            `}</style>
        </main>
    );
}