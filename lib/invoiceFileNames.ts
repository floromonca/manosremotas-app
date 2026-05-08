function cleanFilePart(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildInvoicePdfFileName(params: {
  invoiceNumber?: string | null;
  customerName?: string | null;
}) {
  const invoiceNumber = cleanFilePart(params.invoiceNumber) || "invoice";
  const customerName = cleanFilePart(params.customerName);
  const parts = ["invoice", invoiceNumber, customerName].filter(Boolean);

  return `${parts.join("-")}.pdf`;
}
