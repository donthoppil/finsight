import { NextRequest } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { supabase, DEMO_USER_ID } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// GET — current profile
export async function GET() {
  noStore();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", DEMO_USER_ID)
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json(data);
}

// PUT — update one or more profile fields, log changes
export async function PUT(req: NextRequest) {
  const updates = (await req.json()) as Record<string, unknown>;

  const { data: current, error: readErr } = await supabase
    .from("users")
    .select("*")
    .eq("id", DEMO_USER_ID)
    .single();
  if (readErr) {
    return Response.json({ error: readErr.message }, { status: 500 });
  }

  // Build change log entries (only for fields that actually changed)
  const changes: Array<{
    user_id: string;
    field: string;
    old_value: string | null;
    new_value: string | null;
    changed_via: "panel" | "chat";
  }> = [];

  for (const [field, newValue] of Object.entries(updates)) {
    const oldValue = (current as Record<string, unknown> | null)?.[field];
    if (String(oldValue ?? "") !== String(newValue ?? "")) {
      changes.push({
        user_id: DEMO_USER_ID,
        field,
        old_value: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
        new_value: newValue !== null && newValue !== undefined ? String(newValue) : null,
        changed_via: "panel",
      });
    }
  }

  const { error: updateErr } = await supabase
    .from("users")
    .update({ ...updates, profile_updated_at: new Date().toISOString() })
    .eq("id", DEMO_USER_ID);
  if (updateErr) {
    return Response.json({ error: updateErr.message }, { status: 500 });
  }

  if (changes.length > 0) {
    const { error: logErr } = await supabase.from("profile_changes").insert(changes);
    if (logErr) {
      console.warn("[profile] change log insert failed:", logErr);
    }
  }

  return Response.json({ success: true, changes_logged: changes.length });
}
