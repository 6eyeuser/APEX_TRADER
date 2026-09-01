
"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Mic, Sparkles, Loader2, TrendingUp, Landmark, ShieldAlert, Cpu } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "tech" | "fund" | "risk" | "system";
  agentName?: string;
  content: string;
}

export interface CopilotCardProps {
  fullScreen?: boolean;
}

export default function CopilotCard({ fullScreen = false }: CopilotCardProps) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Welcome to the War Room. Ask me to analyze any asset (e.g., 'Should I buy TSLA?') to trigger a multi-agent debate, or command me to execute complex trades directly.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsTyping(true);

    try {
      
      let intent = "TRADE";
      let detectedAssets: string[] = [];

      try {
        const routerRes = await fetch("/api/router", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (routerRes.ok) {
          const routerData = await routerRes.json();
          intent = routerData.intent || "TRADE";
          detectedAssets = Array.isArray(routerData.assets) ? routerData.assets : [];
        }
      } catch (routerErr) {
        console.warn("Neural router fallback triggered:", routerErr);
      }

      
      if (intent === "ANALYZE") {
        let potentialTicker = detectedAssets.length > 0 ? detectedAssets[0] : "ASSET";

        if (potentialTicker === "ASSET") {
          const uppercaseMatches = text.match(/\b[A-Z]{2,5}\b/g);
          if (uppercaseMatches && uppercaseMatches.length > 0) {
            potentialTicker = uppercaseMatches[0];
          }
        }

        const res = await fetch("/api/debate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: potentialTicker, query: text }),
        });

        const data = await res.json();
        setIsTyping(false);

        if (data.success && data.debate) {
          for (let i = 0; i < data.debate.length; i++) {
            const phase = data.debate[i];
            const delay = i === 0 ? 500 : 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            setMessages((prev) => [
              ...prev,
              { role: phase.role as any, agentName: phase.agent, content: phase.content },
            ]);
          }
          return;
        }
      }

      
      const res = await fetch("/api/auth/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: text }].map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        let finalReply = data.content;
        if (finalReply && finalReply.includes("❌ **Execution Failed:**")) {
          setMessages((prev) => [...prev, { role: "assistant", content: finalReply }]);
          return;
        }

        if (!finalReply && data.executedTrade) {
          finalReply = `✅ **Trade Executed**\nAction: ${data.executedTrade.action}\nAsset: ${data.executedTrade.symbol}\nShares: ${data.executedTrade.shares}\nFill Price: $${data.executedTrade.executionPrice}\n\nRemaining Cash: $${data.executedTrade.newBalance}`;
        }

        
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: finalReply || "⚠️ **Agent Alert:** I understood the intent, but my execution engine failed to map this to a valid trade sequence. Could you specify the tickers and amounts?" },
        ]);

        if (data.executedTrade?.success) {
          const bc = new BroadcastChannel("apex_trader_sync");
          bc.postMessage("SYNC_DATA");
          bc.close();
        }
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: `❌ Error: ${data.error}` }]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Network error connecting to Copilot API." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await processVoiceToText(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTyping(true);
    }
  };

  const processVoiceToText = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "voice.webm");

    try {
      const res = await fetch("/api/auth/voice-trade", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      if (data.success && data.transcript) {
        await handleSendMessage(data.transcript);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Could not transcribe audio. Please try again." },
        ]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Voice transcription error." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const getAgentConfig = (role: string) => {
    switch (role) {
      case "tech":
        return {
          icon: <TrendingUp size={16} />,
          color: "text-[#00E5FF]",
          bg: "bg-[#00E5FF]/[0.03]",
          border: "border-l-[#00E5FF]",
          glow: "shadow-[0_0_20px_rgba(0,229,255,0.15)]",
        };
      case "fund":
        return {
          icon: <Landmark size={16} />,
          color: "text-[#B388FF]",
          bg: "bg-[#B388FF]/[0.03]",
          border: "border-l-[#B388FF]",
          glow: "shadow-[0_0_20px_rgba(179,136,255,0.15)]",
        };
      case "risk":
        return {
          icon: <ShieldAlert size={16} />,
          color: "text-[#FF3D00]",
          bg: "bg-[#FF3D00]/[0.03]",
          border: "border-l-[#FF3D00]",
          glow: "shadow-[0_0_20px_rgba(255,61,0,0.15)]",
        };
      case "system":
        return {
          icon: <Sparkles size={16} />,
          color: "text-[#00E676]",
          bg: "bg-[#00E676]/[0.03]",
          border: "border-l-[#00E676]",
          glow: "shadow-[0_0_20px_rgba(0,230,118,0.15)]",
        };
      default:
        return null;
    }
  };

  return (
    <div
      className={`w-full flex flex-col ${
        fullScreen
          ? "h-full bg-transparent"
          : "h-[520px] bg-[#131722] rounded-xl border border-[#1E222D] shadow-xl"
      } overflow-hidden relative`}
    >
      <div
        className={`px-6 py-4 flex items-center gap-3 overflow-x-auto no-scrollbar shrink-0 z-10 ${
          fullScreen ? "justify-center mt-2" : "border-b border-[#1E222D]/50 bg-[#131722]"
        }`}
      >
        {[
          "Should I buy TSLA?",
          "Analyze NVDA breakout",
          "Buy 2 shares of TSLA",
          "What is my cash balance?",
        ].map((promptText, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(promptText)}
            className="whitespace-nowrap text-xs bg-[#1A1E29]/80 backdrop-blur-md hover:bg-[#2A2E39] hover:text-[#00E5FF] text-[#8B94A5] px-5 py-2 rounded-full border border-[#2A2E39]/80 transition-all duration-300 font-medium tracking-wide shadow-sm"
          >
            {promptText}
          </button>
        ))}
      </div>

      <div
        className={`flex-1 overflow-y-auto flex flex-col gap-6 no-scrollbar z-10 ${
          fullScreen ? "px-6 md:px-24 pb-32 pt-4" : "p-6"
        }`}
      >
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const agentConfig = getAgentConfig(msg.role);

          if (agentConfig) {
            return (
              <div
                key={idx}
                className="flex justify-start w-full opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
              >
                <div
                  className={`text-base p-6 rounded-r-2xl rounded-bl-2xl w-full max-w-[85%] md:max-w-[80%] border-y border-r border-y-[#2A2E39]/40 border-r-[#2A2E39]/40 border-l-[3px] ${agentConfig.border} ${agentConfig.bg} ${agentConfig.glow} backdrop-blur-xl`}
                >
                  <div
                    className={`flex items-center gap-2 mb-3 ${agentConfig.color} font-bold text-xs uppercase tracking-widest`}
                  >
                    {agentConfig.icon}
                    <span>{msg.agentName}</span>
                  </div>
                  <div className="text-[#D1D5DB] leading-relaxed whitespace-pre-wrap text-[15px] font-medium tracking-wide">
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={idx}
              className={`flex flex-col w-full opacity-0 animate-[fadeIn_0.3s_ease-out_forwards] ${
                isUser ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`p-5 rounded-2xl text-[15px] leading-relaxed max-w-[75%] whitespace-pre-wrap shadow-lg ${
                  isUser
                    ? "bg-gradient-to-br from-[#2962FF] to-[#1E4BD8] text-white rounded-tr-sm shadow-[0_5px_20px_rgba(41,98,255,0.2)]"
                    : "bg-[#1A1E29]/80 backdrop-blur-xl text-gray-200 border border-[#2A2E39] rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="p-5 bg-[#1A1E29]/60 backdrop-blur-xl border border-[#2A2E39] rounded-2xl text-[#8B94A5] text-xs max-w-[fit-content] flex items-center gap-3 animate-pulse shadow-md opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]">
            <Cpu size={16} className="text-[#2962FF] animate-pulse" />
            <span className="font-mono text-sm tracking-widest uppercase text-[#00E5FF]">
              Synthesizing intelligence...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        className={`shrink-0 z-20 ${
          fullScreen
            ? "absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6"
            : "p-4 border-t border-[#2A2E39] bg-[#1A1E29]"
        }`}
      >
        <div
          className={`flex items-center gap-3 w-full ${
            fullScreen
              ? "bg-[#0B0E14]/80 backdrop-blur-xl border border-[#2A2E39]/80 p-2.5 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
              : ""
          }`}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={isRecording ? "Listening to orders..." : "Execute command or ask 'Analyze TSLA'..."}
            className={`flex-1 bg-transparent border-none text-[15px] text-white placeholder-[#5A657A] focus:outline-none transition-all px-4 ${
              !fullScreen ? "bg-[#0B0E14] border border-[#2A2E39] rounded-xl py-3.5" : "py-2"
            }`}
          />

          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            title="Hold to speak"
            className={`p-3.5 rounded-2xl transition-all duration-300 ${
              isRecording
                ? "bg-[#FF3D00] text-white animate-pulse shadow-[0_0_20px_rgba(255,61,0,0.6)]"
                : "bg-transparent text-[#7C8699] hover:bg-[#1E222D] hover:text-[#00E5FF]"
            }`}
          >
            <Mic size={20} />
          </button>

          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isTyping}
            className="bg-[#2962FF] text-white p-3.5 rounded-2xl hover:bg-[#4477FF] transition-all disabled:opacity-40 disabled:hover:bg-[#2962FF] shadow-[0_0_20px_rgba(41,98,255,0.4)] flex items-center justify-center"
          >
            <Send
              size={18}
              className={input.trim() ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""}
            />
          </button>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `,
        }}
      />
    </div>
  );
}