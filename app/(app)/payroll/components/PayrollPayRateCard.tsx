"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { supabase } from "@/lib/supabaseClient";
import { MR_THEME } from "@/lib/theme";

export type PayrollPayRate = {
  hourly_rate: number | null;
  currency_code: string | null;
  effective_from: string | null;
};

type PayrollPayRateCardProps = {
  companyId: string;
  userId: string;
  activePayRate: PayrollPayRate | null;
  onPayRateSaved: (payRate: PayrollPayRate | null) => void;
};

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value: number | null | undefined, currencyCode?: string | null) {
  if (value === null || value === undefined) return "Not configured";

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currencyCode || "CAD",
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not configured";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  if (typeof error === "string") return error;
  return "Could not save hourly rate.";
}

export default function PayrollPayRateCard({
  companyId,
  userId,
  activePayRate,
  onPayRateSaved,
}: PayrollPayRateCardProps) {
  const [hourlyRateInput, setHourlyRateInput] = useState("");
  const [currencyInput, setCurrencyInput] = useState("CAD");
  const [effectiveFromInput, setEffectiveFromInput] = useState(todayDateInput());
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setHourlyRateInput(
      activePayRate?.hourly_rate != null ? String(activePayRate.hourly_rate) : ""
    );
    setCurrencyInput(activePayRate?.currency_code?.trim() || "CAD");
    setEffectiveFromInput(activePayRate?.effective_from?.slice(0, 10) || todayDateInput());
  }, [activePayRate]);

  async function savePayRate() {
    setSuccessMessage("");
    setErrorMessage("");

    const parsedHourlyRate = Number(hourlyRateInput);
    if (!hourlyRateInput.trim() || !Number.isFinite(parsedHourlyRate) || parsedHourlyRate < 0) {
      setErrorMessage("Enter a valid hourly rate greater than or equal to 0.");
      return;
    }

    const nextCurrency = currencyInput.trim().toUpperCase();
    if (!nextCurrency || nextCurrency.length !== 3) {
      setErrorMessage("Currency must be a 3-letter code like CAD.");
      return;
    }

    if (!effectiveFromInput) {
      setErrorMessage("Effective from date is required.");
      return;
    }

    setSaving(true);

    try {
      if (activePayRate) {
        const previousEndDate = new Date(`${effectiveFromInput}T00:00:00`);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        const previousEndDateStr = previousEndDate.toISOString().slice(0, 10);

        const { error: closePreviousError } = await supabase
          .from("member_pay_rates")
          .update({
            effective_to: previousEndDateStr,
          })
          .eq("company_id", companyId)
          .eq("user_id", userId)
          .is("effective_to", null);

        if (closePreviousError) throw closePreviousError;
      }

      const { data, error: insertError } = await supabase
        .from("member_pay_rates")
        .insert({
          company_id: companyId,
          user_id: userId,
          hourly_rate: parsedHourlyRate,
          currency_code: nextCurrency,
          effective_from: effectiveFromInput,
          effective_to: null,
        })
        .select("hourly_rate, currency_code, effective_from")
        .maybeSingle();

      if (insertError) throw insertError;

      const nextPayRate = (data as PayrollPayRate | null) ?? {
        hourly_rate: parsedHourlyRate,
        currency_code: nextCurrency,
        effective_from: effectiveFromInput,
      };

      onPayRateSaved(nextPayRate);
      setSuccessMessage("Hourly rate saved.");
    } catch (error) {
      const message = getErrorMessage(error);
      console.warn("[payroll-profile] Could not save hourly rate:", {
        companyId,
        userId,
        error,
      });
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={styles.card}>
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Hourly Rate</p>
          <h2 style={styles.title}>Hourly Rate</h2>
          <p style={styles.subtitle}>Used to estimate payroll from worked hours.</p>
          {activePayRate?.hourly_rate != null ? (
            <p style={styles.contextLine}>
              Current active rate:{" "}
              <strong>{formatMoney(activePayRate.hourly_rate, activePayRate.currency_code)}</strong>
              {" · "}
              Effective {formatDate(activePayRate.effective_from)}
            </p>
          ) : (
            <p style={styles.contextLine}>No active hourly rate configured yet.</p>
          )}
        </div>
        <span style={activePayRate?.hourly_rate != null ? styles.activePill : styles.warningPill}>
          {activePayRate?.hourly_rate != null ? "Configured" : "Missing"}
        </span>
      </div>

      {errorMessage ? <div style={styles.error}>{errorMessage}</div> : null}
      {successMessage ? <div style={styles.success}>{successMessage}</div> : null}

      <div style={styles.formGrid}>
        <label style={styles.field}>
          Hourly rate
          <input
            type="number"
            min={0}
            step="0.01"
            value={hourlyRateInput}
            onChange={(event) => {
              setHourlyRateInput(event.target.value);
              setSuccessMessage("");
              setErrorMessage("");
            }}
            disabled={saving}
            placeholder="30.00"
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          Currency
          <input
            value={currencyInput}
            onChange={(event) => {
              setCurrencyInput(event.target.value.toUpperCase());
              setSuccessMessage("");
              setErrorMessage("");
            }}
            disabled={saving}
            maxLength={3}
            placeholder="CAD"
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          Effective from
          <input
            type="date"
            value={effectiveFromInput}
            onChange={(event) => {
              setEffectiveFromInput(event.target.value);
              setSuccessMessage("");
              setErrorMessage("");
            }}
            disabled={saving}
            style={styles.input}
          />
        </label>
      </div>

      <div style={styles.footer}>
        <p style={styles.helperText}>
          Saving a new rate preserves payroll history by creating a new effective record.
        </p>
        <button
          type="button"
          onClick={savePayRate}
          disabled={saving}
          style={{
            ...styles.primaryButton,
            opacity: saving ? 0.7 : 1,
            cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Rate"}
        </button>
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    marginTop: 16,
    padding: "18px 20px",
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: MR_THEME.radius.card,
    background: MR_THEME.colors.cardBg,
    boxShadow: MR_THEME.shadows.cardSoft,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
  },
  eyebrow: {
    margin: 0,
    color: MR_THEME.colors.primary,
    fontSize: 12,
    fontWeight: 850,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    margin: "4px 0 0",
    color: MR_THEME.colors.textPrimary,
    fontSize: 24,
    lineHeight: 1.2,
    fontWeight: 850,
  },
  subtitle: {
    margin: "6px 0 0",
    color: MR_THEME.colors.textSecondary,
    fontSize: 14,
    lineHeight: 1.4,
  },
  contextLine: {
    margin: "8px 0 0",
    color: MR_THEME.colors.textMuted,
    fontSize: 13,
    lineHeight: 1.4,
    fontWeight: 700,
  },
  activePill: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "0 12px",
    borderRadius: 999,
    background: "#e7f7ee",
    color: MR_THEME.colors.success,
    fontSize: 13,
    fontWeight: 850,
  },
  warningPill: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "0 12px",
    borderRadius: 999,
    background: "#fff4db",
    color: MR_THEME.colors.warning,
    fontSize: 13,
    fontWeight: 850,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },
  field: {
    display: "grid",
    gap: 6,
    color: MR_THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: 800,
  },
  input: {
    width: "100%",
    minHeight: 40,
    padding: "0 12px",
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    borderRadius: MR_THEME.radius.control,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: 750,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 16,
  },
  helperText: {
    margin: 0,
    color: MR_THEME.colors.textSecondary,
    fontSize: 13,
    lineHeight: 1.4,
  },
  primaryButton: {
    minHeight: 42,
    padding: "0 18px",
    border: "none",
    borderRadius: MR_THEME.radius.control,
    background: MR_THEME.colors.primary,
    color: "#fff",
    fontSize: 14,
    fontWeight: 850,
    boxShadow: MR_THEME.shadows.cardSoft,
  },
  error: {
    marginBottom: 12,
    padding: "12px 14px",
    border: `1px solid ${MR_THEME.colors.danger}`,
    borderRadius: MR_THEME.radius.control,
    background: "#fff1f2",
    color: MR_THEME.colors.danger,
    fontSize: 14,
    fontWeight: 750,
  },
  success: {
    marginBottom: 12,
    padding: "12px 14px",
    border: `1px solid ${MR_THEME.colors.success}`,
    borderRadius: MR_THEME.radius.control,
    background: "#ecfdf5",
    color: MR_THEME.colors.success,
    fontSize: 14,
    fontWeight: 750,
  },
};
