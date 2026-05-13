"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useParams, useRouter } from "next/navigation";

import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuthState } from "@/hooks/useAuthState";
import { canManagePayroll } from "@/lib/security/roles";
import { getMemberWorkSchedule, type MemberWorkScheduleRow } from "@/lib/supabase/memberWorkSchedules";
import { supabase } from "@/lib/supabaseClient";
import { MR_THEME } from "@/lib/theme";
import MemberWorkScheduleCard from "../../components/MemberWorkScheduleCard";
import PayrollPayRateCard from "../../components/PayrollPayRateCard";

type MemberProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

type PayRateRow = {
  hourly_rate: number | null;
  currency_code: string | null;
  effective_from: string | null;
};

function humanRole(role: string | null) {
  if (!role) return "Member";

  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMoney(value: number | null | undefined, currencyCode?: string | null) {
  if (value === null || value === undefined) return "Not configured";

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currencyCode || "USD",
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function scheduleSummary(schedule: MemberWorkScheduleRow[]) {
  if (schedule.length === 0) return "Missing";

  const workingDays = schedule.filter((day) => day.is_working_day).length;
  if (workingDays === 0) return "No working days";

  return `${workingDays} working day${workingDays === 1 ? "" : "s"}`;
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

  return "Unable to load payroll profile.";
}

export default function PayrollMemberProfilePage() {
  const router = useRouter();
  const params = useParams<{ memberId: string }>();
  const memberId = params.memberId;

  const { user, authLoading } = useAuthState();
  const { companyId, myRole, isLoadingCompany } = useActiveCompany();

  const canAccessPayroll = canManagePayroll(myRole);

  const [member, setMember] = useState<MemberProfileRow | null>(null);
  const [payRate, setPayRate] = useState<PayRateRow | null>(null);
  const [schedule, setSchedule] = useState<MemberWorkScheduleRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const isBooting = authLoading || isLoadingCompany;

  useEffect(() => {
    if (isBooting) return;
    if (!user) {
      router.replace("/auth");
      return;
    }

    if (!canAccessPayroll) {
      router.replace("/my-day");
    }
  }, [canAccessPayroll, isBooting, router, user]);

  const loadMemberPayrollProfile = useCallback(async () => {
    if (!companyId || !memberId || !user || !canAccessPayroll) return;

    setIsLoading(true);
    setErrorMessage(null);
    setWarningMessage(null);

    try {
      const memberRes = await supabase
        .from("company_members")
        .select("user_id, full_name, email, role")
        .eq("company_id", companyId)
        .eq("user_id", memberId)
        .maybeSingle();

      if (memberRes.error) throw memberRes.error;

      const memberRow = memberRes.data as MemberProfileRow | null;
      if (!memberRow) {
        setMember(null);
        setPayRate(null);
        setSchedule([]);
        setErrorMessage("Payroll member not found in the active company.");
        return;
      }

      setMember({
        ...memberRow,
        email: memberRow.email,
      });

      const warnings: string[] = [];

      if (!memberRow.email) {
        const { data: profileEmailRow, error: profileEmailError } = await supabase
          .from("profiles")
          .select("email")
          .eq("company_id", companyId)
          .eq("user_id", memberId)
          .maybeSingle();

        if (profileEmailError) {
          const message = getErrorMessage(profileEmailError);
          console.warn("[payroll-profile] Could not load fallback profile email:", {
            companyId,
            memberId,
            error: profileEmailError,
          });
          warnings.push(`Profile email could not load: ${message}`);
        } else {
          const profileEmail =
            (profileEmailRow as { email?: string | null } | null)?.email ?? null;

          if (profileEmail) {
            setMember({
              ...memberRow,
              email: profileEmail,
            });
          }
        }
      }

      const payRateRes = await supabase
        .from("member_pay_rates")
        .select("hourly_rate, currency_code, effective_from")
        .eq("company_id", companyId)
        .eq("user_id", memberId)
        .is("effective_to", null)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (payRateRes.error) {
        const message = getErrorMessage(payRateRes.error);
        console.warn("[payroll-profile] Could not load active pay rate:", {
          companyId,
          memberId,
          error: payRateRes.error,
        });
        warnings.push(`Hourly rate could not load: ${message}`);
        setPayRate(null);
      } else {
        setPayRate((payRateRes.data as PayRateRow | null) ?? null);
      }

      try {
        const scheduleRows = await getMemberWorkSchedule(companyId, memberId);
        setSchedule(scheduleRows);
      } catch (scheduleError) {
        const message = getErrorMessage(scheduleError);
        console.warn("[payroll-profile] Could not load weekly schedule:", {
          companyId,
          memberId,
          error: scheduleError,
        });
        warnings.push(`Weekly schedule could not load: ${message}`);
        setSchedule([]);
      }

      setWarningMessage(warnings.length > 0 ? warnings.join(" ") : null);
    } catch (error) {
      const message = getErrorMessage(error);
      console.error("[payroll-profile] Could not load member profile:", {
        companyId,
        memberId,
        error,
      });
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [canAccessPayroll, companyId, memberId, user]);

  useEffect(() => {
    void loadMemberPayrollProfile();
  }, [loadMemberPayrollProfile]);

  const memberName = useMemo(() => {
    if (!member) return "Payroll member";
    return member.full_name || member.email || "Payroll member";
  }, [member]);

  if (isBooting || (user && !canAccessPayroll)) {
    return <PageState title="Payroll Profile" message="Checking payroll access..." />;
  }

  if (!companyId) {
    return (
      <PageState
        title="Payroll Profile"
        message="No active company selected."
        actionLabel="Back to Payroll"
        onAction={() => router.push("/payroll")}
      />
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Payroll</p>
          <h1 style={styles.title}>Payroll Profile</h1>
          <p style={styles.subtitle}>
            {member ? memberName : "Review payroll setup for this team member."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/payroll")}
          style={styles.secondaryButton}
        >
          Back to Payroll
        </button>
      </section>

      {errorMessage ? <div style={styles.alert}>{errorMessage}</div> : null}
      {warningMessage && !errorMessage ? (
        <div style={styles.warning}>{warningMessage}</div>
      ) : null}

      {isLoading ? (
        <section style={styles.card}>
          <p style={styles.muted}>Loading payroll profile...</p>
        </section>
      ) : null}

      {member ? (
        <>
          <section style={styles.memberCard}>
            <div style={styles.avatar}>{memberName.charAt(0).toUpperCase()}</div>
            <div>
              <h2 style={styles.memberName}>{memberName}</h2>
              <p style={styles.muted}>{member.email || "No email on file"}</p>
              <span style={styles.rolePill}>{humanRole(member.role)}</span>
            </div>
          </section>

          <section style={styles.grid}>
            <InfoCard
              label="Hourly Rate"
              value={formatMoney(payRate?.hourly_rate, payRate?.currency_code)}
              detail={
                payRate?.effective_from
                  ? `Effective ${formatDate(payRate.effective_from)}`
                  : "Rate setup will live in Payroll."
              }
              status={payRate?.hourly_rate ? "Configured" : "Missing"}
              tone={payRate?.hourly_rate ? "success" : "warning"}
            />
            <InfoCard
              label="Weekly Schedule"
              value={scheduleSummary(schedule)}
              detail={
                schedule.length > 0
                  ? "Used for scheduled hours."
                  : "Set a weekly schedule to calculate scheduled hours."
              }
              status={schedule.length > 0 ? "Configured" : "Missing"}
              tone={schedule.length > 0 ? "success" : "warning"}
            />
            <InfoCard
              label="This Period"
              value="Not calculated yet"
              detail="Worked hours and scheduled hours are not wired in this skeleton."
              status="Planned"
              tone="neutral"
            />
            <InfoCard
              label="Flags"
              value="No review data yet"
              detail="Open shifts, missing rate, and schedule flags come next."
              status="Planned"
              tone="neutral"
            />
          </section>

          <PayrollPayRateCard
            companyId={companyId}
            userId={member.user_id}
            activePayRate={payRate}
            onPayRateSaved={setPayRate}
          />

          <MemberWorkScheduleCard
            companyId={companyId}
            userId={member.user_id}
            schedule={schedule}
            onScheduleSaved={setSchedule}
          />
        </>
      ) : null}
    </main>
  );
}

function InfoCard({
  label,
  value,
  detail,
  status,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  status: string;
  tone: "success" | "warning" | "neutral";
}) {
  const toneStyle =
    tone === "success"
      ? styles.successPill
      : tone === "warning"
        ? styles.warningPill
        : styles.neutralPill;

  return (
    <article style={styles.card}>
      <div style={styles.cardHeader}>
        <p style={styles.cardLabel}>{label}</p>
        <span style={{ ...styles.statusPill, ...toneStyle }}>{status}</span>
      </div>
      <p style={styles.cardValue}>{value}</p>
      <p style={styles.cardDetail}>{detail}</p>
    </article>
  );
}

function PageState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.eyebrow}>Payroll</p>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.muted}>{message}</p>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} style={styles.secondaryButton}>
            {actionLabel}
          </button>
        ) : null}
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    width: "100%",
    maxWidth: 1180,
    margin: "0 auto",
    padding: "24px",
    color: MR_THEME.colors.textPrimary,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
    padding: "20px",
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: MR_THEME.radius.card,
    background: MR_THEME.colors.cardBg,
    boxShadow: MR_THEME.shadows.cardSoft,
  },
  eyebrow: {
    margin: 0,
    color: MR_THEME.colors.primary,
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    margin: "6px 0 0",
    fontSize: 34,
    lineHeight: 1.1,
    fontWeight: 800,
  },
  subtitle: {
    margin: "8px 0 0",
    color: MR_THEME.colors.textSecondary,
    fontSize: 16,
    lineHeight: 1.4,
  },
  secondaryButton: {
    minHeight: 42,
    padding: "0 18px",
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    borderRadius: MR_THEME.radius.control,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  alert: {
    marginBottom: 16,
    padding: "14px 16px",
    border: `1px solid ${MR_THEME.colors.warning}`,
    borderRadius: MR_THEME.radius.control,
    background: "#fff8e6",
    color: "#92400e",
    fontSize: 15,
    fontWeight: 700,
  },
  warning: {
    marginBottom: 16,
    padding: "14px 16px",
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    borderRadius: MR_THEME.radius.control,
    background: MR_THEME.colors.cardBgSoft,
    color: MR_THEME.colors.textSecondary,
    fontSize: 14,
    fontWeight: 700,
  },
  memberCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
    padding: "18px 20px",
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: MR_THEME.radius.card,
    background: MR_THEME.colors.cardBg,
    boxShadow: MR_THEME.shadows.cardSoft,
  },
  avatar: {
    width: 58,
    height: 58,
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: MR_THEME.colors.primarySoft,
    color: MR_THEME.colors.primary,
    fontSize: 26,
    fontWeight: 900,
  },
  memberName: {
    margin: 0,
    fontSize: 24,
    lineHeight: 1.2,
    fontWeight: 850,
  },
  rolePill: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
    marginTop: 10,
    padding: "0 12px",
    borderRadius: 999,
    background: MR_THEME.colors.cardBgSoft,
    color: MR_THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: 800,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  card: {
    padding: "18px 20px",
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: MR_THEME.radius.card,
    background: MR_THEME.colors.cardBg,
    boxShadow: MR_THEME.shadows.cardSoft,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  cardLabel: {
    margin: 0,
    color: MR_THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: 850,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  cardValue: {
    margin: 0,
    fontSize: 24,
    lineHeight: 1.2,
    fontWeight: 850,
  },
  cardDetail: {
    margin: "8px 0 0",
    color: MR_THEME.colors.textSecondary,
    fontSize: 14,
    lineHeight: 1.4,
  },
  muted: {
    margin: 0,
    color: MR_THEME.colors.textSecondary,
    fontSize: 15,
    lineHeight: 1.45,
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 24,
    padding: "0 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  successPill: {
    background: "#e7f7ee",
    color: MR_THEME.colors.success,
  },
  warningPill: {
    background: "#fff4db",
    color: MR_THEME.colors.warning,
  },
  neutralPill: {
    background: MR_THEME.colors.cardBgSoft,
    color: MR_THEME.colors.textSecondary,
  },
};
