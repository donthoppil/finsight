import { supabase, DEMO_USER_ID } from "@/lib/supabase";

const NUMERIC_FIELDS = new Set(["goal_timeline_years", "amount_invested", "monthly_contribution"]);

const VALID_FIELDS = new Set([
  "goal",
  "goal_timeline_years",
  "risk_feel",
  "amount_invested",
  "monthly_contribution",
  "income_range",
  "account_type",
  "has_emergency_fund",
  "fund_preference",
  "concerns",
]);

export type UpdateProfileResult =
  | { success: true; field: string; new_value: string | number }
  | { success: false; error: string };

export async function executeUpdateProfile(
  field: string,
  value: string
): Promise<UpdateProfileResult> {
  if (!VALID_FIELDS.has(field)) {
    return { success: false, error: `Unknown field: ${field}` };
  }

  const parsedValue: string | number = NUMERIC_FIELDS.has(field) ? Number(value) : value;
  if (NUMERIC_FIELDS.has(field) && Number.isNaN(parsedValue as number)) {
    return { success: false, error: `Couldn't parse "${value}" as a number for ${field}` };
  }

  const { data: current, error: readErr } = await supabase
    .from("users")
    .select(field)
    .eq("id", DEMO_USER_ID)
    .single();

  if (readErr) {
    return { success: false, error: readErr.message };
  }

  const { error: updateErr } = await supabase
    .from("users")
    .update({ [field]: parsedValue, profile_updated_at: new Date().toISOString() })
    .eq("id", DEMO_USER_ID);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  const oldValue = (current as unknown as Record<string, unknown> | null)?.[field];
  await supabase.from("profile_changes").insert({
    user_id: DEMO_USER_ID,
    field,
    old_value: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
    new_value: String(parsedValue),
    changed_via: "chat",
  });

  return { success: true, field, new_value: parsedValue };
}
