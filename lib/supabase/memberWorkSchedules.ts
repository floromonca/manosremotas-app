import { supabase } from "../supabaseClient";

export type MemberWorkScheduleRow = {
  id: string;
  company_id: string;
  user_id: string;
  day_of_week: number;
  is_working_day: boolean;
  start_time: string | null;
  end_time: string | null;
  unpaid_break_minutes: number;
  timezone: string | null;
  created_at: string;
  updated_at: string;
};

export type MemberWorkScheduleInput = {
  day_of_week: number;
  is_working_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
  unpaid_break_minutes?: number | null;
  timezone?: string | null;
};

const MEMBER_WORK_SCHEDULE_SELECT =
  "id, company_id, user_id, day_of_week, is_working_day, start_time, end_time, unpaid_break_minutes, timezone, created_at, updated_at";

function assertRequiredIds(companyId: string, userId: string) {
  if (!companyId) throw new Error("companyId requerido");
  if (!userId) throw new Error("userId requerido");
}

function compareTimes(startTime: string, endTime: string) {
  return endTime > startTime;
}

function validateScheduleRows(rows: MemberWorkScheduleInput[]) {
  const seenDays = new Set<number>();

  rows.forEach((row) => {
    const day = row.day_of_week;
    const breakMinutes = row.unpaid_break_minutes ?? 0;
    const startTime = row.start_time ?? null;
    const endTime = row.end_time ?? null;

    if (!Number.isInteger(day) || day < 0 || day > 6) {
      throw new Error("day_of_week debe estar entre 0 y 6");
    }

    if (seenDays.has(day)) {
      throw new Error("No puede haber day_of_week duplicado");
    }
    seenDays.add(day);

    if (breakMinutes < 0) {
      throw new Error("unpaid_break_minutes no puede ser negativo");
    }

    if (row.is_working_day && (!startTime || !endTime)) {
      throw new Error("start_time y end_time son requeridos para días laborales");
    }

    if (startTime && endTime && !compareTimes(startTime, endTime)) {
      throw new Error("end_time debe ser mayor que start_time");
    }
  });
}

export async function getMemberWorkSchedule(companyId: string, userId: string) {
  assertRequiredIds(companyId, userId);

  const { data, error } = await supabase
    .from("member_work_schedules")
    .select(MEMBER_WORK_SCHEDULE_SELECT)
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .order("day_of_week", { ascending: true });

  if (error) throw error;

  return (data ?? []) as MemberWorkScheduleRow[];
}

export async function upsertMemberWorkSchedule(
  companyId: string,
  userId: string,
  rows: MemberWorkScheduleInput[]
) {
  assertRequiredIds(companyId, userId);
  validateScheduleRows(rows);

  const updatedAt = new Date().toISOString();
  const payload = rows.map((row) => ({
    company_id: companyId,
    user_id: userId,
    day_of_week: row.day_of_week,
    is_working_day: row.is_working_day,
    start_time: row.start_time ?? null,
    end_time: row.end_time ?? null,
    unpaid_break_minutes: row.unpaid_break_minutes ?? 0,
    timezone: row.timezone ?? null,
    updated_at: updatedAt,
  }));

  const { data, error } = await supabase
    .from("member_work_schedules")
    .upsert(payload, {
      onConflict: "company_id,user_id,day_of_week",
    })
    .select(MEMBER_WORK_SCHEDULE_SELECT)
    .order("day_of_week", { ascending: true });

  if (error) throw error;

  return (data ?? []) as MemberWorkScheduleRow[];
}
