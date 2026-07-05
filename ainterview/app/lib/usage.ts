import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { getOrCreateUserProfile } from "@/app/lib/user-profile";
import type { Database } from "@/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const NORMAL_ACCOUNT_LIMITS = {
  aiTokensPerMonth: 20_000,
  judge0RunsPerMonth: 50,
} as const;

export type UsageProvider = "gemini" | "judge0";

type UsageCheck =
  | { allowed: true; userId: string; accountPlan: "normal" | "plus"; limit: number | null; used: number }
  | { allowed: false; userId: string; accountPlan: "normal"; limit: number; used: number; message: string };

export function currentMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

type MonthlyUsageRow = Pick<
  Database["public"]["Tables"]["api_usage"]["Row"],
  "user_id" | "total_tokens" | "judge0_runs" | "estimated_cost_cents"
>;

export type UsageTotals = {
  aiTokens: number;
  judge0Runs: number;
  estimatedCostCents: number;
};

export function summarizeUsage(rows: MonthlyUsageRow[]): UsageTotals {
  return rows.reduce<UsageTotals>(
    (totals, row) => ({
      aiTokens: totals.aiTokens + (row.total_tokens ?? 0),
      judge0Runs: totals.judge0Runs + (row.judge0_runs ?? 0),
      estimatedCostCents: totals.estimatedCostCents + (row.estimated_cost_cents ?? 0),
    }),
    { aiTokens: 0, judge0Runs: 0, estimatedCostCents: 0 },
  );
}

export async function fetchMonthlyUsageRows(
  supabase: SupabaseClient<Database>,
  userId?: string,
): Promise<MonthlyUsageRow[]> {
  const pageSize = 1_000;
  const monthStart = currentMonthStart();
  const rows: MonthlyUsageRow[] = [];

  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from("api_usage")
      .select("user_id, total_tokens, judge0_runs, estimated_cost_cents")
      .gte("created_at", monthStart)
      .order("usage_id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load monthly usage: ${error.message}`);
    }

    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) {
      return rows;
    }
  }
}

export function upgradeLimitMessage(resource: "ai" | "judge0") {
  const label = resource === "ai" ? "AI interview feedback" : "code execution";
  return `You have reached the monthly ${label} limit for normal accounts. Upgrade to Account Plus to continue.`;
}

export async function getCurrentUserPlan() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await getOrCreateUserProfile(supabase, user);

  return { supabase, user, profile };
}

export async function ensureMonthlyUsageAllowed(provider: UsageProvider): Promise<UsageCheck> {
  const { supabase, user, profile } = await getCurrentUserPlan();
  if (!user) {
    return {
      allowed: false,
      userId: "",
      accountPlan: "normal",
      limit: 0,
      used: 0,
      message: "Please log in to continue.",
    };
  }

  const accountPlan = profile?.account_plan === "plus" || profile?.role === "admin" ? "plus" : "normal";
  const limit = provider === "gemini"
    ? NORMAL_ACCOUNT_LIMITS.aiTokensPerMonth
    : NORMAL_ACCOUNT_LIMITS.judge0RunsPerMonth;

  const { data } = await supabase
    .from("api_usage")
    .select("total_tokens, judge0_runs")
    .eq("user_id", user.id)
    .gte("created_at", currentMonthStart());

  const used = (data ?? []).reduce((sum, row) => {
    return sum + (provider === "gemini" ? row.total_tokens ?? 0 : row.judge0_runs ?? 0);
  }, 0);

  if (accountPlan === "normal" && used >= limit) {
    return {
      allowed: false,
      userId: user.id,
      accountPlan,
      limit,
      used,
      message: upgradeLimitMessage(provider === "gemini" ? "ai" : "judge0"),
    };
  }

  return {
    allowed: true,
    userId: user.id,
    accountPlan,
    limit: accountPlan === "normal" ? limit : null,
    used,
  };
}

export async function recordApiUsage(input: {
  provider: UsageProvider;
  endpoint: string;
  userId: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  judge0Runs?: number | null;
  estimatedCostCents?: number | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("api_usage").insert({
    provider: input.provider,
    endpoint: input.endpoint,
    user_id: input.userId,
    prompt_tokens: input.promptTokens ?? 0,
    completion_tokens: input.completionTokens ?? 0,
    judge0_runs: input.judge0Runs ?? 0,
    estimated_cost_cents: input.estimatedCostCents ?? 0,
  });

  if (error) {
    console.error("[usage] failed to record API usage:", error.message);
  }
}
