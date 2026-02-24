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

export async function getOpenShift(companyId: string) {
  const { data: u, error: uErr } = await supabase.auth.getUser();
  if (uErr) throw uErr;

  const uid = u.user?.id;
  if (!uid) throw new Error("No user id (not logged in)");

  return await supabase
    .from("shifts")
    .select(
      "shift_id, company_id, user_id, check_in_at, check_out_at, note, created_at",
    )
    .eq("company_id", companyId)
    .eq("user_id", uid)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function checkIn(companyId: string, note?: string) {
  const { data: u, error: uErr } = await supabase.auth.getUser();
  if (uErr) throw uErr;

  const uid = u.user?.id;
  if (!uid) throw new Error("No user id (not logged in)");

  return await supabase
    .from("shifts")
    .insert({
      company_id: companyId,
      user_id: uid,
      note: note ?? null,
    })
    .select(
      "shift_id, company_id, user_id, check_in_at, check_out_at, note, created_at",
    )
    .single();
}

export async function checkOut(shiftId: string) {
  if (!shiftId) throw new Error("shiftId requerido");

  return await supabase
    .from("shifts")
    .update({ check_out_at: new Date().toISOString() })
    .eq("shift_id", shiftId)
    .select(
      "shift_id, company_id, user_id, check_in_at, check_out_at, note, created_at",
    )
    .single();
}