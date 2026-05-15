"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, Bot, Clock, AlertTriangle, Play, RotateCcw, ChevronDown } from "lucide-react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser-client";

type InterviewType = "technical" | "full";
type Level         = "junior" | "mid" | "senior";
type Language      = "javascript" | "python" | "java" | "typescript" | "go" | "cpp";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

interface SessionConfig {
  sessionId:      string;
  interview_type: InterviewType;
  level:          Level;
  role:           string;
}

/* Typed return shapes — fix 'never' TS errors */
interface HistoryRow     { history_id: string; }
interface SubmissionRow  { submission_id: string; }

const SESSION_LIMIT_SECONDS = 15 * 60;
const WARNING_AT_SECONDS    = 13 * 60;

const LANGUAGES: { id: Language; label: string }[] = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python",     label: "Python"     },
  { id: "java",       label: "Java"       },
  { id: "go",         label: "Go"         },
  { id: "cpp",        label: "C++"        },
];

const STARTER_CODE: Record<Language, string> = {
  javascript: `// Write your solution here\nfunction solution() {\n  \n}\n`,
  typescript: `// Write your solution here\nfunction solution(): void {\n  \n}\n`,
  python:     `# Write your solution here\ndef solution():\n    pass\n`,
  java:       `// Write your solution here\nclass Solution {\n    public void solution() {\n        \n    }\n}\n`,
  go:         `// Write your solution here\npackage main\n\nfunc solution() {\n\t\n}\n`,
  cpp:        `// Write your solution here\n#include <iostream>\nusing namespace std;\n\nvoid solution() {\n    \n}\n`,
};

/* ─── Analysis Prompts ───────────────────────────────────── */
function buildTheoreticalPrompt(role: string, level: string, question: string, answer: string) {
  return `You are a senior ${role} evaluating a ${level}-level candidate on a technical theoretical question.

Score:
- technical_accuracy (0–40): Correct and complete for ${level} level?
- role_relevance (0–20): Relevant to a ${role} role?
- logical_flow (0–20): Well-structured explanation?
- conciseness (0–10): Focused, no padding?
- communication_skill (0–10): Clear and professional?

Question: "${question}"
Answer: "${answer}"

Respond ONLY with valid JSON, no markdown:
{"technical_accuracy":<0-40>,"role_relevance":<0-20>,"logical_flow":<0-20>,"conciseness":<0-10>,"communication_skill":<0-10>,"feedback":"<2-3 sentences>"}`;
}

function buildCodingPrompt(role: string, level: string, question: string, code: string, language: string) {
  return `You are a senior engineer evaluating a ${level}-level ${role} candidate's ${language} code submission.

Score:
- correctness (0–80): Solves the problem correctly, handles edge cases?
- time_complexity (0–10): Optimal time/space complexity?
- code_quality (0–10): Readability, naming, structure, comments, modularity?

Question: "${question}"
Code (${language}): "${code}"

Respond ONLY with valid JSON, no markdown:
{"correctness":<0-80>,"time_complexity":<0-10>,"code_quality":<0-10>,"feedback":"<2-3 sentences>"}`;
}

const isTheoreticalQuestion = (question: string) =>
  /explain|what is|how does|describe|difference between|why|when would you/i.test(question);

/* ─── Component ──────────────────────────────────────────── */
export default function CodeEditorPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = getSupabaseBrowserClient();

  const sessionConfig: SessionConfig = {
    sessionId:      searchParams.get("session") ?? "",
    interview_type: (searchParams.get("type")  as InterviewType) ?? "technical",
    level:          (searchParams.get("level") as Level)          ?? "mid",
    role:            searchParams.get("role")                      ?? "Software Engineer",
  };

  /* ─── State ─────────────────────────────────────────────── */
  const [language,     setLanguage]     = useState<Language>("javascript");
  const [code,         setCode]         = useState(STARTER_CODE.javascript);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput,    setChatInput]    = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isLoading,    setIsLoading]    = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interviewTime, setInterviewTime] = useState(0);
  const [isStarted,    setIsStarted]    = useState(false);
  const [isEnded,      setIsEnded]      = useState(false);
  const [showWarning,  setShowWarning]  = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, isLoading]);

  /* ─── Timer ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!isStarted || isEnded) return;
    const t = setInterval(() => {
      setInterviewTime(prev => {
        const next = prev + 1;
        if (next >= WARNING_AT_SECONDS) setShowWarning(true);
        if (next >= SESSION_LIMIT_SECONDS) { clearInterval(t); handleSessionEnd("timeout"); }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isStarted, isEnded]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const timeRemaining = SESSION_LIMIT_SECONDS - interviewTime;
  const isUrgent      = timeRemaining <= 120;

  /* ─── Change language ────────────────────────────────────── */
  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    setCode(STARTER_CODE[lang]);
    setLangMenuOpen(false);
  };

  /* ─── Start ──────────────────────────────────────────────── */
  const startInterview = async () => {
    if (!sessionConfig.sessionId) { alert("No session found. Please go back and configure again."); return; }
    setIsStarted(true);
    setIsLoading(true);
    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          context:  { ...sessionConfig, mode: "code-editor" },
        }),
      });
      const data = await res.json();
      const firstQ = data.reply ?? "Let's start. Here's your first question.";
      setCurrentQuestion(firstQ);
      setChatMessages([{ id: Date.now().toString(), sender: "ai", text: firstQ, timestamp: new Date() }]);
    } catch { alert("Failed to load first question."); }
    finally { setIsLoading(false); }
  };

  /* ─── Save theoretical Q&A ───────────────────────────────── */
  const saveTheoreticalQA = useCallback(async (question: string, answer: string) => {
    const { sessionId, role, level } = sessionConfig;

    /* history row — typed */
    const { data: hist, error: hErr } = await supabase
      .from("history")
      .insert({ session_id: sessionId, question, answer, video_record: null })
      .select("history_id")
      .single<HistoryRow>();

    if (hErr || !hist) { console.error("History error:", hErr?.message); return; }

    const prompt = buildTheoreticalPrompt(role, level, question, answer);
    try {
      const res = await fetch("/api/interview/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const raw    = await res.json();
      const scores = typeof raw.result === "string" ? JSON.parse(raw.result) : raw.result;

      await supabase.from("result_theoretical").insert({
        history_id: hist.history_id, session_id: sessionId, ...scores,
      });
    } catch (e) { console.error("Theoretical analysis error:", e); }
  }, [sessionConfig, supabase]);

  /* ─── Submit code ────────────────────────────────────────── */
  const handleSubmitCode = async () => {
    if (!code.trim() || !currentQuestion) return;
    setIsSubmitting(true);
    const { sessionId, role, level } = sessionConfig;

    try {
      /* 1. Save to code_submission table — typed */
      const { data: sub, error: subErr } = await supabase
        .from("code_submission")
        .insert({ session_id: sessionId, question: currentQuestion, code, language })
        .select("submission_id")
        .single<SubmissionRow>();

      if (subErr) console.error("Submission error:", subErr.message);

      /* 2. Save to history too (for unified view) — typed */
      const { data: hist, error: hErr } = await supabase
        .from("history")
        .insert({ session_id: sessionId, question: currentQuestion, answer: code, video_record: null })
        .select("history_id")
        .single<HistoryRow>();

      if (hErr || !hist) { console.error("History error:", hErr?.message); }

      /* 3. Run coding analysis */
      if (hist) {
        const prompt  = buildCodingPrompt(role, level, currentQuestion, code, language);
        const res     = await fetch("/api/interview/analyze", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const raw     = await res.json();
        const scores  = typeof raw.result === "string" ? JSON.parse(raw.result) : raw.result;

        await supabase.from("result_coding").insert({
          history_id: hist.history_id, session_id: sessionId, ...scores,
        });
      }

      /* 4. Get next question from AI */
      const nextRes = await fetch("/api/interview/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, { role: "user", content: `[Code submitted in ${language}]: ${code}` }],
          context:  { ...sessionConfig, mode: "code-editor" },
        }),
      });
      const nextData = await nextRes.json();
      const nextQ    = nextData.reply ?? "Good work. Here's your next question.";

      setCurrentQuestion(nextQ);
      setChatMessages(prev => [
        ...prev,
        { id: Date.now().toString(), sender: "user", text: `[Code submitted in ${language}]`, timestamp: new Date() },
        { id: (Date.now() + 1).toString(), sender: "ai", text: nextQ, timestamp: new Date() },
      ]);
      setCode(STARTER_CODE[language]);
    } catch (e) { console.error("Submit error:", e); alert("Failed to submit code."); }
    finally { setIsSubmitting(false); }
  };

  /* ─── Chat send (for theoretical questions typed in chat) ── */
  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), sender: "user", text: chatInput.trim(), timestamp: new Date() };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput("");
    setIsLoading(true);

    /* If current question looks theoretical, save as theoretical Q&A */
    if (isTheoreticalQuestion(currentQuestion)) {
      saveTheoreticalQA(currentQuestion, userMsg.text);
    }

    try {
      const res  = await fetch("/api/interview/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, context: { ...sessionConfig, mode: "code-editor" } }),
      });
      const data = await res.json();
      const next = data.reply ?? "";
      setCurrentQuestion(next);
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: "ai", text: next, timestamp: new Date() }]);
    } catch { alert("Failed to get AI response."); }
    finally { setIsLoading(false); }
  };

  /* ─── End session ────────────────────────────────────────── */
  const handleSessionEnd = useCallback(async (reason: "timeout" | "manual") => {
    if (isEnded) return;
    setIsEnded(true);
    setIsSaving(true);
    await supabase
      .from("session")
      .update({ ended_at: new Date().toISOString(), duration_seconds: interviewTime })
      .eq("session_id", sessionConfig.sessionId);
    setIsSaving(false);
    router.push(`/dashboard/history?session=${sessionConfig.sessionId}&reason=${reason}`);
  }, [isEnded, interviewTime, sessionConfig.sessionId, supabase, router]);

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="flex h-full w-full bg-[#0d1117]">

      {/* LEFT — Code Editor */}
      <section className="flex-1 flex flex-col border-r border-white/[0.06]">

        {/* Editor toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#161b22]">
          <div className="flex items-center gap-3">
            {/* Language selector */}
            <div className="relative">
              <button onClick={() => setLangMenuOpen(p => !p)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 transition">
                {LANGUAGES.find(l => l.id === language)?.label}
                <ChevronDown size={12} />
              </button>
              {langMenuOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] rounded-lg border border-white/10 bg-[#1c2128] shadow-xl overflow-hidden">
                  {LANGUAGES.map(l => (
                    <button key={l.id} onClick={() => changeLanguage(l.id)}
                      className={`w-full text-left px-3 py-2 text-xs transition ${language === l.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-white/5"}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setCode(STARTER_CODE[language])} title="Reset code"
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-400 hover:bg-white/10 hover:text-gray-200 transition">
              <RotateCcw size={11} /> Reset
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer */}
            {isStarted && !isEnded && (
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isUrgent ? "bg-red-500/20 text-red-400 animate-pulse" : showWarning ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-gray-400"}`}>
                <Clock size={11} /> {formatTime(timeRemaining)}
              </div>
            )}
            {isStarted && !isEnded && (
              <button onClick={() => handleSessionEnd("manual")} disabled={isSaving}
                className="rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-50">
                {isSaving ? "Saving…" : "End Interview"}
              </button>
            )}
          </div>
        </div>

        {/* Warning */}
        {showWarning && !isEnded && (
          <div className="flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs font-medium text-amber-400">
            <AlertTriangle size={13} />
            {isUrgent ? "Less than 2 minutes left — wrap up!" : "2 minutes remaining."}
          </div>
        )}

        {/* Code area */}
        <div className="flex-1 relative">
          {!isStarted ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-500">
              <p className="text-sm">Click "Start Interview" to receive your first question</p>
              <button onClick={startInterview}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition animate-pulse hover:animate-none">
                Start Interview
              </button>
            </div>
          ) : (
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              disabled={isEnded}
              spellCheck={false}
              className="w-full h-full bg-transparent px-5 py-4 text-[13px] text-gray-200 font-mono leading-relaxed resize-none outline-none disabled:opacity-50"
              style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" }}
            />
          )}
        </div>

        {/* Submit */}
        {isStarted && !isEnded && (
          <div className="border-t border-white/[0.06] px-4 py-3 bg-[#161b22] flex items-center justify-between gap-4">
            <p className="text-[11px] text-gray-500">Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-gray-400">Submit</kbd> when your solution is ready</p>
            <button onClick={handleSubmitCode} disabled={isSubmitting || !code.trim()}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 transition disabled:opacity-50">
              <Play size={13} /> {isSubmitting ? "Evaluating…" : "Submit Solution"}
            </button>
          </div>
        )}
      </section>

      {/* RIGHT — Question + Chat */}
      <section className="w-full max-w-sm lg:max-w-md flex flex-col bg-[#0d1117]">

        {/* Question panel */}
        {currentQuestion && (
          <div className="border-b border-white/[0.06] bg-[#161b22] px-5 py-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-blue-400 mb-2">Current Question</p>
            <p className="text-[13px] text-gray-200 leading-relaxed">{currentQuestion}</p>
          </div>
        )}

        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] bg-[#161b22]">
          <Bot size={16} className="text-blue-400" />
          <span className="text-xs font-semibold text-gray-300">AI Interviewer</span>
          {isStarted && <span className="ml-auto text-[10px] font-mono text-gray-500">{formatTime(interviewTime)}</span>}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!isStarted ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400"><Bot size={20} /></div>
              <p className="text-xs text-gray-500 max-w-[220px]">Start the interview to receive questions. Use the code editor on the left for coding problems.</p>
            </div>
          ) : chatMessages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${msg.sender === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-[#1c2128] border border-white/[0.06] text-gray-200 rounded-tl-sm"}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-1.5 items-center rounded-2xl bg-[#1c2128] border border-white/[0.06] px-4 py-3">
                {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input — for theoretical questions */}
        {isStarted && !isEnded && (
          <div className="p-4 border-t border-white/[0.06]">
            <div className="flex items-end gap-2">
              <textarea rows={1} value={chatInput} placeholder="Answer theoretical questions here…" disabled={isLoading}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                className="flex-1 min-h-[40px] max-h-[100px] rounded-xl border border-white/10 bg-[#1c2128] px-3.5 py-2.5 text-[12.5px] text-gray-200 outline-none focus:border-blue-500 resize-none disabled:opacity-50 placeholder:text-gray-600" />
              <button onClick={handleChatSend} disabled={isLoading || !chatInput.trim()}
                className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-50">
                <Send size={15} />
              </button>
            </div>
            <p className="mt-2 text-[10px] text-gray-600">Use the code editor above for coding problems • Chat for theory questions</p>
          </div>
        )}
      </section>
    </div>
  );
}