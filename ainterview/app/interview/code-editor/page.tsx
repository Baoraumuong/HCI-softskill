"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock, Play, RotateCcw, ChevronDown, ArrowLeft,
  CheckCircle2, Code2, FlaskConical, ChevronRight,
  Loader2, AlertCircle, Terminal, XCircle, Zap,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser-client";

/* ─── Types ──────────────────────────────────────────────── */
type InterviewType = "behavioral" | "technical" | "full";
type Level         = "junior" | "mid" | "senior";
type Language      = "javascript" | "typescript" | "python" | "java" | "go" | "cpp";
type Difficulty    = "easy" | "medium" | "hard";

interface SessionConfig {
  sessionId:      string;
  interview_type: InterviewType;
  level:          Level;
  role:           string;
}

interface Problem {
  problem_id:  string;
  title:       string;
  description: string;
  difficulty:  string | null;
  languages:   string[];
}

interface TestCase {
  id:        number;
  input:     string;
  output:    string;
  is_public: boolean;
}

interface TestResult {
  id:             number;
  input:          string;
  expected:       string;
  actual:         string;
  passed:         boolean;
  statusId:       number;
  statusDesc:     string;
  time:           string | null;
  memory:         number | null;
  stderr:         string | null;
  compile_output: string | null;
}

interface RunResponse {
  results:       TestResult[];
  summary:       { total: number; passed: number; failed: number };
  compile_error: string | null;
  error?:        string;
  upgradeRequired?: boolean;
}

/* ─── Constants ──────────────────────────────────────────── */
const LANGUAGES: { id: Language; label: string }[] = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python",     label: "Python"     },
  { id: "java",       label: "Java"       },
  { id: "go",         label: "Go"         },
  { id: "cpp",        label: "C++"        },
];

const STARTER_CODE: Record<Language, string> = {
  javascript: `// Write your solution here\nfunction solution(input) {\n  // your code\n  return "";\n}\n\n// Read stdin and call solution\nconst input = require('fs').readFileSync('/dev/stdin', 'utf8').trim();\nconsole.log(solution(input));\n`,
  typescript: `// Write your solution here\nfunction solution(input: string): string {\n  return "";\n}\n\nimport * as fs from "fs";\nconst input = fs.readFileSync("/dev/stdin", "utf8").trim();\nconsole.log(solution(input));\n`,
  python:     `import sys\n\ndef solution(input_data: str) -> str:\n    # your code here\n    return ""\n\nif __name__ == "__main__":\n    data = sys.stdin.read().strip()\n    print(solution(data))\n`,
  java:       `import java.util.Scanner;\n\npublic class Solution {\n    public static String solve(String input) {\n        // your code here\n        return "";\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        StringBuilder sb = new StringBuilder();\n        while (sc.hasNextLine()) sb.append(sc.nextLine()).append("\\n");\n        System.out.print(solve(sb.toString().trim()));\n    }\n}\n`,
  go:         `package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n\t"strings"\n)\n\nfunc solution(input string) string {\n\t// your code here\n\treturn ""\n}\n\nfunc main() {\n\tscanner := bufio.NewScanner(os.Stdin)\n\tvar lines []string\n\tfor scanner.Scan() {\n\t\tlines = append(lines, scanner.Text())\n\t}\n\tfmt.Print(solution(strings.Join(lines, "\\n")))\n}\n`,
  cpp:        `#include <iostream>\n#include <string>\n#include <sstream>\nusing namespace std;\n\nstring solution(string input) {\n    // your code here\n    return "";\n}\n\nint main() {\n    ostringstream ss;\n    ss << cin.rdbuf();\n    cout << solution(ss.str());\n    return 0;\n}\n`,
};

const LEVEL_TO_DIFFICULTY: Record<Level, Difficulty> = {
  junior: "easy",
  mid:    "medium",
  senior: "hard",
};

/* ─── Scoring prompt ─────────────────────────────────────── */
function buildCodingPrompt(
  role: string, level: string,
  question: string, code: string, language: string,
  passedCount: number, totalCount: number,
) {
  return `You are a senior engineer evaluating a ${level}-level ${role} candidate's ${language} code submission.

Test results: ${passedCount}/${totalCount} test cases passed.

Score:
- correctness (0–80): Solves the problem correctly for all cases (scale by pass rate)?
- time_complexity (0–10): Optimal time/space complexity for ${level} level?
- code_quality (0–10): Readability, naming, structure, comments, modularity?

Question: "${question}"
Code (${language}):
\`\`\`${language}
${code}
\`\`\`

Respond ONLY with valid JSON, no markdown, no preamble:
{"correctness":<0-80>,"time_complexity":<0-10>,"code_quality":<0-10>,"feedback":"<2-3 sentences>","total_score":<0-100>}`;
}

function parseJsonObject(raw: unknown) {
  if (typeof raw === "object" && raw !== null) return raw as Record<string, unknown>;
  if (typeof raw !== "string") return {};
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const text = (fenced ?? raw).trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return {};
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function numberOrNull(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/* ─── Small UI pieces ────────────────────────────────────── */
function TestBadge({ passed, statusDesc }: { passed: boolean; statusDesc?: string }) {
  if (passed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={9} /> PASS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200"
      title={statusDesc}>
      <XCircle size={9} /> FAIL
    </span>
  );
}

/* ─── Component ──────────────────────────────────────────── */
function CodeEditorPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = getSupabaseBrowserClient();

  const sessionConfig: SessionConfig = {
    sessionId:      searchParams.get("session")  ?? "",
    interview_type: (searchParams.get("type")   as InterviewType) ?? "technical",
    level:          (searchParams.get("level")  as Level)          ?? "mid",
    role:            searchParams.get("role")                       ?? "Software Engineer",
  };

  // problem_id passed from interview page → fetch by ID
  const problemIdFromUrl = searchParams.get("problem_id") ?? "";

  /* ─── State ─────────────────────────────────────────────── */
  const [language,       setLanguage]       = useState<Language>("javascript");
  const [code,           setCode]           = useState(STARTER_CODE.javascript);
  const [langMenuOpen,   setLangMenuOpen]   = useState(false);
  const [elapsed,        setElapsed]        = useState(0);

  const [problem,        setProblem]        = useState<Problem | null>(null);
  const [testCases,      setTestCases]      = useState<TestCase[]>([]);
  const [loadingProblem, setLoadingProblem] = useState(true);
  const [problemError,   setProblemError]   = useState<string | null>(null);

  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [isSubmitted,    setIsSubmitted]    = useState(false);
  const [feedback,       setFeedback]       = useState<string | null>(null);

  const [testResults,    setTestResults]    = useState<TestResult[]>([]);
  const [runSummary,     setRunSummary]     = useState<RunResponse["summary"] | null>(null);
  const [compileError,   setCompileError]   = useState<string | null>(null);
  const [isRunning,      setIsRunning]      = useState(false);
  const [runError,       setRunError]       = useState<string | null>(null);
  const [upgradeNotice,  setUpgradeNotice]  = useState<string | null>(null);
  const [upgradeRequestStatus, setUpgradeRequestStatus] = useState<string | null>(null);
  const [activeTab,      setActiveTab]      = useState<"description" | "testcases" | "results">("description");

  const startTimeRef = useRef(Date.now());

  /* ─── Timer ──────────────────────────────────────────────── */
  useEffect(() => {
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)),
      1000,
    );
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  /* ─── Fetch problem ──────────────────────────────────────── */
  useEffect(() => {
    const fetchProblem = async () => {
      setLoadingProblem(true);
      setProblemError(null);

      let picked: Problem | null = null;

      if (problemIdFromUrl) {
        // Fetch the specific problem passed from the interview page
        const { data, error } = await supabase
          .from("problems")
          .select("problem_id, title, description, difficulty, languages")
          .eq("problem_id", problemIdFromUrl)
          .single();

        if (error || !data) {
          setProblemError(error?.message ?? "Problem not found.");
          setLoadingProblem(false);
          return;
        }
        picked = data as Problem;
      } else {
        // Fallback: fetch a random problem by difficulty
        const difficulty = LEVEL_TO_DIFFICULTY[sessionConfig.level];
        const { data: problems, error } = await supabase
          .from("problems")
          .select("problem_id, title, description, difficulty, languages")
          .eq("difficulty", difficulty);

        if (error || !problems?.length) {
          setProblemError(error?.message ?? `No ${difficulty} problems found.`);
          setLoadingProblem(false);
          return;
        }
        picked = problems[Math.floor(Math.random() * problems.length)] as Problem;
      }

      setProblem(picked);

      // Fetch public test cases
      const { data: cases } = await supabase
        .from("testcases")
        .select("id, input, output, is_public")
        .eq("problem_id", picked.problem_id)
        .eq("is_public", true)   // only show public cases to candidate
        .order("id");

      setTestCases((cases as TestCase[]) ?? []);
      setLoadingProblem(false);
    };

    fetchProblem();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemIdFromUrl, sessionConfig.level]);

  /* ─── Language change ────────────────────────────────────── */
  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    setCode(STARTER_CODE[lang]);
    setLangMenuOpen(false);
    setTestResults([]);
    setRunSummary(null);
    setCompileError(null);
    setRunError(null);
  };

  /* ─── Run Tests via Judge0 ───────────────────────────────── */
  const handleRunTests = async () => {
    if (!testCases.length || !code.trim()) return;

    setIsRunning(true);
    setRunError(null);
    setUpgradeNotice(null);
    setCompileError(null);
    setActiveTab("results");

    try {
      const res = await fetch("/api/code", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          test_cases: testCases,
        }),
      });

      const data: RunResponse = await res.json();

      if (!res.ok || data.error) {
        if (data.upgradeRequired) {
          setUpgradeNotice(data.error ?? "You reached the normal account limit. Upgrade to Account Plus to continue.");
        }
        setRunError(data.error ?? "Unknown error from Judge0.");
        setIsRunning(false);
        return;
      }

      setTestResults(data.results);
      setRunSummary(data.summary);
      setCompileError(data.compile_error);
    } catch (e) {
      setRunError("Network error — could not reach the code execution service.");
    } finally {
      setIsRunning(false);
    }
  };

  /* ─── Submit ─────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!code.trim() || !problem) return;
    setIsSubmitting(true);
    setRunError(null);
    setUpgradeNotice(null);
    setCompileError(null);

    const { sessionId, role, level } = sessionConfig;
    const finalQuestion = problem.description;

    // Run all test cases through the API. The server fetches hidden cases and only returns public details.
    let passedCount = runSummary?.passed ?? 0;
    let totalCount  = runSummary?.total  ?? testCases.length;

    try {
      const res = await fetch("/api/code", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, problem_id: problem.problem_id }),
      });
      const data: RunResponse = await res.json();
      if (res.ok && !data.error) {
        setTestResults(data.results);
        setRunSummary(data.summary);
        setCompileError(data.compile_error);
        passedCount = data.summary.passed;
        totalCount  = data.summary.total;
      } else {
        if (data.upgradeRequired) {
          setUpgradeNotice(data.error ?? "You reached the normal account limit. Upgrade to Account Plus to continue.");
        }
        setRunError(data.error ?? "Could not run hidden tests for scoring.");
      }
    } catch {
      setRunError("Network error — could not reach the code execution service for final scoring.");
    }

    try {
      const { data: hist, error: historyError } = await supabase
        .from("history")
        .insert({
          session_id:   sessionId,
          question:     finalQuestion,
          answer:       code,
        })
        .select("history_id")
        .single();
      if (historyError) throw historyError;

      if (hist) {
        const prompt = buildCodingPrompt(
          role, level, finalQuestion, code, language, passedCount, totalCount,
        );

        // Use the same /api/interview/chat endpoint (or /api/interview/analyze if you have it)
        const aiRes = await fetch("/api/interview/chat", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ prompt }),
        });

        if (aiRes.ok) {
          const raw    = await aiRes.json();
          const scores = parseJsonObject(raw.result ?? raw);
          const correctness = numberOrNull(scores.correctness);
          const timeComplexity = numberOrNull(scores.time_complexity);
          const codeQuality = numberOrNull(scores.code_quality);
          const totalScore = numberOrNull(scores.total_score);

          const { error: codingResultError } = await supabase.from("result_coding").insert({
            history_id:      hist.history_id,
            session_id:      sessionId,
            correctness,
            time_complexity: timeComplexity,
            code_quality:    codeQuality,
            feedback:        typeof scores.feedback === "string" ? scores.feedback : null,
            total_score:     totalScore,
          });
          if (codingResultError) throw codingResultError;

          setFeedback(typeof scores.feedback === "string" ? scores.feedback : null);
        }
      }

      setIsSubmitted(true);
      setActiveTab("results");
    } catch (e) {
      console.error("Submit error:", e);
      alert("Failed to submit code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestPlus = async () => {
    setUpgradeRequestStatus("Sending request...");
    try {
      const res = await fetch("/api/account/upgrade-request", { method: "POST" });
      const data = await res.json();
      setUpgradeRequestStatus(data.message ?? (res.ok ? "Request sent." : "Could not send request."));
    } catch {
      setUpgradeRequestStatus("Could not send request. Please try again.");
    }
  };

  /* ─── Difficulty badge colour ────────────────────────────── */
  const difficultyColor = (d: string | null) => {
    switch (d?.toLowerCase()) {
      case "easy":   return "text-emerald-700 bg-emerald-100 border-emerald-200";
      case "medium": return "text-amber-700 bg-amber-100 border-amber-200";
      case "hard":   return "text-red-700 bg-red-100 border-red-200";
      default:       return "text-gray-600 bg-gray-100 border-gray-200";
    }
  };

  /* ─── Status label helper ────────────────────────────────── */
  const statusLabel = (statusId: number, desc: string) => {
    if (statusId === 5) return "Time Limit Exceeded";
    if (statusId === 6) return "Compilation Error";
    if (statusId >= 7 && statusId <= 12) return `Runtime Error (${desc})`;
    return desc;
  };

  /* ─── Loading / error states ─────────────────────────────── */
  if (loadingProblem) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-500">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-blue-500" />
          <p className="text-sm">Loading coding challenge…</p>
        </div>
      </div>
    );
  }

  if (problemError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-500">
        <div className="flex flex-col items-center gap-3 max-w-sm text-center">
          <AlertCircle size={28} className="text-red-500" />
          <p className="text-sm text-red-600">{problemError}</p>
          <button
            onClick={() => router.back()}
            className="mt-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs text-gray-700 shadow-sm hover:bg-gray-50 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="flex h-full w-full flex-col bg-gray-50 text-gray-800">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.close()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-600 shadow-sm hover:bg-gray-50 transition"
          >
            <ArrowLeft size={12} /> Back
          </button>

          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(p => !p)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
            >
              {LANGUAGES.find(l => l.id === language)?.label}
              <ChevronDown size={12} />
            </button>
            {langMenuOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                {LANGUAGES.map(l => (
                  <button
                    key={l.id}
                    onClick={() => changeLanguage(l.id)}
                    className={`w-full text-left px-3 py-2 text-xs transition
                      ${language === l.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setCode(STARTER_CODE[language]);
              setIsSubmitted(false);
              setFeedback(null);
              setTestResults([]);
              setRunSummary(null);
              setCompileError(null);
              setRunError(null);
            }}
            className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-600 shadow-sm hover:bg-gray-50 transition"
          >
            <RotateCcw size={11} /> Reset
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-mono text-gray-600">
            <Clock size={11} /> {formatTime(elapsed)}
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-[11px] text-gray-600 capitalize">
              {sessionConfig.role}
            </span>
            <span className="rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-[11px] text-gray-600 capitalize">
              {sessionConfig.level}
            </span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Problem panel */}
        <aside className="w-80 lg:w-[420px] shrink-0 border-r border-gray-200 flex flex-col bg-white overflow-hidden">

          {/* Problem header */}
          <div className="px-5 pt-5 pb-3 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Code2 size={13} className="text-emerald-600 shrink-0" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-emerald-600">
                Coding Challenge
              </p>
              {problem?.difficulty && (
                <span className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${difficultyColor(problem.difficulty)}`}>
                  {problem.difficulty}
                </span>
              )}
            </div>
            <h2 className="text-sm font-semibold text-gray-900 leading-snug">
              {problem?.title ?? "Coding Challenge"}
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 shrink-0">
            {[
              { id: "description", label: "Problem",    icon: <Code2 size={11} /> },
              { id: "testcases",   label: `Tests (${testCases.length})`, icon: <FlaskConical size={11} /> },
              { id: "results",     label: "Results",    icon: <Terminal size={11} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-medium transition border-b-2
                  ${activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">

            {/* Description */}
            {activeTab === "description" && (
              <div className="px-5 py-4">
                {problem?.description ? (
                  <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {problem.description}
                  </p>
                ) : (
                  <p className="text-[13px] text-gray-500 italic">
                    No problem loaded.
                  </p>
                )}
              </div>
            )}

            {/* Test cases */}
            {activeTab === "testcases" && (
              <div className="px-5 py-4 space-y-3">
                {testCases.length === 0 ? (
                  <p className="text-[12px] text-gray-500 italic">No public test cases.</p>
                ) : testCases.map((tc, i) => (
                  <div key={tc.id} className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-200 bg-white">
                      <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                        Case {i + 1}
                      </span>
                    </div>
                    <div className="px-3 py-2.5 space-y-2">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Input</p>
                        <pre className="text-[11.5px] text-emerald-700 font-mono leading-relaxed whitespace-pre-wrap break-all">
                          {tc.input}
                        </pre>
                      </div>
                      <div className="border-t border-gray-200 pt-2">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Expected</p>
                        <pre className="text-[11.5px] text-blue-700 font-mono leading-relaxed whitespace-pre-wrap break-all">
                          {tc.output}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results */}
            {activeTab === "results" && (
              <div className="px-5 py-4 space-y-3">

                {/* Run error */}
                {runError && (
                  <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3">
                    <p className="text-[11px] font-semibold text-red-700 mb-1">Execution Error</p>
                    <p className="text-[11px] text-red-600 font-mono leading-relaxed">{runError}</p>
                  </div>
                )}

                {upgradeNotice && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                    <p className="text-[11px] font-semibold text-blue-800 mb-1">Account limit reached</p>
                    <p className="text-[11px] text-blue-700 leading-relaxed">{upgradeNotice}</p>
                    <button
                      onClick={requestPlus}
                      className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-500"
                    >
                      Request Account Plus
                    </button>
                    {upgradeRequestStatus && <p className="mt-2 text-[11px] text-blue-700">{upgradeRequestStatus}</p>}
                  </div>
                )}

                {/* Compile error */}
                {compileError && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                    <p className="text-[11px] font-semibold text-amber-700 mb-1">Compilation Error</p>
                    <pre className="text-[11px] text-amber-700 font-mono leading-relaxed whitespace-pre-wrap break-all">
                      {compileError}
                    </pre>
                  </div>
                )}

                {/* Summary bar */}
                {runSummary && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <span className="text-[11px] text-gray-600">
                      {runSummary.passed} / {runSummary.total} passed
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-600 font-bold">{runSummary.passed} ✓</span>
                      {runSummary.failed > 0 && (
                        <span className="text-[10px] text-red-600 font-bold">{runSummary.failed} ✗</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Per-case results */}
                {testResults.length === 0 && !runError ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <Terminal size={20} className="text-gray-400" />
                    <p className="text-[12px] text-gray-500">
                      Click <strong className="text-gray-700">Run Tests</strong> to execute your code.
                    </p>
                  </div>
                ) : testResults.map((r, i) => (
                  <div key={r.id} className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
                      <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                        Case {i + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        {r.time && (
                          <span className="text-[9px] text-gray-500 flex items-center gap-0.5">
                            <Zap size={8} /> {r.time}s
                          </span>
                        )}
                        <TestBadge passed={r.passed} statusDesc={statusLabel(r.statusId, r.statusDesc)} />
                      </div>
                    </div>
                    <div className="px-3 py-2.5 space-y-2 text-[11.5px] font-mono">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-sans">Input: </span>
                        <span className="text-gray-700">{r.input}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-sans">Expected: </span>
                        <span className="text-blue-700">{r.expected}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-sans">Got: </span>
                        <span className={r.passed ? "text-emerald-700" : "text-red-700"}>
                          {r.actual}
                        </span>
                      </div>
                      {/* Runtime error detail */}
                      {r.stderr && !r.passed && (
                        <div className="border-t border-gray-200 pt-2">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-sans mb-1">Stderr:</p>
                          <pre className="text-[10px] text-red-600 whitespace-pre-wrap break-all">{r.stderr}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom: submit section */}
          <div className="border-t border-gray-200 px-5 py-4 shrink-0 bg-gray-50">
            {isSubmitted ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <p className="text-[10px] font-bold tracking-widest uppercase text-emerald-600">Submitted</p>
                  {runSummary && (
                    <span className="ml-auto text-[10px] text-gray-500">
                      {runSummary.passed}/{runSummary.total} tests
                    </span>
                  )}
                </div>
                {feedback && (
                  <p className="text-[12px] text-gray-600 leading-relaxed">{feedback}</p>
                )}
                <button
                  onClick={() => window.close()}
                  className="w-full rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium py-2 transition shadow-sm"
                >
                  Close Editor
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Run tests to verify your solution, then <strong className="text-gray-700">Submit</strong> when ready.
                <br />
                <span className="text-[10px] text-gray-400">Powered by Judge0 CE · free tier</span>
              </p>
            )}
          </div>
        </aside>

        {/* RIGHT — Code editor */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">

          {/* Submitted banner */}
          {isSubmitted && (
            <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-5 py-2 text-xs text-emerald-700 font-medium shrink-0">
              <CheckCircle2 size={12} /> Solution submitted — feedback shown on the left.
            </div>
          )}

          {/* Code textarea */}
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            disabled={isSubmitted}
            spellCheck={false}
            className="flex-1 w-full bg-white px-6 py-5 text-[13px] text-gray-800 font-mono leading-relaxed resize-none outline-none disabled:bg-gray-100 disabled:text-gray-500"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" }}
            placeholder="// Start coding your solution here…"
          />

          {/* Action bar */}
          {!isSubmitted && (
            <div className="border-t border-gray-200 px-5 py-3 bg-gray-50 flex items-center justify-between gap-4 shrink-0">
              <p className="text-[11px] text-gray-500 hidden sm:block">
                Real execution via Judge0 CE · results appear in the Results tab
              </p>

              <div className="flex items-center gap-2 ml-auto">
                {testCases.length > 0 && (
                  <button
                    onClick={handleRunTests}
                    disabled={isRunning || !code.trim()}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-2 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRunning
                      ? <Loader2 size={12} className="animate-spin" />
                      : <FlaskConical size={12} />
                    }
                    {isRunning ? "Running…" : "Run Tests"}
                  </button>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !code.trim()}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Play size={13} />
                  }
                  {isSubmitting ? "Evaluating…" : "Submit Solution"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CodeEditorPage() {
  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-gray-50 text-sm text-gray-500">Loading editor...</div>}>
      <CodeEditorPageContent />
    </Suspense>
  );
}
