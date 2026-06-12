import { NextResponse } from "next/server";
import { getCurrentUserPlan } from "@/app/lib/usage";

export async function POST() {
  const { supabase, user, profile } = await getCurrentUserPlan();

  if (!user) {
    return NextResponse.json({ error: "Please log in to request Account Plus." }, { status: 401 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("account_requests")
    .select("request_id, status")
    .eq("user_id", user.id)
    .eq("request_type", "upgrade_plus")
    .in("status", ["open", "reviewing"])
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({
      ok: true,
      requestId: existing.request_id,
      status: existing.status,
      message: "Your Account Plus request is already in review.",
    });
  }

  const { data, error } = await supabase
    .from("account_requests")
    .insert({
      user_id: user.id,
      request_type: "upgrade_plus",
      status: "open",
      message: `${profile?.user_name ?? user.email ?? "User"} requested Account Plus from a usage-limit prompt.`,
    })
    .select("request_id, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    requestId: data.request_id,
    status: data.status,
    message: "Account Plus request sent.",
  });
}
