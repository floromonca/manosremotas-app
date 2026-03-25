import { supabase } from "../supabaseClient";

export type ShiftRow = {
  shift_id: string;
  company_id: string;
  user_id: string;
  check_in_at: string;
  check_out_at: string | null;
  note: string | null;
  created_at: string;
};

export type ShiftSummary = {
  totalSeconds: number;
  totalHours: number;
  shiftCount: number;
  lastCheckIn: string | null;
  lastCheckOut: string | null;
};

const SHIFT_SELECT =
  "shift_id, company_id, user_id, check_in_at, check_out_at, note, created_at";

async function getCurrentUserId() {
  const { data: u, error: uErr } = await supabase.auth.getUser();
  if (uErr) throw uErr;

  const uid = u.user?.id;
  if (!uid) throw new Error("No user id (not logged in)");

  return uid;
}

function getLocalDayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function getLocalWeekBounds(date = new Date()) {
  const base = new Date(date);
  const day = base.getDay(); // 0=Sunday, 1=Monday, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(base);
  start.setDate(base.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function calculateWorkedSeconds(
  shifts: ShiftRow[],
  rangeStart?: Date,
  rangeEnd?: Date,
  now = new Date()
) {
  return shifts.reduce((acc, shift) => {
    const rawStart = new Date(shift.check_in_at).getTime();
    const rawEnd = shift.check_out_at
      ? new Date(shift.check_out_at).getTime()
      : now.getTime();

    if (Number.isNaN(rawStart) || Number.isNaN(rawEnd) || rawEnd <= rawStart) {
      return acc;
    }

    const boundedStart = rangeStart
      ? Math.max(rawStart, rangeStart.getTime())
      : rawStart;

    const boundedEnd = rangeEnd
      ? Math.min(rawEnd, rangeEnd.getTime())
      : rawEnd;

    if (boundedEnd <= boundedStart) return acc;

    return acc + Math.floor((boundedEnd - boundedStart) / 1000);
  }, 0);
}

function roundHours(seconds: number) {
  return Math.round((seconds / 3600) * 100) / 100;
}

function buildShiftSummary(
  shifts: ShiftRow[],
  options?: {
    rangeStart?: Date;
    rangeEnd?: Date;
    now?: Date;
  }
): ShiftSummary {
  const now = options?.now ?? new Date();
  const rangeStart = options?.rangeStart;
  const rangeEnd = options?.rangeEnd;

  const totalSeconds = calculateWorkedSeconds(shifts, rangeStart, rangeEnd, now);

  const sortedByCheckInDesc = [...shifts].sort(
    (a, b) =>
      new Date(b.check_in_at).getTime() - new Date(a.check_in_at).getTime()
  );

  const sortedClosedByCheckOutDesc = [...shifts]
    .filter((s) => !!s.check_out_at)
    .sort(
      (a, b) =>
        new Date(b.check_out_at as string).getTime() -
        new Date(a.check_out_at as string).getTime()
    );

  return {
    totalSeconds,
    totalHours: roundHours(totalSeconds),
    shiftCount: shifts.length,
    lastCheckIn: sortedByCheckInDesc[0]?.check_in_at ?? null,
    lastCheckOut: sortedClosedByCheckOutDesc[0]?.check_out_at ?? null,
  };
}

export function formatDurationHHMMSS(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

export async function getOpenShift(companyId: string) {
  const uid = await getCurrentUserId();

  return await supabase
    .from("shifts")
    .select(SHIFT_SELECT)
    .eq("company_id", companyId)
    .eq("user_id", uid)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getLastShift(companyId: string) {
  const uid = await getCurrentUserId();

  return await supabase
    .from("shifts")
    .select(SHIFT_SELECT)
    .eq("company_id", companyId)
    .eq("user_id", uid)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getShiftsBetween(
  companyId: string,
  startIso: string,
  endIso: string
) {
  const uid = await getCurrentUserId();

  return await supabase
    .from("shifts")
    .select(SHIFT_SELECT)
    .eq("company_id", companyId)
    .eq("user_id", uid)
    .lt("check_in_at", endIso)
    .or(`check_out_at.is.null,check_out_at.gt.${startIso}`)
    .order("check_in_at", { ascending: false });
}

export async function getTodayShiftSummary(companyId: string) {
  const { startIso, endIso } = getLocalDayBounds();
  const rangeStart = new Date(startIso);
  const rangeEnd = new Date(endIso);

  const { data, error } = await getShiftsBetween(companyId, startIso, endIso);

  if (error) throw error;

  return buildShiftSummary((data ?? []) as ShiftRow[], {
    rangeStart,
    rangeEnd,
  });
}

export async function getWeekShiftSummary(companyId: string) {
  const { startIso, endIso } = getLocalWeekBounds();
  const rangeStart = new Date(startIso);
  const rangeEnd = new Date(endIso);

  const { data, error } = await getShiftsBetween(companyId, startIso, endIso);

  if (error) throw error;

  return buildShiftSummary((data ?? []) as ShiftRow[], {
    rangeStart,
    rangeEnd,
  });
}

export async function checkIn(companyId: string, note?: string) {
  const uid = await getCurrentUserId();

  const { data: existing, error: existingErr } = await supabase
    .from("shifts")
    .select("shift_id")
    .eq("company_id", companyId)
    .eq("user_id", uid)
    .is("check_out_at", null)
    .maybeSingle();

  if (existingErr) throw existingErr;

  if (existing) {
    throw new Error(
      "Ya tienes una jornada activa. Debes hacer check-out primero."
    );
  }

  return await supabase
    .from("shifts")
    .insert({
      company_id: companyId,
      user_id: uid,
      note: note ?? null,
    })
    .select(SHIFT_SELECT)
    .single();
}

export async function checkOut(shiftId: string) {
  if (!shiftId) throw new Error("shiftId requerido");

  return await supabase
    .from("shifts")
    .update({ check_out_at: new Date().toISOString() })
    .eq("shift_id", shiftId)
    .select(SHIFT_SELECT)
    .single();
}