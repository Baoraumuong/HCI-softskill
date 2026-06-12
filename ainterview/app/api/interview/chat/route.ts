import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { ensureMonthlyUsageAllowed, recordApiUsage } from "@/app/lib/usage";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

interface ChatMessage {
  sender: "ai" | "user";
  text: string;
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
        promptTokens: usage?.promptTokenCount ?? 0,
        completionTokens: usage?.candidatesTokenCount ?? 0,
        totalTokens: usage?.totalTokenCount ?? Math.ceil(String(body.prompt).length / 4) + Math.ceil(text.length / 4),
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

Your responsibilities:
- Ask one interview question at a time
- Analyze candidate responses
- Keep interview natural and professional
- Adapt question difficulty dynamically

Rules:
- Keep responses under 120 words
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
      promptTokens: usage?.promptTokenCount ?? 0,
      completionTokens: usage?.candidatesTokenCount ?? 0,
      totalTokens: usage?.totalTokenCount ?? Math.ceil(prompt.length / 4) + Math.ceil(reply.length / 4),
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
