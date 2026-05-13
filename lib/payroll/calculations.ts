export type PayrollV1Status =
  | "Ready"
  | "Needs Review"
  | "Open Shift"
  | "Missing Rate"
  | "Missing Schedule"
  | "No Activity";

export type PayrollV1Flag =
  | "Missing rate"
  | "Missing schedule"
  | "Open shift"
  | "Over scheduled hours"
  | "Under scheduled hours"
  | "No shifts";

export type PayrollShiftInput = {
  check_in_at: string | null;
  check_out_at: string | null;
};

export type PayrollScheduleInput = {
  day_of_week: number;
  is_working_day: boolean;
  start_time: string | null;
  end_time: string | null;
  unpaid_break_minutes: number | null;
};

export type PayrollRateInput = {
  hourly_rate: number | null;
  currency_code: string | null;
};

export type PayrollV1Row = {
  user_id: string;
  full_name: string | null;
  role: string | null;
  scheduled_hours: number;
  worked_hours: number;
  difference_hours: number;
  hourly_rate: number | null;
  currency_code: string;
  estimated_pay: number | null;
  flags: PayrollV1Flag[];
  status: PayrollV1Status;
};

export type PayrollV1RowInput = {
  user_id: string;
  full_name: string | null;
  role: string | null;
  scheduleRows: PayrollScheduleInput[];
  shifts: PayrollShiftInput[];
  rate: PayrollRateInput | null;
  startDate: string;
  endDate: string;
  now?: Date;
};

type PayrollFlagInput = {
  scheduledHours: number;
  workedHours: number;
  hasRate: boolean;
  hasSchedule: boolean;
  hasOpenShift: boolean;
};

const DEFAULT_CURRENCY_CODE = "CAD";

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getInclusiveDateRange(startDate: string, endDate: string) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (!start || !end || end < start) return [];

  const dates: Date[] = [];
  for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, 1)) {
    dates.push(cursor);
  }

  return dates;
}

function parseTimeToMinutes(value: string | null) {
  if (!value) return null;

  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function getScheduleHoursForDay(schedule: PayrollScheduleInput) {
  if (!schedule.is_working_day) return 0;

  const startMinutes = parseTimeToMinutes(schedule.start_time);
  const endMinutes = parseTimeToMinutes(schedule.end_time);

  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
    return 0;
  }

  const breakMinutes = Math.max(0, schedule.unpaid_break_minutes ?? 0);
  const scheduledMinutes = Math.max(0, endMinutes - startMinutes - breakMinutes);

  return scheduledMinutes / 60;
}

function getRangeBounds(startDate: string, endDate: string) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (!start || !end || end < start) return null;

  return {
    startMs: start.getTime(),
    endMs: addUtcDays(end, 1).getTime(),
  };
}

export function calculateScheduledHoursForRange(
  scheduleRows: PayrollScheduleInput[],
  startDate: string,
  endDate: string
) {
  const dates = getInclusiveDateRange(startDate, endDate);
  if (dates.length === 0 || scheduleRows.length === 0) return 0;

  const scheduleByDay = new Map<number, PayrollScheduleInput>();
  scheduleRows.forEach((row) => {
    if (Number.isInteger(row.day_of_week) && row.day_of_week >= 0 && row.day_of_week <= 6) {
      scheduleByDay.set(row.day_of_week, row);
    }
  });

  const totalHours = dates.reduce((sum, date) => {
    const schedule = scheduleByDay.get(date.getUTCDay());
    if (!schedule) return sum;

    return sum + getScheduleHoursForDay(schedule);
  }, 0);

  return roundToTwo(totalHours);
}

export function calculateWorkedHoursFromShifts(
  shifts: PayrollShiftInput[],
  startDate: string,
  endDate: string,
  now = new Date()
) {
  const bounds = getRangeBounds(startDate, endDate);
  if (!bounds || shifts.length === 0) return 0;

  const nowMs = now.getTime();
  const totalMs = shifts.reduce((sum, shift) => {
    if (!shift.check_in_at) return sum;

    const rawStart = new Date(shift.check_in_at).getTime();
    const rawEnd = shift.check_out_at ? new Date(shift.check_out_at).getTime() : nowMs;

    if (Number.isNaN(rawStart) || Number.isNaN(rawEnd) || rawEnd <= rawStart) {
      return sum;
    }

    const boundedStart = Math.max(rawStart, bounds.startMs);
    const boundedEnd = Math.min(rawEnd, bounds.endMs);

    if (boundedEnd <= boundedStart) return sum;

    return sum + (boundedEnd - boundedStart);
  }, 0);

  return roundToTwo(totalMs / 1000 / 60 / 60);
}

export function hasOpenShift(shifts: PayrollShiftInput[]) {
  return shifts.some((shift) => !!shift.check_in_at && !shift.check_out_at);
}

export function calculateEstimatedPay(
  workedHours: number,
  hourlyRate: number | null | undefined
) {
  if (hourlyRate == null) return null;

  return roundToTwo(workedHours * hourlyRate);
}

export function getPayrollFlags(input: PayrollFlagInput) {
  const flags: PayrollV1Flag[] = [];
  const scheduledHours = roundToTwo(input.scheduledHours);
  const workedHours = roundToTwo(input.workedHours);

  if (!input.hasRate) flags.push("Missing rate");
  if (!input.hasSchedule) flags.push("Missing schedule");
  if (input.hasOpenShift) flags.push("Open shift");
  if (workedHours === 0 && !input.hasOpenShift) flags.push("No shifts");

  if (input.hasSchedule && workedHours > scheduledHours) {
    flags.push("Over scheduled hours");
  }

  if (input.hasSchedule && workedHours < scheduledHours) {
    flags.push("Under scheduled hours");
  }

  return flags;
}

export function getPayrollStatus(
  flags: PayrollV1Flag[],
  workedHours: number
): PayrollV1Status {
  if (flags.includes("Missing rate")) return "Missing Rate";
  if (flags.includes("Missing schedule")) return "Missing Schedule";
  if (flags.includes("Open shift")) return "Open Shift";
  if (workedHours === 0 && !flags.includes("Open shift")) return "No Activity";
  if (
    flags.includes("Over scheduled hours") ||
    flags.includes("Under scheduled hours")
  ) {
    return "Needs Review";
  }

  return "Ready";
}

export function buildPayrollV1Row(input: PayrollV1RowInput): PayrollV1Row {
  const scheduledHours = calculateScheduledHoursForRange(
    input.scheduleRows,
    input.startDate,
    input.endDate
  );
  const workedHours = calculateWorkedHoursFromShifts(
    input.shifts,
    input.startDate,
    input.endDate,
    input.now
  );
  const openShift = hasOpenShift(input.shifts);
  const hourlyRate = input.rate?.hourly_rate ?? null;
  const hasRate = hourlyRate != null;
  const hasSchedule = input.scheduleRows.length > 0;
  const flags = getPayrollFlags({
    scheduledHours,
    workedHours,
    hasRate,
    hasSchedule,
    hasOpenShift: openShift,
  });

  return {
    user_id: input.user_id,
    full_name: input.full_name,
    role: input.role,
    scheduled_hours: scheduledHours,
    worked_hours: workedHours,
    difference_hours: roundToTwo(workedHours - scheduledHours),
    hourly_rate: hourlyRate,
    currency_code: input.rate?.currency_code ?? DEFAULT_CURRENCY_CODE,
    estimated_pay: calculateEstimatedPay(workedHours, hourlyRate),
    flags,
    status: getPayrollStatus(flags, workedHours),
  };
}
