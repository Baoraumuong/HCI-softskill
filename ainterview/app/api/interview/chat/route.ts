import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Analysis mode
    if (body.prompt) {
      const result = await model.generateContent(body.prompt);
      const text = result.response.text();

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

    const conversation = messages
      .map((msg: any) => {
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