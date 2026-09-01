import { NextResponse } from "next/server";
import OpenAI from "openai";

// Point the OpenAI SDK to your local Ollama server
const localOllama = new OpenAI({
  baseURL: "http://127.0.0.1:11434/v1",
  apiKey: "ollama", 
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const response = await localOllama.chat.completions.create({
      model: "hf.co/oyekartikrukja/apex-router-llama3", 
      messages: [
        {
          role: "system",
          content: "Classify the user's trading intent. Output ONLY raw JSON with 'intent' (TRADE, ANALYZE, PORTFOLIO) and 'assets' (array of tickers)."
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const rawContent = response.choices[0].message.content || "{}";
    const classification = JSON.parse(rawContent);

    return NextResponse.json(classification);
  } catch (error) {
    console.error("Router classification error:", error);
    return NextResponse.json({ error: "Routing failed" }, { status: 500 });
  }
}