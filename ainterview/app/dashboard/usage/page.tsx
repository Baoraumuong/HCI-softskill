import { Activity, Brain, CalendarDays, Gauge, ShieldAlert, type LucideIcon } from "lucide-react";
import { Card, PageHeader } from "@/app/dashboard/components/DashboardUI";
import {
  fetchMonthlyUsageRows,
  getCurrentUserPlan,
  NORMAL_ACCOUNT_LIMITS,
  summarizeUsage,
} from "@/app/lib/usage";

export default async function UsagePage() {
  const { supabase, user, profile } = await getCurrentUserPlan();

  if (!user) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert size={32} className="text-red-500" />
        <p className="text-sm font-semibold text-gray-900">Please log in to view your usage.</p>
      </div>
    );
  }

  const rows = await fetchMonthlyUsageRows(supabase, user.id);
  const totals = summarizeUsage(rows);
  const isPlus = profile?.account_plan === "plus" || profile?.role === "admin";
  const nextMonth = new Date();
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1);
  nextMonth.setUTCHours(0, 0, 0, 0);

  return (
    <div className="animate-in fade-in duration-500">
      <PageHeader
        eyebrow="Usage"
        title="Your monthly usage"
        subtitle="Track the AI tokens and code submissions used by your account this month."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
        <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold uppercase tracking-wide text-gray-700">
          {isPlus ? "Plus" : "Normal"} plan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={13} />
          Resets {nextMonth.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} (UTC)
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UsageCard
          icon={Brain}
          label="AI tokens"
          used={totals.aiTokens}
          limit={isPlus ? null : NORMAL_ACCOUNT_LIMITS.aiTokensPerMonth}
        />
        <UsageCard
          icon={Activity}
          label="Code submissions"
          used={totals.judge0Runs}
          limit={isPlus ? null : NORMAL_ACCOUNT_LIMITS.judge0RunsPerMonth}
        />
      </div>

      <Card className="mt-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
            <Gauge size={17} />
          </div>
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">How usage is counted</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-gray-500">
              AI tokens include both prompts and generated responses. Code submissions count each
              Judge0 test-case execution. Usage resets at the beginning of each UTC month.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function UsageCard({
  icon: Icon,
  label,
  used,
  limit,
}: {
  icon: LucideIcon;
  label: string;
  used: number;
  limit: number | null;
}) {
  const percentage = limit == null ? 0 : Math.min(100, Math.round((used / limit) * 100));

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            <Icon size={18} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
            <p className="mt-0.5 text-xl font-bold text-gray-900">{used.toLocaleString()}</p>
          </div>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-600">
          {limit == null ? "Unlimited" : `${percentage}% used`}
        </span>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-[11px] text-gray-500">
          <span>Used this month</span>
          <span>{limit == null ? "No plan limit" : `${used.toLocaleString()} / ${limit.toLocaleString()}`}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${percentage >= 90 ? "bg-red-500" : "bg-gray-900"}`}
            style={{ width: limit == null ? "0%" : `${percentage}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
