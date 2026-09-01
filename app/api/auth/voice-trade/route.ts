import { NextResponse } from "next/server";
import * as jose from "jose";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const token = cookies().get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "apex_trader_super_secret_key_2026");
    await jose.jwtVerify(token, secret);
    
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;
    
    if (!audioFile) {
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Deepgram Transcription
    const dgResponse = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.DEEPGRAM_API_KEY?.trim()}`,
        "Content-Type": audioFile.type || "audio/webm",
      },
      body: buffer,
    });

    const dgData = await dgResponse.json();
    if (!dgResponse.ok) {
      console.error("Deepgram Error:", dgData);
      return NextResponse.json({ error: "Deepgram transcription failed." }, { status: 500 });
    }

    const transcript = dgData.results?.channels[0]?.alternatives[0]?.transcript || "";
    if (!transcript.trim()) {
      return NextResponse.json({ error: "No speech detected. Please speak clearly into the microphone." }, { status: 400 });
    }

    // 2. Groq Intent Extraction (Free Alternative to OpenAI)
    const llmPrompt = `
      You are an automated stock trading assistant. Extract the trade intent from this transcript:
      Transcript: "${transcript}"

      Return ONLY a JSON object (no markdown, no backticks):
      {
        "action": "BUY" or "SELL",
        "symbol": "TICKER_SYMBOL",
        "amount": number
      }
    `;

    const llmResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY?.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b", 
        messages: [{ role: "user", content: llmPrompt }],
        temperature: 0,
      }),
    });

    const llmData = await llmResponse.json();
    if (!llmResponse.ok) {
      console.error("Groq Error:", llmData);
      return NextResponse.json({ error: "AI Parsing failed." }, { status: 500 });
    }

    const rawContent = llmData.choices[0].message.content.trim().replace(/```json|```/g, "");
    const parsedIntent = JSON.parse(rawContent);

    return NextResponse.json({ 
      success: true, 
      transcript, 
      intent: parsedIntent 
    });

  } catch (error: any) {
    console.error("Voice Trade Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}