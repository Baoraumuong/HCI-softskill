"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare, Code, Layers, Video, Mic, Clock, Hash,
  ChevronRight, Check, Loader2,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser-client";
import { Card, CardHeader, PageHeader, SectionLabel } from "@/app/dashboard/components/DashboardUI";

/* ─── Types ──────────────────────────────────────────────── */
type InterviewType = "behavioral" | "technical" | "full" | "";
type Difficulty    = "junior" | "mid" | "senior" | "";

interface InterviewConfig {
  interviewType:     InterviewType;
  difficulty:        Difficulty;
  role:              string;
  cameraEnabled:     boolean;
  microphoneEnabled: boolean;
  timeLimitMinutes:  number;
  codingQuestionCount: number;
}

/*Static Data*/
const INTERVIEW_TYPES = [
  { id: "behavioral", name: "Behavioral", description: "Experiences, soft skills & situational questions", icon: MessageSquare },
  { id: "technical",  name: "Technical",  description: "Theoretical & coding problems",                   icon: Code         },
  { id: "full",       name: "Full",       description: "Behavioral + Technical combined",                 icon: Layers       },
] as const;

const DIFFICULTY_LEVELS = [
  { id: "junior", name: "Junior", description: "Foundational concepts & common scenarios",    colorClass: "bg-emerald-500", dots: 1 },
  { id: "mid",    name: "Mid",    description: "Nuanced questions with layered answers",       colorClass: "bg-amber-500",  dots: 2 },
  { id: "senior", name: "Senior", description: "Senior-level & advanced challenge questions", colorClass: "bg-red-500",    dots: 3 },
] as const;

const DEVICE_SETTINGS = [
  { key: "cameraEnabled"     as const, label: "Camera",     description: "Enable webcam during the interview",  icon: Video     },
  { key: "microphoneEnabled" as const, label: "Microphone", description: "Enable voice input for your answers", icon: Mic       },
] as const;

const TIME_LIMIT_OPTIONS = [2, 10, 15, 20, 30] as const;
const CODING_COUNT_OPTIONS = [1, 2, 3, 4] as const;

const ROLE_SUGGESTIONS = [
  "Software Engineer", "Frontend Developer", "Backend Developer",
  "Full Stack Developer", "Data Engineer", "DevOps Engineer",
  "Product Manager", "Data Scientist",
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={`Toggle ${label}`} onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${checked ? "bg-gray-900" : "bg-gray-200"}`}>
      <span aria-hidden="true" className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition duration-200 ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

function DifficultyDots({ count, colorClass }: { count: number; colorClass: string }) {
  return (
    <div className="flex gap-1 shrink-0">
      {[1, 2, 3].map(i => <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= count ? colorClass : "bg-gray-200"}`} />)}
    </div>
  );
}

export default function ConfigurationPage() {
  const router   = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [config, setConfig]           = useState<InterviewConfig>({
    interviewType: "",
    difficulty: "",
    role: "",
    cameraEnabled: true,
    microphoneEnabled: true,
    timeLimitMinutes: 15,
    codingQuestionCount: 2,
  });
  const [validationError, setValErr]  = useState("");
  const [isStarting, setIsStarting]   = useState(false);
  const hasCoding = config.interviewType === "technical" || config.interviewType === "full";

  /*Validate*/
  const validate = (): string => {
    if (!config.interviewType) return "Please select an interview type.";
    if (!config.difficulty)    return "Please select a difficulty level.";
    if (!config.role.trim())   return "Please enter your target role.";
    if (config.timeLimitMinutes < 2) return "Please choose a valid session time limit.";
    if (hasCoding && config.codingQuestionCount < 1) return "Please choose at least one coding question.";
    return "";
  };

  /*Start Interview */
  const handleStartInterview = async () => {
    const err = validate();
    if (err) { setValErr(err); return; }

    const interviewType = config.interviewType;
    const level = config.difficulty;
    const role = config.role.trim();

    if (!interviewType || !level || !role) {
      setValErr("Please complete all required fields.");
      return;
    }

    setIsStarting(true);
    setValErr("");

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { setValErr("You must be logged in."); return; }
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          user_id:        user.id,
          interview_type: interviewType,
          level,
          role,
        })
        .select("session_id").single();

      if (sessionError || !session) {
        console.error("Session error:", sessionError?.message);
        setValErr("Failed to create session. Please try again.");
        return;
      }

      const params = new URLSearchParams({
        session: session.session_id,
        type:    interviewType,
        level,
        role,
        camera:  String(config.cameraEnabled),
        mic:     String(config.microphoneEnabled),
        time_limit: String(config.timeLimitMinutes),
        coding_count: String(hasCoding ? config.codingQuestionCount : 0),
      });

      router.push(`/interview/behavioral?${params}`);
    } catch (e) {
      console.error(e);
      setValErr("Unexpected error. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const selectType       = (id: string) => { setValErr(""); setConfig(p => ({ ...p, interviewType: id as InterviewType })); };
  const selectDifficulty = (id: string) => { setValErr(""); setConfig(p => ({ ...p, difficulty: id as Difficulty })); };
  const toggleSetting    = (key: "cameraEnabled" | "microphoneEnabled") => setConfig(p => ({ ...p, [key]: !p[key] }));

  const selectedType = INTERVIEW_TYPES.find(t => t.id === config.interviewType);
  const selectedDiff = DIFFICULTY_LEVELS.find(d => d.id === config.difficulty);
  const isReady      = !!config.interviewType && !!config.difficulty && !!config.role.trim();

  return (
    <div className="animate-in fade-in duration-500">
      <PageHeader
        eyebrow="Interview Setup"
        title="Configure your session"
        subtitle="Choose a type, difficulty and devices, then start."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

        {/* Left column */}
        <div className="flex flex-col gap-5">

          {/* Interview Type */}
          <Card>
            <CardHeader title="Interview Type" subtitle="What kind of questions do you want?" />
            <div className="flex flex-col gap-2">
              {INTERVIEW_TYPES.map(type => {
                const active = config.interviewType === type.id;
                return (
                  <button key={type.id} onClick={() => selectType(type.id)} aria-pressed={active}
                    className={`flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all duration-200 ${active ? "border-gray-900 bg-white shadow-sm ring-1 ring-gray-900" : "border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300"}`}>
                    <div className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors ${active ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"}`}>
                      <type.icon size={18} strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-gray-900 mb-0.5">{type.name}</p>
                      <p className="text-[11.5px] text-gray-500">{type.description}</p>
                    </div>
                    {active && <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-900 text-white shrink-0"><Check size={12} strokeWidth={3} /></div>}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Role */}
          <Card>
            <CardHeader title="Target Role" subtitle="What position are you interviewing for?" />
            <input type="text" value={config.role} placeholder="e.g. Software Engineer"
              onChange={e => { setValErr(""); setConfig(p => ({ ...p, role: e.target.value })); }}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition" />
            <div className="flex flex-wrap gap-1.5 mt-3">
              {ROLE_SUGGESTIONS.map(s => (
                <button key={s} type="button" onClick={() => { setValErr(""); setConfig(p => ({ ...p, role: s })); }}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${config.role === s ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-400 hover:text-gray-700"}`}>
                  {s}
                </button>
              ))}
            </div>
          </Card>

          {/* Difficulty */}
          <Card>
            <CardHeader title="Difficulty Level" subtitle="Pick the challenge that suits your goals" />
            <div className="flex flex-col gap-2">
              {DIFFICULTY_LEVELS.map(level => {
                const active = config.difficulty === level.id;
                return (
                  <button key={level.id} onClick={() => selectDifficulty(level.id)} aria-pressed={active}
                    className={`flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all duration-200 ${active ? "border-gray-900 bg-white shadow-sm ring-1 ring-gray-900" : "border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300"}`}>
                    <div className="w-8 flex justify-center"><DifficultyDots count={level.dots} colorClass={level.colorClass} /></div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-gray-900 mb-0.5">{level.name}</p>
                      <p className="text-[11.5px] text-gray-500">{level.description}</p>
                    </div>
                    {active && <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-900 text-white shrink-0"><Check size={12} strokeWidth={3} /></div>}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Device Settings */}
          <Card>
            <CardHeader title="Device Settings" subtitle="Control camera and microphone access" />
            <div className="flex flex-col divide-y divide-gray-100">
              {DEVICE_SETTINGS.map(({ key, label, description, icon: Icon }) => (
                <div key={key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 text-gray-500 shrink-0"><Icon size={16} strokeWidth={2} /></div>
                  <div className="flex-1">
                    <p className="text-[12.5px] font-semibold text-gray-900 mb-0.5">{label}</p>
                    <p className="text-[11px] text-gray-500">{description}</p>
                  </div>
                  <Toggle label={label} checked={config[key] as boolean} onChange={() => toggleSetting(key)} />
                </div>
              ))}
            </div>
          </Card>

          {/* Session Settings */}
          <Card>
            <CardHeader title="Session Settings" subtitle="Choose the session length and coding workload" />
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={14} className="text-gray-500" />
                  <p className="text-[12.5px] font-semibold text-gray-900">Time Limit</p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {TIME_LIMIT_OPTIONS.map(minutes => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => { setValErr(""); setConfig(p => ({ ...p, timeLimitMinutes: minutes })); }}
                      className={`rounded-lg border px-3 py-2 text-[12px] font-medium transition ${
                        config.timeLimitMinutes === minutes
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
              </div>

              {hasCoding && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash size={14} className="text-gray-500" />
                    <p className="text-[12.5px] font-semibold text-gray-900">Coding Questions</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {CODING_COUNT_OPTIONS.map(count => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => { setValErr(""); setConfig(p => ({ ...p, codingQuestionCount: count })); }}
                        className={`rounded-lg border px-3 py-2 text-[12px] font-medium transition ${
                          config.codingQuestionCount === count
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* */}
          <div className="mt-2">
            {validationError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg py-2.5 px-3 mb-3" role="alert">{validationError}</p>}
            <button onClick={handleStartInterview} disabled={isStarting}
              className="flex items-center justify-center gap-2 w-full py-3.5 px-5 bg-gray-900 text-white rounded-xl text-[13.5px] font-semibold tracking-tight hover:bg-gray-800 active:bg-black transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {isStarting
                ? <><Loader2 size={16} className="animate-spin" /> Setting up session…</>
                : <>Start Interview <ChevronRight size={16} strokeWidth={2.5} /></>}
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <Card>
            <div className="flex items-center justify-between mb-3.5">
              <SectionLabel>Summary</SectionLabel>
              {isReady && (
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Ready
                </span>
              )}
            </div>
            <div className="flex flex-col divide-y divide-gray-100">
              {[
                { label: "Type",       value: selectedType?.name },
                { label: "Role",       value: config.role.trim() || undefined },
                { label: "Difficulty", value: selectedDiff?.name },
                { label: "Time Limit",  value: `${config.timeLimitMinutes} min` },
                ...(hasCoding ? [{ label: "Coding", value: `${config.codingQuestionCount} question${config.codingQuestionCount === 1 ? "" : "s"}` }] : []),
                { label: "Camera",     value: config.cameraEnabled     ? "On" : "Off", active: config.cameraEnabled     },
                { label: "Mic",        value: config.microphoneEnabled  ? "On" : "Off", active: config.microphoneEnabled },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2 first:pt-0 last:pb-0">
                  <span className="text-xs text-gray-500">{row.label}</span>
                  <span className={`text-xs font-medium ${row.active === true ? "text-green-600" : row.active === false ? "text-gray-400" : row.value ? "text-gray-900" : "text-gray-300"}`}>
                    {row.value ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionLabel>Before you start</SectionLabel>
            <ul className="flex flex-col gap-2 list-none p-0 m-0">
              {["Good lighting makes a big difference on video", "Test your microphone in a quiet environment", "Keep a notepad nearby for jotting ideas", "Take a few deep breaths before starting"].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-500 leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0 mt-1.5" />{tip}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
