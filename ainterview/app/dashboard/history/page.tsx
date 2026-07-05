"use client";

/**
 * History Page — Updated
 *
 * New additions vs original:
 * 1. Overall Performance Analysis panel — aggregated across all Q&A result types
 *    (behavioral, theoretical, coding) with a unified 0-100 scale.
 * 2. Engagement Level card derived from engagement_score, in_frame_pct, upright_pct
 *    saved to the sessions table by the interview page on session end.
 * 3. Per-question cards show the phase recorded on each response evaluation.
 */

import { Suspense, useState, useEffect, type ElementType } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronDown, ChevronRight,
  MessageSquare, Code, Layers, Trophy, Clock, Calendar,
  TrendingUp, AlertCircle, CheckCircle2, Target, Mic,
  BarChart3, FileText, Eye, Activity,
  Brain, Zap, Award, Users,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser-client";

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type InterviewType = "behavioral" | "technical" | "full";
type Level = "junior" | "mid" | "senior";
type EvaluationType = "behavioral" | "theoretical" | "coding";

interface Session {
  session_id:       string;
  interview_type:   InterviewType;
  level:            Level;
  role:             string;
  started_at:       string | null;
  ended_at:         string | null;
  duration_seconds: number | null;
  // Engagement fields saved by interview page
  engagement_score: number | null;
  in_frame_pct:     number | null;
  upright_pct:      number | null;
}

interface InterviewResponse {
  response_id:  string;
  question:     string;
  answer:       string;
  created_at:   string;
  question_type: EvaluationType;
}

interface ResponseEvaluation {
  response_id:     string;
  evaluation_type: EvaluationType;
  rubric:          unknown;
  total_score:     number | null;
  feedback:        string | null;
}

interface QAWithResult {
  response:    InterviewResponse;
  evaluation?: ResponseEvaluation;
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const typeIcon = (type: InterviewType) =>
  ({ behavioral: MessageSquare, technical: Code, full: Layers }[type] ?? Layers);

const levelColor = (level: Level) =>
  ({
    junior: "text-emerald-600 bg-emerald-50 border-emerald-200",
    mid:    "text-amber-600 bg-amber-50 border-amber-200",
    senior: "text-red-600 bg-red-50 border-red-200",
  }[level] ?? "text-gray-600 bg-gray-50 border-gray-200");

const scoreColor = (pct: number) =>
  pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-500";

const scoreBg = (pct: number) =>
  pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";

const scoreLabel = (pct: number) =>
  pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : "Needs work";

const engagementLabel = (pct: number) =>
  pct >= 80 ? "Highly engaged" : pct >= 60 ? "Engaged" : pct >= 40 ? "Somewhat engaged" : "Low engagement";

function rubricScore(rubric: unknown, key: string): number | null {
  if (typeof rubric !== "object" || rubric === null || Array.isArray(rubric)) {
    return null;
  }

  const value = (rubric as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const formatDuration = (s: number) => {
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
};

/* ─────────────────────────────────────────────────────────────
   SCORE BAR
───────────────────────────────────────────────────────────── */
function ScoreBar({
  label, value, max,
}: { label: string; value: number | null; max: number }) {
  const pct = value != null ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-gray-500 font-medium">{label}</span>
        <span className={`text-[12px] font-bold ${scoreColor(pct)}`}>
          {value ?? "—"}<span className="text-gray-400 font-normal">/{max}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${scoreBg(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DONUT SCORE
───────────────────────────────────────────────────────────── */
function DonutScore({ score, max }: { score: number | null; max: number }) {
  const pct   = score != null ? Math.round((score / max) * 100) : 0;
  const r     = 22;
  const circ  = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
      <svg viewBox="0 0 56 56" className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="text-[11px] font-bold text-gray-800">{pct}%</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LARGE RING — used in the overall analysis panel
───────────────────────────────────────────────────────────── */
function RingScore({
  value, max, size = 88, strokeWidth = 7, label,
}: { value: number | null; max: number; size?: number; strokeWidth?: number; label?: string }) {
  const pct   = value != null ? Math.round((value / max) * 100) : 0;
  const r     = (size - strokeWidth * 2) / 2;
  const circ  = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  const cx = size / 2;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full -rotate-90">
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="flex flex-col items-center">
          <span className="text-[20px] font-bold text-gray-900">{pct}%</span>
        </div>
      </div>
      {label && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   OVERALL PERFORMANCE ANALYSIS PANEL
───────────────────────────────────────────────────────────── */
function OverallAnalysisPanel({
  session,
  qaItems,
}: { session: Session; qaItems: QAWithResult[] }) {
  const behavioralItems = qaItems.filter(q => q.evaluation?.evaluation_type === "behavioral");
  const theoreticalItems = qaItems.filter(q => q.evaluation?.evaluation_type === "theoretical");
  const codingItems = qaItems.filter(q => q.evaluation?.evaluation_type === "coding");

  const avg = (items: QAWithResult[]) => {
    const scored = items.filter(q => q.evaluation?.total_score != null);
    if (!scored.length) return null;
    return Math.round(
      scored.reduce((total, item) => total + (item.evaluation?.total_score ?? 0), 0)
      / scored.length,
    );
  };

  const behavioralAvg = avg(behavioralItems);
  const theoreticalAvg = avg(theoreticalItems);
  const codingAvg = avg(codingItems);

  const allScored = qaItems.filter(q => q.evaluation?.total_score != null);
  const overallAvg = allScored.length
    ? Math.round(
        allScored.reduce((total, item) => total + (item.evaluation?.total_score ?? 0), 0)
        / allScored.length,
      )
    : null;

  const engagement = session.engagement_score;
  const inFrame    = session.in_frame_pct;
  const upright    = session.upright_pct;

  // Strength / weakness detection
  type Dim = { label: string; score: number };
  const dims: Dim[] = [];
  if (behavioralAvg  != null) dims.push({ label: "Behavioral",  score: behavioralAvg });
  if (theoreticalAvg != null) dims.push({ label: "Theoretical", score: theoreticalAvg });
  if (codingAvg      != null) dims.push({ label: "Coding",      score: codingAvg });
  const strongest = dims.length ? dims.reduce((a, b) => a.score >= b.score ? a : b) : null;
  const weakest   = dims.length > 1 ? dims.reduce((a, b) => a.score <= b.score ? a : b) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-gray-900 text-white flex items-center justify-center">
          <BarChart3 size={15} />
        </div>
        <h3 className="text-[13px] font-bold text-gray-900">Overall Performance Analysis</h3>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* ── Left: score rings ── */}
        <div className="flex flex-col gap-6">

          {/* Overall ring */}
          <div className="flex items-center gap-6">
            <RingScore value={overallAvg} max={100} size={96} label="Overall" />
            <div className="flex flex-col gap-1">
              <p className="text-[13px] font-bold text-gray-900">
                {overallAvg != null ? scoreLabel(overallAvg) : "No data"}
              </p>
              <p className="text-[11px] text-gray-400">
                Across {allScored.length} scored answer{allScored.length !== 1 ? "s" : ""}
              </p>
              {strongest && (
                <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                  <Award size={10} /> Strongest: {strongest.label} ({strongest.score}%)
                </p>
              )}
              {weakest && (
                <p className="text-[10px] text-amber-600 flex items-center gap-1">
                  <Target size={10} /> Focus area: {weakest.label} ({weakest.score}%)
                </p>
              )}
            </div>
          </div>

          {/* Per-type breakdown */}
          <div className="flex flex-col gap-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">By Type</p>
            {[
              { label: "Behavioral",  score: behavioralAvg,  count: behavioralItems.length,  Icon: MessageSquare },
              { label: "Theoretical", score: theoreticalAvg, count: theoreticalItems.length, Icon: Brain },
              { label: "Coding",      score: codingAvg,      count: codingItems.length,       Icon: Code },
            ].map(({ label, score, count, Icon }) => (
              count > 0 && (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 text-gray-500 shrink-0">
                    <Icon size={13} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] text-gray-600 font-medium">{label}</span>
                      <span className={`text-[11px] font-bold ${score != null ? scoreColor(score) : "text-gray-400"}`}>
                        {score != null ? `${score}%` : "—"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${score != null ? scoreBg(score) : "bg-gray-200"}`}
                        style={{ width: score != null ? `${score}%` : "0%" }}
                      />
                    </div>
                    <p className="text-[9px] text-gray-400 mt-0.5">{count} question{count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* ── Right: engagement ── */}
        <div className="flex flex-col gap-6">

          {/* Engagement ring */}
          <div className="flex items-center gap-6">
            <RingScore value={engagement} max={100} size={96} label="Engagement" />
            <div className="flex flex-col gap-1">
              <p className="text-[13px] font-bold text-gray-900">
                {engagement != null ? engagementLabel(engagement) : "Not tracked"}
              </p>
              <p className="text-[11px] text-gray-400">
                Based on posture & presence
              </p>
            </div>
          </div>

          {/* Engagement breakdown */}
          {(inFrame != null || upright != null) && (
            <div className="flex flex-col gap-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Presence Breakdown</p>
              {[
                { label: "In Frame",       value: inFrame,  Icon: Eye,      desc: "Time your face was visible" },
                { label: "Upright Posture", value: upright, Icon: Activity, desc: "Time you sat upright" },
              ].map(({ label, value, Icon, desc }) => (
                value != null && (
                  <div key={label} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 text-gray-500 shrink-0">
                      <Icon size={13} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-[11px] text-gray-600 font-medium">{label}</span>
                        <span className={`text-[11px] font-bold ${scoreColor(value)}`}>{value}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${scoreBg(value)}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5">{desc}</p>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Engagement tips */}
          {engagement != null && engagement < 60 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-500 mb-1.5">Tips for next session</p>
              <ul className="flex flex-col gap-1">
                {inFrame != null && inFrame < 70 && (
                  <li className="text-[11px] text-amber-800 flex items-start gap-1.5">
                    <Eye size={10} className="mt-0.5 shrink-0" /> Position your camera so your face is fully visible.
                  </li>
                )}
                {upright != null && upright < 70 && (
                  <li className="text-[11px] text-amber-800 flex items-start gap-1.5">
                    <Activity size={10} className="mt-0.5 shrink-0" /> Sit upright with shoulders level to project confidence.
                  </li>
                )}
              </ul>
            </div>
          )}

          {engagement == null && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 text-center">
              <Eye size={20} className="text-gray-300" />
              <p className="text-[11px] text-gray-400">
                Engagement data is not available for this session.<br />
                Enable camera in your next interview to track it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   QA CARD
───────────────────────────────────────────────────────────── */
function QACard({
  item, index,
}: { item: QAWithResult; index: number; interviewType: InterviewType }) {
  const [expanded, setExpanded] = useState(index === 0);
  const { response, evaluation } = item;

  const totalScore = evaluation?.total_score ?? null;
  const maxScore   = 100;
  const pct        = totalScore != null ? Math.round((totalScore / maxScore) * 100) : null;

  const evaluationType = evaluation?.evaluation_type ?? response.question_type;
  const resultType = evaluationType === "behavioral" ? "Behavioral"
    : evaluationType === "coding" ? "Coding"
    : evaluationType === "theoretical" ? "Theoretical"
    : null;

  const renderScores = () => {
    if (!evaluation) {
      return <p className="text-xs text-gray-400 italic">No analysis available for this answer.</p>;
    }

    if (evaluation.evaluation_type === "behavioral") return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ScoreBar label="Role Relevance" value={rubricScore(evaluation.rubric, "role_relevance")} max={30} />
        <ScoreBar label="Logical Flow (STAR)" value={rubricScore(evaluation.rubric, "logical_flow")} max={30} />
        <ScoreBar label="Conciseness" value={rubricScore(evaluation.rubric, "conciseness")} max={30} />
        <ScoreBar label="Communication" value={rubricScore(evaluation.rubric, "communication_skill")} max={10} />
      </div>
    );
    if (evaluation.evaluation_type === "theoretical") return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ScoreBar label="Technical Accuracy" value={rubricScore(evaluation.rubric, "technical_accuracy")} max={40} />
        <ScoreBar label="Role Relevance" value={rubricScore(evaluation.rubric, "role_relevance")} max={20} />
        <ScoreBar label="Logical Flow" value={rubricScore(evaluation.rubric, "logical_flow")} max={20} />
        <ScoreBar label="Conciseness" value={rubricScore(evaluation.rubric, "conciseness")} max={10} />
        <ScoreBar label="Communication" value={rubricScore(evaluation.rubric, "communication_skill")} max={10} />
      </div>
    );
    if (evaluation.evaluation_type === "coding") return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ScoreBar label="Correctness" value={rubricScore(evaluation.rubric, "correctness")} max={80} />
        <ScoreBar label="Time Complexity" value={rubricScore(evaluation.rubric, "time_complexity")} max={10} />
        <ScoreBar label="Code Quality" value={rubricScore(evaluation.rubric, "code_quality")} max={10} />
      </div>
    );
    return <p className="text-xs text-gray-400 italic">No analysis available for this answer.</p>;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">{response.question}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {resultType && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                {resultType === "Coding"      && <Code         size={10} />}
                {resultType === "Behavioral"  && <MessageSquare size={10} />}
                {resultType === "Theoretical" && <Brain         size={10} />}
                {resultType}
              </span>
            )}
            {response.created_at && (
              <span className="text-[10px] text-gray-400">
                {new Date(response.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {pct != null
            ? <DonutScore score={totalScore} max={maxScore} />
            : <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <AlertCircle size={16} className="text-gray-300" />
              </div>
          }
          <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-5 flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-gray-400 mb-2">Your Answer</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
              <p className="text-[12.5px] text-gray-700 leading-relaxed whitespace-pre-wrap">{response.answer}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-gray-400 mb-3">Score Breakdown</p>
            {renderScores()}
          </div>

          {evaluation?.feedback && (
            <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-blue-400 mb-1">AI Feedback</p>
                <p className="text-[12.5px] text-blue-900 leading-relaxed">{evaluation.feedback}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────────────────────── */
function StatCard({
  icon: Icon, label, value, sub,
}: { icon: ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
      <div className="flex items-center justify-center w-9 h-9 rounded-md bg-gray-100 text-gray-500 shrink-0">
        <Icon size={17} strokeWidth={2} />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-[15px] font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SESSION LIST ITEM
───────────────────────────────────────────────────────────── */
function SessionListItem({
  session, active, onClick,
}: { session: Session; active: boolean; onClick: () => void }) {
  const Icon = typeIcon(session.interview_type);
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200
        ${active
          ? "border-gray-900 bg-white shadow-sm ring-1 ring-gray-900"
          : "border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300"}`}
    >
      <div className={`flex items-center justify-center w-8 h-8 rounded-md shrink-0 transition-colors
        ${active ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"}`}>
        <Icon size={15} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-gray-900 truncate">{session.role}</p>
        <p className="text-[10.5px] text-gray-400 capitalize mt-0.5">
          {session.level} · {session.interview_type}
        </p>
      </div>
      <ChevronRight size={14} className={`shrink-0 ${active ? "text-gray-900" : "text-gray-300"}`} />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
function HistoryPageContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const supabase     = getSupabaseBrowserClient();

  const highlightSession = searchParams.get("session");

  const [sessions,   setSessions]   = useState<Session[]>([]);
  const [activeId,   setActiveId]   = useState<string | null>(highlightSession ?? null);
  const [qaItems,    setQaItems]    = useState<QAWithResult[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [detailLoad, setDetailLoad] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  /* ── Load session list ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not authenticated."); setLoading(false); return; }

      const { data, error: err } = await supabase
        .from("sessions")
        .select("session_id, interview_type, level, role, started_at, ended_at, duration_seconds, engagement_score, in_frame_pct, upright_pct")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });

      if (err) { setError(err.message); }
      else {
        setSessions((data ?? []) as Session[]);
        if (!activeId && data && data.length > 0) setActiveId(data[0].session_id);
      }
      setLoading(false);
    })();
  }, []);

  /* ── Load detail for active session ── */
  useEffect(() => {
    if (!activeId) return;
    (async () => {
      setDetailLoad(true);
      setQaItems([]);

      const { data: responseRows, error: responseError } = await supabase
        .from("responses")
        .select("response_id, question, answer, created_at, question_type")
        .eq("session_id", activeId)
        .order("created_at", { ascending: true });

      if (responseError || !responseRows) {
        setError(responseError?.message ?? "Could not load interview responses.");
        setDetailLoad(false);
        return;
      }

      const responseIds = responseRows.map(response => response.response_id);
      const evaluationResult = responseIds.length
        ? await supabase
            .from("response_evaluations")
            .select("response_id, evaluation_type, rubric, total_score, feedback")
            .in("response_id", responseIds)
        : { data: [], error: null };

      if (evaluationResult.error) {
        setError(evaluationResult.error.message);
        setDetailLoad(false);
        return;
      }

      const evaluationMap = new Map(
        (evaluationResult.data ?? []).map(evaluation => [
          evaluation.response_id,
          evaluation as ResponseEvaluation,
        ]),
      );

      const items: QAWithResult[] = responseRows.map(response => ({
        response: response as InterviewResponse,
        evaluation: evaluationMap.get(response.response_id),
      }));

      setQaItems(items);
      setDetailLoad(false);
    })();
  }, [activeId]);

  /* ── Derived ── */
  const activeSession = sessions.find(s => s.session_id === activeId);

  const overallAvg = (() => {
    const scored = qaItems.filter(q => q.evaluation?.total_score != null);
    if (!scored.length) return null;
    return Math.round(
      scored.reduce((total, item) => total + (item.evaluation?.total_score ?? 0), 0)
      / scored.length,
    );
  })();

  const Icon = activeSession ? typeIcon(activeSession.interview_type) : Layers;

  /* ── Loading / error / empty states ── */
  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin" />
        <p className="text-sm">Loading your history…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3 text-center">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    </div>
  );

  if (!sessions.length) return (
    <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
        <FileText size={24} className="text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">No sessions yet</p>
        <p className="text-xs text-gray-400 mt-1">Complete an interview to see your results here.</p>
      </div>
      <button onClick={() => router.push("/dashboard/configuration")}
        className="flex items-center gap-2 mt-2 rounded-lg bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 hover:bg-gray-800 transition">
        Start your first interview <ChevronRight size={14} />
      </button>
    </div>
  );

  /* ── Main render ── */
  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-8">
        <p className="text-[10.5px] font-bold tracking-[0.09em] uppercase text-red-800 mb-1.5">Interview History</p>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">Your sessions</h1>
        <p className="text-[13px] text-gray-500">Review past interviews, scores, and AI feedback.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">

        {/* Session list */}
        <div className="lg:sticky lg:top-6 flex flex-col gap-3">
          <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-gray-400">Sessions ({sessions.length})</p>
          <div className="flex flex-col gap-2">
            {sessions.map(s => (
              <SessionListItem
                key={s.session_id}
                session={s}
                active={s.session_id === activeId}
                onClick={() => setActiveId(s.session_id)}
              />
            ))}
          </div>
        </div>

        {/* Session detail */}
        <div className="flex flex-col gap-5 min-w-0">
          {activeSession && (
            <>
              {/* Session header */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-gray-900 text-white shrink-0">
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">{activeSession.role}</h2>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <span className={`inline-flex items-center text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${levelColor(activeSession.level)}`}>
                        {activeSession.level}
                      </span>
                      <span className="inline-flex items-center text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full border border-gray-200 text-gray-600 bg-gray-50 capitalize">
                        {activeSession.interview_type}
                      </span>
                      {overallAvg != null && (
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border
                          ${overallAvg >= 80
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : overallAvg >= 60
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-red-50 border-red-200 text-red-700"}`}>
                          <Trophy size={10} /> Avg {overallAvg}%
                        </span>
                      )}
                      {activeSession.engagement_score != null && (
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border
                          ${activeSession.engagement_score >= 80
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : activeSession.engagement_score >= 60
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                              : "bg-gray-50 border-gray-200 text-gray-600"}`}>
                          <Eye size={10} /> {activeSession.engagement_score}% engaged
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  icon={Calendar}
                  label="Date"
                  value={activeSession.started_at
                    ? new Date(activeSession.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "—"}
                  sub={activeSession.started_at
                    ? new Date(activeSession.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : undefined}
                />
                <StatCard
                  icon={Clock}
                  label="Duration"
                  value={activeSession.duration_seconds ? formatDuration(activeSession.duration_seconds) : "—"}
                />
                <StatCard
                  icon={MessageSquare}
                  label="Questions"
                  value={String(qaItems.length)}
                  sub={qaItems.length === 1 ? "question" : "questions"}
                />
                <StatCard
                  icon={TrendingUp}
                  label="Avg Score"
                  value={overallAvg != null ? `${overallAvg}%` : "—"}
                  sub={overallAvg != null ? scoreLabel(overallAvg) : "No scores yet"}
                />
              </div>

              {/* ── Overall performance analysis ── */}
              {!detailLoad && (qaItems.length > 0 || activeSession.engagement_score != null) && (
                <OverallAnalysisPanel session={activeSession} qaItems={qaItems} />
              )}

              {/* Q&A list */}
              {detailLoad ? (
                <div className="flex items-center justify-center h-40 text-gray-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin" />
                    <p className="text-xs">Loading answers…</p>
                  </div>
                </div>
              ) : qaItems.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-10 flex flex-col items-center text-center gap-3">
                  <Mic size={24} className="text-gray-300" />
                  <p className="text-sm text-gray-500">No Q&A recorded for this session.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-gray-400">
                    Q&A Analysis ({qaItems.length})
                  </p>
                  {qaItems.map((item, i) => (
                    <QACard
                      key={item.response.response_id}
                      item={item}
                      index={i}
                      interviewType={activeSession.interview_type}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading history...</div>}>
      <HistoryPageContent />
    </Suspense>
  );
}
