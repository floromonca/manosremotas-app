"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import {
  upsertMemberWorkSchedule,
  type MemberWorkScheduleInput,
  type MemberWorkScheduleRow,
} from "@/lib/supabase/memberWorkSchedules";
import { MR_THEME } from "@/lib/theme";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type EditableScheduleRow = {
  day_of_week: number;
  is_working_day: boolean;
  start_time: string;
  end_time: string;
  unpaid_break_minutes: number;
  timezone: string | null;
};

type MemberWorkScheduleCardProps = {
  companyId: string;
  userId: string;
  schedule: MemberWorkScheduleRow[];
  onScheduleSaved: (schedule: MemberWorkScheduleRow[]) => void;
};

function defaultTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function createDefaultRows(): EditableScheduleRow[] {
  const timezone = defaultTimezone();

  return DAYS.map((_, day) => {
    const isWeekday = day >= 1 && day <= 5;

    return {
      day_of_week: day,
      is_working_day: isWeekday,
      start_time: isWeekday ? "08:00" : "",
      end_time: isWeekday ? "16:00" : "",
      unpaid_break_minutes: 0,
      timezone,
    };
  });
}

function rowsFromSchedule(schedule: MemberWorkScheduleRow[]): EditableScheduleRow[] {
  if (schedule.length === 0) return createDefaultRows();

  const byDay = new Map(schedule.map((row) => [row.day_of_week, row]));
  const timezone = defaultTimezone();

  return DAYS.map((_, day) => {
    const row = byDay.get(day);
    const isWorkingDay = row?.is_working_day ?? false;

    return {
      day_of_week: day,
      is_working_day: isWorkingDay,
      start_time: isWorkingDay ? row?.start_time?.slice(0, 5) ?? "08:00" : "",
      end_time: isWorkingDay ? row?.end_time?.slice(0, 5) ?? "16:00" : "",
      unpaid_break_minutes: row?.unpaid_break_minutes ?? 0,
      timezone: row?.timezone ?? timezone,
    };
  });
}

function validateRows(rows: EditableScheduleRow[]) {
  const seenDays = new Set<number>();

  for (const row of rows) {
    if (!Number.isInteger(row.day_of_week) || row.day_of_week < 0 || row.day_of_week > 6) {
      return "Schedule day must be between Sunday and Saturday.";
    }

    if (seenDays.has(row.day_of_week)) {
      return "Schedule contains a duplicate day.";
    }
    seenDays.add(row.day_of_week);

    if (row.unpaid_break_minutes < 0) {
      return "Break minutes cannot be negative.";
    }

    if (row.is_working_day && (!row.start_time || !row.end_time)) {
      return `${DAYS[row.day_of_week]} needs a start and end time.`;
    }

    if (row.is_working_day && row.start_time >= row.end_time) {
      return `${DAYS[row.day_of_week]} end time must be after start time.`;
    }
  }

  return null;
}

function toScheduleInput(rows: EditableScheduleRow[]): MemberWorkScheduleInput[] {
  return rows.map((row) => ({
    day_of_week: row.day_of_week,
    is_working_day: row.is_working_day,
    start_time: row.is_working_day ? row.start_time : null,
    end_time: row.is_working_day ? row.end_time : null,
    unpaid_break_minutes: row.is_working_day ? row.unpaid_break_minutes : 0,
    timezone: row.timezone,
  }));
}

export default function MemberWorkScheduleCard({
  companyId,
  userId,
  schedule,
  onScheduleSaved,
}: MemberWorkScheduleCardProps) {
  const [rows, setRows] = useState<EditableScheduleRow[]>(() =>
    rowsFromSchedule(schedule)
  );
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setRows(rowsFromSchedule(schedule));
  }, [schedule]);

  const configuredSummary = useMemo(() => {
    const workingDays = rows.filter((row) => row.is_working_day).length;
    return `${workingDays} working day${workingDays === 1 ? "" : "s"}`;
  }, [rows]);

  function updateRow(day: number, patch: Partial<EditableScheduleRow>) {
    setRows((current) =>
      current.map((row) => {
        if (row.day_of_week !== day) return row;

        const next = { ...row, ...patch };
        if (patch.is_working_day === false) {
          next.start_time = "";
          next.end_time = "";
          next.unpaid_break_minutes = 0;
        }
        if (patch.is_working_day === true) {
          next.start_time = next.start_time || "08:00";
          next.end_time = next.end_time || "16:00";
        }

        return next;
      })
    );
    setSuccessMessage("");
    setErrorMessage("");
  }

  function setWeekdayDefault() {
    setRows(createDefaultRows());
    setSuccessMessage("");
    setErrorMessage("");
  }

  async function saveSchedule() {
    setSuccessMessage("");
    setErrorMessage("");

    const validationError = validateRows(rows);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);

    try {
      const savedRows = await upsertMemberWorkSchedule(
        companyId,
        userId,
        toScheduleInput(rows)
      );

      onScheduleSaved(savedRows);
      setSuccessMessage("Weekly schedule saved.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save weekly schedule.";
      console.warn("[payroll-profile] Could not save weekly schedule:", {
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
          <p style={styles.eyebrow}>Weekly Schedule</p>
          <h2 style={styles.title}>Weekly Schedule</h2>
          <p style={styles.subtitle}>
            Used to calculate scheduled hours for payroll estimates.
          </p>
        </div>
        <div style={styles.actions}>
          <span style={styles.summaryPill}>{configuredSummary}</span>
          <button
            type="button"
            onClick={setWeekdayDefault}
            style={styles.secondaryButton}
            disabled={saving}
          >
            Set Mon-Fri 8:00 AM - 4:00 PM
          </button>
        </div>
      </div>

      {errorMessage ? <div style={styles.error}>{errorMessage}</div> : null}
      {successMessage ? <div style={styles.success}>{successMessage}</div> : null}

      <div style={styles.days}>
        {rows.map((row) => (
          <div key={row.day_of_week} style={styles.dayRow}>
            <label style={styles.dayToggle}>
              <input
                type="checkbox"
                checked={row.is_working_day}
                onChange={(event) =>
                  updateRow(row.day_of_week, {
                    is_working_day: event.target.checked,
                  })
                }
                disabled={saving}
              />
              <span style={styles.dayName}>{DAYS[row.day_of_week]}</span>
              {!row.is_working_day ? <span style={styles.offPill}>Off</span> : null}
            </label>

            <div style={styles.inputs}>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>Start</span>
                <input
                  type="time"
                  value={row.start_time}
                  onChange={(event) =>
                    updateRow(row.day_of_week, { start_time: event.target.value })
                  }
                  disabled={!row.is_working_day || saving}
                  style={styles.input}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>End</span>
                <input
                  type="time"
                  value={row.end_time}
                  onChange={(event) =>
                    updateRow(row.day_of_week, { end_time: event.target.value })
                  }
                  disabled={!row.is_working_day || saving}
                  style={styles.input}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>Break</span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={row.unpaid_break_minutes}
                  onChange={(event) =>
                    updateRow(row.day_of_week, {
                      unpaid_break_minutes: Number(event.target.value),
                    })
                  }
                  disabled={!row.is_working_day || saving}
                  style={styles.breakInput}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.footer}>
        <button
          type="button"
          onClick={saveSchedule}
          style={styles.primaryButton}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Schedule"}
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
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
  summaryPill: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "0 12px",
    borderRadius: 999,
    background: MR_THEME.colors.primarySoft,
    color: MR_THEME.colors.primary,
    fontSize: 13,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  secondaryButton: {
    minHeight: 38,
    padding: "0 14px",
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    borderRadius: MR_THEME.radius.control,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  days: {
    display: "grid",
    gap: 8,
  },
  dayRow: {
    display: "grid",
    gridTemplateColumns: "minmax(170px, 0.8fr) minmax(300px, 1.4fr)",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: MR_THEME.radius.control,
    background: MR_THEME.colors.cardBgSoft,
  },
  dayToggle: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: MR_THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: 850,
  },
  dayName: {
    minWidth: 86,
  },
  offPill: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 24,
    padding: "0 10px",
    borderRadius: 999,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: 850,
  },
  inputs: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(90px, 1fr))",
    gap: 10,
  },
  field: {
    display: "grid",
    gap: 4,
  },
  fieldLabel: {
    color: MR_THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    minHeight: 38,
    padding: "0 10px",
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    borderRadius: MR_THEME.radius.control,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: 750,
  },
  breakInput: {
    width: "100%",
    minHeight: 38,
    padding: "0 10px",
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    borderRadius: MR_THEME.radius.control,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: 750,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 16,
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
    cursor: "pointer",
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
