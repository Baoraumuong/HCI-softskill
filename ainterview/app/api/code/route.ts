import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";

/* Judge0 endpoint */
const JUDGE0_URL = "https://ce.judge0.com";

const BASE_HEADERS = {
  "Content-Type": "application/json",
};

/*Judge0 CE language IDs*/
export const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,
  typescript: 74,
  python:     71,   
  java:       62, 
  go:         60,
  cpp:        54,   
  c:          50,  
};

/* Judge0 status IDs:
   1 = In Queue, 2 = Processing, 3 = Accepted,
   4 = Wrong Answer, 5 = TLE, 6 = Compilation Error,
   7–12 = Runtime Errors, 13 = Internal Error, 14 = Exec Format Error
*/

interface TestCase {
  id: number;
  input: string;
  output: string; 
  is_public?: boolean;
}

interface SingleResult {
  id: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  statusId: number;
  statusDesc: string;
  time: string | null;
  memory: number | null;
  stderr: string | null;
  compile_output: string | null;
}

/* ─── Poll a single submission until it finishes ──────────── */
async function pollToken(
  token: string,
  maxRetries = 15,
  delayMs = 1000,
): Promise<{
  statusId: number;
  statusDesc: string;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: number | null;
}> {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((r) => setTimeout(r, delayMs));

    const res = await fetch(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=false&fields=status,stdout,stderr,compile_output,time,memory`,
      { headers: BASE_HEADERS },
    );

    if (res.status === 429) {
      throw new Error("RATE_LIMITED");
    }
    if (!res.ok) {
      throw new Error(`Judge0 poll error: ${res.status}`);
    }

    const data = await res.json();
    const statusId: number = data.status?.id ?? 0;

    // Status > 2 means the submission is no longer queued/processing
    if (statusId > 2) {
      return {
        statusId,
        statusDesc: data.status?.description ?? "Unknown",
        stdout:         data.stdout         ?? null,
        stderr:         data.stderr         ?? null,
        compile_output: data.compile_output ?? null,
        time:           data.time           ?? null,
        memory:         data.memory         ?? null,
      };
    }
  }
  throw new Error("EXECUTION_TIMEOUT");
}

/* Submit one test case, return its token*/
async function submitOne(
  code: string,
  languageId: number,
  stdin: string,
  expectedOutput: string,
): Promise<string> {
  const res = await fetch(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
    {
      method: "POST",
      headers: BASE_HEADERS,
      body: JSON.stringify({
        source_code:      code,
        language_id:      languageId,
        stdin,
        cpu_time_limit:   3,      // seconds
        memory_limit:     128000, // KB
      }),
    },
  );

  if (res.status === 429) throw new Error("RATE_LIMITED");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `Submission failed: ${res.status}`);
  }

  const { token } = await res.json();
  if (!token) throw new Error("Judge0 did not return a token");
  return token as string;
}

/* ─── Route handler ───────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      language,          // string key e.g. "python"
      language_id,       // numeric override (optional)
      test_cases,        // TestCase[]
      problem_id,
    }: {
      code: string;
      language?: string;
      language_id?: number;
      test_cases?: TestCase[];
      problem_id?: string;
    } = body;

    /* ── Validate ── */
    if (!code?.trim()) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }
    let testCases = test_cases;
    const shouldRedactCases = !testCases?.length && !!problem_id;

    if (!testCases?.length && problem_id) {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("testcases")
        .select("id, input, output, is_public")
        .eq("problem_id", problem_id)
        .order("id");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      testCases = (data ?? []) as TestCase[];
    }

    if (!testCases?.length) {
      return NextResponse.json({ error: "No test cases provided" }, { status: 400 });
    }
    const executableTestCases = testCases;

    // Resolve language ID
    const langId: number | undefined =
      language_id ??
      (language ? JUDGE0_LANGUAGE_IDS[language.toLowerCase()] : undefined);

    if (!langId) {
      return NextResponse.json(
        { error: `Unsupported language: "${language}". Supported: ${Object.keys(JUDGE0_LANGUAGE_IDS).join(", ")}` },
        { status: 400 },
      );
    }

    /* ── Submit all test cases in parallel ── */
    let tokens: string[];
    try {
      tokens = await Promise.all(
        executableTestCases.map((tc) =>
          submitOne(code, langId, tc.input ?? "", tc.output ?? ""),
        ),
      );
    } catch (err: any) {
      if (err.message === "RATE_LIMITED") {
        return NextResponse.json(
          { error: "Rate limited by Judge0. Please wait ~10 seconds and try again." },
          { status: 429 },
        );
      }
      throw err;
    }

    /* ── Poll all tokens in parallel ── */
    let polled: Awaited<ReturnType<typeof pollToken>>[];
    try {
      polled = await Promise.all(tokens.map((t) => pollToken(t)));
    } catch (err: any) {
      if (err.message === "RATE_LIMITED") {
        return NextResponse.json(
          { error: "Rate limited while polling Judge0." },
          { status: 429 },
        );
      }
      if (err.message === "EXECUTION_TIMEOUT") {
        return NextResponse.json(
          { error: "Execution timed out. Judge0 is busy — try again in a moment." },
          { status: 504 },
        );
      }
      throw err;
    }

    /* ── Build per-case results ── */
    const results: SingleResult[] = executableTestCases.map((tc, i) => {
      const p = polled[i];
      const actual = (p.stdout ?? "").trim();
      const expected = (tc.output ?? "").trim();

      const passed = p.statusId === 3 && actual === expected;

      return {
        id:             tc.id,
        input:          tc.input,
        expected,
        actual:         actual || p.stderr || p.compile_output || "(no output)",
        passed,
        statusId:       p.statusId,
        statusDesc:     p.statusDesc,
        time:           p.time,
        memory:         p.memory,
        stderr:         p.stderr,
        compile_output: p.compile_output,
      };
    });

    /* ── Aggregate ── */
    const passCount = results.filter((r) => r.passed).length;
    // Expose compile error from first failing case
    const compileError =
      results.find((r) => r.statusId === 6)?.compile_output ?? null;

    return NextResponse.json({
      results: shouldRedactCases ? results.filter((r, i) => executableTestCases[i]?.is_public) : results,
      summary: {
        total:  results.length,
        passed: passCount,
        failed: results.length - passCount,
      },
      compile_error: compileError,
    });
  } catch (err: unknown) {
    console.error("[/api/code] error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
