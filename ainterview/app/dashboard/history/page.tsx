"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronDown, ChevronRight, Play, Pause, RotateCcw,
  MessageSquare, Code, Layers, Trophy, Clock, Calendar,
  TrendingUp, AlertCircle, CheckCircle2, Target, Mic,
  BarChart3, FileText, Video, ChevronLeft,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser-client";

/* ─── Types ──────────────────────────────────────────────── */
type InterviewType = "behavioral" | "technical" | "full";
type Level = "junior" | "mid" | "senior";

interface Session {
  session_id: string;
  interview_type: InterviewType;
  level: Level;
  role: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
}

interface HistoryItem {
  history_id: string;
  question: string;
  answer: string;
  asked_at: string | null;
  video_record: string | null;
}

interface ResultCommunication {
  history_id: string;
  role_relevance: number | null;
  logical_flow: number | null;
  conciseness: number | null;
  communication_skill: number | null;
  total_score: number | null;
  feedback: string | null;
}

interface ResultTheoretical {
  history_id: string;
  technical_accuracy: number | null;
  role_relevance: number | null;
  logical_flow: number | null;
  conciseness: number | null;
  communication_skill: number | null;
  total_score: number | null;
  feedback: string | null;
}

interface ResultCoding {
  history_id: string;
  correctness: number | null;
  time_complexity: number | null;
  code_quality: number | null;
  total_score: number | null;
  feedback: string | null;
}

interface QAWithResult {
  history: HistoryItem;
  result_communication?: ResultCommunication;
  result_theoretical?: ResultTheoretical;
  result_coding?: ResultCoding;
  videoUrl?: string;
}

/* ─── Helpers ────────────────────────────────────────────── */
const typeIcon = (type: InterviewType) => {
  const map = { behavioral: MessageSquare, technical: Code, full: Layers };
  return map[type] ?? Layers;
};

const levelColor = (level: Level) => {
  const map = { junior: "text-emerald-600 bg-emerald-50 border-emerald-200", mid: "text-amber-600 bg-amber-50 border-amber-200", senior: "text-red-600 bg-red-50 border-red-200" };
  return map[level] ?? "text-gray-600 bg-gray-50 border-gray-200";
};

const scoreColor = (pct: number) => {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 60) return "text-amber-600";
  return "text-red-500";
};

const scoreBg = (pct: number) => {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-red-500";
};

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/* ─── Score Bar ──────────────────────────────────────────── */
function ScoreBar({ label, value, max, color }: { label: string; value: number | null; max: number; color: string }) {
  const pct = value != null ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-gray-500 font-medium">{label}</span>
        <span className={`text-[12px] font-bold ${scoreColor(pct)}`}>{value ?? "—"}<span className="text-gray-400 font-normal">/{max}</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Donut Score ────────────────────────────────────────── */
function DonutScore({ score, max }: { score: number | null; max: number }) {
  const pct = score != null ? Math.round((score / max) * 100) : 0;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
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

/* ─── Video Player ───────────────────────────────────────── */
function VideoPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const restart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setPlaying(true);
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
      <video ref={videoRef} src={url} className="w-full h-full object-cover"
        onEnded={() => setPlaying(false)} />
      <div className="absolute inset-0 flex items-center justify-center gap-3">
        <button onClick={toggle}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/90 text-gray-900 shadow-lg hover:bg-white transition">
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button onClick={restart}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/70 text-gray-900 shadow hover:bg-white/90 transition">
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─── QA Card ────────────────────────────────────────────── */
function QACard({ item, index, interviewType }: { item: QAWithResult; index: number; interviewType: InterviewType }) {
  const [expanded, setExpanded] = useState(index === 0);
  const { history, result_communication, result_theoretical, result_coding, videoUrl } = item;

  /* Determine which result we have */
  const result = result_communication ?? result_theoretical ?? result_coding;
  const totalScore = result?.total_score ?? null;

  /* Max score by type */
  const maxScore = result_coding ? 100 : result_theoretical ? 100 : 100;
  const pct = totalScore != null ? Math.round((totalScore / maxScore) * 100) : null;

  /* Score breakdown by result type */
  const renderScores = () => {
    if (result_communication) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ScoreBar label="Role Relevance" value={result_communication.role_relevance} max={30} color={scoreBg(Math.round(((result_communication.role_relevance ?? 0) / 30) * 100))} />
          <ScoreBar label="Logical Flow (STAR)" value={result_communication.logical_flow} max={30} color={scoreBg(Math.round(((result_communication.logical_flow ?? 0) / 30) * 100))} />
          <ScoreBar label="Conciseness" value={result_communication.conciseness} max={30} color={scoreBg(Math.round(((result_communication.conciseness ?? 0) / 30) * 100))} />
          <ScoreBar label="Communication" value={result_communication.communication_skill} max={10} color={scoreBg(Math.round(((result_communication.communication_skill ?? 0) / 10) * 100))} />
        </div>
      );
    }
    if (result_theoretical) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ScoreBar label="Technical Accuracy" value={result_theoretical.technical_accuracy} max={40} color={scoreBg(Math.round(((result_theoretical.technical_accuracy ?? 0) / 40) * 100))} />
          <ScoreBar label="Role Relevance" value={result_theoretical.role_relevance} max={20} color={scoreBg(Math.round(((result_theoretical.role_relevance ?? 0) / 20) * 100))} />
          <ScoreBar label="Logical Flow" value={result_theoretical.logical_flow} max={20} color={scoreBg(Math.round(((result_theoretical.logical_flow ?? 0) / 20) * 100))} />
          <ScoreBar label="Conciseness" value={result_theoretical.conciseness} max={10} color={scoreBg(Math.round(((result_theoretical.conciseness ?? 0) / 10) * 100))} />
          <ScoreBar label="Communication" value={result_theoretical.communication_skill} max={10} color={scoreBg(Math.round(((result_theoretical.communication_skill ?? 0) / 10) * 100))} />
        </div>
      );
    }
    if (result_coding) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ScoreBar label="Correctness" value={result_coding.correctness} max={80} color={scoreBg(Math.round(((result_coding.correctness ?? 0) / 80) * 100))} />
          <ScoreBar label="Time Complexity" value={result_coding.time_complexity} max={10} color={scoreBg(Math.round(((result_coding.time_complexity ?? 0) / 10) * 100))} />
          <ScoreBar label="Code Quality" value={result_coding.code_quality} max={10} color={scoreBg(Math.round(((result_coding.code_quality ?? 0) / 10) * 100))} />
        </div>
      );
    }
    return <p className="text-xs text-gray-400 italic">No analysis available for this answer.</p>;
  };

  const resultType = result_communication ? "Behavioral" : result_coding ? "Coding" : result_theoretical ? "Theoretical" : null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-gray-50/60 transition-colors"
      >
        {/* Index */}
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>

        {/* Question */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">{history.question}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {resultType && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                {resultType === "Coding" ? <Code size={10} /> : resultType === "Behavioral" ? <MessageSquare size={10} /> : <BarChart3 size={10} />}
                {resultType}
              </span>
            )}
            {history.asked_at && (
              <span className="text-[10px] text-gray-400">{new Date(history.asked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
        </div>

        {/* Score donut */}
        <div className="flex items-center gap-3 shrink-0">
          {pct != null ? (
            <DonutScore score={totalScore} max={maxScore} />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <AlertCircle size={16} className="text-gray-300" />
            </div>
          )}
          <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-gray-100 p-5 flex flex-col gap-5">
          {/* Answer + Video */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Answer */}
            <div>
              <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-gray-400 mb-2">Your Answer</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                <p className="text-[12.5px] text-gray-700 leading-relaxed whitespace-pre-wrap">{history.answer}</p>
              </div>
            </div>

            {/* Video or placeholder */}
            <div>
              <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-gray-400 mb-2">Recording</p>
              {videoUrl ? (
                <VideoPlayer url={videoUrl} />
              ) : (
                <div className="aspect-video rounded-xl bg-gray-100 border border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <Video size={24} className="opacity-40" />
                  <p className="text-[11px]">No recording</p>
                </div>
              )}
            </div>
          </div>

          {/* Score breakdown */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-gray-400 mb-3">Score Breakdown</p>
            {renderScores()}
          </div>

          {/* Feedback */}
          {result?.feedback && (
            <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-blue-400 mb-1">AI Feedback</p>
                <p className="text-[12.5px] text-blue-900 leading-relaxed">{result.feedback}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
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

/* ─── Session List Item ──────────────────────────────────── */
function SessionListItem({ session, active, onClick }: { session: Session; active: boolean; onClick: () => void }) {
  const Icon = typeIcon(session.interview_type);
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200 ${active ? "border-gray-900 bg-white shadow-sm ring-1 ring-gray-900" : "border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300"}`}
    >
      <div className={`flex items-center justify-center w-8 h-8 rounded-md shrink-0 transition-colors ${active ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"}`}>
        <Icon size={15} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-gray-900 truncate">{session.role}</p>
        <p className="text-[10.5px] text-gray-400 capitalize mt-0.5">{session.level} · {session.interview_type}</p>
      </div>
      <ChevronRight size={14} className={`shrink-0 transition-colors ${active ? "text-gray-900" : "text-gray-300"}`} />
    </button>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function HistoryPage() {
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

  /* ─── Load session list ─────────────────────────────────── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not authenticated."); setLoading(false); return; }

      const { data, error: err } = await supabase
        .from("session")
        .select("session_id, interview_type, level, role, started_at, ended_at, duration_seconds")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });

      if (err) { setError(err.message); }
      else {
        setSessions((data ?? []) as Session[]);
        /* Auto-select first session if none highlighted */
        if (!activeId && data && data.length > 0) setActiveId(data[0].session_id);
      }
      setLoading(false);
    })();
  }, []);

  /* ─── Load detail for active session ───────────────────── */
  useEffect(() => {
    if (!activeId) return;
    (async () => {
      setDetailLoad(true);
      setQaItems([]);

      /* Fetch history rows */
      const { data: histRows, error: hErr } = await supabase
        .from("history")
        .select("history_id, question, answer, asked_at, video_record")
        .eq("session_id", activeId)
        .order("asked_at", { ascending: true });

      if (hErr || !histRows) { setDetailLoad(false); return; }

      /* Fetch all result tables in parallel */
      const ids = histRows.map(h => h.history_id);

      const [commRes, theoRes, codeRes] = await Promise.all([
        supabase.from("result_communication").select("*").in("history_id", ids),
        supabase.from("result_theoretical").select("*").in("history_id", ids),
        supabase.from("result_coding").select("*").in("history_id", ids),
      ]);

      /* Build maps */
      const commMap = Object.fromEntries((commRes.data ?? []).map(r => [r.history_id, r]));
      const theoMap = Object.fromEntries((theoRes.data ?? []).map(r => [r.history_id, r]));
      const codeMap = Object.fromEntries((codeRes.data ?? []).map(r => [r.history_id, r]));

      /* Resolve signed video URLs */
      const items: QAWithResult[] = await Promise.all(
        histRows.map(async h => {
          let videoUrl: string | undefined;
          if (h.video_record) {
            const { data: signed } = await supabase.storage
              .from("interview-recordings")
              .createSignedUrl(h.video_record, 3600);
            videoUrl = signed?.signedUrl;
          }
          return {
            history: h as HistoryItem,
            result_communication: commMap[h.history_id] as ResultCommunication | undefined,
            result_theoretical:   theoMap[h.history_id] as ResultTheoretical | undefined,
            result_coding:        codeMap[h.history_id] as ResultCoding | undefined,
            videoUrl,
          };
        })
      );

      setQaItems(items);
      setDetailLoad(false);
    })();
  }, [activeId]);

  /* ─── Derived ───────────────────────────────────────────── */
  const activeSession = sessions.find(s => s.session_id === activeId);

  const overallAvg = (() => {
    const scored = qaItems.filter(q => {
      const r = q.result_communication ?? q.result_theoretical ?? q.result_coding;
      return r?.total_score != null;
    });
    if (!scored.length) return null;
    const sum = scored.reduce((acc, q) => {
      const r = q.result_communication ?? q.result_theoretical ?? q.result_coding;
      return acc + (r?.total_score ?? 0);
    }, 0);
    return Math.round(sum / scored.length);
  })();

  const Icon = activeSession ? typeIcon(activeSession.interview_type) : Layers;

  /* ─── Render ────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin" />
          <p className="text-sm">Loading your history…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
          <FileText size={24} className="text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">No sessions yet</p>
          <p className="text-xs text-gray-400 mt-1">Complete an interview to see your results here.</p>
        </div>
        <button onClick={() => router.push("/dashboard/interview")}
          className="flex items-center gap-2 mt-2 rounded-lg bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 hover:bg-gray-800 transition">
          Start your first interview <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-8">
        <p className="text-[10.5px] font-bold tracking-[0.09em] uppercase text-red-800 mb-1.5">Interview History</p>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">Your sessions</h1>
        <p className="text-[13px] text-gray-500">Review past interviews, scores, and AI feedback.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">

        {/* ── Left: session list ── */}
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

        {/* ── Right: session detail ── */}
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
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${overallAvg >= 80 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : overallAvg >= 60 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                          <Trophy size={10} /> Avg {overallAvg}/100
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Calendar} label="Date" value={activeSession.started_at ? new Date(activeSession.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"} sub={activeSession.started_at ? new Date(activeSession.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined} />
                <StatCard icon={Clock} label="Duration" value={activeSession.duration_seconds ? formatDuration(activeSession.duration_seconds) : "—"} />
                <StatCard icon={MessageSquare} label="Questions" value={String(qaItems.length)} sub={qaItems.length === 1 ? "question" : "questions"} />
                <StatCard icon={TrendingUp} label="Avg Score" value={overallAvg != null ? `${overallAvg}%` : "—"} sub={overallAvg != null ? (overallAvg >= 80 ? "Excellent" : overallAvg >= 60 ? "Good" : "Needs work") : "No scores yet"} />
              </div>

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
                  <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-gray-400">Q&A Analysis ({qaItems.length})</p>
                  {qaItems.map((item, i) => (
                    <QACard
                      key={item.history.history_id}
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