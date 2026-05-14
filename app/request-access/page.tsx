import RequestAccessForm from "./RequestAccessForm";

type RequestAccessPageProps = {
    searchParams?: Promise<{
        lang?: string;
    }>;
};

export default async function RequestAccessPage({
    searchParams,
}: RequestAccessPageProps) {
    const resolvedSearchParams = await searchParams;
    const lang = resolvedSearchParams?.lang === "es" ? "es" : "en";

    return <RequestAccessForm lang={lang} />;
}