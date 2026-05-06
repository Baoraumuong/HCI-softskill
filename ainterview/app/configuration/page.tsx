"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  MessageSquare, 
  Code, 
  Layers, 
  Video, 
  Mic, 
  CircleDot, 
  ChevronRight, 
  Check 
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
type InterviewType = "behavioral" | "technical" | "mixed" | "";
type Difficulty = "easy" | "intermediate" | "hard" | "";

interface InterviewConfig {
  interviewType: InterviewType;
  difficulty: Difficulty;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  recordingEnabled: boolean;
}

/* ─── Static Data ────────────────────────────────────────── */
const INTERVIEW_TYPES = [
  {
    id: "behavioral",
    name: "Behavioral",
    description: "Experiences, soft skills & situational questions",
    icon: MessageSquare,
  },
  {
    id: "technical",
    name: "Technical",
    description: "Coding & algorithms problems",
    icon: Code,
  },
  {
    id: "mixed",
    name: "Mixed",
    description: "Behavioral + Technical",
    icon: Layers,
  },
] as const;

const DIFFICULTY_LEVELS = [
  {
    id: "easy",
    name: "Easy",
    description: "Foundational concepts & common scenarios",
    colorClass: "bg-green-500",
    dots: 1,
  },
  {
    id: "intermediate",
    name: "Intermediate",
    description: "Nuanced questions with layered answers",
    colorClass: "bg-amber-500",
    dots: 2,
  },
  {
    id: "hard",
    name: "Hard",
    description: "Senior-level & advanced challenge questions",
    colorClass: "bg-red-500",
    dots: 3,
  },
] as const;

const DEVICE_SETTINGS = [
  {
    key: "cameraEnabled" as const,
    label: "Camera",
    description: "Enable webcam during the interview",
    icon: Video,
  },
  {
    key: "microphoneEnabled" as const,
    label: "Microphone",
    description: "Enable voice input for your answers",
    icon: Mic,
  },
  {
    key: "recordingEnabled" as const,
    label: "Recording",
    description: "Save this session to review later",
    icon: CircleDot,
  },
] as const;

/* ─── UI Components ──────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-gray-400 mb-3">
      {children}
    </p>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[13px] font-semibold text-gray-900 mb-0.5">{title}</h2>
      <p className="text-[11.5px] text-gray-500">{subtitle}</p>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`Toggle ${label}`}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
        checked ? "bg-gray-900" : "bg-gray-200"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function DifficultyDots({ count, colorClass }: { count: number; colorClass: string }) {
  return (
    <div className="flex gap-1 shrink-0">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i <= count ? colorClass : "bg-gray-200"}`}
        />
      ))}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function ConfigurationPage() {
  const router = useRouter();

  const [config, setConfig] = useState<InterviewConfig>({
    interviewType: "",
    difficulty: "",
    cameraEnabled: true,
    microphoneEnabled: true,
    recordingEnabled: false,
  });

  const [validationError, setValidationError] = useState("");

  const handleStartInterview = () => {
    if (!config.interviewType || !config.difficulty) {
      setValidationError(
        !config.interviewType
          ? "Please select an interview type."
          : "Please select a difficulty level."
      );
      return;
    }
    sessionStorage.setItem("interviewConfig", JSON.stringify(config));
    router.push("/interview");
  };

  const selectType = (id: string) => {
    setValidationError("");
    setConfig((prev) => ({ ...prev, interviewType: id as InterviewType }));
  };

  const selectDifficulty = (id: string) => {
    setValidationError("");
    setConfig((prev) => ({ ...prev, difficulty: id as Difficulty }));
  };

  const toggleSetting = (key: keyof InterviewConfig) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedType = INTERVIEW_TYPES.find((t) => t.id === config.interviewType);
  const selectedDiff = DIFFICULTY_LEVELS.find((d) => d.id === config.difficulty);
  const isReady = !!config.interviewType && !!config.difficulty;

  return (
    <div className="animate-in fade-in duration-500">
      {/* Page Header */}
      <header className="mb-8">
        <p className="text-[10.5px] font-bold tracking-[0.09em] uppercase text-red-800 mb-1.5">
          Interview Setup
        </p>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">
          Configure your session
        </h1>
        <p className="text-[13px] text-gray-500">
          Choose a type, difficulty and devices, then start.
        </p>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        
        {/* ── Left Column: Controls ── */}
        <div className="flex flex-col gap-5">
          
          {/* Interview Type */}
          <Card>
            <CardHeader title="Interview Type" subtitle="What kind of questions do you want?" />
            <div className="flex flex-col gap-2">
              {INTERVIEW_TYPES.map((type) => {
                const active = config.interviewType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => selectType(type.id)}
                    aria-pressed={active}
                    className={`flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all duration-200 ${
                      active
                        ? "border-gray-900 bg-white shadow-sm ring-1 ring-gray-900"
                        : "border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors ${
                      active ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"
                    }`}>
                      <type.icon size={18} strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-gray-900 mb-0.5">{type.name}</p>
                      <p className="text-[11.5px] text-gray-500">{type.description}</p>
                    </div>
                    {active && (
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-900 text-white shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Difficulty */}
          <Card>
            <CardHeader title="Difficulty Level" subtitle="Pick the challenge that suits your goals" />
            <div className="flex flex-col gap-2">
              {DIFFICULTY_LEVELS.map((level) => {
                const active = config.difficulty === level.id;
                return (
                  <button
                    key={level.id}
                    onClick={() => selectDifficulty(level.id)}
                    aria-pressed={active}
                    className={`flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all duration-200 ${
                      active
                        ? "border-gray-900 bg-white shadow-sm ring-1 ring-gray-900"
                        : "border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="w-8 flex justify-center">
                      <DifficultyDots count={level.dots} colorClass={level.colorClass} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-gray-900 mb-0.5">{level.name}</p>
                      <p className="text-[11.5px] text-gray-500">{level.description}</p>
                    </div>
                    {active && (
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-900 text-white shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Device Settings */}
          <Card>
            <CardHeader title="Device Settings" subtitle="Control camera, mic and recording" />
            <div className="flex flex-col divide-y divide-gray-100">
              {DEVICE_SETTINGS.map(({ key, label, description, icon: Icon }) => (
                <div key={key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 text-gray-500 shrink-0">
                    <Icon size={16} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[12.5px] font-semibold text-gray-900 mb-0.5">{label}</p>
                    <p className="text-[11px] text-gray-500">{description}</p>
                  </div>
                  <Toggle
                    label={label}
                    checked={config[key] as boolean}
                    onChange={() => toggleSetting(key)}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Action Area */}
          <div className="mt-2">
            {validationError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg py-2.5 px-3 mb-3" role="alert">
                {validationError}
              </p>
            )}
            <button
              onClick={handleStartInterview}
              className="flex items-center justify-center gap-2 w-full py-3.5 px-5 bg-gray-900 text-white rounded-xl text-[13.5px] font-semibold tracking-tight hover:bg-gray-800 active:bg-black transition-all"
            >
              Start Interview
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── Right Column: Summary & Info ── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          
          {/* Stats */}
          <Card>
            <SectionLabel>Your stats</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "5", label: "Sessions" },
                { value: "7.4", label: "Avg score" },
                { value: "2", label: "Streak" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
                  <div className="text-lg font-semibold text-gray-900 font-mono tracking-tight">{s.value}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Configuration Summary */}
          <Card>
            <div className="flex items-center justify-between mb-3.5">
              <SectionLabel>Summary</SectionLabel>
              {isReady && (
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Ready
                </span>
              )}
            </div>
            <div className="flex flex-col divide-y divide-gray-100">
              {[
                { label: "Type", value: selectedType?.name },
                { label: "Difficulty", value: selectedDiff?.name },
                { label: "Camera", value: config.cameraEnabled ? "On" : "Off", active: config.cameraEnabled },
                { label: "Microphone", value: config.microphoneEnabled ? "On" : "Off", active: config.microphoneEnabled },
                { label: "Recording", value: config.recordingEnabled ? "On" : "Off", active: config.recordingEnabled },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2 first:pt-0 last:pb-0">
                  <span className="text-xs text-gray-500">{row.label}</span>
                  <span className={`text-xs font-medium ${
                    row.active === true ? "text-green-600" : 
                    row.active === false ? "text-gray-400" : 
                    row.value ? "text-gray-900" : "text-gray-300"
                  }`}>
                    {row.value ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Tips */}
          <Card>
            <SectionLabel>Before you start</SectionLabel>
            <ul className="flex flex-col gap-2 m-0 p-0 list-none">
              {[
                "Good lighting makes a big difference on video",
                "Test your microphone in a quiet environment",
                "Keep a notepad nearby for jotting ideas",
                "Take a few deep breaths before starting",
              ].map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-gray-500 leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0 mt-1.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>

        </div>
      </div>
    </div>
  );
}