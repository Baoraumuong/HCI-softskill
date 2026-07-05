import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { ensureMonthlyUsageAllowed, recordApiUsage } from "@/app/lib/usage";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: "gemini-3.1-flash-lite",
});

interface ChatMessage {
  sender: "ai" | "user";
  text: string;
}

interface InterviewContext {
  role?: unknown;
  level?: unknown;
  interview_type?: unknown;
  currentPhase?: unknown;
}

function normalizeContextValue(value: unknown, fallback: string, maxLength = 100) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, maxLength);
  return normalized || fallback;
}

export async function POST(req: NextRequest) {
  try {
    const usageCheck = await ensureMonthlyUsageAllowed("gemini");
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.message,
          upgradeRequired: true,
          used: usageCheck.used,
          limit: usageCheck.limit,
        },
        { status: usageCheck.userId ? 402 : 401 },
      );
    }

    const body = await req.json();
    // Analysis mode
    if (body.prompt) {
      const result = await model.generateContent(body.prompt);
      const text = result.response.text();
      const usage = result.response.usageMetadata;

      await recordApiUsage({
        provider: "gemini",
        endpoint: "/api/interview/chat",
        userId: usageCheck.userId,
        promptTokens: usage?.promptTokenCount ?? Math.ceil(String(body.prompt).length / 4),
        completionTokens: usage?.candidatesTokenCount ?? Math.ceil(text.length / 4),
      });

      return NextResponse.json({
        result: text,
      });
    }

    // Conversation mode
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    const context = (body.context ?? {}) as InterviewContext;
    const role = normalizeContextValue(context.role, "Software Engineer");
    const level = normalizeContextValue(context.level, "mid", 20);
    const interviewType = normalizeContextValue(
      context.interview_type,
      "technical",
      20,
    );
    const currentPhase = normalizeContextValue(
      context.currentPhase,
      interviewType === "behavioral" ? "behavioral" : "theoretical",
      20,
    );

    const conversation = (messages as ChatMessage[])
      .map((msg) => {
        const role =
          msg.sender === "ai"
            ? "Interviewer"
            : "Candidate";

        return `${role}: ${msg.text}`;
      })
      .join("\n");

    const prompt = `
You are a professional AI technical interviewer.

Interview context:
- Target role: ${role}
- Candidate level: ${level}
- Interview type: ${interviewType}
- Current interview phase: ${currentPhase}

Your responsibilities:
- Ask one interview question at a time
- Analyze candidate responses
- Keep interview natural and professional
- Tailor every question to the target role
- Match the expected depth, ambiguity, and difficulty to the candidate level
- Keep the question appropriate for the current interview phase
- Adapt question difficulty dynamically based on the candidate's previous answers

Question-type contract:
- Behavioral phase: focus only on observable past behavior or a realistic workplace situation. Probe the candidate's own decisions, actions, collaboration, conflict handling, impact, and learning. Encourage STAR-style evidence. Do not ask technical trivia or a coding problem.
- Theoretical phase: focus only on role-relevant knowledge, principles, mechanisms, architecture, diagnosis, and trade-offs. Ask why/how and test conceptual understanding. Do not turn it into a behavioral storytelling question or request a full coding solution.

Level contract:
- Junior: test one foundational concept or a common, clearly scoped situation. Keep assumptions explicit and expect basic reasoning.
- Mid: combine multiple concerns and require trade-offs, diagnosis, or practical application with moderate ambiguity.
- Senior: use a genuinely complex, ambiguous, production-scale scenario with competing constraints. Require system-wide trade-offs, risk management, failure modes, stakeholder or operational impact, and a defensible decision. Senior questions must be materially deeper than Junior questions, not merely worded more formally.

Rules:
- Keep responses under 120 words
- Ask exactly one primary question in each response; a short follow-up probe may be attached to that same question
- Never provide the final evaluation during the interview

Interview Conversation:
${conversation}

Generate the next interviewer response only.
`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();
    const usage = result.response.usageMetadata;

    await recordApiUsage({
      provider: "gemini",
      endpoint: "/api/interview/chat",
      userId: usageCheck.userId,
      promptTokens: usage?.promptTokenCount ?? Math.ceil(prompt.length / 4),
      completionTokens: usage?.candidatesTokenCount ?? Math.ceil(reply.length / 4),
    });

    return NextResponse.json({
      reply,
    });
  } catch (error) {
    console.error("Interview API Error:", error);

    return NextResponse.json(
      { error: "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
