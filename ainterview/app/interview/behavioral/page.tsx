"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, Send, Bot, User, Clock, AlertTriangle } from "lucide-react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser-client";

/*Types*/
interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

type InterviewType = "behavioral" | "technical" | "full";
type Level         = "junior" | "mid" | "senior";

interface SessionConfig {
  sessionId:      string;
  interview_type: InterviewType;
  level:          Level;
  role:           string;
}

interface HistoryRow     { history_id: string; }

declare global {
  interface Window { webkitSpeechRecognition: any; SpeechRecognition: any; }
}

/* Constants*/
const SESSION_LIMIT_SECONDS = 15 * 60;
const WARNING_AT_SECONDS    = 13 * 60;

/* Analysis Prompts*/
function buildCommunicationPrompt(role: string, level: string, question: string, answer: string) {
  return `You are an expert interviewer evaluating a ${level}-level ${role} candidate on a behavioral question.

Score using these criteria:
- role_relevance (0–30): Is the answer tailored to a ${role} role with relevant impact?
- logical_flow (0–30): Does it follow STAR (Situation, Task, Action, Result)?
- conciseness (0–30): Clear and focused without filler?
- communication_skill (0–10): Professional and articulate?

Question: "${question}"
Answer: "${answer}"

Respond ONLY with valid JSON, no markdown, no preamble:
{"role_relevance":<0-30>,"logical_flow":<0-30>,"conciseness":<0-30>,"communication_skill":<0-10>,"feedback":"<2-3 sentences>"}`;
}

function buildTheoreticalPrompt(role: string, level: string, question: string, answer: string) {
  return `You are a senior ${role} evaluating a ${level}-level candidate on a technical theoretical question.

Score using these criteria:
- technical_accuracy (0–40): Is the answer technically correct and complete for a ${level} level?
- role_relevance (0–20): Does it reflect knowledge relevant to a ${role} role?
- logical_flow (0–20): Is the explanation well-structured and easy to follow?
- conciseness (0–10): Focused without unnecessary padding?
- communication_skill (0–10): Clear, confident, and professional?

Question: "${question}"
Answer: "${answer}"

Respond ONLY with valid JSON, no markdown, no preamble:
{"technical_accuracy":<0-40>,"role_relevance":<0-20>,"logical_flow":<0-20>,"conciseness":<0-10>,"communication_skill":<0-10>,"feedback":"<2-3 sentences>"}`;
}

function buildCodingPrompt(role: string, level: string, question: string, answer: string) {
  return `You are a senior engineer evaluating a ${level}-level ${role} candidate's code submission.

Score using these criteria:
- correctness (0–80): Does the code solve the problem correctly including edge cases?
- time_complexity (0–10): Is the time/space complexity optimal?
- code_quality (0–10): Readability, naming, structure, comments, modularity?

Question: "${question}"
Code: "${answer}"

Respond ONLY with valid JSON, no markdown, no preamble:
{"correctness":<0-80>,"time_complexity":<0-10>,"code_quality":<0-10>,"feedback":"<2-3 sentences>"}`;
}

/* Detect if a free-text answer looks like code */
const isCodeAnswer = (text: string) =>
  /function |const |class |def |return |=>|\{[\s\S]{10,}\}|for\s*\(|while\s*\(/.test(text);

/* Pick prompt + result table based on interview type and answer shape */
function getAnalysisStrategy(
  interviewType: InterviewType,
  role: string,
  level: string,
  question: string,
  answer: string
): { prompt: string; table: "result_communication" | "result_theoretical" | "result_coding" } {
  if (interviewType === "behavioral") {
    return { prompt: buildCommunicationPrompt(role, level, question, answer), table: "result_communication" };
  }
  // technical or full — check if the answer is code
  if (isCodeAnswer(answer)) {
    return { prompt: buildCodingPrompt(role, level, question, answer), table: "result_coding" };
  }
  return { prompt: buildTheoreticalPrompt(role, level, question, answer), table: "result_theoretical" };
}

/*Component*/
export default function InterviewPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = getSupabaseBrowserClient();

  const videoRef        = useRef<HTMLVideoElement>(null);
  const recognitionRef  = useRef<any>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef  = useRef<Blob[]>([]);

  /* Read config from URL params — session was already created in ConfigurationPage */
  const sessionConfig: SessionConfig = {
    sessionId:      searchParams.get("session") ?? "",
    interview_type: (searchParams.get("type")  as InterviewType) ?? "behavioral",
    level:          (searchParams.get("level") as Level)          ?? "mid",
    role:            searchParams.get("role")                      ?? "Software Engineer",
  };
  const cameraEnabled = searchParams.get("camera") !== "false";
  const recordEnabled = searchParams.get("record") === "true";

  /*State*/
  const [isCameraOn,       setIsCameraOn]       = useState(cameraEnabled);
  const [isMicOn,          setIsMicOn]          = useState(false);
  const [isListening,      setIsListening]      = useState(false);
  const [speechSupported,  setSpeechSupported]  = useState(true);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [isSessionEnded,   setIsSessionEnded]   = useState(false);
  const [messages,         setMessages]         = useState<Message[]>([]);
  const [inputValue,       setInputValue]       = useState("");
  const [interviewTime,    setInterviewTime]    = useState(0);
  const [isLoading,        setIsLoading]        = useState(false);
  const [showWarning,      setShowWarning]      = useState(false);
  const [isSaving,         setIsSaving]         = useState(false);

  /*Scroll to bottom*/
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /*Camera + MediaRecorder*/
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        if (recordEnabled) {
          const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
          recorder.ondataavailable = e => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
          mediaRecorderRef.current = recorder;
        }
      } catch { alert("Unable to access camera/microphone."); }
    };
    if (isCameraOn) startCamera();
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [isCameraOn]);

  /*Speech recognition*/
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSpeechSupported(false); return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    r.onstart  = () => setIsListening(true);
    r.onend    = () => { setIsListening(false); setIsMicOn(false); };
    r.onerror  = () => { setIsListening(false); setIsMicOn(false); };
    r.onresult = (e: any) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++)
        if (e.results[i].isFinal) t += e.results[i][0].transcript + " ";
      if (t) setInputValue(prev => prev + t);
    };
    recognitionRef.current = r;
    return () => r.stop();
  }, []);

  /*Timer + session limit*/
  useEffect(() => {
    if (!isInterviewStarted || isSessionEnded) return;
    const timer = setInterval(() => {
      setInterviewTime(prev => {
        const next = prev + 1;
        if (next >= WARNING_AT_SECONDS) setShowWarning(true);
        if (next >= SESSION_LIMIT_SECONDS) { clearInterval(timer); handleSessionEnd("timeout"); }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isInterviewStarted, isSessionEnded]);

  /*Helpers*/
  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const timeRemaining = SESSION_LIMIT_SECONDS - interviewTime;
  const isUrgent      = timeRemaining <= 120;

  /*Save Q&A + analyse*/
  const saveQAPairAndAnalyze = useCallback(async (
    question: string,
    answer: string,
    videoBlob?: Blob
  ) => {
    const { sessionId, interview_type, level, role } = sessionConfig;

    /* 1. Upload video */
    let videoPath: string | null = null;
    if (videoBlob && videoBlob.size > 0) {
      const { data: up, error: upErr } = await supabase.storage
        .from("interview-recordings")
        .upload(`${sessionId}/${Date.now()}.webm`, videoBlob, { contentType: "video/webm" });
      if (!upErr && up) videoPath = up.path;
    }

    /* 2. Insert history row — typed to avoid 'never' error */
    const { data: histData, error: histErr } = await supabase
      .from("history")
      .insert({ session_id: sessionId, question, answer, video_record: videoPath })
      .select("history_id")
      .single<HistoryRow>();

    if (histErr || !histData) { console.error("History error:", histErr?.message); return; }

    /* 3. Call analysis API */
    const { prompt, table } = getAnalysisStrategy(interview_type, role, level, question, answer);
    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("Analysis API failed");
      const raw   = await res.json();
      const scores = typeof raw.result === "string" ? JSON.parse(raw.result) : raw.result;

      /* 4. Insert result — typed insert */
      const { error: resErr } = await supabase
        .from(table)
        .insert({ history_id: histData.history_id, session_id: sessionId, ...scores });
      if (resErr) console.error("Result insert error:", resErr.message);
    } catch (e) { console.error("Analysis error:", e); }
  }, [sessionConfig, supabase]);

  /*End session*/
  const handleSessionEnd = useCallback(async (reason: "timeout" | "manual") => {
    if (isSessionEnded) return;
    setIsSessionEnded(true);
    setIsSaving(true);

    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (recognitionRef.current) recognitionRef.current.stop();

    await supabase
      .from("session")
      .update({ ended_at: new Date().toISOString(), duration_seconds: interviewTime })
      .eq("session_id", sessionConfig.sessionId);

    setIsSaving(false);
    router.push(`/dashboard/history?session=${sessionConfig.sessionId}&reason=${reason}`);
  }, [isSessionEnded, interviewTime, sessionConfig.sessionId, supabase, router]);

  /*Toggles*/
  const toggleCamera = () => setIsCameraOn(p => !p);
  const toggleMic    = () => {
    if (!speechSupported) { alert("Speech recognition not supported."); return; }
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); setIsMicOn(false); }
    else             { recognitionRef.current.start(); setIsMicOn(true); }
  };

  /*Start interview*/
  const startInterview = () => {
    if (!sessionConfig.sessionId) { alert("No session found. Please go back and configure again."); return; }
    setIsInterviewStarted(true);
    if (mediaRecorderRef.current) { videoChunksRef.current = []; mediaRecorderRef.current.start(1000); }
    setMessages([{ id: Date.now().toString(), sender: "ai", text: "Hello! Please introduce yourself and walk me through your background relevant to this role.", timestamp: new Date() }]);
  };

  /*Send message*/
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !sessionConfig.sessionId) return;
    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: inputValue.trim(), timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputValue("");
    setIsLoading(true);

    const lastAiQ = [...messages].reverse().find(m => m.sender === "ai")?.text ?? "";

    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, context: sessionConfig }),
      });
      if (!res.ok) throw new Error("Chat API failed");
      const data   = await res.json();
      const aiMsg: Message = { id: (Date.now() + 1).toString(), sender: "ai", text: data.reply, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);

      /* Grab video chunk accumulated since last answer */
      const blob = videoChunksRef.current.length > 0
        ? new Blob(videoChunksRef.current, { type: "video/webm" }) : undefined;
      videoChunksRef.current = [];

      /* Fire-and-forget: save Q&A + analyse */
      saveQAPairAndAnalyze(lastAiQ, userMsg.text, blob);
    } catch (e) {
      console.error(e);
      alert("Failed to get AI response.");
    } finally {
      setIsLoading(false);
    }
  };

  /*Render*/
  return (
    <div className="flex h-full w-full">

      {/* LEFT — Camera */}
      <section className="relative flex-1 p-4 lg:p-6 flex flex-col">
        <div className="relative flex-1 rounded-2xl overflow-hidden bg-white ring-1 ring-white/10 shadow-2xl flex items-center justify-center">

          {isCameraOn
            ? <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            : <div className="flex flex-col items-center gap-4 text-gray-500"><VideoOff size={48} className="opacity-50" /><p className="text-sm">Camera is off</p></div>}

          {/* Timer */}
          {isInterviewStarted && !isSessionEnded && (
            <div className={`absolute top-4 left-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md shadow-lg ${isUrgent ? "bg-red-500/90 text-white animate-pulse" : showWarning ? "bg-amber-500/90 text-white" : "bg-black/50 text-white"}`}>
              <Clock size={12} /> {formatTime(timeRemaining)} remaining
            </div>
          )}

          {/* Warning banner */}
          {showWarning && !isSessionEnded && (
            <div className="absolute top-14 left-4 right-4 flex items-center gap-2 rounded-xl bg-amber-500/90 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md shadow-lg">
              <AlertTriangle size={16} />
              {isUrgent ? "Less than 2 minutes left! Wrap up your answer." : "2 minutes remaining — start wrapping up."}
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full bg-[#161b22]/80 backdrop-blur-md px-6 py-3 ring-1 ring-white/10 shadow-xl">
            <button onClick={toggleCamera} className={`p-3 rounded-full transition ${isCameraOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500/20 text-red-500 hover:bg-red-500/30"}`}>
              {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button onClick={toggleMic} className={`p-3 rounded-full transition ${isMicOn ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-white/10 hover:bg-white/20 text-white"}`}>
              {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            {isInterviewStarted && !isSessionEnded && (
              <button onClick={() => handleSessionEnd("manual")} disabled={isSaving}
                className="rounded-full bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2 transition disabled:opacity-50">
                {isSaving ? "Saving…" : "End Interview"}
              </button>
            )}
          </div>

          {/* Begin button */}
          {!isInterviewStarted && (
            <div className="absolute top-6 right-6">
              <button onClick={startInterview}
                className="animate-pulse rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 hover:animate-none">
                Begin Interview
              </button>
            </div>
          )}

          {isSessionEnded && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white">
              <p className="text-lg font-semibold">Session Ended</p>
              <p className="text-sm text-gray-300">Saving your results…</p>
            </div>
          )}
        </div>

        {/* Info bar */}
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400 px-1">
          <span className="rounded-full bg-gray-800 px-2.5 py-1 capitalize">{sessionConfig.interview_type}</span>
          <span className="rounded-full bg-gray-800 px-2.5 py-1 capitalize">{sessionConfig.level}</span>
          <span className="rounded-full bg-gray-800 px-2.5 py-1">{sessionConfig.role}</span>
        </div>
      </section>

      {/* RIGHT — Chat */}
      <section className="w-full max-w-sm lg:max-w-md border-l border-white/[0.06] bg-[#0d1117]/50 flex flex-col">
        <div className="border-b border-white/[0.06] px-6 py-4 flex items-center gap-3 bg-white">
          <Bot className="text-blue-500" size={20} />
          <h2 className="text-sm font-semibold tracking-wide text-black">AI Interviewer</h2>
          {isInterviewStarted && <span className="ml-auto text-xs text-gray-400 font-mono">{formatTime(interviewTime)}</span>}
        </div>

        <div className="flex-1 bg-amber-100 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {!isInterviewStarted ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><Bot size={24} /></div>
              <p className="text-sm text-gray-500 max-w-[250px]">Click <strong>Begin Interview</strong> to start. You have <strong>15 minutes</strong>.</p>
            </div>
          ) : messages.map(msg => (
            <div key={msg.id} className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex flex-col gap-1 max-w-[85%] ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-2 px-1 mb-0.5">
                  {msg.sender === "ai" && <Bot size={12} className="text-blue-400" />}
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{msg.sender === "user" ? "You" : "AI"}</span>
                  {msg.sender === "user" && <User size={12} className="text-gray-500" />}
                </div>
                <div className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${msg.sender === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-blue-300 text-black rounded-tl-sm"}`}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-gray-600 px-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-1.5 items-center rounded-2xl bg-amber-100 px-4 py-3">
                {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-blue-200 border-t border-white/[0.06] relative">
          <div className="flex items-end gap-2">
            <textarea rows={1} value={inputValue} placeholder={isListening ? "Listening carefully…" : "Type your answer…"}
              disabled={isLoading || !isInterviewStarted || isSessionEnded}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              className="flex-1 min-h-[44px] max-h-[120px] rounded-xl border border-white/10 bg-white px-4 py-3 text-[13px] text-black outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 resize-none disabled:opacity-50 placeholder:text-gray-600" />
            <button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim() || !isInterviewStarted || isSessionEnded}
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-50">
              <Send size={18} />
            </button>
          </div>
          {isListening && (
            <p className="absolute -top-6 left-4 text-[10px] text-blue-400 animate-pulse flex items-center gap-1">
              <Mic size={10} /> Mic is recording
            </p>
          )}
        </div>
      </section>
    </div>
  );
}