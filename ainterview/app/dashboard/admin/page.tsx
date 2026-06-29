import { Activity,BadgeDollarSign,Brain,Code2,FilePlus2,Gauge,ShieldAlert,Users,type LucideIcon} from "lucide-react";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { Card, CardHeader, PageHeader, SectionLabel } from "@/app/dashboard/components/DashboardUI";
import { NORMAL_ACCOUNT_LIMITS } from "@/app/lib/usage";
import { createCodingProblem, setUserPlan, updateAccountRequest } from "./actions";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AccessDenied message="Please log in to view admin tools." />;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, user_name")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return <AccessDenied message="This page is only available to admins." />;
  }

  const [{ data: users }, { count: sessionCount }, { count: problemCount }, { data: usage }, { data: requests }] =
    await Promise.all([
      supabase.from("users").select("user_id, user_name, email, role, account_plan, created_at").order("created_at", { ascending: false }),
      supabase.from("session").select("session_id", { count: "exact", head: true }),
      supabase.from("problems").select("problem_id", { count: "exact", head: true }),
      supabase
        .from("api_usage")
        .select("provider, total_tokens, judge0_runs, estimated_cost_cents, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("account_requests")
        .select("request_id, user_id, request_type, status, message, created_at, resolved_at")
        .order("created_at", { ascending: false }),
    ]);

  const userRows = users ?? [];
  const requestRows = requests ?? [];
  const usageRows = usage ?? [];
  const plusUsers = userRows.filter((row) => row.account_plan === "plus").length;
  const estimatedMonthlyRevenue = plusUsers * 100000;
  const aiTokens = usageRows.reduce((sum, row) => sum + (row.total_tokens ?? 0), 0);
  const judge0Runs = usageRows.reduce((sum, row) => sum + (row.judge0_runs ?? 0), 0);
  const estimatedCost = usageRows.reduce((sum, row) => sum + (row.estimated_cost_cents ?? 0), 0) / 100;
  const userById = new Map(userRows.map((row) => [row.user_id, row]));

  return (
    <div className="animate-in fade-in duration-500">
      <PageHeader
        eyebrow="Admin"
        title="App control center"
        subtitle="Track usage, manage limits and maintain coding content."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Users} label="Users" value={String(userRows.length)} sub={`${plusUsers} Plus accounts`} />
        <MetricCard icon={Activity} label="Sessions" value={String(sessionCount ?? 0)} sub="All interview sessions" />
        <MetricCard icon={Brain} label="AI tokens" value={aiTokens.toLocaleString()} sub={`Normal limit ${NORMAL_ACCOUNT_LIMITS.aiTokensPerMonth.toLocaleString()}/mo`} />
        <MetricCard icon={Code2} label="Judge0 runs" value={judge0Runs.toLocaleString()} sub={`Normal limit ${NORMAL_ACCOUNT_LIMITS.judge0RunsPerMonth}/mo`} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={BadgeDollarSign} label="Revenue" value={`$${estimatedMonthlyRevenue}`} sub="Estimated MRR, no real payments" />
        <MetricCard icon={Gauge} label="API cost" value={`$${estimatedCost.toFixed(2)}`} sub="Estimated tracked spend" />
        <MetricCard icon={FilePlus2} label="Problems" value={String(problemCount ?? 0)} sub="Coding bank size" />
        <MetricCard icon={ShieldAlert} label="Requests" value={String(requestRows.length)} sub={`${requestRows.filter((row) => row.status === "open").length} open`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Add Coding Problem" subtitle="Create a problem and its public or hidden test cases." />
            <form action={createCodingProblem} className="grid grid-cols-1 gap-3">
              <input name="title" required placeholder="Problem title" className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] outline-none focus:border-gray-900" />
              <select name="difficulty" defaultValue="medium" className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] outline-none focus:border-gray-900">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <input name="languages" required defaultValue="javascript, typescript, python" className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] outline-none focus:border-gray-900" />
              <textarea name="description" required rows={5} placeholder="Problem description" className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] outline-none focus:border-gray-900" />
              <textarea
                name="testcases"
                required
                rows={7}
                defaultValue={'[\n  {"input":"1 2","output":"3","is_public":true},\n  {"input":"5 8","output":"13","is_public":false}\n]'}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-[12px] outline-none focus:border-gray-900"
              />
              <button className="rounded-lg bg-gray-900 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-gray-800">
                Add problem
              </button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Manage Requests" subtitle="Review upgrade requests and approve Plus access." />
            <div className="flex flex-col gap-3">
              {requestRows.length === 0 && <p className="text-sm text-gray-500">No account requests yet.</p>}
              {requestRows.map((request) => {
                const requester = userById.get(request.user_id);
                return (
                  <div key={request.request_id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold text-gray-900">{requester?.user_name ?? requester?.email ?? request.user_id}</p>
                        <p className="mt-1 text-[12px] text-gray-500">{request.message}</p>
                      </div>
                      <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        {request.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(["reviewing", "approved", "rejected"] as const).map((status) => (
                        <form key={status} action={updateAccountRequest}>
                          <input type="hidden" name="request_id" value={request.request_id} />
                          <input type="hidden" name="user_id" value={request.user_id} />
                          <input type="hidden" name="status" value={status} />
                          <button className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium capitalize text-gray-700 hover:border-gray-400">
                            {status}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <Card>
          <SectionLabel>User Plans</SectionLabel>
          <div className="flex max-h-[720px] flex-col gap-2 overflow-y-auto pr-1">
            {userRows.map((row) => (
              <div key={row.user_id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-gray-900">{row.user_name}</p>
                    <p className="truncate text-[11px] text-gray-500">{row.email}</p>
                  </div>
                  <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
                    {row.account_plan}
                  </span>
                </div>
                {row.role !== "admin" && (
                  <form action={setUserPlan} className="mt-3 flex gap-2">
                    <input type="hidden" name="user_id" value={row.user_id} />
                    <input type="hidden" name="account_plan" value={row.account_plan === "plus" ? "normal" : "plus"} />
                    <button className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 hover:border-gray-400">
                      Set {row.account_plan === "plus" ? "Normal" : "Plus"}
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AccessDenied({ message }: { message: string }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-center">
      <ShieldAlert size={32} className="text-red-500" />
      <p className="text-sm font-semibold text-gray-900">Admin access required</p>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-600">
        <Icon size={16} />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-[11px] text-gray-500">{sub}</p>
    </div>
  );
}
