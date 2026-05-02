import { supabase, DEMO_USER_ID } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", DEMO_USER_ID)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ activities: data ?? [] });
}
