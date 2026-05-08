export function normalizeTaxRate(rate: number | null | undefined) {
  const value = Number(rate ?? 0);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value > 1 ? value / 100 : value;
}

export function formatTaxRatePercent(rate: number | null | undefined) {
  const normalized = normalizeTaxRate(rate);
  const percent = normalized * 100;
  if (!Number.isFinite(percent)) return "";

  return Number(percent.toFixed(3)).toString();
}

export function formatTaxSummaryLabel(
  taxName: string | null | undefined,
  taxRate: number | null | undefined,
) {
  const cleanName = String(taxName ?? "").trim();
  const cleanRate = formatTaxRatePercent(taxRate);

  if (!cleanName || !cleanRate) return "Tax";

  return `${cleanName} ${cleanRate}%`;
}

export function taxRegistrationLabel(country: string | null | undefined) {
  const normalized = String(country ?? "").trim().toLowerCase();

  if (normalized === "ca" || normalized === "canada") {
    return "GST/HST No";
  }

  if (
    normalized === "us" ||
    normalized === "usa" ||
    normalized === "united states" ||
    normalized === "united states of america"
  ) {
    return "Tax ID / Sales Tax Permit No";
  }

  return "Tax Registration No";
}

export function preTaxLineAmount(
  qty: number | null | undefined,
  unitPrice: number | null | undefined,
  storedLineSubtotal?: number | null,
) {
  if (storedLineSubtotal != null && Number.isFinite(Number(storedLineSubtotal))) {
    return Number(storedLineSubtotal);
  }

  return Number(qty ?? 0) * Number(unitPrice ?? 0);
}
