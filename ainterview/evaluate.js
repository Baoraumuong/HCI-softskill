const modelsToTest = ["llama3.2:1B", "Gemma2:2B"];

const prompt = `
You are a technical interviewer. Evaluate this answer.
Question: What is the difference between RAM and ROM?
Answer: RAM is like your desk — you keep the things you're currently working on there. When you shut down the computer, everything on the desk is cleared.
ROM is like a printed manual inside the computer — it contains important instructions that never change and are needed to start the computer.

Respond STRICTLY with JSON:
{
  "score": number (0-10),
  "is_correct": boolean,
  "feedback": "string",
  "next_difficulty": "Easy" | "Intermediate" | "Hard"
}
`;

async function testModel(modelName) {
    console.log(`\n🚀 Testing Model: ${modelName}...`);
    const startTime = performance.now();

    try {
        const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: modelName,
                prompt: prompt,
                format: "json", // Ép Ollama trả về JSON
                stream: false
            })
        });

        const data = await response.json();
        const endTime = performance.now();
        const latency = ((endTime - startTime) / 1000).toFixed(2);

        console.log(`⏱ Latency: ${latency} seconds`);
        
        // Kiểm tra xem có parse được JSON không
        const parsedJson = JSON.parse(data.response);
        console.log(`✅ JSON Parsing: SUCCESS`);
        console.log(`🧠 AI Output:`, parsedJson);

    } catch (error) {
        console.error(`❌ Lỗi (Latency hoặc JSON sai Format):`, error.message);
    }
}

async function runBenchmark() {
    for (const model of modelsToTest) {
        await testModel(model);
    }
}

runBenchmark();