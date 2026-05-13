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

  if (isCanadianCountry(country)) {
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

export function isCanadianCountry(country: string | null | undefined) {
  const normalized = String(country ?? "").trim().toLowerCase();
  return normalized === "ca" || normalized === "canada";
}

export function isCanadianTaxProfile(taxName: string | null | undefined) {
  const normalized = String(taxName ?? "").trim().toUpperCase();
  return ["GST", "HST", "PST", "QST"].includes(normalized);
}

export function formatTaxRegistrationNumber(
  value: string | null | undefined,
  country: string | null | undefined,
) {
  const raw = String(value ?? "").trim();

  if (!raw || !isCanadianCountry(country)) return raw;

  const compact = raw.replace(/\s+/g, "").toUpperCase();
  const match = compact.match(/^(\d{9})((?:RT|RP|RM|RC)\d{4})$/);

  if (!match) return raw;

  return `${match[1]} ${match[2]}`;
}

export function taxCurrencyProfileWarning(
  currencyCode: string | null | undefined,
  taxName: string | null | undefined,
) {
  const currency = String(currencyCode ?? "").trim().toUpperCase();

  if (currency && currency !== "CAD" && isCanadianTaxProfile(taxName)) {
    return `${String(taxName ?? "Canadian tax").trim()} is usually used with CAD. This invoice is saved as ${currency}. Review the company currency and tax profile before sending.`;
  }

  return "";
}

export type InvoiceTaxBreakdownItem = {
  quantity?: number | null;
  qty?: number | null;
  unit_price?: number | null;
  line_subtotal?: number | null;
  line_tax?: number | null;
  line_total?: number | null;
  tax_rate?: number | null;
};

function roundCurrency(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

export function isTaxableInvoiceItem(item: InvoiceTaxBreakdownItem | null | undefined) {
  const taxRate = Number(item?.tax_rate ?? 0);
  const lineTax = Number(item?.line_tax ?? 0);

  return (
    (Number.isFinite(taxRate) && taxRate > 0) ||
    (Number.isFinite(lineTax) && lineTax > 0)
  );
}

export function calculateInvoiceTaxBreakdown(items: InvoiceTaxBreakdownItem[]) {
  const breakdown = items.reduce(
    (acc, item) => {
      const quantity = item.quantity ?? item.qty;
      const lineSubtotal = preTaxLineAmount(
        quantity,
        item.unit_price,
        item.line_subtotal,
      );
      const taxRate = normalizeTaxRate(item.tax_rate);
      const lineTax =
        item.line_tax != null && Number.isFinite(Number(item.line_tax))
          ? Number(item.line_tax)
          : lineSubtotal * taxRate;
      const isTaxable = isTaxableInvoiceItem(item);

      acc.subtotal += lineSubtotal;
      acc.taxTotal += lineTax;

      if (isTaxable) {
        acc.taxableSubtotal += lineSubtotal;
        acc.hasTaxableItems = true;
      } else {
        acc.nonTaxableSubtotal += lineSubtotal;
        acc.hasNonTaxableItems = true;
      }

      return acc;
    },
    {
      subtotal: 0,
      taxableSubtotal: 0,
      nonTaxableSubtotal: 0,
      taxTotal: 0,
      hasTaxableItems: false,
      hasNonTaxableItems: false,
    },
  );

  return {
    subtotal: roundCurrency(breakdown.subtotal),
    taxableSubtotal: roundCurrency(breakdown.taxableSubtotal),
    nonTaxableSubtotal: roundCurrency(breakdown.nonTaxableSubtotal),
    taxTotal: roundCurrency(breakdown.taxTotal),
    hasTaxableItems: breakdown.hasTaxableItems,
    hasNonTaxableItems: breakdown.hasNonTaxableItems,
    hasMixedTaxability: breakdown.hasTaxableItems && breakdown.hasNonTaxableItems,
  };
}
