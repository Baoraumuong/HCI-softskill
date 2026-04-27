// app/configure/page.tsx
"use client";

import { useState } from "react";
import { Code, Users, Shuffle, ChevronRight } from "lucide-react";

export default function ConfigurePage() {
  const [config, setConfig] = useState({
    type: "mixed",
    role: "Junior Full Stack Developer",
    level: "intermediate",
  });

  const interviewTypes = [
    { id: "technical", label: "Technical (Code)", icon: <Code size={20} /> },
    { id: "behavioural", label: "Behavioural", icon: <Users size={20} /> },
    { id: "mixed", label: "Mixed", icon: <Shuffle size={20} /> },
  ];

  const levels = ["Easy", "Intermediate", "Difficult"];

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      {/* Part 1: Interview Type */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-slate-800">
          1. Select Interview Type
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {interviewTypes.map((item) => (
            <button
              key={item.id}
              onClick={() => setConfig({ ...config, type: item.id })}
              className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                config.type === item.id
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-100 hover:border-slate-200 text-slate-600"
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Part 2: Role */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-slate-800">
          2. Target Role
        </h2>
        <input
          type="text"
          placeholder="e.g. Junior Full Stack Developer"
          value={config.role}
          onChange={(e) => setConfig({ ...config, role: e.target.value })}
          className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </section>

      {/* Part 3: Difficulty Level */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-slate-800">
          3. Difficulty Level
        </h2>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {levels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setConfig({ ...config, level: lvl.toLowerCase() })}
              className={`flex-1 py-2 px-4 rounded-lg capitalize transition-all border-2 ${
                config.level === lvl.toLowerCase()
                  ? "bg-white shadow-sm text-blue-600 font-semibold"
                  : "text-slate-500 hover:text-slate-700 border-slate-100" 
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </section>

      {/* Submit Button */}
      <button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
        onClick={() => console.log("Starting interview with:", config)}
      >
        Start Interview
        <ChevronRight size={20} />
      </button>
    </div>
  );
}