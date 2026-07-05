"use client";

import {
  Suspense, useState, useEffect, useRef, useCallback, type RefObject,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mic, MicOff, Video, VideoOff, Send, Bot, User,
  Clock, AlertTriangle, Code2, Activity, BarChart3,
  CheckCircle2, XCircle, Eye,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser-client";
import {
  calculateTotalScore,
  validatedRubricScore,
} from "@/app/lib/interview-scoring";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
  questionType?: QuestionType;
}

type QuestionType   = "behavioral" | "theoretical" | "coding";
type Phase          = "behavioral" | "theoretical" | "coding" | "ended";
type InterviewType  = "behavioral" | "technical" | "full";
type Level          = "junior" | "mid" | "senior";

interface SessionConfig {
  sessionId:      string;
  interview_type: InterviewType;
  level:          Level;
  role:           string;
}

interface ResponseRow { response_id: string; }

interface CodingProblem {
  problem_id:  string;
  title:       string;
  description: string;
  difficulty:  string | null;
  languages:   string[];
}

interface QuestionResult {
  questionText: string;
  answerText:   string;
  questionType: QuestionType;
  totalScore:   number | null;
  feedback:     string | null;
}

interface PostureMetrics {
  totalFrames:   number;
  inFrameFrames: number;
  uprightFrames: number;
  lastStatus:    "in_frame_upright" | "in_frame_slouched" | "out_of_frame";
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

interface PoseResults {
  poseLandmarks?: PoseLandmark[];
}

interface PoseInstance {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (callback: (results: PoseResults) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close?: () => void;
}

type PoseConstructor = new (config: { locateFile: (file: string) => string }) => PoseInstance;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
    Pose?: PoseConstructor;
  }
}

const DEFAULT_SESSION_LIMIT_SECONDS = 15 * 60;
const DEFAULT_CODING_PROBLEMS_TO_FETCH = 2;

function pickRandomItems<T>(items: T[], count: number): T[] {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

function createMessageId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getPhasePlan(type: InterviewType): Phase[] {
  switch (type) {
    case "behavioral":  return ["behavioral", "ended"];
    case "technical":   return ["theoretical", "coding", "ended"];
    case "full":        return ["behavioral", "theoretical", "coding", "ended"];
  }
}

function phaseDuration(
  type: InterviewType,
  phase: Phase,
  sessionLimitSeconds: number,
): number | null {
  if (type !== "full") return null;

  const behavioralSeconds = Math.floor(sessionLimitSeconds / 2);
  const theoreticalSeconds = sessionLimitSeconds - behavioralSeconds;

  switch (phase) {
    case "behavioral":  return behavioralSeconds;
    case "theoretical": return theoreticalSeconds;
    default:            return null;
  }
}

function phaseToQuestionType(phase: Phase): QuestionType {
  switch (phase) {
    case "behavioral":  return "behavioral";
    case "theoretical": return "theoretical";
    case "coding":      return "coding";
    default:            return "theoretical";
  }
}

function buildBehavioralPrompt(role: string, level: string, q: string, a: string) {
  return `You are an expert interviewer evaluating a ${level}-level ${role} candidate on a behavioral question.
Score:
- role_relevance (0–30): Tailored to ${role} role with real impact?
- logical_flow (0–30): Follows STAR (Situation, Task, Action, Result)?
- conciseness (0–30): Clear and focused without filler?
- communication_skill (0–10): Professional and articulate?
Question: "${q}"
Answer: "${a}"
Respond ONLY with valid JSON, no markdown, no preamble:
{"role_relevance":<0-30>,"logical_flow":<0-30>,"conciseness":<0-30>,"communication_skill":<0-10>,"feedback":"<2-3 sentences>"}
Do not include total_score; the application calculates it from the rubric scores.`;
}

function buildTheoreticalPrompt(role: string, level: string, q: string, a: string) {
  return `You are a senior ${role} evaluating a ${level}-level candidate on a technical theoretical question.
Score:
- technical_accuracy (0–40): Correct and complete for ${level} level?
- role_relevance (0–20): Relevant to ${role} role?
- logical_flow (0–20): Well-structured explanation?
- conciseness (0–10): Focused, no padding?
- communication_skill (0–10): Clear and professional?
Question: "${q}"
Answer: "${a}"
Respond ONLY with valid JSON, no markdown:
{"technical_accuracy":<0-40>,"role_relevance":<0-20>,"logical_flow":<0-20>,"conciseness":<0-10>,"communication_skill":<0-10>,"feedback":"<2-3 sentences>"}
Do not include total_score; the application calculates it from the rubric scores.`;
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

function getAnalysisConfig(
  questionType: QuestionType,
  role: string, level: string,
  question: string, answer: string,
): { prompt: string; evaluationType: "behavioral" | "theoretical" } {
  if (questionType === "behavioral") {
    return {
      prompt: buildBehavioralPrompt(role, level, question, answer),
      evaluationType: "behavioral",
    };
  }
  return {
    prompt: buildTheoreticalPrompt(role, level, question, answer),
    evaluationType: "theoretical",
  };
}

function computeEngagementScore(m: PostureMetrics): number {
  if (m.totalFrames === 0) return 0;
  const inFramePct = m.inFrameFrames / m.totalFrames;
  const uprightPct = m.uprightFrames / m.totalFrames;
  return Math.round((inFramePct * 0.6 + uprightPct * 0.4) * 100);
}

/* ─── Small UI ────────────────────────────────────────────── */
function PhaseBadge({ phase }: { phase: Phase }) {
  const cfg: Record<Phase, { label: string; color: string }> = {
    behavioral:  { label: "Behavioral",  color: "bg-violet-500/15 border-violet-500/30 text-violet-400" },
    theoretical: { label: "Theoretical", color: "bg-blue-500/15 border-blue-500/30 text-blue-400" },
    coding:      { label: "Coding",      color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" },
    ended:       { label: "Ended",       color: "bg-gray-500/15 border-gray-500/30 text-gray-400" },
  };
  const { label, color } = cfg[phase];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${color}`}>
      {label}
    </span>
  );
}

function PostureBadge({ status }: { status: PostureMetrics["lastStatus"] }) {
  const cfg = {
    in_frame_upright:  { label: "Good posture", color: "bg-emerald-500/15 text-emerald-400", Icon: CheckCircle2 },
    in_frame_slouched: { label: "Sit upright",  color: "bg-amber-500/15 text-amber-400",     Icon: AlertTriangle },
    out_of_frame:      { label: "Out of frame", color: "bg-red-500/15 text-red-400",          Icon: XCircle },
  };
  const { label, color, Icon } = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${color}`}>
      <Icon size={10} /> {label}
    </span>
  );
}

/* ─── Performance Panel ───────────────────────────────────── */
function PerformancePanel({
  results, postureMetrics, isVisible, onToggle,
}: {
  results: QuestionResult[];
  postureMetrics: PostureMetrics;
  isVisible: boolean;
  onToggle: () => void;
}) {
  const scored      = results.filter(r => r.totalScore != null);
  const avgScore    = scored.length
    ? Math.round(scored.reduce((a, r) => a + (r.totalScore ?? 0), 0) / scored.length)
    : null;
  const engagement  = computeEngagementScore(postureMetrics);
  const inFramePct  = postureMetrics.totalFrames
    ? Math.round((postureMetrics.inFrameFrames / postureMetrics.totalFrames) * 100) : 0;
  const uprightPct  = postureMetrics.totalFrames
    ? Math.round((postureMetrics.uprightFrames / postureMetrics.totalFrames) * 100) : 0;

  const scoreColor = (pct: number) =>
    pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
  const scoreText = (pct: number) =>
    pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-red-400";

  return (
    <div className="border-t border-white/[0.06]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition"
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={13} className="text-blue-400" />
          <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Performance</span>
          {avgScore != null && (
            <span className={`text-[10px] font-bold ${scoreText(avgScore)}`}>{avgScore}%</span>
          )}
        </div>
        {isVisible
          ? <ChevronDown size={13} className="text-gray-500" />
          : <ChevronUp   size={13} className="text-gray-500" />}
      </button>

      {isVisible && (
        <div className="px-5 pb-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Engagement</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Engagement", value: engagement },
                { label: "In Frame",   value: inFramePct },
                { label: "Upright",    value: uprightPct },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2 py-2 flex flex-col items-center gap-1">
                  <span className={`text-[15px] font-bold ${scoreText(value)}`}>{value}%</span>
                  <span className="text-[9px] text-gray-500">{label}</span>
                  <div className="w-full h-1 rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${scoreColor(value)}`} style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {scored.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Q&A Scores</p>
              {results.map((r, i) => (
                <div key={i} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-gray-400 line-clamp-1 flex-1">{r.questionText.slice(0, 60)}…</p>
                    <span className={`text-[11px] font-bold shrink-0 ${r.totalScore != null ? scoreText(r.totalScore) : "text-gray-500"}`}>
                      {r.totalScore != null ? `${r.totalScore}%` : "—"}
                    </span>
                  </div>
                  {r.totalScore != null && (
                    <div className="h-1 rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${scoreColor(r.totalScore)}`}
                        style={{ width: `${r.totalScore}%`, transition: "width 0.7s" }}
                      />
                    </div>
                  )}
                  {r.feedback && (
                    <p className="text-[10px] text-gray-500 leading-relaxed">{r.feedback}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {scored.length === 0 && (
            <p className="text-[10px] text-gray-600 italic text-center py-2">
              Scores appear as you answer questions.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── MediaPipe Pose Hook ─────────────────────────────────── */
function useMediaPipePose(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  onMetricsUpdate: (update: (prev: PostureMetrics) => PostureMetrics) => void,
  onStatusChange: (status: PostureMetrics["lastStatus"]) => void,
) {
  const poseRef    = useRef<PoseInstance | null>(null);
  const rafRef     = useRef<number>(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let destroyed = false;

    const loadAndRun = async () => {
      if (!window.Pose) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js";
          s.onload = () => resolve(); s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      if (destroyed) return;

      const Pose = window.Pose;
      if (!Pose) return;
      const pose = new Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      pose.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence:  0.5,
      });

      pose.onResults((results) => {
        if (destroyed) return;
        const lm = results.poseLandmarks;
        if (!lm || lm.length < 13) {
          onMetricsUpdate(prev => ({ ...prev, totalFrames: prev.totalFrames + 1, lastStatus: "out_of_frame" }));
          onStatusChange("out_of_frame");
          return;
        }
        const nose = lm[0], ls = lm[11], rs = lm[12];
        if ([nose, ls, rs].some(p => (p.visibility ?? 1) <= 0.5)) {
          onMetricsUpdate(prev => ({ ...prev, totalFrames: prev.totalFrames + 1, lastStatus: "out_of_frame" }));
          onStatusChange("out_of_frame");
          return;
        }
        const isUpright = nose.y < (ls.y + rs.y) / 2 - 0.05 && Math.abs(ls.y - rs.y) < 0.08;
        const status: PostureMetrics["lastStatus"] = isUpright ? "in_frame_upright" : "in_frame_slouched";
        onMetricsUpdate(prev => ({
          totalFrames:   prev.totalFrames + 1,
          inFrameFrames: prev.inFrameFrames + 1,
          uprightFrames: prev.uprightFrames + (isUpright ? 1 : 0),
          lastStatus:    status,
        }));
        onStatusChange(status);
      });

      poseRef.current = pose;
      let lastTime = 0;
      const throttledFrame = async (time: number) => {
        if (destroyed) return;
        if (time - lastTime > 100) {
          lastTime = time;
          const video = videoRef.current;
          if (video && video.readyState >= 2) {
            try { await poseRef.current?.send({ image: video }); } catch { /* ignore */ }
          }
        }
        rafRef.current = requestAnimationFrame(throttledFrame);
      };
      rafRef.current = requestAnimationFrame(throttledFrame);
    };

    loadAndRun().catch(console.error);
    return () => {
      destroyed = true;
      cancelAnimationFrame(rafRef.current);
      poseRef.current?.close?.();
    };
  }, [enabled]);
}

/* ─── Main Component ──────────────────────────────────────── */
function InterviewPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = getSupabaseBrowserClient();

  const sessionConfig: SessionConfig = {
    sessionId:      searchParams.get("session") ?? "",
    interview_type: (searchParams.get("type")  as InterviewType) ?? "behavioral",
    level:          (searchParams.get("level") as Level)          ?? "mid",
    role:            searchParams.get("role")                      ?? "Software Engineer",
  };
  const cameraEnabled = searchParams.get("camera") !== "false";
  const configuredSessionLimit = Number(searchParams.get("time_limit"));
  const sessionLimitSeconds = Number.isFinite(configuredSessionLimit) && configuredSessionLimit > 0
    ? configuredSessionLimit * 60
    : DEFAULT_SESSION_LIMIT_SECONDS;
  const configuredCodingCount = Number(searchParams.get("coding_count"));
  const codingProblemsToFetch = Number.isFinite(configuredCodingCount) && configuredCodingCount > 0
    ? Math.floor(configuredCodingCount)
    : DEFAULT_CODING_PROBLEMS_TO_FETCH;
  const warningAtSeconds = Math.max(0, sessionLimitSeconds - 2 * 60);

  const videoRef         = useRef<HTMLVideoElement>(null);
  const recognitionRef   = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const phaseTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTransitioningRef = useRef(false);

  /* ── Core state ── */
  const [isCameraOn,         setIsCameraOn]         = useState(cameraEnabled);
  const [isMicOn,            setIsMicOn]            = useState(false);
  const [isListening,        setIsListening]        = useState(false);
  const [speechSupported,    setSpeechSupported]    = useState(true);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [isSessionEnded,     setIsSessionEnded]     = useState(false);
  const [messages,           setMessages]           = useState<Message[]>([]);
  const [inputValue,         setInputValue]         = useState("");
  const [interviewTime,      setInterviewTime]      = useState(0);
  const [isLoading,          setIsLoading]          = useState(false);
  const [showWarning,        setShowWarning]        = useState(false);
  const [isSaving,           setIsSaving]           = useState(false);
  const [showPerfPanel,      setShowPerfPanel]      = useState(false);
  const [upgradeNotice,      setUpgradeNotice]      = useState<string | null>(null);
  const [upgradeRequestStatus, setUpgradeRequestStatus] = useState<string | null>(null);

  /* ── Phase state machine ── */
  const phasePlan = getPhasePlan(sessionConfig.interview_type);
  const [phaseIndex,    setPhaseIndex]    = useState(0);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState<number | null>(
    phaseDuration(sessionConfig.interview_type, phasePlan[0], sessionLimitSeconds),
  );
  const currentPhase = phasePlan[phaseIndex] as Phase;
  const isCommunicationPhase =
    currentPhase === "behavioral" || currentPhase === "theoretical";

  /* ── Q tracking ── */
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  // Use a ref for codingProblems so advancePhase closure always has fresh data
  const [codingProblems,  setCodingProblems]  = useState<CodingProblem[]>([]);
  const codingProblemsRef = useRef<CodingProblem[]>([]);
  const [codingIndex,     setCodingIndex]     = useState(0);

  /* ── Posture ── */
  const [postureMetrics, setPostureMetrics] = useState<PostureMetrics>({
    totalFrames: 0, inFrameFrames: 0, uprightFrames: 0, lastStatus: "out_of_frame",
  });
  const [postureStatus, setPostureStatus] = useState<PostureMetrics["lastStatus"]>("out_of_frame");

  useMediaPipePose(
    videoRef,
    isCameraOn && isInterviewStarted && !isSessionEnded && isCommunicationPhase,
    setPostureMetrics,
    setPostureStatus,
  );

  /* ── Scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /* ── Camera ── */
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        alert("Unable to access camera/microphone.");
      }
    };
    if (isCameraOn && isCommunicationPhase) startCamera();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, [isCameraOn, isCommunicationPhase]);

  /* ── Speech recognition ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSpeechSupported(false); return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    r.onstart  = () => setIsListening(true);
    r.onend    = () => {
      setIsListening(false);
      if (isMicOn) {
        setTimeout(() => {
          if (document.visibilityState === "visible") {
            try { r.start(); } catch { /* already started */ }
          }
        }, 300);
      } else {
        setIsMicOn(false);
      }
    };
    r.onerror  = () => { setIsListening(false); setIsMicOn(false); };
    r.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++)
        if (e.results[i].isFinal) t += e.results[i][0].transcript + " ";
      if (t) setInputValue(prev => prev + t);
    };
    recognitionRef.current = r;
    return () => r.stop();
  }, []);

  /* ── Global timer ── */
  useEffect(() => {
    if (!isInterviewStarted || isSessionEnded) return;
    const timer = setInterval(() => {
      setInterviewTime(prev => {
        const next = prev + 1;
        if (next >= warningAtSeconds) setShowWarning(true);
        if (next >= sessionLimitSeconds) {
          clearInterval(timer);
          if (sessionConfig.interview_type === "behavioral") {
            handleSessionEnd("timeout");
          } else if (
            (sessionConfig.interview_type === "technical" ||
              sessionConfig.interview_type === "full") &&
            currentPhase !== "coding"
          ) {
            startCodingPhase("same-tab");
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [
    isInterviewStarted,
    isSessionEnded,
    currentPhase,
    sessionConfig.interview_type,
    sessionLimitSeconds,
    warningAtSeconds,
  ]);

  /* ── Phase timer ── */
  useEffect(() => {
    if (!isInterviewStarted || isSessionEnded) return;
    const duration = phaseDuration(sessionConfig.interview_type, currentPhase, sessionLimitSeconds);
    if (duration == null) return;
    phaseTimerRef.current = setTimeout(() => { advancePhase(); }, duration * 1000);
    return () => { if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current); };
  }, [isInterviewStarted, phaseIndex, isSessionEnded, sessionConfig.interview_type, sessionLimitSeconds]);

  /* ── Phase countdown ── */
  useEffect(() => {
    if (!isInterviewStarted || isSessionEnded) return;
    const duration = phaseDuration(sessionConfig.interview_type, currentPhase, sessionLimitSeconds);
    if (duration == null) { setPhaseTimeLeft(null); return; }
    setPhaseTimeLeft(duration);
    const tick = setInterval(() => {
      setPhaseTimeLeft(prev => (prev != null ? Math.max(0, prev - 1) : null));
    }, 1000);
    return () => clearInterval(tick);
  }, [isInterviewStarted, phaseIndex, isSessionEnded, sessionConfig.interview_type, sessionLimitSeconds]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const timeRemaining = Math.max(0, sessionLimitSeconds - interviewTime);
  const isUrgent      = timeRemaining <= 120;
  const showSessionTimer = currentPhase !== "coding";
  const shouldEndButtonOpenCoding =
    (sessionConfig.interview_type === "technical" ||
      sessionConfig.interview_type === "full") &&
    currentPhase !== "coding";

  const saveCommunicationEngagement = async () => {
    const hasTrackedFrames = postureMetrics.totalFrames > 0;
    const { error } = await supabase
      .from("sessions")
      .update({
        duration_seconds: interviewTime,
        engagement_score: hasTrackedFrames
          ? computeEngagementScore(postureMetrics)
          : null,
        in_frame_pct: hasTrackedFrames
          ? Math.round((postureMetrics.inFrameFrames / postureMetrics.totalFrames) * 100)
          : null,
        upright_pct: hasTrackedFrames
          ? Math.round((postureMetrics.uprightFrames / postureMetrics.totalFrames) * 100)
          : null,
      })
      .eq("session_id", sessionConfig.sessionId);

    if (error) console.error("Error saving communication engagement:", error.message);
  };

  const stopCommunicationTracking = () => {
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  async function startCodingPhase(target: "new-tab" | "same-tab" = "same-tab") {
    if (phaseTransitioningRef.current) return;
    phaseTransitioningRef.current = true;

    try {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);

      const codingPhaseIndex = phasePlan.indexOf("coding");
      if (codingPhaseIndex === -1) {
        handleSessionEnd("manual");
        return;
      }

      setPhaseIndex(codingPhaseIndex);
      setPhaseTimeLeft(null);
      stopCommunicationTracking();
      await saveCommunicationEngagement();

      const { data, error } = await supabase
        .from("problems")
        .select("problem_id, title, description, difficulty, languages")
        .eq("difficulty", sessionConfig.level === "junior" ? "easy" : sessionConfig.level === "senior" ? "hard" : "medium");

      if (error) console.error("Error fetching coding problems:", error.message);

      const problems = pickRandomItems(
        (data ?? []) as CodingProblem[],
        codingProblemsToFetch,
      );
      codingProblemsRef.current = problems;
      setCodingProblems(problems);
      setCodingIndex(0);

      const transitionMsg: Message = {
        id:           createMessageId(),
        sender:       "ai",
        text:         problems.length > 0
          ? `Great work! We're now moving to the coding section. I'll open the code editor for you.`
          : `Moving to the coding section - couldn't find problems in the database. Let's continue with verbal discussion.`,
        timestamp:    new Date(),
        questionType: "coding",
      };
      setMessages(prev => [...prev, transitionMsg]);

      if (problems.length > 0) openCodeEditorForProblem(problems[0], target);
    } finally {
      phaseTransitioningRef.current = false;
    }
  }

  /* ── Advance phase ──
     Uses ref for codingProblems to avoid stale closure bug.
  ── */
  const advancePhase = useCallback(async () => {
    if (phaseTransitioningRef.current) return;
    phaseTransitioningRef.current = true;

    setPhaseIndex(prev => {
      const nextIndex = prev + 1;
      const nextPhase = phasePlan[nextIndex] as Phase;

      if (!nextPhase || nextPhase === "ended") {
        phaseTransitioningRef.current = false;
        handleSessionEnd("manual");
        return prev;
      }

      // Schedule side effects outside the state updater
      setTimeout(async () => {
        try {
          if (nextPhase === "coding") {
          stopCommunicationTracking();
          await saveCommunicationEngagement();
          const { data, error } = await supabase
            .from("problems")
            .select("problem_id, title, description, difficulty, languages")
            .eq("difficulty", sessionConfig.level === "junior" ? "easy" : sessionConfig.level === "senior" ? "hard" : "medium");

          if (error) console.error("Error fetching coding problems:", error.message);

          const problems = pickRandomItems(
            (data ?? []) as CodingProblem[],
            codingProblemsToFetch,
          );
          codingProblemsRef.current = problems;
          setCodingProblems(problems);
          setCodingIndex(0);

          const transitionMsg: Message = {
            id:           createMessageId(),
            sender:       "ai",
            text:         problems.length > 0
              ? `Great work! We're now moving to the coding section. I'll open the code editor for you.`
              : `Moving to the coding section — couldn't find problems in the database. Let's continue with verbal discussion.`,
            timestamp:    new Date(),
            questionType: "coding",
          };
          setMessages(prev => [...prev, transitionMsg]);

          if (problems.length > 0) openCodeEditorForProblem(problems[0], "same-tab");
          } else {
          const phaseLabel = nextPhase === "theoretical" ? "technical" : nextPhase;
          const transitionMsg: Message = {
            id:           createMessageId(),
            sender:       "ai",
            text:         `Great! We're moving into the ${phaseLabel} section now. Let's start with a new question.`,
            timestamp:    new Date(),
            questionType: phaseToQuestionType(nextPhase),
          };
            setMessages(prev => [...prev, transitionMsg]);
          }
        } finally {
          phaseTransitioningRef.current = false;
        }
      }, 0);

      return nextIndex;
    });
  }, [phasePlan, supabase]);

  /* ── Open code editor ── */
  const openCodeEditorForProblem = (
    problem: CodingProblem,
    target: "new-tab" | "same-tab" = "new-tab",
  ) => {
    const params = new URLSearchParams({
      session:    sessionConfig.sessionId,
      type:       sessionConfig.interview_type,
      level:      sessionConfig.level,
      role:       sessionConfig.role,
    });
    const availableProblems = codingProblemsRef.current.length
      ? codingProblemsRef.current
      : [problem];
    availableProblems.forEach(item => params.append("problem_id", item.problem_id));
    params.set("selected_problem_id", problem.problem_id);
    const url = `/interview/code-editor?${params}`;
    if (target === "same-tab") {
      router.push(url);
      return;
    }
    window.open(url, "_blank", "noopener");
  };

  const openCodeEditorCurrent = () => {
    const problem = codingProblemsRef.current[codingIndex] ?? codingProblems[codingIndex];
    if (problem) openCodeEditorForProblem(problem);
  };

  const handleEndInterviewClick = () => {
    if (
      (sessionConfig.interview_type === "technical" ||
        sessionConfig.interview_type === "full") &&
      currentPhase !== "coding"
    ) {
      startCodingPhase("same-tab");
      return;
    }

    handleSessionEnd("manual");
  };

  /* ── Save Q&A + analyse ── */
  const saveQAAndAnalyze = useCallback(async (
    question: string, answer: string,
    questionType: QuestionType,
  ) => {
    const { sessionId, role, level } = sessionConfig;

    const { data: responseData, error: responseError } = await supabase
      .from("responses")
      .insert({
        session_id: sessionId,
        question,
        answer,
        question_type: questionType === "coding" ? "theoretical" : questionType,
      })
      .select("response_id")
      .single<ResponseRow>();

    if (responseError || !responseData) {
      console.error("Response insert error:", responseError?.message);
      return;
    }

    const effectiveType = questionType === "coding" ? "theoretical" : questionType;
    const { prompt, evaluationType } = getAnalysisConfig(
      effectiveType,
      role,
      level,
      question,
      answer,
    );

    try {
      const res = await fetch("/api/interview/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("Analysis API failed");
      const raw    = await res.json();
      const scores = parseJsonObject(raw.result ?? raw);
      const rubric = evaluationType === "behavioral"
        ? {
            role_relevance: validatedRubricScore(scores.role_relevance, 30),
            logical_flow: validatedRubricScore(scores.logical_flow, 30),
            conciseness: validatedRubricScore(scores.conciseness, 30),
            communication_skill: validatedRubricScore(scores.communication_skill, 10),
          }
        : {
            technical_accuracy: validatedRubricScore(scores.technical_accuracy, 40),
            role_relevance: validatedRubricScore(scores.role_relevance, 20),
            logical_flow: validatedRubricScore(scores.logical_flow, 20),
            conciseness: validatedRubricScore(scores.conciseness, 10),
            communication_skill: validatedRubricScore(scores.communication_skill, 10),
          };
      const totalScore = calculateTotalScore(Object.values(rubric));

      await supabase.from("response_evaluations").insert({
        response_id: responseData.response_id,
        evaluation_type: evaluationType,
        feedback: typeof scores.feedback === "string" ? scores.feedback : null,
        total_score: totalScore,
        rubric,
      });

      setQuestionResults(prev => [...prev, {
        questionText: question,
        answerText:   answer,
        questionType,
        totalScore,
        feedback:     typeof scores.feedback === "string" ? scores.feedback : null,
      }]);
    } catch (e) {
      console.error("Analysis error:", e);
    }
  }, [sessionConfig, supabase]);

  /* ── End session ── */
  const handleSessionEnd = useCallback(async (reason: "timeout" | "manual") => {
    if (isSessionEnded) return;
    setIsSessionEnded(true);
    setIsSaving(true);
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    if (recognitionRef.current) recognitionRef.current.stop();

    const hasTrackedFrames = postureMetrics.totalFrames > 0;
    const engagement = hasTrackedFrames ? computeEngagementScore(postureMetrics) : null;
    await supabase
      .from("sessions")
      .update({
        ended_at:         new Date().toISOString(),
        duration_seconds: interviewTime,
        engagement_score: engagement,
        in_frame_pct:     hasTrackedFrames
          ? Math.round((postureMetrics.inFrameFrames / postureMetrics.totalFrames) * 100) : null,
        upright_pct:      hasTrackedFrames
          ? Math.round((postureMetrics.uprightFrames / postureMetrics.totalFrames) * 100) : null,
      })
      .eq("session_id", sessionConfig.sessionId);

    setIsSaving(false);
    router.push(`/dashboard/history?session=${sessionConfig.sessionId}&reason=${reason}`);
  }, [isSessionEnded, interviewTime, postureMetrics, sessionConfig.sessionId, supabase, router]);

  /* ── Toggles ── */
  const toggleCamera = () => {
    if (!isCommunicationPhase) return;
    setIsCameraOn(p => !p);
  };
  const toggleMic    = () => {
    if (!speechSupported)        { alert("Speech recognition not supported in this browser."); return; }
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); setIsMicOn(false); }
    else             { recognitionRef.current.start(); setIsMicOn(true); }
  };

  /* ── Start interview ── */
  const startInterview = async () => {
    if (!sessionConfig.sessionId) {
      alert("No session found. Please go back and configure again.");
      return;
    }
    setIsInterviewStarted(true);
    const firstPhase     = phasePlan[0] as Phase;
    const questionType   = phaseToQuestionType(firstPhase);
    const fallbackMessage = firstPhase === "behavioral"
      ? sessionConfig.level === "senior"
        ? `Tell me about a high-stakes, ambiguous ${sessionConfig.role} situation where stakeholders had conflicting priorities. How did you make the decision, align people, manage risk, and what was the measurable outcome?`
        : "Tell me about a specific workplace situation where your actions had a meaningful impact. What did you do, and what did you learn?"
      : sessionConfig.level === "senior"
        ? `You are responsible for a production-critical ${sessionConfig.role} system facing conflicting reliability, delivery, and cost constraints. How would you frame the architecture decision, evaluate trade-offs, and manage failure risk?`
        : `Explain a core ${sessionConfig.role} concept you use often, including how it works, when to use it, and one important limitation.`;

    setIsLoading(true);
    let firstMessage = fallbackMessage;
    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          context: { ...sessionConfig, currentPhase: firstPhase, questionType },
        }),
      });
      const data = await res.json();
      if (res.ok && typeof data.reply === "string" && data.reply.trim()) {
        firstMessage = data.reply.trim();
      } else if (data.upgradeRequired) {
        setUpgradeNotice(data.error ?? "You reached the normal account AI limit.");
      }
    } catch (error) {
      console.error("Initial question error:", error);
    } finally {
      setIsLoading(false);
    }

    setMessages([{ id: createMessageId(), sender: "ai", text: firstMessage, timestamp: new Date(), questionType }]);
  };

  /* ── Send message ── */
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !sessionConfig.sessionId) return;
    setUpgradeNotice(null);

    const userMsg: Message = {
      id: createMessageId(), sender: "user",
      text: inputValue.trim(), timestamp: new Date(),
    };
    const updated         = [...messages, userMsg];
    const questionTypeNow = phaseToQuestionType(currentPhase);
    setMessages(updated);
    setInputValue("");
    setIsLoading(true);

    const lastAiMsg      = [...messages].reverse().find(m => m.sender === "ai");
    const lastAiQuestion = lastAiMsg?.text ?? "";

    try {
      const res = await fetch("/api/interview/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          messages: updated,
          context:  { ...sessionConfig, currentPhase, questionType: questionTypeNow },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.upgradeRequired) {
          setUpgradeNotice(data.error ?? "You reached the normal account AI limit. Upgrade to Account Plus to continue.");
          return;
        }
        throw new Error(data.error ?? "Chat API failed");
      }
      const aiMsg: Message = {
        id: createMessageId(), sender: "ai",
        text: data.reply, timestamp: new Date(), questionType: questionTypeNow,
      };
      setMessages(prev => [...prev, aiMsg]);

      saveQAAndAnalyze(lastAiQuestion, userMsg.text, questionTypeNow);
    } catch (e) {
      console.error(e);
      alert("Failed to get AI response. Please try again.");
    } finally {
      setIsLoading(false);
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

  const engagement = computeEngagementScore(postureMetrics);

  /* ─── Render ──────────────────────────────────────────────── */
  return (
    <div className="flex h-full w-full bg-gray-50">

      {/* LEFT — Camera */}
      <section className="relative flex-1 p-4 lg:p-6 flex flex-col">
        <div className="relative flex-1 rounded-2xl overflow-hidden bg-white ring-1 ring-gray-200 shadow-xl flex items-center justify-center">

          {isCameraOn
            ? <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            : (
              <div className="flex flex-col items-center gap-4 text-gray-500">
                <VideoOff size={48} className="opacity-50" />
                <p className="text-sm">Camera is off</p>
              </div>
            )
          }

          {/* Global timer */}
          {isInterviewStarted && !isSessionEnded && showSessionTimer && (
            <div className={`absolute top-4 left-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md shadow-lg
              ${isUrgent ? "bg-red-500/90 text-white animate-pulse"
                : showWarning ? "bg-amber-500/90 text-white"
                : "bg-black/50 text-white"}`}>
              <Clock size={12} /> {formatTime(timeRemaining)} remaining
            </div>
          )}

          {/* Posture badge */}
          {isInterviewStarted && !isSessionEnded && isCameraOn && (
            <div className="absolute top-4 right-4">
              <PostureBadge status={postureStatus} />
            </div>
          )}

          {/* Warning */}
          {showWarning && !isSessionEnded && showSessionTimer && (
            <div className="absolute top-14 left-4 right-4 flex items-center gap-2 rounded-xl bg-amber-500/90 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md shadow-lg">
              <AlertTriangle size={16} />
              {isUrgent
                ? "Less than 2 minutes left! Wrap up your answer."
                : "2 minutes remaining — start wrapping up."}
            </div>
          )}

          {/* Phase countdown */}
          {isInterviewStarted && !isSessionEnded && phaseTimeLeft != null && (
            <div className="absolute bottom-28 right-4 flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md px-3 py-1.5 text-[10px] text-gray-300">
              <Activity size={10} />
              Phase: {formatTime(phaseTimeLeft)}
            </div>
          )}

          {/* Coding CTA */}
          {isInterviewStarted && !isSessionEnded && currentPhase === "coding" && codingProblems.length > 0 && (
            <div className="absolute bottom-24 left-4 right-4 flex items-center justify-between gap-3 rounded-xl bg-emerald-950/80 border border-emerald-500/30 px-4 py-3 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-2 min-w-0">
                <Code2 size={15} className="text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-300 leading-snug">
                  Problem {codingIndex + 1} of {codingProblems.length} — open the editor to code your solution.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {codingIndex + 1 < codingProblems.length && (
                  <button
                    onClick={() => {
                      const nextIdx = codingIndex + 1;
                      setCodingIndex(nextIdx);
                      openCodeEditorForProblem(codingProblemsRef.current[nextIdx] ?? codingProblems[nextIdx]);
                    }}
                    className="rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 transition"
                  >
                    Next
                  </button>
                )}
                <button
                  onClick={openCodeEditorCurrent}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 transition"
                >
                  Open Editor
                </button>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full bg-[#161b22]/80 backdrop-blur-md px-6 py-3 ring-1 ring-white/10 shadow-xl">
            <button onClick={toggleCamera}
              className={`p-3 rounded-full transition ${isCameraOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500/20 text-red-500 hover:bg-red-500/30"}`}>
              {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button onClick={toggleMic}
              className={`p-3 rounded-full transition ${isMicOn ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-white/10 hover:bg-white/20 text-white"}`}>
              {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            {isInterviewStarted && !isSessionEnded && (
              <button
                onClick={handleEndInterviewClick}
                disabled={isSaving}
                className="rounded-full bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2 transition disabled:opacity-50"
              >
                {isSaving
                  ? "Saving..."
                  : shouldEndButtonOpenCoding
                    ? "Start Coding"
                    : "End Interview"}
              </button>
            )}
          </div>

          {/* Begin */}
          {!isInterviewStarted && (
            <div className="absolute top-6 right-6">
              <button
                onClick={startInterview}
                className="animate-pulse rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 hover:animate-none"
              >
                Begin Interview
              </button>
            </div>
          )}

          {/* Ended overlay */}
          {isSessionEnded && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white">
              <p className="text-lg font-semibold">Session Ended</p>
              <p className="text-sm text-gray-300">Saving your results…</p>
            </div>
          )}
        </div>

        {/* Info bar */}
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 px-1 flex-wrap">
          <span className="rounded-full bg-white border border-gray-200 px-2.5 py-1 capitalize">{sessionConfig.interview_type}</span>
          <span className="rounded-full bg-white border border-gray-200 px-2.5 py-1 capitalize">{sessionConfig.level}</span>
          <span className="rounded-full bg-white border border-gray-200 px-2.5 py-1">{sessionConfig.role}</span>
          {isInterviewStarted && <PhaseBadge phase={currentPhase} />}
          {isInterviewStarted && postureMetrics.totalFrames > 0 && (
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              engagement >= 80 ? "bg-emerald-500/15 text-emerald-400" :
              engagement >= 60 ? "bg-amber-500/15 text-amber-400" :
                                 "bg-red-500/15 text-red-400"}`}>
              <Eye size={9} className="inline mr-1" />
              Engagement {engagement}%
            </span>
          )}
        </div>
      </section>

      {/* RIGHT — Chat */}
      <section className="w-full max-w-sm lg:max-w-md border-l border-gray-200 bg-white flex flex-col">

        <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-3 bg-gray-50">
          <Bot className="text-blue-400" size={20} />
          <h2 className="text-sm font-semibold tracking-wide text-gray-800">AI Interviewer</h2>
          {isInterviewStarted && (
            <span className="ml-auto text-xs text-gray-500 font-mono">{formatTime(interviewTime)}</span>
          )}
        </div>

        {isInterviewStarted && (
          <div className="border-b border-gray-200 bg-white px-5 py-2.5 flex items-center gap-2">
            <PhaseBadge phase={currentPhase} />
            {phaseTimeLeft != null && (
              <span className="text-[9px] text-gray-600 ml-1 font-mono">
                {formatTime(phaseTimeLeft)} left
              </span>
            )}
            {currentPhase === "coding" && codingProblems.length > 0 && (
              <button
                onClick={openCodeEditorCurrent}
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold px-2.5 py-1 transition"
              >
                <Code2 size={11} /> Open Editor
              </button>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isInterviewStarted ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Bot size={24} />
              </div>
              <p className="text-sm text-gray-500 max-w-[250px]">
                Click <strong className="text-gray-300">Begin Interview</strong> to start.<br />
                You have <strong className="text-gray-300">{formatTime(sessionLimitSeconds)}</strong>.
              </p>
              <div className="flex flex-col gap-1 text-[11px] text-gray-600">
                {getPhasePlan(sessionConfig.interview_type)
                  .filter(p => p !== "ended")
                  .map((p, i) => (
                    <span key={i} className="capitalize">
                      {i + 1}. {p} phase
                      {phaseDuration(sessionConfig.interview_type, p, sessionLimitSeconds) != null
                        ? ` (${formatTime(phaseDuration(sessionConfig.interview_type, p, sessionLimitSeconds)!)})`
                        : ""}
                    </span>
                  ))}
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex flex-col gap-1 max-w-[85%] ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 px-1 mb-0.5">
                    {msg.sender === "ai"   && <Bot  size={12} className="text-blue-400" />}
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                      {msg.sender === "user" ? "You" : "AI"}
                    </span>
                    {msg.sender === "user" && <User size={12} className="text-gray-500" />}
                  </div>
                  <div className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm
                    ${msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-gray-50 border border-gray-200 text-gray-800 rounded-tl-sm"}`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-gray-600 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-1.5 items-center rounded-2xl bg-[#1c2128] border border-white/[0.06] px-4 py-3">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                    style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {isInterviewStarted && !isSessionEnded && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 relative">
            {upgradeNotice && (
              <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-[11px] font-semibold text-blue-800">Account limit reached</p>
                <p className="mt-1 text-[11px] leading-relaxed text-blue-700">{upgradeNotice}</p>
                <button
                  onClick={requestPlus}
                  className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-500"
                >
                  Request Account Plus
                </button>
                {upgradeRequestStatus && <p className="mt-2 text-[11px] text-blue-700">{upgradeRequestStatus}</p>}
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={inputValue}
                placeholder={
                  isListening ? "Listening…"
                  : currentPhase === "coding" ? "Discuss your approach, then open the editor…"
                  : "Type your answer…"
                }
                disabled={isLoading}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                }}
                className="flex-1 min-h-[44px] max-h-[120px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-[13px] text-gray-800 outline-none focus:border-blue-500 resize-none disabled:opacity-50 placeholder:text-gray-400"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
            {isListening && (
              <p className="absolute -top-6 left-4 text-[10px] text-blue-400 animate-pulse flex items-center gap-1">
                <Mic size={10} /> Mic is listening
              </p>
            )}
          </div>
        )}

        {/* Performance Panel */}
        {isInterviewStarted && (
          <PerformancePanel
            results={questionResults}
            postureMetrics={postureMetrics}
            isVisible={showPerfPanel}
            onToggle={() => setShowPerfPanel(p => !p)}
          />
        )}
      </section>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-gray-50 text-sm text-gray-500">Loading interview...</div>}>
      <InterviewPageContent />
    </Suspense>
  );
}
